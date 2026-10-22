import type { FastifyPluginAsync } from "fastify";
import { PERMISSION_CODES } from "@tripchange/shared";

import { RoleService } from "./role.service.js";
import { tenancy } from "../../middleware/tenancy.js";
import { authenticate } from "../../middleware/auth.js";
import { WorkspaceService } from "./workspace.service.js";
import { inviteMemberSchema } from './workspace.schemas.js';
import { createWorkspaceSchema } from './workspace.schemas.js';
import { updateWorkspaceSchema } from './workspace.schemas.js';
import { updateMemberRoleSchema } from './workspace.schemas.js';
import { requirePermission } from "../../middleware/permission.js";
import { createRoleSchema, updateRoleSchema } from './workspace.schemas.js';

export const workspaceRoutes: FastifyPluginAsync = async (fastify) => {
  // All workspace routes require an authenticated user
  fastify.addHook("preHandler", authenticate);

  // List all workspaces for current user
  fastify.get("/", async (request, reply) => {
    const workspaces = await WorkspaceService.listUserWorkspaces(
      request.user!.id,
    );
    return reply.send({ success: true, data: workspaces });
  });

  // Create a new workspace
  fastify.post("/", async (request, reply) => {
    const input = createWorkspaceSchema.parse(request.body);
    const workspace = await WorkspaceService.createWorkspace(
      request.user!.id,
      input,
    );
    return reply.status(201).send({ success: true, data: workspace });
  });

  // Get specific workspace info
  fastify.get(
    "/:workspaceId",
    { preHandler: [tenancy] },
    async (request, reply) => {
      const workspace = await WorkspaceService.getWorkspaceById(
        request.tenant.workspaceId,
        request.user!.id,
      );
      return reply.send({ success: true, data: workspace });
    },
  );

  // Update workspace
  fastify.patch(
    "/:workspaceId",
    {
      preHandler: [
        tenancy,
        requirePermission(PERMISSION_CODES.WORKSPACE_UPDATE),
      ],
    },
    async (request, reply) => {
      const input = updateWorkspaceSchema.parse(request.body);
      const updated = await WorkspaceService.updateWorkspace(
        request.tenant.workspaceId,
        request.user!.id,
        input,
      );
      return reply.send({ success: true, data: updated });
    },
  );

  // Archive / Delete workspace
  fastify.delete(
    "/:workspaceId",
    {
      preHandler: [
        tenancy,
        requirePermission(PERMISSION_CODES.WORKSPACE_DELETE),
      ],
    },
    async (request, reply) => {
      const res = await WorkspaceService.deleteWorkspace(
        request.tenant.workspaceId,
        request.user!.id,
      );
      return reply.send(res);
    },
  );

  // =================== MEMBERS ===================
  // List members
  fastify.get(
    "/:workspaceId/members",
    { preHandler: [tenancy] },
    async (request, reply) => {
      const members = await WorkspaceService.listMembers(
        request.tenant.workspaceId,
      );
      return reply.send({ success: true, data: members });
    },
  );

  // Invite member
  fastify.post(
    "/:workspaceId/members",
    {
      preHandler: [tenancy, requirePermission(PERMISSION_CODES.MEMBER_INVITE)],
    },
    async (request, reply) => {
      const input = inviteMemberSchema.parse(request.body);
      const member = await WorkspaceService.inviteMember(
        request.tenant.workspaceId,
        request.user!.id,
        input,
      );
      return reply.status(201).send({ success: true, data: member });
    },
  );

  // Update member role
  fastify.patch(
    "/:workspaceId/members/:memberId",
    {
      preHandler: [tenancy, requirePermission(PERMISSION_CODES.MEMBER_UPDATE)],
    },
    async (request, reply) => {
      const { memberId } = request.params as { memberId: string };
      const input = updateMemberRoleSchema.parse(request.body);
      const updated = await WorkspaceService.updateMemberRole(
        request.tenant.workspaceId,
        memberId,
        request.user!.id,
        input,
      );
      return reply.send({ success: true, data: updated });
    },
  );

  // Remove member
  fastify.delete(
    "/:workspaceId/members/:memberId",
    {
      preHandler: [tenancy, requirePermission(PERMISSION_CODES.MEMBER_REMOVE)],
    },
    async (request, reply) => {
      const { memberId } = request.params as { memberId: string };
      const res = await WorkspaceService.removeMember(
        request.tenant.workspaceId,
        memberId,
        request.user!.id,
      );
      return reply.send(res);
    },
  );

  // =================== ROLES ===================
  // List all permissions available
  fastify.get(
    "/:workspaceId/permissions",
    { preHandler: [tenancy, requirePermission(PERMISSION_CODES.ROLE_READ)] },
    async (_request, reply) => {
      const permissions = await RoleService.listAllPermissions();
      return reply.send({ success: true, data: permissions });
    },
  );

  // List roles in workspace
  fastify.get(
    "/:workspaceId/roles",
    { preHandler: [tenancy, requirePermission(PERMISSION_CODES.ROLE_READ)] },
    async (request, reply) => {
      const roles = await RoleService.listRoles(request.tenant.workspaceId);
      return reply.send({ success: true, data: roles });
    },
  );

  // Create role
  fastify.post(
    "/:workspaceId/roles",
    { preHandler: [tenancy, requirePermission(PERMISSION_CODES.ROLE_CREATE)] },
    async (request, reply) => {
      const input = createRoleSchema.parse(request.body);
      const role = await RoleService.createRole(
        request.tenant.workspaceId,
        request.user!.id,
        input,
      );
      return reply.status(201).send({ success: true, data: role });
    },
  );

  // Update role
  fastify.patch(
    "/:workspaceId/roles/:roleId",
    { preHandler: [tenancy, requirePermission(PERMISSION_CODES.ROLE_UPDATE)] },
    async (request, reply) => {
      const { roleId } = request.params as { roleId: string };
      const input = updateRoleSchema.parse(request.body);
      const updated = await RoleService.updateRole(
        request.tenant.workspaceId,
        roleId,
        request.user!.id,
        input,
      );
      return reply.send({ success: true, data: updated });
    },
  );

  // Delete role
  fastify.delete(
    "/:workspaceId/roles/:roleId",
    { preHandler: [tenancy, requirePermission(PERMISSION_CODES.ROLE_DELETE)] },
    async (request, reply) => {
      const { roleId } = request.params as { roleId: string };
      const res = await RoleService.deleteRole(
        request.tenant.workspaceId,
        roleId,
        request.user!.id,
      );
      return reply.send(res);
    },
  );
};
