# 10. Brands & identity legacy — resolution workbook
Status: proposed · 2026-10-06 · BE develop @ 07f8fa01
Scope: BrandsController (19) + SubUsersController (12) + UsersController (22) + AuthController (2) + RolesController (7) + ProfileController (6) + RegistrationController (1 route / 2 dispatch paths) + SnsEmailWebhookController (1) = 70 actions · BE project(s): Modules.Brand, Modules.Broker (sub-broker handlers), Modules.Admin (admin user/invite lists), Modules.DataUpload (brand import/export), BuildingBlocks identity services (no Modules.* project)

This workbook is deliberately **thin**: most of its surface is the legacy organization/identity model that the IAM implementation plan (`docs/caboodle-be-iam-implementation-plan.md`) replaces wholesale. Per the template's **Superseded by IAM** convention, those rows keep their current guard until retired and name the §10.1/§9 replacement — no module guards are invented for them, and token/OTP/invite internals are cross-referenced (IAM plan §2.2–2.5, §5, §6), not re-analyzed.

Path shorthand (backend repo root `D:\Fork\Caboodle BE Repository\caboodle.backend`):
- `Host\…` = `caboodle\src\Hosts\API\Controllers\…`
- `MBrA\…` = `caboodle\src\Modules\Brand\Modules.Brand.Application\…`
- `MBkA\…` = `caboodle\src\Modules\Broker\Modules.Broker.Application\…`
- `BB\…` = `caboodle\src\BuildingBlocks\…`
- `MHP(A, R, M)` = `[MustHavePermission(CaboodleAction.A, CaboodleResource.R, CaboodleModule.M)]`
- `RM(...)` = `[RequireModule(...)]`, `ROP(...)` = `[RequireOrgPermission(...)]` per the template guard vocabulary.

## 1. What this area is

The legacy brand/owner/broker assignment surface (`BrandsController`), sub-user management (`SubUsersController`), platform user/role administration and the anonymous identity flows (`UsersController`, `AuthController`, `RolesController`, `RegistrationController`), the signed-in user's own profile (`ProfileController`), and the AWS SES/SNS email-event webhook. Users are the Platform Admin (admin app), brand owners/sub-users and brokers/sub-brokers (web app), plus anonymous visitors on login/signup/reset. Data lives in `Identity.Users/Roles/UserRoles/RoleClaims/InvitedUsers/UsersHierarchy`, `Brand.Brands/BrandSubUsers/BrandBrokers`, and `Email.EmailLoggers`/`Email.SnsEventLogs`; the six brand-APL report reads touch `CRM.*` and `ProductSpecs.*`. Everything except the APL reads, the brand profile/catalog surface, the profile endpoints and the webhook is the old org model that architecture doc §10.1 maps onto Organizations/Memberships/BrandConnections/BrandAccess/Invitations.

## 2. Data ownership

| Table | Ownership class | Scoping change needed | Notes |
|---|---|---|---|
| `Identity.Users` | Identity/IAM | None — no new columns by design (IAM plan §2.2) | Unique email index Phase 1.6; `IsActive` overloaded as membership today (N12) |
| `Identity.Roles` / `RoleClaims` / `UserRoles` | Platform (ADMIN role) + Identity/IAM (5 business roles) | None | Business roles retire Phase 5 (arch §10.1); claims seeded only for ADMIN/BROKER/BROKERSUBUSER (`BB\Infrastructure\Persistence\Initialization\ApplicationDbSeeder.cs:52-58`) |
| `Identity.InvitedUsers` | Identity/IAM | Replaced by `Organization.Invitations` (arch §10.1) | Lives in MainDbContext despite the schema name; cancelled invites still acceptable (IAM §6 High) |
| `Identity.UsersHierarchy` | Identity/IAM | Replaced by Memberships | Brand sub-users get a **brand id** as parent (`MBrA\Requests\Brands\AssignBrandToUserRequest.cs:140,252-266`) — pre-check 0.6 item |
| `Brand.Brands` | Brand-owned (profile) / Platform (catalog rows) | None for the profile — it stays in `Brand.Brands` (arch §10.1); `UserID` (owner) column drops at Phase 5 (arch §10.3-4) | `Organization(Type=Brand)` reuses `Brands.ID` (arch §10.2) |
| `Brand.BrandSubUsers` | Identity/IAM | → Membership `brand-member` + `BrandAccess(Full)` (arch §10.1) | Removal sets the user's **global** `IsActive` false today |
| `Brand.BrandBrokers` | Identity/IAM | → `BrandConnections` (primary rows) / `BrandAccess` (sub-broker rows) (arch §10.1) | No unique constraint (pre-check); `RemoveBrokerSubUserRequest` hard-DELETEs rows |
| `CRM.Banners` / `BannerSKUs` / `BannerActivities` / `Retailers`, `ProductSpecs.*` | Brand-owned | None — `BrandID` unchanged | Read-only here (the APL six); owned by the CRM/ProductSpec workbooks |
| `Email.EmailLoggers`, `Email.SnsEventLogs` | Platform | None | Webhook updates logger status and writes `SnsEventLogs`; logged bodies leak links/codes (IAM §6 Critical) — mask before OTP (Phase 3.E) |
| `Identity.VerificationCodes` (future) | Identity/IAM | New table, IAM plan Appendix A | Cross-reference only |

## 3. Module catalog mapping

**Identity surfaces have no module slugs by design** — the template's Identity/IAM ownership class applies: organization management goes to `[RequireOrgPermission]` (arch §4.2), platform administration stays `[MustHavePermission]` (IAM §2.3 layer 1), public flows stay `[AllowAnonymous]`. Nothing in Section B maps to UsersController, SubUsersController, Auth, Roles, Profile, Registration or the webhook, and no slug should be invented for them.

The only module-bearing rows are the six brand-APL report endpoints on BrandsController. The FE routes `/apl-report` and `/apl-activity` are **ungated** (Section C: "the APL screens have no catalog module"), but the gated `/[brandID]/retail-report` route (slug `retail-reports`) renders the *same* `AplReport` component (`caboodle.web\src\app\(brand)\[brandID]\(report)\apl-report\page.tsx` and `…\retail-report\page.tsx` both import it), and the Reports hub (`/report`, slug `reports`) links the activity screen.

**Gaps:**
- `brands/apl*`, `brands/apl-activities*` — no slug of their own. Proposal *(Q2)*: gate on the existing Brand-audience `retail-reports` (already Required-dependent on `retailers`), matching the gated twin route; alternative is a new `apl-report` slug.
- `GET /brands/me` — feeds the FE module map itself; **IAM plan Phase 4.5 owns its reimplementation** (exact legacy contract on the resolver). Cross-reference only.
- Everything else in this workbook: superseded/platform/anonymous — see §4.

## 4. Endpoint authorization matrix

Claim-set legend (template): where Today's guard is MHP, effective audience comes from the seeded claim sets — ADMIN = all (`BB\Core\Shared\Authorization\CaboodlePermissions.cs:202`); BROKER/BROKERSUBUSER = `CaboodleModule.Broker` permissions minus resource `Brokers` and StatusOption/Settings writes, sub-brokers additionally minus `BrokerPromoTab.Delete` (`:203-221`); brand roles hold **no** claims. "—" in Today's guard = no attribute (global `RequireAuthorization` only).

### 4.1 BrandsController — `/api/v1/brands` (19)
File: `Host\Modules\Brand\BrandsController.cs`

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET me | GetMyAssignedBrandsRequest | —; handler branches on the caller's role string, brands from `Brands.UserID`/`BrandSubUsers`/`BrandBrokers` (`MBrA\Requests\Brands\GetMyAssignedBrandsRequest.cs:49-94`); `CanAccessTradespend` computed `:334-355` with a hardcoded demo-brand exception `:340` | keep current guard until retired | **Superseded by IAM plan → `GET /me/access`** (arch §10.1); legacy route reimplemented on the resolver with the **exact legacy contract** at IAM Phase 4.5 (contract §5-1: FE fails open if `modules` missing) — cross-reference only. D9 (trade-spend rule becomes an entitlement) |
| GET | GetAllBrandsRequest | MHP(View, Brands, Brand) — ADMIN-only in practice (`CaboodlePermissions.cs:203-208` excludes Module=Brand from broker sets; brand roles unseeded) | keep `[MustHavePermission]` until retired | **Superseded by IAM plan → `GET /organizations`** (Platform, arch §9); brand *profile* fields keep being served from `Brand.Brands` (§10.1). Q3 |
| GET owners | GetAllBrandsOwnersRequest | MHP(View, Brands, Brand) ADMIN-only; joins role `BRANDOWNER` (`MBrA\Requests\Brands\GetAllBrandsOwnersRequest.cs:103`) | keep until retired | **Superseded → platform memberships view** (`Permissions.Platform.Memberships.View`, arch §4.1); "owner" becomes the `brand-admin` membership (§10.1). Q3 |
| POST users | GetBrandOwnersAndSubUsersRequest | MHP(View, BrandUsers, Broker) — ADMIN + BROKER + BROKERSUBUSER (`CaboodlePermissions.cs:188,203-221`); handler has **no caller scoping** — returns owner/sub-users/contacts for any requested brand ids (`MBrA\Requests\Brands\GetBrandOwnersAndSubUsersRequest.cs:37-60`) | keep until replaced | **Superseded → connection-scoped member read** (D5); arch §9 defines no cross-organization member endpoint → **Q4**. Today's any-brand roster read is §5 do-not-reproduce |
| POST apl | GetAplRequest | —; `BrandID` header scoping only (`MBrA\Requests\Reports\APL\CRUD\GetAplRequest.cs:179`); middleware validates membership | `RM(brand: "retail-reports", View)` *(Q2)* | Brand-owned CRM/ProductSpecs reads ("APL aka Retail Reports") |
| POST apl/filter-options | GetFilterOptionsRequest | —; `BrandID` header | `RM(brand: "retail-reports", View)` *(Q2)* | |
| GET apl-total-count | GetAPLReportTotalCountsRequest | —; `BrandID` header (`…\GetAPLReportTotalCountsRequest.cs:33`) | `RM(brand: "retail-reports", View)` *(Q2)* | |
| POST apl/export | ExportAPLRequest | —; `BrandID` header | `RM(brand: "retail-reports", Export)` *(Q2)* | Export → Export |
| GET apl-activities | GetActivitiesRequest | —; `BrandID` header (`MBrA\Requests\Reports\Activities\CRUD\GetActivitiesRequest.cs:43`); reads `CRM.BannerActivities` | `RM(brand: "retail-reports", View)` *(Q2)* | |
| GET apl-activities/export | ExportActivitiesReportRequest | —; `BrandID` header | `RM(brand: "retail-reports", Export)` *(Q2)* | |
| POST | UpsertBrandRequest | MHP(Upsert, Brands, Brand) ADMIN-only; handler: dead "already owner" check (`MBrA\Requests\CRUD\UpsertBrandRequest.cs:75-81`, condition always false — user was fetched by that id), owner column overwritten unconditionally on update `:109`, UNASSIGNED→BRANDOWNER role swap `:129-134` | **split**: create = `[MustHavePermission]` (platform, D7); profile update = `ROP(organization.update)` on an org self-service route *(Q1)* | **Survivor (brand profile/logo)**. The owner/role-swap parts are superseded → `/members` + membership role endpoints (§10.1); role swap is a named dual-write bridge site (IAM Phase 3.3). Q1, D7 |
| PUT assign-user-to-brand | AssignBrandToUserRequest | MHP(Assign, BrandAssign, Brand) ADMIN-only (`CaboodlePermissions.cs:109`); role-dispatched handler (`MBrA\Requests\Brands\AssignBrandToUserRequest.cs:124-150`); owner uniqueness `:166-169`; writes `UsersHierarchy.ParentUserID = brand.ID` for sub-users `:140` | keep until retired | **Superseded → `/members` (membership + role) and `PUT /brandaccess/{membershipId}/brands`** (arch §10.1 names this row). Bridge 3.3 |
| PATCH assign-brand-to-broker | AssignBrandsToBrokerRequest | MHP(Assign, BrandAssign, Broker) — ADMIN + brokers (`CaboodlePermissions.cs:116`); **no caller scoping** — any existing brand may be connected to any broker (`MBrA\Requests\BrokerBrand\AssignBrandToBrokerRequest.cs:56-71,152-156`); auto-propagates the brands to every sub-broker `:94-122`; stamps `ParentBrokerID = caller` when the target is a sub-broker `:84` (an ADMIN caller becomes the "parent") | keep until retired | **Superseded → `POST /brandconnections` (Platform) + `PUT /brandaccess/{membershipId}/brands`** (§10.1). §5 do-not-reproduce (scoping + parent stamping). Bridge 3.3. Called by the web app too (§7) |
| POST assign-brands-to-sub-brokers | AssignBrandsToSubBrokersRequest | MHP(Assign, BrandAssign, Broker); caller-scoped — target brands must be in the **caller's** `BrandBrokers` rows (`MBrA\Requests\BrokerBrand\AssignBrandsToSubBrokersRequest.cs:145-165`), `ParentBrokerID = caller` `:90`; GUID lists interpolated into SQL `:127,157,188-189` | keep until retired | **Superseded → `PUT /brandaccess/{membershipId}/brands`** (`access.manage`, arch §9/§10.1). Bridge 3.3 |
| DELETE remove-brand-from-broker | RemoveBrandFromBrokerRequest | MHP(Assign, BrandAssign, Broker); validates only the **target's** role (`MBrA\Requests\BrokerBrand\RemoveBrandFromBrokerRequest.cs:131-135`) — no caller scoping; sets `BrandID = Guid.Empty` before soft-delete `:91,102`; stamps `DeletedBy` on the wrong row inside the sub-broker loop `:93-94` | keep until retired | **Superseded → `DELETE /brandconnections/{id}` (Platform) / `PUT /brandaccess/{membershipId}/brands`** (§10.1). §5 do-not-reproduce. Bridge 3.3 |
| DELETE remove-brands-from-broker | RemoveBrandsFromBrokersRequest | MHP(Assign, BrandAssign, Broker); **SQL is broken** — the UPDATE's WHERE uses an undeclared `bb.` alias (`MBrA\Requests\BrokerBrand\RemoveBrandsFromBrokersRequest.cs:74-84`), so the endpoint always errors | retire; do **not** bridge | **Superseded** (same §10.1 row); dead endpoint. §5 do-not-reproduce |
| DELETE remove-owner-from-brand | RemoveUserFromBrandRequest | MHP(Assign, BrandAssign, Brand) ADMIN-only; clears `Brands.UserID` (`MBrA\Requests\Brands\RemoveUserFromBrandRequest.cs:121-133`) or deletes the `BrandSubUsers` row `:135-154` | keep until retired | **Superseded → `DELETE /members/{membershipId}`** (§10.1). Bridge 3.3 |
| POST import | ImportBrandsRequest | MHP(Import, MasterDataUpload, DataUpload) ADMIN-only; profile columns only, no owner fields (`caboodle\src\Modules\DataUpload\Modules.DataUpload.Application\Brand\BrandsImportRequst.cs`) | `[MustHavePermission]` (platform) | Survivor. Import → Create is platform-side here. From Phase 3.3 a created brand must also create its `Organization(Type=Brand)` row (bridge) |
| GET export | BrandsExportRequest | MHP(Export, MasterDataUpload, DataUpload) ADMIN-only | `[MustHavePermission]` (platform) | Survivor |

### 4.2 SubUsersController — `/api/v1/subusers` (12)
File: `Host\Modules\SubUsers\SubUsersController.cs`. Every row is superseded: self-service rows map to the org `MembersController`/`InvitationsController` (arch §9), admin rows to the platform memberships/invitations views (arch §4.1). All legacy mutations are dual-write bridge sites (IAM Phase 3.3 names "sub-user toggles" explicitly).

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET brand | GetBrandSubUsersRequest | —; rows scoped by the `BrandID` header (`MBrA\Requests\User-SubUsers\GetBrandSubUsersRequest.cs:42`); middleware checks brand membership | keep until retired | Superseded by IAM plan → `GET /members` (brand org, `member.view`) |
| GET brand/invited-user | GetInvitedSubUsersRequest | —; `InvitedUsers.BrandIDs @> [header brand]` (`…\GetInvitedSubUsersRequest.cs:72`) | keep until retired | Superseded → `GET /invitations` |
| DELETE brand/remove/{id} | RemoveBrandSubUserRequest | —; target-role check (`…\RemoveBrandSubUserRequest.cs:66-69`), header-scoped membership lookup `:71-83`, then sets the user's **global** `IsActive = false` `:87-89` | keep until retired | Superseded → `DELETE /members/{membershipId}` (`member.remove`). §5 do-not-reproduce (`IsActive` overload — IAM §2.2/N12). Bridge 3.3 |
| GET brands/for-admin | GetBrandsSubUsersForAdminRequest | MHP(View, SubUsers, SubUser) — ADMIN-only (Module=SubUser is in no broker set) | keep until retired | Superseded → platform memberships view (arch §4.1) |
| PUT brands/change-user-active-status | ToggleSubUserActiveStatusRequest | MHP(Update, Users, User) ADMIN-only; membership check (`…\ToggleSubUserActiveStatusRequest.cs:93-105`) then **global** `IsActive` toggle `:107-109` + status email | keep until retired | Superseded → `PUT /members/{membershipId}/status` (`member.suspend`). §5 do-not-reproduce (global flag for a per-brand action). Bridge 3.3 |
| PUT brokers/change-user-active-status | ToggleActiveStatusOfSubBrokerReqest | MHP(Update, Users, User) ADMIN-only; target-role check (`MBkA\SubUser\ToggleActiveStatusOfSubBrokerReqest.cs:71`), global `IsActive` toggle `:74` | keep until retired | Same replacement and do-not-reproduce as above. Bridge 3.3 |
| GET brokers/for-admin | GetBrokersSubUsersForAdminRequest | MHP(View, SubUsers, SubUser) ADMIN-only | keep until retired | Superseded → platform memberships view |
| GET broker | GetBrokerSubUsersRequest | —; company resolution in handler — BROKER → self, else parent via `BrandBrokers` (`MBkA\SubUser\GetBrokerSubUsersRequest.cs:52-66`) | keep until retired | Superseded → `GET /members` (brokerage org) |
| GET broker/invited-users | GetInvitedUsersRequest | —; invites scoped `ParentUserID = caller` (`MBkA\SubUser\GetInvitedUsersRequest.cs:36`) | keep until retired | Superseded → `GET /invitations` |
| DELETE broker/remove/{id} | RemoveBrokerSubUserRequest | MHP(Delete, SubUsers, Broker) — ADMIN + BROKER + BROKERSUBUSER (`CaboodlePermissions.cs:149,203-221`); hard-DELETEs `BrandBrokers` rows scoped `ParentBrokerID = caller` (`MBkA\SubUser\RemoveBrokerSubUserRequest.cs:68-75,89-98`), then sets global `IsActive = false` **unconditionally** `:77-79` — even when zero rows matched, so any claim holder can deactivate any sub-broker | keep until retired | Superseded → `DELETE /members/{membershipId}`. §5 do-not-reproduce (×2: hard delete + unscoped deactivation). Bridge 3.3 |
| GET admin/invited-users | GetInvitedSubUsersForAdminRequest | MHP(View, SubUsers, SubUser) ADMIN-only | keep until retired | Superseded → platform invitations list (IAM Appendix B Phase-3 inclusion) |
| DELETE cancel-invitation | DeleteSubUsersInvitationRequest | —; admin bypass else `CreatedBy = caller` scope (`MBrA\Requests\User-SubUsers\DeleteSubUsersInvitationRequest.cs:75-82`); soft-deletes via `DapperQueryBuilder.Delete` `:59` — but acceptance never filters `Deleted` (IAM §6 High: cancelled invite still acceptable) | keep until retired | Superseded → `DELETE /invitations/{id}` (`member.invite`). Phase 0.4 fixes the acceptance bug first — reference, don't re-derive. Bridge 3.3 |

### 4.3 UsersController — `/api/v1/users` (22)
File: `Host\Controllers\Identity\UsersController.cs`. All MHP rows are ADMIN-only in practice (resources under `CaboodleModule.User` are in no broker claim set). The anonymous flows are owned end-to-end by the IAM plan (§2.4, Phase 0.4, Phase 3.E, contracts §5-5) — dispositions only here.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET check-by-email | IUserService.ExistsWithEmailAsync | `[AllowAnonymous]` — anonymous account enumeration (IAM §6 High) | `[AllowAnonymous]` justified only until retirement; rate-limit + enumeration-safe per Phase 0.4 | No caller in either FE (§7) → recommend retiring. Q5 |
| GET | IUserService.GetListAsync | MHP(View, Users, User) ADMIN-only; SQL built by string interpolation (IAM §6 High, `UserService.cs:204-217,362-426`) | `[MustHavePermission]` (platform) | Survivor — platform user admin stays (IAM §2.3 layer 1); fix the SQL in 0.x |
| GET unassigned | IUserService.GetUnAssignedListAsync | MHP(View, Users, User) ADMIN-only | keep until retired | Superseded by IAM plan — UNASSIGNED role retires at Phase 5 (§10.1); manual-activation queue replaced per N3 by invitations/access requests |
| GET {id} | IUserService.GetAsync | MHP(View, Users, User) ADMIN-only | `[MustHavePermission]` (platform) | Survivor (support) |
| GET brands-info | GetBrandsOfUserRequest | MHP(View, Users, User) ADMIN-only; role-keyed queries per legacy role (`caboodle\src\Modules\Admin\Modules.Admin.Application\User\GetBrandsOfUserRequest.cs:59-62`) | keep until retired | Superseded → platform memberships view (`Permissions.Platform.Memberships.View`, arch §4.1) |
| POST invite | IUserService.InviteAsync | **no attribute** — any authenticated user can invite (IAM §6 High, `UsersController.cs:106-114`) | `[MustHavePermission]` now (Phase 0.4), then retired | Superseded → `POST /invitations` (`member.invite`, arch §9). Bridge 3.3 (named site) |
| GET invited-user/{verificationCode:guid} | IUserService.GetInvitedUserByVerificationCodeAsync | `[AllowAnonymous]` | `[AllowAnonymous]` justified (invite-link resolution) until retired | Superseded → anonymous `GET /invitations/{token}` (arch §9, 256-bit tokens per IAM §2.4-5). No FE caller found — Q5 |
| POST invite/{id:guid} | IUserService.ResendInvitaionLinkAsync | **no attribute** | `[MustHavePermission]` now (0.4), then retired | Superseded → `POST /invitations/{id}/resend`. Bridge 3.3 |
| POST invite/brand-sub-user | IUserService.InviteBrandSubUserAsync | **no attribute**; `BrandID` header | attribute now (0.4), then retired | Superseded → `POST /invitations` with `BrandOrganizationIDs`. No FE caller found — Q5. Bridge 3.3 |
| POST | IUserService.CreateAsync | MHP(Create, Users, User) ADMIN-only | `[MustHavePermission]` (platform) | Survivor (platform account creation) |
| PUT | IUserService.UpdateAsync | MHP(Update, Users, User) ADMIN-only; writes name/phone only (`BB\Infrastructure\Identity\UserService.CreateUpdate.cs:490-514`) | `[MustHavePermission]` (platform) | Survivor |
| PUT {id}/update-active-status/{status} | IUserService.ChangeActiveStatusAsync | MHP(Update, Users, User) ADMIN-only | `[MustHavePermission]` (platform) | Survivor **as the platform kill switch only** — per-org suspension moves to `PUT /members/{membershipId}/status` (IAM §2.2, N12) |
| PUT {id}/update-email-confirmation/{status} | IUserService.ChangeEmailConfirmationStatusAsync | MHP(Update, Users, User) ADMIN-only | `[MustHavePermission]` (platform) | Survivor (support tool); verification itself is IAM-owned (Phase 3.E) |
| GET users/{id}/roles | IUserService.GetRolesAsync | MHP(View, UserRoles, User) ADMIN-only; doubled segment → `/users/users/{id}/roles` (inventory Section D) | keep until retired | Superseded — business roles retire Phase 5; platform role readable via `/roles` |
| POST users/{id}/assign-role | IUserService.AssignRoleAsync | MHP(Update, UserRoles, User) ADMIN-only; admin FE sends `BrandIDs` with it (§5-7) | keep until retired | **Superseded → membership and role endpoints (`/members`)** — arch §10.1 names this row. Bridge 3.3 (named site) |
| DELETE users/{id}/remove-role | IUserService.RemoveRoleAsync | MHP(Delete, UserRoles, User) ADMIN-only; cache not invalidated on remove (IAM 0.7) | keep until retired | Superseded → `PUT /members/{membershipId}/role` / `DELETE /members/{membershipId}` |
| DELETE delete-multiple | IUserService.DeleteAsync | MHP(Delete, Users, User) ADMIN-only; hard-deletes users | `[MustHavePermission]` (platform) | Survivor; audit must denormalize actor/target names because users hard-delete (IAM §2.6) |
| POST resend-email-verification | IUserService.ResendEmailVerificationAsync | `[AllowAnonymous]` | `[AllowAnonymous]` justified (pre-login flow) | IAM-owned: resend reuses code without extending expiry (0.4); OTP resend + cooldown in 3.E |
| POST verify-email | IUserService.ConfirmEmailAsync | `[AllowAnonymous]` | `[AllowAnonymous]` justified (email+code, pre-login) | IAM-owned: extended to accept the 6-digit OTP (§2.4-3); link format `/verify-email?code&email` must keep working (§5-5) |
| POST forgot-password | IUserService.ForgotPasswordAsync | `[AllowAnonymous]` | `[AllowAnonymous]` justified | IAM-owned: rate limiting (0.4), URL-encoded reset token (§6 Medium), link format §5-5 |
| POST reset-password | IUserService.ResetPasswordAsync | `[AllowAnonymous]` | `[AllowAnonymous]` justified | IAM-owned (0.4 password policy + Password==Confirm) |
| DELETE delete | RemoveUnassignedUsersRequest | MHP(Delete, Users, User) ADMIN-only | keep until retired | Superseded — exists only for the UNASSIGNED pool, which retires with N3/Phase 5; fold into `delete-multiple` |

### 4.4 AuthController — `/api/v1/auth` (2)
File: `Host\Controllers\Identity\AuthController.cs`

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST login | ITokenService.GetTokenAsync (`:14-23`) | `[AllowAnonymous]` | `[AllowAnonymous]` justified (login) | Endpoint survives unchanged; internals are IAM plan §2.5 / Phase 0.2 (MasterPassword removal, per-env keys, lockout + rate limiting). Response shape + error envelope are contract §5-3 |
| POST refresh-token | ITokenService.RefreshTokenAsync (`:25-34`) | `[AllowAnonymous]` | `[AllowAnonymous]` justified (carries its own credential) | Survives; add `IsActive`+`EmailConfirmed` checks inside refresh (IAM §2.5); `{token, refreshToken}` contract + tolerated reuse are §5-4 |

### 4.5 RolesController — `/api/v1/roles` (7)
File: `Host\Controllers\Identity\RolesController.cs`. All seven are MHP(…, Roles, Role) — ADMIN-only in practice. The table manages **platform** Identity roles; the four org roles are seeded system rows owned by the Organization module (IAM 1.4; custom-role CRUD deferred, N7).

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET | IRoleService.GetListAsync (`:12-24`) | MHP(View, Roles, Role) | `[MustHavePermission]` (platform) | Admin FE depends on PascalCase names + the hard-coded Broker role GUID until its Phase 5 (contract §5-7) |
| GET {id} | IRoleService.GetByIdAsync (`:26-35`) | MHP(View, Roles, Role) | `[MustHavePermission]` (platform) | |
| GET {id}/permissions | IRoleService.GetByIdWithPermissionsAsync (`:37-46`) | MHP(View, Roles, Role) | `[MustHavePermission]` (platform) | |
| PUT {id}/permissions | IRoleService.UpdatePermissionsAsync (`:48-57`) | MHP(Update, Roles, Role) | `[MustHavePermission]` (platform) | Platform claims only; new `Permissions.Platform.*` seeds arrive in Phase 3.1 |
| POST | IRoleService.CreateOrUpdateAsync (`:59-68`) | MHP(Create, Roles, Role) | `[MustHavePermission]` (platform) | Freeze creation of new *business* roles during the transition (note, not a question) — the five retire at Phase 5 |
| PUT | IRoleService.CreateOrUpdateAsync (`:70-79`) | MHP(Update, Roles, Role) | `[MustHavePermission]` (platform) | |
| DELETE {id} | IRoleService.DeleteAsync (`:81-90`) | MHP(Delete, Roles, Role) | `[MustHavePermission]` (platform) | Deleting a seeded business role pre-cut-over would break both FEs — guard operationally |

### 4.6 ProfileController — `/api/v1/profile` (6)
File: `Host\Controllers\Identity\ProfileController.cs` (folder `Profile` in the inventory, namespace `Controllers.Identity`). All six act on the **token's** user id (each action resolves `User.GetUserId()` and passes it to the service; the body's `Id` is ignored — `UserService.CreateUpdate.cs:490-514`). User-scoped per the template taxonomy → explicit `[Authorize]`, justified: self-scoped by construction, no module or org in play.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET | IUserService.GetAsync (`:16-27`) | — | `[Authorize]` — justified: self-only read | |
| PUT | IUserService.UpdateAsync (`:29-40`) | — | `[Authorize]` — justified: writes own name/phone only | |
| PUT image-upload | IUserService.UploadProfileImageAsync (`:42-53`) | — | `[Authorize]` — justified: own `Users.ImageUrl` | User-scoped file |
| DELETE image-remove | IUserService.DeleteProfileImageAsync (`:55-66`) | — | `[Authorize]` — justified | |
| PUT change-password | IUserService.ChangePasswordAsync (`:68-79`) | — | `[Authorize]` — justified: requires current password | Password policy hardening is IAM 0.4 |
| GET permissions | IUserService.GetPermissionsAsync (`:81-92`) | — | `[Authorize]` — justified: own claim list | FEs should read `GET /me/access` instead once Phase 2.4 lands; keep the endpoint until Phase 5 |

### 4.7 RegistrationController — `/api/v1/registration` (1 route, 2 dispatch paths)
File: `Host\Controllers\Identity\RegistrationController.cs`. One route dispatches two service paths (`:21-28`) — one row per request type per the template.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST (HasInvited + code) | IUserService.CreateInvitedUserAsync (`:21-24`) | `[AllowAnonymous]` | `[AllowAnonymous]` justified (invite acceptance proves the email) | Superseded by IAM plan → anonymous `POST /invitations/{token}/accept` (arch §9); acceptance keeps asking for a password (IAM §2.4-5); `/signup?email&code` body/response are contract §5-5; cancelled-invite bug fixed in 0.4. Bridge 3.3 (named: "registration (invited accept)") |
| POST (self-signup) | IUserService.SignUpAsync (`:25-28`) | `[AllowAnonymous]` | `[AllowAnonymous]` justified (public signup) | Stays — D7 keeps self-service **joining**; OTP replaces the verification link (Phase 3.E, N1/N2); manual activation retires per N3 |

### 4.8 SnsEmailWebhookController — `/api/v1/webhooks/sns-email-events` (1)
File: `Host\Controllers\Webhooks\SnsEmailWebhookController.cs` (explicit `[Route]`).

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST | ProcessSnsEmailEventRequest (`:10-28`) | `[AllowAnonymous]` — and the handler **does verify the SNS message signature** (`BB\Infrastructure\Mailing\ProcessSnsEmailEventRequest.cs:61-75`) **and pins the signing-cert domain** (`:77-91,203-216`); replays deduped via `SnsEventLogs` message id (`:157-167`) | `[AllowAnonymous]` justified — machine-to-machine webhook authenticated by the SNS signature, not a session | Signature requirement **met** — no flag. Residual notes: full raw body logged at info level (`:45`) — redact alongside the EmailLoggers masking before OTP (Phase 3.E); subscription auto-confirm fetches `SubscribeURL` (`:183-201`) — acceptable only because it runs after the signature + cert-domain checks |

## 5. Parity notes

**What each mechanism actually allows/denies today:**

- **Claim seeding** is the entire story for most MHP rows: only ADMIN/BROKER/BROKERSUBUSER get claims (`ApplicationDbSeeder.cs:52-58`); all `CaboodleModule.User`/`Brand`/`Role`/`SubUser` resources are ADMIN-only; `BrandAssign (Broker)`, `BrandUsers (Broker)` and `SubUsers.Delete (Broker)` are also held by brokers and sub-brokers (`CaboodlePermissions.cs:109,116,146-149,188,203-221`).
- **`BrandValidationMiddleware`** pre-filters the `BrandID`-header rows here (subusers brand trio, invite/brand-sub-user, the APL six) — behavior and its 200-status bug are documented in workbook 01 §5; not repeated.
- **Role strings from the user store, not the JWT** drive `GetMyAssignedBrandsRequest`, `GetBrokerSubUsersRequest`, `RemoveBrandFromBrokerRequest`, `DeleteSubUsersInvitationRequest` and the assign/remove handlers; the token carries no role claim (IAM §5 note: `ICurrentUser.IsInRole` is always false — none of these handlers use it, so no dead checks of that kind here).
- **Identity flow internals** (token settings, OTP, invitation tokens, lockout): owned by IAM plan §2.4–2.5 and §6 — this workbook only records dispositions.

**Resolver must-match list** (comparator, IAM 2.5): `GET /brands/me` output per migrated user must equal the Phase 4.5 resolver reimplementation field-for-field (contract §5-1); sub-user list rows (`subusers/brand`, `subusers/broker`) must equal the memberships of the corresponding organization; `AssignBrandsToSubBrokersRequest`'s caller allowlist (`BrandBrokers.BrokerID = caller`) must equal the brokerage's active `BrandConnections`.

**Do-not-reproduce list** (intentional comparator differences):

1. `DELETE /brands/remove-brands-from-broker` — broken SQL (`bb.` alias in a plain UPDATE, `RemoveBrandsFromBrokersRequest.cs:74-84`): the endpoint can never have worked; retire without bridging.
2. `UpsertBrandRequest` unconditionally writes `brand.UserID = request.UserID` on update (`:109`) — an admin editing the profile without re-sending the owner silently orphans the brand; the "already a Brand Owner" guard `:75-81` is dead (compares the user's id to itself). Profile editing in the target model never touches ownership.
3. `AssignBrandsToBrokerRequest` lets any broker-claim holder connect **any** brand to **any** broker and stamps `ParentBrokerID = caller` for sub-broker targets (`:84`) — connections become Platform-only (`POST /brandconnections`); pre-check 0.6 catches the corrupted parents.
4. `RemoveBrandFromBrokerRequest` mangles rows before soft-deleting (`BrandID = Guid.Empty`, `:91,102`) and stamps `DeletedBy` on the wrong entity (`:93-94`) — reproduce the removal, not the mangling.
5. Global `IsActive` as a membership flag: `RemoveBrandSubUserRequest.cs:87-89`, `RemoveBrokerSubUserRequest.cs:77-79`, both toggle handlers — replaced by per-membership status (IAM §2.2, N12); backfill decides existing `false` values per N12.
6. `RemoveBrokerSubUserRequest` deactivates the target globally even when the caller owns no such sub-broker row (DELETE scoped to `ParentBrokerID = caller` may match nothing, `IsActive=false` still runs) — target requires the membership to belong to the caller's organization.
7. `POST /brands/users` returns any brand's owner/sub-user/contact roster to any broker-claim holder with no connection check — D5 scopes this to connected organizations.
8. `AssignBrandToUserRequest` writes `UsersHierarchy.ParentUserID = brand.ID` for brand sub-users (`:140,252-266`) — known data anomaly (arch §10.2 pre-check 5); memberships replace the table.
9. `GetMyAssignedBrandsRequest`'s `CanAccessTradespend` rule, including the hardcoded `'Zucchini Beanie Demo Brand'` exception (`:334-355`) — dropped per D9; Phase 4.5 emits the flag from the module entitlement.
10. Missing permission attributes on `users/invite`, `users/invite/{id}`, `users/invite/brand-sub-user` (IAM §6 High) — fixed in Phase 0.4, then superseded; comparator baselines the post-0.4 state.
11. `GET /users/check-by-email` anonymous enumeration (IAM §6) — 0.4 makes it enumeration-safe; recommend retirement (Q5).
12. Interpolated-GUID SQL in `AssignBrandsToSubBrokersRequest` / `RemoveBrandsFromBrokersRequest` / `DeleteSubUsersInvitationRequest` and the `UserService` list queries (IAM §6 High) — parameterize when touched; never copy the pattern into bridge code.

## 6. Code changes beyond attributes

- **Dual-write bridge call sites (IAM Phase 3.3 — the overlap with this workbook):** `IUserService.InviteAsync` / `ResendInvitaionLinkAsync` / `InviteBrandSubUserAsync` → Invitations service; `CreateInvitedUserAsync` (registration accept) → invitation acceptance + membership + BrandAccess; `AssignRoleAsync` (+ `BrandIDs`) → membership/role service; `AssignBrandToUserRequest`, `AssignBrandsToBrokerRequest`, `AssignBrandsToSubBrokersRequest`, `RemoveBrandFromBrokerRequest`, `RemoveUserFromBrandRequest` → connection/brand-access service; `RemoveBrandSubUserRequest`, `RemoveBrokerSubUserRequest`, both active-status toggles → membership status service; `UpsertBrandRequest`'s UNASSIGNED→BRANDOWNER swap (`:129-134`) and brand creation (incl. `ImportBrandsRequest`) → organization + membership creation. Bridge writes must be transactional and audited (IAM §2.6 — same-transaction Dapper inserts); today's invite/assign flows do multi-table writes with no transaction.
- **Queries to re-scope:** none — the identity tables migrate rather than gain tenant columns, and the APL six stay `BrandID`-scoped. (Contrast with workbook 01: no `BrokerageOrganizationID` work here.)
- **Helpers/files to delete at Phase 4.4–5:** the role-branch queries in `GetMyAssignedBrandsRequest.cs:298-371` (replaced by the Phase 4.5 resolver reimplementation); `GetBrokerSubUsersRequest`'s parent-resolution query (`:59-66`); the whole `MBrA\Requests\Brands\Assign…/Remove…` and `MBrA\Requests\BrokerBrand\*` handler set plus `MBkA\SubUser\*` mutations (endpoints retire); `Identity.InvitedUsers` query sites (`GetInvitedSubUsersRequest`, `GetInvitedUsersRequest`, `GetInvitedSubUsersForAdminRequest`, `DeleteSubUsersInvitationRequest`). `RemoveBrandsFromBrokersRequest.cs` can be deleted immediately (dead).
- **Demand() call sites:** none needed. `UpsertBrandRequest` is the only Upsert; the recommendation (Q1) splits it by route (platform create vs org-permission profile update) instead of a payload-dependent Demand — if it stays one endpoint, it takes `_access` org-permission resolution in the handler on the update path.
- **BrandID-header edge cases:** the APL six and the subusers brand trio + `invite/brand-sub-user` are the only rows here where the middleware's header check is the *only* guard — the APL six must gain `RM(brand: "retail-reports", …)` in the same deploy that retires the middleware; the sub-user/invite rows retire with their IAM replacements instead. Cross-brand allowlist mode is not relevant here (all header rows are single-brand).
- **Transactions:** see bridge note above; `RemoveBrandFromBrokerRequest`'s delete + bulk sub-broker update pair is un-transactional today — the replacement connection-end operation is a single `BrandConnections` status write plus cascade in one transaction.

## 7. FE impact (Phase 5)

Web (`caboodle.web`, develop @ 956295e4):

- **Identity flows:** `src/service/auth.service.ts` → `registration`, `users/verify-email`, `resend-email-verification`, `forgot-password`, `reset-password`; NextAuth drives `auth/login` / `auth/refresh-token`. All keep working untouched through Phase 4 (contracts §5-3/4/5); the OTP screen replaces the signup link at Phase 3.E+.
- **Profile:** `src/service/profile.service.ts` → the four profile endpoints (+ `image-upload`); route `/profile` is deliberately ungated (Section C) and stays so — `[Authorize]` only.
- **Module map:** `src/service/caboodle.service.ts:76` reads `GET /brands/me`; `moduleConstants.ts` and `promoTabsPermissions.helper.ts` consume it. Switches to `/me/access` at Phase 5; until then Phase 4.5's contract reimplementation keeps it identical (fails open on missing `modules` — §5-1).
- **User management screens:** `src/service/user.service.ts` → `subusers/brand(+invited-user, remove/{id})`, `subusers/broker(+invited-users, remove/{id})`, `subusers/cancel-invitation`, `users/invite`, `users/invite/{id}` — the brand-settings and broker-team screens; these move to `/members` + `/invitations` at Phase 5. The same file calls `brands/assign-brand-to-broker` and `brands/remove-brand-from-broker` (`:153,172`) — broker self-service brand assignment that becomes `PUT /brandaccess/{membershipId}/brands` (Brokerage-Admin UI).
- **Rosters:** `src/service/brandReport.service.ts:799` posts `brands/users` for Brand Report recipient pickers (also referenced in `categoryReview.helpers.ts:435`) — needs the Q4 replacement before retirement.
- **APL screens:** `src/service/apl.service.ts` (`brands/apl`, `apl/export`, `apl-activities`, `apl-activities/export`) + `src/service/report.service.ts:340,444` (`apl-total-count`, `apl/filter-options`). Routes `/apl-report` and `/retail-report` render the same `AplReport` component; `/apl-activity` is linked from the `/report` hub. `/apl-report` and `/apl-activity` are ungated today — Q2 gates them (add `BRAND_ROUTE_MODULES` entries) or folds them into `/retail-report`; dashboards must tolerate 403s (403-never-401, §5-2).

Admin (`caboodle.admin`): calls `brands` (list, `owners`, `export`, `assign-user-to-brand`, `assign-brand-to-broker`, `remove-brand-from-broker`, `remove-owner-from-brand`), `users` (list, `unassigned`, `brands-info`, `invite`, `invite/{id}`, `users/{id}/assign-role`, `{id}/update-active-status`, `delete-multiple`), `subusers` (`brands/for-admin`, `brokers/for-admin`, both `change-user-active-status`, `admin/invited-users`, `cancel-invitation`), `roles` (GET), `admin/login` + `auth/refresh-token`. Until its Phase 5 it depends on PascalCase role names, invite `userType` 1–5 + `parentUserID`, and the hard-coded Broker role GUID (contract §5-7) — every "keep until retired" row above exists to protect these screens. The admin app migrates to `OrganizationsController`/`BrandConnectionsController`/`MembersController`/platform views in Phase 5.

No FE caller exists for `users/check-by-email`, `users/invited-user/{code}`, or `users/invite/brand-sub-user` (checked both repos) — Q5.

## 8. Test checklist

- **Contract tests (mandatory, IAM 4.5 / §5):** `GET /brands/me` exact shape incl. `role`, `modules[]`, `canAccessTradespend` and the fail-open behavior; login/admin-login response + error envelope (`messages.Email` unverified hook); refresh `{token, refreshToken}` with tolerated reuse; registration body/response and the three email-link formats; 403-never-401 on every authorization failure in this area.
- **Comparator (Phase 2.5) personas:** ADMIN, brand owner, brand sub-user, primary broker, sub-broker, a second brokerage on the same brand, unassigned user, anonymous. Zero disagreements expected outside the §5 do-not-reproduce list (whitelisted); the bridge keeps legacy mutations and new tables in lockstep — weekly report-only backfill re-run as the drift alarm (3.3).
- **Matrix tests:** APL six — allowed with brand `retail-reports` granted; 403 when module missing, when Export flag missing on the two export rows, with a missing/stale `BrandID` header (single-brand rows: header required), and for broker-workspace callers. Profile six — self-scoped: body `Id` of another user must not redirect the write. Platform rows — ADMIN passes, broker/brand roles 403.
- **Superseded-row regression:** until retirement each "keep until retired" row must behave exactly as today (claim set + handler checks) — baseline tests pin them so Phase 4.2 annotation work can't silently change them.
- **Webhook:** valid signature processes; invalid signature → 403 + `SnsEventLogs` row; untrusted `SigningCertURL` domain → 403; duplicate message id → no second failure row; subscription-confirmation path never follows a URL on an unsigned message.
- **Reflection test (plan 4.3):** all 70 actions carry exactly one of `[RequireModule]`/`[RequireOrgPermission]`/`[MustHavePermission]`/`[Authorize]`/`[AllowAnonymous]`; baseline shrinks only. The anonymous set here (login, refresh, check-by-email*, invited-user lookup, resend/verify/forgot/reset, registration, webhook) is the expected bulk of the API's 16 `[AllowAnonymous]` rows.
- **Do-not-reproduce assertions:** `remove-brands-from-broker` stays dead (503/500 today → 404/410 after retirement, never "fixed"); global-`IsActive` toggles produce per-membership status changes post-flip; `UpsertBrandRequest` update path no longer clears owners (ownership edits rejected).

## 9. Open questions

1. **Q1 — Who edits a brand's profile (name, logo, description, URLs) after cut-over?** Options: (a) Platform-only — profile editing stays on `POST /brands` under `[MustHavePermission]`, matching D7's "Platform Admin controls organizations"; (b) org self-service — a `PUT` profile route guarded `ROP(organization.update)`, which arch §4.2 already grants brand-admins and brokerage-admins, and which the IAM plan's Appendix B lists ("org self-update") as a Phase 3 inclusion. **Recommendation: (b)** — split the endpoint: *create* stays Platform (D7 reserves organization creation for the Platform Admin), *profile update* becomes `ROP(organization.update)` so Brand Admins maintain their own logo/profile; the legacy owner-assignment and role-swap behavior inside `UpsertBrandRequest` dies either way (§10.1). Needs Platform-Admin sign-off because (a) is her current workflow.
2. **Q2 — Which module gates the brand APL report six** (`brands/apl*`, `apl-activities*`)? The FE routes `/apl-report`/`/apl-activity` are ungated and the catalog has no APL slug, but the gated `/retail-report` route renders the same component. **Recommendation:** reuse Brand `retail-reports` for all six (View/Export per mapping) and add the two missing `BRAND_ROUTE_MODULES` entries, rather than minting an `apl-report` slug no tenant has assigned; sequence with the module-assignment backfill before `ALLOW_ALL_WHEN_NO_MODULES` flips.
3. **Q3 — Do `GET /brands` and `GET /brands/owners` get replacements or just retire?** The admin app's brand list needs profile fields (logo, vendor) that `GET /organizations` (arch §9) doesn't carry, and "owners" becomes a memberships view. **Recommendation:** keep both as `[MustHavePermission]` until the admin app's Phase 5, then serve the org list from `GET /organizations` enriched with the `Brand.Brands` profile (same ID per §10.2), and owners from the platform memberships view — no new legacy-shaped endpoint.
4. **Q4 — Cross-organization roster read (`POST /brands/users`).** Brokers legitimately need a brand's people for Brand Report recipients (workbook 01 §4.2), and D5 approves bidirectional user visibility — but arch §9's `ConnectionsController` returns organizations, not members, and `MembersController` is own-org only. **Recommendation:** extend the Phase 3 surface with a connection-scoped member read (e.g. `GET /connections/{organizationId}/members`, guard `connection.view` + an active connection), and retire `POST /brands/users` onto it; until then it keeps today's guard with the §5-7 do-not-reproduce note.
5. **Q5 — FE-orphaned identity endpoints** (`GET /users/check-by-email`, `GET /users/invited-user/{code}`, `POST /users/invite/brand-sub-user` — no caller in either FE). **Recommendation:** retire them in Phase 3 alongside the new Invitations endpoints instead of carrying them to Phase 5; `check-by-email` first (anonymous enumeration, IAM §6), after confirming no external/mobile consumer exists.
