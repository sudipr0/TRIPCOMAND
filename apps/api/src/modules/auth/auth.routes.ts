import type { FastifyPluginAsync } from "fastify";
import { AuthService } from "./auth.service.js";
import { lucia } from "../../lib/lucia.js";
import { authenticate } from "../../middleware/auth.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register
  fastify.post("/register", async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const clientMeta = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };

    const { user, session, initialWorkspaceId } = await AuthService.register(
      input,
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
  });

  // Login
  fastify.post("/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const clientMeta = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };

    const { user, session } = await AuthService.login(input, clientMeta);
    const sessionCookie = lucia.createSessionCookie(session.id);
    reply.header("Set-Cookie", sessionCookie.serialize());

    return reply.send({
      success: true,
      data: {
        user,
        sessionId: session.id,
      },
    });
  });

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
  fastify.post("/forgot-password", async (request, reply) => {
    const input = forgotPasswordSchema.parse(request.body);
    const result = await AuthService.forgotPassword(input);
    return reply.send({ success: true, ...result });
  });

  // Reset password
  fastify.post("/reset-password", async (request, reply) => {
    const input = resetPasswordSchema.parse(request.body);
    const result = await AuthService.resetPassword(input);
    return reply.send({ success: true, ...result });
  });

  // Me
  fastify.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
    const user = await AuthService.getCurrentUser(request.user!.id);
    return reply.send({ success: true, data: user });
  });
};
