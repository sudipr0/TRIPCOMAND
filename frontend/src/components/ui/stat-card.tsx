import { cn } from '@/lib/utils';

export type StatCardTone = 'default' | 'success' | 'danger';

const toneClasses: Record<StatCardTone, string> = {
  default: 'text-fg',
  success: 'text-success',
  danger: 'text-danger',
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  tone?: StatCardTone;
  className?: string;
}

/**
 * Single metric tile. Used for quotation and booking financial summaries.
 * Values are always tabular so stacked stat cards align column to column.
 */
export function StatCard({ label, value, subtext, tone = 'default', className }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-bg-subtle px-4 py-3', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', toneClasses[tone])}>{value}</p>
      {subtext !== undefined && subtext !== null && subtext !== '' ? (
        <p className="mt-1 text-xs text-fg-muted">{subtext}</p>
      ) : null}
    </div>
  );
}
