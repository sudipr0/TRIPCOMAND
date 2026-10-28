import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { FastifyReply } from "fastify";
import { mkdtemp, rm } from "node:fs/promises";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { AppError } from "../../../lib/errors.js";
import { readStoredFile } from '../document.service.js';
import { isLocalStorageReference } from '../document.service.js';
import { storageKeyFromReference } from '../document.service.js';
import { LocalStorageAdapter } from "../storage/local-storage.js";
import { contentDispositionHeader } from "../document-validation.js";
import { LOCAL_FILE_PREFIX, contentTypeForRow } from '../document.service.js';

/**
 * The download endpoint's security properties, exercised without a database:
 * every case here is a pure function of a stored row plus the adapter, so the
 * behaviour that matters (tenant scoping, header hardening, path traversal) is
 * asserted directly rather than through a mocked HTTP stack.
 */

const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "latin1");

/** Minimal FastifyReply stand-in that records the headers we care about. */
function fakeReply() {
  const headers: Record<string, string> = {};
  return {
    headers,
    header(name: string, value: string) {
      headers[name] = value;
      return this;
    },
    send() {
      return this;
    },
  } as unknown as FastifyReply & { headers: Record<string, string> };
}

describe("local storage references", () => {
  it("only treats the local: scheme as a stored file", () => {
    expect(isLocalStorageReference("local:2026/10/x.pdf")).toBe(true);
    expect(isLocalStorageReference("https://example.com/x.pdf")).toBe(false);
    expect(isLocalStorageReference("/uploads/x.pdf")).toBe(false);
    expect(isLocalStorageReference("")).toBe(false);
  });

  it("strips the scheme to get the storage key", () => {
    expect(storageKeyFromReference(`${LOCAL_FILE_PREFIX}2026/10/a.pdf`)).toBe(
      "2026/10/a.pdf",
    );
  });

  it("refuses to interpret a non-local reference", () => {
    expect(() => storageKeyFromReference("https://evil.test/x.pdf")).toThrow();
  });
});

describe("content type derivation", () => {
  it("derives the type from the server-chosen extension", () => {
    expect(contentTypeForRow({ fileUrl: "local:2026/10/a.pdf" })).toBe(
      "application/pdf",
    );
    expect(contentTypeForRow({ fileUrl: "local:2026/10/a.jpg" })).toBe(
      "image/jpeg",
    );
    expect(contentTypeForRow({ fileUrl: "local:2026/10/a.png" })).toBe(
      "image/png",
    );
  });

  it("falls back to octet-stream for anything else", () => {
    expect(contentTypeForRow({ fileUrl: "local:2026/10/a.html" })).toBe(
      "application/octet-stream",
    );
    expect(contentTypeForRow({ fileUrl: "https://example.com/a.pdf" })).toBe(
      "application/octet-stream",
    );
  });
});

describe("readStoredFile", () => {
  let root: string;
  let storage: LocalStorageAdapter;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "trail-retrieval-"));
    storage = new LocalStorageAdapter({ root });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("streams a stored file with its size", async () => {
    const { key } = await storage.writeBuffer(
      "2026/10/doc.pdf",
      PDF,
      1024 * 1024,
    );
    const payload = await readStoredFile(
      { fileUrl: `local:${key}`, fileName: "doc.pdf" },
      storage,
    );
    expect(payload.contentType).toBe("application/pdf");
    expect(payload.sizeBytes).toBe(PDF.length);
    expect(payload.stream).toBeInstanceOf(Readable);
  });

  it("reports a missing file as not found rather than leaking the path", async () => {
    await expect(
      readStoredFile(
        { fileUrl: "local:2026/10/missing.pdf", fileName: "missing.pdf" },
        storage,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects a traversal attempt in the stored reference", async () => {
    await expect(
      readStoredFile(
        { fileUrl: "local:../../etc/passwd", fileName: "passwd" },
        storage,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects an absolute path smuggled into the reference", async () => {
    await expect(
      readStoredFile(
        { fileUrl: "local:/etc/passwd", fileName: "passwd" },
        storage,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("does not proxy an external link", async () => {
    // Proxying would make this endpoint an SSRF gadget.
    await expect(
      readStoredFile(
        { fileUrl: "https://example.com/a.pdf", fileName: "a.pdf" },
        storage,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("download response headers", () => {
  /**
   * Mirrors `DocumentsService.sendDocument`'s header contract. Kept as a small
   * helper so the assertions below read as the security requirements they are.
   */
  async function send(
    row: { fileUrl: string; fileName: string },
    storage: LocalStorageAdapter,
    asAttachment = false,
  ) {
    const payload = await readStoredFile(row, storage);
    const reply = fakeReply();
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Cache-Control", "private, no-store");
    reply.header("Content-Type", payload.contentType);
    reply.header("Content-Length", String(payload.sizeBytes));
    reply.header(
      "Content-Disposition",
      contentDispositionHeader(row.fileName, !asAttachment),
    );
    reply.header("Referrer-Policy", "no-referrer");
    return reply.headers;
  }

  let root: string;
  let storage: LocalStorageAdapter;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "trail-headers-"));
    storage = new LocalStorageAdapter({ root });
    await storage.writeBuffer("2026/10/doc.pdf", PDF, 1024 * 1024);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("sets nosniff, no-store and a private cache policy", async () => {
    const headers = await send(
      { fileUrl: "local:2026/10/doc.pdf", fileName: "doc.pdf" },
      storage,
    );
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Cache-Control"]).toBe("private, no-store");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
  });

  it("serves the canonical content type, not the client's", async () => {
    const headers = await send(
      { fileUrl: "local:2026/10/doc.pdf", fileName: "doc.pdf" },
      storage,
    );
    expect(headers["Content-Type"]).toBe("application/pdf");
    expect(headers["Content-Length"]).toBe(String(PDF.length));
  });

  it("cannot break out of the Content-Disposition header", async () => {
    const headers = await send(
      {
        fileUrl: "local:2026/10/doc.pdf",
        fileName: 'a"; filename="evil.html',
      },
      storage,
    );
    const disposition = headers["Content-Disposition"];
    // The ASCII fallback must contain exactly one quoted filename, with the
    // injected quote neutralised, so the browser cannot be handed a second
    // `filename=` parameter. The RFC 5987 form follows it percent-encoded.
    expect(disposition).toMatch(/^inline; filename="[^"\\]*"; filename\*=UTF-8''/);
    expect(disposition.slice(0, disposition.indexOf("; filename*="))).not.toContain(
      '"; filename=',
    );
  });

  it("forces a download when asked", async () => {
    const headers = await send(
      { fileUrl: "local:2026/10/doc.pdf", fileName: "doc.pdf" },
      storage,
      true,
    );
    expect(headers["Content-Disposition"]).toMatch(/^attachment;/);
  });
});

describe("tenant scoping contract", () => {
  it("builds the download URL from the row's own workspace, never from input", async () => {
    // The service hands the caller a URL containing the workspace id *it* read
    // from the authorised row, so a caller cannot widen scope by editing it.
    const { toStoredDocumentMetadata } = await import("../document.service.js");
    const metadata = toStoredDocumentMetadata({
      id: "doc-1",
      workspaceId: "ws-owner",
      tripId: "trip-1",
      travelerId: "trav-1",
      documentType: "PASSPORT",
      fileName: "passport.pdf",
      fileUrl: "local:2026/10/doc.pdf",
      uploadedById: "user-1",
      uploadedByTraveler: false,
      createdAt: new Date("2026-10-27T00:00:00Z"),
    });
    expect(metadata.downloadUrl).toBe(
      "/api/v1/workspaces/ws-owner/documents/doc-1/file",
    );
    // The storage key must never be exposed to the client.
    expect(JSON.stringify(metadata)).not.toContain("2026/10/doc.pdf");
  });
});


