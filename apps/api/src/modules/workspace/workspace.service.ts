import { prisma, type Prisma } from "@tripchange/database";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import { sendMemberInvitationEmail } from "../auth/email-templates.js";
import { createSystemRolesForWorkspace } from "@tripchange/database/src/seed.js";
import {
  SYSTEM_ROLES,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
  type WorkspaceSummary,
  type MemberDetail,
  type PermissionCode,
} from "@tripchange/shared";

export class WorkspaceService {
  static async listUserWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await prisma.membership.findMany({
      where: {
        userId,
        status: "ACTIVE",
        workspace: {
          status: { not: "ARCHIVED" },
        },
      },
      include: {
        workspace: true,
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      status: m.workspace.status,
      createdAt: m.workspace.createdAt.toISOString(),
      updatedAt: m.workspace.updatedAt.toISOString(),
      role: {
        id: m.role.id,
        name: m.role.name,
        isSystem: m.role.isSystem,
      },
      permissions: m.role.rolePermissions.map(
        (rp) => rp.permission.code as PermissionCode,
      ),
    }));
  }

  static async getWorkspaceById(workspaceId: string, userId: string) {
    const membership = await prisma.membership.findFirst({
      where: {
        workspaceId,
        userId,
        status: "ACTIVE",
      },
      include: {
        workspace: true,
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw AppError.tenantNotFound("Workspace not found or access denied");
    }

    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      status: membership.workspace.status,
      settings: membership.workspace.settings,
      createdAt: membership.workspace.createdAt.toISOString(),
      updatedAt: membership.workspace.updatedAt.toISOString(),
      role: {
        id: membership.role.id,
        name: membership.role.name,
        isSystem: membership.role.isSystem,
      },
      permissions: membership.role.rolePermissions.map(
        (rp) => rp.permission.code as PermissionCode,
      ),
    };
  }

  static async createWorkspace(userId: string, input: CreateWorkspaceInput) {
    const existing = await prisma.workspace.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw AppError.conflict(
        "Workspace slug is already taken. Please choose another.",
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: input.name,
          slug: input.slug,
          status: "ACTIVE",
        },
      });

      // Seed all system roles for this workspace
      await createSystemRolesForWorkspace(workspace.id, tx as any);

      // Find Owner role
      const ownerRole = await tx.role.findUniqueOrThrow({
        where: {
          workspaceId_name: {
            workspaceId: workspace.id,
            name: SYSTEM_ROLES.OWNER,
          },
        },
      });

      // Add user as Owner member
      await tx.membership.create({
        data: {
          workspaceId: workspace.id,
          userId,
          roleId: ownerRole.id,
          status: "ACTIVE",
        },
      });

      return workspace;
    });

    await logAuditEvent({
      workspaceId: result.id,
      userId,
      action: "workspace:created",
      entityType: "workspace",
      entityId: result.id,
      details: { name: result.name, slug: result.slug },
    });

    return this.getWorkspaceById(result.id, userId);
  }

  static async updateWorkspace(
    workspaceId: string,
    userId: string,
    input: UpdateWorkspaceInput,
  ) {
    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.settings
          ? { settings: input.settings as Prisma.InputJsonValue }
          : {}),
      },
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "workspace:updated",
      entityType: "workspace",
      entityId: workspaceId,
      details: input,
    });

    return updated;
  }

  static async deleteWorkspace(workspaceId: string, userId: string) {
    // Soft delete/archive workspace
    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { status: "ARCHIVED" },
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "workspace:deleted",
      entityType: "workspace",
      entityId: workspaceId,
      details: { status: "ARCHIVED" },
    });

    return { success: true, workspace: updated };
  }

  static async listMembers(workspaceId: string): Promise<MemberDetail[]> {
    const members = await prisma.membership.findMany({
      where: { workspaceId },
      include: {
        user: true,
        role: true,
      },
      orderBy: { createdAt: "asc" },
    });

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
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw AppError.notFound("Workspace not found");

    const inviter = await prisma.user.findUnique({
      where: { id: inviterUserId },
    });

    const role = await prisma.role.findFirst({
      where: { id: input.roleId, workspaceId },
    });
    if (!role) {
      throw AppError.badRequest(
        "Specified role does not exist in this workspace",
      );
    }

    let user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      // Create user placeholder with random unhashed impossible password or invited state
      user = await prisma.user.create({
        data: {
          email: input.email,
          firstName: "",
          lastName: "",
          passwordHash: "INVITED_USER_NO_PASSWORD",
          status: "INACTIVE",
        },
      });
    }

    const existingMember = await prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw AppError.conflict("User is already a member of this workspace");
    }

    const membership = await prisma.membership.create({
      data: {
        workspaceId,
        userId: user.id,
        roleId: role.id,
        status: "INVITED",
      },
    });

    await logAuditEvent({
      workspaceId,
      userId: inviterUserId,
      action: "member:invited",
      entityType: "membership",
      entityId: membership.id,
      details: { email: input.email, roleId: role.id, roleName: role.name },
    });

    await sendMemberInvitationEmail(
      input.email,
      workspace.name,
      `${inviter?.firstName ?? "A colleague"} ${inviter?.lastName ?? ""}`.trim(),
    );

    return membership;
  }

  static async updateMemberRole(
    workspaceId: string,
    targetMembershipId: string,
    actorUserId: string,
    input: UpdateMemberRoleInput,
  ) {
    const membership = await prisma.membership.findFirst({
      where: { id: targetMembershipId, workspaceId },
      include: { role: true },
    });

    if (!membership) {
      throw AppError.notFound("Member not found in workspace");
    }

    const newRole = await prisma.role.findFirst({
      where: { id: input.roleId, workspaceId },
    });

    if (!newRole) {
      throw AppError.badRequest("Role does not belong to this workspace");
    }

    // Protect last owner
    if (
      membership.role.name === SYSTEM_ROLES.OWNER &&
      newRole.name !== SYSTEM_ROLES.OWNER
    ) {
      const ownerCount = await prisma.membership.count({
        where: {
          workspaceId,
          role: { name: SYSTEM_ROLES.OWNER },
        },
      });

      if (ownerCount <= 1) {
        throw AppError.badRequest(
          "Cannot change role of the sole workspace Owner",
        );
      }
    }

    const updated = await prisma.membership.update({
      where: { id: targetMembershipId },
      data: { roleId: newRole.id },
      include: { role: true, user: true },
    });

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
    const membership = await prisma.membership.findFirst({
      where: { id: targetMembershipId, workspaceId },
      include: { role: true },
    });

    if (!membership) {
      throw AppError.notFound("Member not found");
    }

    if (membership.role.name === SYSTEM_ROLES.OWNER) {
      const ownerCount = await prisma.membership.count({
        where: {
          workspaceId,
          role: { name: SYSTEM_ROLES.OWNER },
        },
      });

      if (ownerCount <= 1) {
        throw AppError.badRequest(
          "Cannot remove the sole Owner of a workspace",
        );
      }
    }

    await prisma.membership.delete({
      where: { id: targetMembershipId },
    });

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
