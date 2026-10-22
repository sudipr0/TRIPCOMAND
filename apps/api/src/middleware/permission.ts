import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../lib/errors.js";
import type { PermissionCode } from "@tripchange/shared";

export function requirePermission(...requiredPermissions: PermissionCode[]) {
  return async (
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> => {
    if (!request.tenant) {
      throw AppError.unauthorized(
        "Tenant context missing before permission verification",
      );
    }

    const userPermissions = new Set(request.tenant.permissions);
    const hasAll = requiredPermissions.every((perm) =>
      userPermissions.has(perm),
    );

    if (!hasAll) {
      throw AppError.forbidden(
        `Insufficient permissions. Required: ${requiredPermissions.join(", ")}`,
      );
    }
  };
}

export function requireAnyPermission(...requiredPermissions: PermissionCode[]) {
  return async (
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> => {
    if (!request.tenant) {
      throw AppError.unauthorized(
        "Tenant context missing before permission verification",
      );
    }

    const userPermissions = new Set(request.tenant.permissions);
    const hasAny = requiredPermissions.some((perm) =>
      userPermissions.has(perm),
    );

    if (!hasAny) {
      throw AppError.forbidden(
        `Insufficient permissions. Requires at least one of: ${requiredPermissions.join(", ")}`,
      );
    }
  };
}
