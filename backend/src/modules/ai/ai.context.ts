import type { AIMissingFact } from "@trailcomand/shared";

import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";

/**
 * Authorization-aware context builders for the AI Operations Copilot.
 *
 * Two rules drive this file:
 *
 *  1. **Every read is workspace-scoped and relationship-checked.** A trip id, a
 *     disruption id and a supplier id are all supplied by the client, so none of
 *     them are trusted. We look each one up *inside* the authenticated workspace
 *     and then verify the relationships between them. A mismatch is reported as
 *     NOT_FOUND — the same response a nonexistent id produces — so a caller
 *     cannot use error messages to probe another workspace's private records.
 *
 *  2. **Only the fields a task needs leave the database.** Each builder selects
 *     an explicit field list. Financial columns (`estimatedCost`, `confirmedCost`,
 *     `actualCost`, `SupplierRate.amount`, `Booking.totalAmount`, `agreedRate`),
 *     staff-only columns (`internalNotes`, `Supplier.notes`, `Trip.notes`,
 *     `rootCause`) and traveler PII (passport, medical, insurance, contact
 *     details) are simply never selected for traveler-facing work.
 *
 * The builders are pure once the rows are loaded (`build*PromptContext`), so the
 * shaping and bounding logic is testable without a database.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Bounds — applied to everything that reaches a prompt
// ─────────────────────────────────────────────────────────────────────────────
export const CONTEXT_LIMITS = {
  /** Itinerary days included in a summary. */
  maxItineraryDays: 20,
  /** Disruptions included in an owner summary. */
  maxDisruptions: 5,
  /** Recovery tasks included per disruption. */
  maxRecoveryTasks: 5,
  /** Verified supplier bookings included in a supplier email. */
  maxSupplierBookings: 8,
  /** Characters kept per free-text field. */
  maxTextFieldChars: 1200,
  /** Characters kept for the staff-provided message context. */
  maxMessageContextChars: 1000,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Normalised, minimal shapes. These are what the prompt serializer sees.
// ─────────────────────────────────────────────────────────────────────────────

export interface TripFacts {
  tripNumber: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  groupSize: number;
  /** Itinerary progress derived from stored day statuses only. */
  itineraryProgress: {
    totalDays: number;
    completedDays: number;
    currentDayNumber: number | null;
    currentDayTitle: string | null;
    currentDayStatus: string | null;
    /** True when there are no itinerary days recorded at all. */
    unavailable: boolean;
  };
}

export interface DisruptionFacts {
  disruptionNumber: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  reportedAt: string;
  resolvedAt: string | null;
  /** Day the disruption affects, if linked. */
  affectedDayNumber: number | null;
  affectedDayTitle: string | null;
  /** Explicitly recorded recovery next steps (approved/executing plans only). */
  recordedNextSteps: string[];
  /** Impacts that name an entity type safe to disclose to travelers. */
  travelerSafeImpacts: Array<{
    entityType: string;
    entityName: string;
    impactType: string;
  }>;
  /** True when a recovery plan exists but is still a draft (not approved). */
  planUnapproved: boolean;
  /** True when no recovery plan exists at all. */
  planAbsent: boolean;
}

export interface TravelerUpdateContext {
  trip: TripFacts;
  disruption: DisruptionFacts;
  tone: "reassuring" | "urgent";
  missingFacts: AIMissingFact[];
}

export interface SupplierEmailContext {
  trip: {
    tripNumber: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
    groupSize: number;
  };
  supplier: {
    name: string;
    category: string;
    region: string | null;
    contactName: string | null;
    /** Verified address from the supplier record, or null. Never inferred. */
    email: string | null;
  };
  /** Verified bookings already recorded against this supplier for this trip. */
  existingBookings: Array<{
    serviceType: string;
    description: string;
    serviceDate: string;
    endDate: string | null;
    quantity: number;
    unit: string | null;
    /** Only the coarse state — never costs. */
    status: string;
  }>;
  /** Staff-provided inquiry context. Untrusted: treated as data, bounded. */
  messageContext: string;
  missingFacts: AIMissingFact[];
}

export interface TripSummaryContext {
  trip: TripFacts;
  disruptions: DisruptionFacts[];
  /** Active (open) disruptions among those included. */
  openDisruptionCount: number;
  missingFacts: AIMissingFact[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** ISO-8601 date (no time) in UTC. Dates are calendar facts, not timestamps. */
export function isoDate(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function isoDateTime(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Collapse whitespace and bound length. Returns null for empty results. */
export function clampText(
  value: string | null | undefined,
  max: number = CONTEXT_LIMITS.maxTextFieldChars,
): string | null {
  if (typeof value !== "string") return null;
  const normalised = value.replace(/\s+/g, " ").trim();
  if (!normalised) return null;
  return normalised.length > max
    ? `${normalised.slice(0, max - 1)}…`
    : normalised;
}

const OPEN_DISRUPTION_STATUSES = [
  "REPORTED",
  "ASSESSING",
  "PLANNED",
  "AWAITING_APPROVAL",
  "EXECUTING",
] as const;

export function isOpenDisruption(status: string): boolean {
  return (OPEN_DISRUPTION_STATUSES as readonly string[]).includes(status);
}

/**
 * Impact entity types that are safe to paraphrase to travelers. Supplier and
 * staff impacts are operational facts (and can imply commercial relationships),
 * so they are withheld from traveler-facing drafts.
 */
const TRAVELER_SAFE_IMPACT_TYPES = new Set([
  "traveler",
  "itinerary_day",
  "trip",
]);

/** Recovery plan statuses whose tasks count as recorded, approved next steps. */
const RECORDED_PLAN_STATUSES = new Set(["APPROVED", "EXECUTING", "COMPLETED"]);

// ─────────────────────────────────────────────────────────────────────────────
// Pure shapers (testable without a database)
// ─────────────────────────────────────────────────────────────────────────────

export interface RawTripRow {
  tripNumber: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date;
  groupSize: number;
  itineraryDays?: Array<{
    dayNumber: number;
    title: string;
    status: string;
  }>;
}

export function buildTripFacts(row: RawTripRow): TripFacts {
  const days = (row.itineraryDays ?? [])
    .slice()
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .slice(0, CONTEXT_LIMITS.maxItineraryDays);
  const completed = days.filter((day) => day.status === "COMPLETED").length;
  // "Current" = first day that is not completed, when any day is recorded.
  const current =
    days.find(
      (day) => day.status !== "COMPLETED" && day.status !== "PENDING",
    ) ??
    days.find((day) => day.status !== "COMPLETED") ??
    null;
  return {
    tripNumber: row.tripNumber,
    name: row.name,
    status: row.status,
    startDate: isoDate(row.startDate) ?? "unavailable",
    endDate: isoDate(row.endDate) ?? "unavailable",
    groupSize: row.groupSize,
    itineraryProgress: {
      totalDays: days.length,
      completedDays: completed,
      currentDayNumber: current?.dayNumber ?? null,
      currentDayTitle: current?.title ?? null,
      currentDayStatus: current?.status ?? null,
      unavailable: days.length === 0,
    },
  };
}

export interface RawDisruptionRow {
  disruptionNumber: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  reportedAt: Date;
  resolvedAt: Date | null;
  itineraryDay?: { dayNumber: number; title: string } | null;
  impacts?: Array<{
    entityType: string;
    entityName: string;
    impactType: string;
  }>;
  recoveryPlan?: {
    status: string;
    tasks?: Array<{ title: string; status: string }>;
  } | null;
}

export function buildDisruptionFacts(row: RawDisruptionRow): DisruptionFacts {
  const plan = row.recoveryPlan ?? null;
  const planRecorded = plan ? RECORDED_PLAN_STATUSES.has(plan.status) : false;
  const recordedNextSteps = planRecorded
    ? (plan?.tasks ?? [])
        .filter((task) => task.status !== "COMPLETED")
        .slice(0, CONTEXT_LIMITS.maxRecoveryTasks)
        .map((task) => clampText(task.title) ?? "")
        .filter(Boolean)
    : [];

  const travelerSafeImpacts = (row.impacts ?? [])
    .filter((impact) => TRAVELER_SAFE_IMPACT_TYPES.has(impact.entityType))
    .slice(0, 5)
    .map((impact) => ({
      entityType: impact.entityType,
      entityName: clampText(impact.entityName, 120) ?? "unnamed",
      impactType: impact.impactType,
    }));

  return {
    disruptionNumber: row.disruptionNumber,
    title: clampText(row.title, 200) ?? "unavailable",
    description: clampText(row.description) ?? "unavailable",
    category: row.category,
    severity: row.severity,
    status: row.status,
    reportedAt: isoDateTime(row.reportedAt) ?? "unavailable",
    resolvedAt: isoDateTime(row.resolvedAt),
    affectedDayNumber: row.itineraryDay?.dayNumber ?? null,
    affectedDayTitle: clampText(row.itineraryDay?.title, 200) ?? null,
    recordedNextSteps,
    travelerSafeImpacts,
    planUnapproved: Boolean(plan) && !planRecorded,
    planAbsent: !plan,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Database-backed builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load a trip inside the workspace. Returns NOT_FOUND for a missing id, a
 * soft-deleted trip, or a trip that belongs to another workspace — the caller
 * cannot tell those cases apart.
 */
export async function loadAuthorizedTrip(
  workspaceId: string,
  tripId: string,
): Promise<RawTripRow> {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, workspaceId, deletedAt: null },
    select: {
      tripNumber: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      groupSize: true,
      itineraryDays: {
        select: { dayNumber: true, title: true, status: true },
        orderBy: { dayNumber: "asc" },
        take: CONTEXT_LIMITS.maxItineraryDays,
      },
    },
  });
  if (!trip) {
    throw AppError.notFound("Trip not found");
  }
  return trip;
}

/**
 * Load a disruption that belongs to *both* the workspace and the given trip.
 * Filtering on `tripId` as well as `workspaceId` is what makes a disruption from
 * another trip in the same workspace unusable here.
 */
export async function loadAuthorizedDisruption(
  workspaceId: string,
  tripId: string,
  disruptionId: string,
): Promise<RawDisruptionRow> {
  const disruption = await prisma.disruption.findFirst({
    where: { id: disruptionId, workspaceId, tripId },
    select: {
      disruptionNumber: true,
      title: true,
      description: true,
      category: true,
      severity: true,
      status: true,
      reportedAt: true,
      resolvedAt: true,
      itineraryDay: { select: { dayNumber: true, title: true } },
      impacts: {
        select: { entityType: true, entityName: true, impactType: true },
        orderBy: { createdAt: "asc" },
        take: 10,
      },
      recoveryPlan: {
        select: {
          status: true,
          tasks: {
            select: { title: true, status: true },
            orderBy: { dueAt: "asc" },
            take: CONTEXT_LIMITS.maxRecoveryTasks,
          },
        },
      },
    },
  });
  if (!disruption) {
    throw AppError.notFound("Disruption not found for this trip");
  }
  return disruption;
}

export async function buildTravelerUpdateContext(
  workspaceId: string,
  input: {
    tripId: string;
    disruptionId: string;
    tone: "reassuring" | "urgent";
  },
): Promise<TravelerUpdateContext> {
  const [tripRow, disruptionRow] = await Promise.all([
    loadAuthorizedTrip(workspaceId, input.tripId),
    loadAuthorizedDisruption(workspaceId, input.tripId, input.disruptionId),
  ]);

  const trip = buildTripFacts(tripRow);
  const disruption = buildDisruptionFacts(disruptionRow);

  const missingFacts: AIMissingFact[] = [];
  if (disruption.recordedNextSteps.length === 0) {
    missingFacts.push("RECOVERY_NEXT_STEPS");
  }

  return { trip, disruption, tone: input.tone, missingFacts };
}

export async function buildSupplierEmailContext(
  workspaceId: string,
  input: { tripId: string; supplierId: string; messageContext: string },
): Promise<SupplierEmailContext> {
  // The supplier must belong to the workspace, and it must actually be linked to
  // this trip through a supplier booking. A workspace supplier with no booking on
  // the trip is not "the trip's supplier", so it is rejected the same way an
  // unknown id would be.
  const [tripRow, supplierRow, bookingRows] = await Promise.all([
    loadAuthorizedTrip(workspaceId, input.tripId),
    prisma.supplier.findFirst({
      where: { id: input.supplierId, workspaceId, deletedAt: null },
      select: {
        id: true,
        name: true,
        category: true,
        region: true,
        contactName: true,
        email: true,
        status: true,
      },
    }),
    prisma.supplierBooking.findMany({
      where: {
        workspaceId,
        tripId: input.tripId,
        supplierId: input.supplierId,
        deletedAt: null,
      },
      select: {
        serviceType: true,
        description: true,
        serviceDate: true,
        endDate: true,
        quantity: true,
        unit: true,
        status: true,
      },
      orderBy: { serviceDate: "asc" },
      take: CONTEXT_LIMITS.maxSupplierBookings,
    }),
  ]);

  if (!supplierRow) {
    throw AppError.notFound("Supplier not found");
  }
  if (bookingRows.length === 0) {
    throw AppError.notFound("Supplier is not linked to this trip");
  }

  const trip = buildTripFacts(tripRow);
  const email = normaliseEmail(supplierRow.email);
  const missingFacts: AIMissingFact[] = [];
  if (!email) missingFacts.push("SUPPLIER_EMAIL");

  return {
    trip: {
      tripNumber: trip.tripNumber,
      name: trip.name,
      status: trip.status,
      startDate: trip.startDate,
      endDate: trip.endDate,
      groupSize: trip.groupSize,
    },
    supplier: {
      name: supplierRow.name,
      category: supplierRow.category,
      region: supplierRow.region,
      contactName: clampText(supplierRow.contactName, 120),
      email,
    },
    existingBookings: bookingRows.map((booking) => ({
      serviceType: booking.serviceType,
      description: clampText(booking.description, 300) ?? "unavailable",
      serviceDate: isoDate(booking.serviceDate) ?? "unavailable",
      endDate: isoDate(booking.endDate),
      quantity: booking.quantity,
      unit: booking.unit,
      status: booking.status,
    })),
    messageContext:
      clampText(input.messageContext, CONTEXT_LIMITS.maxMessageContextChars) ??
      "",
    missingFacts,
  };
}

export async function buildTripSummaryContext(
  workspaceId: string,
  input: { tripId: string },
): Promise<TripSummaryContext> {
  const tripRow = await loadAuthorizedTrip(workspaceId, input.tripId);

  const disruptionRows = await prisma.disruption.findMany({
    where: { workspaceId, tripId: input.tripId },
    select: {
      disruptionNumber: true,
      title: true,
      description: true,
      category: true,
      severity: true,
      status: true,
      reportedAt: true,
      resolvedAt: true,
      itineraryDay: { select: { dayNumber: true, title: true } },
      impacts: {
        select: { entityType: true, entityName: true, impactType: true },
        orderBy: { createdAt: "asc" },
        take: 10,
      },
      recoveryPlan: {
        select: {
          status: true,
          tasks: {
            select: { title: true, status: true },
            orderBy: { dueAt: "asc" },
            take: CONTEXT_LIMITS.maxRecoveryTasks,
          },
        },
      },
    },
    // Open disruptions first: those are the ones an owner needs to act on.
    orderBy: [{ status: "asc" }, { reportedAt: "desc" }],
    take: CONTEXT_LIMITS.maxDisruptions,
  });

  const disruptions = disruptionRows.map(buildDisruptionFacts);
  const missingFacts: AIMissingFact[] = [];
  if (tripRow.itineraryDays && tripRow.itineraryDays.length === 0) {
    missingFacts.push("TRIP_NOTES");
  }

  return {
    trip: buildTripFacts(tripRow),
    disruptions,
    openDisruptionCount: disruptions.filter((d) => isOpenDisruption(d.status))
      .length,
    missingFacts,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Small utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accept only a syntactically plausible address from the supplier record. This
 * does not prove deliverability — it only stops us putting garbage in a draft.
 */
export function normaliseEmail(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return null;
  return trimmed;
}
