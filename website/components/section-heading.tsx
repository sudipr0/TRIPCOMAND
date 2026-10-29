import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type SectionHeadingProps = {
  /** Small overline used as a section label, not a heading. */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Heading level for correct document outline. Defaults to h2. */
  as?: "h1" | "h2" | "h3";
  align?: "left" | "center";
  /**
   * ID for the heading element. Pair with `<section aria-labelledby={id}>`.
   *
   * Required in practice for any heading that labels a section: a section whose
   * aria-labelledby points at a missing id is an ARIA error, and axe reports it
   * as `aria-valid-attr-value`. Passing the id here is the only way to keep the
   * two in sync, since the heading tag is chosen by this component.
   */
  titleId?: string;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  as: Heading = "h2",
  align = "left",
  titleId,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}
    >
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold tracking-[0.1em] text-forest uppercase">
          {eyebrow}
        </p>
      ) : null}
      <Heading
        id={titleId}
        className={cn(
          "text-ink",
          Heading === "h1"
            ? "text-[2.125rem] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-5xl lg:text-[3.5rem]"
            : "text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.025em] sm:text-[2.125rem]",
        )}
      >
        {title}
      </Heading>
      {description ? (
        <div className="mt-4 text-base leading-7 text-ink-muted sm:text-[1.0625rem]">
          {description}
        </div>
      ) : null}
    </div>
  );
}
