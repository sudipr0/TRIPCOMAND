import { describe, it, expect, vi, beforeEach } from "vitest";
import { DestinationService } from "../destination.service.js";
import { DestinationRepository } from "../destination.repository.js";
import { AppError } from "../../../lib/errors.js";

vi.mock("../../../lib/audit.js", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildDestination(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "dest-1",
    workspaceId: "ws-1",
    name: "Everest Base Camp",
    region: "Khumbu",
    country: "Nepal",
    latitude: null,
    longitude: null,
    altitude: 5364,
    description: null,
    imageUrl: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  };
}

describe("DestinationService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("listDestinations", () => {
    it("scopes the repository query to the supplied workspaceId", async () => {
      const listSpy = vi
        .spyOn(DestinationRepository, "listDestinations")
        .mockResolvedValue({ total: 1, items: [buildDestination()] });

      const result = await DestinationService.listDestinations("ws-1", {
        limit: 50,
        offset: 0,
      });

      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(
        "ws-1",
        expect.objectContaining({ limit: 50, offset: 0 }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe("dest-1");
      expect(result.items[0].workspaceId).toBe("ws-1");
    });
  });

  describe("getDestination", () => {
    it("throws not found when destination does not exist in workspace", async () => {
      vi.spyOn(DestinationRepository, "findById").mockResolvedValue(null);

      await expect(
        DestinationService.getDestination("ws-1", "missing"),
      ).rejects.toThrow(AppError);
    });

    it("returns the destination when found in workspace", async () => {
      vi.spyOn(DestinationRepository, "findById").mockResolvedValue(
        buildDestination(),
      );

      const result = await DestinationService.getDestination("ws-1", "dest-1");
      expect(result.id).toBe("dest-1");
      expect(result.name).toBe("Everest Base Camp");
    });
  });

  describe("createDestination", () => {
    it("throws conflict when a destination with the same name exists in workspace", async () => {
      vi.spyOn(DestinationRepository, "findByName").mockResolvedValue(
        buildDestination(),
      );

      await expect(
        DestinationService.createDestination("ws-1", "u1", {
          name: "Everest Base Camp",
          country: "Nepal",
        }),
      ).rejects.toThrow(AppError);
    });

    it("creates a destination scoped to the workspace", async () => {
      vi.spyOn(DestinationRepository, "findByName").mockResolvedValue(null);
      const createSpy = vi
        .spyOn(DestinationRepository, "create")
        .mockResolvedValue(buildDestination());

      const result = await DestinationService.createDestination("ws-1", "u1", {
        name: "Everest Base Camp",
        country: "Nepal",
      });

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy.mock.calls[0][0]).toBe("ws-1");
      expect(result.id).toBe("dest-1");
    });
  });

  describe("updateDestination", () => {
    it("throws not found when destination is not in the workspace", async () => {
      vi.spyOn(DestinationRepository, "findById").mockResolvedValue(null);

      await expect(
        DestinationService.updateDestination("ws-1", "missing", "u1", {
          name: "Updated",
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe("deleteDestination", () => {
    it("throws not found when destination is not in the workspace", async () => {
      vi.spyOn(DestinationRepository, "findById").mockResolvedValue(null);

      await expect(
        DestinationService.deleteDestination("ws-1", "missing", "u1"),
      ).rejects.toThrow(AppError);
    });

    it("soft deletes a destination in the workspace", async () => {
      vi.spyOn(DestinationRepository, "findById").mockResolvedValue(
        buildDestination(),
      );
      const softDeleteSpy = vi
        .spyOn(DestinationRepository, "softDelete")
        .mockResolvedValue(buildDestination({ deletedAt: new Date() }));

      const result = await DestinationService.deleteDestination(
        "ws-1",
        "dest-1",
        "u1",
      );

      expect(softDeleteSpy).toHaveBeenCalledWith("dest-1", "ws-1");
      expect(result.success).toBe(true);
      expect(result.id).toBe("dest-1");
    });
  });

  describe("tenant isolation", () => {
    it("does not return destinations belonging to another workspace", async () => {
      vi.spyOn(DestinationRepository, "findById").mockResolvedValue(null);

      await expect(
        DestinationService.getDestination("ws-1", "dest-in-ws-2"),
      ).rejects.toThrow(AppError);

      expect(DestinationRepository.findById).toHaveBeenCalledWith(
        "dest-in-ws-2",
        "ws-1",
      );
    });

    it("rejects cross-workspace delete attempts", async () => {
      vi.spyOn(DestinationRepository, "findById").mockResolvedValue(null);
      const softDeleteSpy = vi.spyOn(DestinationRepository, "softDelete");

      await expect(
        DestinationService.deleteDestination("ws-1", "dest-in-ws-2", "u1"),
      ).rejects.toThrow(AppError);

      expect(softDeleteSpy).not.toHaveBeenCalled();
    });
  });
});
