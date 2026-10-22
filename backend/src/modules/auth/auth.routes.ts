import type { FastifyPluginAsync } from "fastify";
import { AuthService } from "./auth.service.js";
import { lucia } from "../../lib/lucia.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validation.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type RegisterInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "./auth.schemas.js";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register
  fastify.post<{ Body: RegisterInput }>(
    "/register",
    { preHandler: [validateBody(registerSchema)] },
    async (request, reply) => {
      const clientMeta = {
        ip: request.ip,
        userAgent: request.headers["user-agent"],
      };

      const { user, session, initialWorkspaceId } = await AuthService.register(
        request.body,
        clientMeta,
      );
      const sessionCookie = lucia.createSessionCookie(session.id);
      reply.header("Set-Cookie", sessionCookie.serialize());

      return reply.status(201).send({
        success: true,
        data: {
          user,
          sessionId: session.id,
          initialWorkspaceId,
        },
      });
    },
  );

  // Login
  fastify.post<{ Body: LoginInput }>(
    "/login",
    { preHandler: [validateBody(loginSchema)] },
    async (request, reply) => {
      const clientMeta = {
        ip: request.ip,
        userAgent: request.headers["user-agent"],
      };

      const { user, session } = await AuthService.login(
        request.body,
        clientMeta,
      );
      const sessionCookie = lucia.createSessionCookie(session.id);
      reply.header("Set-Cookie", sessionCookie.serialize());

      return reply.send({
        success: true,
        data: {
          user,
          sessionId: session.id,
        },
      });
    },
  );

  // Logout
  fastify.post("/logout", async (request, reply) => {
    const sessionId =
      lucia.readSessionCookie(request.headers.cookie ?? "") ||
      (request.headers.authorization?.startsWith("Bearer ")
        ? request.headers.authorization.slice(7).trim()
        : null);

    if (sessionId) {
      await AuthService.logout(sessionId, request.user?.id);
    }

    const blankCookie = lucia.createBlankSessionCookie();
    reply.header("Set-Cookie", blankCookie.serialize());

    return reply.send({
      success: true,
      message: "Logged out successfully",
    });
  });

  // Forgot password
  fastify.post<{ Body: ForgotPasswordInput }>(
    "/forgot-password",
    { preHandler: [validateBody(forgotPasswordSchema)] },
    async (request, reply) => {
      const result = await AuthService.forgotPassword(request.body);
      return reply.send({ success: true, ...result });
    },
  );

  // Reset password
  fastify.post<{ Body: ResetPasswordInput }>(
    "/reset-password",
    { preHandler: [validateBody(resetPasswordSchema)] },
    async (request, reply) => {
      const result = await AuthService.resetPassword(request.body);
      return reply.send({ success: true, ...result });
    },
  );

  // Me
  fastify.get(
    "/me",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = await AuthService.getCurrentUser(request.user!.id);
      return reply.send({ success: true, data: user });
    },
  );
};
