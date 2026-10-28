import type { FastifyPluginAsync } from "fastify";
import {
  PERMISSION_CODES,
  analyticsExportQuerySchema,
  supplierReliabilityQuerySchema,
  tripProfitabilityQuerySchema,
  type AnalyticsExportQuery,
  type SupplierReliabilityQuery,
  type TripProfitabilityQuery,
} from "@trailcomand/shared";
import { AnalyticsService } from "./analytics.service.js";
import {
  dashboardKpisCsv,
  operationalAnalyticsCsv,
  supplierReliabilityCsv,
  tripProfitabilityCsv,
} from "./analytics.export.js";
import { csvFilename } from "./csv.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateQuery } from "../../middleware/validation.js";

interface WorkspaceParams {
  workspaceId: string;
}

/**
 * Business intelligence for one workspace.
 *
 * Every route runs session auth, then tenancy (which proves the caller is an
 * active member of the workspace named in the URL), then `analytics:read`. The
 * workspace id handed to the service is always `request.tenant.workspaceId`, so a
 * caller cannot widen the scope by editing the URL.
 */
export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);
  fastify.addHook(
    "preHandler",
    permissionMiddleware(PERMISSION_CODES.ANALYTICS_READ),
  );

  fastify.get<{ Params: WorkspaceParams; Querystring: { year?: string } }>(
    "/:workspaceId/analytics/kpis",
    {
      preHandler: [
        validateQuery(analyticsExportQuerySchema.pick({ year: true })),
      ],
    },
    async (request) => {
      const year = request.query.year
        ? Number(request.query.year)
        : AnalyticsService.defaultYear();
      const kpis = await AnalyticsService.dashboardKpis(
        request.tenant.workspaceId,
        year,
      );
      return { success: true, data: kpis };
    },
  );

  fastify.get<{ Params: WorkspaceParams; Querystring: TripProfitabilityQuery }>(
    "/:workspaceId/analytics/trip-profitability",
    { preHandler: [validateQuery(tripProfitabilityQuerySchema)] },
    async (request) => {
      const query = request.query;
      const report = await AnalyticsService.tripProfitability(
        request.tenant.workspaceId,
        {
          year: query.year ?? AnalyticsService.defaultYear(),
          status: query.status,
          sort: query.sort,
          direction: query.direction,
          limit: query.limit,
          offset: query.offset,
        },
      );
      return { success: true, data: report };
    },
  );

  fastify.get<{
    Params: WorkspaceParams;
    Querystring: SupplierReliabilityQuery;
  }>(
    "/:workspaceId/analytics/suppliers",
    { preHandler: [validateQuery(supplierReliabilityQuerySchema)] },
    async (request) => {
      const query = request.query;
      const report = await AnalyticsService.supplierReliability(
        request.tenant.workspaceId,
        {
          year: query.year ?? AnalyticsService.defaultYear(),
          minBookings: query.minBookings,
        },
      );
      return { success: true, data: report };
    },
  );

  fastify.get<{ Params: WorkspaceParams; Querystring: { year?: string } }>(
    "/:workspaceId/analytics/operations",
    {
      preHandler: [
        validateQuery(analyticsExportQuerySchema.pick({ year: true })),
      ],
    },
    async (request) => {
      const year = request.query.year
        ? Number(request.query.year)
        : AnalyticsService.defaultYear();
      const report = await AnalyticsService.operational(
        request.tenant.workspaceId,
        year,
      );
      return { success: true, data: report };
    },
  );

  /**
   * CSV export. Same permission, same tenant scope, same numbers as the screen —
   * the only difference is the encoding. Exports are rate-limited because each
   * one re-runs the full aggregation.
   */
  fastify.get<{ Params: WorkspaceParams; Querystring: AnalyticsExportQuery }>(
    "/:workspaceId/analytics/export",
    {
      preHandler: [validateQuery(analyticsExportQuerySchema)],
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const workspaceId = request.tenant.workspaceId;
      const query = request.query;
      const year = query.year ?? AnalyticsService.defaultYear();

      let file;
      switch (query.report) {
        case "trip-profitability": {
          const report = await AnalyticsService.tripProfitability(workspaceId, {
            year,
            status: query.status,
            sort: "margin",
            direction: "desc",
            limit: 200,
            offset: 0,
          });
          file = tripProfitabilityCsv(report, {
            includeIncomplete: query.includeIncomplete !== false,
          });
          break;
        }
        case "supplier-reliability": {
          const report = await AnalyticsService.supplierReliability(
            workspaceId,
            {
              year,
              minBookings: query.minBookings,
            },
          );
          file = supplierReliabilityCsv(report);
          break;
        }
        case "dashboard-kpis": {
          const kpis = await AnalyticsService.dashboardKpis(workspaceId, year);
          file = dashboardKpisCsv(kpis);
          break;
        }
        case "operational": {
          const report = await AnalyticsService.operational(workspaceId, year);
          file = operationalAnalyticsCsv(report);
          break;
        }
        default: {
          // The zod enum already rejected anything else; this keeps the union total.
          file = null;
        }
      }

      if (!file) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Unsupported export report" },
        });
      }

      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header(
        "Content-Disposition",
        `attachment; filename="${csvFilename(file.filename)}"`,
      );
      reply.header("X-Content-Type-Options", "nosniff");
      reply.header("Cache-Control", "private, no-store");
      return reply.send(file.body);
    },
  );
};
