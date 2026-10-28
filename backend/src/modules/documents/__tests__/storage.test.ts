import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readdir, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import {
  LocalStorageAdapter,
  StorageError,
  sanitizeDisplayFilename,
} from "../storage/local-storage.js";
import {
  contentDispositionHeader,
  extensionForMimeType,
  mimeTypeForKey,
  safeDownloadContentType,
  signatureMatchesMimeType,
  sniffSignature,
} from "../document-validation.js";

const PDF = Buffer.from(
  "%PDF-1.7\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n",
  "latin1",
);
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

describe("LocalStorageAdapter", () => {
  let root: string;
  let storage: LocalStorageAdapter;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "trail-docs-"));
    storage = new LocalStorageAdapter({
      root,
      now: () => new Date("2026-10-27T12:00:00Z"),
    });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("mints a server-controlled key from a UUID and the canonical extension", () => {
    const key = storage.storageKeyFor("application/pdf");
    expect(key).toMatch(/^2026\/10\/[0-9a-f-]{36}\.pdf$/);
    expect(storage.storageKeyFor("image/jpeg")).toMatch(/\.jpg$/);
    expect(storage.storageKeyFor("image/png")).toMatch(/\.png$/);
    // Two calls never collide, even within the same millisecond.
    expect(storage.storageKeyFor("application/pdf")).not.toBe(key);
  });

  it("refuses to mint a key for an unsupported content type", () => {
    expect(() => storage.storageKeyFor("text/html")).toThrow(StorageError);
    expect(() => storage.storageKeyFor("image/gif")).toThrow(StorageError);
  });

  it.each([
    ["../../etc/passwd", "parent traversal"],
    ["/etc/passwd", "absolute path"],
    ["2026/10/../../../etc/passwd", "nested traversal"],
    ["2026\\10\\x.pdf", "backslashes"],
    ["2026/10/x.pdf\0", "NUL byte"],
    ["C:/windows/system32", "drive letter"],
    ["", "empty"],
    ["2026/10/", "directory key"],
  ])("rejects %s (%s)", (key) => {
    expect(() => storage.resolveKey(key)).toThrow(StorageError);
  });

  it("resolves a well-formed key inside the root", () => {
    expect(storage.resolveKey("2026/10/abc.pdf")).toBe(
      join(root, "2026/10/abc.pdf"),
    );
  });

  it("writes a file, reports its size and reads it back", async () => {
    const key = storage.storageKeyFor("application/pdf");
    const result = await storage.write(key, Readable.from([PDF]), 1024);
    expect(result.sizeBytes).toBe(PDF.length);
    expect(await storage.sizeOf(key)).toBe(PDF.length);
    const head = await storage.readHead(key, 8);
    expect(head.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("rejects an empty upload and leaves nothing on disk", async () => {
    const key = storage.storageKeyFor("application/pdf");
    await expect(storage.write(key, Readable.from([]), 1024)).rejects.toThrow(
      StorageError,
    );
    expect(await storage.sizeOf(key)).toBeNull();
  });

  it("stops at the size limit and removes the partial file", async () => {
    const key = storage.storageKeyFor("application/pdf");
    const big = Buffer.concat([PDF, Buffer.alloc(4096, 0x20)]);
    await expect(
      storage.write(key, Readable.from([big]), 1024),
    ).rejects.toThrow(/maximum allowed size/);
    expect(await storage.sizeOf(key)).toBeNull();
    const directory = await readdir(join(root, "2026/10"));
    expect(directory).toEqual([]);
  });

  it("removes a file that a failing stream left half-written", async () => {
    const key = storage.storageKeyFor("application/pdf");
    async function* failing() {
      yield PDF;
      throw new Error("socket hang up");
    }
    await expect(
      storage.write(key, Readable.from(failing()), 1024),
    ).rejects.toThrow(StorageError);
    expect(await storage.sizeOf(key)).toBeNull();
  });

  it("treats a missing file as absent, not as an error", async () => {
    expect(await storage.sizeOf("2026/10/nope.pdf")).toBeNull();
    await expect(storage.remove("2026/10/nope.pdf")).resolves.toBeUndefined();
  });

  it("never overwrites an existing file", async () => {
    const key = storage.storageKeyFor("application/pdf");
    await storage.write(key, Readable.from([PDF]), 1024);
    await expect(
      storage.write(key, Readable.from([PDF]), 1024),
    ).rejects.toThrow(StorageError);
  });

  it("cannot be talked into reading outside its root via a crafted key", async () => {
    const outside = join(root, "..", "secret.txt");
    await writeFile(outside, "top secret").catch(() => undefined);
    await mkdir(join(root, "2026"), { recursive: true });
    expect(() => storage.createReadStream("2026/../../secret.txt")).toThrow(
      StorageError,
    );
    await rm(outside, { force: true });
  });
});

describe("file signature validation", () => {
  it("recognises the three accepted formats", () => {
    expect(sniffSignature(PDF)).toBe("PDF");
    expect(sniffSignature(JPEG)).toBe("JPEG");
    expect(sniffSignature(PNG)).toBe("PNG");
  });

  it("does not mistake other content for an accepted format", () => {
    expect(
      sniffSignature(Buffer.from("<html><script>alert(1)</script>")),
    ).toBeNull();
    expect(sniffSignature(Buffer.from("GIF89a"))).toBeNull();
    expect(sniffSignature(Buffer.alloc(0))).toBeNull();
  });

  it("catches a declared type that disagrees with the bytes", () => {
    expect(signatureMatchesMimeType(PDF, "application/pdf")).toBe(true);
    // A PNG uploaded as a PDF is the classic MIME spoof.
    expect(signatureMatchesMimeType(PNG, "application/pdf")).toBe(false);
    expect(
      signatureMatchesMimeType(Buffer.from("<html>"), "application/pdf"),
    ).toBe(false);
    expect(signatureMatchesMimeType(PDF, "text/html")).toBe(false);
  });

  it("serves unknown stored types as a download, never as markup", () => {
    expect(safeDownloadContentType("application/pdf")).toBe("application/pdf");
    expect(safeDownloadContentType("text/html")).toBe(
      "application/octet-stream",
    );
    expect(safeDownloadContentType("image/svg+xml")).toBe(
      "application/octet-stream",
    );
  });

  it("maps a storage key back to its content type", () => {
    expect(mimeTypeForKey("2026/10/a.pdf")).toBe("application/pdf");
    expect(mimeTypeForKey("2026/10/a.JPG")).toBe("image/jpeg");
    expect(mimeTypeForKey("2026/10/a.png")).toBe("image/png");
    expect(mimeTypeForKey("2026/10/a.html")).toBeNull();
    expect(extensionForMimeType("image/jpeg")).toBe(".jpg");
  });
});

describe("content disposition and display names", () => {
  it("quotes and encodes the filename", () => {
    expect(contentDispositionHeader("passport.pdf", true)).toBe(
      `inline; filename="passport.pdf"; filename*=UTF-8''passport.pdf`,
    );
  });

  it("cannot be broken out of the header", () => {
    const header = contentDispositionHeader(
      'evil"; x=y\nSet-Cookie: a=b.pdf',
      false,
    );
    expect(header.startsWith("attachment;")).toBe(true);
    expect(header).not.toMatch(/\r|\n/);
    expect(header.match(/"/g)?.length).toBe(2);
  });

  it("encodes non-ASCII names for the UTF-8 form", () => {
    const header = contentDispositionHeader("राहुल-पासपोर्ट.pdf", true);
    expect(header).toContain("filename*=UTF-8''");
    expect(header).not.toMatch(/[^\x20-\x7e]/);
  });

  it("strips path components and control characters from a client filename", () => {
    expect(sanitizeDisplayFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeDisplayFilename("C:\\Users\\a\\scan.pdf")).toBe("scan.pdf");
    expect(sanitizeDisplayFilename("..hidden.pdf")).toBe("hidden.pdf");
    expect(sanitizeDisplayFilename("a\u0000b.pdf")).toBe("ab.pdf");
    expect(sanitizeDisplayFilename("   ")).toBe("document");
  });

  it("bounds the length of a display name", () => {
    expect(sanitizeDisplayFilename("a".repeat(500)).length).toBe(120);
  });
});
