# TripChange Intelligence - Phase 0 Backend

TripChange Intelligence is an autonomous B2B SaaS platform for travel operations recovery.

Phase 0 provides the foundational backend architecture:
- Monorepo setup (pnpm workspaces)
- PostgreSQL + Prisma ORM (full multi-tenant data schema)
- Prisma auto-scoping middleware for workspace isolation
- Lucia session-based authentication + Argon2 hashing
- Multi-tenancy context using AsyncLocalStorage
- Role-based Access Control (RBAC) with granular permissions
- Audit logging for all mutating events
- Structured application error handling with standard error codes
- Modular architecture with clean separation of Schemas, Services, Repositories, Routes, and Tests

---

## Folder Structure

```
tripchange/
├── package.json
├── pnpm-workspace.yaml
├── .gitignore
├── .env.example
├── README.md
│
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── types/index.ts
│           ├── schemas/index.ts
│           └── constants/
│               ├── permissions.ts
│               ├── roles.ts
│               └── errors.ts
│
└── backend/
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts
    └── src/
        ├── config/
        │   └── env.ts
        ├── lib/
        │   ├── prisma.ts
        │   ├── redis.ts
        │   ├── logger.ts
        │   ├── errors.ts
        │   ├── async-context.ts
        │   ├── lucia.ts
        │   ├── audit.ts
        │   ├── password.ts
        │   └── system-roles.ts
        ├── middleware/
        │   ├── request-id.ts
        │   ├── error-handler.ts
        │   ├── rate-limit.ts
        │   ├── auth.ts
        │   ├── tenancy.ts
        │   ├── permission.ts
        │   └── validation.ts
        ├── modules/
        │   ├── auth/
        │   │   ├── auth.schemas.ts
        │   │   ├── auth.repository.ts
        │   │   ├── auth.service.ts
        │   │   ├── auth.routes.ts
        │   │   ├── auth.email.ts
        │   │   └── __tests__/auth.test.ts
        │   ├── workspace/
        │   │   ├── workspace.schemas.ts
        │   │   ├── workspace.repository.ts
        │   │   ├── workspace.service.ts
        │   │   ├── workspace.routes.ts
        │   │   └── __tests__/workspace.test.ts
        │   ├── membership/
        │   │   ├── membership.schemas.ts
        │   │   ├── membership.repository.ts
        │   │   ├── membership.service.ts
        │   │   ├── membership.routes.ts
        │   │   └── __tests__/membership.test.ts
        │   ├── role/
        │   │   ├── role.schemas.ts
        │   │   ├── role.repository.ts
        │   │   ├── role.service.ts
        │   │   ├── role.routes.ts
        │   │   └── __tests__/role.test.ts
        │   └── audit/
        │       ├── audit.schemas.ts
        │       ├── audit.repository.ts
        │       ├── audit.service.ts
        │       ├── audit.routes.ts
        │       └── __tests__/audit.test.ts
        ├── app.ts
        └── server.ts
```

---

## Setup & Running

### 1. Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL database
- Optional: Redis instance (defaults to reliable in-memory fallback)
- Optional: Resend API key (logs output to console in development mode)

### 2. Environment Setup
```bash
cp .env.example .env
```
Configure your `.env` with your PostgreSQL database URL and session secret:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/tripchange"
SESSION_SECRET="your-32-char-random-secret-key-goes-here"
```

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Database Setup & Seeding
Generate the Prisma Client:
```bash
pnpm db:generate
```

Push or migrate schema to PostgreSQL:
```bash
pnpm db:push
# or: pnpm db:migrate
```

Seed initial permissions, system roles, and demo owner account:
```bash
pnpm db:seed
```

Demo Credentials:
- **Email:** `owner@demo.com`
- **Password:** `Demo123!`

### 5. Running Tests
```bash
pnpm test
```

### 6. Building & Typechecking
```bash
pnpm typecheck
pnpm build
```

### 7. Start Backend Server
Development mode:
```bash
pnpm dev
```

Production mode:
```bash
pnpm start
```
Server runs at `http://localhost:3001` with health check available at `/health`.
