import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoleService } from "../role.service.js";
import { RoleRepository } from "../role.repository.js";
import { AppError } from "../../../lib/errors.js";

describe("RoleService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createRole", () => {
    it("throws conflict if role name already exists in workspace", async () => {
      vi.spyOn(RoleRepository, "findByName").mockResolvedValue({
        id: "role-1",
        workspaceId: "ws-1",
        name: "Manager",
        description: null,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        RoleService.createRole("ws-1", "u1", {
          name: "Manager",
          permissionIds: ["p-1"],
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe("updateRole", () => {
    it("throws forbidden if trying to update a system role", async () => {
      vi.spyOn(RoleRepository, "findById").mockResolvedValue({
        id: "role-system",
        workspaceId: "ws-1",
        name: "Owner",
        description: null,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        rolePermissions: [],
        _count: { memberships: 1 },
      });

      await expect(
        RoleService.updateRole("ws-1", "role-system", "u1", {
          name: "Super Owner",
        }),
      ).rejects.toThrow(AppError);
    });
  });
});
