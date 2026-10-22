import { rawPrisma } from "../../lib/prisma.js";
import type {
  User,
  Workspace,
  Role,
  Membership,
  Session,
  UserStatus,
} from "@prisma/client";

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  status?: UserStatus;
}

export class AuthRepository {
  static async findUserByEmail(email: string): Promise<User | null> {
    return rawPrisma.user.findUnique({
      where: { email },
    });
  }

  static async findUserById(id: string): Promise<User | null> {
    return rawPrisma.user.findUnique({
      where: { id },
    });
  }

  static async findUserByResetToken(token: string): Promise<User | null> {
    return rawPrisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: {
          gt: new Date(),
        },
      },
    });
  }

  static async createUser(data: CreateUserData): Promise<User> {
    return rawPrisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        status: data.status ?? "ACTIVE",
      },
    });
  }

  static async updateUser(id: string, data: Partial<User>): Promise<User> {
    return rawPrisma.user.update({
      where: { id },
      data,
    });
  }

  static async updateLastLogin(id: string): Promise<User> {
    return rawPrisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  static async setResetToken(
    id: string,
    token: string,
    expiresAt: Date,
  ): Promise<User> {
    return rawPrisma.user.update({
      where: { id },
      data: {
        resetToken: token,
        resetTokenExp: expiresAt,
      },
    });
  }

  static async clearResetTokenAndUpdatePassword(
    id: string,
    passwordHash: string,
  ): Promise<User> {
    return rawPrisma.user.update({
      where: { id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });
  }

  static async executeRegisterTransaction(
    userData: CreateUserData,
    workspaceData: { name: string; slug: string },
    existingUserId?: string,
  ): Promise<{
    user: User;
    workspace: Workspace;
    role: Role;
    membership: Membership;
  }> {
    return rawPrisma.$transaction(async (tx) => {
      let user: User;
      if (existingUserId) {
        user = await tx.user.update({
          where: { id: existingUserId },
          data: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            passwordHash: userData.passwordHash,
            status: "ACTIVE",
          },
        });
      } else {
        user = await tx.user.create({
          data: {
            email: userData.email,
            passwordHash: userData.passwordHash,
            firstName: userData.firstName,
            lastName: userData.lastName,
            status: "ACTIVE",
          },
        });
      }

      const workspace = await tx.workspace.create({
        data: {
          name: workspaceData.name,
          slug: workspaceData.slug,
          status: "ACTIVE",
        },
      });

      // Role creation logic
      const permissions = await tx.permission.findMany();
      const role = await tx.role.create({
        data: {
          workspaceId: workspace.id,
          name: "Owner",
          description: "System defined Owner role",
          isSystem: true,
        },
      });

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: role.id,
            permissionId: p.id,
          })),
        });
      }

      const membership = await tx.membership.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          roleId: role.id,
          status: "ACTIVE",
        },
      });

      return { user, workspace, role, membership };
    });
  }
}
