import type { FastifyPluginAsync } from "fastify";
import { MembershipService } from "./membership.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@tripchange/shared";
import {
  inviteMemberSchema,
  updateMemberRoleSchema,
  acceptInviteSchema,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
  type AcceptInviteInput,
} from "./membership.schemas.js";

export const membershipRoutes: FastifyPluginAsync = async (fastify) => {
  // Public route: Accept an invitation
  fastify.post<{ Params: { membershipId: string }; Body: AcceptInviteInput }>(
    "/accept-invitation/:membershipId",
    { preHandler: [validateBody(acceptInviteSchema)] },
    async (request, reply) => {
      const { membershipId } = request.params;
      const result = await MembershipService.acceptInvite(
        membershipId,
        request.body,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // Protected workspace-scoped membership routes
  fastify.register(async (scoped) => {
    scoped.addHook("preHandler", authMiddleware);
    scoped.addHook("preHandler", tenancyMiddleware);

    // List workspace members
    scoped.get("/:workspaceId/members", async (request, reply) => {
      const members = await MembershipService.listMembers(
        request.tenant.workspaceId,
      );
      return reply.send({ success: true, data: members });
    });

    // Invite member
    scoped.post<{ Params: { workspaceId: string }; Body: InviteMemberInput }>(
      "/:workspaceId/members",
      {
        preHandler: [
          permissionMiddleware(PERMISSION_CODES.MEMBER_INVITE),
          validateBody(inviteMemberSchema),
        ],
      },
      async (request, reply) => {
        const member = await MembershipService.inviteMember(
          request.tenant.workspaceId,
          request.user!.id,
          request.body,
        );
        return reply.status(201).send({ success: true, data: member });
      },
    );

    // Update member role
    scoped.patch<{
      Params: { workspaceId: string; memberId: string };
      Body: UpdateMemberRoleInput;
    }>(
      "/:workspaceId/members/:memberId",
      {
        preHandler: [
          permissionMiddleware(PERMISSION_CODES.MEMBER_UPDATE),
          validateBody(updateMemberRoleSchema),
        ],
      },
      async (request, reply) => {
        const { memberId } = request.params;
        const updated = await MembershipService.updateMemberRole(
          request.tenant.workspaceId,
          memberId,
          request.user!.id,
          request.body,
        );
        return reply.send({ success: true, data: updated });
      },
    );

    // Remove member
    scoped.delete<{ Params: { workspaceId: string; memberId: string } }>(
      "/:workspaceId/members/:memberId",
      { preHandler: [permissionMiddleware(PERMISSION_CODES.MEMBER_REMOVE)] },
      async (request, reply) => {
        const { memberId } = request.params;
        const result = await MembershipService.removeMember(
          request.tenant.workspaceId,
          memberId,
          request.user!.id,
        );
        return reply.send(result);
      },
    );
  });
};
