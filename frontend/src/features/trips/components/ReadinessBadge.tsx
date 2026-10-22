import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { ErrorIcon, WarningIcon, SuccessIcon } from '@/components/icons';

export type ReadinessStatus = 'NOT_READY' | 'PARTIAL' | 'READY' | 'BLOCKED';

export const readinessLabels: Record<ReadinessStatus, string> = {
  NOT_READY: 'Not ready',
  PARTIAL: 'Partial',
  READY: 'Ready',
  BLOCKED: 'Blocked',
};

const variants: Record<ReadinessStatus, BadgeVariant> = {
  NOT_READY: 'default',
  PARTIAL: 'warning',
  READY: 'success',
  BLOCKED: 'danger',
};

/**
 * Readiness is computed by the backend on every read (never stored). Trips that are
 * finished or cancelled have no operational readiness, so they render as a dash.
 */
export function ReadinessBadge({ status, title }: { status: ReadinessStatus | 'NOT_APPLICABLE'; title?: string }) {
  if (status === 'NOT_APPLICABLE') {
    return <span className="text-sm text-fg-subtle" title={title}>&mdash;</span>;
  }
  const Icon = status === 'READY' ? SuccessIcon : status === 'BLOCKED' ? ErrorIcon : status === 'PARTIAL' ? WarningIcon : null;
  return (
    <Badge variant={variants[status]} title={title}>
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      {readinessLabels[status]}
    </Badge>
  );
}

export function readinessTooltip(issues: string[], warnings: string[]): string | undefined {
  const parts = [...issues, ...warnings];
  return parts.length ? parts.join(' · ') : undefined;
}
