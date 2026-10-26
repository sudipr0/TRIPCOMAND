import { RoleRepository } from "./role.repository.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import type {
  CreateRoleInput,
  UpdateRoleInput,
  RoleDetail,
  PermissionCode,
} from "@trailcomand/shared";

export class RoleService {
  static async listRoles(workspaceId: string): Promise<RoleDetail[]> {
    const roles = await RoleRepository.listRoles(workspaceId);

    return roles.map((role) => ({
      id: role.id,
      workspaceId: role.workspaceId,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code as PermissionCode,
        description: rp.permission.description,
        category: rp.permission.category,
      })),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    }));
  }

  static async listAllPermissions() {
    return RoleRepository.listAllPermissions();
  }

  static async createRole(
    workspaceId: string,
    userId: string,
    input: CreateRoleInput,
  ): Promise<RoleDetail> {
    const existing = await RoleRepository.findByName(input.name, workspaceId);
    if (existing) {
      throw AppError.conflict(
        `Role with name "${input.name}" already exists in this workspace`,
      );
    }

    const created = await RoleRepository.createRole(workspaceId, {
      name: input.name,
      description: input.description,
      permissionIds: input.permissionIds,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "role:created",
      entityType: "role",
      entityId: created.id,
      details: {
        name: created.name,
        permissionCount: input.permissionIds.length,
      },
    });

    return this.getRoleById(workspaceId, created.id);
  }

  static async updateRole(
    workspaceId: string,
    roleId: string,
    userId: string,
    input: UpdateRoleInput,
  ): Promise<RoleDetail> {
    const role = await RoleRepository.findById(roleId, workspaceId);
    if (!role) {
      throw AppError.notFound("Role not found");
    }

    if (role.isSystem) {
      throw AppError.forbidden("System roles cannot be modified");
    }

    await RoleRepository.updateRole(roleId, workspaceId, input);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "role:updated",
      entityType: "role",
      entityId: roleId,
      details: { changes: input },
    });

    return this.getRoleById(workspaceId, roleId);
  }

  static async deleteRole(workspaceId: string, roleId: string, userId: string) {
    const role = await RoleRepository.findById(roleId, workspaceId);
    if (!role) {
      throw AppError.notFound("Role not found");
    }

    if (role.isSystem) {
      throw AppError.forbidden("System roles cannot be deleted");
    }

    if (role._count.memberships > 0) {
      throw AppError.badRequest(
        `Cannot delete role because it is currently assigned to ${role._count.memberships} member(s)`,
      );
    }

    await RoleRepository.deleteRole(roleId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "role:deleted",
      entityType: "role",
      entityId: roleId,
      details: { name: role.name },
    });

    return { success: true };
  }

  static async getRoleById(
    workspaceId: string,
    roleId: string,
  ): Promise<RoleDetail> {
    const role = await RoleRepository.findById(roleId, workspaceId);
    if (!role) {
      throw AppError.notFound("Role not found");
    }

    return {
      id: role.id,
      workspaceId: role.workspaceId,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code as PermissionCode,
        description: rp.permission.description,
        category: rp.permission.category,
      })),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }
}
