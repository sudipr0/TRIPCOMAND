import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { CapabilityStatus } from "@/lib/content";
import { StatusBadge } from "@/components/ui/status-badge";

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  status?: CapabilityStatus;
  footnote?: string;
  className?: string;
};

/**
 * Feature card: icon in a sage tile, title, plain-language body, and an optional
 * capability status badge so nothing reads as a live promise by accident.
 */
export function FeatureCard({
  icon,
  title,
  body,
  status,
  footnote,
  className,
}: FeatureCardProps) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-card border border-line bg-surface p-6 shadow-card transition-[border-color,box-shadow] duration-200 hover:border-sage-line",
        className,
      )}
    >
      <div
        className="flex size-10 items-center justify-center rounded-lg border border-sage-line bg-sage text-forest"
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="mt-4 text-[1.0625rem] font-semibold text-ink">{title}</h3>
      <div className="mt-2 flex-1 text-[0.9375rem] leading-6 text-ink-muted">{body}</div>
      {footnote ? (
        <p className="mt-4 border-t border-line pt-3 text-[0.8125rem] leading-5 text-ink-subtle">
          {footnote}
        </p>
      ) : null}
      {status ? (
        <div className="mt-4">
          <StatusBadge status={status} />
        </div>
      ) : null}
    </article>
  );
}
