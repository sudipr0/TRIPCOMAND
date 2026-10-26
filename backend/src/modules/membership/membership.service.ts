import { MembershipRepository } from "./membership.repository.js";
import { WorkspaceRepository } from "../workspace/workspace.repository.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { RoleRepository } from "../role/role.repository.js";
import { PasswordUtil } from "../../lib/password.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import { AuthEmail } from "../auth/auth.email.js";
import type {
  InviteMemberInput,
  UpdateMemberRoleInput,
  MemberDetail,
} from "@trailcomand/shared";
import type { AcceptInviteInput } from "./membership.schemas.js";

export class MembershipService {
  static async listMembers(workspaceId: string): Promise<MemberDetail[]> {
    const members = await MembershipRepository.listMembers(workspaceId);

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      workspaceId: m.workspaceId,
      roleId: m.roleId,
      status: m.status,
      user: {
        id: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        status: m.user.status,
      },
      role: {
        id: m.role.id,
        name: m.role.name,
        isSystem: m.role.isSystem,
      },
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }

  static async inviteMember(
    workspaceId: string,
    inviterUserId: string,
    input: InviteMemberInput,
  ) {
    const workspace = await WorkspaceRepository.findById(workspaceId);
    if (!workspace) throw AppError.notFound("Workspace not found");

    const inviter = await AuthRepository.findUserById(inviterUserId);

    const role = await RoleRepository.findById(input.roleId, workspaceId);
    if (!role) {
      throw AppError.badRequest(
        "Specified role does not exist in this workspace",
      );
    }

    const existingUser = await AuthRepository.findUserByEmail(input.email);
    if (existingUser) {
      const existingMember = await MembershipRepository.findByWorkspaceAndUser(
        workspaceId,
        existingUser.id,
      );
      if (existingMember) {
        throw AppError.conflict("User is already a member of this workspace");
      }
    }

    const { membership, user } = await MembershipRepository.createInvitedMember(
      workspaceId,
      input.roleId,
      input.email,
    );

    await logAuditEvent({
      workspaceId,
      userId: inviterUserId,
      action: "member:invited",
      entityType: "membership",
      entityId: membership.id,
      details: { email: input.email, roleId: role.id, roleName: role.name },
    });

    await AuthEmail.sendMemberInvitationEmail(
      input.email,
      workspace.name,
      `${inviter?.firstName ?? "A colleague"} ${inviter?.lastName ?? ""}`.trim(),
    );

    return { membership, user };
  }

  static async acceptInvite(membershipId: string, input: AcceptInviteInput) {
    const membership = await MembershipRepository.findById(membershipId, "");
    if (!membership || membership.status !== "INVITED") {
      throw AppError.badRequest("Invalid or already accepted invitation");
    }

    const passwordHash = await PasswordUtil.hash(input.password);

    await AuthRepository.updateUser(membership.userId, {
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
      status: "ACTIVE",
    });

    const updatedMembership = await MembershipRepository.updateMemberStatus(
      membership.id,
      "ACTIVE",
    );

    await logAuditEvent({
      workspaceId: membership.workspaceId,
      userId: membership.userId,
      action: "member:accepted_invitation",
      entityType: "membership",
      entityId: membership.id,
    });

    return updatedMembership;
  }

  static async updateMemberRole(
    workspaceId: string,
    targetMembershipId: string,
    actorUserId: string,
    input: UpdateMemberRoleInput,
  ) {
    const membership = await MembershipRepository.findById(
      targetMembershipId,
      workspaceId,
    );
    if (!membership) {
      throw AppError.notFound("Member not found in workspace");
    }

    const newRole = await RoleRepository.findById(input.roleId, workspaceId);
    if (!newRole) {
      throw AppError.badRequest("Role does not belong to this workspace");
    }

    if (membership.role.name === "Owner" && newRole.name !== "Owner") {
      const ownerCount = await MembershipRepository.countOwners(workspaceId);
      if (ownerCount <= 1) {
        throw AppError.badRequest(
          "Cannot change role of the sole workspace Owner",
        );
      }
    }

    const updated = await MembershipRepository.updateMemberRole(
      targetMembershipId,
      newRole.id,
    );

    await logAuditEvent({
      workspaceId,
      userId: actorUserId,
      action: "member:role_updated",
      entityType: "membership",
      entityId: targetMembershipId,
      details: {
        targetUserId: membership.userId,
        oldRole: membership.role.name,
        newRole: newRole.name,
      },
    });

    return updated;
  }

  static async removeMember(
    workspaceId: string,
    targetMembershipId: string,
    actorUserId: string,
  ) {
    const membership = await MembershipRepository.findById(
      targetMembershipId,
      workspaceId,
    );
    if (!membership) {
      throw AppError.notFound("Member not found");
    }

    if (membership.role.name === "Owner") {
      const ownerCount = await MembershipRepository.countOwners(workspaceId);
      if (ownerCount <= 1) {
        throw AppError.badRequest(
          "Cannot remove the sole Owner of a workspace",
        );
      }
    }

    await MembershipRepository.removeMember(targetMembershipId);

    await logAuditEvent({
      workspaceId,
      userId: actorUserId,
      action: "member:removed",
      entityType: "membership",
      entityId: targetMembershipId,
      details: { removedUserId: membership.userId },
    });

    return { success: true };
  }
}
