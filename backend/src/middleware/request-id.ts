import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { asyncLocalStorage } from "../lib/async-context.js";

export const requestIdMiddleware: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", async (request, reply) => {
    const headerId = request.headers["x-request-id"];
    const requestId =
      typeof headerId === "string" && headerId.length > 0
        ? headerId
        : randomUUID();
    request.id = requestId;
    reply.header("x-request-id", requestId);
  });

  fastify.addHook("preHandler", async (request, _reply) => {
    const existing = asyncLocalStorage.getStore();
    if (!existing) {
      asyncLocalStorage.enterWith({
        requestId: request.id,
      });
    }
  });
};
