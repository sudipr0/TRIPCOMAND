import { rawPrisma } from "../../lib/prisma.js";
import type { Prisma, AuditEvent } from "@prisma/client";
import type { QueryAuditLogsInput } from "./audit.schemas.js";

export class AuditRepository {
  static async queryLogs(workspaceId: string, filter: QueryAuditLogsInput) {
    const where: Prisma.AuditEventWhereInput = {
      workspaceId,
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.entityType ? { entityType: filter.entityType } : {}),
    };

    const [total, events] = await Promise.all([
      rawPrisma.auditEvent.count({ where }),
      rawPrisma.auditEvent.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return { total, events };
  }

  static async writeLog(data: {
    workspaceId?: string | null;
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    details?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<AuditEvent> {
    return rawPrisma.auditEvent.create({
      data: {
        workspaceId: data.workspaceId ?? null,
        userId: data.userId ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        details: (data.details ?? {}) as Prisma.InputJsonValue,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
  }
}
