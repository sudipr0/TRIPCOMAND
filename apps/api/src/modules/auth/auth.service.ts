import * as argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { prisma } from "@tripchange/database";
import { lucia } from "../../lib/lucia.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import { sendPasswordResetEmail } from "./email-templates.js";
import { createSystemRolesForWorkspace } from "@tripchange/database/src/seed.js";
import {
  SYSTEM_ROLES,
  type RegisterInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type UserProfile,
} from "@tripchange/shared";

export class AuthService {
  static async register(
    input: RegisterInput,
    clientMeta: { ip?: string; userAgent?: string },
  ) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing && existing.passwordHash !== "INVITED_USER_NO_PASSWORD") {
      throw AppError.conflict(
        "An account with this email address already exists",
      );
    }

    const passwordHash = await argon2.hash(input.password);
    const workspaceName =
      input.workspaceName || `${input.firstName}'s Workspace`;
    const defaultSlug =
      (input.workspaceName || `${input.firstName}-workspace`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `ws-${Date.now().toString(36)}`;

    // Ensure slug uniqueness
    let slug = defaultSlug;
    let counter = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${defaultSlug}-${counter++}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      let user;
      if (existing && existing.passwordHash === "INVITED_USER_NO_PASSWORD") {
        user = await tx.user.update({
          where: { id: existing.id },
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            passwordHash,
            status: "ACTIVE",
          },
        });
      } else {
        user = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            status: "ACTIVE",
          },
        });
      }

      // Create initial workspace for user
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug,
          status: "ACTIVE",
        },
      });

      // Create system roles for this workspace
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

      // Add user as Owner membership
      await tx.membership.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          roleId: ownerRole.id,
          status: "ACTIVE",
        },
      });

      return { user, workspace };
    });

    // Create session
    const session = await lucia.createSession(result.user.id, {});

    await logAuditEvent({
      workspaceId: result.workspace.id,
      userId: result.user.id,
      action: "auth:register",
      entityType: "user",
      entityId: result.user.id,
      details: { email: result.user.email, workspaceId: result.workspace.id },
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
    });

    const userProfile: UserProfile = {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      status: result.user.status,
      createdAt: result.user.createdAt.toISOString(),
      updatedAt: result.user.updatedAt.toISOString(),
    };

    return {
      user: userProfile,
      session,
      initialWorkspaceId: result.workspace.id,
    };
  }

  static async login(
    input: LoginInput,
    clientMeta: { ip?: string; userAgent?: string },
  ) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || user.passwordHash === "INVITED_USER_NO_PASSWORD") {
      throw AppError.unauthorized("Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      throw AppError.forbidden(
        "Your account is currently disabled or suspended",
      );
    }

    const isValidPassword = await argon2.verify(
      user.passwordHash,
      input.password,
    );
    if (!isValidPassword) {
      throw AppError.unauthorized("Invalid email or password");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await lucia.createSession(user.id, {});

    await logAuditEvent({
      userId: user.id,
      action: "auth:login",
      entityType: "session",
      entityId: session.id,
      details: { email: user.email },
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
    });

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      lastLoginAt: new Date().toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return { user: userProfile, session };
  }

  static async logout(sessionId: string, userId?: string) {
    await lucia.invalidateSession(sessionId);
    if (userId) {
      await logAuditEvent({
        userId,
        action: "auth:logout",
        entityType: "session",
        entityId: sessionId,
      });
    }
  }

  static async forgotPassword(input: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || user.status !== "ACTIVE") {
      // Don't disclose user non-existence for security
      return {
        message:
          "If an account exists with that email, a password reset link has been sent.",
      };
    }

    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp },
    });

    await logAuditEvent({
      userId: user.id,
      action: "auth:forgot_password_requested",
      entityType: "user",
      entityId: user.id,
    });

    await sendPasswordResetEmail(user.email, resetToken, user.firstName);

    return {
      message:
        "If an account exists with that email, a password reset link has been sent.",
    };
  }

  static async resetPassword(input: ResetPasswordInput) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: input.token,
        resetTokenExp: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw AppError.badRequest("Invalid or expired password reset token");
    }

    const passwordHash = await argon2.hash(input.password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    // Invalidate all existing sessions for this user on password reset
    await lucia.invalidateUserSessions(user.id);

    await logAuditEvent({
      userId: user.id,
      action: "auth:password_reset_completed",
      entityType: "user",
      entityId: user.id,
    });

    return {
      message:
        "Password has been successfully reset. Please log in with your new credentials.",
    };
  }

  static async getCurrentUser(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
