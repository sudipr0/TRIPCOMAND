import type { FastifyReply, FastifyRequest } from "fastify";
import { rawPrisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { asyncLocalStorage } from "../lib/async-context.js";
import type { PermissionCode, TenantContext } from "@trailcomand/shared";

declare module "fastify" {
  interface FastifyRequest {
    tenant: TenantContext;
  }
}

export async function tenancyMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  if (!request.user) {
    throw AppError.unauthorized(
      "User must be authenticated before establishing workspace tenancy",
    );
  }

  const params = request.params as
    { workspaceId?: string; slug?: string } | undefined;
  const headerWorkspace = request.headers["x-workspace-id"] as
    string | undefined;
  const query = request.query as { workspaceId?: string } | undefined;

  const workspaceIdentifier =
    params?.workspaceId ||
    params?.slug ||
    headerWorkspace ||
    query?.workspaceId;

  if (!workspaceIdentifier) {
    throw AppError.badRequest(
      "Workspace identifier (ID or slug) must be specified",
    );
  }

  const workspace = await rawPrisma.workspace.findFirst({
    where: {
      OR: [{ id: workspaceIdentifier }, { slug: workspaceIdentifier }],
    },
    include: {
      memberships: {
        where: {
          userId: request.user.id,
          status: "ACTIVE",
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!workspace || workspace.status === "ARCHIVED") {
    throw AppError.tenantNotFound("Workspace not found or archived");
  }

  if (workspace.status === "SUSPENDED") {
    throw AppError.forbidden("Workspace is suspended");
  }

  const membership = workspace.memberships[0];
  if (!membership) {
    throw AppError.membershipRequired(
      "User is not an active member of this workspace",
    );
  }

  const permissions = membership.role.rolePermissions.map(
    (rp) => rp.permission.code as PermissionCode,
  );

  const tenantContext: TenantContext = {
    workspaceId: workspace.id,
    membershipId: membership.id,
    roleId: membership.role.id,
    roleName: membership.role.name,
    permissions,
  };

  request.tenant = tenantContext;

  asyncLocalStorage.enterWith({
    requestId: request.id,
    userId: request.user.id,
    tenant: tenantContext,
  });
}
