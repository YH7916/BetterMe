# API Reference — BetterMe 健康测评

Reference for BetterMe's HTTP API. Business endpoints are versioned under `/api/v1`; operational endpoints live at `/api`.

The **authoritative, always-current contract** is the machine-generated OpenAPI spec:

- Swagger UI: [`/api/v1/docs`](https://api.betterme.yesterhaze.codes/api/v1/docs)
- Raw spec: [`/api/v1/openapi.json`](https://api.betterme.yesterhaze.codes/api/v1/openapi.json)

For per-endpoint request/response examples see the root [README.md](../../README.md#api-documentation). This file documents the cross-cutting rules (base URL, health, auth, errors) once, so they do not drift across three places.

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
{ "status": "ok", "checks": { "database": "ok" }, "latency_ms": 23 }
```

**Response 503:**
```json
{ "status": "error", "checks": { "database": "error" }, "latency_ms": 10001 }
```

The scheduled production monitor uses `/api/ready` before running the full funnel smoke test.

---

## Authentication

Protected endpoints use a **capability token**. `POST /api/v1/assessments` mints an opaque, unguessable session token (backed by a `sessions` row with a 30-day expiry) and returns it as `token`. Clients send it on every subsequent request:

```
Authorization: Bearer <token>
```

The auth middleware resolves the token to a user id server-side. The token is distinct from any resource id and is **never** returned inside resource payloads. There is no JWT and no cookie — appropriate for an anonymous quiz funnel with no login, while remaining expiring and revocable. Ownership is then enforced per resource (a valid token for user A cannot read user B's assessment → 403).

---

## Unified Error Shape

```json
{
  "error": { "code": "STRING_CODE", "message": "Human-readable description" },
  "request_id": "b1c9…"
}
```

Validation errors additionally include `error.fields: [{ "path": "age", "message": "…" }]` listing **every** invalid field, not just the first. The `request_id` echoes the `X-Request-Id` and correlates the response with the server log line.

| HTTP status | When |
|---|---|
| 400 | Body fails Zod validation (`code: VALIDATION_ERROR`) or assessment data is incomplete for submit (`code: INCOMPLETE`) |
| 401 | Missing, invalid, or expired bearer token (`code: UNAUTHORIZED`) |
| 403 | Token is valid but does not own the target resource (`code: FORBIDDEN`) |
| 404 | Resource does not exist (`code: NOT_FOUND`) |
| 429 | Rate limit exceeded (per-IP) |
| 503 | Readiness check failed |
| 500 | Unexpected server error (`code: INTERNAL`) — full error is logged server-side with the `request_id` |

---

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | None | Liveness |
| GET | `/api/ready` | None | Readiness (DB) |
| POST | `/api/v1/assessments` | None | Create anonymous session + assessment, issue token |
| GET | `/api/v1/assessments/:id` | Bearer | Recover progress |
| PATCH | `/api/v1/assessments/:id` | Bearer | Incremental step save |
| POST | `/api/v1/assessments/:id/submit` | Bearer | Compute + persist result |
| GET | `/api/v1/assessments/:id/result` | Bearer | Result (masked vs full by subscription) |
| DELETE | `/api/v1/assessments/:id` | Bearer | Delete assessment + derived data (GDPR) |
| POST | `/api/v1/pay` | Bearer | Mock payment callback → activate subscription |

Full request bodies, response shapes, and `cURL` examples: root [README.md](../../README.md#api-documentation) or the live [Swagger UI](https://api.betterme.yesterhaze.codes/api/v1/docs).
