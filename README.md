# TrailComand

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

TrailComand is the operational recovery layer for complex, multi-day trips. It helps travel teams understand disruption impacts, coordinate operational decisions, and recover trips with better visibility.

---

## Overview

TrailComand is a multi-tenant B2B SaaS for trekking and travel operators. It covers the full operating lifecycle of a trip — from a customer inquiry through quotation, booking, payment, trip planning, traveler and staff assignment, supplier booking, field reporting, and profitability — and adds a disruption and recovery engine on top of it.

When something goes wrong on a trip, the application derives the impact of the disruption from the trip's actual relationships (itinerary days, travelers, staff assignments, supplier bookings), coordinates a recovery plan, and keeps finance and the traveler-facing portal in step.

---

## Key capabilities

Delivered as independent backend modules under `backend/src/modules/` and matching frontend feature areas under `frontend/src/features/`:

- **Sales pipeline** — customers, inquiries, and versioned quotations with line items, tax, discount, and totals.
- **Bookings and payments** — quotations are accepted and converted into confirmed bookings; deposits and payments are recorded against the booking balance.
- **Trip operations** — trips are created from confirmed bookings, with travelers (including a trip leader), day-by-day itineraries that are versioned on publish, and a readiness check for departure.
- **Staffing and suppliers** — staff directory with availability, role-based assignment to trips (e.g. lead guide), supplier directory with dated rates, and per-trip supplier bookings.
- **Disruption and recovery** — deterministic impact analysis across the trip graph, plus recovery plans with tasks, approval, and an execution status.
- **Field operations** — a guide-facing field view for trip updates including check-ins and emergency reports.
- **Finance** — per-trip revenue, collected payments, outstanding balance, supplier cost, and profit margin.
- **Traveler portal** — a tokenized, traveler-scoped view of the published itinerary, isolated from internal agency data.
- **Platform foundation** — workspace multi-tenancy with Prisma-level scoping, session authentication (Lucia + Argon2), RBAC with granular permissions, and audit logging for mutating events.

---

## Technology stack

| Layer    | Technology                                                                |
| -------- | ------------------------------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS    |
| Backend  | Node.js, TypeScript, Fastify                                              |
| Data     | PostgreSQL, Prisma ORM                                                    |
| Auth     | Lucia sessions, Argon2 password hashing                                   |
| Shared   | `@trailcomand/shared` — types, Zod schemas, permission and role constants |
| Tooling  | pnpm workspaces, Vitest, TypeScript compiler                              |

---

## Architecture overview

The repository is a pnpm monorepo with three packages:

```
browser ──► frontend (React SPA, :5173)
              │  /api proxy
              ▼
           backend (Fastify API, :3001)
              │
              ├──► PostgreSQL (:5432)  via Prisma
              └──► Redis (optional)
```

- **`frontend/`** — the single-page app. Each domain lives in `src/features/<domain>/` with its own pages, components, hooks, and API wrappers. Vite proxies `/api` to the backend so the browser is always same-origin.
- **`backend/`** — a Fastify API split by domain module. Every module follows the same layering: `*.schemas.ts` (Zod validation) → `*.routes.ts` → `*.service.ts` (business rules) → `*.repository.ts` (Prisma access), with colocated tests in `__tests__/`.
- **`packages/shared/`** — the contract between frontend and backend. Types, Zod schemas, and constants are defined once and consumed by both. It compiles to `dist/` and is imported through the `@trailcomand/shared` alias.

Cross-cutting concerns live in `backend/src/lib/` (Prisma client, tenancy context via `AsyncLocalStorage`, audit, logger, errors) and `backend/src/middleware/` (request id, auth, tenancy, permissions, validation, rate limiting, error handling).

---

## Prerequisites

- **Node.js** `>= 20.0.0`
- **pnpm** `9.0.0` (pinned via the `packageManager` field)
- **PostgreSQL** accessible via a connection string
- **Redis** — optional; the app falls back to an in-memory implementation
- **Resend API key** — optional; emails are logged to the console in development

---

## Quick start

```bash
# 1. Install dependencies for every workspace package
pnpm install

# 2. Configure the environment (see the next section for required variables)
cp .env.example .env

# 3. Create the database schema from the Prisma schema
pnpm db:push

# 4. Start the backend API  (http://localhost:3001)
pnpm dev
```

The backend does not serve the UI. In a **second terminal**, start the frontend:

```bash
pnpm dev:frontend   # http://localhost:5173
```

> `pnpm db:push` applies the Prisma schema to the database configured in `DATABASE_URL`. It must run against a database you are allowed to modify — do not point it at a production database.

To load the demo workspace and the demo owner account:

```bash
pnpm db:seed
```

The seed script prints the demo credentials it creates in development. Do not reuse demo credentials in any shared or production environment.

---

## Environment configuration

Copy `.env.example` to `.env` and fill in your own values. The template ships **placeholder values only** — real environment files are git-ignored and must never be committed.

| Variable            | Required | Purpose                                                          |
| ------------------- | -------- | ---------------------------------------------------------------- |
| `DATABASE_URL`      | Yes      | PostgreSQL connection string used by Prisma                      |
| `SESSION_SECRET`    | Yes      | Secret used to sign session cookies (use a long random value)    |
| `API_PORT`          | No       | Backend listen port (default `3001`)                             |
| `API_URL`           | No       | Public base URL of the backend                                   |
| `WEB_URL`           | No       | Public base URL of the frontend (used for CORS and links)        |
| `NODE_ENV`          | No       | `development` \| `production` \| `test`                          |
| `REDIS_URL`         | No       | Redis connection string; omitting it uses the in-memory fallback |
| `EMAIL_FROM`        | No       | Sender address for transactional email                           |
| `RESEND_API_KEY`    | No       | Resend API key; when unset, email is logged instead of sent      |
| `GROQ_API_KEY`      | No       | Optional AI provider key                                         |
| `GOOGLE_AI_API_KEY` | No       | Optional AI provider key                                         |

The frontend reads `VITE_API_URL` from `frontend/.env.local` (see `frontend/.env.example`). When it is unset the client calls `http://localhost:3001`, which the Vite dev proxy forwards.

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database setup

The Prisma schema lives at `backend/prisma/schema.prisma`. All database commands run in the backend workspace through the root scripts:

```bash
pnpm db:generate   # regenerate the Prisma client after schema changes
pnpm db:push       # sync the schema to the database (no migration files)
pnpm db:migrate    # create/apply a versioned migration instead
pnpm db:seed       # seed permissions, system roles, and demo data
pnpm db:studio     # open Prisma Studio
```

Use `db:migrate` for anything shared or deployed; `db:push` is intended for disposable local databases.

---

## Development commands

| Command             | Description                                   |
| ------------------- | --------------------------------------------- |
| `pnpm install`      | Install all workspace dependencies            |
| `pnpm dev`          | Run the backend API in watch mode (`:3001`)   |
| `pnpm dev:frontend` | Run the Vite dev server (`:5173`)             |
| `pnpm dev:backend`  | Explicit alias for `pnpm dev`                 |
| `pnpm build`        | Build shared, backend, and frontend           |
| `pnpm start`        | Run the compiled backend (`pnpm build` first) |

Run both apps side by side in two terminals; the frontend proxies `/api` to the backend automatically.

---

## Testing and quality checks

```bash
pnpm typecheck   # tsc --noEmit across shared, backend, and frontend
pnpm test        # Vitest suite (backend workspace)
pnpm build       # full production build
```

The backend test suite uses Vitest and runs against mocked data access, so **no database or Redis instance is required** to run it locally or in CI.

---

## GitHub Actions CI

Every push and pull request targeting `main` runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. Check out the repository.
2. Install pnpm `9.0.0` and Node.js `20` with pnpm caching.
3. `pnpm install --frozen-lockfile` — the committed lockfile is authoritative.
4. Build `@trailcomand/shared` (its `dist/` is not committed, and both other packages typecheck against it).
5. `pnpm db:generate` — generate the Prisma client. It is produced into `node_modules`, is never committed, and is required for typecheck on a clean checkout. This step reads `schema.prisma` only and connects to no database.
6. `pnpm typecheck`.
7. `pnpm test`.

The workflow has a 15-minute timeout, read-only `contents` permission, no secrets, and no database service — it only runs the checks that work without external infrastructure. Job status is visible on the [Actions tab](https://github.com/sudipr0/TRIPCOMAND/actions).

---

## Security guidance

- **Never commit real environment files, credentials, tokens, API keys, private keys, or production database URLs.** `.env` and `.env.*` are ignored; only the sanitized `.env.example` templates are tracked.
- Do not commit local session artifacts (such as exported cookie jars) or local database files; these are covered by `.gitignore`.
- `SESSION_SECRET` and `DATABASE_URL` are secrets — supply them through your environment or secrets manager, not through the repository.
- The traveler portal is accessed through a generated, traveler-scoped token. Treat portal links as secrets: anyone holding a valid link can view that traveler's trip.
- Rotate any credential immediately if it is ever exposed in a commit or log. Adding a file to `.gitignore` does not remove it from existing history.
- Run `pnpm audit` and keep dependencies current; update via `pnpm update` rather than editing the lockfile by hand.

---

## Project structure

```
TRIPCHANGE/
├── .github/workflows/ci.yml     # CI: typecheck + test on main
├── frontend/                    # React SPA (Vite)
│   └── src/
│       ├── features/            # one folder per domain (trips, bookings, …)
│       ├── components/          # shared UI primitives
│       ├── lib/                 # API client and utilities
│       ├── stores/              # client state
│       └── app/                 # router and app shell
├── backend/                     # Fastify API
│   ├── prisma/                  # schema.prisma and seed script
│   └── src/
│       ├── modules/             # one folder per domain
│       ├── lib/                 # prisma, tenancy, audit, logger, errors
│       ├── middleware/          # auth, tenancy, permissions, validation
│       ├── config/              # environment configuration
│       ├── app.ts
│       └── server.ts
├── packages/shared/             # types, Zod schemas, constants
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

Inside `backend/src/modules/<domain>/` each module is layered as `*.schemas.ts`, `*.routes.ts`, `*.service.ts`, `*.repository.ts`, and `__tests__/`.

---

## Contributing

1. Branch from `main` and keep changes focused on one concern.
2. Follow the existing module layering — put business rules in the service layer, data access in the repository layer, and validation in Zod schemas.
3. Define shared contracts in `packages/shared` rather than duplicating types.
4. Add or update tests under the module's `__tests__/` directory.
5. Run `pnpm typecheck` and `pnpm test` before opening a pull request; CI must be green to merge.
6. Never commit secrets or environment files.

---

## License

No license file is currently included in this repository, so all rights are reserved by the author. Add a `LICENSE` file if you intend to publish the project under an open-source license.
