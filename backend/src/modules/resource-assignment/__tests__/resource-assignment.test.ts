import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResourceAssignmentService } from "../resource-assignment.service.js";
import { ResourceAssignmentRepository } from "../resource-assignment.repository.js";
import { TripRepository } from "../../trip/trip.repository.js";
import { ResourceRepository } from "../../resource/resource.repository.js";
import { AppError } from "../../../lib/errors.js";
import { logAuditEvent } from "../../../lib/audit.js";

vi.mock("../../../lib/audit.js", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildResource(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "res-1",
    workspaceId: "ws-1",
    name: "Toyota Hiace BA-1-PA-1234",
    type: "VEHICLE" as const,
    code: "VH-01",
    vehicleType: "Hiace",
    licensePlate: "BA-1-PA-1234",
    capacity: 14,
    quantity: null,
    status: "AVAILABLE" as const,
    notes: null,
    metadata: {},
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
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

function buildAssignment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "res-asgn-1",
    workspaceId: "ws-1",
    tripId: "trip-1",
    resourceId: "res-1",
    startDate: new Date("2026-10-05T00:00:00Z"),
    endDate: new Date("2026-10-07T00:00:00Z"),
    status: "PROPOSED" as const,
    notes: null,
    metadata: {},
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    resource: buildResource(),
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

const createInput = {
  tripId: "trip-1",
  resourceId: "res-1",
  startDate: "2026-10-05T00:00:00.000Z",
  endDate: "2026-10-07T00:00:00.000Z",
};

describe("ResourceAssignmentService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logAuditEvent).mockClear();
  });

  describe("createAssignment", () => {
    it("scopes to workspace and asserts trip exists", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(null);
      const createSpy = vi.spyOn(ResourceAssignmentRepository, "create");

      await expect(
        ResourceAssignmentService.createAssignment("ws-1", "u-1", createInput),
      ).rejects.toThrow(AppError);

      expect(createSpy).not.toHaveBeenCalled();
    });

    it("rejects resource from another workspace", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(ResourceRepository, "findById").mockResolvedValue(null);

      await expect(
        ResourceAssignmentService.createAssignment("ws-1", "u-1", createInput),
      ).rejects.toThrow(AppError);
    });

    it("rejects overlapping assignments with conflict", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(ResourceRepository, "findById").mockResolvedValue(
        buildResource() as never,
      );
      vi.spyOn(
        ResourceAssignmentRepository,
        "findOverlapping",
      ).mockResolvedValue([buildAssignment() as never]);
      const createSpy = vi.spyOn(ResourceAssignmentRepository, "create");

      await expect(
        ResourceAssignmentService.createAssignment("ws-1", "u-1", createInput),
      ).rejects.toThrow(AppError);

      expect(createSpy).not.toHaveBeenCalled();
    });

    it("allows back-to-back assignments", async () => {
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(ResourceRepository, "findById").mockResolvedValue(
        buildResource() as never,
      );
      vi.spyOn(
        ResourceAssignmentRepository,
        "findOverlapping",
      ).mockResolvedValue([]);
      const createSpy = vi
        .spyOn(ResourceAssignmentRepository, "create")
        .mockResolvedValue(buildAssignment() as never);

      const result = await ResourceAssignmentService.createAssignment(
        "ws-1",
        "u-1",
        createInput,
      );

      expect(createSpy).toHaveBeenCalledWith(
        "ws-1",
        expect.objectContaining({ resourceId: "res-1" }),
      );
      expect(result.id).toBe("res-asgn-1");
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "resource_assignment.created" }),
      );
    });
  });

  describe("updateAssignment", () => {
    it("re-checks conflicts on date update", async () => {
      vi.spyOn(ResourceAssignmentRepository, "findById").mockResolvedValue(
        buildAssignment() as never,
      );
      vi.spyOn(TripRepository, "findById").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(
        ResourceAssignmentRepository,
        "findOverlapping",
      ).mockResolvedValue([buildAssignment({ id: "res-asgn-2" }) as never]);

      await expect(
        ResourceAssignmentService.updateAssignment(
          "ws-1",
          "u-1",
          "res-asgn-1",
          {
            endDate: "2026-10-10T00:00:00.000Z",
          },
        ),
      ).rejects.toThrow(AppError);
    });
  });

  describe("updateStatus", () => {
    it("transitions PROPOSED to CONFIRMED", async () => {
      vi.spyOn(ResourceAssignmentRepository, "findById").mockResolvedValue(
        buildAssignment({ status: "PROPOSED" }) as never,
      );
      const updateStatusSpy = vi
        .spyOn(ResourceAssignmentRepository, "updateStatus")
        .mockResolvedValue(buildAssignment({ status: "CONFIRMED" }) as never);

      const result = await ResourceAssignmentService.updateStatus(
        "ws-1",
        "u-1",
        "res-asgn-1",
        "CONFIRMED",
      );

      expect(updateStatusSpy).toHaveBeenCalledWith(
        "res-asgn-1",
        "ws-1",
        "CONFIRMED",
      );
      expect(result.status).toBe("CONFIRMED");
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "resource_assignment.status.changed",
        }),
      );
    });
  });

  describe("checkAvailability", () => {
    it("returns conflicts when overlapping assignments exist", async () => {
      vi.spyOn(ResourceRepository, "findById").mockResolvedValue(
        buildResource() as never,
      );
      vi.spyOn(
        ResourceAssignmentRepository,
        "findOverlapping",
      ).mockResolvedValue([buildAssignment() as never]);

      const result = await ResourceAssignmentService.checkAvailability("ws-1", {
        resourceId: "res-1",
        startDate: "2026-10-05T00:00:00.000Z",
        endDate: "2026-10-07T00:00:00.000Z",
      });

      expect(result.available).toBe(false);
      expect(result.entityType).toBe("RESOURCE");
      expect(result.conflictingAssignments).toHaveLength(1);
    });
  });

  describe("tenant isolation", () => {
    it("cross-workspace delete rejected", async () => {
      vi.spyOn(ResourceAssignmentRepository, "findById").mockResolvedValue(
        null,
      );

      await expect(
        ResourceAssignmentService.deleteAssignment(
          "ws-1",
          "u-1",
          "asgn-foreign",
        ),
      ).rejects.toThrow(AppError);
    });

    it("list assignments scopes by workspaceId", async () => {
      const listSpy = vi
        .spyOn(ResourceAssignmentRepository, "listAssignments")
        .mockResolvedValue({ total: 0, items: [] });

      await ResourceAssignmentService.listAssignments("ws-1", {
        limit: 50,
        offset: 0,
      });

      expect(listSpy).toHaveBeenCalledWith(
        "ws-1",
        expect.objectContaining({ limit: 50 }),
      );
    });
  });
});
