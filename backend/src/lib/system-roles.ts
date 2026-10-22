import type { PrismaClient } from "@prisma/client";
import {
  ROLE_PERMISSIONS,
  type SystemRoleName,
  type PermissionCode,
} from "@tripchange/shared";

export async function createSystemRolesForWorkspace(
  workspaceId: string,
  tx: PrismaClient,
) {
  const permissions = await tx.permission.findMany();
  const permMap = new Map(permissions.map((p) => [p.code, p.id]));

  for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS) as [
    SystemRoleName,
    PermissionCode[],
  ][]) {
    const role = await tx.role.upsert({
      where: {
        workspaceId_name: {
          workspaceId,
          name: roleName,
        },
      },
      update: {
        isSystem: true,
      },
      create: {
        workspaceId,
        name: roleName,
        description: `System defined ${roleName} role`,
        isSystem: true,
      },
    });

    for (const code of permCodes) {
      const permissionId = permMap.get(code);
      if (permissionId) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId,
          },
        });
      }
    }
  }
}
