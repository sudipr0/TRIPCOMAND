import { AsyncLocalStorage } from "node:async_hooks";
import type { TenantContext } from "@trailcomand/shared";

export interface RequestStore {
  requestId: string;
  userId?: string;
  tenant?: TenantContext;
}

export const asyncLocalStorage = new AsyncLocalStorage<RequestStore>();

export function getRequestStore(): RequestStore | undefined {
  return asyncLocalStorage.getStore();
}

export function getTenantContext(): TenantContext | undefined {
  return asyncLocalStorage.getStore()?.tenant;
}

export function requireTenantContext(): TenantContext {
  const tenant = getTenantContext();
  if (!tenant) {
    throw new Error(
      "Tenant context is required but was not found in current execution context",
    );
  }
  return tenant;
}
