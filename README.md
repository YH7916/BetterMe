# BetterMe 健康测评系统

[![CI](https://github.com/YH7916/BetterMe/actions/workflows/ci.yml/badge.svg)](https://github.com/YH7916/BetterMe/actions/workflows/ci.yml)

A full-stack health assessment quiz funnel inspired by the BetterMe challenge. Users step through a guided form, the backend persists progress for recovery, computes a personalised health plan server-side, and returns differentiated results based on subscription status (free users see a masked teaser; members get the full plan). A mock `/pay` endpoint simulates a production-style checkout callback with payment records, idempotency, and subscription activation.

Design document: [`docs/superpowers/specs/2026-07-02-health-assessment-backend-design.md`](docs/superpowers/specs/2026-07-02-health-assessment-backend-design.md)

---

## Live Delivery

| Item | URL / Value |
|---|---|
| Frontend demo | https://betterme.yesterhaze.codes |
| Frontend fallback | https://betterme-4j4.pages.dev |
| API dashboard | https://api.betterme.yesterhaze.codes |
| Backend API base | https://api.betterme.yesterhaze.codes/api |
| Health check | https://api.betterme.yesterhaze.codes/api/health |
| Readiness check | https://api.betterme.yesterhaze.codes/api/ready |
| GitHub repository | https://github.com/YH7916/BetterMe |
| CI | https://github.com/YH7916/BetterMe/actions/workflows/ci.yml |
| Production monitor | https://github.com/YH7916/BetterMe/actions/workflows/monitor.yml |

Production paid demo credentials:

```bash
PAID_TEST_USER_ID=8404579c-776a-44ec-a2fe-74389b54bcc1
PAID_TEST_ASSESSMENT_ID=ef0e9e76-0322-45af-89cc-f4b785c7b264
```

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
│  routes → middlewares → controllers → services → repositories       │
│  Optionally: Cloudflare Workers via src/worker.ts (see §Deployment) │
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
│   │   │   ├── server.ts     # Node HTTP entry (primary)
│   │   │   └── worker.ts     # Cloudflare Workers entry (optional)
│   │   ├── tests/integration/
│   │   ├── wrangler.toml     # Workers optional config
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
│   ├── api/README.md         # Full API reference with example JSON
│   ├── db/schema.md          # Mermaid ER diagram + field rationale
│   ├── AI-REVIEW.md          # AI usage retrospective
│   └── superpowers/specs/    # Design doc
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
- mock unlock path: `/api/pay` -> full member result
- seeded paid demo session still returns member-only fields

---

## API Documentation

All endpoints are prefixed with `/api`. Demo authentication uses the `x-user-id` header (a UUID returned by `POST /assessments` and stored in `localStorage`). No cookies, no JWT. This is intentionally simple for the challenge; production auth should replace it before a real launch.

Unified error body: `{ "error": { "code": "string", "message": "string" } }`

### Endpoints

| # | Method | Path | Auth | Description |
|---|---|---|---|---|
| 0 | GET | `/api/health` | None | Liveness check: API process responds |
| 0 | GET | `/api/ready` | None | Readiness check: API can query Postgres |
| 1 | POST | `/api/assessments` | None | Create anonymous user + assessment |
| 2 | GET | `/api/assessments/:id` | x-user-id (ownership) | Recover progress |
| 3 | PATCH | `/api/assessments/:id` | x-user-id (ownership) | Incremental step save |
| 4 | POST | `/api/assessments/:id/submit` | x-user-id (ownership) | Compute + persist result |
| 5 | GET | `/api/assessments/:id/result` | x-user-id (ownership + subscription) | Fetch result (masked vs full) |
| 6 | POST | `/api/pay` | x-user-id must equal body.userId | Activate subscription |

---

### 1. POST /api/assessments

Creates a new anonymous user and assessment. No body required.

**Response 201:**
```json
{
  "userId": "8404579c-776a-44ec-a2fe-74389b54bcc1",
  "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264",
  "currentStep": 0
}
```

---

### 2. GET /api/assessments/:id

Returns current progress for resume. Requires `x-user-id` header matching the assessment owner.

**Response 200:**
```json
{
  "assessmentId": "ef0e9e76-...",
  "userId": "8404579c-...",
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

**Errors:** `403 FORBIDDEN` (wrong x-user-id), `404 NOT_FOUND`

---

### 3. PATCH /api/assessments/:id

Saves one or more fields incrementally. All fields are optional (partial update). Each field is validated against the shared Zod schema — invalid values return 400.

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

**Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 NOT_FOUND`

---

### 4. POST /api/assessments/:id/submit

Triggers server-side health algorithm using the stored assessment fields. All fields must be present (validated via `submitSchema`) or returns 400. Persists an `assessment_result` row and marks assessment `completed`.

**Algorithm:** BMI (Quetelet) → Mifflin-St Jeor BMR × activity factor → ±500 kcal goal adjust → target date at 0.5 kg/week.

**Response 200:**
```json
{ "status": "completed" }
```

**Errors:** `400 INCOMPLETE` (missing required fields or invalid numeric values), `403 FORBIDDEN`, `404 NOT_FOUND`

---

### 5. GET /api/assessments/:id/result

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

**Errors:** `403 FORBIDDEN`, `404 NOT_FOUND` (result not yet computed — call /submit first)

---

### 6. POST /api/pay

Simulates a successful checkout callback that activates the user's subscription. It is still a mock provider, but the flow mirrors a production payment integration: the backend verifies ownership, records a payment row with provider metadata, uses an idempotency key to prevent duplicate charges, and activates the subscription in the same transaction.

The `x-user-id` header **must equal** `body.userId`, and `body.assessmentId` must belong to that same user — a mismatch returns 403.

The endpoint is idempotent for an already-active subscription: repeated calls return `active` with the existing succeeded payment, without rewriting the original activation timestamp or payment reference.

**Request body:**
```json
{
  "userId": "8404579c-776a-44ec-a2fe-74389b54bcc1",
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

**Errors:** `400 VALIDATION_ERROR` (invalid UUID), `400 IDEMPOTENCY_CONFLICT` (key reused for another checkout), `403 FORBIDDEN` (x-user-id ≠ body.userId or assessment owner mismatch), `404 NOT_FOUND` (user/subscription/assessment not found)

---

### /pay cURL example

```bash
API="https://api.betterme.yesterhaze.codes"

curl -X POST "$API/api/pay" \
  -H "content-type: application/json" \
  -H "x-user-id: 8404579c-776a-44ec-a2fe-74389b54bcc1" \
  -d '{
    "userId": "8404579c-776a-44ec-a2fe-74389b54bcc1",
    "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264",
    "idempotencyKey": "manual-demo-replay"
  }'
```

---

## Prepaid Test Session

The seed script creates a user with an already-active subscription and a completed assessment. Use these IDs to test both masked and full result paths without running through the funnel.

```
PAID_TEST_USER_ID     = 8404579c-776a-44ec-a2fe-74389b54bcc1
PAID_TEST_ASSESSMENT_ID = ef0e9e76-0322-45af-89cc-f4b785c7b264
```

**Compare masked vs full result:**

```bash
API="https://api.betterme.yesterhaze.codes"
AID="ef0e9e76-0322-45af-89cc-f4b785c7b264"
UID="8404579c-776a-44ec-a2fe-74389b54bcc1"

# Member (paid) — returns daily_calorie_intake + target_date
curl "$API/api/assessments/$AID/result" -H "x-user-id: $UID"

# Non-member — create a SINGLE fresh session, capture both IDs from that one response
NEW_RESP=$(curl -s -X POST "$API/api/assessments")
NEW=$(echo "$NEW_RESP" | jq -r '.assessmentId')
NEW_UID=$(echo "$NEW_RESP" | jq -r '.userId')
# fill funnel steps + submit
curl -s -X PATCH "$API/api/assessments/$NEW" \
  -H "content-type: application/json" -H "x-user-id: $NEW_UID" \
  -d '{"gender":"female","primary_goal":"lose_weight","age":28,"height_cm":165,"weight_kg":70,"target_weight_kg":75,"workout_frequency":"light","current_step":13}'
curl -s -X POST "$API/api/assessments/$NEW/submit" -H "x-user-id: $NEW_UID"
# GET result as non-member: locked === true, daily_calorie_intake is absent
curl "$API/api/assessments/$NEW/result" -H "x-user-id: $NEW_UID"
```

---

## Launch Readiness

Current status: suitable for an interviewer demo or private staging deployment. The core flow is covered by unit, integration, component, and browser E2E tests.

Before a real public launch:

| Area | Current demo implementation | Production requirement |
|---|---|---|
| Auth | Anonymous UUID in `localStorage` + `x-user-id` | Real auth provider, token validation, session expiry, user deletion/export path |
| Payment | Mock `/api/pay` provider with payment records, idempotency key, amount/currency/status, transactional subscription activation | Stripe/Creem/Paddle Checkout, signed webhook verification, refund/cancel states, provider reconciliation |
| Medical safety | BMI/calorie estimate + health disclaimer | Stronger disclaimers, contraindication screening, escalation copy for unsafe inputs |
| Operations | Local logs + GitHub CI | Request logging, error tracking, uptime checks, DB backup/restore playbook |
| Abuse/rate limits | Ownership checks + validation | API rate limiting and bot protection |

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

### Backend — Cloudflare Workers (OPTIONAL ALTERNATIVE)

> **Requires your Cloudflare account and `wrangler login`.**

Workers deployment requires additional Prisma configuration (driver adapter). See `apps/api/wrangler.toml` for the complete step-by-step notes.

**Summary of extra steps:**
1. Add `previewFeatures = ["driverAdapters"]` to `schema.prisma` generator.
2. `pnpm --filter @betterme/api add @prisma/adapter-pg pg`
3. Update `apps/api/src/lib/prisma.ts` to use `PrismaPg` adapter with the Supabase pooler (`:6543`).
4. Set secrets: `wrangler secret put DATABASE_URL` and `wrangler secret put DIRECT_URL`.
5. `pnpm --filter @betterme/api exec wrangler deploy`

> The Node-host path is recommended because it avoids adapter complexity and keeps the test suite running against exactly the same code path.

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
| Cross-user access → 403 | Integration | same | Authorization must be tested, not just documented |
| Non-existent assessment → 404 | Integration | same | Standard error paths |
| Submit computes + persists correct BMI | Integration | `api/tests/integration/submit.spec.ts` | Verifies algorithm is actually called and result stored |
| Submit with incomplete data → 400 | Integration | same | Guards against submitting before all fields are filled |
| Submit accepts target weight above current weight | Integration | same | Guards the supported gain/reshape path and prevents old direction-lock regressions |
| Non-member result: locked fields absent | Integration | `api/tests/integration/auth-diff.spec.ts` | Masking is a security requirement — absence must be asserted, not just presence of `locked:true` |
| /pay unlocks → full result appears | Integration | same | End-to-end subscription state machine |
| Repeated /pay is idempotent | Integration | same | Prevents duplicate demo activation from rewriting subscription metadata |
| Mock payment record is stored once per checkout attempt | Integration | same | Keeps simulated payment close to real provider semantics: payment row, provider ref, amount, currency, idempotency |
| /pay rejects assessment owner mismatch | Integration | same | Prevents one user from unlocking against another user's assessment |
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
| Real user authentication / login | The system uses anonymous sessions (UUID in localStorage). A real auth system (OAuth, JWT rotation) is explicitly out of scope per the challenge spec. |
| Load testing | No k6/Artillery-style throughput test — beyond the 3-day challenge scope. The key stale-save race is covered by integration tests. |
| Playwright tests in CI | E2E tests require two live servers and a seeded DB. CI runs unit + integration only; E2E is run manually or in a dedicated staging environment. |
| Workers-path integration tests | The Cloudflare Workers deployment path (worker.ts + Prisma adapter) is intentionally not tested in the main suite to avoid coupling the test path to the adapter. |
