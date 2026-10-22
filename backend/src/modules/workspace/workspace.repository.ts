import type { Workspace, Prisma } from '@prisma/client';

import { rawPrisma } from '../../lib/prisma.js';
import { createSystemRolesForWorkspace } from '../../lib/system-roles.js';

export class WorkspaceRepository {
  static async findById(id: string): Promise<Workspace | null> {
    return rawPrisma.workspace.findUnique({
      where: { id },
    });
  }

  static async findBySlug(slug: string): Promise<Workspace | null> {
    return rawPrisma.workspace.findUnique({
      where: { slug },
    });
  }

  static async listUserWorkspaces(userId: string) {
    return rawPrisma.membership.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        workspace: {
          status: { not: 'ARCHIVED' },
        },
      },
      include: {
        workspace: true,
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getWorkspaceDetailsForUser(workspaceId: string, userId: string) {
    return rawPrisma.membership.findFirst({
      where: {
        workspaceId,
        userId,
        status: 'ACTIVE',
      },
      include: {
        workspace: true,
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  static async createWorkspaceWithOwner(userId: string, data: { name: string; slug: string }): Promise<Workspace> {
    return rawPrisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: data.name,
          slug: data.slug,
          status: 'ACTIVE',
        },
      });

      await createSystemRolesForWorkspace(workspace.id, tx as any);

      const ownerRole = await tx.role.findUniqueOrThrow({
        where: {
          workspaceId_name: {
            workspaceId: workspace.id,
            name: 'Owner',
          },
        },
      });

      await tx.membership.create({
        data: {
          workspaceId: workspace.id,
          userId,
          roleId: ownerRole.id,
          status: 'ACTIVE',
        },
      });

      return workspace;
    });
  }

  static async updateWorkspace(
    id: string,
    data: { name?: string; settings?: Record<string, unknown> }
  ): Promise<Workspace> {
    return rawPrisma.workspace.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.settings ? { settings: data.settings as Prisma.InputJsonValue } : {}),
      },
    });
  }

  static async archiveWorkspace(id: string): Promise<Workspace> {
    return rawPrisma.workspace.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }
}
