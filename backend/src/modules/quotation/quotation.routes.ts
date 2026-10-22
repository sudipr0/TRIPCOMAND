import type { FastifyPluginAsync } from "fastify";
import { QuotationService } from "./quotation.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@tripchange/shared";
import {
  createQuotationSchema,
  updateQuotationSchema,
  listQuotationsQuerySchema,
  sendQuotationSchema,
  acceptQuotationSchema,
  rejectQuotationSchema,
  type CreateQuotationInput,
  type UpdateQuotationInput,
  type ListQuotationsQuery,
  type RejectQuotationInput,
} from "@tripchange/shared";

export const quotationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List quotations in workspace
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: ListQuotationsQuery;
  }>(
    "/:workspaceId/quotations",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.QUOTATION_READ),
        validateQuery(listQuotationsQuerySchema),
      ],
    },
    async (request, reply) => {
      const result = await QuotationService.listQuotations(
        request.tenant.workspaceId,
        request.query,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // Create quotation
  fastify.post<{
    Params: { workspaceId: string };
    Body: CreateQuotationInput;
  }>(
    "/:workspaceId/quotations",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.QUOTATION_CREATE),
        validateBody(createQuotationSchema),
      ],
    },
    async (request, reply) => {
      const quotation = await QuotationService.createQuotation(
        request.tenant.workspaceId,
        request.user!.id,
        request.body,
      );
      return reply.status(201).send({ success: true, data: quotation });
    },
  );

  // Get a single quotation
  fastify.get<{ Params: { workspaceId: string; quotationId: string } }>(
    "/:workspaceId/quotations/:quotationId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.QUOTATION_READ)] },
    async (request, reply) => {
      const quotation = await QuotationService.getQuotation(
        request.tenant.workspaceId,
        request.params.quotationId,
      );
      return reply.send({ success: true, data: quotation });
    },
  );

  // Update quotation (creates a new version snapshot)
  fastify.patch<{
    Params: { workspaceId: string; quotationId: string };
    Body: UpdateQuotationInput;
  }>(
    "/:workspaceId/quotations/:quotationId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.QUOTATION_UPDATE),
        validateBody(updateQuotationSchema),
      ],
    },
    async (request, reply) => {
      const quotation = await QuotationService.updateQuotation(
        request.tenant.workspaceId,
        request.params.quotationId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: quotation });
    },
  );

  // Soft delete quotation
  fastify.delete<{ Params: { workspaceId: string; quotationId: string } }>(
    "/:workspaceId/quotations/:quotationId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.QUOTATION_UPDATE)] },
    async (request, reply) => {
      const result = await QuotationService.deleteQuotation(
        request.tenant.workspaceId,
        request.params.quotationId,
        request.user!.id,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // Send quotation (DRAFT -> SENT)
  fastify.post<{ Params: { workspaceId: string; quotationId: string } }>(
    "/:workspaceId/quotations/:quotationId/send",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.QUOTATION_SEND),
        validateBody(sendQuotationSchema),
      ],
    },
    async (request, reply) => {
      const quotation = await QuotationService.sendQuotation(
        request.tenant.workspaceId,
        request.params.quotationId,
        request.user!.id,
      );
      return reply.send({ success: true, data: quotation });
    },
  );

  // Accept quotation (SENT/VIEWED -> ACCEPTED)
  fastify.post<{ Params: { workspaceId: string; quotationId: string } }>(
    "/:workspaceId/quotations/:quotationId/accept",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.QUOTATION_ACCEPT),
        validateBody(acceptQuotationSchema),
      ],
    },
    async (request, reply) => {
      const quotation = await QuotationService.acceptQuotation(
        request.tenant.workspaceId,
        request.params.quotationId,
        request.user!.id,
      );
      return reply.send({ success: true, data: quotation });
    },
  );

  // Reject quotation (SENT/VIEWED -> REJECTED)
  fastify.post<{
    Params: { workspaceId: string; quotationId: string };
    Body: RejectQuotationInput;
  }>(
    "/:workspaceId/quotations/:quotationId/reject",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.QUOTATION_ACCEPT),
        validateBody(rejectQuotationSchema),
      ],
    },
    async (request, reply) => {
      const quotation = await QuotationService.rejectQuotation(
        request.tenant.workspaceId,
        request.params.quotationId,
        request.user!.id,
        request.body.reason,
      );
      return reply.send({ success: true, data: quotation });
    },
  );

  // Convert accepted quotation to a booking
  fastify.post<{ Params: { workspaceId: string; quotationId: string } }>(
    "/:workspaceId/quotations/:quotationId/convert",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.BOOKING_CREATE)],
    },
    async (request, reply) => {
      const result = await QuotationService.convertToBooking(
        request.tenant.workspaceId,
        request.params.quotationId,
        request.user!.id,
      );
      return reply.status(201).send({ success: true, data: result });
    },
  );
};
