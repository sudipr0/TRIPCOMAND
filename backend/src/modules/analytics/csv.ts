/**
 * CSV serialisation for report exports.
 *
 * Two rules matter for a file an accountant will open in a spreadsheet:
 *  - quoting: RFC 4180 — a field containing a comma, a quote or a line break is
 *    wrapped in quotes with inner quotes doubled;
 *  - formula injection: a value beginning with `=`, `+`, `-`, `@`, a tab or a
 *    carriage return is executed by Excel and Sheets as a formula. Every such
 *    cell is prefixed with an apostrophe so it is read as text.
 *
 * Numbers are written bare (they must stay numeric for sums to work), so a
 * negative amount is not "quoted" — the formatter that produces it is trusted,
 * and `-` is only dangerous as the *first* character of a text cell.
 */

const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

export type CsvValue = string | number | null | undefined | boolean;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  const raw = String(value);
  // Numbers are written by the export formatters as `number`, never as text, so
  // a string that merely looks numeric came from user data. It is still guarded:
  // `-1` and `+1` are formula starts in Excel, and only the typed `number` path
  // may bypass the guard.
  const guarded = raw.startsWith("'")
    ? raw
    : DANGEROUS_PREFIX.test(raw)
      ? `'${raw}`
      : raw;
  if (/[",\r\n]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

/** Serialises rows to CSV text. CRLF line endings, deterministic headers. */
export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCell).join(","));
  return `${lines.join("\r\n")}\r\n`;
}

/**
 * Strips characters that would break a `Content-Disposition` filename and
 * forces a `.csv` extension.
 */
export function csvFilename(base: string): string {
  const safe = base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${safe || "export"}.csv`;
}

/** UTF-8 BOM so Excel on Windows detects the encoding instead of guessing ANSI. */
export const CSV_BOM = "\uFEFF";
