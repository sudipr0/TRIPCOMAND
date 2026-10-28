# Phase 11 — Evidence Report

**Date:** 2026-10-28
**Repository:** TrailComand (`~/Sudipro/Client/TRIPCHANGE`)
**Status:** `PARTIAL`

---

## A. Workspace verification

| Check | Result |
|---|---|
| Resolved directory | `/home/sudip/Sudipro/Client/TRIPCHANGE` |
| Git root | `/home/sudip/Sudipro/Client/TRIPCHANGE` (matches) |
| Branch | `main` |
| Prisma schema | `backend/prisma/schema.prisma` (present) |
| `model Trip` | **line 720** — verified |

This is the TrailComand application: `Workspace`, `Booking`, `Payment`, `Trip`,
`TripTraveler`, `ItineraryDay`, `Supplier`, `SupplierBooking`, `FieldCheckIn`,
`FieldReport`, `Disruption`, `ImpactAssessment`, `RecoveryPlan`, `RecoveryTask`,
`TripDocument`. Growth OS models (SEO, websites, decisions, evidence) are absent.
The previous attempt's report was about a different repository and does not apply here.

**Initial working-tree state (before any edit):** 13 modified files plus untracked
`backend/src/modules/analytics/`, `backend/src/modules/documents/`, and four
`backend/tmp-*.cjs` scripts. Phase 11 backend work already existed **uncommitted**.
It was treated as user-owned work and audited rather than assumed correct.
No user files were reset, cleaned, or overwritten.

---

## B. Audit findings

### Verified data sources

| Requirement | Verified model / fields | Notes |
|---|---|---|
| Trips | `Trip` — `tripNumber`, `name`, `status` (`PLANNING/READY/IN_PROGRESS/COMPLETED/CANCELLED`), `startDate`, `endDate`, `deletedAt` | `@@index([workspaceId, startDate])` |
| Revenue | `Booking.totalAmount`, `currency`, `status`, `confirmedAt`, `createdAt` | `BookingStatus` includes `CANCELLED`, `REFUNDED` |
| Refunds | `Payment` with `paymentType = REFUND`, `receivedAt` | The only reversal record; no credit-note/void model |
| Actual costs | `SupplierBooking.actualCost` → `confirmedCost` → `estimatedCost`; `StaffAssignment.agreedRate`; `RecoveryPlan.estimatedCost` | Reused `effectiveSupplierCost` from `finance.service` |
| Disruptions | `Disruption.status` (`REPORTED, ASSESSING, PLANNED, AWAITING_APPROVAL, EXECUTING, RESOLVED, CLOSED`) | Active = first five |
| Supplier attribution | `ImpactAssessment` rows with `entityType = "supplier"` and `entityId = supplierId` | Never inferred from trip co-membership |
| Documents | `TripDocument` — `fileName`, `fileUrl`, `travelerId`, `tripId`, `workspaceId` | `fileUrl` reused for `local:<key>` |
| Tenancy | `request.tenant.workspaceId` via `tenancyMiddleware` + `permissionMiddleware` | Never taken from the URL |

### Reused existing functionality
- `finance.service.effectiveSupplierCost`, `money`, `percentOf` — one definition of
  "best known cost" shared with the Finance page.
- `CANCELLED_SUPPLIER_BOOKING_STATUSES`, `EXCLUDED_STAFF_ASSIGNMENT_STATUSES`.
- `authMiddleware` / `tenancyMiddleware` / `permissionMiddleware` / `validateQuery`.
- `PERMISSION_CODES.ANALYTICS_READ` (already existed and is seeded for roles).
- `TripDocument` schema — **no schema change was needed**.

### Genuine schema gaps
None required. No migration was created or run.

---

## C. Implementation summary

### Documents (`backend/src/modules/documents/`)
- **Storage adapter** (`storage/local-storage.ts`): files under `backend/uploads/`,
  never a static route. Keys are `YYYY/MM/<uuid>.<ext>` generated server-side;
  `resolveKey` rejects `..`, absolute paths, backslashes, NUL bytes and any
  resolution escaping the root.
- **Validation** (`document-validation.ts`): PDF/JPEG/PNG only, 5 MiB cap enforced on
  bytes actually written, magic-byte sniffing against the declared MIME type.
- **Streaming multipart** (`multipart.ts`): no full-body buffering; size cap applied
  while writing; partial files removed on every failure path.
- **Retrieval** (`document.routes.ts` + `document.service.ts`): `GET
  /api/v1/workspaces/:workspaceId/documents/:documentId/file` re-authorises on every
  request, scopes by `request.tenant.workspaceId`, and sends
  `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`,
  `Referrer-Policy: no-referrer` and a sanitised `Content-Disposition`.
  External links are **not** proxied (avoids SSRF).

### Business intelligence (`backend/src/modules/analytics/`)
- **Revenue** — contracted `Booking.totalAmount` for bookings confirmed in the
  calendar year (UTC), excluding `CANCELLED`, **minus `REFUND` payments received in
  the same window**. Payments of other types are ignored.
- **Actual costs** — supplier actual > confirmed > estimated (cancelled/no-show
  excluded) + staff agreed rates + non-draft recovery spend. Estimates are never
  presented as actuals.
- **Profit margin** — `(revenue − actualCost) / revenue × 100`, `null` (UNAVAILABLE)
  when revenue is zero.
- **Total trips** — non-cancelled trips whose `startDate` falls in the year.
- **Active disruptions** — status in the five open states, on non-cancelled trips;
  deliberately not year-bounded.
- **Supplier reliability** — `(bookings − affected bookings) / bookings × 100`, where
  a booking counts only if its service date is in the window and it is not
  `CANCELLED`/`NO_SHOW`; a disruption counts only when an `ImpactAssessment`
  explicitly names that supplier *and* the trip is one the supplier was booked for.
  Below `minBookings` the score is `null` with basis `INSUFFICIENT_DATA`.
- **Currency safety** — figures are bucketed per currency; other currencies are
  named as excluded rather than converted (no FX source is configured).

### Fixes applied to pre-existing code (found by tests, not assumed)
1. `multipart.ts` — the boundary scanner matched *prefixes* of the delimiter and
   lost the `--`/CRLF marker, corrupting fields and files for chunked uploads.
   Rewritten around explicit `partDelimiter` / `closingDelimiter` tokens.
2. `multipart.ts` — buffer views aliased the incoming chunk, so later bytes rewrote
   already-buffered data; slices are now copied.
3. `multipart.ts` — the adapter was fed by a push-based `Readable`, which never emits
   `drain` under `pipeline`; an oversized upload hung instead of being rejected.
   Replaced with `PassThrough`, which honours backpressure.
4. `upload.test.ts` — the chunked fixture built pieces with `Buffer.subarray`, which
   share memory; each piece is now copied (assertions unchanged).
5. `analytics.service.ts` — KPIs computed revenue from trip rows while the endpoint
   fetched bookings; revenue now comes from bookings, and refunds are netted off.
6. `csv.ts` — a text value that merely looked numeric (`-1`, `+1`) bypassed the
   formula-injection guard. Only typed `number` values bypass it now.

### Frontend (`frontend/src/features/analytics/`)
- `/analytics` route + "Analytics" nav entry under Commercial.
- KPI cards, revenue-vs-cost bar chart, trip profitability table, supplier scorecard,
  operational impact, per-report CSV export buttons.
- Loading, error, empty and unavailable states; permission gate on
  `ANALYTICS_READ`; currency/percent formatting via existing helpers.
- **Recharts was not installed.** Charts are plain CSS bars, so no dependency was
  added.

### CSV export
Server-side only, same permission and tenant scope as the screen, RFC 4180 quoting,
formula-injection neutralisation, deterministic headers, UTF-8 BOM, no traveller PII.

---

## D. Verification evidence

| Check | Status | Result |
|---|---|---|
| `pnpm typecheck` | `PASS` | Clean across shared, backend, frontend |
| `pnpm test` | `PASS` | **404 passed / 404 total**, 0 failed |
| `pnpm build` | `PASS` | Builds; chunk-size warning is pre-existing |
| `npx prisma validate` | `PASS` | Schema valid |
| `git diff --check` | `PASS` | No whitespace errors |
| Upload/retrieval security tests | `PASS` | `documents/__tests__/{upload,storage,retrieval}.test.ts` |
| Analytics tests | `PASS` | `analytics/__tests__/analytics.test.ts` (47 tests) |
| Lint | `NOT RUN` | No lint script exists in the repository |

**Baseline before this session:** 340 passed / 2 failed, both in
`documents/upload.test.ts` (the multipart bugs above). Typecheck was already passing.

Analytics tests cover: UTC year boundaries, revenue aggregation, refund netting,
zero revenue, currency separation, empty datasets, margin and profit, cancelled
bookings excluded from cost, incomplete-trip labelling, active vs resolved
disruptions, supplier attribution rules, zero bookings, insufficient sample size,
cancelled/no-show exclusion, pagination and sorting, and CSV quoting plus
formula-injection.

Document tests cover: valid PDF/JPEG/PNG, unsupported types, MIME spoofing, empty
and oversized files, malformed and truncated bodies, declared-length rejection,
path traversal, missing files, external-link non-proxy, response headers, and the
absence of storage keys in client metadata.

> Note: these are unit tests over pure builders and the storage layer. The
> authorization and cross-tenant database paths (`DocumentsService.upload` /
> `sendDocument` against a live Prisma client) are **not** covered by an integration
> test, because no test database is provisioned (see Known limitations).

---

## E. Known limitations

- **No integration tests against a real database.** The suite runs without
  PostgreSQL; tenant-isolation is asserted at the service/route contract level, not
  against live rows.
- **No frontend test framework exists** (`vitest`/`testing-library` are not
  installed). Per the brief, no new framework was added, so the analytics page has
  no automated UI tests.
- **No runtime UI verification.** Neither the API (port 3001) nor the dev server was
  running, and starting them requires a database and credentials. The page was
  verified by typecheck and build only, not by rendering it.
- **Revenue semantics.** Revenue is recognised at booking confirmation, not at trip
  departure. Refunds are netted off in the year they were paid, which can differ
  from the year of the original booking.
- **Currency conversion is not attempted.** Multi-currency workspaces see partial
  totals with the excluded currencies named.
- **Supplier reliability measures "not implicated", not "performed well".** A
  supplier with no attributed disruptions scores 100 with basis `NO_DISRUPTIONS`.
- **`TripDocument` has no size or MIME column.** Content type is derived from the
  server-chosen file extension, which is safe because the server controls it.
- **Pre-existing artifacts left untouched:** `backend/tmp-check.cjs`,
  `tmp-clean.cjs`, `tmp-days.cjs`, `tmp-inspect.cjs`, `frontend/debug-tl.mjs`,
  `frontend/debug-tl2.mjs`. These were present before this session and belong to the
  user. (I removed only `backend/tmp-p11-debug.cjs`, which I created myself.)

---

## F. Change summary

**Created (this session):**
- `frontend/src/features/analytics/api/analytics.api.ts`
- `frontend/src/features/analytics/hooks/useAnalytics.ts`
- `frontend/src/features/analytics/components/RevenueCostChart.tsx`
- `frontend/src/features/analytics/pages/AnalyticsPage.tsx`
- `frontend/src/features/analytics/pages/index.ts`
- `backend/src/modules/analytics/__tests__/analytics.test.ts`
- `backend/src/modules/documents/__tests__/retrieval.test.ts`
- `PHASE_11_EVIDENCE_REPORT.md`

**Modified (this session):**
- `backend/src/modules/documents/multipart.ts` (parser correctness + backpressure)
- `backend/src/modules/documents/__tests__/upload.test.ts` (fixture buffer copy)
- `backend/src/modules/analytics/analytics.service.ts` (revenue source, refunds)
- `backend/src/modules/analytics/analytics.repository.ts` (refund sub-query)
- `backend/src/modules/analytics/analytics.export.ts` (refund row)
- `backend/src/modules/analytics/csv.ts` (injection guard)
- `packages/shared/src/types/index.ts` (`revenueYtd.refunds`)
- `frontend/src/app/router.tsx`, `frontend/src/app/layouts/WorkspaceLayout.tsx`
- `frontend/src/components/icons.tsx` (`ChartIcon`)

**Database operations:** none. No migration was created or executed; no `db push`,
`migrate reset`, destructive SQL or data mutation was run.

**Unrelated repositories:** not modified. All work was confined to
`~/Sudipro/Client/TRIPCHANGE`.

---

## G. Overall status

**`PARTIAL`**

The core Phase 11 scope is implemented and verified: secure local document storage
with authenticated retrieval, the business-intelligence service and endpoints,
the analytics UI, and hardened CSV exports. Typecheck, the full test suite
(404/404), build, Prisma validation and `git diff --check` all pass, and the two
failing baseline tests were traced to real parser defects and fixed.

It is not `PASS` because (a) there are no integration tests exercising
authorization and cross-tenant isolation against a live database, (b) the frontend
has no test framework so the UI is untested, and (c) the analytics page was never
rendered in a browser.
