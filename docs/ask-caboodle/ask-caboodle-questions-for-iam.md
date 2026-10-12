# Ask Caboodle × IAM — questions for the IAM owner

Ask Caboodle (the AI assistant) is being built in the **Intelligence module** on branch `feature/ask-caboodle`, which sits on top of your `feature/CS-1770-iam-service-product-spec` (`cba9c60d`).

**How it uses IAM:** Ask Caboodle takes **all** access from IAM (`IAccessContext`) — connected brands, granted modules, organization type. It has **no brokerage-specific exceptions** and changes nothing outside the Intelligence module. So if something is missing in IAM, fixing it in IAM fixes Ask Caboodle automatically. The questions below are about what Ask Caboodle can rely on.

---

## 1. Brokers seeing a connected brand's distributor sales

**Rule (from Bijoy):** when a Brand organization is connected to a Brokerage organization, the brokerage's members see the brand's data according to the access granted to them — as in the Onboarding-Journey prototype. That includes distributor sales.

**What the code does today:**
- Every action in `DistributorSalesReportsController` is `[RequireModule(ModuleSlugs.DistributorSalesReport, null, …)]` — no broker slug, so brokerages are refused.
- `BrokerRoots` in `ModuleCatalogSeedData.cs` has no distributor-sales module (nor KeHE / UNFI / SPINS).

**Questions:**
- Is adding Broker-audience modules for distributor sales (and KeHE / UNFI / SPINS, if brokers should see those) plus the broker slug on those endpoints already planned?
- Which slugs will the broker modules use (same slugs as the Brand audience, like `product-spec` today)?
- Rough timing?

## 2. Brands viewing brokerage-owned records

**Rule (from Bijoy):** brands **view** brokerage records about their own brand (Category Review, Category Review Calendar, Market Overview, Brand Report…) but can't modify them; brokerages see only their own.

**What the code does today:** the Category Review endpoints are still on the legacy check (≈ 20 `BrokersController` category-review actions are in `bare-endpoints-baseline.txt`). `DemandOwnBrokerageRecordAsync` covers a brokerage owning its record, but there is no rule yet for a brand viewing records about itself.

**Questions:**
- How will IAM express "brand can view brokerage records about its brand"? A new access helper (e.g. `CanViewBrokerageRecord(record)`), a `RequireModule` variant, or handler logic?
- Which brand-side module slug gates it (e.g. `category-review` in the Brand audience)?

Ask Caboodle will mirror exactly that rule in its read-only data access (row-level security on the brokerage-owned tables), so screens and Ask Caboodle always agree.

## 3. Ask Caboodle entries in the module catalog

Ask Caboodle needs these entries in `ModuleCatalogSeedData.cs` before customer release:

- **Brand audience** (node `ask-caboodle` exists): add `OptionalDataSource` deps on `distributor-sales-report`, `spins`, `kehe`, `unfi`, `monthly-report` (today only product-spec, distributors, retailers, regions, approved-promotions, trade-spend-sandbox, contacts, pipelines are listed).
- **Broker audience:** add an `ask-caboodle` node to `BrokerRoots` with `OptionalDataSource` deps on the broker data-source modules you define (today: product-spec, retailers, regions, distributors, approved-promotions, trade-spend-sandbox, market-overview, category-review, distributor-apl — plus whatever comes from question 1).

**Questions:**
- Do you want to add these yourself, or are you fine with us adding only the Ask Caboodle lines in that file?
- Same slug `ask-caboodle` for both audiences — any objection?

## 4. `IAccessContext` contract Ask Caboodle depends on

We plan to use: `GetCurrentAsync()`, `OrganizationId`, `OrganizationType`, `ActiveBrandId`, `Brands[brandId].Modules` (slug → actions), `BrandsWith(slug, action)`, `IsPlatformAdmin`, and `[RequireModule(ModuleSlugs.AskCaboodle, ModuleSlugs.AskCaboodle, ModuleActions.View, CrossBrand = true)]` on Ask Caboodle's endpoints.

**Questions:**
- Are these stable, or are changes planned?
- For a brokerage member, does `Brands` contain exactly the connected brands, each with only the modules granted to that person?
- For a platform admin, `Brands` looks empty and `CanUseBrand` returns true for everything — should Ask Caboodle treat platform admins as "all brands", or is there a helper for that?
- Does `CrossBrand = true` behave the same for Brand organizations (single brand) and Brokerages (many brands) on the same action?

## 5. Read-only database role for Ask Caboodle

Ask Caboodle will add (in its own migrations, local DB first):
- a role `askcaboodle_ro` with `SELECT` only on the tables Ask Caboodle reads;
- row-level security policies written **`TO askcaboodle_ro` only**, so the app's normal queries are not affected;
- the `pg_trgm` extension and trigram indexes on name columns (retailers, banners, stores, products…).

**Questions:**
- Any concern with RLS policies on shared tables as long as they apply only to that role?
- Do you know whether the app DB user has `CREATEROLE` on staging/production (otherwise devops creates the role at deploy time)?

## 6. Branch and migration coordination

- Ask Caboodle's migration `20261011092008_RemoveLegacyIntelligenceTables` comes after your `20261010090710_AddBrandReportModule`. It drops the old Intelligence tables (`ChatSessions`, `ChatMessages`, `QueryAuditLogs`, `LlmModelPricings`, `CatalogSnapshots`, `MasterEntities`).
- More Ask Caboodle migrations will follow (sessions/audit tables, read-only role, RLS).

**Questions:**
- Will you keep pushing to `feature/CS-1770-iam-service-product-spec`, or move to another branch? We'll merge from it regularly.
- Which modules are still unmigrated, and when is IAM expected in `develop`?
- Please tell us before adding migrations, so we regenerate the model snapshot cleanly instead of hand-merging it.
- `dotnet sln add/remove` rewrites the Organization solution-folder GUID; your branch uses `{B7C5A362-B312-A468-DA48-161BFD5CEC08}` — we keep that one. OK?

## 7. FYI — removed endpoints

The old `IntelligenceChatController` (`/api/v1/intelligencechat/*`) and its line in `bare-endpoints-baseline.txt` are gone. The new endpoint is `POST /api/v1/askcaboodle/ask` (admin-only for now). The web FE's `ask-caboodle` page will be rebuilt against it.

---

## Review of the answers — 2026-10-12

Branch `feature/CS-1770-iam-service-broker-workspace` @ `3ebc295e` (9 commits on top of `cba9c60d`, no migrations), merged into `feature/ask-caboodle` as `b30b387c`. Merged solution: build 0 errors, 6,051 tests green, Ask Caboodle DB tests and the promotion reconciliation green, no pending model changes.

| # | Question | Status | What the code does |
|---|---|---|---|
| 1 | Brokers seeing a connected brand's distributor sales | **Answered (differently than asked)** | No separate broker modules. On a connected brand a brokerage now holds its own broker modules **plus every module the brand has switched on** (`AccessContextBuilder`, BROKER-BRAND-ACCESS-D1/D5), and a brand-only rule such as `[RequireModule(DistributorSalesReport, null, …)]` admits a brokerage member who was granted that module for the brand. So brokers see distributor sales, KeHE, UNFI and SPINS of connected brands exactly as granted — the owner's rule, with no broker-specific slugs. |
| 2 | Brands viewing brokerage-owned records | **Answered** | Handler-level scopes: `CategoryReviewArea` (a brand page shows the brand's own reviews plus the catalog reviews of the brokerages it may see, read-only; a brokerage sees only its own), `BrandReportScope` (a brand sees every brokerage's reports about it; a brokerage only its own), `AccessContext.ViewerBrokerageId` for Market Overview (null for brands = all brokerages' rows about the brand). Category Review endpoints are migrated: `bare-endpoints-baseline.txt` went from 105 to 4 lines (only the retailer promo-rule endpoints remain). |
| 3 | Ask Caboodle catalog entries | **Partly** | Broker audience: `ask-caboodle` node added to `BrokerRoots` ✓. **Not done:** Brand-audience `OptionalDataSource` deps on `distributor-sales-report`, `spins`, `kehe`, `unfi`, `monthly-report`, and any `OptionalDataSource` deps for the broker `ask-caboodle` node. Ask Caboodle can add these lines itself at G1 (only Ask Caboodle entries). |
| 4 | `IAccessContext` contract | **Answered (stable)** | All members Ask Caboodle uses still exist. New and useful: `BrandsInScope(slug, action)` (selected brand, else every brand with the module), `ViewerBrokerageId`, `OwnsBrokerageRecord`, `DemandAnyModuleAsync` / `DemandCatalogModuleAsync`. `CrossBrand` checks the selected brand when one is sent, for both organization types. **Still open:** no "all brands" helper for platform admins (`Brands` stays empty, `CanUseBrand` true) — Ask Caboodle will treat a platform admin as unrestricted at G3. |
| 5 | Read-only role / RLS | **Not answered in code** (infrastructure question) | No objection visible; `CREATEROLE` on staging/production still to confirm with devops before deploying (D5). |
| 6 | Branch and migrations | **Answered** | Work moved to `feature/CS-1770-iam-service-broker-workspace`; no migrations added (snapshot untouched); Organization solution-folder GUID unchanged. Remaining: the 4 retailer promo-rule endpoints; date for `develop` not stated. |
| 7 | Removed endpoints | **Conflict, resolved** | The branch still migrated the legacy `IntelligenceChatController` and chat handlers to the access engine and added tests for them. Ask Caboodle removed that code in 1a, so the merge keeps it removed (his legacy tests dropped, his duplicate `Intelligence.Application.Test` solution entry dropped). |

**Bonus that helps Ask Caboodle:** `TradeSpendDTOBuilder.GetTradeSpendPromoDTO` and `PromotionDTOBuilder.GetPromotionDTO` now take the brand id directly ("promotion re-pricing on the engine brand"). Ask Caboodle's promotion tool now passes the brand id and its `BrandScopedCurrentUser` adapter is gone; reconciliation with the screens still exact.
