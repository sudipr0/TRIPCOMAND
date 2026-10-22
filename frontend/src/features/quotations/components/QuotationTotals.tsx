import { cn, formatCurrency } from '@/lib/utils';

export interface QuotationTotalsProps {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  className?: string;
}

/** Right-aligned totals block. Values recompute on every render, so callers can pass live state. */
export function QuotationTotals({ subtotal, discount, tax, total, currency, className }: QuotationTotalsProps) {
  return (
    <dl className={cn('ml-auto w-full max-w-xs space-y-2 text-sm', className)}>
      <div className="flex items-center justify-between gap-6">
        <dt className="text-fg-muted">Subtotal</dt>
        <dd className="tabular-nums text-fg">{formatCurrency(subtotal, currency)}</dd>
      </div>
      {discount > 0 ? (
        <div className="flex items-center justify-between gap-6">
          <dt className="text-fg-muted">Discount</dt>
          <dd className="tabular-nums text-danger">-{formatCurrency(discount, currency)}</dd>
        </div>
      ) : null}
      {tax > 0 ? (
        <div className="flex items-center justify-between gap-6">
          <dt className="text-fg-muted">Tax</dt>
          <dd className="tabular-nums text-fg">+{formatCurrency(tax, currency)}</dd>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-6 border-t border-border pt-3">
        <dt className="font-medium text-fg">Total</dt>
        <dd className="text-lg font-semibold tabular-nums text-accent">{formatCurrency(total, currency)}</dd>
      </div>
    </dl>
  );
}

export function computeTotals(items: { quantity: number; unitPrice: number }[], discount: number, tax: number) {
  const subtotal = items.reduce(
    (sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0) * (Number.isFinite(item.unitPrice) ? item.unitPrice : 0),
    0,
  );
  return { subtotal, total: subtotal - (discount || 0) + (tax || 0) };
}
