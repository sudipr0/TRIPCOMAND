import { AppError } from "../../lib/errors.js";

/**
 * Output validation for model responses.
 *
 * Model output is untrusted. Before it reaches the browser we check it is the
 * shape we asked for, is non-empty, and is not absurdly long. We do NOT try to
 * "fix" bad output silently: a malformed summary is an error the user can retry,
 * not something to paper over with a default.
 */

export const OUTPUT_LIMITS = {
  travelerUpdateChars: 1200,
  supplierSubjectChars: 160,
  supplierBodyChars: 4000,
  summaryBulletChars: 260,
} as const;

/** Strip markdown fences / leading labels a model may add despite instructions. */
export function stripWrapping(text: string): string {
  let value = text.trim();
  // ```...``` fences
  const fence = /^```[a-zA-Z]*\n?([\s\S]*?)\n?```$/.exec(value);
  if (fence) value = fence[1].trim();
  // A leading "Message:" / "Draft:" label on a traveler update.
  value = value.replace(/^(?:message|draft|update)\s*:\s*/i, "").trim();
  // Surrounding straight double quotes the model may wrap the whole body in.
  if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

export function validateTravelerUpdate(raw: string): string {
  const body = stripWrapping(raw);
  if (!body) {
    throw AppError.aiUnavailable(
      "AI drafting failed: the AI provider returned an empty draft.",
    );
  }
  if (body.length > OUTPUT_LIMITS.travelerUpdateChars) {
    throw AppError.aiUnavailable(
      "AI drafting failed: the AI provider returned an over-long draft.",
    );
  }
  return body;
}

export interface ParsedSupplierEmail {
  subject: string;
  body: string;
}

export function validateSupplierEmail(raw: string): ParsedSupplierEmail {
  const text = stripWrapping(raw);
  if (!text) {
    throw AppError.aiUnavailable(
      "AI drafting failed: the AI provider returned an empty draft.",
    );
  }

  const subjectMatch = /^\s*SUBJECT\s*:\s*(.+)$/im.exec(text);
  const bodyMarker = /^\s*BODY\s*:\s*$/im.exec(text);

  let subject = subjectMatch?.[1]?.trim() ?? "";
  let body = "";

  if (bodyMarker) {
    body = text.slice(bodyMarker.index + bodyMarker[0].length).trim();
  } else if (subjectMatch) {
    // No BODY marker: everything after the subject line is the body.
    body = text
      .slice(subjectMatch.index + subjectMatch[0].length)
      .replace(/^\s*BODY\s*:\s*/i, "")
      .trim();
  } else {
    // No structure at all. Keep the text as the body and derive a neutral subject.
    body = text;
  }

  // The model sometimes wraps the body in a second fence; strip again.
  body = stripWrapping(body);
  subject = subject.replace(/^["']|["']$/g, "").trim();

  if (!body) {
    throw AppError.aiUnavailable(
      "AI drafting failed: the AI provider returned an empty email body.",
    );
  }
  if (body.length > OUTPUT_LIMITS.supplierBodyChars) {
    throw AppError.aiUnavailable(
      "AI drafting failed: the AI provider returned an over-long email.",
    );
  }
  if (!subject) {
    // A deterministic, honest fallback: never invent an inquiry subject.
    subject = "Availability inquiry";
  }
  if (subject.length > OUTPUT_LIMITS.supplierSubjectChars) {
    subject = `${subject.slice(0, OUTPUT_LIMITS.supplierSubjectChars - 1)}…`;
  }

  return { subject, body };
}

/**
 * Parse a three-bullet summary. Accepts `-`, `*`, `•` or numbered prefixes, then
 * requires exactly three usable bullets.
 */
export function validateTripSummary(raw: string): string[] {
  const text = stripWrapping(raw);
  if (!text) {
    throw AppError.aiUnavailable(
      "AI drafting failed: the AI provider returned an empty summary.",
    );
  }

  const bullets = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);

  if (bullets.length !== 3) {
    throw AppError.aiUnavailable(
      "AI drafting failed: the summary did not contain exactly three points. Please try again.",
    );
  }

  return bullets.map((bullet) =>
    bullet.length > OUTPUT_LIMITS.summaryBulletChars
      ? `${bullet.slice(0, OUTPUT_LIMITS.summaryBulletChars - 1)}…`
      : bullet,
  );
}
