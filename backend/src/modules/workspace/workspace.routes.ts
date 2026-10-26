import type { FastifyPluginAsync } from "fastify";
import { WorkspaceService } from "./workspace.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@trailcomand/shared";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
} from "./workspace.schemas.js";

export const workspaceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);

  // List all accessible workspaces for authenticated user
  fastify.get("/", async (request, reply) => {
    const workspaces = await WorkspaceService.listUserWorkspaces(
      request.user!.id,
    );
    return reply.send({ success: true, data: workspaces });
  });

  // Create new workspace
  fastify.post<{ Body: CreateWorkspaceInput }>(
    "/",
    { preHandler: [validateBody(createWorkspaceSchema)] },
    async (request, reply) => {
      const workspace = await WorkspaceService.createWorkspace(
        request.user!.id,
        request.body,
      );
      return reply.status(201).send({ success: true, data: workspace });
    },
  );

  // Get current or specified workspace
  fastify.get(
    "/:workspaceId",
    { preHandler: [tenancyMiddleware] },
    async (request, reply) => {
      const workspace = await WorkspaceService.getWorkspaceById(
        request.tenant.workspaceId,
        request.user!.id,
      );
      return reply.send({ success: true, data: workspace });
    },
  );

  // Update workspace
  fastify.patch<{ Body: UpdateWorkspaceInput }>(
    "/:workspaceId",
    {
      preHandler: [
        tenancyMiddleware,
        permissionMiddleware(PERMISSION_CODES.WORKSPACE_UPDATE),
        validateBody(updateWorkspaceSchema),
      ],
    },
    async (request, reply) => {
      const updated = await WorkspaceService.updateWorkspace(
        request.tenant.workspaceId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: updated });
    },
  );

  // Archive workspace
  fastify.delete(
    "/:workspaceId",
    {
      preHandler: [
        tenancyMiddleware,
        permissionMiddleware(PERMISSION_CODES.WORKSPACE_DELETE),
      ],
    },
    async (request, reply) => {
      const result = await WorkspaceService.deleteWorkspace(
        request.tenant.workspaceId,
        request.user!.id,
      );
      return reply.send(result);
    },
  );
};
