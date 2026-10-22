import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkspaceService } from "../workspace.service.js";
import { WorkspaceRepository } from "../workspace.repository.js";
import { AppError } from "../../../lib/errors.js";

describe("WorkspaceService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createWorkspace", () => {
    it("throws conflict if slug already exists", async () => {
      vi.spyOn(WorkspaceRepository, "findBySlug").mockResolvedValue({
        id: "ws-1",
        name: "Existing",
        slug: "existing",
        status: "ACTIVE",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        WorkspaceService.createWorkspace("user-1", {
          name: "Existing",
          slug: "existing",
        }),
      ).rejects.toThrow(AppError);
    });

    it("creates workspace and returns summary when slug is unique", async () => {
      vi.spyOn(WorkspaceRepository, "findBySlug").mockResolvedValue(null);
      vi.spyOn(
        WorkspaceRepository,
        "createWorkspaceWithOwner",
      ).mockResolvedValue({
        id: "ws-new",
        name: "New Workspace",
        slug: "new-workspace",
        status: "ACTIVE",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(
        WorkspaceRepository,
        "getWorkspaceDetailsForUser",
      ).mockResolvedValue({
        id: "mem-1",
        workspaceId: "ws-new",
        userId: "user-1",
        roleId: "role-owner",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        workspace: {
          id: "ws-new",
          name: "New Workspace",
          slug: "new-workspace",
          status: "ACTIVE",
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        role: {
          id: "role-owner",
          workspaceId: "ws-new",
          name: "Owner",
          description: null,
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          rolePermissions: [],
        },
      });

      const res = await WorkspaceService.createWorkspace("user-1", {
        name: "New Workspace",
        slug: "new-workspace",
      });

      expect(res.id).toBe("ws-new");
      expect(res.slug).toBe("new-workspace");
    });
  });
});
