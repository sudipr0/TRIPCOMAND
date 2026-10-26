import type { FastifyPluginAsync } from "fastify";
import { InquiryService } from "./inquiry.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@trailcomand/shared";
import {
  createInquirySchema,
  updateInquirySchema,
  listInquiriesQuerySchema,
  logInquiryActivitySchema,
  type CreateInquiryInput,
  type UpdateInquiryInput,
  type ListInquiriesQuery,
  type LogInquiryActivityInput,
} from "@trailcomand/shared";

export const inquiryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List inquiries in workspace
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: ListInquiriesQuery;
  }>(
    "/:workspaceId/inquiries",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.INQUIRY_READ),
        validateQuery(listInquiriesQuerySchema),
      ],
    },
    async (request, reply) => {
      const result = await InquiryService.listInquiries(
        request.tenant.workspaceId,
        request.query,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // Get a single inquiry (with activity timeline)
  fastify.get<{ Params: { workspaceId: string; inquiryId: string } }>(
    "/:workspaceId/inquiries/:inquiryId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.INQUIRY_READ)] },
    async (request, reply) => {
      const inquiry = await InquiryService.getInquiry(
        request.tenant.workspaceId,
        request.params.inquiryId,
      );
      return reply.send({ success: true, data: inquiry });
    },
  );

  // Create inquiry
  fastify.post<{
    Params: { workspaceId: string };
    Body: CreateInquiryInput;
  }>(
    "/:workspaceId/inquiries",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.INQUIRY_CREATE),
        validateBody(createInquirySchema),
      ],
    },
    async (request, reply) => {
      const inquiry = await InquiryService.createInquiry(
        request.tenant.workspaceId,
        request.user!.id,
        request.body,
      );
      return reply.status(201).send({ success: true, data: inquiry });
    },
  );

  // Update inquiry
  fastify.patch<{
    Params: { workspaceId: string; inquiryId: string };
    Body: UpdateInquiryInput;
  }>(
    "/:workspaceId/inquiries/:inquiryId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.INQUIRY_UPDATE),
        validateBody(updateInquirySchema),
      ],
    },
    async (request, reply) => {
      const updated = await InquiryService.updateInquiry(
        request.tenant.workspaceId,
        request.params.inquiryId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: updated });
    },
  );

  // Soft delete inquiry
  fastify.delete<{ Params: { workspaceId: string; inquiryId: string } }>(
    "/:workspaceId/inquiries/:inquiryId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.INQUIRY_UPDATE)] },
    async (request, reply) => {
      const result = await InquiryService.deleteInquiry(
        request.tenant.workspaceId,
        request.params.inquiryId,
        request.user!.id,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // Log an activity on an inquiry
  fastify.post<{
    Params: { workspaceId: string; inquiryId: string };
    Body: LogInquiryActivityInput;
  }>(
    "/:workspaceId/inquiries/:inquiryId/activities",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.INQUIRY_UPDATE),
        validateBody(logInquiryActivitySchema),
      ],
    },
    async (request, reply) => {
      const activity = await InquiryService.logActivity(
        request.tenant.workspaceId,
        request.params.inquiryId,
        request.user!.id,
        request.body,
      );
      return reply.status(201).send({ success: true, data: activity });
    },
  );

  // List activities for an inquiry
  fastify.get<{ Params: { workspaceId: string; inquiryId: string } }>(
    "/:workspaceId/inquiries/:inquiryId/activities",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.INQUIRY_READ)] },
    async (request, reply) => {
      const activities = await InquiryService.listActivities(
        request.tenant.workspaceId,
        request.params.inquiryId,
      );
      return reply.send({ success: true, data: activities });
    },
  );

  // Convert inquiry (status -> QUOTED, placeholder booking)
  fastify.post<{ Params: { workspaceId: string; inquiryId: string } }>(
    "/:workspaceId/inquiries/:inquiryId/convert",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.INQUIRY_CONVERT)] },
    async (request, reply) => {
      const inquiry = await InquiryService.convertInquiry(
        request.tenant.workspaceId,
        request.params.inquiryId,
        request.user!.id,
      );
      return reply.send({ success: true, data: inquiry });
    },
  );
};
