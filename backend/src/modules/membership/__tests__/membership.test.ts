import { describe, it, expect, vi, beforeEach } from "vitest";
import { MembershipService } from "../membership.service.js";
import { MembershipRepository } from "../membership.repository.js";
import { WorkspaceRepository } from "../../workspace/workspace.repository.js";
import { AuthRepository } from "../../auth/auth.repository.js";
import { RoleRepository } from "../../role/role.repository.js";
import { AppError } from "../../../lib/errors.js";

describe("MembershipService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("inviteMember", () => {
    it("throws not found when workspace does not exist", async () => {
      vi.spyOn(WorkspaceRepository, "findById").mockResolvedValue(null);

      await expect(
        MembershipService.inviteMember("ws-missing", "u1", {
          email: "new@demo.com",
          roleId: "role-1",
        }),
      ).rejects.toThrow(AppError);
    });

    it("throws bad request when role does not exist in workspace", async () => {
      vi.spyOn(WorkspaceRepository, "findById").mockResolvedValue({
        id: "ws-1",
        name: "Demo",
        slug: "demo",
        status: "ACTIVE",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(AuthRepository, "findUserById").mockResolvedValue({
        id: "u1",
        email: "inviter@demo.com",
        passwordHash: "hash",
        firstName: "Inviter",
        lastName: "User",
        status: "ACTIVE",
        resetToken: null,
        resetTokenExp: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(RoleRepository, "findById").mockResolvedValue(null);

      await expect(
        MembershipService.inviteMember("ws-1", "u1", {
          email: "new@demo.com",
          roleId: "role-nonexistent",
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe("removeMember", () => {
    it("prevents removing the sole Owner of a workspace", async () => {
      vi.spyOn(MembershipRepository, "findById").mockResolvedValue({
        id: "mem-1",
        workspaceId: "ws-1",
        userId: "u1",
        roleId: "role-owner",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        role: {
          id: "role-owner",
          workspaceId: "ws-1",
          name: "Owner",
          description: null,
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: "u1",
          email: "owner@demo.com",
          passwordHash: "h",
          firstName: "O",
          lastName: "W",
          status: "ACTIVE",
          resetToken: null,
          resetTokenExp: null,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      vi.spyOn(MembershipRepository, "countOwners").mockResolvedValue(1);

      await expect(
        MembershipService.removeMember("ws-1", "mem-1", "u1"),
      ).rejects.toThrow(AppError);
    });
  });
});
