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
