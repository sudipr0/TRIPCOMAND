export const ERROR_CODES = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
  MEMBERSHIP_REQUIRED: "MEMBERSHIP_REQUIRED",
  // AI Copilot (Phase 12). The provider is unavailable for a reason the client
  // can act on (not configured, rate-limited, timed out, or upstream failure).
  AI_UNAVAILABLE: "AI_UNAVAILABLE",
  AI_NOT_CONFIGURED: "AI_NOT_CONFIGURED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
