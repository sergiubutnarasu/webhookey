# Security Remediation Plan

Derived from the security audit conducted on 2026-04-09.
Issues are ordered by priority (Critical → High → Medium → Low).

---

## Critical

### SEC-01 — Hard-coded salt in EncryptionService
**File:** `apps/server/src/encryption/encryption.service.ts`
**Problem:** `scryptSync(masterKey, 'salt', 32)` uses a constant string as salt, making the derived key deterministic and weakening the KDF.
**Fix:** Store a random 32-byte salt alongside each ciphertext (prefix to the encrypted value). On decrypt, split off the salt and re-derive the key. Existing encrypted values (channel secrets) will need a one-time migration.

### SEC-02 — Webhooks without a secret are auto-verified
**File:** `apps/server/src/hooks/hooks.service.ts`
**Problem:** If `channel.encryptedSecret` is null, `verified` is set to `true` without any validation.
**Fix:** Set `verified = false` when no secret is configured. Update the `WebhookEvent` schema to reflect this.

### SEC-03 — Rate-limit check uses stale `lastPolledAt`
**File:** `apps/server/src/auth/auth.service.ts` — `pollToken()`
**Problem:** `lastPolledAt` is written to the DB before the slow-down check. The check reads the pre-update in-memory record, so rapid polling is never actually throttled.
**Fix:** Move the rate-limit check before the `update`, using the value already in `record.lastPolledAt`.

### SEC-04 — No rate limiting on auth endpoints
**File:** `apps/server/src/auth/auth.controller.ts`
**Problem:** `/auth/login`, `/auth/signup`, `/auth/refresh`, `/auth/device` have no throttling.
**Fix:** Install `@nestjs/throttler`, configure a `ThrottlerModule` in `AppModule`, and apply `@Throttle()` to all auth endpoints. Use stricter limits on login/refresh (e.g. 10 req/min per IP).

### SEC-05 — Hard-coded DB credentials in compose.yml
**File:** `compose.yml`
**Problem:** `POSTGRES_PASSWORD: postgres` is committed to source control.
**Fix:** Move to a `.env` file (already gitignored) and reference via `${POSTGRES_PASSWORD}`. Document required env vars in README.

---

## High

### SEC-06 — No input validation on auth endpoints
**File:** `apps/server/src/auth/auth.controller.ts`
**Problem:** Email, password, and name are accepted as raw strings with no format, length, or complexity checks.
**Fix:** Create `SignupDto` and `LoginDto` with `class-validator` decorators (`@IsEmail()`, `@MinLength(8)`, `@MaxLength(128)`, `@IsString()`). Use `@Body() dto: SignupDto` in controllers.

### SEC-07 — ValidationPipe not configured with whitelist
**File:** `apps/server/src/app.module.ts`
**Problem:** Extra fields sent in request bodies pass through to services.
**Fix:**
```typescript
useValue: new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
})
```

### SEC-08 — No bounds on `page`/`limit` query params
**File:** `apps/server/src/channels/channels.controller.ts`
**Problem:** No validation — a caller can request `limit=999999`.
**Fix:** Use `ParseIntPipe` and cap: `Math.min(parseInt(limit) || 20, 100)`.

### SEC-09 — No request body size limit
**File:** `apps/server/src/main.ts`
**Problem:** No body size cap, enabling DoS via large payloads.
**Fix:** Add `app.use(express.json({ limit: '1mb' }))` before other middleware. Webhook payloads may need a slightly higher limit — configure separately.

### SEC-10 — Error responses expose internal details
**File:** `apps/server/src/common/filters/http-exception.filter.ts`
**Problem:** `exception.name` and `path` are included in all responses, leaking internals in production.
**Fix:** Only include verbose error info when `process.env.NODE_ENV !== 'production'`.

### SEC-11 — Refresh token sent as Bearer in CLI
**File:** `apps/cli/src/lib/api.ts`
**Problem:** Refresh token sent in `Authorization: Bearer` header, which gets logged by proxies and CDNs.
**Fix:** Send refresh token in JSON request body only: `{ refresh_token: token }`.

### SEC-12 — Logout doesn't require authentication
**File:** `apps/server/src/auth/auth.controller.ts`
**Problem:** Any caller who knows a refresh token string can revoke it, without proving they own it.
**Fix:** Add `@UseGuards(JwtAuthGuard)` to the logout endpoint and derive the refresh token from the authenticated user's context or cookie rather than an arbitrary body param.

---

## Medium

### SEC-13 — Email enumeration on signup
**File:** `apps/server/src/auth/auth.service.ts` / `auth.controller.ts`
**Problem:** Returning `409` on duplicate email lets attackers enumerate registered accounts.
**Fix:** Return `201` with a generic message regardless. Send a "this email is already registered" notice via email instead.

### SEC-14 — Expired refresh tokens not cleaned up
**File:** `apps/server/src/auth/auth.service.ts`
**Problem:** Expired tokens accumulate in the DB indefinitely.
**Fix:** Extend the existing `DeviceCleanupService` pattern to also purge `RefreshToken` records where `expiresAt < now`.

### SEC-15 — SSE subscriber map has no size bounds
**File:** `apps/server/src/hooks/hooks.gateway.ts`
**Problem:** The `subscribers` Map can grow unbounded if clients disconnect ungracefully.
**Fix:** Add a max-subscribers-per-channel cap and ensure cleanup on connection close/error.

### SEC-16 — CSRF exposure
**File:** `apps/server/src/auth/auth.controller.ts`
**Problem:** POST endpoints lack CSRF tokens. `SameSite=strict` cookies provide partial mitigation.
**Fix:** Verify `Origin` / `Referer` header against `BASE_URL` for state-changing requests, or implement double-submit cookie pattern.

### SEC-17 — Sensitive data potentially in request logs
**File:** `apps/server/src/common/interceptors/logging.interceptor.ts`
**Problem:** Full URL path is logged — may include channel slugs or IDs in structured logs.
**Fix:** Sanitize by stripping path param values, or log only the route template (e.g. `/channels/:id`).

---

## Low

### SEC-18 — `console.log` in main.ts
**File:** `apps/server/src/main.ts`
**Fix:** Replace with `new Logger('Bootstrap').log(...)`.

### SEC-19 — `any` types on request objects
**Files:** `auth.controller.ts`, `hooks.controller.ts`, etc.
**Fix:** Define a typed `AuthenticatedRequest` interface extending `Request` with `user: { id: string; email: string }`.

### SEC-20 — HSTS not explicitly configured
**File:** `apps/server/src/main.ts`
**Fix:** `app.use(helmet({ hsts: { maxAge: 31536000, includeSubDomains: true } }))` in production.

---

## Implementation Order

1. SEC-03 (rate-limit logic bug — 5 min fix, no migration)
2. SEC-07 (ValidationPipe whitelist — 5 min, no migration)
3. SEC-04 (throttler — install + configure)
4. SEC-06 (auth DTOs)
5. SEC-08 (query param bounds)
6. SEC-09 (request size limit)
7. SEC-10 (error filter cleanup)
8. SEC-12 (logout auth guard)
9. SEC-11 (CLI refresh token transport)
10. SEC-02 (webhook auto-verify — behaviour change)
11. SEC-01 (encryption salt — requires DB migration)
12. SEC-05 (compose credentials)
13. SEC-13 through SEC-20 (medium/low)
