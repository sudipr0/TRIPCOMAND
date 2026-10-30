import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

// Focus is handled by the shared `.focus-ring` utility (app/globals.css) so a
// button cannot drift from the rest of the site. It is a two-tone ring: a teal
// outer ring plus a light inner ring, which stays visible on light surfaces, on
// the navy bands and on teal buttons alike.
const base =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap " +
  // Only colour properties transition. `transition-colors` would also animate
  // `outline-color`, delaying the focus ring for ~150ms after each Tab; that is
  // the one thing a keyboard user needs immediately.
  "transition-[background-color,border-color,color,box-shadow] duration-150 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  // teal-strong carries white text at 4.72:1; the raw brand teal (3.00:1) is
  // never used as a button background with white text.
  primary: "bg-teal-strong text-white shadow-[0_1px_2px_rgb(15_30_51/0.18)] hover:bg-teal-hover",
  secondary: "border border-line-strong bg-surface text-navy hover:border-teal/50 hover:bg-mint/60",
  ghost: "text-ink-muted hover:bg-mint/70 hover:text-navy",
  inverse: "bg-surface text-navy hover:bg-mint",
};


const sizes: Record<Size, string> = {
  // 36px tall is only used in the header bar on desktop, where it pairs with
  // the taller nav hit areas; every standalone CTA is >= 44px.
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-4 text-[0.9375rem]",
  lg: "h-12 px-5 text-base",
};

type ButtonStyleProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleProps = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonLinkProps = ButtonStyleProps &
  Omit<ComponentProps<typeof Link>, "className"> & { children: ReactNode };

/** Internal navigation button. Renders a real anchor for normal link semantics. */
export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}

type ButtonAnchorProps = ButtonStyleProps &
  Omit<ComponentProps<"a">, "className"> & { children: ReactNode };

/** External link button (for example, the product login). */
export function ButtonAnchor({
  variant,
  size,
  className,
  children,
  ...props
}: ButtonAnchorProps) {
  return (
    <a className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </a>
  );
}

type ButtonProps = ButtonStyleProps & Omit<ComponentProps<"button">, "className">;

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
}
