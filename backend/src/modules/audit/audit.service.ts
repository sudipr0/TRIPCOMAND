import { AuditRepository } from "./audit.repository.js";
import type { QueryAuditLogsInput } from "./audit.schemas.js";
import type { AuditEventDetail } from "@tripchange/shared";

export class AuditService {
  static async queryLogs(
    workspaceId: string,
    filter: QueryAuditLogsInput,
  ): Promise<{
    total: number;
    limit: number;
    offset: number;
    events: AuditEventDetail[];
  }> {
    const { total, events } = await AuditRepository.queryLogs(
      workspaceId,
      filter,
    );

    const formattedEvents: AuditEventDetail[] = events.map((e) => ({
      id: e.id,
      workspaceId: e.workspaceId,
      userId: e.userId,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      details: (e.details ?? {}) as Record<string, unknown>,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      createdAt: e.createdAt.toISOString(),
      user: e.user,
    }));

    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      events: formattedEvents,
    };
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
  }) {
    return AuditRepository.writeLog(data);
  }
}
