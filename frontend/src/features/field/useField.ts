import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CheckInType, CreateCheckInInput, CreateFieldReportInput, ReportType } from '@trailcomand/shared';

import { extractError } from '@/lib/api-client';
import { fieldApi } from '@/features/field/field.api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  enqueue,
  flushQueue,
  isBrowserOnline,
  readQueue,
  removeFromQueue,
  subscribeToQueue,
} from '@/lib/offline-queue';

export const fieldKeys = {
  all: (workspaceId: string) => ['field', workspaceId] as const,
  trips: (workspaceId: string) => [...fieldKeys.all(workspaceId), 'trips'] as const,
  data: (workspaceId: string, tripId: string) => [...fieldKeys.all(workspaceId), 'data', tripId] as const,
};

function requireWorkspace(id: string | null): string {
  if (!id) throw new Error('No workspace selected');
  return id;
}

export function useFieldTrips() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: fieldKeys.trips(workspaceId ?? ''),
    queryFn: ({ signal }) => fieldApi.trips(requireWorkspace(workspaceId), signal),
    enabled: Boolean(workspaceId),
    // A guide opens this screen repeatedly between legs; refetch on focus keeps "today" honest.
    refetchOnWindowFocus: true,
  });
}

export function useFieldData(tripId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: fieldKeys.data(workspaceId ?? '', tripId ?? ''),
    queryFn: ({ signal }) => fieldApi.getFieldData(requireWorkspace(workspaceId), tripId!, signal),
    enabled: Boolean(workspaceId && tripId),
    refetchInterval: 30_000,
  });
}

/** clientIds currently in flight, so a double tap cannot POST the same entry twice. */
const pendingSubmissions = new Set<string>();

/**
 * Sends immediately when online, otherwise (or on a network failure) leaves the
 * entry in the queue. A 4xx rejection surfaces to the user; a timeout or network
 * error is retried later by the sync loop.
 */
async function submitOrQueue(
  workspaceId: string,
  tripId: string,
  type: 'check-in' | 'report',
  payload: Record<string, unknown>,
  summary: string,
) {
  const clientId = payload.clientId as string;
  if (pendingSubmissions.has(clientId)) return { queued: false as const };
  pendingSubmissions.add(clientId);
  try {
    if (!isBrowserOnline()) {
      enqueue({ id: clientId, type, workspaceId, tripId, payload, summary });
      return { queued: true as const };
    }
    try {
      const send = type === 'check-in' ? fieldApi.createCheckIn : fieldApi.createReport;
      await send(workspaceId, tripId, payload as never);
      return { queued: false as const };
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status && status >= 400 && status < 500) throw error;
      enqueue({ id: clientId, type, workspaceId, tripId, payload, summary });
      return { queued: true as const };
    }
  } finally {
    pendingSubmissions.delete(clientId);
  }
}

function showSubmitError(error: unknown, fallback: string) {
  toast.error(extractError(error)?.message ?? (error instanceof Error ? error.message : fallback));
}

export function useCreateCheckIn(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCheckInInput) =>
      submitOrQueue(
        requireWorkspace(workspaceId),
        tripId,
        'check-in',
        input as unknown as Record<string, unknown>,
        checkInSummary(input.checkInType, input.message ?? null),
      ),
    onSuccess: (result) => {
      // Toast first: the caller closes the sheet as soon as this resolves.
      if (result.queued) {
        toast.success('Saved offline. Will sync.');
        return;
      }
      toast.success('Check-in sent');
      void queryClient.invalidateQueries({ queryKey: fieldKeys.data(requireWorkspace(workspaceId), tripId) });
    },
    onError: (error) => showSubmitError(error, 'Could not send the check-in'),
  });
}

export function useCreateReport(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFieldReportInput) =>
      submitOrQueue(
        requireWorkspace(workspaceId),
        tripId,
        'report',
        input as unknown as Record<string, unknown>,
        reportSummary(input.reportType, input.description),
      ),
    onSuccess: (result, input) => {
      if (result.queued) {
        toast.success('Saved offline. Will sync.');
        return;
      }
      toast.success(input.reportType === 'EMERGENCY' ? 'Emergency sent to the office' : 'Report sent');
      void queryClient.invalidateQueries({ queryKey: fieldKeys.data(requireWorkspace(workspaceId), tripId) });
    },
    onError: (error) => showSubmitError(error, 'Could not send the report'),
  });
}

/**
 * Watches connectivity and queue size. Flushes on `online`, retries every 30s while
 * anything is pending, and reports how many entries are still waiting.
 */
export function useOfflineSync() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(isBrowserOnline);
  const [pending, setPending] = useState(() => readQueue().length);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => subscribeToQueue(setPending), []);

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

  useEffect(() => {
    if (!online || pending === 0) return;
    let cancelled = false;
    const run = async () => {
      setSyncing(true);
      try {
        const result = await flushQueue();
        if (cancelled) return;
        // Still pending means the network is down again; the `online` event resumes us.
        if (result.remaining > 0) return;
        if (result.sent > 0 && workspaceId) {
          toast.success(`${result.sent} ${result.sent === 1 ? 'item' : 'items'} synced`);
          void queryClient.invalidateQueries({ queryKey: fieldKeys.all(workspaceId) });
          void queryClient.invalidateQueries({ queryKey: ['trips'] });
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };
    void run();
    const timer = window.setInterval(run, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [online, pending, workspaceId, queryClient]);

  function flushNow() {
    if (syncing) return;
    void flushQueue().then((result) => {
      if (result.sent > 0 && workspaceId) {
        toast.success(`${result.sent} ${result.sent === 1 ? 'item' : 'items'} synced`);
        void queryClient.invalidateQueries({ queryKey: fieldKeys.all(workspaceId) });
        void queryClient.invalidateQueries({ queryKey: ['trips'] });
      }
    });
  }

  /** Emergency path: bypass the offline queue and try once, right now. */
  async function sendEmergencyNow(
    tripId: string,
    input: CreateFieldReportInput,
  ): Promise<'sent' | 'queued'> {
    const id = requireWorkspace(workspaceId);
    try {
      await fieldApi.createReport(id, tripId, input);
      removeFromQueue(input.clientId);
      void queryClient.invalidateQueries({ queryKey: fieldKeys.data(id, tripId) });
      return 'sent';
    } catch {
      enqueue({
        id: input.clientId,
        type: 'report',
        workspaceId: id,
        tripId,
        payload: input as unknown as Record<string, unknown>,
        summary: reportSummary(input.reportType, input.description),
      });
      return 'queued';
    }
  }

  return { online, pending, syncing, flushNow, sendEmergencyNow };
}

export function checkInSummary(type: CheckInType, message: string | null) {
  const label = CHECK_IN_LABELS[type];
  return message ? `${label} — ${message}` : label;
}

export function reportSummary(type: ReportType, description: string) {
  return `${REPORT_LABELS[type]} — ${description}`;
}

export const CHECK_IN_LABELS: Record<CheckInType, string> = {
  START: 'Start of day',
  MID: 'Midday check-in',
  END: 'End of day',
  EMERGENCY: 'Emergency',
  DELAY: 'Running late',
  ISSUE: 'Issue',
};

export const REPORT_LABELS: Record<ReportType, string> = {
  PROGRESS_UPDATE: 'Progress update',
  DELAY: 'Delay',
  WEATHER: 'Weather',
  ROUTE_ISSUE: 'Route issue',
  ACCOMMODATION_ISSUE: 'Accommodation issue',
  SUPPLIER_ISSUE: 'Supplier issue',
  TRAVELER_ISSUE: 'Traveler issue',
  SAFETY_CONCERN: 'Safety concern',
  EMERGENCY: 'Emergency',
  OTHER: 'Other',
};

export const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};
