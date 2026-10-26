import type { FastifyPluginAsync } from "fastify";
import { TrekTemplateService } from "./trek-template.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@trailcomand/shared";
import {
  createTrekTemplateSchema,
  updateTrekTemplateSchema,
  listTrekTemplatesQuerySchema,
  createTrekTemplateDaySchema,
  updateTrekTemplateDaySchema,
  reorderTrekTemplateDaysSchema,
  type CreateTrekTemplateInput,
  type UpdateTrekTemplateInput,
  type ListTrekTemplatesQuery,
  type CreateTrekTemplateDayInput,
  type UpdateTrekTemplateDayInput,
  type ReorderTrekTemplateDaysInput,
} from "./trek-template.schemas.js";

export const trekTemplateRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List trek templates in workspace
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: ListTrekTemplatesQuery;
  }>(
    "/:workspaceId/trek-templates",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TEMPLATE_READ),
        validateQuery(listTrekTemplatesQuerySchema),
      ],
    },
    async (request, reply) => {
      const result = await TrekTemplateService.listTemplates(
        request.tenant.workspaceId,
        request.query,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // Get a single trek template
  fastify.get<{ Params: { workspaceId: string; templateId: string } }>(
    "/:workspaceId/trek-templates/:templateId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TEMPLATE_READ)] },
    async (request, reply) => {
      const template = await TrekTemplateService.getTemplate(
        request.tenant.workspaceId,
        request.params.templateId,
      );
      return reply.send({ success: true, data: template });
    },
  );

  // Create trek template
  fastify.post<{
    Params: { workspaceId: string };
    Body: CreateTrekTemplateInput;
  }>(
    "/:workspaceId/trek-templates",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TEMPLATE_CREATE),
        validateBody(createTrekTemplateSchema),
      ],
    },
    async (request, reply) => {
      const template = await TrekTemplateService.createTemplate(
        request.tenant.workspaceId,
        request.user!.id,
        request.body,
      );
      return reply.status(201).send({ success: true, data: template });
    },
  );

  // Update trek template
  fastify.patch<{
    Params: { workspaceId: string; templateId: string };
    Body: UpdateTrekTemplateInput;
  }>(
    "/:workspaceId/trek-templates/:templateId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TEMPLATE_UPDATE),
        validateBody(updateTrekTemplateSchema),
      ],
    },
    async (request, reply) => {
      const updated = await TrekTemplateService.updateTemplate(
        request.tenant.workspaceId,
        request.params.templateId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: updated });
    },
  );

  // Duplicate trek template
  fastify.post<{
    Params: { workspaceId: string; templateId: string };
    Body: { name?: string };
  }>(
    "/:workspaceId/trek-templates/:templateId/duplicate",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TEMPLATE_CREATE)] },
    async (request, reply) => {
      const source = await TrekTemplateService.getTemplate(
        request.tenant.workspaceId,
        request.params.templateId,
      );
      const newName = request.body?.name ?? `${source.name} (Copy)`;

      const duplicated = await TrekTemplateService.duplicateTemplate(
        request.tenant.workspaceId,
        request.params.templateId,
        request.user!.id,
        newName,
      );
      return reply.status(201).send({ success: true, data: duplicated });
    },
  );

  // Soft delete trek template
  fastify.delete<{ Params: { workspaceId: string; templateId: string } }>(
    "/:workspaceId/trek-templates/:templateId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TEMPLATE_DELETE)] },
    async (request, reply) => {
      const result = await TrekTemplateService.deleteTemplate(
        request.tenant.workspaceId,
        request.params.templateId,
        request.user!.id,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // List days for a template
  fastify.get<{ Params: { workspaceId: string; templateId: string } }>(
    "/:workspaceId/trek-templates/:templateId/days",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TEMPLATE_READ)] },
    async (request, reply) => {
      const days = await TrekTemplateService.listDays(
        request.tenant.workspaceId,
        request.params.templateId,
      );
      return reply.send({ success: true, data: days });
    },
  );

  // Reorder days within a template
  fastify.post<{
    Params: { workspaceId: string; templateId: string };
    Body: ReorderTrekTemplateDaysInput;
  }>(
    "/:workspaceId/trek-templates/:templateId/days/reorder",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TEMPLATE_UPDATE),
        validateBody(reorderTrekTemplateDaysSchema),
      ],
    },
    async (request, reply) => {
      const days = await TrekTemplateService.reorderDays(
        request.tenant.workspaceId,
        request.params.templateId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: days });
    },
  );

  // Add a day to a template
  fastify.post<{
    Params: { workspaceId: string; templateId: string };
    Body: CreateTrekTemplateDayInput;
  }>(
    "/:workspaceId/trek-templates/:templateId/days",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TEMPLATE_UPDATE),
        validateBody(createTrekTemplateDaySchema),
      ],
    },
    async (request, reply) => {
      const day = await TrekTemplateService.addDay(
        request.tenant.workspaceId,
        request.params.templateId,
        request.user!.id,
        request.body,
      );
      return reply.status(201).send({ success: true, data: day });
    },
  );

  // Update a day
  fastify.patch<{
    Params: { workspaceId: string; templateId: string; dayId: string };
    Body: UpdateTrekTemplateDayInput;
  }>(
    "/:workspaceId/trek-templates/:templateId/days/:dayId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TEMPLATE_UPDATE),
        validateBody(updateTrekTemplateDaySchema),
      ],
    },
    async (request, reply) => {
      const day = await TrekTemplateService.updateDay(
        request.tenant.workspaceId,
        request.params.dayId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: day });
    },
  );

  // Delete a day
  fastify.delete<{
    Params: { workspaceId: string; templateId: string; dayId: string };
  }>(
    "/:workspaceId/trek-templates/:templateId/days/:dayId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TEMPLATE_UPDATE)] },
    async (request, reply) => {
      const result = await TrekTemplateService.deleteDay(
        request.tenant.workspaceId,
        request.params.dayId,
        request.user!.id,
      );
      return reply.send({ success: true, data: result });
    },
  );
};
