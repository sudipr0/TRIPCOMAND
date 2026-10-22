import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { ERROR_CODES, type ApiResponse } from "@tripchange/shared";

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest<any, any, any, any, any>,
  reply: FastifyReply<any, any, any, any, any>,
) {
  const reqInfo = {
    id: request.id,
    method: request.method,
    url: request.url,
  };

  if (error instanceof AppError) {
    logger.warn({ req: reqInfo, err: error }, `AppError: ${error.message}`);
    const response: ApiResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
    return reply.status(error.statusCode).send(response);
  }

  if (error instanceof ZodError) {
    logger.warn({ req: reqInfo, err: error.format() }, "Validation Error");
    const response: ApiResponse = {
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "Invalid input data",
        details: error.flatten().fieldErrors,
      },
    };
    return reply.status(422).send(response);
  }

  // Fastify internal validation error
  if ("validation" in error && error.validation) {
    logger.warn({ req: reqInfo, err: error }, "Fastify Validation Error");
    const response: ApiResponse = {
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: error.message,
        details: error.validation,
      },
    };
    return reply.status(422).send(response);
  }

  logger.error({ req: reqInfo, err: error }, "Unhandled Server Error");
  const response: ApiResponse = {
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: "An unexpected internal server error occurred",
    },
  };
  return reply.status(500).send(response);
}
