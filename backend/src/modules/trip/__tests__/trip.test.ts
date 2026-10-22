import { describe, it, expect, vi, beforeEach } from "vitest";
import { TripService } from "../trip.service.js";
import { TripRepository } from "../trip.repository.js";
import { BookingRepository } from "../../booking/booking.repository.js";
import { rawPrisma } from "../../../lib/prisma.js";
import { AppError } from "../../../lib/errors.js";
import { logAuditEvent } from "../../../lib/audit.js";

vi.mock("../../../lib/audit.js", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildTrip(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "trip-1",
    workspaceId: "ws-1",
    bookingId: null,
    customerId: "cust-1",
    tripNumber: "TRP-2026-001",
    name: "EBC 12-Day October",
    startDate: new Date("2026-10-05T00:00:00Z"),
    endDate: new Date("2026-10-16T00:00:00Z"),
    groupSize: 4,
    status: "PLANNING" as const,
    operationsManagerId: null,
    leadGuideId: null,
    publishedItineraryVersionId: null,
    notes: null,
    metadata: {},
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
    travelers: [],
    itineraryDays: [],
    ...overrides,
  };
}

const validInput = {
  customerId: "cust-1",
  name: "EBC 12-Day October",
  startDate: "2026-10-05T00:00:00.000Z",
  endDate: "2026-10-16T00:00:00.000Z",
  groupSize: 4,
};

describe("TripService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logAuditEvent).mockClear();
  });

  describe("listTrips", () => {
    it("scopes the repository query to the supplied workspaceId", async () => {
      const listSpy = vi
        .spyOn(TripRepository, "listTrips")
        .mockResolvedValue({ total: 1, items: [buildTrip()] });

      const result = await TripService.listTrips("ws-1", {
        limit: 50,
        offset: 0,
      } as never);

      expect(listSpy).toHaveBeenCalledWith(
        "ws-1",
        expect.objectContaining({ limit: 50 }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0].tripNumber).toBe("TRP-2026-001");
    });
  });

  describe("getTrip", () => {
    it("throws notFound when trip does not exist in workspace", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(null);
      await expect(TripService.getTrip("ws-1", "missing")).rejects.toThrow(
        AppError,
      );
    });
  });

  describe("createTrip", () => {
    it("creates with bookingId when booking + customer are in the workspace", async () => {
      vi.spyOn(BookingRepository, "findById").mockResolvedValue({
        id: "bkg-1",
      } as never);
      vi.spyOn(TripRepository, "findByBooking").mockResolvedValue(null);
      vi.spyOn(rawPrisma.customer, "findFirst").mockResolvedValue({
        id: "cust-1",
      } as never);
      vi.spyOn(TripRepository, "generateNumber").mockResolvedValue(
        "TRP-2026-001",
      );
      const createSpy = vi
        .spyOn(TripRepository, "create")
        .mockResolvedValue(buildTrip() as never);

      const result = await TripService.createTrip("ws-1", "u1", {
        ...validInput,
        bookingId: "bkg-1",
      } as never);

      expect(createSpy.mock.calls[0][0]).toBe("ws-1");
      expect(createSpy.mock.calls[0][1].bookingId).toBe("bkg-1");
      expect(result.tripNumber).toBe("TRP-2026-001");
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "trip.created", entityType: "trip" }),
      );
    });

    it("throws notFound for a customer from another workspace (tenant isolation)", async () => {
      vi.spyOn(rawPrisma.customer, "findFirst").mockResolvedValue(null);
      const createSpy = vi.spyOn(TripRepository, "create");
      await expect(
        TripService.createTrip("ws-1", "u1", validInput as never),
      ).rejects.toThrow(AppError);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it("throws conflict when the booking is already linked to a trip", async () => {
      vi.spyOn(BookingRepository, "findById").mockResolvedValue({
        id: "bkg-1",
      } as never);
      vi.spyOn(TripRepository, "findByBooking").mockResolvedValue(
        buildTrip() as never,
      );
      await expect(
        TripService.createTrip("ws-1", "u1", {
          ...validInput,
          bookingId: "bkg-1",
        } as never),
      ).rejects.toThrow(AppError);
    });

    it("rejects an ops manager who is not a workspace member", async () => {
      vi.spyOn(rawPrisma.customer, "findFirst").mockResolvedValue({
        id: "cust-1",
      } as never);
      vi.spyOn(rawPrisma.membership, "findFirst").mockResolvedValue(null);
      await expect(
        TripService.createTrip("ws-1", "u1", {
          ...validInput,
          operationsManagerId: "u-foreign",
        } as never),
      ).rejects.toThrow(AppError);
    });
  });

  describe("updateStatus", () => {
    it("rejects invalid transitions (e.g., COMPLETED -> READY)", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip({ status: "COMPLETED" }) as never,
      );
      const updateSpy = vi.spyOn(TripRepository, "updateStatus");
      await expect(
        TripService.updateStatus("ws-1", "trip-1", "u1", "READY"),
      ).rejects.toThrow(AppError);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("allows PLANNING -> READY when readiness is READY", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip({
          operationsManagerId: "u9",
          travelers: [{ id: "t1", isTripLeader: false }],
          publishedItineraryVersionId: "ver-1",
          leadGuideId: "g1",
        }) as never,
      );
      const updateSpy = vi
        .spyOn(TripRepository, "updateStatus")
        .mockResolvedValue(buildTrip({ status: "READY" }) as never);

      const result = await TripService.updateStatus(
        "ws-1",
        "trip-1",
        "u1",
        "READY",
      );

      expect(updateSpy.mock.calls[0][2]).toBe("READY");
      expect(result.status).toBe("READY");
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "trip.status.changed" }),
      );
    });

    it("rejects PLANNING -> READY when readiness is BLOCKED", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip() as never,
      );
      const updateSpy = vi.spyOn(TripRepository, "updateStatus");
      await expect(
        TripService.updateStatus("ws-1", "trip-1", "u1", "READY"),
      ).rejects.toThrow(AppError);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe("assign", () => {
    it("updates operations manager and lead guide with from/to audit", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(rawPrisma.membership, "findFirst").mockResolvedValue({
        id: "m-1",
      } as never);
      vi.spyOn(rawPrisma.staffProfile, "findFirst").mockResolvedValue({
        id: "g1",
      } as never);
      const assignSpy = vi
        .spyOn(TripRepository, "assign")
        .mockResolvedValue(
          buildTrip({ operationsManagerId: "u9", leadGuideId: "g1" }) as never,
        );

      const result = await TripService.assign("ws-1", "trip-1", "u1", {
        operationsManagerId: "u9",
        leadGuideId: "g1",
      } as never);

      expect(assignSpy).toHaveBeenCalledWith("trip-1", "ws-1", {
        operationsManagerId: "u9",
        leadGuideId: "g1",
      });
      expect(result.operationsManagerId).toBe("u9");
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "trip.assigned",
          details: expect.objectContaining({
            from: expect.objectContaining({ operationsManagerId: null }),
            to: expect.objectContaining({ operationsManagerId: "u9" }),
          }),
        }),
      );
    });
  });

  describe("getReadiness", () => {
    it("returns BLOCKED when there are no travelers", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip({ operationsManagerId: "u9" }) as never,
      );
      const readiness = await TripService.getReadiness("ws-1", "trip-1");
      expect(readiness.status).toBe("BLOCKED");
      expect(readiness.travelerCount).toBe(0);
      expect(readiness.blockingIssues).toContain("No travelers added");
    });

    it("returns BLOCKED when there is no ops manager", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip({ travelers: [{ id: "t1" }] }) as never,
      );
      const readiness = await TripService.getReadiness("ws-1", "trip-1");
      expect(readiness.status).toBe("BLOCKED");
      expect(readiness.blockingIssues).toContain(
        "No operations manager assigned",
      );
    });

    it("returns PARTIAL when itinerary not published (no blockers)", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip({
          operationsManagerId: "u9",
          travelers: [{ id: "t1" }],
        }) as never,
      );
      const readiness = await TripService.getReadiness("ws-1", "trip-1");
      expect(readiness.status).toBe("PARTIAL");
      expect(readiness.itineraryPublished).toBe(false);
      expect(readiness.warnings).toContain("Itinerary not yet published");
      expect(readiness.blockingIssues).toHaveLength(0);
    });

    it("returns READY when all conditions are met", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip({
          operationsManagerId: "u9",
          leadGuideId: "g1",
          publishedItineraryVersionId: "ver-1",
          travelers: [{ id: "t1" }, { id: "t2" }],
        }) as never,
      );
      const readiness = await TripService.getReadiness("ws-1", "trip-1");
      expect(readiness.status).toBe("READY");
      expect(readiness.travelerCount).toBe(2);
      expect(readiness.blockingIssues).toHaveLength(0);
      expect(readiness.warnings).toHaveLength(0);
    });
  });

  describe("deleteTrip", () => {
    it('soft deletes and writes audit "trip.deleted"', async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip() as never,
      );
      const softDeleteSpy = vi
        .spyOn(TripRepository, "softDelete")
        .mockResolvedValue(buildTrip({ deletedAt: new Date() }) as never);

      const result = await TripService.deleteTrip("ws-1", "trip-1", "u1");

      expect(softDeleteSpy).toHaveBeenCalledWith("trip-1", "ws-1");
      expect(result).toEqual({ success: true, id: "trip-1" });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "trip.deleted" }),
      );
    });
  });

  describe("tenant isolation", () => {
    it("cross-workspace get is rejected", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(null);
      await expect(TripService.getTrip("ws-1", "trip-1")).rejects.toThrow(
        AppError,
      );
    });

    it("cross-workspace assign is rejected before repository call", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(null);
      const assignSpy = vi.spyOn(TripRepository, "assign");
      await expect(
        TripService.assign("ws-1", "trip-1", "u1", {
          operationsManagerId: "u9",
        } as never),
      ).rejects.toThrow(AppError);
      expect(assignSpy).not.toHaveBeenCalled();
    });
  });
});
