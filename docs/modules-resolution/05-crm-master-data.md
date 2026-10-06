# 05. CRM master data — resolution workbook
Status: proposed · 2026-10-06 · BE develop @ 07f8fa01
Scope: BannersController (25) + ContactsController (6) + DistributionCenterController (5) + DistributorsController (24) + PipelinesController (18) + RegionsController (5) + RetailersController (9) = 92 actions · BE project(s): Modules.CRM (every handler in Modules.CRM.Application; StoresController sits in the CRM folder but is DataHub-backed and belongs to the Data Hub workbook)

Path shorthand (backend repo root `D:\Fork\Caboodle BE Repository\caboodle.backend`):
- `MCA\…` = `caboodle\src\Modules\CRM\Modules.CRM.Application\…`
- `MCD\…` = `caboodle\src\Modules\CRM\Modules.CRM.Domain\…`
- `BB\…` = `caboodle\src\BuildingBlocks\…`
- `web\…` = `D:\Fork\Caboodle FE Repository\caboodle.web\src\…`
- `MHP(A, R, M)` = `[MustHavePermission(CaboodleAction.A, CaboodleResource.R, CaboodleModule.M)]`
- `RM(...)` = `[RequireModule(...)]` per the template guard vocabulary.

## 1. What this area is

The brand workspace's CRM/master-data screens — Distributors (incl. sub-distributors, markups, warehouse links), Retailers, Banners (incl. banner SKUs, banner activities and retailer promo rules), Regions, Contacts and the Pipeline board — plus the global catalog those screens sit on. The data is two-layered: a **platform-shared catalog** (`CRM.Retailers`, `CRM.Banners`, `CRM.Distributors`, `CRM.Regions`, `CRM.DistributionCenters`, `CRM.DistributorDcs`, `CRM.RetailerRegions`, `CRM.RetailerPromoRules` — no `BrandID` anywhere, one row serves every tenant) and a **brand-keyed overlay** (`CRM.BannerSKUs`, `CRM.BannerActivities`, `CRM.Contacts`, `CRM.DistributorBrands`/`DistributorRetailers`/`DistributorBanners`, `CRM.Pipelines` + plans/activities/files). Primary callers are brand users; brokers reach three lookups from the Market Overview / Category Review / Distributor APL forms (`GET /regions`, the DC endpoints, `GET /distributors/leaf/broker`) — which is exactly why `regions`/`retailers`/`distributors` exist as Broker-audience data-source copies with Required-dependency edges (§3). The Platform Admin maintains the catalog through the `for-admin` reads, the MHP-guarded upserts and the MasterDataUpload import/export twins (Data Upload workbook).

## 2. Data ownership

| Table | Ownership class | Scoping change needed | Notes |
|---|---|---|---|
| `CRM.Retailers` | Platform (shared catalog) | None | `CorporateName`/`ImageURL` only (`MCD\Retailer\Retailer.cs`). Writes are ADMIN-only MHP today; rename fans out via Hangfire propagation (`MCA\Retailers\UpsertRetailerRequest.cs:84-94`) |
| `CRM.Regions` | Platform (shared catalog) | None | Global rows; rename propagation job (`MCA\Region\UpsertRegionRequest.cs:90-100`) |
| `CRM.Banners` | Platform (shared catalog) | None | `RetailerID` + `RegionID` + name + door count (`MCD\Banner\Banner.cs`); **currently written by any signed-in user** (§5). Rename propagation (`MCA\Banners\UpsertBannerRequest.cs:107-118`) |
| `CRM.Distributors` | Platform (shared catalog) | None | Global + `ParentID` hierarchy (delivery methods) |
| `CRM.DistributionCenters`, `CRM.DistributorDcs` | Platform (shared catalog) | None | `DistributorDc` = distributor × region × warehouse; created inline from **broker** MO/CR forms today (§7) |
| `CRM.RetailerRegions` | Platform (shared catalog) | None | retailer × region × nullable banner mapping; admin-app write sends **no BrandID on purpose** — the row is global |
| `CRM.RetailerPromoRules` | Platform (shared catalog) | None | Global per retailer × banner × region; the **brand** promo-rules screen writes them (Q1); delete is a **hard** `DELETE` (`MCA\RetailerPromoRules\DeleteRetailerPromoRulesRequest.cs:26`) |
| `CRM.BannerActivityTypes` | Platform | None | Lookup list, no tenant column |
| `CRM.BannerSKUs` | Brand-owned | None | `BrandID` + `BannerID` + `ProductID` — the brand's assortment on a shared banner |
| `CRM.BannerActivities` | Brand-owned | None | `BrandID` + `BannerID`; row guards already enforced (`MCA\BannerActivity\DeleteBannerActivityRequest.cs:46-51`) |
| `CRM.Contacts` | Brand-owned | None | `BrandID`; duplicate checks are per-brand |
| `CRM.DistributorBrands` / `DistributorRetailers` / `DistributorBanners` | Brand-owned (connection overlay) | None | `BrandID` link rows carrying markups; all writes already keyed on the header brand |
| `CRM.Pipelines`, `CRM.PipelinePlans` | Brand-owned | None | `BrandID` (not null) |
| `CRM.PipelineActivities`, `CRM.PipelineActivityFiles` | Brand-owned (satellite) | None — inherit via `PipelineID` → `Pipelines.BrandID`, but several handlers skip the join today (§5) | No own `BrandID` column |
| `CRM.PipelineDealStages` | Brand-owned **with platform defaults** | None | `BrandID` **nullable**: null rows are the seeded global stages every brand sees (`MCA\PipeLines\DealStage\GetPipeLineDealStagesRequest.cs:44-46`); the platform edits them through `AdminController GET|PUT pipelines/dealstages` (duplicate surface, inventory Section D) |

No table here needs `BrokerageOrganizationID` — nothing in this area is brokerage work product (contrast workbook 01). The resolution work is guards plus the missing per-row `BrandID` filters, not schema.

## 3. Module catalog mapping

**Brand audience** (Section B): five top-level data-source modules cover the area 1:1 — `distributors` (FE routes `distributors` **and** `banners`), `retailers`, `regions`, `contacts`, `pipelines` (FE route `pipeline`). None has dependencies of its own; instead they are the **Required data sources of other modules**: `trade-spend-roll-up-report` (distributors, retailers), `broker-market-activities` (retailers), `retail-reports` (retailers), `sales-tracker` (regions Required, retailers Optional), `trade-spend-roll-up` (distributors, retailers), `monthly-report` (distributors), `promotional-calendar-view` (regions Optional), `ask-caboodle` (all five Optional). Under §6.2's `WithViewOn(RequiredDependencies(...))`, a Custom user granted e.g. `sales-tracker` arrives here with **derived View** on `regions` — most read rows below must therefore be satisfiable by derived View, with Create/Edit/Delete reserved for explicit grants.

**Broker audience**: the data-source copies `regions` (sort 101), `retailers` (102), `distributors` (103) — no FE route, no children; they exist as dependency anchors for `market-overview` (requires product-spec, regions, retailers, distributors), `distributor-apl` (product-spec, regions, distributors) and `promotional-management-events` (distributors among others). Broker-callable rows below (`GET /regions`, DC lookups, `GET distributors/leaf/broker`) ride these copies and are normally reached via derived View. Slugs `regions`/`retailers`/`distributors` exist in **both** audiences with different IDs → dual-audience rows name both in one attribute and carry D1.

**Pipelines slug**: `pipelines`, Brand audience, top-level (group `pipelines`), FE route segment `pipeline`; no dependency edges except as an OptionalDataSource of `ask-caboodle`. No Broker copy exists — the pipeline board is brand-only.

**Gaps:**
- **Banners, banner SKUs and retailer promo rules have no slug.** The FE already gates `/banners` (and `/banners/promo-rules`) on `distributors` (Section C: "Brand `banners` route gates on `distributors`"); matrix rows follow that rather than inventing a `banners` module. Flagged Q6 if product wants a dedicated child module later.
- **Distribution centers have no slug** and are created inline from the *broker* Market Overview / Category Review forms (`web\components\broker-dashboard\AddMarketOverview.tsx:4-6`, `AddOrEditCategoryReview.tsx:4-6`). Reads ride the `distributors` copies; writes ride the consuming screen `market-overview` (pilot precedent: MO form lookups guarded by the MO module). Q2.
- **Broker `category-review` declares no dependency on `distributors`**, yet its form calls the DC lookups → a Custom broker holding only `category-review` would 403 after the flip. Q3 proposes seeding the edge.
- **Brand promo-form lookups** (`retailers/for-promo`, `skus/for-promo`×2) serve the Approved Promotions and Sandbox screens. Rows gate on the data-owner slugs (`retailers`/`distributors`) and Q4 proposes seeding `approved-promotions` → retailers, distributors and `trade-spend-sandbox` → retailers, distributors (Required) so promo grants pull derived View — the same mechanism Market Overview already uses.
- **Admin surfaces** (`for-admin` reads, catalog upserts for retailers/distributors/retailer-region, global exports, data-cleanup endpoints) keep/gain `[MustHavePermission]`; all their existing CRM-module claims are ADMIN-only in practice (`BB\Core\Shared\Authorization\CaboodlePermissions.cs:202-221` — Broker/SubBroker sets contain only `CaboodleModule.Broker` permissions; brand roles have no claims).

## 4. Endpoint authorization matrix

Action mapping per template §4.3 (Assign/connect/disconnect → `Edit`; Upsert → floor `View` + handler Demand). "—" in Today's guard = no attribute (global `RequireAuthorization` only). Every brand-scoped handler reads the `BrandID` header via `ICurrentUser.GetBrandID()` (`BB\Infrastructure\Auth\CurrentUser.cs:20`, set in `CurrentUserMiddleware.cs:22`); `BrandValidationMiddleware` validates membership only **when the header is present** (workbook 01 §5) — for the rows marked BrandID-hdr it is the *only* gate today.

### 4.1 BannersController — `/api/v1/banners` (25)
File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\BannersController.cs`. All 25 requests resolve to Modules.CRM.Application — the inventory's "Modules.Brand.Application (1)" is a same-name collision between `MCA\Banners\Filters\GetFilterOptionsRequest.cs` and Brand's APL `GetFilterOptionsRequest`.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST | UpsertBannerRequest | —; **writes the global catalog with no check of any kind** (`MCA\Banners\UpsertBannerRequest.cs:65-123`); rename propagates to every tenant (`:107-118`) | `RM(brand: "distributors", View)` floor + `_access.Demand("distributors", request.ID is null ? Create : Edit)` | Brand banners screen (`web\service\caboodle.service.ts:368-380`). Global blast radius → Q1. §5 do-not-reproduce |
| DELETE | DeleteBannersRequest | —; soft-deletes any unreferenced banner for any signed-in user; reference check joins SKUs/activities **brand-blind** (`MCA\Banners\DeleteBannersRequest.cs:40-58,79-117`) | `RM(brand: "distributors", Delete)` | Q1. §5 do-not-reproduce |
| POST for-retailer | GetBannersRequest | —; BrandID hdr; rows via `BannerSKUs`/`DistributorBanners` `@BrandID` joins (`MCA\Banners\GetBannersRequest.cs:68-125,164`) | `RM(brand: "distributors", View)` | Admin app also calls it with `brandScopedHeaders()` → support context (§6) |
| POST for-retailer/global | GetGlobalBannersRequest | —; BrandID hdr; excludes the brand's linked banners (`:47,65`) and **hard-codes template brand GUID `e8c90677-0320-41e5-a37f-52a8014c2752`** in the SQL (`MCA\Banners\GetGlobalBannersRequest.cs:142-150`) | `RM(brand: "distributors", View)` | Q6 (template-brand constant) |
| GET for-admin | GetBannersForAdminRequest | MHP(View, Banners, Banner) — ADMIN-only in practice (`CaboodlePermissions.cs:202-208`) | keep `[MustHavePermission]` | Platform screen |
| POST for-admin/filter-options | GetFilterOptionsRequest | MHP(View, Banners, Banner) — ADMIN-only | keep `[MustHavePermission]` | |
| POST {bannerID:guid}/activities | UpsertBannerActivityRequest | —; BrandID hdr; update path row-guards `BrandID` (`MCA\BannerActivity\UpsertBannerActivityRequest.cs:99`), contact brand-checked (`:90`), insert stamps brand (`:106`); mention-email lookup reads `CRM.Contacts` **without a brand filter** (`:169-174`) | `RM(brand: "distributors", View)` floor + Demand(`distributors`, ID null ? Create : Edit) | Upsert; fix the mention lookup (§6) |
| GET {bannerID:guid}/activities | GetBannerActivitiesRequest | —; BrandID hdr; `ba."BrandID" = @BrandID` (`MCA\BannerActivity\GetBannerActivitiesRequest.cs:72-73,85`) | `RM(brand: "distributors", View)` | |
| DELETE {bannerID:guid}/activities/{activityID} | DeleteBannerActivityRequest | —; BrandID hdr; row guard (`MCA\BannerActivity\DeleteBannerActivityRequest.cs:46-51`) | `RM(brand: "distributors", Delete)` | |
| PATCH {bannerID:guid}/skus | UpdateBannerSKURequest | —; BrandID hdr; row guard `BrandID` + `BannerID` (`MCA\SKUs\UpdateBannerSKURequest.cs:63`) | `RM(brand: "distributors", Edit)` | Admin app writes it with `brandScopedHeaders()` (§6) |
| POST {bannerID:guid}/skus | CreateBannerSKURequest | —; BrandID hdr; stamps brand, products validated against the brand (`MCA\SKUs\CreateBannerSKURequest.cs:79-110,144-160`) | `RM(brand: "distributors", Create)` | |
| POST {bannerID:guid}/get-skus | GetBannerSKUsOfCurrentBrandRequest | —; BrandID hdr; brand-scoped (`MCA\SKUs\GetBannerSKUsOfCurrentBrandRequest.cs:78,133,153`) | `RM(brand: "distributors", View)` | |
| POST skus/for-admin | GetBannerSkusForAdminRequest | MHP(View, BannerSKUs, BannerSKU) — ADMIN-only | keep `[MustHavePermission]` | |
| POST skus/filter-options | GetSkuFilterOptionsRequest | MHP(View, BannerSKUs, BannerSKU) — ADMIN-only | keep `[MustHavePermission]` | |
| POST skus/for-promo | GetBannerSKUsForPromoRequest | —; BrandID hdr (`MCA\SKUs\GetBannerSKUsForPromoRequest.cs:34`) | `RM(brand: "distributors", View)` | Promo-form lookup (`web\service\promo.service.ts:156`) — needs the Q4 dependency seeds |
| GET skus/for-promo/filter-properties | GetBannerSKUFilterPropertiesRequest | —; BrandID hdr (`MCA\SKUs\GetBannerSKUFilterPropertiesRequest.cs:31`) | `RM(brand: "distributors", View)` | Q4 |
| GET skus | GetSKUsRequest | —; BrandID hdr (`MCA\SKUs\GetSkusRequest.cs:40`) | `RM(brand: "distributors", View)` | |
| DELETE skus/delete | DeleteBannerSKURequest | —; BrandID hdr, but the SKUs are loaded **by id with no brand filter** (`MCA\SKUs\DeleteBannerSKURequest.cs:144-151`); brand id only feeds the sandbox-reference check (`:67,121-141`) → cross-brand delete | `RM(brand: "distributors", Delete)` + add `BrandID = @brand` to the load | §5 do-not-reproduce |
| DELETE sku/duplicates | DeleteBannerSKUDuplicatesRequest | —; global dedupe sweep over every brand's SKUs (`MCA\SKUs\DeleteBannerSKUDuplicatesRequest.cs:67-239`); duplicates AdminController `POST data-cleanup/bannersku` | `[MustHavePermission]` (platform) or retire | Q5. §5 do-not-reproduce |
| POST promorules | GetRetailerPromoRulesRequest | —; unscoped global read (`MCA\RetailerPromoRules\GetRetailerPromoRulesRequest.cs:112`) | `RM(brand: "distributors", View)` | Screen `/[brandID]/banners/promo-rules` rides `distributors` |
| POST promorules/export | ExportRetailerPromoRulesRequest | —; same query, file result | `RM(brand: "distributors", Export)` | |
| POST promorules/import | ImportRetailerPromoRulesRequest | —; no access check; rows stamped `CreatedBy` only (`MCA\RetailerPromoRules\ImportRetailerPromoRulesRequest.cs:76`) | `RM(brand: "distributors", Create)` | Global catalog write → Q1 |
| POST promorules/upsert | UpsertRetailerPromoRuleRequest | —; 404-check only (`MCA\RetailerPromoRules\UpsertRetailerPromoRuleRequest.cs:72-79`) | `RM(brand: "distributors", View)` floor + Demand(`distributors`, ID null ? Create : Edit) | Q1. §5 do-not-reproduce |
| DELETE promorules | DeleteRetailerPromoRulesRequest | —; **hard `DELETE`** of arbitrary ids (`MCA\RetailerPromoRules\DeleteRetailerPromoRulesRequest.cs:26`) | `RM(brand: "distributors", Delete)`; convert to soft delete | Q1. §5 do-not-reproduce |
| GET with-distributor-connection | GetBannersToLinkWithDistributorRequest | —; BrandID hdr; brand-scoped (`MCA\Banners\GetBannersToLinkWithDistributorRequest.cs:45,70`) | `RM(brand: "distributors", View)` | |

### 4.2 ContactsController — `/api/v1/contacts` (6)
File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\ContactsController.cs`

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST | UpsertContactRequest | —; BrandID hdr; update resolved only within the brand's contacts, insert stamps brand (`MCA\Contacts\UpsertContactRequest.cs:39-59`); loads **all** contacts into memory (`:43-45`, perf not auth) | `RM(brand: "contacts", View)` floor + Demand(`contacts`, ID null ? Create : Edit) | Admin app writes contacts with `brandScopedHeaders()` (§6) |
| DELETE | DeleteContactsRequest | —; BrandID hdr; the brand filter applies only to the *referenced* set — unreferenced contacts of **other brands** pass through and are soft-deleted by raw id (`MCA\Contacts\DeleteContactsRequest.cs:40-47,59-82`) | `RM(brand: "contacts", Delete)` + brand-filter the whole id set | §5 do-not-reproduce |
| GET | GetContactsRequest | —; BrandID hdr; brand-scoped (`MCA\Contacts\GetContactsRequest.cs:96`) | `RM(brand: "contacts", View)` | |
| GET export | ExportContactsRequest | —; BrandID hdr; brand-scoped (`MCA\Contacts\ExportContactsRequest.cs:91`) | `RM(brand: "contacts", Export)` | |
| GET for-admin | GetContactsForAdminRequest | MHP(View, Contacts, Contact) — ADMIN-only in practice | keep `[MustHavePermission]` | |
| POST for-admin/filter-options | GetContactFilterOptionsRequest | MHP(View, Contacts, Contact) — ADMIN-only | keep `[MustHavePermission]` | |

### 4.3 DistributionCenterController — `/api/v1/distributioncenter` (5)
File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\DistributionCenterController.cs`. No action has any guard or BrandID header; all data is the global catalog. Callers today: broker MO/CR forms (`web\hooks\dcs.ts` consumed only by `AddMarketOverview.tsx` / `AddOrEditCategoryReview.tsx`) and the admin app.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST distributor/dcs/search | GetDistributorsDcsRequest | —; unscoped global search (`MCA\Distributors\Dc\GetDistributorsDcsRequest.cs:66-74`) | `RM(brand: "distributors", broker: "distributors", View)` | Broker side satisfied by derived View (MO/APL Required deps); category-review gap → Q3. D1 |
| POST for-admin/filter-options | GetDcFilterOptionsRequest | —; unscoped admin filter options (`MCA\Distributors\Dc\Filters\GetDcFilterOptionsRequest.cs:113-127`) | `[MustHavePermission(CaboodleAction.View, CaboodleResource.Distributors, CaboodleModule.Distributor)]` (platform) | Admin-app surface, unguarded today |
| GET dcs | GetDcsRequest | —; unscoped global list (`MCA\Distributors\Dc\GetDcsRequest.cs:69`) | `RM(brand: "distributors", broker: "distributors", View)` | D1, Q3 |
| POST dcs | UpsertDCRequest | —; **global write, 404-check only** (`MCA\Distributors\Dc\UpsertDcRequest.cs:54-71`) | `RM(broker: "market-overview", View)` floor + Demand(`market-overview`, ID null ? Create : Edit) | Created inline from the broker MO form (consuming-screen guard, pilot precedent). Q2. §5 do-not-reproduce |
| POST distributor/dcs | UpsertDistributorDCRequest | —; **global write**, FK checks only (`MCA\Distributors\Dc\UpsertDistributorDCRequest.cs:75-94,102-111`) | `RM(broker: "market-overview", View)` floor + Demand(`market-overview`, ID null ? Create : Edit) | Q2. §5 do-not-reproduce |

### 4.4 DistributorsController — `/api/v1/distributors` (24)
File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\DistributorsController.cs`

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET | GetDistributorsRequest | —; BrandID hdr; brand join (`MCA\Distributors\GetDistributorsRequest.cs:42`) | `RM(brand: "distributors", View)` | |
| GET leaf | GetLeafDistributorsRequest | —; BrandID hdr (`MCA\Distributors\GetLeafDistributorsRequest.cs:37`) | `RM(brand: "distributors", View)` | Admin app calls it with `brandScopedHeaders()` (§6) |
| GET leaf/broker | GetLeafDistributorsForBrokerRequest | —; allowlist = `BrandBrokers.BrokerID = caller` (`MCA\Distributors\GetLeafDistributorsForBrokerRequest.cs:41-49`, spec `MCA\Specifications\GetBrandsByBrokerIDSpec.cs`), joined through `DistributorBrands` (`:74`) | `RM(broker: "distributors", View)` + `_access.BrandsWith("distributors", View)` | Cross-brand broker read; derived View from MO/APL/PM-events deps. D1 |
| GET sub-distributors/{parentDistributorID:guid} | GetDistributorDeliveryMethodsRequest | —; BrandID hdr (`MCA\Distributors\GetDistributorDeliveryMethodsRequest.cs:57`) | `RM(brand: "distributors", View)` | |
| POST sub-distributors/for-admin | GetSubDistributorsForAdminRequest | —; unscoped global list (`MCA\Distributors\GetSubDistributorsForAdminRequest.cs:74`), admin-app surface | `[MustHavePermission(View, Distributors, Distributor)]` (platform) | Unguarded admin surface today |
| POST sub-distributors/filter-options | GetSubDistributorFilterOptionsRequest | —; unscoped | `[MustHavePermission(View, Distributors, Distributor)]` (platform) | |
| GET sub-distributors/global/{parentDistributorID:guid} | GetGlobalSubDistributorsRequest | —; global list; brand "add delivery method" flow (`web\service\caboodle.service.ts:653`) | `RM(brand: "distributors", View)` | Catalog read from brand UI |
| GET global | GetGlobalDistributorsRequest | —; global list (`MCA\Distributors\GetGlobalDistributorsRequest.cs:70`); brand "add distributor" dialog (`web\hooks\distributors.ts:264-266`) | `RM(brand: "distributors", View)` | |
| GET {distributorID:guid} | GetDistributorRequest | —; BrandID hdr (`MCA\Distributors\GetDistributorRequest.cs:73`) | `RM(brand: "distributors", View)` | |
| GET {distributorID:guid}/retailers | GetDistributorRetailersRequest | —; BrandID hdr (`MCA\Distributors\GetDistributorRetailersRequest.cs:71`) | `RM(brand: "distributors", View)` | |
| POST {distributorID:guid}/banners | GetDistributorBannersRequest | —; BrandID hdr (`MCA\Distributors\GetDistributorBannersRequest.cs:156`) | `RM(brand: "distributors", View)` | |
| GET {distributorID:guid}/dcs | GetDistributorDcsRequest | —; BrandID hdr (`MCA\Distributors\Dc\GetDistributorDcsRequest.cs:66`) | `RM(brand: "distributors", View)` | |
| POST | UpsertDistributorRequest | MHP(Upsert, Distributors, Distributor) — ADMIN-only in practice; global catalog write, no further check (`MCA\Distributors\UpsertDistributorRequest.cs:52-79`) | keep `[MustHavePermission]` (platform catalog write) | `web` has a `setDistributor` wrapper (`caboodle.service.ts:476-481`) but non-admins 403 — dead path |
| POST sub-distributors | UpsertSubDistributorRequest | MHP(Upsert, Distributors, Distributor) — ADMIN-only (`MCA\Distributors\UpsertSubDistributorRequest.cs:68-75`) | keep `[MustHavePermission]` | |
| POST connect-brand | ConnectDistributorsToCurrentBrandRequest | —; BrandID hdr; writes `DistributorBrands` for the header brand (`MCA\Distributors\ConnectDistributorsToCurrentBrandRequest.cs:66-87`) | `RM(brand: "distributors", Edit)` | Assign → Edit |
| POST sub-distributors/connect | ConnectSubDistributorToDistributorRequest | —; BrandID hdr (`MCA\Distributors\ConnectSubDistributorToDistributorRequest.cs:63-104`) | `RM(brand: "distributors", Edit)` | |
| POST connect-retailer | ConnectRetailerToDistributorRequest | —; BrandID hdr; distributor + retailer links validated per brand (`MCA\Distributors\ConnectRetailerToDistributorRequest.cs:75-102`) | `RM(brand: "distributors", Edit)` | |
| POST connect-banner | ConnectDistributorWithBannerRequest | —; BrandID hdr (`MCA\Distributors\ConnectDistributorWithBannerRequest.cs:99-118`) | `RM(brand: "distributors", Edit)` | |
| POST connect-banners | ConnectDistributorWithBannersRequest | —; BrandID hdr (`MCA\Distributors\ConnectDistributorWithBannersRequest.cs:72-73`) | `RM(brand: "distributors", Edit)` | |
| PATCH update-markup | UpdateMarkupRequest | —; BrandID hdr; 404 unless the banner link exists under the brand (`MCA\Distributors\UpdateMarkupRequest.cs:61-75`) | `RM(brand: "distributors", Edit)` | |
| DELETE banners/remove | RemoveBannersFromDistributorRequest | —; BrandID hdr (`MCA\Distributors\RemoveBannersFromDistributorRequest.cs:76-130`) | `RM(brand: "distributors", Edit)` | Un-assign → Edit |
| DELETE brand-distributor-connection/{ID:guid} | RemoveDistributorFromBrandRequest | —; BrandID hdr (`MCA\Distributors\RemoveDistributorFromBrandRequest.cs:52`) | `RM(brand: "distributors", Edit)` | |
| DELETE sub-distributors/remove | RemoveSubDistributorFromBrandRequest | —; BrandID hdr (`MCA\Distributors\RemoveSubDistributorFromBrandRequest.cs:79-89`) | `RM(brand: "distributors", Edit)` | |
| DELETE | DeleteDistributorsRequest | MHP(Delete, **Retailers, Retailer**) — wrong resource (inventory Section D); ADMIN-only; handler computes the deletable set **backwards** — `existingDistributorIDs.Except(ids)` is always empty, so the UPDATE gets `IN ()` and errors (`MCA\Distributors\DeleteDistributorsRequest.cs:42-44,53-77`) | `[MustHavePermission(CaboodleAction.Delete, CaboodleResource.Distributors, CaboodleModule.Distributor)]` (claim exists, `CaboodlePermissions.cs:143`) + fix to `ids.Except(existing)` | §5 do-not-reproduce (×2: wrong resource, dead delete) |

### 4.5 PipelinesController — `/api/v1/pipelines` (18)
File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\PipeLinesController.cs` (file spelled `PipeLinesController.cs`, class `PipelinesController` — path/class mismatch only, route unaffected). All rows brand-audience `pipelines` unless noted.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET plans | GetPlansRequest | —; BrandID hdr (`MCA\PipeLines\Plan\GetPlansRequest.cs:39`) | `RM(brand: "pipelines", View)` | |
| POST plans | UpsertPlanRequest | —; BrandID hdr; update row-guards `plan.BrandID` (`MCA\PipeLines\Plan\UpsertPlanRequest.cs:48-68`) | `RM(brand: "pipelines", View)` floor + Demand(`pipelines`, ID null ? Create : Edit) | Upsert |
| POST plans/add-default | CreateDefaultPlanRequest | —; BrandID hdr ignored — iterates **every brand's** pipelines and creates a Default Plan per brand (`MCA\PipeLines\Plan\CreateDefaultPlanRequest.cs:30-55`) | `[MustHavePermission]` (platform) or retire | One-shot migration endpoint callable by anyone. Q5. §5 do-not-reproduce |
| DELETE plans | DeletePlansRequest | —; BrandID hdr; deletable set checks task references but **never the plan's `BrandID`** (`MCA\PipeLines\Plan\DeletePlansRequest.cs:63-91`) → cross-brand plan delete | `RM(brand: "pipelines", Delete)` + brand filter | §5 do-not-reproduce |
| GET {planID:guid}/tasks | GetPipeLinesRequest | —; BrandID hdr (`MCA\PipeLines\PipeLine\GetPipeLinesRequest.cs:133`) | `RM(brand: "pipelines", View)` | |
| GET {id:guid} | GetPipeLineRequest | —; BrandID hdr (`MCA\PipeLines\PipeLine\GetPipeLineRequest.cs:55`) | `RM(brand: "pipelines", View)` | |
| GET {pipelineID:guid}/activities | GetPipeLineActivitiesRequest | —; BrandID hdr on the action but the query filters **only `PipelineID`** (`MCA\PipeLines\Activity\GetPipeLineActivitiesRequest.cs:66-68`) — any user reads any pipeline's activities by guid | `RM(brand: "pipelines", View)` + join `Pipelines.BrandID = @brand` | §5 do-not-reproduce |
| GET mentions | GetUsersToMentionInActivityRequest | —; `BrandID` comes from the **query string** and is never validated against the caller (`MCA\PipeLines\Activity\GetUsersToMentionInActivityRequest.cs:12,46,74-89`) — enumerates any brand's owner/brokers/sub-users | `RM(brand: "pipelines", View)` + require `brandID` == active brand | §5 do-not-reproduce |
| POST | UpsertPipeLineRequest | —; BrandID hdr; row/plan/deal-stage all brand-guarded, null-brand global stages allowed (`MCA\PipeLines\PipeLine\UpsertPipeLineRequest.cs:70,118,140,148-153`) | `RM(brand: "pipelines", View)` floor + Demand(`pipelines`, ID null ? Create : Edit) | Upsert |
| POST {pipelineID:guid}/activities | UpsertPipeLineActivityRequest | —; BrandID hdr; pipeline brand-checked (`MCA\PipeLines\Activity\UpsertPipeLineActivityRequest.cs:153-157`); update path re-checks only null/deleted (`:103-105`); contact not brand-checked (`:163-165`); mention lookup reads `Users` unscoped (`:262`) | `RM(brand: "pipelines", View)` floor + Demand(`pipelines`, ID null ? Create : Edit) | Fix contact/activity scoping (§6) |
| POST file-upload | UploadActivityFileRequest | —; BrandID hdr; **no check that `PipelineActivityID` belongs to the caller's brand** (`MCA\PipeLines\Activity\UploadActivityFileRequest.cs:58-95`) | `RM(brand: "pipelines", Create)` + activity→pipeline→brand validation | §5 do-not-reproduce |
| PUT reorder | ReOrderPipeLineRequest | —; BrandID hdr; deal stage brand-guarded (`MCA\PipeLines\PipeLine\ReOrderPipeLineRequest.cs:73-74`) but the **pipeline row is not** (`:76-78`); shift updates filter by brand (`:97,121`), final write is by raw id (`:138-142`) | `RM(brand: "pipelines", Edit)` + row guard `pipeline.BrandID == brand` | FE sends a stale persisted BrandID here (§6). §5 do-not-reproduce |
| PUT change-deal-stage-state | UpdatePipeLineDealStageStateRequest | —; BrandID hdr; stages validated per brand (`MCA\PipeLines\PipeLine\UpdatePipeLineDealStageStateRequest.cs:123-128`), pipeline row only null/deleted-checked (`:77-79`) | `RM(brand: "pipelines", Edit)` + row guard | Same stale-header exposure (§6) |
| DELETE | DeletePipeLineRequest | —; BrandID hdr; row guard (`MCA\PipeLines\PipeLine\DeletePipeLineRequest.cs:51`) | `RM(brand: "pipelines", Delete)` | |
| DELETE {pipelineID:guid}/activities/{activityID:guid}/delete | DeletePipeLineActivityRequest | —; BrandID hdr; checks only `activity.PipelineID == route` — **no brand check** (`MCA\PipeLines\Activity\DeletePipeLineActivityRequest.cs:63-66`) | `RM(brand: "pipelines", Delete)` + brand scope via pipeline | §5 do-not-reproduce |
| DELETE file | DeleteActivityFileRequest | —; BrandID hdr; **no check at all** — removes the storage object for any URL containing `CaboodleFiles` and hard-deletes the row (`MCA\PipeLines\Activity\DeleteActivityFileRequest.cs:44-57`) | `RM(brand: "pipelines", Delete)` + ownership via activity→pipeline→brand | §5 do-not-reproduce |
| POST dealstages | CreatePipeLineDealStageRequest | —; BrandID hdr; stamps brand (`MCA\PipeLines\DealStage\CreatePipeLineDealStageRequest.cs:53-73`); hidden from Swagger (`[ApiExplorerSettings(IgnoreApi)]`) | `RM(brand: "pipelines", Create)` | Platform twin: AdminController `GET|PUT pipelines/dealstages` edits the null-brand defaults (MHP, Admin workbook) |
| GET dealstages | GetPipeLineDealStagesRequest | —; BrandID hdr; brand rows + global null-brand rows (`MCA\PipeLines\DealStage\GetPipeLineDealStagesRequest.cs:44-46`) | `RM(brand: "pipelines", View)` | |

### 4.6 RegionsController — `/api/v1/regions` (5)
File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\RegionsController.cs`. The inventory's "Modules.Broker.Application (1)" is a same-name collision (`GetRegionsRequest` also exists in Broker's APL filters); all five requests resolve to `MCA\Region\*` (namespace `Caboodle.Modules.CRM.Application`).

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET | GetRegionsRequest | —; unscoped global list (`MCA\Region\GetRegionsRequest.cs:70`); callers: brand Regions page (`web\app\(brand)\[brandID]\(crm)\regions\page.tsx:11` via `web\hooks\market-overview.ts:285-287`) **and** broker MO form (`web\service\market-overview.service.ts:130`) | `RM(brand: "regions", broker: "regions", View)` | Dual audience; broker side normally derived View (MO/APL require regions). D1 |
| POST retailers | GetRetailerRegionsRequest | —; unscoped global list, admin-app surface (`MCA\Region\GetRetailerRegionsRequest.cs:65-85`) | `[MustHavePermission(View, Retailers, Retailer)]` (platform) | Unguarded admin surface today |
| POST retailers/filter-options | GetRetailerRegionsFilterOptionsRequest | —; unscoped | `[MustHavePermission(View, Retailers, Retailer)]` (platform) | |
| POST | UpsertRegionRequest | —; **global catalog write with no check**, rename fans out (`MCA\Region\UpsertRegionRequest.cs:66-104`); no active caboodle.web caller (`web\hooks\dcs.ts:138-148` commented out) | `[MustHavePermission]` (platform; needs a new claim, e.g. `Permissions.Retailer.Regions.Upsert`) *(Q1)* | §5 do-not-reproduce |
| POST retailer-region | UpsertRetailerRegionRequest | MHP(Upsert, RetailerRegions, **Retailer** module) — ADMIN-only in practice; loads *all* mappings into memory for the dup check (`MCA\Region\UpsertRetailerRegionRequest.cs:67-116`) | keep `[MustHavePermission]` | Admin app deliberately sends **no BrandID** — the mapping is global, nothing to scope (§6). Module-name mismatch is cosmetic (Section D) |

### 4.7 RetailersController — `/api/v1/retailers` (9)
File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\RetailersController.cs`

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET global | GetAllRetailersRequest | —; unscoped global list (`MCA\Retailers\GetAllRetailersRequest.cs:69-77`); brand "add retailer" dialog (`web\service\caboodle.service.ts:177-186`) | `RM(brand: "retailers", View)` | Catalog read from brand UI |
| POST global/filter-options | GetRetailerFilterOptionsRequest | —; unscoped | `RM(brand: "retailers", View)` | |
| GET | GetRetailersOfCurrentBrandRequest | —; BrandID hdr; brand joins through `DistributorBanners`/`RetailerRegions` (`MCA\Retailers\GetRetailersOfCurrentBrandRequest.cs:74-93,148`) | `RM(brand: "retailers", View)` | |
| GET export/current-brand | ExportRetailersOfCurrentBrandRequest | —; BrandID hdr (`MCA\Retailers\ExportRetailersOfCurrentBrandRequest.cs:131`) | `RM(brand: "retailers", Export)` | |
| GET export/all | ExportRetailersRequest | —; unscoped **global export for any signed-in user**; functional twin of MasterDataUpload `GET retailers` (`RetailersExportRequest`, MHP Export) | `[MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)]` or retire in favour of the twin | Q5 |
| GET {retailerId:guid} | GetRetailerRequest | —; BrandID hdr; joins `DistributorRetailers` on the brand, 404 otherwise (`MCA\Retailers\GetRetailerRequest.cs:64-87`) | `RM(brand: "retailers", View)` | |
| POST for-promo | GetRetailersForPromoRequest | —; BrandID hdr (`MCA\Retailers\GetRetailersForPromoRequest.cs:138`) | `RM(brand: "retailers", View)` | Promo-form lookup (`web\service\promo.service.ts:133`) — Q4 dependency seeds |
| POST | UpsertRetailerRequest | MHP(Upsert, Retailers, Retailer) — ADMIN-only in practice; global write + rename propagation (`MCA\Retailers\UpsertRetailerRequest.cs:59-99`) | keep `[MustHavePermission]` (platform catalog write) | |
| DELETE | DeleteRetailersRequest | MHP(Delete, Retailers, Retailer) — ADMIN-only; reference check via Banners only (`MCA\Retailers\DeleteRetailersRequest.cs:53-91`) | keep `[MustHavePermission]` | |

## 5. Parity notes

**What each mechanism actually allows/denies today:**

- **Claim seeding**: only 11 of the 92 actions carry `[MustHavePermission]`, and every one names a non-Broker module (Retailer, Distributor, Banner, BannerSKU, Contact) — the Broker/SubBroker claim sets contain only `CaboodleModule.Broker` permissions and brand roles have no claims at all (`BB\Core\Shared\Authorization\CaboodlePermissions.cs:202-221`), so all 11 are **ADMIN-only in practice**. The other 81 actions rely on the global `RequireAuthorization` plus whatever the handler does.
- **`BrandValidationMiddleware` + header-derived brand**: the middleware validates membership only when a `BrandID` header is present (workbook 01 §5, incl. the invalid-GUID 200-status bug); handlers then read `ICurrentUser.GetBrandID()` (`BB\Infrastructure\Auth\CurrentUser.cs:20`, set by `CurrentUserMiddleware.cs:22`). A request **without** the header skips validation and runs with `Guid.Empty` — reads return empty pages, writes would stamp `BrandID = Guid.Empty`. The 25 header-marked CRM rows have no other gate.
- **Per-handler row guards** (the good citizens, resolver must match them): banner activities (`UpsertBannerActivityRequest.cs:99`, `DeleteBannerActivityRequest.cs:46-51`), banner SKU update (`UpdateBannerSKURequest.cs:63`), contacts upsert (`UpsertContactRequest.cs:43-54`), markup/link writes (spec-based, e.g. `UpdateMarkupRequest.cs:63-69`), pipeline plan/row guards (`UpsertPlanRequest.cs:56`, `UpsertPipeLineRequest.cs:118,140,150`, `DeletePipeLineRequest.cs:51`), deal-stage reads honouring null-brand defaults (`GetPipeLineDealStagesRequest.cs:44-46`).
- **Global catalog endpoints** have no scoping *by design* (regions, retailers/global, DCs, promo rules, global distributors); the authorization question there is only *who may call*, not *whose rows*.
- **`GetLeafDistributorsForBrokerRequest`** is this area's one `BrandBrokers` consumer (`:41-49`): allowlist = the caller's own `BrandBrokers` rows — same shape as workbook 01's helpers, replaced by `BrandsWith`.

**Resolver must-match list** (comparator, plan 2.5): for every brand user, the brands where `RM(brand: slug, action)` passes must equal today's middleware membership test (`Brands.UserID` / `BrandSubUsers`); for brokers, `BrandsWith("distributors", View)` must reproduce the `BrandBrokers`-derived list on `leaf/broker`, and derived View via Required deps must cover every broker MO/CR/APL form lookup that works today (regions, DCs, leaf distributors) for Full-access brokers.

**Do-not-reproduce list** (intentional comparator differences):

1. `POST|DELETE /banners` — unguarded writes/soft-deletes of the **global** banner catalog by any signed-in user (`UpsertBannerRequest.cs:65-123`, `DeleteBannersRequest.cs:40-58`); fail-open.
2. `POST promorules/upsert|import`, `DELETE promorules` — unguarded global promo-rule writes, delete is a hard `DELETE` (`DeleteRetailerPromoRulesRequest.cs:26`); fail-open.
3. `POST /distributioncenter/dcs` and `distributor/dcs` — unguarded global DC writes (`UpsertDcRequest.cs:54-71`, `UpsertDistributorDCRequest.cs:75-94`).
4. `DELETE /banners/skus/delete` loads SKUs by id with no brand filter — cross-brand SKU deletion (`DeleteBannerSKURequest.cs:144-151`).
5. `DELETE /contacts` soft-deletes unreferenced contacts of **other brands** (brand filter only on the referenced set, `DeleteContactsRequest.cs:59-82`).
6. `DELETE /pipelines/plans` deletable set never checks the plan's brand (`DeletePlansRequest.cs:63-91`).
7. `GET /pipelines/{id}/activities` filters only `PipelineID` — unscoped read (`GetPipeLineActivitiesRequest.cs:66-68`).
8. `GET /pipelines/mentions` trusts a query-string `BrandID` — user/broker enumeration for any brand (`GetUsersToMentionInActivityRequest.cs:46,74-89`).
9. `POST /pipelines/file-upload` never validates the target activity's brand (`UploadActivityFileRequest.cs:58-95`).
10. `DELETE /pipelines/file` has no check at all and deletes storage objects by caller-supplied URL (`DeleteActivityFileRequest.cs:44-57`).
11. `DELETE /pipelines/{pid}/activities/{aid}/delete` checks activity↔pipeline linkage but not the brand (`DeletePipeLineActivityRequest.cs:63-66`).
12. `PUT reorder` / `change-deal-stage-state` never brand-check the pipeline row; reorder's final write updates by raw id (`ReOrderPipeLineRequest.cs:76-78,138-142`; `UpdatePipeLineDealStageStateRequest.cs:77-79`).
13. `DELETE /distributors` is guarded on the **Retailer** resource and its set-difference is backwards (`existing.Except(ids)` = always empty → `IN ()` → SQL error, `DeleteDistributorsRequest.cs:77`) — a dead endpoint; fix both, comparator whitelists the behavior change.
14. `POST /pipelines/plans/add-default` runs a **cross-tenant** backfill over every brand for any caller (`CreateDefaultPlanRequest.cs:30-55`).
15. `DELETE /banners/sku/duplicates` — unguarded global cleanup sweep (`DeleteBannerSKUDuplicatesRequest.cs:67-239`), duplicate of the admin data-cleanup endpoint.
16. Mention lookups read `CRM.Contacts` / `Identity.Users` without brand scoping (`UpsertBannerActivityRequest.cs:169-174`, `UpsertPipeLineActivityRequest.cs:262`) — minor cross-brand info leak; scope them.
17. Missing-header behavior (silent `Guid.Empty` reads/writes) is replaced by an explicit 403 from `[RequireModule]` — comparator must expect 403 where today an empty page comes back.

Kept as-is for parity (flagged, not fixed here): `GetGlobalBannersRequest`'s hard-coded template-brand GUID (`:142-150`, Q6); hard-delete semantics elsewhere unchanged.

## 6. Code changes beyond attributes

**Demand() call sites** (payload-dependent Upserts; floor `View` on the endpoint): `UpsertBannerRequest`, `UpsertBannerActivityRequest`, `UpsertContactRequest`, `UpsertRetailerPromoRuleRequest`, `UpsertDCRequest`, `UpsertDistributorDCRequest` (both on `market-overview`), `UpsertPlanRequest`, `UpsertPipeLineRequest`, `UpsertPipeLineActivityRequest`. The platform upserts (`UpsertRetailerRequest`, `UpsertDistributorRequest`, `UpsertSubDistributorRequest`, `UpsertRegionRequest`, `UpsertRetailerRegionRequest`) stay `[MustHavePermission]` and need no Demand.

**Row guards / brand filters to add** (the §5 fix list): `DeleteBannerSKURequest.cs:144-151` (+`BrandID`), `DeleteContactsRequest.cs:59-82` (brand-filter the whole set), `DeletePlansRequest.cs:63-91`, `GetPipeLineActivitiesRequest.cs:66-68` (join Pipelines), `DeletePipeLineActivityRequest.cs:63-66`, `DeleteActivityFileRequest.cs:44-57` (resolve file → activity → pipeline → brand; stop trusting the URL), `UploadActivityFileRequest.cs:85-95`, `ReOrderPipeLineRequest.cs:76-78,138-142`, `UpdatePipeLineDealStageStateRequest.cs:77-79`, `GetUsersToMentionInActivityRequest.cs:46` (require == active brand), both mention lookups, `DeleteDistributorsRequest.cs:77` (invert the Except).

**Helpers/specs to replace at Phase 4.4**: `MCA\Specifications\GetBrandsByBrokerIDSpec.cs` and its use in `GetLeafDistributorsForBrokerRequest.cs:41-42` → `_access.BrandsWith("distributors", View)`. Nothing else in this area reads `BrandBrokers`/role state — CRM has no access helper of its own; retiring `BrandValidationMiddleware` (shared, workbook 01) removes the only membership check these 25 header-gated rows have, so the `[RequireModule]` attributes must land **in the same deploy**.

**BrandID-header edge cases:**
- **Pipelines reorder/change-state send a stale store brand** (IAM plan §5-6): `useReorderPipeline`/`useChangeStatePipeline` take the brand from the persisted zustand global store, not the `[brandID]` route param every other pipeline call uses (`web\hooks\pipeline.ts:52-55,72-75` vs `:21-25`; store persisted at `web\store\globalStore.ts:27`), and the service omits the header entirely when the store is empty (`web\service\pipeline.service.ts:68-77,86-95`). Today a stale header quietly reorders the *header* brand's rows while writing the target pipeline's order by raw id (the §5-12 bug); after the flip it must 403 (never 401) and the FE should switch to the route param.
- **Admin app writes through brand headers**: caboodle.admin (develop, reviewed for the IAM plan; repo not vendored here) calls `banners/for-retailer`, `banners/{id}/skus` (PATCH/POST), the master-data screens through `…/contacts`, and `distributors/leaf` with a `brandScopedHeaders()` helper that sets `BrandID` explicitly — ADMIN bypasses `BrandValidationMiddleware`, and the handlers scope to that header. Post-flip these become `[RequireModule]` endpoints, so the Platform-Admin **SupportContext** (arch §6.2) must honour an explicit `BrandID` on brand-audience slugs or the admin app breaks before its Phase-5 migration. Conversely `regions/retailer-region` deliberately sends **no** BrandID — the row is global and the endpoint stays platform-guarded; nothing to carry over.
- **Missing header**: every brand-scoped handler must stop accepting `Guid.Empty` silently; `[RequireModule]` + the §6.1 brand-workspace default (BrandID := organization id) covers it.

**Transactions**: `ReOrderPipeLineRequest` runs its shift + final update as two non-transactional statements (`:101-151`) and `UpdatePipeLineDealStageStateRequest` a multi-statement batch — wrap when adding the row guards. Catalog rename propagation (banner/retailer/region) runs as Hangfire jobs — eventually consistent, unchanged.

## 7. FE impact (Phase 5)

Web (caboodle.web, develop @ 956295e4), per `_inventory.md` Section C:

- Brand routes map 1:1: `/distributors` + `/banners` → `distributors`, `/retailers` → `retailers`, `/regions` → `regions`, `/contacts` → `contacts`, `/pipeline` → `pipelines`. The nav "Management → CRM" group has **no module of its own** — it renders if any child survives; after `/me/access` lands a Custom user with only `contacts` still gets the group with one entry.
- The promo-rules screen lives under `/[brandID]/banners/promo-rules` (`web\app\(brand)\[brandID]\(crm)\banners\promo-rules\PromoRuleListing.tsx` via `web\service\promo-rule.service.ts:19-73`) — inherits the `distributors` gate; its writes hit the global catalog (Q1).
- Promo screens call the CRM lookups from outside the CRM routes: `retailers/for-promo` and `banners/skus/for-promo` (`web\service\promo.service.ts:133,156`, also `simpleEntry.service.ts`). Until the Q4 dependency seeds land, a Custom user granted only `approved-promotions`/`trade-spend-sandbox` will 403 on them post-flip — the promo forms must tolerate 403 (hide the picker, don't sign out; 403-not-401, plan §5-2).
- Broker forms call this area cross-workspace: `GET /regions` (`market-overview.service.ts:130`), the DC search/list/create (`web\hooks\dcs.ts`, used by `AddMarketOverview.tsx` and `AddOrEditCategoryReview.tsx`), `GET /distributors/leaf/broker` (`caboodle.service.ts:555-570`). Full brokers keep them via module actions, Custom brokers via derived View on the data-source copies — except Category Review (Q3) and the DC creates (Q2), which need their decisions before the flip.
- Pipelines: switch `useReorderPipeline`/`useChangeStatePipeline` to the route-param brand (§6) and handle 403 on a stale brand instead of relying on the backend to no-op.
- Admin app (not caboodle.web): the `for-admin` reads, catalog upserts (retailers, distributors, retailer-region, regions), global exports and the `brandScopedHeaders()` write paths migrate per IAM plan Phase 5; until then the SupportContext bridge in §6 keeps them working.
- When `/me/access` lands the route→slug map here is unchanged; no new slugs needed unless Q2/Q6 are accepted.

## 8. Test checklist

- **Comparator personas** per endpoint: brand owner, brand sub-user, *a second unrelated brand*, broker (Full), Custom broker holding only `market-overview`, Custom broker holding only `category-review`, ADMIN, unauthenticated. Expect zero disagreements except the §5 do-not-reproduce rows; the cross-brand fixes (SKU delete, contact delete, plan delete, pipeline activity read/delete/file ops, reorder) will newly 403/404 for the second brand — assert old behavior pre-flip, new post-flip.
- **Matrix tests** per §4 row: module granted → pass; module missing / action flag missing (Custom grant without Create/Edit/Delete/Export) / unconnected or suspended brand → 403 never 401. Upsert rows resolve Create vs Edit from the payload.
- **Derived-View tests**: Custom broker with only `market-overview` → `GET /regions`, DC search, `GET dcs`, `leaf/broker` all 200 (derived View on `regions`/`distributors` copies); the same broker gets DC **create** only with a `market-overview` Create grant; Custom broker with only `category-review` → DC lookups 403 until Q3's seed, then 200. Brand side: Custom user with only `sales-tracker` reads `GET /regions` via derived View but gets 403 on `POST /regions` paths.
- **Header tests**: missing `BrandID` in a brand workspace defaults to the organization id (§6.1); stale/foreign header → 403; reorder/change-state with a stale header no longer touch any row.
- **Global-catalog guard tests**: banner/promo-rule/DC writes 403 without the named grants; `POST /regions`, `export/all`, `for-admin` rows, `plans/add-default`, `sku/duplicates` 403 for every non-platform role.
- **Broken-delete regression**: `DELETE /distributors` — today's SQL-error behavior is whitelisted; post-fix assert correct deletable-set semantics and the corrected `(Delete, Distributors, Distributor)` claim.
- **Reflection test (plan 4.3)**: all 92 actions carry exactly one of the four guard kinds; `PipelinesController` discovered despite the `PipeLinesController.cs` file spelling; baseline shrinks only.
- **Contract tests**: `GET /brands/me` untouched by this area (plan 4.5); promo screens receive 403 (not 401) from the for-promo lookups when ungranted.

## 9. Open questions

1. **Q1 — Global catalog rows are writable from brand screens.** `POST|DELETE /banners`, the promo-rules write trio and the DC upserts mutate rows shared by every tenant (a brand renaming a banner renames it for all brands; promo-rule delete is a hard DELETE), and `POST /regions` is unguarded with no web caller. Recommendation: keep banner/DC/promo-rule writes brand-callable under the §4 guards for parity (the screens depend on them), move `POST /regions` to platform `[MustHavePermission]` with a new claim, and put the shared-write blast radius in front of product — the clean end-state is catalog writes platform-only with brand-scoped overrides.
2. **Q2 — Distribution centers have no module.** Reads ride the `distributors` slugs; the inline creates from the broker MO/CR forms are guarded here as `market-overview` Create (consuming screen, pilot precedent). Alternative: a dedicated `distribution-centers` catalog entry under `distributors`. Needs product choice before Phase 4.2.
3. **Q3 — Broker `category-review` has no Required dependency on `distributors`**, but its edit form calls the DC lookups. Recommendation: seed Broker `category-review` → `distributors` (Required) so the grant pulls derived View (§6.2); otherwise Custom category-review brokers lose the form post-flip.
4. **Q4 — Promo-form lookups gate on data-owner slugs** (`retailers`, `distributors`), so Custom users granted only promo modules would 403. Recommendation: seed Brand `approved-promotions` → `retailers`, `distributors` and `trade-spend-sandbox` → `retailers`, `distributors` (Required) — the exact Market Overview pattern. Alternative (no seeds): gate the three lookups on the consuming promo slugs.
5. **Q5 — One-shot / duplicate surfaces**: `POST plans/add-default` (cross-tenant backfill), `DELETE sku/duplicates` (duplicate of AdminController `data-cleanup/bannersku`), `GET retailers/export/all` (duplicate of MasterDataUpload `GET retailers`), and the AdminController vs PipelinesController `dealstages` pair. Recommendation: re-gate all with `[MustHavePermission]` in Phase 4.2 and schedule retirement of the duplicates; do not invent module guards.
6. **Q6 — `GetGlobalBannersRequest` hard-codes brand GUID `e8c90677-0320-41e5-a37f-52a8014c2752`** as the "global banner" source (`:142-150`) — apparently a template/master brand. Confirm the design with the Platform Admin and replace the constant with an explicit flag on the brand (or a platform-owned catalog view); also decide whether a dedicated `banners` child module (today `/banners` rides `distributors`) is wanted.
