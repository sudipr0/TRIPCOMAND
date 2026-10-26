import { apiClient } from '@/lib/api-client';

/**
 * Offline queue for field operations.
 *
 * Guides spend days without a signal, so every check-in and report is written to
 * localStorage first and only leaves the device when the request succeeds. Each
 * entry carries the `clientId` that was generated when the form opened, which makes
 * a retried sync safe: the backend upserts on `clientId`, so a POST that reached the
 * server but whose response was lost never creates a duplicate.
 */

export type OfflineActionType = 'check-in' | 'report';

export interface OfflineAction {
  /** Unique queue entry id (also the API payload's clientId). */
  id: string;
  type: OfflineActionType;
  workspaceId: string;
  tripId: string;
  /** Request body, exactly as it will be POSTed. */
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string;
  /** User-facing label shown while the entry is pending. */
  summary: string;
}

const QUEUE_KEY = 'trailcomand-field-queue';
const QUEUE_EVENT = 'trailcomand:field-queue';

function isAction(value: unknown): value is OfflineAction {
  if (!value || typeof value !== 'object') return false;
  const action = value as Partial<OfflineAction>;
  return (
    typeof action.id === 'string' &&
    (action.type === 'check-in' || action.type === 'report') &&
    typeof action.workspaceId === 'string' &&
    typeof action.tripId === 'string' &&
    typeof action.payload === 'object' &&
    action.payload !== null
  );
}

export function readQueue(): OfflineAction[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAction) : [];
  } catch {
    return [];
  }
}

function writeQueue(actions: OfflineAction[]) {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(actions));
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: actions.length }));
}

/** Listen for queue size changes (enqueue, flush). Returns the unsubscribe function. */
export function subscribeToQueue(listener: (pending: number) => void): () => void {
  const handler = () => listener(readQueue().length);
  window.addEventListener(QUEUE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(QUEUE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

/** Minimum delay between two flushes, so quick offline/online flaps cannot stampede. */
const FLUSH_COOLDOWN_MS = 5_000;
let lastFlushAt = 0;
let inFlight: Promise<FlushResult> | null = null;

export interface FlushResult {
  sent: number;
  remaining: number;
  failed: number;
}

export function enqueue(action: Omit<OfflineAction, 'createdAt' | 'attempts'>): OfflineAction {
  const entry: OfflineAction = { ...action, createdAt: new Date().toISOString(), attempts: 0 };
  const queue = readQueue().filter((item) => item.id !== entry.id);
  writeQueue([...queue, entry]);
  return entry;
}

export function removeFromQueue(id: string) {
  writeQueue(readQueue().filter((item) => item.id !== id));
}

export function clearQueue() {
  writeQueue([]);
}

function endpointFor(action: OfflineAction) {
  const suffix = action.type === 'check-in' ? 'check-ins' : 'reports';
  return `/api/workspaces/${action.workspaceId}/trips/${action.tripId}/${suffix}`;
}

/**
 * POST every queued entry in order. Successful entries are removed; a network
 * failure stops the run and leaves the rest queued. 4xx responses are dropped
 * (retrying a rejected payload forever would wedge the queue).
 */
export function flushQueue(): Promise<FlushResult> {
  if (inFlight) return inFlight;
  const now = Date.now();
  if (now - lastFlushAt < FLUSH_COOLDOWN_MS) {
    return Promise.resolve({ sent: 0, remaining: readQueue().length, failed: 0 });
  }
  lastFlushAt = now;

  inFlight = (async () => {
    let sent = 0;
    let failed = 0;
    for (const action of readQueue()) {
      try {
        await apiClient.post(endpointFor(action), action.payload);
        removeFromQueue(action.id);
        sent += 1;
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status && status >= 400 && status < 500) {
          // Drop the entry: retrying a rejected payload forever would wedge the queue.
          removeFromQueue(action.id);
          failed += 1;
          continue;
        }
        writeQueue(
          readQueue().map((item) =>
            item.id === action.id ? { ...item, attempts: item.attempts + 1 } : item,
          ),
        );
        break;
      }
    }
    lastFlushAt = Date.now();
    return { sent, remaining: readQueue().length, failed };
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/** Browser-level wiring: flush as soon as connectivity returns. */
export function installOfflineListeners(onOnline?: () => void) {
  const handler = () => {
    void flushQueue().then((result) => {
      if (result.sent > 0) onOnline?.();
    });
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

export function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
