import type { FastifyPluginAsync } from "fastify";
import { prisma, type Prisma } from "@tripchange/database";
import { authenticate } from "../../middleware/auth.js";
import { tenancy } from "../../middleware/tenancy.js";
import { requirePermission } from "../../middleware/permission.js";
import { PERMISSION_CODES, type AuditEventDetail } from "@tripchange/shared";

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);
  fastify.addHook("preHandler", tenancy);
  fastify.addHook("preHandler", requirePermission(PERMISSION_CODES.AUDIT_READ));

  fastify.get("/:workspaceId/audit-logs", async (request, reply) => {
    const query = request.query as {
      limit?: string;
      offset?: string;
      action?: string;
      entityType?: string;
    };

    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
    const offset = Math.max(Number(query.offset) || 0, 0);

    const where: Prisma.AuditEventWhereInput = {
      workspaceId: request.tenant.workspaceId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };

    const [total, events] = await Promise.all([
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.findMany({
        where,
        take: limit,
        skip: offset,
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

    return reply.send({
      success: true,
      data: {
        total,
        limit,
        offset,
        events: formattedEvents,
      },
    });
  });
};
