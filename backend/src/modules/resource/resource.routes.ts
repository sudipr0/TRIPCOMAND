import type { FastifyPluginAsync } from "fastify";
import { ResourceService } from "./resource.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@tripchange/shared";
import {
  createResourceSchema,
  updateResourceSchema,
  listResourcesQuerySchema,
} from "./resource.schemas.js";

export const resourceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List resources
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: Record<string, unknown>;
  }>(
    "/:workspaceId/resources",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.RESOURCE_READ),
        validateQuery(listResourcesQuerySchema),
      ],
    },
    async (request) => {
      const result = await ResourceService.listResources(
        request.tenant.workspaceId,
        request.query as never,
      );
      return { success: true, data: result };
    },
  );

  // Create resource
  fastify.post<{
    Params: { workspaceId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/resources",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.RESOURCE_CREATE),
        validateBody(createResourceSchema),
      ],
    },
    async (request, reply) => {
      const resource = await ResourceService.createResource(
        request.tenant.workspaceId,
        request.user!.id,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: resource });
    },
  );

  // Get resource
  fastify.get<{
    Params: { workspaceId: string; resourceId: string };
  }>(
    "/:workspaceId/resources/:resourceId",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.RESOURCE_READ)],
    },
    async (request) => {
      const resource = await ResourceService.getResource(
        request.tenant.workspaceId,
        request.params.resourceId,
      );
      return { success: true, data: resource };
    },
  );

  // Update resource
  fastify.patch<{
    Params: { workspaceId: string; resourceId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/resources/:resourceId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.RESOURCE_UPDATE),
        validateBody(updateResourceSchema),
      ],
    },
    async (request) => {
      const resource = await ResourceService.updateResource(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.resourceId,
        request.body as never,
      );
      return { success: true, data: resource };
    },
  );

  // Delete resource (soft delete)
  fastify.delete<{
    Params: { workspaceId: string; resourceId: string };
  }>(
    "/:workspaceId/resources/:resourceId",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.RESOURCE_UPDATE)],
    },
    async (request) => {
      const result = await ResourceService.deleteResource(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.resourceId,
      );
      return { success: true, data: result };
    },
  );
};
