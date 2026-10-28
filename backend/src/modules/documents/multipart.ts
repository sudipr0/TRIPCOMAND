import type { FastifyRequest } from "fastify";
import { PassThrough, Readable } from "node:stream";
import { AppError } from "../../lib/errors.js";
import { StorageError, type LocalStorageAdapter } from "./storage/local-storage.js";
import {
  DOCUMENT_MAX_BYTES,
  isAllowedMimeType,
  signatureMatchesMimeType,
  type DocumentMimeType,
} from "./document-validation.js";

/**
 * Minimal streaming multipart reader.
 *
 * The project does not depend on a multipart plugin, so this parses the body as
 * it arrives rather than buffering it: file bytes go straight into the storage
 * adapter, which enforces the size cap on what is actually written. Only the
 * first few bytes are held in memory, for the signature check.
 *
 * Scope is deliberately narrow - the endpoints here post one file plus a few
 * small text fields. Anything outside that shape (nested parts, encoded
 * transfer, multiple files) is rejected rather than half-supported.
 */

const BOUNDARY_MAX_LENGTH = 70;
const FIELD_VALUE_MAX_BYTES = 2048;
const MAX_HEADERS_BYTES = 8 * 1024;
/** Signature bytes needed before we can judge a file. */
const SNIFF_BYTES = 8;

export interface StoredUpload {
  storageKey: string;
  sizeBytes: number;
  mimeType: DocumentMimeType;
  /** Client-supplied filename, still to be sanitised before display. */
  originalName: string;
}

export interface MultipartUploadResult {
  fields: Record<string, string>;
  file: StoredUpload;
}

function boundaryFrom(contentType: string | undefined): string {
  if (!contentType || !contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw AppError.badRequest("Expected a multipart/form-data request");
  }
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary = (match?.[1] ?? match?.[2] ?? "").trim();
  if (!boundary || boundary.length > BOUNDARY_MAX_LENGTH) {
    throw AppError.badRequest("Malformed multipart boundary");
  }
  return boundary;
}

function parsePartHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of raw.split("\r\n")) {
    const index = line.indexOf(":");
    if (index <= 0) continue;
    headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
  }
  return headers;
}

/** `form-data; name="file"; filename="a.pdf"` -> { name, filename } */
function parseDisposition(value: string | undefined): { name?: string; filename?: string } {
  if (!value) return {};
  const name = /name="([^"]*)"/i.exec(value)?.[1];
  const filename = /filename="([^"]*)"/i.exec(value)?.[1];
  return { name, filename };
}

type State = "PREAMBLE" | "HEADERS" | "BODY";

/**
 * Streams the request body into `storage`.
 *
 * On any failure the partially written file is deleted and the caller gets an
 * `AppError`, so no orphan survives a rejected upload.
 */
export async function receiveDocumentUpload(
  request: FastifyRequest,
  storage: LocalStorageAdapter,
  options: { maxBytes?: number; fieldName?: string } = {},
): Promise<MultipartUploadResult> {
  const maxBytes = Math.min(options.maxBytes ?? DOCUMENT_MAX_BYTES, DOCUMENT_MAX_BYTES);
  const fileField = options.fieldName ?? "file";
  const boundary = boundaryFrom(request.headers["content-type"]);

  const declaredLength = Number(request.headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes + 64 * 1024) {
    throw AppError.badRequest("Upload is larger than the maximum allowed size");
  }

  const source = request.raw as Readable;
  const fields: Record<string, string> = {};
  let buffer = Buffer.alloc(0);
  let head = Buffer.alloc(0);
  let sizeBytes = 0;
  let storageKey: string | null = null;
  let mimeType: DocumentMimeType | null = null;
  let originalName = "";
  let sawFile = false;
  let fileComplete = false;
  let sink: ((chunk: Buffer) => Promise<void>) | null = null;
  let finishFile: (() => Promise<void>) | null = null;
  let abortFile: (() => Promise<void>) | null = null;

  let state: State = "PREAMBLE";
  // Read through a function so TypeScript cannot narrow the parser state across
  // the awaits that separate the PREAMBLE / HEADERS / BODY sections.
  const currentState = (): State => state;
  let partName: string | undefined;
  let partIsFile = false;
  let fieldBytes = 0;
  let fieldChunks: Buffer[] = [];
  let headersBytes = 0;
  let finished = false;

  const openFile = (headers: Record<string, string>) => {
    if (sawFile) throw AppError.badRequest("Only one file per upload is supported");
    sawFile = true;
    const disposition = parseDisposition(headers["content-disposition"]);
    if (disposition.name !== fileField) {
      throw AppError.badRequest(`Expected a file part named "${fileField}"`);
    }
    const contentType = (headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
    if (!isAllowedMimeType(contentType)) {
      throw AppError.badRequest("Only PDF, JPEG and PNG files are accepted");
    }
    mimeType = contentType;
    originalName = disposition.filename ?? "document";
    storageKey = storage.storageKeyFor(contentType);

    // The adapter writes from a stream; feed it through a PassThrough so we can
    // keep parsing the multipart body ourselves. A PassThrough honours
    // backpressure on `write` (returning false and emitting `drain`), which a
    // hand-rolled push-based Readable does not: feeding one from a pipeline
    // silently stops at its high-water mark, hanging the upload.
    const feed = new PassThrough();
    // If the adapter rejects (size cap, disk error) it destroys the feed; the
    // rejection is surfaced through `written` instead.
    feed.on("error", () => undefined);
    const written = storage.write(storageKey, feed, maxBytes);
    // The rejection surfaces when `finishFile` is awaited; swallow the
    // unhandled-rejection warning until then.
    written.catch(() => undefined);
    sink = async (chunk: Buffer) => {
      if (feed.destroyed) {
        // The write already failed (size cap, disk error): surface that instead
        // of pushing into a dead stream.
        await written;
        throw AppError.badRequest("Could not store the uploaded file");
      }
      if (feed.write(chunk)) return;
      // Backpressure: wait for the writer to drain, but stop waiting the moment
      // the write fails or the feed closes.
      let settle: (error?: unknown) => void = () => undefined;
      const progressed = new Promise<void>((resolve, reject) => {
        settle = (error) => (error === undefined ? resolve() : reject(error));
      });
      written.then(
        () => settle(),
        (error) => settle(error),
      );
      feed.once("drain", () => settle());
      feed.once("close", () => settle());
      await progressed;
    };
    finishFile = async () => {
      feed.end();
      sizeBytes = (await written).sizeBytes;
    };
    abortFile = async () => {
      feed.destroy();
      await written.catch(() => undefined);
    };
  };

  const closeFile = async () => {
    if (!finishFile) return;
    await finishFile();
    fileComplete = true;
    sink = null;
    finishFile = null;
    abortFile = null;
  };

  const writePart = async (data: Buffer) => {
    if (!data.length) return;
    if (partIsFile) {
      if (head.length < SNIFF_BYTES) {
        head = Buffer.concat([head, data.subarray(0, SNIFF_BYTES - head.length)]);
        if (head.length >= SNIFF_BYTES && mimeType && !signatureMatchesMimeType(head, mimeType)) {
          throw AppError.badRequest("File contents do not match the declared type");
        }
      }
      if (!sink) throw AppError.badRequest("Malformed multipart body");
      await sink(data);
      return;
    }
    fieldBytes += data.length;
    if (fieldBytes > FIELD_VALUE_MAX_BYTES) {
      throw AppError.badRequest("Multipart field is too large");
    }
    // Copy: a caller may hand us a view into `buffer`, which is reassigned as
    // the next chunk is parsed. Keeping the view would let later bytes rewrite
    // the field value.
    fieldChunks.push(Buffer.from(data));
  };

  const startPart = async (rawHeaders: string) => {
    const headers = parsePartHeaders(rawHeaders);
    const disposition = parseDisposition(headers["content-disposition"]);
    partName = disposition.name;
    partIsFile = disposition.filename !== undefined;
    if (partIsFile) {
      openFile(headers);
    } else if (!partName) {
      throw AppError.badRequest("Malformed multipart part");
    }
  };

  const finishPart = async () => {
    if (partIsFile) {
      await closeFile();
    } else if (partName) {

      // `content` stops at the CRLF that introduces the delimiter, so drop one
      // trailing CRLF before trimming whitespace: without it every text field
      // would keep the transport's line break.
      const text = Buffer.concat(fieldChunks).toString("utf8");
      fields[partName] = text.replace(/\r\n$/, "").trim();
    }
    partName = undefined;
    partIsFile = false;
    fieldBytes = 0;
    fieldChunks = [];
  };

  const CRLF = Buffer.from("\r\n");
  // A part boundary in the body is `CRLF --boundary`, and is always followed by
  // either CRLF (another part) or `--` (the closing boundary). The closing form
  // is handled as its own token so the two never have to be told apart later.
  const openingDelimiter = Buffer.from(`--${boundary}`);
  const partDelimiter = Buffer.from(`\r\n--${boundary}\r\n`);
  const closingDelimiter = Buffer.from(`\r\n--${boundary}--`);
  /** Body terminators, longest first so the closing form is preferred. */
  const terminators = [closingDelimiter, partDelimiter];

  /** Index of the first complete body terminator in `buf`, or -1. */
  const findTerminator = (buf: Buffer): { index: number; closing: boolean } | null => {
    let best: { index: number; closing: boolean } | null = null;
    for (const [position, token] of [partDelimiter, closingDelimiter].entries()) {
      const index = buf.indexOf(token);
      if (index === -1) continue;
      if (!best || index < best.index) best = { index, closing: position === 1 };
    }
    return best;
  };

  /**
   * Longest suffix of `buf` that could still grow into a terminator. Those
   * bytes are held back until the next chunk rather than written into the part.
   */
  const trailingTerminatorPrefix = (buf: Buffer): number => {
    let keep = 0;
    for (const token of terminators) {
      const max = Math.min(buf.length, token.length - 1);
      for (let n = max; n > keep; n -= 1) {
        if (buf.subarray(buf.length - n, buf.length).equals(token.subarray(0, n))) {
          keep = n;
          break;
        }
      }
    }
    return keep;
  };

  const consume = async (chunk: Buffer) => {
    if (!chunk.length) return;
    // The chunk is merged into `buffer` exactly once per call; later sections
    // work on whatever is left, which may include a tail carried over from the
    // previous chunk, so they must not append the chunk a second time.
    let merged = false;
    const append = (data: Buffer) => {
      buffer = buffer.length ? Buffer.concat([buffer, data]) : Buffer.from(data);
      merged = true;
    };

    if (currentState() === "PREAMBLE") {
      append(chunk);
      const index = buffer.indexOf(openingDelimiter);
      if (index === -1) {
        // Nothing before the first boundary is meaningful; keep a tail in case
        // the boundary straddles two chunks.
        buffer = Buffer.from(
          buffer.subarray(Math.max(0, buffer.length - openingDelimiter.length)),
        );
        return;
      }
      const after = index + openingDelimiter.length;
      if (buffer.length < after + 2) {
        buffer = Buffer.from(buffer.subarray(index));
        return;
      }
      const marker = buffer.subarray(after, after + 2).toString("latin1");
      buffer = Buffer.from(buffer.subarray(after + 2));
      if (marker === "--") {
        finished = true;
        return;
      }
      state = "HEADERS";
      headersBytes = 0;
    }

    if (currentState() === "HEADERS") {
      if (!merged) append(chunk);
      headersBytes += buffer.length;
      if (headersBytes > MAX_HEADERS_BYTES) {
        throw AppError.badRequest("Multipart headers too large");
      }
      const end = buffer.indexOf("\r\n\r\n");
      if (end === -1) return;
      const rawHeaders = buffer.subarray(0, end).toString("latin1");
      buffer = Buffer.from(buffer.subarray(end + 4));
      await startPart(rawHeaders);
      state = "BODY";
    }

    if (currentState() === "BODY") {
      if (!merged) append(chunk);
      const found = findTerminator(buffer);
      if (!found) {
        // No terminator yet: flush everything that cannot be part of one.
        const keep = trailingTerminatorPrefix(buffer);
        if (buffer.length > keep) {
          const flush = Buffer.from(buffer.subarray(0, buffer.length - keep));
          buffer = Buffer.from(buffer.subarray(buffer.length - keep));
          await writePart(flush);
        }
        return;
      }
      const content = Buffer.from(buffer.subarray(0, found.index));
      const token = found.closing ? closingDelimiter : partDelimiter;
      buffer = Buffer.from(buffer.subarray(found.index + token.length));
      await writePart(content);
      await finishPart();
      if (found.closing) {
        finished = true;
        return;
      }
      state = "HEADERS";
      headersBytes = 0;
    }
  };

  try {
    for await (const chunk of source) {
      if (finished) break;
      await consume(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    if (!finished) {
      throw AppError.badRequest("Multipart body ended unexpectedly");
    }
    if (!sawFile || !fileComplete || !storageKey || !mimeType) {
      throw AppError.badRequest(`A "${fileField}" file part is required`);
    }
    if (sizeBytes === 0) {
      throw AppError.badRequest("Uploaded file is empty");
    }
    return { fields, file: { storageKey, sizeBytes, mimeType, originalName } };
  } catch (error) {
    const abort = abortFile as (() => Promise<void>) | null;
    if (abort) await abort().catch(() => undefined);
    if (storageKey) await storage.remove(storageKey).catch(() => undefined);
    if (error instanceof AppError) throw error;
    if (error instanceof StorageError) {
      throw AppError.badRequest(error.code === "WRITE_FAILED" ? error.message : "Invalid upload");
    }
    // A filesystem or stream failure is an upload failure, not a 500, and the
    // adapter's own error text is never forwarded to the client.
    throw AppError.badRequest("Could not store the uploaded file");
  }
}
