# AI Usage Retrospective — BetterMe 健康测评

> This document is a required deliverable for the 【睿迄科技】全栈开发 3 天挑战. It covers how AI assistance was used during the build, and — more importantly — where developer judgment overrode AI suggestions and why.

> **Note (post-challenge):** the repo later went through an enterprise-hardening pass. Some specifics below describe the original 3-day build — most notably the auth model, which was `x-user-id` then and is now an opaque capability token (`Authorization: Bearer`, backed by a `sessions` table). The reasoning captured here still holds; only the concrete mechanism evolved. See the root README for the current state.

---

## How AI Was Used

### Database Modeling

The initial schema design came from the challenge brief and a domain analysis of BetterMe-style quiz funnels. AI was used to sanity-check the table layout — specifically to challenge the decision to store raw inputs (`assessments`) separately from computed outputs (`assessment_results`) rather than writing computed fields back into the assessments table.

The AI confirmed that separating raw data from derived data is the correct pattern: it allows the algorithm to be re-run (e.g. when `algorithm_version` changes) without touching user-provided data. It also suggested adding `algorithm_version` to `assessment_results` as a forward-compatibility field, which was incorporated.

AI also suggested generating the Prisma schema from the plain-English table descriptions, which saved time on boilerplate. The output was reviewed field-by-field before committing — notably the `Decimal` vs `Float` choice for `bmi`/`height_cm`/`weight_kg` was kept as `Decimal` (more appropriate for health data than floating-point).

### Mock / Seed Data

The seed file was co-authored with AI. The key constraint given to the AI was: _the seed must be idempotent and must not interfere with test isolation_. AI initially suggested a `deleteMany` / `createMany` pattern (i.e. clear-and-repopulate). This was rejected (see §Override (a) below) in favour of a deterministic approach using fixed, documented UUIDs.

The seed defines two top-level constants:
```ts
const PAID_USER_ID = '8404579c-776a-44ec-a2fe-74389b54bcc1';
const PAID_ASSESSMENT_ID = 'ef0e9e76-0322-45af-89cc-f4b785c7b264';
```

The idempotency guard uses `prisma.user.findUnique({ where: { id: PAID_USER_ID } })`. If the row is found, the seed prints the two IDs and exits without creating anything. On a blank database, the user and assessment are created with those exact IDs as explicit `id` values.

This means the documented cURL examples and README credentials are stable: a fresh `db:seed` on any self-hosted Supabase project produces the same IDs every time. The live `public` schema already contains these rows, so re-running `db:seed` is always a no-op (finds existing → exits).

### Complex Logic: Health Algorithm

The Mifflin-St Jeor formula is well-documented but has several tricky details: the sex constant offset (+5 for male, -161 for female), the activity multiplier table, and the goal-adjust step. AI was used to draft the initial implementation of `calcDailyCalories` in `packages/shared/src/health/calorie.ts`.

The AI-generated draft was correct for the happy path but did not handle:
- Integer rounding of the final calorie value (`Math.round`) — important so the API returns `1680` not `1679.6...`
- The `GOAL_ADJUST` lookup being a separate constant vs inline arithmetic

Both were refined before the tests were written. The boundary test suite (`packages/shared/tests/health.spec.ts`) was partially AI-generated — AI was prompted with "write edge cases for a BMI calculator" and produced the zero-height throw test and the 18.5/25 boundary assertions, which were directly useful.

### Test Generation and Boundary Cases

AI was heavily used to expand the test suite beyond the obvious happy-path assertions. Specifically:
- The "out-of-order PATCH" test (step 2 saved before step 1) was suggested by AI after being asked "what are realistic browser navigation scenarios that could break a step-save flow?"
- The "duplicate PATCH" idempotency test came from the same prompt.
- The 403 cross-user access test structure was AI-suggested, though the specific assertion (`expect(res.status).toBe(403)` on a real ownership check) was refined manually.
- For the masking test, AI initially proposed asserting `body.result.daily_calorie_intake === undefined` only. The more rigorous assertion (also checking `target_date` is absent and `locked === true` is present) was a manual addition.

---

## Three Times I Overrode the AI

### (a) Test isolation: the `deleteMany()` wipe problem

**What AI suggested:** When the integration test scaffolding was drafted in Tasks 6–9, the plan's `resetDb()` helper used:
```ts
await prisma.assessmentResult.deleteMany();
await prisma.assessment.deleteMany();
await prisma.subscription.deleteMany();
await prisma.user.deleteMany();
```
This was the AI's natural "clear the slate before each test" pattern — and it _would_ work in a local test database. The problem: the plan described running these tests against the same Supabase project that holds the demo seed data (with the prepaid `PAID_TEST_USER_ID` and `PAID_TEST_ASSESSMENT_ID`). A `deleteMany()` with no `where` clause would cascade-delete all rows in the `public` schema, wiping the seed on the first test run.

**Why I overrode it:** The seed data is a delivery requirement — the evaluator needs to call `GET /api/assessments/ef0e9e76.../result` with the prepaid credentials and see a full member result. If tests wipe the seed, the delivery is broken in a way that is invisible at commit time but devastating at evaluation time.

**What I did instead (T5b):** Introduced a dedicated `test` schema in Supabase. The `apps/api/.env.test` file points `DATABASE_URL` at `?schema=test`, and `vitest.config.ts` loads `.env.test` before any test runs. `resetDb()` calls `deleteMany()` freely — but against the `test` schema, which has zero seed data. The `public` schema's seed rows are completely isolated and survive the entire test suite. CI also uses its own throwaway Postgres service, so there was never a risk there.

This was caught before a single integration test was committed. The override required writing a setup script (`scripts/setup-test-schema.ts`), adding `dotenv` loading to `vitest.config.ts`, and documenting the two-schema setup in the README.

---

### (b) The /pay authorization gap

**What AI suggested:** The initial `paymentController` implementation (drafted in Task 9) read `userId` directly from the request body and called `subscriptionService.pay(userId)`:
```ts
async pay(c: Context) {
  const { userId } = c.get('body') as PayRequest;
  return c.json(await subscriptionService.pay(userId));
}
```
This was a textbook authorization bug: any caller who knew another user's UUID could POST `{ userId: <victim>, assessmentId: <any> }` and activate the victim's subscription (or in a real system, charge their payment method).

**Why I overrode it:** The `x-user-id` header is the caller's identity. The body's `userId` is a request parameter. If those two differ, the request is either a cross-user attack or a client bug — either way it must be rejected. The AI's draft had no check between the two.

**What I did instead (T9 fix):** Added a guard in the controller:
```ts
const callerUserId = c.req.header('x-user-id');
const { userId } = c.get('body') as PayRequest;
if (!callerUserId || callerUserId !== userId) {
  throw AppError.forbidden('userId mismatch');
}
```
This was also covered by an integration test asserting that a PATCH with a mismatched header returns 403. The fix was identified during the post-T9 code review pass before any commit was made.

---

### (c) Weakening the E2E masking assertion

**What AI suggested (instinct, not explicit output):** During Task 13 E2E development, the Playwright assertion for the masked (non-member) result page:
```ts
await expect(page.getByText(/每日建议摄入|daily/i)).not.toBeVisible();
```
was "failing" in a way that suggested the masked content was leaking. The immediate instinct (reinforced by an AI suggestion to "make the selector more flexible") was to weaken the assertion — e.g. look for the numeric calorie value instead, or remove the negative assertion entirely.

**Why I investigated instead of weakening:** A failing negative assertion means either (a) the masking is broken — a real bug — or (b) the assertion selector is matching something it shouldn't. Weakening it would mask a real bug if (a) was true.

**What I found:** The `Paywall` component's teaser copy contained the phrase `"升级会员查看每日建议摄入量与目标达成日期"` — which matched `/每日建议摄入/i`. The payload's `daily_calorie_intake` field was correctly absent from the API response. The masking was working; the selector was too broad.

**What I did instead (T13):** Changed the discriminating assertion to check for the calorie _value_ (`kcal`) rather than the label text:
```ts
// Masked: the kcal value is absent
await expect(page.getByText(/\d{3,4}\s*kcal/)).not.toBeVisible();
// Full: after pay, kcal value appears
await expect(page.getByText(/1680\s*kcal/)).toBeVisible();
```
This made the assertion precise: it now tests the actual secret data (the numeric value), not UI copy that the frontend is allowed to show to everyone. The masking guarantee is now rigorously verified by the E2E test, not just by the integration test suite.

---

## Summary

AI accelerated the boilerplate (Prisma schema, seed structure, formula implementation, test scaffolding) significantly — probably saving 4–6 hours across the 3-day build. But every AI output was reviewed before being committed, and the three overrides above represent cases where that review caught errors that would have been costly:

- Override (a) would have silently destroyed the delivery demo data.
- Override (b) introduced an authorization vulnerability that would have failed any security review.
- Override (c) would have hidden a real masking bug behind a weakened test.

The pattern that worked: use AI to draft, use tests and code review to verify, and be willing to investigate before weakening an assertion.
