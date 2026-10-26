import { useParams, useSearchParams } from 'react-router-dom';
import type { PortalCommandCenter } from '@trailcomand/shared';
import { useCallback, useEffect, useId, useState } from 'react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatDateRange } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { HelpTab } from '@/features/portal/components/HelpTab';
import { usePortalView } from '@/features/portal/hooks/usePortal';
import { UpdatesTab } from '@/features/portal/components/UpdatesTab';
import { TripHomeTab } from '@/features/portal/components/TripHomeTab';
import { DocumentsTab } from '@/features/portal/components/DocumentsTab';
import { CalendarBlankIcon, ChatIcon, FileIcon } from '@/components/icons';
import { FirstAidIcon, SpinnerIcon, WarningIcon } from '@/components/icons';
import { PortalTimeline } from '@/features/portal/components/PortalTimeline';
import { registerPortalServiceWorker } from '@/features/portal/lib/portal-pwa';
import { OfflineNotice, SyncStamp } from '@/features/portal/components/PortalPrimitives';
import { clearCachedPortal, portalScopeId } from '@/features/portal/lib/portal-offline-cache';

type PortalTab = 'home' | 'itinerary' | 'updates' | 'documents' | 'help';

const TABS: Array<{ value: PortalTab; label: string; shortLabel: string; icon: React.ElementType }> = [
  { value: 'home', label: 'Trip Home', shortLabel: 'Home', icon: WarningIcon },
  { value: 'itinerary', label: 'Itinerary', shortLabel: 'Itinerary', icon: CalendarBlankIcon },
  { value: 'updates', label: 'Updates', shortLabel: 'Updates', icon: ChatIcon },
  { value: 'documents', label: 'Documents', shortLabel: 'Docs', icon: FileIcon },
  { value: 'help', label: 'Help & Emergency', shortLabel: 'Help', icon: FirstAidIcon },
];

/** Rejected links get one plain message. We do not say which check failed. */
function InvalidLink() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--danger)/0.10)]">
          <WarningIcon size={24} className="text-danger" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-fg">This link is not valid</h1>
        <p className="mt-2 text-sm text-fg-muted">
          The link may have expired, been replaced, or been typed incorrectly. Please contact your trip
          organizer for a new one.
        </p>
      </div>
    </main>
  );
}

function PortalSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">Loading your trip…</span>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function LoadError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <Card role="alert" className="p-6 text-center">
      <p className="text-sm font-medium text-fg">We could not load your trip</p>
      <p className="mt-1 text-sm text-fg-muted">
        This looks like a connection problem. Nothing has been changed, and any trip details you had
        saved on this device are still there.
      </p>
      <div className="mt-4 flex justify-center">
        <Button type="button" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? <SpinnerIcon size={14} className="animate-spin" aria-hidden="true" /> : null}
          Try again
        </Button>
      </div>
    </Card>
  );
}

function AgencyHeader({ data }: { data: PortalCommandCenter }) {
  return (
    <header className="border-b border-border bg-bg-subtle px-4 pb-4 pt-6 sm:px-5">
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">{data.home.agency.agencyName}</p>
        <p className="mt-1 truncate text-base font-medium text-fg">{data.trip.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
          <span className="tabular-nums">{formatDateRange(data.trip.startDate, data.trip.endDate)}</span>
          <span className="tabular-nums text-fg-subtle">{data.trip.tripNumber}</span>
        </p>
      </div>
    </header>
  );
}

/** Accessible tab set shared by the mobile bottom bar and the desktop tab strip. */
function TabButton({
  tab,
  selected,
  onSelect,
  variant,
  badge,
}: {
  tab: (typeof TABS)[number];
  selected: boolean;
  onSelect: (value: PortalTab) => void;
  variant: 'bottom' | 'top';
  badge?: number;
}) {
  const Icon = tab.icon;
  return (
    <button
      role="tab"
      type="button"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(tab.value)}
      data-state={selected ? 'active' : 'inactive'}
      className={cn(
        'relative flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        variant === 'bottom'
          ? 'flex-col gap-0.5 px-1 py-2 text-[11px]'
          : 'border-b-2 border-transparent px-1 pb-3 pt-2',
        variant === 'top' && (selected ? 'border-accent text-fg' : 'text-fg-muted hover:text-fg'),
        variant === 'bottom' && (selected ? 'text-accent' : 'text-fg-muted'),
      )}
    >
      <span className="relative">
        <Icon size={variant === 'bottom' ? 22 : 16} aria-hidden="true" />
        {badge ? (
          <span
            aria-hidden="true"
            className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-semibold text-fg"
          >
            {badge}
          </span>
        ) : null}
      </span>
      <span>{variant === 'bottom' ? tab.shortLabel : tab.label}</span>
      {badge ? <span className="sr-only">{badge} updates need your attention</span> : null}
    </button>
  );
}

export function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const portal = usePortalView(token);
  registerPortalServiceWorker();
  const [tab, setTab] = useState<PortalTab>(() => {
    const requested = searchParams.get('tab');
    return TABS.some((item) => item.value === requested) ? (requested as PortalTab) : 'home';
  });
  const tabListId = useId();

  // Keep the destination in the URL so a reload or a bookmark lands on the same screen.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'home') next.delete('tab');
    else next.set('tab', tab);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [tab, searchParams, setSearchParams]);

  const selectTab = useCallback((value: PortalTab) => {
    setTab(value);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  if (!token) return <InvalidLink />;
  if (portal.isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-5">
        <PortalSkeleton />
      </main>
    );
  }
  if (portal.error) {
    // A rejected link is final; anything else may be a transient network problem.
    const status = (portal.error as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 410) return <InvalidLink />;
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-5">
        <LoadError onRetry={portal.refresh} isRetrying={portal.isRefreshing} />
      </main>
    );
  }
  if (!portal.data) return <InvalidLink />;

  const data = portal.data;
  const attention = data.home.unacknowledged.length;

  async function exitPortal() {
    if (token) {
      const scope = await portalScopeId(token);
      clearCachedPortal(scope);
    }
    window.location.assign('/');
  }

  const panels: Record<PortalTab, React.ReactNode> = {
    home: (
      <TripHomeTab
        data={data}
        onOpenUpdates={() => selectTab('updates')}
        onOpenItinerary={() => selectTab('itinerary')}
      />
    ),
    itinerary: data.itinerary.length ? (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-fg">Your itinerary</h2>
          <SyncStamp syncedAt={portal.lastSyncedAt} />
        </div>
        <p className="text-xs text-fg-subtle">
          Tap a day for distances, elevation, meals and accommodation. Times are shown in your device’s
          timezone; the trip runs on {data.trip.timezone} time.
        </p>
        <PortalTimeline days={data.itinerary} />
      </div>
    ) : (
      <EmptyState
        icon={CalendarBlankIcon}
        title="Itinerary not published yet"
        description="Your organizer has not shared the day-by-day plan. Check back closer to departure."
      />
    ),
    updates: (
      <UpdatesTab
        token={token}
        updates={data.updates}
        online={portal.online}
        onAcknowledged={portal.refresh}
      />
    ),
    documents: <DocumentsTab token={token} documents={data.documents} />,
    help: <HelpTab token={token} emergency={data.emergency} />,
  };

  return (
    <div className="min-h-screen bg-bg">
      <AgencyHeader data={data} />

      <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 sm:px-5 sm:pb-8">
        {/* Desktop / tablet: a conventional tab strip. */}
        <div
          role="tablist"
          id={`${tabListId}-list`}
          aria-label="Trip sections"
          className="mb-4 hidden items-center gap-5 border-b border-border sm:flex"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const index = TABS.findIndex((item) => item.value === tab);
            const nextIndex =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? TABS.length - 1
                  : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
            event.preventDefault();
            selectTab(TABS[nextIndex].value);
            document.getElementById(`${tabListId}-${TABS[nextIndex].value}`)?.focus();
          }}
        >
          {TABS.map((item) => (
            <div key={item.value} id={`${tabListId}-${item.value}`}>
              <TabButton
                tab={item}
                variant="top"
                onSelect={selectTab}
                selected={tab === item.value}
                badge={item.value === 'updates' ? attention : undefined}
              />
            </div>
          ))}
        </div>

        {portal.isOffline ? (
          <div className="mb-4">
            <OfflineNotice
              stale={portal.isStale}
              onRetry={portal.refresh}
              isRetrying={portal.isRefreshing}
              lastSyncedAt={portal.lastSyncedAt}
            />
          </div>
        ) : null}

        <main
          tabIndex={0}
          role="tabpanel"
          id={`${tabListId}-${tab}-panel`}
          aria-labelledby={`${tabListId}-${tab}`}
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <div key={tab} className="page-enter">
            {panels[tab]}
          </div>
        </main>

        <footer className="mt-10 space-y-2 text-center">
          <p className="text-xs text-fg-subtle">
            Prepared for {data.visitor.fullName} · {data.trip.name}
          </p>
          <p className="text-xs text-fg-subtle">
            This link stays valid until {new Date(data.expiresAt).toLocaleDateString()}.
          </p>
          <Button type="button" variant="link" size="sm" onClick={() => void exitPortal()}>
            Exit and remove saved data from this device
          </Button>
        </footer>
      </div>

      {/* Mobile: five-destination bottom navigation, safe-area aware. */}
      <nav
        aria-label="Trip sections"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80 sm:hidden"
      >
        <div className="mx-auto flex w-full max-w-2xl items-stretch justify-between px-2" role="tablist">
          {TABS.map((item) => (
            <TabButton
              tab={item}
              key={item.value}
              variant="bottom"
              onSelect={selectTab}
              selected={tab === item.value}
              badge={item.value === 'updates' ? attention : undefined}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
