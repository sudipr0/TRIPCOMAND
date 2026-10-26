import { randomBytes } from "node:crypto";

import type { PortalAccessStatus } from '@trailcomand/shared';
import type { PortalCommandCenter, PortalHelpRequestResult } from '@trailcomand/shared';
import type { PortalUpdateAcknowledgement } from '@trailcomand/shared';
import type { DocumentType, PortalAccessLink, PortalTravelerDocuments } from '@trailcomand/shared';
import type { PortalHelpRequestInput, PortalHelpRequestSummary } from '@trailcomand/shared';

import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import { logger } from "../../lib/logger.js";
import { toDocumentDetail } from './portal.repository.js';
import { portalExpiryFor, resolvePortalStatus } from './portal.repository.js';
import { PortalRepository, isPortalTokenFormat } from './portal.repository.js';
import { buildCommandCenter, leakedPortalKeys, readPortalSettings } from './portal.projection.js';

const PORTAL_PATH_PREFIX = "/portal/view";
const DEFAULT_WEB_URL = "http://localhost:5173";

/** A traveller may raise this many help requests per hour before we slow them down. */
export const HELP_REQUESTS_PER_HOUR = 5;

function portalBaseUrl(): string {
  return (process.env.WEB_URL || DEFAULT_WEB_URL).replace(/\/+$/, "");
}

function settingString(settings: unknown, key: string): string | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
  const value = (settings as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

/** Opt-in workspace switches (e.g. "may we show staff phone numbers"). Absent = no. */
function readSettingsFlag(settings: unknown, key: string): boolean {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return false;
  return (settings as Record<string, unknown>)[key] === true;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}

interface PortalHelpMetaShape {
  travelerName?: string;
  tripNumber?: string;
}

/** Narrows the `metadata.portalHelp` marker written when a traveller asks for help. */
function readPortalHelpMeta(metadata: unknown): PortalHelpMetaShape {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const help = (metadata as Record<string, unknown>).portalHelp;
  if (!help || typeof help !== 'object' || Array.isArray(help)) return {};
  const record = help as Record<string, unknown>;
  return {
    travelerName: typeof record.travelerName === 'string' ? record.travelerName : undefined,
    tripNumber: typeof record.tripNumber === 'string' ? record.tripNumber : undefined,
  };
}

/** 32 bytes of CSPRNG entropy, hex encoded — 256 bits, unguessable. */
export function generatePortalToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * A token that is malformed, unknown, revoked or expired must look identical
 * from the outside: same status, same message. Any difference would let someone
 * enumerate which tokens exist.
 */
function invalidTokenError(): AppError {
  return AppError.notFound("Portal link is invalid or has expired");
}

export interface ValidatedPortal {
  accessId: string;
  workspaceId: string;
  tripId: string;
  travelerId: string;
  travelerName: string;
  expiresAt: string;
}

export class PortalService {
  /**
   * Office action: issue (or re-issue) a traveler's magic link. Re-issuing
   * rotates the token, so an old link stops working immediately.
   */
  static async generatePortalAccess(
    workspaceId: string,
    tripId: string,
    travelerId: string,
    options: { userId?: string } = {},
  ): Promise<PortalAccessLink> {
    const traveler = await PortalRepository.findTraveler(workspaceId, tripId, travelerId);
    if (!traveler) {
      throw AppError.notFound("Traveler not found on this trip");
    }
    const trip = await PortalRepository.findTrip(workspaceId, tripId);
    if (!trip) {
      throw AppError.notFound("Trip not found");
    }

    const token = generatePortalToken();
    const access = await PortalRepository.upsertAccess({
      workspaceId,
      tripId,
      travelerId,
      token,
      expiresAt: portalExpiryFor(trip.endDate),
    });

    await logAuditEvent({
      workspaceId,
      userId: options.userId,
      action: "portal.access.issued",
      entityType: "portal_access",
      entityId: access.id,
      details: { tripId, travelerId, expiresAt: access.expiresAt.toISOString() },
    });

    return PortalRepository.toAccessLink({
      travelerId,
      travelerName: traveler.fullName,
      token: access.token,
      status: access.status,
      expiresAt: access.expiresAt,
    });
  }

  /** Public: resolve a token to its access record. Throws a uniform 404 when unusable. */
  static async validatePortalToken(token: string): Promise<ValidatedPortal> {
    // Reject anything that is not the exact shape before touching the database,
    // so a tampered link never reaches a query.
    if (!isPortalTokenFormat(token)) {
      throw invalidTokenError();
    }
    const access = await PortalRepository.findAccessByToken(token);
    if (!access) {
      throw invalidTokenError();
    }
    const status = resolvePortalStatus(access.status as PortalAccessStatus, access.expiresAt);
    if (status !== "ACTIVE") {
      throw invalidTokenError();
    }
    return {
      accessId: access.id,
      workspaceId: access.workspaceId,
      tripId: access.tripId,
      travelerId: access.travelerId,
      travelerName: access.traveler.fullName,
      expiresAt: access.expiresAt.toISOString(),
    };
  }

  /**
   * Public: the Traveller Command Center payload.
   *
   * Isolation is structural, not a filter applied afterwards:
   *  - the traveller row is selected by the token's own travelerId;
   *  - itinerary days are constrained to clientVisible = true in the query;
   *  - updates come from an allow-list of report types, and internal operations
   *    reports are not selectable at all;
   *  - documents are selected by travelerId, never by trip;
   *  - the select lists contain no cost, staff-rate, supplier or internal-note
   *    fields, and the projection copies named fields rather than spreading rows.
   */
  static async getClientTripData(token: string): Promise<PortalCommandCenter> {
    const portal = await PortalService.validatePortalToken(token);

    const trip = await PortalRepository.findClientTrip(
      portal.workspaceId,
      portal.tripId,
      portal.travelerId,
    );
    // The traveler row is selected with `where: { id: portal.travelerId }`, so an
    // empty array means the traveler was removed; treat that as an invalid link.
    const traveler = trip?.travelers[0];
    if (!trip || !traveler) {
      throw invalidTokenError();
    }

    const settings = readPortalSettings(trip.workspace.settings);
    // Publishing staff phone numbers is opt-in per workspace.
    const publishGuideContact = readSettingsFlag(trip.workspace.settings, "publishGuideContact");
    const [documents, updates, acknowledgements, guide] = await Promise.all([
      PortalRepository.listDocuments(portal.travelerId),
      PortalRepository.listClientUpdates(portal.workspaceId, portal.tripId),
      PortalRepository.listAcknowledgements(portal.travelerId),
      PortalRepository.findPublishedGuide(
        portal.workspaceId,
        trip.leadGuideId,
        publishGuideContact,
      ),
    ]);

    const payload = buildCommandCenter({
      token,
      traveler: { fullName: traveler.fullName, isTripLeader: traveler.isTripLeader },
      trip: {
        id: trip.id,
        tripNumber: trip.tripNumber,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        groupSize: trip.groupSize,
        status: trip.status,
      },
      days: trip.itineraryDays,
      updates,
      documents,
      settings,
      guide:
        guide && guide.phone
          ? {
              fullName: guide.fullName,
              phone: guide.phone,
              role: guide.staffType === "GUIDE" ? "Lead guide" : "Trip staff",
            }
          : null,
      acknowledgements,
      expiresAt: new Date(portal.expiresAt),
    });

    // The agency name is the one workspace field the projection builder cannot know.
    payload.home.agency.agencyName = trip.workspace.name;
    payload.emergency.agencyName = trip.workspace.name;
    // The traveller's own emergency contact is their data, not the agency's.
    payload.emergency.emergencyContactName = traveler.emergencyContactName;
    payload.emergency.emergencyContactPhone = traveler.emergencyContactPhone;

    // A final guard on the exact JSON the traveller would receive: a future field
    // spread into a row cannot leave the server unless it is added here on purpose.
    const leaked = leakedPortalKeys(payload);
    if (leaked.length) {
      logger.error({ leaked, tripId: portal.tripId }, 'portal payload contained internal fields; refusing to respond');
      throw AppError.internal('Could not prepare the trip view');
    }

    await PortalRepository.touchLastLogin(portal.accessId);

    return payload;
  }

  /**
   * Public: the traveller confirms they have read an update.
   *
   * The update is looked up by (workspace, trip) from the token, so a valid token
   * for one trip cannot acknowledge another trip's update, and the traveller id
   * always comes from the token — never from the request body.
   */
  static async acknowledgeUpdate(
    token: string,
    updateId: string,
  ): Promise<PortalUpdateAcknowledgement> {
    const portal = await PortalService.validatePortalToken(token);

    const update = await PortalRepository.findClientUpdate(
      portal.workspaceId,
      portal.tripId,
      updateId,
    );
    // Unknown, internal-only and other-trip updates are indistinguishable: 404.
    if (!update) {
      throw AppError.notFound("Update not found");
    }

    const acknowledged = await PortalRepository.acknowledgeUpdate({
      workspaceId: portal.workspaceId,
      tripId: portal.tripId,
      travelerId: portal.travelerId,
      updateId: update.id,
    });

    await logAuditEvent({
      workspaceId: portal.workspaceId,
      action: "portal.update.acknowledged",
      entityType: "field_report",
      entityId: update.id,
      details: { tripId: portal.tripId, travelerId: portal.travelerId },
    });

    return {
      updateId: acknowledged.updateId,
      acknowledgedAt: acknowledged.acknowledgedAt.toISOString(),
    };
  }

  /**
   * Public: a traveller asks the agency for help.
   *
   * The request is filed as an inquiry in the office's existing sales/operations
   * pipeline (source "Traveler Portal", HIGH priority) so staff see it in the
   * workflow they already use, with an activity entry on the timeline. It is not
   * an emergency channel: nothing here contacts emergency services.
   */
  static async submitHelpRequest(
    token: string,
    input: PortalHelpRequestInput,
  ): Promise<PortalHelpRequestResult> {
    const portal = await PortalService.validatePortalToken(token);

    const trip = await PortalRepository.findClientTrip(
      portal.workspaceId,
      portal.tripId,
      portal.travelerId,
    );
    const traveler = trip?.travelers[0];
    if (!trip || !traveler) throw invalidTokenError();

    // Rate limit per traveller, on top of the per-IP route limit: a shared airport
    // wifi address must not let one traveller flood the office.
    const recent = await PortalRepository.countHelpRequestsSince(
      portal.workspaceId,
      portal.travelerId,
      new Date(Date.now() - 3_600_000),
    );
    if (recent >= HELP_REQUESTS_PER_HOUR) {
      throw AppError.badRequest(
        "You have sent several requests in the last hour. Please call your organizer if this is urgent.",
      );
    }

    // A retried submission (lost response, offline replay) must not create a second
    // inquiry for the same device-generated clientId.
    const existing = await PortalRepository.findHelpRequestByClientId(
      portal.workspaceId,
      input.clientId,
    );
    if (existing) {
      return {
        reportId: existing.id,
        createdAt: existing.createdAt.toISOString(),
        status: "RECEIVED",
      };
    }

    const customerId = traveler.customerId ?? trip.customerId;
    // The schema already trims; normalise again so a direct service caller gets the
    // same stored message (and so retries compare like for like).
    const message = input.message.trim();
    const metadata = {
      portalHelp: {
        clientId: input.clientId,
        travelerId: portal.travelerId,
        tripId: portal.tripId,
        tripNumber: trip.tripNumber,
        travelerName: traveler.fullName,
        submittedAt: new Date().toISOString(),
      },
    };

    let created;
    for (let attempt = 0; attempt < 3; attempt++) {
      const inquiryNumber = await PortalService.nextInquiryNumber(portal.workspaceId);
      try {
        created = await PortalRepository.createHelpInquiry({
          workspaceId: portal.workspaceId,
          customerId,
          inquiryNumber,
          trekInterest: trip.name,
          message,
          metadata,
        });
        break;
      } catch (error) {
        // (workspaceId, inquiryNumber) is unique; a concurrent creation may win.
        if (isUniqueViolation(error) && attempt < 2) continue;
        throw error;
      }
    }
    if (!created) {
      throw AppError.internal("Could not record the help request");
    }

    await PortalRepository.addInquiryActivity({
      workspaceId: portal.workspaceId,
      inquiryId: created.id,
      description: `Help requested from the traveller portal by ${traveler.fullName}`,
      metadata: { ...metadata.portalHelp, tripName: trip.name },
    });

    await logAuditEvent({
      workspaceId: portal.workspaceId,
      action: "portal.help.requested",
      entityType: "inquiry",
      entityId: created.id,
      details: { tripId: portal.tripId, travelerId: portal.travelerId },
    });

    logger.info(
      { workspaceId: portal.workspaceId, tripId: portal.tripId, inquiryId: created.id },
      "traveller help request filed",
    );

    return {
      reportId: created.id,
      createdAt: created.createdAt.toISOString(),
      status: "RECEIVED",
    };
  }

  /**
   * Office view: help requests traveller ticketed against this trip.
   *
   * These live in the inquiry pipeline (so they are actionable), but anyone
   * watching the trip needs them in context. Workspace + trip both come from the
   * authenticated tenant context, never from the client.
   */
  static async listTripHelpRequests(
    workspaceId: string,
    tripId: string,
  ): Promise<PortalHelpRequestSummary[]> {
    const trip = await PortalRepository.findTrip(workspaceId, tripId);
    if (!trip) throw AppError.notFound("Trip not found");
    const rows = await PortalRepository.listHelpRequestsForTrip(workspaceId, tripId);
    return rows.map((row) => {
      const help = readPortalHelpMeta(row.metadata);
      return {
        id: row.id,
        inquiryId: row.id,
        inquiryNumber: row.inquiryNumber,
        travelerName: help.travelerName ?? "Traveller",
        message: row.specialRequirements ?? "",
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      };
    });
  }

  /** Next inquiry number in the workspace's per-year sequence. */
  private static async nextInquiryNumber(workspaceId: string): Promise<string> {
    const { rawPrisma } = await import("../../lib/prisma.js");
    const year = new Date().getFullYear();
    const prefix = `INQ-${year}-`;
    const existing = await rawPrisma.inquiry.findMany({
      where: {
        workspaceId,
        inquiryNumber: { startsWith: prefix },
      },
      select: { inquiryNumber: true },
    });
    const highest = existing.reduce((max, row) => {
      const n = Number.parseInt(row.inquiryNumber.slice(prefix.length), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return `${prefix}${String(highest + 1).padStart(3, "0")}`;
  }

  /** One document, streamed only to the traveller who owns it. */
  static async getTravelerDocument(token: string, documentId: string) {
    const portal = await PortalService.validatePortalToken(token);
    const document = await PortalRepository.findTravelerDocument({
      documentId,
      workspaceId: portal.workspaceId,
      tripId: portal.tripId,
      travelerId: portal.travelerId,
    });
    if (!document) {
      throw AppError.notFound("Document not found");
    }
    return document;
  }

  /** Public: a traveler uploads a document through their own token. */
  static async uploadTravelerDocument(
    token: string,
    input: { documentType: DocumentType; fileName: string; fileUrl: string },
  ) {
    const portal = await PortalService.validatePortalToken(token);
    const created = await PortalRepository.createDocument({
      workspaceId: portal.workspaceId,
      tripId: portal.tripId,
      travelerId: portal.travelerId,
      documentType: input.documentType,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      uploadedById: null,
      uploadedByTraveler: true,
    });
    return toDocumentDetail(created);
  }

  // ── Office side ────────────────────────────────────────────────────────────

  static async createOfficeDocument(
    workspaceId: string,
    tripId: string,
    userId: string,
    input: { travelerId: string; documentType: DocumentType; fileName: string; fileUrl: string },
  ) {
    const traveler = await PortalRepository.findTraveler(workspaceId, tripId, input.travelerId);
    if (!traveler) {
      throw AppError.notFound("Traveler not found on this trip");
    }
    const created = await PortalRepository.createDocument({
      workspaceId,
      tripId,
      travelerId: input.travelerId,
      documentType: input.documentType,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      uploadedById: userId,
      uploadedByTraveler: false,
    });
    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.document.uploaded",
      entityType: "trip_document",
      entityId: created.id,
      details: { tripId, travelerId: input.travelerId, documentType: input.documentType },
    });
    return toDocumentDetail(created);
  }

  /** Office view: what each traveler has on file, and whether their link is live. */
  static async listTripDocuments(workspaceId: string, tripId: string): Promise<PortalTravelerDocuments[]> {
    const trip = await PortalRepository.findTrip(workspaceId, tripId);
    if (!trip) {
      throw AppError.notFound("Trip not found");
    }
    const travelers = await PortalRepository.listTravelers(workspaceId, tripId);

    return Promise.all(
      travelers.map(async (traveler) => {
        const [documents, access] = await Promise.all([
          PortalRepository.listDocuments(traveler.id),
          PortalRepository.findAccessByTraveler(traveler.id),
        ]);
        return {
          travelerId: traveler.id,
          travelerName: traveler.fullName,
          hasPortalAccess: Boolean(access),
          portalAccess: access ? PortalRepository.toAccessState(access) : null,
          documents: documents.map(toDocumentDetail),
        };
      }),
    );
  }
}
