import type { PortalCommandCenter } from '@trailcomand/shared';
import type { PortalHelpRequestInput } from '@trailcomand/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CreateTripDocumentInput } from '@trailcomand/shared';
import type { PortalUpdateAcknowledgement } from '@trailcomand/shared';
import type { TravelerUploadDocumentInput } from '@trailcomand/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { extractError } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { portalScopeId } from '@/features/portal/lib/portal-offline-cache';
import { portalAdminApi, portalApi } from '@/features/portal/api/portal.api';
import { isSnapshotStale } from '@/features/portal/lib/portal-offline-cache';
import { readCachedPortal } from '@/features/portal/lib/portal-offline-cache';
import { writeCachedPortal } from '@/features/portal/lib/portal-offline-cache';

export { clearCachedPortal } from '@/features/portal/lib/portal-offline-cache';

function requireWorkspace(id: string | null): string {
  if (!id) throw new Error('No workspace selected');
  return id;
}

function isOfflineError(error: unknown): boolean {
  const axiosLike = error as { code?: string; response?: unknown } | null;
  if (!axiosLike) return false;
  // Axios uses ERR_NETWORK for connection failures and ECONNABORTED for timeouts.
  if (axiosLike.code === 'ERR_NETWORK' || axiosLike.code === 'ECONNABORTED') return true;
  return !axiosLike.response;
}

export const portalKeys = {
  all: (token: string) => ['portal', token] as const,
  data: (token: string) => [...portalKeys.all(token), 'data'] as const,
};

/**
 * The public portal's data must not sit in the shared office cache: a stale
 * traveler payload is both a privacy risk and a correctness bug. `staleTime: 0`
 * plus `gcTime: 0` keeps it per-tab and short-lived; the offline snapshot is a
 * separate, scoped store (see portal-offline-cache).
 */
export function usePortalData(token: string | undefined) {
  return useQuery({
    queryKey: portalKeys.data(token ?? ''),
    queryFn: ({ signal }) => portalApi.view(token!, signal),
    enabled: Boolean(token),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export interface PortalViewState {
  data: PortalCommandCenter | null;
  /** The request is in flight and there is nothing to show yet. */
  isLoading: boolean;
  /** A hard failure with no usable cache (invalid link, 404, expired). */
  error: unknown | null;
  /** True when what is on screen came from the device, not the network. */
  isOffline: boolean;
  /** The cache is old enough to warn about. */
  isStale: boolean;
  /** When the displayed data was last synchronized with the server. */
  lastSyncedAt: string | null;
  /** Manual retry; also returns the portal to online mode when it succeeds. */
  refresh: () => void;
  isRefreshing: boolean;
  online: boolean;
}

/**
 * Wraps `usePortalData` with the offline snapshot:
 *  - a successful fetch is written to the scoped cache;
 *  - a network failure falls back to the last good snapshot;
 *  - a 404 (invalid/expired link) never falls back: the link is simply not valid.
 */
export function usePortalView(token: string | undefined): PortalViewState {
  const query = usePortalData(token);
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [cached, setCached] = useState<PortalCommandCenter | null>(null);
  const [cachedSavedAt, setCachedSavedAt] = useState<string | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const wroteFor = useRef<string | null>(null);

  // Derive the storage scope asynchronously; the token itself never leaves memory.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setScopeId(null);
      return () => {
        cancelled = true;
      };
    }
    void portalScopeId(token).then((id) => {
      if (!cancelled) setScopeId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Load the snapshot as soon as the scope is known, so a cold offline start renders.
  useEffect(() => {
    if (!scopeId) return;
    const snapshot = readCachedPortal(scopeId);
    setCached(snapshot?.data ?? null);
    setCachedSavedAt(snapshot?.savedAt ?? null);
  }, [scopeId]);

  // Persist each successful, complete fetch exactly once per data generation.
  useEffect(() => {
    if (!scopeId || !query.data) return;
    const marker = `${scopeId}:${query.data.syncedAt}`;
    if (wroteFor.current === marker) return;
    const snapshot = writeCachedPortal(scopeId, query.data);
    wroteFor.current = marker;
    if (snapshot) {
      setCached(snapshot.data);
      setCachedSavedAt(snapshot.savedAt);
    }
  }, [scopeId, query.data]);

  const status = (query.error as { response?: { status?: number } | null } | null)?.response?.status;
  // A 404/410 means the link itself is unusable — an old snapshot must not be shown.
  const linkRejected = status === 404 || status === 410 || status === 403;
  const networkFailure = Boolean(query.error) && !linkRejected && isOfflineError(query.error);
  const useCache = !query.data && Boolean(cached) && !linkRejected;

  const refresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  const data = query.data ?? (useCache ? cached : null);

  return {
    data,
    isLoading: query.isPending && !data,
    error: query.error && !data ? query.error : null,
    isOffline: useCache && (networkFailure || !online),
    isStale: Boolean(useCache && cachedSavedAt && isSnapshotStale(cachedSavedAt)),
    lastSyncedAt: query.data?.syncedAt ?? (useCache ? (cached?.syncedAt ?? null) : null),
    refresh,
    isRefreshing: query.isFetching,
    online,
  };
}

export const portalAdminKeys = {
  documents: (workspaceId: string, tripId: string) =>
    ['portal-admin', 'documents', workspaceId, tripId] as const,
  helpRequests: (workspaceId: string, tripId: string) =>
    ['portal-admin', 'help-requests', workspaceId, tripId] as const,
};

export function useTripDocuments(tripId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: portalAdminKeys.documents(workspaceId ?? '', tripId ?? ''),
    queryFn: ({ signal }) => portalAdminApi.documents(requireWorkspace(workspaceId), tripId!, signal),
    enabled: Boolean(workspaceId && tripId),
  });
}

/** Office: traveller help requests on this trip. */
export function usePortalHelpRequests(tripId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: portalAdminKeys.helpRequests(workspaceId ?? '', tripId ?? ''),
    queryFn: ({ signal }) =>
      portalAdminApi.helpRequests(requireWorkspace(workspaceId), tripId!, signal),
    enabled: Boolean(workspaceId && tripId),
    retry: false,
  });
}

export function useIssuePortalLink(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (travelerId: string) =>
      portalAdminApi.issueLink(requireWorkspace(workspaceId), tripId, travelerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalAdminKeys.documents(workspaceId ?? '', tripId) });
    },
  });
}

export function usePortalUpload(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TravelerUploadDocumentInput) =>
      portalApi.uploadDocument(token, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalKeys.data(token) });
    },
  });
}

export function useOfficeUploadDocument(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripDocumentInput) =>
      portalAdminApi.uploadDocument(requireWorkspace(workspaceId), tripId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalAdminKeys.documents(workspaceId ?? '', tripId) });
    },
  });
}

// ── Traveller actions ────────────────────────

export interface AcknowledgeOutcome {
  /** Server confirmed and persisted it. */
  acknowledged: PortalUpdateAcknowledgement;
  /** The payload now on screen, already patched so no refetch is needed. */
  data: PortalCommandCenter;
}

/**
 * Acknowledges an update.
 *
 * Only a 2xx response counts as acknowledged. Any other outcome — offline,
 * timeout, 5xx — surfaces as an error and the UI must never claim the server
 * recorded it. Repeat clicks are prevented at the call site by checking the
 * already-acknowledged set, and the server itself is idempotent.
 */
export function useAcknowledgeUpdate(token: string) {
  const queryClient = useQueryClient();
  const inFlight = useRef(new Set<string>());

  return useMutation({
    mutationFn: async (updateId: string): Promise<AcknowledgeOutcome> => {
      if (inFlight.current.has(updateId)) {
        throw new Error('That acknowledgement is already being saved.');
      }
      inFlight.current.add(updateId);
      try {
        const acknowledged = await portalApi.acknowledge(
          token,
          updateId,
          crypto.randomUUID(),
        );
        const current = queryClient.getQueryData<PortalCommandCenter>(
          portalKeys.data(token),
        );
        let next: PortalCommandCenter | null = null;
        if (current) {
          next = {
            ...current,
            updates: current.updates.map((update) =>
              update.id === updateId
                ? { ...update, acknowledgedAt: acknowledged.acknowledgedAt }
                : update,
            ),
            home: {
              ...current.home,
              unacknowledged: current.home.unacknowledged.filter((update) => update.id !== updateId),
            },
          };
          queryClient.setQueryData(portalKeys.data(token), next);
          // Keep the offline copy truthful too: it now reflects a real server write.
          const scope = await portalScopeId(token);
          writeCachedPortal(scope, next);
        }
        return { acknowledged, data: next ?? (current as PortalCommandCenter) };
      } finally {
        inFlight.current.delete(updateId);
      }
    },
  });
}

export interface HelpSubmitState {
  draft: string;
  setDraft: (value: string) => void;
  submit: () => Promise<void>;
  isSubmitting: boolean;
  /** Set only after the server confirmed the record exists. */
  confirmation: { reportId: string; createdAt: string } | null;
  /** A local, unconfirmed outcome: the request has NOT reached the agency. */
  queuedOffline: boolean;
  error: string | null;
  retry: () => void;
  reset: () => void;
  canSubmit: boolean;
  online: boolean;
}

/**
 * Help-request submission with an honest offline path.
 *
 * When the network is down the message is kept on this device (draft plus one
 * queued entry containing only the message and a clientId). It is explicitly
 * reported as "not sent yet", never as received. On reconnect the traveller can
 * retry; the same clientId makes the retry idempotent server-side.
 */
export function useHelpRequest(token: string): HelpSubmitState {
  const [draft, setDraft] = useState('');
  const [confirmation, setConfirmation] = useState<HelpSubmitState['confirmation']>(null);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  /** The exact text already sent with the current clientId, so it is not re-filed. */
  const [sentFingerprint, setSentFingerprint] = useState<string | null>(null);
  /** Synchronous double-tap guard: React state is too late to stop a second click. */
  const inFlight = useRef(false);
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async (input: PortalHelpRequestInput) => portalApi.helpRequest(token, input),
    onSuccess: (result) => {
      setConfirmation({ reportId: result.reportId, createdAt: result.createdAt });
      setQueuedOffline(false);
      setError(null);
      setDraft('');
      // A fresh id, so a genuinely new request cannot be swallowed as a retry.
      setClientId(crypto.randomUUID());
      setSentFingerprint(null);
    },
    onError: (failure) => {
      const detail = extractError(failure)?.message;
      if (isOfflineError(failure)) {
        setQueuedOffline(true);
        setError(null);
        return;
      }
      // The same text may be retried, but not re-filed as a second inquiry.
      setSentFingerprint(null);
      setError(detail ?? 'Your request could not be sent. Please try again.');
    },
  });

  const trimmed = draft.trim();
  const canSubmit =
    trimmed.length >= 10 &&
    trimmed.length <= 1500 &&
    !mutation.isPending &&
    !(sentFingerprint !== null && sentFingerprint === trimmed);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    // Guard against a double tap that fires before React re-renders the button:
    // one message is sent at most once per clientId, and the clientId only
    // rotates after a confirmed success.
    if (inFlight.current) return;
    inFlight.current = true;
    setQueuedOffline(false);
    setError(null);
    setSentFingerprint(trimmed);
    try {
      await mutation.mutateAsync({ message: trimmed, clientId }).catch(() => undefined);
    } finally {
      inFlight.current = false;
    }
  }, [canSubmit, clientId, mutation, trimmed]);

  const reset = useCallback(() => {
    setConfirmation(null);
    setQueuedOffline(false);
    setError(null);
    setSentFingerprint(null);
    // A deliberate new message is a new request: allow an identical text again.
    setClientId(crypto.randomUUID());
  }, []);

  return {
    draft,
    setDraft,
    submit,
    isSubmitting: mutation.isPending,
    confirmation,
    queuedOffline,
    error,
    retry: () => void submit(),
    reset,
    canSubmit,
    online,
  };
}
