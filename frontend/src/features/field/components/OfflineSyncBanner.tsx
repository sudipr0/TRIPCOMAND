import { WarningIcon } from '@/components/icons';
import { Card } from '@/components/ui/card';

interface OfflineSyncBannerProps {
  online: boolean;
  pending: number;
  syncing?: boolean;
  onFlush?: () => void;
}

/** Persistent, high-contrast status strip for the guide screen. */
export function OfflineSyncBanner({ online, pending, syncing, onFlush }: OfflineSyncBannerProps) {
  if (online && pending === 0) return null;

  const tone = online ? 'border-warning/40 bg-[hsl(var(--warning)/0.08)] text-warning' : 'border-border-strong bg-bg-subtle text-fg';
  const message = !online
    ? 'You are offline. Data will sync when connected.'
    : syncing
      ? `Syncing ${pending} ${pending === 1 ? 'item' : 'items'}...`
      : `${pending} ${pending === 1 ? 'item is' : 'items are'} waiting to sync.`;

  return (
    <Card role="status" className={`flex items-start gap-3 px-4 py-3 ${tone}`}>
      <WarningIcon size={18} weight="regular" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{message}</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          {!online
            ? 'Keep using the app. Everything is stored on this device.'
            : 'Connection restored. Keep this screen open until it clears.'}
        </p>
      </div>
      {online && pending > 0 && onFlush ? (
        <button
          type="button"
          onClick={onFlush}
          disabled={syncing}
          className="shrink-0 rounded-md border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg transition-colors duration-fast hover:bg-bg-muted disabled:opacity-50"
        >
          Sync now
        </button>
      ) : null}
    </Card>
  );
}
