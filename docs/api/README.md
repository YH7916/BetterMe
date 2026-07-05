# API Reference — BetterMe 健康测评

Full reference for BetterMe's `/api` endpoints. For a quick summary table see the root [README.md](../../README.md#api-documentation).

---

## Base URL

| Environment | URL |
|---|---|
| Local dev | `http://localhost:8787` |
| Production (Railway Node host) | `https://api.betterme.yesterhaze.codes` |

---

## Operational Health

### GET /api/health

Liveness check. Returns 200 when the API process can accept requests.

```json
{ "status": "ok" }
```

### GET /api/ready

Readiness check. Returns 200 only when the API can query Postgres.

**Response 200:**
```json
{
  "status": "ok",
  "checks": {
    "database": "ok"
  },
  "latency_ms": 23
}
```

**Response 503:**
```json
{
  "status": "error",
  "checks": {
    "database": "error"
  },
  "latency_ms": 10001
}
```

The scheduled production monitor uses `/api/ready` before running the full funnel smoke test.

---

## Authentication

All protected endpoints read the caller's identity from the `x-user-id` request header. This header must be a valid UUID returned by `POST /api/assessments` and stored by the frontend in `localStorage`.

There is no JWT, no cookie, and no session server. The pattern is intentionally minimal for the challenge demo: this is an anonymous quiz funnel, not a production user account system.

---

## Unified Error Shape

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human-readable description"
  }
}
```

| HTTP status | When |
|---|---|
| 400 | Body fails Zod validation (`code: VALIDATION_ERROR`) or assessment data is incomplete for submit (`code: INCOMPLETE`) |
| 403 | `x-user-id` header does not match the resource owner (`code: FORBIDDEN`) |
| 404 | Resource does not exist (`code: NOT_FOUND`) |
| 503 | Readiness check failed |
| 500 | Unexpected server error (`code: INTERNAL`) |

---

## Endpoints

### 1. POST /api/assessments

Creates a new anonymous `User` row (with a default `inactive` `Subscription`) and a new `Assessment` row in a single transaction. No request body required.

**Request:**
```http
POST /api/assessments HTTP/1.1
Content-Type: application/json
```

**Response 201:**
```json
{
  "userId": "8404579c-776a-44ec-a2fe-74389b54bcc1",
  "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264",
  "currentStep": 0
}
```

The frontend stores `userId` and `assessmentId` in `localStorage` (keys `bm_user_id` / `bm_assessment_id`) and attaches `x-user-id: <userId>` to all subsequent requests.

---

### 2. GET /api/assessments/:id

Fetches the current state of an assessment for progress recovery. The `requireOwnership` middleware verifies `x-user-id` matches `assessment.user_id` before the controller runs.

**Request:**
```http
GET /api/assessments/ef0e9e76-0322-45af-89cc-f4b785c7b264 HTTP/1.1
x-user-id: 8404579c-776a-44ec-a2fe-74389b54bcc1
```

**Response 200:**
```json
{
  "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264",
  "userId": "8404579c-776a-44ec-a2fe-74389b54bcc1",
  "gender": "female",
  "primary_goal": "lose_weight",
  "age": 28,
  "height_cm": 165.0,
  "weight_kg": 70.0,
  "target_weight_kg": 60.0,
  "workout_frequency": "light",
  "current_step": 3,
  "status": "in_progress"
}
```

Fields not yet set by the user are `null`. The frontend uses `current_step` to jump directly to the right step.

**Errors:** `403`, `404`

---

### 3. PATCH /api/assessments/:id

Incrementally saves one or more fields. The body is validated against `stepUpdateSchema` (a `.partial()` Zod schema that allows any subset of the assessment fields). Fields not present in the body are left unchanged.

The `current_step` field should be included in every PATCH to keep the server in sync with the frontend's active step index. The backend stores it monotonically with `GREATEST(current_step, incoming_step)`, so stale saves cannot move progress backward.

**Request:**
```http
PATCH /api/assessments/ef0e9e76-0322-45af-89cc-f4b785c7b264 HTTP/1.1
Content-Type: application/json
x-user-id: 8404579c-776a-44ec-a2fe-74389b54bcc1

{
  "gender": "female",
  "current_step": 1
}
```

**Field validation (applied via `stepUpdateSchema`):**

| Field | Type | Constraint |
|---|---|---|
| `gender` | `"male" \| "female"` | Enum |
| `primary_goal` | `"lose_weight" \| "gain_muscle" \| "maintain"` | Enum |
| `age` | integer | 13–120 |
| `height_cm` | number | 50–260 |
| `weight_kg` | number | 20–500 |
| `target_weight_kg` | number | 20–500 |
| `workout_frequency` | `"sedentary" \| "light" \| "moderate" \| "active"` | Enum |
| `current_step` | integer | 0–2147483647 (database int storage bound, not a questionnaire-step cap) |

`target_weight_kg` may be above, below, or equal to `weight_kg`. The API validates the number range only; the frontend/result copy is responsible for interpreting whether the user is aiming to lose weight, gain weight, maintain, or reshape.

**Response 200:** updated progress object (same shape as GET /api/assessments/:id).

**Errors:** `400 VALIDATION_ERROR` (out of range, wrong type, unknown enum value), `403`, `404`

---

### 4. POST /api/assessments/:id/submit

Triggers the server-side health algorithm. Reads all stored assessment fields, validates them against `submitSchema` (all fields required), computes results, and persists an `assessment_result` row. Marks the assessment `completed`.

**Algorithm details:**

```
BMI = weight_kg / (height_cm / 100)²

BMR (Mifflin-St Jeor):
  male:   10×weight + 6.25×height - 5×age + 5
  female: 10×weight + 6.25×height - 5×age - 161

TDEE = BMR × activity_factor
  sedentary: 1.2  |  light: 1.375  |  moderate: 1.55  |  active: 1.725

daily_calorie_intake = round(TDEE + goal_adjust)
  lose_weight: -500  |  gain_muscle: +500  |  maintain: 0

target_date = today + round(|weight_kg - target_weight_kg| / 0.5) × 7 days
  (returns today if delta is 0)
```

**Request:**
```http
POST /api/assessments/ef0e9e76-0322-45af-89cc-f4b785c7b264/submit HTTP/1.1
x-user-id: 8404579c-776a-44ec-a2fe-74389b54bcc1
```

No body required — data comes from the stored assessment. `submitSchema` re-validates all required fields and numeric ranges before computing the result.

**Response 200:**
```json
{ "status": "completed" }
```

**Errors:** `400 INCOMPLETE` (missing required fields or invalid numeric values in stored assessment), `403`, `404`

---

### 5. GET /api/assessments/:id/result

Returns the computed health result. Shape is differentiated by the caller's subscription status, determined by looking up their `subscriptions` row.

**Request:**
```http
GET /api/assessments/ef0e9e76-0322-45af-89cc-f4b785c7b264/result HTTP/1.1
x-user-id: 8404579c-776a-44ec-a2fe-74389b54bcc1
```

**Response 200 — non-member (`subscription.status = inactive`):**
```json
{
  "member": false,
  "result": {
    "bmi": 25.71,
    "bmi_category": "overweight",
    "locked": true,
    "message": "升级会员查看每日建议摄入与目标达成日期"
  }
}
```

**Response 200 — member (`subscription.status = active`):**
```json
{
  "member": true,
  "result": {
    "bmi": 25.71,
    "bmi_category": "overweight",
    "daily_calorie_intake": 1680,
    "target_date": "<computed YYYY-MM-DD>",
    "algorithm_version": "v1"
  }
}
```

**Masking guarantee:** `daily_calorie_intake` and `target_date` are filtered in `apps/api/src/lib/serializers.ts` — they are never included in the response object for non-members, not just hidden in the UI.

**Errors:** `403`, `404 NOT_FOUND` (submit has not been called yet — there is no result row)

---

### 6. POST /api/pay

Simulates a successful checkout callback that activates the caller's subscription. It is still a mock provider, but the flow mirrors a production payment integration: the API verifies caller ownership, records a payment row with amount/currency/provider metadata, uses an idempotency key to prevent duplicate charges, and activates the subscription in the same transaction.

The `x-user-id` header is verified against `body.userId`, and `body.assessmentId` must belong to the same user. This prevents one user from unlocking another user's subscription or paying against another user's assessment.

**Request:**
```http
POST /api/pay HTTP/1.1
Content-Type: application/json
x-user-id: 8404579c-776a-44ec-a2fe-74389b54bcc1

{
  "userId": "8404579c-776a-44ec-a2fe-74389b54bcc1",
  "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264",
  "idempotencyKey": "checkout_attempt_1"
}
```

The `assessmentId` field is required by `paySchema` (Zod) and is checked against assessment ownership before the subscription is activated. `idempotencyKey` is optional; if omitted, the server derives a stable key from the current user and assessment.

The endpoint is idempotent for an already-active subscription: repeated calls return `{ "status": "active" }` with the existing succeeded payment and do not rewrite `payment_ref` or `activated_at`.

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

**After a successful /pay call**, the next call to `GET /api/assessments/:id/result` returns the full (unmasked) result. The frontend does not trust local payment flags for full paid data; paid fields render only after the backend returns `member: true`.

**Errors:**
- `400 VALIDATION_ERROR` — `userId` or `assessmentId` is not a valid UUID
- `400 IDEMPOTENCY_CONFLICT` — an idempotency key is reused for another checkout
- `403 FORBIDDEN` — `x-user-id` header does not equal `body.userId`, or `assessmentId` belongs to another user
- `404 NOT_FOUND` — no subscription row exists for this user, or the assessment does not exist

---

## Prepaid Demo Session

The seed script (`apps/api/prisma/seed.ts`) creates a user with an already-active subscription and a completed assessment for immediate testing.

```
PAID_TEST_USER_ID       = 8404579c-776a-44ec-a2fe-74389b54bcc1
PAID_TEST_ASSESSMENT_ID = ef0e9e76-0322-45af-89cc-f4b785c7b264
```

These IDs are in the `public` schema. The integration test `resetDb()` only clears the `test` schema, so these credentials survive test runs.

**Get full (member) result:**
```bash
curl https://api.betterme.yesterhaze.codes/api/assessments/ef0e9e76-0322-45af-89cc-f4b785c7b264/result \
  -H "x-user-id: 8404579c-776a-44ec-a2fe-74389b54bcc1"
```

**Replay /pay (calling /pay when already active succeeds and keeps the existing activation metadata unchanged):**
```bash
curl -X POST https://api.betterme.yesterhaze.codes/api/pay \
  -H "content-type: application/json" \
  -H "x-user-id: 8404579c-776a-44ec-a2fe-74389b54bcc1" \
  -d '{
    "userId": "8404579c-776a-44ec-a2fe-74389b54bcc1",
    "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264",
    "idempotencyKey": "manual-demo-replay"
  }'
```
