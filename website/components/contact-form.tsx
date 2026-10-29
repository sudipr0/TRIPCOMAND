"use client";

import { useId, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { PILOT_CTA_LABEL } from "@/lib/site-config";

/**
 * Pilot enquiry form.
 *
 * Two delivery modes, chosen by configuration:
 *
 *   1. ENDPOINT MODE — when NEXT_PUBLIC_CONTACT_FORM_ENDPOINT is set, the form
 *      is POSTed to that endpoint (Formspree or any CORS-enabled form service).
 *      Success is only shown when the service returns 2xx.
 *   2. MAILTO MODE — with no endpoint, the form still validates and then opens
 *      the visitor's own mail client with the enquiry pre-filled. It never claims
 *      to have sent anything; the copy says the email app must do it.
 *
 * Validation is hand-written on purpose: five fields do not justify a schema
 * library, and this way the field-level messages and aria wiring are explicit.
 */

type FieldName = "name" | "agency" | "email" | "message";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

// Deliberately simple: one line, one @, and a dot-suffixed domain. No regex
// backtracking risk, and no pretence of validating deliverability — the form
// service and a human reply are the real check. `type="email"` on the input
// adds the browser's own hint for assistive tech.
function isPlausibleEmail(value: string): boolean {
  const at = value.indexOf("@");
  if (at <= 0 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  return domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}

const initialValues: Values = { name: "", agency: "", email: "", message: "" };

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Please tell us your name.";
  if (!values.agency.trim()) errors.agency = "Please tell us your agency name.";
  if (!values.email.trim()) {
    errors.email = "Please add an email address we can reply to.";
  } else if (!isPlausibleEmail(values.email.trim())) {
    errors.email = "That email address does not look right. Please check it.";
  }
  if (!values.message.trim()) {
    errors.message =
      "Please add a short note about your trips and how you coordinate them.";
  } else if (values.message.trim().length < 20) {
    errors.message =
      "A little more detail helps us reply usefully (at least 20 characters).";
  }
  return errors;
}

function buildMailto(to: string, values: Values) {
  const subject = `Pilot enquiry — ${values.agency.trim()}`;
  const body = [
    `Name: ${values.name.trim()}`,
    `Agency: ${values.agency.trim()}`,
    `Email: ${values.email.trim()}`,
    "",
    values.message.trim(),
  ].join("\n");
  // encodeURIComponent handles newlines, ampersands and non-ASCII safely.
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "sent"; via: "endpoint" }
  | { state: "mailto" }
  | { state: "error"; message: string };

type ContactFormProps = {
  endpoint: string | null;
  contactEmail: string;
};

export function ContactForm({ endpoint, contactEmail }: ContactFormProps) {
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  const errorList = Object.entries(errors) as Array<[FieldName, string]>;

  function update(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear the error for a field as soon as it is edited, but only for that field.
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (status.state === "error") setStatus({ state: "idle" });
  }

  /** Returns the element to focus, without focusing it, so the caller decides when. */
  function focusFirstInvalid(nextErrors: Errors) {
    const order: FieldName[] = ["name", "agency", "email", "message"];
    const first = order.find((field) => nextErrors[field]);
    if (!first) return null;
    return formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`) ?? null;
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);

    const firstInvalid = focusFirstInvalid(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus({ state: "idle" });
      // Focus the first invalid field. The summary is rendered above it in the
      // DOM and is aria-live, so moving focus from "Request a Pilot" back up to
      // the first field means the summary is announced on the way past, rather
      // than being skipped by moving focus straight to it.
      requestAnimationFrame(() => firstInvalid?.focus());
      return;
    }

    if (!endpoint) {
      // Mailto mode: hand off to the visitor's mail client. Nothing is sent by
      // us, so this is deliberately not a success state. Assigning to
      // location.href avoids window.open() and its popup blockers.
      window.location.href = buildMailto(contactEmail, values);
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
          message: values.message.trim(),
          _subject: `TrailComand pilot enquiry — ${values.agency.trim()}`,
          source: "trailcomand.com/contact",
        }),
      });

      if (!response.ok) {
        throw new Error(`The form service replied with ${response.status}.`);
      }

      setStatus({ state: "sent", via: "endpoint" });
      setValues(initialValues);
    } catch {
      setStatus({
        state: "error",
        message:
          "Your enquiry could not be delivered right now. Please try again in a moment, or email us directly using the address below.",
      });
    }
  }

  const submitting = status.state === "submitting";

  if (status.state === "sent") {
    return (
      <div
        role="status"
        className="rounded-xl border border-sage-line bg-sage/70 p-6 sm:p-8"
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-forest text-white">
          <CheckIcon className="size-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-forest-ink">
          Thank you — your enquiry has been sent.
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-6 text-ink-muted">
          We read every enquiry ourselves and aim to reply within a few working days. If
          you do not hear back, email{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="font-medium break-all text-forest underline decoration-sage-line underline-offset-2 hover:decoration-forest"
          >
            {contactEmail}
          </a>{" "}
          and we will pick it up from there.
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      ref={formRef}
      onSubmit={handleSubmit}
      aria-describedby={`${formId}-intro`}
      className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-7"
    >
      <p id={`${formId}-intro`} className="mb-6 text-sm leading-6 text-ink-muted">
        Fields marked <span className="text-danger">*</span> are required. Your details
        are used only to reply to this enquiry.
      </p>

      {/* Error summary: focusable, announced, and lists every problem at once. */}
      <div
        tabIndex={-1}
        ref={summaryRef}
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
                    onClick={() => {
                      formRef.current
                        ?.querySelector<HTMLElement>(`[name="${field}"]`)
                        ?.focus();
                    }}
                    className="rounded text-left text-sm text-danger underline decoration-danger/40 underline-offset-2 hover:decoration-danger"
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
          name="name"
          label="Your name"
          autoComplete="name"
          value={values.name}
          error={errors.name}
          id={`${formId}-name`}
          disabled={submitting}
          onChange={(value) => update("name", value)}
        />
        <Field
          name="agency"
          label="Agency name"
          value={values.agency}
          error={errors.agency}
          disabled={submitting}
          id={`${formId}-agency`}
          autoComplete="organization"
          onChange={(value) => update("agency", value)}
        />
        <Field
          name="email"
          type="email"
          label="Email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          disabled={submitting}
          id={`${formId}-email`}
          className="sm:col-span-2"
          hint="We reply to this address only."
          onChange={(value) => update("email", value)}
        />
        <Field
          multiline
          name="message"
          disabled={submitting}
          value={values.message}
          error={errors.message}
          id={`${formId}-message`}
          className="sm:col-span-2"
          label="How do you coordinate trips today?"
          onChange={(value) => update("message", value)}
          hint="For example: number of departures per year, who coordinates them, which lodges and suppliers you work with, and where things usually go wrong."
        />
      </div>

      {/* Delivery status */}
      {status.state === "error" ? (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-danger/30 bg-danger-soft p-4"
        >
          <p className="text-sm leading-6 text-danger">{status.message}</p>
          <a
            href={buildMailto(contactEmail, values)}
            className="mt-1 inline-block rounded text-sm font-medium break-all text-forest underline decoration-sage-line underline-offset-2 hover:decoration-forest"
          >
            Email {contactEmail} instead
          </a>
        </div>
      ) : null}

      {status.state === "mailto" ? (
        <div
          role="status"
          className="mt-5 rounded-lg border border-sage-line bg-sage/70 p-4"
        >
          <p className="text-sm font-medium text-forest-ink">
            Your email app has been opened with this enquiry pre-filled.
          </p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            This site cannot send email itself, so nothing is sent until you press send in
            your email app. If nothing opened,{" "}
            <a
              href={buildMailto(contactEmail, values)}
              className="font-medium break-all text-forest underline decoration-sage-line underline-offset-2 hover:decoration-forest"
            >
              open the draft again
            </a>{" "}
            or email{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-medium break-all text-forest underline decoration-sage-line underline-offset-2 hover:decoration-forest"
            >
              {contactEmail}
            </a>{" "}
            directly.
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button
          size="lg"
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          {submitting ? "Sending…" : PILOT_CTA_LABEL}
        </Button>
        <p className="text-xs leading-5 text-ink-subtle sm:max-w-[16rem] sm:text-right">
          {endpoint
            ? "Submitted securely to our form provider."
            : "Opens your email app — you review and send the message yourself."}
        </p>
      </div>
    </form>
  );
}

type FieldProps = {
  id: string;
  name: FieldName;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: "text" | "email";
  inputMode?: "text" | "email";
  autoComplete?: string;
  multiline?: boolean;
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
  type = "text",
  inputMode,
  autoComplete,
  multiline = false,
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
    required: true,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy || undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    className: cn(
      "mt-1.5 w-full rounded-lg border bg-surface px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-subtle/80",
      "transition-colors outline-none focus:border-forest focus:ring-2 focus:ring-forest/20",
      "disabled:cursor-not-allowed disabled:bg-surface-sunken",
      error ? "border-danger/60" : "border-line-strong hover:border-sage-line",
      multiline ? "min-h-36 resize-y py-3 leading-6" : "h-11",
    ),
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}{" "}
        <span className="text-danger" aria-hidden="true">
          *
        </span>
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
