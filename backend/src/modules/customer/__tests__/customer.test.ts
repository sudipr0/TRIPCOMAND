import { describe, it, expect, vi, beforeEach } from "vitest";
import { CustomerService } from "../customer.service.js";
import { CustomerRepository } from "../customer.repository.js";
import { AppError } from "../../../lib/errors.js";
import { logAuditEvent } from "../../../lib/audit.js";

vi.mock("../../../lib/audit.js", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildCustomer(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "cust-1",
    workspaceId: "ws-1",
    customerType: "INDIVIDUAL" as const,
    fullName: "Jane Smith",
    email: "jane@example.com",
    phone: "+977-9800000000",
    whatsapp: null,
    nationality: "Nepali",
    address: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    source: null,
    tags: [],
    notes: null,
    metadata: {},
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  };
}

const validInput = {
  customerType: "INDIVIDUAL" as const,
  fullName: "Jane Smith",
  email: "jane@example.com",
};

describe("CustomerService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logAuditEvent).mockClear();
  });

  describe("listCustomers", () => {
    it("scopes the repository query to the supplied workspaceId", async () => {
      const listSpy = vi
        .spyOn(CustomerRepository, "listCustomers")
        .mockResolvedValue({ total: 1, items: [buildCustomer()] });

      const result = await CustomerService.listCustomers("ws-1", {
        limit: 50,
        offset: 0,
      });

      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(
        "ws-1",
        expect.objectContaining({ limit: 50, offset: 0 }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe("cust-1");
      expect(result.items[0].workspaceId).toBe("ws-1");
    });
  });

  describe("getCustomer", () => {
    it("throws notFound when customer does not exist in workspace", async () => {
      vi.spyOn(CustomerRepository, "findById").mockResolvedValue(null);
      await expect(
        CustomerService.getCustomer("ws-1", "missing"),
      ).rejects.toThrow(AppError);
    });

    it("returns the customer when found in workspace", async () => {
      vi.spyOn(CustomerRepository, "findById").mockResolvedValue(
        buildCustomer() as never,
      );
      const result = await CustomerService.getCustomer("ws-1", "cust-1");
      expect(result.id).toBe("cust-1");
      expect(result.fullName).toBe("Jane Smith");
      // Decimal/date serialization: dates as ISO strings
      expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
    });
  });

  describe("createCustomer", () => {
    it("calls the repository with workspaceId as first argument", async () => {
      vi.spyOn(CustomerRepository, "findByEmail").mockResolvedValue(null);
      const createSpy = vi
        .spyOn(CustomerRepository, "create")
        .mockResolvedValue(buildCustomer() as never);

      await CustomerService.createCustomer("ws-1", "u1", validInput as never);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy.mock.calls[0][0]).toBe("ws-1");
      expect(createSpy.mock.calls[0][1].fullName).toBe("Jane Smith");
    });

    it('writes an audit event "customer.created"', async () => {
      vi.spyOn(CustomerRepository, "findByEmail").mockResolvedValue(null);
      vi.spyOn(CustomerRepository, "create").mockResolvedValue(
        buildCustomer() as never,
      );

      await CustomerService.createCustomer("ws-1", "u1", validInput as never);

      expect(logAuditEvent).toHaveBeenCalledTimes(1);
      expect(vi.mocked(logAuditEvent).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          workspaceId: "ws-1",
          userId: "u1",
          action: "customer.created",
          entityType: "customer",
        }),
      );
    });

    it("throws conflict when email already exists in workspace", async () => {
      vi.spyOn(CustomerRepository, "findByEmail").mockResolvedValue(
        buildCustomer() as never,
      );
      await expect(
        CustomerService.createCustomer("ws-1", "u1", validInput as never),
      ).rejects.toThrow(AppError);
    });
  });

  describe("updateCustomer", () => {
    it("throws notFound when customer is not in the workspace", async () => {
      vi.spyOn(CustomerRepository, "findById").mockResolvedValue(null);
      await expect(
        CustomerService.updateCustomer("ws-1", "missing", "u1", {
          fullName: "X",
        } as never),
      ).rejects.toThrow(AppError);
    });
  });

  describe("deleteCustomer", () => {
    it("calls softDelete(customerId, workspaceId) — argument order matters", async () => {
      vi.spyOn(CustomerRepository, "findById").mockResolvedValue(
        buildCustomer() as never,
      );
      const softDeleteSpy = vi
        .spyOn(CustomerRepository, "softDelete")
        .mockResolvedValue(buildCustomer({ deletedAt: new Date() }) as never);

      const result = await CustomerService.deleteCustomer(
        "ws-1",
        "cust-1",
        "u1",
      );

      expect(softDeleteSpy).toHaveBeenCalledTimes(1);
      expect(softDeleteSpy).toHaveBeenCalledWith("cust-1", "ws-1");
      expect(result).toEqual({ success: true, id: "cust-1" });
    });

    it('writes an audit event "customer.deleted"', async () => {
      vi.spyOn(CustomerRepository, "findById").mockResolvedValue(
        buildCustomer() as never,
      );
      vi.spyOn(CustomerRepository, "softDelete").mockResolvedValue(
        buildCustomer({ deletedAt: new Date() }) as never,
      );

      await CustomerService.deleteCustomer("ws-1", "cust-1", "u1");

      expect(vi.mocked(logAuditEvent).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          workspaceId: "ws-1",
          userId: "u1",
          action: "customer.deleted",
          entityType: "customer",
          entityId: "cust-1",
        }),
      );
    });
  });

  describe("tenant isolation", () => {
    it("cross-workspace get is rejected and repository never returns the row", async () => {
      // Simulates the repository's own workspace filter returning null for another tenant.
      vi.spyOn(CustomerRepository, "findById").mockResolvedValue(null);
      const getSpy = vi.spyOn(CustomerRepository, "findById");

      await expect(
        CustomerService.getCustomer("ws-1", "cust-1"),
      ).rejects.toThrow(AppError);
      // Repository was called with the requesting workspace only — never leaked data.
      expect(getSpy.mock.calls[0][1]).toBe("ws-1");
    });

    it("cross-workspace delete is rejected and softDelete is never called", async () => {
      vi.spyOn(CustomerRepository, "findById").mockResolvedValue(null);
      const softDeleteSpy = vi.spyOn(CustomerRepository, "softDelete");

      await expect(
        CustomerService.deleteCustomer("ws-1", "cust-1", "u1"),
      ).rejects.toThrow(AppError);
      expect(softDeleteSpy).not.toHaveBeenCalled();
    });
  });
});
