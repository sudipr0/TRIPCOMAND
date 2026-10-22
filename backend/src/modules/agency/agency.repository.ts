import type { Prisma } from "@prisma/client";

import { rawPrisma } from "../../lib/prisma.js";

export class AgencyRepository {
  /**
   * The agency profile is the workspace record itself.
   * Every query filters by workspaceId to enforce tenancy.
   */
  static async findById(
    workspaceId: string,
  ): Promise<Prisma.WorkspaceGetPayload<object> | null> {
    return rawPrisma.workspace.findFirst({
      where: { id: workspaceId },
    });
  }

  static async update(
    workspaceId: string,
    data: Prisma.WorkspaceUpdateInput,
  ): Promise<Prisma.WorkspaceGetPayload<object>> {
    // Guard tenancy by asserting existence within workspace first.
    const existing = await rawPrisma.workspace.findFirst({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error("Workspace not found in workspace");
    }

    return rawPrisma.workspace.update({
      where: { id: workspaceId },
      data,
    });
  }
}
