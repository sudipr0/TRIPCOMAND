import { describe, expect, it } from "vitest";

import { DependencyEngine } from "../dependency-engine.js";

function database(overrides: Record<string, unknown> = {}) {
  const empty = async () => [];
  return {
    supplierBooking: { findMany: overrides.supplierBookings ?? empty },
    staffAssignment: { findMany: overrides.staffAssignments ?? empty },
    itineraryDay: { findMany: overrides.itineraryDays ?? empty },
    tripTraveler: { findMany: overrides.travelers ?? empty },
  } as never;
}

describe("DependencyEngine", () => {
  it("traverses supplier cancellation from service to itinerary, staff, and travelers", async () => {
    const engine = new DependencyEngine(database({
      supplierBookings: async () => [{
        id: "booking-1",
        description: "Lodge room",
        supplier: { name: "Khumbu Lodge" },
        itineraryDay: { id: "day-1", dayNumber: 3, title: "Namche to Tengboche" },
      }],
      staffAssignments: async () => [{ id: "assignment-1", role: "lead_guide", staff: { fullName: "Dawa Sherpa" } }],
      travelers: async () => [{ id: "traveler-1", fullName: "Sarah Mitchell" }],
    }));

    const impacts = await engine.analyze("SUPPLIER_CANCELLATION", "trip-1", "ws-1");

    expect(impacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: "SERVICE", entityId: "booking-1", impactType: "DIRECT" }),
      expect.objectContaining({ entityType: "ITINERARY", entityId: "day-1", impactType: "DEPENDENT" }),
      expect.objectContaining({ entityType: "STAFF", entityId: "assignment-1", impactType: "DEPENDENT" }),
      expect.objectContaining({ entityType: "TRAVELER", entityId: "traveler-1", impactType: "DEPENDENT" }),
    ]));
    expect(impacts).toHaveLength(4);
    expect(impacts.every((impact) => impact.confidence === 100)).toBe(true);
  });

  it("does not invent impacts when the deterministic graph has no matching nodes", async () => {
    const engine = new DependencyEngine(database());
    await expect(engine.analyze("STAFF_UNAVAILABLE", "trip-1", "ws-1")).resolves.toEqual([]);
  });
});
