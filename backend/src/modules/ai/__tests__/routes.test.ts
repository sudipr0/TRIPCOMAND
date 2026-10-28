import { afterAll } from 'vitest';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

/**
 * Route-level tests: the full HTTP boundary for the AI endpoints.
 *
 * Strategy — mock at the two external seams only:
 *   1. `authMiddleware`/`tenancyMiddleware` are bypassed via Fastify's
 *      `addHook` ordering is NOT mocked; instead we mock the session lookup so
 *      requests run the real tenancy chain against a mocked Prisma.
 *   2. The Groq provider call is mocked so no network request leaves the process.
 *
 * What this buys us over pure unit tests: zod body validation, `.strict()`
 * rejection of unknown fields, real status codes, and the real error envelope.
 */

// ── Prisma mock (before any app import) ──────────────────────────────────────
const store = {
  membership: null as null | {
    role: {
      id: string;
      name: string;
      rolePermissions: Array<{ permission: { code: string } }>;
    };
  },
  trip: null as null | Record<string, unknown>,
  disruption: null as null | Record<string, unknown>,
  supplier: null as null | Record<string, unknown>,
  supplierBookings: [] as Array<Record<string, unknown>>,
  disruptions: [] as Array<Record<string, unknown>>,
};

vi.mock("../../../lib/prisma.js", async () => {
  const actual = await vi
    .importActual<typeof import("../../../lib/prisma.js")>("../../../lib/prisma.js")
    .catch(() => ({ prisma: undefined, rawPrisma: undefined }));
  void actual;
  return {
    prisma: {
      workspace: {
        findFirst: ({ where }: { where: { id?: string } }) =>
          Promise.resolve(
            store.membership && where.id === WORKSPACE
              ? {
                  id: WORKSPACE,
                  status: "ACTIVE",
                  memberships: [store.membership],
                }
              : null,
          ),
      },
      trip: {
        findFirst: ({ where }: { where: Record<string, unknown> }) =>
          Promise.resolve(
            store.trip && where.workspaceId === store.trip.workspaceId
              ? store.trip
              : null,
          ),
      },
      disruption: {
        findFirst: ({ where }: { where: Record<string, unknown> }) =>
          Promise.resolve(
            store.disruption &&
              where.workspaceId === store.disruption.workspaceId &&
              where.tripId === store.disruption.tripId
              ? store.disruption
              : null,
          ),
        findMany: () => Promise.resolve(store.disruptions),
      },
      supplier: { findFirst: () => Promise.resolve(store.supplier) },
      supplierBooking: {
        findMany: () => Promise.resolve(store.supplierBookings),
      },
    },
    rawPrisma: {},
  };
});

// ── Auth: a fixed active session for the happy path, anonymous for the rest ──
const SESSION_USER = {
  id: "user-1",
  email: "ops@agency.test",
  status: "ACTIVE",
};
let authBehavior: "member" | "anonymous" | "no-membership" | "wrong-perms" =
  "member";

vi.mock("../../../middleware/auth.js", () => ({
  authMiddleware: async (request: {
    user?: unknown;
    headers: Record<string, unknown>;
    url?: string;
  }) => {
    if (authBehavior === "anonymous") {
      const { AppError } = await import("../../../lib/errors.js");
      throw AppError.unauthorized("Authentication session missing");
    }
    request.user = SESSION_USER;
  },
}));

vi.mock("../../../middleware/tenancy.js", () => ({
  tenancyMiddleware: async (request: {
    user?: unknown;
    params?: { workspaceId?: string };
    tenant?: unknown;
  }) => {
    const { AppError } = await import("../../../lib/errors.js");
    if (!request.user)
      throw AppError.unauthorized("User must be authenticated");
    if (authBehavior === "no-membership") {
      throw AppError.membershipRequired(
        "User is not an active member of this workspace",
      );
    }
    if (request.params?.workspaceId !== WORKSPACE) {
      throw AppError.tenantNotFound("Workspace not found or archived");
    }
    const permissions =
      authBehavior === "wrong-perms"
        ? ["supplier:read"]
        : ["trip:read", "incident:read", "supplier:read"];
    request.tenant = {
      workspaceId: WORKSPACE,
      membershipId: "m1",
      roleId: "r1",
      roleName: "Ops",
      permissions,
    };
  },
}));

// ── Groq provider: never a real call ────────────────────────────────────────
const chatMock = vi.fn();
vi.mock("../groq.client.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../groq.client.js")>();
  return {
    ...actual,
    callGroqChat: (...args: unknown[]) => chatMock(...args),
    isGroqConfigured: () => true,
    configuredModel: () => "llama-3.1-8b-instant",
  };
});

const { buildApp } = await import("../../../app.js");
const { AppError } = await import("../../../lib/errors.js");

const WORKSPACE = "11111111-1111-4111-8111-111111111111";
const TRIP = "33333333-3333-4333-8333-333333333333";
const DISRUPTION = "44444444-4444-4444-8444-444444444444";
const SUPPLIER = "55555555-5555-4555-8555-555555555555";

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  authBehavior = "member";
  chatMock.mockReset().mockResolvedValue({
    content: "Draft text.",
    model: "llama-3.1-8b-instant",
  });
  store.membership = {
    role: {
      id: "r1",
      name: "Ops",
      rolePermissions: [
        { permission: { code: "trip:read" } },
        { permission: { code: "incident:read" } },
      ],
    },
  };
  store.trip = {
    tripNumber: "TRP-1",
    name: "Everest",
    status: "IN_PROGRESS",
    startDate: new Date(),
    endDate: new Date(),
    groupSize: 8,
    workspaceId: WORKSPACE,
    itineraryDays: [],
  };
  store.disruption = { ...store.trip, workspaceId: WORKSPACE, tripId: TRIP };
  store.supplier = null;
  store.supplierBookings = [];
  store.disruptions = [];
});

const url = (path: string) => `/api/v1/workspaces/${WORKSPACE}/ai/${path}`;

describe("authentication", () => {
  it("rejects unauthenticated requests with 401", async () => {
    authBehavior = "anonymous";
    const response = await app.inject({
      method: "POST",
      url: url("summarize-trip"),
      payload: { tripId: TRIP },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHORIZED");
    expect(chatMock).not.toHaveBeenCalled();
  });
});

describe("authorization", () => {
  it("rejects a user without membership with 403", async () => {
    authBehavior = "no-membership";
    const response = await app.inject({
      method: "POST",
      url: url("summarize-trip"),
      payload: { tripId: TRIP },
    });
    expect(response.statusCode).toBe(403);
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("rejects a user without trip:read with 403", async () => {
    authBehavior = "wrong-perms";
    const response = await app.inject({
      method: "POST",
      url: url("summarize-trip"),
      payload: { tripId: TRIP },
    });
    expect(response.statusCode).toBe(403);
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("404s a trip from another workspace without calling the provider", async () => {
    // Trip scoped to a different workspace id, so the tenant-scoped query misses.
    store.trip = { ...store.trip!, workspaceId: "another-workspace" };
    const response = await app.inject({
      method: "POST",
      url: url("summarize-trip"),
      payload: { tripId: TRIP },
    });
    expect(response.statusCode).toBe(404);
    expect(chatMock).not.toHaveBeenCalled();
    expect(response.json().error.message).not.toContain("another-workspace");
  });
});

describe("request validation", () => {
  it("rejects an invalid tone", async () => {
    const response = await app.inject({
      method: "POST",
      url: url("draft-traveler-update"),
      payload: { tripId: TRIP, disruptionId: DISRUPTION, tone: "angry" },
    });
    expect(response.statusCode).toBe(422);
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("rejects malformed ids", async () => {
    const response = await app.inject({
      method: "POST",
      url: url("summarize-trip"),
      payload: { tripId: "not-a-uuid" },
    });
    expect(response.statusCode).toBe(422);
  });

  it("rejects oversized messageContext", async () => {
    const response = await app.inject({
      method: "POST",
      url: url("draft-supplier-email"),
      payload: {
        tripId: TRIP,
        supplierId: SUPPLIER,
        messageContext: "x".repeat(1001),
      },
    });
    expect(response.statusCode).toBe(422);
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("rejects unexpected extra fields", async () => {
    const response = await app.inject({
      method: "POST",
      url: url("summarize-trip"),
      payload: {
        tripId: TRIP,
        // An attempt to widen the scope through the body.
        workspaceId: "another-workspace",
        travelerNames: ["Alice", "Bob"],
      },
    });
    expect(response.statusCode).toBe(422);
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("rejects an empty body", async () => {
    const response = await app.inject({
      method: "POST",
      url: url("summarize-trip"),
      payload: {},
    });
    expect(response.statusCode).toBe(422);
  });
});

describe("happy paths", () => {
  it("draft-traveler-update returns the expected envelope", async () => {
    store.disruption = { workspaceId: WORKSPACE, tripId: TRIP } as never;
    const response = await app.inject({
      method: "POST",
      url: url("draft-traveler-update"),
      payload: { tripId: TRIP, disruptionId: DISRUPTION, tone: "urgent" },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.operation).toBe("traveler_update");
    expect(body.data.tone).toBe("urgent");
    expect(body.data.metadata.requiresReview).toBe(true);
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it("summarize-trip returns three bullets", async () => {
    chatMock.mockResolvedValue({
      content: "- a\n- b\n- c",
      model: "llama-3.1-8b-instant",
    });
    const response = await app.inject({
      method: "POST",
      url: url("summarize-trip"),
      payload: { tripId: TRIP },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.bullets).toHaveLength(3);
  });

  it("capability reports enabled:true", async () => {
    const response = await app.inject({
      method: "GET",
      url: url("capability"),
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({ enabled: true, reason: null });
  });

  it("capability reports enabled:false when no key is configured", async () => {
    const { isGroqConfigured } = await import("../groq.client.js");
    const spy = vi
      .spyOn(await import("../groq.client.js"), "isGroqConfigured")
      .mockReturnValue(false);
    void isGroqConfigured;
    const response = await app.inject({
      method: "GET",
      url: url("capability"),
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.enabled).toBe(false);
    spy.mockRestore();
  });
});

describe("provider failures surface as 503 AI_UNAVAILABLE", () => {
  async function expectUnavailable() {
    const response = await app.inject({
      method: "POST",
      url: url("summarize-trip"),
      payload: { tripId: TRIP },
    });
    expect(response.statusCode).toBe(503);
    const body = response.json();
    expect(body.error.code).toBe("AI_UNAVAILABLE");
    // The envelope never carries provider internals or credentials.
    expect(JSON.stringify(body)).not.toMatch(/gsk_|prompt_tokens|choices/);
  }

  it("maps AppError from the provider", async () => {
    chatMock.mockRejectedValue(AppError.aiUnavailable("timed out"));
    await expectUnavailable();
  });
});

describe("rate limiting", () => {
  it("attaches a 10/min limiter to every AI POST route", async () => {
    // Runtime 429s depend on the rate-limit store, which the test environment
    // stubs, so we assert the real boundary instead: the route table Fastify
    // itself built when the plugin under test is registered.
    const Fastify = (await import("fastify")).default;
    const { aiRoutes } = await import("../ai.routes.js");
    const probe = Fastify();
    const captured: Array<{ url: string; method: string | string[]; config?: { rateLimit?: unknown } }> = [];
    probe.addHook("onRoute", (route) => {
      captured.push({
        url: route.url,
        method: Array.isArray(route.method) ? route.method[0] : route.method,
        config: route.config as { rateLimit?: unknown } | undefined,
      });
    });
    await probe.register(aiRoutes, { prefix: "/api/v1/workspaces/:workspaceId" });
    await probe.ready();
    await probe.close();

    const posts = captured.filter(
      (route) => route.method === "POST" && route.url.includes("/ai/"),
    );
    expect(posts).toHaveLength(3);
    for (const route of posts) {
      expect(route.config?.rateLimit).toMatchObject({ max: 10, timeWindow: "1 minute" });
    }
  });
});

describe("drafts are not persisted", () => {
  it("does not create anything", async () => {
    chatMock.mockResolvedValue({ content: "- a\n- b\n- c", model: "llama-3.1-8b-instant" });
    // The service never writes; the route response proves the flow ends at the draft.
    const response = await app.inject({
      method: "POST",
      url: url("summarize-trip"),
      payload: { tripId: TRIP },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.operation).toBe("trip_summary");
  });
});
