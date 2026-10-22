import { prisma, type Prisma } from "@tripchange/database";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import type {
  CreateRoleInput,
  UpdateRoleInput,
  RoleDetail,
} from "@tripchange/shared";

export class RoleService {
  static async listRoles(workspaceId: string): Promise<RoleDetail[]> {
    const roles = await prisma.role.findMany({
      where: { workspaceId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return roles.map((role) => ({
      id: role.id,
      workspaceId: role.workspaceId,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code as any,
        description: rp.permission.description,
        category: rp.permission.category,
      })),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    }));
  }

  static async listAllPermissions() {
    return prisma.permission.findMany({
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });
  }

  static async createRole(
    workspaceId: string,
    userId: string,
    input: CreateRoleInput,
  ) {
    const existing = await prisma.role.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw AppError.conflict(
        `Role with name "${input.name}" already exists in this workspace`,
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          workspaceId,
          name: input.name,
          description: input.description,
          isSystem: false,
        },
      });

      if (input.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: input.permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }

      return role;
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
  ) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, workspaceId },
    });

    if (!role) {
      throw AppError.notFound("Role not found");
    }

    if (role.isSystem) {
      throw AppError.forbidden("System roles cannot be modified");
    }

    await prisma.$transaction(async (tx) => {
      if (input.name || input.description !== undefined) {
        await tx.role.update({
          where: { id: roleId },
          data: {
            name: input.name ?? role.name,
            description: input.description ?? role.description,
          },
        });
      }

      if (input.permissionIds) {
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        if (input.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: input.permissionIds.map((permissionId) => ({
              roleId,
              permissionId,
            })),
          });
        }
      }
    });

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
    const role = await prisma.role.findFirst({
      where: { id: roleId, workspaceId },
      include: { _count: { select: { memberships: true } } },
    });

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

    await prisma.role.delete({
      where: { id: roleId },
    });

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
    const role = await prisma.role.findFirst({
      where: { id: roleId, workspaceId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

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
        code: rp.permission.code as any,
        description: rp.permission.description,
        category: rp.permission.category,
      })),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }
}
