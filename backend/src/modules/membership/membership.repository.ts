import { rawPrisma } from "../../lib/prisma.js";
import type { Membership, User, Role, MembershipStatus } from "@prisma/client";

export class MembershipRepository {
  static async listMembers(workspaceId: string) {
    return rawPrisma.membership.findMany({
      where: { workspaceId },
      include: {
        user: true,
        role: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  static async findById(id: string, workspaceId: string) {
    return rawPrisma.membership.findFirst({
      where: { id, workspaceId },
      include: {
        role: true,
        user: true,
      },
    });
  }

  static async findByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
  ): Promise<Membership | null> {
    return rawPrisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
  }

  static async countOwners(workspaceId: string): Promise<number> {
    return rawPrisma.membership.count({
      where: {
        workspaceId,
        role: { name: "Owner" },
      },
    });
  }

  static async createInvitedMember(
    workspaceId: string,
    roleId: string,
    email: string,
  ): Promise<{ membership: Membership; user: User; role: Role }> {
    return rawPrisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            firstName: "",
            lastName: "",
            passwordHash: "INVITED_USER_NO_PASSWORD",
            status: "INACTIVE",
          },
        });
      }

      const role = await tx.role.findFirstOrThrow({
        where: { id: roleId, workspaceId },
      });

      const membership = await tx.membership.create({
        data: {
          workspaceId,
          userId: user.id,
          roleId: role.id,
          status: "INVITED",
        },
      });

      return { membership, user, role };
    });
  }

  static async updateMemberRole(
    membershipId: string,
    roleId: string,
  ): Promise<Membership & { role: Role; user: User }> {
    return rawPrisma.membership.update({
      where: { id: membershipId },
      data: { roleId },
      include: { role: true, user: true },
    });
  }

  static async updateMemberStatus(
    membershipId: string,
    status: MembershipStatus,
  ): Promise<Membership> {
    return rawPrisma.membership.update({
      where: { id: membershipId },
      data: { status },
    });
  }

  static async removeMember(membershipId: string): Promise<Membership> {
    return rawPrisma.membership.delete({
      where: { id: membershipId },
    });
  }
}
