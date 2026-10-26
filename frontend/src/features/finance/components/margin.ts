import type { MarginBand } from '@trailcomand/shared';

import type { BadgeVariant } from '@/components/ui/badge';
import type { StatCardTone } from '@/components/ui/stat-card';

/**
 * One place for the margin colour language so the stat cards, the breakdown and
 * the dashboard table all agree: >= 20% healthy, 5-20% warning, below 5% critical.
 * (The dashboard's "low margin" flag is a stricter, separate 10% threshold.)
 */
export const MARGIN_BANDS: Record<MarginBand, { label: string; tone: StatCardTone; badge: BadgeVariant; text: string }> = {
  HEALTHY: { label: 'Healthy', tone: 'success', badge: 'success', text: 'text-success' },
  WARNING: { label: 'Tight', tone: 'default', badge: 'warning', text: 'text-warning' },
  CRITICAL: { label: 'Low', tone: 'danger', badge: 'danger', text: 'text-danger' },
  NO_REVENUE: { label: 'No revenue', tone: 'default', badge: 'default', text: 'text-fg-muted' },
};

/** Margin percentage to one decimal, e.g. "32.5%" or "-4.2%". */
export function formatMargin(value: number) {
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
}

export function formatSignedCurrency(amount: number, currency: string) {
  const formatted = new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  return `${amount < 0 ? '-' : ''}${formatted}`;
}
