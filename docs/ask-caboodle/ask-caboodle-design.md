# Ask Caboodle — Design (Phase 1: Retrieve)

Status: draft for review · 2026-10-06
Replaces: the Intelligence module (retired incrementally; its 6 endpoints stay alive only until the web FE repoints).
Grounding: BE `develop @ 07f8fa01` code review; design session "AskCaboodle feature design"; IAM v2 architecture (`../caboodle-access-architecture.md`) and implementation plan (`../caboodle-be-iam-implementation-plan.md`); Existing Modules Resolution series (`../modules-resolution/`).

---

## 1. What this is, and why it sells

A Claude-Code-style **agentic answer engine over Caboodle's own database**: the user asks a question in plain language; a single model with a small set of tools investigates — looks up schema, resolves entity names, runs read-only SQL, calls business-calculation services — retries on its own errors, and answers with the number, the context, and the source. Streaming, with follow-up suggestions, a prompt gallery, and the ability to **pin any answer as a live report** on the dashboard.

The market has "ask our data" chats (UNFI ships one). The differentiators here are:

1. **Trustworthy numbers** — every figure reconciles with what the app's own screens show (§6), every answer names its period/scope/source, and a permanent eval flywheel (§10) turns each mistake into a regression test.
2. **Answers that become living reports** — a pinned answer is not a screenshot; it re-executes against the current database on every view, rendered by the same components as regular reports (§9.1). Chat is the entry point; the report system is where the value compounds.
3. **Native to Caboodle's access model** — organization entitlements, brand scoping and module permissions apply to the agent exactly as they apply to screens (§8.4).

## 2. Scope

| Phase | Contents |
|---|---|
| **1a — Spike** | Loop + SQL gateway + catalog for 2 schemas (TradeSpend, Brand) in a console/xUnit harness against the local prod restore. Goal: watch self-correction on 10 golden questions; first measured cost numbers. |
| **1b — Engine (admin-only)** | Module projects, `askcaboodle_ro` role migration, audit tables, `AskCaboodleController` behind `[MustHavePermission]`, full catalog + drift test, golden eval set, unit tests to the repo's bar. |
| **1c — Experience layer** | SSE streaming, suggested queries, prompt gallery, pinned live reports, semantic answer cache, thumbs feedback, cost/quality dashboard. Still admin-only. |
| **GA — Customer release** | Rides IAM v2: Ask Caboodle becomes a catalog module; `[RequireModule]` + Postgres RLS brand-allowlist (§8.4). This is the hard dependency on the IAM rollout. |
| **Phase 2+** | Write actions (create/update promotions etc.) with confirm-before-execute UX and IAM write permissions; scheduled/emailed pinned reports; org-shared pins. Out of scope here. |

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
- **Model**: Sonnet 5 (`claude-sonnet-5`) at low/medium effort as default. Quality rule: **escalate upward** (higher effort, next model tier) when the step cap is hit — never silently downgrade. Haiku 4.5 may take the default *only after* the eval set proves it holds quality (§10).
- **Client**: official Anthropic C# SDK if it supports net6.0 (spike verifies); else a typed `HttpClient` wrapper. Either way behind `ILlmClient` so the loop is unit-testable with scripted responses.

## 4. The tools

| Tool | Contract | Backed by | Failure mode |
|---|---|---|---|
| `get_table_info(tables[])` | full columns, types, FKs/join paths, enum int→name maps, business notes | curated catalog (§5), served from repo-checked files | unknown table → the index is re-shown |
| `run_sql(sql, reason)` | rows (truncated) **or the raw Postgres error** | read-only gateway (§8.2) on `askcaboodle_ro` | *the failure mode is the design* — errors feed self-correction |
| `search_entity(name, types?)` | typed candidates with ids + context | **live queries over the real source tables** (§4.1) | zero matches → retry fuzzier; many → disambiguation policy |
| `get_promotion_performance(promoIds[], brandId?, detail)` | the same promo/non-promo cases & revenue the app shows | the exact `TradeSpendDTOBuilder` path the Monthly Report / roll-up / dashboard use | wrong grain → model falls back to Tier-1 rollup (§6) |

More Tier-3 tools are added as derived-metric scenarios surface (§6). Adding tools is cheap by design; the loop doesn't change.

### 4.1 Entity resolution — live tables, not MasterEntities

**Decision (owner-confirmed): the `MasterEntities` sync table is not used.** It is incomplete, needs a populate job, and leaks names across scopes. `search_entity` instead queries the live source tables through a small config-driven registry:

| Type | Source | Name columns | Context returned |
|---|---|---|---|
| Brand | `Brand.Brands` (→ Organizations post-IAM) | Name | status, broker connections |
| Brokerage | `Identity.Users` role BROKER today → `Organization.Organizations` post-IAM | Name | connected brands |
| Retailer | `CRM.Retailers` | Name | banner count |
| Banner | `CRM.Banners` | Name | parent retailer, door count |
| Region | `CRM.Regions` | Name | retailer |
| Store | DataHub store list | Name, store number | banner, address |
| Distributor | `CRM.Distributors` (leaf + parents) | Name | parent chain |
| Distribution center | `CRM.DistributionCenters` | Name | distributor |
| Product / SKU | `ProductSpecs` tables | Name, UPC | brand, category |
| Category | `ProductSpecs.Categories` | Name | parent |
| Promotion | TradeSpend promos | Name/event name | brand, date range |

Mechanics:

- `ILIKE '%…%'` for substrings; **`pg_trgm` + `similarity()`** (GIN indexes on the registry's name columns) for misspellings ("wallmart", "keyhe") — fuzzy matching is a scored database feature, not an LLM guess.
- Every candidate carries **context** (a banner knows its retailer; a product knows its brand) — that plus the question's phrasing disambiguates, and the catalog teaches the hierarchy (retailer → banner → store; which FK each type filters on).
- **Ambiguity policy** (system prompt): one strong match → proceed; several → pick the contextually obvious one *and say so in the answer*, or ask a clarifying question (legitimate in chat); zero → retry fuzzier, then say what was searched.
- All registry queries respect soft-delete filters and, at GA, the caller's scope (§8.4) — a broker only resolves entities inside their brand allowlist.

## 5. Knowledge: the catalog is the product

The loop is ~300 lines; answer quality lives in the **curated schema catalog**, checked into the repo and reviewed in PRs like code. Per table: purpose, column meanings, join paths, enum int→name maps, business notes, **negative rules** ("promo/non-promo revenue are modeled figures — never compute from these tables; call `get_promotion_performance`").

Build it in five layers (cheapest first): **(1)** generate skeletons from the EF model snapshot + enum reflection (partial unique indexes and defaults are business rules in disguise); **(2)** mine the code — Specifications define business vocabulary ("active promotion"), validators hold invariants, existing Dapper SQL holds canonical join paths, Intelligence's old schema txt files are a seed corpus to audit-and-import, `docs/` holds user-facing vocabulary; run one mining agent per module with file:line citations; **(3)** profile the prod-restore database (distinct values, date coverage, row counts, null rates); **(4)** human pass on priority schemas only (TradeSpend, Brand, Broker, CRM); **(5)** the feedback flywheel — every wrong answer becomes one catalog sentence + one eval question.

A **drift test** diffs catalog names against `MainDbContextModelSnapshot.cs` and fails CI when a migration changes schema without a catalog update.

The *cached system prompt* carries only the global rules + a one-line index of all ~114 tables. Global rules include: always `"Deleted" = FALSE`; quote PascalCase identifiers; **the business glossary** (cases, doors, lift, TPR, EDLP, APL, promo vs non-promo…); **date semantics** — how "Q2", "last quarter", "YTD" resolve, fiscal vs calendar convention (needs a business answer — open question Q3); money units. Today's date goes in the **user** message (in the system prompt it would bust the cache daily).

## 6. Derived metrics: the reconciliation rule

> **Any figure a user can also see in the app must be the same figure.** A business formula is defined once, in a reviewed place — never re-derived by the model per question.

Three tiers; the catalog says which tier each metric lives in:

1. **Persisted rollup exists at the right grain → route to it.** Monthly promo/non-promo revenue & cases (planned and actual) → the Monthly Report table. Catalog carries a *metrics section*, not just tables.
2. **SQL-expressible at a different grain → canonical view** in an `ask` schema (created by migration, SELECT granted to the RO role), plus a **reconciliation test** in CI: aggregate the view to the rollup's grain and assert equality against the stored numbers on the prod restore.
3. **Model-shaped logic → wrap the C# in a tool.** The promotion metric is confirmed Tier 3: `TradeSpendDTOBuilder` encodes SKU-lifecycle clamping, month-boundary event splitting, overlap merging, EDLP branching, lift projection, fee allocation — a SQL re-implementation would be a second, divergent copy of the company's most important logic. `get_promotion_performance` calls the same code the screens use; reconciliation holds by construction. Tool rules: takes a **list** of ids (no N+1 at the tool layer), returns **summary level** by default (never the full DTO), takes an explicit `brandId` (the builder is header-scoped today — `ICurrentUser.GetBrandID()`; the tool resolves brand from the question or the promo row).

Every scenario the business remembers ("we calculate X on the fly…") = one tier assignment + one eval question. Running list in §14.

## 7. Caching and cost — without touching answer quality

Two different caches solve two different costs. Neither is optional; both have explicit quality guardrails.

### 7.1 Prompt caching (mechanical, zero quality risk)

The static prefix — tool definitions, system rules, glossary, table index (~6–8 K tokens) — is marked with `cache_control` and read at ~10 % of input price by every loop iteration and every user's question within the cache window. Design discipline: **stable content before the breakpoint; volatile content (question, date, tool results) after it.** This is pure cost engineering; it cannot change an answer.

### 7.2 Semantic answer cache (quality-*improving* cost reduction)

Embed **verified** question→SQL/tool-plan pairs (thumbs-up'd or eval-passing only) in pgvector. Two uses, in increasing strictness:

1. **Few-shot retrieval (default):** the 2–3 most similar verified pairs are injected as examples. The model still reasons and still writes its own SQL — accuracy goes **up** (worked examples are the strongest known lever for text-to-SQL) while steps, and therefore cost, go down.
2. **Short-circuit (strict):** skip the loop and re-run the stored plan only when ALL hold — near-exact semantic match above a high threshold; same workspace/audience context; entities in the question re-resolve to the same ids; the stored plan still passes the drift test. Otherwise fall through to the loop.

Hard rules protecting correctness: only verified entries enter the cache; **result data is never cached** — SQL always re-executes live (freshness is the product); cache entries carry the catalog version and are invalidated by schema drift; every short-circuit is audited and sampled into eval runs. Embeddings here match **language to language** — the one job they're genuinely good at — unlike schema-RAG, which stays rejected (§13).

### 7.3 The rest of the cost toolkit

Pay-per-need table details (2–3 tables fetched, not 114); tool-result truncation; history trimming (keep prior Q&A text, **drop old tool payloads**); step/wall-clock/daily caps; per-turn token + cost persisted via the existing `ModelPricingService` so cost is a measured dashboard, not a guess. Ballparks to verify in the spike: ~$0.05/question on Sonnet 5, less with cache hits; the retired pipeline plausibly cost 2–4× that per *worse* answer.

## 8. Safety and tenancy

### 8.1 The boundary is the database role

Migration creates **`askcaboodle_ro`**: `LOGIN`; `GRANT SELECT` on an explicit table allowlist; `ALTER ROLE … SET default_transaction_read_only = on`; role-level `statement_timeout = '15s'`. **No grants** on: `Identity` (password hashes, refresh tokens), `Email` (logged bodies contain reset links), `Auditing`, Hangfire — **and the new IAM tables as they land: `Organization.Invitations` (live tokens), `VerificationCodes` (OTP hashes), `Auditing.AuditEvents`**; membership tables excluded by default until a product need says otherwise. **Column-level grants** exclude PII columns on `CRM.Contacts` (names/emails/phones) — query results travel to the LLM provider; analytics questions never need a phone number. Fail-closed: new tables are invisible until a migration grants them. Own Npgsql connection string (`AskCaboodleSettings:ReadOnlyConnectionString`) with CancellationToken honored — not the repo's `DapperRepository`, whose timeout is broken.

### 8.2 The SQL gateway (belt and suspenders)

Single statement, must start `SELECT`/`WITH`, forced/enforced `LIMIT`, truncation before the result re-enters the prompt, full logging. Promote the test-only `ReadOnlySqlGuard` shape into the module. C# inspection is *convenience*; the role is the boundary.

### 8.3 Authorization, phase 1

Admin-only: new `CaboodleResource` under `CaboodleModule.Admin`, `[MustHavePermission]` on every action, seeded to ADMIN (the SoftDeletePurge recipe). Admins legitimately see all brands, so cross-brand SQL is correct — tenancy is deferred, not fudged. The controller ships fully attributed, so the modules-resolution Phase 4 reflection test passes untouched.

### 8.4 Authorization, GA — on IAM v2 rails (hard dependency)

- Ask Caboodle becomes a **module in the catalog** (its own slug/audiences), entitled per organization by the Platform Admin and granted per Brand Access like every other module; endpoints guarded by `[RequireModule]`.
- Tenancy for model-written SQL is enforced by **Postgres row-level security keyed on the caller's brand allowlist**: per request, `SET LOCAL app.allowed_brand_ids = <resolver output>`; RLS policies on brand-keyed tables check membership of that list. The source of the allowlist is the IAM resolver (organization + membership + connections + brand access), **never a header value and never string-injection into the SQL**. Brokerage-owned tables additionally filter on the caller's `BrokerageOrganizationID`.
- `search_entity` and every Tier-3 tool run inside the same access context; **suggested queries and gallery prompts are entitlement-filtered** (never suggest a module the org doesn't have).
- Pinned reports re-execute under the **viewer's** context (§9.1).

### 8.5 Audit

Every turn persists: question, each tool call (SQL, duration, row count, error), answer, tokens incl. cache reads, cost, model/effort, and the resolved access context. Entities: `AskSession` / `AskMessage` / `AskToolCall` (+ `AskFeedback`). This is the flight recorder, the eval seed, and the cost dashboard — the old module had the columns and wrote nulls; this one treats the ledger as a first-class feature.

## 9. Product features

### 9.1 Pinned live reports — *pin the plan, not the answer*

Pinning persists a **verified execution plan**, not output: `PinnedReport { owner, organizationId, title, question (provenance), plan (final SQL or tool-call + params), vizShape (StructuredReport spec), periodSpec }`.

- **Live by re-execution:** every dashboard/report-section view re-runs the plan against the current database and renders through the existing `StructuredReport` components — a pinned answer *is* a regular report.
- **Relative dates saved as tokens** (`last-full-quarter`, `ytd`), resolved at render — otherwise "last quarter" freezes forever.
- **Viewer's access context**, not the pinner's, scopes the re-execution (free under §8.4; trivial in admin-only 1c).
- **Nightly validation job** re-runs all pins; schema drift flags a pin as broken (with the owning migration) instead of a silently erroring widget. Pins store catalog version for diagnosis.
- Tier-3 pins store the tool call + params — reconciliation by construction.
- Phase 1: personal pins. Org-shared pins are a small later step (visibility flag, same model as prompts).

### 9.2 Prompt gallery

`Prompt { owner, organizationId, visibility: private | organization | shared, title, text, variables[] }` + `PromptShares { promptId, userId }` for person-to-person shares.

- **Organization prompts** curated under an org-admin permission; **private** prompts per user; **shared** = private + explicit share list (exactly the per-object sharing the IAM model supports).
- **Variable templates**: "Top 10 SKUs for `{brand}` in `{period}`" — placeholders resolve through `search_entity` / period parsing at run time.
- **Seeded starter gallery per organization type** (brand orgs vs brokerages see different starters), curated from the eval set so every shipped prompt is verified-good.
- Gallery search: trgm first; rides the §7.2 embedding store when it lands.

### 9.3 Suggested follow-up queries

The model emits 2–4 suggestions as a structured block in the same response (zero extra calls); they are then re-ranked/replaced by **verified** similar questions from the gallery + semantic cache, and **filtered by the org's entitlements**. Rendered as clickable chips; also powers the empty-state ("what can I ask?").

### 9.4 Streaming

Plain SSE from ASP.NET (`text/event-stream`; SignalR `/notifications` is the fallback transport). Event protocol:

| event | payload |
|---|---|
| `progress` | step label ("resolving 'kroger'…", "querying TradeSpend…"), step n/cap |
| `text` | answer token deltas (Anthropic streaming passthrough) |
| `data` | the StructuredReport payload (table/chart) |
| `suggestions` | the follow-up chips |
| `done` | tokens, cost, sql-used, timing |
| `error` | user-safe failure shape |

FE consumes with `fetch` readers/`EventSource` (not axios). The loop's middle turns are tool calls (no user prose) — `progress` events are what keep 15–45 s multi-step runs feeling alive.

## 10. The quality program (what "no compromise" means operationally)

1. **Golden eval set** — grows from day one: seed 20–30 real questions incl. deliberately misspelled/ambiguous entities and every derived-metric scenario; every production wrong answer adds one. Run against the prod restore; score answered/wrong/refused-correctly + steps + cost.
2. **Feedback flywheel** — thumbs up/down on every answer (`AskFeedback`); thumbs-up feeds the semantic cache; thumbs-down opens a diagnosis (the audit log holds the exact SQL — minutes, not hours), and the fix is one catalog sentence + one eval question. Six months in, the catalog is the company's most valuable business-knowledge artifact.
3. **Gates** — the eval run gates every prompt, catalog, model, or effort change; the drift test gates schema changes; reconciliation tests gate Tier-2 views; sampled short-circuit answers are re-verified.
4. **Dashboards** — cost/question, steps/question, cache-hit rates, thumbs ratio, eval pass rate — all queryable from the audit tables.
5. **Presentation contract** — every numeric answer states period, scope, and source (the SQL or tool + row count), names any entity disambiguation it made, and chooses table vs chart deliberately. Refusing with "here's what I'd need" beats a confident wrong number — refusal correctness is a scored eval dimension.

## 11. Code layout and API surface

```
Modules/AskCaboodle/
├─ Modules.AskCaboodle.Domain/            AskSession, AskMessage, AskToolCall, AskFeedback,
│                                         PinnedReport, Prompt, PromptShare   : AuditableEntity
├─ Modules.AskCaboodle.Application/       Ask/AskQuestionRequest.cs (house style: request+validator+handler)
│                                         Sessions/, Pins/, Prompts/, DTOs/
│                                         Agent/ (IAgentLoop, ILlmClient, tool contracts, prompt assembly)
└─ Modules.AskCaboodle.Infrastructure/    AnthropicLlmClient, SqlGateway (own RO Npgsql),
                                          EntityRegistry, SchemaCatalogProvider,
                                          EmbeddingStore (pgvector), Startup.cs
```

Wiring: sln, API.csproj, Modules.Shared.Infrastructure reference, ModuleStartup, **Dockerfile COPY list**. New EF migrations: RO role + grants, `ask` schema, pgvector, audit/pin/prompt tables.

`AskCaboodleController` → `/api/v1/askcaboodle`:

| Endpoint | Purpose |
|---|---|
| `POST ask` (SSE) | `{question, sessionId?, promptId?}` → event stream (§9.4) |
| `GET sessions`, `GET sessions/{id}` | history |
| `POST feedback` | thumbs + optional note |
| `GET/POST/PUT/DELETE prompts`, `POST prompts/{id}/share` | gallery |
| `GET/POST/DELETE pins`, `GET pins/{id}/render` | pinned reports (render = re-execute → StructuredReport) |
| `GET suggestions` | empty-state suggestions |

All actions carry authorization attributes from the first commit (phase 1 `[MustHavePermission]`; GA `[RequireModule]`).

Testing: loop orchestration unit-tested against scripted `ILlmClient` (happy path, error-retry, cap exhaustion, parallel tools); SqlGateway hammered (multi-statement, non-SELECT, `;`-smuggling, LIMIT, truncation); registry and period-resolution tests; reconciliation + drift + eval harness run against the prod restore (not part of unit coverage gates).

## 12. Dependencies and sequencing

- **IAM v2 is a prerequisite for GA only.** 1a–1c proceed now, admin-only, in parallel with the IAM implementation. Pin/gallery schemas are org-aware from day one (columns exist; enforcement arrives with the resolver) — no rework at GA.
- The RO role's deny-list grows in the same PRs that add IAM tables (§8.1) — one line in each migration review.
- Old Intelligence endpoints live until the web FE's `ask-caboodle` module repoints; then they and the modules-resolution baseline entries retire together.
- Rotate the committed DB/API credentials (IAM plan Phase 0.5) — a read-only role is only meaningful if the superuser password isn't in git history.

## 13. Deliberately not building

Intent/context classifiers (the model routes itself; deletes 4 of the old 6 calls) · a query-plan DSL + compiler (SQL is the plan language; Postgres is the validator) · **schema-RAG** (114 tables fit a cached catalog; retrieval-before-reasoning fails silently — the semantic cache in §7.2 is the only embedding use, matching language to language) · the MasterEntities sync table (owner-confirmed; live registry instead) · fine-tuning (schema knowledge belongs in an editable prompt) · a multi-model cascade on day one (prompt caches are model-scoped; one model at tuned effort wins until evals justify more).

## 14. Open questions

| # | Question | Recommendation / owner |
|---|---|---|
| Q1 | Remaining derived-metric scenarios ("couple of scenarios" — one captured: promotion cases/revenue → Tier 3) | Owner lists them; each = tier + eval question |
| Q2 | Fiscal vs calendar quarters; week definitions | Business decision; goes verbatim into the glossary |
| Q3 | Ask Caboodle module slug + audiences for the catalog (GA) | e.g. `ask-caboodle`, both audiences; Platform Admin entitles per org |
| Q4 | Embedding vendor for §7.2 (Anthropic doesn't ship one) | Voyage or OpenAI embeddings; small, swappable surface |
| Q5 | Pin sharing at GA: personal only vs org-shared | Ship personal; add org visibility flag later |
| Q6 | Per-org question quotas as a commercial lever | Decide with pricing; the audit table already measures usage |
| Q7 | Anthropic C# SDK on net6.0 | Spike verifies; HttpClient wrapper is the fallback |
| Q8 | Data residency/provider exposure statement for customers (rows go to the LLM API) | Needed before GA marketing; truncation + PII column excludes shrink surface |
