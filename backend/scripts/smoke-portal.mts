/**
 * Live API smoke test for Phase 10.6. Uses only demo data.
 *   npx tsx ./scripts/smoke-portal.mts
 *
 * Written without generic type arguments on the request helper: `.mts` is parsed
 * as ESM/JSX in some toolchains, and `call<T>(...)` is ambiguous there.
 */
const API = "http://localhost:3001";

interface Envelope {
  success: boolean;
  data: any;
  error?: { message: string; code: string };
}

let cookie = "";

async function call(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: Envelope }> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      // Only declare JSON when there is a body: Fastify rejects an empty JSON body.
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...(init.headers ?? {}),
    },
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const body = (await response
    .json()
    .catch(() => ({ success: false, data: undefined }))) as Envelope;
  return { status: response.status, body };
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
  console.log(`  ok  ${message}`);
}

async function main() {
  console.log("\n== 1. Office sign-in ==");
  const login = await call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "owner@demo.com", password: "Demo123!" }),
  });
  assert(login.status === 200, `login ${login.status}`);
  const me = await call("/api/auth/me");
  assert(me.status === 200 && me.body.data.id, "session established");
  const workspaces = await call("/api/workspaces");
  const workspaceId = workspaces.body.data.find(
    (w: any) => w.slug === "demo",
  ).id;
  assert(workspaceId, "demo workspace resolved");
  const headers = { "X-Workspace-Id": workspaceId };

  console.log("\n== 2. Locate the demo trip + traveler ==");
  const trips = await call(`/api/workspaces/${workspaceId}/trips?limit=50`, {
    headers,
  });
  const trip = trips.body.data.items.find(
    (t: any) => t.tripNumber === "TRP-2026-001",
  );
  assert(trip, "TRP-2026-001 found");
  const docs = await call(
    `/api/v1/workspaces/${workspaceId}/trips/${trip.id}/documents`,
    { headers },
  );
  assert(Array.isArray(docs.body.data), `documents list (status ${docs.status})`);
  const traveler = docs.body.data.find(
    (row: any) => row.travelerName === "Sarah Mitchell",
  );
  assert(traveler, "Sarah Mitchell is on the trip");

  console.log("\n== 3. Issue a portal link (office) ==");
  const link = await call(
    `/api/v1/workspaces/${workspaceId}/trips/${trip.id}/travelers/${traveler.travelerId}/portal-access`,
    { method: "POST", headers },
  );
  const token = link.body.data?.token;
  assert(typeof token === "string" && token.length === 64, `portal token issued (status ${link.status})`);

  console.log("\n== 4. Portal payload (public, token only) ==");
  const view = await call(`/api/v1/portal/${token}`);
  assert(view.status === 200, "GET /api/v1/portal/:token returns 200");
  const payload = view.body.data;
  for (const key of [
    "visitor",
    "trip",
    "home",
    "itinerary",
    "updates",
    "documents",
    "emergency",
    "syncedAt",
  ]) {
    assert(key in payload, `payload has ${key}`);
  }
  assert(
    payload.itinerary.length === 14,
    `14 itinerary days (got ${payload.itinerary.length})`,
  );
  const day1 = payload.itinerary[0];
  assert(
    day1.startLocation === "Kathmandu" && day1.endLocation === "Phakding",
    "day 1 Kathmandu to Phakding",
  );
  assert(day1.accommodation === "Lodge", "day 1 accommodation is a Lodge");
  assert(
    day1.distanceKm === "7.8" && day1.elevationGain === -250,
    "day 1 distance/elevation present",
  );
  const day12 = payload.itinerary[11];
  assert(
    day12.startLocation === "Lukla" && day12.endLocation === "Kathmandu",
    "day 12 is the return flight",
  );
  assert(
    day12.accommodation === "Hotel" && day12.distanceKm === null,
    "day 12 has no trek metrics",
  );
  assert(
    payload.updates.length >= 3,
    `${payload.updates.length} updates published`,
  );
  assert(
    payload.updates[0].publishedAt >= payload.updates[1]?.publishedAt,
    "updates are newest-first (chronological)",
  );

  console.log("\n== 5. Sensitive data must not be present ==");
  const serialized = JSON.stringify(payload).toLowerCase();
  for (const forbidden of [
    "internalnotes",
    "estimatedcost",
    "confirmedcost",
    "actualcost",
    "agreedrate",
    "totalamount",
    "paidamount",
    "balanceamount",
    "supplierid",
    "recoveryplan",
    "marginpercent",
    "passportnumber",
    "medicalnotes",
    "rootcause",
    "workspaceid",
  ]) {
    assert(!serialized.includes(forbidden), `payload has no "${forbidden}"`);
  }
  assert(
    !/\+977-98\d{8}/.test(JSON.stringify(payload.emergency)),
    "no unpublished staff phone numbers",
  );

  console.log("\n== 6. Acknowledge an update (persistence + idempotency) ==");
  const target = payload.updates.find((u: any) => u.requiresAcknowledgement);
  assert(target, "an announcement requiring acknowledgement exists");
  const first = await call(`/api/v1/portal/${token}/acknowledge/${target.id}`, {
    method: "POST",
    body: JSON.stringify({ clientId: crypto.randomUUID() }),
  });
  assert(
    first.status === 200 && first.body.data.acknowledgedAt,
    "first acknowledge returns 200",
  );
  const second = await call(
    `/api/v1/portal/${token}/acknowledge/${target.id}`,
    {
      method: "POST",
      body: JSON.stringify({ clientId: crypto.randomUUID() }),
    },
  );
  assert(second.status === 200, "repeat acknowledge returns 200 (idempotent)");
  assert(
    second.body.data.acknowledgedAt === first.body.data.acknowledgedAt,
    "timestamp unchanged on repeat (no duplicate row)",
  );
  const reloaded = await call(`/api/v1/portal/${token}`);
  const saved = reloaded.body.data.updates.find((u: any) => u.id === target.id);
  assert(
    saved.acknowledgedAt === first.body.data.acknowledgedAt,
    "acknowledgement survives a reload",
  );

  console.log("\n== 7. Unauthorized / unrelated update ==");
  const bogus = await call(
    `/api/v1/portal/${token}/acknowledge/${crypto.randomUUID()}`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
  assert(bogus.status === 404, "unknown update id returns 404");

  console.log("\n== 8. Invalid token ==");
  const badToken = await call(`/api/v1/portal/${"f".repeat(64)}`);
  assert(badToken.status === 404, "unknown token returns 404");
  const malformed = await call("/api/v1/portal/not-a-token");
  assert(
    malformed.status === 404,
    "malformed token returns 404 (no DB hit, same response)",
  );

  console.log("\n== 9. Help request validation ==");
  const tooShort = await call(`/api/v1/portal/${token}/help-request`, {
    method: "POST",
    body: JSON.stringify({ message: "help", clientId: crypto.randomUUID() }),
  });
  assert(
    tooShort.status === 422,
    `short message rejected (${tooShort.status})`,
  );
  const tooLong = await call(`/api/v1/portal/${token}/help-request`, {
    method: "POST",
    body: JSON.stringify({
      message: "x".repeat(1600),
      clientId: crypto.randomUUID(),
    }),
  });
  assert(
    tooLong.status === 422,
    `over-long message rejected (${tooLong.status})`,
  );

  console.log("\n== 10. Help request reaches the office workflow ==");
  const clientId = crypto.randomUUID();
  const message =
    "Our pick-up from Lukla has not arrived and we are waiting at the lodge.";
  const help = await call(`/api/v1/portal/${token}/help-request`, {
    method: "POST",
    body: JSON.stringify({ message, clientId }),
  });
  assert(
    help.status === 201 && help.body.data.status === "RECEIVED",
    "help request accepted",
  );
  const duplicate = await call(`/api/v1/portal/${token}/help-request`, {
    method: "POST",
    body: JSON.stringify({ message, clientId }),
  });
  assert(
    duplicate.body.data.reportId === help.body.data.reportId,
    "retry with same clientId is deduplicated",
  );

  const office = await call(
    `/api/v1/workspaces/${workspaceId}/trips/${trip.id}/portal-help-requests`,
    {
      headers,
    },
  );
  assert(office.status === 200, "office can list portal help requests");
  const shown = office.body.data.find(
    (row: any) => row.travelerName === "Sarah Mitchell",
  );
  assert(shown, "help request visible to the office with the traveller name");
  assert(
    shown.message.includes("pick-up from Lukla"),
    "office sees the full message",
  );
  const inquiry = await call(
    `/api/workspaces/${workspaceId}/inquiries/${help.body.data.reportId}`,
    {
      headers,
    },
  );
  assert(
    inquiry.status === 200,
    "the help request is a real inquiry in the pipeline",
  );
  assert(
    inquiry.body.data.source === "Traveler Portal",
    'inquiry source is "Traveler Portal"',
  );
  assert(
    inquiry.body.data.status === "CONTACTED",
    "inquiry status is CONTACTED (actionable)",
  );

  console.log("\n== 11. Document access control ==");
  const docId = payload.documents[0]?.id;
  if (docId) {
    const own = await fetch(
      `${API}/api/v1/portal/${token}/documents/${docId}/file`,
      {
        redirect: "manual",
      },
    );
    assert(
      [302, 200].includes(own.status),
      `own document resolves (${own.status})`,
    );
  } else {
    console.log(
      "  --  no documents on the demo trip; ownership path covered by unit tests",
    );
  }
  const foreign = await call(
    `/api/v1/portal/${token}/documents/${crypto.randomUUID()}/file`,
  );
  assert(foreign.status === 404, "another/unknown document returns 404");

  console.log("\n== 12. Cache headers ==");
  const noStore = await fetch(`${API}/api/v1/portal/${token}`);
  assert(
    noStore.headers.get("cache-control") === "no-store",
    "payload is no-store",
  );

  console.log("\nALL SMOKE CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(
    "\nSMOKE TEST FAILED:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
