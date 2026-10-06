# Caboodle IAM — Backend Implementation Plan

Status: proposal · 2026-10-05 · companion to `caboodle-access-architecture.md` (the target model; this document is the *how and in what order*).

Sources reviewed: `caboodle.backend` develop @ `07f8fa01`, `caboodle.web` develop, `caboodle.admin` develop, and this demo (branch `caboodle-access-v2`). File references below are relative to each repo.

---

## 0. The short answer

**Order of work:** lock decisions + harden security → ship the Organization schema and backfill in *shadow* (no behavior change) → build the resolver, `/me/access` and the audit foundation (still shadow) → ship management endpoints and OTP (with a dual-write bridge so legacy endpoints keep the new tables fresh) → flip enforcement → migrate the frontends and retire the old model.

Per question:

| Your question | Answer |
|---|---|
| Organizations first? | **Yes — schema + backfill first, but in shadow mode**, after a short Phase 0 (decisions + security fixes). Everything else (permissions, invitations, audit scoping) hangs off `Organizations`/`Memberships` rows, so they must exist and be proven correct against staging data before anything reads them. |
| Is the current user table enough? | **Yes for the org model — `Identity.Users` needs no new columns.** It is *not* enough for OTP (one reusable GUID column can't do attempts/expiry/resend history → new `VerificationCodes` table), and two data issues need fixing: email uniqueness is app-level only, and `IsActive` is overloaded as "membership" today. |
| Roles and claims? | **Keep the Identity role-claims machinery, but only for the Platform Admin.** The five business roles (BRANDOWNER, BROKER, BRANDSUBUSER, BROKERSUBUSER, UNASSIGNED) retire at cut-over; org behavior moves to the new `Organization.Roles`/`RolePermissions` + the resolver. Nothing about today's `[MustHavePermission]` pipeline changes for platform endpoints. |
| Email / OTP? | The backend **already has link-based verification, invites and password reset** (SES SMTP, DB templates). OTP is a *replacement for the signup verification link only*. Build it as a parallel flow (new table + endpoints); keep the link flow until the web FE ships an OTP screen. Several email-infra bugs/leaks must be fixed first or the OTP codes themselves leak (§6). |
| JWT / tokens? | **The token's claims don't change** (confirmed safe: neither FE decodes the JWT; org context travels as headers). The *settings* change a lot: per-environment secret-managed signing keys (today one committed key serves dev/staging/prod), issuer/audience validation on, sane lifetimes (prod access tokens live ~41 days today), MasterPassword removed, revocation via refresh+resolver checks. §2.5 has the management procedure. |
| Audit trails? | Today's audit infra is **effectively dead** (the automatic EF trail never fires; the manual service is used by one feature and silently loses rows inside transactions). Build a purpose-built `Auditing.AuditEvents` table + `IIamAuditService` (same-transaction Dapper writes) + a scoped read API, using the demo's 35-action catalog as the contract. Build it **before** the management endpoints so every write audits from day one. |

**Your instinct is right:** resolve IAM + audit completely before touching other modules. In this plan, business modules are only touched twice, both inside the IAM workstream: adding `BrokerageOrganizationID` to four broker-owned tables (invariant 11/D6) and putting authorization attributes on endpoints at enforcement time.

---

## 1. What you're building on (current state in one table)

| Area | Today | Where |
|---|---|---|
| User | `ApplicationUser : IdentityUser`, text `Id`, in `Identity.Users` (ApplicationDbContext). Custom: `FirstName`, `LastName`, `ImageUrl`, `IsActive`, `RefreshToken(+Expiry)`, `ObjectId`, `EmailVerificationCode` (uuid) + `EmailExpiryTime` | `BuildingBlocks\Infrastructure\Identity\ApplicationUser.cs` |
| Org-ish structures | `Brands.UserID` (owner), `BrandSubUsers`, `BrandBrokers(BrokerID, BrandID, ParentBrokerID)`, `Identity.UsersHierarchy`, `Identity.InvitedUsers` — the last two live in **MainDbContext** despite the Identity schema | `Modules\Brand\...`, `MainDbContext.cs` |
| Roles | 6 global roles seeded at startup. Claims seeded: ADMIN = all (~86), BROKER = 29, BROKERSUBUSER = Broker minus one. **BRANDOWNER / BRANDSUBUSER / UNASSIGNED have none seeded** | `ApplicationDbSeeder.cs` |
| Permission check | `[MustHavePermission]` → `PermissionPolicyProvider` → `IUserService.HasPermissionAsync`, cached `permission-{userId}` 10-min **sliding** IMemoryCache. Invalidation partial (role-assign yes, role-remove no) | `Auth\Permissions\*`, `UserService.Permissions.cs` |
| Endpoint coverage | 678 actions: 236 `[MustHavePermission]`, 16 `[AllowAnonymous]`, **~426 rely on "any authenticated user"** + middleware/handler checks | counted on develop |
| Brand scoping | `BrandValidationMiddleware` (per-request role lookup + table checks; ADMIN bypass; malformed header returns body with **HTTP 200**) + per-feature helpers (CategoryReviewAccessHelper, PromoTabAccessHelper, …) | `Middleware\BrandValidationMiddleware.cs` |
| JWT | HS256, **same 26-char committed key in dev/staging/prod**, `ValidateIssuer/Audience=false`, access token ~41 days (prod) / ~417 days (staging), refresh 2 days, plaintext refresh token on `Users`, MasterPassword accepted on both logins, no logout/revoke, claims carry identity only (no roles/permissions/brand) | `TokenService.cs`, `Auth\Jwt\Startup.cs`, appsettings |
| Email | Sync SMTP to AWS SES; templates are **DB rows** (`Email.EmailTemplates`, `EmailModule` enum); every send logged with **full body** to `Email.EmailLoggers`; SNS webhook + Hangfire resend job. Link flows exist: verify-email, invite (`/signup?code&email`), forgot/reset | `Mailing\SmtpMailService.cs` |
| Audit | `Auditing.AuditTrails` exists but the automatic writer never fires (no auditable entity in that context); manual `IAuditLogService` is best-effort (swallows errors, breaks inside open Dapper transactions) and used only by BrandReport; `ModuleAssignmentHistories` is written (in-transaction Dapper) but **nothing reads it**; no general audit API | `BaseDbContext.cs`, `Auditing\AuditLogService.cs` |
| Conventions | Modular monolith; feature file = request+validator+handler; Ardalis specs must filter `!Deleted` manually; MainDbContext has **no soft-delete hook and no SaveChanges audit**; fluent mapping in one `OnModelCreating`; migrations in `Database\Migrator` (`--context MainDbContext` / `ApplicationDbContext`), **auto-applied at startup**; Hangfire (WorkerCount 1); in-memory cache in all envs; new projects must be added to the **Dockerfile COPY list** or restore silently skips them | `CLAUDE.md`, `Modules.Shared.Infrastructure` |
| Tests/CI | 11 xUnit test projects (none reference the Host), coverage gate only on `staging`/`master` pipelines, PR pipeline runs review bots only | `bitbucket-pipelines.yml` |

---

## 2. Your questions, answered

### 2.1 Which part first — organizations?

Yes, but the first *coding* phase is preceded by a decision/security phase, and the org work ships dark:

1. **Phase 0 first because it prevents rework everywhere else.** The 9 architecture decisions (D1–D9) plus ~12 new ones found in this review (§4) change table shapes, the resolver, and the OTP flow. And several security holes (§6) would leak the very OTP codes and invite links you're about to create.
2. **Then the Organization schema + backfill, deployed but unused ("shadow").** Reasons:
   - The backfill is the riskiest step (it reinterprets `BrandBrokers`, `Brands.UserID`, `BrandSubUsers`, `UsersHierarchy` into orgs/memberships/connections). Running it early against staging — which you confirmed mirrors production — gives you weeks to reconcile data while nothing depends on it.
   - Memberships must exist before invitations, audit scoping, `/me/access`, or any management endpoint can be built honestly.
   - It's zero-risk to ship: new tables + a Hangfire job, no existing code path touched.
3. **Email/OTP is an independent track** (it touches Identity + Mailing, not the org tables) and can run in parallel from Phase 0 onward. It only converges with the org work at invitation emails (Phase 3).

### 2.2 Is the current user table enough?

**For the org model: yes, by design.** The architecture doc deliberately put everything org-related in new tables keyed by uuid `UserID` (cast from the text `Users.Id`, same as every existing link table). A user's identity record stays exactly what it is. Do **not** add `OrganizationID`/`UserType`-style columns to `Users` — that would rebuild the old model.

What does need attention on/around `Users`:

| Issue | Fix | When |
|---|---|---|
| `EmailVerificationCode` is a single non-nullable GUID — can't express attempts, expiry extension, resend history, or multiple purposes | New `Identity.VerificationCodes` table (Appendix A); keep the old columns until the link flow retires | Phase 3 (OTP) |
| `NormalizedEmail` has a **non-unique** index; uniqueness is only `RequireUniqueEmail` app-side | Pre-check for existing duplicates (staging), then a unique filtered index via an ApplicationDb migration | Phase 0 pre-checks, index in Phase 1 |
| `IsActive` is overloaded: removing a sub-user from one brand sets the **global** flag false (`RemoveBrandSubUserRequest.cs:87`, `RemoveBrokerSubUserRequest.cs:77`) | In the new model suspension is per-membership; `IsActive` becomes a platform-level kill switch only. The backfill must decide what a false `IsActive` means per user (suspended membership vs suspended user) — that's pre-check query #6 | Phase 0/1 |
| No `LastLoginAt`/`CreatedOn` | Optional; add only if the platform user list needs it | whenever |

The related identity tables change more than `Users` itself: `InvitedUsers` → `Organization.Invitations`, `UsersHierarchy`/`BrandSubUsers`/`BrandBrokers` → memberships/connections/brand-access (mapping is architecture doc §10.1), all retired in Phase 5, not before.

### 2.3 Roles and claims — reconciling "we manage permissions differently"

You end up with **three permission systems, each owning one layer** — and two of them already exist:

| Layer | Mechanism | Status |
|---|---|---|
| Platform (Constance) | `Identity.Roles` ADMIN + `RoleClaims` + `[MustHavePermission]` + permission cache | **Unchanged.** Add the new `Permissions.Platform.*` claims to the catalog + seeder. |
| Organization management (invite, roles, assign brands) | New `Organization.Roles` (4 seeded) + `RolePermissions` + `[RequireOrgPermission]` reading the resolver | New (Phase 2–4) |
| Module/data access | `BrandAccess` (+ grants) ∩ module entitlements, computed by the resolver, enforced by `[RequireModule]` | New (Phase 2–4); replaces `Permissions.Broker.*` claims, `BrandValidationMiddleware` and the per-feature access helpers |

Transition rules that avoid rework:

- The five business roles **keep working until Phase 5**. Login, `BrandValidationMiddleware`, and `/brands/me` keep reading them; the new tables are populated alongside. Retiring them early would break both FEs (web branches its whole shell on the role string; admin sends `userType` 1–5 on invites).
- BRANDOWNER/BRANDSUBUSER having **no seeded claims** is why ~426 endpoints have no `[MustHavePermission]` — brand-side users would be locked out. Don't try to fix that inside today's system; it's exactly what `[RequireModule]` solves at Phase 4.
- The permission-cache invalidation gaps (`RemoveRoleAsync`, the dead `RolesUpdated` branch in `InvalidateUserPermissionCacheHandler`) matter more once Platform permissions grow — fix in Phase 0 (small).
- The new role tables are **seeded system roles** (`IsSystem = true`). The demo's custom-role CRUD is deferred (decision N7) — the schema already leaves room.

### 2.4 Email and OTP

**What exists:** self-signup (`POST /registration` → inactive + UNASSIGNED + verification email), link verification (`/verify-email?code&email`), invites (`InvitedUsers` + `/signup?code&email`), forgot/reset password, account-status mails. Transport is synchronous SMTP to SES; templates are DB rows keyed by the `EmailModule` enum; every send is logged with its full body.

**What the demo adds (the contract):** a 6-digit OTP at **signup only** — auto-submit on 6th digit, resend with 30s cooldown, "use a different email" discards the unverified account. Login, invitation acceptance (opening the link proves the email) and password flows stay link-based. The demo also models a *signed-in-but-unverified* state; today's backend instead blocks login until verified.

**Recommended backend design (decisions N1–N3 in §4):**

1. Keep today's "can't log in until verified" model and keep the verify endpoint **anonymous (email + code)**, exactly like the link flow. That makes OTP a pure swap of *what the email contains and what the user types*, with no token-state machinery. The demo's auto-signed-in state is a FE nicety you can add later with a scoped "pending" token if product insists.
2. New `VerificationCodes` table (Appendix A): hashed code, purpose (`SignupEmail`, later `EmailChange`…), `ExpiresOn` (10 min), `Attempts` (max 5 then invalidate), `ConsumedOn`. Resend = invalidate old row, insert new (fixes today's bug where resend reuses the same code without extending the 5-day expiry — after day 5 verification is impossible).
3. Endpoints: extend `POST /users/verify-email` to accept the 6-digit code (or add `/users/verify-email-otp`), keep `resend-email-verification` but make it issue a fresh code with a server-enforced cooldown, add `DELETE /registration/unverified` (the demo's discard). All anonymous + rate-limited + enumeration-safe (same response whether the email exists or not).
4. **Prerequisites from §6, non-negotiable before OTP ships:** lock down the AdminController email-logger endpoints (today any authenticated user can read every email body — reset links, invite codes, and tomorrow's OTPs), don't log OTP bodies verbatim into `EmailLoggers` (mask the code), add rate limiting on the auth/verification endpoints, and fix the invite-cancellation soft-delete bug (a cancelled invite is still acceptable because the acceptance lookup never filters `Deleted`).
5. Invitations move to `Organization.Invitations` in Phase 3 with secure-random tokens (the demo's `createId()` tokens are a demo shortcut, and today's GUID codes are fine but the new table should use 256-bit tokens). Invitation acceptance keeps auto-verifying the email and **keeps asking for a password** — the demo skipped passwords entirely; production must not.

### 2.5 JWT and tokens — what changes and how to manage it

**What does *not* change:** the claim set (identity-only; no role/permission/org/brand claims), the `tokenInfo/userInfo` response shape, the error envelope (`messages.Email` is how the web FE detects "unverified"), the refresh contract `{token, refreshToken}`, and the two login endpoints. Verified against both FEs: neither decodes the JWT; org/brand context travels as headers (`OrganizationID` new, `BrandID` existing). Access changes take effect immediately via the resolver instead of waiting out a token.

**What changes (all backend-only):**

| Change | Detail |
|---|---|
| Signing keys | One key per environment, supplied via environment variables / a secret store (`SecuritySettings__JwtSettings__Key`), not appsettings in git. Deployment currently passes only `ASPNETCORE_ENVIRONMENT`, so this is a deploy-pipeline change too. |
| Key rotation | JwtBearer accepts multiple `IssuerSigningKeys`: deploy validating {old, new} while issuing new; drop the old key after the longest surviving old token expires. Given prod tokens live ~41 days, either accept a long dual-key window or force re-login at a announced cutover. |
| Issuer/audience | Set `iss`/`aud` when minting; turn `ValidateIssuer/ValidateAudience` on (`Auth\Jwt\Startup.cs:35-37`). Per-environment values close the "staging token works in prod" hole (same key + no validation today). |
| Lifetimes | Access **12–24 h**, refresh **14–30 days sliding** as the first step. Not shorter yet: the web app's refresh only runs on NextAuth session reads and its axios client holds the token from the last server render, and the admin app has a refresh-buffer bug (~16.7 h) — aggressive lifetimes would log users out randomly until the FEs are fixed. Tighten to ≤1 h in Phase 5. |
| Refresh semantics | Keep rotate-and-overwrite (one token per user). Do **not** add strict one-time-use reuse detection — both FEs re-use refresh tokens by design quirks (server-side session reads can't write the cookie; tabs race). Add `IsActive` + `EmailConfirmed` checks inside refresh (today a deactivated user can refresh forever). Optionally hash the stored refresh token. |
| MasterPassword | Remove (`TokenService.cs:59-60, 85-86`). The Platform Admin's audited support access (architecture doc §4.1) replaces the only legitimate use. |
| Revocation | No new infrastructure needed: the resolver checks user/membership/org status on **every request** (doc §6.2), which is stronger than token revocation for org-level suspension; global deactivation is caught by the same check + the refresh check. Add `POST /auth/logout` (clears the refresh token) for completeness; FEs can adopt it later. |
| Lockout / rate limiting | Login uses `CheckPasswordAsync` with lockout disabled and no rate limiting anywhere. Enable Identity lockout (switch to `SignInManager` or count failures) + add a rate-limit middleware on `auth/*`, `users/forgot-password`, `users/resend-email-verification`, and the new OTP endpoints. |

### 2.6 Audit trails

**Reality check:** the existing `Auditing.AuditTrails` pipeline writes nothing (the ChangeTracker diff only runs on ApplicationDbContext, where no entity is auditable), `IAuditLogService` swallows failures and loses rows when called inside an open Dapper transaction, and the only read API is BrandReport-specific (and its admin check calls `IsInRole`, which is always false because the token has no role claim). `ModuleAssignmentHistories` is solid but write-only. So treat IAM audit as a **new build**, not an extension.

**Design (Appendix A has the table):**

- `Auditing.AuditEvents` in **MainDbContext** — IAM writes are Dapper-heavy and must commit **in the same transaction** as the change they describe. A same-connection `INSERT` via the existing `IDbTransaction` avoids the exact bug that loses `AuditLogService` rows today.
- Structured fields the demo lacks but a real system needs: `TargetType`/`TargetID`, `BrandOrganizationID?`, `Metadata` jsonb (old/new role, module lists…), plus denormalized `ActorName`/`TargetName` (users get hard-deleted today; names must survive).
- `IsSupportAccess` is set **explicitly from the support session** (platform admin acting inside an org they're not a member of), not inferred — the demo's heuristic misflags platform-page actions, which its own review calls out.
- **Event catalog:** adopt the demo's 35 actions as the baseline contract, normalized (`invitation.*` not `member.invited`; `entitlement.updated` vs `module.*`), and add what the demo forgot: `auth.signin_failed`/`auth.signed_in` (decision N9), `support.closed`, brand-access side effects (rows auto-created on invitation acceptance / role change), `verification.*` for OTP attempts.
- **Read API:** `GET /auditevents?organizationId&action&actorUserId&from&to` + paging, modeled on `GetBrandReportAuditLogRequest` (Dapper + `COUNT(*) OVER()`); platform admin sees all, org access governed by decision N4 (demo shows the feed to every member — recommend `organization.view` for the feed, admins-only for the full log).
- Indexes from day one: `(OrganizationID, CreatedOn DESC)`, `(ActorUserID, CreatedOn DESC)`, `(TargetType, TargetID, CreatedOn DESC)`.
- `ModuleAssignmentHistories` stays as-is for entitlements (the doc reuses it); the entitlement service additionally writes an `entitlement.updated` AuditEvent so one feed covers everything.
- **Watch out:** the SoftDeletePurge job physically deletes rows from *any* table with `ID`+`Deleted`+`DeletedOn` columns past retention. `AuditEvents` must not be soft-deletable (no `Deleted` column — append-only), and decide retention for soft-deleted `BrandAccess` rows, which the purge job *will* eventually eat (decision N10).

Sequencing: the audit service lands in Phase 2, **before** any management endpoint, so Phase 3 endpoints audit from their first commit. Backfilling audit events for legacy actions is not attempted — the trail starts when the system does.

---

## 3. The phase plan

Phases are sequential; items inside a phase are parallelizable PR-sized chunks. The email/OTP track (3.E) can start any time after Phase 0.

### Phase 0 — Decisions, hardening, data pre-checks *(no model changes; ~1–2 weeks elapsed, mostly parallel)*

| # | PR / task | Notes |
|---|---|---|
| 0.1 | **Decision sign-off** with Constance / product: D1–D9 (architecture doc §12) + N1–N12 (§4 below) | D1 (broker catalog), D7 (self-service orgs) and N1–N3 (OTP scope) change code shape — don't start Phase 1 without them |
| 0.2 | **Token hygiene PR**: per-env keys from env vars, iss/aud on, lifetimes 12–24 h / 14–30 d, remove MasterPassword, refresh checks `IsActive`+`EmailConfirmed`, dual-key rotation support | §2.5. Coordinate the forced re-login window |
| 0.3 | **Leak-closure PR**: `[MustHavePermission]` on AdminController email-logger/data-cleanup/bubbies endpoints; redact `Authorization` header in `RequestLoggingMiddleware`; stop logging `access_token` query strings | Gate for OTP |
| 0.4 | **Auth-flow bugfix PR**: invite endpoint gets a permission attribute; cancelled-invitation acceptance filters `Deleted`; resend-verification issues fresh code/expiry; URL-encode reset tokens; password policy + Password==Confirm validation; seeded admin password from env; fix `BrandValidationMiddleware` 200-status bug; add rate limiting + lockout | All confirmed bugs, independent of the new model |
| 0.5 | **Ops: rotate committed secrets** (JWT key, SMTP, AWS, DB, Hangfire, API keys) and move to env/secret store | The git history keeps the old values — rotation, not deletion |
| 0.6 | **Staging pre-check queries** (report-only, staging DB): the five from architecture doc §10.2-1, plus duplicate `NormalizedEmail`s, `IsActive=false` users (suspended vs removed-from-brand overload), pending/cancelled `InvitedUsers` anomalies | Output = the data-fix list that makes the Phase 1 backfill clean |
| 0.7 | Small cache fixes: invalidate on `RemoveRoleAsync`; delete the dead `RolesUpdated` branch or wire it | |

### Phase 1 — Organization schema + shadow backfill *(ships dark)*

| # | PR / task | Notes |
|---|---|---|
| 1.1 | New module skeleton `Modules\Organization` (Domain + Application), wired per repo checklist (sln, API.csproj, Modules.Shared.Infrastructure ref, ModuleStartup, **Dockerfile COPY list**) | Entities per architecture doc §3.2 on `AuditableEntity`; fluent mapping in `MainDbContext`; enums start at 5 step 5; `ModuleActions` [Flags] View=1 Create=2 Edit=4 Delete=8 Export=16 |
| 1.2 | Migration #1 (`--context MainDbContext`): Organizations, Memberships, Roles, RolePermissions, BrandConnections, BrandAccess, BrandAccessModules, Invitations (+ Domains, AccessRequests if D7 keeps them); filtered unique indexes `WHERE "Deleted" = FALSE`; `Modules.AvailableActions` column; **`ModuleAssignments.OrganizationID` added alongside `BrandId`/`BrokerId`** (deviation from doc §10.2-7: don't drop the old columns yet — legacy reads/writes and the admin FE still use them until Phase 5; the entitlement service writes both) | Also: FK `Brands.ID → Organizations.ID` deferred to after backfill |
| 1.3 | Migration #2: `BrokerageOrganizationID` (nullable for now) on `MarketOverview`, `CategoryReview`, `CategoryReviewCalender`, `BrandReport` (invariant 11/D6) | Backfilled in 1.5; enforced in Phase 4 |
| 1.4 | Seed the 4 org roles + RolePermissions (idempotent, in `MainDbInitializer` or an `ICustomSeeder`) | |
| 1.5 | **Backfill Hangfire job** modeled on FileKeyBackfill (run entity + status endpoint + `[DisableConcurrentExecution]`): doc §10.2 steps 3–8 + `BrokerageOrganizationID` backfill from `CreatedBy`. Idempotent and re-runnable; writes a reconciliation report (counts, orphans, mismatches) | Hangfire `WorkerCount=1`: run off-hours or bump workers. Job actor is `Guid.Empty` unless passed explicitly — pass the triggering admin's id |
| 1.6 | Unique index on `Users.NormalizedEmail` (ApplicationDb migration) once 0.6 shows no duplicates | |

**Done when:** backfill runs clean on staging; reconciliation report shows every brand/broker/sub-user mapped; re-running changes nothing.

### Phase 2 — Resolver, `/me/access`, audit foundation *(still shadow — nothing enforces yet)*

| # | PR / task | Notes |
|---|---|---|
| 2.1 | `IAccessContext`/resolver per doc §6.2: interface in `BuildingBlocks.Application`, implementation in `BuildingBlocks.Infrastructure` on `IDapperRepository` (middleware can't reference modules). Scoped, lazy. Checks user `IsActive` + membership + org status on every resolve | Honors D1 decision |
| 2.2 | Caching per doc §6.4: `access:{userId}:{orgId}:v{n}` + per-org version counters through `ICacheService`, 5-min TTL safety net. In-memory cache is fine while this stays a single container; keep the abstraction so Redis is a config flip | Version-bump helper called by every Phase 3 write |
| 2.3 | `OrganizationID` header: `ICurrentUser.GetOrganizationID()`, `CurrentUserMiddleware` parsing, Swagger header attribute; **missing header + exactly one membership = that membership** (keeps both FEs working untouched) | Doc §6.1 |
| 2.4 | `GET /api/v1/me/access` (new MeController) with the doc §6.5 shape | FE adopts it in Phase 5 |
| 2.5 | **Shadow comparator**: a filter that resolves access for real traffic and logs disagreements with `BrandValidationMiddleware`/legacy helpers (no behavioral effect) | Doc §10.3-1; run until quiet |
| 2.6 | **`Auditing.AuditEvents` + `IIamAuditService`** (same-transaction Dapper insert; explicit actor for Hangfire jobs) + read API + platform audit endpoint | §2.6; catalog in Appendix A |

### Phase 3 — Management endpoints + dual-write bridge + OTP *(new writes, old paths still authoritative)*

| # | PR / task | Notes |
|---|---|---|
| 3.1 | Platform APIs: `OrganizationsController`, `BrandConnectionsController`, `ConfigurationsController` module-assignments accept `organizationId` (and keep accepting `brandIds`/`brokerIds`, mapping internally); platform memberships view; new `Permissions.Platform.*` claims seeded to ADMIN | Doc §9; every write → AuditEvent + version bump |
| 3.2 | Org APIs: `MembersController`, `InvitationsController` (new `Organization.Invitations`, secure-random tokens, brand lists validated against active connections), `BrandAccessController`, `ConnectionsController` | Enforced with `[RequireOrgPermission]` from day one — these endpoints are new, so there's no legacy contract to preserve |
| 3.3 | **Dual-write bridge** (the key anti-drift move): the legacy mutation endpoints — `users/invite`, `registration` (invited accept), `assign-role`, `brands/assign-*`/`remove-*`, sub-user toggles, `UpsertBrandRequest` role swap — call the new membership/connection/brand-access services inside the same flow, so the shadow tables stay correct without re-running the backfill. Weekly backfill re-run (report-only) as a drift alarm | Without this, Phase 4 cut-over data is stale and you redo the migration — this is the single biggest rework risk |
| 3.E | **OTP track** (parallel, any time after Phase 0): `VerificationCodes` table + hashed codes; verify/resend/discard endpoints (anonymous, rate-limited, enumeration-safe); `EmailModule` entries + DB templates for OTP and the new invitation mail; mask codes in `EmailLoggers` | §2.4. Link flow keeps working; FE switches when it ships the OTP screen |

### Phase 4 — Enforcement cut-over

| # | PR / task | Notes |
|---|---|---|
| 4.1 | `[RequireModule(brand:, broker:, actions)]` + `[RequireOrgPermission]` policy providers/handlers (pattern: existing `PermissionPolicyProvider` with `module:`/`org:` prefixes); handler-level `_access.Demand(...)` for Upserts | Doc §6.3 |
| 4.2 | Annotate **every** endpoint (`[RequireModule]` / `[RequireOrgPermission]` / `[MustHavePermission]` / `[AllowAnonymous]` / explicit `[Authorize]` for authenticated-only) — the ~426 bare actions, controller by controller | Biggest mechanical chunk; split per module |
| 4.3 | **Reflection test** in a new Host test project: discover controllers from `typeof(VersionedApiController).Assembly` (don't rely on the "Controller" suffix — `MarketOverviews` lacks it), require `IAuthorizeData`/`IAllowAnonymous`, committed baseline for not-yet-annotated actions that only shrinks. Set `RunSettingsFilePath` so coverlet doesn't drag the coverage gate | Doc §8-13 |
| 4.4 | Flip: resolver enforces (403s), `BrandValidationMiddleware` + CategoryReviewAccessHelper + PromoTabAccessHelper + PromotionalManagementBrandAccess retired; cross-brand endpoints use the allowlist; `BrokerageOrganizationID` becomes required on broker-owned reads/writes (D6) | Only after 2.5's disagreement log has been quiet |
| 4.5 | `GET /brands/me` reimplemented **on the resolver with the exact legacy contract**: same `role` string (derived from the membership), same `modules[]` shape (`id, slug, parentModuleId, audience, brandIds, brokerIds`), `canAccessTradespend` still emitted (from the module entitlement once D9 is accepted) | The web FE fails **open** if `modules` is missing — contract tests on this endpoint are mandatory |

### Phase 5 — Frontend migration + retirement *(separate effort, listed for completeness)*

Web + admin move to `/me/access`, `OrganizationID` header, OTP screen, new management UIs; admin's module-assignment screens move to `organizationId`. Then: legacy endpoints removed, dual-write bridge deleted, `BrandId`/`BrokerId` dropped from `ModuleAssignments`, `Brands.UserID`/`BrandSubUsers`/`BrandBrokers`/`UsersHierarchy`/`InvitedUsers` dropped, business roles deleted, access-token lifetime tightened to ≤1 h, old link-verification columns removed.

---

## 4. Decisions to lock before coding

D1–D9 are in the architecture doc §12 (D1 — whose catalog a broker uses — literally changes one resolver line but drives the grant editor, so it must be signed first). New ones from this review:

| # | Question | Recommendation |
|---|---|---|
| N1 | Does OTP replace the signup verification link only (demo behavior), with invitations staying link-based and auto-verifying? | **Yes.** Smallest change, matches the demo contract |
| N2 | Signed-in-but-unverified state (demo) vs today's "no login until verified"? | **Keep today's model**; verify stays anonymous (email+code). Revisit only if product demands the demo UX |
| N3 | Does self-signup still require admin activation (today: verified users sit inactive until an admin flips `IsActive` and assigns a role)? | **Retire manual activation**: email verification + membership (invite/access request) becomes the gate. `IsActive` stays as a platform kill switch. This is the demo's model and removes a support bottleneck — but it changes who can get in, so Constance must sign it |
| N4 | Who sees org audit events? Demo shows the feed to every member | Feed (recent events) = `organization.view`; full log + filters = org admins; platform log = Platform Admin |
| N5 | Access-token lifetime now | 12–24 h now, ≤1 h after FE refresh plumbing is fixed (web: axios uses the token from the last server render; admin: 16.7 h refresh-buffer bug) |
| N6 | Domain discovery matches **unverified** domains in the demo, and the demo's verify-domain page has no permission check | Discovery matches verified domains only; `domain.manage` (or Platform Admin) required to verify; real DNS TXT check server-side |
| N7 | Custom-role CRUD and module-catalog CRUD (both in the demo) | Module catalog CRUD already exists in the backend (ConfigurationsController) — keep. Custom roles: **defer** (schema ready via `IsSystem`) |
| N8 | JWT key-rotation window | Dual-key validation for 7–14 days after announcing, then drop the old key (forces re-login of stragglers) |
| N9 | Audit sign-ins / failed sign-ins? | Yes — `auth.signed_in`, `auth.signin_failed`, `auth.lockout` (cheap once lockout exists); demo doesn't, but security review will ask |
| N10 | Retention: SoftDeletePurge will physically delete soft-deleted `BrandAccess` rows (ended-connection history) after the retention window | Accept (history lives in AuditEvents) — or exclude the Organization schema from the purge job |
| N11 | Module action flags: demo UI shows 6 (view/create/update/delete/import/export); doc defines 5 flags with Import→Create | **5 flags** per the doc; the demo UI gets relabeled in Phase 5 |
| N12 | What does `IsActive=false` mean per existing user at backfill time (deliberately deactivated vs removed-from-one-brand overload)? | Decide per pre-check 0.6 output: deactivated-by-admin → user stays inactive; removed-from-brand → active user, no membership for that brand |

---

## 5. Contracts that must not break (rework insurance)

Verified against both frontends on develop; breaking any of these means FE hotfixes mid-rollout:

1. `GET /api/v1/brands/me` — exact shape (`role` uppercase legacy string, `brands[]`, `modules[]` with `id/slug/parentModuleId/audience/brandIds/brokerIds`, `canAccessTradespend`). The web app **fails open** (shows every module) if `modules` is empty/missing.
2. **403, never 401, for authorization failures** (missing membership, module denied, unverified, suspended). The web app signs out on any 401; the admin app refresh-retries then logs out.
3. `POST /api/v1/auth/login`, `/api/v1/admin/login` (403 + message for non-admins), response `tokenInfo/userInfo`, error envelope `{error:{messages:{Email|Auth}}}` — `messages.Email` is the web app's unverified-detection hook.
4. `POST /api/v1/auth/refresh-token {token, refreshToken}` returning `token/tokenExpiryTime/refreshToken(/refreshTokenExpiryTime)`; tolerate refresh-token reuse (no strict one-time rotation).
5. Email link formats: `/signup?email&code` (invite), `/verify-email?code&email`, `/reset-password?code&email`; registration body (`verificationCode`, `hasInvited`) and response (`emailConfirmed`, `isActive`).
6. `OrganizationID` header is **optional** (single-membership default); `BrandID` keeps its exact semantics — the web app sometimes omits it or sends a stale one from a persisted store, so cross-brand/broker endpoints must keep working headerless.
7. Admin app specifics until its Phase 5: PascalCase role names from `GET /roles`, `roles[].name` on the users list, invite `userType` 1–5 + `parentUserID`, the hard-coded Broker role GUID `6dc47cc4-9c1d-4c7c-938f-bf063994142d` used to list parent brokers, `brokerID` as the module-assignment target, and the `preview/apply/details` bodies with `brandIds` XOR `brokerIds`.

Process insurance:

- **Dual-write bridge (3.3) before any FE or admin behavior moves** — otherwise shadow data drifts and the cut-over needs a re-migration.
- Migrations auto-apply at startup (`Program.cs:59-60`) — a deploy *is* a migration. Keep schema migrations additive until Phase 5; destructive drops are their own deliberately-scheduled deploys.
- Run the staging pre-checks (0.6) before writing the backfill, not after it fails.
- Don't copy `DeleteBrandRequest` (unwired, never persists) or rely on `ICurrentUser.IsInRole` (always false — no role claim in the token; the BrandReport audit endpoint has this live bug today).

---

## 6. Security fix list (Phase 0 backlog, confirmed locations)

| Severity | Issue | Location |
|---|---|---|
| Critical | MasterPassword accepted on both logins, same committed value in all envs | `TokenService.cs:59-60, 85-86` |
| Critical | One committed JWT signing key for dev/staging/prod + `ValidateIssuer/Audience=false` → cross-environment token forgery | appsettings.* + `Auth\Jwt\Startup.cs:35-37` |
| Critical | Email-logger admin endpoints readable by **any authenticated user**, bodies include reset links/invite codes | `AdminController.cs:72-160` |
| High | `Authorization: Bearer` + `access_token` query logged for every request | `RequestLoggingMiddleware.cs:46-56` |
| High | Access tokens live ~41 days (prod) / ~417 days (staging); refresh only 2 days; no revoke; refresh ignores `IsActive`/`EmailConfirmed` | appsettings, `TokenService.cs` |
| High | `POST /users/invite` has no permission attribute | `UsersController.cs:106-114` |
| High | Cancelled invitations still acceptable (lookup misses `Deleted` filter; MainDbContext has no global filter) | `UserService.CreateUpdate.cs:271-349` |
| High | No lockout, no rate limiting, login reveals account state before password check (enumeration); anonymous `users/check-by-email` | `TokenService.cs:46-68` |
| High | SQL built by string interpolation in user list/search | `UserService.cs:204-217, 362-426` |
| Medium | Seeded admin `admin@caboodle.com` with hard-coded 6-char password on every startup | `ApplicationDbSeeder.cs:87-125` |
| Medium | Password policy: min length 6, no complexity, no Password==Confirm validation | `Identity\Startup.cs:13-17` |
| Medium | Resend-verification reuses the code without extending expiry (user locked out after 5 days) | `UserService.CreateUpdate.cs:117-135` |
| Medium | Reset token not URL-encoded in the email link | `UserService.Password.cs:14-35` |
| Medium | `BrandValidationMiddleware` writes a 400 body with HTTP 200 | `BrandValidationMiddleware.cs:66-72` |
| Medium | Committed secrets: SMTP, AWS, DB, Hangfire, external API keys (dev appsettings has live-looking AWS keys) | appsettings.* — rotate, don't just delete |
| Medium | Anonymous DataHub import endpoints | `DataHubController.cs:37-58, 110-114, 805-808` |
| Low | NextAuth secret (`NEXT_PUBLIC_JWT_SECRET`) committed in both FE repos and likely bundled client-side in admin — can decrypt/forge the session cookie holding the backend refresh token | FE repos' `.env*`, admin `constant.ts` |

---

## Appendix A — New tables beyond the architecture doc

**`Identity.VerificationCodes`** (MainDbContext, like `InvitedUsers`):

| Column | Notes |
|---|---|
| `ID` uuid PK | |
| `UserID` uuid | cast of `Users.Id`, no FK (same as every link table) |
| `Email` text | snapshot at send time |
| `Purpose` int | `SignupEmail = 5`, later `EmailChange = 10`, … |
| `CodeHash` text | HMAC/SHA-256 of the 6-digit code — never store or email-log the code in clear |
| `ExpiresOn` | ~10 min |
| `Attempts` int | invalidate at 5 |
| `ConsumedOn?`, `InvalidatedOn?` | resend invalidates the previous row |
| `CreatedOn`, `RequestIp?` | cooldown + rate limiting evidence |

**`Auditing.AuditEvents`** (MainDbContext, append-only — deliberately **no** `Deleted` column so the purge job never touches it):

| Column | Notes |
|---|---|
| `ID` uuid PK | |
| `Action` text | normalized catalog: demo's 35 actions + `auth.*`, `support.closed`, `verification.*`, side-effect events |
| `ActorUserID?` uuid, `ActorName` text | denormalized — users get hard-deleted |
| `OrganizationID?` uuid | scope for org feeds |
| `BrandOrganizationID?` uuid | for brand-access events |
| `TargetType?` text, `TargetID?` uuid, `TargetName?` text | what was acted on |
| `IsSupportAccess` bool | explicit from the support session, never inferred |
| `Description` text | ready-made sentence (demo pattern) |
| `Metadata` jsonb | old/new role, module diff, invitation email, … |
| `CreatedOn` timestamp | indexes: `(OrganizationID, CreatedOn DESC)`, `(ActorUserID, CreatedOn DESC)`, `(TargetType, TargetID, CreatedOn DESC)` |

## Appendix B — Demo ↔ backend alignment notes

- Demo field names use `*At` timestamps and a `deletedAt` soft delete; the backend uses `*On` + the `Deleted` flag per `AuditableEntity`. Backend wins; map in DTOs.
- Demo module actions are 6 strings (`view/create/update/delete/import/export`); backend uses the 5-flag enum (N11), `update`→`Edit`, `import`→`Create`.
- Demo behaviors that are demo shortcuts, **not** contracts: any-6-digits OTP, no code expiry/attempt limits, non-random invitation tokens, discovery matching unverified domains, unauthenticated domain verification, invalid-brand fallback to first brand (backend: 403 per doc §6.1), support-access flag heuristics, invitation acceptance replacing the signed-in session without checks.
- Demo endpoints the doc's API table omits but Phase 3 should include (all exist in the demo UX): email-domain discovery, access requests (create/approve-with-role/reject + lists), domain add/verify/reset/remove, platform-wide users/invitations/requests/domains lists, org self-update (`organization.update`), dashboard/sidebar counts.
