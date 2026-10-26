import { ERROR_CODES, type ErrorCode } from "@trailcomand/shared";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message = "Bad Request", details?: unknown): AppError {
    return new AppError(400, ERROR_CODES.BAD_REQUEST, message, details);
  }

  static unauthorized(message = "Unauthorized", details?: unknown): AppError {
    return new AppError(401, ERROR_CODES.UNAUTHORIZED, message, details);
  }

  static forbidden(message = "Forbidden", details?: unknown): AppError {
    return new AppError(403, ERROR_CODES.FORBIDDEN, message, details);
  }

  static notFound(message = "Resource not found", details?: unknown): AppError {
    return new AppError(404, ERROR_CODES.NOT_FOUND, message, details);
  }

  static conflict(
    message = "Resource already exists",
    details?: unknown,
  ): AppError {
    return new AppError(409, ERROR_CODES.CONFLICT, message, details);
  }

  static validation(
    message = "Validation failed",
    details?: unknown,
  ): AppError {
    return new AppError(422, ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static internal(
    message = "Internal server error",
    details?: unknown,
  ): AppError {
    return new AppError(
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      message,
      details,
    );
  }

  static tenantNotFound(
    message = "Workspace not found or not accessible",
    details?: unknown,
  ): AppError {
    return new AppError(404, ERROR_CODES.TENANT_NOT_FOUND, message, details);
  }

  static membershipRequired(
    message = "Active membership required to access workspace",
    details?: unknown,
  ): AppError {
    return new AppError(403, ERROR_CODES.MEMBERSHIP_REQUIRED, message, details);
  }
}
