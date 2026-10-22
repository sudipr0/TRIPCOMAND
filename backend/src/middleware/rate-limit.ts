import type { FastifyPluginAsync } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { redis } from "../lib/redis.js";

export const rateLimitMiddleware: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
    redis:
      redis instanceof Object && "defineCommand" in redis
        ? (redis as any)
        : undefined,
  });
};
