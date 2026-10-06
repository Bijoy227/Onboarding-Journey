# 09. Reports & Dashboard — resolution workbook
Status: proposed · 2026-10-06 · BE develop @ 07f8fa01
Scope: ReportsController (11) + DashboardController (2) = 13 actions · BE project(s): Modules.Report (12 of 13 handlers; `GetRollUpReportForDashboardRequest` is dispatched by DashboardController) + Modules.Dashboard (1)

Path shorthand (backend repo root `D:\Fork\Caboodle BE Repository\caboodle.backend`):
- `MRA\…` = `caboodle\src\Modules\Report\Modules.Report.Application\…`
- `MDA\…` = `caboodle\src\Modules\Dashboard\Modules.Dashboard.Application\…`
- `BB\…` = `caboodle\src\BuildingBlocks\…`
- `RM(...)` = `[RequireModule(...)]` per the template guard vocabulary.

## 1. What this area is

The brand-workspace **report hub** (`/{brandId}/report`) and the two data widgets on the brand **dashboard**. This is a pure read/aggregation layer: it owns no tables and no writes — every endpoint renders other modules' data (approved-promotion trade spend, sandbox promotions, CRM banner/SKU statuses, product specs/pricing, and the brand-side view of brokerages' Market Overview entries). Users are brand owners and brand sub-users; no broker screen calls any of these routes (the broker workspace has no Reports shortcut, `_inventory.md` Section C), though today's middleware would admit a connected broker who sent the right `BrandID` header. Data read lives in `TradeSpend.*`, `TradeSpendSandbox.*`, `CRM.*`, `ProductSpecs.*` and `Broker.MarketOverviews`.

## 2. Data ownership

Everything here is read-only; no table is owned by this area, so no scoping change originates here. Rows note which workbook owns the plan for each source.

| Table | Ownership class | Scoping change needed | Notes |
|---|---|---|---|
| `TradeSpend.TradeSpendPromoEvents`, `TradeSpendPromos`, `BrandApprovedPromotionFees` | Brand-owned | None — all reads parameterised on `BrandID` | Read by `roll-up/brand-approved-promotions` (`MRA\Report\GetBrandApprovedPromotionsRollUpReportRequest.cs:881-920,1140-1149`), `products` (`MRA\DTOBuilder\ReportDTOBuilder.cs:101-131`) and the dashboard roll-up (`MRA\Report\GetRollUpReportForDashboardRequest.cs:774-776,990`) |
| `TradeSpendSandbox.PromotionalEvents`, `Promotions`, `PromotionFamilies`, `PromotionFees` | Brand-owned | None | Read by `roll-up/sandbox-promotions` (`MRA\Report\GetTradeSpendRollUpReportRequest.cs:836-922,1120-1153`) and `forecast-data-export` (`MRA\Report\GetForecastDataRequest.cs:620-630`) |
| `Broker.MarketOverviews` | Brokerage-owned (D6) | **Owned by workbook 01 / plan 1.3** (`BrokerageOrganizationID` column + backfill) — cross-reference, don't re-plan. The brand-twin reads here stay **brand-wide** (all brokerages' rows), per workbook 01 §4.3 / its Q3 note | `brand-market-overview*` trio filters only `mo."BrandID" = @BrandID` (`MRA\Report\GetMarketOverviewReportForBrandRequst.cs:229-231`) |
| `CRM.BannerSKUs`, `BannerActivities`, `DistributorBanners`, `RetailerRegions` | Brand-owned | None — `BrandID`-keyed in every query | retail-report trio, sales-tracker, both roll-ups, dashboard summary |
| `CRM.Banners`, `Retailers`, `Regions`, `DistributorDcs`, `DistributorRetailers`, `Stores` | Brand-owned / global lookup rows | None — joined for names only, reached through `BrandID`-scoped rows | CRM workbook owns their own endpoints |
| `ProductSpecs.ProductSpecifications`, `Categories`, `PriceList` | Brand-owned | None | Price list reads in both roll-ups, forecast export (`GetForecastDataRequest.cs:350-369`) |
| `Identity.Users` | Identity/IAM | Cross-reference only | Display-name join in the MO report queries (`GetMarketOverviewReportForBrandRequst.cs:222-224`) |

No `ImportJobs`/`ExportJobs` rows: the two exports here (`brand-market-overview-export`, `forecast-data-export`) are synchronous `FileStreamResult`s, not background jobs.

## 3. Module catalog mapping

Brand audience (Section B), `reports` group: parent `reports` (FE route `/report`, the hub page) with children `broker-market-activities` (dep: retailers Required), `category-review-report` → `category-review`/`category-review-calendar`, `retail-reports` (deps: retailers Required, product-spec OptionalDataSource), `sales-tracker` (deps: regions Required, retailers OptionalDataSource).

Slug selection rule applied throughout §4: **an endpoint takes the slug of the screen the FE gates it with**, even when that slug lives outside the `reports` group — the hub page is only a launcher and several of its tiles link into other groups:

- `GET products` serves `/product-report` ("Promoted Case Sales Analysis"), route-gated on **`enhanced-reporting`** (Section C: the screen has no child module and inherits the section gate) → that slug, not a `reports` child.
- The `roll-up/*` pair serves `/banner-report`, route-gated on **`trade-spend-roll-up`** (enhanced-reporting child) → that slug.
- The two Dashboard endpoints serve in-page widgets gated with the **`dashboard` children** `banner-count-graph` and `trade-spend-roll-up-report` (`caboodle.web\src\app\(brand)\[brandID]\dashboard\page.tsx:179-192`) → those slugs, not the bare `dashboard` route gate. Note the near-collision: `trade-spend-roll-up-report` (dashboard widget) ≠ `trade-spend-roll-up` (banner-report screen); they are separate catalog rows with separate dependency sets.
- The parent `reports` slug gates only the hub page itself, which calls **no backend endpoint** — no row in §4 carries bare `reports`; it stays a parent for grants/nav only (inventory anomaly list: parents without routes are expected).
- `category-review-report`'s children are served by BrokersController/BrandReportController endpoints — **workbook 01 §4.1–4.2**, not this controller. Cross-reference only.

**Gaps:**
- **`POST forecast-data-export` has no plausible slug and no caller in caboodle.web** (zero references; checked service/hooks/mocks). It exports sandbox-promotion forecast data and takes `BrandID` from the **request body**, unvalidated (`MRA\Report\GetForecastDataRequest.cs:16,38,627`). Proposal (Q1): confirm real callers; if kept, gate `RM(brand: "trade-spend-sandbox", Export)` and derive the brand from the header/active-brand context; if no caller exists, retire it.
- `/product-report` has no child slug of its own (tile commented out of the hub, `report\page.tsx:69-73`) — rides the parent `enhanced-reporting` (Q2).

## 4. Endpoint authorization matrix

Action mapping per template (§4.3). Today **no action in either controller carries any authorization attribute** — the only guards are the global authenticated-user policy, `BrandValidationMiddleware` when a `BrandID` header is present, and `_currentUser.GetBrandID()` scoping inside each handler. All target rows are brand-audience only: the broker catalog has none of these slugs (D1), and no broker screen calls these routes. "—" in Today's guard = no attribute.

**Why no bare `[Authorize]` on the Dashboard rows:** the template requires a justification wherever `[Authorize]` is proposed, and the obvious candidate here was "dashboard endpoints aggregate whatever the user can see, scope in the handler". They don't: both are single-brand reads behind a `[BrandIDHeader]`, each backing one widget that the FE already gates on a specific catalog slug. `[RequireModule]` is therefore both available and strictly tighter, so no `[Authorize]` (and no resolver-driven handler scoping) is used anywhere in this area.

### 4.1 ReportsController — `/api/v1/reports` (11)
File: `caboodle\src\Hosts\API\Controllers\Modules\Report\ReportsController.cs`. All actions except `forecast-data-export` carry `[BrandIDHeader]`.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET products | GetProductsReportRequest | —; brand-scoped `GetBrandID()` (`MRA\Report\GetProductsReportRequest.cs:33-41`); reads `TradeSpend.TradeSpendPromoEvents`, `PromotionType = '1'` only (`MRA\DTOBuilder\ReportDTOBuilder.cs:101-131`) | `RM(brand: "enhanced-reporting", View)` | Serves `/product-report`, which the FE gates on the **section parent** `enhanced-reporting` (no child slug — uses THAT slug per §3). D9, Q2 |
| POST roll-up/sandbox-promotions | GetTradeSpendRollUpReportRequest | —; `GetBrandID()` (`MRA\Report\GetTradeSpendRollUpReportRequest.cs:43,720`); reads `TradeSpendSandbox.*` + `CRM` + `ProductSpecs`, all `@BrandID`-joined (`:836-922`); filter SQL interpolates `PromoName`/ids (`:799-829`) → §6 | `RM(brand: "trade-spend-roll-up", View)` | Serves `/banner-report` → gated on `trade-spend-roll-up` (enhanced-reporting child), not a `reports` child — uses THAT slug. D9 |
| POST roll-up/brand-approved-promotions | GetBrandApprovedPromotionsRollUpReportRequest | —; `GetBrandID()` (`MRA\Report\GetBrandApprovedPromotionsRollUpReportRequest.cs:44,722`); reads `TradeSpend.TradeSpendPromoEvents`/`TradeSpendPromos` (`:881-920`) + `BrandApprovedPromotionFees` (`:1140-1149`); same interpolated filters (`:801-831`) | `RM(brand: "trade-spend-roll-up", View)` | Same screen, approved-promotions variant. D9 |
| GET brand-market-overview | GetMarketOverviewReportForBrandRequst | —; `GetBrandID()` (`MRA\Report\GetMarketOverviewReportForBrandRequst.cs:55`); reads `Broker.MarketOverviews` filtered **only** by `mo."BrandID" = @BrandID` (`:229-231`) — the brand sees every brokerage's rows | `RM(brand: "broker-market-activities", View)` | Brand twin of workbook 01 §4.3 (the four `marketoverviews/*for-brand` rows); brand-wide visibility of brokerage work stays, per D6 + workbook 01 Q3 note — cross-reference, don't re-plan. D1 |
| GET brand-market-overview-export | ExportMarketOverviewsForBrandRequest | —; `GetBrandID()` (`MRA\ImportExport\ExportMarketOverviewsForBrandRequest.cs:55`); same brand-wide MO query (`:89-126`); synchronous CSV stream | `RM(brand: "broker-market-activities", Export)` | Export → Export |
| GET brand-market-overview-filters | GetBrandMarketOverviewFilterRequest | —; `GetBrandID()` (`MRA\Report\GetBrandMarketOverviewFilterRequest.cs:40`); facets from `Broker.MarketOverviews` (`:103-143`). Join conditions on retailer/banner/product repeat `b."Deleted"` instead of their own alias (`:110-120`) — data-quality bug, not access | `RM(brand: "broker-market-activities", View)` | |
| GET retail-report | GetRetailReportsRequest | —; `GetBrandID()` (`MRA\Report\GetRetailReportsRequest.cs:45`); `CRM.BannerSKUs bs."BrandID" = @BrandID` (`:124-127`); `ProductName` interpolated into ILIKE (`:80`) → §6 | `RM(brand: "retail-reports", View)` | Catalog deps already model the reads: retailers Required, product-spec OptionalDataSource |
| GET retail-report/product/{id:Guid} | GetProductsOfRetailReportRequest | —; `GetBrandID()` (`MRA\Report\GetProductsOfRetailReportRequest.cs:58`); `bs."BrandID" = @BrandID` + `ps."BrandID" = @BrandID` (`:85-93`); `Name` interpolated (`:73`) → §6 | `RM(brand: "retail-reports", View)` | Route id = BannerID (banner drill-down) |
| GET retail-report/activities/{id:guid} | GetActivitiessOfRetailReportRequest | —; `GetBrandID()` (`MRA\Report\GetActivitiessOfRetailReportRequest.cs:58`); banner-activity drill-down, brand-scoped | `RM(brand: "retail-reports", View)` | |
| POST sales-tracker | GetSalesTrackerReportRequest | —; `GetBrandID()` (`MRA\Report\GetSalesTrackerReportRequest.cs:33`); `bs."BrandID" = @BrandID` over `CRM.BannerSKUs`/`Banners`/`RetailerRegions` (`:101-104`); filters properly parameterised via `ANY(@…)` (`:31-37`) | `RM(brand: "sales-tracker", View)` | |
| POST forecast-data-export | GetForecastDataRequest | —; **no `[BrandIDHeader]`** (`ReportsController.cs:229-237`), so the middleware never runs; brand comes from the **request body** with no validation (`MRA\Report\GetForecastDataRequest.cs:16,38,627`) — any authenticated user exports any brand's sandbox promotion/forecast data | `RM(brand: "trade-spend-sandbox", Export)` *(Q1)* + brand from active-brand context, body `BrandID` removed or validated equal | Fail-open → §5 do-not-reproduce 1. No FE caller in caboodle.web. D9, Q1 |

### 4.2 DashboardController — `/api/v1/dashboard` (2)
File: `caboodle\src\Hosts\API\Controllers\Modules\Dashboard\DashboardController.cs`. Both actions carry `[BrandIDHeader]`; parameterless requests.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET product-status-summery-report | ProductStatusSummaryReportRequest | —; `GetBrandID()` (`MDA\Requests\ProductStatusSummaryReportRequest.cs:33`); status counts over `CRM.BannerSKUs bs."BrandID" = @BrandID` + `ProductSpecs` (`:71-95`) | `RM(brand: "banner-count-graph", View)` | Backs the "Banner Count for Item Status" widget, in-page gated on `banner-count-graph` (`dashboard\page.tsx:179-186`) — the widget slug, not bare `dashboard`. Catalog dep product-spec Required matches the join |
| GET roll-up-report | GetRollUpReportForDashboardRequest | —; `GetBrandID()` (`MRA\Report\GetRollUpReportForDashboardRequest.cs:35,659`); current-year `TradeSpend.TradeSpendPromoEvents`/`TradeSpendPromos` (`:774-776`) + `BrandApprovedPromotionFees` (`:990`), all `@BrandID` | `RM(brand: "trade-spend-roll-up-report", View)` | Backs the dashboard roll-up widget, gated on `trade-spend-roll-up-report` (`dashboard\page.tsx:187-192`) — the **dashboard child**, distinct from `trade-spend-roll-up` (§3). Handler lives in Modules.Report.Application (inventory note). D9 |

## 5. Parity notes

**What decides access today** (there are no `[MustHavePermission]` rows, no role checks and no access helpers anywhere in Modules.Report / Modules.Dashboard):

- **`BrandValidationMiddleware`** (`BB\Infrastructure\Middleware\BrandValidationMiddleware.cs`) is the only pre-handler check, and only when a `BrandID` header is present: ADMIN bypasses (`:48-49`); brokers/sub-brokers pass if the brand is in their `BrandBrokers` rows (`:85-95`); brand owners via `Brands.UserID` (`:97-104`); brand sub-users via `BrandSubUsers` (`:106-112`); otherwise 403 (`:60-63`). Consequence: **a connected broker can call all twelve header-scoped endpoints today** even though no broker screen exists for them.
- **Handler scoping** is uniformly `_currentUser.GetBrandID()` → the header value parsed by `CurrentUserMiddleware`; with no header it stays `Guid.Empty` (`BB\Infrastructure\Auth\CurrentUser.cs:14,20`), so a headerless call returns **HTTP 200 with an empty DTO**, not an error — the `[BrandIDHeader]` attribute is Swagger metadata, not enforcement.
- **FE module gating is the only module control** for this whole area (inventory Section D, first anomaly): server-side, nothing ties any of these 13 actions to a module today.

**Resolver must-match list** (comparator, plan 2.5): for every brand owner/sub-user, `RM(brand: slug, View/Export)` with the active brand == their organization must allow exactly the calls the middleware allows today (owner via `Brands.UserID` → `brand-admin` membership; sub-user via `BrandSubUsers` → `brand-member` + `BrandAccess(Full)`, arch §10.1). Because today has **zero** server-side module checks and `ALLOW_ALL_WHEN_NO_MODULES = true`, every module-missing 403 after the flip is new behavior by design — the comparator must treat those as expected post-flip (plan 4.4 sequencing: backfill module assignments first).

**Do-not-reproduce list:**

1. `POST /reports/forecast-data-export` trusts a body-supplied `BrandID` with no header, middleware, or handler validation (`GetForecastDataRequest.cs:16,38,627`) — any authenticated user exports any brand's sandbox data; fail-open, replaced by the Q1 guard + context-derived brand.
2. Headerless calls to the other twelve actions return empty 200s (`Guid.Empty` scoping) instead of a denial — target returns 403 when no active brand resolves (brand workspace defaults `BrandID` to the organization id, arch §6.1, so legitimate web callers are unaffected).
3. Connected brokers (and ADMIN via bypass) pass the middleware on all header-scoped rows today; the brand-audience-only `[RequireModule]` narrows this to brand-workspace users plus platform support. Intentional (D1: the broker catalog has none of these slugs) — comparator whitelists the narrowing (Q3).
4. `BrandValidationMiddleware` invalid-GUID header writes a 400 body with HTTP 200 (`:66-72`) — shared bug, already do-not-reproduce item 11 in workbook 01; reproduce the 400.

(Not an authorization item, but flagged for the Phase 0 security backlog: `PromoName`/`ProductName`/`Name` are string-interpolated into ILIKE conditions — SQL injection — in `GetTradeSpendRollUpReportRequest.cs:815-821`, `GetBrandApprovedPromotionsRollUpReportRequest.cs:817-823`, `GetRetailReportsRequest.cs:80`, `GetProductsOfRetailReportRequest.cs:73`; GUID arrays are interpolated too, `GetTradeSpendRollUpReportRequest.cs:799-829`. Same class as the plan §6 UserService finding.)

## 6. Code changes beyond attributes

- **Queries to re-scope: none.** Every query is already `BrandID`-parameterised, and the one brokerage-owned source (`Broker.MarketOverviews`) deliberately stays brand-wide on these brand twins — workbook 01 §6 owns that table's D6 column and explicitly leaves the for-brand reads brand-wide.
- **`GetForecastDataRequest`**: add `[BrandIDHeader]` to the action (`ReportsController.cs:229`), drop `BrandID` from the request payload (`GetForecastDataRequest.cs:16`) or validate it equals the active brand, and switch `:38` and `:627` to the resolved active brand. Do this in the same PR that adds the Q1 guard.
- **Helpers/files to delete: none** — this area has no access helpers. But the middleware retirement (plan 4.4) removes the *only* guard on all twelve header-scoped rows, so the `[RequireModule]` attributes here must land **in the same deploy** that retires `BrandValidationMiddleware` (same constraint as workbook 01's attribute-free for-brand rows).
- **`Demand()` call sites: none** — no upserts; the whole area maps 1:1 to `View`/`Export`.
- **BrandID-header edge cases**: all handlers read `_currentUser.GetBrandID()`; after cut-over the value must come from the resolver's active brand (brand workspace: missing header defaults to the organization id, arch §6.1), which preserves the web app's existing header behavior (plan §5-6). Dashboard rows must keep returning **403, never 401**, when a widget module is missing so the FE hides the card instead of signing the user out (plan §5-2; same pattern as workbook 01's broker dashboard cards).
- **While touching these files**, parameterise the interpolated ILIKE/id filters listed in §5 (security backlog; no behavior change for legitimate input).
- **Transactions: none** — read-only area.

## 7. FE impact (Phase 5)

Web (caboodle.web, develop @ 956295e4). Gating today per `_inventory.md` Section C plus in-page `ModuleGate`s (`src\components\shared-components\ModuleGate.tsx` — hides children unless `hasModule(slug)`, renders fallback while `/me` resolves):

- **Report hub** `/{brandId}/report` → route + nav gate `reports`; the page calls no API and renders one `ModuleGate` tile per report (`src\app\(brand)\[brandID]\(report)\report\page.tsx`): `broker-market-activities` (:20), `category-review` (:27), `retail-reports` (:34), `sales-tracker` (:41); Enhanced Reporting section `trade-spend-roll-up` (:62) and `monthly-report` (:74); Data Upload Reporting `spins`/`kehe`/`unfi`/`distributor-sales-report` (:90-149). The Promoted Case Sales Analysis tile is commented out (:69-73).
- **Endpoint → caller → gate map** (the §4 slug of each row is exactly the gate below):
  - `reports/products` → `ProductReportComponent` via `useProductReport` (`src\hooks\reports.ts:82-98`, `src\service\report.service.ts:82-95`) → `/product-report` → `enhanced-reporting`.
  - `reports/roll-up/*` → `BannerReportComponent` via `useBannerReport` (`src\hooks\reports.ts:38-63`, `report.service.ts:56-63` — one service method switches sandbox vs approved) → `/banner-report` → `trade-spend-roll-up`.
  - `reports/brand-market-overview` + `-filters` → `MarketOverviewReport` / `MarketOverviwesReportFilter` in brand mode (`src\hooks\reports.ts:107-169`); `-export` → `market-overview.service.ts:356` → `/brand-market-overview-report` → `broker-market-activities`.
  - `reports/retail-report*` → `RetailReportTable` (`src\components\retail-report\RetailReportTable.tsx:13`) → `/retail-report` → `retail-reports`. The same screen calls `GET /brands/apl-total-count` (`report.service.ts:338-340`) — BrandsController, another workbook's row.
  - `reports/sales-tracker` → `SalesTackerByRegion` (`src\app\(brand)\[brandID]\dashboard\SalesTackerByRegion.tsx:14`), mounted by the `/sales-tracker` page which reuses the dashboard `SalesTracker` component (`(report)\sales-tracker\page.tsx:3-10`) → `sales-tracker`. The dashboard's own `<SalesTracker />` mount is commented out (`dashboard\page.tsx:194`).
  - `dashboard/product-status-summery-report` → `CategoryProductStatusReport` under `ModuleGate banner-count-graph` (`dashboard\page.tsx:179-186`); `dashboard/roll-up-report` → `RollUpReport` under `trade-spend-roll-up-report` (`:187-192`); the dashboard route itself gates on `dashboard`.
  - `reports/forecast-data-export` → **no caller in caboodle.web** (Q1).
- When `/me/access` lands (plan 4.5/Phase 5): the hub and widget slugs are unchanged; widgets and report screens must tolerate per-endpoint 403s (hide the tile/card, never sign out — 403-not-401 contract); and the module-assignment backfill must precede flipping `ALLOW_ALL_WHEN_NO_MODULES`, or brands with empty module lists lose the entire hub at enforcement rather than at the flip.

## 8. Test checklist

- **Comparator (plan 2.5) personas** per endpoint: brand owner, brand sub-user, ADMIN, connected broker (passes today with a header — expected post-flip 403, whitelisted per §5-3), a second brand's user (403 today via middleware, 403 after), and headerless calls (empty 200 today → 403/brand-default after, whitelisted per §5-2). `forecast-data-export` additionally: arbitrary body `BrandID` succeeds today for any authenticated user — expect the §5-1 whitelist entry and the new denial.
- **Matrix tests** per §4 row: allowed with the module granted on the active brand; 403 when the module is missing, when a Custom grant lacks the action (`Export` missing → `brand-market-overview-export` and `forecast-data-export` deny while the View rows still pass), and when the brand organization is suspended. Child-slug rows (`banner-count-graph`, `trade-spend-roll-up-report`, `trade-spend-roll-up`, `sales-tracker`, `retail-reports`, `broker-market-activities`) also deny when the **parent** module is absent from a Custom grant (resolver `Custom(...)` parent rule, arch §6.2).
- **Slug-divergence cases**: granting only the `reports` parent enables **no** endpoint in this area; granting `trade-spend-roll-up-report` enables the dashboard roll-up but not `/banner-report`'s `roll-up/*` pair, and vice versa for `trade-spend-roll-up`.
- **Dashboard contract**: widget endpoints return 403 (never 401) when their module is missing; the FE hides the card and the rest of the dashboard renders.
- **Brand-twin visibility**: the `brand-market-overview` trio still returns rows created by *every* brokerage connected to the brand after workbook 01's `BrokerageOrganizationID` filters land on the broker-side queries (the brand twins are exempt from D6 filtering — assert no regression when 01 ships).
- **Reflection test (plan 4.3)**: all 13 actions carry exactly one of the four guard types; baseline shrinks by 13.
- **Contract tests**: `GET /brands/me` untouched by this area; the roll-up/products/monthly screens' `canAccessTradespend` FE behavior unchanged until D9 is decided.

## 9. Open questions

1. **Q1 — `POST /reports/forecast-data-export` has no catalog slug, no caboodle.web caller, and a fail-open body `BrandID`.** Recommendation: ask Platform Admin/product who consumes it (admin app? ad-hoc ops?). If kept: gate `RM(brand: "trade-spend-sandbox", Export)` (it exports exactly the sandbox-promotion dataset), take the brand from the active-brand context, and delete the body field. If no caller: retire the endpoint in Phase 4.2 instead of guarding it.
2. **Q2 — `/product-report` ("Promoted Case Sales Analysis") has no child module**; `GET /reports/products` rides the section parent `enhanced-reporting`, which makes the products report available to anyone holding *any* enhanced-reporting grant that includes the parent. Recommendation: keep the parent gate (exact parity with the FE's route map) and only mint a dedicated child slug if product revives the hub tile; revisit alongside N11 if finer action flags arrive.
3. **Q3 — Should connected brokerage users keep their incidental access to brand report endpoints?** Today the middleware admits any broker with a `BrandBrokers` row for the header brand, though no broker screen calls these routes. Recommendation: no — brand-audience-only guards (the D1 broker catalog has no `reports`/`enhanced-reporting`/`dashboard` slugs); whitelist the narrowing in the comparator. If product ever wants broker-facing brand reports, that's a new Broker-audience catalog entry, not a dual-audience attribute here.
