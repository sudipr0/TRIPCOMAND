import { PrismaClient } from "@prisma/client";
import { getTenantContext } from "./async-context.js";
import { env } from "../config/env.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const rawPrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : env.NODE_ENV === "test"
          ? []
          : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = rawPrisma;
}

// Workspace-scoped models that require auto-injection
const WORKSPACE_SCOPED_MODELS = new Set(["Role", "Membership", "AuditEvent"]);

// Prisma tenant extension to enforce workspace multi-tenancy
export const prisma = rawPrisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (WORKSPACE_SCOPED_MODELS.has(model)) {
          const tenant = getTenantContext();
          if (tenant?.workspaceId) {
            args.where = {
              ...args.where,
              workspaceId: tenant.workspaceId,
            };
          }
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (WORKSPACE_SCOPED_MODELS.has(model)) {
          const tenant = getTenantContext();
          if (tenant?.workspaceId) {
            args.where = {
              ...args.where,
              workspaceId: tenant.workspaceId,
            };
          }
        }
        return query(args);
      },
      async count({ model, args, query }) {
        if (WORKSPACE_SCOPED_MODELS.has(model)) {
          const tenant = getTenantContext();
          if (tenant?.workspaceId) {
            args.where = {
              ...args.where,
              workspaceId: tenant.workspaceId,
            };
          }
        }
        return query(args);
      },
    },
  },
});

export type ExtendedPrismaClient = typeof prisma;
export { rawPrisma };
