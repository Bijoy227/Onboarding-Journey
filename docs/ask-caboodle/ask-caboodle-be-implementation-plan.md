# Ask Caboodle — Backend Implementation Plan (1b · 1c · GA Brand + Broker · Python Analysis)

Status: approved scope 2026-10-11 · executes in a new session
Design: [`ask-caboodle-design.md`](ask-caboodle-design.md) (the *why*); this file is the *how and in what order*.
Out of scope: forecasting and promotion insight (design §13.2) — not now.

---

## 0. How to execute this plan (read first)

**Working agreement (from the owner):**

1. **One work package at a time.** Before starting a package, post its short plan + open decisions and **wait for the owner's go-ahead**. "Can we do X?" is a question, not a go-ahead.
2. Implement on `feature/ask-caboodle` → `dotnet build caboodle.sln` (0 errors) → `dotnet test caboodle.sln` (all green) → owner reviews → **commit with a one-line message**:
   `Update - Ask Caboodle <package id> - <what changed>` (no Jira ticket for Ask Caboodle; no co-author trailer, owner wants one line). Never push unless asked.
3. **Never connect to production or staging** (DB, servers, configs) unless the owner asks for that specific action. Local `caboodle_dev` only.
4. Before deleting code or dropping tables: show the inventory, wait for confirmation.
5. Any step that spends API money beyond a single smoke question (eval runs, model comparisons): state the expected cost and get approval first.
6. House conventions (BE `CLAUDE.md`): request + validator + handler in one file; DTOs in their own files; `DefaultIdType` ids; open enums start at 5 with gaps of 5; no XML doc comments; full variable names; avoid N+1; ≥ 90 % coverage on touched projects; controller route = class name.

**Starter prompt for the new session** (since 2026-10-13, the handoff doc carries the current state, money rules and helper scripts):
> Read `docs/ask-caboodle/ask-caboodle-next-session.md`, then §0 and §8 of `docs/ask-caboodle/ask-caboodle-be-implementation-plan.md` in `D:\Fork\Onboarding-Journey`. The backend is `D:\Fork\Caboodle BE Repository\caboodle.backend`, branch `feature/ask-caboodle`. Start with the package marked "next" in §8: post its plan and open decisions first, then wait for my go-ahead.

---

## 1. Current state (as of 2026-10-11)

### 1.1 Repository and branch

| Item | Value |
|---|---|
| BE repo | `D:\Fork\Caboodle BE Repository\caboodle.backend` (.NET 6, C# 10, Postgres, EF Core 6, MediatR, Hangfire) |
| Branch | `feature/ask-caboodle` — pushed once, at B2 (`origin/feature/ask-caboodle` = `940365b8`); every later commit is local only. Don't push unless the owner asks. |
| Base | `origin/feature/CS-1770-iam-service-product-spec` @ `cba9c60d` (CS-1770 IAM foundation + latest `develop` + the IAM module work); since 2026-10-12 also `origin/feature/CS-1770-iam-service-broker-workspace` @ `3ebc295e` merged in (`b30b387c`) — the junior's finished IAM work. Merge from that branch from now on. |
| Phase 1a commit | `b2b9996a` "Update - Ask Caboodle phase 1a - agent loop with schema catalog, read-only SQL and entity search in the Intelligence module, legacy pipeline and tables removed" |
| Stashes (backups, drop when owner agrees) | `stash@{0}` Intelligence work before alignment · `stash@{1}` old separate-module version on `feature/ask-caboodle-phase1` |
| Release flow (owner) | current `develop` → live; IAM → `develop` → live; updated `develop` merged into `feature/ask-caboodle`; Ask Caboodle merges last. Owner manages git/migrations merges. |
| FE | `D:\Fork\Caboodle FE Repository\caboodle.web` (Next 14, antd, echarts, react-query). FE work waits for the owner's combined mockup (from artifacts Workbench / Answers / Insights Board); replaces route `(brand)/[brandID]/ask-caboodle`, branch from `master`. API contract: BE `docs/AskCaboodle-FE.md` (renamed from `AskCaboodle-Phase1a-FE.md` in B3). |

### 1.2 Databases

| Env | Version | Notes |
|---|---|---|
| Local `caboodle_dev` | PG 17 server | Restored 2026-10-11 from the junior's backup `caboodle_develop_backup_11_oct_2026_1_18_PM` (pg_dump 18 custom archive); all migrations applied incl. `20261011092008_RemoveLegacyIntelligenceTables`; 0 pending. Previous DB kept as `caboodle_dev_before_restore_20261011`. Connection string: `appsettings.Development.json` → `DatabaseSettings:ConnectionString` (localhost). |
| Staging | aligned with production (owner, 2026-10-11) | do not connect |
| Production | RDS `caboodledb-prd`, PG 15.17 | do not connect; `security_invoker` views available (PG 15+) |

Local data facts used by the catalog (profiled on the dev restore): sales 2023-01 → 2026-09, ~1.6 M rows; `RetailerName` ↔ `CRM.Retailers.CorporateName` matches 99.9 % of dollars; `Banner` text join loses ~17 % of dollars; `Units` null on ~24.5 % of rows; `RetailerName = 'Confidential'` = KeHE-masked retailers; monthly report stores Types 1–6 only; raw UPC equality matches 100 %. Demo brand with most data: Bubbies Ice Cream (`0303a5ee-9913-47ef-ba6d-cdea180a723f`). Data-quality note: local Feb and May 2026 KeHE/Sprouts rows are identical (likely a duplicate upload).

### 1.3 What phase 1a delivered (DONE)

All in `caboodle/src/Modules/Intelligence/Modules.Intelligence.Application/` unless noted.

| Area | Implemented |
|---|---|
| Legacy removal | Old 6-step pipeline, `Modules.Intelligence.Domain` project, `IntelligenceChatController` and its 6 endpoints, OpenAI/Gemini config removed; tables `ChatSessions`, `ChatMessages`, `QueryAuditLogs`, `LlmModelPricings`, `CatalogSnapshots`, `MasterEntities` dropped by migration `RemoveLegacyIntelligenceTables`. The `Intelligence` schema remains (empty) for 1b tables. |
| Endpoint | `Hosts/API/Controllers/Modules/Intelligence/AskCaboodleController.cs` → `POST /api/v1/askcaboodle/ask` (SSE). Gate: `[MustHavePermission(Execute, IntelligenceTools, Admin)]` (existing "Run Intelligence Tools", ADMIN). `ServerSentEventSink.cs` writes events. |
| Events | `session`, `progress`, `data` (table/chart payload), `suggestions`, `text` (markdown, whole answer), `done` (tokens, cost, model, SQL used), `error` — `DTOs/AskEventDtos.cs` |
| Agent loop | `Agent/AskAgent.cs`: append-only conversation; tools run in parallel; caps MaxSteps 12, wall clock 180 s; refusal → error event; max_tokens note; `done` with cost estimate. User message carries today's date + brand context (`AskAgent.BuildUserMessage`). |
| Sessions | `Agent/AskSessionStore.cs` — **in-memory** (IMemoryCache, 60 min sliding), per user + brand; results `r1…` per session (bounded 30). |
| LLM | `Llm/AnthropicConversation.cs` via official `Anthropic` NuGet 12.55.0 (beta messages API): model `claude-opus-5-5`, adaptive thinking, effort `medium`, server-side refusal fallback (`Fallbacks = new Default()` + beta `server-side-fallback-2026-07-01`), system prompt cached (ephemeral breakpoint). Thinking blocks echoed back unchanged (signatures preserved). Non-streaming calls. |
| Tools | `get_table_info`, `run_sql`, `search_entity`, `present_answer` (`Tools/`). |
| SQL safety | `Sql/SqlGuard.cs` (single SELECT/WITH, no stacked statements, catalog-table allowlist, sensitive schemas + dangerous functions blocked); `Sql/NpgsqlSqlGateway.cs` (READ ONLY transaction, `statement_timeout` 15 s, wrapped LIMIT, rollback). Uses the main connection string unless `IntelligenceSettings:ReadOnlyConnectionString` is set. |
| Entity search | `Entities/EntityRegistry.cs` (10 types over live tables: Retailer, Banner, Region, Distributor, DistributionCenter, Store, Product, Category, Brand, Promotion) + approved DataHub aliases for retailers; ILIKE + word-fallback scoring (`EntitySearchService`). No pg_trgm yet. |
| Catalog | `Catalog/` embedded YAML (logical name prefix `AskCaboodleCatalog/`): 16 tables, `glossary.yaml`, `join-paths.yaml`, `metrics.yaml`; `SchemaCatalog` renders a byte-stable index (in the cached system prompt) and per-table detail (tool). Tables: Brand.Brands, CRM.{Retailers, Banners, Regions, Distributors, DistributorBanners}, DataHub.StoreListEntries, ProductSpecs.{ProductSpecifications, Categories}, DataUpload.DistributorSalesRecords, TradeSpend.{BrandApprovedMonthlyReport, TradeSpendPromos, TradeSpendPromoEvents}, TradeSpendSandbox.{PromotionFamilies, Promotions, PromotionalEvents}. |
| Config | `IntelligenceSettings` section (`Configuration/IntelligenceOptions.cs`): `ClaudeApiKey` (still committed in Development/Staging appsettings — rotation pending), `Model`, `Effort`, `EnableRefusalFallback`, `MaxSteps`, `WallClockSeconds`, `StatementTimeoutSeconds`, `MaxRowsForModel` 50, `MaxRowsForDisplay` 500, `MaxResultCharactersForModel` 12000, `ReadOnlyConnectionString`, `SessionIdleMinutes`, prices for cost estimate. |
| Tests | `caboodle/tests/Intelligence.Application.Test` — 68 tests, coverage 92.9 % (97.7 % with DB). Includes HTTP-stubbed Anthropic adapter test, DI startup test, opt-in DB gateway test and opt-in live smoke test. Whole solution: 5,193 tests green. |
| Measured | Live question "cases shipped to Sprouts via KeHE by month" → correct (verified by direct SQL), 4–5 model calls, ~18 s, **$0.12–0.14** (Opus 5.5, no conversation caching). |

### 1.4 How to run things

```bash
# from D:\Fork\Caboodle BE Repository\caboodle.backend
dotnet build caboodle.sln
dotnet test caboodle.sln
dotnet test caboodle/tests/Intelligence.Application.Test/Intelligence.Application.Test.csproj

# DB-backed gateway test (local only)
export ASK_CABOODLE_CONNECTION_STRING="<Server=localhost…caboodle_dev from appsettings.Development.json>"

# Live end-to-end smoke (spends ~$0.12 per run — run ONCE, never twice in one command)
export ASK_CABOODLE_LIVE_TEST=1 ANTHROPIC_API_KEY=… ASK_CABOODLE_BRAND_ID=0303a5ee-9913-47ef-ba6d-cdea180a723f \
       ASK_CABOODLE_QUESTION="How many cases did we ship to Sprouts through KeHE each month this year?"
dotnet test caboodle/tests/Intelligence.Application.Test/Intelligence.Application.Test.csproj \
  --filter "FullyQualifiedName~AnswersAQuestionEndToEnd" --logger "console;verbosity=detailed"
rm -rf caboodle/tests/*/TestResults   # coverage artifacts are not gitignored

# Golden eval (B6) — see BE docs/AskCaboodle-Eval/README.md
# Free: every reference still returns its recorded values (needs ASK_CABOODLE_CONNECTION_STRING)
dotnet test caboodle/tests/Intelligence.Application.Test/Intelligence.Application.Test.csproj \n  --filter "FullyQualifiedName~GoldenReferenceTests" --logger "console;verbosity=detailed"
# Paid (≈ $6 per full run on Opus 5.5 — approval per run): writes docs/AskCaboodle-Eval/<date>-<model>-<effort>.md/.json
export ASK_CABOODLE_EVAL=1 ASK_CABOODLE_READONLY_CONNECTION_STRING=… ANTHROPIC_API_KEY=… ASK_CABOODLE_EVAL_BUDGET_USD=7
#   optional: ASK_CABOODLE_EVAL_CASES=Q01,calculator  ASK_CABOODLE_EVAL_MODEL=…  ASK_CABOODLE_EVAL_EFFORT=…
dotnet test caboodle/tests/Intelligence.Application.Test/Intelligence.Application.Test.csproj \n  --filter "FullyQualifiedName~GoldenEvalTests" --logger "console;verbosity=detailed"

# EF migrations (always --context MainDbContext; ALWAYS build first, never use --no-build with remove)
# SAFETY: without ASPNETCORE_ENVIRONMENT=Development, dotnet ef loads appsettings.Production.json (prod RDS).
# Always: export ASPNETCORE_ENVIRONMENT=Development and pass --connection "<local caboodle_dev>" to list/update.
dotnet ef migrations add <Name> --context MainDbContext --project caboodle/src/Database/Migrator/Migrator.csproj --startup-project caboodle/src/Hosts/API/API.csproj
dotnet ef database update --context MainDbContext --project … --startup-project …   # local caboodle_dev (Development env)
```

Starting the API on this branch auto-applies pending migrations to `caboodle_dev` (Program.cs `InitializeMainDbAsync`).

### 1.5 Gotchas learned in 1a (save time)

- **C# 10**: no collection expressions (`[...]`), no primary constructors, no `required`.
- **Anthropic C# SDK**: beta namespace `Anthropic.Models.Beta.Messages` (`MessageCreateParams` is a record → `with` works; `BetaMessageParam`, `BetaToolUnion`, `BetaTool`, `InputSchema`, `BetaThinkingConfigAdaptive`, `BetaOutputConfig { Effort = "medium" }`, `BetaCacheControlEphemeral`, `BetaToolResultBlockParam`, `BetaFallbackBlockParam`). **Assigning `null` to a param property still serializes it** — set optional fields only when used (`parameters with { … }`). `AnthropicClient` has settable `HttpClient`, `MaxRetries`, `BaseUrl` (great for stubbed tests). Find type/member names with PowerShell reflection on `~/.nuget/packages/anthropic/12.55.0/lib/net8.0/Anthropic.dll`, catching `ReflectionTypeLoadException` (`strings` isn't installed). Streaming: `client.Beta.Messages.CreateStreaming(...)` → events with `TryPickContentBlockDelta` etc.; no final-message helper documented for C# — accumulate yourself.
- SDK pulls System.Text.Json 10 / Microsoft.Extensions.AI.Abstractions 10 into a net6 host: works (tests + live), but EF/MSBuild warns "not tested on net6.0". Known risk until the framework upgrade.
- **Opus 5.5 rules**: thinking can't be disabled (effort is the control, default `medium`); forced `tool_choice` any/tool → 400; text between tool calls comes back as thinking blocks (so `present_answer` is called *before* the final text); **preserved thinking — the history must stay append-only** (no editing/removing earlier messages, no changing system prompt or tool list mid-session) or replayed thinking blocks 400/drop and the cache breaks.
- `dotnet sln add/remove` rewrites the Organization solution-folder GUID — check the `caboodle.sln` diff and revert unrelated GUID churn (the branch base uses `{B7C5A362-B312-A468-DA48-161BFD5CEC08}`).
- Shell: paths contain spaces — use `find … -print0 | xargs -0` or quote; never `python -` (Windows stub hangs); appsettings files contain `//` comments (not strict JSON).
- `bare-endpoints-baseline.txt` (API.Test) may only shrink; every controller action needs exactly one authorization attribute.
- RDS/PG: `pg_trgm` is a trusted extension (any DB owner can `CREATE EXTENSION`); creating roles needs `CREATEROLE`.

---

## 2. Cost strategy — lowest price at equal quality

**Principle: quality is fixed by the eval gate; cost is minimized under it.** No change that could affect answers ships without the golden eval (B6) showing no regression versus the current baseline (Opus 5.5, effort medium).

Baseline breakdown (one 4-call question, $0.123): uncached input $0.062 (history re-sent each step) · output incl. thinking $0.034 · system-prompt cache write $0.024 · cache reads $0.003.

| # | Lever | Quality risk | Package | Expected effect |
|---|---|---|---|---|
| L1 | Cache the conversation history too (top-level automatic `cache_control` / moving breakpoint on the last block each turn) | none (mechanical) | B1 | −25–35 % |
| L2 | 1-hour TTL on the stable prefix (system + tools) so the write is shared across users/questions; keep prefix byte-stable (already: tools sorted, date in user message) | none | B1 | −$0.02/question at low traffic |
| L3 | Entitlement/audience context in the first **user** message, never in the system prompt (one shared cache for every org/audience) | none | G3 | keeps L1/L2 effective at GA |
| L4 | Better catalog + verified few-shot examples → fewer steps and retries | positive | B4, C5 | −1–2 calls/question |
| L5 | Tool-result budgets (50 rows / 12 K chars to the model, full data to the UI) — keep; tune by eval | none | done | — |
| L6 | **Effort tuning** (low vs medium) per question class | eval-gated | B7 | −20–40 % output |
| L7 | **Model choice** Opus 5.5 vs Sonnet 5.5 (½ price) vs Haiku 5.5 — pick the cheapest that matches baseline on every eval category | eval-gated | B7 | up to −50 % |
| L8 | Zero-LLM paths: pinned reports re-execute stored SQL (no model call); suggestions/gallery are static; session titles from the first question text | none | C2, C3, C4 | removes recurring cost |
| L9 | Strict short-circuit for near-identical verified questions (re-run stored plan; one small templated answer call) | eval-gated | C5 (phase 2 of it) | large on repeat questions |
| L10 | Programmatic tool calling for analysis keeps large row sets in the sandbox, not in context; code execution free tier (1,550 h/month/org) | none | A2 | analysis stays cheap |
| L11 | Web search `max_uses` 3, domain blocklist, web tools declared per session only when enabled for the org | none | C6 | caps $10/1k searches |
| L12 | Guardrails: per-user daily question cap, wall-clock + step caps, cost recorded per turn, dashboard + alert | none | B8, C8 | prevents runaway spend |
| — | Long sessions: use server-side context editing / compaction (append-only compatible) instead of trimming history | none | B3 note | avoids cache + thinking breakage |

Target after B1 + B7 (owner decides at the B7 gate): **≤ $0.05 per typical question at equal eval score**; pinned-report views $0.
**Met in B7b (2026-10-14):** Sonnet 5.5 medium averages $0.040 per answer on the golden set at Opus-level quality (Opus 5.5 medium: $0.112).

---

## 3. Phase 1b — Engine (admin-only, production-grade)

### B0 — Preflight (no code)
- Verify branch/commit (§1.1), `dotnet build`, `dotnet test`, `migrations list` (0 pending), one live smoke question.
- Confirm decisions D1–D4 (§7) with the owner.
- **Done when:** owner confirms state and decisions.

### B1 — Prompt-cache optimization (cost L1, L2)
- `AnthropicConversation`: add conversation caching (top-level `CacheControl = new BetaCacheControlEphemeral()` on `MessageCreateParams`, or a breakpoint on the last content block each turn — max 4 breakpoints total incl. the system one); config `IntelligenceSettings:PrefixCacheTtl` (`5m` | `1h`, default `1h`) applied to the system breakpoint.
- Keep strict append-only behavior; verify `usage.cache_read_input_tokens` grows across steps.
- Tests: stubbed-HTTP test asserts request JSON carries the breakpoints; usage mapping.
- Measure: one live question before/after (state cost first); record numbers in this file.
- Cost estimate: split cache writes by TTL (`usage.cache_creation` 5m / 1h) and price 1h writes at 2× input ($8/MTok on Opus 5.5) via a new option; `done` event fields unchanged (no FE contract change). Invalid `PrefixCacheTtl` fails at startup.
- Breakpoints: explicit 1h marker on the system block (caches tools + system) + top-level automatic 5m for the conversation tail (1h entries must precede 5m ones).
- **Owner decisions 2026-10-12:** default `PrefixCacheTtl` = `1h` (approved); two paid runs approved (~$0.25: B0 smoke = "before", one "after").
- **Done when:** same answer, lower cost, numbers recorded.

### B2 — Read-only DB role + trigram search
- Migration `AddAskCaboodleReadOnlyRole`:
  - `CREATE ROLE askcaboodle_ro NOLOGIN` (idempotent `DO $$ … $$`); `GRANT USAGE` on needed schemas; `GRANT SELECT` on **exactly the catalog tables** (generated list); `ALTER ROLE … SET default_transaction_read_only = on`, `statement_timeout = '15s'`. No grants on Identity, Email, Auditing, Organization secrets (Invitations, VerificationCodes, AuditEvents), Hangfire.
  - A login role per environment is created by ops (`askcaboodle_app LOGIN PASSWORD … IN ROLE askcaboodle_ro`) — passwords never in migrations. Local: script in `docs/` to create it on `caboodle_dev`.
  - `CREATE EXTENSION IF NOT EXISTS pg_trgm` + GIN trigram indexes on registry name columns: `CRM.Retailers.CorporateName`, `CRM.Banners.BannerName`, `CRM.Regions.RegionName`, `CRM.Distributors.DistributorName`, `CRM.DistributionCenters.Warehouse`, `DataHub.StoreListEntries.StoreName`, `ProductSpecs.ProductSpecifications.Name`, `ProductSpecs.Categories.Name`, `Brand.Brands.Name`, `TradeSpend.TradeSpendPromos.PromoName`, `TradeSpendSandbox.PromotionFamilies.Name`.
- `IntelligenceSettings:ReadOnlyConnectionString` per env (Development uses the local login role).
- `EntitySearchService`: add `similarity()` scoring (`% ` operator / threshold 0.3) for misspellings; keep ILIKE/exact paths.
- Test: catalog-vs-grant consistency test (every catalog table appears in the grant list and vice versa) — parses the migration SQL or a shared constant.
- **Decision D5:** does the app DB user have `CREATEROLE` in each env? (If not, ops runs the role SQL; migration only grants.)
- **Done when:** agent works on the RO connection locally; writes fail at the DB; misspellings ("wallmart", "keyhe") resolve.

### B3 — Persistence: sessions, audit, feedback
- Re-add `Modules.Intelligence.Domain` (csproj, sln — watch GUID churn — Dockerfile COPY, `Modules.Shared.Infrastructure` reference). Entities (`AuditableEntity`, `DefaultIdType`, schema `Intelligence`):
  - `AskSession { UserId, OrganizationId?, BrandId?, Title (first question, truncated), Model, LastActivityOn }`
  - `AskMessage { SessionId, Sequence, Role, Kind (question | answer | transcript), Content (text/markdown), TranscriptJson (jsonb, the exact assistant/user blocks incl. thinking signatures for replay), Tokens…, CostUsd, Steps, ElapsedMs }`
  - `AskToolCall { MessageId, Sequence, Tool, InputJson, Sql, DurationMs, RowCount, IsError, ErrorText }`
  - `AskFeedback { MessageId, UserId, Rating (up | down), Note }`
- Session store: in-memory cache stays the hot path; every turn appended to DB (append-only); on cache miss rebuild `ILlmConversation` from `TranscriptJson` (blocks replayed **verbatim**). If a transcript can't be replayed (e.g. model changed), start a fresh conversation seeded with prior Q&A text only.
- Endpoints on `AskCaboodleController`: `GET sessions`, `GET sessions/{id}` (questions, answers, data payloads), `DELETE sessions/{id}` (soft delete, owner only), `POST feedback`. All with the phase-1 permission attribute.
- Audit every turn (question, tool calls, answer, tokens incl. cache, cost, model, effort, brand/org context).
- Long sessions: enable server-side context editing (`clear_tool_uses`) or compaction rather than trimming (append-only rule).
- Update `docs/AskCaboodle-Phase1a-FE.md` → rename to `AskCaboodle-FE.md` with the new endpoints.
- **Owner decisions 2026-10-12:** D11–D15 (§7) approved as recommended.
- **As built:** one `AskMessage` row per question + answer (D11); `TranscriptJson` is `text`, not `jsonb` (jsonb reorders keys; replay must resend the stored blocks unchanged); each message stores the prompt fingerprint (SHA-256 of model + system prompt + tool definitions) and whether it started a conversation — replay takes the messages from the last start onwards, a fingerprint mismatch starts a fresh conversation seeded with the last 10 questions and answers as text; the cached conversation is used only while its exchange count matches the database (a second API instance may have answered); a failed save drops the cached copy; result ids continue after the highest one in the replayed transcripts; `done` gained `messageId`. Context editing defaults: trigger 100 K input tokens, keep 6 tool results, clear at least 20 K (`ContextEditingTriggerTokens` = 0 turns it off).
- **Done when:** sessions survive an API restart; audit rows written; tests ≥ 90 %.

### B4 — Catalog: Gold tier + drift test + profiling
- Extend the catalog to the ~25–30 priority tables (owner reviews the list): SPINS (`DataUpload.SpinsRecords`, `SPINSItemsRanking`, `SPINSStoresInsight`), `CRM.BannerSKUs`, `CRM.DistributorDcs`, `CRM.RetailerPromoRules`, `ProductSpecs.PriceList`, distributor APL, `TradeSpendSandbox.SandboxMonthlyReport`, `TradeSpend.TradeSpendPromoNotes`, and the broker-owned tables needed for GA (MarketOverview, CategoryReview, CategoryReviewCalender, BrandReport) — each with grain, meanings, enums, joins, rules, 1–2 verified examples, and a `module:` slug (needed by G3/G4).
- **Drift test** (unit test): parse `MainDbContextModelSnapshot.cs`; every catalog table/column must exist; fails CI when a migration renames/drops something without a catalog update.
- **Profiling script** (`docs/ask-caboodle/catalog-profiling.sql` or a dev-only test): row counts, date ranges, null rates, orphan rates for every catalog join; results feed `verified` flags.
- Owner answers Q15 (design doc): "the" POD definition; reporting version as default plan; any fiscal calendar.
- **Done when:** drift test green; new tables answer sample questions correctly.
- **Owner decisions 2026-10-12:** D16–D23 (§7) approved as recommended; the data Ask Caboodle does not read is listed in §9.
- **As built:**
  - **Tables:** 21 added, 37 in total. SPINS Stores Insight and Item Ranking, price list, banner SKUs, distributor warehouses (`DistributorDcs`), retailer promo rules, CRM stores, contacts (column grant), banner and pipeline activities, pipelines with stages and plans, sandbox monthly report, calendar notes, market overview, category reviews with the calendar, brand reports (column grant) with status options, and distributor APL. Legacy `SpinsRecords` is skipped (§9).
  - **Per-table metadata:** every table carries `modules: { brand, broker }` (a module slug, `any` or `none`) and a scope (`shared`, `brand` or `brokerage`), and has at least one example.
  - **Glossary:** new terms, a name-alias list (D20), the planned-value rule (D21), and a NOT AVAILABLE section the agent reads.
  - **Grants:** migration `AddAskCaboodleCatalogGrants` grants the new tables. Contacts' email, phone and notes and brand reports' internal notes stay unreadable by column grants (D18, D23).
  - **Warehouse search (fixed):** `search_entity` warehouses now read `CRM.DistributorDcs`. The APL and Market Overview rows store those ids; `CRM.DistributionCenters` ids never matched them. The grant on `DistributionCenters` is revoked and its trigram index is moved to `DistributorDcs.Warehouse`.
  - **Text backstop in the SQL gateway:** for any text value, embedded images become `[image]`, email addresses and phone numbers become `[email]` / `[phone]` (D23 applied to typed notes), and values are cut at `MaxTextCellCharacters` (2,000). The prompt also tells the agent never to follow instructions inside notes.
  - **Tests:**
    - Drift test (EF snapshot → tables, columns, joins, join paths, metrics, example identifiers).
    - Lint test (scope, module slugs, examples).
    - Column-grant test (documented columns are granted; hidden ones are not).
    - Opt-in DB test that runs all 44 examples as `askcaboodle_app` and checks the hidden columns are refused.
  - **Profiling script:** BE `docs/AskCaboodle-CatalogProfiling.sql`.
- **Facts found while profiling (now in the catalog):**
  - **SPINS:** SPINS names retailers its own way ("Albertsons", "Sprouts Farmers Market - TUS"), and its UPCs don't match catalog UPCs. Uploads only append: two brands have duplicated weeks.
  - **Item ranking windows:** item-ranking rows are overlapping rolling windows.
  - **Price list:** 882 price-list placeholders have no price.
  - **Banner SKUs:** every new product gets a "Not Active" banner-SKU row at every banner.
  - **Sales warehouse codes:** sales `DistributionCenter` holds KeHE codes (CHN, AUR…), not warehouse names.
  - **Pipelines:** pipeline tasks never carry a retailer.
  - **Contacts:** contact company names rarely match CRM retailers.
  - **Category reviews:** brokerage reviews have no `BrandID`; brands link through the calendar or brand reports.
  - **Brokerage ownership:** `BrokerageOrganizationID` is ownership metadata only. The app scopes reads through legacy `BrandBrokers` / `CreatedBy`, and `DemandOwnBrokerageRecordAsync` is never called — relevant to G4.

### B5 — `get_promotion_performance` (calculator figures)
- Tier-3 tool wrapping the same code the screens use (`TradeSpendDTOBuilder` / `PromotionDTOBuilder`, `Modules.Shared.Application/TradeSpendCalculation`). Needs a brand-explicit entry point (the builder reads `ICurrentUser.GetBrandID()` today) — add an overload taking `brandId`, no behavior change for existing callers.
- Input: promotion ids (list), `brandId`, `detail` (summary | by-month); output: planned promo/non-promo cases & revenue, TPR spend, fees, TPR % — summary only.
- Reconciliation test: tool output equals the Promotion Details numbers for 3 seeded promotions.
- Catalog: replace "you cannot calculate them" rule with the tool.
- **Done when:** questions like "what's the planned TPR spend of our spring Sprouts promotion" match the app.
- **Owner decisions 2026-10-12:** D24–D29 (§7). Sandbox promotions are included (D25). The monthly report's refresh date is always stated (D26). There is no limit on promotions per call (D28, answered with measurements).
- **As built (no changes outside Ask Caboodle):**
  - **How it calls the calculator:** Ask Caboodle references `Modules.TradeSpend.Application` and `Modules.TradeSpendSandbox.Application`. `PromotionCalculator` runs `TradeSpendDTOBuilder.GetTradeSpendPromoDTO` for approved promotions and `PromotionDTOBuilder.GetPromotionDTO` for sandbox versions — the screens' own methods — under a `BrandScopedCurrentUser` adapter set to the promotion's own brand (D24).
  - **Isolation:** each call opens its own DI scope, because tools run in parallel and must not share the request's DbContext.
  - **Tool inputs:** `get_promotion_performance` takes `promotion_ids`, `source` (approved by default, sandbox on request), `months` (the screen's month filter), `banner_ids` and `breakdown` (none, product or event).
  - **Tool output:** totals per promotion and combined (cases, revenue, TPR spend, AD/TPR fees, promotion fees, total spend, net $, TPR %, trade rate), a result table for `present_answer`, and warnings:
    - promotions that overlap at the same retailer and dates (D27);
    - simple promotions, which have no calculator figures and show AD/TPR fees only;
    - ids not found;
    - year-round EDLP events not counted when a month filter is used.
  - **Model text:** the 25 largest promotions are listed and the rest go into the totals (to save tokens).
  - **Time limit:** a 90 s budget (`PromotionCalculationSeconds`) returns partial results with a note. It is a safety net only: measured, all 73 of Bubbies' Q4 promotions take 0.7 s, and the largest promotion (3,031 events) 27 ms.
  - **Catalog and prompt:** rule 4 now points to the tool. The calculator-figures metric gives the screen's definitions. The promotion tables have id-selection rules and an example. The glossary has `monthly_report_refresh` and `overlapping_promotions`. "Promotion fees" is narrowed to individual fee lines in §9.
  - **Tests:** unit tests for the tool, calculator and adapter. Opt-in DB **reconciliation** checks the tool against the screens' own handlers: approved for 3 Sprouts promotions, full year and Q4; sandbox for 5 versions. Every total and both percentages are equal. There is also a timing test.
- **Data finding:** Bubbies has two approved Sprouts 2026 promotions, the original plan and a re-forecast. They come from separate sandbox families and their Q4 figures are identical (5,172 promo cases, $40,136). The approved monthly report may count both — worth checking with the brand.

### B6 — Golden eval set + harness
- `caboodle/tests/Intelligence.Application.Test/Eval/golden.yaml`: 25–30 questions across categories — sales totals/trends, retailer/banner/product filters, misspellings, relative dates (Q2, last quarter, YTD), metrics (stores, POD, velocity), plan vs actual, promotions listing, calculator figures (B5), ambiguity → clarification, unanswerable → honest refusal.
- Each case: question, brand, **reference SQL** (ground truth computed live on `caboodle_dev`), expected key numbers with tolerance, expected behavior (answer | clarify | refuse), required entity mention.
- Harness (opt-in like the live test): runs every case, deterministic scoring (numbers present within tolerance, behavior matches), records steps, latency, tokens, cost; writes `docs/ask-caboodle/eval-results/<date>-<config>.md`.
- Cost per full run ≈ 30 × $0.08–0.12 ≈ $3 on Opus — **approval per run**.
- **Done when:** baseline report committed (current config).
- **Owner decisions 2026-10-13:** D30–D36 (§7) approved as recommended — 45 cases in 7 groups, today fixed at 2026-10-12, a claims check by a fixed judge model, one run per case with failed cases re-run once (flaky), reports in the BE repo `docs/AskCaboodle-Eval/`, $7 cap for the harness check plus the baseline.
- **As built (test project only; no app code changed):**
  - **Question file:** `Eval/golden.yaml`, 45 cases in 7 groups, asked as of 2026-10-12, for Bubbies and David. Each case has:
    - a reference: SQL returning one row, or promotion sets passed through `PromotionCalculator`;
    - rule checks: numbers within 1 % in the answer or a shown table, mentions, tables read, tools used or not used, SQL not attempted;
    - notes for the claims check;
    - the values recorded when it was written.
  - **Harness:** `GoldenEvalTests`, opt-in with `ASK_CABOODLE_EVAL=1` and a required `ASK_CABOODLE_EVAL_BUDGET_USD` cap.
    - It sets up the agent the way the live smoke test does, on the read-only login, with today pinned.
    - The first case runs alone (it writes the prompt cache), then 4 run at a time.
    - A case starts only when the money spent plus $0.30 reserved for each case in flight stays under the cap; otherwise it waits for those cases, or is skipped.
    - Failed cases are re-run once (flaky). Nothing is written to the database.
  - **Claims check:** Opus 5.5 at low effort, through a `report_claims` tool. It sees the case notes, the reference, every query and entity-search result the agent got, the tables it showed, and the answer. It lists claims the data contradicts, figures nothing supports, and claims the notes call wrong. It ignores data-source caveats and figures cited only to explain what wasn't done.
  - **Prices:** a price table per model (Opus, Sonnet and Haiku 5.5, checked 2026-10-13), so B7 needs no harness change.
  - **Reports:** BE `docs/AskCaboodle-Eval/` (with a README): Markdown, plus JSON without query rows (~0.6 MB per run).
  - **Free tests:** `GoldenReferenceTests` (every reference still returns its recorded values) and 65 unit tests (question-file validation, number reading, every check, claims evidence and parsing, runner budget, waiting and re-runs, report, live adapter with a scripted model).
- **Data findings (B6):**
  - **KeHE January–May 2025:** Bubbies' rows hold units in `CasesShipped` (1.1–1.5 units per case, against 8.0 from June 2025). 2025 and all-time case totals are inflated.
  - **Approved monthly report:** a retailer's actuals repeat under each of its banner names (Sprouts × 3). Summed actuals are far above shipments: January 2026 shows 108,282 against 41,986 shipped.
  - **B4's list-price check:** it answered about the Mini Mochi item, not the main Red Ripe Strawberry 8-pack ($3.96 per unit / $31.68 per case since December 2024).

### B6.1 — Answer accuracy (before B7)
- Added by the owner on 2026-10-13 after the B6 review: fix the agent errors the golden set found before comparing models (D37–D40).
- **As built:**
  - **System prompt, four answer rules:**
    - check a pattern ("every month", "steadily", "smallest", a range) against every row before stating it;
    - compute every stated figure in SQL or take it from a tool, never by hand;
    - name only entities that a query or search returned;
    - when several of the brand's products match a flavor, use the right one(s) and name the others.
  - **System prompt, brand environment (D39):** when a current brand is set, never offer, suggest or use another brand's data; other brands only when the user asks and their access allows it.
  - **Entity search:** a name ending with the term (at a word boundary) scores like a prefix match (0.85), so "Bubbies Mochi Ice Cream - Red Ripe Strawberry" ties with "Red Ripe Strawberry Mini Mochi (15 pc)".
  - **Harness:** the claims check now also sees what the promotion calculator returned. Its figures had looked invented in two answers. Q19's wording check is looser.
- **Results:** 9 targeted cases ($1.40), then a full run, Opus 5.5 medium, no re-runs ($5.97): 37/44 (Q33 skipped at the cap), every rule check passed. The wrong-product, invented-name and three pattern errors are fixed. Pattern overstatements still appear (4 cases, against 5), and one date slip appeared. Report: BE `docs/AskCaboodle-Eval/2026-10-13-claude-opus-5-5-medium-b6.1.md`. This run is the B7 baseline.

### B7 — Model / effort tuning (cost L6, L7) — eval-gated
- **Owner decision D40 (2026-10-13, budget ≈ $14 for B6.1 + B7, client-paid):** reduced matrix — Sonnet 5.5 medium and Haiku 5.5 medium only, compared with the B6.1 run; no automatic re-runs; cases that differ from the baseline are re-checked with the money left. Opus low and Sonnet high are dropped unless more testing money becomes available.
- **Results (2026-10-13, $4.83):**
  - Opus 5.5 medium (baseline): 37/44, $0.104 and 25 s per answer.
  - Sonnet 5.5 medium: 35/45, $0.039 and 14 s. It drops in Distribution and Calculator, confirmed by a re-check of the 7 questions that differed: 4 failed again with the same errors (store key, net-revenue definition, promotion listing, per-distributor store counts).
  - Haiku 5.5 medium: 33/45, $0.003 and 13 s. It drops in four groups (wrong quarter, arithmetic, one step-limit timeout).
  - Neither meets D8. **Recommendation: keep Opus 5.5 at medium effort, with no setting change.** Sonnet is the route to ≤ $0.05 once its specific gaps are fixed in the catalog or prompt and it is re-tested. Comparison: BE `docs/AskCaboodle-Eval/2026-10-13-b7-model-comparison.md`.
  - The harness has a new switch for models without a refusal fallback (`ASK_CABOODLE_EVAL_REFUSAL_FALLBACK=0`).
- Run the eval matrix (owner approves budget, ≈ $8–12 total): Opus 5.5 {medium, low}, Sonnet 5.5 {high, medium}, optionally Haiku 5.5 {medium}.
- Pick the cheapest config whose pass rate ≥ baseline overall **and** in every category; present the table to the owner; owner decides; set `IntelligenceSettings:Model/Effort`.
- Note: switching model starts fresh conversations (thinking blocks are model-bound) — fine because sessions are per question flow.
- **Done when:** decision recorded here + config updated.

### B7b — Sonnet readiness
- Added by the owner on 2026-10-13 after B7: fix the causes of Sonnet's repeat errors, then compare again (D41–D45).
- **As built:**
  - **Name search:**
    - promotions show their active event count, first and last event dates and retailers;
    - approved promotions rank above sandbox families on equal scores;
    - strong matches of every type come before weak ones, and within each the types take turns, so stores can't crowd promotions out of the 10-line list;
    - the search says how many matches it cut, and that the rest must be listed before answering or asking.
  - **Calculator tool:** a definitions line (net = total revenue − total spend). It accepts a one-word choice sent as a list or as JSON text.
  - **Glossary (always in the prompt):** store key, de-duplicated store counts of every row (as in the app), net revenue, choosing promotions by event dates (default: the one covering today), period comparisons with COALESCE, "carry" with no period = latest month, last-quarter example, voids.
  - **Prompt:** "most months" is a figure and is computed in SQL.
  - **Table details:** each table's rules render before its columns.
    - New examples: a cross-distributor store count, voids, and every approved promotion at a retailer with its dates.
    - The Monthly Report has a caveat that its actuals can differ from shipments.
    - The KeHE fractional-cases note is corrected.
  - **Model:** the default is `claude-sonnet-5-5` with Sonnet 5.5's prices, and Development and Staging settings are changed to match.
  - **Harness:** the claims check sees the name-search output the agent saw. Its row note says "only the first 40 are included here".
- **Results** (BE `docs/AskCaboodle-Eval/2026-10-14-b7b-sonnet-readiness.md`):
  - Opus 5.5 medium 41/45 ($0.112, 26 s); Sonnet 5.5 medium 39/45 ($0.040, 14 s); Sonnet 5.5 high 38/45 ($0.049, 17 s).
  - Re-checks: three Sonnet failures were noise. Two were fixed and verified on both models (Q06 period comparison, Q09 store count). Q03 fails on both models.
  - On confirmed results Sonnet medium matches or beats Opus in every group, so the app switched to it (D45).
- **Data issues found:** DI8–DI10 in `ask-caboodle-data-issues.md`.

### B8 — Guardrails
Decisions D46–D58 (owner, 2026-10-14). The original scope was: a per-user daily cap, one question at a time per session, a per-organization budget hook, cost per turn, and friendly rate-limit errors. The owner widened it to organization limits that the Platform Admin manages, and split it into B8 (engine) and B8b (settings and usage data).

**Starts after the merge.** The junior is adding a "Platform Admin only" flag to module settings, so a setting can be hidden from organization admins. When the owner says it's done:
1. Fetch `origin/feature/CS-1770-iam-service-broker-workspace` again, re-check what's new, and merge it as its own commit, before B8.
   - At `ca7919d4` (2026-10-14) the only conflict was `MainDbContext.cs`, where both sides add one line; keep `ConfigureAskCaboodle(...)` and `ConfigureModuleSettings(...)`.
   - The 3 new migrations (2026-10-13) apply after ours. The only change to a table Ask Caboodle reads is an index on `TradeSpend.TradeSpendPromos`. The calculator builders and the Ask Caboodle code are untouched.
2. Build, run the full tests, and check the snapshot: generate a throwaway migration, confirm it's empty, delete it.
3. Apply the new migrations on local `caboodle_dev`, then the owner reviews.
4. Commit as `Update - Ask Caboodle - merge feature/CS-1770-iam-service-broker-workspace (…)`.

**B8 — engine**
1. **Prices by model (D54).**
   - `Llm/ModelPrices.cs` holds the table below (USD per million tokens, checked on the pricing page on 2026-10-14):

     | Model | Input | 5-min write | 1-hour write | Cache read | Output |
     |---|---|---|---|---|---|
     | `claude-opus-5-5` | 4 | 5 | 8 | 0.20 | 20 |
     | `claude-sonnet-5-5` | 2 | 2.50 | 4 | **0.10** | 10 |
     | `claude-haiku-5-5`, prompt ≤ 100K | 0.10 | 0.125 | 0.20 | 0.01 | 0.50 |
     | `claude-haiku-5-5`, prompt > 100K | 0.50 | 0.625 | 1 | 0.05 | 2.50 |
     | `claude-sonnet-5` (Sonnet 5.5's fallback) | 2 | 2.50 | 4 | 0.20 | 10 |
     | `claude-opus-5`, `claude-opus-4-8` (Opus fallbacks) | 5 | 6.25 | 10 | 0.50 | 25 |

   - **Sonnet 5.5 cache reads are $0.10, not $0.20.** Cache reads on Opus 5.5 and Sonnet 5.5 cost 0.05× input. The app default and the eval's `ModelPrice` used $0.20 from B7b on, so every Sonnet estimate was high:
     - B7b Sonnet medium: $0.040 per answer, about $0.035 corrected;
     - B7b Sonnet high: $0.049, about $0.042 corrected.
   - Usage comes from `usage.iterations`. Each attempt, including a declined attempt before a fallback, carries its own model. If the list is missing, the code uses top-level `usage` with `response.model`.
   - Tokens are added up per model and the formula is applied once per model. Haiku's price card is chosen per call, by prompt length (input + cache read + cache write).
   - The five `*PricePerMillionTokens` settings are removed. The eval uses the app's table, so `ModelPrice` is removed too.
   - **Configured model with no price (D52):** the API still starts and logs an Error, and Ask Caboodle answers every question with code `unavailable`.
2. **Friendly API errors.** The SDK already retries 429 and 5xx twice. The rate limit itself never triggers the refusal fallback.

   | Anthropic error | `error.code` | Status | Message to the user |
   |---|---|---|---|
   | 429 `rate_limit_error` | `rate_limited` | `RateLimited = 40` | "Ask Caboodle is handling a lot of questions right now. Please try again in a minute." |
   | 529 `overloaded_error`, other 5xx | `service_busy` | `RateLimited = 40` | "The AI service is busy right now. Please try again in a moment." |
   | `billing_error` (credit balance) | `unavailable` | `Unavailable = 45` | "Ask Caboodle is unavailable right now." Also a Critical log. |
   | 401 / 403 (key problem) | `unavailable` | `Unavailable = 45` | Same message, also a Critical log. |
   | anything else | `failed` | `ServiceError` | Today's message. |

   - The other codes: `daily_limit`, `monthly_limit`, `busy`, `refused`, `timed_out`.
   - The `error` event gains `code` and, for limits, `resetsAt`. Both are additions only.
3. **Concurrency (D49).**
   - A second question in a busy session is rejected at once, with code `busy` and the message "Still answering your previous question in this conversation."
   - Each user can have at most 2 questions running. This is held in memory, so it applies per server. The daily limits stay exact, because they are counted in the database.
4. **Daily question limit (D46–D48, D56, D57).**
   - **Organizations:** each has one daily pool (module setting `daily-question-pool`, default 100), shared by all its members first come, first served. There is no per-member share.
   - **Platform admins:** each has their own daily limit (platform setting, default 50). Nobody is exempt.
   - **Platform admins inside an organization** (support access) use their own limit and the platform total, never the organization's pool or budget.
   - **Brokers** use their brokerage's pool and budget, even in a connected brand's environment.
   - **What counts:** questions that reached the model (cost > 0) on the current UTC day, plus questions still running. That includes failed, cancelled and timed-out questions. Questions blocked by these checks, and errors before any response, don't count. Deleting a session doesn't give questions back.
   - **At the limit:** an `error` event with code `daily_limit` and `resetsAt`, for example "Your organization has used today's 100 questions. The limit resets at midnight UTC." No session is created and nothing is stored.
   - Every `done` event carries `questionsLeftToday`: the organization's remainder, or the platform admin's own.
5. **Monthly budgets (D50, D51).**
   - **Settings:** each organization's $ budget (default $25) and "stop at 100 %" (on by default) are module settings with the Platform-Admin-only flag. The platform budget (default $50) is a platform setting.
   - **Warnings** at 50 %, 80 % and 100 %, once per threshold crossed:
     - a Warning log at 50 % and 80 %, and an Error log at 100 %;
     - an email to the platform alert list, which is empty by default;
     - a status on the Platform Admin's usage view (B8b).
   - **Stop at 100 %:** the organization's questions stop, with code `monthly_limit`, until the 1st or until the Platform Admin raises the budget.
     - The message has no dollars: "Your organization has used this month's Ask Caboodle allowance. It renews on 1 November."
     - A question already running can finish, so the total can go slightly over.
     - The platform budget only warns; it never stops anything.
6. **Who sees what (D50).**
   - **Platform admins:** everything, including the model and $.
   - **Organization users:** in each `done` event and in saved history, tokens in (everything the model read, cached included), tokens out and their total, tool calls, and requests. Never the model or $. Today `done` sends the cost and the model to anyone who asks.
7. **Where the settings live (D55).**
   - **Module settings, both `ask-caboodle` nodes (Brand and Broker):**
     - `daily-question-pool` (default 100);
     - `monthly-budget-usd` (Platform Admin only);
     - `stop-at-monthly-budget` (Platform Admin only).
   - Adding them to the junior's `ModuleSettingCatalogSeedData` and `ModuleSettingKeys` is approved as the extension point he designed. After a deploy, someone runs `POST /modulesettings/definitions/backfill` once.
   - **Platform settings:** a small `Intelligence.AskPlatformSettings` table holds:
     - the platform admins' daily limit (50);
     - the platform monthly budget ($50);
     - the warning thresholds;
     - the alert emails.
   - B8 creates and reads the table; B8b adds its endpoints.
8. **Database.**
   - A new column `AskMessages.UsageOrganizationID`: the organization whose pool and budget the question used, or null for platform admins.
   - Indexes on `(UsageOrganizationID, CreatedOn)` and `(CreatedBy, CreatedOn)`, plus the platform settings table, in one migration on local `caboodle_dev`.
   - Counting from messages, not sessions, means deleted sessions still count.
   - Known limit: the soft-delete purge removes a deleted session's messages 30 days after deletion. A session deleted early in a 31-day month can therefore lower that month's total on its last day.
9. **Tests (free, stubbed HTTP):**
   - prices, including a fallback response with `iterations` and Haiku's two price cards;
   - pool and platform-admin limits, including what counts, support access and brokers;
   - `busy` and the 2-running limit;
   - budget thresholds logging once, and the stop at 100 %;
   - 429, 529, 402 and 401 responses becoming the right code and status;
   - who sees what in `done`;
   - one DB test for the counting queries.
10. **Paid check (D53):** one smoke question on Sonnet 5.5 medium, about $0.05. It confirms the real `usage.iterations` shape and that the new cost matches the old arithmetic apart from the cache-read price.

**B8b — settings and usage data (API only; the screens come with the FE)**
- **Platform admin:**
  - reads and edits the platform settings;
  - a usage report for any period, by organization, user and day: requests, tool calls, tokens and $;
  - each organization's budget status.
- **Organization admin** (IAM's `organization.update`, the same permission the junior uses for organization admins reading their settings; no IAM change):
  - their organization's usage by user: requests, tool calls and tokens, for today, this month or a chosen period;
  - the pool and the questions left today;
  - "X % of this month's allowance used", only from 50 % on.
  - No $.
- **User:** their organization's questions left today, and their own usage.
- BE `docs/AskCaboodle-FE.md` updated.

**Resolved (owner, 2026-10-14):**
- The pool is shared by all members, first come, first served, with no per-member share.
- The default pool is **100 questions a day**.
- The merge is done: `4d0830e6`, at the junior's `b5adb1a1`, including the Platform-Admin-only flag. The 4 IAM migrations are applied on local `caboodle_dev`.
- Note from his last commit: the settings backfill now overwrites a setting's wording, default, limits and flag with the code's values. A change made in the Platform Admin's UI must also be made in `ModuleSettingCatalogSeedData`, or the next backfill resets it.

**Done when:** limits and budgets are enforced with tests, prices come from the model, and the FE contract is updated.

**B8 as built (2026-10-14, commit `02a256b6`):**
- **Code:**
  - `Usage/` holds `AskAsker` (whose pool), `AskRunningQuestions`, `AskUsageStore`, `AskLimitSettings`, `AskUsageGuard`, `AskBudgetMonitor` and `AskModelPriceCheck` (the startup log).
  - `Llm/ModelPrices.cs` holds the price table.
  - The handler checks, in order: model priced, 2 running, limits, then the busy session.
  - `done` and session history: tokens for everyone; model and $ for platform admins only.
- **Settings:**
  - Three Ask Caboodle settings for each `ask-caboodle` node, added to the junior's catalog. The two dollar settings carry `IsPlatformAdminOnly`.
  - New option `IntelligenceSettings:MaxRunningQuestionsPerUser` (2).
- **Migration:** `20261014132917_AddAskCaboodleGuardrails` (column, 2 indexes, `AskPlatformSettings`), applied on local `caboodle_dev`.
- **Found by the paid smoke run:**
  - Ordinary responses also carry `usage.iterations`, as a `message` entry without a model, so the first version failed after the first call.
  - Fixed: the per-attempt list is used only when a `fallback_message` entry is present, and it is read from the raw JSON. Otherwise the top-level usage is used, as before.
  - Unit tests now reproduce both shapes, and the smoke test prints every raw `usage` even when it fails.
- **Tests:**
  - Intelligence 301 (42 new), coverage 96.2 % unit-only; every new usage file is at 100 % except the store, which the DB test runs.
  - Admin 407: the junior's seed count is 17 → 23, the backfill test lists the two `ask-caboodle` modules, and one new test covers the settings.
  - DB tests 22 green, including the usage store and the history tool-call count on real EF.
  - Build has 0 errors and no new warnings in changed files.
- **Docs:** BE `docs/AskCaboodle-FE.md` covers the new `done` and `error` fields, the error codes, the statuses, the limits and the settings.

**B8b decisions:** D59–D68 (§7), approved by the owner on 2026-10-14. The IAM branch had no new commits since `b5adb1a1` (fetched 2026-10-14), so there was nothing to merge.

**B8b as built (2026-10-14, commit `b2f00e22`):**
- **Endpoints:**

  | Route | Guard | Returns |
  |---|---|---|
  | `GET askcaboodle/usage` | the ask permission (module guard in G2) | Questions left today and the daily limit (the organization's pool, or a platform admin's own); whether the month is stopped and when it renews; your own totals in the pool you use now. `costUsd` for platform admins only. |
  | `GET askcaboodle/organization-usage` | IAM `organization.update` | The pool, used and left today, the % from 50 %, stopped and renews on, totals and one row per member (name, email). No $ or model fields at all. |
  | `GET`/`PUT askcaboodleadmin/settings` | the admin permission + `IsPlatformAdmin` | The platform settings. Both values are required; the ranges match the module settings; thresholds are stored in order, emails without repeats. |
  | `GET askcaboodleadmin/usage` | the admin permission + `IsPlatformAdmin` | `groupBy` organization, user or day, with an optional `organizationId`; questions, tool calls, tokens with the cache detail, and $. |
  | `GET askcaboodleadmin/budgets` | the admin permission + `IsPlatformAdmin` | This month: the platform line, and each organization with questions this month (%, threshold reached, stop, stopped, pool, today). |

- **Code** (all in `Usage/` unless noted):
  - **`AskAllowance`:** left today, stopped, % (rounded down) and the % shown from 50 %. It holds the one rule for these figures.
  - **`AskUsageGuard`:** `CheckAsync` keeps its order and skips reads it doesn't need; the new `GetAllowanceAsync` reads the same limits and counts for the endpoints.
  - **`AskBudgetMonitor`:** its new `HighestReached` serves the budget status, and `HighestCrossed` now uses it.
  - **`AskUsageReportStore`:** one SQL query per call (Dapper). The tool calls are counted in a per-message subquery on `IX_AskToolCalls_MessageID`. Users are joined on `Identity.Users` (a text id), organizations on `Organization.Organizations`.
  - **`AskUsagePeriod`:** the dates and their validator, shared by the three requests.
  - **`AskPlatformAdmin`:** reads `IsPlatformAdmin` through `GetUserAccessAsync`, so it never needs an organization header.
  - **The six requests and `DTOs/AskUsageDtos.cs`:**
    - two actions added to `AskCaboodleController`;
    - a new `AskCaboodleAdminController`;
    - organization limits read through the junior's cached `IModuleSettings`.
- **No migration:** B8's indexes cover the reads per organization and per user. The report across all organizations reads by date without an index, which is fine at today's volume.
- **Tests:**
  - **Totals:** solution 6,690 green across 16 projects; Intelligence 353 (52 new); coverage 96.9 % unit-only.
  - **New files:** every new usage file is at 96–100 %.
  - **DB tests:** 23 green. The new one reads every grouping on real SQL; its data covers a deleted session, a failure with cost 0, a support-access question, a question two days earlier, and one existing user and organization for the names.
  - **Build:** 0 errors, no warnings in changed files.
- **Docs:** BE `docs/AskCaboodle-FE.md`, "Usage and limits" section: every endpoint, the fields, who sees what, the periods and the purge caveat (D63).

### B9 — Catalog completion (after C0)
Decisions D75 and D77 (owner, 2026-10-15). Adds the useful business data that is still missing, without loosening security (§9).
1. **Promotion fee lines, through the calculator.**
   - `get_promotion_performance` gains a fee-line breakdown, for approved and sandbox promotions. Each fee shows:
     - its name and type (lump sum, coupon or Prime);
     - the banners, products and events it applies to;
     - its coupon dates;
     - its amount, as the calculator computes it.
   - The fee tables (`TradeSpend.BrandApprovedPromotionFees`, `TradeSpendSandbox.PromotionFees`) stay calculator-only, with no SQL grant, so the figures still match the Promotion Details screens.
   - Before building, check where the app works out each fee's amount. Use that same code, never a new formula.
   - Remove the glossary's `not_available.promotion_fee_lines`.
2. **Three CRM tables:**
   - `CRM.DistributorRetailers`: which distributor serves which retailer for a brand, with `DistributorMarkup` (brand-scoped);
   - `CRM.DistributorBrands`: brand ↔ distributor, with the parent distributor;
   - `CRM.RetailerRegions`: retailer ↔ region ↔ banner.

   Each one gets a catalog entry with module tags (D17), rules and a worked example. The grants go in one migration on local `caboodle_dev`.
3. **Optional, decided when B9 starts:** `DataHub.DistributorUpcMappings` (distributor items ↔ products, with match status), granted without `ResolutionNotes` and `ResolvedBy`.
4. **§9:** update every row this package changes.
5. **Tests (free):**
   - the grant-vs-catalog test;
   - every new catalog example runs as `askcaboodle_app`;
   - the drift test;
   - the fee lines add up to the fee totals on the Promotion Details screen (a reconciliation, as in B5).
6. **Eval:** 3–4 new cases: fees by type, a distributor's markup, the banners in a region, the distributors that carry the brand.
7. **Paid:** a targeted check of the new cases plus 4 regression cases, about $0.60 on Sonnet 5.5 medium, approved first. A full eval (≈ $2.60) only if results differ.

### B10 — Platform Admin knowledge (after B9)
Decisions D72–D75 (owner, 2026-10-15). Platform admins can ask about the whole system except credentials. Organization users stay on their IAM access (G3–G5).
1. **A second read-only login.** The group role `askcaboodle_admin_ro` (NOLOGIN) and the login `askcaboodle_admin_app`, created by the owner or ops as in B2, with `default_transaction_read_only` and `statement_timeout` on the login. The connection string goes in the user environment variable `IntelligenceSettings__AdminReadOnlyConnectionString`, never in git.
2. **What it can read:** everything `askcaboodle_ro` reads, plus:
   - **Organization:** organizations, memberships, roles and permissions, brand connections and access, access requests, domains, and invitations without the token hash;
   - **Identity:** users without any credential column, roles, user roles, the user hierarchy, and invited users without the verification code;
   - **Configuration:** modules, module assignments and their history, dependencies, setting definitions and values;
   - **Auditing:** audit events and trails. First check that trails never hold credential values;
   - **Email:** the logs' metadata only (template, status, dates), with no addresses or message bodies (D74), plus the template names;
   - **DataLifecycle:** the purge runs and settings;
   - **Brand links:** `Brand.BrandBrokers`, `Brand.BrandSubUsers`;
   - **Data pipeline:** DataHub import, sync, mapping and data-quality tables, and the raw distributor files (§9.1).
3. **Never granted:**
   - credentials: `Identity.UserTokens`, `UserLogins`, `UserClaims`, `VerificationCodes`; the password hash, security and concurrency stamps, refresh tokens and email codes in `Identity.Users`; invitation and share-link tokens; `DataHub.ThirdPartyCredentials`;
   - the `Intelligence` schema (other users' questions, D73);
   - `hangfire` and `public`.
4. **Personal data (D72):** user and contact email addresses and phone numbers stay ungranted until the data-handling statement (G8) and Constance's agreement. Names are fine. The gateway's `[email]` / `[phone]` masking stays as a second guard.
5. **The login follows the role.** The gateway uses the admin login when `IsPlatformAdmin` is true (the same rule as dollars); everyone else keeps `askcaboodle_ro`. The SQL guard keeps blocking the security schemas on the standard login. On the admin login the grants are the boundary, and the guard still blocks `Intelligence`, `hangfire`, `public` and the credential tables.
6. **Catalog:** the new entries carry `audience: platform-admin`. A platform admin's system prompt is the shared prompt plus an admin index appended at the end, so the shared prefix stays cached. D39 still holds.
7. **Tests (free):**
   - a credentials test that scans `information_schema` for secret-like columns (password, hash, token, secret, stamp, code, credential) and fails if either role is granted one;
   - the grant-vs-catalog test for both roles;
   - DB tests: the admin login reads an admin table and is refused the password hash (42501), and the standard login is refused the admin tables;
   - an organization user never gets the admin index.
8. **Eval:** 4–6 platform-admin cases:
   - which organizations have Ask Caboodle switched on;
   - who invited a user;
   - the imports that failed this week;
   - the brokers connected to a brand;
   - the recent module-setting changes.
9. **Paid:** about $0.60–1.00, approved first.
10. **Can be split when it starts:** B10a (IAM, organizations, modules, settings, audit) and B10b (the pipeline: imports, syncs, data-quality issues, raw files).
11. **FE:** no change. Platform admins simply get wider answers (§10.8).

---

## 4. Phase 1c — Experience layer (still admin-only)

Since the FE review (2026-10-15, D69–D71), C0 comes first: the FE team builds against it, and pins (C3) depend on it. The order is now **C0 → C0b → (C0c) → B9 → B10 → C1 → … → C9** (D77, D90); C0c runs there only if C0b's numbers justify it. §10 collects what the FE needs from every package.

### C0 — Answer contract (done 2026-10-15, commit `a102eed1`)
**Why:** the FE renders every answer from one fixed set of pieces, so the design never depends on the question. Pins (C3) re-run the same data block later on fresh data, so everything in it is a rule that the server applies again on every run, never a value the model typed.

1. **Frame.** `present_answer` gains `kind`:
   - `answer`: a normal answer;
   - `clarify`: the user must choose;
   - `cannot_answer`: the data can't answer it.

   The FE treats an unknown kind as `answer`, so the list can grow later.
2. **Pieces.** All optional except the text:

   | Piece | Holds | Who computes it |
   |---|---|---|
   | `headline` | A label, plus a rule: `resultId`, `column`, and `total`, `first`, `max` or `min` | The server computes and formats the value. The model never types the figure, and the label has no figures or dates. |
   | `notes` | At most one each of `scope`, `period` and `source`. `needed` and `available` only for `cannot_answer`. Short sentences. | The model. `source` names screens and reports ("Monthly Report", "KeHE distributor sales"), never schema names. |
   | `options` | `clarify` only: 2–5 choices, each a `label` and a `detail`. Choosing one sends the label as the next question in the same session. | The model |
   | `data` | Today's block (`resultId`, `title`, rows, columns) plus: `view` (the default: `table`, `bar`, `line` or `pie`); `x`, `y[]`; `series` (a column that splits rows into lines or colours); `formats` (`count`, `number`, `usd`, `percent`, `date` or `text` per column); `totalColumns[]`; `highlights` (column + `max`/`min` + `best`/`worst`); `chartable` | The server sums `totals` and finds the highlighted rows on every run. When `chartable` is false the FE hides the Table/Chart switch. |
   | `text` | The markdown answer, as today | The model |
   | `suggestions` | As today | The model |

3. **Screen order, fixed:** headline → notes → text → data → options → suggestions → actions.
4. **Results the agent can show:** `present_answer` already accepts a `run_sql` result or a calculator (`get_promotion_performance`) result. Both can be pinned in C3.
5. **History:**
   - The pieces are saved with the message (migration on local `caboodle_dev`), and `GET sessions/{id}` returns them.
   - Older messages without pieces still render as text plus data.
6. **Feedback:** `POST feedback` gains an optional `reason`: wrong number, wrong entity, missing context, or other. This is an open enum starting at 5.
7. **Prompt:** tool description and system-prompt rules for the pieces. The prompt stays shared by every brand (D39).
8. **Tests (free):**
   - each piece's validation;
   - the server-computed headline, totals and highlights;
   - a re-run with different rows moves the highlight;
   - history round trip, old messages, and the feedback reason.
9. **Cost and paid check:**
   - The extra output is about 100–200 tokens, so roughly +5 % per answer (≈ $0.035 → ≈ $0.037).
   - Paid: a 4-case check, about $0.25, then a full Sonnet 5.5 medium eval, about $2.60, each with the owner's approval.
   - The eval also checks: the right `kind` for the refuse/redirect and names-and-ambiguity cases, headlines present where a single figure answers the question, and no change in pass rate.
10. **Docs:** BE `docs/AskCaboodle-FE.md`, and §10 here.
11. **Guard for "how does the app work" questions (D78):**
    - **No made-up steps.** The agent never describes app steps unless a guide entry gives them (C9). Until then it says it can't explain the steps yet, and names the screen when the catalog knows it.
    - **Users' words.** Answers about concepts and relationships use screen and business terms, never schema names.
    - **2–3 eval cases:** "How do I create a sandbox promotion?", "What is a promotion family?", "How do banners relate to stores?".

**Decisions to post with the plan:** the headline rules; whether `source` is always required; how the pieces are stored (one JSON column or several); whether the clarify options also appear as suggestions; the feedback reason values. *Decided 2026-10-15: D79–D88 (§7).*

**C0 as built (2026-10-15, commit `a102eed1`):**
- **`present_answer`** takes `kind`, `headline` (label, column, rule, optional label_column, result_id and format), `notes`, `options`, the table (result_id, title, chart, x, y, series, formats, total_columns, highlights) and suggestions. `kind`, `chart` and `title` are required. With no `result_id` the chart defaults to none, and with no table the headline uses the top-level `result_id`.
  - **What it rejects:** only what would make the answer wrong or misleading (D79, D80). Each rejection costs the model one step.
  - **What it drops silently:** harmless extras: options or suggestions outside their kind, `needed`/`available` outside `cannot_answer`, and bad axes on a table (it just isn't chartable).
  - **A later valid call replaces** the frame, the table and the suggestions (D84).
  - **The computed figures go back to the model:** the tool result lists the headline, totals and highlighted rows, and the prompt says to use them exactly. This is the fix for hand-added totals.
- **`Answers/AskAnswerRules`:** the headline, totals, highlights, formats and display strings, as plain functions on a result, so C3's pin render can apply the same rules to fresh rows.
  - **Formats:** a tool's presets win, then the model's; any other column is inferred (numbers, ISO dates, text).
  - **Cut-off results:** nothing is computed over a result cut at 500 rows.
- **`Answers/AskSchemaWords`:** finds schema-qualified names and the catalog's compound table and column names (`ISchemaCatalog.IdentifierNames`). It checks the title, label, notes and options, and the eval uses it too.
- **The calculator** presets its column formats (count, usd, percent).
- **Events and history:**
  - a `frame` event before `data`; `data` gains `series`, `formats`, `totals`, `highlights` and `chartable`;
  - migration `AddAskCaboodleAnswerPieces` (local `caboodle_dev`; D81);
  - `GET sessions/{id}` returns `kind`, `headline`, `notes`, `options` and `feedbackReason`;
  - a restored session repeats each earlier answer's headline, notes and options before its text.
- **Feedback:** `reason`, with a down rating only (D83).
- **Prompt:**
  - step 5 rewritten for the pieces; no "Source:" line;
  - the period note gives the months the figures actually cover, checked against the latest month with data (D80);
  - one short question for `clarify`; for `cannot_answer`, what can't be answered and what is available;
  - forecasts stay `cannot_answer` (D86);
  - app questions: concepts only, no steps, and a screen only when NOT AVAILABLE names it (D78, D88);
  - the app's words, never table or column names.
- **Eval:**
  - the `kind` check counts; the headline and schema-word checks are reported only (D87);
  - three app cases, Q42–Q44 ("App questions", not counted);
  - the scorer and the claims check read the headline, notes, options and totals with the text;
  - the report has a "Shown" column and a "Reported checks" section.
- **Tests:**
  - solution 6,735 green across 16 projects; Intelligence 398 (45 new), coverage 97.3 % unit-only;
  - every new or changed file is at 100 % except `ToolJson` (94.8 %);
  - DB tests 23 green, including the `jsonb` round trip and the new references;
  - build: 0 errors, no new warnings in changed files.
- **Docs:** BE `docs/AskCaboodle-FE.md` ("The answer pieces", history, feedback) and the eval README.
- **Paid checks, Sonnet 5.5 medium, $3.54 in total** (reports in BE `docs/AskCaboodle-Eval/2026-10-15-*-c0*.md`):
  - **4-case check ($0.24, 3 of 4):** Q13's headline total was the server's 92,376 (the B8 smoke answer had hand-added 93,376). Q23 showed the approved plan as a headline answer to a forecast question, so forecasts now stay `cannot_answer` (D86). The title went back into `required`.
  - **Re-check of Q13 and Q23 ($0.11, 2 of 2).**
  - **Full run ($2.39, 48 cases):**
    - **As scored:** 36 of the 45 counted cases. Four (Q15, Q19, Q34, Q41) failed only the kind check, and wrongly: each is a partial answer shown as `cannot_answer` with what is available. With the kinds fix (D87), **40/45** against B7b's 39/45. App questions 3 of 3.
    - **Cost:** **$0.035 per answer**, the same as B7b at the $0.10 cache-read price; output tokens +3 %; 92 % of input read from the cache.
    - **`present_answer`:** 4 of 54 calls rejected.
    - **Reported checks:** no database names anywhere; a headline on 4 of the 7 single-figure cases.
  - **Re-check of 7 ($0.50):** Q16, Q19, Q43 and Q44 passed, after the fixes to the chart default and the kind description. Q04-DAVID failed again: C0 had moved the period into a note, and the model wrote the period asked ("July–September") for data that ends in August. Q11 and Q29 repeated wording slips (a skipped store in a ranking; "three promo windows" for two).
  - **Re-check of 5 ($0.30, 5 of 5):** after the period rule (D80), Q04-DAVID and Q08-DAVID say "September not uploaded yet"; Q01, Q04 and FU1 are unchanged.
  - **After the last run, one free fix:** with no table, the headline uses the top-level `result_id` (FU1 had needed one extra step for it).
  - **Still failing:**
    - Q11 and Q29: the known pattern and counting weakness. Their figures are right; the counts in the wording are not.
    - Q27: as in B7b.

### C0b — Fact check (next; before B9)
**Why:** C0 made the headline, totals and highlighted rows server figures, but the text is still written by the model. A hand-added or miscounted figure can still reach the user: B8's 93,376 for 92,376, "11 flavors" for 10 (Q16), "three promo windows" for two (Q29). C0b checks every figure the user sees against the figures the model actually had, before the answer goes out. This is step 1 of two (D90).

1. **Fact register** (`Answers/AskFactRegister`): every figure the model was given, kept with the session so follow-ups count too. Each tool adds what it returned:
   - **values:** the numeric cells of the query rows it was shown, each result's row count, the calculator's figures, the name search's figures, and the computed headline, totals and highlights;
   - **the question:** the user's numbers and today's date;
   - **reference text:** numbers in the catalog text it read (get_table_info and the system prompt), used only for large or exact figures (see 3).
2. **Figure reader** (`Answers/AskFigures`): the eval's number reader, moved into the app so both read figures the same way.
   - **Reads:** amounts with `$`, `%`, `K`, `M`, decimals, ranges ("8–12"), and counting words up to twenty ("three windows").
   - **Never flagged:**
     - years and dates;
     - list numbering;
     - numbers inside names the data returned ("8-pack", "SPROUTS 2026 - MD");
     - numbers in the question.
3. **Check:** a figure is verified when rounding a register value to the figure's shown precision gives the figure: 1,395,588 → "$1.4M"; 0.2357 → "23.6%"; 10,264.11 → "10,264".
   - **Large or exact figures** (1,000 and up, decimals, `$`, `%`) may come from anything the model was given.
   - **Small counts** ("three windows", "11 flavors", "4 stores") must match a value, a row count or the question, never catalog text, SQL or a date. That's what lets the check catch Q16 and Q29.
   - **It covers everything the user sees:** the text, the notes and the options.
   - **It works one sentence at a time,** so C1 can release each sentence as soon as it passes (panel 3, D96). Before C1 there is no text streaming, so C0b checks the finished text sentence by sentence.
4. **One correction round, in the agent loop:**
   - **The message:** when a figure fails, the server adds one user message: "These figures aren't in any result: 93,376 (in 'KeHE shipped 93,376 cases…'). Compute them with a query or remove them, then write the whole answer again."
   - **The model** may run queries and present the answer again.
   - **The history** stays append-only, so the replay and the prompt cache stay valid.
   - **Limits:** the round counts toward the 12 steps and the 180 s.
   - **Cost:** an answer that checks out costs no extra model call.
5. **Still failing after one round (D91):** the answer goes out with a note naming the figures that couldn't be checked. They're stored with the message (in `PiecesJson`, no migration) and logged for C8's triage list.
6. **The system prompt doesn't change,** so runs stay comparable; the correction message carries the guidance.
7. **Eval:**
   - **New reported checks:** "unverified figures" and the number of corrections.
   - **False alarms:** figures that were flagged although the claims check found nothing wrong with them.
   - **Test cases:** Q16 and Q29 (counting words), and Q42–Q44 (concept answers that quote the catalog).
8. **Tests (free):**
   - **The reader:** each kind of figure and each exception.
   - **Rounding and the tiers.**
   - **The correction round:** a wrong answer, then a right one; wrong twice, then the note; the step limit.
   - **Storage:** the note in the history.
9. **What step 1 can't catch:**
   - a real figure put in the wrong place ("July: 8,036 cases", when 8,036 is April's);
   - rankings and trend words without numbers (Q11).

   The eval's claims check still catches these; step 2 targets them.
10. **Cost and paid checks:**
    - **Per answer:** no extra cost when the text checks out; one extra step (about $0.005–0.01) when it doesn't.
    - **Paid:** a 4-case check (Q13, Q16, Q29, Q43, about $0.30), a full run (about $2.50) and re-checks: about $3–4 in all, each approved first.
11. **Docs:** BE `docs/AskCaboodle-FE.md` (the note) and §10 here.

**Decisions to post with the plan:** the small-count rule and its exception for concept answers; the never-flagged list; the rounding rule; the note's field and wording; how the correction round counts against the limits; when to tune before committing.

**Step 2** is package C0c (below).

### C0c — Fact check, step 2: rankings, trends and figures in the wrong place (after C0b; placement approved 2026-10-15)
**Why:** C0b proves each figure exists in the data, but not that it is attached to the right thing, and it can't read claims without numbers. These are the errors left after C0b: "July: 8,036 cases" when 8,036 is April's; "Harmon's comes next" when another store comes first (Q11); "rose every month" when one month fell (the B6 pattern weakness).

1. **Facts per result:** the server attaches plain facts to each result the model sees and adds them to the register:
   - the order of the rows by each numeric column;
   - the highest and lowest rows;
   - the month-to-month direction and where a trend breaks.
2. **Figure and label pairs:** a figure in a sentence that names a row label (a month, a retailer, a product) must sit on that row in the data.
3. **Ranking words** ("top", "next", "highest", "lowest", "second") must follow the row order, and **trend words** ("every month", "steadily", "rose", "fell") must match the direction facts.
4. **The same pipeline as C0b:** the same correction round and note, and one sentence at a time (D96).
5. **Eval:** Q11, Q03 and the pattern cases; false alarms are counted as in C0b.
6. **Honest limit:** wording varies too much to catch every claim. Expect most ranking and trend errors to be caught, not all.
7. **Go or no-go:** decided with C0b's measured numbers (D90). If C0b leaves few errors, C0c moves later in the order.
8. **Paid:** about the same as C0b (≈ $3–4), each step approved first.

### C1 — Token streaming
- `AnthropicConversation.SendStreamingAsync` using `client.Beta.Messages.CreateStreaming`: accumulate content blocks (text deltas, thinking deltas + signature deltas, tool_use input JSON deltas, server-tool blocks), rebuild the assistant message for the append-only history, stream **text deltas** to the sink as `text-delta` events; final `text` event keeps the full markdown for clients that don't stream.
- **Checked sentences, typed out (D96, panel 3 of the streaming demo):** the server collects the text deltas, checks each sentence with C0b's checker as soon as it ends, and releases it in a `text-sentence` event; the FE types each released sentence out word by word. A failed sentence stops the release ("A figure failed the check · rewriting") until the corrected answer arrives. The user never sees an unchecked figure; text starts about half a second later than raw word-by-word streaming.
- Optional: `thinking.display: "updates"` (beta `thinking-display-updates-2026-08-18`) → short progress notes as `progress` events.
- Tests: stubbed SSE HTTP responses (text-only turn, tool-use turn, thinking with signature).
- FE contract update.
- **Run trace (FE review, 2026-10-15).**
  - **Live events** for the trace drawer:
    - a step starting (number and label), plus a "thinking" state between steps;
    - each tool call starting and finishing: `callId`, step, tool, a summary, duration, ok or error, row count, and the detail.
  - **Parallel calls** share a step. A failed `run_sql` followed by a retry is marked as a self-correction.
  - **The step meters** need the limits, so the `session` or `done` event carries `maxSteps` (12) and `wallClockSeconds` (180).
  - **Past answers:** `GET sessions/{id}/messages/{messageId}/trace`, rebuilt from `AskToolCalls` and the stored transcript.
  - **Who sees the detail:** an open decision (§7.2). The recommendation: organization users get labels, tools, timings, row counts and matched names, while SQL, tables and columns, catalog notes and Postgres errors are for platform admins only. Today `done.queries` (raw SQL) goes to everyone; fix it here once decided.

### C2 — Suggested questions (empty state)
- `GET suggestions` → curated starters (static YAML per org type, later from the gallery/eval set). Zero LLM cost.

### C3 — Pinned live reports
- Relative periods: add optional `period` argument to `run_sql` (`last-full-month`, `last-full-quarter`, `ytd`, `last-12-months`, `custom`) — backend resolves to `@period_start/@period_end` parameters (inclusive/exclusive), the model writes SQL with those parameters for relative questions (system prompt rule). Stored plans then stay live.
- Entities: `PinnedReport { OwnerId, OrganizationId?, BrandId?, Title, Question, Sql, PeriodToken?, VizSpecJson, CatalogVersion, Status (active | broken), LastValidatedOn }`.
- Endpoints: `POST pins` (from a `data` result id — server keeps the SQL; re-validated by `SqlGuard`), `GET pins`, `GET pins/{id}/render` (re-executes SQL with the current period; **no LLM call**), `DELETE pins/{id}`.
- Hangfire recurring job (registrar pattern) re-validates all pins nightly; failures flag `broken`.
- Web-research and analysis answers are not pinnable.
- **From the FE review (2026-10-15):**
  - **Store the tool plan, not only SQL.** That is the tool name plus its arguments: `run_sql` with its period parameters, or `get_promotion_performance` with its period. A calculator pin re-runs the calculator, so its figures still match the screens. (The artifact pins a promotions answer.)
  - **Store C0's data-block rules and headline rule.** `render` returns the same data block as a live answer, plus the headline value and `periodResolved` ("last full quarter → Q3 2026"), so the FE reuses one component.
  - **Pin card:** title, period token and its resolution, source, status (`ok` / `broken` with a reason), pinned by and on, last refreshed. "Re-ask to repair" is an FE action that starts a new question from the pin's question.
  - **Open (§7.2):**
    - one list of period tokens (the artifact has last full quarter, YTD, last 90 days and fixed; this plan has last full month, last full quarter, YTD, last 12 months and custom);
    - the KPI delta against the previous period ("+6.1 pts vs Q2"), which runs the plan a second time;
    - whether pins are personal or can be shared.
  - Render uses the viewer's access (G3/G4).

### C4 — Prompt gallery
- `Prompt { OwnerId, OrganizationId, Visibility (private | organization | shared), Title, Text, VariablesJson }`, `PromptShare { PromptId, UserId }`; CRUD + share endpoints; variables (`{brand}`, `{period}`) resolved via entity search / period tokens; seeded starter prompts per org type (from eval-verified questions).
- **From the FE review (2026-10-15):**
  - **Tabs:** Organization, Mine, Shared with me.
  - **Variables:** each can carry preset choices and a default, or be free text.
  - **Run counts.**
  - **"Verified":** an organization prompt with a passing eval case.
  - **Sharing:** with people in the same organization, through IAM members.
  - **Saved-prompts picker:** the composer's `/` picker lists the starters (C2) and the prompts in one call.
  - **Open (§7.2):** prompts shared with the organization wait for review ("Pending admin review"). Who reviews them, the organization admin or the Platform Admin?

### C5 — Verified examples (few-shot) and short-circuit
- `VerifiedExample { NormalizedQuestion, Sql/ToolPlanJson, CatalogVersion, Source (thumbs-up | eval), BrandScope }`; entries only from thumbs-up (B3) or eval passes (B6).
- Retrieval with `pg_trgm` similarity + full-text on the normalized question (entity names replaced by type placeholders); top 2–3 injected into the **user** message (keeps the system prefix cached).
- Phase 2 of C5 (eval-gated): strict short-circuit for near-identical questions with identical re-resolved entities — re-run stored SQL, one short answer call.
- Invalidate on catalog version change (drift).
- **Additions (owner, 2026-10-15, D92):**
  - **Human approval:** a thumbs-up or an eval pass only proposes an example. A platform admin marks it verified, because people also approve wrong answers.
  - **A starter library before launch:** at least 100 questions, mostly for brands and brokers, the primary users. The brand–broker connection works the same for everyone; only the modules differ. Written with the owner and verified with Constance.
  - **C0's answer rules** are stored with each example, so a reused answer shows the same headline, totals and notes.
  - **A nightly re-check, as for pins (C3):** an example whose query breaks after a data or catalog change loses its verified mark.
  - **Templates with slots** for the retailer, product and period (C3's period tokens), so one verified question serves every retailer and period.
  - **Size:** about a third more than C5 as first planned.

### C6 — Public web research
- Server tools `web_search_20260209` (+ `web_fetch_20260209`), `max_uses` 3, `user_location` US; declared at session start only when `IntelligenceSettings:EnableWebSearch` (later per-org setting) — never toggled mid-session (append-only).
- History conversion must handle `server_tool_use`, `web_search_tool_result`, `web_fetch_tool_result` blocks and `pause_turn` (resend to continue).
- Detect web results → `sourceType` = `public_web` | `mixed` in `done`; new `sources` event (url, title, cited text); system prompt rules: web only for market/industry questions, no Caboodle figures in queries, cite everything, split mixed answers.
- Audit web queries + URLs; excluded from pins and verified examples.

### C7 — Learned entity aliases
- `EntityAlias { OrganizationId?, EntityType, EntityId, Alias, Status, CreatedBy }`; `GET/POST/DELETE aliases`; offered after a confirmed disambiguation ("remember WFM for your organization?"); included in `search_entity` (match source `alias`). Never writes `DataHub.UnifiedEntityAlias`.

### C8 — Cost & quality dashboard data
- Admin endpoints aggregating audit tables: questions/day, cost per question (p50/p95), steps, cache-hit ratio, thumbs ratio, error/refusal rate, latest eval pass rate, top failing questions.
- **From the FE review (2026-10-15), the "Flight recorder" screen** (platform admins only):
  - **Figures:** cost per question (average and by day), steps per question, latency p50/p95, the cache-read share, the thumbs-up rate, the eval pass rate and its date, and refusals correct. Few-shot hit and short-circuit rates come after C5.
  - **Eval results in the database:** today they are only report files in BE `docs/AskCaboodle-Eval/`. The harness, or an import, must write each run's result, with its date and prompt/catalog version, to a table the API reads.
  - **Thumbs-down triage list (D97):** question, reason, fix note, open/fixed; the Platform Admin records each fix, and each fixed answer becomes a golden eval case. It also lists the answers C0b sent with unverified figures (D91).

### C9 — Caboodle guide (concepts and relationships; how-to steps later)
Decision D76 (owner, 2026-10-15). Answers questions about how Caboodle works: what a term or entity means, and how things connect.
1. **Content:** short entries in the BE repo, embedded like the catalog. Three types:
   - **concepts:** the term, what it means, an example, related terms;
   - **relationships:** how entities connect, in users' words ("a retailer has banners, and each banner has stores");
   - **tasks:** the steps, the screen and who may do it. This is the second part of the package (step 7).
2. **Sources, never invented:**
   - Caboodle's user-documentation GitHub repo; the owner gives access when available;
   - the catalog (definitions, join paths);
   - the app's own rules (validators, calculator formulas).
3. **Review:** Claude drafts the entries; Constance (the client) reviews and approves each batch before it ships. The review format is decided when C9 starts.
4. **Audience:** every entry is tagged for everyone, organization admins or platform admins. For example, module settings and support access are for platform admins only.
5. **How the agent uses it:**
   - a `search_guide` tool searches the entries, so the system prompt stays small;
   - answers use the C0 contract, with the `source` note "Caboodle guide";
   - a question that mixes a concept and data uses both.
6. **Access-aware:** for a task the user isn't allowed to do, the answer says who can do it (G3).
7. **How-to steps:** the same package's second part, after the FE rework, because the screens are changing. Later and optional: "Open screen" links, added to C0 as a new optional piece.
8. **Eval:** a "Concepts" group of 5–8 cases. The claims check also flags invented steps or terms.
9. **Paid:** about $0.30–0.50, approved first.
10. **Drift:** entries are re-checked whenever the catalog or the screens change.

---

## 5. GA — Brand + Broker versions

Prerequisites already met: IAM foundation + module work on the branch base; staging aligned with production (PG 15, `security_invoker`).

### G1 — Module catalog seed
- Brand audience: add Ask Caboodle `OptionalDataSource` deps `distributor-sales-report`, `spins`, `kehe`, `unfi`, `monthly-report` (design Q13).
- Broker audience: add the `ask-caboodle` node to `BrokerRoots` with `OptionalDataSource` deps on the broker-audience data-source modules **that IAM defines** (today: product-spec, retailers, regions, distributors, approved-promotions, trade-spend-sandbox, market-overview, category-review, distributor-apl). Only the Ask Caboodle entries are added; other modules are IAM's (D6).
- **Status after the IAM merge (2026-10-12, `b30b387c`):**
  - **Done by IAM:** the broker `ask-caboodle` node now exists.
  - **Still to add here:** the Brand-audience deps above, and the broker node's `OptionalDataSource` deps.
  - **Broker deps change shape:** brokers now inherit their connected brands' modules (BROKER-BRAND-ACCESS-D1). So the broker deps only need the broker-only modules (market-overview, category-review, brand-report, distributor-apl, retail-apl).

### G2 — Endpoint guard switch
- Replace the phase-1 `MustHavePermission` with `[RequireModule(ModuleSlugs.AskCaboodle, ModuleSlugs.AskCaboodle, ModuleActions.View, CrossBrand = true)]` on every action of `AskCaboodleController`; owner checks on sessions/pins/prompts (`DemandBrandAsync`, owner id).
- **Leave two guards unchanged (D59):** `organization-usage` stays on IAM's `organization.update`. `AskCaboodleAdminController` stays on the admin permission plus `IsPlatformAdmin`.
- API.Test reflection test stays green.

### G3 — Agent access context
- Build `AgentAccessContext { Audience, OrganizationId, BrandAllowlist (BrandsWith(ask-caboodle, View)), BrandModules (brand → slugs from Brands[brandId].Modules), ActiveBrandId? }` per request from `IAccessContext.GetCurrentAsync()`.
- Pass entitlements (allowed brands with names, allowed tables) in the **first user message** — the system prompt stays identical for everyone (cost L3).
- Catalog tables carry `module:` (B4); `get_table_info` refuses non-entitled tables.
- **From the IAM merge (2026-10-12):**
  - **Brokerages hold the brand's modules too.** On a connected brand, `Brands[brandId].Modules` contains the brand's switched-on modules as well as the brokerage's own. A table is therefore entitled when its `modules.brand` **or** its `modules.broker` slug is granted on that brand. `broker: none` means no extra broker module; it does not hide the table from brokers.
  - **Brand scope:** use `BrandsInScope("ask-caboodle", View)` for the brands in scope.
  - **Platform admins:** they have no brand list, so treat them as unrestricted (no RLS settings).

### G4 — Row-level security (the real boundary)
- Migration: RLS policies `TO askcaboodle_ro` only (app unaffected) on every brand-keyed catalog table: `"BrandID" = ANY(string_to_array(current_setting('app.allowed_brand_ids', true), ',')::uuid[])` plus module gating via `app.allowed_brand_modules` (brand:slug pairs) per table module; brokerage-owned tables: `"BrokerageOrganizationID" = current_setting('app.organization_id', true)::uuid`. Shared reference tables: no RLS. Tier-2 views created `WITH (security_invoker = true)`.
- Gateway: `SET LOCAL app.allowed_brand_ids / app.allowed_brand_modules / app.organization_id` inside the read-only transaction from `AgentAccessContext` (parameterized `set_config`, never string-built from headers).
- Integration tests on `caboodle_dev` with the RO login role.
- **From the IAM merge (2026-10-12):** the policies on the brokerage tables must mirror IAM's handler scopes exactly, so screens and Ask Caboodle agree:
  - **Category reviews** (`CategoryReviewArea`): a brand sees its own reviews plus the catalog reviews (no `BrandID`) of the brokerages it may see. A brokerage sees its own catalog reviews.
  - **Brand reports** (`BrandReportScope`): a brand sees every brokerage's reports about it. A brokerage sees only its own reports on its in-scope brands.
  - **Market Overview** (`ViewerBrokerageId`): a brand sees all rows about itself. A brokerage sees only its own rows.

### G5 — Entity search scope
- Registry scope rules on: Brand-scoped types filtered by allowlist; Brand/Brokerage (`Organization.Organizations`) limited to connected orgs; broker candidates tagged with brand name.

### G6 — Audience behavior
- Audience block in the first user message (broker: name the brand on every row, ask which brand when ambiguous); suggestions/gallery seeds per org type; cross-brand answers carry a brand column.

### G7 — Tenancy test matrix + eval
- Broker sees only connected brands; per-brand module gating (brand A grants promotions, B doesn't); brokerage-owned records isolated; member without `ask-caboodle` refused before any LLM call; brand users never see brokerage-owned records (D7 / Q17). Add broker eval cases to B6.

### G8 — Ops & compliance
- Rotate the committed Claude key; move `ClaudeApiKey` to secrets/env (`IntelligenceSettings__ClaudeApiKey`) in every env; remove it from appsettings.
- Read-only login role + `ReadOnlyConnectionString` per env (B2).
- Customer data-handling statement (rows sent to the Claude API, web queries, code-execution containers) — design Q8.
- Network: DBs reachable only from app hosts/VPN (devops, owner said in progress).

---

## 6. Phase 2 — Python Analysis

### When analysis is used (and when it is not)

The model decides per question from system-prompt rules (no classifier); the rules are tested by eval cases (A3). **SQL stays the default** — Python is used only when a question needs computation SQL can't do reliably, because analysis is slower (+10–30 s), labelled exploratory, and not pinnable.

| Use Python analysis | Example question |
|---|---|
| Trend vs seasonality (decomposition) | "Is our UNFI decline seasonal or a real drop?" |
| Before/after with significance | "Did the March price increase actually change cases, beyond normal month-to-month noise?" |
| Relationships across many promotions or series (regression) | "Does a deeper discount give a bigger lift at Sprouts?" (needs discount depth captured) |
| Clustering / segmentation | "Group our stores by how their sales behave" |
| Anomaly detection across thousands of store × product months | "Which store-product months look abnormal?" (voids, duplicate uploads, data errors) |
| Per-series computation too large for the conversation | "Rank all 5,000 stores by their 12-month sales trend" — rows go to the sandbox via programmatic tool calling, only the ranking returns |

| Stay with SQL (no Python) | Why |
|---|---|
| Totals, top N, rankings, shares, year-over-year, plan vs actual, percentiles, simple correlation (`corr`, `regr_slope`) | Postgres does it in one reliable query |
| Planned promo cases/revenue, TPR spend, fees | Calculator figures → `get_promotion_performance` only |
| Forecasts / "what will we sell in 2027" | Forecasting is out of scope; the agent says so instead of extrapolating |
| Public market questions | Web research (C6) |

Answers from analysis carry `sourceType: analysis` and an "Exploratory analysis" label; the code and row counts are stored in the audit trail.

### A1 — Demand gate (no code)
- From audit data (B3): count questions that ended in "can't analyze / what-if" style refusals or low thumbs; owner decides to proceed.

### A2 — Code execution + programmatic tool calling
- Add `code_execution_20260120` tool; mark `run_sql` with `allowed_callers = ["code_execution_20260120"]` so Python can call it with a larger row cap (e.g. 50 K rows, config) — rows go to the sandbox, not the context (cost L10). Not compatible with `strict` tools or forced tool choice; a pending programmatic call must be answered with a user message containing only `tool_result` blocks.
- Container reuse per session (store `container_id` on `AskSession`); handle container expiry and `pause_turn`.
- New source type `analysis` ("Exploratory analysis" label in `done`); analysis results shown via `present_answer`; code persisted in `AskToolCall`; not pinnable; app metrics still only from Tier-1/2/3 sources (catalog rule).
- System prompt section: when to analyze (trend vs seasonality, before/after significance, clustering, anomalies, regression), when plain SQL suffices.
- Cost: container time free up to 1,550 h/month/org, then $0.05/h; tokens for code. Data-handling statement updated (containers persist up to 30 days).

### A3 — Eval + contract
- Analysis eval cases (deterministic checks on returned numbers); FE contract additions (`sourceType: analysis`, optional chart image/table).

---

## 7. Decisions to confirm (owner)

Owner answers recorded 2026-10-11.

| # | Decision | Outcome |
|---|---|---|
| D1 | Commit message format | **Approved:** `Update - Ask Caboodle <package> - …`, one line, no ticket |
| D2 | Execution order | **Approved:** B0→B8, C1→C8, G1→G8, A1→A3; FE in parallel once the mockup is ready. *Updated by D70 and D77 (2026-10-15): C0 → B9 → B10 → C1 → … → C9.* |
| D3 | Demo timing | **Dropped (owner, 2026-10-12):** no demo track — every package done properly, in D2 order. §7.1 is kept for history only. |
| D4 | Approval for paid runs | **Approved:** eval baseline ≈ $3; B7 matrix ≈ $8–12 |
| D5 | DB role / extension / indexes | **Local only for now:** the B2 migration runs on local `caboodle_dev`. `CREATEROLE` on staging/production is only needed when the branch is deployed — check with devops then. |
| D6 | Brokers see connected brands' data | **Owner rule (final):** when a Brand organization is connected to a Brokerage organization, that brokerage's members see the brand's data according to the access granted to them, as in the Onboarding-Journey prototype. Ask Caboodle takes all access from IAM (`IAccessContext`: connected brands × granted modules) — **no brokerage-specific code or exceptions in Ask Caboodle, and no changes outside Ask Caboodle.** Whatever IAM grants, Ask Caboodle follows automatically. |
| D7 | Brands see brokerage-owned records (Category Review, Market Overview, Brand Report…) | **Owner rule (final):** brands **view** brokerage records about their own brand; brokerages see only their own. Ask Caboodle is read-only, so in G4 the RLS policy on brokerage-owned tables is `BrokerageOrganizationID = caller organization OR (caller is a Brand organization AND BrandID ∈ caller's brand allowlist)`, with the caller's organization, type and allowlist taken from `IAccessContext`. |
| D8 | Final model/effort | **Approved:** cheapest config with no eval regression. The B6/B7 report explains "regression" in plain terms (pass rate per category vs today's setup) before the owner decides. |
| D9 | Web search default per org | **Approved:** on for admin 1c; per-org setting at GA |
| D10 | Drop the two stashes and `caboodle_dev_before_restore_20261011` | **Deferred (owner, 2026-10-12):** nothing depends on it; skipped for now. When done, the owner runs it (the agent's tool permissions block irreversible deletes). |
| D11 | B3: one row per question + answer (`AskMessage` holds question, answer and transcript) instead of separate question / answer / transcript rows | **Approved (2026-10-12)** |
| D12 | B3: reopened sessions show the table/chart as it was when answered (stored copy, ≤ 500 rows) rather than re-running the SQL | **Approved (2026-10-12)** — live re-runs belong to pins (C3) |
| D13 | B3: server-side context editing for long sessions | **Approved (2026-10-12):** `clear_tool_uses` on above 100 K input tokens, keep the last 6 tool results, clear at least 20 K; no compaction |
| D14 | B3: retention of deleted sessions | **Approved (2026-10-12):** soft delete only, no Ask-specific purge code. *Correction found while building:* the existing soft-delete purge job discovers every table with `Deleted` / `DeletedOn` / `ID` outside its excluded schemas, so it already hard-deletes soft-deleted Ask sessions after the `Intelligence` schema's retention (default 30 days, set in Admin → Soft-delete purge). The child foreign keys cascade, so a purged session takes its messages, tool calls and feedback with it. |
| D15 | B3: paid verification (≈ $0.35) | **Approved and run (2026-10-12):** $0.23 actual (§8) |
| D16 | B4: which tables to add | **Approved (2026-10-12):** the 18 proposed, plus `CRM.Contacts`, `CRM.BannerActivities` and `CRM.PipelineActivities` with safeguards (owner asked why they were left out; see D23 and §9) |
| D17 | B4: module tag format | **Approved:** `modules: { brand: slug, broker: slug }`, `any` / `none` allowed. Recorded now, enforced at G3/G4. |
| D18 | B4: brokerage-internal Brand Report notes | **Approved:** excluded by column grant; external notes stay |
| D19 | B4: business answers (design Q15) | **Approved:** (a) default POD = stores carrying each product (distinct stores per UPC), definition always named; (b) "our plan" = the approved monthly report; sandbox plans use the reporting version only; (c) calendar quarters until a fiscal calendar exists |
| D20 | B4: "Albertsons → ABSCO" and similar | **Approved:** alias list in the glossary (industry facts, everyone); per-organization learned aliases in C7 |
| D21 | B4: implausible plan values | **Approved:** label as planned; say a lift above 100 % looks unusually high; never correct it |
| D22 | B4: paid check (≈ $0.70) | **Approved and run (2026-10-12):** $0.60 actual (§8) |
| D23 | B4: contact email / phone | **Approved:** not readable (column grant) until GA, with the customer data-handling statement (G8). Extended while building: contact notes are also hidden (some hold emails), and emails / phone numbers typed into any note are masked by the gateway. |

| D24 | B5: how the calculator gets the brand | **Approved:** a brand-scoped `ICurrentUser` adapter inside Ask Caboodle; no changes to TradeSpend code. *Superseded by the IAM merge (`b30b387c`):* the builders now take the brand id, so the adapter was removed. |
| D25 | B5: which promotions | **Owner:** approved and sandbox. Use sandbox data only when the user asks for sandbox; otherwise approved promotions. Simple promotions show AD/TPR fees only. |
| D26 | B5: breakdowns and the monthly report | **Owner:** totals plus a product or event breakdown, with a month filter. When the monthly report is used, always tell the user when it was last refreshed. |
| D27 | B5: overlapping approved promotions | **Approved:** report them separately with a warning; never add them silently |
| D28 | B5: limit on promotions per call | **Owner asked why. Answer:** there is no technical need. Measured: 73 promotions in 0.7 s, 3,031 events in 27 ms. Built with no limit on what is calculated; the model sees the 25 largest plus totals (tokens), and a 90 s budget is the safety net. |
| D29 | B5: paid check | **Approved and run:** $0.60 for 6 questions (§8) |
| D30 | B6: which cases | **Approved (2026-10-13):** all 41 questions with Q40 merged into Q20, Q1/Q4/Q8 again for David, and 2 follow-up (two-turn) cases — 45 cases. Q26 expects a redirect until C6. |
| D31 | B6: "today" in eval runs | **Approved:** fixed at 2026-10-12 (the date of the question set and its verified figures); moved together with re-recorded values when the dev data is refreshed |
| D32 | B6: narrative claims | **Approved:** a claims check per case — a fixed judge model (Opus 5.5, low effort) gets the question, reference rows and answer and lists contradicted claims; a contradicted claim fails the case; the report shows pass rates with and without it |
| D33 | B6: run-to-run noise | **Approved:** one run per case; failed cases re-run once and marked flaky if they pass; the pass rate counts first runs only |
| D34 | B6/B7: gate groups | **Approved:** 7 groups of ≥ 4 cases (sales and trends, distribution, names and ambiguity, promotions and plan vs actual, calculator, refuse or redirect, other data sources) |
| D35 | B6: where reports live | **Approved:** BE repo `docs/AskCaboodle-Eval/` (Markdown + JSON), one-line summary in §8 here |
| D36 | B6: paid runs | **Approved and run:** ≈ $0.40 harness check + ≈ $6 baseline, spending cap $7 (owner: $21 available for testing). Spent $7.03: check $0.39, baseline $6.64 (one re-run cost $0.12 more than its reserve). |
| D37 | B6.1: answer rules | **Approved (2026-10-13):** pattern, arithmetic, names and several-products rules in the system prompt |
| D38 | B6.1: product matching | **Approved:** a name ending with the term scores like a prefix match, plus the several-products rule |
| D39 | B6.1: other brands' data | **Owner rule:** in a brand environment Ask Caboodle never offers or uses another brand's data; cross-brand questions (e.g. a broker in the broker workspace) follow the user's permissions. Prompt rule now; enforced by IAM and the database rules at GA (G3/G4) |
| D40 | B6.1 + B7 budget | **Approved:** ≈ $14 in total (client-paid, cannot grow): no automatic re-runs; B6.1 ≈ $6.80 (spent $7.37); B7 = Sonnet 5.5 medium + Haiku 5.5 medium ≈ $5.20, the rest for re-checking cases that differ |
| D41 | B7b: models in scope | **Owner (2026-10-13):** the final choice is Sonnet 5.5 or Opus 5.5; Haiku 5.5 is out. No per-question routing or two-model setup for now. |
| D42 | B7b: paid gate | **Approved:** a 4-case Sonnet check, full runs of Sonnet 5.5 medium, Opus 5.5 medium (same prompt, for a fair comparison) and Sonnet 5.5 high (always run, at the owner's request), then re-checks. Spent $14.14 in total (§8). |
| D43 | B7b: claims check model | **Kept:** Opus 5.5 at low effort, so reports stay comparable. |
| D44 | B7b: catalog review | **Owner:** make the catalog clearer where it helps the model reason. Done as sharper rules and worked examples, not longer text. |
| D45 | D8 outcome | **Owner (2026-10-14):** the app runs on **Sonnet 5.5 at medium effort** (default model and its prices changed). Sonnet high is not used. |
| D46 | B8: who sets the limits | **Owner (2026-10-14):** each organization has a daily question pool (default 100), set by the Platform Admin and shared by all its members, first come, first served. Per-user allocations by organization admins are dropped for now. Platform admins have their own daily limit (default 50). Nobody is exempt. Organization users see their remaining requests. Model, effort and technical limits stay in appsettings. |
| D47 | B8: what counts, and when the day resets | **Approved:** questions that reached the model count, including failed, cancelled and timed-out ones; blocked questions and errors before any response don't. The day is the UTC calendar day. Deleting a session doesn't give questions back. |
| D48 | B8: at the limit | **Approved:** an `error` event with code `daily_limit` and `resetsAt`; `questionsLeftToday` in every `done` event |
| D49 | B8: concurrency | **Approved:** a second question in a busy session is rejected (`busy`), not queued; at most 2 running per user (in memory, per server) |
| D50 | B8: budgets and who sees money | **Owner:** the Platform Admin sets each organization's monthly $ budget. Only platform admins ever see dollars. Organization users see requests, tool calls and tokens (in, out, total), never the model or $. Warnings at 50 %, 80 % and 100 %. Defaults: $25 per organization, $50 for the platform. |
| D51 | B8: at 100 % | **Owner:** stop at 100 % per organization, on by default. The message has no dollars. The organization admin sees "X % of this month's allowance used" from 50 % on. Warnings go to the log, the alert email list and the Platform Admin's usage view. The platform budget only warns. |
| D52 | B8: model with no price | **Approved:** the API starts and logs an Error; Ask Caboodle answers with code `unavailable` |
| D53 | B8: paid check | **Approved:** one smoke question, Sonnet 5.5 medium, about $0.05 |
| D54 | B8: cost formula | **Owner:** tokens are added up per model and the formula is applied once per model (once when one model answers). Declined attempts before a fallback are included from `usage.iterations`. The price table is in code; the five price settings are removed. |
| D55 | B8: where settings live | **Owner:** per-organization settings go in the junior's module settings. Dollar settings carry his new Platform-Admin-only flag (the owner asked him for it on 2026-10-14). Platform-wide settings go in a small Ask Caboodle table. Adding Ask Caboodle's entries to his settings catalog is approved. |
| D56 | B8: platform admins inside an organization | **Owner:** their questions count against their own daily limit and the platform total, never the organization's pool or budget |
| D57 | B8: brokers | **Owner:** a broker's questions use the brokerage's pool and budget, also in a connected brand's environment |
| D58 | B8: order | **Owner:** merge the junior's branch once the flag is in, then B8, then B8b. The package order stays B → C → GA. |
| D59 | B8b: routes | **Approved (2026-10-14):** `GET usage` and `GET organization-usage` (hyphenated, like the 243 other multi-word routes) on `AskCaboodleController`. The Platform Admin's `GET`/`PUT settings`, `GET usage` and `GET budgets` go in a new `AskCaboodleAdminController`. G2 switches only `AskCaboodleController` and leaves `organization-usage` on `organization.update`. |
| D60 | B8b: guards | **Approved:** the Platform Admin endpoints use the admin permission and also require `IsPlatformAdmin`, because a custom Identity role can carry "Run Intelligence Tools" while dollars follow the Identity Admin role, as in `done`. Otherwise `403`. The org endpoint uses IAM `organization.update` and returns "Select an organization." when none is picked, like the junior's `my-organization`. The user endpoint uses the ask guard, which moves to the module guard in G2. |
| D61 | B8b: periods | **Approved:** `from`/`to` as UTC dates, both included, at most 366 days, `to` ≥ `from`. The default is this month so far; with only `to`, that month up to `to`. |
| D62 | B8b: who's who for org admins | **Approved:** name and email (org admins already see them in IAM's members list). Former members still appear. |
| D63 | B8b: deleted sessions | **Approved:** their questions count, as for the limits. Caveat, documented: the soft-delete purge removes them after its retention (default 30 days). If exact yearly totals are needed, a daily rollup table can come with C8. |
| D64 | B8b: what counts in reports | **Approved:** the limits' rule: questions that used the model (cost > 0). Running questions count in "left today" but not in the reports. |
| D65 | B8b: the "X %" figure | **Approved:** a whole %, rounded down. The 50 % cut-off is fixed, not tied to the editable thresholds. Above 100 % shows the real figure. |
| D66 | B8b: users and a stopped month | **Approved:** the user endpoint says the month is stopped and when it renews, with no % and no $. |
| D67 | B8b: platform settings limits | **Approved:** the same ranges as the module settings. Daily limit required, 0–100,000 (no "no limit", D46). Budget required, $1–$100,000. 1–5 distinct thresholds from 1 to 100 %. Up to 20 valid emails. Changes go into the existing audit trail. |
| D68 | B8b: support questions | **Approved:** they appear under "Platform admins" in the Platform Admin's report, never in the organization's view (D56). |
| D69 | FE design input | **Owner (2026-10-15):** the Workbench artifact (§10.2) sets the functionality: screens, actions and the data shown. It does not set the look; the FE team owns the theme and is reworking it. The artifact predates D50: organization users see no model or $, and Platform Admin settings live on a separate module-settings page. |
| D70 | Answer contract and order | **Approved (2026-10-15):** every answer uses one fixed set of pieces (C0). Pins re-run the same data block, so its totals, highlights and headline are rules the server applies again on every run. C0 comes before C1, so the order is C0 → C8. |
| D71 | Backend vs FE | **Approved (2026-10-15):** the split in §10.3. Any number shown as a fact comes from the backend; the FE only draws visual aids from the rows it has. |
| D72 | B10: personal data for platform admins | **Agreed (2026-10-15):** user and contact email addresses and phone numbers wait for the data-handling statement (G8) and Constance's agreement. Names are fine now. The `[email]` / `[phone]` masking stays. |
| D73 | B10: other users' questions | **Agreed:** platform admins don't read other users' Ask Caboodle questions or transcripts. The B8b usage report gives the counts. |
| D74 | B10: email logs | **Agreed:** the metadata only (template, status, dates), with no addresses or message bodies. |
| D75 | Who can ask about what | **Owner:** platform admins can ask about the whole system except credentials (B10). Organization users and organization admins only about what their IAM access allows (G3–G5). Organization admins seeing their own organization's admin data (members, roles, invitations) is an optional later package (§7.2). |
| D76 | Caboodle guide | **Owner:** C9 covers concepts and relationships first, with how-to steps after the FE rework. Sources: Caboodle's user-documentation GitHub repo (access to come), the catalog and the app's rules. Constance reviews and approves the content. |
| D77 | Order and B9 contents | **Owner:** C0 → B9 → B10 → C1 → … → C9. B9 adds the promotion fee lines through the calculator, plus `CRM.DistributorRetailers`, `DistributorBrands` and `RetailerRegions`, without loosening security. |
| D78 | No invented app steps | **Agreed:** until the guide exists, the agent never writes app steps and points to the screen instead (C0, item 11). |
| D79 | C0: headline rules | **Approved (2026-10-15):** `total`, `first`, `max` or `min` of a numeric column, computed and formatted by the server. Only for `answer`, and only when one figure answers the question. An optional `label_column` names the row for first, max and min; `ties` counts other rows with the same value. The label has at most 60 characters and no digits: the period and scope go in the notes. It may point at another result than the table (a store count is one distinct count). Refused over a result cut at 500 rows (except `first`) and for a total of percentages. |
| D80 | C0: notes | **Approved:** `source` is required whenever a table, chart or headline is shown; `scope` when it applies; `period` gives the months the figures actually cover, checked against the latest month with data, never just the period asked (added after Q04-DAVID failed twice); `needed` and `available` are required for `cannot_answer` and dropped otherwise. One sentence each (at most 200 characters), in the app's words: schema-qualified and compound catalog names are rejected. The text no longer ends with a "Source:" line. |
| D81 | C0: storage | **Approved:** one `jsonb` column, `AskMessages.PiecesJson` (kind, headline, notes, options); the table rules go in the existing `DataJson`; `AskFeedback.Reason` (integer, null). Migration `AddAskCaboodleAnswerPieces`, local `caboodle_dev`. |
| D82 | C0: clarify | **Approved:** 2–5 options, shown as buttons; choosing one sends its label as the next question. Suggestions sent with a clarify are dropped silently, not rejected (a rejection costs a model step). |
| D83 | C0: feedback reasons | **Approved:** `wrong-number` (5), `wrong-entity` (10), `missing-context` (15), `other` (20). They come from the user, with a down rating only; a new up rating clears the reason. |
| D84 | C0: a second `present_answer` | **Owner (changed from "reject"):** a later valid call replaces the frame, the table and the suggestions, so a corrected table never sits next to a wrong one. A rejected call changes nothing. The FE clears an answer's pieces on a new `frame` event. |
| D85 | C0: names on the wire | **Approved:** the new event is `frame`; `chart` keeps its name as the default view, because stored answers and the B3 contract use it. |
| D86 | C0: cannot_answer | **Approved:** it may carry a table of what is available, never a headline. Added after the 4-case check: a forecast question stays `cannot_answer` even when a plan or past figures could stand in. |
| D87 | C0: eval | **Approved:** the `kind` check counts (refuse → `cannot_answer`; clarify → `clarify` or a stated reading; otherwise `answer`). **Owner, after the full run:** a case the data answers only in part lists the kinds that fit in `expect.kinds`; Q15, Q19, Q34 and Q41 accept `answer` or `cannot_answer`. The headline check (7 cases marked) and the schema-word check are reported only. The app group (Q42–Q44) is reported on its own line, outside the overall pass rate, until C9 adds a fourth case. |
| D88 | C0: screens in app answers | **Approved:** only the six screens the catalog names (its NOT AVAILABLE pointers). No new screen names until C9 has a documented source. |
| D89 | Answer quality bar | **Owner (2026-10-15):** answers must be precise and concise; a wrong figure is worse than none. More answer kinds are welcome when they serve that. **The goal:** right about 95 % of the time and honest about the rest. When Ask Caboodle can't answer, it says so and shows what it can, instead of guessing; no system answers everything. |
| D90 | Order and C0b | **Owner (2026-10-15):** a fact-check package, C0b, comes right after C0: C0 → C0b → B9 → B10 → C1 → … → C9. Its step 2 is package C0c (rankings, trend words and figures in the wrong place), right after C0b (owner approved the placement), with go or no-go decided by C0b's measured numbers. |
| D91 | C0b: figures still unverified after one correction | **Owner:** the answer is sent with a note that some figures couldn't be verified, and logged for C8's triage. |
| D92 | C5 additions | **Owner:** human approval; a starter library of at least 100 questions, mostly for brands and brokers, verified with Constance; C0's rules stored with each example; a nightly re-check; templates with slots (§4 C5). |
| D93 | Data problems | **Owner:** the owner fixes them at the source with the brands, later. Until then each one is recorded in the data-issues doc, the warnings stay, and Ask Caboodle never patches data. When one is fixed: re-check it, remove its warning, re-record the eval figures, and mark it fixed. |
| D94 | Model | **Owner (reconfirmed):** the app stays on Sonnet 5.5 medium for cost (D45). Opus 5.5 at low effort stays only as the eval's claims check (D43). |
| D95 | A second check per answer | **Owner:** no second model check on every answer. Re-running a specific step to confirm an answer may come later, decided with C8's real-usage data (§7.2). |
| D96 | How checked text streams | **Owner (2026-10-15), after the streaming demo (https://claude.ai/artifact/BEggmtkXmewyuQ5B2W3pYA):** panel 3, "sentence by sentence, typed out". Each sentence is released once its figures pass C0b's check, and the FE types it out word by word. It feels like word-by-word streaming (about 0.5 s later to start) and never shows an unchecked figure; a failed figure pauses the text while the answer is rewritten. C0b builds the per-sentence check; C1 wires it into the stream. |
| D97 | Feedback loop from real use | **Owner (2026-10-15):** real use drives the fixes. Every thumbs-down answer, with its C0 reason, goes to C8's triage list, where the Platform Admin records the fix. Each fixed one becomes a golden eval case, so the fix is measured and stays fixed. This is how answers improve after launch; nobody expects them to be right on day one. |

### 7.1 Demo track — dropped 2026-10-12 (D3), kept for history

Goal: a convincing, reliable admin demo on real data. Order by demo value, each still one package with go-ahead:

1. **B0** preflight (+ D10 cleanup).
2. **B1** caching (cheaper, no risk).
3. **B3** saved sessions + history + feedback (demo shows history/follow-ups; survives restarts).
4. **C1** streaming (answers appear live — biggest UX win).
5. **B4 (subset)** catalog additions for the questions the demo will ask (owner gives 8–10 demo questions) + drift test.
6. **B6 (subset)** run the demo questions as the first eval set — proves they answer correctly before the client sees them.
7. **C3** pinned live reports (strong "wow": answer → live dashboard widget, zero LLM cost to view).
8. **B2** read-only role + fuzzy matching (misspelled names in the demo).
9. FE (owner's mockup) — needs the API from 3, 4, 7.

After the demo: B5, B7, B8, C2, C4–C8, G1–G8, A1–A3.

### 7.2 Open decisions (from 2026-10-15)

Each one is posted with its package, and gets a D number once decided.

| Open point | Package | Recommendation so far |
|---|---|---|
| C0's own decisions: headline rules, `source` required, storage, options as suggestions, feedback reasons | C0 | **Decided:** D79–D88 |
| C0b with streaming: hold the text until it's checked, or stream it and replace it when the check fails | C0b, C1 | **Decided:** D96, sentence by sentence, typed out (panel 3). |
| Re-running a step to confirm an answer (instead of a second model check) | Later, after C8 | Decide with real-usage data: which answers go wrong, and which step to re-run (D95). |
| How much of the run trace organization users see; `done.queries` (raw SQL) goes to everyone today | C1 (before G2) | Organization users get labels, tools, timings, row counts and matched names. SQL, tables, columns, catalog notes and Postgres errors are for platform admins only. |
| One list of period tokens for pins | C3 (also C0's `period` note) | Merge the two lists; owner picks |
| KPI delta against the previous period on a pin | C3 | Optional; costs a second run of the plan, no AI call |
| Personal or shareable pins | C3 | — |
| Who reviews prompts shared with an organization | C4 | — |
| Thumbs-down triage list in the Flight recorder | C8 | **Decided:** D97. Build it in C8; each fixed answer becomes an eval case. |
| Sonnet 5.5 cache-read price: $0.10 per million tokens (B8; the app's `ModelPrices`) or $0.20 (the `claude-api` skill's table) | Owner (Claude Console) | If the Console bills $0.20, update `ModelPrices`: answers cost about 14 % more than the reports say, and the budgets fill faster. |
| Where the organization admin's usage page and the "questions left today" indicator sit | FE (§10.9) | FE team |
| Grant `DataHub.DistributorUpcMappings` (without notes and "resolved by") | B9 | Owner decides when B9 starts |
| Split B10 into B10a (IAM, organizations, modules, settings, audit) and B10b (data pipeline) | B10 | Decide when B10 starts |
| Organization admins asking about their own organization's members, roles and invitations | Later (after GA) | Optional; scoped to their organization and their IAM permissions |
| Access to the user-documentation repo, and the review format for Constance | C9 | Owner provides access; the format is agreed when C9 starts |

## 8. Progress log

| Package | Status | Commit | Notes |
|---|---|---|---|
| 1a | done | `b2b9996a` | 68 tests; $0.12–0.14/question baseline |
| B0 | done | — (no code) | 2026-10-12: branch `feature/ask-caboodle` @ `b2b9996a`, clean; IAM base `cba9c60d` unchanged and `origin/develop` fully contained after fetch; build 0 errors (2,178 pre-existing StyleCop warnings); tests 5,193/5,193 green (Intelligence 68, DB gateway test verified on `caboodle_dev`); migrations 166 applied, 0 pending, last `RemoveLegacyIntelligenceTables`. Live smoke (= B1 "before"): correct — 92,376 KeHE cases to Sprouts Jan–Sep 2026, monthly figures match direct SQL; one narrative slip ("stores rose every month since April" — May dipped to 484, the duplicated Feb/May upload) → B6 should check narrative claims, not just numbers. `ANTHROPIC_API_KEY` is a Windows user variable; VS Code did not pass it to the agent shell, so the scratchpad smoke script reads it from the user scope into the test process only. Question set drafted: [`ask-caboodle-question-set.md`](ask-caboodle-question-set.md). **Safety:** `dotnet ef` defaults to the Production environment (prod RDS in `appsettings.Production.json`) — always run it with `ASPNETCORE_ENVIRONMENT=Development` and `--connection` to local. |
| B1 | done | `59710708` | Same question, brand and answer before/after (Opus 5.5, medium). **Before** $0.1159: 4 calls, 17.4 s, uncached input 14,889, cache read 14,403, write 4,801 (system+tools prefix), output 1,472. **After** $0.0701 (−40 %): 4 calls, 19.4 s, uncached input 10, read 29,012, write 5,800 (conversation only), output 1,764 — the prefix was still warm from the "before" run. Derived from the measured tokens at equal output (1,472): prefix warm (later questions within the hour) **≈ $0.064 (−45 %)**; first question of an hour with the 1h prefix ≈ $0.102 (−12 %); with a 5m prefix it would be ≈ $0.087 (−25 %). Conversation caching alone saves ≈ $0.029/question (input $0.060 → $0.031). Note for B3/B7: the conversation tail is 5m, so a follow-up asked > 5 min later rewrites the history — revisit with measured follow-up gaps. Intelligence tests 72 (coverage 97.7 %). |
| B2 | done | `940365b8` | Migration `20261011191206_AddAskCaboodleReadOnlyRole` (applied on local `caboodle_dev`): `pg_trgm`; `askcaboodle_ro` NOLOGIN (skipped with a NOTICE where the migration user can't create roles — ops creates the roles before that deploy); USAGE on 7 schemas + SELECT on exactly 19 tables (16 catalog + `CRM.DistributionCenters`, `DataHub.UnifiedEntityAliases`, `DataHub.UnifiedEntities` for entity search), nothing else; 12 partial GIN trigram indexes built CONCURRENTLY (the plan's 11 + alias `RawValue`). Role settings (`default_transaction_read_only`, `statement_timeout` 15s) live on the login role — group-role settings are not inherited. Login `askcaboodle_app` created by the owner with `docs/AskCaboodle-ReadOnlyLogin.sql` (password via `\password`); dev connection string in the Windows user variable `IntelligenceSettings__ReadOnlyConnectionString`, not in git. Entity search: names also match by trigram (`%` / `<%`), ranked by GREATEST(similarity, word_similarity), labelled `trigram`, scored 0.4–0.65 (below exact/prefix/alias/contains), shorter name wins ties. Tests: grant-vs-catalog+registry consistency (parses the migration), DB tests as the RO login (reads granted tables; Identity refused 42501; writes refused 25006 / 42501; timeout 15s; every registry query runs; wallmart, sprots, krogr, pubix, keyhe, unfy resolve). Intelligence 84 tests, coverage 97.8 %; solution 5,209 green. Paid run on the RO login, "cases to sprots through keyhe this year": correct (92,376 cases, $2,926,472, names stated), 4 calls, 15.9 s, $0.0998 (first question of the hour). |
| B3 | done | `4263a43c` | 2026-10-12. `Modules.Intelligence.Domain` re-added (sln with the original project GUID, Dockerfile, references; also fixed the missing `EndProject` that 1a left on `Brand.Application.Test` and the dangling Shared.Infrastructure reference). Migration `20261012054802_AddAskCaboodleSessions` (applied on local `caboodle_dev`): `Intelligence.AskSessions`, `AskMessages` (unique session + sequence), `AskToolCalls`, `AskFeedback` (unique message + user); child FKs cascade; no grants to `askcaboodle_ro`. Endpoints `GET sessions`, `GET sessions/{id}`, `DELETE sessions/{id}`, `POST feedback` (same admin permission); FE contract `docs/AskCaboodle-FE.md`. Tests: stubbed replay test proves a restored conversation sends a byte-identical request; opt-in DB test on `caboodle_dev` (write → new scope → follow-up → empty cache rebuild → history/feedback/delete endpoints, rows removed afterwards). Intelligence 140 tests, coverage 95.2 % unit-only / 98.5 % with DB; solution 5,265 green; build 0 errors, no new warnings. **Paid check (D15), $0.23 total**, brand Bubbies, three "processes" with their own cache and DB scope: Q1 new session — 92,376 KeHE cases to Sprouts (matches B0/B2), 4 calls, $0.1022; Q2 after the restart — replayed verbatim (`StartsConversation` false), cache read 33,029 / write 1,834, 3 calls, $0.0403; Q3 with a 10 K trigger — `clear_tool_uses` accepted by Opus 5.5 and cleared 3.4–7.2 K tokens on each call, answered (UNFI 437 cases, not cross-checked), $0.0900 (cache rewritten after clearing — why the default trigger is high). Test helper for these runs: `LiveRestartTests` (opt-in `ASK_CABOODLE_LIVE_RESTART_TEST=1`). |
| B4 | done | `91e66816` | 2026-10-12.<br>**Catalog:** 16 → 37 tables. Migration `20261012084457_AddAskCaboodleCatalogGrants` is applied on local `caboodle_dev`: it grants the new tables, adds column grants on Contacts and BrandReports, revokes `CRM.DistributionCenters` and moves the trigram index to `DistributorDcs`. Details in §3 B4 "As built".<br>**Tests:** Intelligence 160, coverage 95.3 % unit-only / 98.5 % with DB. Solution 5,285 green. Build has 0 errors and no new warnings. All 44 catalog examples run as `askcaboodle_app`.<br>**Paid check (D22), $0.60 total**, Opus 5.5, brand Bubbies, one fresh conversation each. Every number below was checked against direct SQL.<ul><li>**List price:** "no KeHE price in effect yet; $3.96/unit, $39.60/case from Nov 1, 2026". $0.1129, 4 calls, 14 s; first of the hour, prefix written.</li><li>**SPINS at Sprouts, 12 weeks:** $1.40 M, 239 K units, 48 % of units on promotion. Duplicates were checked and the data was labelled as scan sales. $0.1009, 5 calls, 34 s.</li><li>**Ube authorization:** 49 banners for the main SKU, none pending; placeholder rows were explained. $0.0823.</li><li>**Sandbox vs approved 2026:** 2,761,800 vs 1,496,729 cases, with the refresh date. $0.1080.</li><li>**Category reviews:** one linked review, INFRA, still "Not Started". $0.0819.</li><li>**Buyer contacts and emails:** names and titles only; said emails are not available and pointed to CRM → Contacts. $0.0481.</li><li>**"Albertsons" last quarter:** searched ABSCO directly from the alias list; 41,149 cases, $1.304 M, 1,589 stores. $0.0614.</li></ul>**Cost note:** the system prompt grew with the index and glossary. The first question of the hour cost $0.113 (B2: $0.0998); the later questions averaged $0.080. |
| B5 | done | `32e4569d` | 2026-10-12.<br>**Built:** the `get_promotion_performance` tool (approved and sandbox) on the screens' calculator; details in §3 B5 "As built".<br>**Tests:** reconciliation equal to the screens, approved 3 promotions (year and Q4) and sandbox 5 versions. Intelligence 182 tests, coverage 96.2 % unit-only / 98.8 % with DB. Solution 5,307 green; build 0 errors, no new warnings.<br>**Paid check (D29), $0.60, 6 questions**, Opus 5.5, Bubbies. Every figure matched the reconciliation run.<ul><li>**Q22, Q4 Sprouts TPR spend:** $40,136. Both identical 2026 plans were flagged and not doubled, and it asked which plan is current. $0.1511, first of the hour.</li><li>**Spend and net by product, SPROUTS 2026 - MD:** $795,671 spend, $2,543,682 net. The first run showed per-product lines were missing revenue and net; fixed, and the re-run answered all 12 products, summing to the totals. $0.0829 + $0.0859.</li><li>**Highest TPR % at Sprouts:** 2025 CW MD, 23.6% (21.7%, 20.3% for the two 2026 versions, kept separate). $0.0805.</li><li>**Sandbox SPROUTS 2027 - MD:** $1,001,842 TPR spend, 20.0%. It used the reporting version and labelled the figures what-if. $0.0538.</li><li>**Planned vs actual by month (D26):** stated "last refreshed 8 Oct 2026, parts older". It also spotted that the report's Jul–Sep actuals are stale against shipments and suggested a refresh. $0.1437.</li></ul>**Also added during the check:** the month-filter EDLP note (the agent found it in Q22; it is now always stated by the tool). |
| IAM merge | done | `b30b387c` | 2026-10-12. Merged `feature/CS-1770-iam-service-broker-workspace` @ `3ebc295e` (9 commits, no migrations).<br>**Conflicts:** the legacy Intelligence chat code stays removed; the junior's tests for it and his duplicate `Intelligence.Application.Test` solution entry were dropped; we took his `bare-endpoints-baseline.txt` (4 lines left).<br>**Adaptation:** the calculator builders now take a brand id, so `PromotionCalculator` passes it and `BrandScopedCurrentUser` is removed.<br>**Results:** build 0 errors; 6,051 tests green across 16 projects; Ask Caboodle DB tests and the promotion reconciliation with the access-engine screens green; no pending model changes (an empty throwaway migration was generated, then deleted).<br>**Review of the IAM answers:** `ask-caboodle-questions-for-iam.md`, "Review of the answers". |
| B6 | done | `9f825cce` | 2026-10-13. Owner accepted run 1 with its review as the B6 baseline (2026-10-13); the clean measured baseline comes from the first full run after B6.1. Golden set and harness as in §3 B6 "As built".<br>**Tests:** Intelligence 246 (65 new); solution 6,116 green across 16 projects; build 0 errors, no new warnings; all 45 references match on `caboodle_dev`.<br>**Paid runs (D36), $7.03 in total** (the cap was $7; one re-run cost more than its reserve):<ul><li>**Harness check:** 3 cases, $0.39. It showed two over-strict checks (Q22's "never show $80,271", and data-source caveats read as claims), which were fixed.</li><li>**Baseline (Opus 5.5, medium):** 45 cases, $6.64. Measured 30/45 (67 %), 84 % on rule checks only; about $0.10 and 26 s per question, 5 steps, 89 % of input read from the cache. Report: BE `docs/AskCaboodle-Eval/2026-10-13-claude-opus-5-5-medium.md`.</li></ul>**Review:** 7 failures came from the eval (Q05, Q11, Q15, Q16, Q26, Q28, Q35) and were fixed. After the review, 37/45 pass, 7 fail and Q19 is unclear. Five agent errors share one habit: stating a pattern ("steadily", "every month", "smallest") without checking every row (Q06, Q10, Q13, Q21, Q31). Q14 invented a chain, and Q27 picked the wrong product. |
| B6.1 | done | `cf0dab78` | 2026-10-13. Owner accepted the run as the B7 baseline, even though the promotions group dropped (judged as noise plus data issue DI2). Details in §3 B6.1.<br>**Tests:** solution 6,120 green (Intelligence 250); build 0 errors, no new warnings; free DB tests green (20).<br>**Paid runs, $7.37:** 9-case check $1.40; full run $5.97.<br>**Full run:** 37/44 (84 %); every rule check passed; 6 agent errors and 1 failure caused by data issue DI2.<br>**Money left for B7:** ≈ $6.60. |
| B7 | done | `2903dce3` | 2026-10-13. The app stays on Opus 5.5 medium (no setting change); the owner wants lower cost, so B7b works on Sonnet first. Sonnet 5.5 medium 35/45 and Haiku 5.5 medium 33/45, against the Opus baseline 37/44. A Sonnet re-check confirmed real drops in Distribution and Calculator. Recommendation: keep Opus 5.5 medium. Spent $4.83; about $1.80 of the testing budget is left. |
| B7b | done | `d7e48370` | 2026-10-14. **The app now runs on Sonnet 5.5 medium** (D45). Details in §3 B7b; report BE `docs/AskCaboodle-Eval/2026-10-14-b7b-sonnet-readiness.md`.<br>**Full runs, same prompt:** Opus 5.5 medium 41/45 ($0.112, 26 s); Sonnet 5.5 medium 39/45 ($0.040, 14 s); Sonnet 5.5 high 38/45 ($0.049, 17 s). Re-checks showed three Sonnet failures were noise; Q06 and Q09 were fixed and verified on both models; Q03 fails on both.<br>**Tests:** solution 6,129 green (Intelligence 259, coverage 96.3 % unit-only); build 0 errors, no warnings in changed files; DB tests 21 green.<br>**Spent:** $14.14, so about $57.65 is left.<br>**Data issues:** DI8–DI10 added. |
| B8 | done | `02a256b6` | 2026-10-14: plan and decisions D46–D58 approved (§3 B8, §7). The junior's branch with the Platform-Admin-only flag is merged (`4d0830e6`); build 0 errors, 6,594 tests green, snapshot consistent, and the 4 IAM migrations applied on local `caboodle_dev`. The open points are resolved: shared pool, default 100.<br>**Built** as in §3 B8 "B8 as built": migration `AddAskCaboodleGuardrails` applied locally; Intelligence 301 tests, DB tests 22 green.<br>**Paid smoke, about $0.075 in total:**<ul><li>**Run 1 (about $0.04):** it wrote the 1-hour prompt cache, then failed on the real `usage.iterations` shape. Fixed and unit-tested.</li><li>**Run 2 ($0.0337, passed):** 4 calls, 11.5 s, Sonnet 5.5 medium.<ul><li>Every real response carries `iterations: [{ type: "message", model: null, … }]` with the same tokens as the top-level usage, which confirms the fix.</li><li>Priced per attempt and priced from the summed usage, the cost is the same ($0.0337).</li><li>`done` showed 5 tool calls and tokens in / out / total of 58,768 / 1,065 / 59,833.</li><li>The answer's monthly figures were right and add up to 92,376, but the stated total was **93,376**. That is the known hand-added-total weakness; B8 doesn't change the prompt.</li></ul></li></ul> | Found while preparing: Sonnet 5.5 cache reads cost $0.10, not $0.20, so B7b's Sonnet cost per answer was about $0.035 (medium), not $0.040. |
| B8b | done | `b2f00e22` | 2026-10-14: plan and decisions D59–D68 approved (§3 B8, §7). The IAM branch is unchanged since `b5adb1a1`. Built as in §3 B8 "B8b as built": 5 endpoints in two controllers, no migration; solution 6,690 green, Intelligence 353, coverage 96.9 %, DB tests 23 green. No paid run (no model calls), so $0 spent. |
| FE review | done | — (docs) | 2026-10-15: the owner's Workbench artifact was reviewed for functionality only (D69). The answer contract became package C0, which comes first (D70). C1, C3, C4 and C8 gained the FE's needs, the backend/FE split is D71, the open points are in §7.2, and §10 collects the FE notes. |
| Plan update | done | — (docs) | 2026-10-15: B9 (catalog completion), B10 (Platform Admin knowledge) and C9 (Caboodle guide) added, plus the C0 guard for app questions. §9 gained a "Plan" column. Decisions D72–D78. |
| C0 | done | `a102eed1` | 2026-10-15: plan and decisions D79–D89 approved (§4 C0, §7); the IAM branch is unchanged since `b5adb1a1`. Built as in §4 C0 "C0 as built": migration `AddAskCaboodleAnswerPieces` applied locally; solution 6,735 green, Intelligence 398, coverage 97.3 %, DB tests 23 green, build 0 errors.<br>**Paid checks, $3.54:** full run 40/45 counted (B7b 39/45) with the kinds fix, app questions 3/3, $0.035 per answer; the re-checks fixed Q04-DAVID (period), Q19, Q43 and Q44 (fewer rejected calls). Q11, Q29 and Q27 are still failing (see "C0 as built").<br>**Balance:** about $54.03. |
| C0b | next | | Fact check, step 1: every figure the user sees is checked against the figures the model had (D90, D91, D96). Plan posted 2026-10-15; awaiting the go-ahead. |
| C0c | planned | | Fact check, step 2: rankings, trends and figures in the wrong place. Right after C0b (placement approved 2026-10-15); go or no-go with C0b's numbers (D90). |
| B9 | todo | | Catalog completion: fee lines through the calculator, and three CRM tables. |
| B10 | todo | | Platform Admin knowledge: everything except credentials (D72–D75). |
| C1 … C8 | todo | | C1 now includes the run-trace events. |
| C9 | todo | | Caboodle guide. Needs the documentation repo and Constance's review. |
| G1 … A3 | todo | | |

## 9. Data Ask Caboodle does not read

Data *problems* found along the way (wrong or duplicated rows in Caboodle's own data) are tracked separately in [`ask-caboodle-data-issues.md`](ask-caboodle-data-issues.md).

**How to read this section.** Ask Caboodle reads only what the catalog describes and what its read-only database login is granted. Everything else is listed here, so nothing is left out by accident:
- **9.1 Excluded on purpose:** each row is a decision with a reason. The "Plan" column says when, or whether, that changes.
- **9.2 Not included yet:** business tables nobody has needed so far. The "Plan" column says whether a package adds them.

**Adding a table is deliberate work in a package,** with the owner's go-ahead. It needs:
- a catalog entry: meaning, columns, joins, a worked example;
- a grant in a migration;
- the drift and grant tests;
- an eval case or two;
- sometimes a tool, when the app itself calculates the figure.

Nothing is added automatically.

"Plan" values:
- **B9**, **B10** or **G3**: scheduled in that package;
- **on request**: added when a real question needs it;
- **G8**: after the data-handling statement;
- **never**.

Kept up to date in every package that changes the catalog or the grants. The agent sees a short version of 9.1 in its system prompt (glossary `not_available`). When asked about that data, it says the data exists in Caboodle, names the screen to use, and never answers from another table.

### 9.1 Excluded on purpose (decided)

| Data | Where it lives | Why skipped | How it is enforced | Plan |
|---|---|---|---|---|
| Contact email, phone, notes | `CRM.Contacts` `Email`, `PhoneNumber`, `ContactNotes` | Personal data would be sent to the Claude API (D23). Notes are skipped too because some hold emails. | Column grant: `askcaboodle_ro` can read only ID, BrandID, names, title, company and Deleted | **G8**, with the data-handling statement and Constance's agreement; for platform admins too (D72) |
| Emails and phone numbers typed into notes | Any text column (activity notes, comments, brand-report notes) | Same reason (D23 applied to free text) | The gateway replaces them with `[email]` / `[phone]` before the model or the screen sees them | **G8**, as above |
| Brokerage-internal Brand Report notes | `Broker.BrandReports.InternalNotes` | Brokerage-only working notes; brands get only the shared ones (D18) | Column grant | **G3/G4**, only if a broker-only audience needs them |
| Individual promotion fee lines | `TradeSpend.BrandApprovedPromotionFees`, `TradeSpendSandbox.PromotionFees` | Calculator inputs. Fee and spend **totals** have been available since B5 through `get_promotion_performance`; the lines (fee names, types, coupon / Prime settings) were not. | Not granted; read only through the app's calculator | **B9:** the fee lines through the calculator, still with no SQL grant (D77) |
| Raw distributor files | `DataUpload.KeHeRecords`, `UnfiRecords`, `KeHeMappedRecords`, `UNFIMappedRecords`, `DataMappings` | Already normalized into `DistributorSalesRecords`. The raw-only fields (KeHE prior-year quantity, UNFI published wholesale) are rarely asked about. | Not granted | **B10b** for platform admins; **on request** for everyone else |
| Legacy SPINS format | `DataUpload.SpinsRecords` | Superseded by Stores Insight and Item Ranking; only DataHub cleanup still references it | Not granted | **Never** |
| Banner activity types | `CRM.BannerActivityTypes`, `BannerActivities.BannerActivityTypeID` | Never populated or read by the app | Not catalogued | **On request**, if the app starts recording types |
| Documents | `FileRepository.*` | Files, not data | Not granted | **Never** |
| Credentials | `Identity.UserTokens`, `UserLogins`, `UserClaims`, `VerificationCodes`; the password hash, stamps, refresh tokens and email codes in `Identity.Users`; invitation and share-link tokens; `DataHub.ThirdPartyCredentials` | Secrets | Granted to neither login. From B10, a test fails if a secret-like column is ever granted. | **Never** |
| Users, organizations, roles, access, modules and settings, audit, email logs, purge runs | The `Identity` (minus credentials), `Organization`, `Configuration`, `Auditing`, `Email` and `DataLifecycle` schemas; `Brand.BrandBrokers`, `Brand.BrandSubUsers` | Security and IAM data | The SQL guard rejects these schemas on the standard login | **B10, for platform admins only** (D75): no credentials, no personal contact data before G8 (D72), email-log metadata only (D74). **Never** for organization users. |
| Ask Caboodle's own records | The `Intelligence` schema | Other users' questions and transcripts | Not granted; the guard rejects the schema | **Never** (D73). Usage counts come from the B8b report. |
| Background jobs and system tables | `hangfire`, `public` | Infrastructure | The guard rejects these schemas | **Never** |

### 9.2 Not included yet (business data)

| Tables | What they hold | Plan |
|---|---|---|
| `CRM.DistributorRetailers`, `CRM.DistributorBrands`, `CRM.RetailerRegions` | Which distributor serves which retailer for a brand (with the distributor markup %), brand ↔ distributor links, and retailer ↔ region ↔ banner links | **B9** (D77) |
| `DataHub.DistributorUpcMappings` | Distributor items ↔ Caboodle products, with match status | **B9, optional** (§7.2), without `ResolutionNotes` and `ResolvedBy` |
| `Broker.PromoTabs`, `PromoTabColumns`, `PromoTabRows`, `PromoTabCells` | A brokerage's own Promo Tabs spreadsheets | **G3**, broker audience only, with each brokerage seeing only its own |
| `Broker.CategoryReviewCalenderDateAssignments`, `BrandReportStatusSettings` | Calendar date assignments and status settings | **On request** (low question value) |
| `Broker.BrandReportEmailLogs`, `CategoryReviewEmailLoggers` | Notification email logs | **B10**, metadata only, for platform admins (D74) |
| `CRM.PipelineActivityFiles` | Attachments on pipeline activities | **Never** (files) |
| `CRM.DistributionCenters` | Warehouse names | **Never:** replaced by `CRM.DistributorDcs` (the grant was revoked in B4) |
| The DataHub import, sync, mapping and data-quality tables: `ImportJobs`, `ExportJobs`, `DataSyncRuns`, `MappingSuggestions`, `Unmapped*`, `StoreListIssues`, `StoreMergeHistories`, `StoreCleanupChangeLogs`, `DistributorCustomerLinks`, `AddressReferences`, `AliasAuditTrail`, `AliasMatchAttempts`, `BrandDataCleanupJobs`, `UnmappedRecordResolutionAudits` | The import pipeline's internals | **B10b**, for platform admins only. `UnifiedEntities` and `UnifiedEntityAliases` are already read by the name search (approved aliases only). |

## 10. Frontend (collected for the final FE document)

### 10.1 What this section is
This section collects, package by package, what the FE needs: the screens, the behaviour, who sees what, and the states to design. The API contract itself stays in BE `docs/AskCaboodle-FE.md`, which is updated with every package. When the packages are done, this section and that contract together become the full FE document.

Every package that changes something the user sees adds its line to §10.8.

### 10.2 Design input
- **The owner's Workbench artifact:** https://claude.ai/artifact/RYGD6o4mxRvnRBQq1XX6A5. It sets the functionality (D69): screens, actions and the data shown.
- **The look is the FE team's.** They are reworking the theme. The API never sends colours, fonts or layout.
- **Out of date in the artifact:**
  - The model chip ("claude-sonnet-5 · effort low") and the trace's Cost and Model rows are for platform admins only. The app runs Sonnet 5.5 at medium effort.
  - The step meters show 8 steps and 90 s; the app allows 12 steps and 180 s.
  - The Stop note says "Partial results were not saved". In fact the question is saved as cancelled and counts toward today's limit.
  - Answer text is full markdown, not the artifact's subset, so it needs a safe markdown renderer.
  - The Platform Admin's settings are on a separate module-settings page.

### 10.3 Backend vs FE (D71)
| Backend | FE |
|---|---|
| Runs the agent, tools and SQL; returns typed rows | Every visual: layout, theme, fonts, colours, icons |
| Picks the frame (`answer` / `clarify` / `cannot_answer`), the notes, the options and the suggestions; writes the text (C0) | Renders the markdown, streamed word by word from C1 on |
| Data block: default view, axes, series, formats, totals, best/worst rules (C0) | Draws the table and the charts, and the Table/Chart switch, from the same rows, with no extra call |
| Computes every figure shown as a fact: headline, totals | Only visual aids from the rows it has: bar lengths, share of the rows shown, change between two series |
| Who sees what: $, model and SQL only for platform admins | Shows only what arrives; a missing field hides its element; admin-only screens are hidden by role |
| Limits and error codes | One message or design per error code (§10.6) |
| Stores history and pins; re-runs pins; nightly check; resolves period tokens | The pin dialog (title, period choice), the pins page, Re-run and Open |
| Trace data: live events, plus an endpoint for past answers (C1) | The trace drawer, the run chip, the step meters |
| Feedback storage, with a reason (C0) | Thumbs, reason chips, note box, Copy, Stop |

### 10.4 Screens and who sees them
| Screen | Who | API |
|---|---|---|
| Ask: conversation, composer, history rail | Everyone who can ask | `ask`, `sessions`, `feedback` (B3); answer pieces (C0); streaming (C1) |
| Run trace drawer | Everyone; the detail depends on role (§7.2) | C1 |
| Empty state with starters | Everyone | `GET suggestions` (C2) |
| Prompt gallery and the `/` picker | Everyone | C4 |
| Pinned reports | Everyone | C3 |
| "Questions left today" indicator | Everyone | `done.questionsLeftToday` (B8), `GET askcaboodle/usage` (B8b) |
| Organization usage (by member, % of the allowance from 50 %) | Organization admins | `GET askcaboodle/organization-usage` (B8b) |
| Platform settings, usage report, budgets | Platform admins (separate settings page) | `askcaboodleadmin/*` (B8b) and `modulesettings` |
| Flight recorder | Platform admins | C8 |
| Scope chip ("Northpoint · 4 connected brands") | Everyone | IAM `GET me/access` |

### 10.5 How an answer renders (C0)
The full contract is in BE `docs/AskCaboodle-FE.md`, "The answer pieces".
- **The frame comes from `kind`:** `answer`, `clarify` (option cards) or `cannot_answer` (the "not answerable" box with "needed" and "available", and possibly a table of what is available). Treat an unknown kind as `answer`.
- **The order is fixed:** headline → notes → text → data → options → suggestions → actions. A piece that is missing is simply not shown.
- **A new `frame` event replaces everything** shown for that answer so far (frame, table, suggestions), because the agent may correct itself (D84).
- **Figures shown as facts come from the server:** the headline's `display`, the table's `totals` and its highlighted `rows`. The FE only draws visual aids from the rows (D71).
- **Formats:** every column has one (`count`, `number`, `usd`, `percent`, `date`, `text`). When `chartable` is false, hide the Table/Chart switch.
- **One component everywhere:** the data block is the same in a live answer, a reopened session and a pin render. Answers saved before C0 come back as `answer` with no headline or notes; render them as text plus data.
- **Clarify choices:** choosing an option sends its label as the next question in the same session.
- **App questions** ("what is a promotion family?", "how do banners relate to stores?"): these are normal answers. Their `source` note is "Caboodle guide" once C9 ships.

### 10.6 States to design
- **Error codes:**

  | Code | Meaning |
  |---|---|
  | `daily_limit` | Shows `resetsAt` |
  | `monthly_limit` | Shows `resetsAt`; never an amount |
  | `busy` | This conversation is still answering, or 2 questions are already running |
  | `rate_limited` / `service_busy` | Try again in a minute |
  | `timed_out` | Ask a narrower question |
  | `unavailable`, `refused`, `failed` | — |

- **Statuses in history:** `step-limit`, `cancelled` (stopped), `timed-out` and the other statuses from BE `docs/AskCaboodle-FE.md`.
- **Data:** truncated data ("showing the first 500 rows") and a result that can't be charted (no Table/Chart switch).
- **Progress:** progress labels during a run, the stopped state, the chosen option after a clarify, and feedback sent.
- **Usage:** the stopped month ("used this month's allowance, renews on …"), and the organization admin's "X % used" from 50 %.

### 10.7 Role rules for the FE
- **Organization users never see dollars or the model.** The API already leaves them out; the FE must not show empty slots for them.
- **Admin-only screens** (Flight recorder, the Platform Admin's settings, usage and budgets) are hidden unless the user is a platform admin.
- **No extra FE checks for what users may ask about.** The backend decides what each role can read (D75): platform admins can ask about the whole system except credentials, and everyone else only about what their access allows. The FE shows the answers as usual.
- **The run trace's SQL and schema detail:** decided in C1 (§7.2).

### 10.8 FE impact by package
| Package | What the FE gets or must handle |
|---|---|
| B3 | Saved sessions, history, feedback; the `session` event |
| B5 | Calculator progress labels ("Calculating 2 approved promotions"); promotion tables |
| B8 | `error.code`, `resetsAt`, `questionsLeftToday` in `done`; tokens for everyone, while $ and the model are for platform admins only (`done` and history) |
| B8b | `GET askcaboodle/usage`, `GET askcaboodle/organization-usage`, `askcaboodleadmin/settings`, `usage`, `budgets` |
| B9 | Fee lines in promotion answers (one row per fee: name, type, where it applies, amount); markup, region and distributor answers. No new FE pieces. |
| B10 | No FE change; platform admins get wider answers (organizations, users, modules, imports) |
| C0 | The `frame` event (kind, headline, notes, options) and its replace rule; the data block's series, formats, totals, highlights and `chartable`; the same pieces in `GET sessions/{id}`; the feedback `reason` (down only) and `feedbackReason` in history |
| C0b | A note naming the figures that couldn't be checked (rare); a corrected answer may take a few seconds longer |
| C1 | Streamed text as checked sentences that the FE types out word by word (D96; see the streaming demo), with the "rewriting" pause when a figure fails; live trace events, the trace endpoint, the step limits |
| C2 | Starters for the empty state |
| C3 | Pins: create, list, render, delete; broken pins |
| C4 | Prompt gallery and the `/` picker |
| C6 | Web sources (`sources` event, `sourceType`) |
| C7 | "Remember this name for your organization?" after a clarify |
| C8 | Flight recorder data |
| C9 | Guide answers: normal answers with the `source` note "Caboodle guide". Later, optional "Open screen" links (an additive C0 piece). Until then (D78), app questions get "can't explain the steps yet", plus the screen to use. |
| G2–G3 | Organization users can ask; brand and broker scope; the `BrandID` header, and cross-brand use for brokers |

### 10.9 Open FE questions (for the FE team)
- Where the organization admin's usage page and the "questions left today" indicator sit.
- How a broker's cross-brand scope is shown and switched (G3).
- The phone layout: the artifact has a top bar and a drawer for narrow screens.
