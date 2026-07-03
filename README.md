# BetterMe 健康测评系统

[![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)](https://github.com/<owner>/<repo>/actions/workflows/ci.yml)

> **Note:** Replace `<owner>/<repo>` in the badge URL above with your GitHub username/org and repository name after pushing.

A full-stack health assessment quiz funnel inspired by the BetterMe challenge. Users step through a guided form, the backend persists progress for recovery, computes a personalised health plan server-side, and returns differentiated results based on subscription status (free users see a masked teaser; members get the full plan). A mock `/pay` endpoint simulates a payment callback that unlocks the full result.

Design document: [`docs/superpowers/specs/2026-07-02-health-assessment-backend-design.md`](docs/superpowers/specs/2026-07-02-health-assessment-backend-design.md)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cloudflare Pages                                                   │
│  apps/web  (Vite + React + React Router)                            │
│  – 4-step funnel, auto-save, progress recovery, result + paywall    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  /api/*  (Vite dev proxy / VITE_API_BASE)
┌───────────────────────────────▼─────────────────────────────────────┐
│  Node host (Render / Railway) — RECOMMENDED                         │
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
| Backend | Hono 4 + Node.js 20 + TypeScript (`strict: true`) |
| ORM | Prisma 5 + Supabase Postgres |
| Shared | Zod 3 contracts + health algorithm pure functions |
| Unit/Integration Tests | Vitest 2 |
| Frontend Component Tests | Vitest 2 + React Testing Library |
| E2E Tests | Playwright |
| CI | GitHub Actions |
| Frontend Deploy | Cloudflare Pages |
| Backend Deploy | Render / Railway (Node — recommended) or Cloudflare Workers (optional) |

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

- Node.js >= 20 (`node -v`)
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
| `packages/shared` | Vitest | 30 unit tests — algorithm boundaries (BMI, calories, target-date) + Zod schema validation |
| `apps/api` | Vitest | 16 integration tests against the `test` Supabase schema |
| `apps/web` | Vitest + RTL | 4 component tests (session, funnel, result page) |

### E2E tests (Playwright)

```bash
pnpm --filter @betterme/web e2e
```

Requires both dev servers running (or Playwright auto-starts them via `webServer` in `playwright.config.ts`).
Covers the complete funnel → submit → masked result → pay → full result unlock flow.

### CI badge

![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)

> After pushing to GitHub, replace `<owner>/<repo>` with your actual values. CI runs typecheck + all Vitest tests against a `postgres:16` service container.

---

## API Documentation

All endpoints are prefixed with `/api`. Authentication uses the `x-user-id` header (a UUID returned by `POST /assessments` and stored in `localStorage`). No cookies, no JWT.

Unified error body: `{ "error": { "code": "string", "message": "string" } }`

### Endpoints

| # | Method | Path | Auth | Description |
|---|---|---|---|---|
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

**Validation ranges:** age 13–120, height_cm 50–260, weight_kg 20–500, target_weight_kg 20–500, current_step 0–10.

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

**Errors:** `400 INCOMPLETE` (missing required fields), `403 FORBIDDEN`, `404 NOT_FOUND`

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
    "target_date": "2026-06-01",
    "algorithm_version": "v1"
  }
}
```

The fields `daily_calorie_intake` and `target_date` are **never** sent to non-members — they are stripped in `lib/serializers.ts` on the server before the response is built.

**Errors:** `403 FORBIDDEN`, `404 NOT_FOUND` (result not yet computed — call /submit first)

---

### 6. POST /api/pay

Simulates a payment callback that activates the user's subscription. The `x-user-id` header **must equal** `body.userId` — a mismatch returns 403.

**Request body:**
```json
{
  "userId": "8404579c-776a-44ec-a2fe-74389b54bcc1",
  "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264"
}
```

**Response 200:**
```json
{ "status": "active" }
```

**Errors:** `400 VALIDATION_ERROR` (invalid UUID), `403 FORBIDDEN` (x-user-id ≠ body.userId), `404 NOT_FOUND` (user has no subscription row)

---

### /pay cURL example

```bash
API="http://localhost:8787"

curl -X POST "$API/api/pay" \
  -H "content-type: application/json" \
  -H "x-user-id: 8404579c-776a-44ec-a2fe-74389b54bcc1" \
  -d '{
    "userId": "8404579c-776a-44ec-a2fe-74389b54bcc1",
    "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264"
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
API="http://localhost:8787"
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
  -d '{"gender":"female","primary_goal":"lose_weight","age":28,"height_cm":165,"weight_kg":70,"target_weight_kg":60,"workout_frequency":"light","current_step":4}'
curl -s -X POST "$API/api/assessments/$NEW/submit" -H "x-user-id: $NEW_UID"
# GET result as non-member: locked === true, daily_calorie_intake is absent
curl "$API/api/assessments/$NEW/result" -H "x-user-id: $NEW_UID"
```

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

### Backend — Node Host (RECOMMENDED)

Render and Railway both offer a free tier that runs the existing `apps/api/src/server.ts` entry with zero Prisma changes. This is the recommended path for reliability.

#### Render (example)

> **Requires your Render account.**

1. Create a new **Web Service** in the Render dashboard.
2. Connect your GitHub repository.
3. Set:
   - **Root directory:** `apps/api`
   - **Build command:** `pnpm install && pnpm --filter @betterme/api exec prisma generate`
   - **Start command:** `node --loader tsx src/server.ts`
   - **Node version:** 20
4. Add environment variables in Render's dashboard:
   - `DATABASE_URL` — Supabase pooler URL (`?schema=public`)
   - `DIRECT_URL` — Supabase direct URL
5. Deploy. Note your public URL (e.g. `https://betterme-api.onrender.com`).
6. Health check: `curl https://betterme-api.onrender.com/api/health`

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
4. Add environment variable: `VITE_API_BASE` = `https://your-backend-url`
5. Deploy.

**Option B — Wrangler CLI:**
```bash
# After wrangler login
pnpm --filter @betterme/web build
npx wrangler pages project create betterme-web
npx wrangler pages deploy apps/web/dist --project-name betterme-web \
  --env VITE_API_BASE=https://your-backend-url
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
| Zod schema ranges (height, age, enum, type coercion) | Unit | `shared/tests/schemas.spec.ts` | Schema is the API contract — invalid values must be rejected at the boundary |
| Create assessment → step save → progress recovery | Integration | `api/tests/integration/assessment-flow.spec.ts` | Core persistence loop |
| Out-of-order PATCH (step 2 then step 1) | Integration | same | Real-world user behaviour: browser back button, duplicate requests |
| Duplicate PATCH (same step twice) | Integration | same | Idempotency requirement |
| Invalid field value → 400 | Integration | same | Error path coverage |
| Cross-user access → 403 | Integration | same | Authorization must be tested, not just documented |
| Non-existent assessment → 404 | Integration | same | Standard error paths |
| Submit computes + persists correct BMI | Integration | `api/tests/integration/submit.spec.ts` | Verifies algorithm is actually called and result stored |
| Submit with incomplete data → 400 | Integration | same | Guards against submitting before all fields are filled |
| Non-member result: locked fields absent | Integration | `api/tests/integration/auth-diff.spec.ts` | Masking is a security requirement — absence must be asserted, not just presence of `locked:true` |
| /pay unlocks → full result appears | Integration | same | End-to-end subscription state machine |
| Session localStorage round-trip | Component | `web/tests/session.spec.ts` | session.ts is used by every API call |
| Funnel renders gender step, saves on Next | Component | `web/tests/funnel.spec.tsx` | Smoke test for the most critical user-facing path |
| Result page: paywall visible, pay → full result | Component | `web/tests/result.spec.tsx` | Validates the pay-to-unlock UI flow |
| Full funnel → masked → pay → unlock | E2E (Playwright) | `web/e2e/funnel.e2e.ts` | Only a real browser test proves the complete stack works together |

### What is intentionally NOT covered and why

| Not covered | Reason |
|---|---|
| Real payment processing | Out of scope — `/pay` is a mock callback. A real integration would require a payment provider sandbox and test cards. |
| Real user authentication / login | The system uses anonymous sessions (UUID in localStorage). A real auth system (OAuth, JWT rotation) is explicitly out of scope per the challenge spec. |
| Load / concurrency testing | No explicit concurrency test — Postgres transactions handle it; adding a load test would require a separate tool (k6, Artillery) and is beyond the 3-day challenge scope. |
| Playwright tests in CI | E2E tests require two live servers and a seeded DB. CI runs unit + integration only; E2E is run manually or in a dedicated staging environment. |
| Workers-path integration tests | The Cloudflare Workers deployment path (worker.ts + Prisma adapter) is intentionally not tested in the main suite to avoid coupling the test path to the adapter. |
