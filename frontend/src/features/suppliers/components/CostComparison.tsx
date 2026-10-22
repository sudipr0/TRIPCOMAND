import { formatCurrency } from '@/lib/utils';

export interface CostSummaryProps {
  estimated: string | number | null | undefined;
  confirmed: string | number | null | undefined;
  actual: string | number | null | undefined;
  currency: string;
  /** Compact is used inside table cells; full is used on detail surfaces. */
  layout?: 'rows' | 'columns';
}

const money = (value: string | number | null | undefined, currency: string) =>
  value === null || value === undefined || value === '' ? '—' : formatCurrency(value, currency);

/**
 * Estimated → confirmed → actual, always all three so drift is visible.
 * The variance only appears once an actual cost exists, because before that
 * "confirmed" is still the latest known figure.
 */
export function CostComparison({ estimated, confirmed, actual, currency, layout = 'rows' }: CostSummaryProps) {
  const actualNumber = actual === null || actual === undefined || actual === '' ? null : Number(actual);
  const confirmedNumber = confirmed === null || confirmed === undefined || confirmed === '' ? null : Number(confirmed);
  const variance = actualNumber !== null && confirmedNumber !== null ? actualNumber - confirmedNumber : null;

  const cells = [
    { label: 'Est.', value: money(estimated, currency), tone: 'text-fg-subtle' },
    { label: 'Conf.', value: money(confirmed, currency), tone: 'text-fg' },
    { label: 'Act.', value: money(actual, currency), tone: variance ? 'text-warning' : 'text-fg' },
  ];

  if (layout === 'columns') {
    return (
      <dl className="grid grid-cols-3 gap-3">
        {cells.map((cell) => (
          <div key={cell.label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{cell.label}</dt>
            <dd className={`mt-1 text-sm font-medium tabular-nums ${cell.tone}`}>{cell.value}</dd>
          </div>
        ))}
        {variance ? (
          <div className="col-span-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Variance</dt>
            <dd className={`mt-1 text-sm tabular-nums ${variance > 0 ? 'text-danger' : 'text-success'}`}>
              {variance > 0 ? '+' : ''}{money(String(variance), currency)}
            </dd>
          </div>
        ) : null}
      </dl>
    );
  }

  return (
    <dl className="space-y-0.5">
      {cells.map((cell) => (
        <div key={cell.label} className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-fg-subtle">{cell.label}</dt>
          <dd className={`text-sm tabular-nums ${cell.tone}`}>{cell.value}</dd>
        </div>
      ))}
      {variance ? (
        <div className="flex items-baseline justify-between gap-2 border-t border-border pt-0.5">
          <dt className="text-xs text-fg-subtle">Δ</dt>
          <dd className={`text-xs tabular-nums ${variance > 0 ? 'text-danger' : 'text-success'}`}>
            {variance > 0 ? '+' : ''}{money(String(variance), currency)}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
