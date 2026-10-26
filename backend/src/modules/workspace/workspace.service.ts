import { WorkspaceRepository } from "./workspace.repository.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceSummary,
  PermissionCode,
} from "@trailcomand/shared";

export class WorkspaceService {
  static async listUserWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await WorkspaceRepository.listUserWorkspaces(userId);

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      status: m.workspace.status,
      createdAt: m.workspace.createdAt.toISOString(),
      updatedAt: m.workspace.updatedAt.toISOString(),
      role: {
        id: m.role.id,
        name: m.role.name,
        isSystem: m.role.isSystem,
      },
      permissions: m.role.rolePermissions.map(
        (rp) => rp.permission.code as PermissionCode,
      ),
    }));
  }

  static async getWorkspaceById(workspaceId: string, userId: string) {
    const membership = await WorkspaceRepository.getWorkspaceDetailsForUser(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw AppError.tenantNotFound("Workspace not found or access denied");
    }

    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      status: membership.workspace.status,
      settings: membership.workspace.settings,
      createdAt: membership.workspace.createdAt.toISOString(),
      updatedAt: membership.workspace.updatedAt.toISOString(),
      role: {
        id: membership.role.id,
        name: membership.role.name,
        isSystem: membership.role.isSystem,
      },
      permissions: membership.role.rolePermissions.map(
        (rp) => rp.permission.code as PermissionCode,
      ),
    };
  }

  static async createWorkspace(userId: string, input: CreateWorkspaceInput) {
    const existing = await WorkspaceRepository.findBySlug(input.slug);
    if (existing) {
      throw AppError.conflict(
        "Workspace slug is already taken. Please choose another.",
      );
    }

    const workspace = await WorkspaceRepository.createWorkspaceWithOwner(
      userId,
      {
        name: input.name,
        slug: input.slug,
      },
    );

    await logAuditEvent({
      workspaceId: workspace.id,
      userId,
      action: "workspace:created",
      entityType: "workspace",
      entityId: workspace.id,
      details: { name: workspace.name, slug: workspace.slug },
    });

    return this.getWorkspaceById(workspace.id, userId);
  }

  static async updateWorkspace(
    workspaceId: string,
    userId: string,
    input: UpdateWorkspaceInput,
  ) {
    const updated = await WorkspaceRepository.updateWorkspace(
      workspaceId,
      input,
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "workspace:updated",
      entityType: "workspace",
      entityId: workspaceId,
      details: input,
    });

    return updated;
  }

  static async deleteWorkspace(workspaceId: string, userId: string) {
    const archived = await WorkspaceRepository.archiveWorkspace(workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "workspace:deleted",
      entityType: "workspace",
      entityId: workspaceId,
      details: { status: "ARCHIVED" },
    });

    return { success: true, workspace: archived };
  }
}
