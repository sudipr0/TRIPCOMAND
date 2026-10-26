import { randomBytes } from "node:crypto";

import type { TripDocumentDetail } from '@trailcomand/shared';
import type { DocumentType, PortalAccessLink } from '@trailcomand/shared';
import type { PortalAccessState, PortalAccessStatus } from '@trailcomand/shared';

import { rawPrisma } from "../../lib/prisma.js";

/**
 * The public portal has no session and therefore no tenant context, so every
 * query here uses `rawPrisma` with workspaceId passed explicitly. Nothing in
 * this repository may rely on the tenant extension to scope rows.
 */
export const PORTAL_TOKEN_BYTES = 32;
export const PORTAL_ACCESS_GRACE_DAYS = 7;

export const PORTAL_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function isPortalTokenFormat(token: string): boolean {
  return typeof token === "string" && PORTAL_TOKEN_PATTERN.test(token);
}

/** Token validity is evaluated on read: an ACTIVE row past its date is effectively expired. */
export function resolvePortalStatus(
  status: PortalAccessStatus,
  expiresAt: Date,
  now: Date = new Date(),
): PortalAccessStatus {
  if (status === "REVOKED") return "REVOKED";
  return expiresAt.getTime() <= now.getTime() ? "EXPIRED" : "ACTIVE";
}

/** Trip end plus the grace period, in whole days. */
export function portalExpiryFor(endDate: Date): Date {
  const expiry = new Date(endDate);
  expiry.setDate(expiry.getDate() + PORTAL_ACCESS_GRACE_DAYS);
  return expiry;
}

export function toDocumentDetail(row: {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedByTraveler: boolean;
  createdAt: Date;
}): TripDocumentDetail {
  return {
    id: row.id,
    documentType: row.documentType as DocumentType,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    uploadedByTraveler: row.uploadedByTraveler,
    createdAt: row.createdAt.toISOString(),
  };
}

const DOCUMENT_SELECT = {
  id: true,
  documentType: true,
  fileName: true,
  fileUrl: true,
  uploadedByTraveler: true,
  createdAt: true,
} as const;

export class PortalRepository {
  static async findTraveler(workspaceId: string, tripId: string, travelerId: string) {
    return rawPrisma.tripTraveler.findFirst({
      where: { id: travelerId, tripId, workspaceId },
      select: { id: true, fullName: true, tripId: true, workspaceId: true },
    });
  }

  static async findTrip(workspaceId: string, tripId: string) {
    return rawPrisma.trip.findFirst({
      where: { id: tripId, workspaceId, deletedAt: null },
      select: { id: true, endDate: true, status: true },
    });
  }

  /** Office document view: every traveler on the trip, leader first. */
  static async listTravelers(workspaceId: string, tripId: string) {
    return rawPrisma.tripTraveler.findMany({
      where: { workspaceId, tripId },
      orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }],
      select: { id: true, fullName: true },
    });
  }

  static async upsertAccess(input: {
    workspaceId: string;
    tripId: string;
    travelerId: string;
    token: string;
    expiresAt: Date;
  }) {
    return rawPrisma.portalAccess.upsert({
      where: { travelerId: input.travelerId },
      // Re-issuing a link regenerates the token and re-activates access,
      // which also revokes the previous link for that traveler.
      update: {
        token: input.token,
        status: "ACTIVE",
        expiresAt: input.expiresAt,
        workspaceId: input.workspaceId,
        tripId: input.tripId,
      },
      create: {
        workspaceId: input.workspaceId,
        tripId: input.tripId,
        travelerId: input.travelerId,
        token: input.token,
        status: "ACTIVE",
        expiresAt: input.expiresAt,
      },
    });
  }

  static async findAccessByToken(token: string) {
    return rawPrisma.portalAccess.findUnique({
      where: { token },
      select: {
        id: true,
        workspaceId: true,
        tripId: true,
        travelerId: true,
        status: true,
        expiresAt: true,
        traveler: { select: { id: true, fullName: true } },
      },
    });
  }

  static async touchLastLogin(id: string) {
    await rawPrisma.portalAccess.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * The client projection. `clientVisible: true` is applied in the query so an
   * internal-only day can never reach the response, and `internalNotes` is not
   * selectable here at all.
   */
  static async findClientTrip(workspaceId: string, tripId: string, travelerId: string) {
    return rawPrisma.trip.findFirst({
      where: { id: tripId, workspaceId, deletedAt: null },
      select: {
        id: true,
        tripNumber: true,
        name: true,
        startDate: true,
        endDate: true,
        groupSize: true,
        status: true,
        leadGuideId: true,
        customerId: true,
        itineraryDays: {
          where: { clientVisible: true },
          orderBy: { dayNumber: "asc" },
          select: {
            id: true,
            dayNumber: true,
            title: true,
            description: true,
            location: true,
            startLocation: true,
            endLocation: true,
            altitude: true,
            elevationGain: true,
            distanceKm: true,
            startTime: true,
            endTime: true,
            walkingHours: true,
            accommodation: true,
            meals: true,
            activities: true,
            status: true,
          },
        },
        // Scoped to the token's own traveler: no other traveler's row can match.
        travelers: {
          where: { id: travelerId },
          select: {
            id: true,
            customerId: true,
            fullName: true,
            isTripLeader: true,
            nationality: true,
            email: true,
            phone: true,
            passportNumber: true,
            passportExpiry: true,
            insuranceProvider: true,
            insurancePolicyNumber: true,
            dietaryRequirements: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
          },
        },
        workspace: { select: { name: true, settings: true } },
      },
    });
  }

  static async listDocuments(travelerId: string) {
    return rawPrisma.tripDocument.findMany({
      where: { travelerId },
      orderBy: { createdAt: "desc" },
      select: DOCUMENT_SELECT,
    });
  }

  /** One document, only if it belongs to this driver's own traveller AND trip. */
  static async findTravelerDocument(input: {
    documentId: string;
    workspaceId: string;
    tripId: string;
    travelerId: string;
  }) {
    return rawPrisma.tripDocument.findFirst({
      where: {
        id: input.documentId,
        workspaceId: input.workspaceId,
        tripId: input.tripId,
        travelerId: input.travelerId,
      },
      select: { ...DOCUMENT_SELECT, workspaceId: true, tripId: true, travelerId: true },
    });
  }

  // ── Traveller updates ──────────────────────

  /**
   * The trip's client-visible update stream.
   *
   * PROGRESS_UPDATE reports are the agency's client-visible announcements. DELAY
   * and WEATHER reports are surfaced only as "under review": the traveller learns
   * that the office is handling something, never what an internal note says about
   * it. Accommodation, supplier, traveller and safety reports are operations
   * notes and are not selectable here at all.
   */
  static async listClientUpdates(workspaceId: string, tripId: string) {
    return rawPrisma.fieldReport.findMany({
      where: {
        workspaceId,
        tripId,
        reportType: { in: ["PROGRESS_UPDATE", "DELAY", "WEATHER"] },
      },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        reportType: true,
        severity: true,
        description: true,
        recordedAt: true,
        createdAt: true,
        itineraryDayId: true,
      },
    });
  }

  /**
   * One update, scoped to this workspace and trip. Deliberately does not take a
   * traveller id: the update belongs to the trip, the acknowledgement belongs to
   * the traveller, and both are checked separately by the service.
   */
  static async findClientUpdate(workspaceId: string, tripId: string, updateId: string) {
    return rawPrisma.fieldReport.findFirst({
      where: {
        id: updateId,
        workspaceId,
        tripId,
        reportType: { in: ["PROGRESS_UPDATE", "DELAY", "WEATHER"] },
      },
      select: {
        id: true,
        reportType: true,
        severity: true,
        description: true,
        recordedAt: true,
        createdAt: true,
        itineraryDayId: true,
      },
    });
  }

  static async listAcknowledgements(travelerId: string) {
    return rawPrisma.portalUpdateAcknowledgement.findMany({
      where: { travelerId },
      select: { updateId: true, acknowledgedAt: true },
    });
  }

  /**
   * The trip's lead guide, but only when the agency has consented to publishing
   * staff phone numbers. Consent is an explicit workspace setting, not an implicit
   * "the guide has a phone in the database": staff numbers are not traveller data
   * and must never leak just because they exist.
   */
  static async findPublishedGuide(
    workspaceId: string,
    guideId: string | null,
    settingsPublished: boolean,
  ) {
    if (!guideId || !settingsPublished) return null;
    return rawPrisma.staffProfile.findFirst({
      where: {
        id: guideId,
        workspaceId,
        deletedAt: null,
        status: { not: "INACTIVE" },
      },
      select: { fullName: true, phone: true, staffType: true },
    });
  }

  /**
   * Records an acknowledgement. The unique (travelerId, updateId) constraint is
   * what makes this idempotent under concurrency: a second writer hits P2002 and
   * the service then re-reads the stored row instead of creating a duplicate.
   */
  static async acknowledgeUpdate(input: {
    workspaceId: string;
    tripId: string;
    travelerId: string;
    updateId: string;
  }) {
    return rawPrisma.portalUpdateAcknowledgement.upsert({
      where: {
        travelerId_updateId: { travelerId: input.travelerId, updateId: input.updateId },
      },
      // A repeated acknowledgement keeps the original timestamp.
      update: {},
      create: input,
      select: { updateId: true, acknowledgedAt: true },
    });
  }

  // ── Office: help requests ─────────────────

  /** The customer a trip traveller was created from, if any (used to file an inquiry). */
  static async findTravelerCustomer(travelerId: string, workspaceId: string) {
    return rawPrisma.tripTraveler.findFirst({
      where: { id: travelerId, workspaceId },
      select: { customerId: true, fullName: true },
    });
  }

  /** Existing inquiry numbers in the workspace for one year prefix, used to continue the sequence. */
  static async findInquiryNumbers(workspaceId: string, prefix: string) {
    return rawPrisma.inquiry.findMany({
      where: { workspaceId, inquiryNumber: { startsWith: prefix } },
      select: { inquiryNumber: true },
    });
  }

  /** Raises a traveller-originated help request in the office inquiry pipeline. */
  static async createHelpInquiry(input: {
    workspaceId: string;
    customerId: string;
    inquiryNumber: string;
    trekInterest: string | null;
    message: string;
    metadata: Record<string, unknown>;
  }) {
    return rawPrisma.inquiry.create({
      data: {
        workspaceId: input.workspaceId,
        customerId: input.customerId,
        inquiryNumber: input.inquiryNumber,
        trekInterest: input.trekInterest,
        specialRequirements: input.message,
        groupSize: 1,
        adults: 1,
        priority: "HIGH",
        status: "CONTACTED",
        source: "Traveler Portal",
        flexibleDates: false,
        metadata: input.metadata as never,
      },
      select: { id: true, inquiryNumber: true, createdAt: true },
    });
  }

  static async addInquiryActivity(input: {
    workspaceId: string;
    inquiryId: string;
    description: string;
    metadata: Record<string, unknown>;
  }) {
    return rawPrisma.inquiryActivity.create({
      data: {
        workspaceId: input.workspaceId,
        inquiryId: input.inquiryId,
        userId: null,
        activityType: "inquiry.help_requested",
        description: input.description,
        metadata: input.metadata as never,
      },
      select: { id: true },
    });
  }

  /** Idempotency guard for a retried help request: same workspace + device clientId. */
  static async findHelpRequestByClientId(workspaceId: string, clientId: string) {
    return rawPrisma.inquiry.findFirst({
      where: {
        workspaceId,
        metadata: { path: ["portalHelp", "clientId"], equals: clientId },
      },
      select: { id: true, createdAt: true },
    });
  }

  static async countHelpRequestsSince(workspaceId: string, travelerId: string, since: Date) {
    return rawPrisma.inquiry.count({
      where: {
        workspaceId,
        createdAt: { gte: since },
        metadata: { path: ["portalHelp", "travelerId"], equals: travelerId },
      },
    });
  }

  /** Help requests filed against one trip, newest first (office view). */
  static async listHelpRequestsForTrip(workspaceId: string, tripId: string) {
    return rawPrisma.inquiry.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        metadata: { path: ["portalHelp", "tripId"], equals: tripId },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        inquiryNumber: true,
        status: true,
        specialRequirements: true,
        createdAt: true,
        metadata: true,
      },
    });
  }

  static async createDocument(data: {
    workspaceId: string;
    tripId: string;
    travelerId: string;
    documentType: DocumentType;
    fileName: string;
    fileUrl: string;
    uploadedById: string | null;
    uploadedByTraveler: boolean;
  }) {
    return rawPrisma.tripDocument.create({
      data,
      select: DOCUMENT_SELECT,
    });
  }

  static async findAccessByTraveler(travelerId: string) {
    return rawPrisma.portalAccess.findUnique({
      where: { travelerId },
      select: { status: true, expiresAt: true, token: true },
    });
  }

  static toAccessState(row: { status: string; expiresAt: Date }, now = new Date()): PortalAccessState {
    return {
      status: resolvePortalStatus(row.status as PortalAccessStatus, row.expiresAt, now),
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  static toAccessLink(row: {
    travelerId: string;
    travelerName: string;
    token: string;
    status: string;
    expiresAt: Date;
  }): PortalAccessLink {
    return {
      travelerId: row.travelerId,
      travelerName: row.travelerName,
      token: row.token,
      url: `/portal/view/${row.token}`,
      status: resolvePortalStatus(row.status as PortalAccessStatus, row.expiresAt),
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  static generateToken(): string {
    return randomBytes(PORTAL_TOKEN_BYTES).toString("hex");
  }
}
