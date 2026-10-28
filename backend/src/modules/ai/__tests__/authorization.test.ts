import { describe, it, expect, vi, beforeEach } from "vitest";

import { AppError } from "../../../lib/errors.js";
import { buildSupplierEmailContext } from '../ai.context.js';
import { buildTravelerUpdateContext } from '../ai.context.js';
import { buildTripSummaryContext, loadAuthorizedTrip } from '../ai.context.js';

/**
 * Authorization and tenant-isolation tests for the AI context builders.
 *
 * Prisma is mocked at the module boundary so these tests assert the *queries*
 * the builders issue: every `where` must pin `workspaceId`, and relationship ids
 * (tripId / supplierId) must be part of the filter rather than checked after the
 * fact. That is the property that stops a valid id from one workspace being used
 * against another.
 */

const findTrip = vi.fn();
const findDisruption = vi.fn();
const findSupplier = vi.fn();
const findSupplierBooking = vi.fn();
const findDisruptions = vi.fn();

vi.mock("../../../lib/prisma.js", () => ({
  prisma: {
    trip: { findFirst: (...args: unknown[]) => findTrip(...args) },
    disruption: {
      findFirst: (...args: unknown[]) => findDisruption(...args),
      findMany: (...args: unknown[]) => findDisruptions(...args),
    },
    supplier: { findFirst: (...args: unknown[]) => findSupplier(...args) },
    supplierBooking: {
      findMany: (...args: unknown[]) => findSupplierBooking(...args),
    },
  },
}));

const WORKSPACE = "11111111-1111-4111-8111-111111111111";
const OTHER_WORKSPACE = "22222222-2222-4222-8222-222222222222";
const TRIP = "33333333-3333-4333-8333-333333333333";
const DISRUPTION = "44444444-4444-4444-8444-444444444444";
const SUPPLIER = "55555555-5555-4555-8555-555555555555";

const tripRow = {
  tripNumber: "TRP-1",
  name: "Everest Base Camp",
  status: "IN_PROGRESS",
  startDate: new Date("2026-04-01T00:00:00Z"),
  endDate: new Date("2026-04-14T00:00:00Z"),
  groupSize: 8,
  itineraryDays: [{ dayNumber: 1, title: "Arrive", status: "COMPLETED" }],
};

const disruptionRow = {
  disruptionNumber: "DIS-1",
  title: "Flights cancelled",
  description: "Weather",
  category: "WEATHER",
  severity: "HIGH",
  status: "EXECUTING",
  reportedAt: new Date("2026-04-02T05:30:00Z"),
  resolvedAt: null,
  itineraryDay: null,
  impacts: [],
  recoveryPlan: null,
};

beforeEach(() => {
  findTrip.mockReset();
  findDisruption.mockReset();
  findSupplier.mockReset();
  findSupplierBooking.mockReset();
  findDisruptions.mockReset();
});

describe("workspace scoping of trip lookups", () => {
  it("filters by both id and workspaceId", async () => {
    findTrip.mockResolvedValue(tripRow);
    await loadAuthorizedTrip(WORKSPACE, TRIP);

    const where = findTrip.mock.calls[0][0].where;
    expect(where).toMatchObject({
      id: TRIP,
      workspaceId: WORKSPACE,
      deletedAt: null,
    });
  });

  it("returns NOT_FOUND when the trip belongs to another workspace", async () => {
    // A real trip exists, but the scoped query cannot see it.
    findTrip.mockImplementation(
      ({ where }: { where: { workspaceId: string } }) =>
        Promise.resolve(where.workspaceId === WORKSPACE ? tripRow : null),
    );

    await expect(
      loadAuthorizedTrip(OTHER_WORKSPACE, TRIP),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });

  it("does not disclose whether the trip exists elsewhere", async () => {
    findTrip.mockResolvedValue(null);
    const missing = await loadAuthorizedTrip(WORKSPACE, TRIP).catch((e) => e);
    findTrip.mockResolvedValue(null);
    const crossTenant = await loadAuthorizedTrip(OTHER_WORKSPACE, TRIP).catch(
      (e) => e,
    );

    expect(missing).toBeInstanceOf(AppError);
    expect(crossTenant).toBeInstanceOf(AppError);
    expect(missing.message).toBe(crossTenant.message);
    expect(missing.statusCode).toBe(crossTenant.statusCode);
    // The error never echoes the workspace id back to the caller.
    expect(missing.message).not.toContain(WORKSPACE);
    expect(missing.message).not.toContain(OTHER_WORKSPACE);
  });
});

describe("traveler update authorization", () => {
  it("rejects a disruption that belongs to a different trip", async () => {
    findTrip.mockResolvedValue(tripRow);
    // The disruption exists in the workspace but not on this trip, so the
    // tripId filter makes the lookup miss.
    findDisruption.mockImplementation(
      ({ where }: { where: { tripId: string } }) =>
        Promise.resolve(where.tripId === "another-trip" ? disruptionRow : null),
    );

    await expect(
      buildTravelerUpdateContext(WORKSPACE, {
        tripId: TRIP,
        disruptionId: DISRUPTION,
        tone: "reassuring",
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });

    // And the query pinned both ids, rather than trusting the client pairing.
    expect(findDisruption.mock.calls[0][0].where).toMatchObject({
      id: DISRUPTION,
      workspaceId: WORKSPACE,
      tripId: TRIP,
    });
  });

  it("rejects a disruption from another workspace", async () => {
    findTrip.mockResolvedValue(tripRow);
    findDisruption.mockImplementation(
      ({ where }: { where: { workspaceId: string } }) =>
        Promise.resolve(where.workspaceId === WORKSPACE ? disruptionRow : null),
    );

    await expect(
      buildTravelerUpdateContext(OTHER_WORKSPACE, {
        tripId: TRIP,
        disruptionId: DISRUPTION,
        tone: "urgent",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("builds context when both belong to the workspace and trip", async () => {
    findTrip.mockResolvedValue(tripRow);
    findDisruption.mockResolvedValue(disruptionRow);

    const context = await buildTravelerUpdateContext(WORKSPACE, {
      tripId: TRIP,
      disruptionId: DISRUPTION,
      tone: "urgent",
    });

    expect(context.tone).toBe("urgent");
    expect(context.trip.tripNumber).toBe("TRP-1");
    expect(context.disruption.disruptionNumber).toBe("DIS-1");
    // No approved plan in this fixture, so next steps are explicitly missing.
    expect(context.missingFacts).toContain("RECOVERY_NEXT_STEPS");
  });

  it("selects no financial columns for traveler-facing context", async () => {
    findTrip.mockResolvedValue(tripRow);
    findDisruption.mockResolvedValue(disruptionRow);

    await buildTravelerUpdateContext(WORKSPACE, {
      tripId: TRIP,
      disruptionId: DISRUPTION,
      tone: "reassuring",
    });

    const disruptionSelect = JSON.stringify(
      findDisruption.mock.calls[0][0].select,
    );
    for (const forbidden of [
      "estimatedCost",
      "actualCost",
      "confirmedCost",
      "rootCause",
    ]) {
      expect(disruptionSelect).not.toContain(forbidden);
    }
  });
});

describe("supplier email authorization", () => {
  const supplierRow = {
    id: SUPPLIER,
    name: "Summit Air",
    category: "TRANSPORT",
    region: "Khumbu",
    contactName: "Ops Desk",
    email: "ops@summitair.com.np",
    status: "ACTIVE",
  };

  const bookingRow = {
    serviceType: "TRANSPORT",
    description: "Helicopter transfer Ramechhap to Lukla",
    serviceDate: new Date("2026-04-03T00:00:00Z"),
    endDate: null,
    quantity: 8,
    unit: "seats",
    status: "INQUIRY",
  };

  it("scopes the supplier lookup to the workspace", async () => {
    findTrip.mockResolvedValue(tripRow);
    findSupplier.mockResolvedValue(supplierRow);
    findSupplierBooking.mockResolvedValue([bookingRow]);

    await buildSupplierEmailContext(WORKSPACE, {
      tripId: TRIP,
      supplierId: SUPPLIER,
      messageContext: "Please confirm helicopter availability",
    });

    expect(findSupplier.mock.calls[0][0].where).toMatchObject({
      id: SUPPLIER,
      workspaceId: WORKSPACE,
      deletedAt: null,
    });
  });

  it("rejects a supplier that is not linked to the trip", async () => {
    findTrip.mockResolvedValue(tripRow);
    findSupplier.mockResolvedValue(supplierRow);
    findSupplierBooking.mockResolvedValue([]);

    await expect(
      buildSupplierEmailContext(WORKSPACE, {
        tripId: TRIP,
        supplierId: SUPPLIER,
        messageContext: "",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });

    // The booking lookup carried both the trip and supplier ids.
    expect(findSupplierBooking.mock.calls[0][0].where).toMatchObject({
      workspaceId: WORKSPACE,
      tripId: TRIP,
      supplierId: SUPPLIER,
    });
  });

  it("rejects an unknown supplier", async () => {
    findTrip.mockResolvedValue(tripRow);
    findSupplier.mockResolvedValue(null);
    findSupplierBooking.mockResolvedValue([]);

    await expect(
      buildSupplierEmailContext(WORKSPACE, {
        tripId: TRIP,
        supplierId: SUPPLIER,
        messageContext: "",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("uses the recorded address and flags a missing one", async () => {
    findTrip.mockResolvedValue(tripRow);
    findSupplierBooking.mockResolvedValue([bookingRow]);

    findSupplier.mockResolvedValue(supplierRow);
    const withEmail = await buildSupplierEmailContext(WORKSPACE, {
      tripId: TRIP,
      supplierId: SUPPLIER,
      messageContext: "",
    });
    expect(withEmail.supplier.email).toBe("ops@summitair.com.np");
    expect(withEmail.missingFacts).not.toContain("SUPPLIER_EMAIL");

    findSupplier.mockResolvedValue({ ...supplierRow, email: null });
    const withoutEmail = await buildSupplierEmailContext(WORKSPACE, {
      tripId: TRIP,
      supplierId: SUPPLIER,
      messageContext: "",
    });
    expect(withoutEmail.supplier.email).toBeNull();
    expect(withoutEmail.missingFacts).toContain("SUPPLIER_EMAIL");
  });

  it("never selects cost columns from supplier bookings", async () => {
    findTrip.mockResolvedValue(tripRow);
    findSupplier.mockResolvedValue(supplierRow);
    findSupplierBooking.mockResolvedValue([bookingRow]);

    await buildSupplierEmailContext(WORKSPACE, {
      tripId: TRIP,
      supplierId: SUPPLIER,
      messageContext: "",
    });

    const select = JSON.stringify(findSupplierBooking.mock.calls[0][0].select);
    expect(select).not.toContain("estimatedCost");
    expect(select).not.toContain("confirmedCost");
    expect(select).not.toContain("actualCost");
    expect(select).not.toContain("currency");
    expect(select).not.toContain("confirmationNumber");
  });

  it("bounds untrusted staff text", async () => {
    findTrip.mockResolvedValue(tripRow);
    findSupplier.mockResolvedValue(supplierRow);
    findSupplierBooking.mockResolvedValue([bookingRow]);

    const context = await buildSupplierEmailContext(WORKSPACE, {
      tripId: TRIP,
      supplierId: SUPPLIER,
      messageContext: "y".repeat(5000),
    });
    expect(context.messageContext.length).toBeLessThanOrEqual(1000);
  });
});

describe("trip summary authorization", () => {
  it("scopes the disruption list to the workspace and trip", async () => {
    findTrip.mockResolvedValue(tripRow);
    findDisruptions.mockResolvedValue([disruptionRow]);

    const context = await buildTripSummaryContext(WORKSPACE, { tripId: TRIP });

    expect(findDisruptions.mock.calls[0][0].where).toMatchObject({
      workspaceId: WORKSPACE,
      tripId: TRIP,
    });
    expect(context.openDisruptionCount).toBe(1);
  });

  it("handles a trip with no disruptions", async () => {
    findTrip.mockResolvedValue(tripRow);
    findDisruptions.mockResolvedValue([]);

    const context = await buildTripSummaryContext(WORKSPACE, { tripId: TRIP });
    expect(context.disruptions).toEqual([]);
    expect(context.openDisruptionCount).toBe(0);
  });

  it("does not call the disruption query when the trip is out of scope", async () => {
    findTrip.mockResolvedValue(null);

    await expect(
      buildTripSummaryContext(OTHER_WORKSPACE, { tripId: TRIP }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(findDisruptions).not.toHaveBeenCalled();
  });
});
