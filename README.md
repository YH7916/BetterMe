# BetterMe 健康测评系统 · 全栈挑战交付

[![CI](https://github.com/YH7916/BetterMe/actions/workflows/ci.yml/badge.svg)](https://github.com/YH7916/BetterMe/actions/workflows/ci.yml)

**交付人：李宇晗**　·　交付日期：2026-07-05

A full-stack health assessment quiz funnel inspired by the BetterMe challenge. Users step through a guided form, the backend persists progress for recovery, computes a personalised health plan server-side, and returns differentiated results based on subscription status (free users see a masked teaser; members get the full plan). A mock `/pay` endpoint simulates a production-style checkout callback with payment records, idempotency, and subscription activation.

---

## 交付清单 · Delivery

| 交付物 | 位置 |
|---|---|
| 线上演示（前端，可从头走一遍 funnel）| https://betterme.yesterhaze.codes |
| 前端备用域名 | https://betterme-4j4.pages.dev |
| API 控制台 | https://api.betterme.yesterhaze.codes |
| API 文档（OpenAPI 3.1 / Swagger）| https://api.betterme.yesterhaze.codes/api/v1/docs |
| 健康检查 / 就绪检查 | `/api/health` · `/api/ready` |
| 代码仓库 | https://github.com/YH7916/BetterMe |
| 一键测试 | `pnpm install && pnpm test`（shared 36 + web 36 + api 34 = 106 项）|
| 测试覆盖说明 | 见下方 [Test Coverage](#test-coverage) |
| CI（lint / typecheck / build / 测试 / 覆盖率门禁）| https://github.com/YH7916/BetterMe/actions/workflows/ci.yml |
| 生产定时冒烟监控 | https://github.com/YH7916/BetterMe/actions/workflows/monitor.yml |
| 数据库 Schema 图 | [docs/db/schema.md](docs/db/schema.md) |
| API 文档（详版）| [docs/api/README.md](docs/api/README.md) · 或下方 [API Documentation](#api-documentation) |
| AI 使用复盘 | [docs/AI-REVIEW.md](docs/AI-REVIEW.md) |

**已支付测试会话**（作为 `Authorization: Bearer <token>` 传入，可直接对比付费前后差异并重放 `/pay`）：

```bash
PAID_TEST_TOKEN=seed-demo-token-0000000000000000000000000000000000000000000000000000000000000000
PAID_TEST_ASSESSMENT_ID=ef0e9e76-0322-45af-89cc-f4b785c7b264
```

`/pay` 可重放 cURL 见下方 [API Documentation](#api-documentation)；「新建会话 → 脱敏 → 支付 → 完整」完整对比脚本见 [Prepaid Test Session](#prepaid-test-session)。

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cloudflare Pages                                                   │
│  apps/web  (Vite + React + React Router)                            │
│  – 5-stage funnel, auto-save, progress recovery, result + checkout  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  /api/*  (Vite dev proxy / VITE_API_BASE)
┌───────────────────────────────▼─────────────────────────────────────┐
│  Railway Node service                                                │
│  apps/api  (Hono + Prisma)                                          │
│  routes → auth → rate-limit → controllers → services → repositories │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  Prisma ORM
┌───────────────────────────────▼─────────────────────────────────────┐
│  Supabase Postgres                                                   │
│  users / assessments / assessment_results / subscriptions           │
└─────────────────────────────────────────────────────────────────────┘
```

**Shared contract layer:** `packages/shared` — Zod schemas, TypeScript enums, and pure-function health algorithms used by both frontend and backend. No type drift.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vite 5 + React 18 + React Router 6 + TypeScript |
| Backend | Hono 4 + Node.js 22 + TypeScript (`strict: true`) |
| ORM | Prisma 5 + Supabase Postgres |
| Shared | Zod 3 contracts + health algorithm pure functions |
| Unit/Integration Tests | Vitest 2 |
| Frontend Component Tests | Vitest 2 + React Testing Library |
| E2E Tests | Playwright |
| CI | GitHub Actions |
| Frontend Deploy | Cloudflare Pages |
| Backend Deploy | Railway Node service |

---

## Monorepo Layout

```
betterme/
├── apps/
│   ├── api/                  # Hono backend
│   │   ├── prisma/           # schema.prisma + migrations + seed.ts
│   │   ├── src/
│   │   │   ├── routes/       # method + path declarations only
│   │   │   ├── controllers/  # thin request/response adapters
│   │   │   ├── services/     # business logic (no Hono/Prisma deps)
│   │   │   ├── repositories/ # sole DB access layer (Prisma)
│   │   │   ├── middlewares/  # errorHandler / validate / ownership
│   │   │   ├── lib/          # prisma singleton / errors / serializers
│   │   │   ├── config/env.ts
│   │   │   ├── app.ts        # createApp() — used by tests + server.ts
│   │   │   └── server.ts     # Node HTTP entry
│   │   ├── tests/integration/
│   │   ├── Dockerfile        # reproducible container image
│   │   └── package.json
│   └── web/                  # Vite + React frontend
│       ├── src/
│       │   ├── pages/        # FunnelPage / ResultPage
│       │   ├── features/     # assessment steps, result view, paywall
│       │   ├── lib/          # api-client / session (localStorage)
│       │   └── store/
│       ├── e2e/              # Playwright full-funnel tests
│       ├── tests/            # Vitest component tests
│       ├── wrangler.toml     # Pages deploy config
│       └── package.json
├── packages/
│   └── shared/               # @betterme/shared
│       ├── src/
│       │   ├── enums.ts
│       │   ├── schemas/      # assessment.schema.ts / payment.schema.ts
│       │   └── health/       # bmi.ts / calorie.ts / target-date.ts
│       └── tests/
├── docs/
│   ├── api/README.md         # API reference (auth, errors, endpoints)
│   ├── db/schema.md          # Mermaid ER diagram + field rationale
│   └── AI-REVIEW.md          # AI usage retrospective
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md                 # ← you are here
```

---

## Local Setup

### Prerequisites

- Node.js >= 22 (`node -v`)
- pnpm >= 9 (`npm i -g pnpm`)
- A Supabase project with Postgres (free tier is fine)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example files and fill in your Supabase credentials:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
```

**`apps/api/.env`** (production / dev schema — `public`):
```
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-[region].pooler.supabase.com:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres.[ref]:[password]@[host].supabase.co:5432/postgres"
```

- `DATABASE_URL` — connection pooler (used by Prisma at runtime)
- `DIRECT_URL` — direct connection (used by Prisma for migrations; required when running `migrate deploy`)

**`apps/api/.env.test`** (test schema — `test`, completely isolated):
```
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-[region].pooler.supabase.com:5432/postgres?schema=test"
DIRECT_URL="postgresql://postgres.[ref]:[password]@[host].supabase.co:5432/postgres?schema=test"
```

> **Test isolation:** Integration tests run against the `test` schema in the same Supabase project. `beforeEach` hooks call `deleteMany()` only within that schema, so demo seed data in `public` is never touched.

### 3. Run migrations and seed

```bash
# Deploy all migrations to the public schema
pnpm --filter @betterme/api exec prisma migrate deploy

# Generate Prisma client
pnpm --filter @betterme/api exec prisma generate

# Seed prepaid demo data
pnpm --filter @betterme/api db:seed
```

The seed script prints the two demo credentials (also hardcoded below in §Prepaid Test Session).

### 4. Start development servers

```bash
# One command from the repository root
pnpm dev
```

Or run the two services separately:

```bash
# Terminal 1 — backend (http://localhost:8787)
pnpm --filter @betterme/api dev

# Terminal 2 — frontend (http://localhost:5173)
pnpm --filter @betterme/web dev
```

The Vite dev server proxies `/api/*` to `localhost:8787` automatically.

---

## Tests

### One-command test run

```bash
pnpm test
```

This runs (in parallel across packages):

| Package | Runner | What runs |
|---|---|---|
| `packages/shared` | Vitest | 34 unit tests — algorithm boundaries (BMI, calories, target-date) + Zod schema validation including target-weight range and direction flexibility |
| `apps/api` | Vitest | 26 integration tests against the `test` schema |
| `apps/web` | Vitest + RTL | 33 component tests (session, 5-stage funnel, result page, checkout, optimistic unlock, restart) |

For a demo-ready verification pass:

```bash
pnpm verify
```

This runs ESLint, typecheck, all Vitest suites, the production frontend build, and the Playwright funnel E2E.

### Lint

```bash
pnpm lint
pnpm lint:fix
pnpm --filter @betterme/api lint
pnpm --filter @betterme/web lint
```

ESLint uses a root flat config (`eslint.config.js`) across `apps/*` and `packages/*`, with TypeScript, React Hooks, React Refresh, floating Promise, unused variable, and type-import rules. Husky installs a `pre-commit` hook via `pnpm install`; commits run `pnpm lint` and `pnpm typecheck` before Git accepts them.

### E2E tests (Playwright)

```bash
pnpm --filter @betterme/web e2e
```

Requires both dev servers running (or Playwright auto-starts them via `webServer` in `playwright.config.ts`).
Covers the complete funnel → submit → masked result → pay → full result unlock flow.
To run the same browser flow against production, set `PLAYWRIGHT_BASE_URL=https://betterme.yesterhaze.codes`.

### Online interview demo flow

1. Open `https://betterme.yesterhaze.codes`.
2. Complete the 5-stage assessment. Choice questions advance immediately; basic body data is collected one field at a time.
3. On `/result`, show the masked BMI preview and the full-report call to action.
4. Click **解锁完整报告与行动方案**, confirm the simulated payment on `/pay`, then return to the full member report.
5. Click **重新开始 / Restart demo** to clear local demo session state and run the flow again.

### Local interview demo flow

1. Start with `pnpm dev`.
2. Open `http://localhost:5173`.
3. Complete the 5-stage assessment. Choice questions advance immediately; basic body data is collected one field at a time.
4. On `/result`, show the masked BMI preview and the full-report call to action.
5. Click **解锁完整报告与行动方案**, confirm the simulated payment on `/pay`, then return to the full member report.
6. Click **重新开始 / Restart demo** to clear local demo session state and run the flow again.

### CI

![CI](https://github.com/YH7916/BetterMe/actions/workflows/ci.yml/badge.svg)

> CI runs lint + typecheck + all Vitest tests against a `postgres:16` service container on every push, PR, manual dispatch, and a daily 02:00 UTC scheduled self-check.

### Production monitoring

The production monitor workflow (`.github/workflows/monitor.yml`) runs every 30 minutes and can also be triggered manually from GitHub Actions.

```bash
pnpm smoke:prod
```

The smoke monitor checks:

- frontend HTML loads from `https://betterme.yesterhaze.codes`
- `/api/health` returns a live API process
- `/api/ready` confirms the API can query Supabase Postgres
- full anonymous funnel path: create assessment -> save -> submit -> masked result
- mock unlock path: `/api/v1/pay` -> full member result
- seeded paid demo session still returns member-only fields

---

## API Documentation

All endpoints are prefixed with `/api/v1` (health/readiness live at `/api`). Authentication uses a **capability token**: `POST /assessments` issues an opaque, unguessable session token (backed by a `sessions` row with a 30-day expiry). Clients send it as `Authorization: Bearer <token>`; the server resolves it to a user id. The token is distinct from any resource id and is never returned inside resource payloads. No cookies, no JWT — appropriate for an anonymous funnel with no login, while still being revocable and expiring.

An interactive **OpenAPI 3.1 / Swagger UI** is served at `/api/v1/docs` (spec at `/api/v1/openapi.json`), generated from the same Zod schemas the API validates against.

Unified error body: `{ "error": { "code": "string", "message": "string" }, "request_id": "string" }`. Validation errors additionally carry `error.fields: [{ path, message }]` covering **every** invalid field, not just the first.

### Endpoints

| # | Method | Path | Auth | Description |
|---|---|---|---|---|
| 0 | GET | `/api/health` | None | Liveness check: API process responds |
| 0 | GET | `/api/ready` | None | Readiness check: API can query Postgres |
| 1 | POST | `/api/v1/assessments` | None | Create anonymous user + assessment, issue token |
| 2 | GET | `/api/v1/assessments/:id` | Bearer (ownership) | Recover progress |
| 3 | PATCH | `/api/v1/assessments/:id` | Bearer (ownership) | Incremental step save |
| 4 | POST | `/api/v1/assessments/:id/submit` | Bearer (ownership) | Compute + persist result |
| 5 | GET | `/api/v1/assessments/:id/result` | Bearer (ownership + subscription) | Fetch result (masked vs full) |
| 6 | DELETE | `/api/v1/assessments/:id` | Bearer (ownership) | Delete assessment + derived data (GDPR) |
| 7 | POST | `/api/v1/pay` | Bearer (ownership) | Activate subscription |

---

### 1. POST /api/v1/assessments

Creates a new anonymous user and assessment, and issues a session token. No body required.

**Response 201:**
```json
{
  "token": "b1c9…<64 hex chars>",
  "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264",
  "currentStep": 0
}
```

Store the `token` and send it as `Authorization: Bearer <token>` on every subsequent call.

---

### 2. GET /api/v1/assessments/:id

Returns current progress for resume. Requires a `Authorization: Bearer` token owned by the assessment. The response deliberately does **not** include `userId`.

**Response 200:**
```json
{
  "assessmentId": "ef0e9e76-...",
  "gender": "female",
  "primary_goal": "lose_weight",
  "age": 28,
  "height_cm": 165,
  "weight_kg": 70,
  "target_weight_kg": 60,
  "workout_frequency": "light",
  "current_step": 2,
  "status": "in_progress"
}
```

**Errors:** `401 UNAUTHORIZED` (missing/invalid/expired token), `403 FORBIDDEN` (token owned by another user), `404 NOT_FOUND`

---

### 3. PATCH /api/v1/assessments/:id

Saves one or more fields incrementally. All fields are optional (partial update). Each field is validated against the shared Zod schema — invalid values return 400 with **all** offending fields listed.

**Request body (any subset):**
```json
{
  "gender": "female",
  "primary_goal": "lose_weight",
  "age": 28,
  "height_cm": 165,
  "weight_kg": 70,
  "target_weight_kg": 60,
  "workout_frequency": "light",
  "current_step": 3
}
```

**Validation ranges:** age 13–120, height_cm 50–260, weight_kg 20–500, target_weight_kg 20–500, current_step 0–2147483647.

**Goal/target direction:** `target_weight_kg` may be above, below, or equal to `weight_kg`. The API validates the numeric range only; the frontend/result copy interprets whether the user is aiming to lose weight, gain weight, maintain, or reshape.

**Response 200:** updated progress object (same shape as GET).

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`

---

### 4. POST /api/v1/assessments/:id/submit

Triggers server-side health algorithm using the stored assessment fields. All fields must be present (validated via `submitSchema`) or returns 400. Persists an `assessment_result` row and marks assessment `completed`.

**Algorithm:** BMI (Quetelet) → Mifflin-St Jeor BMR × activity factor → ±500 kcal goal adjust → target date at 0.5 kg/week.

**Response 200:**
```json
{ "status": "completed" }
```

**Errors:** `400 INCOMPLETE` (missing required fields or invalid numeric values), `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`

---

### 5. GET /api/v1/assessments/:id/result

Returns the computed result. Shape differs by subscription status.

**Non-member response (locked: true):**
```json
{
  "member": false,
  "result": {
    "bmi": 25.7,
    "bmi_category": "overweight",
    "locked": true,
    "message": "升级会员查看每日建议摄入与目标达成日期"
  }
}
```

**Member response (full):**
```json
{
  "member": true,
  "result": {
    "bmi": 25.7,
    "bmi_category": "overweight",
    "daily_calorie_intake": 1680,
    "target_date": "<computed YYYY-MM-DD>",
    "algorithm_version": "v1"
  }
}
```

The fields `daily_calorie_intake` and `target_date` are **never** sent to non-members — they are stripped in `lib/serializers.ts` on the server before the response is built.

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND` (result not yet computed — call /submit first)

---

### 6. DELETE /api/v1/assessments/:id

Permanently deletes an assessment and everything derived from it (payments, computed result) in a single transaction. Demonstrates a GDPR "right to erasure" path.

**Response 204:** no content.

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`

---

### 7. POST /api/v1/pay

Simulates a successful checkout callback that activates the user's subscription. It is still a mock provider, but the flow mirrors a production payment integration: the backend derives the user from the bearer token, verifies ownership of the assessment, records a payment row with provider metadata, uses an idempotency key to prevent duplicate charges, and activates the subscription in the same transaction.

The user is taken from the authenticated token — the request body only carries `assessmentId` (which must belong to that user) and an optional `idempotencyKey`. A mismatch returns 403.

The endpoint is idempotent for an already-active subscription: repeated calls return `active` with the existing succeeded payment, without rewriting the original activation timestamp or payment reference.

**Request body:**
```json
{
  "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264",
  "idempotencyKey": "checkout_attempt_1"
}
```

**Response 200:**
```json
{
  "status": "active",
  "payment": {
    "id": "4a1db02e-7a0e-4c2a-9501-1bb3d75c8c72",
    "provider": "mock",
    "provider_ref": "mock_<stable_hash>",
    "status": "succeeded",
    "amount_cents": 1900,
    "currency": "CNY"
  }
}
```

**Errors:** `400 VALIDATION_ERROR` (invalid UUID), `400 IDEMPOTENCY_CONFLICT` (key reused for another checkout), `401 UNAUTHORIZED`, `403 FORBIDDEN` (assessment owner mismatch), `404 NOT_FOUND` (subscription/assessment not found)

---

### /pay cURL example

```bash
API="https://api.betterme.yesterhaze.codes"
TOKEN="seed-demo-token-0000000000000000000000000000000000000000000000000000000000000000"

curl -X POST "$API/api/v1/pay" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d '{
    "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264",
    "idempotencyKey": "manual-demo-replay"
  }'
```

---

## Prepaid Test Session

The seed script creates a user with an already-active subscription, a completed assessment, and a **stable demo session token**. Use these to test both masked and full result paths without running through the funnel.

```
PAID_TEST_TOKEN         = seed-demo-token-0000000000000000000000000000000000000000000000000000000000000000
PAID_TEST_ASSESSMENT_ID = ef0e9e76-0322-45af-89cc-f4b785c7b264
```

**Compare masked vs full result:**

```bash
API="https://api.betterme.yesterhaze.codes"
AID="ef0e9e76-0322-45af-89cc-f4b785c7b264"
TOKEN="seed-demo-token-0000000000000000000000000000000000000000000000000000000000000000"

# Member (paid) — returns daily_calorie_intake + target_date
curl "$API/api/v1/assessments/$AID/result" -H "authorization: Bearer $TOKEN"

# Non-member — create a SINGLE fresh session, capture token + assessmentId from that one response
NEW_RESP=$(curl -s -X POST "$API/api/v1/assessments")
NEW=$(echo "$NEW_RESP" | jq -r '.assessmentId')
NEW_TOKEN=$(echo "$NEW_RESP" | jq -r '.token')
# fill funnel steps + submit
curl -s -X PATCH "$API/api/v1/assessments/$NEW" \
  -H "content-type: application/json" -H "authorization: Bearer $NEW_TOKEN" \
  -d '{"gender":"female","primary_goal":"lose_weight","age":28,"height_cm":165,"weight_kg":70,"target_weight_kg":75,"workout_frequency":"light","current_step":13}'
curl -s -X POST "$API/api/v1/assessments/$NEW/submit" -H "authorization: Bearer $NEW_TOKEN"
# GET result as non-member: locked === true, daily_calorie_intake is absent
curl "$API/api/v1/assessments/$NEW/result" -H "authorization: Bearer $NEW_TOKEN"
```

---

## Launch Readiness

Current status: suitable for an interviewer demo or private staging deployment. The core flow is covered by unit, integration, component, and browser E2E tests, and the backend now ships with production-grade guardrails.

**In place after the enterprise hardening pass:**

| Area | Implementation |
|---|---|
| Auth | Capability token (opaque, unguessable, 30-day expiry, revocable) sent as `Authorization: Bearer`; token is never a resource id and never returned in payloads |
| API surface | Versioned under `/api/v1`; machine-readable OpenAPI 3.1 + Swagger UI at `/api/v1/docs`, generated from the Zod contracts |
| Observability | Structured JSON logging (pino), per-request `X-Request-Id`, one request log line each, and full server-side logging of unexpected 5xx (previously silent) |
| Abuse controls | Per-IP rate limiting (general + stricter on create/pay), 16 KB request-body cap |
| CORS | Explicit allow-list; production **refuses to boot** without `WEB_ORIGIN` (no wildcard fallback) |
| Validation | Every invalid field returned at once (`error.fields`), not just the first |
| Compliance | `DELETE /assessments/:id` erases an assessment and its derived data (GDPR right-to-erasure) |
| Delivery | Reproducible `apps/api/Dockerfile`; CI runs lint, typecheck, API build, tests, dependency audit, and a core-algorithm coverage gate; Dependabot for npm + Actions |

**Roadmap before a real public launch:**

| Area | Production requirement |
|---|---|
| Payment | Stripe/Creem/Paddle Checkout, signed webhook verification, refund/cancel states, provider reconciliation (currently a mock `/pay`) |
| Auth identity | A real login/identity provider if the product needs accounts beyond anonymous sessions |
| Concurrency | Optimistic locking (`version` column) if disjoint-field last-write-wins is ever insufficient — the `GREATEST(current_step)` guard already covers the real race |
| Data lifecycle | Scheduled cleanup of abandoned assessments / expired sessions (a `scripts/cleanup-abandoned.ts` job driven by the platform scheduler) |
| Error tracking | External tracker (Sentry) wired into the existing logger hook; DB backup/restore playbook |
| Medical safety | Stronger disclaimers, contraindication screening, escalation copy for unsafe inputs |

The current demo deployment uses Supabase Postgres + Railway API + Cloudflare Pages frontend, with `VITE_API_BASE=https://api.betterme.yesterhaze.codes` and `WEB_ORIGIN=https://betterme-4j4.pages.dev,https://betterme.yesterhaze.codes`.

---

## Deployment

### Supabase (Database)

1. Create a free Supabase project at [supabase.com](https://supabase.com).
2. Note your **Connection Pooling** URL (port 6543 for Prisma + pooling) and **Direct** URL (port 5432 for migrations).
3. Create a `test` schema in your Supabase project for test isolation:
   ```sql
   CREATE SCHEMA IF NOT EXISTS test;
   ```
4. Run migrations against `public`:
   ```bash
   pnpm --filter @betterme/api exec prisma migrate deploy
   ```
5. Seed demo data:
   ```bash
   pnpm --filter @betterme/api db:seed
   ```

---

### Backend — Railway Node Host

Current production API: `https://api.betterme.yesterhaze.codes`.

The Railway service uses the root `railway.json`:

- Build command: `pnpm install --frozen-lockfile && pnpm --filter @betterme/api exec prisma generate`
- Pre-deploy command: `pnpm --filter @betterme/api exec prisma migrate deploy`
- Start command: `pnpm --filter @betterme/api start`
- Health check: `/api/health`
- Readiness check: `/api/ready`

Required Railway variables:

```bash
DATABASE_URL=postgresql://...pooler.supabase.com:5432/postgres?schema=public&sslmode=require
DIRECT_URL=postgresql://...pooler.supabase.com:5432/postgres?schema=public&sslmode=require
WEB_ORIGIN=https://betterme-4j4.pages.dev,https://betterme.yesterhaze.codes
NODE_ENV=production
```

Deploy from the repository root:

```bash
railway deployment up --service api --environment production
```

Health and readiness checks:

```bash
curl https://api.betterme.yesterhaze.codes/api/health
curl https://api.betterme.yesterhaze.codes/api/ready
```

---

### Backend — Docker (portable alternative)

A reproducible image is provided at `apps/api/Dockerfile` (build from the repo root):

```bash
docker build -f apps/api/Dockerfile -t betterme-api .
docker run -p 8787:8787 \
  -e DATABASE_URL=... -e DIRECT_URL=... -e WEB_ORIGIN=... \
  betterme-api
```

> Migrations are applied by the platform's pre-deploy step (`prisma migrate deploy`), not at container start.

---

### Frontend — Cloudflare Pages

> **Requires your Cloudflare account.**

**Option A — Cloudflare Dashboard (easiest):**
1. Go to [Cloudflare Pages](https://pages.cloudflare.com) → Create project → Connect to Git.
2. Select your repository.
3. Set:
   - **Framework preset:** None
   - **Build command:** `pnpm --filter @betterme/web build`
   - **Build output directory:** `apps/web/dist`
4. Add environment variable: `VITE_API_BASE=https://api.betterme.yesterhaze.codes` (set at **build time** — Vite bakes this into the bundle)
5. Add the custom domain `betterme.yesterhaze.codes`.
6. On the backend, keep `WEB_ORIGIN=https://betterme-4j4.pages.dev,https://betterme.yesterhaze.codes`.
7. Deploy.

**Option B — Wrangler CLI:**
```bash
# After wrangler login
VITE_API_BASE=https://api.betterme.yesterhaze.codes pnpm --filter @betterme/web build
npx wrangler pages project create betterme --production-branch main
npx wrangler pages deploy apps/web/dist --project-name betterme
```

See `apps/web/wrangler.toml` for reference build settings.

---

## Test Coverage

### What is covered and why

| Scenario | Test type | File | Why |
|---|---|---|---|
| BMI formula, boundary BMI categories (18.5, 25, 30) | Unit | `shared/tests/health.spec.ts` | Core algorithm must be correct; boundaries are the most likely mistake |
| Mifflin-St Jeor calories — male vs female, goal deficit/surplus | Unit | same | Algorithm branch coverage |
| Target-date at 0.5 kg/week, delta=0 returns today | Unit | same | Regression guard for date arithmetic |
| Zod schema ranges and target-weight direction flexibility | Unit | `shared/tests/schemas.spec.ts` | Schema is the API contract — invalid ranges are rejected while lose/gain/maintain targets can move in either direction |
| Create assessment → step save → progress recovery | Integration | `api/tests/integration/assessment-flow.spec.ts` | Core persistence loop |
| Out-of-order PATCH (step 2 then step 1) | Integration | same | Real-world user behaviour: browser back button, duplicate requests |
| Stale save after newer save does not regress `current_step` | Integration | same | Prevents slow network responses from moving a user backward |
| Concurrent PATCH requests merge fields and keep the highest `current_step` | Integration | same | Proves the persistence layer handles overlapping saves instead of only sequential requests |
| Duplicate PATCH (same step twice) | Integration | same | Idempotency requirement |
| Invalid field value → 400 | Integration | same | Error path coverage |
| Validation returns every offending field | Integration | same | `error.fields` lists all failures, not just the first |
| Missing / invalid / expired token → 401 | Integration | same | Capability-token auth: unauthenticated and stale tokens are rejected |
| Cross-user access with a valid but foreign token → 403 | Integration | same | Authorization must be tested, not just documented |
| Create response never leaks `userId` | Integration | same | Token is the only credential; resource-owner id stays server-side |
| Delete assessment + derived data (GDPR) → 204, then 404 | Integration | same | Right-to-erasure path removes payments, result, and assessment |
| Non-existent assessment → 404 | Integration | same | Standard error paths |
| Submit computes + persists correct BMI | Integration | `api/tests/integration/submit.spec.ts` | Verifies algorithm is actually called and result stored |
| Submit with incomplete data → 400 | Integration | same | Guards against submitting before all fields are filled |
| Submit accepts target weight above current weight | Integration | same | Guards the supported gain/reshape path and prevents old direction-lock regressions |
| Non-member result: locked fields absent | Integration | `api/tests/integration/auth-diff.spec.ts` | Masking is a security requirement — absence must be asserted, not just presence of `locked:true` |
| /pay unlocks → full result appears | Integration | same | End-to-end subscription state machine |
| Repeated /pay is idempotent | Integration | same | Prevents duplicate demo activation from rewriting subscription metadata |
| Mock payment record is stored once per checkout attempt | Integration | same | Keeps simulated payment close to real provider semantics: payment row, provider ref, amount, currency, idempotency |
| /pay rejects assessment owner mismatch | Integration | same | Prevents one user from unlocking against another user's assessment |
| /pay without a token → 401 | Integration | same | Payment requires an authenticated session |
| Session localStorage round-trip | Component | `web/tests/session.spec.ts` | session.ts is used by every API call |
| Funnel starts with Pilates interest, auto-advances choices, and asks body data one field at a time | Component | `web/tests/funnel.spec.tsx` | Guards the low-pressure UX for the 5-stage flow |
| Result page: pending generation, local preview, pay → full result | Component | `web/tests/result.spec.tsx` | Validates the slow-backend fallback, masked local preview, and backend-confirmed unlock flow |
| Local payment flags cannot reveal full paid fields | Component | same | Ensures paid result data renders only after the backend confirms `member:true` |
| Result restart clears local demo state | Component | same | Makes repeated interviewer demos deterministic |
| Health disclaimer stays visible with results | Component | same | Keeps the medical boundary explicit |
| Full funnel → masked → pay → unlock | E2E (Playwright) | `web/e2e/funnel.e2e.ts` | Only a real browser test proves the complete stack works together |

### What is intentionally NOT covered and why

| Not covered | Reason |
|---|---|
| Real payment processing | Out of scope — `/pay` is a mock callback. A real integration would require a payment provider sandbox and test cards. |
| Real user authentication / login | The system uses anonymous capability tokens (opaque token in `localStorage`, `sessions` row with expiry). A full identity provider (OAuth, account login) is out of scope for an anonymous funnel. |
| Load testing | No k6/Artillery-style throughput test — beyond the 3-day challenge scope. The key stale-save race is covered by integration tests. |
| Playwright tests in CI | E2E tests require two live servers and a seeded DB. CI runs unit + integration only; E2E is run manually or in a dedicated staging environment. |
