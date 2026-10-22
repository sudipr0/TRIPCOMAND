import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> => {
    request.body = schema.parse(request.body);
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> => {
    request.query = schema.parse(request.query);
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> => {
    request.params = schema.parse(request.params);
  };
}
