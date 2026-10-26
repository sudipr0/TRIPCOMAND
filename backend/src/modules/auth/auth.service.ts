import { randomBytes } from "node:crypto";
import { AuthRepository } from "./auth.repository.js";
import { PasswordUtil } from "../../lib/password.js";
import { lucia } from "../../lib/lucia.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import { AuthEmail } from "./auth.email.js";
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  UserProfile,
} from "@trailcomand/shared";

export class AuthService {
  static async register(
    input: RegisterInput,
    clientMeta: { ip?: string; userAgent?: string },
  ) {
    const existing = await AuthRepository.findUserByEmail(input.email);

    if (existing && existing.passwordHash !== "INVITED_USER_NO_PASSWORD") {
      throw AppError.conflict(
        "An account with this email address already exists",
      );
    }

    const passwordHash = await PasswordUtil.hash(input.password);
    const workspaceName =
      input.workspaceName || `${input.firstName}'s Workspace`;
    const defaultSlug =
      (input.workspaceName || `${input.firstName}-workspace`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `ws-${Date.now().toString(36)}`;

    const slug = `${defaultSlug}-${Math.random().toString(36).substring(2, 7)}`;

    const { user, workspace } = await AuthRepository.executeRegisterTransaction(
      {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      },
      { name: workspaceName, slug },
      existing?.id,
    );

    const session = await lucia.createSession(user.id, {});

    await logAuditEvent({
      workspaceId: workspace.id,
      userId: user.id,
      action: "auth:register",
      entityType: "user",
      entityId: user.id,
      details: { email: user.email, workspaceId: workspace.id },
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
    });

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return { user: userProfile, session, initialWorkspaceId: workspace.id };
  }

  static async login(
    input: LoginInput,
    clientMeta: { ip?: string; userAgent?: string },
  ) {
    const user = await AuthRepository.findUserByEmail(input.email);

    if (!user || user.passwordHash === "INVITED_USER_NO_PASSWORD") {
      throw AppError.unauthorized("Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      throw AppError.forbidden(
        "Your account is currently disabled or suspended",
      );
    }

    const isValid = await PasswordUtil.verify(
      user.passwordHash,
      input.password,
    );
    if (!isValid) {
      throw AppError.unauthorized("Invalid email or password");
    }

    await AuthRepository.updateLastLogin(user.id);
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
    const user = await AuthRepository.findUserByEmail(input.email);
    if (!user || user.status !== "ACTIVE") {
      return {
        message:
          "If an account exists with that email, a password reset link has been sent.",
      };
    }

    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await AuthRepository.setResetToken(user.id, resetToken, resetTokenExp);

    await logAuditEvent({
      userId: user.id,
      action: "auth:forgot_password_requested",
      entityType: "user",
      entityId: user.id,
    });

    await AuthEmail.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.firstName,
    );

    return {
      message:
        "If an account exists with that email, a password reset link has been sent.",
    };
  }

  static async resetPassword(input: ResetPasswordInput) {
    const user = await AuthRepository.findUserByResetToken(input.token);
    if (!user) {
      throw AppError.badRequest("Invalid or expired password reset token");
    }

    const passwordHash = await PasswordUtil.hash(input.password);
    await AuthRepository.clearResetTokenAndUpdatePassword(
      user.id,
      passwordHash,
    );

    // Revoke previous sessions
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
    const user = await AuthRepository.findUserById(userId);
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
