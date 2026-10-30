import type { CapabilityStatus } from "@/lib/content";
import { cn } from "@/lib/cn";

/**
 * Capability status badge.
 *
 * Status is conveyed by a text label plus a leading dot — never by color alone —
 * so it survives grayscale, color-blindness and forced-colors mode.
 *
 * `compact` shortens the labels for cards, where the full sentence would wrap to
 * two lines. The full wording is always available to assistive tech through the
 * `title`/`aria-label`, and every card that uses it also explains the status in
 * its footnote text.
 */
const styles: Record<CapabilityStatus, string> = {
  "Available in development build": "border-mint-line bg-mint text-teal-ink",
  "In development": "border-amber-line bg-amber-soft text-amber",
  Planned: "border-line-strong bg-surface-sunken text-ink-muted",
};

const dots: Record<CapabilityStatus, string> = {
  "Available in development build": "bg-teal",
  "In development": "bg-amber",
  Planned: "bg-ink-subtle",
};

const shortLabels: Record<CapabilityStatus, string> = {
  "Available in development build": "In dev build",
  "In development": "In development",
  Planned: "Planned",
};

export function StatusBadge({
  status,
  compact = false,
  className,
}: {
  status: CapabilityStatus;
  compact?: boolean;
  className?: string;
}) {
  const label = compact ? shortLabels[status] : status;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide whitespace-nowrap",
        styles[status],
        className,
      )}
      title={compact ? status : undefined}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", dots[status])}
        aria-hidden="true"
      />
      {compact ? <span className="sr-only">{status}: </span> : null}
      {label}
    </span>
  );
}
