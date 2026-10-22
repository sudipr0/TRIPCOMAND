import type { FastifyPluginAsync } from "fastify";
import { SupplierService } from "./supplier.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@tripchange/shared";
import {
  createSupplierSchema,
  updateSupplierSchema,
  listSuppliersQuerySchema,
  createSupplierRateSchema,
  updateSupplierRateSchema,
  listSupplierRatesQuerySchema,
  supplierAlternativesQuerySchema,
} from "./supplier.schemas.js";

export const supplierRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List suppliers
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: Record<string, unknown>;
  }>(
    "/:workspaceId/suppliers",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_READ),
        validateQuery(listSuppliersQuerySchema),
      ],
    },
    async (request) => {
      const result = await SupplierService.listSuppliers(
        request.tenant.workspaceId,
        request.query as never,
      );
      return { success: true, data: result };
    },
  );

  // Create supplier
  fastify.post<{
    Params: { workspaceId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/suppliers",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_CREATE),
        validateBody(createSupplierSchema),
      ],
    },
    async (request, reply) => {
      const supplier = await SupplierService.createSupplier(
        request.tenant.workspaceId,
        request.user!.id,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: supplier });
    },
  );

  // Get supplier
  fastify.get<{
    Params: { workspaceId: string; supplierId: string };
  }>(
    "/:workspaceId/suppliers/:supplierId",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.SUPPLIER_READ)],
    },
    async (request) => {
      const supplier = await SupplierService.getSupplier(
        request.tenant.workspaceId,
        request.params.supplierId,
      );
      return { success: true, data: supplier };
    },
  );

  // Update supplier
  fastify.patch<{
    Params: { workspaceId: string; supplierId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/suppliers/:supplierId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_UPDATE),
        validateBody(updateSupplierSchema),
      ],
    },
    async (request) => {
      const supplier = await SupplierService.updateSupplier(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.supplierId,
        request.body as never,
      );
      return { success: true, data: supplier };
    },
  );

  // Delete supplier (soft delete)
  fastify.delete<{
    Params: { workspaceId: string; supplierId: string };
  }>(
    "/:workspaceId/suppliers/:supplierId",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.SUPPLIER_UPDATE)],
    },
    async (request) => {
      const result = await SupplierService.deleteSupplier(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.supplierId,
      );
      return { success: true, data: result };
    },
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Rates
  // ───────────────────────────────────────────────────────────────────────────

  // List supplier rates
  fastify.get<{
    Params: { workspaceId: string; supplierId: string };
    Querystring: Record<string, unknown>;
  }>(
    "/:workspaceId/suppliers/:supplierId/rates",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_READ),
        validateQuery(listSupplierRatesQuerySchema),
      ],
    },
    async (request) => {
      const result = await SupplierService.listRates(
        request.tenant.workspaceId,
        request.params.supplierId,
        request.query as never,
      );
      return { success: true, data: result };
    },
  );

  // Create rate
  fastify.post<{
    Params: { workspaceId: string; supplierId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/suppliers/:supplierId/rates",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_UPDATE),
        validateBody(createSupplierRateSchema),
      ],
    },
    async (request, reply) => {
      const rate = await SupplierService.createRate(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.supplierId,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: rate });
    },
  );

  // Update rate
  fastify.patch<{
    Params: { workspaceId: string; supplierId: string; rateId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/suppliers/:supplierId/rates/:rateId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_UPDATE),
        validateBody(updateSupplierRateSchema),
      ],
    },
    async (request) => {
      const rate = await SupplierService.updateRate(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.supplierId,
        request.params.rateId,
        request.body as never,
      );
      return { success: true, data: rate };
    },
  );

  // Delete rate
  fastify.delete<{
    Params: { workspaceId: string; supplierId: string; rateId: string };
  }>(
    "/:workspaceId/suppliers/:supplierId/rates/:rateId",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.SUPPLIER_UPDATE)],
    },
    async (request) => {
      const result = await SupplierService.deleteRate(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.supplierId,
        request.params.rateId,
      );
      return { success: true, data: result };
    },
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Alternatives & Active bookings check
  // ───────────────────────────────────────────────────────────────────────────

  // Get alternatives for a supplier
  fastify.get<{
    Params: { workspaceId: string; supplierId: string };
    Querystring: Record<string, unknown>;
  }>(
    "/:workspaceId/suppliers/:supplierId/alternatives",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_READ),
        validateQuery(supplierAlternativesQuerySchema),
      ],
    },
    async (request) => {
      const alternatives = await SupplierService.findAlternatives(
        request.tenant.workspaceId,
        request.params.supplierId,
        request.query as never,
      );
      return { success: true, data: alternatives };
    },
  );

  // Check active bookings before delete/warning
  fastify.get<{
    Params: { workspaceId: string; supplierId: string };
  }>(
    "/:workspaceId/suppliers/:supplierId/active-bookings",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.SUPPLIER_READ)],
    },
    async (request) => {
      const result = await SupplierService.checkSupplierBookings(
        request.tenant.workspaceId,
        request.params.supplierId,
      );
      return { success: true, data: result };
    },
  );
};
