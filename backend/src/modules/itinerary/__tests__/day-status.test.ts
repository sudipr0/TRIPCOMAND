import { describe, it, expect, vi } from 'vitest';

import { dayStatusForReportSeverity, dayStatusStore, nextDayStatus, setDayStatusFromEvent } from '../day-status.js';

describe('dayStatusForReportSeverity', () => {
  it('maps HIGH and URGENT to PROBLEM', () => {
    expect(dayStatusForReportSeverity('HIGH')).toBe('PROBLEM');
    expect(dayStatusForReportSeverity('URGENT')).toBe('PROBLEM');
  });

  it('maps MEDIUM and LOW to DELAYED', () => {
    expect(dayStatusForReportSeverity('MEDIUM')).toBe('DELAYED');
    expect(dayStatusForReportSeverity('LOW')).toBe('DELAYED');
  });

  it('treats an unknown severity as a delay rather than a problem', () => {
    expect(dayStatusForReportSeverity('SOMETHING_ELSE')).toBe('DELAYED');
  });
});

describe('nextDayStatus', () => {
  it('applies the incoming status when the day has no stronger signal', () => {
    expect(nextDayStatus('PENDING', 'DELAYED')).toBe('DELAYED');
    expect(nextDayStatus('PENDING', 'PROBLEM')).toBe('PROBLEM');
    expect(nextDayStatus('IN_PROGRESS', 'PROBLEM')).toBe('PROBLEM');
  });

  it('never downgrades PROBLEM to DELAYED', () => {
    expect(nextDayStatus('PROBLEM', 'DELAYED')).toBeNull();
    expect(nextDayStatus('PROBLEM', 'PROBLEM')).toBeNull();
  });

  it('never overrides an explicit COMPLETED day', () => {
    expect(nextDayStatus('COMPLETED', 'PROBLEM')).toBeNull();
    expect(nextDayStatus('COMPLETED', 'DELAYED')).toBeNull();
  });

  it('allows escalating from DELAYED to PROBLEM', () => {
    expect(nextDayStatus('DELAYED', 'PROBLEM')).toBe('PROBLEM');
  });
});

function fakeClient(day: { id: string; dayNumber: number; status: string } | null) {
  const findFirst = vi.fn().mockResolvedValue(day);
  const update = vi.fn().mockResolvedValue(day);
  return { client: { itineraryDay: { findFirst, update } }, findFirst, update };
}

describe('setDayStatusFromEvent', () => {
  const params = {
    workspaceId: 'ws-1',
    tripId: 'trip-1',
    dayId: 'day-3',
    status: 'PROBLEM' as const,
    entityType: 'field_report' as const,
    entityId: 'report-1',
  };

  it('scopes the lookup to the trip and workspace', async () => {
    const { client, findFirst } = fakeClient({ id: 'day-3', dayNumber: 3, status: 'IN_PROGRESS' });
    await setDayStatusFromEvent(dayStatusStore(client, { workspaceId: 'ws-1', tripId: 'trip-1' }), params);

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'day-3', tripId: 'trip-1', workspaceId: 'ws-1' },
      select: { id: true, dayNumber: true, status: true },
    });
  });

  it('writes the new status when the day changes', async () => {
    const { client, update } = fakeClient({ id: 'day-3', dayNumber: 3, status: 'IN_PROGRESS' });
    await setDayStatusFromEvent(dayStatusStore(client, { workspaceId: 'ws-1', tripId: 'trip-1' }), params);
    expect(update).toHaveBeenCalledWith({ where: { id: 'day-3' }, data: { status: 'PROBLEM' } });
  });

  it('writes nothing when the day is already in that state', async () => {
    const { client, update } = fakeClient({ id: 'day-3', dayNumber: 3, status: 'PROBLEM' });
    await setDayStatusFromEvent(dayStatusStore(client, { workspaceId: 'ws-1', tripId: 'trip-1' }), params);
    expect(update).not.toHaveBeenCalled();
  });

  it('writes nothing when the day is already completed', async () => {
    const { client, update } = fakeClient({ id: 'day-3', dayNumber: 3, status: 'COMPLETED' });
    await setDayStatusFromEvent(dayStatusStore(client, { workspaceId: 'ws-1', tripId: 'trip-1' }), params);
    expect(update).not.toHaveBeenCalled();
  });

  it('ignores a day id that belongs to another trip', async () => {
    const { client, update } = fakeClient(null);
    await setDayStatusFromEvent(dayStatusStore(client, { workspaceId: 'ws-1', tripId: 'trip-1' }), params);
    expect(update).not.toHaveBeenCalled();
  });
});
