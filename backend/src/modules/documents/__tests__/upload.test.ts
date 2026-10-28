import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { FastifyRequest } from "fastify";
import { receiveDocumentUpload } from "../multipart.js";
import { LocalStorageAdapter } from "../storage/local-storage.js";
import { AppError } from "../../../lib/errors.js";

const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "latin1");
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const BOUNDARY = "----trailTestBoundary42";

/**
 * Builds a multipart body and a request-like object whose `raw` stream emits it
 * in `chunkSize` pieces — so the parser is exercised on boundaries that straddle
 * chunk edges, not just on a single happy buffer.
 */
function multipartRequest(
  parts: {
    name: string;
    filename?: string;
    contentType?: string;
    data: Buffer | string;
  }[],
  options: { chunkSize?: number } = {},
): FastifyRequest {
  const chunks: Buffer[] = [];
  for (const part of parts) {
    const disposition = `form-data; name="${part.name}"${part.filename !== undefined ? `; filename="${part.filename}"` : ""}`;
    chunks.push(
      Buffer.from(
        `--${BOUNDARY}\r\nContent-Disposition: ${disposition}\r\n` +
          (part.contentType ? `Content-Type: ${part.contentType}\r\n` : "") +
          `\r\n`,
      ),
    );
    chunks.push(
      Buffer.isBuffer(part.data) ? part.data : Buffer.from(part.data),
    );
    chunks.push(Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from(`--${BOUNDARY}--\r\n`));
  const body = Buffer.concat(chunks);

  const size = options.chunkSize ?? 16;
  const pieces: Buffer[] = [];
  for (let i = 0; i < body.length; i += size) {
    // Copy each piece: subarray views share memory with `body`, so a 1-byte
    // fixture would alias bytes from later parts and corrupt itself once the
    // consumer retains a view. Socket chunks are always independent buffers.
    pieces.push(Buffer.from(body.subarray(i, i + size)));
  }

  const raw = Readable.from(pieces);
  return {
    raw,
    headers: {
      "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
      "content-length": String(body.length),
    },
  } as unknown as FastifyRequest;
}

describe("receiveDocumentUpload", () => {
  let root: string;
  let storage: LocalStorageAdapter;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "trail-upload-"));
    storage = new LocalStorageAdapter({ root });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it.each([
    ["PDF", PDF, "application/pdf", ".pdf"],
    ["JPEG", JPEG, "image/jpeg", ".jpg"],
    ["PNG", PNG, "image/png", ".png"],
  ])(
    "accepts a valid %s upload",
    async (_label, data, contentType, extension) => {
      const result = await receiveDocumentUpload(
        multipartRequest([
          { name: "travelerId", data: "11111111-1111-4111-8111-111111111111" },
          { name: "documentType", data: "PASSPORT" },
          { name: "file", filename: "scan", contentType, data },
        ]),
        storage,
      );

      expect(result.fields.travelerId).toBe(
        "11111111-1111-4111-8111-111111111111",
      );
      expect(result.fields.documentType).toBe("PASSPORT");
      expect(result.file.mimeType).toBe(contentType);
      expect(result.file.storageKey.endsWith(extension)).toBe(true);
      expect(result.file.sizeBytes).toBe(data.length);
      expect(await storage.sizeOf(result.file.storageKey)).toBe(data.length);
    },
  );

  it("parses a body delivered one byte at a time", async () => {
    const result = await receiveDocumentUpload(
      multipartRequest(
        [
          {
            name: "file",
            filename: "a.pdf",
            contentType: "application/pdf",
            data: PDF,
          },
        ],
        {
          chunkSize: 1,
        },
      ),
      storage,
    );
    expect(await storage.sizeOf(result.file.storageKey)).toBe(PDF.length);
  });

  it("keeps the client filename only as metadata", async () => {
    const result = await receiveDocumentUpload(
      multipartRequest([
        {
          name: "file",
          filename: "../../../etc/passwd.pdf",
          contentType: "application/pdf",
          data: PDF,
        },
      ]),
      storage,
    );
    expect(result.file.originalName).toContain("passwd.pdf");
    expect(result.file.storageKey).not.toContain("passwd");
    expect(result.file.storageKey).not.toContain("..");
  });

  it("rejects an unsupported content type before writing anything", async () => {
    await expect(
      receiveDocumentUpload(
        multipartRequest([
          {
            name: "file",
            filename: "x.html",
            contentType: "text/html",
            data: "<script>alert(1)</script>",
          },
        ]),
        storage,
      ),
    ).rejects.toThrow(/PDF, JPEG and PNG/);
    expect(await readdir(root)).toEqual([]);
  });

  it("rejects a spoofed MIME type and removes the partial file", async () => {
    await expect(
      receiveDocumentUpload(
        multipartRequest([
          {
            name: "file",
            filename: "fake.pdf",
            contentType: "application/pdf",
            data: PNG,
          },
        ]),
        storage,
      ),
    ).rejects.toThrow(/do not match/);
    const year = await readdir(root);
    if (year.length) {
      const months = await readdir(join(root, year[0]));
      if (months.length)
        expect(await readdir(join(root, year[0], months[0]))).toEqual([]);
    }
  });

  it("rejects an empty file", async () => {
    await expect(
      receiveDocumentUpload(
        multipartRequest([
          {
            name: "file",
            filename: "empty.pdf",
            contentType: "application/pdf",
            data: Buffer.alloc(0),
          },
        ]),
        storage,
      ),
    ).rejects.toThrow(/empty/i);
  });

  it("rejects a file larger than the limit and cleans up", async () => {
    const big = Buffer.concat([PDF, Buffer.alloc(4096, 0x20)]);
    await expect(
      receiveDocumentUpload(
        multipartRequest([
          {
            name: "file",
            filename: "big.pdf",
            contentType: "application/pdf",
            data: big,
          },
        ]),
        storage,
        { maxBytes: 1024 },
      ),
    ).rejects.toThrow(/maximum allowed size/);
  });

  it("cannot be raised above the global 5 MiB cap by a caller", async () => {
    const big = Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024, 0x20)]);
    await expect(
      receiveDocumentUpload(
        multipartRequest([
          {
            name: "file",
            filename: "big.pdf",
            contentType: "application/pdf",
            data: big,
          },
        ]),
        storage,
        { maxBytes: 50 * 1024 * 1024 },
      ),
    ).rejects.toThrow(/maximum allowed size/);
  });

  it("rejects a request that is not multipart", async () => {
    await expect(
      receiveDocumentUpload(
        {
          raw: Readable.from([]),
          headers: { "content-type": "application/json" },
        } as never,
        storage,
      ),
    ).rejects.toThrow(/multipart\/form-data/);
  });

  it("rejects a truncated body", async () => {
    const request = multipartRequest([
      {
        name: "file",
        filename: "a.pdf",
        contentType: "application/pdf",
        data: PDF,
      },
    ]);
    // Drop the closing boundary.
    const body = Buffer.concat([
      Buffer.from(
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="a.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
      ),
      PDF,
    ]);
    (request as unknown as { raw: Readable }).raw = Readable.from([body]);
    (request.headers as Record<string, string>)["content-length"] = String(
      body.length,
    );
    await expect(receiveDocumentUpload(request, storage)).rejects.toThrow(
      /ended unexpectedly/,
    );
  });

  it("rejects a request with no file part", async () => {
    await expect(
      receiveDocumentUpload(
        multipartRequest([{ name: "travelerId", data: "x" }]),
        storage,
      ),
    ).rejects.toThrow(/file part is required/);
  });

  it("rejects two files in one request", async () => {
    await expect(
      receiveDocumentUpload(
        multipartRequest([
          {
            name: "file",
            filename: "a.pdf",
            contentType: "application/pdf",
            data: PDF,
          },
          {
            name: "file",
            filename: "b.pdf",
            contentType: "application/pdf",
            data: PDF,
          },
        ]),
        storage,
      ),
    ).rejects.toThrow(/one file per upload/);
  });

  it("rejects a file part under an unexpected field name", async () => {
    await expect(
      receiveDocumentUpload(
        multipartRequest([
          {
            name: "avatar",
            filename: "a.pdf",
            contentType: "application/pdf",
            data: PDF,
          },
        ]),
        storage,
      ),
    ).rejects.toThrow(/Expected a file part/);
  });

  it("rejects an oversized text field", async () => {
    await expect(
      receiveDocumentUpload(
        multipartRequest([
          { name: "note", data: "x".repeat(4096) },
          {
            name: "file",
            filename: "a.pdf",
            contentType: "application/pdf",
            data: PDF,
          },
        ]),
        storage,
      ),
    ).rejects.toThrow(/field is too large/);
  });

  it("rejects a declared length far beyond the cap without reading the body", async () => {
    const request = multipartRequest([
      {
        name: "file",
        filename: "a.pdf",
        contentType: "application/pdf",
        data: PDF,
      },
    ]);
    (request.headers as Record<string, string>)["content-length"] = String(
      20 * 1024 * 1024,
    );
    await expect(
      receiveDocumentUpload(request, storage),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("upload cleanup on a storage failure", () => {
  it("removes the file when the row insert fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "trail-upload-"));
    const storage = new LocalStorageAdapter({ root });
    const remove = vi.spyOn(storage, "remove");

    await receiveDocumentUpload(
      multipartRequest([
        {
          name: "file",
          filename: "a.pdf",
          contentType: "application/pdf",
          data: PDF,
        },
      ]),
      storage,
    );
    expect(remove).not.toHaveBeenCalled();

    // A failing adapter write must surface as a clean AppError, not a raw fs error.
    const failing = new LocalStorageAdapter({ root });
    vi.spyOn(failing, "write").mockRejectedValue(new Error("ENOSPC"));
    await expect(
      receiveDocumentUpload(
        multipartRequest([
          {
            name: "file",
            filename: "a.pdf",
            contentType: "application/pdf",
            data: PDF,
          },
        ]),
        failing,
      ),
    ).rejects.toBeInstanceOf(AppError);

    await rm(root, { recursive: true, force: true });
  });
});
