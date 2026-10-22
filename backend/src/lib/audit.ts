import { rawPrisma } from "./prisma.js";
import { logger } from "./logger.js";
import { getRequestStore } from "./async-context.js";
import type { Prisma } from "@prisma/client";

export interface AuditLogOptions {
  workspaceId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(options: AuditLogOptions): Promise<void> {
  const store = getRequestStore();
  const workspaceId = options.workspaceId ?? store?.tenant?.workspaceId ?? null;
  const userId = options.userId ?? store?.userId ?? null;

  try {
    await rawPrisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId ?? null,
        details: (options.details ?? {}) as Prisma.InputJsonValue,
        ipAddress: options.ipAddress ?? null,
        userAgent: options.userAgent ?? null,
      },
    });
  } catch (error) {
    logger.error({ err: error, options }, "Failed to record audit event");
  }
}
