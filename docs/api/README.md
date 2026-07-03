# API Reference — BetterMe 健康测评

Full reference for all six `/api` endpoints. For a quick summary table see the root [README.md](../../README.md#api-documentation).

---

## Base URL

| Environment | URL |
|---|---|
| Local dev | `http://localhost:8787` |
| Production (Node host) | `https://<your-render-or-railway-url>` |
| Production (Workers) | `https://betterme-api.<subdomain>.workers.dev` |

---

## Authentication

All protected endpoints read the caller's identity from the `x-user-id` request header. This header must be a valid UUID returned by `POST /api/assessments` and stored by the frontend in `localStorage`.

There is no JWT, no cookie, and no session server. The pattern is intentionally minimal: this is an anonymous quiz funnel, not a user account system.

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

The `current_step` field should be included in every PATCH to keep the server in sync with the frontend's active step index.

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
| `current_step` | integer | 0–10 |

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

No body required — data comes from the stored assessment.

**Response 200:**
```json
{ "status": "completed" }
```

**Errors:** `400 INCOMPLETE` (missing required fields in stored assessment), `403`, `404`

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
    "target_date": "2026-06-01",
    "algorithm_version": "v1"
  }
}
```

**Masking guarantee:** `daily_calorie_intake` and `target_date` are filtered in `apps/api/src/lib/serializers.ts` — they are never included in the response object for non-members, not just hidden in the UI.

**Errors:** `403`, `404 NOT_FOUND` (submit has not been called yet — there is no result row)

---

### 6. POST /api/pay

Simulates a payment callback that activates the caller's subscription. The `x-user-id` header is verified against `body.userId` in the controller — they must match. This prevents one user from unlocking another user's subscription.

**Request:**
```http
POST /api/pay HTTP/1.1
Content-Type: application/json
x-user-id: 8404579c-776a-44ec-a2fe-74389b54bcc1

{
  "userId": "8404579c-776a-44ec-a2fe-74389b54bcc1",
  "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264"
}
```

The `assessmentId` field is required by `paySchema` (Zod) for future extensibility (per-assessment subscriptions). Currently only `userId` is used to activate the subscription.

**Response 200:**
```json
{ "status": "active" }
```

**After a successful /pay call**, the next call to `GET /api/assessments/:id/result` returns the full (unmasked) result.

**Errors:**
- `400 VALIDATION_ERROR` — `userId` or `assessmentId` is not a valid UUID
- `403 FORBIDDEN` — `x-user-id` header does not equal `body.userId`
- `404 NOT_FOUND` — no subscription row exists for this user (the user was not created via `POST /api/assessments`)

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
curl http://localhost:8787/api/assessments/ef0e9e76-0322-45af-89cc-f4b785c7b264/result \
  -H "x-user-id: 8404579c-776a-44ec-a2fe-74389b54bcc1"
```

**Replay /pay (calling /pay when already active succeeds — re-sets the same active state — but it is a plain `update`, not an upsert):**
```bash
curl -X POST http://localhost:8787/api/pay \
  -H "content-type: application/json" \
  -H "x-user-id: 8404579c-776a-44ec-a2fe-74389b54bcc1" \
  -d '{
    "userId": "8404579c-776a-44ec-a2fe-74389b54bcc1",
    "assessmentId": "ef0e9e76-0322-45af-89cc-f4b785c7b264"
  }'
```
