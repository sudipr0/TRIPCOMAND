import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap " +
  "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<Variant, string> = {
  primary:
    "bg-forest text-white shadow-[0_1px_2px_rgb(15_47_35/0.24)] hover:bg-forest-hover focus-visible:outline-forest",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-sage-line hover:bg-sage focus-visible:outline-forest",
  ghost:
    "text-ink-muted hover:bg-sage hover:text-forest-ink focus-visible:outline-forest",
  inverse: "bg-surface text-forest-ink hover:bg-sage focus-visible:outline-white",
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
