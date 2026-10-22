import { Badge } from '@/components/ui/badge';

export function StaffLicenseExpiry({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-fg-muted">—</span>;
  const day = expiresAt.slice(0, 10);
  const today = new Date();
  const remaining = (Date.parse(`${day}T00:00:00Z`) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000;
  return <span className="inline-flex flex-wrap items-center gap-2">
    <span>{day}</span>
    {remaining < 0 ? <Badge variant="danger">Expired</Badge> : remaining <= 30 ? <Badge variant="warning">Expiring soon</Badge> : null}
  </span>;
}
