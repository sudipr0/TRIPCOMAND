/**
 * Upload validation for trip documents.
 *
 * Two things are checked, and both matter:
 *  - the declared MIME type is one of PDF / JPEG / PNG;
 *  - the first bytes of the file actually look like that format.
 *
 * A client can label anything `application/pdf`; only the signature tells the
 * truth. Signature sniffing happens on the streamed head, before the rest of the
 * file is written, so a spoofed upload never reaches the database.
 */

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;
export type DocumentMimeType = (typeof DOCUMENT_MIME_TYPES)[number];

/** 5 MiB. Stricter per-route limits (portal traveller uploads) may be lower. */
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

export type SignatureVerdict = "PDF" | "JPEG" | "PNG";

export function isAllowedMimeType(value: string): value is DocumentMimeType {
  return (DOCUMENT_MIME_TYPES as readonly string[]).includes(value);
}

/** Magic-byte check. Returns null when the bytes match no supported format. */
export function sniffSignature(head: Buffer): SignatureVerdict | null {
  if (head.length >= 5 && head.subarray(0, 5).toString("latin1") === "%PDF-")
    return "PDF";
  if (
    head.length >= 3 &&
    head[0] === 0xff &&
    head[1] === 0xd8 &&
    head[2] === 0xff
  )
    return "JPEG";
  if (
    head.length >= 8 &&
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a
  ) {
    return "PNG";
  }
  return null;
}

const EXPECTED: Record<DocumentMimeType, SignatureVerdict> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
};

/**
 * True when the declared MIME type and the actual signature agree.
 * A PNG renamed `.pdf` and relabelled `application/pdf` fails here.
 */
export function signatureMatchesMimeType(
  head: Buffer,
  mimeType: string,
): boolean {
  if (!isAllowedMimeType(mimeType)) return false;
  return sniffSignature(head) === EXPECTED[mimeType];
}

/** Canonical extension for a MIME type, for display filenames. */
export function extensionForMimeType(mimeType: DocumentMimeType): string {
  return mimeType === "application/pdf"
    ? ".pdf"
    : mimeType === "image/jpeg"
      ? ".jpg"
      : ".png";
}

/**
 * Content types the download endpoint is allowed to send back. Anything stored
 * under a different type is served as an attachment octet-stream instead, so a
 * stored HTML-ish payload can never be rendered by the browser.
 */
export function safeDownloadContentType(mimeType: string): string {
  return isAllowedMimeType(mimeType) ? mimeType : "application/octet-stream";
}

/**
 * `Content-Disposition` with both an ASCII fallback and RFC 5987 UTF-8 form.
 * Quotes, backslashes and control characters are stripped from the ASCII copy so
 * the header cannot be broken out of.
 */
export function contentDispositionHeader(
  filename: string,
  inline: boolean,
): string {
  const type = inline ? "inline" : "attachment";
  const ascii =
    filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || "document";
  const encoded = encodeURIComponent(filename);
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/**
 * Maps a storage key's extension back to a content type. The database record is
 * authoritative; this is a fallback for records created before a MIME column
 * existed, where `fileUrl` only carries a key.
 */
export function mimeTypeForKey(key: string): DocumentMimeType | null {
  const lower = key.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  return null;
}
