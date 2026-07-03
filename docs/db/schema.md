# Database Schema — BetterMe 健康测评

## ER Diagram

```mermaid
erDiagram
    users {
        uuid id PK
        timestamp created_at
        timestamp updated_at
    }

    assessments {
        uuid id PK
        uuid user_id FK
        enum gender "male | female"
        enum primary_goal "lose_weight | gain_muscle | maintain"
        int age
        numeric height_cm
        numeric weight_kg
        numeric target_weight_kg
        enum workout_frequency "sedentary | light | moderate | active"
        int current_step
        enum status "in_progress | completed"
        timestamp created_at
        timestamp updated_at
    }

    assessment_results {
        uuid id PK
        uuid assessment_id FK
        numeric bmi
        enum bmi_category "underweight | normal | overweight | obese"
        int daily_calorie_intake
        date target_date
        text algorithm_version
        timestamp created_at
    }

    subscriptions {
        uuid id PK
        uuid user_id FK
        enum status "inactive | active"
        text plan "nullable"
        timestamp activated_at "nullable"
        text payment_ref "nullable"
    }

    users ||--o{ assessments : "has"
    assessments ||--o| assessment_results : "produces"
    users ||--o| subscriptions : "owns"
```

---

## Relationships

| Relationship | Cardinality | Notes |
|---|---|---|
| users → assessments | 1 : many | A user can start multiple assessments (abandoned sessions). Each assessment is independent. |
| assessments → assessment_results | 1 : 0..1 | A result only exists after `POST /submit` succeeds. The `assessment_id` FK is `UNIQUE`, enforcing at most one result per assessment. |
| users → subscriptions | 1 : 0..1 | Every user gets a `subscriptions` row on creation (status `inactive`). `POST /pay` updates it to `active`. `user_id` FK is `UNIQUE`. |

---

## Field Rationale

### users

Intentionally minimal. The system uses anonymous sessions — there is no email, password, or display name. `id` is a server-generated UUID returned to the frontend for subsequent requests. `created_at` / `updated_at` are standard audit timestamps managed by Prisma.

### assessments

Assessment data is stored incrementally via `PATCH` requests. Fields are nullable so the row can be created (and owned) before any data is entered. `current_step` (int) enables reliable progress recovery: the frontend can resume at exactly the right step by reading this value. `status` tracks whether the submission algorithm has been run; it gates the result endpoint's 404 vs 200 behaviour. Storing raw inputs separately from computed outputs (`assessment_results`) means the algorithm can be re-run with a different version without modifying the user's data.

### assessment_results

Stores computed outputs only — no raw user inputs. The `algorithm_version` field (`"v1"`) allows future algorithm changes to be tracked; old results remain queryable with their original version. `bmi` is stored as `numeric` (Prisma `Decimal`) for precision. `target_date` is stored as a `DATE` column (no time component) since precision beyond day-of-week is meaningless at 0.5 kg/week granularity. The 1:1 `UNIQUE` constraint on `assessment_id` means upsert semantics are available: submit can be called again (e.g. after a data correction) and the result is recomputed in place.

### subscriptions

One row per user, created at user creation with `status = inactive`. This avoids a nullable join in the result query: `subscriptionRepo.findByUser()` always returns a row and the service just checks `status === 'active'`. Nullable fields (`plan`, `activated_at`, `payment_ref`) are set by `/pay` and can be extended for real payment provider data (e.g. Stripe `payment_intent_id`) without a migration.

---

## Indexes

| Table | Column | Type | Reason |
|---|---|---|---|
| assessments | user_id | Non-unique index (`@@index`) | `requireOwnership` middleware looks up an assessment by `id` and then verifies `userId` — this covers the FK join for ownership checks |
| assessment_results | assessment_id | Unique index (from `@unique`) | Enforces 1:1 constraint and makes `findUnique({ where: { assessmentId } })` efficient |
| subscriptions | user_id | Unique index (from `@unique`) | Enforces 1:1 constraint and makes `findUnique({ where: { userId } })` efficient |
