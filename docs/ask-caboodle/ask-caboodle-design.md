# Ask Caboodle — Design (Phase 1: Retrieve)

Status: draft v2 for review · 2026-10-10 (v1: 2026-10-06)
Replaces: the Intelligence module (retired incrementally; its endpoints stay alive only until the web FE repoints).
Grounding: BE branch `feature/ask-caboodle-phase1 @ f70d59a5` (= `feature/CS-1770-iam-service-foundation` + latest `develop`; builds clean); design sessions "AskCaboodle feature design" and the 2026-10-10 feasibility review (providers, entity resolution, catalog format, web search, analysis, forecasting); IAM v2 architecture (`../caboodle-access-architecture.md`) and implementation plan (`../caboodle-be-iam-implementation-plan.md`); Existing Modules Resolution series (`../modules-resolution/`).

**What changed in v2:** model IDs updated to the current generation (§3) · runs on the Claude API alone — embeddings dropped from the launch path (§7.2, §7.4) · entity resolution rewritten: live registry + read-only DataHub aliases + an Ask-owned alias table (§4.1) · catalog format decided with measured numbers: structured document served by a tool, not RAG (§5) · public web research added with code-enforced disclosure (§9.5) · GA authorization grounded in the IAM code that now exists, including data-source module gating (§8.4) · Postgres versions verified (production 15.17, staging 14.5) and the upgrade deferred (§8.6, §12) · a real catalog slice in `catalog-sample/` (§5) · release flow and migration strategy for the long-lived branch (§12) · later tracks written down: Analyze (Python) and forecasting / promotion insight (§13).

---

## 1. What this is, and why it sells

A Claude-Code-style **agentic answer engine over Caboodle's own database**: the user asks a question in plain language; a single model with a small set of tools investigates — looks up schema, resolves entity names, runs read-only SQL, calls business-calculation services — retries on its own errors, and answers with the number, the context, and the source. Streaming, with follow-up suggestions, a prompt gallery, and the ability to **pin any answer as a live report** on the dashboard. When a user asks about the market rather than their own data, it can research the **public web**, clearly labelled as such (§9.5).

The market has "ask our data" chats (UNFI ships one). The differentiators here are:

1. **Trustworthy numbers** — every figure reconciles with what the app's own screens show (§6), every answer names its period/scope/source, and a permanent eval flywheel (§10) turns each mistake into a regression test.
2. **Answers that become living reports** — a pinned answer is not a screenshot; it re-executes against the current database on every view, rendered by the same components as regular reports (§9.1). Chat is the entry point; the report system is where the value compounds.
3. **Native to Caboodle's access model** — organization entitlements, brand scoping and module permissions apply to the agent exactly as they apply to screens (§8.4).
4. **Honest about its sources** — Caboodle data, public web data and (later) exploratory analysis are labelled differently by code, never mixed silently (§9.5, §13.1).

## 2. Scope

| Phase | Contents |
|---|---|
| **1a — Spike** | Loop + SQL gateway + catalog for 2 schemas (TradeSpend, Brand) in a console/xUnit harness against the local prod restore. Goals: watch self-correction on 10 golden questions; first measured cost numbers; verify the Anthropic C# SDK on net6.0 (§3); measure `search_entity` latency on the real store list (§4.1). |
| **1b — Engine (admin-only)** | Module projects, `askcaboodle_ro` role migration, `pg_trgm` + trigram indexes, entity registry, audit tables, `AskCaboodleController` behind `[MustHavePermission]`, full catalog + drift test, golden eval set, unit tests to the repo's bar (90 % coverage). |
| **1c — Experience layer** | SSE streaming, suggested queries, prompt gallery, pinned live reports, verified-example retrieval (§7.2), thumbs feedback, cost/quality dashboard, **public web research with enforced disclosure (§9.5)**, learned entity aliases (§4.1). Still admin-only. |
| **GA — Customer release** | **Brand and Broker versions** (§8.4.1). On IAM v2 rails (foundation in CS-1770): `[RequireModule(ModuleSlugs.AskCaboodle, …)]`, data-source module gating and Postgres RLS brand allowlist (§8.4). Staging aligned to production's Postgres major version first (§8.6). |
| **Phase 2+** | **Analyze** — Python analysis via code execution, gated on measured demand (§13.1). **Forecasting & promotion insight** track (§13.2). Write actions (create/update promotions etc.) with confirm-before-execute UX and IAM write permissions; scheduled/emailed pinned reports; org-shared pins. Out of scope here. |

Phase 1 is **retrieve-only**: the engine can never write business data, by database role, not by convention.

## 3. Architecture: one model, one loop, few tools

```
request ─ auth gates (JWT → permission policy → validation; zero LLM cost on rejection)
   │
   ▼
messages = [ …trimmed history…, user(question + today's date) ]
loop (≤ MaxSteps, ≤ WallClock):
    response = Claude(system+tools+table-index  ◄── byte-stable cached prefix,
                      messages)
    stop_reason == tool_use ?  run tools (parallel when independent)
                               → append tool_results (incl. raw errors)
                             :  final answer → stream out, persist, done
```

- The **error is the teacher**: a Postgres error or empty result goes back verbatim as a `tool_result` and the model corrects itself on the next iteration. This single property is why the old Intelligence pipeline (6 fixed LLM steps, one shot, "please rephrase" on failure) is retired rather than extended.
- **Parallel tool calls**: the API returns multiple tool calls per turn; independent ones (two entity lookups + a table-info fetch) execute concurrently for latency.
- **Caps**: MaxSteps ≈ 8, wall clock ≈ 90 s, result truncation 50 rows / few KB per tool, `max_tokens` 3–4 K per call, per-user daily question cap.
- **Model**: **Claude Sonnet 5.5 (`claude-sonnet-5-5`, $2 / $10 per MTok, cache reads $0.20)** at low/medium effort as default. Quality rule: **escalate upward** (higher effort, then Claude Opus 5.5 `claude-opus-5-5`) when the step cap is hit — never silently downgrade. Claude Haiku 5.5 (`claude-haiku-5-5`, $0.10 / $0.50) may take the default *only after* the eval set proves it holds quality (§10). Thinking is controlled by effort, not by disabling it (current models reject `thinking: disabled` / token budgets); forced `tool_choice` is not supported on these models — use `auto` with strict tool schemas.
- **Provider**: the whole of Phase 1 runs on the **Claude API alone** (§7.4). Retiring Intelligence also retires its OpenAI and Gemini wiring.
- **Client**: the official `Anthropic` NuGet package (v12.x) targets `netstandard2.0`, `net8.0`, `net9.0` — it installs on our `net6.0`, but pulls `System.Text.Json` 10.x and `Microsoft.Extensions.AI.Abstractions` 10.x into the host; the spike verifies no binding conflicts with the ASP.NET Core 6 shared framework. Fallback: a typed `HttpClient` wrapper (the existing `ClaudeApiHelper` shape). Either way behind `ILlmClient` so the loop is unit-testable with scripted responses.

## 4. The tools

| Tool | Contract | Backed by | Failure mode |
|---|---|---|---|
| `get_table_info(tables[])` | full columns, types, join paths, enum int→name maps, business notes | curated catalog (§5), served from repo-checked files | unknown table → the index is re-shown |
| `run_sql(sql, reason)` | rows (truncated) **or the raw Postgres error** | read-only gateway (§8.2) on `askcaboodle_ro` | *the failure mode is the design* — errors feed self-correction |
| `search_entity(name, types?)` | ranked typed candidates with ids, context and match source | **entity registry over live source tables + approved aliases** (§4.1) | zero matches → retry fuzzier; many → disambiguation policy |
| `get_promotion_performance(promoIds[], brandId?, detail)` | the same promo/non-promo cases & revenue the app shows | the exact `TradeSpendDTOBuilder` path the Monthly Report / roll-up / dashboard use | wrong grain → model falls back to Tier-1 rollup (§6) |
| `web_search`, `web_fetch` *(1c)* | public web results with citations | Anthropic server tools (`web_search_20260209`, `web_fetch_20260209`) — nothing to host | errors come back as result blocks, not exceptions; answer says what couldn't be found (§9.5) |

More Tier-3 tools are added as derived-metric scenarios surface (§6), and later tracks add `get_promotion_history` / `get_sales_forecast` (§13.2). Adding tools is cheap by design; the loop doesn't change.

### 4.1 Entity resolution — live registry, read-only aliases, Ask-owned learned aliases

**Decision: resolve against the live source tables through a config-driven registry. Do not populate `Intelligence.MasterEntities`, and do not populate `DataHub.UnifiedEntity` as an Ask Caboodle master list.**

Why not a synchronized master table:

- **`MasterEntities`** has three columns (`Name`, `ActualEntityID`, `Type`): no brand scope (names leak across tenants), no parent context, no aliases, refreshed only by a manual wipe-and-rebuild endpoint. Making it "proper" is a rebuild.
- **`UnifiedEntity` / `UnifiedEntityAlias`** belong to the DataHub import pipeline. `UnifiedEntity` links back to a CRM row only for retailers (`CrmRetailerId`) — a banner, DC or product entry carries no id the agent could use in SQL. Approving an alias immediately re-maps unmapped distributor rows (`AddUnifiedEntityAliasCommand` → `ApplyNewAliasToUnmappedRecordsAsync`), so writes from Ask Caboodle there would change how KeHE/UNFI files are mapped. And it is sparsely populated today.
- Either way, a copy of CRM needs a sync job, and the sync job is where drift comes from (the reason `MasterEntities` is incomplete).

**The registry.** `search_entity` is C# code: per requested type it runs fixed, parameterized queries against the source table, in parallel, as `askcaboodle_ro`, and returns ~10 ranked candidates. One registry entry per type:

| Type | Source | Match columns (verified on the branch) | Context returned | Scope rule |
|---|---|---|---|---|
| Retailer | `CRM.Retailers` | `CorporateName` | banner count | Shared |
| Banner | `CRM.Banners` | `BannerName` | parent retailer, door count | Shared |
| Region | `CRM.Regions` | `RegionName` | retailer | Shared |
| Distributor | `CRM.Distributors` (leaf + `ParentID`) | `DistributorName` | parent chain | Shared |
| Distribution center | `CRM.DistributionCenters` | `Warehouse` | distributor | Shared |
| Store | `DataHub.StoreListEntries` | `StoreName`, `DistributorCustomerNumber` | retailer, banner, address | Shared |
| Product / SKU | `ProductSpecs.ProductSpecifications` | `Name`, `UPCNumber`, `KeHECode`, `UNFICode`, `BrandCode` | brand, category | Brand |
| Category | `ProductSpecs.Categories` | `Name` | parent | Brand |
| Promotion | Sandbox `Promotions` / `PromotionalEvents`, TradeSpend promos | `Name` / `EventName` | brand, date range, version | Brand |
| Brand, Brokerage | `Organization.Organizations` (type 5 / 10) | `Name` | type, connections | Organization |

- **Matching**: `ILIKE '%…%'` for substrings; **`pg_trgm` + `similarity()`** with GIN trigram indexes on each registry name column for misspellings ("wallmart", "keyhe"); exact match on UPC / store number. Fuzzy matching is a scored database feature, not an LLM guess.
- **Context disambiguates**: every candidate carries its parent (a banner knows its retailer; a product knows its brand). Claude picks among candidates using that context and the question's phrasing.
- **Ambiguity policy** (system prompt): one strong match → proceed; several → pick the contextually obvious one *and say so in the answer*, or ask a clarifying question; zero → retry fuzzier, then say what was searched.
- **Scope rule per entry**: *Shared* = industry reference data, no filter; *Brand* = filter to the caller's brand allowlist; *Organization* = organizations connected to the caller. Written into the registry from day one; Phase 1 (admin-only) ignores it, GA switches it on (§8.4). All queries respect soft delete.
- **Maintenance**: no data to maintain. Code upkeep is ~10 registry entries plus a trigram-index migration per name column; a new entity type = one entry + one index in a normal PR. The drift test (§5) catches renamed columns.
- **Scale**: per-type candidate caps and the model's `types` hint keep queries narrow. Measure on the real store list in the spike; if a type ever outgrows live querying, give *that type* a materialized view behind the same tool.

**Aliases, two sources:**

1. **DataHub aliases (read-only).** `UnifiedEntityAlias` rows with `Status = Approved` are a second match source — they hold real-world spellings from distributor files ("WHOLE FOODS MKT", "SFM") that users also type. Used only where the alias resolves to a real row — today retailers (`UnifiedEntities.CrmRetailerId`) and stores (`StoreListEntries.UnifiedStoreEntityId`); extend as DataHub adds links. Never written by Ask Caboodle.
2. **Ask-learned aliases** — new table `AskCaboodle.EntityAliases { OrganizationID? (null = global, admin-curated), EntityType, EntityID, Alias, Status, CreatedBy }`. Filled when a disambiguation is confirmed ("did you mean Whole Foods Market?" → user picks → "remember *WFM* for your organization?") and by admin curation. Visible only within its organization. If an alias would help imports too, an admin promotes it into `UnifiedEntityAlias` through the existing DataHub review UI — one-way, reviewed.

Every candidate reports its **match source** (`name` / `trigram` / `alias: 'WFM'`), and the answer names any non-exact match it relied on.

**Why no vector RAG here**: embeddings are weak at proper nouns, codes and misspellings, and place sibling entities close together ("Kroger" and "Fred Meyer" are both Kroger banners) — exactly the confusion to avoid. Database text search + context + Claude's choice among candidates *is* the retrieval-augmented design, with lexical retrieval. Future path, behind the unchanged tool contract: Postgres full-text search over product descriptions/categories for descriptive product questions ("our oat-milk barista one"); vectors only if evals show that still fails.

## 5. Knowledge: the catalog is the product

**Decision: a structured, version-controlled document served through a tool — not a vector RAG, and not the whole catalog in every prompt.**

Measured on the branch (`MainDbContextModelSnapshot.cs`): **106 tables, ~2,000 columns, only 9 declared foreign keys.** The raw EF snapshot alone is ~271 KB (~70 K tokens); a curated catalog with meanings, enum maps, join paths and rules lands around 100–150 K tokens. Most relationships exist only in code, ID naming conventions and text joins — they must be written down.

| Option | Cost per question (~5 calls, Sonnet 5.5) | Quality |
|---|---|---|
| Whole catalog in every prompt | ~$0.15 cached; up to ~$1.90 on cache misses (frequent at low traffic — the default cache lives 5 min) | worse: ~100 irrelevant tables in context |
| Vector RAG over catalog chunks | low | **fails silently** — a missed join table or negative rule is invisible to the model |
| **Index in the cached prompt + `get_table_info` (chosen)** | ~$0.01 | the model sees every table name, picks what it needs, fetches more when SQL fails — nothing hidden |

**A real slice of the catalog — format, depth, the rendered index, the tool output and an end-to-end trace — is in [`catalog-sample/`](catalog-sample/README.md).**

**Format.** One file per table in the repo (e.g. `catalog/TradeSpend/PromotionalEvents.yaml`), reviewed in PRs like code: purpose, owning module slug (for gating, §8.4), column meanings, enum int→name maps, join paths, business notes, **negative rules** ("promo/non-promo revenue are modeled figures — never compute from these tables; call `get_promotion_performance`"). A build step emits (a) the one-line-per-table index for the cached prompt and (b) the per-table detail the tool returns; the same files can generate human-readable docs — one source of truth.

**Relationships** live twice: on each table entry ("`BannerID` → `CRM.Banners.ID`") and in a **join-paths section** for multi-hop routes (promotion event → banner → distributor → `DistributorSalesRecords`), with text-based joins flagged explicitly (the monthly report matches banners and products by name text).

**Build it in five layers** (cheapest first): **(1)** generate skeletons from the EF model snapshot + enum reflection (partial unique indexes and defaults are business rules in disguise); **(2)** mine the code — Specifications define business vocabulary ("active promotion"), validators hold invariants, existing Dapper SQL and EF configurations hold canonical join paths, `*ID` naming suggests the rest, Intelligence's `Planner/*.txt` schema files are a seed corpus to audit-and-import, `docs/` holds user-facing vocabulary; run one mining agent per module with file:line citations; **(3)** profile the prod-restore database — distinct values, date coverage, row counts, null rates, and **orphan rates for every mined relationship** (what share of child ids resolve to a parent), so the catalog states only joins that hold; **(4)** human pass on priority schemas only (TradeSpend, Brand, Broker, CRM, DataUpload); **(5)** the feedback flywheel — every wrong answer becomes one catalog sentence + one eval question.

A **drift test** diffs catalog names against `MainDbContextModelSnapshot.cs` and fails CI when a migration changes schema without a catalog update.

The *cached system prompt* carries only the global rules + the table index. Global rules include: always `"Deleted" = FALSE`; quote PascalCase identifiers; **the business glossary** (cases, doors, lift, TPR, EDLP, APL, POD, velocity, voids, promo vs non-promo…); **date semantics** — how "Q2", "last quarter", "YTD" resolve, fiscal vs calendar convention (open question Q2); money units; **data semantics** — `DistributorSalesRecords` are monthly distributor *shipments* (store × DC × UPC × month), not consumer scan sales, and carry no promo flag. Today's date goes in the **user** message (in the system prompt it would bust the cache daily).

Revisit the format only if the index itself outgrows the prompt (several times today's schema).

## 6. Derived metrics: the reconciliation rule

> **Any figure a user can also see in the app must be the same figure.** A business formula is defined once, in a reviewed place — never re-derived by the model per question.

Three tiers; the catalog says which tier each metric lives in:

1. **Persisted rollup exists at the right grain → route to it.** Monthly promo/non-promo revenue & cases (planned and actual) → the Monthly Report table. Catalog carries a *metrics section*, not just tables.
2. **SQL-expressible at a different grain → canonical view** in an `ask` schema (created by migration, SELECT granted to the RO role), plus a **reconciliation test** in CI: aggregate the view to the rollup's grain and assert equality against the stored numbers on the prod restore. (Views are created `WITH (security_invoker = true)` so RLS applies to the caller — see §8.6.)
3. **Model-shaped logic → wrap the C# in a tool.** The promotion metric is confirmed Tier 3: `TradeSpendDTOBuilder` encodes SKU-lifecycle clamping, month-boundary event splitting, overlap merging, EDLP branching, lift projection, fee allocation — a SQL re-implementation would be a second, divergent copy of the company's most important logic. `get_promotion_performance` calls the same code the screens use; reconciliation holds by construction. Tool rules: takes a **list** of ids (no N+1 at the tool layer), returns **summary level** by default (never the full DTO), takes an explicit `brandId` (the builder is header-scoped today — the tool resolves brand from the question or the promo row).

Every scenario the business remembers ("we calculate X on the fly…") = one tier assignment + one eval question. Running list in §15.

## 7. Caching and cost — without touching answer quality

### 7.1 Prompt caching (mechanical, zero quality risk)

The static prefix — tool definitions, system rules, glossary, table index (~6–8 K tokens) — is marked with `cache_control` and read at ~10 % of input price by every loop iteration and every user's question within the cache window. Design discipline: **stable content before the breakpoint; volatile content (question, date, tool results) after it.** Web search inserts its own cache writes after search results — expected, not an invalidator. This is pure cost engineering; it cannot change an answer.

### 7.2 Verified-example retrieval (quality-*improving* cost reduction) — no embeddings at launch

Store **verified** question→SQL/tool-plan pairs (thumbs-up'd or eval-passing only). Two uses, in increasing strictness:

1. **Few-shot retrieval (default):** the 2–3 most similar verified pairs are injected as examples. The model still reasons and still writes its own SQL — accuracy goes **up** (worked examples are the strongest known lever for text-to-SQL) while steps, and therefore cost, go down.
2. **Short-circuit (strict):** skip the loop and re-run the stored plan only when ALL hold — near-exact match above a high threshold; same organization/audience context; entities in the question re-resolve to the same ids; the stored plan still passes the drift test. Otherwise fall through to the loop.

**Similarity at launch = Postgres** (`pg_trgm` + full-text search over the normalized question with entity names replaced by type placeholders), not embeddings — keeps Phase 1 on a single AI vendor. If the eval shows lexical similarity misses paraphrases that matter, add an embeddings provider (Voyage or OpenAI; pgvector) behind the same `IExampleStore` interface — a measured decision, not a launch dependency.

Hard rules protecting correctness: only verified entries enter the store; **result data is never cached** — SQL always re-executes live (freshness is the product); entries carry the catalog version and are invalidated by schema drift; **web-research answers never enter it**; every short-circuit is audited and sampled into eval runs.

### 7.3 The rest of the cost toolkit

Pay-per-need table details (2–3 tables fetched, not 106); tool-result truncation; history trimming (keep prior Q&A text, **drop old tool payloads**); step/wall-clock/daily caps; web-search `max_uses`; per-turn token + cost persisted via the existing `ModelPricingService` (seed rows for the current model IDs) so cost is a measured dashboard, not a guess. Ballparks to verify in the spike: ~$0.05/question on Sonnet 5.5, less with cache hits; ~$0.05–0.15 for a web-research question; the retired pipeline plausibly cost 2–4× that per *worse* answer.

### 7.4 Providers and billing

| Capability | Provider | Cost |
|---|---|---|
| Agent loop, tools, streaming, caching | Claude API | tokens |
| Fuzzy matching, example retrieval | Postgres (`pg_trgm`, full-text) | free extensions |
| Public web research (1c) | Claude API server tools | $10 per 1,000 searches + result tokens; `web_fetch` tokens only |
| Analyze (Phase 2, §13.1) | Claude API code execution | 1,550 free container-hours/month per org, then $0.05/hour |
| Embeddings (only if evals justify) | Voyage or OpenAI | new vendor + DPA; not in launch path |
| Forecasting (§13.2) | our backend | existing infrastructure |

**Billing note:** Claude API usage is pay-as-you-go via the Claude Console, separate from Claude.ai subscriptions (Pro/Max/Team) — confirm the client's account is an API organization and its usage tier fits expected throughput (Q10).

## 8. Safety and tenancy

### 8.1 The boundary is the database role

Migration creates **`askcaboodle_ro`**: `LOGIN`; `GRANT SELECT` on an explicit table allowlist; `ALTER ROLE … SET default_transaction_read_only = on`; role-level `statement_timeout = '15s'`; **not** a table owner, **no** `BYPASSRLS`. **No grants** on: `Identity` (password hashes, refresh tokens), `Email` (logged bodies contain reset links), `Auditing`, Hangfire, and the IAM tables (`Organization.Invitations` live tokens, `VerificationCodes` OTP hashes, `Auditing.AuditEvents`); membership tables excluded by default until a product need says otherwise. Read access to `DataHub.UnifiedEntityAlias` / `UnifiedEntities` is SELECT-only (§4.1). **Column-level grants** exclude PII columns on `CRM.Contacts` (names/emails/phones) — query results travel to the LLM provider; analytics questions never need a phone number. Fail-closed: new tables are invisible until a migration grants them. Own Npgsql connection string (`AskCaboodleSettings:ReadOnlyConnectionString`) with CancellationToken honored — not the repo's `DapperRepository`, whose timeout is broken.

### 8.2 The SQL gateway (belt and suspenders)

Single statement, must start `SELECT`/`WITH`, forced/enforced `LIMIT`, truncation before the result re-enters the prompt, full logging. Promote the test-only `ReadOnlySqlGuard` shape into the module. C# inspection is *convenience*; the role is the boundary.

### 8.3 Authorization, phase 1

Admin-only: new `CaboodleResource` under `CaboodleModule.Admin`, `[MustHavePermission]` on every action, seeded to ADMIN (the SoftDeletePurge recipe). Admins legitimately see all brands, so cross-brand SQL is correct — tenancy is deferred, not fudged. The controller ships fully attributed, so the `API.Test` reflection test passes and `bare-endpoints-baseline.txt` does not grow.

### 8.4 Authorization, GA — on the IAM v2 code (foundation merged, CS-1770)

What already exists on the branch: `IAccessContext.GetCurrentAsync()` (organization + membership + brand access + connections, cached and versioned), `[RequireModule]`, `[RequireOrgPermission]`, the module catalog with `ModuleSlugs.AskCaboodle = "ask-caboodle"` seeded under **AI** for the **Brand audience only**, with `OptionalDataSource` dependencies on product-spec, distributors, retailers, regions, approved-promotions, trade-spend-sandbox, contacts, pipelines. (`IntelligenceChatController` already carries `[RequireModule(ModuleSlugs.AskCaboodle, null, View)]`.)

- **Two audiences, one engine** (owner-decided: Brand *and* Broker versions). The loop, tools, catalog files, web search, streaming, pins and gallery are shared; the audience only changes the access context the engine runs under. See §8.4.1.
- **Endpoint guard**: `[RequireModule(ModuleSlugs.AskCaboodle, ModuleSlugs.AskCaboodle, ModuleActions.View, CrossBrand = true)]` on every action — `ModuleRefusal` checks Brand organizations against the first slug and Brokerages against the second; `CrossBrand` lets a broker ask across all connected brands without selecting one (a selected brand is still checked).
- **Brand allowlist**: from `IAccessContext` (`access.BrandsWith(ModuleSlugs.AskCaboodle, ModuleActions.View)`) — **never a header value and never string-injection into the SQL**. Per request: `SET LOCAL app.allowed_brand_ids = …` inside the request's transaction; **Postgres RLS** policies on brand-keyed tables check membership. Brokerage-owned tables (MarketOverview, CategoryReview, CategoryReviewCalender, BrandReport) additionally filter on the caller's `BrokerageOrganizationID`.
- **Data-source module gating**: Ask Caboodle must not answer from data a brand isn't entitled to see on screen. Each catalog table carries its owning module slug (§5); per request the agent is shown only tables whose module the caller holds View on for the brand, and RLS enforces it (policy checks the row's brand + the table's module against a per-request `app.allowed_brand_modules` list). **Catalog seed gap**: the `OptionalDataSource` list lacks `distributor-sales-report`, `spins`, `kehe`, `unfi` and `monthly-report` — add them before GA, or sales questions will be gated off.
- `search_entity` and every Tier-3 tool run inside the same access context (scope rules, §4.1); **suggested queries and gallery prompts are entitlement-filtered** (never suggest a module the org doesn't have).
- Pinned reports re-execute under the **viewer's** context (§9.1).
- House rules apply: records loaded by id are checked with `DemandBrandAsync` / `DemandOwnBrokerageRecordAsync`; organization changes (if any) go through `IamWriter`.

### 8.4.1 Brand vs Broker version

Built on `AccessContext` (`OrganizationType`, `ActiveBrandId`, `Brands[brandId].Modules`, `BrandsWith`, `OwnsBrokerageRecord`). The engine receives one `AgentAccessContext { audience, organizationId, brandAllowlist, brandModules (brand → slugs), activeBrandId? }` built from it per request, so the difference is data, not code paths.

| Concern | Brand version | Broker version |
|---|---|---|
| Who | members of a Brand organization (type 5) | members of a Brokerage (type 10) |
| Catalog seed | `ask-caboodle` under **AI** in `BrandRoots` (exists) | **add** `ask-caboodle` to `BrokerRoots` + Broker `OptionalDataSource` dependencies |
| Brand scope | the active brand | **every connected brand** where the member has `ask-caboodle` View (`BrandsWith`); cross-brand questions allowed |
| Module gating (§8.4) | brand's own module grants | **per brand**: each brand grants the brokerage different modules → `app.allowed_brand_modules` pairs from `Brands[brandId].Modules` |
| Brokerage-owned tables (MarketOverview, CategoryReview, CategoryReviewCalender, BrandReport) | not visible (Q17) | only the caller's own brokerage: RLS on `BrokerageOrganizationID = app.organization_id` |
| Entity resolution | own products/categories/promotions; brokerages connected to the brand | products etc. across connected brands, **each candidate tagged with its brand**; brands = connected brands only |
| Catalog table → module tags | brand-audience slugs | broker-audience slugs (shared data-source copies reuse the same slugs: product-spec, retailers, regions, distributors, approved-promotions, trade-spend-sandbox; broker-only: market-overview, category-review, distributor-apl) |
| Prompt | single-brand assistant | audience block: "assisting a brokerage across N brands — name the brand on every row, ask which brand when ambiguous" |
| Gallery / suggestions | brand starters | broker starters (cross-brand comparisons, category reviews, market overview) |
| Pins | re-run under the viewer's context | same — a pin shared inside a brokerage shows each viewer only their brands |

**Distributor sales for brokers is a business decision** (Q16): the Broker audience has no `distributor-sales-report` module today, so the broker version cannot answer sales questions unless a Broker data-source copy is added and brands grant it.

**Tests**: tenancy matrix in the eval/integration suite — broker sees only connected brands; per-brand module gating (brand A grants promotions, brand B doesn't); brokerage-owned records isolated between brokerages and from brands; a member without `ask-caboodle` is refused before any LLM call; cross-brand answers always carry a brand column.

### 8.5 Audit

Every turn persists: question, each tool call (SQL, duration, row count, error), **web searches (query, result URLs)**, answer, source type, tokens incl. cache reads, cost, model/effort, and the resolved access context. Entities: `AskSession` / `AskMessage` / `AskToolCall` (+ `AskFeedback`). This is the flight recorder, the eval seed, and the cost dashboard — the old module had the columns and wrote nulls; this one treats the ledger as a first-class feature.

### 8.6 Postgres versions

Verified 2026-10-10 with read-only `SHOW server_version`:

| Environment | Host | Version | Support |
|---|---|---|---|
| Production | RDS `caboodledb-prd` (us-west-1, Graviton) | **15.17** | community EOL Nov 2027; RDS standard support to 29 Feb 2028; this minor to ~Mar 2027 |
| Staging | self-managed (Debian) | was 14.5 — **aligned with production** (owner, 2026-10-11) | done; RLS/`security_invoker` work can be tested on staging |
| Local dev | `docker-compose.yml` | 14.5 | — |

Extensions installed in both: `plpgsql` only. `pg_trgm` is available (contrib, a trusted extension) and gets created by the 1b migration.

Design consequences:
- **Production needs no upgrade for Ask Caboodle.** It has `security_invoker` views (15+): Tier-2 `ask` views (§6) are created `WITH (security_invoker = true)` so RLS applies to the caller. The entity registry queries base tables directly anyway (§4.1).
- **Staging and local are a major version behind production.** On 14 a view runs with its owner's privileges and `security_invoker` doesn't exist, so RLS-related work can't be tested faithfully there. Align staging and `docker-compose` to **15** before GA work on RLS/views (an image bump plus dump/restore on staging); 1a–1c don't depend on it.
- RLS itself, `pg_trgm` and full-text search work on every environment.

Production major upgrade (15 → 17) is a 2027 maintenance item, well before RDS standard support ends in Feb 2028; a routine 15.x minor update is due around Mar 2027.

## 9. Product features

### 9.1 Pinned live reports — *pin the plan, not the answer*

Pinning persists a **verified execution plan**, not output: `PinnedReport { owner, organizationId, title, question (provenance), plan (final SQL or tool-call + params), vizShape (StructuredReport spec), periodSpec }`.

- **Live by re-execution:** every dashboard/report-section view re-runs the plan against the current database and renders through the existing `StructuredReport` components — a pinned answer *is* a regular report.
- **Relative dates saved as tokens** (`last-full-quarter`, `ytd`), resolved at render — otherwise "last quarter" freezes forever.
- **Viewer's access context**, not the pinner's, scopes the re-execution (§8.4; trivial in admin-only 1c).
- **Nightly validation job** re-runs all pins; schema drift flags a pin as broken (with the owning migration) instead of a silently erroring widget. Pins store catalog version for diagnosis.
- Tier-3 pins store the tool call + params — reconciliation by construction.
- **Not pinnable**: web-research answers (results change, not Caboodle data) and, later, exploratory analyses.
- Phase 1: personal pins. Org-shared pins are a small later step (visibility flag, same model as prompts).

### 9.2 Prompt gallery

`Prompt { owner, organizationId, visibility: private | organization | shared, title, text, variables[] }` + `PromptShares { promptId, userId }` for person-to-person shares.

- **Organization prompts** curated under an org-admin permission; **private** prompts per user; **shared** = private + explicit share list (exactly the per-object sharing the IAM model supports).
- **Variable templates**: "Top 10 SKUs for `{brand}` in `{period}`" — placeholders resolve through `search_entity` / period parsing at run time.
- **Seeded starter gallery per organization type** (brand orgs vs brokerages see different starters), curated from the eval set so every shipped prompt is verified-good.
- Gallery search: trigram + full-text (same machinery as §7.2).

### 9.3 Suggested follow-up queries

The model emits 2–4 suggestions as a structured block in the same response (zero extra calls); they are then re-ranked/replaced by **verified** similar questions from the gallery + example store, and **filtered by the org's entitlements**. Rendered as clickable chips; also powers the empty-state ("what can I ask?").

### 9.4 Streaming

Plain SSE from ASP.NET (`text/event-stream`; SignalR `/notifications` is the fallback transport). Event protocol:

| event | payload |
|---|---|
| `progress` | step label ("resolving 'kroger'…", "querying TradeSpend…", "searching the web…"), step n/cap |
| `text` | answer token deltas (Anthropic streaming passthrough) |
| `data` | the StructuredReport payload (table/chart) |
| `sources` | citations for web-sourced content: url, title, quoted text (§9.5) |
| `suggestions` | the follow-up chips |
| `done` | tokens, cost, sql-used, timing, **`sourceType`: `caboodle` \| `public_web` \| `mixed`** |
| `error` | user-safe failure shape |

FE consumes with `fetch` readers/`EventSource` (not axios). The loop's middle turns are tool calls (no user prose) — `progress` events are what keep 15–45 s multi-step runs feeling alive.

### 9.5 Public web research — disclosure enforced by code

For market, category and industry questions ("what's trending in plant-based snacks?") the loop has Claude's `web_search` / `web_fetch` server tools.

- **When**: system prompt — use web tools only when the question is about the external market/industry or the user asks for the web; Caboodle questions are answered from Caboodle data. **Search queries never contain Caboodle figures** (brand and retailer names are public; internal numbers are not).
- **Disclosure is rendered by code, not requested from the model**: if a response contains any web-search result block, the backend sets `sourceType = public_web` (or `mixed`) and emits the citation list; the FE shows a fixed banner — *"This answer uses public web sources, cited below. It is not Caboodle data and has not been verified by Caboodle."* The model cannot forget it.
- **Mixed answers are split** into "From your Caboodle data" and "From public web sources" sections, each labelled.
- **Citations required**: web search returns url / title / quoted text per source; prompt rule — every web-derived claim cites a source; no market "facts" from training memory; if nothing credible is found, say so.
- **Controls**: `max_uses` 3–5 per question; optional `blocked_domains`; `user_location` US; per-organization on/off setting (Q11); counts toward the per-user daily cap; queries + URLs audited (§8.5); cost tracked ($10 / 1,000 searches).
- **Exclusions**: not pinnable (§9.1); never enters the example store (§7.2).
- **Limits to state honestly**: public sources only — trade press, retailer announcements, public reports. Syndicated market data (SPINS, Nielsen, Circana) is paywalled and not reachable by search; answers are directional and cited, not category-share numbers. Brands with SPINS data in Caboodle get quantitative market answers from that, through the normal data path.

## 10. The quality program (what "no compromise" means operationally)

1. **Golden eval set** — grows from day one: seed 20–30 real questions incl. deliberately misspelled/ambiguous entities (and alias cases like "WFM"), every derived-metric scenario, and web-routing cases (market question → web, labelled; data question → never web). Every production wrong answer adds one. Run against the prod restore; score answered/wrong/refused-correctly + correct source labelling + steps + cost.
2. **Feedback flywheel** — thumbs up/down on every answer (`AskFeedback`); thumbs-up feeds the example store; thumbs-down opens a diagnosis (the audit log holds the exact SQL — minutes, not hours), and the fix is one catalog sentence (or one alias) + one eval question. Six months in, the catalog is the company's most valuable business-knowledge artifact.
3. **Gates** — the eval run gates every prompt, catalog, model, or effort change; the drift test gates schema changes; reconciliation tests gate Tier-2 views; sampled short-circuit answers are re-verified.
4. **Dashboards** — cost/question, steps/question, cache-hit rates, web-search rate and spend, thumbs ratio, eval pass rate — all queryable from the audit tables.
5. **Presentation contract** — every numeric answer states period, scope, and source (the SQL or tool + row count), names any entity disambiguation or alias it relied on, and chooses table vs chart deliberately. Refusing with "here's what I'd need" beats a confident wrong number — refusal correctness is a scored eval dimension.

## 11. Code layout and API surface

Ask Caboodle lives in the existing **Intelligence** module (owner decision, 2026-10-11). The old 6-step pipeline, its endpoints, the `Modules.Intelligence.Domain` project and its six tables (`ChatSessions`, `ChatMessages`, `QueryAuditLogs`, `LlmModelPricings`, `CatalogSnapshots`, `MasterEntities`) were deleted (migration `RemoveLegacyIntelligenceTables`). Branch: `feature/ask-caboodle` (from `feature/CS-1770-iam-service-foundation`).

```
Modules/Intelligence/
├─ Modules.Intelligence.Application/      (1a, implemented)
│    Ask/AskQuestionRequest.cs            request + validator + handler (house style)
│    Agent/                               AskAgent loop, sessions (in-memory in 1a), system prompt
│    Llm/                                 ILlmClient + Anthropic SDK adapter (append-only history)
│    Tools/                               get_table_info, run_sql, search_entity, present_answer
│    Sql/                                 SqlGuard, read-only Npgsql gateway
│    Entities/                            live entity registry + search
│    Catalog/                             SchemaCatalog + embedded YAML (tables/, glossary, join paths, metrics)
│    Configuration/IntelligenceOptions    section "IntelligenceSettings"
└─ Modules.Intelligence.Domain/           AskSession, AskMessage, AskToolCall, AskFeedback (re-added in B3);
                                          later PinnedReport, Prompt, PromptShare, EntityAlias : AuditableEntity
Hosts/API/Controllers/Modules/Intelligence/AskCaboodleController.cs   POST /api/v1/askcaboodle/ask (SSE)
```

Wiring: sln, API.csproj, Modules.Shared.Infrastructure reference, ModuleStartup + Program.cs, **Dockerfile COPY list**, catalog files copied to output. New EF migrations: RO role + grants, `pg_trgm` extension + trigram indexes on registry name columns, `ask` schema, audit/pin/prompt/alias tables. House conventions (BE `CLAUDE.md`): request + handler + validator in one file; `DefaultIdType` ids; open enums start at 5 with gaps of 5; no XML doc comments; 90 % coverage on touched projects.

`AskCaboodleController` → `/api/v1/askcaboodle` (route = class name):

| Endpoint | Purpose |
|---|---|
| `POST ask` (SSE) | `{question, sessionId?, promptId?}` → event stream (§9.4) |
| `GET sessions`, `GET sessions/{id}`, `DELETE sessions/{id}` | history (B3) |
| `POST feedback` | thumbs + optional note |
| `GET/POST/PUT/DELETE prompts`, `POST prompts/{id}/share` | gallery |
| `GET/POST/DELETE pins`, `GET pins/{id}/render` | pinned reports (render = re-execute → StructuredReport) |
| `GET/POST/DELETE aliases` | learned entity aliases (org-scoped; admin curates global) |
| `GET suggestions` | empty-state suggestions |

All actions carry authorization attributes from the first commit (phase 1 `[MustHavePermission]`; GA `[RequireModule]`).

Testing: loop orchestration unit-tested against scripted `ILlmClient` (happy path, error-retry, cap exhaustion, parallel tools, web-result → `sourceType` labelling); SqlGateway hammered (multi-statement, non-SELECT, `;`-smuggling, LIMIT, truncation); registry (scope rules, alias match source, misspelling set), period-resolution tests; reconciliation + drift + eval harness run against the prod restore (not part of unit coverage gates).

## 12. Dependencies and sequencing

- **IAM v2 foundation is in the working branch** (`feature/ask-caboodle-phase1` = CS-1770 + `develop`). Per-module IAM migration is in progress separately; Ask Caboodle 1a–1c don't depend on it (admin-only). GA needs: the Ask Caboodle guard + catalog fixes (§8.4), RLS policies on the tables the agent reads, staging on Postgres 15.
- **Release flow** (owner-decided): current `develop` (stores work) → live; IAM work → `develop` → live; updated `develop` → `feature/ask-caboodle-phase1`; Ask Caboodle merges last. Consequences:
  - Until IAM lands in `develop`, merge `feature/CS-1770-iam-service-foundation` into the Ask branch whenever it changes materially (review fixes, module work), not only at the end — small merges, not one big one.
  - **EF migrations**: Ask Caboodle's migrations will be older-dated than IAM migrations written later, and every merge touches `MainDbContextModelSnapshot.cs`. As long as the Ask branch is not deployed to a shared database, keep its migrations few and **delete and regenerate them against the final `develop` snapshot right before its PR** — clean history, no hand-merged snapshot.
  - If Ask Caboodle must be demoed before then, give it its own database (or a restored copy), never the shared staging DB — otherwise its migrations land in staging ahead of `develop` (Q14).
- The RO role's deny-list grows in the same PRs that add IAM tables (§8.1) — one line in each migration review.
- **Postgres** (§8.6): no production upgrade needed for this work; align staging/local to 15 before GA; production 15 → 17 in 2027.
- Old Intelligence endpoints live until the web FE's `ask-caboodle` module repoints; then they and their baseline entries retire together.
- **Rotate credentials before anything else ships**: a live Anthropic API key and a Google Maps key are committed in `appsettings.Development.json`, alongside DB credentials for every environment (IAM plan Phase 0.5) — a read-only role is only meaningful if the superuser password isn't in git history. Move them to secrets. **Network exposure**: both the production RDS instance and the staging database accepted connections from a developer workstation over the internet with the committed credentials — restrict them (RDS security group / staging firewall) to the app hosts and a VPN or bastion.
- Platform: the solution targets `net6.0` (out of support since Nov 2024). Not an Ask Caboodle blocker, but it is why the SDK check in §3 exists; plan a framework upgrade separately.

## 13. Later tracks (designed now, built later)

### 13.1 Analyze — Python analysis via code execution (Phase 2, demand-gated)

**What**: Claude's code-execution tool — an Anthropic-hosted sandbox (pandas, numpy, scipy, statsmodels, scikit-learn; no internet) where Claude writes and runs Python. With **programmatic tool calling**, Claude's code calls our `run_sql` (same RO gateway) and full result sets land in the sandbox, not in the conversation — lifting the 50-row truncation for analysis without inflating context; only the summary and a result table return, rendered by StructuredReport.

**Where it adds what SQL can't easily**: seasonal vs real decline (trend/seasonality decomposition); before/after significance ("did the March price increase change cases?"); store clustering by sales pattern; anomaly detection across store × product months (voids and data errors); lift vs discount-depth regression (once depth is captured, §13.2); exploratory forecasts before the official forecast job exists. Most Caboodle questions ("how much / top N / vs last year") remain SQL — Postgres also does `corr` / `regr_slope` natively.

**Guardrails**: answers labelled *Exploratory analysis* (code differs per run); code persisted in `AskToolCall`; app metrics still come only from Tier-1/2/3 sources (§6); not pinnable at first; bulk rows go to Anthropic's container (containers persist up to 30 days) — must be covered in the data-handling statement (Q8); +10–30 s latency.

**Gate**: build when demand is measured — count the "analysis / what if" questions the old Intelligence module deflects (its query log) and the 1c refusal rate.

### 13.2 Forecasting and promotion insight

**Data reality** (from the BE code):
- `DataUpload.DistributorSalesRecords` = **monthly distributor shipments** (KeHE/UNFI → store), grain store × DC × UPC × month; cases, dollars, units; **no promo flag**; rows that fail retailer/store/UPC mapping are excluded (actuals can be understated). History depth per brand is unknown (Q12).
- Sandbox projections are deterministic: `promoCases = baseWeekly × eventWeeks × (1 + EventLift/100)`, baseline from stores × weeks × `AvgWeeklySales`. **Lift and weekly sales are user-entered; `ActualLift` is typed in by hand.** No event-level planned-vs-actual join exists; the monthly report matches actuals on banner/product **name text**.
- SPINS (weekly, with promo dollars / % units on promo) is the only promo-vs-base signal — where a brand has it.

**Principle**: Claude does not produce forecast numbers. Numbers come from deterministic statistical code, back-tested before anyone sees them; Claude interprets the question, calls the tool, and explains results with their uncertainty range.

**Approach** — statistical forecasting in the backend: decompose sales = velocity (units/store/week; stable, seasonal → Holt-Winters/ETS via ML.NET or a small in-house implementation) × distribution (stores carrying the item; from the business plan — new authorizations, expected losses — not predictable from history). Monthly Hangfire job after each import; results stored with prediction intervals and measured back-test error; exposed as `get_sales_forecast` (Tier 3) and to screens. Cost ≈ existing infrastructure, no licenses.

**Realistic accuracy** (confirm by back-test: train 2024–25, forecast 2026, compare): steady SKUs at distributor/banner × month often ~10–20 % error; annual totals better; store-level, new items and distribution changes unreliable; promo lift from monthly shipment data directional only. **Gate**: a forecast is shown to customers only if it beats the "same month last year" baseline.

**Steps** (each useful on its own):
- **F0 — data foundations** (no AI): history-depth audit per brand; promotion → actuals join by **ids** (banner, UPC, dates) instead of text; mapping-coverage metrics; fix `GetVelocityPerStoreReportForPromotionRequest` (distinct month-of-year collapses the same month across years in the weeks total).
- **F1 — describe before predicting**: planned-vs-actual per promotion and observed lift by banner × product × promo type via a `get_promotion_history` tool.
- **F2 — baseline forecast job + `get_sales_forecast`**, back-test gated.
- **F3 — suggested lift in the Sandbox**: median and range from similar past promotions; the user still decides. Start capturing **discount depth / promoted price and tactic (display, feature, ad)** on promotions — none are stored today.
- **F4 — ML** (gradient-boosted models on promo features) only if weekly data and promo attributes accumulate and back-tests show the statistical models plateau.

**Data that improves accuracy most**: (1) id-based promotion-to-actuals linkage; (2) discount depth and tactic per promotion; (3) weekly data with a promo flag (SPINS or weekly distributor/retailer reports); (4) distribution history and planned authorizations; (5) price history and completeness flags.

## 14. Deliberately not building

Intent/context classifiers (the model routes itself; deletes 4 of the old 6 calls) · a query-plan DSL + compiler (SQL is the plan language; Postgres is the validator) · **schema-RAG** (a cached index + `get_table_info` beats retrieval-before-reasoning, which fails silently, §5) · **vector RAG for entity names** (lexical + context + model choice, §4.1) · **populating `MasterEntities` or `UnifiedEntity` as an Ask master list** (live registry instead, §4.1) · **embeddings at launch** (Postgres similarity first, §7.2) · **LLM-generated forecast numbers** (deterministic models, §13.2) · fine-tuning (schema knowledge belongs in an editable catalog) · a multi-model cascade on day one (prompt caches are model-scoped; one model at tuned effort wins until evals justify more).

## 15. Open questions

| # | Question | Recommendation / owner |
|---|---|---|
| Q1 | Remaining derived-metric scenarios ("couple of scenarios" — one captured: promotion cases/revenue → Tier 3) | Owner lists them; each = tier + eval question |
| Q2 | Fiscal vs calendar quarters; week definitions | Business decision; goes verbatim into the glossary |
| Q3 | Broker audience for Ask Caboodle | **Resolved: both Brand and Broker versions** (§8.4.1); add the Broker catalog node + dependencies |
| Q4 | Embedding vendor | **Deferred** — Postgres similarity at launch; revisit only on eval evidence (§7.2) |
| Q5 | Pin sharing at GA: personal only vs org-shared | Ship personal; add org visibility flag later |
| Q6 | Per-org question quotas as a commercial lever | Decide with pricing; the audit table already measures usage |
| Q7 | Anthropic C# SDK on net6.0 | Package targets `netstandard2.0` → installable; spike checks `System.Text.Json` 10.x binding; HttpClient wrapper is the fallback |
| Q8 | Data residency / provider exposure statement for customers (rows go to the LLM API; web search queries; later code-execution containers) | Needed before GA marketing; truncation + PII column excludes shrink surface |
| Q9 | Postgres versions | **Resolved**: production 15.17, staging/local 14.5. Align staging to 15 before GA; production 15 → 17 in 2027 (§8.6) |
| Q10 | Client's Anthropic account: API organization (not a Claude.ai subscription), usage tier / rate limits | Confirm before 1c load testing |
| Q11 | Web research default per organization (on/off) | Default on for admin 1c; per-org setting at GA |
| Q12 | Distributor sales history depth per brand | `MIN/MAX("ReportDate")` per brand on the prod restore — input to §13.2 |
| Q13 | Catalog seed: add `distributor-sales-report`, `spins`, `kehe`, `unfi`, `monthly-report` as Ask Caboodle data sources | Yes, before GA (§8.4) |
| Q14 | Where is Ask Caboodle demoed/tested before it merges (client wants features by December)? | Its own database or restored copy, not shared staging (§12) |
| Q16 | May brokers see a connected brand's distributor sales through Ask Caboodle? | Business; if yes, add a Broker `distributor-sales-report` data-source module that brands grant |
| Q17 | May a brand see brokerage-owned records about it (BrandReport, MarketOverview)? | Default no; business decides |
| Q15 | Business answers the catalog needs: "the" POD definition; is `ReportingVersionID` the default "our plan"; does `DistributorSalesRecords.RetailerName` equal `CRM.Retailers.CorporateName` | Owner + profiler (`catalog-sample/`) |
