"use client";

import { useId, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { PILOT_CTA_LABEL } from "@/lib/site-config";

/**
 * Pilot enquiry form.
 *
 * THREE DELIVERY MODES, chosen by configuration — never by pretending:
 *
 *   1. ENDPOINT MODE — NEXT_PUBLIC_CONTACT_FORM_ENDPOINT is set. The form POSTs
 *      to it (Formspree or any CORS-enabled form service). Success is shown only
 *      on a 2xx response.
 *   2. MAILTO MODE — an endpoint is missing but a monitored NEXT_PUBLIC_CONTACT_EMAIL
 *      exists. The form validates, then opens the visitor's own mail client with
 *      the enquiry pre-filled. It never claims to have sent anything.
 *   3. UNAVAILABLE MODE — neither is configured. The form is disabled and the
 *      page says plainly that enquiries cannot be submitted yet, rather than
 *      collecting data that would go nowhere.
 *
 * Validation is hand-written: six fields do not justify a schema dependency,
 * and explicit wiring keeps the aria relationships obvious.
 */

type FieldName =
  "name" | "agency" | "email" | "website" | "scale" | "challenge" | "consent";

type Values = {
  name: string;
  agency: string;
  email: string;
  website: string;
  scale: string;
  challenge: string;
  consent: boolean;
};

type Errors = Partial<Record<FieldName, string>>;

// Deliberately simple: one @, and a dot-suffixed domain. Linear time, no
// backtracking, and no pretence of validating deliverability.
function isPlausibleEmail(value: string): boolean {
  const at = value.indexOf("@");
  if (at <= 0 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  return domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}

// Optional website: accept a bare domain and tolerate a scheme.
function normaliseWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const initialValues: Values = {
  name: "",
  agency: "",
  email: "",
  website: "",
  scale: "",
  challenge: "",
  consent: false,
};

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Please tell us your name.";
  if (!values.agency.trim()) errors.agency = "Please tell us your agency name.";

  if (!values.email.trim()) {
    errors.email = "Please add a work email address we can reply to.";
  } else if (!isPlausibleEmail(values.email.trim())) {
    errors.email = "That email address does not look right. Please check it.";
  }

  if (!values.challenge.trim()) {
    errors.challenge =
      "Please add a short note about how you coordinate trips and where it gets hard.";
  } else if (values.challenge.trim().length < 20) {
    errors.challenge =
      "A little more detail helps us reply usefully (at least 20 characters).";
  }

  if (!values.consent) {
    errors.consent = "Please confirm you are happy for us to use these details to reply.";
  }
  return errors;
}

function buildMailto(to: string, values: Values) {
  const subject = `Pilot enquiry — ${values.agency.trim()}`;
  const body = [
    `Name: ${values.name.trim()}`,
    `Agency: ${values.agency.trim()}`,
    `Work email: ${values.email.trim()}`,
    values.website.trim() ? `Website: ${normaliseWebsite(values.website)}` : null,
    values.scale.trim() ? `Trips / scale: ${values.scale.trim()}` : null,
    "",
    values.challenge.trim(),
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
  // encodeURIComponent handles newlines, ampersands and non-ASCII safely.
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "sent" }
  | { state: "mailto" }
  | { state: "error"; message: string };

export type ContactFormProps = {
  endpoint: string | null;
  contactEmail: string | null;
  privacyHref: string;
};

const FIELD_ORDER: FieldName[] = [
  "name",
  "agency",
  "email",
  "website",
  "scale",
  "challenge",
  "consent",
];

export function ContactForm({ endpoint, contactEmail, privacyHref }: ContactFormProps) {
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  const errorList = Object.entries(errors) as Array<[FieldName, string]>;
  const submitting = status.state === "submitting";

  // Mode 3: no way to deliver an enquiry. Say so; do not collect a dead lead.
  if (!endpoint && !contactEmail) {
    return (
      <div
        role="status"
        className="rounded-xl border border-amber-line bg-amber-soft/70 p-6 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-ink">
          Online enquiries are not open yet.
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-6 text-ink-muted">
          We have not connected a contact channel to this site, so there is nowhere for a
          form submission to go. Rather than show a form that silently discards your
          details, we would rather tell you.
        </p>
        <p className="mt-3 text-[0.9375rem] leading-6 text-ink-muted">
          If you have been given a direct contact for the pilot, please use that.
          Otherwise, check back — this page will change as soon as the channel is live.
        </p>
      </div>
    );
  }

  function updateField(field: Exclude<FieldName, "consent">, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    clearError(field);
  }

  function updateConsent(checked: boolean) {
    setValues((current) => ({ ...current, consent: checked }));
    if (checked) clearError("consent");
  }

  function clearError(field: FieldName) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (status.state === "error") setStatus({ state: "idle" });
  }

  function focusFirstInvalid(nextErrors: Errors) {
    const first = FIELD_ORDER.find((field) => nextErrors[field]);
    if (!first) return null;
    return formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`) ?? null;
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus({ state: "idle" });
      // The summary is aria-live and sits above the fields; focusing the first
      // invalid field moves the caret back past it so it gets announced.
      requestAnimationFrame(() => focusFirstInvalid(nextErrors)?.focus());
      return;
    }

    if (!endpoint) {
      // Mailto mode. Nothing is sent by us, so this is deliberately not a
      // success state. Assigning to location.href avoids popup blockers.
      window.location.href = buildMailto(contactEmail as string, values);
      setStatus({ state: "mailto" });
      return;
    }

    setStatus({ state: "submitting" });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: values.name.trim(),
          agency: values.agency.trim(),
          email: values.email.trim(),
          website: normaliseWebsite(values.website),
          scale: values.scale.trim(),
          challenge: values.challenge.trim(),
          consent: values.consent,
          _subject: `TrailComand pilot enquiry — ${values.agency.trim()}`,
          source: "trailcomand.com/contact",
        }),
      });

      if (!response.ok) {
        throw new Error(`The form service replied with ${response.status}.`);
      }

      setStatus({ state: "sent" });
      setValues(initialValues);
    } catch {
      setStatus({
        state: "error",
        message:
          "Your enquiry could not be delivered right now. Please try again in a moment.",
      });
    }
  }

  if (status.state === "sent") {
    return (
      <div
        role="status"
        className="rounded-xl border border-mint-line bg-mint/70 p-6 sm:p-8"
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-teal-strong text-white">
          <CheckIcon className="size-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-navy">
          Thank you — your enquiry has been sent.
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-6 text-ink-muted">
          We read every enquiry ourselves and aim to reply within a few working days. You
          should also receive a copy of your message by email.
        </p>
      </div>
    );
  }

  const mailtoHref = contactEmail ? buildMailto(contactEmail, values) : null;

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-7"
      aria-describedby={`${formId}-intro`}
    >
      <p id={`${formId}-intro`} className="mb-6 text-sm leading-6 text-ink-muted">
        Fields marked <span className="text-danger">*</span> are required. We ask only
        what we need to understand your operation and reply — nothing else.
      </p>

      {/* Error summary: focusable target, announced, lists every problem at once. */}
      <div
        ref={summaryRef}
        tabIndex={-1}
        aria-live="assertive"
        className={cn(
          errorList.length > 0 &&
            "mb-6 rounded-lg border border-danger/30 bg-danger-soft p-4",
        )}
      >
        {errorList.length > 0 ? (
          <>
            <p className="text-sm font-medium text-danger">
              Please check{" "}
              {errorList.length === 1 ? "one field" : `${errorList.length} fields`} before
              sending.
            </p>
            <ul className="mt-2 space-y-1">
              {errorList.map(([field, message]) => (
                <li key={field}>
                  <button
                    type="button"
                    className="rounded text-left text-sm text-danger underline decoration-danger/40 underline-offset-2 hover:decoration-danger"
                    onClick={() => {
                      formRef.current
                        ?.querySelector<HTMLElement>(`[name="${field}"]`)
                        ?.focus();
                    }}
                  >
                    {message}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${formId}-name`}
          name="name"
          label="Your name"
          autoComplete="name"
          value={values.name}
          error={errors.name}
          disabled={submitting}
          onChange={(value) => updateField("name", value)}
        />
        <Field
          id={`${formId}-agency`}
          name="agency"
          label="Agency name"
          autoComplete="organization"
          value={values.agency}
          error={errors.agency}
          disabled={submitting}
          onChange={(value) => updateField("agency", value)}
        />
        <Field
          id={`${formId}-email`}
          name="email"
          label="Work email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          disabled={submitting}
          onChange={(value) => updateField("email", value)}
          hint="We reply to this address only."
        />
        <Field
          id={`${formId}-website`}
          name="website"
          label="Agency website"
          type="url"
          inputMode="url"
          autoComplete="url"
          optional
          value={values.website}
          error={errors.website}
          disabled={submitting}
          onChange={(value) => updateField("website", value)}
          placeholder="youragency.com"
        />
        <Field
          id={`${formId}-scale`}
          name="scale"
          label="Trips or operational scale"
          optional
          value={values.scale}
          error={errors.scale}
          disabled={submitting}
          onChange={(value) => updateField("scale", value)}
          placeholder="e.g. 8 treks a year, 2 coordinators"
          hint="Rough is fine — departures per year, group sizes, number of coordinators."
          className="sm:col-span-2"
        />
        <Field
          id={`${formId}-challenge`}
          name="challenge"
          label="Main coordination challenge"
          multiline
          value={values.challenge}
          error={errors.challenge}
          disabled={submitting}
          onChange={(value) => updateField("challenge", value)}
          className="sm:col-span-2"
          hint="What happens today when a lodge cancels or a route changes — who finds out, how, and what usually goes wrong?"
        />

        {/* Consent: a real checkbox with its own label, error and arity. */}
        <div className="sm:col-span-2">
          <div className="flex items-start gap-3">
            <input
              id={`${formId}-consent`}
              name="consent"
              type="checkbox"
              checked={values.consent}
              disabled={submitting}
              required
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? `${formId}-consent-error` : undefined}
              onChange={(event) => updateConsent(event.target.checked)}
              className={cn(
                "mt-0.5 size-5 shrink-0 cursor-pointer rounded border accent-teal-strong",
                "focus-ring",
                errors.consent ? "border-danger/60" : "border-line-strong",
              )}
            />
            <label
              htmlFor={`${formId}-consent`}
              className="text-sm leading-6 text-ink-muted"
            >
              I am happy for TrailComand to use these details to reply to this enquiry.{" "}
              <a
                href={privacyHref}
                className="rounded font-medium text-teal-ink underline decoration-mint-line underline-offset-2 hover:decoration-teal-ink"
              >
                Privacy details
              </a>
              .
            </label>
          </div>
          {errors.consent ? (
            <p id={`${formId}-consent-error`} className="mt-1.5 text-sm text-danger">
              {errors.consent}
            </p>
          ) : null}
        </div>
      </div>

      {status.state === "error" ? (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-danger/30 bg-danger-soft p-4"
        >
          <p className="text-sm leading-6 text-danger">{status.message}</p>
          {mailtoHref ? (
            <a
              href={mailtoHref}
              className="mt-1 inline-block rounded text-sm font-medium text-teal-ink underline decoration-mint-line underline-offset-2 hover:decoration-teal-ink"
            >
              Send the same details by email instead
            </a>
          ) : null}
        </div>
      ) : null}

      {status.state === "mailto" ? (
        <div
          role="status"
          className="mt-5 rounded-lg border border-mint-line bg-mint/70 p-4"
        >
          <p className="text-sm font-medium text-navy">
            Your email app has been opened with this enquiry pre-filled.
          </p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            This site cannot send email itself, so nothing is sent until you press send in
            your email app. If nothing opened, email{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-medium break-all text-teal-ink underline decoration-mint-line underline-offset-2 hover:decoration-teal-ink"
            >
              {contactEmail}
            </a>{" "}
            directly.
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          {submitting ? "Sending…" : PILOT_CTA_LABEL}
        </Button>
        <p className="text-xs leading-5 text-ink-subtle sm:max-w-[16rem] sm:text-right">
          {endpoint
            ? "Sent to our form provider. No marketing list, no tracking."
            : "Opens your email app — you review and send the message yourself."}
        </p>
      </div>
    </form>
  );
}

type FieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  type?: "text" | "email" | "url";
  inputMode?: "text" | "email" | "url";
  autoComplete?: string;
  multiline?: boolean;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
};

function Field({
  id,
  name,
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  multiline = false,
  optional = false,
  disabled,
  className,
}: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  const shared = {
    id,
    name,
    value,
    disabled,
    placeholder,
    required: !optional,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy || undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    className: cn(
      "mt-1.5 w-full rounded-lg border bg-surface px-3.5 text-[0.9375rem] text-ink",
      "placeholder:text-ink-subtle/80 transition-colors outline-none",
      "focus:border-teal-ink focus:ring-2 focus:ring-teal/25",
      "disabled:cursor-not-allowed disabled:bg-surface-sunken",
      error ? "border-danger/60" : "border-line-strong hover:border-mint-line",
      multiline ? "min-h-36 resize-y py-3 leading-6" : "h-11",
    ),
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}{" "}
        {optional ? (
          <span className="font-normal text-ink-subtle">(optional)</span>
        ) : (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs leading-5 text-ink-subtle">
          {hint}
        </p>
      ) : null}
      {multiline ? (
        <textarea {...shared} rows={5} />
      ) : (
        <input
          {...shared}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
        />
      )}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
