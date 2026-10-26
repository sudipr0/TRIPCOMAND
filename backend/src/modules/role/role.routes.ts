import type { FastifyPluginAsync } from "fastify";
import { RoleService } from "./role.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@trailcomand/shared";
import {
  createRoleSchema,
  updateRoleSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
} from "./role.schemas.js";

export const roleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List all available system permissions
  fastify.get(
    "/:workspaceId/permissions",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.ROLE_READ)] },
    async (_request, reply) => {
      const permissions = await RoleService.listAllPermissions();
      return reply.send({ success: true, data: permissions });
    },
  );

  // List roles in workspace
  fastify.get(
    "/:workspaceId/roles",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.ROLE_READ)] },
    async (request, reply) => {
      const roles = await RoleService.listRoles(request.tenant.workspaceId);
      return reply.send({ success: true, data: roles });
    },
  );

  // Create role
  fastify.post<{ Params: { workspaceId: string }; Body: CreateRoleInput }>(
    "/:workspaceId/roles",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.ROLE_CREATE),
        validateBody(createRoleSchema),
      ],
    },
    async (request, reply) => {
      const role = await RoleService.createRole(
        request.tenant.workspaceId,
        request.user!.id,
        request.body,
      );
      return reply.status(201).send({ success: true, data: role });
    },
  );

  // Update role
  fastify.patch<{
    Params: { workspaceId: string; roleId: string };
    Body: UpdateRoleInput;
  }>(
    "/:workspaceId/roles/:roleId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.ROLE_UPDATE),
        validateBody(updateRoleSchema),
      ],
    },
    async (request, reply) => {
      const { roleId } = request.params;
      const updated = await RoleService.updateRole(
        request.tenant.workspaceId,
        roleId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: updated });
    },
  );

  // Delete role
  fastify.delete<{ Params: { workspaceId: string; roleId: string } }>(
    "/:workspaceId/roles/:roleId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.ROLE_DELETE)] },
    async (request, reply) => {
      const { roleId } = request.params;
      const result = await RoleService.deleteRole(
        request.tenant.workspaceId,
        roleId,
        request.user!.id,
      );
      return reply.send(result);
    },
  );
};
