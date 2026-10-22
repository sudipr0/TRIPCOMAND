import type { ListBookingsQuery, ListInquiriesQuery, ListQuotationsQuery, ListTripsQuery } from '@tripchange/shared';
import { Link } from 'react-router-dom';

import { BookingIcon, ChatIcon, FileIcon, TripIcon, WarningIcon } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { useBookings } from '@/features/bookings/hooks/useBookings';
import { useInquiries } from '@/features/inquiries/hooks/useInquiries';
import { useQuotations } from '@/features/quotations/hooks/useQuotations';
import { useTrips } from '@/features/trips/hooks/useTrips';
import { useSupplierDeadlines } from '@/features/suppliers/hooks/useSupplierBookings';
import { useWorkspaceStore } from '@/stores/workspace.store';

interface Stat {
  label: string;
  to: string;
  icon: typeof TripIcon;
  value: number | 'error' | null;
}

/** One-count queries: limit=1 keeps the payload tiny while `total` gives the full count. */
export function DashboardPage() {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const workspaceName = workspaces.find((workspace) => workspace.id === currentWorkspaceId)?.name ?? 'Your workspace';

  const sentQuotations = useQuotations({ status: 'SENT', limit: 1, offset: 0 } satisfies ListQuotationsQuery);
  const newInquiries = useInquiries({ status: 'NEW', limit: 1, offset: 0 } satisfies ListInquiriesQuery);
  const confirmedBookings = useBookings({ status: 'CONFIRMED', limit: 1, offset: 0 } satisfies ListBookingsQuery);
  const activeTrips = useTrips({ status: 'IN_PROGRESS', limit: 1, offset: 0 } satisfies ListTripsQuery);
  const deadlines = useSupplierDeadlines(168);

  const stats: Stat[] = [
    { label: 'New inquiries', to: '/inquiries', icon: ChatIcon, value: statValue(newInquiries) },
    { label: 'Sent quotations', to: '/quotations', icon: FileIcon, value: statValue(sentQuotations) },
    { label: 'Confirmed bookings', to: '/bookings', icon: BookingIcon, value: statValue(confirmedBookings) },
    { label: 'Active trips', to: '/trips', icon: TripIcon, value: statValue(activeTrips) },
    { label: 'Deadlines this week', to: '/suppliers', icon: WarningIcon, value: statValue(deadlines) },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Dashboard</h1>
        <p className="mt-2 text-sm text-fg-muted">{workspaceName}</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {stats.map(({ label, to, icon: Icon, value }) => (
          <Card key={label} className="p-5">
            <Link to={to} className="group flex items-start justify-between focus-visible:outline-none">
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg-muted">{label}</p>
                {value === null ? (
                  <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums text-fg-subtle">&mdash;</p>
                ) : value === 'error' ? (
                  <p className="mt-5 text-3xl font-semibold tracking-tight text-fg-muted">Error</p>
                ) : (
                  <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums text-fg">{value}</p>
                )}
                <p className="mt-2 text-xs text-fg-subtle transition-colors group-hover:text-accent">View all &rarr;</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
                <Icon size={20} weight="bold" />
              </div>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

function statValue(query: { isPending: boolean; isError: boolean; data?: { total: number } | { length: number } | undefined }): Stat['value'] {
  if (query.isPending) return null;
  if (query.isError) return 'error';
  const data = query.data as { total?: number; length?: number } | undefined;
  return data?.total ?? data?.length ?? 0;
}
