import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResourceService } from "../resource.service.js";
import { ResourceRepository } from "../resource.repository.js";
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

const vehicleInput = {
  name: "Toyota Hiace BA-1-PA-1234",
  type: "VEHICLE" as const,
  vehicleType: "Hiace",
  licensePlate: "BA-1-PA-1234",
  capacity: 14,
};

describe("ResourceService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logAuditEvent).mockClear();
  });

  describe("listResources", () => {
    it("scopes list to workspaceId", async () => {
      const listSpy = vi
        .spyOn(ResourceRepository, "listResources")
        .mockResolvedValue({
          total: 1,
          items: [buildResource()],
        });

      const result = await ResourceService.listResources("ws-1", {
        limit: 50,
        offset: 0,
      });

      expect(listSpy).toHaveBeenCalledWith(
        "ws-1",
        expect.objectContaining({ limit: 50 }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0].name).toBe("Toyota Hiace BA-1-PA-1234");
    });

    it("filters by type", async () => {
      const listSpy = vi
        .spyOn(ResourceRepository, "listResources")
        .mockResolvedValue({
          total: 1,
          items: [buildResource()],
        });

      await ResourceService.listResources("ws-1", {
        type: "VEHICLE",
        limit: 50,
        offset: 0,
      });

      expect(listSpy).toHaveBeenCalledWith(
        "ws-1",
        expect.objectContaining({ type: "VEHICLE" }),
      );
    });
  });

  describe("createResource", () => {
    it('creates resource and writes audit "resource.created"', async () => {
      vi.spyOn(ResourceRepository, "findByName").mockResolvedValue(null);
      const createSpy = vi
        .spyOn(ResourceRepository, "create")
        .mockResolvedValue(buildResource() as never);

      const result = await ResourceService.createResource(
        "ws-1",
        "u-1",
        vehicleInput as never,
      );

      expect(createSpy).toHaveBeenCalledWith(
        "ws-1",
        expect.objectContaining({ name: vehicleInput.name }),
      );
      expect(result.id).toBe("res-1");
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "resource.created",
          entityType: "resource",
          entityId: "res-1",
        }),
      );
    });

    it("rejects duplicate name in workspace with conflict", async () => {
      vi.spyOn(ResourceRepository, "findByName").mockResolvedValue(
        buildResource() as never,
      );
      const createSpy = vi.spyOn(ResourceRepository, "create");

      await expect(
        ResourceService.createResource("ws-1", "u-1", vehicleInput as never),
      ).rejects.toThrow(AppError);

      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe("getResource", () => {
    it("returns resource detail when found", async () => {
      vi.spyOn(ResourceRepository, "findById").mockResolvedValue(
        buildResource() as never,
      );

      const result = await ResourceService.getResource("ws-1", "res-1");
      expect(result.id).toBe("res-1");
      expect(result.type).toBe("VEHICLE");
    });

    it("throws notFound across workspaces", async () => {
      vi.spyOn(ResourceRepository, "findById").mockResolvedValue(null);

      await expect(
        ResourceService.getResource("ws-1", "res-foreign"),
      ).rejects.toThrow(AppError);
    });
  });

  describe("updateResource", () => {
    it('updates resource and writes audit "resource.updated"', async () => {
      vi.spyOn(ResourceRepository, "findById").mockResolvedValue(
        buildResource() as never,
      );
      const updateSpy = vi
        .spyOn(ResourceRepository, "update")
        .mockResolvedValue(buildResource({ capacity: 16 }) as never);

      const result = await ResourceService.updateResource(
        "ws-1",
        "u-1",
        "res-1",
        {
          capacity: 16,
        },
      );

      expect(updateSpy).toHaveBeenCalledWith("res-1", "ws-1", { capacity: 16 });
      expect(result.capacity).toBe(16);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "resource.updated" }),
      );
    });

    it("throws notFound when resource does not exist", async () => {
      vi.spyOn(ResourceRepository, "findById").mockResolvedValue(null);

      await expect(
        ResourceService.updateResource("ws-1", "u-1", "res-missing", {
          capacity: 16,
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe("deleteResource", () => {
    it('soft-deletes resource and writes audit "resource.deleted"', async () => {
      vi.spyOn(ResourceRepository, "findById").mockResolvedValue(
        buildResource() as never,
      );
      const deleteSpy = vi
        .spyOn(ResourceRepository, "softDelete")
        .mockResolvedValue(buildResource({ deletedAt: new Date() }) as never);

      const result = await ResourceService.deleteResource(
        "ws-1",
        "u-1",
        "res-1",
      );

      expect(deleteSpy).toHaveBeenCalledWith("res-1", "ws-1");
      expect(result).toEqual({ success: true, id: "res-1" });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "resource.deleted" }),
      );
    });
  });
});
