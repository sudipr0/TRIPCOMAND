import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-bg-muted text-fg-muted',
  success: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
  warning: 'bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]',
  danger: 'bg-[hsl(var(--danger)/0.10)] text-[hsl(var(--danger))]',
  info: 'bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn('inline-flex h-6 items-center rounded-sm px-2.5 text-xs font-medium', variants[variant], className)}
      {...props}
    />
  );
}
