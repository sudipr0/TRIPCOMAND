import type { DayStatusValue } from "@trailcomand/shared";

import { logger } from "../../lib/logger.js";

/**
 * The two day operations this helper performs, as plain closures. Taking
 * functions rather than a Prisma client keeps the helper decoupled from the
 * tenant extension's client type, which TypeScript will not unify with
 * Prisma.TransactionClient.
 */
export interface DayStatusStore {
  findDay(dayId: string): Promise<{ id: string; dayNumber: number; status: DayStatusValue } | null>;
  setStatus(dayId: string, status: DayStatusValue): Promise<void>;
}

/** Builds a DayStatusStore from any client exposing an `itineraryDay` delegate. */
export function dayStatusStore(
  client: {
    // `any` is confined to this adapter: the tenant-extended client's delegates
    // are generic and cannot be expressed against a structural signature.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itineraryDay: { findFirst: (args: any) => Promise<any>; update: (args: any) => Promise<any> };
  },
  scope: { workspaceId: string; tripId: string },
): DayStatusStore {
  return {
    findDay: (dayId) =>
      client.itineraryDay.findFirst({
        where: { id: dayId, tripId: scope.tripId, workspaceId: scope.workspaceId },
        select: { id: true, dayNumber: true, status: true },
      }) as Promise<{ id: string; dayNumber: number; status: DayStatusValue } | null>,
    setStatus: async (dayId, status) => {
      await client.itineraryDay.update({ where: { id: dayId }, data: { status } });
    },
  };
}

/**
 * A field report's severity decides how badly the day is affected:
 * HIGH/URGENT means the day needs attention now (PROBLEM); MEDIUM/LOW means it
 * is running behind (DELAYED).
 */
export function dayStatusForReportSeverity(severity: string): DayStatusValue {
  return severity === "HIGH" || severity === "URGENT" ? "PROBLEM" : "DELAYED";
}

/**
 * Applies a report/disruption to its day, but never "downgrades" the day:
 *  - an explicit COMPLETED is the office's word and is kept;
 *  - PROBLEM outranks DELAYED, so a later minor report cannot soften a real incident.
 * Returns the new status, or null when nothing was written.
 */
export function nextDayStatus(current: DayStatusValue, incoming: DayStatusValue): DayStatusValue | null {
  if (current === "COMPLETED") return null;
  if (current === "PROBLEM" && incoming === "DELAYED") return null;
  return current === incoming ? null : incoming;
}

/**
 * Links a report/disruption to a day and updates that day's status in the same
 * transaction as the parent record, so a day can never disagree with the event
 * that changed it. The day must belong to the same trip and workspace.
 */
export async function setDayStatusFromEvent(
  store: DayStatusStore,
  params: {
    workspaceId: string;
    tripId: string;
    dayId: string;
    status: DayStatusValue;
    entityType: "field_report" | "disruption";
    entityId: string;
  },
): Promise<void> {
  const day = await store.findDay(params.dayId);
  if (!day) {
    // A stray id must not create a cross-trip link; the event is still recorded.
    logger.warn(
      { workspaceId: params.workspaceId, tripId: params.tripId, dayId: params.dayId },
      "ignored itineraryDayId that does not belong to the trip",
    );
    return;
  }

  const next = nextDayStatus(day.status, params.status);
  if (!next) return;

  await store.setStatus(day.id, next);
  logger.info(
    {
      workspaceId: params.workspaceId,
      tripId: params.tripId,
      dayNumber: day.dayNumber,
      from: day.status,
      to: next,
      source: params.entityType,
      entityId: params.entityId,
    },
    "itinerary day status changed by event",
  );
}
