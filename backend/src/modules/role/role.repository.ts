import { rawPrisma } from "../../lib/prisma.js";
import type { Role, Permission } from "@prisma/client";

export class RoleRepository {
  static async listRoles(workspaceId: string) {
    return rawPrisma.role.findMany({
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
  }

  static async findById(id: string, workspaceId: string) {
    return rawPrisma.role.findFirst({
      where: { id, workspaceId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { memberships: true },
        },
      },
    });
  }

  static async findByName(
    name: string,
    workspaceId: string,
  ): Promise<Role | null> {
    return rawPrisma.role.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
    });
  }

  static async listAllPermissions(): Promise<Permission[]> {
    return rawPrisma.permission.findMany({
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });
  }

  static async createRole(
    workspaceId: string,
    data: { name: string; description?: string; permissionIds: string[] },
  ): Promise<Role> {
    return rawPrisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          workspaceId,
          name: data.name,
          description: data.description,
          isSystem: false,
        },
      });

      if (data.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: data.permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }

      return role;
    });
  }

  static async updateRole(
    id: string,
    workspaceId: string,
    data: { name?: string; description?: string; permissionIds?: string[] },
  ): Promise<Role> {
    return rawPrisma.$transaction(async (tx) => {
      if (data.name || data.description !== undefined) {
        await tx.role.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
          },
        });
      }

      if (data.permissionIds) {
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        if (data.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: data.permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
          });
        }
      }

      return tx.role.findUniqueOrThrow({ where: { id } });
    });
  }

  static async deleteRole(id: string): Promise<Role> {
    return rawPrisma.role.delete({
      where: { id },
    });
  }
}
