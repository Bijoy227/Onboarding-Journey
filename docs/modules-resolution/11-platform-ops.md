# 11. Platform ops — resolution workbook
Status: proposed · 2026-10-06 · BE develop @ 07f8fa01
Scope: AdminController (11) + ConfigurationsController (9) + FileKeyBackfillController (2) + SoftDeletePurgeController (7) = 29 actions · BE project(s): Modules.Admin (plus 1 handler in Modules.ProductSpecs.Application and the admin token service in BuildingBlocks.Application)

Path shorthand (backend repo root `D:\Fork\Caboodle BE Repository\caboodle.backend`):
- `MAA\…` = `caboodle\src\Modules\Admin\Modules.Admin.Application\…`
- `MSI\…` = `caboodle\src\Modules\Shared\Modules.Shared.Infrastructure\…`
- `BB\…` = `caboodle\src\BuildingBlocks\…`
- `Host\…` = `caboodle\src\Hosts\API\…`
- `MHP(A, R, M)` = `[MustHavePermission(CaboodleAction.A, CaboodleResource.R, CaboodleModule.M)]`
- Permission-name form: `Permissions.{Module}.{Resource}.{Action}` (`BB\Core\Shared\Authorization\CaboodlePermissions.cs:227`).

## 1. What this area is

The Platform Admin's operational surface: admin sign-in, the global pipeline deal-stage vocabulary, email delivery logs (list/detail/resend/suggestions), one-off data-cleanup jobs, external client-DB (bubbies) diagnostics, the module **catalog** and module **assignments** (the data every other workbook's slugs come from), the user-file-key backfill, and the soft-delete purge. Users are Platform Admins only — via the admin app (`caboodle.admin`) for login, deal stages, email logs and module configuration, and via Swagger/ops tooling for everything else; caboodle.web must never call any of it (`_inventory.md` Section C header). Data lives in `Email.EmailLoggers`, `CRM.PipelineDealStages` (global `BrandID IS NULL` rows), `Configuration.Modules`/`ModuleDependencies`/`ModuleAssignments`/`ModuleAssignmentHistories`, and `DataLifecycle.SoftDeletePurge*`/`UserFileKeyBackfillRuns` (`MSI\Persistence\MainDbContext.cs:470,1244-1367`). Nothing here migrates to `[RequireModule]`: the deliverable is a complete `[MustHavePermission]` mapping — existing claims verified, new `Permissions.*` proposed for the eight rows that today have **no guard at all** and are callable by any authenticated user (IAM plan Phase 0.3 / §6).

## 2. Data ownership

| Table | Ownership class | Scoping change needed | Notes |
|---|---|---|---|
| `Email.EmailLoggers` | Platform | None (no tenant column; keyed by send) | **Sensitive**: `Body` holds reset links, invite/verification codes in clear (IAM plan §6, Critical). Searched with `Body ILIKE` (`MAA\EmailLoggers\GetAllEmailLoggersRequest.cs:64-72`), returned whole by detail (`GetEmailLoggerDetailRequest.cs:58-76`). Purge-eligible — only `Email.EmailTemplates` is excluded (`MAA\SoftDeletePurge\PurgeExclusions.cs:15-18`). Phase 3.E masks OTP codes at write time; broader redaction = Q1 |
| `CRM.PipelineDealStages` (`BrandID IS NULL` rows) | Platform | None | Global default vocabulary. Rows with `BrandID` set are Brand-owned and belong to the CRM/pipelines workbook — but this area's PUT can load **any** row by id (`MAA\PipeLine\UpdatePipeLineDealStageRequest.cs:55-66`); see Q6 |
| `Configuration.Modules` / `ModuleDependencies` | Platform | None | The module catalog — source of truth for every workbook's slugs (Section B). Seed semantics per `_inventory.md` Section B (reseed never overwrites `DisplayName`/`Description`). N7: catalog CRUD stays |
| `Configuration.ModuleAssignments` | Platform | **`BrandId`/`BrokerId` → `OrganizationID`** = `COALESCE(BrandId, BrokerId)`, then drop both columns + the check constraint (arch §10.2-7) | Id reuse (Brand orgs keep `Brands.ID`; Brokerage orgs take the primary broker's user id) makes the backfill a straight COALESCE — values are already correct |
| `Configuration.ModuleAssignmentHistories` | Platform (audit satellite) | Same key change as its parent | Written on every assign/remove and by backfill-all (`MAA\Configuration\Service\ModuleAssignmentService.cs:785-828`) |
| `DataLifecycle.SoftDeletePurgeSettings` / `SchemaRetentions` / `TableRegistries` / `Runs` / `RunDetails` | Platform | None | Purge job config + audit. `DataLifecycle` schema excludes itself from purging (`PurgeExclusions.cs:5-13`). **N10**: decide whether the purge may physically delete soft-deleted Organization-schema rows (ended-connection history) or the new schema joins the exclusion list |
| `DataLifecycle.UserFileKeyBackfillRuns` | Platform | None | Run bookkeeping for the file-key backfill job |
| (side-effect writes) `CRM.BannerSKUs`, `TradeSpend` promo events + sandbox events | Brand-owned (written cross-tenant) | None here | The two data-cleanup rows rewrite these platform-wide (`MSI\Services\SharedDataService\SharedDataService.cs:1450` sync from `Broker.MarketOverviews`; `:1098` per-unit-price resync). Ownership of the tables is covered by the CRM/TradeSpend workbooks |

## 3. Module catalog mapping

None. Every endpoint in this area is Platform territory (template guard table: `[MustHavePermission]` is the Platform-Admin mechanism and stays), plus one justified `[AllowAnonymous]` (admin login). No slug in either audience applies, and none may be invented — this controller **manages** the catalog the other workbooks map to.

**Gaps** (endpoints with no guard today → proposed catalog entries, consistent with the `Permissions.{Module}.{Resource}.{Action}` pattern and the existing `CaboodleModule.Admin` ops rows at `CaboodlePermissions.cs:169-173`; all land in Phase 0.3's leak-closure PR):

| New permission | Covers | New `CaboodleResource` |
|---|---|---|
| `Permissions.Admin.EmailLoggers.View` ("View Email Logs") | email-loggers list, detail, address-suggestions | `EmailLoggers` |
| `Permissions.Admin.EmailLoggers.Execute` ("Resend Logged Emails") | email-loggers/resend | `EmailLoggers` |
| `Permissions.Admin.DataCleanup.Execute` ("Run Data Cleanup") | data-cleanup/bannersku, data-cleanup/sync-per-unit-price | `DataCleanup` |
| `Permissions.Admin.BubbiesDb.View` ("View Client DB Diagnostics") | bubbies-db/connectivity, bubbies-db/tables | `BubbiesDb` |

Added to `CaboodlePermissions._all` they seed to ADMIN automatically and to no one else — the Broker/SubBroker sets filter on `Module == CaboodleModule.Broker` (`CaboodlePermissions.cs:203-221`), which non-Broker modules never pass. The arch §4.1 additions (`Permissions.Platform.Organizations.*`, `.BrandConnections.*`, `.Memberships.*`) belong to the new IAM controllers (arch §9), not to these four; the only §4.1 rows that land here are the **existing** `Permissions.Configuration.ModuleAssignments.View`/`.Assign`, which keep their names and re-target `OrganizationID`.

## 4. Endpoint authorization matrix

Claim-set legend applies to every MHP row below: ADMIN holds all permissions (`BB\Infrastructure\Persistence\Initialization\ApplicationDbSeeder.cs:52-58`); the Broker/SubBroker sets contain only `CaboodleModule.Broker` permissions (`CaboodlePermissions.cs:203-221`), so every `Admin`/`Configuration`/`PipeLine`-module row here is **ADMIN-only in practice**. Brand roles are seeded no claims at all. "—" in Today's guard = no attribute; only the global authenticated-user fallback applies (any signed-in user of any role, including UNASSIGNED). No row reads the `BrandID` header.

### 4.1 AdminController — `/api/v1/admin` (11)
File: `Host\Controllers\Admin\AdminController.cs`

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST login | ITokenService.GetAdminTokenAsync (no mediator) | `[AllowAnonymous]` (`AdminController.cs:28-37`) | keep `[AllowAnonymous]` | Justified: credential exchange. Contract: 403 + message for non-admins, response `tokenInfo/userInfo` (IAM plan §5-3). Token hygiene itself = Phase 0.2, Identity/IAM cross-ref |
| GET pipelines/dealstages | GetAllPipeLineDealStagesRequest | MHP(View, PipeLineDealStage, PipeLine) — ADMIN-only in practice (`CaboodlePermissions.cs:203-208`) | keep `[MustHavePermission]` | Lists only global rows (`""BrandID"" IS NULL`, `MAA\PipeLine\GetAllPipeLineDealStagesRequest.cs:46`). Duplicate-functionality route of PipelinesController `GET dealstages` (Section D) — retirement decided with the CRM workbook. Q6 |
| PUT pipelines/dealstages | UpdatePipeLineDealStageRequest | MHP(Update, PipeLineDealStage, PipeLine) — ADMIN-only | keep `[MustHavePermission]` + constrain to `BrandID IS NULL` rows | Handler loads **any** stage by id and renames it — including brand-owned stages the GET never shows (`MAA\PipeLine\UpdatePipeLineDealStageRequest.cs:55-66`). Q6 |
| POST data-cleanup/bannersku | BannerSKUDataCleanupRequest | **—** — any authenticated user | MHP(Execute, DataCleanup, Admin) = `Permissions.Admin.DataCleanup.Execute` *(new, Phase 0.3)* | Rewrites `CRM.BannerSKUs` platform-wide from `Broker.MarketOverviews` (`MSI\…\SharedDataService.cs:1450`). §5 do-not-reproduce. Q2 |
| GET data-cleanup/sync-per-unit-price | SyncPricingsOfEventsRequest (Modules.ProductSpecs.Application) | **—** — any authenticated user | MHP(Execute, DataCleanup, Admin) *(new, Phase 0.3)* | Rewrites per-unit price across all TradeSpend + sandbox events (`MSI\…\SharedDataService.cs:1098`). A **GET with side effects** — flip to POST when gated. §5 do-not-reproduce. Q2 |
| POST email-loggers | GetAllEmailLoggersRequest | **—** — any authenticated user | MHP(View, EmailLoggers, Admin) = `Permissions.Admin.EmailLoggers.View` *(new, Phase 0.3)* | Paged list over `Email.EmailLoggers`, filter searches `Body ILIKE` (`MAA\EmailLoggers\GetAllEmailLoggersRequest.cs:64-72`). **Data sensitivity: bodies contain reset links and invite/verification codes — account-takeover vector while open (IAM plan §6, Critical).** §5 do-not-reproduce. Q1 |
| POST email-loggers/resend | ResendEmailsRequest | **—** — any authenticated user | MHP(Execute, EmailLoggers, Admin) = `Permissions.Admin.EmailLoggers.Execute` *(new, Phase 0.3)* | Enqueues `EmailResendJob` for arbitrary logger ids — re-sends to original recipients, no cap (`MAA\EmailLoggers\ResendEmailsRequest.cs:39-51`). Execute per §4.3 (platform operation). §5 do-not-reproduce. Q1 |
| GET email-loggers/{id} | GetEmailLoggerDetailRequest | **—** — any authenticated user | MHP(View, EmailLoggers, Admin) *(new, Phase 0.3)* | Returns the full `Body` (`MAA\EmailLoggers\GetEmailLoggerDetailRequest.cs:58-76`) — the single worst leak of the eight. §5 do-not-reproduce. Q1 |
| GET email-loggers/address-suggestions | GetEmailAddressSuggestionsRequest | **—** — any authenticated user | MHP(View, EmailLoggers, Admin) *(new, Phase 0.3)* | Distinct From/TO values = a platform-wide email directory (`MAA\EmailLoggers\GetEmailAddressSuggestionsRequest.cs:56-73`). §5 do-not-reproduce |
| GET bubbies-db/connectivity | CheckBubbiesDbConnectivityRequest | **—** — any authenticated user | MHP(View, BubbiesDb, Admin) = `Permissions.Admin.BubbiesDb.View` *(new, Phase 0.3)* | Opens the external client SQL Server from config and echoes raw SQL error text to the caller (`MAA\ClientDatabase\CheckBubbiesDbConnectivityRequest.cs:96-131`). §5 do-not-reproduce. Q3 |
| GET bubbies-db/tables | GetBubbiesDbTablesReportRequest | **—** — any authenticated user | MHP(View, BubbiesDb, Admin) *(new, Phase 0.3)* | Per-table read-access report over the client DB. §5 do-not-reproduce. Q3 |

### 4.2 ConfigurationsController — `/api/v1/configurations` (9)
File: `Host\Controllers\Admin\ConfigurationController.cs` (class `ConfigurationsController`). All guards verified present; all ADMIN-only in practice. Arch §9: the four module-assignment rows "now take `organizationId`"; Phase 3.1 keeps `brandIds`/`brokerIds` accepted and mapped internally — the id-reuse trick (§10.2) makes that mapping the identity function. **Admin-FE contract (IAM plan §5-7): the `preview`/`apply`/`details` bodies with `brandIds` XOR `brokerIds` must keep working until the admin FE migrates (its Phase 5).** Body transition documented per row.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags — body transition |
|---|---|---|---|---|
| GET modules | GetConfigurationModulesRequest | MHP(View, Modules, Configuration) — ADMIN-only | keep `[MustHavePermission]` | Catalog read, `?audience=` query. No tenant key → **no body change**. N7 (catalog CRUD stays) |
| POST modules | CreateConfigurationModuleRequest | MHP(Create, Modules, Configuration) — ADMIN-only | keep | Catalog row create. No body change. N7 |
| PUT modules/{id:guid} | UpdateConfigurationModuleRequest | MHP(Update, Modules, Configuration) — ADMIN-only | keep | DisplayName/Description only (controller doc). No body change. N7 |
| DELETE modules | DeleteConfigurationModulesRequest | MHP(Delete, Modules, Configuration) — ADMIN-only | keep | Soft-delete; requires dependents/children in the set; blocks on live assignments unless `forceDelete`. No body change |
| POST modules/seed | SeedConfigurationModulesRequest | MHP(**Execute**, Modules, Configuration) — verified present, ADMIN-only | keep (Execute stays platform, §4.3) | Idempotent catalog seed (Section B semantics). Empty body — unchanged |
| POST module-assignments/preview | PreviewModuleAssignmentsRequest | MHP(View, ModuleAssignments, Configuration) = `Permissions.Configuration.ModuleAssignments.View` (arch §4.1 "existing") — ADMIN-only | keep; re-target org | Today: `{brandIds?, brokerIds?, modules[{slug,enabled}]}` — **XOR enforced** (`MAA\Configuration\Service\ModuleAssignmentService.cs:30-33`); broker targets validated as users in role BROKER via the user store (`:86-93,830-836`). Target: `{organizationIds, modules[]}`, legacy keys still accepted (Phase 3.1); target validity becomes "organization exists, type matches audience". Q4 |
| POST module-assignments/apply | ApplyModuleAssignmentsRequest | MHP(**Assign**, ModuleAssignments, Configuration) = `….Assign` — ADMIN-only | keep; re-target org | Same body + transition as preview. Per-target transaction with conflict rollback (`MAA\Configuration\CRUD\ApplyModuleAssignmentsRequest.cs:107`); writes `ModuleAssignmentHistories`. Q4 |
| POST module-assignments/details | GetModuleAssignmentDetailsRequest | MHP(View, ModuleAssignments, Configuration) — ADMIN-only | keep; re-target org | Today: `{brandIds and/or brokerIds, audience?}` — AND/OR, not XOR (`ModuleAssignmentService.cs:216-236`). Target: `{organizationIds, audience?}`, legacy keys accepted. **Response keeps per-module `brandIds`/`brokerIds` arrays until the admin FE migrates** (IAM plan §5-7). Q4 |
| POST module-assignments/backfill-all | BackfillAllModuleAssignmentsRequest | MHP(**Assign**, ModuleAssignments, Configuration) — ADMIN-only | keep; re-target org | Empty body (unchanged). Today targets every non-deleted brand (`MAA\Configuration\Seeding\BackfillAllModuleAssignmentsRequest.cs:94-103`) + every **active** user in role BROKER (`:105-123`); arch §9: must target organizations instead. Idempotent (insert-missing + re-enable), history rows stamped "Backfill all modules". Q5, N12 |

### 4.3 FileKeyBackfillController — `/api/v1/admin/file-key-backfill` (2)
File: `Host\Controllers\Admin\FileKeyBackfillController.cs` (explicit `[Route]`).

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET status | GetUserFileKeyBackfillStatusRequest | MHP(View, UserFileKeyBackfill, Admin) — verified present, ADMIN-only | keep `[MustHavePermission]` | Run progress + remaining-file count from `DataLifecycle.UserFileKeyBackfillRuns` |
| POST run | TriggerUserFileKeyBackfillRequest | MHP(**Execute**, UserFileKeyBackfill, Admin) — **verified present** (Execute-style platform permission retained, §4.3) | keep | Queues the Hangfire run; rejects while a run is Running unless stale > 6 h (`MAA\FileKeyBackfill\TriggerUserFileKeyBackfillRequest.cs:26,50-54`) |

### 4.4 SoftDeletePurgeController — `/api/v1/admin/soft-delete-purge` (7)
File: `Host\Controllers\Admin\SoftDeletePurgeController.cs` (explicit `[Route]`).

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET settings | GetSoftDeletePurgeSettingsRequest | MHP(View, SoftDeletePurge, Admin) — verified present, ADMIN-only | keep `[MustHavePermission]` | Singleton settings + per-schema retentions |
| PUT settings | UpdateSoftDeletePurgeSettingsRequest | MHP(Update, SoftDeletePurge, Admin) — verified | keep | |
| POST runs | SearchSoftDeletePurgeRunsRequest | MHP(View, SoftDeletePurge, Admin) — verified | keep | Search → View per §4.3 mapping |
| GET runs/{runId:guid} | GetSoftDeletePurgeRunRequest | MHP(View, SoftDeletePurge, Admin) — verified | keep | |
| POST runs/details | SearchSoftDeletePurgeRunDetailsRequest | MHP(View, SoftDeletePurge, Admin) — verified | keep | |
| POST seed | SeedSoftDeletePurgeRequest | MHP(**Execute**, SoftDeletePurge, Admin) — **verified present** | keep | Idempotent manifest sync |
| POST runs/trigger | TriggerSoftDeletePurgeRunRequest | MHP(**Execute**, SoftDeletePurge, Admin) — **verified present** | keep | 404 when settings missing, validator error when `IsEnabled = false` (`MAA\SoftDeletePurge\Runs\TriggerSoftDeletePurgeRunRequest.cs:28-38`). **N10**: Organization-schema purge behaviour must be decided before the new tables ship |

## 5. Parity notes

**What each mechanism actually allows/denies today:**

- **Claim seeding is the only gate on every MHP row.** ADMIN receives all of `CaboodlePermissions._all` (`ApplicationDbSeeder.cs:52-58`); Broker/SubBroker receive only `CaboodleModule.Broker` rows (`CaboodlePermissions.cs:203-221`); brand roles receive nothing. So all 21 guarded rows here are ADMIN-only in practice, and the admin app's own sessions always pass (its sign-in is `/admin/login`, which rejects non-admins — IAM plan §5-3).
- **The eight attribute-free AdminController rows** (data-cleanup ×2, email-loggers ×4, bubbies-db ×2, `AdminController.cs:72-160`) sit behind nothing but the authenticated-user fallback: every brand owner, sub-user, broker, sub-broker and UNASSIGNED user can call them today.
- **`ModuleAssignmentService`** does its own role checks in the handler, not in attributes: broker targets must be users in role BROKER via `IUserService.GetRolesAsync` (user-store lookup, `ModuleAssignmentService.cs:830-836`); brand targets must be non-deleted `Brand.Brands` rows (`:48-57`). Preview/apply enforce `brandIds` XOR `brokerIds` (`:30-33`); details requires at least one list (`:224-225`).
- **`BackfillAllModuleAssignmentsRequest`** derives its broker target list from `Identity.UserRoles` joined to role BROKER with `IsActive = TRUE` (`:105-123`) — the `IsActive` overload (N12) silently drops deactivated brokers from backfill.
- **Pipeline deal stages**: GET is global-rows-only (`BrandID IS NULL`), PUT is any-row-by-id — an asymmetry, not a privilege leak (both ADMIN-only). GET also passes a `brandID` Dapper parameter its SQL never references (dead parameter).
- **Apply is transactional per target** (`ApplyModuleAssignmentsRequest.cs:107`): dependency conflicts roll back that target and continue (partial success response). Backfill-all runs four set-based idempotent statements without a wrapping transaction.

**Resolver must-match list:** empty. This area never moves to `[RequireModule]`/the resolver; the comparator only needs to confirm (a) the 21 guarded rows behave identically before and after Phase 4, and (b) the eight Phase 0.3 lockdown rows flip from 200 to 403 for non-admins — a whitelisted intentional tightening, not a disagreement.

**Do-not-reproduce list:**

1. Email-loggers ×4 readable/resendable by any authenticated user; list/detail expose `Body` with reset links and invite/verification codes (`AdminController.cs:94-138`; IAM plan §6 **Critical**) — fail-open, closed by Phase 0.3.
2. Data-cleanup ×2 triggerable by any authenticated user, rewriting `CRM.BannerSKUs` and TradeSpend pricing platform-wide (`AdminController.cs:72-90`) — fail-open; `sync-per-unit-price` additionally mutates via GET.
3. Bubbies-db ×2 let any authenticated user probe the external client database and read raw SQL error text (`AdminController.cs:142-160`) — fail-open.
4. `PUT pipelines/dealstages` renames brand-owned stages the admin list never shows (`UpdatePipeLineDealStageRequest.cs:55-66`) — ADMIN-only so low severity, but the target constrains to `BrandID IS NULL` (Q6); comparator whitelists the narrowing.

## 6. Code changes beyond attributes

- **New permission catalog entries (Phase 0.3):** add `EmailLoggers`, `DataCleanup`, `BubbiesDb` to `CaboodleResource` and the four §3 rows to `CaboodlePermissions._all` (`BB\Core\Shared\Authorization\CaboodlePermissions.cs:45-200`). The idempotent seeder grants them to ADMIN on next startup; Broker/SubBroker sets are untouched by construction. Same PR: redact `Authorization` header in `RequestLoggingMiddleware` and stop logging `access_token` query strings (Phase 0.3 bundle); flip `data-cleanup/sync-per-unit-price` to POST.
- **Phase 3.1 — organizationId dual-accept:** extend `PreviewModuleAssignmentsRequest`/`ApplyModuleAssignmentsRequest`/`GetModuleAssignmentDetailsRequest` with `OrganizationIds` and teach `ModuleAssignmentService.ResolveTargetsAsync`/`ResolveDetailsTargetsAsync` (`ModuleAssignmentService.cs:22-40,216-236`) to resolve organizations, keeping `brandIds`/`brokerIds` mapped internally (identity mapping under §10.2 id reuse). Replace the user-store BROKER role check (`:830-836`) with an organization-type check once Organizations exist. Seed the arch §4.1 `Permissions.Platform.*` claims to ADMIN in the same PR (they guard the new controllers, not these).
- **Migration (§10.2-7) key swap:** after `ModuleAssignments.OrganizationID = COALESCE(BrandId, BrokerId)` lands, rewrite the hand-written SQL in `ModuleAssignmentService` (loads `:249-263,754-773`, inserts/updates `:508-520,561-569,615-627,658-664`, history `:795-808`) and in `BackfillAllModuleAssignmentsRequest` (all four CTE statements) to the single key; `GetEnabledModuleIdsForBrandAsync`/`ForBrokerAsync` (`:703-735`) collapse into one organization-keyed query.
- **Backfill-all target enumeration:** replace `LoadBrandIdsAsync`/`LoadBrokerIdsAsync` (`BackfillAllModuleAssignmentsRequest.cs:94-123`) with enumeration of Organizations by type (arch §9); decision on suspended orgs and orgs without active members = Q5.
- **Email-logger write-side hygiene:** Phase 3.E masks OTP codes in `EmailLoggers`; broader body redaction = Q1. `PurgeExclusions` already lets purge age the logs out.
- **No `Demand()` call sites, no `BrandID`-header edge cases** — no action here reads the header (inventory Section A, all "—"), and no Upsert-style payload-dependent action exists. `BrandValidationMiddleware` retirement does not touch this area.
- **Deletions:** none — no access helpers to retire. The dead `brandID` parameter in `GetAllPipeLineDealStagesRequest.cs:53-57` can go whenever the file is next touched.

## 7. FE impact (Phase 5)

Admin app only (`caboodle.admin`); caboodle.web never calls these routes (`_inventory.md` Section C header: `configurations/*` is "admin-app only and must never be called from caboodle.web").

- **`/module-configuration`** (`src/app/(mainApp)/module-configuration/page.tsx` → `src/component/Configuration/ModuleConfiguration.tsx`, tabs Catalog/Assignments): Catalog tab (`ModuleCatalog.tsx`, `AddModule.tsx`) calls `GET/POST/PUT/DELETE configurations/modules`; Assignments tab (`ModuleAssignment.tsx`) calls `module-assignments/details`, `/preview`, `/apply`. `configuration.service.ts` normalizes the **XOR contract** (`buildAssignmentBody`: exactly one list non-empty, the other explicitly `null`; `buildDetailsBody`: at least one list) — this is the body shape that must keep working through Phase 3.1 until the admin FE's own migration (IAM plan §5-7). The broker target picker lists `broker.brokerID` values from `useGetAllBrokers` → `GET /brokers` (`ModuleAssignment.tsx:80-99,117-118,200-201`) — a surface the broker workbook already marks **superseded by IAM**; when the admin FE migrates, the picker moves to `GET /organizations` and the bodies to `organizationIds`.
- **`/email-loggers`** ("Sent Emails", `SidebarMenu.tsx:222`): calls all four email-logger endpoints via `emailLogger.service.ts`. The Phase 0.3 lockdown is invisible to this screen — admin sessions come from `/admin/login`, which non-admins cannot pass.
- **Pipeline configuration screen**: `pipeline-config.service.ts:18,30` calls `GET/PUT admin/pipelines/dealstages`.
- **Called by no FE at all**: `modules/seed`, `module-assignments/backfill-all`, both data-cleanup rows, both bubbies-db rows, and every FileKeyBackfill/SoftDeletePurge row — Swagger/ops surfaces; gating them breaks no screen.
- **When `/me/access` lands:** nothing changes here — these are platform screens gated by platform claims, not module grants. Sequencing note from Section C still applies: `backfill-all` (or targeted applies) must run for every tenant **before** the web FE flips `ALLOW_ALL_WHEN_NO_MODULES` off, and after cut-over the backfill targets organizations.

## 8. Test checklist

- **Matrix tests, all 29 rows:** ADMIN passes; BROKER, BROKERSUBUSER, brand owner, brand sub-user, UNASSIGNED each get 403 on every guarded row — including the eight newly gated ones — and `[AllowAnonymous]` only on `POST /admin/login`. Claim-set snapshot test: the four new permissions appear in the ADMIN set and in no Broker/SubBroker set.
- **Comparator (Phase 2.5):** zero disagreements on the 21 already-guarded rows; the eight lockdown rows are whitelisted intentional tightenings (expect 200→403 for non-admins at Phase 0.3, which ships **before** the comparator baseline is cut — so the baseline should already show 403).
- **organizationId transition contract tests (Phase 3.1):** legacy body (`brandIds` XOR `brokerIds`) and org body produce byte-identical assignment effects; XOR validation still rejects both/neither for preview/apply; details still accepts AND/OR; details response still carries per-module `brandIds`/`brokerIds` arrays (admin-FE contract, IAM plan §5-7); mixed-audience `organizationIds` behaviour per Q4 decision.
- **Apply semantics:** per-target partial success; a dependency conflict rolls back that target completely (no partial writes); history rows written for every assign/remove.
- **Backfill-all:** idempotent (second run inserts 0, re-enables 0); re-enable path covers disabled rows; history rows stamped; post-migration version targets organizations (Q5 decision) and still never downgrades an enabled assignment.
- **Trigger guards:** file-key backfill rejects a second trigger while Running and allows it after the 6 h stale window; purge trigger 404s without settings and validator-errors when disabled.
- **Admin login contract:** non-admin credentials → 403 + message (never 401), response shape unchanged (IAM plan §5-3).
- **Email-logger sensitivity:** post-0.3, non-admin reads 403; OTP codes masked in new log rows once Phase 3.E lands; purge eventually removes soft-deleted log rows (`Email.EmailLoggers` not in `PurgeExclusions`).
- **Reflection test (plan 4.3):** all 29 actions carry exactly one of the four guard kinds; the committed baseline shrinks by 8 when Phase 0.3 merges; explicit-`[Route]` controllers (FileKeyBackfill, SoftDeletePurge) are discovered.
- **N10 case:** purge run against a database containing soft-deleted Organization-schema rows behaves per the signed decision (deletes them, or the schema is excluded).

## 9. Open questions

1. **Q1 — Email-logger bodies hold live secrets.** Phase 0.3 locks down reads and Phase 3.E masks OTP codes, but reset links and invite codes already persisted — and newly sent ones — remain in clear for ADMIN readers and in backups. Recommendation: stop persisting full bodies for identity emails (store template id + recipient + metadata; mask tokenized URLs at write time), keep full bodies for business notifications; accept the loss of pixel-perfect delivery debugging. Needs Platform-Admin sign-off.
2. **Q2 — Keep or retire the data-cleanup endpoints?** Both are one-off maintenance scripts no FE calls, and one mutates via GET. Recommendation: gate now with `Permissions.Admin.DataCleanup.Execute` (Phase 0.3), convert `sync-per-unit-price` to POST, and schedule retirement into ops-triggered Hangfire jobs once their last planned use passes.
3. **Q3 — Bubbies-db diagnostics lifetime.** Client-specific external-DB probes hard-wired to one customer's config. Recommendation: gate now with `Permissions.Admin.BubbiesDb.View`, stop echoing raw SQL exception text in responses, and review retirement when that client integration ends.
4. **Q4 — Shape of the organizationId body (Phase 3.1).** Single `organizationId` vs `organizationIds[]`, and may one call mix Brand and Brokerage organizations? Recommendation: `organizationIds[]` with exactly one organization **type** per preview/apply call (preserves today's audience inference and XOR-era semantics); details may accept both types, mirroring today's AND/OR.
5. **Q5 — Backfill-all target set after migration.** Today: all non-deleted brands + all **active** BROKER users; arch §9 says organizations. Recommendation: all Active organizations of both types, decoupled from member `IsActive` (fixes the N12 overload silently skipping deactivated brokers); skip Suspended organizations. Needs Platform-Admin confirmation since it widens the set.
6. **Q6 — Admin pipelines/dealstages pair.** Duplicates PipelinesController `GET/POST dealstages` (Section D), and its PUT can rename brand-owned stages its own GET never lists. Recommendation: keep `[MustHavePermission]`, constrain the PUT to `BrandID IS NULL` rows, and decide retirement of the duplicate route together with the CRM/pipelines workbook.
