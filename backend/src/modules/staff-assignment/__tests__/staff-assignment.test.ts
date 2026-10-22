import { describe, it, expect, vi, beforeEach } from "vitest";
import { StaffAssignmentService } from "../staff-assignment.service.js";
import { StaffAssignmentRepository } from "../staff-assignment.repository.js";
import { TripRepository } from "../../trip/trip.repository.js";
import { rawPrisma } from "../../../lib/prisma.js";
import { AppError } from "../../../lib/errors.js";
import { logAuditEvent } from "../../../lib/audit.js";

vi.mock("../../../lib/audit.js", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildAssignment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "asgn-1",
    workspaceId: "ws-1",
    tripId: "trip-1",
    staffId: "staff-1",
    role: "lead_guide",
    startDate: new Date("2026-10-05T00:00:00Z"),
    endDate: new Date("2026-10-16T00:00:00Z"),
    status: "PROPOSED" as const,
    agreedRate: 120000,
    currency: "NPR",
    confirmedAt: null,
    confirmedById: null,
    notes: null,
    metadata: {},
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
    staff: {
      id: "staff-1",
      fullName: "Dawa Sherpa",
      staffType: "GUIDE",
      phone: "+977-9800000001",
    },
    trip: {
      id: "trip-1",
      tripNumber: "TRP-2026-001",
      name: "EBC 12-Day October",
      startDate: new Date("2026-10-05T00:00:00Z"),
      endDate: new Date("2026-10-16T00:00:00Z"),
    },
    ...overrides,
  };
}

function buildTrip(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "trip-1",
    workspaceId: "ws-1",
    tripNumber: "TRP-2026-001",
    name: "EBC 12-Day October",
    startDate: new Date("2026-10-05T00:00:00Z"),
    endDate: new Date("2026-10-16T00:00:00Z"),
    groupSize: 4,
    status: "PLANNING" as const,
    operationsManagerId: "opm-1",
    leadGuideId: null,
    publishedItineraryVersionId: null,
    notes: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    travelers: [],
    itineraryDays: [],
    ...overrides,
  };
}

function buildStaff(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "staff-1",
    workspaceId: "ws-1",
    userId: null,
    staffType: "GUIDE",
    fullName: "Dawa Sherpa",
    status: "AVAILABLE" as const,
    deletedAt: null,
    ...overrides,
  };
}

const createInput = {
  tripId: "trip-1",
  staffId: "staff-1",
  role: "lead_guide",
  startDate: "2026-10-05T00:00:00.000Z",
  endDate: "2026-10-16T00:00:00.000Z",
  agreedRate: 120000,
  currency: "NPR",
};

describe("StaffAssignmentService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logAuditEvent).mockClear();
  });

  describe("createAssignment", () => {
    it("scopes to workspace and asserts trip exists in workspace", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(null);
      const createSpy = vi.spyOn(StaffAssignmentRepository, "create");

      await expect(
        StaffAssignmentService.createAssignment("ws-1", "u-1", createInput),
      ).rejects.toThrow(AppError);

      expect(createSpy).not.toHaveBeenCalled();
    });

    it("rejects staff from another workspace (tenant isolation)", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(rawPrisma.staffProfile, "findFirst").mockResolvedValue(null);
      const createSpy = vi.spyOn(StaffAssignmentRepository, "create");

      await expect(
        StaffAssignmentService.createAssignment("ws-1", "u-1", createInput),
      ).rejects.toThrow(AppError);

      expect(createSpy).not.toHaveBeenCalled();
    });

    it("rejects out-of-trip-range dates", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(rawPrisma.staffProfile, "findFirst").mockResolvedValue(
        buildStaff() as never,
      );

      await expect(
        StaffAssignmentService.createAssignment("ws-1", "u-1", {
          ...createInput,
          startDate: "2026-10-01T00:00:00.000Z", // Before trip start
        }),
      ).rejects.toThrow(AppError);
    });

    it("rejects overlapping existing assignment with conflict error", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(rawPrisma.staffProfile, "findFirst").mockResolvedValue(
        buildStaff() as never,
      );
      vi.spyOn(StaffAssignmentRepository, "findOverlapping").mockResolvedValue([
        buildAssignment() as never,
      ]);
      const createSpy = vi.spyOn(StaffAssignmentRepository, "create");

      await expect(
        StaffAssignmentService.createAssignment("ws-1", "u-1", createInput),
      ).rejects.toThrow(AppError);

      expect(createSpy).not.toHaveBeenCalled();
    });

    it("allows back-to-back assignments when end equals start of next", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(rawPrisma.staffProfile, "findFirst").mockResolvedValue(
        buildStaff() as never,
      );
      // findOverlapping returns empty for touching endpoints
      vi.spyOn(StaffAssignmentRepository, "findOverlapping").mockResolvedValue(
        [],
      );
      vi.spyOn(StaffAssignmentRepository, "create").mockResolvedValue(
        buildAssignment() as never,
      );
      vi.spyOn(TripRepository, "assign").mockResolvedValue(
        buildTrip() as never,
      );

      const result = await StaffAssignmentService.createAssignment(
        "ws-1",
        "u-1",
        createInput,
      );

      expect(result.id).toBe("asgn-1");
      expect(result.status).toBe("PROPOSED");
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "staff_assignment.created" }),
      );
    });

    it("auto-syncs role=lead_guide by setting Trip.leadGuideId", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(rawPrisma.staffProfile, "findFirst").mockResolvedValue(
        buildStaff() as never,
      );
      vi.spyOn(StaffAssignmentRepository, "findOverlapping").mockResolvedValue(
        [],
      );
      vi.spyOn(StaffAssignmentRepository, "create").mockResolvedValue(
        buildAssignment({ role: "lead_guide" }) as never,
      );
      const assignSpy = vi
        .spyOn(TripRepository, "assign")
        .mockResolvedValue(buildTrip() as never);

      await StaffAssignmentService.createAssignment("ws-1", "u-1", createInput);

      expect(assignSpy).toHaveBeenCalledWith("trip-1", "ws-1", {
        leadGuideId: "staff-1",
      });
    });
  });

  describe("updateAssignment", () => {
    it("with role change from lead_guide clears Trip.leadGuideId", async () => {
      vi.spyOn(StaffAssignmentRepository, "findById").mockResolvedValue(
        buildAssignment({ role: "lead_guide", staffId: "staff-1" }) as never,
      );
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip({ leadGuideId: "staff-1" }) as never,
      );
      vi.spyOn(StaffAssignmentRepository, "update").mockResolvedValue(
        buildAssignment({ role: "assistant_guide" }) as never,
      );
      const assignSpy = vi
        .spyOn(TripRepository, "assign")
        .mockResolvedValue(buildTrip() as never);

      await StaffAssignmentService.updateAssignment("ws-1", "u-1", "asgn-1", {
        role: "assistant_guide",
      });

      expect(assignSpy).toHaveBeenCalledWith("trip-1", "ws-1", {
        leadGuideId: null,
      });
    });
  });

  describe("updateStatus", () => {
    it("PROPOSED -> CONFIRMED sets confirmedAt and confirmedById", async () => {
      vi.spyOn(StaffAssignmentRepository, "findById").mockResolvedValue(
        buildAssignment({ status: "PROPOSED" }) as never,
      );
      const updateStatusSpy = vi
        .spyOn(StaffAssignmentRepository, "updateStatus")
        .mockResolvedValue(
          buildAssignment({
            status: "CONFIRMED",
            confirmedAt: new Date(),
            confirmedById: "u-1",
          }) as never,
        );

      const result = await StaffAssignmentService.updateStatus(
        "ws-1",
        "u-1",
        "asgn-1",
        "CONFIRMED",
      );

      expect(updateStatusSpy).toHaveBeenCalledWith(
        "asgn-1",
        "ws-1",
        "CONFIRMED",
        expect.objectContaining({ confirmedById: "u-1" }),
      );
      expect(result.status).toBe("CONFIRMED");
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "staff_assignment.status.changed" }),
      );
    });

    it("rejects invalid transition (COMPLETED -> CONFIRMED)", async () => {
      vi.spyOn(StaffAssignmentRepository, "findById").mockResolvedValue(
        buildAssignment({ status: "COMPLETED" }) as never,
      );

      await expect(
        StaffAssignmentService.updateStatus(
          "ws-1",
          "u-1",
          "asgn-1",
          "CONFIRMED",
        ),
      ).rejects.toThrow(AppError);
    });
  });

  describe("deleteAssignment", () => {
    it("soft-deletes and clears leadGuideId if applicable", async () => {
      vi.spyOn(StaffAssignmentRepository, "findById").mockResolvedValue(
        buildAssignment({ role: "lead_guide", staffId: "staff-1" }) as never,
      );
      vi.spyOn(StaffAssignmentRepository, "softDelete").mockResolvedValue(
        buildAssignment() as never,
      );
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip({ leadGuideId: "staff-1" }) as never,
      );
      const assignSpy = vi
        .spyOn(TripRepository, "assign")
        .mockResolvedValue(buildTrip() as never);

      const result = await StaffAssignmentService.deleteAssignment(
        "ws-1",
        "u-1",
        "asgn-1",
      );

      expect(result).toEqual({ success: true, id: "asgn-1" });
      expect(assignSpy).toHaveBeenCalledWith("trip-1", "ws-1", {
        leadGuideId: null,
      });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "staff_assignment.deleted" }),
      );
    });
  });

  describe("checkAvailability", () => {
    it("returns conflictingAssignments with trip summary", async () => {
      vi.spyOn(rawPrisma.staffProfile, "findFirst").mockResolvedValue(
        buildStaff() as never,
      );
      vi.spyOn(StaffAssignmentRepository, "findOverlapping").mockResolvedValue([
        buildAssignment() as never,
      ]);

      const result = await StaffAssignmentService.checkAvailability("ws-1", {
        staffId: "staff-1",
        startDate: "2026-10-05T00:00:00.000Z",
        endDate: "2026-10-16T00:00:00.000Z",
      });

      expect(result.available).toBe(false);
      expect(result.entityType).toBe("STAFF");
      expect(result.conflictingAssignments).toHaveLength(1);
      expect(result.conflictingAssignments[0].tripName).toBe(
        "EBC 12-Day October",
      );
    });
  });

  describe("tenant isolation", () => {
    it("cross-workspace get throws notFound", async () => {
      vi.spyOn(StaffAssignmentRepository, "findById").mockResolvedValue(null);

      await expect(
        StaffAssignmentService.getAssignment("ws-1", "asgn-foreign"),
      ).rejects.toThrow(AppError);
    });
  });
});
