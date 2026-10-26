import type { FastifyPluginAsync } from "fastify";
import { PERMISSION_CODES, type FinanceSummaryQuery } from "@trailcomand/shared";

import { FinanceService } from "./finance.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validation.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { financeSummaryQuerySchema } from "./finance.schemas.js";
import { permissionMiddleware } from "../../middleware/permission.js";

interface TripParams {
  workspaceId: string;
  tripId: string;
}

export const financeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // Trip profitability: revenue from the booking, costs from suppliers, staff and recovery.
  fastify.get<{ Params: TripParams }>(
    "/:workspaceId/finance/trips/:tripId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.FINANCE_READ)] },
    async (request) => {
      const financials = await FinanceService.calculateTripFinancials(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data: financials };
    },
  );

  // Agency-wide roll-up plus a per-trip profitability table.
  fastify.get<{ Params: { workspaceId: string }; Querystring: Record<string, unknown> }>(
    "/:workspaceId/finance/summary",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.FINANCE_READ),
        validateQuery(financeSummaryQuerySchema),
      ],
    },
    async (request) => {
      const query = request.query as FinanceSummaryQuery;
      const summary = await FinanceService.getWorkspaceFinancialSummary(
        request.tenant.workspaceId,
        { includeEmpty: query.includeEmpty === true },
      );
      return { success: true, data: summary };
    },
  );
};
