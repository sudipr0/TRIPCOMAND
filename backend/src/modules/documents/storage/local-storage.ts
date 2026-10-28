import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, open, stat, unlink } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Local filesystem storage for uploaded trip documents.
 *
 * Files live under `backend/uploads/`, which is never registered as a static
 * route: the only way out is the authenticated (or token-scoped portal) download
 * endpoint, which resolves a storage key back to a path through this adapter.
 *
 * The database stores the *storage key* (`2026/10/<uuid>.pdf`), never an absolute
 * path, so a database dump moved to another machine still points at nothing
 * machine-specific. Keys are generated here from a server-side UUID plus a
 * canonical extension; the client's filename is display metadata only.
 */

/** Directory that holds every stored file. Not served by any static handler. */
export const DEFAULT_UPLOAD_ROOT = resolve(process.cwd(), "uploads");

/** Extensions we are willing to mint for an accepted upload. */
const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const STORAGE_KEY_PATTERN = /^[a-zA-Z0-9._\-/]+$/;
const MAX_FILENAME_LENGTH = 120;

export class StorageError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID_KEY" | "INVALID_MIME" | "WRITE_FAILED",
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export interface StoredFile {
  /** Relative, portable reference persisted in the database. */
  key: string;
  sizeBytes: number;
}

export interface LocalStorageAdapterOptions {
  root?: string;
  now?: () => Date;
}

/**
 * Filesystem-backed storage adapter.
 *
 * Every method that touches disk goes through `resolveKey`, so a key can never
 * escape `root`: `..`, absolute paths, backslashes, NUL bytes and drive letters
 * are rejected before the filesystem is consulted.
 */
export class LocalStorageAdapter {
  readonly root: string;
  private readonly now: () => Date;

  constructor(options: LocalStorageAdapterOptions = {}) {
    this.root = options.root ?? DEFAULT_UPLOAD_ROOT;
    this.now = options.now ?? (() => new Date());
  }

  /** `2026/10/<uuid>.pdf` for a supported content type. */
  storageKeyFor(contentType: string, at: Date = this.now()): string {
    const extension = EXTENSION_BY_MIME[contentType];
    if (!extension) {
      throw new StorageError(
        `Unsupported content type: ${contentType}`,
        "INVALID_MIME",
      );
    }
    const year = at.getUTCFullYear();
    const month = String(at.getUTCMonth() + 1).padStart(2, "0");
    return `${year}/${month}/${randomUUID()}${extension}`;
  }

  /**
   * Absolute path for a storage key, or a thrown error.
   *
   * Rejects anything that is not a plain relative key, and then re-checks that
   * the resolved path is still inside the root (defence in depth against a
   * symlinked root or a traversal that slipped the pattern check).
   */
  resolveKey(key: string): string {
    if (typeof key !== "string" || key.length === 0 || key.length > 512) {
      throw new StorageError("Invalid storage key", "INVALID_KEY");
    }
    if (
      !STORAGE_KEY_PATTERN.test(key) ||
      key.includes("..") ||
      key.startsWith("/") ||
      key.includes("\\") ||
      key.includes("\0") ||
      key.endsWith("/")
    ) {
      throw new StorageError("Invalid storage key", "INVALID_KEY");
    }
    const absolute = resolve(this.root, key);
    const rootWithSeparator = this.root.endsWith(sep)
      ? this.root
      : this.root + sep;
    if (!absolute.startsWith(rootWithSeparator)) {
      throw new StorageError("Invalid storage key", "INVALID_KEY");
    }
    return absolute;
  }

  /**
   * Streams `source` to disk, enforcing `maxBytes` on the bytes actually
   * written. A partial file is removed when the limit is hit or the stream
   * errors, so a failed upload leaves nothing behind.
   */
  async write(
    key: string,
    source: Readable,
    maxBytes: number,
  ): Promise<StoredFile> {
    const absolute = this.resolveKey(key);
    const directory = resolve(absolute, "..");
    await mkdir(directory, { recursive: true });

    let written = 0;
    const counter = async function* (stream: Readable) {
      for await (const chunk of stream) {
        written += chunk.length;
        if (written > maxBytes) {
          throw new StorageError(
            "File exceeds the maximum allowed size",
            "WRITE_FAILED",
          );
        }
        yield chunk;
      }
    };

    try {
      await pipeline(
        counter(source),
        createWriteStream(absolute, { flags: "wx", mode: 0o600 }),
      );
      if (written === 0) {
        throw new StorageError("File is empty", "WRITE_FAILED");
      }
      return { key, sizeBytes: written };
    } catch (error) {
      await this.remove(key).catch(() => undefined);
      if (error instanceof StorageError) throw error;
      throw new StorageError(
        "Could not store the uploaded file",
        "WRITE_FAILED",
      );
    }
  }

  /** Writes a small in-memory buffer (used by tests and fixtures). */
  async writeBuffer(
    key: string,
    data: Buffer,
    maxBytes: number,
  ): Promise<StoredFile> {
    return this.write(key, Readable.from([data]), maxBytes);
  }

  /** Reads the first `length` bytes of a stored file, for signature checks. */
  async readHead(key: string, length = 16): Promise<Buffer> {
    const absolute = this.resolveKey(key);
    const handle = await open(absolute, "r");
    try {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, 0);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  /** File size, or null when the file is missing. */
  async sizeOf(key: string): Promise<number | null> {
    try {
      const info = await stat(this.resolveKey(key));
      return info.isFile() ? info.size : null;
    } catch {
      return null;
    }
  }

  /** Creates a read stream for the download endpoint. */
  createReadStream(key: string): Readable {
    return createReadStream(this.resolveKey(key));
  }

  /** Best-effort delete; a missing file is not an error. */
  async remove(key: string): Promise<void> {
    try {
      await unlink(this.resolveKey(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

export const localDocumentStorage = new LocalStorageAdapter();

/**
 * Reduces a client-supplied filename to display-safe metadata: no directory
 * components, no control characters, a bounded length and a known extension.
 */
export function sanitizeDisplayFilename(
  raw: string,
  fallbackExtension = "",
): string {
  const base = String(raw ?? "")
    .split(/[\\/]/)
    .pop()!
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "_")
    .trim();
  const withoutLeadingDots = base.replace(/^\.+/, "");
  const trimmed =
    withoutLeadingDots.slice(0, MAX_FILENAME_LENGTH) ||
    `document${fallbackExtension}`;
  // Keep only a sane extension so a stored display name cannot carry a script suffix.
  const extension = extname(trimmed).toLowerCase();
  if (extension && !/^\.[a-z0-9]{1,5}$/.test(extension)) {
    return (
      trimmed.slice(0, trimmed.length - extension.length) ||
      `document${fallbackExtension}`
    );
  }
  return trimmed;
}
