import type {
  PortalCommandCenter,
  PortalDayChangeNotice,
  PortalDocument,
  PortalEmergencyInfo,
  PortalGuideContact,
  PortalItineraryDay,
  PortalUpdateItem,
  PortalUpdateState,
} from '@trailcomand/shared';
import type { DayStatusValue } from '@trailcomand/shared';

import { currentDayNumber, dayDate, nextRelevantDay } from './portal.timeline.js';

/**
 * Projects rows onto the traveller-safe portal payload.
 *
 * Everything here is an explicit allow-list. Rows arrive already narrowed by the
 * repository's `select`, and this module never spreads a row (`...row`) into the
 * output: a new internal column added to the schema must be added here on purpose
 * before it can ever reach a traveller.
 */

export const PORTAL_TZ_FALLBACK = 'Asia/Kathmandu';

export interface PortalDayRow {
  id: string;
  dayNumber: number;
  title: string;
  description: string | null;
  location: string | null;
  startLocation: string | null;
  endLocation: string | null;
  altitude: number | null;
  elevationGain: number | null;
  distanceKm: { toString(): string } | null;
  startTime: string | null;
  endTime: string | null;
  walkingHours: { toString(): string } | null;
  accommodation: string | null;
  meals: string[];
  activities: string[];
  status: DayStatusValue;
}

export interface PortalUpdateRow {
  id: string;
  reportType: string;
  severity: string;
  description: string;
  recordedAt: Date;
  createdAt: Date;
  itineraryDayId: string | null;
}

export interface PortalDocumentRow {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedByTraveler: boolean;
  createdAt: Date;
}

export interface PortalSettings {
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  emergencyContactPhone: string | null;
  emergencyInstructions: string | null;
  timezone: string;
}

/** Reads only the workspace settings keys the portal is allowed to publish. */
export function readPortalSettings(settings: unknown): PortalSettings {
  const read = (key: string): string | null => {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
    const value = (settings as Record<string, unknown>)[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  };
  return {
    contactEmail: read('contactEmail'),
    contactPhone: read('contactPhone'),
    address: read('address'),
    emergencyContactPhone: read('emergencyContactPhone'),
    emergencyInstructions: read('emergencyInstructions'),
    timezone: read('timezone') ?? PORTAL_TZ_FALLBACK,
  };
}

/**
 * Map a FieldReport onto what the traveller may know.
 *
 * A PROGRESS_UPDATE is the agency speaking to travellers: it is a confirmed
 * announcement. A DELAY / ROUTE_ISSUE / WEATHER report is the office's internal
 * investigation feed, so it is deliberately shown as PENDING ("Awaiting agency
 * update") — the traveller learns that something is being handled, never that a
 * change has been approved.
 */
export function updateStateFor(reportType: string): PortalUpdateState {
  if (reportType === 'PROGRESS_UPDATE') return 'CONFIRMED';
  if (reportType === 'EMERGENCY') return 'PENDING';
  return 'PENDING';
}

const UPDATE_TITLE: Record<string, string> = {
  PROGRESS_UPDATE: 'Trip update',
  DELAY: 'Delay on the trail',
  WEATHER: 'Weather affecting the route',
  ROUTE_ISSUE: 'Route issue',
  ACCOMMODATION_ISSUE: 'Accommodation issue',
  SUPPLIER_ISSUE: 'Service issue',
  TRAVELER_ISSUE: 'Traveller issue',
  SAFETY_CONCERN: 'Safety concern',
  EMERGENCY: 'Emergency response',
  OTHER: 'Trip notice',
};

/** Acknowledgement is only meaningful for an agency announcement. */
export function updateRequiresAcknowledgement(reportType: string): boolean {
  return reportType === 'PROGRESS_UPDATE';
}

export function toPortalUpdate(
  row: PortalUpdateRow,
  context: {
    dayNumberById: Map<string, number>;
    acknowledgedAtByUpdate: Map<string, Date>;
  },
): PortalUpdateItem {
  const state = updateStateFor(row.reportType);
  const acknowledgedAt = context.acknowledgedAtByUpdate.get(row.id) ?? null;
  return {
    id: row.id,
    kind: state === 'CONFIRMED' ? 'ANNOUNCEMENT' : 'DISRUPTION',
    title: UPDATE_TITLE[row.reportType] ?? 'Trip notice',
    description: row.description,
    publishedAt: row.recordedAt.toISOString(),
    updatedAt: row.createdAt.toISOString(),
    state,
    sourceStatus: row.reportType,
    severity: row.reportType === 'PROGRESS_UPDATE' ? null : row.severity,
    dayNumber: row.itineraryDayId ? context.dayNumberById.get(row.itineraryDayId) ?? null : null,
    requiresAcknowledgement: updateRequiresAcknowledgement(row.reportType),
    acknowledgedAt: acknowledgedAt ? acknowledgedAt.toISOString() : null,
  };
}

export function toPortalDay(
  row: PortalDayRow,
  startDate: Date,
  changeNotice: PortalDayChangeNotice | null,
): PortalItineraryDay {
  return {
    id: row.id,
    dayNumber: row.dayNumber,
    date: dayDate(startDate, row.dayNumber),
    title: row.title,
    description: row.description,
    location: row.location,
    startLocation: row.startLocation,
    endLocation: row.endLocation,
    altitude: row.altitude,
    elevationGain: row.elevationGain,
    distanceKm: row.distanceKm ? row.distanceKm.toString() : null,
    startTime: row.startTime,
    endTime: row.endTime,
    walkingHours: row.walkingHours ? row.walkingHours.toString() : null,
    accommodation: row.accommodation,
    meals: [...row.meals],
    activities: [...row.activities],
    status: row.status,
    changeNotice,
  };
}

/** The document URL is a token-scoped portal route, never a storage path or public link. */
export function portalDocumentUrl(token: string, documentId: string): string {
  return `/api/v1/portal/${encodeURIComponent(token)}/documents/${encodeURIComponent(documentId)}/file`;
}

/**
 * Only http(s) links can be opened safely from the portal. A `javascript:` or
 * `data:` URL in a document row must never become a clickable link.
 */
export function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function toPortalDocument(row: PortalDocumentRow, token: string): PortalDocument {
  const external = isSafeExternalUrl(row.fileUrl);
  return {
    id: row.id,
    documentType: row.documentType as PortalDocument['documentType'],
    fileName: row.fileName,
    category: row.uploadedByTraveler ? 'TRAVELLER_PROVIDED' : 'AGENCY_PROVIDED',
    uploadedAt: row.createdAt.toISOString(),
    downloadUrl: portalDocumentUrl(token, row.id),
    external,
    unavailableReason: external ? null : 'This file link is not available. Ask your organizer to re-upload it.',
  };
}

const TRIP_STATUS_LABEL: Record<string, string> = {
  PLANNING: 'Being planned',
  READY: 'Confirmed and ready',
  IN_PROGRESS: 'Trip in progress',
  COMPLETED: 'Trip completed',
  CANCELLED: 'Trip cancelled',
};

/**
 * Trip Home status.
 *
 * Only an open disruption with a real "needs attention" severity upgrades the
 * trip-level state — one delayed day inside a healthy trip stays informational,
 * and a trip that is merely READY is reported as READY rather than dressed up as
 * a success banner.
 */
export function homeStatusFor(input: {
  tripStatus: string;
  itinerary: PortalItineraryDay[];
  updates: PortalUpdateItem[];
}): { state: PortalUpdateState; label: string } {
  const openDisruption = input.updates.find(
    (update) =>
      update.state === 'PENDING' && (update.severity === 'HIGH' || update.severity === 'URGENT'),
  );
  if (openDisruption) return { state: 'PENDING', label: 'Awaiting agency update' };

  if (input.tripStatus === 'CANCELLED') return { state: 'RESOLVED', label: 'Trip cancelled' };
  if (input.tripStatus === 'COMPLETED') return { state: 'RESOLVED', label: 'Trip completed' };

  const dayProblem = input.itinerary.find((day) => day.status === 'PROBLEM');
  if (dayProblem) return { state: 'PENDING', label: `Day ${dayProblem.dayNumber} needs attention` };

  const delayed = input.itinerary.find((day) => day.status === 'DELAYED');
  if (delayed) return { state: 'CONFIRMED', label: `Day ${delayed.dayNumber} is running late` };

  return { state: 'CONFIRMED', label: TRIP_STATUS_LABEL[input.tripStatus] ?? 'Trip confirmed' };
}

/**
 * Builds the Command Center payload from already-authorized rows. Pure: it takes
 * nothing but data that the repository has scoped to this token's traveller.
 */
export function buildCommandCenter(input: {
  token: string;
  traveler: { fullName: string; isTripLeader: boolean };
  trip: {
    id: string;
    tripNumber: string;
    name: string;
    startDate: Date;
    endDate: Date;
    groupSize: number;
    status: string;
  };
  days: PortalDayRow[];
  updates: PortalUpdateRow[];
  documents: PortalDocumentRow[];
  settings: PortalSettings;
  guide: PortalGuideContact | null;
  acknowledgements: Array<{ updateId: string; acknowledgedAt: Date }>;
  expiresAt: Date;
  now?: Date;
}): PortalCommandCenter {
  const now = input.now ?? new Date();

  const dayNumberById = new Map(input.days.map((day) => [day.id, day.dayNumber]));
  const acknowledgedAtByUpdate = new Map(
    input.acknowledgements.map((ack) => [ack.updateId, ack.acknowledgedAt]),
  );
  const updates = input.updates
    .map((row) => toPortalUpdate(row, { dayNumberById, acknowledgedAtByUpdate }))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  // A published update that names a day is that day's change notice. Announcements
  // without a day apply to the trip, not to a specific itinerary day.
  const changeNoticeByDay = new Map<string, PortalDayChangeNotice>();
  for (const update of updates) {
    if (!update.dayNumber || update.state === 'CLOSED') continue;
    const day = input.days.find((row) => row.dayNumber === update.dayNumber);
    if (!day || changeNoticeByDay.has(day.id)) continue;
    changeNoticeByDay.set(day.id, {
      updateId: update.id,
      title: update.title,
      summary: update.description,
      publishedAt: update.publishedAt,
      state: update.state,
    });
  }

  const itinerary = input.days.map((day) =>
    toPortalDay(day, input.trip.startDate, changeNoticeByDay.get(day.id) ?? null),
  );

  const agency: PortalEmergencyInfo = {
    agencyName: '', // filled by the caller, which knows the workspace name
    contactEmail: input.settings.contactEmail,
    contactPhone: input.settings.contactPhone,
    address: input.settings.address,
    emergencyContactName: null,
    emergencyContactPhone: null,
  };

  const status = homeStatusFor({
    tripStatus: input.trip.status,
    itinerary,
    updates,
  });

  const headlineUpdate =
    updates.find((update) => update.state === 'CONFIRMED') ?? updates[0] ?? null;

  const unacknowledged = updates.filter(
    (update) => update.requiresAcknowledgement && !update.acknowledgedAt,
  );

  return {
    visitor: {
      fullName: input.traveler.fullName,
      isTripLeader: input.traveler.isTripLeader,
    },
    trip: {
      id: input.trip.id,
      tripNumber: input.trip.tripNumber,
      name: input.trip.name,
      startDate: input.trip.startDate.toISOString(),
      endDate: input.trip.endDate.toISOString(),
      groupSize: input.trip.groupSize,
      status: input.trip.status,
      currentDayNumber: currentDayNumber(input.trip.startDate, input.trip.endDate, now),
      timezone: input.settings.timezone,
    },
    home: {
      status: status.state,
      statusLabel: status.label,
      headlineUpdate,
      nextDay: nextRelevantDay(itinerary),
      unacknowledged,
      agency,
    },
    itinerary,
    updates,
    documents: input.documents.map((row) => toPortalDocument(row, input.token)),
    emergency: {
      ...agency,
      guide: input.guide,
      instructions: input.settings.emergencyInstructions,
      emergencyPhone: input.settings.emergencyContactPhone,
    },
    syncedAt: now.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
  };
}

/**
 * Serialized-payload guard. The projection is already an allow-list; this catches
 * the one class of mistake a type system cannot: a nested object that was spread
 * through by accident. It runs on the exact JSON the traveller would receive.
 */
export const FORBIDDEN_PORTAL_KEYS = [
  'internalNotes',
  'estimatedCost',
  'confirmedCost',
  'actualCost',
  'agreedRate',
  'totalAmount',
  'paidAmount',
  'balanceAmount',
  'marginPercent',
  'grossProfit',
  'supplierId',
  'supplierRate',
  'recoveryPlan',
  'rootCause',
  'passportNumber',
  'medicalNotes',
  'workspaceId',
] as const;

function collectKeys(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, into);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    into.add(key);
    collectKeys(nested, into);
  }
}

/** Returns the offending keys; the caller logs and refuses to respond. */
export function leakedPortalKeys(payload: unknown): string[] {
  const keys = new Set<string>();
  collectKeys(payload, keys);
  return FORBIDDEN_PORTAL_KEYS.filter((key) => keys.has(key));
}
