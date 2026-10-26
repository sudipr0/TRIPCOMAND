import type { DisruptionCategory } from "./disruption.schemas.js";

import { rawPrisma } from "../../lib/prisma.js";

export interface ImpactDraft {
  entityType: string;
  entityId: string;
  entityName: string;
  impactType: string;
  confidence: number;
  reasoning: string;
}

type DependencyDatabase = Pick<
  typeof rawPrisma,
  "supplierBooking" | "staffAssignment" | "itineraryDay" | "tripTraveler"
>;

/**
 * Deterministic trip graph traversal. There is deliberately no model call or
 * probabilistic scoring here: the same trip data and category always produce
 * the same impact set and reasoning.
 */
export class DependencyEngine {
  constructor(private readonly db: DependencyDatabase = rawPrisma) {}

  async analyze(
    category: DisruptionCategory,
    tripId: string,
    workspaceId: string,
  ): Promise<ImpactDraft[]> {
    const impacts: ImpactDraft[] = [];
    const seen = new Set<string>();
    let hasAffectedService = false;
    let hasAffectedItinerary = false;
    let hasAffectedStaff = false;

    const addImpact = (impact: ImpactDraft) => {
      const key = `${impact.entityType}:${impact.entityId}:${impact.impactType}`;
      if (seen.has(key)) return;
      seen.add(key);
      impacts.push(impact);
    };

    if (category === "SUPPLIER_CANCELLATION") {
      const bookings = await this.db.supplierBooking.findMany({
        where: { workspaceId, tripId, deletedAt: null },
        include: {
          supplier: { select: { name: true } },
          itineraryDay: { select: { id: true, dayNumber: true, title: true } },
        },
        orderBy: { serviceDate: "asc" },
      });

      for (const booking of bookings) {
        hasAffectedService = true;
        addImpact({
          entityType: "SERVICE",
          entityId: booking.id,
          entityName: `${booking.supplier.name} · ${booking.description}`,
          impactType: "DIRECT",
          confidence: 100,
          reasoning: "Directly affected because the supplier cancellation removes this booked service.",
        });

        if (booking.itineraryDay) {
          hasAffectedItinerary = true;
          addImpact({
            entityType: "ITINERARY",
            entityId: booking.itineraryDay.id,
            entityName: `Day ${booking.itineraryDay.dayNumber}: ${booking.itineraryDay.title}`,
            impactType: "DEPENDENT",
            confidence: 100,
            reasoning: "Affected because this itinerary day depends on the cancelled supplier service.",
          });
        }
      }

      // Older records may not link a supplier booking to a day. In that case
      // traverse the trip's itinerary as the deterministic fallback node set.
      if (bookings.length > 0 && !hasAffectedItinerary) {
        const days = await this.db.itineraryDay.findMany({
          where: { workspaceId, tripId },
          orderBy: { dayNumber: "asc" },
        });
        for (const day of days) {
          hasAffectedItinerary = true;
          addImpact({
            entityType: "ITINERARY",
            entityId: day.id,
            entityName: `Day ${day.dayNumber}: ${day.title}`,
            impactType: "DEPENDENT",
            confidence: 90,
            reasoning: "Affected because the trip itinerary contains a supplier service that was cancelled.",
          });
        }
      }
    }

    if (category === "STAFF_UNAVAILABLE") {
      const assignments = await this.db.staffAssignment.findMany({
        where: { workspaceId, tripId, deletedAt: null },
        include: { staff: { select: { fullName: true } } },
        orderBy: { startDate: "asc" },
      });
      for (const assignment of assignments) {
        hasAffectedStaff = true;
        addImpact({
          entityType: "STAFF",
          entityId: assignment.id,
          entityName: `${assignment.staff.fullName} · ${assignment.role}`,
          impactType: "DIRECT",
          confidence: 100,
          reasoning: "Directly affected because this staff assignment belongs to an unavailable team member.",
        });
      }
    }

    if (category === "TRANSPORT_DELAY") {
      // The report contract has no dayNumber/date field. Traversing every
      // itinerary day is the explicit deterministic fallback until a delay is
      // associated with a specific day by a future input field.
      const days = await this.db.itineraryDay.findMany({
        where: { workspaceId, tripId },
        orderBy: { dayNumber: "asc" },
      });
      for (const day of days) {
        hasAffectedItinerary = true;
        addImpact({
          entityType: "ITINERARY",
          entityId: day.id,
          entityName: `Day ${day.dayNumber}: ${day.title}`,
          impactType: "DEPENDENT",
          confidence: 100,
          reasoning: "Affected because transport delay propagates to this itinerary day.",
        });
      }
    }

    if (category === "WEATHER" || category === "ROUTE_CLOSURE" || category === "EQUIPMENT_ISSUE" || category === "OTHER") {
      const days = await this.db.itineraryDay.findMany({
        where: { workspaceId, tripId },
        orderBy: { dayNumber: "asc" },
      });
      for (const day of days) {
        hasAffectedItinerary = true;
        addImpact({
          entityType: "ITINERARY",
          entityId: day.id,
          entityName: `Day ${day.dayNumber}: ${day.title}`,
          impactType: "DEPENDENT",
          confidence: 100,
          reasoning: "Affected because this disruption reaches the trip itinerary.",
        });
      }
    }

    if (category === "TRAVELER_ISSUE") {
      const travelers = await this.db.tripTraveler.findMany({
        where: { workspaceId, tripId },
        orderBy: { fullName: "asc" },
      });
      for (const traveler of travelers) {
        addImpact({
          entityType: "TRAVELER",
          entityId: traveler.id,
          entityName: traveler.fullName,
          impactType: "DIRECT",
          confidence: 100,
          reasoning: "Directly affected because the reported disruption concerns this trip's travelers.",
        });
      }
    }

    // Cascading edge: services, itinerary days, and staff assignments all
    // reach the travelers who depend on the trip's operational graph.
    if (hasAffectedService || hasAffectedItinerary || hasAffectedStaff) {
      const travelers = await this.db.tripTraveler.findMany({
        where: { workspaceId, tripId },
        orderBy: { fullName: "asc" },
      });
      for (const traveler of travelers) {
        addImpact({
          entityType: "TRAVELER",
          entityId: traveler.id,
          entityName: traveler.fullName,
          impactType: "DEPENDENT",
          confidence: 100,
          reasoning: "Affected because this traveler depends on an impacted operational node on the trip.",
        });
      }

      if (hasAffectedService || hasAffectedItinerary) {
        const assignments = await this.db.staffAssignment.findMany({
          where: { workspaceId, tripId, deletedAt: null },
          include: { staff: { select: { fullName: true } } },
          orderBy: { startDate: "asc" },
        });
        for (const assignment of assignments) {
          addImpact({
            entityType: "STAFF",
            entityId: assignment.id,
            entityName: `${assignment.staff.fullName} · ${assignment.role}`,
            impactType: "DEPENDENT",
            confidence: 100,
            reasoning: "Affected because this staff assignment supports an impacted service or itinerary day.",
          });
        }
      }
    }

    return impacts;
  }
}
