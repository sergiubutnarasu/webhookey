# webhookey — Local Webhook Proxy via SSE

**Branch:** `feat/webhookey-initial`
**Description:** Build a self-hosted webhook proxy with SSE streaming, HMAC verification, device login flow, and a CLI/dashboard for managing channels.

## Goal
webhookey lets users receive webhooks from external platforms (GitHub, Stripe, etc.) on their local machine by streaming events over SSE to a CLI that executes arbitrary shell commands. It improves on smee.io by adding HMAC signature verification, OAuth 2.0 Device Login Flow, and command execution instead of HTTP forwarding.

## Engineering Principles
All code across the monorepo must follow **SOLID principles**:
- **S**ingle Responsibility — each class/module has one reason to change (e.g. `EncryptionService` only encrypts, `ChannelsService` only manages channel logic)
- **O**pen/Closed — extend behavior via interfaces and DI, not by modifying existing classes
- **L**iskov Substitution — use interfaces for services so implementations can be swapped (e.g. `IChannelRepository`)
- **I**nterface Segregation — define narrow, role-specific interfaces rather than large monolithic ones
- **D**ependency Inversion — depend on abstractions (interfaces) injected via NestJS DI, not concrete implementations

## Testing Requirements
**Every file must have a corresponding test file.** No code is considered done without tests.

| Scope | Tool | Where |
|---|---|---|
| Unit tests | **Vitest** | `packages/*`, `apps/cli` |
| Unit + integration tests (server) | **Jest** + `@nestjs/testing` | `apps/server` |
| API / HTTP integration tests | **supertest** | `apps/server` |
| E2E / component tests (web) | **Playwright** | `apps/web` |
| CLI command tests | **oclif test helpers** + Vitest | `apps/cli` |

- Test files co-located with source: `foo.service.ts` → `foo.service.spec.ts`
- E2E tests live in `apps/server/test/` and `apps/web/e2e/`
- Critical E2E flows: full device login flow, channel create/delete, webhook receive → SSE delivery, CLI listen → command exec
- `turbo.json` `test` pipeline runs across all apps/packages before any build

---

## Implementation Steps

### Step 1: Monorepo Scaffolding
**Files:**
- `package.json` (root)
- `.yarnrc.yml`
- `turbo.json`
- `apps/server/` — NestJS skeleton
- `apps/web/` — Next.js skeleton
- `apps/cli/` — oclif skeleton
- `packages/types/` — shared TypeScript types
- `packages/crypto/` — HMAC utilities
- `packages/config/` — shared `tsconfig.base.json`, `eslint` config

**What:** Initialize the Turborepo monorepo with yarn workspaces. Scaffold each app with its framework defaults. Set up shared packages with proper `workspace:*` references. Configure `turbo.json` pipeline for `build`, `dev`, `lint`, `test`. Set `"engines": { "node": ">=18" }` in the root `package.json` — the project requires Node 18+ (first LTS with stable global `fetch`, relied on by the Docker healthcheck); Yarn will print a warning if a developer's local Node.js version is too old.

**Testing:** `yarn install` succeeds, `yarn dev` starts server + web in parallel, `yarn build` compiles all packages in dependency order.

---

### Step 2: Shared Packages — `types`, `crypto`, and `config`
**Files:**
- `packages/types/src/index.ts` — `Channel`, `WebhookEvent`, `DeviceCodeResponse`, `TokenResponse`, `SseEvent` (`{ verified: boolean; payload: unknown }` — the shape of each event emitted over SSE and consumed by the CLI `listen` command to decide whether to execute the user's command)
- `packages/crypto/src/index.ts` — `generateSecret()`, `verifyHmac()`, `generateDeviceCode()`, `generateUserCode()` (`generateSlug()` is **not** here — channel slugs are UUIDs produced by Prisma `@default(uuid())`, not by this package)
- `packages/crypto/src/interfaces/crypto.interface.ts` — `ICryptoService` interface:
  ```typescript
  interface ICryptoService {
    generateSecret(): string;
    verifyHmac(payload: Buffer, secret: string, signature: string): boolean;
    generateDeviceCode(): string;
    generateUserCode(): string;
  }
  ```
  The server-side `HooksService` (for `verifyHmac()`), `ChannelsService` (for `generateSecret()`), and `AuthService` (for `generateDeviceCode()` and `generateUserCode()`) all depend on this interface, enabling unit tests to mock it without importing native `crypto` bindings (SOLID: dependency inversion). The concrete implementation lives in the server at `apps/server/src/crypto/crypto.service.ts` (a `@Injectable()` class wrapping the pure functions from `@webhookey/crypto`) and is provided by `apps/server/src/crypto/crypto.module.ts` — decorated with `@Global()` and exporting `CryptoService` as the `ICryptoService` token, so `AuthModule`, `ChannelsModule`, and `HooksModule` do not each need to import `CryptoModule` explicitly
- `packages/config/tsconfig.base.json` — base TypeScript compiler options extended by all apps and packages
- `packages/config/.eslintrc.base.js` — shared ESLint rules (TypeScript, import ordering) extended by each workspace

**Type shapes:**
- `Channel` — `{ id, slug, name, webhookUrl, retentionDays: number | null, createdAt }`
- `WebhookEvent` — `{ id, verified: boolean, status: 'pending' | 'delivered' | 'failed', createdAt }` — `channelId` is intentionally omitted; events are always fetched in the context of a channel URL so including the FK in the client type would be redundant
- `DeviceCodeResponse` — `{ device_code, user_code, verification_uri, expires_in: number, interval: number }`
- `TokenResponse` — `{ access_token: string, refresh_token: string }`
- `SseEvent` — `{ verified: boolean; payload: unknown }` (already defined above)

**What:** Define all shared TypeScript interfaces/types used across server, web, and CLI. Implement HMAC utilities using Node's built-in `crypto` module with `timingSafeEqual` for constant-time comparison. All utilities are pure functions with no framework dependencies. `packages/config` contains no runtime code — only tooling config files consumed via `"extends"` in each workspace's `tsconfig.json` and `.eslintrc.js`.

**Testing:** Unit tests for `verifyHmac` (valid sig, tampered payload, wrong secret), `generateSecret` (sufficient entropy, URL-safe output), `generateUserCode` (format: `XXXX-XXXX`, no ambiguous chars), `generateDeviceCode` (sufficient entropy, URL-safe). `packages/config` has no runtime code and requires no test file.

---

### Step 3: NestJS — Database Schema + Prisma Setup
**Files:**
- `apps/server/prisma/schema.prisma` — `User`, `Channel`, `WebhookEvent`, `DeviceCode`, `RefreshToken` models
- `apps/server/prisma/seed.ts` — sample user and channel for local development
- `apps/server/src/prisma/prisma.service.ts`
- `apps/server/src/prisma/prisma.module.ts` — decorated with `@Global()` and exports `PrismaService`; marking it global means `AuthModule`, `ChannelsModule`, `HooksModule`, and cron services can all inject `PrismaService` without each module explicitly importing `PrismaModule`
- `apps/server/src/encryption/encryption.service.ts` — AES-256-GCM encrypt/decrypt using `MASTER_KEY`
- `apps/server/src/encryption/encryption.module.ts` — exports `EncryptionService` so it can be injected into `ChannelsModule` and `HooksModule` via NestJS DI; without this module NestJS cannot resolve the `EncryptionService` dependency
- `apps/server/src/crypto/crypto.service.ts` — `@Injectable()` concrete implementation of `ICryptoService`; wraps the pure functions from `@webhookey/crypto` (`generateSecret`, `verifyHmac`, `generateDeviceCode`, `generateUserCode`); allows `HooksService`, `ChannelsService`, and `AuthService` to receive a mockable interface in tests
- `apps/server/src/crypto/crypto.module.ts` — decorated with `@Global()`, provides `CryptoService` as the `ICryptoService` injection token, and exports it; marking it global means `AuthModule`, `ChannelsModule`, and `HooksModule` can all inject `ICryptoService` without each explicitly importing `CryptoModule`. **Important:** TypeScript interfaces are erased at runtime and cannot be used directly as NestJS DI tokens — define a string constant `export const CRYPTO_SERVICE_TOKEN = 'ICryptoService'` (e.g. in `apps/server/src/crypto/crypto.tokens.ts`); `CryptoModule` registers `{ provide: CRYPTO_SERVICE_TOKEN, useClass: CryptoService }` and consuming services inject with `@Inject(CRYPTO_SERVICE_TOKEN) private readonly crypto: ICryptoService`
- `apps/server/.env.example`
- `apps/web/.env.example` — `NEXT_PUBLIC_API_URL=http://localhost:3000` (build-time variable baked into the browser JS bundle) and `INTERNAL_API_URL=http://localhost:3000` (runtime variable used by server components — same value in local dev, overridden to `http://server:3000` in Docker); both are required by `apps/web/lib/api.ts`
- `compose.yml` — PostgreSQL service

**What:** Define the Prisma schema with all five models (`User`, `Channel`, `WebhookEvent`, `DeviceCode`, `RefreshToken`). `Channel.slug` is a UUID generated via Prisma's `@default(uuid())` — globally unique, no extra dependency needed. `Channel.name` is unique per user via `@@unique([userId, name])`, enforced at the DB level. `Channel.encryptedSecret` stores the HMAC secret encrypted with AES-256-GCM; the `EncryptionService` handles encrypt/decrypt using a `MASTER_KEY` env var. `Channel.retentionDays` is nullable — `null` means keep forever, otherwise a nightly cron prunes events older than N days. `WebhookEvent` stores only `verified` (boolean) and `status` — **no payload, headers, or signature are persisted**. `WebhookEvent.channelId` has `@relation(onDelete: Cascade)` so events are automatically deleted when a channel is deleted. `DeviceCode` has `expiresAt`, `approved` boolean, `lastPolledAt` (nullable — updated on every `POST /auth/token` poll, used to enforce the `slow_down` interval), and nullable `userId`. Add indexes on `channelId + createdAt` and `DeviceCode.userCode`.

**Schema summary:**
```
User         — id, email (unique), passwordHash, name, createdAt, updatedAt
Channel      — id, slug (uuid, unique, @default(uuid())), name, encryptedSecret (String?, nullable — null when channel is created without HMAC), userId (onDelete: Cascade), retentionDays (nullable = forever), createdAt
               @@unique([userId, name])
WebhookEvent — id, channelId, verified, status (pending|delivered|failed), createdAt
               @@index([channelId, createdAt])
               channelId onDelete: Cascade
DeviceCode   — id, deviceCode (unique), userCode (unique), userId? (onDelete: SetNull), expiresAt, approved, lastPolledAt (nullable), createdAt
RefreshToken — id, token (unique), userId (onDelete: Cascade), expiresAt, createdAt
```

**Testing:** `prisma migrate dev` runs without errors, `prisma studio` shows all tables. `prisma/seed.ts` creates `User { email: 'dev@example.com', passwordHash: bcrypt.hashSync('password', 10), name: 'Dev User' }` and `Channel { name: 'my-first-webhook', userId: <created user id> }` — credentials `dev@example.com` / `password` are for local development only; the seed uses `upsert` (keyed on email / on `[userId, name]`) so it can be re-run idempotently via `prisma db seed` without duplicate-key errors. `encryption.service.ts`: unit tests for encrypt → decrypt round-trip, and that encrypt produces a different ciphertext each call (random IV). `crypto.service.ts`: unit tests confirming each method delegates to the corresponding `@webhookey/crypto` pure function and produces the expected output format.

---

### Step 4: NestJS — Application Bootstrap
**Files:**
- `apps/server/src/main.ts`
- `apps/server/src/app.module.ts`
- `apps/server/src/common/filters/http-exception.filter.ts`
- `apps/server/src/common/interceptors/logging.interceptor.ts` — logs each request's method, path, status code, and duration in milliseconds; applied globally via `APP_INTERCEPTOR` so all routes are covered without per-controller decoration
- `apps/server/src/health/health.controller.ts` — `GET /health`

**What:** Configure NestJS globally before any feature modules:
- **`ValidationPipe`** (global) with `class-validator` + `class-transformer` — reject invalid request bodies at the system boundary. Use `whitelist: true` (strip unknown properties) and `forbidNonWhitelisted: true` (reject requests with extra properties) to prevent mass-assignment attacks
- **`helmet`** — security headers on all responses
- **CORS** — two-tier policy: `POST /hooks/:slug` (public webhook receiver, called by GitHub / Stripe etc.) allows all origins without credentials; all other routes — including `GET /hooks/:slug/events` (SSE subscriber, browser dashboard) — allow only `WEB_ORIGIN` with `credentials: true`. **Scoping the wildcard-origin policy to `POST` on `/hooks/*` is critical:** `Access-Control-Allow-Origin: *` cannot be combined with `Access-Control-Allow-Credentials: true`; if `GET /hooks/:slug/events` were also wildcard-origin the browser would refuse to send the `access_token` cookie and every SSE connection would return 401. Implement via `app.enableCors((req, callback) => { if (req.url?.match(/^\/hooks\/[^/]+([?#].*)?$/)) { callback(null, { origin: '*' }) } else { callback(null, { origin: process.env.WEB_ORIGIN, allowedHeaders: ['Authorization', 'Content-Type'], credentials: true }) } })` — the regex matches `/hooks/:slug` (with optional query string) but NOT `/hooks/:slug/events`, so OPTIONS preflight for the webhook receiver correctly returns `origin: *` while the SSE endpoint retains the credentialed policy; **do not** add `&& req.method === 'POST'` to the condition — OPTIONS preflight requests also have method `OPTIONS`, so a method guard would prevent the webhook receiver's preflight from returning `origin: *`, breaking cross-origin callers. **Do not** use a `@Header('Access-Control-Allow-Origin', '*')` decorator on route handlers for this purpose: the CORS middleware intercepts OPTIONS preflight requests before they reach any controller, so a handler-level `@Header` decorator has no effect on preflight responses.
- **Raw body** — enable `rawBody: true` in `NestFactory.create()` so `POST /hooks/:slug` can access the unmodified request buffer for HMAC verification before the JSON parser modifies it. Expose as `req.rawBody` (`Buffer`).
- **`cookie-parser`** middleware — parse incoming cookies so `jwt.strategy.ts` can extract tokens from `httpOnly` cookies (web sessions) in addition to `Authorization: Bearer` headers (CLI).
- **Global `HttpExceptionFilter`** — consistent JSON error shape `{ statusCode, message, error }`
- **`@nestjs/config`** with Joi validation schema — fail fast on startup if `MASTER_KEY`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `BASE_URL`, `DATABASE_URL`, or `WEB_ORIGIN` are missing. All seven must be present in `.env.example`. Use `ConfigModule.forRoot({ isGlobal: true, validationSchema })` — the `isGlobal: true` flag makes `ConfigService` injectable in all modules without each one importing `ConfigModule`.
- **Pino logger** via `nestjs-pino` — structured JSON logs
- **`ScheduleModule.forRoot()`** — imported in `AppModule` to activate `@Cron()` decorators; without this import the nightly retention job in Step 7 silently never runs
- **`EventEmitterModule.forRoot()`** — imported in `AppModule` to register `EventEmitter2`; without this the `EventEmitter2` injection in `hooks.gateway.ts` (Step 7) fails at runtime and no SSE events are ever dispatched
- **`PrismaModule` and `CryptoModule` must be in `AppModule.imports`** — even though both are `@Global()`, a `@Global()` module still needs to be imported in exactly one root module to be bootstrapped by the NestJS IoC container; without this import the providers they export are never registered and all dependent injections fail at startup
- **`GET /health`** — returns `{ status: "ok", timestamp }`, used by Docker health check

**Testing:** Server rejects request with invalid DTO (400 with consistent error shape). `GET /health` returns 200. Server fails to start with a clear message when required env vars are absent. `POST /hooks/:slug` can read `req.rawBody` as a `Buffer` (verified in integration test). OPTIONS preflight to `POST /hooks/test-slug` returns `Access-Control-Allow-Origin: *` (no credentials). OPTIONS preflight to `GET /hooks/test-slug/events` returns `Access-Control-Allow-Origin: <WEB_ORIGIN>` and `Access-Control-Allow-Credentials: true` — verifies the SSE endpoint is NOT wildcard-origin and can therefore send cookies.

---

### Step 5: NestJS — Auth Module (Device Login Flow + JWT)
**Files:**
- `apps/server/src/auth/auth.module.ts` — imports `JwtModule.registerAsync()` (reads `JWT_SECRET` and `JWT_EXPIRES_IN` from `ConfigService`) and `PassportModule.register({ defaultStrategy: 'jwt' })`; **`JwtStrategy` must also be listed in the `providers` array** — NestJS does not auto-discover strategy classes; without this entry `passport-jwt` never registers the strategy and all `JwtAuthGuard`-protected routes return 401; without `JwtModule` the `JwtService` cannot be injected into `AuthService`
- `apps/server/src/auth/auth.controller.ts` — `POST /auth/device`, `POST /auth/token`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/activate`, `POST /auth/signup`, `POST /auth/login`, `GET /auth/me` (`GET /auth/activate` is **not** handled by NestJS — it is a Next.js page at the same path; do not add a NestJS handler or it will intercept the browser navigation before Next.js can serve it)
- `apps/server/src/auth/auth.service.ts`
- `apps/server/src/auth/jwt.strategy.ts`
- `apps/server/src/auth/jwt-auth.guard.ts`
- `apps/server/src/auth/device-cleanup.service.ts` — `@Cron('0 3 * * *')` nightly job: deletes two categories of stale `DeviceCode` rows: (1) expired and un-approved rows (`expiresAt < now AND approved = false`), and (2) approved rows where `userId IS NULL` (`approved = true AND userId IS NULL`) — these arise when the approving user is deleted after approval but before the CLI polls for tokens; `onDelete: SetNull` clears the FK so these rows can never be consumed and must be purged by this job. Auth module concern — lives here, not in ChannelsModule. **`DeviceCleanupService` must be listed in `auth.module.ts`'s `providers` array** — NestJS does not auto-discover services; without this the `@Cron` decorator never fires.

**What:** Implement the full RFC 8628 Device Authorization Grant:
1. `POST /auth/device` → creates `DeviceCode` row, returns `device_code`, `user_code`, `verification_uri`, `expires_in: 600`, `interval: 5`. Apply rate limiting (`@nestjs/throttler`) — 5 req/min per IP to prevent `DeviceCode` table flooding by unauthenticated callers.
2. `POST /auth/token` → polls by `device_code`:
   - `invalid_grant` if the `device_code` is not found in the DB (row was purged by the nightly cron because it expired un-approved, or already consumed after token issuance)
   - `expired_token` if the `device_code` exists in the DB but `expiresAt < now` (expired before the user approved)
   - `authorization_pending` while not approved
   - `slow_down` if `deviceCode.lastPolledAt !== null && Date.now() - deviceCode.lastPolledAt.getTime() < 5_000` — the server enforces the minimum `interval` of 5 s; `lastPolledAt` is updated on every `POST /auth/token` call, **including** calls that return `slow_down`. **All device-flow error codes** (`invalid_grant`, `expired_token`, `authorization_pending`, `slow_down`, `access_denied`) **are returned as HTTP 400 with body `{ "error": "<code>" }`** (per RFC 8628 §3.5)
   - Issues both `access_token` (JWT) and `refresh_token` (cryptographically random, stored in `RefreshToken` table) once `approved = true` — this is the CLI's login path and it must receive a refresh token so `api.ts` auto-refresh works after a device login. Before issuing tokens, verify that `deviceCode.userId !== null` — if the user was deleted after approving the device flow, the `onDelete: SetNull` constraint clears this FK to null; in that case return `access_denied` (the approving user no longer exists and there is no valid subject for the JWT). Immediately after issuing tokens, **delete the `DeviceCode` row** (or mark it `consumed`) to prevent a second poll from issuing a second set of tokens from the same authorization.
3. `GET /auth/activate` — **NOT a NestJS endpoint.** This is a Next.js page (Step 8). The browser navigates to this URL to enter the `user_code`; it is rendered entirely by Next.js. There must be no corresponding `GET` handler in `auth.controller.ts`.
4. `POST /auth/activate` → protected by `JwtAuthGuard` (the web user must be logged in to approve a device); validates `user_code` — returns 404 if not found, 400 if already approved or expired (`expiresAt < now`); links `DeviceCode` to the authenticated user's `userId`, sets `approved = true`. Without the guard an unauthenticated request could approve device flows for arbitrary users.
5. `POST /auth/signup` → creates a new `User` (email + password, bcrypt-hashed), then issues tokens identically to `POST /auth/login`. Returns 409 if the email is already registered (`User.email` is `@unique`). No email verification in v1.
6. `POST /auth/login` → email/password login returning `{ access_token, refresh_token }` in the response body **and** setting `httpOnly; Secure; SameSite=Strict` cookies (`access_token`, `refresh_token`). Body is consumed by the CLI; cookies are used by the web dashboard.
7. `POST /auth/refresh` → accepts the refresh token in one of two ways: (a) CLI — `Authorization: Bearer <refreshToken>` header (no cookies), (b) web — `refresh_token` httpOnly cookie (no body). Validates that the token exists in the `RefreshToken` table and `expiresAt >= now` — returns 401 if the token is not found or has expired. Issues a new access token and rotates the refresh token for **all** clients — the old `RefreshToken` DB row is deleted and a new one is issued: (a) CLI — returns `{ access_token, refresh_token }` in the response body; (b) web — sets new `access_token` and `refresh_token` httpOnly cookies. Refresh tokens are single-use; each successful call invalidates the previous token.
8. `POST /auth/logout` → **does NOT require `JwtAuthGuard`** — it must be callable even when the access token has already expired. Accepts `{ refreshToken: string }` in the request body (CLI) **or** reads the `refresh_token` httpOnly cookie (web). Looks up the `RefreshToken` row by token value and deletes it. If no matching row exists (already revoked), returns 200 silently. Also clears the `access_token` and `refresh_token` cookies if the request came from a web client.
9. `GET /auth/me` → returns `{ id, email, name }` for the authenticated user (used by `webhookey whoami`)

JWT access tokens expire after `JWT_EXPIRES_IN` (e.g. `15m`). Refresh tokens expire after `REFRESH_TOKEN_EXPIRES_IN` (e.g. `30d`) — this env var must be added to the Joi validation schema, `.env.example`, and `compose.yml` env vars. On login/device approval, also issue a `refresh_token` (cryptographically random, stored in the `RefreshToken` DB table with the computed `expiresAt`). JWT payload: `{ sub: userId, email }`. Use `@nestjs/passport` + `passport-jwt`. `jwt.strategy.ts` must extract the token from **both** the `Authorization: Bearer <token>` header (CLI) and the `access_token` httpOnly cookie (web) — use `passport-jwt`'s `ExtractJwt.fromExtractors([fromAuthHeaderAsBearerToken(), fromCookie])` pattern. This dual-extractor also covers `GET /hooks/:slug/events` in the hooks module — the browser's native `EventSource` API cannot set custom headers, but sends cookies automatically, so no additional workaround is needed for the SSE endpoint. Add rate limiting (`@nestjs/throttler`) on: `POST /auth/device` (5 req/min per IP), `POST /auth/token` (60 req/min per IP — aligns with `interval: 5` which allows ~12 polls/min, leaving headroom for retries and slow-down responses), `POST /auth/login` (10 req/min per IP), and `POST /auth/signup` (10 req/min per IP). `GET /auth/me` is protected by `JwtAuthGuard` (a valid access token is required). `POST /auth/logout` is **not** behind `JwtAuthGuard` — see item 8 above.

**Testing:** Full device flow tested end-to-end: POST device → simulate user approval → poll returns token. Test expired code returns `expired_token` error. Test polling a consumed `device_code` (tokens already issued, DB row deleted) returns `invalid_grant`. `POST /auth/activate` with an expired `user_code` returns 400; with an already-approved code returns 400; with a valid code and authenticated user sets `approved = true` and returns 200. Test `slow_down` when polling faster than `interval` (verify `lastPolledAt` is updated). Test `POST /auth/refresh` with valid and expired refresh tokens. Test refresh token single-use: after a successful rotation, the old refresh token must return 401 on a subsequent `POST /auth/refresh` call (prevents token reuse after rotation). Test `POST /auth/logout` invalidates the refresh token. `POST /auth/login` and `POST /auth/signup` return 429 after exceeding rate limit. `POST /auth/device` returns 429 after exceeding 5 req/min rate limit. `POST /auth/signup` with a duplicate email returns 409. `device-cleanup.service.ts`: seed three `DeviceCode` rows — (a) expired+unapproved (`expiresAt < now, approved = false`), (b) approved with a valid `userId`, (c) approved with `userId = null` — run the cron manually, verify rows (a) and (c) are deleted and row (b) remains intact.

---

### Step 6: NestJS — Channels Module
**Files:**
- `apps/server/src/channels/channels.module.ts` — imports `EncryptionModule` (to encrypt the HMAC secret on channel create); `CryptoModule` is `@Global()` and `PrismaModule` is `@Global()` — neither needs to be imported explicitly
- `apps/server/src/channels/channels.controller.ts` — `GET /channels`, `GET /channels/:id`, `POST /channels`, `PATCH /channels/:id`, `DELETE /channels/:id`, `GET /channels/:id/events`
- `apps/server/src/channels/channels.service.ts`
- `apps/server/src/channels/retention.service.ts` — `@Cron('0 2 * * *')` nightly job: deletes `WebhookEvent` rows older than `channel.retentionDays` (skips channels where `retentionDays` is null). Scoped to the Channels domain only — no cross-domain dependencies. **`RetentionService` must be listed in `channels.module.ts`'s `providers` array** — same reason as `DeviceCleanupService`.

**What:** CRUD for channels, all routes protected by `JwtAuthGuard`. `GET /channels` returns only channels belonging to the authenticated user (`userId = req.user.id`). **All routes that reference a specific channel (`GET /channels/:id`, `PATCH /channels/:id`, `DELETE /channels/:id`, `GET /channels/:id/events`) must verify that `channel.userId === req.user.id` before proceeding — return 403 if not.** `POST /channels` accepts `{ name, generateSecret?: boolean }` (default `true`). When `generateSecret` is `true` (or omitted), an HMAC secret is generated via the injected `ICryptoService` (`generateSecret()` method — same interface used by `HooksService`, ensuring `ChannelsService` is testable via mock injection), encrypted with AES-256-GCM, and stored in `encryptedSecret`; the plaintext secret is returned once in the response. When `generateSecret: false`, `encryptedSecret` remains null and the `secret` field is omitted from the response — webhooks to this channel will never require HMAC verification and always arrive with `verified: true`. This explains the nullable `encryptedSecret` field in the schema. `GET /channels/:id` returns channel details (no secret). `PATCH /channels/:id` accepts `{ name?, retentionDays? }` for updating channel settings. `GET /channels/:id/events` returns paginated event history (query params: `page`, `limit`); response shape: `{ data: Array<{ id, verified: boolean, status, createdAt }>, total: number, page: number, limit: number }` — `channelId` is omitted since it is implicit in the URL scope. `DELETE` is scoped to the authenticated user's channels only.

**Response for `POST /channels`:**
```json
{ "id": "...", "slug": "abc12345", "name": "my-github", "webhookUrl": "${BASE_URL}/hooks/abc12345", "secret": "<shown once>" }
```

**Testing:** Create channel returns secret. Duplicate name for same user returns 409 on both `POST` and `PATCH` (rename collision). Different users can share the same name. `GET /channels/:id` does not return secret. `PATCH /channels/:id` updates retentionDays. `GET /channels/:id/events` returns paginated results. Delete only works for owner (403 for other users).

---

### Step 7: NestJS — Webhook Receiver + SSE Streaming
**Files:**
- `apps/server/src/hooks/hooks.module.ts` — imports `EncryptionModule` (to decrypt `encryptedSecret` for HMAC); `CryptoModule` is `@Global()` and `PrismaModule` is `@Global()` — neither needs to be imported explicitly
- `apps/server/src/hooks/hooks.controller.ts` — `POST /hooks/:slug`, `GET /hooks/:slug/events`
- `apps/server/src/hooks/hooks.service.ts`
- `apps/server/src/hooks/hooks.gateway.ts` (EventEmitter2 pub/sub) — also maintains a `subscriberCount: Map<string, number>` (keyed by slug) that is incremented on each new SSE subscriber and decremented on unsubscribe. This counter is read by `HooksService` after emitting to determine `delivered` vs `failed` status.

**What:**
- `POST /hooks/:slug` — public (no auth), open to all origins. Apply per-IP rate limiting (`@nestjs/throttler`) — default 60 requests/minute per IP. Read the raw request body via `req.rawBody` (Buffer, enabled in bootstrap) for HMAC verification; never use the parsed JSON body for signature checks. **The signature is read from the `X-Webhookey-Signature` request header (format: `sha256=<hex-digest>`); this header name must be documented in the README so webhook senders know what to set. GitHub-style senders using `X-Hub-Signature-256` must be instructed to also set `X-Webhookey-Signature`, or alternatively the server can accept both headers (check `X-Webhookey-Signature` first, fall back to `X-Hub-Signature-256`).** Looks up channel by slug (404 if not found). **HMAC verification branch:** if `channel.encryptedSecret` is null/empty, skip HMAC and set `verified: true` (no secret = open channel); otherwise verify HMAC against the decrypted secret and set `verified` accordingly. This path must be explicit — a missing secret must not throw a 500. Creates the `WebhookEvent` row with `status: 'pending'` and the computed `verified` value — **no payload, headers, or signature are written to the DB**. The raw payload is forwarded in-memory only via `EventEmitter2` using event key `hook:<slug>` (must match the key used by the SSE subscriber). **Status transitions:** immediately after emitting, `HooksService` reads `HooksGateway.subscriberCount.get(slug) ?? 0` — if `> 0`, update the row to `delivered`; if `0`, update it to `failed`. The `pending` state is therefore transient and resolved within the same request handler before returning 200 to the webhook sender.
- `GET /hooks/:slug/events` — SSE endpoint (`@Sse()`), protected by JWT. After JWT validation, look up the channel by `:slug` — return 404 if the channel does not exist; then verify `channel.userId === req.user.id` — return 403 if the channel belongs to a different user (any authenticated user must not be able to subscribe to another user's event stream). Returns `Observable<MessageEvent>` typed as `SseEvent` from `@webhookey/types`. Subscribes to `EventEmitter2` on key `hook:<slug>` (e.g. `hook:abc123`) — this naming convention must be used consistently in both the emitter (`POST /hooks/:slug`) and subscriber. Sends a 30 s heartbeat by merging an `rxjs interval(30_000)` into the main event `Observable` and emitting `{ type: 'heartbeat', data: '' }` sentinel events — NestJS `@Sse()` serializes `Observable<MessageEvent>` to SSE `data:` lines and does not natively support raw SSE comment lines (`:`); a sentinel event is the correct keepalive mechanism within this abstraction. **The CLI `listen` command must filter out events where `type === 'heartbeat'` before processing** — without this filter it will attempt to parse the sentinel as an `SseEvent` and error. Cleans up listener on unsubscribe.

**Testing:** POST to unknown slug returns 404. `GET /hooks/:slug/events` with an unknown slug returns 404. POST with invalid HMAC stores event with `verified: false`. POST with a valid HMAC in the `X-Hub-Signature-256` header (and no `X-Webhookey-Signature` header present) stores event with `verified: true`, confirming the fallback header is honoured. SSE client receives event within 100ms of POST. Heartbeat sent every 30s. HMAC verified against `req.rawBody` — test with a JSON payload where body bytes differ from re-serialized JSON. Event status is `delivered` when a subscriber is connected; `failed` when no subscriber is active. `subscriberCount` lifecycle: verify it increments when an SSE connection is established and decrements when the connection is closed (also verify it never goes below 0 if close is called more than once). Rate limiter returns 429 after threshold exceeded from same IP.

---

### Step 8: Next.js Dashboard
**Files:**
- `apps/web/.env.example` — `NEXT_PUBLIC_API_URL=http://localhost:3000` (baked at build time into the browser bundle; public-facing URL) and `INTERNAL_API_URL=http://localhost:3000` (runtime, server-components only; in Docker override to `http://server:3000`)
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx` — channel list, create channel form
- `apps/web/app/channels/[id]/page.tsx` — event log for a channel
- `apps/web/app/auth/login/page.tsx` — email/password login form
- `apps/web/app/auth/signup/page.tsx` — registration form
- `apps/web/app/auth/activate/page.tsx` — device code entry form
- `apps/web/middleware.ts` — validates `access_token` cookie; transparently refreshes via `refresh_token` cookie; redirects unauthenticated requests to `/auth/login`. Export a `config` object with `matcher` that excludes public routes: `['/auth/login', '/auth/signup', '/auth/activate', '/_next/:path*', '/favicon.ico']` to prevent infinite redirect loops.
- `apps/web/lib/api.ts` — typed fetch wrappers using `@webhookey/types`

**What:** Minimal dashboard with:
1. **Auth pages** — `/signup` (email + password form) and `/login` for web sessions
2. **Channel list** — shows all user channels, webhook URL, copy button, delete action
3. **Channel detail** — paginated event log with verified badge and timestamp only (no payload, headers, or signature stored)
4. **Activate page** — form to enter `user_code` during device flow; calls `POST /auth/activate`; shows success/error state. **The activate page must check for a valid session on load; if no `access_token` cookie is present, redirect to `/auth/login?returnTo=/auth/activate` so the user authenticates first.** After login succeeds, the **login page** reads `returnTo` from its own query string (`/auth/login?returnTo=/auth/activate`) and performs a client-side redirect to that path. The middleware is not involved in `returnTo` handling — its only job is to redirect unauthenticated requests to `/auth/login?returnTo=<current-path>`; the post-login redirect is the login page's responsibility.
5. **Admin settings** — per-channel event retention policy (e.g. 7 / 30 / 90 days / forever), configurable from the channel detail page

**Web session strategy:** The server sets `httpOnly; Secure; SameSite=Strict` cookies (`access_token`, `refresh_token`) on `POST /auth/login` and `POST /auth/signup` responses — tokens never touch `localStorage` or client-side JS. `apps/web/lib/api.ts` must use `INTERNAL_API_URL` (read from `process.env.INTERNAL_API_URL`) for server-component fetches and `NEXT_PUBLIC_API_URL` for client-component fetches — these are the same host/port in development but differ in Docker where server components can use the internal Docker network hostname while browser JS must use the public-facing URL. `apps/web/middleware.ts` runs only on routes matched by the `matcher` config (all routes except `/auth/*`, `/_next/*`, and static assets) — this prevents infinite redirect loops on the login/signup pages. If the `access_token` cookie is missing or expired, middleware calls `POST /auth/refresh` using the `refresh_token` cookie; on success updates **both** the `access_token` and `refresh_token` cookies (the server rotates the refresh token on every refresh call — if only `access_token` is updated here, the next middleware refresh will fail when the stale `refresh_token` cookie is rejected) and continues; on failure redirects to `/auth/login`.

Use Next.js App Router with server components for channel list (fetched server-side). Client component for SSE-based live event feed on channel detail page.

**Testing:** Signup → redirected to dashboard. Channel create → appears in list. Delete → removed. Activate page shows error for invalid/expired code, success for valid code. Retention setting saved → old events pruned on next cleanup run. Unauthenticated request to `/` → redirected to `/auth/login`. Expired `access_token` cookie with valid `refresh_token` → middleware refreshes and allows request through.

---

### Step 9: oclif CLI
**Files:**
- `apps/cli/src/commands/login.ts` — device flow
- `apps/cli/src/commands/logout.ts` — clear stored token
- `apps/cli/src/commands/new.ts` — create channel
- `apps/cli/src/commands/ls.ts` — list channels
- `apps/cli/src/commands/whoami.ts` — show current user info
- `apps/cli/src/commands/listen.ts` — SSE listener + command exec
- `apps/cli/src/commands/config.ts` — `webhookey config set-url <url>` to target a self-hosted instance
- `apps/cli/src/lib/config.ts` — non-sensitive config (`apiUrl`) via `conf`; `accessToken` and `refreshToken` stored in OS keychain via `@napi-rs/keyring` (macOS Keychain / Windows Credential Manager / Linux Secret Service)
- `apps/cli/src/lib/api.ts` — typed API client with automatic token refresh on 401

**What:**

`webhookey login`:
- POST `/auth/device` → print `user_code` + URL
- Poll `/auth/token` every `interval` seconds with spinner. When the response is `slow_down`, increase the polling interval by 5 seconds (per RFC 8628) and continue polling at the new rate.
- On success, store `access_token` and `refresh_token` securely in the OS keychain via `@napi-rs/keyring` (service: `webhookey`, accounts: `access_token` / `refresh_token`). Save `apiUrl` (non-sensitive) to `conf` at `~/.config/webhookey/config.json`.

`webhookey logout`:
- Call `POST /auth/logout` (sending the stored refresh token) to invalidate it server-side, then delete both `access_token` and `refresh_token` from the OS keychain via `@napi-rs/keyring`.

`webhookey new <name>`:
- POST `/channels` → print webhook URL + secret with copy-friendly formatting
- Warn: "Save your secret — it won't be shown again"
- Accepts an optional `--no-secret` flag: when set, passes `{ generateSecret: false }` to the API, creating an open channel with no HMAC requirement. Print a note that all incoming webhooks to this channel will be treated as verified.

`webhookey ls`:
- GET `/channels` → print a table of channel name, slug, webhook URL, creation date

`webhookey whoami`:
- Read token from config, call `GET /auth/me` → print email and userId

`webhookey listen <name> -- <command>`:
- Resolves `<name>` to a slug via `GET /channels` (match by name — channel names are unique per user so there is at most one match; error if not found)
- GET `/hooks/:slug/events` via `EventSource` (use `eventsource` npm package for Node.js, constructed with `{ headers: { Authorization: 'Bearer <accessToken>' } }` — native browser `EventSource` cannot set custom headers, but the npm package accepts them in the constructor options; without this the request returns 401). **Handle the EventSource `error` event:** if the server closes the connection with a 401 (expired token), catch the error, call the auto-refresh logic (same as `api.ts`), call `.close()` on the existing `EventSource` to prevent duplicate event listeners, rebuild the `EventSource` with the new token, and resume listening. Without this, a `webhookey listen` session silently dies after 15 min.
- On each event: check the `verified` field on the SSE payload. If `verified: false`, print an error and **skip execution** — no bypass flag exists. If `verified: true` (or the channel has no secret configured), spawn `<command>` with `WEBHOOKEY_PAYLOAD=JSON.stringify(event.payload)` as an environment variable and the same JSON string piped to stdin. The `JSON.stringify` call is mandatory — `payload` is `unknown` and must be serialized before being passed in the process environment.
- **Concurrent execution policy:** sequential by default — new events queue while a command is running. Max queue depth: 10 (events beyond that are dropped with a warning). Use `--parallel` flag to allow concurrent execution instead.
- Handle `SIGINT` gracefully (close SSE connection, wait for any in-flight command to finish)

`webhookey config set-url <url>`:
- Validates that the argument is a syntactically valid URL (e.g. using `new URL(url)` — throws on invalid input with a user-friendly error message). Saves `apiUrl` to the `conf` config file. Use when targeting a self-hosted instance. Defaults to `http://localhost:3000` if unset. Can also be overridden per-invocation via the `WEBHOOKEY_API_URL` environment variable.

**API client auto-refresh (`apps/cli/src/lib/api.ts`):** Every outbound request goes through a thin wrapper that: (1) reads `access_token` from keychain, (2) on a 401 response calls `POST /auth/refresh` with `Authorization: Bearer <refreshToken>` header (CLI has no cookies — the server's Bearer path issues the new access token in the response body), (3) stores the new `access_token` **and** new `refresh_token` in keychain — the server rotates the refresh token on every `POST /auth/refresh` call; if the CLI only persists the access token the next auto-refresh will fail with 401, (4) retries the original request exactly once. If refresh also fails (token expired or revoked), deletes both tokens from keychain and exits with a message: `"Session expired — run webhookey login"`.

**Testing:** `webhookey login` completes full device flow and verifies tokens written to OS keychain (mock `@napi-rs/keyring` in tests). `slow_down` during login: when the server responds with `slow_down`, verify the poll interval increases by 5 seconds and subsequent polls use the higher interval. `webhookey logout` deletes both keychain entries and invalidates the server-side refresh token. `webhookey ls` prints channel table. `webhookey whoami` prints user info. `webhookey new` prints URL + secret. `webhookey new <name> --no-secret` creates a channel without HMAC: the API request body contains `{ generateSecret: false }`, the response has no `secret` field, and the CLI prints a note that all incoming webhooks to this channel will be treated as verified. `webhookey listen my-hook -- cat` prints incoming payloads. Heartbeat sentinel events (`type === 'heartbeat'`) are silently ignored and do not trigger command execution. Event with `verified: false` blocks execution and prints an error — no bypass. Event with `verified: true` executes the command. Queue drops event #11 with warning when depth exceeded. `webhookey config set-url` updates `apiUrl` in conf. API client auto-refresh: stub a 401 then a successful refresh response → client retries transparently, succeeds, and persists **both** the rotated `access_token` and `refresh_token` to keychain (verify both keychain entries are updated, not just the access token). `webhookey listen` 401 reconnect: simulate an SSE connection that returns HTTP 401, verify the command calls auto-refresh, closes the old `EventSource`, opens a new one with the updated token, and continues receiving events.

---

### Step 10: Docker Compose + README
**Files:**
- `compose.yml` — postgres, server, web services; server has `depends_on: postgres: condition: service_healthy`; web has `depends_on: server: condition: service_healthy` (so the web container does not start before the API is accepting requests, since SSR pages fetch from the server at startup); the **server service must declare a Docker-level `healthcheck`** (`test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]`, `interval: 10s`, `retries: 5`) — using `node` rather than `curl` since `curl` is not present in slim Node.js base images; **`fetch` is a stable global from Node 18 onward — both server and web Dockerfiles must use `node:18-slim` (or later) as their base image**, otherwise this healthcheck command will throw `ReferenceError: fetch is not defined` and the container will never become healthy; so the `service_healthy` condition used by the web service can be satisfied; publish server on port **3000** (`ports: ['3000:3000']`) and web on port **3001** (`ports: ['3001:3000']` — Next.js `start` listens on 3000 inside the container, mapped to 3001 on the host to avoid collision); server service must declare all required env vars (`DATABASE_URL`, `MASTER_KEY`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `BASE_URL`, `WEB_ORIGIN`) either inline or via an `env_file`; postgres service must expose a health check (`pg_isready`) so the server waits for the DB to be ready before starting
- `README.md` — quickstart, CLI usage, self-hosting guide
- `apps/server/Dockerfile`
- `apps/server/.dockerignore` — excludes `node_modules/`, `.env`, `dist/`, `.turbo/`, `*.log` to keep the build context small and prevent secrets from leaking into the image
- `apps/web/Dockerfile`
- `apps/web/.dockerignore` — same exclusions as server; also excludes `.next/` build artifacts from the first stage context

**What:** Production-ready `compose.yml` with health checks (using `GET /health`). **`NEXT_PUBLIC_API_URL` is a Next.js build-time variable — baked into the JS bundle at `next build`.** Because it is embedded in browser-side JavaScript, it must be the **public-facing URL** (e.g. `http://localhost:3000` for local dev, `https://api.example.com` for production) — not the Docker-internal hostname. Server components in Next.js that call the API should use a separate `INTERNAL_API_URL` env var (e.g. `http://server:3000`) read at runtime only by Node.js server code; this env var is NOT prefixed `NEXT_PUBLIC_` and is not baked into the browser bundle. The web `Dockerfile` accepts `NEXT_PUBLIC_API_URL` as a build arg and sets it before `next build`. `compose.yml` `build.args` passes the public URL; `INTERNAL_API_URL` is passed as a regular runtime env var to the web service. The `README.md` must explain this two-URL pattern for self-hosters.

Both Dockerfiles use **three-stage builds**: ① a `pruner` stage runs `turbo prune --scope=<app-name> --docker` to generate a minimal monorepo snapshot — `out/json/` contains only the package.json files (for Docker layer caching of the install step) and `out/full/` contains the full source tree; without this stage Docker copies the entire monorepo and installs every workspace's dependencies, making builds slow and images unnecessarily large; ② a `builder` stage copies `out/json/` first and runs `yarn install --frozen-lockfile` (cached unless package.json files change), then copies `out/full/` and runs `yarn turbo build --filter=<app-name>`; ③ a `runner` stage copies only the compiled output and pruned `node_modules` from the builder to keep the final image small. `README.md` covers: self-hosting with Docker (including copying `.env.example` → `.env` and setting secrets), CLI install (`npm i -g webhookey`), and the full workflow (login → new → listen).

**Testing:** `docker compose up` starts all services. `GET /health` returns 200. Web dashboard reachable at `localhost:3001`.

---

## Decisions

1. **HMAC failure** — always blocks execution. No bypass flag. The server performs HMAC verification against the raw request bytes and sets `verified: true/false` on the `WebhookEvent` row. No payload, headers, or signature are persisted — only the verification result and status. The raw payload is forwarded in-memory via EventEmitter2 and included in the SSE event data only. The CLI checks the `verified` field on the SSE payload and refuses to run the command if `verified: false`.
2. **User registration** — signup (email + password) with no email verification in v1.
3. **Secret storage** — encrypted at rest with AES-256-GCM using `MASTER_KEY` env var.
4. **Event retention** — per-channel, configurable from the dashboard (options: 7 / 30 / 90 days / forever). A scheduled NestJS cron job prunes expired events nightly.
5. **Multi-instance / Redis** — out of scope for v1. Single-instance SSE via EventEmitter2.

---

## Key Dependencies

| Package | App | Purpose |
|---|---|---|
| `@nestjs/event-emitter` | server | Internal pub/sub for SSE |
| `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` | server | JWT auth |
| `@nestjs/throttler` | server | Rate limiting on device token polling |
| `@nestjs/config`, `joi` | server | Env var management + startup validation |
| `@nestjs/schedule` | server | Cron job for event retention pruning |
| `prisma`, `@prisma/client` | server | ORM |
| `bcrypt` | server | Password hashing for signup/login |
| `class-validator`, `class-transformer` | server | DTO validation via `ValidationPipe` |
| `helmet` | server | HTTP security headers |
| `nestjs-pino` | server | Structured JSON logging |
| *(no extra dep)* | server | Slug is UUID via Prisma `@default(uuid())` |
| `@oclif/core` v3 | cli | CLI framework |
| `conf` | cli | Config persistence |
| `eventsource` | cli | SSE client for Node.js |
| `@napi-rs/keyring` | cli | OS keychain access for secure token storage (macOS/Windows/Linux) |
| `cookie-parser` | server | Parse incoming cookies for web session auth via `jwt.strategy.ts` |
| `@webhookey/types` | all | Shared interfaces |
| `@webhookey/crypto` | server | HMAC utilities (server-side only; CLI trusts `verified` field from SSE event) |
| `jest`, `@nestjs/testing`, `supertest` | server (test) | Server unit + integration testing |
| `vitest` | packages, cli (test) | Unit testing for shared packages + CLI |
| `playwright` | web (test) | E2E testing for dashboard |