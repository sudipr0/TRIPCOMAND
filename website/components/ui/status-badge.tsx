import type { CapabilityStatus } from "@/lib/content";
import { cn } from "@/lib/cn";

/**
 * Capability status badge.
 *
 * Status is conveyed by a text label plus a leading dot — never by color alone —
 * so it survives grayscale, color-blindness and forced-colors mode.
 */
const styles: Record<CapabilityStatus, string> = {
  "Available in development build": "border-sage-line bg-sage text-forest-ink",
  "In development": "border-amber-line bg-amber-soft text-amber",
  Planned: "border-line-strong bg-surface-sunken text-ink-muted",
};

const dots: Record<CapabilityStatus, string> = {
  "Available in development build": "bg-forest",
  "In development": "bg-amber",
  Planned: "bg-ink-subtle",
};

export function StatusBadge({
  status,
  className,
}: {
  status: CapabilityStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        styles[status],
        className,
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", dots[status])}
        aria-hidden="true"
      />
      {status}
    </span>
  );
}
