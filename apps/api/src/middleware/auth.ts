import type { FastifyReply, FastifyRequest } from "fastify";
import { lucia } from "../lib/lucia.js";
import { AppError } from "../lib/errors.js";
import { asyncLocalStorage } from "../lib/async-context.js";
import type { Session, User } from "lucia";

declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
    session: Session | null;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const sessionId = lucia.readSessionCookie(request.headers.cookie ?? "");

  if (!sessionId) {
    // Check Authorization: Bearer <sessionId>
    const authHeader = request.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
    if (!bearerToken) {
      throw AppError.unauthorized("Authentication session missing");
    }
    const { session, user } = await lucia.validateSession(bearerToken);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session");
    }
    request.user = user;
    request.session = session;
    asyncLocalStorage.enterWith({
      requestId: request.id,
      userId: user.id,
    });
    return;
  }

  const { session, user } = await lucia.validateSession(sessionId);

  if (!session) {
    const blankCookie = lucia.createBlankSessionCookie();
    reply.header("Set-Cookie", blankCookie.serialize());
    throw AppError.unauthorized("Invalid or expired session");
  }

  if (session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    reply.header("Set-Cookie", sessionCookie.serialize());
  }

  request.user = user;
  request.session = session;

  asyncLocalStorage.enterWith({
    requestId: request.id,
    userId: user.id,
  });
}
