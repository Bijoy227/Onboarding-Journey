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
| L8 | Zero-LLM paths: pinned reports re-execute stored SQL (no model call); suggestions/gallery are static; session titles: one short Haiku 5.5 call per conversation since C1b (≈ $0.00003) | none | C2, C3, C4 | removes recurring cost |
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

### B9 — Catalog completion (done 2026-10-16, commit `a8387b82`)
Decisions D75 and D77 (owner, 2026-10-15); D109–D114 (owner, 2026-10-16). Adds the useful business data that is still missing, without loosening security (§9).
1. **Promotion fee lines, through the calculator.**
   - `get_promotion_performance` gains a fee-line breakdown, for approved and sandbox promotions. Each fee shows:
     - its name and type (lump sum, coupon or Prime);
     - the banners, products and events it applies to;
     - its coupon dates;
     - its amount, as the calculator computes it.
   - The fee tables (`TradeSpend.BrandApprovedPromotionFees`, `TradeSpendSandbox.PromotionFees`) stay calculator-only, with no SQL grant, so the figures still match the Promotion Details screens.
   - Before building, check where the app works out each fee's amount. Use that same code, never a new formula.
   - Remove the glossary's `not_available.promotion_fee_lines`.
2. **Two CRM tables** (owner, D113: not `CRM.DistributorRetailers`):
   - `CRM.DistributorBrands`: brand ↔ distributor, with the parent distributor;
   - `CRM.RetailerRegions`: retailer ↔ region ↔ banner.

   Each one gets a catalog entry with module tags (D17), rules and a worked example. The grants go in one migration on local `caboodle_dev`.
   - **Distributor ↔ retailer comes from `CRM.DistributorBanners`** (already catalogued), joined to `CRM.Banners` and then `CRM.Retailers`. Its `DistributorMarkup` is the only markup: the one the promotion screens and the calculator use. `CRM.DistributorRetailers` is never used (D113).
3. **`DataHub.DistributorUpcMappings`:** not in B9; it moves to B10b with the other pipeline and mapping tables, for platform admins (D109).
4. **§9:** update every row this package changes.

**What B9 builds on (found at the start, 2026-10-16):**
- **Fee amounts:** the Promotion Details screens compute each fee in `BrandApprovedPromotionFeeCalculator.Compute` (approved) and `PromotionFeeCalculator.Compute` (sandbox), the same logic. The builders the tool already calls (`TradeSpendDTOBuilder.GetTradeSpendPromoDTO`, `PromotionDTOBuilder.GetPromotionDTO`) put the result on the screen's DTO (`BrandApprovedPromotionFees` / `PromotionFees`: name, type, value). The screen's fee filter ("name - $value") shows the same values. B9 reads those, so it adds no formula.
- **Two kinds of fee:** AD/TPR fees are the flat fee entered on each event (`LumpSumProposed`), which the screen lists per event name; promotion fees are the named lump-sum, coupon and Prime fees. Bubbies' Publix promotions (Q41) have only AD/TPR fees. Both kinds add up to the totals the tool already showed.
- **Where each fee applies:** the screens' own fee queries (`GetBrandApprovedPromotionFeesAsync`, `GetPromotionFeesAsync`).
- **The screen's way of counting (copied, D112):** a lump sum is split evenly across its banners, and a banner with no calculated events (or outside a month or banner filter) gets none, so less than the amount entered can count. A coupon whose dates miss the events counts $0.
- **Regions:** the app's banner and region screens take a banner's region from `CRM.RetailerRegions`, not from `CRM.Banners."RegionID"`. B4's "banners in each region" example used `RegionID`; B9 changes it to the app's link.
5. **Tests (free):**
   - the grant-vs-catalog test;
   - every new catalog example runs as `askcaboodle_app`;
   - the drift test;
   - the fee lines add up to the fee totals on the Promotion Details screen (a reconciliation, as in B5).
6. **Eval:** 3–4 new cases: fees by type, a distributor's markup, the banners in a region, the distributors that carry the brand.
7. **Paid:** a targeted check of the new cases plus 4 regression cases, about $0.60 on Sonnet 5.5 medium, approved first. A full eval (≈ $2.60) only if results differ.

**B9 as built (2026-10-16):**
- **`get_promotion_performance`, `breakdown: "fee"` (D110, D111):**
  - `PromotionFigures.Fees` holds one `PromotionFeeLine` per fee: name, kind (`AD/TPR fee`, or the screen's type label `Lump Sum` / `Coupon` / `Prime Membership Allowance`), banners, products, events, coupon dates, settings as entered and the amount counted.
  - **AD/TPR lines:** the calculated events' `LumpSumProposed`, grouped by event name and dates (the same events and sums as the screen's event summary). Simple promotions get the same lines from their existing fee query, now grouped by event.
  - **Promotion fee lines:** the amount is the builders' own fee summary (`dto.BrandApprovedPromotionFees` / `dto.PromotionFees`); a fee the screen did not calculate counts $0, as in its fee filter. Where each applies comes from the screens' fee queries, with banner, product and event names read in one query per call.
  - **Result table:** promotion, version, fee, kind, banners, products, events, coupon_start, coupon_end (dates), settings, amount (usd); a promotion without fees gets one "no fees" row. The model text adds the fee rules (D112) and, per promotion, "fee lines: AD/TPR fees $X in N lines · promotion fees $Y in M lines", then up to 15 lines.
- **Catalog:**
  - new `CRM.DistributorBrands` and `CRM.RetailerRegions`;
  - `CRM.DistributorBanners` explains distributor ↔ retailer through the banners and calls its markup the only one (D113), with a retailer example;
  - **regions (D115):** a retailer's or banner's region comes only from `CRM.RetailerRegions`. `CRM.Banners."RegionID"` is no longer described, and the "banners in each region" example uses `RetailerRegions`. On `caboodle_dev` the two disagree for all 459 linked banners;
  - glossary: the `promotion_fees` term (two kinds), the `distributor` term points to the two link tables, and `not_available.promotion_fee_lines` is gone; the calculator metric names `breakdown: "fee"`.
- **Migration `AddAskCaboodleCatalogCompletionGrants`** (applied on local `caboodle_dev`): SELECT on the two tables, checked in `information_schema`; nothing on `CRM.DistributorRetailers`.
- **Eval (52 cases):**
  - Q41 is now `answer` only: the 2026 plan's two AD/TPR lines ($6,999 and $6,000, $12,999 in all) and no promotion fees;
  - Q45 (calculator): fees by type on the HEB 2026 plan, $35,000 lump sum plus $12,073 of AD/TPR fees in 5 lines, no coupon or Prime; "HEB 2026 PV - Draft - Final - Copy" holds only 2027 events. (`SPROUTS 2026 - MD` has no fees, so it could not be the case);
  - Q46: Sprouts' one banner is served by KeHE DELIVERED at an 8% markup;
  - Q47: Kroger's 14 banners in 7 regions;
  - Q48: 39 distributors (and 39 delivery methods);
  - calculator references also return `fee_lines`, `ad_tpr_fee_lines`, `largest_fee` and the fees per kind, and list every fee line for the claims check.
- **Tests (free):**
  - solution 6,821 green across 16 projects; Intelligence 484; coverage 97.9 % unit-only, every new or changed line covered;
  - DB tests 25 green, among them `PromotionFeeLinesDatabaseTests` (D114): with a temporary lump sum, coupon and Prime fee on the Publix 2026 plan and a sandbox Sprouts version, the lines equal the screen's fee list, its filter labels and its event summary, and add up to both totals (full year and Q4). The lump sum on one banner with events and one without counted half;
  - every catalog example runs as `askcaboodle_app`; all golden references match;
  - build 0 errors; the only new warning is the migration's CA1505.
- **Found:** DI11 (six approved Prime fees point at no promotion). The screen counts a coupon's non-promo units inside its own dates even when a month filter leaves those months out (Q4: $39 on a June coupon); Ask Caboodle copies this (D112).
- **Paid check, $0.59** (Sonnet 5.5 medium, no re-runs; report BE `docs/AskCaboodle-Eval/2026-10-16-claude-sonnet-5-5-medium-b9.md`):
  - **9 of 9 passed:** Q41, Q45–Q48 and the regressions Q22, Q37, Q39, Q30; $0.04 per answer on average ($0.36 answers, $0.22 claims check), 13.3 s.
  - **Q41** lists the two AD/TPR lines and says there are no promotion fees; **Q45** picks the HEB plan by its event dates and splits $47,073 into the $35,000 lump sum and the five AD/TPR lines; **Q46–Q48** read the new tables (KeHE DELIVERED at 8%; 14 Kroger banners in 7 regions; 39 distributors).
  - **Fact check:** 2 of 9 corrected. Q48's draft hand-counted "10" Costco and "14" Trader Joe's entries (8 and 13): both caught. Q45's "$47,073" (AD/TPR + promotion fees) was right but in no result: a false alarm.
- **Tuned after the paid check:** the fee header now also states the total of all lines ("fee lines: $47,073 in 6 lines · AD/TPR fees … · promotion fees …"). The free replay of the paid run then flags only Q48's two wrong counts.
- **Correction message (D116):** Q48's corrected answer told the user "I corrected the Costco and Trader Joe's counts below after checking them against the data." The correction message now ends with "Don't mention the correction; write the answer as if it were the first." The system prompt is unchanged (D104).

### B10 — Platform Admin knowledge (B10a done 2026-10-16, commit `26a85f3f`; B10b done 2026-10-16, commit `e26a5f52`)
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
   - **Data pipeline:** DataHub import, sync, mapping and data-quality tables (with `DataHub.DistributorUpcMappings` without `ResolutionNotes` and `ResolvedBy`, D109), and the raw distributor files (§9.1).
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
10. **Split (D117):** B10a (the mechanism, plus IAM, organizations, modules, settings, audit, email-log metadata, brand links and purge runs), then B10b (the pipeline: imports, syncs, mappings, data-quality issues, raw files).
11. **FE:** no change. Platform admins simply get wider answers (§10.8).

**What B10 builds on (read at the start, 2026-10-16):**
- **One audience today:** the catalog, system prompt, SQL gateway, tools and conversation factory are singletons, with one login (`NpgsqlSqlGateway`), one cached system block (`AnthropicConversation`) and one fingerprint (model, prompt, tools; `AskConversationFactory`). The platform-admin flag reaches the run only as `AskAgentContext.ShowsCost` (from `AskAsker.IsPlatformAdmin` in `AskQuestionRequest`).
- **The SQL guard** (`SqlGuard`, fed by `SchemaCatalog.TableNames` and `SchemaNames`) refuses tables outside the catalog in the catalogued schemas and in `SensitiveSchemas` (Identity, Email, Auditing, Organization, Intelligence, hangfire, Configuration, DataLifecycle). `public` is not in that list; the grants refuse it.
- **Snapshots:** Identity lives in `ApplicationDbContextModelSnapshot` (Users, Roles, RoleClaims, UserRoles, UserClaims, UserLogins, UserTokens) and `Auditing.AuditTrails` there too; the rest in `MainDbContextModelSnapshot`.
- **Data on `caboodle_dev`:** 225 organizations (215 brand, 10 brokerage), 307 memberships, 373 brand connections, 10,489 `Brand.BrandBrokers` rows, 324 users, 51 legacy invited users (2 with an inviter), 0 organization invitations and access requests, 7,820 module assignments (Ask Caboodle on for 215 organizations) and 7,819 history rows (latest 28 Sep 2026), no module setting definitions or values, 3 audit events, 141 audit trails (Brand Reports only), 1,270 email logs (2 statuses), no purge runs.
- **Checked:** no audit trail holds a credential value (5 hold an email address, masked by the gateway); `Identity.Users.UserName` is the email address for 317 of 324 users; no email-log subject holds an address.

**B10a — decided design (owner, 2026-10-16: D117–D123; build in the next session):**
1. **Roles and logins (D118):**
   - migration `AddAskCaboodleAdminReadOnlyRole`: creates the group role `askcaboodle_admin_ro` NOLOGIN when the migration user can (as B2; otherwise a NOTICE and ops creates it), `GRANT askcaboodle_ro TO askcaboodle_admin_ro`, USAGE on the admin schemas, and the table and column grants below;
   - `docs/AskCaboodle-AdminReadOnlyLogin.sql` (BE repo), like `docs/AskCaboodle-ReadOnlyLogin.sql`: creates `askcaboodle_admin_app` LOGIN, grants it `askcaboodle_admin_ro`, sets `default_transaction_read_only = on` and `statement_timeout = '15s'`, and asks for the password with `\password`. **The owner runs it with psql** and puts the connection string in the user environment variable `IntelligenceSettings__AdminReadOnlyConnectionString`;
   - both go in the deployment checklist (§11) and in BE `docs/AskCaboodle-Deployment.md`.
2. **The audience (D119, D120):** `IsPlatformAdmin` sets a platform-admin audience in `AskAgentContext`. It picks the admin login in the gateway, the admin tables in the catalog index, `get_table_info` and the SQL guard, and a system prompt of two cached blocks: the shared prompt, byte-identical for everyone, then the admin index. Admin sessions get their own fingerprint, and a session that changes audience starts fresh. Without `AdminReadOnlyConnectionString`, platform admins stay on the standard login and catalog, and it is logged.
3. **What B10a grants** (D72–D74, D121):

   | Schema | Granted | Never granted |
   |---|---|---|
   | Organization | `Organizations`, `Memberships`, `Roles`, `RolePermissions`, `BrandConnections`, `BrandAccess`, `BrandAccessModules`, `AccessRequests`; `Domains` without `VerificationValue` and `VerificationHost`; `Invitations` without `Email` and `TokenHash` | — |
   | Identity | `Users` without `Email`, `NormalizedEmail`, `UserName`, `NormalizedUserName`, `PhoneNumber`, `ObjectId`, `PasswordHash`, `SecurityStamp`, `ConcurrencyStamp`, `RefreshToken`, `PreviousRefreshToken`, `RefreshTokenExpiryTime`, `RefreshTokenRotatedOn`, `EmailVerificationCode`, `EmailExpiryTime`; `Roles` without `ConcurrencyStamp`; `RoleClaims`, `UserRoles`, `UsersHierarchy`; `InvitedUsers` without `Email` and `VerificationCode` | `UserClaims`, `UserLogins`, `UserTokens`, `VerificationCodes` |
   | Configuration | `Modules`, `ModuleAssignments`, `ModuleAssignmentHistories`, `ModuleDependencies`, `ModuleSettingDefinitions`, `ModuleSettingValues` | — |
   | Auditing | `AuditEvents` without `IpAddress`; `AuditTrails` | — |
   | Email (D74) | `EmailLoggers`: ID, `Status`, `ResendCount`, `TotalEmailSent`, `Subject` and the audit dates, without `TO`, `CC`, `BCC`, `From`, `Body`, `ErrorMessage`; `SnsEventLogs`: ID, `EmailLoggerId`, `SnsType`, `ErrorType`, dates; `EmailTemplates`: ID, `Name`, `Module`, `Subject` | addresses, bodies, error texts, SNS payloads |
   | Broker email logs | `BrandReportEmailLogs` and `CategoryReviewEmailLoggers`: the same metadata columns | the same |
   | DataLifecycle | the purge and backfill run tables; `SoftDeletePurgeSettings` without `NotificationEmails` | — |
   | Brand | `BrandBrokers`, `BrandSubUsers` | — |

   Still never granted, on either login: `Intelligence` (D73), `hangfire`, `public`, `DataHub.ThirdPartyCredentials`.
4. **Catalog:** each new table gets an entry with `audience: platform-admin`, `modules: { brand: none, broker: none }`, rules (organization types 5 = brand and 10 = brokerage; Ask Caboodle on = an enabled assignment of module `ask-caboodle`; legacy invites vs organization invitations) and an example. No new `search_entity` types (D122). §9 rows updated.
5. **Tests (free):**
   - a credentials scan of `information_schema` (table and column privileges) for both roles: it fails on any secret-like column (password, hash, token, secret, stamp, code, credential, cipher, key) or personal one (email, phone, address, IP) unless the test lists it as allowed;
   - the grant-vs-catalog test for both roles (standard grants = standard catalog; admin grants = admin catalog);
   - DB tests: the admin login reads `Organization.Organizations`, and is refused `Identity.Users."PasswordHash"`, `Identity.UserTokens` and `Intelligence.AskMessages` (42501); the standard login is refused the admin tables;
   - unit tests: an organization user's prompt, index, `get_table_info` and SQL guard never include admin tables; the shared prompt is byte-identical; the two fingerprints differ.
6. **Eval (D123):** a per-case `audience: platform-admin`, and 5 admin cases: organizations with Ask Caboodle switched on; who invited a user (the legacy invited users: 2 of 51 have an inviter, so "no inviter recorded" is right for the others); the brokerages connected to a brand; recent module changes; email sending failures.
7. **Paid:** the 5 admin cases plus 3 regression cases, about $0.55 on Sonnet 5.5 medium, capped at $1.20, approved first.

**B10a as built (2026-10-16, commit `26a85f3f`):**
- **Migration `20261016190000_AddAskCaboodleAdminReadOnlyRole`** (applied on local `caboodle_dev`; its `Down` was checked: the role is dropped, then re-applied with the same grants): `askcaboodle_admin_ro` NOLOGIN, `GRANT askcaboodle_ro TO askcaboodle_admin_ro` (its own `NOTICE` when the migration user can't grant roles), USAGE on the six admin schemas, SELECT on 25 tables and by column on 13 more (38 in all). Grant-only, so it reuses B9's Designer file (the model is unchanged).
- **Login script `docs/AskCaboodle-AdminReadOnlyLogin.sql`** (BE repo), like B2's: `askcaboodle_admin_app`, read-only and 15 s on the login, password by `\password`; it ends by printing that the login can sign in and reads both roles' tables.
- **The audience (D119, D120):**
  - `AskAudience` (Standard, PlatformAdmin) lives on the session (`AskSessionState.Audience`); `AskAgentContext.Audience` reads it, so the tools always match the system blocks the model was given;
  - the ask handler picks PlatformAdmin when `IsPlatformAdmin` and `AdminReadOnlyConnectionString` is set; without the setting it uses Standard and logs a warning on every such question (D119);
  - the catalog gives each audience its tables (`TableNames(audience)`, `RenderTables(…, audience)`), and a join path or metric only when the audience reads all its tables; an unknown `audience` value stops the start;
  - `get_table_info` and `run_sql` (guard and login) follow the session's audience; the name search, the calculator and the brand-name lookup stay on the standard login;
  - the gateway's admin login never falls back to another connection;
  - platform admins' system prompt is two cached blocks (1 h each, plus the automatic tail: 3 of the 4 breakpoints): the shared prompt, byte-identical, then "PLATFORM ADMIN DATA" (the rules below) and the admin index;
  - each audience has its own fingerprint; the standard fingerprint hashes exactly as before B10a, so stored sessions keep replaying. A cached conversation is reused only for the same audience; a session that changes audience starts a fresh conversation, with the earlier questions and answers as text (the existing fingerprint-change path).
- **The admin block's rules:** these records cover all of Caboodle (answer for every organization, brand or user asked about); names are fine; email addresses, login names, phones, IPs, credentials, email bodies and other users' questions are never available (say so); name the columns you select.
- **SQL guard:** `public` joined the sensitive schemas, so `"public"."…"` is refused on both logins (before, only the grants refused it).
- **Catalog:** 38 entries with `audience: platform-admin`, `modules: none/none` and an example each (77 tables in all). Rules: organization types 5/10; a brand organization's ID is the brand's ID and a brokerage's is its primary broker's user ID; Identity ids are text (`u."Id" = x."UserID"::text`); Identity's core tables have no `Deleted`; platform admins are users with the Identity role ADMIN; a module is on when the assignment is enabled and the module active and of the organization's audience (the app's access check); module history has no `OrganizationID` (`COALESCE("BrandId", "BrokerId")`); the 2 Sep 2026 backfill rows; "who invited" = `InvitedUsers."CreatedBy"`; brokerages work on brands through `BrandConnections` (`BrandBrokers` holds the older per-broker links).
- **Tests (free):** Intelligence 549 (65 new), coverage 97.9 % unit-only, every new line covered; solution 6,886 green across 16 projects; build 0 errors, the only new warning the migration's CA1505.
  - grant-vs-catalog for both roles from the migrations (standard grants = standard catalog + name search; admin grants = the 38 admin tables; the hidden columns of each column-granted table; nothing in `Intelligence`, `hangfire`, `public`, the credential tables or `ThirdPartyCredentials`);
  - the credentials scan (DB): every column any `askcaboodle%` role can read (`has_column_privilege`, so inherited grants count), against secret and personal words; 29 reviewed exceptions (store addresses, item codes, lookup keys, email counts, two booleans) are listed in the test, and a stale exception fails it;
  - DB (45 green, with the owner's `askcaboodle_admin_app` login): the standard login is refused all 38 admin tables; the admin login reads `Organization.Organizations`, names and the standard tables, and is refused `PasswordHash`, `SELECT *` on users, `UserTokens`, `Intelligence.AskMessages` and email addresses (42501), and writes (25006); the gateway answers platform admins as `askcaboodle_admin_app`; every catalog example (all 77 tables) runs on the admin login;
  - unit: an organization user's index, `get_table_info`, SQL guard and system prompt never include an admin table; the shared block is byte-identical; the fingerprints differ; the request carries two cached system blocks; the D119 fallback and its warning.
- **Eval (D123):** a per-case `audience`, and `ASK_CABOODLE_EVAL_AUDIENCE=platform-admin` to ask every selected case as a platform admin. Group "Platform admin" (counted), 57 cases in all, references recorded:
  - Q49: Ask Caboodle is on for all 215 live brand organizations (a brand module);
  - Q50: Chantico Agave's 3 account invitations, 2 sent by Admin, 1 with no inviter recorded;
  - Q51: Mekhala's 3 brokerages (Caboodle Admin, Michael Moss, Yin Yang Naturals);
  - Q52: since 12 Sep, 108 modules switched on for 3 organizations (Andean Dream, Origine, Murphy's Naturals), none off;
  - Q53: September's 5 failed emails of 33.
- **Found, and handled beyond the plan's wording (for the owner's review):**
  - **Who invited (D123's premise):** the Admin "Invited users" screen names the inviter from `InvitedUsers."CreatedBy"`; `ParentUserID` is a broker sub-user's parent broker. 48 of the 51 legacy invitations have an inviter who is a user (not 2). The invitee's email is hidden, so an invitation can't be matched to the account it created: Q50 asks about a brand's invitations.
  - **Two more hidden columns (D72):** `Identity.Users."ImageUrl"` (profile photos in the production S3 bucket) and `DataLifecycle.OrganizationBackfillRuns."Report"` (it lists 18 email addresses).
  - **Purge settings:** `SoftDeletePurgeSchemaRetentions` and `SoftDeletePurgeTableRegistries` are granted with the purge settings (item 2: "the purge runs and settings").
  - **Email-log grants** also carry `Deleted` (the soft-delete rule needs it); `BrandReportEmailLogs` has no status, so its metadata is the send type, method and report ids; `CategoryReviewEmailLoggers` keeps `BrandID`.
  - **The admin group counts** in the pass rate.
- **Paid check, $0.44** (Sonnet 5.5 medium, no re-runs, all 8 asked as a platform admin with `ASK_CABOODLE_EVAL_AUDIENCE`; report BE `docs/AskCaboodle-Eval/2026-10-16-claude-sonnet-5-5-medium-b10a-admin.md`):
  - **8 of 8 passed:** Q49–Q53 and the regressions Q01, Q22, Q48 (the admin block didn't change the business answers); $0.04 per answer on average ($0.31 answers, $0.13 claims check), 11.4 s, 92 % of input from the cache;
  - Q49: 215 active organizations, a table of names; Q50: two invitations sent by Admin and one with no sender recorded, and it says the invitees can't be named and sign-up doesn't remove an invitation; Q51: the three brokerages; Q52: 108 switch-ons for the 3 organizations, nothing off, the 2 Sep setup left out; Q53: 5 failed, 13 recipients, error texts and addresses not available;
  - **Fact check: 1 of 8 corrected (12.5 %, above D103's 10 % on a sample of 8), and the flag was a false alarm.** Q53's draft wrote "between 8 and 11 September"; the "8" was right (the first failure was on 2026-09-08), but the check's day-first date pattern didn't join days with "and", so the "8" was read as a count (fixed in C0b.1, §4). The report's "caught" verdict is only because the claims check objected to another part of that sentence ("They went to Mother's Market…": the retailers are what the reviews were about, not the recipients); the corrected answer kept that wording and passed its claims check. Not a B10a change: §7.2;
  - one rejected `present_answer` call (Q49 asked for a total headline over the organization names; the next call dropped it).
- **Deployment:** BE `docs/AskCaboodle-Deployment.md` is the ops runbook from §11 (checklist, migrations, roles, logins, settings, checks, rollback); its check queries were run on `caboodle_dev`.
- **FE:** no change; no field changed, so `docs/AskCaboodle-FE.md` is unchanged.

**B10b (after B10a):** DataHub's import, export, sync, mapping and data-quality tables (with `DistributorUpcMappings` without `ResolutionNotes` and `ResolvedBy`, D109), and the raw distributor files, for platform admins. Never: S3 keys, upload ids and file URLs; `ThirdPartyCredentials`. Eval: the imports and syncs that failed this week.

**What B10b builds on (read at the start, 2026-10-16):**
- **The tables on `caboodle_dev`:**
  - **Sync and imports:** 586 sync runs, 654 imports, 228 exports.
  - **Unmapped and resolution:** 155 K unmapped KeHE/UNFI rows, 399 resolution audits, 315 manual UPC mappings, 28 K customer-number links, 22.8 K retailer suggestions.
  - **Store data quality:** 32.8 K store-list issues (4,746 open), 921 merges, 889 K clean-up change logs, 20 brand purges, 23 K geocoded addresses.
  - **Raw files:** 1.15 M raw KeHE lines, 1.1 M mapped KeHE, 552 K raw UNFI, 516 K mapped UNFI.
  - **Never written:** `AliasAuditTrail` and `AliasMatchAttempts` have 0 rows and no live writer.
  - **Legacy:** `DataUpload.DataMappings` was last written in July 2026, and its screen is hidden.
- **The screens:** all in the admin app: `/data-sync`, `/unmapped-data` (with the Resolution Audit tab), `/mapped-data` (Mapped UPCs; Data Clean Up with the run history), `/store-list-tools` (Issues, Merge Stores) and `/brand-data-cleanup`. The brand app reads only the raw KeHE/UNFI pages, which few brands see.
- **How the pipeline works:**
  - **Re-runs:** a run for a brand, distributor and month hard-deletes and reloads that month (raw, mapped, unmapped and distributor sales); older runs stay listed with stale counts (93 runs).
  - **The row identity:** raw = mapped + unmapped, and mapped = the distributor-sales rows. For Bubbies, KeHE, August 2026: 20,413 = 20,297 + 116.
  - **`ExportJobs` is also the admin job log** (store clean-up steps, merges, undo, issue actions), and `StoreCleanupChangeLogs."CleanupJobId"` points at it.
  - **Last scan:** the store-list issue scan runs only from a health check (the nightly scan is off everywhere).
- **The codes and statuses:**
  - **Distributor codes differ by table:** sync runs, audits and distributor sales use 1 = UNFI, 2 = KeHE; customer links use 2 = KeHE, 3 = UNFI; UPC mappings store UNFI as 1 (DI14).
  - **Import statuses:** 15 done, 17 done with rejected rows (none saved = every row rejected), 20 failed.
  - **Failed syncs:** every failure since 12 Sep shows "A command is already in progress", yet 12 of 13 loaded their rows; 3 Daily Crunch runs are stuck in progress (DI13).
- **Sensitive columns:**
  - `DataSyncRuns."SourceFileS3URL"` stores a signed 6-hour file link.
  - The S3 key, upload id and part-list columns of imports and exports.
  - A person's email address is typed into one Sprouts store's KeHE city field (DI12).
  - The resolution notes are mostly system tags; 96 rows hold short admin text.

**B10b — decided design (owner, 2026-10-16: D126–D131):**
1. **Tables (D126):** 17. Not granted: `MappingSuggestions` (never acted on, and the screen computes its suggestions live), `AliasAuditTrail`, `AliasMatchAttempts` (unused), `DataUpload.DataMappings` (legacy); never `ThirdPartyCredentials` or `SpinsRecords`.
2. **Hidden columns (D127):** file locations, upload ids and part lists, `ExportJobs."S3PartsETagsJson"` too (admin jobs reuse it for results), the signed file link and the file hash; the UPC mappings' notes and resolver (D109).
3. **Resolution notes (D128):** granted on the unmapped and mapped rows (D109's hiding stays on the UPC mappings).
4. **Email addresses typed into distributor files (D129):** granted, masked by the gateway, recorded as DI12.
5. **Admin block (D130):** names the pipeline, waives the raw-files NOT AVAILABLE entry for platform admins, and keeps shipments on distributor sales.
6. **Eval (D131):** "last 30 days", not "this week" (nothing failed in the eval week); 6 cases.

**B10b as built (2026-10-16):**
- **Migration `20261016210000_AddAskCaboodleDataPipelineGrants`** (grant-only, reusing B10a's Designer file; the model is unchanged). Applied on local `caboodle_dev`, and its `Down` was checked: back to B10a's 38 tables, then re-applied with 55.
  - **USAGE:** on `DataHub` and `DataUpload` to `askcaboodle_admin_ro` (it also inherits it).
  - **Whole tables (13):** `AddressReferences`, `BrandDataCleanupJobs`, `DistributorCustomerLinks`, `StoreCleanupChangeLogs`, `StoreListIssues`, `StoreMergeHistories`, `UnmappedKeHeRecords`, `UnmappedUNFIRecords`, `UnmappedRecordResolutionAudits`, and DataUpload `KeHeRecords`, `KeHeMappedRecords`, `UnfiRecords`, `UNFIMappedRecords`.
  - **By column (4):** `DataSyncRuns`, `ImportJobs`, `ExportJobs`, `DistributorUpcMappings`.
- **Catalog:** 17 entries with `audience: platform-admin` (94 tables in all; standard 39, unchanged), each with the screens' labels and an example. The rules:
  - the distributor codes per table;
  - a failed run may have loaded its rows, so check them;
  - the latest run per month is the one whose rows exist;
  - stuck = in progress for more than 12 hours;
  - import 17 with no saved rows = failed;
  - unmapped UPCs = distinct raw UPCs, KeHE and UNFI together, as on the UPCs tab, never the runs' counters;
  - shipments, store counts, trends and last-year comparisons always come from distributor sales, and the raw files only for questions about the files;
  - KeHE's YoY columns are percentages;
  - UNFI's units, pack and published wholesale exist only on older uploads;
  - merges from the duplicate clean-up are told apart by the undo data;
  - issue counts by type list every type (zeros included) and state the last scan;
  - times are UTC.
- **Admin block** (`SystemPromptBuilder.AdminInstructions`):
  - it names the pipeline topics;
  - the NOT AVAILABLE entries on users and access and on raw distributor files don't apply to platform admins;
  - shipments, store counts and trends still come from distributor sales;
  - file locations, download links and distributor logins are never available.

  The shared prompt and the standard catalog are untouched, so organization users' prompt and fingerprint are unchanged; the admin fingerprint changes.
- **Tests (free):**
  - Intelligence 565 (6 new), coverage 97.9 % unit-only, unchanged;
  - solution 6,902 green across 16 projects;
  - build 0 errors, the only new warning the migration's CA1505;
  - DB tests 46 green with the owner's admin login:
    - grant-vs-catalog with 55 admin tables and the hidden columns of the 4 column-granted tables;
    - the credentials scan, with 29 new reviewed exceptions (store addresses, states, ZIPs, KeHE's `AddressBookNumber`, `IssueKey`, `LocationKey`);
    - the admin login reads the pipeline, and gets 42501 on every hidden column, `ThirdPartyCredentials`, `MappingSuggestions`, `DataMappings` and `SpinsRecords`;
    - the standard login is refused all 55 admin tables;
    - every catalog example (94 tables) runs on the admin login;
    - the six new golden references match.
- **Eval (63 cases):** Q54–Q59 in the counted "Platform admin" group, asked as a platform admin:
  - Q54: 13 failed syncs, 4 brands, 12 still loaded;
  - Q55: 7 failed imports and 1 with every row rejected;
  - Q56: Bubbies' August KeHE file 214,052 units against 213,932 in Caboodle, 116 lines waiting;
  - Q57: 4,746 open issues;
  - Q58: 921 merges, none undone;
  - Q59: Genius Gourmet 20 unmapped UPCs.
- **BE docs:** `AskCaboodle-Deployment.md` §3 and §3.1, plus two check queries (run locally: nothing secret; 55 admin tables); the eval README.
- **Data issues:** DI12 (an email address in one Sprouts store's KeHE city, 9 brands, January 2025 to September 2026), DI13 (syncs marked failed although loaded; 3 runs stuck), DI14 (UNFI UPC mappings stored as provider 1). DI9 updated: the code now drops zero-unit KeHE lines; the restored data still holds 261 K of them, and the owner says they will be gone once that change reaches production (D132).
- **Found, and handled beyond the plan's wording (accepted at review, D132):**
  - **UPC mappings:** `CreatedBy`, `LastModifiedBy` and `DeletedBy` are hidden too. They are empty today (written outside the user's save), but would name the resolver D109 hides once filled.
  - **The zero-unit KeHE lines:** the built catalog said they are kept; at review the sentence was removed, because the lines will be dropped (D132). The catalog no longer describes them.
  - **Issue counts:** the store-list issue example lists every type with zeros, after the paid check (Q57). It hard-codes the ten types (§7.2).
  - **Q53's notes** now say the recipient count is available and only the addresses are not (a claims-check false fail).
- **Found outside Ask Caboodle (for the owner; D6, not changed):**
  - the admin Sync Runs list calls `GET datahub/sync-runs`, but the backend expects a POST;
  - the trigger labels for file uploads and "map existing data" show "Unknown";
  - the unmapped-records export polls the brand route;
  - KeHE's YoY % is shown as dollars;
  - the sync job sends the decrypted distributor password to the crawler over plain HTTP, and the admin run details show the full signed file URL.
- **Paid, $0.56** (Sonnet 5.5 medium, no re-runs, all asked as a platform admin; reports BE `docs/AskCaboodle-Eval/2026-10-16-claude-sonnet-5-5-medium-b10b-admin.md` and `…-b10b-recheck.md`):
  - **Check, $0.48: 7 of 9 passed** (Q54–Q56, Q58, Q59 and the regressions Q01 and Q08: 48,157 cases and 4,872 stores from distributor sales, as before); $0.04 per answer, 12 s, 91 % of input from the cache, no answer corrected.
  - **Q57** gave every count right, then wrote "Two issue types… have no open issues" (only one has none). The fact check passed the "two" because a 2 is in the results: a right figure in the wrong place, C0c's kind (D108). Fixed by the example above.
  - **Q53** failed the claims check on its right "13 recipients" (the notes said recipients are not available); B10a's identical answer passed.
  - **Re-check, $0.08: 2 of 2 passed.** Q57 now says "Store key conflict has none open"; Q53 keeps its 13 recipients.

---

## 4. Phase 1c — Experience layer (still admin-only)

Since the FE review (2026-10-15, D69–D71), C0 comes first: the FE team builds against it, and pins (C3) depend on it. The order is now **C0 → C0b → B9 → B10a → B10b → C1 → C1p → C1b → C2 → … → C9**, with **C0c before G2** (D77, D90, D108, D117, D124). §10 collects what the FE needs from every package.

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

### C0b — Fact check (done 2026-10-16, commit `6da28c2d`)
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

**Decisions:** all approved on 2026-10-15: D98 (small counts), D99 (never flagged), D100 (rounding), D101 (the note), D102 (limits), D103 (when to tune), D104 (prompt unchanged). With D90, D91 and D96, nothing is left to decide before building.

**Step 2** is package C0c (below).

**C0b as built (2026-10-16, commit `6da28c2d`; owner decisions at review: D105–D107):**
- **`Answers/AskFigures`** (the figure reader, shared with the eval's numbers check):
  - reads `$`, `%`, `K`/`M`/`B`, decimals, ranges (`$97–106K` gives both ends the scale and the `$`), and counting words one to twenty;
  - never reads dates (ISO, `12/31`, `07.24.26`, `19 Jul`, `Dec 9–22`, `week 32`, `'26`), times, ids, links, or digits joined to letters (`Q3`, `r12`, `2nd`, `3x`);
  - `Claims` also leaves out what is never flagged (D99): years, list numbering, numbers in quotes, numbers joined to a word (`8-pack`, `7-Eleven`) and numbers inside a name the data returned (`week @$4.99`).
- **`Answers/AskFactRegister`**, kept with the session (`AskSessionState.Facts`):
  - built from the exact text each tool returned to the model, so after a restart `AskSessionService` rebuilds it from the stored transcripts (the server's own correction messages are skipped);
  - **values:** query rows and row counts, calculator, name-search and `present_answer` figures, and the user's messages (the question and the context block);
  - **reference:** `get_table_info` text, plus the system prompt in `AskFactCheck`; these back only large or exact figures (D98);
  - left out: error results, the model's own table title and calculator month filter, search scores and ids, and the earlier conversation repeated after a failed replay (its queries are gone, so its figures are asked for again).
- **`Answers/AskFactCheck`:** checks the text, the notes, the options and the table title, one sentence at a time (`AskTextCheck.Next`, ready for C1). Rounding follows D100; a counting word needs an exact whole number.
- **One correction round in `AskAgent`:**
  - the text is held until it passes;
  - a failing draft gets one user message, `<fact_check> These figures in your answer aren't in any result you were given: 93,376 (text: "…"). Compute each one with a query or take it from a tool result, or remove it…`, and the progress label "Correcting figures that didn't match the data";
  - a draft at the last step goes out at once with the note. A step limit, timeout, refusal or service error during the correction also sends the draft with the note (D102; refusal and service error added while building).
- **The note (D101):** `text.unverifiedFigures`, `unverifiedFigures` in `GET sessions/{id}`, stored in `PiecesJson` with the frame (no migration; C0's rows still read), and a warning in the log for C8. A restored session's replay adds "Figures not checked against the data: …".
- **Tuned before the paid runs (D103), with a free replay** (`FactCheckReplayTests` re-runs a stored run's tool calls on `caboodle_dev` and checks its answers). On C0's 48 answers it flagged 16 before tuning and 4 after; Q16's "11" and Q29's "Three" are still caught. What changed:
  - trailing zeros in a whole number from 1,000 up show the rounding ("19,000" for 19,123; two significant digits kept);
  - not counts: "one" as a pronoun; "the next three", "top 5", "the last 12 months"; "the two" (a counting word after the/these/those); lengths of time ("nine months"); "zero" isn't read;
  - **row counts by value and column totals:** each fully shown query result adds, per text column, its number of distinct values and how many rows share each one, and, per numeric column, its sum and average. A hand-added total passes only when it is right; B8's 93,376 still fails;
  - name-search candidate counts, in all and per type;
  - **`present_answer`'s reply now states the table's row count** ("(12 rows)"), so "all 12 products" checks out. The tool definitions and the prompt are unchanged (D104).
  - **Recomputed figures:** a figure that isn't a small count passes when the server recomputes it from two figures already checked earlier in the same text: a difference, a ratio or a % change ("about 4,800 fewer (47,412 vs 52,195)", "1.8 times", "35% more"). "Four times" is read as a ratio. Small counts are never recomputed (D98). **Approved at review (D105).**
- **Eval:** `AskFigures` replaces the eval's own reader. The report adds a "Fact check" section (answers corrected, sent with the note, each flagged figure caught or a false alarm), a "Fact check" column, and the note under the shown answer. The `unverified_figures` check is reported only. The draft of a corrected answer gets its own claims check.
- **Tests (free):**
  - solution 6,813 green across 16 projects; Intelligence 476 (78 new);
  - coverage 97.8 % unit-only, 99.2 % with the DB tests; every new or changed file at 100 % except one line (a `decimal` constant's static initializer);
  - the 23 DB tests green, with the `jsonb` round trip now carrying unverified figures;
  - build 0 errors, no warnings in changed files.
- **Paid, Sonnet 5.5 medium, $3.43 in total** (reports in BE `docs/AskCaboodle-Eval/2026-10-16-*-c0b*.md`):
  - **4-case check ($0.41, 4 of 4):** Q16's "11" was caught, and the corrected answer passed (C0: failed). Q29's draft said "two stretches", which was right but in no result; the model then counted the stretches with a query, and the answer passed (C0: failed). Q13 and Q43 had nothing flagged.
  - **Full run ($2.62, 48 cases):**
    - **Results:** 38/45 counted (C0: 40/45), app questions 3/3, **$0.036 per answer** (C0: $0.035), 13.5 s.
    - **Fact check:** 5 of 48 answers corrected (10.4 %, over D103's 10 %); none sent with the note. All 7 flagged figures were right by the claims check: "three months of Q3", "nine months", "four times", "about 170 stores", "$0.36/unit", and the hand counts "two" and "10".
    - **No failure was caused by the check:** Q14's draft already lacked the other Fresh Market retailers, and the correction changed only the flagged sentences. The other failures are run-to-run changes of cases that have flipped before (Q08-DAVID, Q15, Q29, Q27), plus Q33 and Q35 framing "nothing found" as `cannot_answer`.
  - **D103 tuning after the full run:** lengths of time and "N times" ratios (above). The replay of the full run's drafts then flags 2 of 48 (Q14 "about 170", Q16 "$0.36").
  - **Re-check of 7 ($0.40):**
    - Q04 and Q07 passed with no correction, so the tuning works live; Q08-DAVID and Q14 passed (noise).
    - Q14 was corrected again for "about 170 stores" (the average is 168.9). It is the same right figure flagged twice, which is not yet over D103's limit. The corrected text gives the range "161–172" instead.
    - Q15 failed again (known borderline). Q33 and Q35 chose `cannot_answer` again; their texts are right (§7.2).
- **What step 1 leaves for C0c:** across C0 and C0b, the claims check found one figure-placement or pattern error per full run (C0: Q11's ranking; C0b: Q29's range "56–68 units per store", which one week breaks). The other contradictions were wording (Q15, Q27, Q33). This is the number for the C0c go or no-go (D90).

**C0b.1 — days listed before their month (2026-10-16, commit `5f7e7f84`; owner asked after B10a's paid check):**
- **The false alarm:** B10a's Q53 draft wrote "between 8 and 11 September", and the "8" was flagged although the first failure was on 8 Sep. The check leaves dates out on purpose, but its day-first pattern joined days only with "–", "-" or "to": "11 September" was left out and the "8" was read as a stand-alone count.
- **The change (`Answers/AskFigures`):** a day-first date may also list or join its days with "and", "&" or commas ("between 8 and 11 September", "8, 9 and 11 Sep", "3–5, 9 and 30 Oct"), each day 1–31. Month-first dates are unchanged: after "Aug 30–Sep 6", a comma or "and" can start a real figure ("…, 68–88% of units"; "on Sep 6 and 12 stores"). Across the 25 stored runs, Q53 was the only answer with such a list.
- **Tests (free):** 10 new cases in `AskFiguresTests`, including the counter-cases that must stay figures; Intelligence 559, solution 6,896 green, build 0 errors, no warning in the changed files.
- **Replay before and after (free; C0 and C0b full runs, B9, B10a; 113 answers):** only B10a's Q53 changed, from flagged to ok. Every other flag stays (C0 4 of 48, C0b 2 of 48, B9 1 of 9: counts and prices, none of them dates). No paid run.

### C0c — Fact check, step 2: rankings, trends and figures in the wrong place (deferred: before G2, D108)
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

**What C1 builds on (read at planning, 2026-10-16):**
- **The call:** `AnthropicConversation.SendAsync` makes one non-streaming `client.Beta.Messages.Create` call and turns the `BetaMessage` into the turn: the history blocks (text, thinking with signature, redacted thinking, tool use, fallback), the tool calls, the stop reason, and the usage per attempt (`usage.iterations` after a fallback).
- **The SDK:** `Anthropic` 12.55.0 (netstandard2.0) has `client.Beta.Messages.CreateStreaming(parameters, cancellationToken)` (an async stream of `BetaRawMessageStreamEvent`; `TryPickStart`, `TryPickDelta`, `TryPickStop`, `TryPickContentBlockStart`, `TryPickContentBlockDelta`, `TryPickContentBlockStop`) and a stream aggregator (`BetaMessageContentAggregator`, `SseAggregatorExtensions`): check its exact call with the compiler, and use it to rebuild the final `BetaMessage` so the existing turn code stays. Load the `claude-api` skill and read `csharp/claude-api/streaming.md` (the skill picks TypeScript when started from the docs repo).
- **A fallback mid-stream** keeps the declined partial and continues on the same stream, marked by a `fallback` content block. When echoing such a turn back, drop the thinking, redacted thinking and tool-use blocks that come before the last `fallback` block (text blocks stay); `message_start` names the model that answers. (Non-streaming calls omitted the partial, so the current code never met this.)
- **The text:** the fact check runs once on the finished text plus the frame (`AskFactCheck.Check`), sentence by sentence through `AskTextCheck.Next`, which keeps state across sentences (D105's derived figures). Sentences come from `AskFigures.Sentences`: lines, then `(?<=[.!?])\s+(?=\S)`, with list markers kept. A boundary needs the next sentence's first character, so boundaries in a growing buffer never move. `present_answer` comes before the final text (system prompt step 5), so the frame is known when the text starts. Text in a turn that also calls a tool is never shown today.
- **What's stored:** `AskToolCalls` has no step number, but the stored transcript has one assistant message per step, with its `tool_use` blocks in the order the calls were sequenced, so the trace of a past answer can be rebuilt without a migration.
- **The SQL leak:** `done.queries` (raw SQL) goes to everyone, and the `get_table_info` progress label names the tables.
- **The tests:** `AnthropicConversationTests` stubs the API with an `HttpMessageHandler`, so streaming tests can return recorded SSE bodies. The 27 eval reports in BE `docs/AskCaboodle-Eval/*.json` hold several hundred final answers, a free corpus for the splitter.

**C1 — decided design (owner, 2026-10-17: D133–D139):**
1. **Streaming call:** `SendAsync` streams. It passes each text delta to the agent as it arrives and builds the turn from the aggregated message. The request differs only by `stream: true`, so the caching, the fingerprints and a restored session's byte-identical replay stay the same. Apply the fallback echo rule above. `eager_input_streaming` stays off: the tool inputs are short, and leaving it off keeps the API's input validation.
2. **Sentence splitter:** an incremental splitter mirrors `AskFigures.Sentences`. A sentence is complete when the next one starts, its line ends, or the stream ends. It keeps each sentence's exact markdown slice (with the whitespace and newlines before it), so the slices join into the final text.
3. **Release (D134):**
   - **Live release** only after `present_answer` has set the frame in this exchange. The frame's figures (notes, options, table title) are checked when the text starts; a failing frame holds the whole text for the correction round.
   - **Each sentence** is checked as soon as it completes, in order, with one `AskTextCheck` per text, and released if it passes.
   - **Text before `present_answer`** is held, and released only if its turn ends without a tool call (as today).
4. **A failed figure (D135):**
   - **The pause:** the release stops and the "Correcting figures that didn't match the data" progress goes out at once. The draft still finishes, so the correction message lists every bad figure, as in C0b.
   - **The corrected answer** keeps the already-released sentences it repeats word for word, and rewinds from the first one that differs.
   - **Still failing (D101):** its figures are released and listed in the note.
   - **A limit, refusal or service error during the correction (D102):** the rest of the draft is released, with the note.
   - **A final refusal** rewinds to 0 before the error.
5. **Text events (D133):**
   - `text-sentence {index, text}`, where `text` is the exact markdown slice;
   - `text-rewind {keep}`;
   - the final `text {text, unverifiedFigures}` stays, the authoritative full answer for history and for clients that don't stream;
   - no raw token deltas, since they would show figures before they're checked.
6. **The run trace, live:**
   - `step {step, label}` when each model call starts ("Thinking", or "Writing the answer" for a text turn);
   - `tool-start {callId, step, tool, summary}` and `tool-end {callId, step, tool, ok, rowCount, durationMs, detail}`;
   - parallel calls share a step;
   - a failed `run_sql` followed by another `run_sql` is marked `selfCorrection`;
   - `session` gains `maxSteps` (12) and `wallClockSeconds` (180);
   - `progress` events stay as they are (their `step` is a progress counter, not the model step).
7. **The trace of a past answer:** `GET sessions/{id}/messages/{messageId}/trace`, with the same ownership check as `GET sessions/{id}` (your own sessions only; D73). It is rebuilt from the stored transcript and `AskToolCalls`, with no migration, so it works for answers saved before C1 too.
8. **Who sees what (D136, D138):**
   - **Organization users** get the trace too, with no database detail: labels, tools, timings, row counts and matched names.
   - **Platform admins** also get SQL, tables and columns, catalog notes and Postgres errors.
   - **Applied to:** the live trace, the trace endpoint, `done.queries` (platform admins only) and the progress labels (organization users see "Reading the data catalog", not table names).
   - **When:** built in C1. G2, when organization users can ask, checks it end to end (G7's matrix).
9. **No thinking progress notes (D136):** `thinking.display: "updates"` (beta) is not used: the notes are model-written and unchecked. Revisit in C8, or for platform admins' trace.
10. **The eval (D137):** the agent always streams, the eval included; the claims check stays non-streaming.
11. **A client disconnect (D139):** the stream stops and the question is saved as cancelled, as today. The cut call's input and cache tokens are counted from the stream's opening usage (`message_start`); its output tokens are unknown, counted as 0 and logged.
12. **Tests (free):**
    - **Stubbed SSE responses:** a text-only turn, a tool-use turn, thinking with a signature, a mid-stream fallback (history echo rule), a cut stream (usage from `message_start`), and a byte-identical replay with streaming.
    - **The splitter on every stored eval answer**, fed in random chunks: it must give the same sentences as `AskFigures.Sentences`, and the slices must join into the exact text.
    - **The agent's paths, with a fake conversation:** release, the frame hold, the pause and correction, keep and rewind, the second-round note, a limit during the correction, a refusal rewind.
    - **The trace:** events per step, parallel calls, self-correction, the endpoint (unit and DB), the role filter on every surface, `done.queries` admin-only.
13. **Docs:** BE `docs/AskCaboodle-FE.md` (the new events, the trace endpoint, `queries` admin-only, the role filter) and §10.8.
14. **Paid (approve first):** one smoke question to see a real stream (≈ $0.05), plus a 6-case check on the streaming path, `eval-run.ps1 -Cases "Q01,Q08,Q22,Q48,Q53,Q57" -Budget 1.00 -Rerun 0 -Model claude-sonnet-5-5 -Effort medium -Label c1` (≈ $0.30; Q48 was corrected in B9). About $0.35 in all, capped at $1.00.

**C1 as built (2026-10-17, commit `a01dfc13`; the IAM branch is unchanged since `b5adb1a1`):**
- **The call:** `AnthropicConversation.SendAsync(listener, …)` streams through `CreateStreaming(…).CollectAsync(new BetaMessageContentAggregator())` and builds the turn from `aggregator.Message()`, which keeps the `fallback` blocks and `usage.iterations`. The listener gets each text delta (blocks joined with "\n\n", as `LlmTurn.Text`) and the `message_start` usage. The SDK hands out events it has already read after a cancellation, so the loop checks the token on every event.
- **Mid-stream fallback:** the declined partial's thinking and tool calls are neither echoed nor run, its text is; the model after the last `fallback` block answers and is priced (`message_start` names the declined model in that case).
- **The claims check stays non-streaming (D137):** `SendAsync` without a listener is one non-streaming call; the agent always passes one.
- **New code:** `Answers/AskSentenceSplitter` (the incremental splitter; it reuses `AskFigures`' two regexes, and `Sentences` itself is unchanged), `Agent/AskAnswerStream` (release, hold, pause, keep and rewind), `Trace/AskTrace` (the role rule, D138) and `Trace/AskTraceMapping` (past answers), `Sessions/GetAskTraceRequest` and the controller route. No migration.
- **Beyond the plan's wording, for the owner's review:**
  1. A step starts as "Thinking" and is sent again as "Writing the answer" when its text starts (the API doesn't say at call start); a past step is "Writing the answer" when it wrote text.
  2. Text after `present_answer` in a turn that then calls a tool goes out live and is rewound by the same keep/rewind rule when the final text doesn't repeat it.
  3. Every error rewinds to 0 first, not only a final refusal, so the screen matches history.
  4. D139 also covers the 180 s limit (it cuts the stream the same way); a cut stream logs a warning.
  5. `done.queries` is `null` for organization users, like the other admin-only fields.
  6. `tool-end.detail`: `matches` for everyone; `sql`, `tables`, the full catalog text and `error` for platform admins. `selfCorrection` is on `tool-start` (known at the start) and on the trace endpoint's calls.
  7. "Correcting figures…" goes out once per answer, at the pause.
  8. The eval records a stream check per answer (`stream` in the report: the sentences end as the answer, rewinds, seconds to the first and the last sentence).
  9. The smoke test's response recorder parsed every response as JSON; it now copies a streamed response as it is read and prints each event's time.
  10. Concern for G2: organization users still see `run_sql`'s model-written purpose ("Querying: …"), which could name a table if the model writes one.
- **Tests:** solution 6,934 green across 16 projects (B10b: 6,902); Intelligence 597 (565), coverage 98.2 % unit-only; DB tests 47 green (the trace endpoint on `caboodle_dev` added). Build 0 errors, no warnings in the 33 changed files. The splitter matches `AskFigures.Sentences` on the 532 texts (answers, drafts, earlier answers) of the 27 stored eval reports, fed in random chunks, and on every cut of a sample.
- **Paid, $0.42 (approved):**
  - **Smoke** (Sprouts/KeHE by month), $0.0834 (it wrote the 1-hour prompt cache): right (92,376 cases, as in B0), every figure passed, 4 calls, 14.7 s. Steps and tool events arrived as they happened.
  - **6-case check** (`-Label c1`), $0.34 ($0.23 answers, $0.11 claims check): 6 of 6 passed; the sentences sent ended as the answer in 6 of 6; Q48 was corrected (9, 13) and rewound once; first sentence after a median 9.5 s.
  - **Finding — the final text arrives in one burst:** in 5 of 6 answers and in the smoke, every sentence arrived within 1–7 ms of the first (Q48's 7 s spread is its correction). The smoke's last `message_start` already reported its final `output_tokens` (193), so the API sent nothing until the text was written; the earlier calls opened at once (16). The checked release works, but the text doesn't appear progressively, so D96's "about 0.5 s later than raw streaming" doesn't hold yet. Open in §7.2.
  - **Fallback check**, $0.04 (approved): Q08 with the fallback off passed and still arrived in one burst (5 sentences within 7 ms), so the fallback isn't the cause.
  - **Cause check**, $0.044 (approved): Sonnet 5.5 holds back text written right after a tool result, whatever the request says; Sonnet 5 and a first reply stream normally (§7.2). C1's paid total is $0.50.

### C1p — Local test page (right after C1)
Owner, 2026-10-17 (D143): "a little FE so that I can see how it will feel in real life". Post its short plan first, as usual.
1. **What:** one HTML file in this docs repo (e.g. `docs/ask-caboodle/test-page/`), with no FE-repo or app changes. It opens in the owner's browser and talks to the local API (`POST api/v1/askcaboodle/ask`, SSE) with the owner's login token and the `BrandID` header.
2. **It shows:**
   - the frame (kind, headline, notes, options), the data table (and a simple chart), and the checked sentences typed out word by word, with the rewind;
   - the run trace drawer (live events, and the trace endpoint for past answers);
   - the history list, feedback and the step meters ($ and the model for platform admins).
3. **Functionality only (D69):** it is not the FE team's design. Base it on the Workbench artifact's screens.
4. **To check at its start:** the local API's URL and port; whether the dev CORS settings accept the page's origin (if not, serve it from a small local static server on an allowed origin, with no app change); how the owner gets a token.
5. **Cost:** each question is a real one, about $0.04, within the owner's daily limit (50) and the budgets.
6. **C1b's features** (questions left, titles, rename) are added to the page when C1b is built.

**C1p as built (2026-10-17, waiting for the owner to try it):**
- **The file:** `docs/ask-caboodle/test-page/ask-caboodle-test.html`. Opened straight from disk: the local API's CORS allows any origin and has no HTTPS redirect, so no web server is needed. No app or FE-repo change.
- **To use it:** start the API from the BE repo (`dotnet run --project caboodle/src/Hosts/API/API.csproj --launch-profile Caboodle.Api.Development`, port 5000), open the file, sign in with the `caboodle_dev` email and password (`POST api/v1/auth/login`; only the token is kept, in the tab's session storage). Brand picker from `GET api/v1/brands` (Bubbies by default); an optional `OrganizationID` for users in several organizations.
- **What it shows:** the conversation (follow-ups, Stop, clarify options, suggestions); each answer's headline, notes, the checked sentences typed out word by word (natural, fast or instant) with the rewind and the "rewriting" pause, the unverified note, the table with a Table/Chart switch (Chart.js), thumbs with reasons, Copy; the run chip (steps, tool calls, time, tokens, and $ and model for platform admins); a **timing strip** per answer (first step, first tool, headline + table, first and last sentence, done, typed, rewinds, and whether the sentences ended as the final text); the run trace drawer (step meters, steps, parallel calls, self-correction, the detail by role, the done card), live or from the trace endpoint; the history rail (open, delete) and questions left today.
- **Cost of a question:** the local API uses the key in `appsettings.Development.json` (`IntelligenceSettings:ClaudeApiKey`), not the `ANTHROPIC_API_KEY` variable; about $0.04 a question (about $0.08 for the first of an hour), in the owner's daily limit.
- **Reveal order (owner, after trying it):** the data arrives with `present_answer`, 2–3 s before the text, and showing it first felt abrupt. The page now fades in the headline and notes, shows a "writing" placeholder until the first sentence, types the text, and only then fades in the table or chart (bars grow, rows appear one by one), the clarify options, the suggestions and the actions. Text cut mid-way closes an open `**` or backtick so bold renders while typing. FE-only; the API's order is unchanged. Note for the FE document (§10).
- **Tested free** against a mock of the API that replays the paid smoke run's events at their recorded times plus scripted scenarios, in headless Edge over the DevTools protocol: the replay (4 steps, 5 calls, sentences = final text), a correction with a rewind, a clarify, an error after a sentence (rewound to 0), history and the trace endpoint, thumbs-down with a reason and a note, Stop, sign-in and the brand choice (the password is not kept). No script errors. The mock and the driver are scratchpad scripts, not committed.

### C1b — Conversation limit and titles (alongside C1)
Owner, 2026-10-16 (D124): "like other chat apps". A small package built right after C1, because both change the ask flow and the FE contract. Post its short plan and open decisions first, as usual.
1. **Questions per conversation:**
   - **Today:** no limit; only the daily pools and monthly budgets (B8). Each follow-up re-sends the whole conversation (cached, but the cost, the time and the fact register grow), and answers get less reliable in very long threads.
   - **Suggested:** a Platform Admin setting, default 20 questions per session. At the limit, the ask returns a new error code `session_full` before any model call (so it costs nothing and doesn't count toward today's questions), and the FE offers "Start a new conversation", optionally carrying the question over.
   - `GET sessions/{id}` and the `session` event say how many questions are left in the conversation, so the FE can warn near the end.
2. **Meaningful titles:**
   - **Today:** the title is the first question itself, on one line, cut at 200 characters (`AskHistoryMapping.Title`).
   - **Suggested:** after the first answer, Haiku 5.5 writes a 3–6 word title from the question (and the answer's headline when there is one). About $0.0001 per conversation, off the answer's critical path. On any error, the question stays the title. The new title goes out in a `session` event and into history.
   - **Rename:** `PATCH sessions/{id}` with a new title; a renamed session is never re-titled.
   - The title model's cost counts toward the B8 budgets like every other call.
3. **To decide at the start:** the default limit; whether a platform admin's own conversations have the limit too; carrying the question over; the title prompt and model; whether the title follows the conversation's language.
4. **Tests (free):** the limit at 19, 20 and 21 questions (error code, no model call, nothing counted); the title job (success, failure fallback, a renamed session left alone); rename validation and ownership; history and `session` events with the new fields.
5. **Paid:** one smoke question to see a real generated title, about $0.05, approved first.
6. **Docs:** BE `docs/AskCaboodle-FE.md` (`session_full`, questions left, title updates, rename) and §10.8 here.

**C1b — decided (owner, 2026-10-17: D140–D142):**
- **Limit (D140, D141):** 20 questions per conversation, for everyone, platform admins included. It is a Platform Admin setting in `askcaboodleadmin/settings`, which needs a migration on `Intelligence.AskPlatformSettings`.
- **At the limit:** `session_full`, before any model call: nothing is spent or counted.
- **Questions left:** in `GET sessions/{id}` and the `session` event.
- **Titles (D142):** Haiku 5.5 writes a 3–6 word title after the first answer, plus rename (`PATCH sessions/{id}`; a renamed session is never re-titled). On any error the question stays the title. The cost counts toward the B8 budgets; check that `ModelPrices` prices `claude-haiku-5-5`.
- **Defaults stated at planning (not objected to):**
  - "Start a new conversation" carrying the question over is FE-only (the FE pre-fills it);
  - the title follows the question's language and stays under 60 characters;
  - the title arrives in a `session` event when ready before the stream closes, otherwise in history.
- **Counting (D144, owner at the short plan, 2026-10-17):** only questions that used the model count toward the 20 (cost above zero), the same rule as the daily limit.

**C1b as built (2026-10-17, commit `f8e56603`, committed after the owner's review; the IAM branch is unchanged since `b5adb1a1`, fetched 2026-10-17):**
- **The setting:** `AskPlatformSettings.SessionQuestionLimit` (default 20), in `GET`/`PUT askcaboodleadmin/settings` (required in `PUT`, 1–100). Migration `20261017134829_AddAskCaboodleSessionQuestionLimit`: one integer column, not null, default 20 (applied on local `caboodle_dev`; `Down` checked and re-applied; no saved settings row locally, so the defaults apply). BE `docs/AskCaboodle-Deployment.md` lists it.
- **`session_full`:** checked in the ask handler after the daily and monthly checks (a new conversation wouldn't get past those) and after the conversation is opened, before any model call: nothing is saved, spent or counted. "This conversation has reached its 20 questions. Start a new conversation to keep asking." The count is `AskSessionState.QuestionsAsked` (stored questions with a cost, rebuilt from the database like the rest of the state).
- **Questions left:** the `session` event now carries `title`, `questionLimit` and `questionsLeft` (after the question being answered); `GET sessions/{id}` carries `questionLimit` and `questionsLeft`; never below 0 when the limit is lowered.
- **Titles:** `Sessions/AskSessionTitles` after the first question of a new conversation is answered (a clarify counts): one call through `ILlmClient.ReplyAsync` (non-streaming, `IntelligenceSettings:TitleModel` = `claude-haiku-5-5`, thinking off, no tools, no caching, `max_tokens` 40, 8 s timeout), the question plus the headline's label as material. The reply is cleaned (first line; "Title:", markdown, surrounding quotes and closing punctuation removed) and kept only when it is at most 60 characters and 8 words; anything else, a refusal, an error or a timeout keeps the question. The second `session` event goes out after `done`; a client that has left finds the title in history.
- **Rename:** `PATCH sessions/{id}` `{ title }`, own sessions only (404), trimmed and kept on one line, 1–200 characters; returns the session summary. A new conversation is saved when its first answer ends, so it can't be renamed before then (404). **Owner (2026-10-17, at review):** keep Rename off during a new conversation's first answer, and show it once that stream has closed (BE `docs/AskCaboodle-FE.md`, the test page).
- **Title material (owner, at review):** the question plus the answer's headline, as built; not the answer text. The title is written after the first answer, as ChatGPT does (the owner compared them); not at Enter.
- **Beyond the plan's wording, for the owner's review:**
  1. The title's cost is priced to 6 decimals: `ModelPrices.Estimate` rounds to 4, which turns a title's ≈ $0.00003 into 0; `AskMessages.CostUsd` keeps 6.
  2. The title's cost is added to the first question's `CostUsd` (and passed to the budget monitor), so the budgets and the usage report count it with no schema change; that question's cost in a platform admin's history is ≈ $0.00003 above its `done` event.
  3. A follow-up now updates only the session's counters and dates (`AskHistory.TouchSessionSql`): before, it rewrote the whole session row, so a rename made while a question was running would have been undone.
  4. No "renamed" column: the generated title is saved only while the title is still the question (a conditional update), so a rename in that second wins.
  5. The title job runs after the conversation and the user's running slot are released, so a follow-up asked right after `done` is never `busy`; BE `docs/AskCaboodle-FE.md` says to keep reading until the stream closes and to free the composer at `done`.
  6. Only the first question of a new conversation is titled; a failed first question keeps the question as the title for good, and conversations from before C1b keep theirs.
  7. A title model without a price logs a warning at start-up, and no titles are written (questions still work).
  8. The cleaned title allows up to 8 words, not 6 (the prompt asks for 3–6), so a 7-word reply isn't thrown away.
- **Tests:** solution 6,988 green across 16 projects (C1: 6,934); Intelligence 651 (597); build 0 errors, the only warning in the changed files the migration's CA1505. DB tests 48 green (a new one: a generated title, a rename by another request, a stale follow-up save and the cost added, on `caboodle_dev`). `LiveTitleTests` (opt-in, paid) asks the title model for nine real questions.
- **The test page (C1p):** questions left in the header ("19 of 20 questions left", warning from 3, "conversation full"), the title updating live after `done` (header and history), rename from the header (shown once the conversation is saved) and the history list (Enter or leaving the field saves, Escape cancels), `session_full` with "Start a new conversation" (the question copied into the composer), and the composer freed at `done`. Tested free against the mock in headless Edge: the title arrived 0.25 s after `done` with the Ask button already back, a follow-up showed 18 left and no new title, both renames, Escape, `session_full`, a clarify's title; C1p's own scenarios unchanged, no script errors.
- **Paid, $0.0003 (approved):** `LiveTitleTests`, nine real questions to Haiku 5.5, 9 of 9 titled in 0.7–1.3 s at about $0.00003 each (the instructions are about 250 tokens):

  | Question | Title |
  |---|---|
  | How many cases did we ship last month, and how does that compare to the same month last year? | Cases Shipped: September 2026 vs 2025 |
  | What are our year-to-date cases and dollars, split by KeHE and UNFI? | YTD Cases and Dollars by KeHE, UNFI |
  | Who were our top 5 retailers by cases in Q3? | Top 5 Retailers by Cases in Q3 |
  | cases to sprots through keyhe this year | Cases to Sprouts via KeHE |
  | Which stores stopped ordering Matcha Green Tea in the last three months? (no headline) | Lapsed Matcha Green Tea Retailers |
  | How are we doing at Fresh Market? (no headline) | Fresh Market performance overview |
  | What is a promotion family? (no headline) | Promotion Family Definition |
  | Which organizations have Ask Caboodle switched on? | Ask Caboodle Organizations Enabled |
  | ¿Cuántas cajas enviamos a Sprouts este año? | Cajas enviadas a Sprouts este año |

  The headline fixed the typos ("sprots", "keyhe"). One wording slip: "stores" became "Retailers" in the Matcha title.

### C2 — Suggested questions (empty state)
- `GET suggestions` → curated starters (static YAML per org type, later from the gallery/eval set). Zero LLM cost.

**C2 — decided (owner, 2026-10-17: D145–D152):**
- **Source (D145):** a YAML file in the BE repo, drafted by Claude and approved by the owner; Constance reviews them later through C5.
- **Filter (D146, D147):** the modules the person may use for the brand (platform admins: the brand's switched-on modules), and recent data for the topic.
- **Per audience (D148):** platform admins get the brand's starters, then their own, and only their own without a brand. Brokers get the brand starters by each connected brand's modules; with no brand picked, those that fit at least one connected brand.
- **Wording (D149):** no names or figures, relative periods only.
- **Verified (D150):** each starter is the exact question of a golden case that passed its last run; Q60–Q63 are new.
- **C4 and C5 (D151):** C4 uses this set and lists it first in the `/` picker; C5's library later replaces the YAML.
- **Order (D152):** stable, the first four covering four topics; no click tracking.
- **Owner's questions at planning:**
  - The follow-ups under an answer are C0's `suggestions`, written by the model with the answer (no extra call). C2 doesn't change them; replacing them with verified similar questions belongs to C5 (design §9.3).
  - A platform admin doesn't have to pick a brand: without one, the agent asks which brand when a question needs one, and admin questions need none. Brokers pick one connected brand or ask across all of them (G3).

**C2 as built (2026-10-17, commit `4ff33590`, committed at the owner's request; the IAM branch is unchanged since `b5adb1a1`, fetched 2026-10-17):**
- **Endpoint:** `GET askcaboodle/suggestions` with the `BrandID` header and the same permission as the other endpoints until G2. It returns `{ starters: [{ id, text, topic }] }`. No model call, nothing counted.
- **The starters** (`Suggestions/starters.yaml`, embedded like the catalog): 21 in all.
  - **13 for brands, in 8 topics:** Sales (Q01, Q03, Q60, Q07), Promotions (Q62, Q63), Plan vs actual (Q20, Q21), Distribution (Q61), Distributors (Q48), Sandbox (Q31), Category reviews (Q32), Concepts (Q43).
  - **8 for platform admins:** Q49, Q52, Q54, Q53, Q55, Q57, Q58, Q59, in the topics Organizations, Modules, Data pipeline and Emails.
- **Modules:** each starter lists the tables its golden case's reference reads, and the catalog gives their modules (`ISchemaCatalog.StandardTableModules`), so the starters follow the module tags G4 will enforce. A table counts as granted through its brand slug or its broker slug, with View (a brokerage on a connected brand holds the brand's modules, IAM BROKER-BRAND-ACCESS-D1).
  - **Organization users:** `BrandsInScope("ask-caboodle", View)`, so the selected brand or every brand where they have Ask Caboodle. A refused `BrandID` gets nothing.
  - **Platform admins:** the switched-on brand modules of the `BrandID` brand's organization (`EnabledModuleSql.ForOrganization`, IAM's own rule, on the main connection).
  - A starter shows when one brand in scope allows both its modules and its data.
- **Data checks** (`AskStarterData`, on the read-only login):
  - **The checks:** sales (distributor sales since the first of the month 12 months back), distributors (a link to a live distributor), promotions in the next three months and in the next year (approved events with the active statuses 1, 3, 6, 7), this year's approved plan, this year's sandbox plan, and category reviews (a calendar entry, brand report or review).
  - **One query for every brand,** kept for an hour and shared by everyone: 0.3 s in psql, 0.8 s with the connection. `DISTINCT` in each subquery matters: without it Postgres re-read a million sales rows for each brand (12 s, close to the 15 s timeout).
  - **On local data** (215 brands, 2026-10-17): sales 38, distributors 184, promotions in the next three months 9, next year 4, approved plan 11, sandbox plan 5, category reviews 8; 29 brands have none. Bubbies passes all seven checks; David passes three (sales, distributors, promotions ahead).
- **Order:** the first starter of each topic in the file's order, then the second of each, and so on. For Bubbies the first four are Sales, Promotions, Plan vs actual and Distribution; for a platform admin with no brand, Organizations, Modules, Data pipeline and Emails.
- **The file is checked at start-up:** an unknown or platform-admin table, an unknown data check, a duplicate id or a misspelt audience fails the start, as the catalog does.
- **Eval:** Q60–Q63, so 67 cases. They are Q04, Q08, Q16 and Q17 with relative periods and no retailer named; their references were recorded free (Q62: 1,203 events in 113 promotions at 77 retailers).
- **Beyond the plan's wording, for the owner's review:**
  1. The YAML lists tables, not modules: the catalog gives the modules, and a test checks that the tables equal those of the case's reference.
  2. A table is granted through either of its slugs, as IAM treats a brokerage on a connected brand.
  3. An organization user's brands in scope are the ones where they have Ask Caboodle (View).
  4. When the data checks fail, the modules alone decide (logged, not kept), so the empty state never breaks.
  5. One check for every brand, shared for an hour, instead of one per brand.
  6. A brand created within the hour gets no data starters until the next check.
  7. The sandbox starter (Q31) follows `monthly-report`, the module the catalog gives both of its tables; the Concepts starter (Q43) follows `trade-spend-sandbox`.
  8. A platform admin's brand starters don't require Ask Caboodle to be switched on for that brand.
  9. The test page shows a short note for an empty list or an error, where the FE doc says to hide the block.
- **Tests:** solution 7,013 green across 16 projects (C1b: 6,988); Intelligence 676 (651), coverage 98.0 % unit-only; build 0 errors, no warnings in the changed files. DB tests 60 green, 3 of them new:
  - the data checks as `askcaboodle_app` for every brand, under 5 s;
  - Bubbies' switched-on modules;
  - no starter contains any brand, product, category, retailer, banner, distributor, approved or sandbox promotion name on `caboodle_dev`.

  The golden references, Q60–Q63's included, return their recorded values.
  - **Unit tests:** the file loads with its modules; each starter is its case's exact question and reads its reference's tables; no names or figures (only "Ask", "Caboodle" and "UPCs" capitalized after the first word, no number above 30, no "$", "%" or quarter); the start-up checks. The data check's reading, hourly cache, failures and cut results. The filter for a member, a broker across brands (one brand must allow both the modules and the data), a refused brand, a platform admin with and without a brand, failed checks, and a brand the check missed. The order.
- **The test page (C1p):** the starters come from `GET suggestions`: the first four as cards with the topic as a tag, "Show all N suggested questions" for the rest, two columns (one on a phone). They are fetched again for each new conversation, brand change and sign-in, a reply for an earlier brand is ignored, and an empty list or an error shows a short note. Tested free against the mock in headless Edge (`drive-c2.mjs`): Bubbies' four topics and all 21; a starter asks its question; a brand with no data gets Concepts and the admin starters; a brand change while loading keeps only the last brand's; a failure shows the note; no request before sign-in; one column on a phone. C1p's and C1b's own scenarios were re-run unchanged.
- **Paid, $0.29 (approved after the commit; report BE `docs/AskCaboodle-Eval/2026-10-17-claude-sonnet-5-5-medium-c2.md`):** `eval-run.ps1 -Cases "Q60,Q61,Q62,Q63" -Budget 0.60 -Rerun 0 -Model claude-sonnet-5-5 -Effort medium -Label c2`. The cap was $0.60 rather than D150's $0.50 because each case in flight reserves $0.30 of the cap.
  - **Result:** 4 of 4 passed, none corrected by the fact check, claims check ok on all four. $0.19 answers and $0.10 claims check; 14.4 s on average.
  - **Q62** ("Which promotions do we have in the next three months?") cost $0.15 (7 steps, 23 s). It summarized rather than listing: 113 promotions, 1,203 events, 77 retailers; ABSCO with 226; the "- Copy" and re-forecast duplicates not added together.
  - **Q63:** one rejected `present_answer` (a year in the headline label, C0's rule), which cost one step. This is the "fewer rejections" item parked by the owner.

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

**C3 — decided (owner, 2026-10-17: D153–D159):** 11 period tokens plus `custom` for named dates, all through `@period_start`/`@period_end` (D153); the tool plan stored per shown result, calculator pins re-run the calculator on the same promotions (D154); the KPI delta for headline pins with a past rolling token (D155); the "not loaded yet" check on distributor sales and SPINS (D156); personal pins (D157); the nightly re-check and the broken reasons (D158); render under the viewer's access (D159). The IAM branch is unchanged since `b5adb1a1` (fetched 2026-10-17, at C3's start).

**C3 as built (2026-10-18, commit `31d598a4`, committed at the owner's request; eval report `8e689053`):**
- **Periods (`Periods/AskPeriods`, `AskQueryPeriod`):** the 12 tokens, their calendar ranges (end excluded), labels ("Sep 2026", "Q3 2026", "Jul–Sep 2026", "1 Jan – 17 Oct 2026") and the previous period for the delta.
- **`run_sql`** takes `period` (an enum of the 12) and `custom_from`/`custom_to` (both days included). When the checked SQL uses `@period_start` or `@period_end`, the server binds both (dates, no time zone) and the result's first line states them: `result_id: r2 · 9 rows · period last-quarter: 2026-07-01 to 2026-09-30 · columns: …`. SQL that uses them without a period is refused; a period the SQL doesn't use is left out of the result, so it never claims dates it didn't use.
- **Prompt (shared, D39):** one sentence in step 3: pass the question's period (relative or named) and filter with the parameters, derive comparisons from them, type dates only for periods worked out from the data. The tool list changed, so the cached prefix is written once again and older conversations restart with their earlier exchanges.
- **Migration `20261017175702_AddAskCaboodlePins`** (local `caboodle_dev`; `Down` checked and re-applied): `Intelligence.AskPins`: owner, organization, brand, `ForPlatformAdmin`, title, question, source session and message (no foreign key, so deleting the conversation leaves the pin), `PlansJson`, `ViewJson`, `PeriodToken`, `PeriodStart`/`PeriodEnd` (the answer's dates), status, broken reason and detail, last checked and rendered. BE `docs/AskCaboodle-Deployment.md` lists it.
- **The pin (`Pins/AskPinBuilder`):** built from the stored answer: the frame's headline and the data block name result ids; the transcripts (this answer's, then earlier ones in the conversation) say which call produced each, read with C1's transcript reader (now `Trace/AskTranscript`, shared with the trace). `run_sql` keeps its checked SQL, its purpose and the period read back from the result's first line; the calculator keeps its checked arguments (`PromotionPerformanceRequest`). The view keeps the table's spec (title, chart, axes, series, formats, total columns, highlight rules), the headline's rule and the scope, source and period notes.
- **Render (`Pins/AskPinRunner`, `AskPinShow`):** each call runs again (the guard against today's catalog, the period bound for today, the audience's login; the calculator on the same promotions) and C0's `AskAnswerRules` rebuild the headline, totals and highlights; nothing is computed over a result cut at 500 rows. A missing column breaks the pin.
- **D156 (`Pins/AskLoadedData`):** for pins reading distributor sales or SPINS Stores Insight with a period and a brand: the first and latest month per distributor (one query, kept 15 minutes per brand; 0.1–0.6 s) and the first and latest SPINS week (about 1 s). On local data: Bubbies is loaded through September for both distributors (SPINS through the week ending 6 September); David through August.
- **D155:** run again for the previous span (cut to the months every distributor has loaded, and only when the data starts early enough), with the same headline rule.
- **D159 (`Pins/AskPinAccess`):** at create and at every render; a denied render saves the pin as broken (`access_changed`).
- **D158:** `AskPinCheckJob` with `AskPinCheckJobRegistrar` (`ask-caboodle-pins-nightly`, `0 3 * * *` UTC, the `UnverifiedAccountCleanupJobRegistrar` pattern).
- **Endpoints:** `POST`/`GET askcaboodle/pins`, `GET pins/{id}/render`, `PATCH pins/{id}` (title, period), `DELETE pins/{id}`, with the same permission as the other endpoints until G2. Status writes and the owner's edits are targeted updates, so a check never undoes a rename (C1b's lesson). BE `docs/AskCaboodle-FE.md` has "Pinned reports".
- **Eval:** `expect.period` on 24 cases (relative periods; `custom` for Q04, Q08, Q17 and the DAVID variants), a reported check (`period`: "took last-quarter, expected last-month"), and a test that every token is known.
- **Beyond the plan's wording, for the owner's review:**
  1. The table and the headline can come from different queries; each keeps its own plan. The pin can switch period only when every period-taking query shares one period and no other query typed its dates; otherwise each keeps its own, and a moving period next to typed dates is fixed on the answer's dates, so the table and the headline never cover different periods.
  2. The answer's dates are read back from the result's first line in the transcript, so `AskToolCalls` needs no new column.
  3. Creating a pin runs the access check and the plan once; a timeout refuses the pin with "try again".
  4. The access check uses every brand where the person has Ask Caboodle, not only the brand selected on the screen, so a pin still renders while another brand is open.
  5. "Not loaded yet" names only months that have ended; the current month is just "Data through September 2026". A distributor with no data in the 12 months before the period is left out (a brand that stopped using it).
  6. No delta for forward tokens (`this-year`, `next-year`, `next-3-months`) or fixed dates; none when a previous period starts before the brand's first loaded month.
  7. Timeouts, an unreachable database and a calculation out of time are "problems": shown on the card, never breaking the pin; the nightly job skips them, and skips platform admins' pins when the admin login isn't set.
  8. `GET pins` filters by the `BrandID` header like `GET sessions` (all your pins without one).
  9. `brokenDetail` reaches organization users only for `access_changed` and `promotion_missing` (plain sentences); the database errors are for platform admins.
  10. C2's module rule moved to `CatalogTableModules.GrantedBy` and `AskBrandModules.Viewable`, shared with pins; behavior unchanged.
- **Tests:** solution 7,095 green across 16 projects (C2: 7,013); Intelligence 760 (676), coverage 97.8 % unit-only (the pin store is covered by the DB tests); build 0 errors, the only new warning the migration's CA1505. DB tests 65 green (5 new): a pin's figures and delta equal direct SQL on Bubbies; David's "September 2026 isn't loaded yet" and a quarter compared over Jul–Aug against Apr–May; a stored answer pinned, listed, rendered, renamed, switched and deleted on `caboodle_dev`; the nightly job marking a pin with a removed column broken (42703); the loaded months read as `askcaboodle_app` under 5 s.
- **The test page (C1p):** Pin under an answer with a table or headline (title, period), pinned reports in the rail, and a board where each pin runs on fresh data: headline with the change against the previous period, notes, the "not loaded yet" note, the same table or chart, the calls (SQL for platform admins); Refresh, the period switch, Rename, Re-ask, Open the conversation, Delete; broken pins with "Re-ask to repair". The page now reads the API's validation errors (`error.messages`). Tested free against the mock in headless Edge (`drive-c3.mjs`): 9 scenarios, no script errors; C1p's, the reveal order's, C1b's and C2's drivers re-run unchanged.
- **Paid, $0.37 (approved; report BE `docs/AskCaboodle-Eval/2026-10-18-claude-sonnet-5-5-medium-c3.md`):** `eval-run.ps1 -Cases "Q01,Q02,Q03,Q61,Q12,Q62,Q04,Q08" -Budget 1.20 -Rerun 0 -Model claude-sonnet-5-5 -Effort medium -Label c3`. $0.30 answers, $0.07 claims check; none corrected by the fact check.
  - **7 of 8 passed.** The six relative questions took their token (Q01 and Q61 `last-month`, Q02 `year-to-date`, Q03 `last-12-months`, Q12 `last-quarter`, Q62 `next-3-months`), so pins of their answers move with the calendar.
  - **Found: named dates are still typed.** Q04 ("in Q3") and Q08 ("in September") passed, but their queries typed the dates instead of `custom`, so their pins stay on their own dates and can't be switched (D153 wanted them switchable). Open in §7.2.
  - **Q62 failed on its figures, not on its period:** the window was the reference's exactly (12 Oct 2026 – 11 Jan 2027), but it listed TPR events only (no EDLP, statuses 1, 3, 6) as 57 promotion × retailer rows instead of 113 promotions and 1,203 events. C2's run passed it on the same question; most likely a run-to-run change of framing. Open in §7.2.
  - The optional platform-admin case (Q54, ≈ $0.15) was not run.

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
- **From C2 (D151):** the "seeded starter prompts" are C2's starters (`GET suggestions`), not a second seed; the `/` picker lists them first, then the prompts.

**C4 — decided (owner, 2026-10-18: D160–D164):** the organization's admins review organization prompts, platform admins too (D160); private, organization and people in the same organization, built now, nothing across organizations (D161); `{period}` (C3's tokens, in words), `{brand}` (the runner's brands) and free text or the author's choices (D162); runs by D144's rule, "Verified" on the starters only until C5 (D163); one `GET picker` call, starters first (D164). The IAM branch is unchanged since `b5adb1a1` (fetched 2026-10-18, at C4's start).

**C4 — widened before its commit (owner, 2026-10-18: D165–D169):** after the first build the owner asked for typed fill-ins (period, dates or an entity, scoped to the brand, with a default and run against any value) and an AI call to polish a prompt with its fill-ins intact, and chose to build them into C4 rather than a C4b, on the recommendations given: the types (D165, replacing D162's "no entity-search pickers"), "the brand's" values (D166), the Dates picker (D167), writing a prompt without braces (D168) and "Improve with AI" (D169).

**C4 as built (2026-10-18, committed as `40efb441` at the owner's request):**
- **Migration `20261017213333_AddAskCaboodlePrompts`** (replaces the first build's `20261017201807`; local `caboodle_dev`; `Down` checked and re-applied): `Intelligence.AskPrompts` (author, organization, title up to 100, text, `VariablesJson`, visibility, review status, note, reviewer and date; indexes on author and on organization + visibility for undeleted rows), `Intelligence.AskPromptShares` (prompt + person, cascade-deleted with the prompt), `Intelligence.AskPromptImprovements` (person, organization, model, calls, tokens, cost, whether it changed the prompt; indexes on person + date and organization + date) and `AskMessages.PromptID` (nullable, partial index where set). No grants: the values lookup reads 13 tables the read-only logins already have (checked on both roles). BE `docs/AskCaboodle-Deployment.md` lists it, with `ImproveModel`/`ImproveSeconds`.
- **Endpoints** (same permission as the others until G2): `GET prompts` (the tabs in one call: `organization`, `mine`, `sharedWithMe`, `pendingReview` for admins, plus C2's `starters`), `POST prompts`, `PUT prompts/{id}`, `POST prompts/{id}/review`, `DELETE prompts/{id}`, `GET prompts/values`, `POST prompts/improve`, `GET picker`; `POST ask` takes `promptId`. BE `docs/AskCaboodle-FE.md` has "Prompt gallery".
- **Visibility (`Prompts/AskPromptRules`):** yours are the prompts you wrote in the organization you work in, or outside any; the organization's are its approved organization prompts; a people prompt reaches the members it names. Admins also see the organization prompts waiting for review, edit and delete the organization's prompts, but can't change who uses them. Every read is one query (`Prompts/AskPromptStore`) with the author's name and the run count; writes touch only their own columns (C1b's lesson).
- **Fill-ins (`Prompts/AskPromptTypes`, `Prompts/AskPromptVariables`):** names in braces (letters, digits, `_`, up to 30 characters, matched without case, at most 5), stored for every name in the text with a type (D165) and a label up to 40 characters. Each comes back resolved for the viewer: period tokens with their labels, today's dates and their words ("the last 3 months"); dates as a month, quarter or year list around today, or a range to type (D167); entity values as the author's list or, without one, a search with the default; the viewer's brands (`Prompts/AskPromptBrands`); the author's text choices. A brand's own value (product, category, promotion) of a brand the viewer can't ask about comes back as no default and is left out of the list (D39). The picker's text has the defaults filled in, in words. The checks: period choices must be tokens, dates need a format and take no choices, entity values must be ids the lookup finds for the author's brands (their names are stored then), `{brand}` takes no settings, up to 20 choices of up to 100 characters, a default must be one of the choices.
- **Values (`Prompts/AskPromptValues`, `GET prompts/values`, D166):** per type, up to 20, the brand's own first, then exact names, then by similarity (misspellings allowed; a product also by UPC). The brand's own shared values are one query per brand (172 ms on Bubbies), kept an hour. Without a type, the words are recognized as a period, named dates, up to 3 values of each type, then text (D168). On the read-only login (`AskAudience.Standard`), no model call.
- **Improve with AI (`Prompts/AskPromptImprover`, `POST prompts/improve`, D169):** Haiku 5.5, a JSON reply (the question and the words worth turning into fill-ins), the fill-ins compared as a multiset; a second call with the reason when they differ, then the prompt is kept with a note; up to 5 suggestions, words of the question outside its braces, their values looked up for the brand. The request checks the month's allowance and 30 a day per person before the call, then records the cost in `AskPromptImprovements` and with the budget monitor (the 80 % and 100 % alerts); the usage store sums it into the organization's and the platform's monthly spend. `costUsd` for platform admins only.
- **Runs:** `promptId` on the ask is checked before any model call (a prompt the asker may no longer run gets the new error `prompt_unavailable`, nothing counted) and stored on the question; the count is the questions with that `PromptID` that used the model.
- **C2's starter filter** moved to `Suggestions/AskStarterSelection`, shared by `GET suggestions`, the gallery and the picker; behavior unchanged (C2's tests pass as they were).
- **Beyond the plan's wording, for the owner's review:**
  1. Sharing is saved with the prompt: `POST`/`PUT prompts` carry `visibility` and `sharedWith`, instead of the separate `PUT prompts/{id}/shares` in the short plan. One save, so a prompt is never saved without its people.
  2. A prompt stays in the organization it was saved in. Someone who leaves an organization no longer sees, edits or deletes the prompts they wrote there; a platform admin's prompts saved outside any organization show wherever they work and stay private.
  3. A rejected prompt goes back to its author only; saving it again sends it back to review, even unchanged. An admin can also reject an approved prompt later, which takes it off the Organization tab.
  4. Prompts saved without types keep working: `{period}` and `{brand}` are typed by name, every other name is text.
  5. For a platform admin, `{brand}` offers every brand of the organization they work in (Ask Caboodle switched on or not), or outside one the brand selected on screen.
  6. Running a prompt with a `{brand}` choice: the FE sends that brand's id as the new conversation's `BrandID`.
  7. A new error code, `prompt_unavailable`, before any model call; the test page offers "Ask it without the prompt".
  8. Run counts include questions in deleted conversations until the purge, as the usage reports do (D63).
  9. Shared-with people are checked against IAM's active memberships when the prompt is saved; one sentence for any who aren't ("Share only with active members of your organization.").
  10. The gallery reads `Organization.Memberships` and `Identity.Users` on the main login for names and the members check, as the usage report and IAM's members list do.
  11. Improvement costs have their own table, `AskPromptImprovements`, summed into the monthly spend (organization and platform budgets, their alerts and the allowance) but not into the per-question usage report or today's questions: they aren't questions. The usage report's monthly totals include them.
  12. An unpriced `ImproveModel` keeps prompts as they are, with a start-up warning, as for the title model; nothing is called or recorded.
  13. Entity values are named when the prompt is saved, so a renamed retailer keeps its old name in the prompt until the next save; the agent still resolves the words when it runs.
  14. A brand's own values need a brand when saving: the `BrandID` header, else the author's brands; a platform admin outside any organization is asked to select one.
- **Tests:** solution 7,198 green across 16 projects (C3: 7,095); Intelligence 861 (760), coverage 96.9 % unit-only (the prompt store's and the values' SQL are covered by the DB tests); Release build 0 errors, the only new warning the migration's CA1505. DB tests 77 green (12 new): Bubbies Ice Cream's own members save an organization prompt (pending), the admin sees and approves it, a people prompt reaches only the member named (an outsider is refused), two questions from the prompt count one run (only the one that used the model), the picker fills the defaults (under 1 s), a title change keeps the approval, the author and the admin delete; every value type read on the read-only login with Bubbies' own first; another brand's products refused and words recognized; an improvement's cost counted in the month's spend (organization and platform) and in the daily cap. The rows are removed afterwards (checked: none left).
  - **Unit tests:** the fill-ins (names, types, labels, every refusal, resolving periods, dates, entities, brands and text, filling in words, words for every token and named date, settings compared across JSON spacing and key order); the rules (who reviews, yours, the organization's, people, run, edit, the review after a save, a title-only change); every handler against an in-memory store with the SQL's rule (private, organization pending → approved, admin at once, rejected with note → resubmitted, review refused or not found, people with non-members or nobody, outside an organization, the 50th prompt, admin edits, shares changed, delete, the tabs' order, the picker's order and filled text, entity values named and a brand's own kept to its brand, the values request, the validators); the values (the brand's own first, kept an hour per brand, a brand's own values only for its brands, recognition order); the improver (accepted, retried, kept with the reason, unchanged, a failed or refused call, no price, suggestions, the JSON, the allowance and the cap, the cost recorded); `{brand}`'s choices; the ask refusing a prompt before any model call and saving `PromptID`.
- **The test page (C1p):** a Prompt gallery in the rail: Organization (the organization's prompts, then the starters under "Suggested by Caboodle" with "✓ Verified"), Mine, Shared with me, and Pending review for admins; cards with each fill-in as a pill (a select with the period's dates, a search box for any value, two date inputs for a range, or a text input), runs, author, the review state and note, Edit, Delete, Approve, Reject, Run (a new conversation, the question in words, `promptId`, "from a saved prompt"). A New/Edit prompt form: title, text with "+ Insert fill-in" (also on `{`) and "Make selection a fill-in" (the server's candidates to pick from), the `{ABSCO}` hint, one card per fill-in (type, label, default from a search, "any value" or the author's list, period ticks, the dates format), a live preview of what runners see, "Improve with AI" (before and after, Use this / Keep mine, suggested words with "Make it a fill-in"), who can use it, people found through IAM's members. The composer's `/` picker: starters first, then prompts with their tag and collection; filter as you type, ↑ ↓ Enter Esc, the first unfilled `{name}` selected after insert; a question inserted from a prompt carries its `promptId`. `prompt_unavailable` offers "Ask it without the prompt". Tested free against the mock in headless Edge (`drive-c4.mjs`: 13 scenarios, no script errors); C1p's, the reveal order's, C1b's, C2's and C3's drivers re-run unchanged.
- **Cost so far:** $0. "Improve with AI" is the only model call; its paid check (`LiveImproveTests`, 8 prompts, about $0.001–0.002) was offered and not run yet.

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
- **From C2 (2026-10-17):**
  - C5's library becomes the source of `GET suggestions`, with the same fields; C2's YAML becomes its first entries (D151). Templates with slots can then name the brand's own retailers.
  - The follow-ups under an answer (C0's `suggestions`, written by the model) aren't checked today; C5 can replace them with verified similar questions (design §9.3). The owner asked about them at C2's plan.
- **From C4 (D163):** organization prompts get "Verified" here: a platform admin marks one after an eval pass, and the nightly re-check takes it away when it breaks. Today only the starters show it. C4's `AskMessages.PromptID` gives each prompt's runs for choosing which to verify first.

**C5 — decided (owner, 2026-10-18: D170–D176):** split into C5a now and C5b once C5a's results are measured (D170); the 21 starters verified at once, and the other passing golden cases, thumbs-ups and organization prompts entered as proposals; the 100-question library skipped for now: the draft goes to the owner to check with Constance, with no paid run for it yet (D171); exact names and known aliases only, at most 2 examples, the threshold set free on the golden questions (D172); platform admins verify, and an organization prompt is verified from one of its runs (D173); slots of C4's types (D174); broken examples go out of use, and a catalog change sends one to "review again" (D175); `GET suggestions` comes from the library, and C0's follow-ups stay until C5b (D176). The IAM branch is unchanged since `b5adb1a1` (fetched 2026-10-18, at C5's start). Cost: the 12-case paid check is approved (about $0.65, cap $1.20) for after the build; no full run now.

**C5a as built (2026-10-18, committed as `4ee2a349` at the owner's request; examples in the question off by D177):**
- **Migration `20261018111702_AddAskCaboodleExamples`** (local `caboodle_dev`; `Down` checked and re-applied) adds three things:
  - `Intelligence.AskExamples`, which holds:
    - the question, its template, its retrieval text and slots;
    - the audience, the scope (organization or brand) and the source brand;
    - the calls and view in the pins' JSON shapes, so C0's headline and notes rules are kept;
    - the tables read and their catalog hash;
    - the seed key and hash, the source and its reference;
    - the status, review note, reviewer and date;
    - the check's result and date, and "catalog changed";
    - the starter topic, order and data checks.

    The seed key has a unique index that deleted rows keep, so a deleted seeded example never comes back.
  - `AskMessages.ExamplesJson`: the examples given with each question, for C8.
  - `AskPrompts.ExampleID`.

  No grants. BE `docs/AskCaboodle-Deployment.md` lists it.
- **Templates and slots (`Examples/AskExampleBuilder`):** an example is built from a stored answer the way a pin is (C3): the shown results' calls and C0's view, with a pin's refusals reworded for an example. Then:
  - Each id in the calls that the answer's name search found, or that the names list knows, becomes a slot of C4's types (`{retailer}`; a second one is `{retailer2}`).
  - The words of the question that named the value become that slot in the template.
  - The asking brand, when the question names it, becomes `{brand}`.

  **Leftovers** keep an example with its brand (D39):
  - an id that is neither the brand's nor a slot's;
  - a UPC or item code;
  - a brand's own name written in the SQL (a product, category, promotion or brand name that no shared name holds);
  - the brand's own words in the question, or in what the SQL wrote itself (its literals and column aliases): "our Ube flavor", `all_ube_stores`.
- **Names (`Examples/AskExampleNames`):** read on the read-only login, with no model call.
  - For everyone, kept an hour: retailers with their aliases (as the name search knows them), banners, distributors, regions and brands.
  - Only for their own brand, kept an hour per brand: products, categories and promotions.
  - A retailer is also known by the first word or two that at least two of its aliases start with and no other retailer's do ("Albertsons" for ABSCO).
- **Retrieval (`Examples/AskQuestionShape`, `AskExampleFinder`, `AskExampleStore.ScoreSql`):**
  - **Shaping:** the question is shaped with the brand's names. Names become their type; relative periods become one word, named dates another and numbers a third; filler words are dropped.
  - **Scoring:** Postgres averages two scores against the library: the `pg_trgm` similarity of the shaped texts, and the share of stemmed words both have (full-text lexemes, leaving out the slot words and "many"/"much").
  - **What is given:** only verified examples in use, of the asker's audience and scope (everyone, the organization worked in or the brand's, or the brand), and only when every table their calls read is in a module the asker may use (C2's rule).
  - **Limits:** at most `ExamplesPerQuestion` (2), from `ExampleMinimumScore` (0.55), searched for at most `ExampleSearchSeconds` (3). A slow or failed search answers without them and logs a warning. A conversation never gets the same example twice.
- **In the question (`Examples/AskExampleBlock`):** a `<verified_examples>` block goes in the user message after `<context>`.
  - **Its instruction:** the examples are a guide, not this question's answer; find this question's names with `search_entity` and pass its own period; check the catalog for anything the examples don't cover.
  - **Each example shows:**
    - its template;
    - its calls: the SQL with the source brand's id as the asking brand's and each slot's value as `{name}`; the period token, or "custom, the dates the user named"; the calculator's arguments;
    - how it was shown ("Shown as: bar of cases by month; headline total of cases").

    No figures. An example over 4,000 characters is left out.
  - **What stays the same:** the system prompt and tools, so the cache and older conversations are untouched.
  - **The fact check** reads the user message without the block, so a number in an example's SQL never vouches for a figure (`AskFactRegister`).
  - **Platform admins** get `{ id, score, template }` in `done.examples` and in history.
- **Proposals (`Examples/AskExampleProposals`):**
  - A thumbs-up on an answer with a table or headline proposes it, and never fails the rating.
  - A platform admin's "Propose as example" (`POST examples`) does the same for their own answers.
  - An example starts with the brand it was asked on.
  - The same question for the same brand isn't proposed twice.
- **Approval (`askcaboodleadmin`, platform admins only, 403 for anyone else):**
  - `GET examples?filter=`: the examples of one status, with the counts per status.
  - `GET examples/{id}`: the calls as the model reads them, the slots, how it was shown, the tables, the leftovers and the source answer.
  - `PUT examples/{id}`: the template's wording (with its own fill-ins), the scope, the starter topic and data checks.
  - `POST examples/{id}/review`: Verify runs its calls first, as a pin's are run; an example whose calls don't run, or can't run now, isn't verified. Reject takes a note.
  - `POST examples/{id}/check`: Re-check now, free.
  - `DELETE examples/{id}`.
  - `GET examples/similar?question=`: the question as retrieval reads it, and the closest examples the brand may be shown, proposals included, marked "given" when they would be.

  BE `docs/AskCaboodle-FE.md` has "Verified examples".
- **Seed (`Examples/examples.json`, `AskExampleSync`):** written by the free `ExampleSeedTool` from the stored eval reports. For each one-question case it takes the newest passing run since C0 whose shown queries took the period the case expects; a run that typed its dates for a relative question is skipped.
  - **35 entries:** 32 open to everyone; Q09, Q10 and Q30 for Bubbies only (leftovers).
  - **Answers (added after the owner's first look, 2026-10-18):** each entry also carries its passing run's answer (the text, headline, notes and the table shown; 33 of 35 have a table), so a platform admin judges it by what the user saw. `GET examples/{id}` returns it as `answer`, with `run` naming the eval report and no conversation ids. It is read from the seed by the example's key: no database change, never given to the model, and not part of the seed hash, so adding it changed no example's status.
  - **When it syncs:** at start-up (one Hangfire job) and before every nightly check.
  - **What comes in:**
    - the 21 starters, verified at once (D150): 11 have calls the model can be given; 10 have no usable run, so they are offered as starters only;
    - every other entry as a proposal (24).
  - **Changes:** a changed entry is rewritten and, unless it is a starter, sent back to review.
  - **What stays:** an admin's decisions. A deleted example doesn't come back, and a rejected one stays rejected.
  - **Re-shaping:** each sync also re-shapes every example's retrieval text with today's names.
- **Nightly re-check (`Examples/AskExampleChecks`):** `ask-caboodle-examples-nightly` runs at 03:30 UTC, after the pins' check. It runs every verified example's calls through the pins' runner, on the example's source brand and the audience's login, with no AI call.
  - A broken example is out of use until it passes again.
  - An example whose tables' catalog entries changed goes to "review again" until a platform admin verifies it again.
  - A timeout or an unavailable database changes nothing.
- **Starters (`Suggestions/AskStarterSource`):**
  - `GET suggestions`, the gallery and the picker read the library's starters, kept five minutes and forgotten on a platform admin's change.
  - The seeded starters keep `starters.yaml`'s id, tables and data checks, so C2's filter and output are unchanged.
  - A platform admin can mark a verified example open to everyone as a starter. Its wording is checked by D149's rule (`Suggestions/AskStarterWording`: no fill-ins, amounts, percentages or quarters).
  - Without the library (not seeded yet, or unreadable), `starters.yaml`'s own list is shown.
- **Organization prompts (D173):**
  - `GET prompts/{id}/runs`: an approved organization prompt's last 20 answered runs.
  - `POST prompts/{id}/verify` with a run: that answer becomes a verified example for the organization (for its brand only, when it has leftovers), and the prompt links to it.
  - `DELETE prompts/{id}/verify`.

  The prompt and its picker item show `verified` while the example is in use. A change to the prompt's text or fill-ins drops the link (in the update's SQL).
- **Eval:**
  - Each case is asked with the verified examples the app would give it, except its own example and those of its other wordings (the same question on another brand, and Q04/Q60, Q08/Q61, Q16/Q62, Q17/Q63).
  - The report lists the examples given, by case and score. `ASK_CABOODLE_EVAL_EXAMPLES=0` asks without them.
  - The free `ExampleRetrievalTool` prints every golden question's closest examples with both scores. At 0.55, 13 of 65 cases have a match under these rules (17 at 0.50, 6 at 0.60).
  - BE `docs/AskCaboodle-Eval/README.md` is updated.
- **Beyond the plan's wording, for the owner's review:**
  1. Only ids become slots.
     - A name written in the SQL stays as written: it may be a fixed code's label ('UNFI' for source 1), and a brand's own name there is a leftover.
     - The period isn't a slot: the template keeps the question's period words, the call shows the period token, and retrieval reads every relative period as one word.
     - Numbers are read as one word in retrieval but stay as written in the template, so there is no `{n}` slot.
  2. In the block, the source brand's id becomes the asking brand's id, not `{brand}` (`{brand}` only when there is no brand), so the model can run the SQL as shown.
  3. The score averages the trigram similarity and the share of stemmed words. The word share stops "cases to Sprouts" from matching "stores at Sprouts" on letters alone.
  4. The threshold 0.55 was set with the free retrieval tool under the eval's leave-one-out. That leaves out each case's other wordings too, so the check "each case finds its other wording" couldn't be made: those pairs are excluded by design.
  5. Some matches at 0.55 share a question's shape but ask for something else: Q12 ("How much did we ship to Albertsons last quarter?") and Q61 ("How many stores did we ship to last month?") match each other at 0.566. The block tells the model to check the catalog for anything the example doesn't cover; the paid check shows whether such matches help or mislead (§7.2).
  6. "Starter" isn't a source: a starter is an eval example with a starter topic. The stored statuses are proposed, verified and rejected. "Broken" and "review again" come from the check's result and the catalog flag, so a fixed example comes back without a new review.
  7. A seeded starter without a usable passing run still comes into the library, without calls. It stays a suggested question and is never given to the model.
  8. The same question for the same brand isn't proposed twice. The plan said "merged", but nothing is counted.
  9. Verifying runs the example's calls first, as a pin's are run. An example whose calls can't run now (a timeout, or the admin login missing) isn't verified.
  10. A platform-admin example (admin tables) is given only to platform admins, and checked only when `AdminReadOnlyConnectionString` is set.
  11. A platform admin's examples go by the brand organization's switched-on modules (C2's rule, D146). A platform admin sees the examples of the organization they work in and of the brand on screen.
  12. Only an approved organization prompt can be verified. `DELETE prompts/{id}/verify` keeps the example in the library.
  13. Each API instance caches the starter list for five minutes, so another instance shows a change within five minutes.
- **Tests:**
  - **Totals:** solution 7,284 green across 16 projects (C4: 7,198); Intelligence 947 (C4: 861). Release build 0 errors; the only new warning is the migration's CA1505.
  - **DB tests:** 80 green (3 new). They check:
    - the library's SQL on `caboodle_dev`: scoring, the audience and scope filters, excluded ids, every targeted write, the starters' order;
    - the names on the read-only login with Bubbies' own, in under 5 s, with "Albertsons" read as ABSCO;
    - every seed entry's calls on today's data, and that no example open to everyone holds a brand's own values;
    - an answer becoming an example, and a prompt verified from it showing "Verified" until its text changes.

    The rows are removed afterwards.
  - **Unit tests:**
    - the shaping (names, aliases, periods, dates, numbers, filler);
    - the builder (slots, templates, `{brand}`, every kind of leftover, the refusals);
    - the block (brand id and slots replaced, calculator arguments, named dates, the length limit);
    - the finder (in use, threshold, limit, scope, modules, excluded cases);
    - the seed and sync (starters verified, proposals, changed entries, deleted and rejected kept, re-shaping);
    - the check and the nightly job;
    - the starter source (library, fallback, cache, marked starters, the wording rule);
    - every handler and validator;
    - the thumbs-up proposal;
    - the ask: examples given, recorded and not repeated; a failed or slow search answers without them;
    - the fact register without the block.
- **The test page (C1p):**
  - **An admin "Examples" panel in the rail:**
    - tabs by status with counts, and cards with the source, the case and the scope;
    - the detail, laid out for a reviewer after the owner's first look: "1. Is this answer right?" (the answer as the user saw it, its headline, notes and table or chart; for a seeded one, the test run it came from), "2. Who can get it?" (one sentence, the scope choice, the leftovers as a sentence), then "Verify: the answer is right" and "Reject: it is wrong"; the reusable wording, fill-ins, calls, tables and Re-check now folded under "Technical details (for engineers)", and the starter fields under "Also suggest it on the empty screen";
    - the broken reason or "the catalog changed", Save changes and Delete;
    - "Similar examples" for any question, with the scores and which are given.
  - **Under answers and in the trace:** "Propose as example" under a platform admin's answers, and "Verified examples given" in the trace, live and from history.
  - **On organization prompts:** "✓ Verified" and "Verify from a run" (the runs with their answers, "Verify from this run", "No longer verified").
  - **Tested free** against the mock in headless Edge (`drive-c5.mjs`: 10 scenarios, no problems, no phone overflow; re-run after the reviewer layout, with the seeded answer's chart drawn). The earlier drivers re-ran with no change except timing and order, and C4's now shows the new "Verify from a run" button.
- **The 100-question starter library (D171):** drafted for the owner and Constance in [`ask-caboodle-starter-library-draft.md`](ask-caboodle-starter-library-draft.md). It has 100 questions in 15 topics, each with who asks it, what it answers, the data it uses and Keep / Change / Drop. It isn't in the library, and there is no paid run until they have marked it.
- **Paid check, $0.49 (owner, 2026-10-18; eval report `2026-10-18-claude-sonnet-5-5-medium-c5a-examples`):**
  - **Which cases:** the owner asked to test only the cases that get a verified example today, 8 of 65 after the owner verified Q10: Q01, Q01-DAVID, Q03, Q05, Q12, Q20, Q27 and Q31. The free retrieval tool now prints "given today" per case. Cost: $0.35 answers, $0.14 claims check.
  - **Result:** 5 of 8 passed. Their last runs passed 7 of 8 (Q27 has failed since B7b). The rule checks passed 8 of 8: every figure was right.
  - **Q03 failed:** a trend sentence ("rose … to July, then eased", when June was the peak). It is C0c's kind, and Q03 has flipped on it before. It copied its example's query shape (Q01's, with the extra distributors column), with the same figures as before.
  - **Q20 failed:** "October–December show 0 actuals because those months haven't happened yet", when the test is asked on 12 October. Its last run added "or haven't been uploaded" and passed. Its examples (Q01, Q31) don't touch the Monthly Report.
  - **Q27 failed as before:** its query left out the future-dated price. Its example was Q10 (velocity, not list price) at 0.778, matched by the shared product words "Red Ripe Strawberry" (§7.2).
  - **Cost and steps:** Q05 took one step fewer (5 → 4, $0.054 → $0.042). Otherwise the steps were the same. The answers cost about 4 % more, leaving out Q01's cache write; input rose 2–10K tokens per question, since every step re-reads the block, mostly from the cache.
  - **Reading:** the model uses the examples (Q03's query). On cases that already pass, they can't show a gain, and 8 cases can't tell the two flips from run-to-run noise. Q16, Q18, Q22, Q39 and Q61 wait for Q12, Q18, Q19 and Q22 to be verified (about $0.30).
  - **Balance:** about $47.12.
- **Fixes after the first check (free; owner: "fix the product name flaw"):**
  - **Part of a product's name** (two or more words in a row of one of the brand's product or category names, such as "Red Ripe Strawberry") is read as a product, for matching only (`AskNameIndex.FindProductParts`). The template keeps the words, and no slot is made.
  - **The retailer names taken from aliases** now need at least a fifth of that retailer's aliases, and aliases that differ only in case or punctuation count once. The member stores of catch-all retailers ("UNFI Independents") had made plain words into retailer names: "price" came from "Price Chopper" and "PRICE CHOPPER", and "wholesale", "house" and "discount" came the same way.
  - **The free retrieval run:** Q27 no longer gets Q10 (0.778 → 0.321), Q27 reads as "what s price slotproduct", and no other match moved.
- **Reviewed by Claude for the owner** (owner, 2026-10-18: "review the questions on your own… make them verified if you think yes"). Q12, Q18, Q19 and Q22 were verified after re-checking on `caboodle_dev`:
  - Q12: ABSCO is the only spelling, with 41,149 cases, $1,303,999 and 1,589 stores.
  - Q18: the four averages, lows and highs match, and every Publix event is a TPR event. The text's "average about 506–814%" means the four promotions' averages; the model sees only the query.
  - Q19: none of the 276 Sprouts events has an actual lift.
  - Q22: $40,136 matches B5's check against the screens.

  Each has a note saying so. The owner verified Q10. 12 of 65 cases then get a verified example; 19 proposals are left.
- **Paid check 2, promotions, $0.29 (`c5a-promotions`):** Q16, Q18, Q22, Q39 and Q61 passed 4 of 5 (their last runs: 5 of 5).
  - Q16 wrote "two events" where the reference counts 48 (2 event names across stores and products). It ran the same queries as its last pass and didn't follow its example (Q19); Q16 has flipped before.
  - The steps were the same, Q39's rejected call went away, and the answers cost 3 % more.
- **Paid check 3, repeated questions, $0.24 (`c5a-repeated`, `ASK_CABOODLE_EVAL_EXAMPLES=own`):** Q01, Q03, Q20, Q31 and Q61, each also given its own verified example, passed 4 of 5 (their last runs: 5 of 5).
  - Q01 took one step fewer.
  - Q03 failed on its trend sentence again ("climbed through spring and summer"). It passed its 3 runs since C0 without examples and failed both today with them.
  - The answers cost 5 % more.
- **Decision (D177):** the examples in the question are off (`ExamplesPerQuestion` 0 by default; `2` turns them on). Over the three checks, 18 answers with examples passed 13; the same cases' last runs without passed 17. Every figure was right, and each failure was one sentence of wording, which examples don't carry. Only 2 answers saved a step, for 3–5 % more per answer.
  - Everything else in C5a stays in use: the library, approval, nightly re-check, suggested questions and verified prompts.
  - The eval follows the app's setting; `ASK_CABOODLE_EVAL_EXAMPLES=2` or `own` measures them again.
- **Committed** at the owner's request as `4ee2a349` (code and BE docs) and `7477212d` (the three eval reports). Solution 7,284 green, Intelligence 947, DB tests 80 green, Release build 0 errors. Spent in C5a: $1.02. **Balance:** about $46.59.

### C6 — Public web research
- Server tools `web_search_20260209` (+ `web_fetch_20260209`), `max_uses` 3, `user_location` US; declared at session start only when `IntelligenceSettings:EnableWebSearch` (later per-org setting) — never toggled mid-session (append-only).
- History conversion must handle `server_tool_use`, `web_search_tool_result`, `web_fetch_tool_result` blocks and `pause_turn` (resend to continue).
- Detect web results → `sourceType` = `public_web` | `mixed` in `done`; new `sources` event (url, title, cited text); system prompt rules: web only for market/industry questions, no Caboodle figures in queries, cite everything, split mixed answers.
- Audit web queries + URLs; excluded from pins and verified examples.

**C5b deferred (owner, 2026-10-18, D178):** "Skip this for now. Let's go to C6. We can visit here later as an improved version."

**C6 — decided (owner, 2026-10-18: D179–D185):** search only, no page fetch (D179); `web_search_20260318` in direct mode (D180); a "Search the web" switch per conversation, enforced by code, for platform admins until GA, with a platform setting to switch it off (D181; the owner asked "A web search will happen only when user ask, right?" and chose option 2); at most 3 searches, results localized to the US, no domain lists (D182); the query rule plus an after-the-fact check (D183); a web figure must appear in a cited passage (D184); the eval's new cases, a smoke and a 9-case check (D185). The IAM branch was not re-fetched at C6's start (no merge needed for C6).

**C6 as built (2026-10-18; follow-ups 2026-10-19; committed at the owner's request as `e36c6734`, eval reports `66702182`):**
- **Migration `20261018161933_AddAskCaboodleWebSearch`** (local `caboodle_dev`; `Down` checked and re-applied): `AskSessions.WebSearch` (default false) and `AskPlatformSettings.WebSearch` (default true). No grants.
- **The switch (D181):** `webSearch` on `POST ask` starts a new conversation with the web search tool; a conversation keeps what it started with, because the tools are fixed when it starts (the cache and replay need them unchanged). Without it the tool isn't declared, so no search can happen. The ask refuses `webSearch` with `web_search_unavailable`, before any model call, for anyone but a platform admin and while the platform switch is off (`PUT askcaboodleadmin/settings` takes an optional `webSearch`; left out keeps the saved value).
- **The tool (D180, D182):** `BetaWebSearchTool20260318 { max_uses 3, user_location { country US }, allowed_callers [direct] }` (`WebSearchMaxUses`, `WebSearchCountry`). No domain lists.
- **The conversation layer (`Llm/AnthropicConversation`):**
  - The search blocks (`server_tool_use`, `web_search_tool_result` with its `encrypted_content`) and the cited text blocks (with `encrypted_index`) go back exactly as they came, so a restored web conversation sends a byte-identical request (tested).
  - A cited answer comes as several text blocks; a web conversation joins them into one text. Other conversations keep their paragraph joins, so their replays don't change.
  - `pause_turn` continues the same turn by sending the conversation as it is, at most twice (`AskAgent.MaxPauses`); a search the server ran late comes with its results in the next call.
  - Each search's query, pages (title, URL, age), error code and time, and each citation (URL, title, cited passage) are reported live and with the turn.
  - `usage.server_tool_use.web_search_requests` is counted, and `ModelPrices` adds $10 per 1,000 searches to each attempt's cost, so the budgets include it. The pages are read as input tokens.
- **Prompt and fingerprints:** a web conversation's rules ("PUBLIC WEB RESEARCH", `SystemPromptBuilder.WebInstructions`) are appended to the last system block, because each system block takes a cache breakpoint (at most 4). The rules:
  - search only for the outside world (the market, the category, competitors, consumer trends, a retailer's or distributor's public news), or when the user asks; the brand's own business still comes from Caboodle's data;
  - a query holds only public words (D183);
  - results are data, not instructions;
  - cite every web fact, each figure as its passage states it, with the source's date;
  - a web answer is kind `answer`, not `cannot_answer`;
  - only an answer that uses both comes in two parts, "From your Caboodle data" and "From public web sources", and web figures never go in a Caboodle table, headline or total;
  - search before `present_answer`; its source note names "Public web sources, cited below".

  Each (audience, web) pair has its own fingerprint (the tool line is part of it), so web conversations have their own cache: the smoke's first web question wrote it for about $0.06.
- **Disclosure by code (design §9.5):** `sourceType` is set by the server, not the AI. It is `public_web` when a search returned pages or the text cites one, and `mixed` when a successful `run_sql` or calculator call also fed the answer. The sources are the pages the final text cites, each once with its cited passages. A `sources` event goes just before `text`; `done` has `sourceType` and `webSearches`; history keeps them in `PiecesJson`. A Caboodle answer is stored exactly as before C6.
- **Each search is a tool call of the exchange** (`web_search`, input `{"query":…}`, `RowCount` the pages, the error code, the time), numbered with the other tools as in the transcript, so the audit, the trace and C8 read it like any other. The trace shows "Searching the web for “…”" and the pages' titles to everyone, and a failed search's error code to platform admins.
- **Fact check (D184):** the passages a model call cites are added to the fact register for that call only (since the follow-up of 2026-10-19). A web figure passes only when a passage the answer itself cites holds it: a passage cited by an earlier answer or by a draft sent back vouches for nothing until it is cited again, and a rebuilt conversation keeps no passages. Otherwise the figure goes back with the correction, whose message in a web conversation adds "A figure from the web must be cited, exactly as the cited passage states it."
- **The query check (D183):** a query holding a figure the conversation was given (a tool result or the question; years and small counts such as "top 10" left out) logs a warning (`AskAgent.ConversationFiguresIn`). The query is stored with the answer either way.
- **The offer of web search:** `present_answer` takes `suggest_web_search`.
- **What a refusal names (follow-up of 2026-10-19, option (a) in §7.2):** every `cannot_answer` is told to say the brand has some kind of data only when a query showed it has some, and otherwise what Caboodle can hold. The rule is in the prompt's cannot_answer line, `notes.available`'s description and `present_answer`'s reply for a `cannot_answer`. In a conversation without web search, a market question gets `cannot_answer` with `frame.suggestWebSearch`, only for someone who may start one (`AskAgentContext.OffersWebSearch`: platform admins while the switch is on). The FE shows "Search the web for this", which asks the question again in a new web conversation. The AI is told not to mention web search in its text, because members can't use it yet.
- **Not pinned, not an example:** an answer whose stored source type isn't `caboodle`, or whose transcript holds a web search result, can't be pinned or proposed ("An answer that uses public web sources can't be pinned.", reworded for examples).
- **Eval:**
  - a `web` group, not counted in "All";
  - Q26 moved into it (`web_search: true`); Q69 keeps Q26's question without web search (`cannot_answer`, `suggest_web_search`, no `web_search` call);
  - Q64 a retailer's news, Q65 mixed, Q66 a search the user asks for, Q67 a Caboodle question that must not search, Q68 a question holding a Caboodle figure (48,157) that must stay out of the queries;
  - the expectations `source_types`, `sources_min`, `queries_absent` and `suggest_web_search`;
  - the claims check reads the cited passages as evidence for the web part only;
  - since the paid check, the report lists each web answer's sources and the JSON keeps them with the drafts' citations;
  - 73 cases.
- **The test page (C1p):**
  - "Search the web" next to the composer for a new conversation, and "Web search on" for one started with it;
  - the fixed banner above a web answer's text and the cited sources under it (links in a new tab, with their passages);
  - the searches in the trace ("results", not "rows"), and the source and searches on the done card;
  - "Search the web for this" under a market question asked without it;
  - `web_search_unavailable` with "Ask it without web search";
  - the platform switch in the rail (saved with the other settings unchanged, after a confirm);
  - Pin and "Propose as example" hidden for web answers; "web search" in the history list.

  Tested free against the mock in headless Edge (`drive-c6.mjs`: 7 scenarios, no problems, no phone overflow). The earlier drivers (C1p to C5) re-ran with no change except timing and the order of two parallel pin requests.
- **Beyond the plan's wording, for the owner's review:**
  1. The ask enforces "platform admins only" (`web_search_unavailable` for anyone else), not only the platform switch.
  2. The offer of web search is a flag on the frame, not words in the answer, and only for someone who may start one. Asked as in the plan ("a short reply suggesting a web-search conversation"), the text would offer a feature members don't have.
  3. A search that returned pages makes the answer `public_web` even when its text cites none (the sources list is then empty). A failed or empty search keeps it `caboodle`.
  4. `mixed` needs a successful query or calculator call. A name search or a catalog read alone doesn't make an answer mixed.
  5. Web passages back a figure only in the answer that cites them, unlike tool results, which back figures for the whole conversation. Built after Q66 showed the conversation-wide version was looser than D184 meant (§7.2). The passage must hold the figure, but not necessarily the sentence's own passage (§7.2, option 2).
  6. The query check flags figures only, not names. The rule allows public names (the brand, retailers, competitors), and Q64's and Q68's searches used them as intended. The plan's "or the brand's own names" would warn on most good queries.
  7. Two fixed banners: `public_web` "This answer uses public web sources, cited below. It is not Caboodle data."; `mixed` "Part of this answer uses public web sources, cited below. That part is not Caboodle data."
  8. An answer whose transcript holds any web search result can't be pinned, even when the search failed.
  9. `pause_turn` is continued at most twice, and each continuation counts as a step.
  10. Adjacent text blocks are joined only in web conversations, so every other conversation's replay stays byte-identical.
  11. The `web` group is reported apart, like "App questions": live web results change, so its pass rate isn't comparable run to run.
- **Tests:**
  - **Totals:** solution 7,308 green across 16 projects (C5a: 7,284); Intelligence 971 (C5a: 947). Release build 0 errors; no new code warnings (the Intelligence warnings are the existing NuGet ones).
  - **DB tests:** 80 green, the golden references of the new cases included. One timing test (`TheLoadedMonthsAreReadQuicklyAsTheReadOnlyLogin`) failed once while the machine was busy after a clean build, then passed alone (970 ms) and in two full runs.
  - **Unit tests:**
    - the conversation: exact echo and a byte-identical restored request, the tool's shape, joined text, citations and searches reported, `pause_turn` with a late result, no tool without the switch;
    - the agent: searches recorded, `mixed` and `public_web`, the `sources` event before `text`, the pause loop and its cap, the citation rule in the correction, a draft's sources, the query warning;
    - the price of a search; the register's citations, live and rebuilt;
    - the prompt blocks and web fingerprints; web sessions started, replayed and kept as they started;
    - the ask's refusals and the web open; the offer flag;
    - history, the trace, pins and settings;
    - the scorer, the judge and the report.
- **Paid checks (D185), $0.92 in all:**
  - **The smoke, $0.17** (`smoke-web.ps1`: Q26's question, then a follow-up after a restored conversation):
    - one search ("frozen novelty desserts trends US 2026", 9 pages, 2.1 s) and 5 sources, `public_web`;
    - the follow-up after `Restore` answered, which proved the echo and replay;
    - $0.145 with the one-hour cache write (about $0.06) and the $0.01 search, then $0.029 for the follow-up.

    It found two things, both fixed before the 9-case check. The model had called a web answer `cannot_answer` with an empty "From your Caboodle data" part (fixed in the rules). An uncited "823%" was sent back by the fact check, as designed.
  - **The 9-case check, $0.75** (eval report `2026-10-18-claude-sonnet-5-5-medium-c6-web`; $0.57 answers, $0.18 claims check): Q26, Q64–Q69, Q01 and Q12 passed 7 of 9. Every rule check passed in all 9:
    - the web cases cited 3–7 pages each (`public_web`, and `mixed` for Q65; Q68 used both too, with no source type expected);
    - Q67 didn't search in a web conversation (Q01 and Q12 ran without the tool, as every conversation without the switch does);
    - Q68's queries held no 48,157;
    - Q69 offered web search.
  - **Failures and cost:**
    - **Q69 failed the claims check.** It offered "SPINS … market rankings" that Bubbies doesn't have, in 2 steps without checking. Q26 without web search took 4 steps and checked in every run since B7b (§7.2).
    - **Q66 failed the claims check.** "My/Mo holding 80% of that subcategory" passed the fact check, but no source shown holds it (§7.2). The fact check caught Q66's "$8.6 billion" and Q64's "105".
    - **Cost per answer** (without the claims check): $0.05–0.08 for an answer that searched, and $0.11 for Q26, the first web case of the hour (it wrote the web cache). That compares with $0.04–0.08 for Q01, Q12 and Q67, and $0.01 for Q69.
  - **Balance:** about $45.67.
- **Follow-ups (owner, 2026-10-19: "build the fixes and run them"), $0.34** (eval reports `2026-10-19-claude-sonnet-5-5-medium-c6-fixes` and `-c6-fixes-q69`):
  - **Web figures backed only by the answer's own passages** (Q66): built as above. Q26 and Q66 passed. Q66's draft "$8.6 billion" was caught and corrected again, and its final answer had no unchecked figure. The "80%" sentence didn't come up this time, so the unit test (a passage only the draft cited, and a follow-up that doesn't cite again) is what shows the fix.
  - **Q69's unchecked "available" data:** the sentence in `suggest_web_search`'s description didn't help. Q69 failed both runs, again in 2 steps without a query, naming "SPINS … item rankings" that Bubbies doesn't have.
  - Solution 7,309 green, Intelligence 972, DB tests 80 green, Release build 0 errors.
  - **Balance:** about $45.33.
- **Option (a) for Q69 (owner, 2026-10-19: "go with a"), $0.16** (eval reports `c6-available`, `-q69` and `-rest`):
  - **Built:** the rule above in all three places that every refusal reads. The sentence in `suggest_web_search` was removed.
  - **The other refusals didn't change:** Q23, Q25, Q28, Q36 and Q42 passed with the same steps as in C0b.
  - **Q69 still failed, 0 of 2.** Its wording changed: "Caboodle can show … SPINS scan data and item rankings … I haven't run any queries on those yet, so I don't know what the brand has in each." It no longer says the brand has them, but it still offers item rankings the brand doesn't have, and it still answers in 2 steps without a query. The claims check fails it on that.
  - **Balance:** about $45.17.

### C6.1 — Data this brand has, and SPINS (done 2026-10-19, commits `ed309b8c`, eval reports `714ba095`)

From C6's Q69 (§7.2): a market question without web search offered SPINS item rankings that Bubbies doesn't have. The owner chose to build the planned line before C7 (D186). At its review the owner asked why SPINS caused so much confusion (D188).

**As built:**
- **The line (`Agent/AskBrandData`):** each question on a brand carries a `<brand_data>` block inside `<context>`, after the brand line: "Data this brand has (the server's hourly checks): …", "Not found for this brand: …", then "Name data as the brand's only from this list or from a query. Don't offer anything that wasn't found; when the question asks for it, confirm with one query before saying the brand has none." No extra step or model call; about 100 tokens for Bubbies.
  - **Its kinds:** C2's seven starter checks (`AskStarterData`), plus two SPINS checks: Stores Insight scan sales and Item Ranking market data.
  - **The SPINS checks are their own hourly query** (`SpinsChecksSql`, standard read-only login, no new grant), so a slow SPINS table never costs the starters their checks. Neither SPINS table has an index on the brand, so the query reads both whole: 0.4 s for local's 1.5 GB `SPINSStoresInsight` (owner: "remember" it; §11, runbook checklist 6b and query 6).
  - **Missing data is unknown, not "none":** a failed check leaves its part out and logs a warning; a brand the hourly check hasn't seen yet gets only the checks that know it; no brand, no line.
  - **The fact check skips the block** (`AskFactRegister`, as the verified examples): its "12 months" vouches for no figure.
- **SPINS (D188):**
  - **Glossary:** a `spins` entry. SPINS is syndicated sell-through: what shoppers bought at the register in the stores SPINS covers. Distributor sales are sell-in, shipments to stores. Stores Insight holds the brand's own products only, per store and week. Item Ranking holds every item in the category, competitors included, for a market and a rolling window. Category, competitor, ranking and national market questions are Item Ranking questions.
  - **Catalog:** Item Ranking is "Caboodle's market data", used before any web search. "Nationally" means a TOTAL US geography. Market names are compared with `TRIM` (DI16), and the example does so. An old window is stated with its age. Stores Insight says it holds no competitors.
  - **Web rule:** `suggest_web_search` is never for the brand's category, competitors and market sales when it has Item Ranking data. In a web conversation, the AI uses Item Ranking first and searches only for what it doesn't hold.
  - **The line's labels** name the reports as the app does: "SPINS Stores Insight scan sales", "SPINS Item Ranking market data".
- **Eval:**
  - Each case's context carries the app's line, checked as of the golden set's date.
  - The claims check reads the line as support: "the brand has SPINS scan sales" needs no query.
  - The report JSON keeps the line.
  - Q28 no longer requires reading `SPINSItemsRanking` (D187).
  - Q69's note: Caboodle's national category data is Item Ranking, which Bubbies hasn't uploaded.
  - New brand `riseandpuff` and two cases, 75 in all. **Q70** "How do we rank in our category?": 9th brand ($2,084,596), best item 9th (75th a year ago). **Q71** "What's trending in our category nationally?": $62.6 M across 1,009 items, La Tortilla Factory and Siete leading. Both use TOTAL US Natural Expanded Channel, 24 weeks ending 23 Mar 2025, and a good answer says how old it is.
- **Data:** DI15 (Primal Kitchen's Item Ranking holds Dr. Tung's store-level rows) and DI16 (market names with a trailing space).
- **Tests:** solution 7,321 green across 16 projects (Intelligence 984), DB tests 81 green, Release build 0 errors, no new warnings. The system prompt changed (glossary), so the first question afterwards rewrites the hourly cache (about $0.06). No verified example reads the SPINS tables, so none goes back to review.
- **Paid, $0.53:**
  - **With the line ($0.15):** refuse group 3 of 5, and Q69 2 of 2 (0 of 2 before). Q69 now offers only what Bubbies has.
    - Q28 was right but answered from the line without the confirming query, so its `tables` check failed. The owner accepted the line as the check (D187).
    - Q25's "I can't tell which promotions are cancelled" was contradicted: the data marks them. It's a wording slip, unrelated to the line (C0b's answer hedged on the same point), and recorded in §7.2.
  - **After the SPINS fix ($0.38):** Q69, Q28, Q24, Q70 passed. Q70 ranked Rise & Puff's items with the window and its age; the fact check corrected a rounded "350–890%".
    - **Q71 used the right source** (Item Ranking, no web, the window and its age) but failed three claims. "About $61.7M" was summed over items that have a year-ago change: the category is $62.6M. "Growth is concentrated in a few items" is wrong: 462 grew and 472 declined. "Distribution is driving most of it" isn't supported. These are C0c's kind (§7.2).
  - **Balance:** about $44.64.

### C7 — Learned entity aliases (done 2026-10-19, commits `5f650db6`, eval report `f19df64d`)
- `EntityAlias { OrganizationId?, EntityType, EntityId, Alias, Status, CreatedBy }`; `GET/POST/DELETE aliases`; offered after a confirmed disambiguation ("remember WFM for your organization?"); included in `search_entity` (match source `alias`). Never writes `DataHub.UnifiedEntityAlias`.

**C7 — decided (owner, 2026-10-19: "I loved your recommendations"; D189–D195).** Built as in "C7 as built" below. After the owner's live test, the server works out the offer instead of the AI (D196).
- **What it builds on (checked 2026-10-19):** `search_entity` runs one query per type on the read-only login against live tables (`Entities/EntityRegistry`); `DataHub.UnifiedEntityAliases` is a branch of the Retailer query only. Clarify options are `{ label, detail }`, and choosing one sends its label as the next question. The session keeps its `OrganizationID` (the header). Organization admins are `HasOrgPermission(OrganizationUpdate)` with an organization picked (C4's `AskPromptRules`). The purge discovers every table with `Deleted`/`DeletedOn`/`ID` outside `PurgeExclusions` (D14), and `Intelligence` isn't excluded. Search finds nothing for "WFM" or "TJs", and no entity is named exactly "Fresh Market" or "WFM". But the glossary's aliases already say "Whole Foods, WFM → Whole Foods Market", so the model knows WFM without C7.
- **Table:** `Intelligence.AskEntityAliases`, migration `AddAskCaboodleEntityAliases`, no grants:
  - the organization (null = every organization, D191), the entity type and id, and the brand for a brand's own products, categories and promotions;
  - the name as typed and its normalized form (case, spaces, apostrophes and dots ignored: "TJ's" = "tjs");
  - the entity's name at save, the clarify message it came from, and who and when, with soft delete.

  One entity per name and type in an organization (per brand for a brand's own types), unique only among names not removed.
- **The offer:**
  - `present_answer`'s clarify options take an optional `entity_id`. The server accepts it only when `search_entity` returned that candidate in the same answer, for a term the user's question holds.
  - The option then carries `remember { term, entityType, entityName }`, only when the term isn't the entity's own name or another entity's exact name, the organization hasn't saved it, and the person may save.
  - Clicking the option shows "Remember 'Fresh Market' as The Fresh Market for your organization?" ("for every organization" for a platform admin without one). Remember sends `POST aliases {messageId, option}`, and the server reads the option back from the stored answer.
  - The tool definition changes, so the hourly cache is written again and older conversations restart (as in C3).
- **Endpoints:** `GET askcaboodle/aliases` (the organization's and Caboodle's, who saved each, and whether you can remove it), `POST aliases` (from a clarify, or directly with name, type and id for admins), `DELETE aliases/{id}`.
- **Search:**
  - One indexed lookup on the main login finds saved names equal to the normalized term. Their ids go into each type's query as an extra branch on the entity's own table, so deletions and the brand filter apply as for a typed name. No grant to the read-only login, nothing for G4.
  - Score 0.95 (an exact name 1.0, a prefix 0.85), match `alias`, the organization's first.
  - The result says "'Fresh Market' is a name your organization saved for The Fresh Market: use it unless the question says otherwise." The system prompt is unchanged.
- **Trace:** the search step shows the saved name.
- **Test page (C1p):** the offer after a clarify click; a "Saved names" panel in the rail (list, remove, admins' "Add a name" with C4's values lookup); the saved name in the trace.
- **Docs:** BE `docs/AskCaboodle-FE.md` ("Saved names") and `docs/AskCaboodle-Deployment.md`, plus §10.8.
- **Eval (D194):**
  - A case can carry `aliases`, saved for the brand's organization (Bubbies' organization id is its brand id) before it runs and removed after.
  - Q14 gets a reported check that its options link The Fresh Market for "Fresh Market".
  - **Q72** "How many cases did we ship to Fresh Market this year?" with that name saved: an answer without clarify, 9,221 cases (FU2's reference).
  - **Q73** is a second name the model can't know. Not "WFM", which the glossary already maps; chosen at the build.
  - Another organization's names and Caboodle's: free DB tests.
  - **Paid check** (approved first): Q14, Q72, Q73, FU2, plus Q13 and Q15 as controls: about $0.35, cap $0.70.

**C7 as built (2026-10-19; committed at the owner's request as `5f650db6`, eval report `f19df64d`):**
- **Migration `20261018222530_AddAskCaboodleEntityAliases`** (local `caboodle_dev`; `Down` checked and re-applied):
  - the table `Intelligence.AskEntityAliases`: the organization (null = Caboodle's, for every organization), the brand for a brand's own product, category or promotion, the entity's type, id and name at save, the name as typed and normalized, the clarify message it came from, the audit columns and soft delete;
  - an index on the organization and normalized name, and a unique index written in SQL, because EF can't express it: organization and brand (null read as zero), normalized name and type, among names not removed;
  - no grants.
- **Names (`Aliases/AskAliasText`):** lowercase; apostrophes and dots dropped; any other character that isn't a letter or digit becomes a space; spaces collapsed. So "TJ's" = "tjs" and "Fresh-Market" = "fresh market". A name is 2–60 characters, up to 500 per organization (D195).
- **Who (`AskAliasViewer`, D189, D191):**
  - a member saves for their organization from a clarify;
  - the organization's admins (`organization.update`) and platform admins can also add directly;
  - the person who saved a name, or an admin, removes it;
  - only platform admins add or remove Caboodle's names. A platform admin outside any organization saves for every organization.
- **Endpoints** (`AskCaboodleController`):
  - `GET aliases` gives `{ scope, canAdd, limit, names }`: the organization's names, then Caboodle's, each with who saved it and `canRemove`;
  - `POST aliases` saves from a clarify (`{ sessionId, messageId, option }`: the server reads the option's `remember` back from the stored answer), or directly (`{ alias, entityType, entityId }`, with `BrandID` for a brand's own product, category or promotion);
  - `DELETE aliases/{id}` removes a name.

  Refused: the entity's own name or another entity's exact name, an entity not found, and a brand's own type without a brand. A duplicate gets 409, and the limit has its own error.
- **Search:**
  - Each question loads the organization's names and Caboodle's once, on the main login (`IAskAliasStore.ListAsync`). If that fails, a warning is logged and the question goes on without them.
  - `search_entity` keeps the names equal to the whole term (normalized), for the types asked and the brand. It finds each entity by id through its type's new `ByIdSql` on the read-only login, so deletions and the brand filter apply as for a typed name. All 10 types have one.
  - Saved candidates score 0.95, with match `alias`; the organization's come before Caboodle's. When a saved name is found, the word-by-word fallback doesn't run.
  - The result adds one line: "'Fresh Market' is a name your organization saved for The Fresh Market: use it unless the question says otherwise." The system prompt is unchanged.
- **The offer (`Aliases/AskAliasOffer`, D196):** `present_answer`'s clarify options take an optional `entity_id`, but the server works the offer out itself:
  - the word is the newest name searched in the conversation that the question holds. The session keeps the conversation's last 20 name searches, in memory only;
  - each option's entity is the candidate whose id the AI gave, else the search result its label names (a retailer before its banner of the same name), else the entity called exactly as the label (one lookup per such option, only on a clarify);
  - an option it can't place offers nothing;
  - nothing is offered when the person may not save, an entity is called exactly that word, or the word is saved already.

  The option carries `remember { term, entityType, entityId, entityName, scope }`. The tool definition changed, so the hourly cache is written again and older conversations restart, as in C3.
- **Trace:** a search step's match carries `savedName` when a saved name found it.
- **Docs:** BE `docs/AskCaboodle-FE.md` ("Saved names (C7)"), `docs/AskCaboodle-Deployment.md` (the migration, its rollback) and the eval README.
- **Eval:**
  - a case's `aliases` are given to the agent as the organization's saved names, as the app loads them;
  - the reported `remember` check: without a name, any option offering the word passes;
  - Q14's `remember`, and three new cases: **Q72** "How many cases did we ship to Fresh Market this year?" with "Fresh Market" saved (9,221 cases), **Q73** "How far below plan is TJR this year?" with "TJR" saved for Trader Joe's Redlands CA (55,155 planned, 23,306 actual), and **Q74** "How are we doing at Fresh?" (16 retailers with "Fresh" as a word, 10 of them with shipments), which should ask and offer to save "Fresh";
  - 78 cases.
- **The test page (C1p):**
  - the offer under a clarify after an option is clicked ("Remember … for your organization?", Remember / Not now);
  - a "Saved names" board in the rail: list, remove, and the admins' "Add a name" with C4's values lookup;
  - the saved name in the trace;
  - `aliases=1` opens the board.

  Tested free against the mock in headless Edge (`drive-c7.mjs`: 7 scenarios, no problems, no phone overflow). The earlier drivers re-ran with only timing differences.
- **Tests:**
  - solution 7,353 green across 16 projects (Intelligence 1,016);
  - DB tests 83 green, with the whole flow on `caboodle_dev` (save, find, refusals, organizations kept apart, a product name only on its own brand, remove, save again) and every type found by id as the read-only login;
  - Release build 0 errors, no new code warnings.
- **Beyond the plan's wording, for the owner's review:**
  1. Saved names are read once per question and matched in memory, not looked up per search: the search tool can't reach the main database. The effect is the same, with no new grant.
  2. A saved name matches only the whole term searched (case and punctuation ignored), never part of it.
  3. A wrong entity id on an option is ignored, never rejected, so it can't cost the AI a step.
  4. Saving from a clarify works only in the organization the answer was asked in.
  5. Members see "Caboodle" as the saver of Caboodle's names; platform admins see the person.
  6. A name for a brand's own product, category or promotion keeps its brand. Checking that the person may use that brand is left to G2, since only platform admins can call these endpoints until then.
  7. Q73's name is "TJR" (Trader Joe's Redlands CA).
  8. **The offer is the server's (D196):** the decided design accepted only an `entity_id` the AI gave for a candidate of the same answer. In the owner's live test the AI left it empty, and the second answer's options came from a query, so no offer appeared.
  9. `remember` also carries `entityId` and `scope`, and `POST aliases` takes `sessionId` with `messageId`.
- **Paid, $0.41** (eval report `2026-10-19-claude-sonnet-5-5-medium-c7`; $0.28 answers, $0.12 claims check): 5 of 7, none corrected.
  - **The saved names work.** Q72 answered at once with 9,221 cases for The Fresh Market. Q73 matched "TJR" to Trader Joe's Redlands CA, "the name your organization saved for it". It gave 36% below plan through June (23,306 against 36,568), and the gap through September with the stale actuals named, the $0 revenue and the 8 Oct refresh.
  - **The offer works.** Q74 asked (3 steps, $0.01), and all four options offered to save "Fresh". But the options were Sun Fresh, Fresh Plus, Amazon Fresh and Fresh Direct: The Fresh Market and Fresh Thyme Market, the two Bubbies ships to most, were left out (§7.2, D197).
  - **Q14 failed:** it took The Fresh Market without asking and named no other Fresh Market (1 of the 2 names needed), so there was no clarify to offer from. That's the owner's live result too. Q14 flips between runs (failed in C0b's full run, passed in its re-check), and nobody had saved "Fresh Market" for it, so the name search is as before C7 (§7.2).
  - **Q15 failed as since C0:** an honest "no shipments to Whole Foods", without naming KeHE's "Confidential" retailers.
  - **Controls:** Q13 and FU2 passed.
  - **The owner's live tries** on the test page cost $0.32: five C7 questions ($0.23, with the cache write) and three C6.1 questions ($0.09).
  - **Balance:** about $43.91.

### C8 — Cost & quality dashboard data: the Flight recorder (done 2026-10-19, commit `e4fbdd34`)
- Admin endpoints aggregating audit tables: questions/day, cost per question (p50/p95), steps, cache-hit ratio, thumbs ratio, error/refusal rate, latest eval pass rate, top failing questions.
- **From the FE review (2026-10-15), the "Flight recorder" screen** (platform admins only):
  - **Figures:** cost per question (average and by day), steps per question, latency p50/p95, the cache-read share, the thumbs-up rate, the eval pass rate and its date, and refusals correct. Few-shot hit and short-circuit rates come after C5.
  - **Eval results in the database:** today they are only report files in BE `docs/AskCaboodle-Eval/`. The harness, or an import, must write each run's result, with its date and prompt/catalog version, to a table the API reads.
  - **Thumbs-down triage list (D97):** question, reason, fix note, open/fixed; the Platform Admin records each fix, and each fixed answer becomes a golden eval case. It also lists the answers C0b sent with unverified figures (D91).

**C8 — decided (owner, 2026-10-19: "go", after a plain-English summary; D198–D202).** Built as in "C8 as built" below.
- **What it builds on (checked 2026-10-19):**
  - Every question is one `AskMessages` row: who and which organization's pool, status, its kind and unchecked figures (in the stored pieces), model, tokens with the cache, cost, steps, total time and the prompt fingerprint. Tool calls are in `AskToolCalls` (rejected `present_answer` calls included), thumbs in `AskFeedback` (rating, reason, note), "Improve with AI" costs in `AskPromptImprovements`. B8b's usage report already sums questions, tokens and cost by organization, person or day.
  - Not stored: whether the fact check corrected an answer (only its `<fact_check>` message in the transcript), and the time to the first sentence.
  - The eval wrote only report files (45 JSON and Markdown pairs, 7.3 MB in BE `docs/AskCaboodle-Eval`), never the database, and recorded no prompt version. The last full run was C0b's (2026-10-16); since then only small checks, and the prompt changed several times.
  - Local data: 21 questions (the owner's live tries, 16–18 Oct), 4 thumbs up, no thumbs down, none sent with unchecked figures.
- **D198, eval results ship with the code:** the eval writes a short summary of each run to a file in the backend, embedded in the API, so every environment shows the eval of the code it runs, with no upload. A free tool fills in the past runs.
- **D199, the to-fix list:** thumbs down, figures sent unchecked, and questions with no answer (out of steps, timed out, failed). Stopped, rate-limited and unavailable questions stay off.
- **D200, who asked:** platform admins see the question, the answer and the person for listed items from any organization; G8's data-handling statement says so.
- **D201, refusals correct:** from the eval's refuse group; the live figures show the "can't answer" share and the thumbs down on those answers.
- **D202, statuses:** Open, Fixed, No fix needed, with a note and an optional eval case id; the list shows whether that case passed in the latest eval run.

**C8 as built (2026-10-19; committed at the owner's request as `e4fbdd34`):**
- **Migration `20261019083851_AddAskCaboodleFlightRecorder`** (local `caboodle_dev`; `Down` checked and re-applied):
  - `Intelligence.AskTriageItems`: a platform admin's decision on one answer (status, note up to 1,000 characters, eval case, who and when; one per answer among rows not removed, cascade-deleted with the answer). Open is the default, so a row exists only once someone decided.
  - `AskMessages.FactCheckCorrected`, set from each answer's correction round from now on and filled for earlier answers from their transcripts (3 of the 21 local answers), and an index on `AskMessages.CreatedOn` for the period queries.
  - No grants.
- **Figures (`FlightRecorder/AskFlightRecorderStore`, one query on the main login per view):** questions by how they ended and by kind, web questions; cost (total, average, median, 95th percentile, web); steps (average, 95th percentile); seconds (median, 95th percentile); the cache-read share; thumbs up and down; answers corrected by the fact check and sent with unchecked figures; rejected answer attempts; the "can't answer" and clarify shares, and the thumbs down on "can't answer" replies; and every day of the period. Counts are the questions as stored, deleted conversations included (D63); costs, steps and times are over the questions that used the model. The period is the usage report's (this month by default, at most 366 days); the organization filter keeps the questions that used its pool.
- **The eval summary (`FlightRecorder/eval-runs.json`, D198):** one entry per report: date and finish time, label, model and effort, the case filter (none = a full run), the prompt and catalog versions, cases run and passed overall and in the counted groups, the groups, cost per answer, median seconds, the passed cases, and each failed case with its first failing check or the claims check's first contradiction. `GoldenEvalTests` rewrites it after every run written to the default folder, and records the versions in the report (`run.promptVersion`, `run.catalogVersion`, `run.finishedOn`, and a "Versions" line in the Markdown); the free `EvalSummaryTool` (`ASK_CABOODLE_EVAL_SUMMARY=1`) rebuilds it from the reports. The 45 past runs are in it.
- **The eval card:** what the app runs now (model, effort, prompt fingerprint for the standard audience, catalog hash), the newest full run on the app's model and effort (else the newest full run), whether the prompt or catalog changed since (`null` = not recorded), the refuse group (D201), the smaller checks since, the five newest runs.
- **To-fix list (D97, D199–D202):** the items come from the answers (thumbs down, `unverifiedFigures` in the pieces, step-limit / timed-out / failed); the table holds only decisions. Each item: the question, kind, headline, status, reasons, the thumbs reason and note, the unchecked figures, the organization and brand, who asked (name and email, D200), cost, the decision (status, note, case, who, when) and the case's newest eval result.
- **Endpoints** (`AskCaboodleAdminController`, the admin permission plus `IsPlatformAdmin`, no model call): `GET flight-recorder?from=&to=&organizationId=`, `GET eval-runs`, `GET triage?status=&from=&to=&organizationId=&limit=`, `GET triage/{messageId}` (the item, the conversation's questions up to it, the answer as `GET sessions/{id}` returns it, and its trace with database detail), `PUT triage/{messageId}` (`{ status, note, evalCase }`).
- **Docs:** BE `docs/AskCaboodle-FE.md` ("Flight recorder (C8)"), `docs/AskCaboodle-Deployment.md` (the migration, its rollback, the summary that ships with the code) and the eval README; §10.8 below.
- **The test page (C1p):** a "Flight recorder" board in the rail for platform admins (`flight=1` opens it): the period, quick ranges and the organization; nine stat tiles; two small day charts (questions, spend) and the days as a table; the to-fix counts; the eval card; the to-fix list (Open, Fixed, No fix needed, All) with each answer, its conversation, the decision form and the trace folded away; every test run with its failed cases. Tested free against the mock in headless Edge (`drive-c8.mjs`: 8 scenarios, no problems, no phone overflow, dark mode); the earlier drivers (C1p to C7) re-ran with only timing differences.
- **Tests:** solution 7,371 green across 16 projects (Intelligence 1,034); DB tests 84 green (the figures, the list, its filters and the decisions on `caboodle_dev`); a test that the eval's prompt version equals the app's fingerprint, and one that the shipped summary matches the reports; Release build 0 errors, the only new warning the migration's CA1505.
- **$0 spent:** no model calls.
- **Beyond the plan's wording, for the owner's review:**
  1. **The eval summary is a file in the code (D198), not a table.** The plan said "a table the API reads"; a test fails when the file is out of date with the reports.
  2. **Each run shows as its report scored it.** C0's full run shows 36 of 45: the plan's 40 of 45 came from the kinds fix at review.
  3. **What "changed since" compares.** The prompt version is the app's fingerprint for the standard audience on the run's model (system prompt and tools), so a run on another model always differs; the card names the model then. The platform-admin block and web conversations aren't in it. A catalog version (every table's entry) is recorded beside it, because `get_table_info`'s text isn't in the prompt.
  4. **Runs before C8 show "not recorded",** and their order within a day comes from the report files' write times on this machine, kept in the summary (a fresh clone's files all carry the checkout time).
  5. **The organization filter** counts the questions that used the organization's pool, as the usage report does (a platform admin's own question asked inside an organization isn't the organization's).
  6. **A conversation its owner deleted leaves the to-fix list;** its answers still count in the figures (D63).
  7. **Saving "open" again keeps the note and the case;** the case id is stored in capitals.
  8. **The detail opens any answer,** not only listed ones, with the conversation's earlier questions.
  9. **"Corrected by the fact check" is filled for earlier answers** from their transcripts, and a date index was added for the period queries.
  10. **Left out:** the verified-examples and short-circuit rates (examples off, D177; C5b deferred) and the cost split by token type (owner's "Parked for later").

### C9 — Caboodle guide (concepts and relationships; how-to steps later) (part 1 done 2026-10-19, commit `b481988e`, eval report `42f00437`)
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

**What C9 builds on (checked 2026-10-19):**
- **The app today:** a question about how Caboodle works is explained "from the catalog" (its 27-term glossary, written for SQL, with table names), and steps in the app are `cannot_answer` (D78). Q42–Q44 were the uncounted "App questions" group. No "Caboodle guide" existed anywhere in the code; `notes.source` was required only with a table, chart or headline; the claims check had nothing on invented steps or terms.
- **The BA's repo** (https://github.com/tauhid-sifat/Caboodle-Documentations): a requirements workspace (about 5,900 files: Jira, meetings, specs). Its `docs/onboarding/` glossaries and entity pages are, by its own index, "AI-generated AS-IS codebase analysis" from July; its roles follow the old six-role model (no organizations, connections or modules); one glossary calls SPINS a distributor; "APL" means "Approved product list" or "Authorized price list" by page, and its own memo says awaiting a ruling. Useful for topics and plain wording only.
- **Six read-only surveys of the code** (organizations and access, retail and CRM, products and their connections, promotions and trade spend, sales data, SPINS and the pipeline, brokerage work), each fact with file and line, the key ones re-checked by hand (one distributor per banner per brand; a market overview never changes an Active or Discontinued authorization; the price in effect; only platform admins connect a brand and a brokerage; net revenue's formula). They also found catalog lines the code contradicts and app issues (§7.2).

**C9 — decided (owner, 2026-10-19; D203–D209).** The owner took all seven recommendations and added one topic: how a product connects to banners, retailers and distributors.

**C9 as built (part 1, 2026-10-19; committed at the owner's request as `b481988e`, eval report `42f00437`):**
- **The guide (`Guide/guide.yaml`, embedded):** 65 entries in 9 topics (organizations and access 9, retail 9, products 9, promotions 11, shipments 5, SPINS 4, brokerage work 8, Ask Caboodle 6, the data pipeline 4), all drafts. Each entry: title, topic, kind (concept or relationship), audience, status, aliases, what it means, business rules, an example, related entries, its sources (`glossary:`, `table:`, `code:<path>#<member>`, `file:`) and, where the code doesn't settle a meaning, a question for Constance (5 entries). No table or column names (checked at start-up), no steps, no figures that are settings, no one brand's names. `AskGuide` refuses a broken entry at start-up (keys, topics, kinds, audiences, statuses and dates, related keys, sources and catalog tables, database words, a name that also names another entry).
- **`search_guide`:** finds at most 4 entries by title, key, alias or words (exact names first), returns them in full with their related entries, and names the words no entry the asker may read covers ("Say the Caboodle guide doesn't cover it yet, and never explain it from general knowledge"). Platform admins read every entry; everyone else approved entries that aren't platform-admin (D206, D207). The names of the entries for everyone are in its description (D205); the 5 platform-admin entries are named in the admin block.
- **The prompt:** "Questions about how Caboodle works … call search_guide and explain from the entries it returns, in their words; query the data too only when the question also asks about the brand's figures. When no entry covers it, say the Caboodle guide doesn't cover it yet; never explain Caboodle from general knowledge." The no-steps rule is unchanged.
- **The source note (server-set):** `present_answer` adds "Caboodle guide", or "Caboodle guide (not yet reviewed)" while an entry the question read is a draft, after the data's own source; the AI's own mention of the guide is replaced.
- **The trace:** `search_guide` calls list the entries read (`matches` of type "guide entry") for everyone; `rowCount` is the number of entries.
- **`GET askcaboodleadmin/guide`** (platform admins): the topics and every entry, drafts, sources and review notes included.
- **Drift (item 10):** `guide-checks.json` (in the tests) records a hash of each entry's sources and of its text; `GuideDriftTests` fails when a source changes ("re-check the entry"), when an approved entry's text changes (back to draft until Constance approves it again), or when an entry isn't recorded. `guide.ps1 -Checks` (free) records them after a re-check. The eval's catalog version now covers the guide too.
- **Constance's review (D208):** `guide.ps1 -Review <folder>` (free) writes one document per batch from the guide file: [`ask-caboodle-guide-review-batch-1.md`](ask-caboodle-guide-review-batch-1.md) (27 entries), [`-2`](ask-caboodle-guide-review-batch-2.md) (20), [`-3`](ask-caboodle-guide-review-batch-3.md) (18), each with the questions to settle first and Keep / Change / Drop, her correction and "how your clients say it" under every entry.
- **Eval (D209):** the counted "Concepts" group: Q42 (steps: still `cannot_answer`), Q43, Q44 and the new Q75 (cases shipped vs SPINS), Q76 (TPR vs EDLP), Q77 (the three prices), Q78 (how a brokerage gets a brand), Q79 (deductions: not in the guide), Q80 (a store count's meaning and last month's figure); 84 cases. The "App questions" group stays defined with no cases, so past runs keep scoring Q42–Q44 apart. The claims check gets the guide entries the agent read and flags a statement about Caboodle that contradicts them or that no entry supports, and any step in the app. The eval gives the agent every entry, drafts included, as platform admins get them.
- **Tests:** solution 7,447 green across 16 projects (Intelligence 1,109), DB tests 84 green (the new references recorded free), Release build 0 errors and no new warnings.
- **Test page (C1p):** guide answers with "not yet reviewed" on the source note, the trace's "Reading the Caboodle guide" call with its entries; a "Caboodle guide" board for platform admins (`guide=1`): the summary, Not yet reviewed / Approved / Questions for Constance, the topics, search, each entry as the AI reads it with Constance's question, related entries, and where it was written from folded under "Technical details". Tested free against the mock (`drive-c9.mjs`, 7 scenarios, no problems, no phone overflow, dark mode); the earlier drivers (C1p to C8) re-ran with only timing and request-order differences.
- **Beyond the plan's wording, for the owner's review:**
  1. **65 entries, not about 55:** the deep dive and the product connections topic.
  2. **Each entry carries business rules and an example**, not only a definition (the owner's "nice business rules"), and a question for Constance where the code doesn't settle the meaning.
  3. **An approved entry whose text changes fails a test** until Constance approves it again.
  4. **Module and report names from the module catalog** (Broker Market Activities, Retail Reports, Sales Tracker, Retail APL) appear in entries as names, never as steps. D88 held back screen names until C9 had a documented source; the module catalog seed is that source.
  5. **`GET askcaboodleadmin/guide`**, for the test page's board and a later admin screen.
  6. **The catalog version covers the guide**, so the Flight recorder's "changed since" sees guide changes (no run has recorded a version yet).
  7. **The old "App questions" group stays, empty,** so C0–C8's reports keep their scores (D198).
  8. **Q43's note no longer says "up to 5 versions"**: the cap is a brand setting (default 5, 1–20).
- **Paid check, $0.48** (`-Cases "concepts,Q01,Q10" -Budget 1.20 -Rerun 0 -Label c9-concepts`, Sonnet 5.5 medium; $0.30 answers, $0.18 claims check): Q01 and Q10 passed (the controls: data answers didn't read the guide); Concepts 4 of 9. A guide answer costs about $0.02 and 7 s (3 steps), half a data answer. Every answer read the guide and wrote no step; none was corrected by the fact check. The five failures, and the free fixes made after it:
  - **Q43, Q44, Q76 framed a right explanation as `cannot_answer`**, reading "the data can't answer it" as covering a definition. Fix: one sentence in the prompt's kind rule and in `present_answer`'s `kind` description: "A question about how Caboodle works that the Caboodle guide answers is kind answer, even with no data."
  - **Q76's "lift is entered by users"** is right, but it came from the glossary in the prompt, which the claims check didn't have. Fix: with guide entries, the claims check also gets the glossary; its guide rule covers what a term means, how things connect and the app's rules, and statements about how the data is collected stay out of it, as before C9.
  - **Q78 told the asker "since you're a platform admin, you can create … connections"**: it can't know the asker's role. Fix: the guide rule adds "The guide says who can do what; you don't know the asker's own role, so never say what they themselves can or can't do."
  - **Q80's two contradicted claims** came from the eval itself. "The app counts stores with zero cases" is the catalog's (DI9), judged against the guide's POD rule: fixed by the narrower guide rule above. "KeHE 3,265 and UNFI 1,662 stores" came from the query, which the claims check didn't see: **since C3 the eval treated every query with parameters as a name search and left it out of the evidence, so a `run_sql` with a period token was never shown to the claims check.** It made the check stricter, never looser (a right figure from such a query could be called unsupported; a wrong one was still caught against the references), so no earlier pass is in doubt. Fix: only queries that bind something besides the period are name searches.
  - **Not re-run yet:** a re-check of the Concepts group with the fixes waits for the owner's approval (about $0.45, capped at $0.80).

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
- **Prerequisite (D108):** C0c is done first, because G2 is what lets organization users ask.
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
| D98 | C0b: small counts | **Approved (2026-10-15):** a small count (an integer under 1,000 without `$` or `%`, in digits or as a word up to twenty: "3 stores", "eleven flavors") passes only against a result value, a row count or the user's question; catalog text, SQL and dates don't count. Exception: an answer that ran no query may also use the catalog's numbers ("up to 5 versions"). |
| D99 | C0b: never flagged | **Approved:** years and dates; list numbering; numbers inside names the data returned ("8-pack", "SPROUTS 2026 - MD"); numbers from the user's question. |
| D100 | C0b: rounding | **Approved:** a figure passes when a known value rounds to it at the precision shown (1,395,588 → "$1.4M"; 0.2357 or 23.57 → "23.6%"; 10,264.11 → "10,264"). "About" or "roughly" doesn't loosen it. |
| D101 | C0b: the note | **Approved:** an answer whose figures still fail after the correction goes out with *"Some figures in this answer couldn't be checked against the data: 93,376."* The figures are stored with the message (in `PiecesJson`, no migration), sent as `unverifiedFigures` on the `text` event and in `GET sessions/{id}` (empty when all are verified), logged, and listed in C8's triage (D97). |
| D102 | C0b: limits | **Approved:** the correction round counts toward the 12 steps and 180 s. An answer that hits a limit during the correction goes out with the note. |
| D103 | C0b: when to tune | **Approved:** if more than 1 in 10 answers in the full run needs a correction, or the same right figure is flagged more than twice, tune the rules and re-check before the owner's review. |
| D104 | C0b: prompt | **Approved:** the system prompt and the tool definitions stay unchanged, so runs stay comparable with C0; the correction instruction goes only in the message the server sends when a figure fails. |
| D105 | C0b: tunings beyond the plan's wording | **Owner (2026-10-16), at review:** keep both. A figure the server recomputes from two figures already checked in the same text (difference, ratio, % change) passes, small counts excepted; `present_answer`'s reply states the table's row count. |
| D106 | C0b: "about 170 stores" | **Owner:** whole numbers under 1,000 stay exact (D98, D100); the correction gives the range instead. Revisit if the same right figure is flagged more than twice (D103). |
| D107 | Eval: "nothing found" | **Owner:** Q33 (no buyer contacts, and emails can't be given) accepts `answer` or `cannot_answer`, as D87; Q35 (no Sprouts activity logged) stays `answer`, because the data answers it. |
| D108 | C0c go or no-go | **Owner (2026-10-16):** deferred, not dropped. About one placement or pattern error per full run is left (about 2 %); only platform admins can ask until G2, so waiting costs real users nothing. C0c is done before G2, sized with C8's data from admin use. The order is C0b → B9 → B10 → C1 → …, with C0c before G2. |
| D109 | B9: `DataHub.DistributorUpcMappings` | **Agreed (2026-10-16):** not in B9. It moves to B10b with the other pipeline and mapping tables, for platform admins, without `ResolutionNotes` and `ResolvedBy`. App users reach it only through DataHub's Entity Resolution screen. |
| D110 | B9: how fee lines reach the model | **Agreed:** a new `breakdown: "fee"` option on `get_promotion_performance`. The tool definitions change, so the first question after B9 writes the prompt cache once, and runs before and after B9 are not strictly comparable. |
| D111 | B9: what a fee line shows | **Agreed:** both kinds of fee (each event's AD/TPR fee and each lump-sum, coupon or Prime fee), with where it applies, the coupon dates, the settings as entered and the amount the calculator counts. |
| D112 | B9: the screen's way of counting fees | **Agreed:** copy it, never fix it: a lump sum split evenly across its banners and counted only for banners with calculated events; a coupon counting $0 when its dates miss the events. The tool's text explains it. |
| D113 | Distributor ↔ retailer and the markup | **Owner:** `CRM.DistributorRetailers` is never used. Which distributor serves which retailer comes from `CRM.DistributorBanners` joined to `CRM.Banners` and `CRM.Retailers`. There is one markup, `DistributorBanners."DistributorMarkup"`, the one the promotion screens join. |
| D114 | B9: fee reconciliation data | **Agreed:** the DB test adds a lump-sum, a coupon and a Prime fee to one approved and one sandbox promotion, compares the lines with the screens, and deletes them afterwards, as B3's DB test does. |
| D115 | Region of a retailer or banner | **Owner (2026-10-16):** it comes from `CRM.RetailerRegions`. The catalog no longer describes `CRM.Banners."RegionID"`. |
| D117 | B10 split | **Agreed (2026-10-16):** B10a first (the second login and audience mechanism, plus IAM, organizations, modules and settings, audit, email-log metadata, brand links, purge runs), then B10b (the DataHub pipeline and raw distributor files). |
| D118 | How the admin role is built | **Agreed:** `askcaboodle_admin_ro` inherits `askcaboodle_ro` (`GRANT askcaboodle_ro TO askcaboodle_admin_ro`) plus its own grants, so the standard reads never drift apart. A migration creates the group role when it can, as in B2; the owner creates the login `askcaboodle_admin_app` with a psql script that asks for the password, like B2's. Both are tracked in the deployment checklist (§11). |
| D119 | Admin connection string missing | **Agreed:** platform admins fall back to the standard login and catalog (no admin index), and it is logged. |
| D120 | Prompt layout for platform admins | **Agreed:** the admin index is a second cached system block after the shared prompt, which stays byte-identical for everyone; admin sessions have their own fingerprint, and a session that changes audience starts fresh. |
| D121 | Columns hidden beyond D72 and D74 | **Agreed:** `Identity.Users."UserName"` and `"NormalizedUserName"` (the email address for 317 of 324 users), `Users."ObjectId"`, `Auditing.AuditEvents."IpAddress"`, `Organization.Domains."VerificationValue"` and `"VerificationHost"`, and the email logs' `ErrorMessage`. Email-log `Subject` is granted: no subject holds an address, and it is the only hint of which email was sent. |
| D122 | Name search for users and organizations | **Agreed:** not in B10a; SQL name matching is enough. Add `search_entity` types later if the eval shows a need. |
| D123 | B10a eval data | **Agreed:** "who invited a user" uses the legacy invited users (2 of 51 have an inviter; organization invitations are empty on `caboodle_dev`), and accepts "no inviter recorded" for the rest. |
| D124 | Conversation limit and titles | **Owner (2026-10-16):** add both in a small package alongside C1: C1b, built right after C1 (§4). The details are decided when it starts. |
| D125 | B10a review: beyond the plan's wording | **Accepted (owner, 2026-10-16, by committing B10a):** the inviter is `InvitedUsers."CreatedBy"` (as on the Admin screen); `Identity.Users."ImageUrl"` and `OrganizationBackfillRuns."Report"` are hidden; `SoftDeletePurgeSchemaRetentions` and `SoftDeletePurgeTableRegistries` are granted with the purge settings; the email-log column grants carry `Deleted`; the "Platform admin" eval group counts. |
| D116 | A corrected answer mentioning its correction | **Owner (2026-10-16):** users don't need to know how an answer was checked, and the remark misleads them. C0b's correction message (not the system prompt, D104) ends with "Don't mention the correction; write the answer as if it were the first." Built in B9. |
| D126 | B10b: which tables | **Owner (2026-10-16): "Perfect."** 17 pipeline and raw-file tables for platform admins. Left out: `DataHub.MappingSuggestions` (its status never changes and the screen computes suggestions live, so answers from it would disagree with the screen), `AliasAuditTrail` and `AliasMatchAttempts` (0 rows, no live writer), `DataUpload.DataMappings` (legacy, screen hidden): all four "on request" in §9. Never `ThirdPartyCredentials` or `SpinsRecords`. |
| D127 | B10b: hidden columns | **Agreed:** the S3 keys, upload ids and part lists, `ExportJobs."S3PartsETagsJson"` included (admin jobs reuse it for their results), `DataSyncRuns."SourceFileS3URL"` (a signed link) and `"SourceFileHash"`. |
| D128 | B10b: resolution notes | **Agreed:** granted on the unmapped and mapped KeHE/UNFI rows: they are the only record of why a row didn't map (mostly system tags; 96 rows hold short admin text). D109's hiding stays on `DistributorUpcMappings`. |
| D129 | B10b: email addresses typed into distributor files | **Agreed:** grant the store columns and rely on the gateway's `[email]` mask (one Sprouts store's KeHE city holds an address in 266 raw lines; the standard login already reads 257 such distributor-sales rows). Recorded as DI12. |
| D130 | B10b: admin block wording | **Agreed:** it names the pipeline topics, waives the raw-files NOT AVAILABLE entry for platform admins, keeps shipments on distributor sales, and says file locations and distributor logins are never available. Only the admin fingerprint changes. |
| D131 | B10b: eval period | **Agreed:** "last 30 days", not "this week": nothing failed in the eval week (the last failures were imports on 4 Oct and syncs on 28 Sep). Six cases, Q54–Q59. |
| D132 | B10b review: beyond the plan's wording | **Owner (2026-10-16):** (1) agreed: `DistributorUpcMappings."CreatedBy"`, `"LastModifiedBy"` and `"DeletedBy"` stay hidden with the resolver. (2) The zero-unit KeHE lines will be dropped: the rule isn't in production yet, and once it is they are gone, so Ask Caboodle doesn't need to handle them; the catalog's "they are kept" sentence was removed before the commit. (3) Accepted: the store-list issue example lists every type with zeros; record any store-list issue that comes up (§7.2). (4) Accepted: Q53's notes. The concerns are listed in §7.2, to be visited one by one later. |
| D133 | C1: text events | **Agreed (2026-10-17):** `text-sentence {index, text}` (the exact markdown slice) and `text-rewind {keep}`, with the final `text` kept as the authoritative answer. No raw token deltas: they would show figures before they're checked (D96). |
| D134 | C1: when text is released live | **Agreed:** only after `present_answer` has set the frame in the exchange. Text before it is shown only if its turn ends without a tool call, as today. |
| D135 | C1: a corrected answer | **Agreed:** it keeps the released sentences it repeats word for word, and rewinds from the first one that differs. Still failing: released with the note (D101). A limit during the correction: the rest of the draft, with the note (D102). |
| D136 | C1: thinking progress notes (`display: "updates"`, beta) | **Agreed: not now** (model-written and unchecked). **Owner:** organization users need the run trace too, and their trace must not contain database-level information (SQL, tables, columns, Postgres errors). |
| D137 | C1: streaming in the eval | **Agreed:** one code path, so the agent always streams, the eval included; the claims check stays non-streaming. |
| D138 | C1: who sees the trace detail (§7.2) | **Agreed:** organization users get labels, tools, timings, row counts and matched names; platform admins also SQL, tables and columns, catalog notes and Postgres errors. Applied to the live trace, the trace endpoint, `done.queries` and the progress labels. **Owner:** organization users are the real customers; G2 implements this for them end to end. Built in C1 (the trace contract carries it) and checked with real organization users in G2. |
| D139 | C1: disconnect accounting | **Agreed:** a cut stream counts its input and cache tokens from `message_start`; its output tokens count as 0 and are logged. |
| D140 | C1b: questions per conversation | **Owner (2026-10-17):** 20, as a Platform Admin setting; `session_full` before any model call. |
| D141 | C1b: platform admins | **Owner:** the same limit applies to platform admins' own conversations. |
| D142 | C1b: titles | **Owner:** Haiku 5.5 writes a 3–6 word title after the first answer, plus rename (`PATCH sessions/{id}`); the question stays the title on any error. |
| D143 | A test FE for the owner | **Owner (2026-10-17):** a live local test page: one HTML file in the docs repo, against the local API with the owner's token, showing the checked text typed out, the frame and table, the run trace and history. Package C1p, right after C1 (§4); the order is C1 → C1p → C1b. |
| D144 | C1b: which questions count toward the 20 | **Owner (2026-10-17):** only questions that used the model (cost above zero), the same rule as the daily limit; failed questions that never reached the model don't count. |
| D145 | C2: where the starters come from | **Owner (2026-10-17):** a YAML file in the BE repo for now. Claude drafts them, the owner approves them at review; Constance reviews them later through C5's library. |
| D146 | C2: modules | **Owner:** organization users get the starters their own module access allows for the brand in scope (built now, checked end to end in G2); platform admins with a brand get what the brand organization's switched-on modules allow (what its members with full access see). |
| D147 | C2: data | **Owner:** a starter is shown only when the brand has recent data for it (sales in the last 12 months, promotions ahead, this year's plan…), by free checks on the read-only login kept for an hour. |
| D148 | C2: per audience | **Owner:** a platform admin with a brand gets that brand's starters, then their own; without a brand, only their own. A broker gets the same brand starters, by the modules each connected brand grants (no broker code, D6); with no brand picked, the starters that fit at least one connected brand. Broker-only starters (cross-brand, market overview, brand reports) wait for G3/G6. |
| D149 | C2: D39 wording | **Owner:** shared starters name no brand, product, promotion, retailer or distributor, hold no figures and use relative periods only; a unit test and a DB test enforce it. Starters filled from the brand's own data (slots) come with C5's templates. |
| D150 | C2: verified | **Owner:** every starter is the exact question of a golden case that passed its last run (counted, or the app group); four new cases (Q60–Q63) for the new wordings. Their paid check (about $0.30, capped at $0.50) is approved separately. |
| D151 | C2, C4 and C5 | **Owner:** C2's set is the "seeded starter prompts" of C4 (no second seed); C4's `/` picker lists them first, then the prompts. C5's verified library later replaces the YAML as the source, with the same endpoint and fields; the YAML becomes its first entries. |
| D152 | C2: order and tracking | **Owner:** a stable order, the first four covering four topics; the FE shows four. Clicks aren't tracked now (C8 can match question text; a `starterId` would need a migration). |
| D153 | C3: period tokens | **Owner (2026-10-17):** one list of 11 tokens plus `custom`: `last-month`, `last-quarter`, `last-year`, `last-3-months`, `last-12-months`, `year-to-date`, `this-year`, `next-year`, `next-3-months` (as Q62), `last-30-days`, `last-90-days`, and `custom {start, end}` for dates the user names. Calendar periods on the server's UTC date, as the ask. `run_sql` takes `period`; the server binds `@period_start` (included) and `@period_end` (excluded) and the SQL filters with them; comparisons derive from them. A pin of a named-date answer starts fixed on those dates, and the pin dialog can switch it to any token because the SQL already takes the parameters. SQL with typed dates pins as fixed only. SPINS' "last 12 weeks" stays fixed. |
| D154 | C3: the tool plan | **Owner:** a pin stores each shown result's tool call: `run_sql` → the checked SQL and its period; `get_promotion_performance` → its arguments, re-run through the calculator so figures match the Promotion Details screen. A calculator pin keeps the same promotions (a deleted one breaks it); a rolling promotion list is a SQL pin. The view (C0's table spec, headline rule, scope and source notes) is stored apart; on render the server's resolved period replaces the model's period note, except on pins whose SQL typed its dates. |
| D155 | C3: KPI delta | **Owner:** built now, for pins with a headline and a past rolling token: the same plan run again for the previous period (the period just before; year to date against the same span last year), the same headline rule, no model call. "+6.1 pts vs Q2 2026" for a percent headline, "+4.6 % vs Q2 2026" otherwise. No delta when either value is missing or the previous one is 0. |
| D156 | C3: data not loaded yet | **Owner:** for pins reading distributor sales (or SPINS), the server checks the latest month loaded per distributor for the brand: nothing loaded in the period → no figures, only "September 2026 isn't loaded yet; data through August"; partly loaded → the figures plus that note; the delta compares the same loaded months only, or is left out. |
| D157 | C3: personal pins | **Owner:** personal for now, like conversations (D73): only the owner lists and renders them. The pin keeps its organization and brand, so sharing can come with C4's sharing model after G4. |
| D158 | C3: nightly re-check | **Owner:** a Hangfire job `ask-caboodle-pins-nightly` at 03:00 UTC (registrar pattern), one pin at a time on its login: the guard against today's catalog, a run of the plan, the view's columns. Broken reasons `table_unavailable`, `query_failed` (the Postgres error for platform admins only), `column_missing`, `promotion_missing`, `access_changed`. Timeouts and connection errors don't break a pin. Broken pins are re-checked and come back when they pass. Render applies the same checks. 50 pins per person. |
| D159 | C3: render under the viewer's access | **Owner:** at every render: the viewer owns the pin; a platform admin's pin renders only for a platform admin (its login and catalog); a brand pin needs the brand in scope now (Ask Caboodle View on it for organization users, any brand for platform admins) and the plan's tables in a module the viewer may use for that brand (C2's rule, D146). Otherwise broken with `access_changed`. The SQL runs on the viewer's login; G4's row-level rules must cover the render path too. |
| D160 | C4: who reviews organization prompts | **Owner (2026-10-18):** the organization's admins (IAM `organization.update`: Brand Admin, Brokerage Admin); platform admins can review too. An admin's own organization prompt is published at once. A non-admin's change to an approved prompt's text or variables sends it back to review. A rejected prompt stays with its author, with the admin's note. |
| D161 | C4: sharing | **Owner:** all three now: private, organization (after review) and people in the same organization through IAM members. A prompt is text only and every run is an ordinary question under the runner's access, so it doesn't need G4 (pins showed rows, D157). Nothing across organizations (brand ↔ brokerage). A platform admin working in an organization can add organization prompts there, approved at once; outside one, their prompts are private. Pins stay personal. |
| D162 | C4: variables | **Owner:** `{period}` takes C3's 11 rolling tokens (the author can narrow them and set a default; each shows today's dates) and goes into the question in words, so the agent passes the token by C3's rule; `{brand}` lists the runner's brands with Ask Caboodle, the selected brand first (fixed for a brand member); any other `{name}` is free text, or the author's choices with a default. No entity-search pickers (the agent resolves a typed name; C5's templates fill slots from the brand's own data). **Widened by D165 (owner, at C4's review):** typed fill-ins with values scoped to the brand. |
| D163 | C4: run counts and "Verified" | **Owner:** runs are questions asked from a prompt that used the model (D144's rule), counted across everyone. "Verified" only on C2's starters (each a passing golden case, D150), listed in the Organization tab under "Suggested by Caboodle"; organization prompts get it in C5 (a platform admin marks one after an eval pass, kept honest by the nightly re-check, D92). Starter runs stay uncounted (D152). |
| D164 | C4: the `/` picker | **Owner:** one call, `GET picker` with the `BrandID` header (D151): C2's starters first, as `GET suggestions`, then the organization's prompts (most runs first), yours (latest edited first) and those shared with you; each with its text (defaults filled in), a tag and its variables; pending or rejected prompts only for their author; the FE filters as the person types. |
| D165 | C4: typed fill-ins (replaces D162's "no entity-search pickers") | **Owner (2026-10-18, at C4's review, "wrap it up here"):** a fill-in has a type: Period (C3's tokens), Dates (D167), Retailer, Banner, Distributor, Product, Category, Region, Promotion, Brand or Text; Store and Distribution center are left out (too many to pick from). Each has a label (what the pill is called) and a default; an entity fill-in either lets runners pick any value of its type (a search box) or only the author's short list. Values are stored as id + name, resolved for each viewer; products, categories and promotions belong to a brand and reach only that brand's runners (D39). On Run the name goes into the question in words and the agent finds it as usual; passing the id can come in C5. Prompts saved without types: `{period}` and `{brand}` by name, anything else text. Called "fill-ins" on screen, not variables. |
| D166 | C4: "the brand's" retailers, banners, distributors and regions | **Owner:** the shared lists come with the brand's own first (`inBrandData`): retailers and banners it is authorized at (distributor banner links), shipped to in the last 12 months or has promotions with; distributors from its distributor links and promotions (as B9); the regions of those retailers. The rest of the list follows, so a new brand still finds them. Worked out per brand, kept an hour, on the read-only login; no model call. For a broker it follows the brand chosen on screen. The agent's own name search stays as it is (G5). |
| D167 | C4: the Dates fill-in | **Owner:** the author picks month, quarter, year or a range. Runners pick from last year to next year (months, quarters) or the last five years to next year (years), or type two dates for a range. The question gets the dates in words ("September 2026", "Q3 2026", "1 Jul – 30 Sep 2026"), which C3's rule turns into `custom`. |
| D168 | C4: writing a prompt without braces | **Owner:** write a real question, select words and "Make it a fill-in": the server says what they could be (a period, dates, a value of each type with exact names first, or text; `GET prompts/values` without a type, no model call), and the author picks. "+ Insert fill-in" (or typing `{`) opens the type menu. A name in braces that is really a value, like `{ABSCO}`, gets a one-click hint ("ABSCO looks like a retailer"). A live preview shows what runners will see. |
| D169 | C4: "Improve with AI" | **Owner:** one Claude Haiku 5.5 call (`ImproveModel`), only when the author clicks: the prompt rewritten as one clear question in Caboodle's words with exactly the same fill-ins (checked by the server; asked once more with the reason, then the prompt is kept and the author told why), plus words worth turning into fill-ins with their values looked up for the brand. Shown before and after; the author takes it or keeps theirs; nothing is saved. Its cost (about $0.0001) counts toward the monthly budgets, not the daily questions; 30 a day per person; refused once the month's allowance has stopped the organization. A rewrite can shift the meaning, so the author's approval is the guard; proper verification stays in C5. |
| D170 | C5: size | **Owner (2026-10-18):** two packages. C5a: the library, approval, retrieval, the examples in the question, the nightly re-check, the starters from the library, verified organization prompts and the eval's leave-one-out. C5b, once C5a's results are measured: the strict short-circuit, verified follow-ups and starters filled with the brand's own values (D149). |
| D171 | C5: what enters first | **Owner:** the 21 starters, verified at once (passing golden cases already approved at C2, D150). As proposals for a platform admin: the other golden cases that passed (from the stored reports, free), thumbs-ups from now on, and organization prompts (D173). The 100-question library is skipped for now: the draft (`ask-caboodle-starter-library-draft.md`) goes to the owner, who checks it with Constance. Its paid run (about $4–6) comes later, with its own approval. The eval leaves each case's own example out (leave-one-out). |
| D172 | C5: normalizing and retrieval | **Owner:** exact names and known aliases only; unmatched names stay as words. `pg_trgm` plus full-text on the shaped question. At most 2 examples, from a threshold set free on the golden questions. About 1–1.5K more input tokens per question, to be measured by the paid check. |
| D173 | C5: approval | **Owner:** platform admins only, judging from the source answer and its SQL; nothing is given until verified, and approving costs no money. An organization prompt is verified from one of its answered runs, which replaces D163's "after an eval pass". Thumbs-up proposals show users' questions and answers to platform admins, as C8's triage will (D97). |
| D174 | C5: slots | **Owner:** C4's types, worked out from the values the answer resolved and editable when verifying. The model sees the placeholders and resolves this question's values itself; C5b binds them as parameters. |
| D175 | C5: nightly re-check and catalog changes | **Owner:** as for pins (D158): a broken example is out of use until it passes; one whose tables' catalog changed goes to "review again" until it is verified again. Keeping it in use with a warning was weaker, given the precision bar. |
| D176 | C5: suggestions and follow-ups | **Owner:** `GET suggestions` comes from the library in C5a, with the same output. A platform admin can mark any verified example as a starter, checked by D149's wording rule when it is saved. C0's follow-ups stay. In C5b, a follow-up that closely matches a verified example takes the example's wording (with this answer's values) and is marked verified. |
| D177 | C5a: the examples in the question, on or off | **Owner delegated (2026-10-18):** "if it doesn't worth it then shut it down". **Off:** `ExamplesPerQuestion` is 0 by default; `2` turns them on.<br>**Evidence:** three paid checks ($1.02). 18 answers with examples passed 13; the same cases' last runs without passed 17. Every figure was right, and each failure was one sentence of wording. Only 2 answers took a step fewer, and one rejected call went away. Each answer cost about 3–5 % more.<br>**What stays:** the library, approval, the nightly re-check, the suggested questions and the verified organization prompts.<br>**Revisit** with real questions (verified thumbs-ups), with the 100-question library, or alongside C5b's short-circuit for repeated questions. |
| D178 | C5b deferred | **Owner (2026-10-18):** "Skip this for now. Let's go to C6. We can visit here later as an improved version." C5b (the short-circuit, verified follow-ups, starters with the brand's values) waits; C5a stays as built. |
| D179 | C6: search only | **Owner (2026-10-18, the recommendation):** web search only, no page fetch. Fetching reads whole pages (2,500–25,000 tokens each) and lets more planted instructions in; add it later if answers come out thin. |
| D180 | C6: the tool | **Owner:** `web_search_20260318` in direct mode (`allowed_callers: ["direct"]`), without dynamic filtering: its blocks are simpler to store and replay. |
| D181 | C6: who searches, and when | **Owner (option 2):** a "Search the web" switch when a conversation starts, enforced by code: without it the tool isn't declared, so no search can happen; with it the AI decides when to search, and the conversation keeps it (the tools can't change mid-conversation). Platform admins only until GA (D9), with the platform setting `webSearch` to switch it off for new conversations; a per-organization setting comes at GA. A market question in a conversation without it offers "Search the web for this". |
| D182 | C6: limits | **Owner:** at most 3 searches per question, results localized to the US, no domain allow or block lists at first; bad sources found in the eval get blocked as they show up. |
| D183 | C6: what a query may hold | **Owner:** a query can't be checked before the server sends it, so the protection is the rule (public words only: the category, brand, retailer and competitor names; never Caboodle's figures, plans, promotions or people), plus an after-the-fact check that logs a warning and the eval's `queries_absent`. Only platform admins ask until G2, and the data-handling statement (G8) mentions web search. |
| D184 | C6: checking web figures | **Owner (strict):** a figure from the web passes only when a cited passage holds it; otherwise it goes back for correction like any other. The looser option, labelling web figures without checking them, was declined. |
| D185 | C6: eval and paid checks | **Owner:** Q26 becomes a cited web answer; about 6 new cases (market trend, retailer news, mixed, a question that must not search, one with a Caboodle figure); one smoke (about $0.10) and a 9-case check (about $0.80, cap $1.20). Spent: $0.17 and $0.75. |
| D186 | "Data this brand has" before C7 | **Owner (2026-10-19, go-ahead on the recommendation):** built first as C6.1: one line with each question from C2's hourly checks plus two SPINS checks, no extra step; then C7's paid check runs on the final message. |
| D187 | C6.1: Q28 answered from the line, without the confirming query | **Owner:** the server's check counts as checking; Q28 no longer requires reading `SPINSItemsRanking`. The line's "confirm with one query" sentence stays as tested. |
| D188 | C6.1: SPINS | **Owner (2026-10-19):** "In SPINS we have two types of report … It's not a distributor report. It's syndicated data … When users buy that product from the store, that gets recorded and called SPINS data." Built: the glossary entry (sell-through vs sell-in; Stores Insight the brand's own products per store; Item Ranking the category with competitors), Item Ranking before any web search for category, competitor and market questions, "nationally" = TOTAL US, trimmed market names, Q70–Q71. |
| D189 | C7: who saves and removes a name | **Owner (recommendation (a)):** every member saves for their organization from a clarify; the person who saved it or an organization admin (`organization.update`, as D160) removes it; admins can also add a name directly. |
| D190 | C7: used at once or after a review | **Owner:** at once; no review queue and no `Status` column. The entity is one the search offered and the user picked, the answer names the entity used, and the list is visible to everyone. |
| D191 | C7: platform admins without an organization | **Owner (recommendation (a)):** their names apply to every organization (organization null), after the organization's own, labelled "a name Caboodle saved"; only platform admins add or remove them; the offer says "for every organization". With an organization selected, a platform admin saves for that organization. |
| D192 | C7: brokers across brands (G3) | **Owner:** a name belongs to the organization that saved it; nothing crosses organizations (a brand and its brokers don't share). The entity's own scope decides whether a saved name shows (today the brand filter, G5's allowlist later). Revisit sharing after G3 if brokers ask. |
| D193 | C7: the soft-delete purge | **Owner:** nothing to build; the existing purge hard-deletes removed names after the `Intelligence` retention (D14). Uniqueness covers only names not removed; a name whose entity is deleted stops matching and stays listed until removed. |
| D194 | C7: eval | **Owner:** a case can carry `aliases`; Q14's reported link check; two new cases (Q72 with "Fresh Market", Q73 a name the model can't know, since the glossary already maps WFM); isolation and Caboodle-wide names as free DB tests; a paid check of about $0.35 (cap $0.70), approved first. |
| D195 | C7: limits | **Owner:** a name is 2–60 characters; up to 500 per organization. |
| D196 | C7: the offer after the owner's live test | **Owner (2026-10-19, "solve problem 1"):** the server works out the offer. The word comes from the conversation's name searches. Each option's entity is the id the AI gave, else the search result its label names, else one exact-name lookup. The AI's `entity_id` stays optional. |
| D197 | C7: a clarify's options aren't the matches the brand sells to | **Owner (2026-10-19):** on the to-do list (§7.2), not built in C7. |
| D198 | C8: where the eval results live | **Owner (2026-10-19, "go"):** they ship with the code: the eval writes a summary of each run to `FlightRecorder/eval-runs.json`, embedded in the API, so every environment shows the eval of the build it runs, with no upload. A free tool fills in the past runs. |
| D199 | C8: what goes on the to-fix list | **Owner:** thumbs down, figures sent unchecked, and questions with no answer (out of steps, timed out, failed); not stopped, rate-limited or unavailable ones. |
| D200 | C8: who sees whose questions | **Owner:** platform admins see the question, the answer and who asked for listed items from any organization, to fix them; G8's data-handling statement says so. |
| D201 | C8: "refusals correct" | **Owner:** from the eval's refuse group; the live figures show the "can't answer" share and the thumbs down on those answers. |
| D202 | C8: the list's statuses | **Owner:** Open, Fixed, No fix needed, with a note and an optional eval case id; the list shows whether that case passed in the newest eval run that asked it. |
| D203 | C9: what the guide is written from | **Owner (2026-10-19):** the code and the catalog are the authority ("dive deep into each module … and convert them into nice business rules"); the BA's documentation repo is only a lead for topics and wording. The industry-jargon list (users' words such as "depletions", "MCBs") stays separate until the owner has talked to Constance. |
| D204 | C9: the first batch | **Owner:** all the entries now (planned about 55; built 65), in nine topics, plus the owner's addition: how a product connects to banners, retailers and distributors. Constance reviews them in three batches. |
| D205 | C9: how the AI finds entries | **Owner:** the names of the entries everyone may read go in `search_guide`'s description (about 400 tokens), so the AI knows what the guide covers; it searches by name or words. Platform admins' own entries are named in their system block. |
| D206 | C9: before Constance approves | **Owner:** drafts reach platform admins only, marked "not yet reviewed" by the server; organization users get approved entries only. |
| D207 | C9: who an entry is for | **Owner:** platform-admin entries are hidden from everyone else now; the organization-admin tag is stored now and used in part 2 ("who can do this"). No role plumbing yet. |
| D208 | C9: how Constance reviews | **Owner:** documents generated from the guide file, one per batch, like the 100-question draft: each entry as the AI reads it, Keep / Change / Drop, her corrections, how her clients say it, and the questions the code doesn't settle first. A Word file or a shared doc if she prefers. |
| D209 | C9: tests and the paid check | **Owner:** the "App questions" become a counted "Concepts" group of 9 cases (Q42–Q44, Q75–Q80); the claims check reads the guide entries and flags invented steps and terms. The paid check (the group plus Q01 and Q10, about $0.65, capped at $1.20) approved with the plan. |

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
| C0b tuning beyond the plan's wording: figures recomputed from two checked figures in the same text (difference, ratio, % change), and `present_answer`'s reply stating the table's row count | C0b review | **Decided:** D105, keep both. |
| "About 170 stores" when the true average is 168.9: whole numbers under 1,000 are exact today, so it is flagged and corrected to "161–172" | C0b review | **Decided:** D106, keep strict. |
| Q33 and Q35: the model frames "nothing found" as `cannot_answer` (no buyer contacts and no emails; no Sprouts activity). Twice on 2026-10-16, never before; the texts are right | Eval (owner) | **Decided:** D107. Q33 accepts both kinds (in `golden.yaml` since C0b); Q35 stays `answer`. |
| Industry terms users say that clash with or are missing from Caboodle's words ("sales", "depletions", "distribution", "TDP", "the plan"/"AOP", "deductions", "MCBs") | Owner, Constance | The owner talks to Constance first. Then: I draft about 50–60 terms with test questions; she marks the ones her clients use and corrects the meanings; the approved terms go to the glossary, the eval and C5. |
| C0c go or no-go | After C0b's review | **Decided:** D108, deferred to before G2. |
| Re-running a step to confirm an answer (instead of a second model check) | Later, after C8 | Decide with real-usage data: which answers go wrong, and which step to re-run (D95). |
| How much of the run trace organization users see; `done.queries` (raw SQL) goes to everyone today | C1 (before G2) | **Decided:** D136, D138. Organization users get the trace without database detail; built in C1, checked end to end in G2. |
| One list of period tokens for pins | C3 (also C0's `period` note) | **Decided:** D153, 11 tokens plus `custom`. |
| KPI delta against the previous period on a pin | C3 | **Decided:** D155, built now; D156 for months not loaded yet. |
| Personal or shareable pins | C3 | **Decided:** D157, personal; sharing with C4 after G4. |
| **C3: named dates are typed, not passed as `custom`** (paid check, 2026-10-18): Q04 ("in Q3") and Q08 ("in September") filtered with typed dates, so their pins can't switch period (D153 wanted them switchable). The six relative questions all took their token | C3 follow-up (owner) | **Done in part (C3 follow-up, owner 2026-10-18):** examples in `run_sql`'s `period` description and the prompt sentence ("in September", "in Q3", "for 2027" → `custom`). Re-check $0.24: Q08 now passes `custom` (1–30 Sep); Q04 ("in Q3") and Q17 ("for 2027") still type their dates. Their pins work on the dates asked and can't switch period. Not pursued further (owner moves to C4); a hint in `run_sql`'s result when typed dates look like the question's period would cost a step on some answers. |
| **Found in C3's follow-up: the claims check misreads a long table** (2026-10-18, Q17): the judge sees the first 40 rows with "80 rows; only the first 40 are included here" and contradicted "The table shows every retailer", which is true for the user (80 rows shown). Q17's figures were right, and it passed in B7b, C0 and C0b. Its "between 20 and 60 events" also went out with the note: bounds the model chose are in no result | Eval (free) | Say in the judge's table note that the user sees every row and only the judge's copy is cut; re-score from the stored report (no model call for the answer). The bounds stay strict (D106). |
| **Found in C3's follow-up: the promotion events example disagrees with its own rules** (2026-10-18): `TradeSpend.TradeSpendPromoEvents`' example ("events at a retailer in the next three months") filters `Status IN (1, 3, 6)` and `CURRENT_DATE`, while the Status column says "active" is 1, 3, 6, 7 and C3's rule says to filter with the period parameters. Both live Q62 runs copied 1, 3, 6. No figure changes today: no events with status 3 or 7 overlap the next three months | Later (owner) | Align the example: statuses 1, 3, 6, 7 and `@period_start`/`@period_end` with period `next-3-months`; check with the free references. |
| **C3: Q62 listed TPR events only** (paid check, 2026-10-18): the right window, but 57 promotion × retailer rows of TPR events (statuses 1, 3, 6) instead of 113 promotions and 1,203 events of every type (statuses 1, 3, 6, 7). It passed in C2 | C3 follow-up (owner) | **Decided (owner, 2026-10-18):** the owner's live question framed it the same way (58 TPR promotions and 56 EDLP-only, on 17 Oct), so it isn't noise and the answer says what it leaves out. Q62 now also accepts the TPR-only framing (references `promotions_with_tpr` 56, `tpr_events_active` 491, `promotions_edlp_only` 57). The live run also showed the fact check at work: "another 56 EDLP-only promotions" was worked out in the head (114 − 58), stopped, and counted with a query before it went out ($0.107 for 9 steps). |
| Who reviews prompts shared with an organization | C4 | **Decided:** D160, the organization's admins (platform admins too). |
| The 100-question starter library (D92, D171) | Owner, Constance | The draft is [`ask-caboodle-starter-library-draft.md`](ask-caboodle-starter-library-draft.md). Constance marks each question Keep, Change or Drop and adds what's missing. The kept questions are then asked once (a paid run, about $4–6, approved separately), the answers are checked, and the right ones are verified in the examples panel. |
| **C5a: the golden-case proposals wait for verification** (24, seeded 2026-10-18) | Owner (platform admin) | Only verified examples are given. Today that means the 11 starters with calls. For the 12-case paid check, verify Q10, Q12, Q18, Q19 and Q22 first (the matches of Q16, Q18, Q22, Q27, Q39 and Q61); without them, 6 of the 12 cases get an example. Each proposal now shows its passing run's answer (owner, 2026-10-18), so it is judged by what the user saw, not by its SQL. **Done in part (2026-10-18):** the owner verified Q10; Claude verified Q12, Q18, Q19 and Q22 for the owner after re-checking their figures (§4). 19 are left; with the examples off (D177) they matter for the suggested questions, C5b and turning the examples on again. |
| **C5a: matches that share a question's shape but ask for something else** (free retrieval run, 2026-10-18): Q12 ("How much did we ship to Albertsons last quarter?") and Q61 ("How many stores did we ship to last month?") match each other at 0.566 | C5a paid check | Measure it in the 12-case check: steps, cost and pass, against each case's last run. If such matches mislead, raise `ExampleMinimumScore` to 0.60 (6 of 65 cases) or give the word share more weight. Both are settings or free changes, checked with the retrieval tool. **Measured (2026-10-18):** Q12 and Q61 passed with each other as their example (checks 1 and 2). Left as is while the examples are off (D177). |
| **C5a: a product's name makes different questions look alike** (paid check, 2026-10-18): Q27 ("What's our list price for Red Ripe Strawberry?") got Q10 ("What's the velocity of Red Ripe Strawberry at Sprouts this year?") at 0.778, the highest score in the set. "Red Ripe Strawberry" isn't a whole product name ("Bubbies Mochi Ice Cream - Red Ripe Strawberry"), so it stayed as words, and both scores counted them | **Done (2026-10-18, free)** | Built: part of a product's name reads as a product in retrieval, and the retailer names from aliases need a fifth of a retailer's aliases, counting case variants once ("price" had come from "Price Chopper"). Q27 now gets nothing above 0.55; no other match moved (§4). |
| **To do (owner, 2026-10-18): simpler admin screens in the final UI.** The owner found the test page's example review and C4's prompt form hard to follow ("how is my client Constance going to understand this?") | FE (§10.10) | **Decided:** the final UI shows only what a person needs to decide; the guidance is in §10.10. No backend change needed: the API already gives what those screens need. |
| **To do (owner, 2026-10-18): a Platform Admin user manual** | After the final UI, with C9 (§8 "Admin manual") | Every admin screen in plain words with screenshots, written once the final UI exists so it isn't written twice; Constance reviews it. Short "What is this?" help on each screen covers most needs until then. |
| **C6: a market question without web search names data the brand doesn't have** (9-case check, 2026-10-18, Q69): "SPINS scan sales and market rankings … how it ranks against other brands", when Bubbies has no SPINS item ranking. It answered in 2 steps without checking. The same question before C6 (Q26) took 4 steps, checked, and passed in B7b, C0 and C0b. Likely cause: the new `suggest_web_search` gives the AI a quick way out, so it skips checking what the brand holds | C6 follow-up (owner) | **Tried (owner, 2026-10-19), didn't help:** a sentence in `suggest_web_search`'s description ("As in any cannot_answer, name in notes.available and the text only data you have checked this brand has"). Q69 failed 2 of 2, the same way. The AI lists what Caboodle can hold from the catalog's table index, and `present_answer`'s `available` says only "what Caboodle has instead". Options: (a) the same rule where every `cannot_answer` reads it: the prompt's cannot_answer line and `notes.available`'s description ("name data as the brand's only when a query showed it has some, or say what Caboodle can hold without saying the brand has it"). It touches every refusal, so re-check the refuse group (6 cases) and Q69 twice, about $0.25. (b) Accept for now: it is wording, not a figure, and the "Search the web for this" offer works. **(a) built (owner, 2026-10-19), $0.16:** the other five refusals passed with the same steps, but Q69 failed 0 of 2. It now says it hasn't checked, yet still offers SPINS item rankings the brand doesn't have (§4). Next options: (c) tell a `cannot_answer` to check with one query what the brand has before naming any of it (as Q26 did before C6: one step more, about 2–3 s and $0.01 per such refusal; re-check the refuse group and Q69 twice, about $0.20); (d) keep (a) and accept Q69 as a known wording issue. **Decided (owner, 2026-10-19): (d) for now,** with (a)'s rule kept: Q69 says it hasn't checked, shows no wrong figure, and the offer works. Two prompt-only tries failed, so a third wasn't worth the time. **To do:** give the AI one line with each question saying which data the brand has ("shipments, promotions and SPINS store scan data; no SPINS item rankings"). It would come from C2's hourly data checks (`Suggestions/AskStarterData`), with the two SPINS checks added. That means no extra step or model call, and about 30 tokens a question. It also stops normal answers from querying data the brand doesn't have. Then re-check the refuse group and Q69 twice (about $0.20). A small package of its own. **Done (C6.1, D186; §4):** Q69 passed 2 of 2 and offers only what Bubbies has. At its review the owner also set out what SPINS is (D188): Item Ranking is Caboodle's own market data, so a market question for a brand that has it is answered from SPINS, not the web. |
| **C6.1: Q71's category total and pattern claims** (2026-10-19, $0.14): from the right data (Item Ranking, no web, the window and its age), but "about $61.7M" summed only the items with a year-ago change (the category is $62.6M), "growth is concentrated in a few items" when 462 grew and 472 declined, and "distribution is driving most of it" without support. The fact check can't see these: $61.7M was in a result, and the others are words | C0c (D108), or a catalog line now (owner) | C0c's kind ("figures in the wrong place", pattern words). A free catalog line could cover the first: "the category total sums every item in one window, with no filter; a total over filtered rows says what it leaves out". Re-check Q71 once, about $0.14. **Decided (owner, 2026-10-19): leave it for C0c.** |
| **C6.1: Q25's wording slip** (2026-10-19): "Delete our cancelled promotions" got "I can't tell which promotions are cancelled unless you name them", but the data marks 67 cancelled events. Same 2 steps as its passing C6 run; C0b's answer hedged on the same point ("I'm not sure the data marks any promotion as cancelled") | Noted | Not caused by the line, which doesn't mention cancellations. A claim about what the data holds, made without checking: the same habit as Q69. Watch it in the next full run. |
| **C6.1: the hourly SPINS check reads both SPINS tables whole** (no index on the brand): 0.4 s locally for 1.5 GB, once an hour, shared by everyone. Production may be larger | Before go-live (owner: "remember") | Time it on staging (BE runbook checklist 6b, query 6). If it's slow, ask the app team for an index on `"DataUpload"."SPINSStoresInsight"("BrandID")`: not Ask Caboodle code (D6). |
| **C6.1: DI15, Primal Kitchen's Item Ranking is Dr. Tung's store data** | Owner (data at the source) | Until it's fixed, a ranking or category question asked as Primal Kitchen answers about another brand's dental floss, and its data line says it has Item Ranking data. Ask which file was meant. |
| **To do (owner, 2026-10-19, D197): a clarify's options aren't the matches the brand sells to.** The owner's live "How are we doing at Fresh?" offered Sun Fresh, Fresh Plus and a UNFI distribution center first. In the paid check, Q74 offered Sun Fresh, Fresh Plus, Amazon Fresh and Fresh Direct. The Fresh Market (11,723 cases in the last 12 months) and Fresh Thyme Market (2,767) were left out, because the name search ranks short names first | Later (owner) | **Proposed, a server rule:** once an hour, read every brand's cases per retailer and per banner over the last 12 months (one grouped query: 1.5 s locally for all brands, 3,827 rows). When a name matches several retailers or banners, the ones the brand ships to come first, biggest first, with their cases in the result ("11,723 cases in the last 12 months"). Exact and saved names stay first; without a brand nothing changes. One line in `present_answer`'s options tells the AI to offer the top-selling matches first. No extra step or model call. For "Fresh": The Fresh Market 11,723, Fresh Thyme Market 2,767, Yoke's Fresh Market 2,188, Guido's Fresh Marketplace 631, Fresh Plus 317. Check with Q74, Q14 and Q12 as a control (about $0.20). |
| **C7: Q14 answered without asking** (paid check, 2026-10-19): it took The Fresh Market and named no other Fresh Market, so there was no clarify to offer from. That's the owner's live result too | Noted | Q14 flips between runs (failed in C0b's full run, passed in its re-check and in C0). Watch it in the next full run; D197's ranking would give the AI the sales figures to choose with. |
| **C6: a web figure passes when any passage cited in the conversation holds it** (9-case check, Q66): "My/Mo holding 80% of that subcategory" passed the fact check (in the draft too), but no source shown under the answer holds 80%: the cited Entrepreneur passage stops at "with …". The register keeps every cited passage of the conversation, as it keeps every tool result, so a figure from another passage, or the draft's, vouches for it. The API's cited passages are also short, so a true figure can sit just outside them | C6 follow-up (owner) | **Done (owner, 2026-10-19), option (1):** a web figure passes only when a passage cited by the same model call holds it (§4 "C6 as built"). Re-check: Q66 and Q26 passed ($0.25). Option (2), only the sentence's own passage, is left for when the eval finds such a figure again; the report now keeps every answer's sources and its drafts' citations, so it shows which passage vouched. |
| Thumbs-down triage list in the Flight recorder | C8 | **Decided:** D97. **Built in C8** (D199–D202): thumbs down, figures sent unchecked and no answer; Open, Fixed, No fix needed, with a note and the eval case it became. |
| Sonnet 5.5 cache-read price: $0.10 per million tokens (B8; the app's `ModelPrices`) or $0.20 (the `claude-api` skill's table) | Owner (Claude Console) | **Settled (2026-10-16):** $0.10. The live pricing page prices cache hits on Sonnet 5.5 and Opus 5.5 at 0.05x input ($0.10 and $0.20); `ModelPrices` matches it, so the reports' costs stand. The skill's cached table was out of date. |
| Where the organization admin's usage page and the "questions left today" indicator sit | FE (§10.9) | FE team |
| Grant `DataHub.DistributorUpcMappings` (without notes and "resolved by") | B9 | **Decided:** D109, moved to B10b for platform admins. |
| A corrected answer mentions its correction to the user (B9 paid check, Q48: "I corrected the Costco and Trader Joe's counts below after checking them against the data") | C0b's correction message (owner) | **Decided:** D116, one sentence added to the correction message; built in B9. |
| Split B10 into B10a (IAM, organizations, modules, settings, audit) and B10b (data pipeline) | B10 | **Decided:** D117. |
| A limit on questions per conversation (owner, 2026-10-16: "like other chat apps, e.g. 20 per thread") | C1b (D124) | **Decided:** D140, D141: 20, platform admins included; D144: only questions that used the model count. |
| Meaningful session titles (owner, 2026-10-16: "like Claude or ChatGPT, from the first message") | C1b (D124) | **Decided:** D142: Haiku 5.5, plus rename. |
| B10a beyond the plan's wording: the inviter is `InvitedUsers."CreatedBy"` (as on the Admin screen; 48 of 51, not 2, so Q50 asks about Chantico Agave's invitations); `Users."ImageUrl"` and the backfill `Report` hidden too; the purge retentions and table registry granted with the purge settings; `Deleted` in the email-log column grants; the admin group counted | B10a review (owner) | **Decided:** D125, accepted as built. |
| The fact check flags the "8" in "between 8 and 11 September" (B10a paid check, Q53: a false alarm that cost a correction round). Cause: its day-first date pattern joins days only with "–", "-" or "to" | C0b.1 (owner, 2026-10-16) | **Done:** C0b.1 (`5f7e7f84`) (§4): day-first dates also join their days with "and", "&" or commas; month-first unchanged. The replay of 113 stored answers changes only Q53. |
| B10b beyond the plan's wording: `DistributorUpcMappings."CreatedBy"`, `"LastModifiedBy"` and `"DeletedBy"` hidden too (empty today, they would name the resolver D109 hides); the catalog says zero-unit KeHE lines are kept (the code's new rule drops them, the restored data holds 261 K, DI9); the store-list issue example lists every type with zeros (after Q57's paid-check error); Q53's notes say the recipient count is available | B10b review (owner) | **Decided:** D132. All accepted; the zero-unit sentence was removed. |
| **B10b concern 1, store-list issue types are hard-coded:** the catalog lists the ten types and the Issues tab's labels (and the example's VALUES list). A type the app adds later (`StoreListIssueType`) is missing from "by type" answers until the catalog is updated. Record any store-list issue that comes up (D132) | Later (owner) | Option: a unit test that compares the catalog's `Type` values with the C# enum, so a new type fails the build. |
| **B10b concern 2, when the zero-unit KeHE drop reaches `caboodle_dev`:** the next restore after the change removes 261 K raw KeHE lines and 244 K KeHE distributor-sales rows. `GoldenReferenceTests` will then fail: Q56 (file lines 20,413, waiting lines 116), the store counts (Q08's 4,872 and the other DI9 cases) and any KeHE total with zero rows | Next restore after the change (owner) | Re-record the references, re-read the notes, move DI9 to Fixed, and re-check the catalog's zero-row store-count rule (DI9). |
| **B10b concern 3, DI14 fixed later:** if the app starts storing UNFI UPC mappings as 3, both 1 (old rows) and 3 (new rows) mean UNFI, and the catalog's "1 = UNFI" rule on `DistributorUpcMappings` becomes wrong for new rows | When the app fixes DI14 (owner) | Change the entry to "1 or 3 = UNFI" (or fix the old rows at the source too). |
| **B10b concern 4, DI13 fixed later:** once the "A command is already in progress" error is fixed, new failed runs really failed; the catalog's "a failed run may have loaded its rows" stays true for the old ones | When the app fixes DI13 (owner) | Keep the rule, and say it applies to runs before the fix date. |
| **B10b concern 5, the gateway mask is the only guard on DI12's address:** it replaces a whole address in a returned cell, but a query that returns part of the value (e.g. the text before the "@") isn't masked. Platform admins only; the same holds for every masked text column since B4 | G8 (data-handling statement) | Accept for platform admins until G8, or hide `CustomerCity` for that store's rows at the source (fix DI12). |
| **B10b concern 6, built from the local restore:** the pipeline catalog, its codes and the eval figures come from `caboodle_dev` (restore of 2026-10-11). Production may differ (the crawler and stored distributor logins in use, larger raw tables under the 15 s statement timeout) | Before go-live (G-phase) | Check the pipeline tables' statuses, provider codes and query times on staging with the admin login, as §11's checks do. |
| A right figure in the wrong place passed the fact check again (B10b, Q57: "Two issue types… have no open issues" when one has none; a 2 was in the results) | C0c (D108) | One more case for C0c's sizing; the catalog example was fixed in B10b. |
| Found outside Ask Caboodle (B10b): the admin Sync Runs list calls `GET datahub/sync-runs` (the backend expects POST); file-upload and "map existing data" triggers show "Unknown"; the unmapped-records export polls the brand route; KeHE's YoY % shown as dollars; the decrypted distributor password goes to the crawler over plain HTTP, and the run details show the full signed file URL | Owner (not Ask Caboodle, D6) | For the app team. |
| **C1: the final text arrives in one burst** (paid check, 2026-10-17): in 5 of 6 answers and the smoke, every sentence arrived within 1–7 ms of the first; the smoke's last `message_start` already held its final `output_tokens`, so the API sent nothing until the text was written. The step and tool events do arrive live. **Not the fallback** (checked 2026-10-17, $0.04, `-Label c1-nofallback`): Q08 without `fallbacks` still sent its 5 sentences within 7 ms. **Cause found** (2026-10-17, $0.044, 14 small raw-HTTP calls timing every event): **Sonnet 5.5 holds back text it writes right after a tool result** until the text is finished (`message_start` already carries the final `output_tokens`), whatever the request says: default, `tool_choice: none`, `display: "updates"`, `between_tools` and a user line after the tool result all arrive in one burst (spread 0.01 s). A first reply streams normally on Sonnet 5.5, with or without tools (spread ≈ 2 s), and Sonnet 5 streams the after-tool answer normally (2.1 s). Likely Sonnet 5.5's conversion of between-tool notes into progress `thinking` blocks: the API can only tell a note from the answer at the end | C1 (owner) | Options: (1) accept for now — the trace is live, the text appears when written (about 2–3 s after "Writing the answer" for a short answer) and the FE types it out; C1 needs no change and streams progressively if the API changes; (2) write the answer step on another model — breaks the prompt cache (≈ $0.04 more per answer) and goes against D94; (3) ask Anthropic whether it is intended and whether a setting lifts it. Recommended: (1) plus (3). |
| **Owner idea (2026-10-17), visit later: a table or chart only when it helps.** Not every answer needs one; the agent could decide, or show one only when the user asks, built from the previous answer's result | Later (owner) | Today `present_answer`'s `chart` already lets the model pick table, bar, line, pie or none, and it shows its result whenever it ran a query. Options: a prompt rule to show data only when it adds to the text (for example more than 3 rows); a "show as a chart" follow-up that reuses the earlier `result_id` (results stay in the session) with no new query; or the FE shows the text first with the data block collapsed (D71: the FE draws from the rows, no extra call). |
| **Default budget vs the daily pool** (owner's cost question, 2026-10-17): an organization's defaults are 100 questions a day (B8 pool) and $25 a month with "stop at 100 %". At about $0.05 a question, $25 buys about 500 questions, so an organization using its full pool stops after about 5 days | Owner, Constance | Align the defaults: about $150 a month for 100 questions a day (30 days), or about 17 a day for $25. Measured cost per question (Sonnet 5.5 medium): about $0.036 for a new question (C0b full run), $0.05–0.09 for follow-ups deep in a conversation (each call re-reads the whole conversation; C1b's cap of 20 limits it); plus about $0.05 to write the hourly prompt cache when no one has asked for an hour, shared by every organization (the prompt is the same for all brands, D39). |
| Organization admins asking about their own organization's members, roles and invitations | Later (after GA) | Optional; scoped to their organization and their IAM permissions |
| Access to the user-documentation repo, and the review format for Constance | C9 | **Access given (2026-10-16):** public at https://github.com/tauhid-sifat/Caboodle-Documentations (a project working folder: docs, kb, wiki, specs, meetings, jira…). Written by the BA and not yet reviewed by the owner: treat its content as unverified, and discuss it with the owner when C9 starts. The review format is agreed then too. **Decided (C9):** D203 (a lead only; the code and catalog are the authority), D208 (documents generated per batch). |
| **C9: catalog lines the code contradicts** (the six surveys, 2026-10-19) | Owner (a small follow-up, C9.1) | These are Ask Caboodle's own catalog, so they can make data answers wrong; none was changed in C9. **Most important, the store count:** since CS-1718 (26 Sep 2026) the Distributor Sales Report counts Store List stores (a row not linked yet counts as its name + ZIP), while the catalog (distributor sales entry, metric, glossary) counts `CustomerName`; counts differ where two stores share a name. Decide: count as the app does (re-record Q08, Q61, Q80 and the other store counts free) or keep it and say so. **The others:** velocity weeks (the app counts each month number once, and units = cases × pack); POD (the app shows 0 for a chain, store or city with 0 cases); a distributor-sales row's region is Caboodle's (retailer region, else the store's state, else National), not KeHE's text; UNFI rows take the catalog category too; approved promotions aren't always pushed copies (direct, simple, copies); "up to 5 versions" is a brand setting (default 5, 1–20); monthly-report actuals match by banner name only, can be imported from a file, and simple promotions are left out of the plan; MCB is a % of the case cost × 1.45; the join path still counts event status 1 only (the calculator counts 1, 3, 6, 7; also C3's item above); a market overview never changes an Active or Discontinued authorization, and deleting one doesn't undo it; brokers read authorizations (Retail APL) and move them (market overviews); a new product gets authorizations only at the banners that exist then; "APL" also names the authorization list; email domains only let people ask to join; a brokerage's id is its broker's user id only for backfilled ones; Ask Caboodle is also a brokerage module; only platform admins change any module setting (the flag hides one from the organization's page); custom roles exist; anyone with the invite permission sends invitations; brands keep their own category reviews and see a brokerage's only through an active connection; the pipeline's retailer is optional and its stages mostly shared. Recommended: fix them in C9.1 with the free references, then one paid check of the affected cases (store counts, promotions, calculator; about $0.40, approved first). |
| **C9: net revenue takes the allowances off twice** (survey, re-checked by hand) | Owner, Constance | The screens' calculator (and so Ask Caboodle, which uses it) works out total revenue after allowances, then net = total revenue − total spend, where total spend includes TPR spend: the same allowances again. The guide states it as the app does, with a question for Constance. If it's wrong, the app team fixes the calculator (D6) and Ask Caboodle follows with no change. |
| **Found outside Ask Caboodle in C9's surveys** | Owner (app team, D6) | Bulk "connect banners" can give a banner two distributors for one brand (the one-at-a-time link refuses it); the older retailer-level distributor link and its markup are still read by the retailer detail, a sandbox event, broker "events with the same name" and the products report, and block removing a distributor; contacts with a blank email or phone count as duplicates of each other; retailer promo rules can be added, imported, exported and deleted by anyone signed in, and delete can empty the table; one banners query hard-codes a brand id; a bulk market overview applies the first row's banner, status and date to every product; the category-review save endpoint is labelled View; the Notify Brand email links to a brokerage-only screen; the roll-up and forecast reports use older formulas than the promotion details; the distributor APL import checks the UPC without leading zeros but stores the raw one; the KeHE "Sales by product" screen labels units as cases. |
| **C9 part 2: a source for steps in the app** | After the FE rework | The BA's documents have few steps and predate the rework. Part 2 needs the reworked screens themselves (the FE repo, or the FE team's walkthrough), then the same review by Constance. |
| **C9's re-check after the free fixes** | Owner | The Concepts group again with the prompt and eval fixes (about $0.45, capped at $0.80), approved first. |

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
| C0b | done | `6da28c2d` | 2026-10-16: built as in §4 C0b "as built"; the IAM branch is unchanged since `b5adb1a1`. No migration. Solution 6,813 green, Intelligence 476, coverage 97.8 % unit-only, DB tests 23 green, build 0 errors.<br>**Paid, $3.43:** 4-case check 4/4 ($0.41; Q16 and Q29 now pass); full run 38/45 counted, app questions 3/3, $0.036 per answer ($2.62); 5 of 48 corrected, none sent with the note; no failure caused by the check. D103 tuning, then a re-check of 7 ($0.40): Q04 and Q07 no longer corrected.<br>**At review (D105–D107):** both tunings kept, "about 170" stays strict, Q33 accepts either kind. Still open: C0c go or no-go; the industry-terms list waits for Constance (§7.2).<br>**Balance:** about $50.60. |
| C0b.1 | done | `5f7e7f84` | 2026-10-16, after B10a: day-first dates in the fact check also join their days with "and", "&" or commas (§4 "C0b.1"). Intelligence 559, solution 6,896 green, build 0 errors; the free replay of 113 stored answers changes only B10a's Q53 (a false alarm gone). $0 spent. |
| C0c | deferred | | Fact check, step 2: rankings, trends and figures in the wrong place. Deferred to before G2 (D108): about one such error per full run is left; sized with C8's data. |
| B9 | done | `a8387b82` | 2026-10-16: plan and decisions D109–D116 approved; the IAM branch is unchanged since `b5adb1a1`. Built as in §3 B9 "as built": fee lines through the calculator (`breakdown: "fee"`), `CRM.DistributorBrands` and `CRM.RetailerRegions` (not `DistributorRetailers`, D113), regions from `RetailerRegions` only (D115); migration `AddAskCaboodleCatalogCompletionGrants` applied locally; solution 6,821 green, Intelligence 484, coverage 97.9 %, DB tests 25 green, build 0 errors. DI11 recorded.<br>**Paid, $0.59:** 9 of 9 passed (Q41, Q45–Q48, Q22, Q37, Q39, Q30); 2 corrected (Q48's two wrong hand counts caught; Q45's right total a false alarm, fixed by stating the fee total).<br>**At review:** D116 (a corrected answer never mentions the correction).<br>**Balance:** about $50.01. |
| B10a | done | `26a85f3f` | 2026-10-16: plan and decisions D117–D123 approved; the IAM branch is unchanged since `b5adb1a1`. Built as in §3 B10 "B10a as built": migration `AddAskCaboodleAdminReadOnlyRole` applied locally, login script, the platform-admin audience, 38 catalog entries, BE `docs/AskCaboodle-Deployment.md`; solution 6,886 green, Intelligence 549, coverage 97.9 %, build 0 errors. DB tests 45 green with the owner's admin login. **Paid, $0.44:** 8 of 8 passed (Q49–Q53, plus Q01, Q22, Q48 asked as a platform admin); 1 correction, a fact-check false alarm on a day of the month (§7.2). Found: the inviter is `InvitedUsers."CreatedBy"` (48 of 51, not 2). At review: D125 (the five points beyond the plan accepted as built).<br>**Balance:** about $49.57. |
| B10b | done | `e26a5f52` | 2026-10-16: plan and decisions D126–D131 approved, and D132 at review (the review points accepted; the zero-unit KeHE sentence removed); the IAM branch is unchanged since `b5adb1a1`. Built as in §3 B10 "B10b as built": migration `AddAskCaboodleDataPipelineGrants` applied locally (55 admin tables), 17 catalog entries, admin block wording, eval Q54–Q59; solution 6,902 green, Intelligence 565, coverage 97.9 %, DB tests 46 green, build 0 errors. DI12–DI14 recorded, DI9 updated. **Paid, $0.56:** check 7 of 9 ($0.48; Q57 a "wrong place" count, Q53 a claims-check false fail), both fixed and re-checked 2 of 2 ($0.08).<br>**Balance:** about $49.01. |
| C1 | done | `a01dfc13` | 2026-10-17: built as in §4 "C1 as built" and committed at the owner's request; the IAM branch is unchanged since `b5adb1a1` (fetched 2026-10-17). No migration. Solution 6,934 green, Intelligence 597, coverage 98.2 % unit-only, DB tests 47 green, build 0 errors. **Paid, $0.42:** smoke $0.0834 (right); 6-case check 6 of 6 ($0.34), the streamed sentences ended as the answer in 6 of 6, Q48 corrected and rewound once. Found: the API sends the final text turn in one burst; the cause is Sonnet 5.5 holding back text written after a tool result (§7.2; checks $0.04 + $0.044). Ten points beyond the plan's wording are listed in §4 for the owner.<br>**Balance:** about $48.51. |
| C1p | done | docs repo | 2026-10-17: `docs/ask-caboodle/test-page/ask-caboodle-test.html` as in §4 "C1p as built"; tested free against a mock in headless Edge; the owner tried it live and asked for the table or chart after the typed text (built). $0 spent by the build. Parked for later (handoff): more visuals for the wait, pricing defaults, speed and cost improvements, figures only when they help. |
| C1b | done | `f8e56603` | 2026-10-17: D140–D142, and D144 at the short plan (only questions that used the model count); the IAM branch is unchanged since `b5adb1a1`. Built as in §4 "C1b as built": migration `AddAskCaboodleSessionQuestionLimit` applied locally; solution 6,988 green, Intelligence 651, DB tests 48 green, build 0 errors. Test page updated and tested free. **Paid, $0.0003:** nine real titles from Haiku 5.5, 9 of 9 written. At review: Rename stays off during a new conversation's first answer; the title material stays the question plus the headline.<br>**Balance:** about $48.51. |
| C2 | done | `4ff33590` | 2026-10-17: D145–D152 at the short plan; the IAM branch is unchanged since `b5adb1a1`. Built as in §4 "C2 as built" and committed at the owner's request: `GET askcaboodle/suggestions`, 21 starters in `Suggestions/starters.yaml`, filtered by modules and an hourly data check; eval Q60–Q63 (67 cases); no migration. Solution 7,013 green, Intelligence 676, coverage 98.0 % unit-only, DB tests 60 green, build 0 errors. Test page updated and tested free; the owner tried it live ("looking nice"). Nine points beyond the plan's wording are listed in §4 for the owner. **Paid, $0.29 (after the commit):** Q60–Q63 4 of 4, none corrected; Q62 summarized its 1,203 events in $0.15.<br>**Balance:** about $48.22. |
| C3 | done | `31d598a4` | 2026-10-18: D153–D159 at the short plan (11 tokens plus `custom`, the tool plan, the delta, "not loaded yet", personal pins, the nightly check, the viewer's access); the IAM branch is unchanged since `b5adb1a1`. Built as in §4 "C3 as built" and committed at the owner's request: migration `AddAskCaboodlePins` applied locally, `run_sql` periods, five pin endpoints, the nightly job; solution 7,095 green, Intelligence 760, coverage 97.8 % unit-only, DB tests 65 green, build 0 errors. Test page updated and tested free. Ten points beyond the plan's wording in §4. **Paid, $0.37 (eval report `8e689053`):** 7 of 8; the six relative questions took their token; the two named-date questions typed their dates; Q62 listed TPR events only (§7.2).<br>**Balance:** about $47.85. |
| C3 follow-ups | done | `280b39e2` | 2026-10-18, owner: named dates through `custom` (examples in the tool description and the prompt) and Q62 accepting the TPR-only framing (new reference columns: 56 promotions with TPR events, 491 TPR events, 57 EDLP-only; references re-checked free). **Paid, $0.24 (`-Label c3-named-dates`):** Q08 now passes `custom`; Q04 and Q17 still type their dates; Q17 failed on a claims-check misreading of a long table (its figures right; §7.2). Solution green, DB tests 65 green.<br>**Balance:** about $47.61. |
| C4 | done | `40efb441` | 2026-10-18: D160–D164 at the short plan (organization admins review, all three sharing levels now, `{period}`/`{brand}`/text variables, runs and "Verified" on the starters only, one picker call); the IAM branch is unchanged since `b5adb1a1`. At the review the owner widened it (D165–D169): typed fill-ins with values scoped to the brand, the Dates picker, "Make it a fill-in" and "Improve with AI" (Haiku 5.5). Built as in §4 "C4 as built": migration `AddAskCaboodlePrompts` (`20261017213333`) applied locally (`Down` checked), seven prompt endpoints and `GET picker`, `promptId` on the ask; solution 7,198 green, Intelligence 861, coverage 96.9 % unit-only, DB tests 77 green, Release build 0 errors. Test page updated and tested free (13 scenarios). Fourteen points beyond the plan's wording in §4. Committed at the owner's request. $0 spent; the paid improve check (about $0.001–0.002) not run yet.<br>**Balance:** about $47.61. |
| C5a | done | `4ee2a349` | 2026-10-18: D170–D176 at the short plan (C5a now and C5b later; the starters verified and everything else proposed; the 100-question draft for Constance, with no paid run yet; exact names, 2 examples, the threshold set free; platform admins verify, prompts from a run; C4's slot types; broken or changed examples out of use; suggestions from the library). The IAM branch is unchanged since `b5adb1a1`. Built as in §4 "C5a as built": migration `AddAskCaboodleExamples` (`20261018111702`) applied locally (`Down` checked); 11 admin routes; the seed from the eval reports (45 in the library: 21 starters verified, 24 proposals); the `<verified_examples>` block; the nightly job. Solution 7,283 green, Intelligence 946, DB tests 80 green, Release build 0 errors. Test page updated and tested free (10 scenarios). Thirteen points beyond the plan's wording in §4. After the owner's first look: seeded proposals show their passing run's answer, and the test page leads with it. **Paid, $1.02 (eval reports `7477212d`):** 8 cases with a verified example 5 of 8 ($0.49); after the product and alias fixes and four proposals verified by Claude for the owner, promotions 4 of 5 ($0.29) and repeated questions 4 of 5 ($0.24); 13 of 18 against 17 of 18 without, every figure right, failures one sentence each. **Examples in the question off (D177);** the rest of C5a stays. Committed at the owner's request.<br>**Balance:** about $46.59. |
| C5b | deferred | | Short-circuit, verified follow-ups, starters filled with the brand's own values (D170). Deferred by the owner (D178), to come back as an improved version. |
| C6 | done | `e36c6734` | 2026-10-18 (eval reports `66702182`; committed at the owner's request on 2026-10-19, with Q69 accepted for now and the "data this brand has" line as a to-do, §7.2): D179–D185 at the short plan (search only; `web_search_20260318` direct; a "Search the web" switch per conversation for platform admins, with a platform setting; 3 searches, US; the query rule and check; strict web figures; the eval's new cases). Built as in §4 "C6 as built": migration `AddAskCaboodleWebSearch` (`20261018161933`) applied locally (`Down` checked). Solution 7,308 green, Intelligence 971, DB tests 80 green, Release build 0 errors. Test page updated and tested free (7 scenarios; the earlier drivers unchanged). Eleven points beyond the plan's wording in §4. **Paid, $1.42:** smoke $0.17 (search, sources and a restored follow-up all right); 9-case check 7 of 9 ($0.75), every rule check passed; Q69 and Q66 failed the claims check. Follow-ups at the owner's request ($0.34 + $0.16): web figures backed only by the answer's own passages (Q26, Q66 passed); for Q69, a sentence in `suggest_web_search` (0 of 2), then the general refusal rule (the other refusals unchanged, Q69 0 of 2 again); next options in §7.2.<br>**Balance:** about $45.17. |
| C6.1 | done | `ed309b8c` | 2026-10-19 (eval reports `714ba095`), "data this brand has", built before C7 (D186); the IAM branch is unchanged since `b5adb1a1` (fetched 2026-10-19). Built as in §4 "C6.1": each question on a brand carries one line from C2's hourly checks plus two SPINS checks (their own query), skipped by the fact check and read by the claims check. At review the owner set out what SPINS is (D188): the glossary entry, Item Ranking before web search for category and market questions, "nationally" = TOTAL US, trimmed market names, Q70–Q71 (Rise & Puff, 75 cases); Q28 takes the line as its check (D187). No migration. Solution 7,321 green, Intelligence 984, DB tests 81 green, Release build 0 errors. DI15 and DI16 recorded. **Paid, $0.53:** refuse group 3 of 5 and Q69 2 of 2 ($0.15); SPINS check 4 of 5 ($0.38), Q71 from the right data but with a filtered total and two pattern claims (§7.2). C7's decisions were taken in the same session (D189–D195).<br>**Balance:** about $44.64. |
| C7 | done | `5f650db6` | 2026-10-19 (eval report `f19df64d`; committed at the owner's request): D189–D195 at the short plan, D196 after the owner's live test (the server works out the offer), D197 (top-selling options on the to-do list, §7.2). The IAM branch is unchanged since `b5adb1a1` (fetched 2026-10-19). Built as in §4 "C7 as built": migration `AddAskCaboodleEntityAliases` (`20261018222530`) applied locally (`Down` checked), three alias endpoints, saved names in the name search, the offer, Q72–Q74 (78 cases). Solution 7,353 green, Intelligence 1,016, DB tests 83 green, Release build 0 errors. Test page updated and tested free (7 scenarios). Nine points beyond the plan's wording in §4. **Paid, $0.41:** 5 of 7; Q72 and Q73 used the saved names, Q74 asked and every option offered to save "Fresh"; Q14 answered without asking, Q15 as since C0. The owner's live tries cost $0.32.<br>**Balance:** about $43.91. |
| C8 | done | `e4fbdd34` | 2026-10-19: D198–D202 at the short plan; the IAM branch is unchanged since `b5adb1a1` (fetched 2026-10-19). Built as in §4 "C8 as built": migration `AddAskCaboodleFlightRecorder` (`20261019083851`) applied locally (`Down` checked), the Flight recorder's figures, the eval summary shipped with the code (45 runs), the to-fix list and its decisions, five admin endpoints. Solution 7,371 green, Intelligence 1,034, DB tests 84 green, Release build 0 errors. Test page updated and tested free (8 scenarios; the earlier drivers unchanged). Ten points beyond the plan's wording in §4. Committed at the owner's request. $0 spent.<br>**Balance:** about $43.91. |
| C9 | done (part 1) | `b481988e` | 2026-10-19 (eval report `42f00437`; committed at the owner's request, before the re-check): D203–D209 at the short plan (the owner added how a product connects to banners, retailers and distributors); the IAM branch is unchanged since `b5adb1a1` (fetched 2026-10-19). Built as in §4 "C9 as built": 65 guide entries in 9 topics (all drafts), `search_guide`, the server's "Caboodle guide (not yet reviewed)" note, `GET askcaboodleadmin/guide`, the drift check, Constance's three review documents, the counted Concepts group (84 cases); no migration. Solution 7,447 green, Intelligence 1,110, DB tests 84 green, Release build 0 errors and no new warnings. Test page updated and tested free (7 scenarios; earlier drivers unchanged). **Paid, $0.48:** Q01, Q10 passed; Concepts 4 of 9 (three right answers framed as `cannot_answer`, one "since you're a platform admin", and two eval faults, one of them since C3); free fixes made, re-check (about $0.45) waiting for the owner. Findings for the owner in §7.2: the catalog lines the code contradicts (the store count first), net revenue's allowances, the app-team list.<br>**Balance:** about $43.43. |
| C9 part 2 | todo | | How-to steps in the guide, after the FE rework, from the reworked screens; Constance reviews them too. |
| Admin manual | todo | | A Platform Admin user manual (owner, 2026-10-18): every admin screen (settings and budgets, usage, verified examples, prompt review, pins, the Flight recorder), in plain words with screenshots. Written after the final UI is built (§10.10), alongside C9 and before go-live; Constance reviews it. |
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
| Promotion fee tables | `TradeSpend.BrandApprovedPromotionFees`, `TradeSpendSandbox.PromotionFees` | Calculator inputs. Totals since B5, and every fee line since B9 (name, type, where it applies, coupon dates, settings, amount), come from `get_promotion_performance` (`breakdown: "fee"`), so they match the Promotion Details screens. | Not granted; read only through the app's calculator | **Never** as SQL (D77); the lines are answered through the calculator since B9 |
| Retailer-level distributor and markup | `CRM.DistributorRetailers` | Not how Caboodle links distributors: which distributor serves which retailer, and the one markup, come from `CRM.DistributorBanners` through the banners (D113) | Not granted | **Never** (D113) |
| Raw distributor files | `DataUpload.KeHeRecords`, `UnfiRecords`, `KeHeMappedRecords`, `UNFIMappedRecords`, `DataMappings` | Already normalized into `DistributorSalesRecords`. The raw-only fields (KeHE prior-year quantity, UNFI published wholesale) are rarely asked about. | **Since B10b:** the four KeHE/UNFI tables granted to `askcaboodle_admin_ro` only and catalogued with `audience: platform-admin` (shipments still come from distributor sales); `DataMappings` (legacy) granted to neither | **Platform admins since B10b** (D126); **on request** for everyone else; `DataMappings` **on request** |
| Legacy SPINS format | `DataUpload.SpinsRecords` | Superseded by Stores Insight and Item Ranking; only DataHub cleanup still references it | Not granted | **Never** |
| Banner activity types | `CRM.BannerActivityTypes`, `BannerActivities.BannerActivityTypeID` | Never populated or read by the app | Not catalogued | **On request**, if the app starts recording types |
| Documents | `FileRepository.*` | Files, not data | Not granted | **Never** |
| Credentials | `Identity.UserTokens`, `UserLogins`, `UserClaims`, `VerificationCodes`; the password hash, stamps, refresh tokens and email codes in `Identity.Users`; invitation and share-link tokens; `DataHub.ThirdPartyCredentials` | Secrets | Granted to neither login. Since B10a, a DB test scans every column each role can read and fails on a secret-like or personal one. | **Never** |
| File locations and links | `DataHub.ImportJobs` and `ExportJobs` S3 keys, upload ids and part lists; `DataSyncRuns."SourceFileS3URL"` (a signed link) and `"SourceFileHash"` | Where files are stored, and links that open them | Column grants: hidden from `askcaboodle_admin_ro` too (B10b, D127) | **Never** |
| Users, organizations, roles, access, modules and settings, audit, email logs, purge runs | The `Identity` (minus credentials), `Organization`, `Configuration`, `Auditing`, `Email` and `DataLifecycle` schemas; `Brand.BrandBrokers`, `Brand.BrandSubUsers`; `Broker.BrandReportEmailLogs`, `CategoryReviewEmailLoggers` | Security and IAM data | **Since B10a:** granted to `askcaboodle_admin_ro` only (38 tables, 13 by column) and catalogued with `audience: platform-admin`; the standard login and catalog never see them | **Platform admins only, since B10a** (D75): no credentials; no email addresses, login names, phones, IPs or profile photos before G8 (D72, D121); email-log metadata only (D74); the backfill report hidden (it lists email addresses). **Never** for organization users. |
| Ask Caboodle's own records | The `Intelligence` schema | Other users' questions and transcripts | Not granted to either login; the guard rejects the schema | **Never** (D73). Usage counts come from the B8b report. |
| Background jobs and system tables | `hangfire`, `public` | Infrastructure | Not granted; since B10a the guard rejects both schemas on either login | **Never** |

### 9.2 Not included yet (business data)

| Tables | What they hold | Plan |
|---|---|---|
| `DataHub.DistributorUpcMappings` | Distributor items ↔ Caboodle products, with match status | **Done in B10b:** platform admins only, without `ResolutionNotes`, `ResolvedBy` (D109) and the audit user columns |
| `Broker.PromoTabs`, `PromoTabColumns`, `PromoTabRows`, `PromoTabCells` | A brokerage's own Promo Tabs spreadsheets | **G3**, broker audience only, with each brokerage seeing only its own |
| `Broker.CategoryReviewCalenderDateAssignments`, `BrandReportStatusSettings` | Calendar date assignments and status settings | **On request** (low question value) |
| `Broker.BrandReportEmailLogs`, `CategoryReviewEmailLoggers` | Notification email logs | **Done in B10a:** metadata only, for platform admins (D74); see 9.1 |
| `CRM.PipelineActivityFiles` | Attachments on pipeline activities | **Never** (files) |
| `CRM.DistributionCenters` | Warehouse names | **Never:** replaced by `CRM.DistributorDcs` (the grant was revoked in B4) |
| The DataHub import, sync, mapping and data-quality tables: `ImportJobs`, `ExportJobs`, `DataSyncRuns`, `Unmapped*`, `StoreListIssues`, `StoreMergeHistories`, `StoreCleanupChangeLogs`, `DistributorCustomerLinks`, `AddressReferences`, `BrandDataCleanupJobs`, `UnmappedRecordResolutionAudits` | The import pipeline's internals | **Done in B10b:** platform admins only (file locations hidden, D127). `UnifiedEntities` and `UnifiedEntityAliases` are already read by the name search (approved aliases only). |
| `DataHub.MappingSuggestions` | Retailer candidates the sync proposed for unmapped values | **On request** (D126): never acted on, and the Unmapped Data screen computes its suggestions live, so answers from it would disagree with the screen |
| `DataHub.AliasAuditTrail`, `AliasMatchAttempts` | Alias status changes and match attempts | **On request** (D126): 0 rows, no live writer |

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
| Prompt gallery and the `/` picker | Everyone; Pending review for organization admins | `GET prompts`, `POST`/`PUT`/`DELETE prompts`, `POST prompts/{id}/review`, `GET prompts/values`, `POST prompts/improve`, `GET picker` (C4); IAM `GET members` for sharing |
| Pinned reports | Everyone | C3 |
| "Questions left today" indicator | Everyone | `done.questionsLeftToday` (B8), `GET askcaboodle/usage` (B8b) |
| Organization usage (by member, % of the allowance from 50 %) | Organization admins | `GET askcaboodle/organization-usage` (B8b) |
| Platform settings, usage report, budgets | Platform admins (separate settings page) | `askcaboodleadmin/*` (B8b) and `modulesettings` |
| Flight recorder | Platform admins | `GET askcaboodleadmin/flight-recorder`, `eval-runs`, `triage`, `GET`/`PUT triage/{messageId}` (C8) |
| Scope chip ("Northpoint · 4 connected brands") | Everyone | IAM `GET me/access` |

### 10.5 How an answer renders (C0)
The full contract is in BE `docs/AskCaboodle-FE.md`, "The answer pieces".
- **The frame comes from `kind`:** `answer`, `clarify` (option cards) or `cannot_answer` (the "not answerable" box with "needed" and "available", and possibly a table of what is available). Treat an unknown kind as `answer`.
- **The order is fixed:** headline → notes → text → data → options → suggestions → actions. A piece that is missing is simply not shown.
- **Reveal timing (owner, C1p):** the `data` event arrives with the frame, 2–3 s before the text. Show the headline and notes at once, a "writing" placeholder until the first sentence, and the data block, options, suggestions and actions only after the text has been typed (fade in, chart bars growing). Feels smoother than the table first; tried on the C1p page.
- **A new `frame` event replaces everything** shown for that answer so far (frame, table, suggestions), because the agent may correct itself (D84).
- **Figures shown as facts come from the server:** the headline's `display`, the table's `totals` and its highlighted `rows`. The FE only draws visual aids from the rows (D71).
- **Figures in the text are checked before it is sent (C0b):** a figure that still can't be matched to the data is listed in `text.unverifiedFigures`, and the FE shows the note under the text (BE `docs/AskCaboodle-FE.md`, "Checked figures").
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
  | `session_full` | The conversation has used its 20 questions (C1b): "Start a new conversation" with the question copied over |
  | `rate_limited` / `service_busy` | Try again in a minute |
  | `timed_out` | Ask a narrower question |
  | `unavailable`, `refused`, `failed` | — |

- **Statuses in history:** `step-limit`, `cancelled` (stopped), `timed-out` and the other statuses from BE `docs/AskCaboodle-FE.md`.
- **Data:** truncated data ("showing the first 500 rows") and a result that can't be charted (no Table/Chart switch).
- **Checked figures (C0b):** the note under the text when `unverifiedFigures` isn't empty; the "Correcting figures…" progress step.
- **Progress:** progress labels during a run, the stopped state, the chosen option after a clarify, and feedback sent.
- **Usage:** the stopped month ("used this month's allowance, renews on …"), and the organization admin's "X % used" from 50 %.

### 10.7 Role rules for the FE
- **Organization users never see dollars or the model.** The API already leaves them out; the FE must not show empty slots for them.
- **Admin-only screens** (Flight recorder, the Platform Admin's settings, usage and budgets) are hidden unless the user is a platform admin.
- **No extra FE checks for what users may ask about.** The backend decides what each role can read (D75): platform admins can ask about the whole system except credentials, and everyone else only about what their access allows. The FE shows the answers as usual.
- **The run trace's SQL and schema detail (D138, built in C1):** organization users get labels, tools, timings, row counts and matched names; SQL, tables, catalog text, Postgres errors and `done.queries` arrive only for platform admins. The FE shows what arrives.

### 10.8 FE impact by package
| Package | What the FE gets or must handle |
|---|---|
| B3 | Saved sessions, history, feedback; the `session` event |
| B5 | Calculator progress labels ("Calculating 2 approved promotions"); promotion tables |
| B8 | `error.code`, `resetsAt`, `questionsLeftToday` in `done`; tokens for everyone, while $ and the model are for platform admins only (`done` and history) |
| B8b | `GET askcaboodle/usage`, `GET askcaboodle/organization-usage`, `askcaboodleadmin/settings`, `usage`, `budgets` |
| B9 | Fee lines in promotion answers: a normal data block, one row per fee (promotion, version, fee, kind, banners, products, events, coupon start and end as dates, settings, amount in usd); markup, region and distributor answers. No new FE pieces. |
| B10 | No FE change; platform admins get wider answers (organizations, users, modules; since B10b also imports, syncs, unmapped rows, store-list issues, merges and clean-ups, and the raw distributor files) |
| C0 | The `frame` event (kind, headline, notes, options) and its replace rule; the data block's series, formats, totals, highlights and `chartable`; the same pieces in `GET sessions/{id}`; the feedback `reason` (down only) and `feedbackReason` in history |
| C0b | `text.unverifiedFigures` (and `unverifiedFigures` in `GET sessions/{id}`): when not empty, the note "Some figures in this answer couldn't be checked against the data: …" right under the text (rare). A corrected answer takes a few seconds longer, shows the progress label "Correcting figures that didn't match the data", and may send a new `frame`/`data` that replaces the earlier one |
| C1 | Streamed text as checked sentences that the FE types out word by word (D96; see the streaming demo): `text-sentence {index, text}` (markdown slices that join into the text) and `text-rewind {keep}` (drop what follows `keep` when a corrected answer differs, or on a refusal), with the "rewriting" pause when a figure fails; the final `text` stays authoritative (D133–D135). Live trace events `step`, `tool-start`, `tool-end` (parallel calls share a step; `selfCorrection`), the trace endpoint `GET sessions/{id}/messages/{messageId}/trace`, `maxSteps` and `wallClockSeconds` on `session`. Organization users' trace has no database detail; `done.queries` only for platform admins (D136, D138) |
| C1b | The `session_full` error (at 20 questions that used the model, D140, D144) with "Start a new conversation" (the FE pre-fills the question); questions left in the conversation (`session.questionsLeft`, `GET sessions/{id}`), shown near the end; the generated title in a second `session` event about a second after `done` (keep reading until the stream closes, free the composer at `done`), updated in the header and history; rename (`PATCH sessions/{id}`), kept off during a new conversation's first answer (it is saved when that answer ends). Tried on the C1p page |
| C2 | `GET askcaboodle/suggestions` for the empty state: `{ starters: [{ id, text, topic }] }` in the order to show. Show the first four (they cover four topics) with the topic as a tag; the rest behind "more", and from C4 in the `/` picker. Fetch for each new conversation and brand change and ignore a reply for an earlier brand; hide the block when the list is empty or the call fails. Clicking a starter asks its text in a new conversation with the same `BrandID`. Free; not the answer's follow-up `suggestions`. Tried on the C1p page |
| C3 | Pinned reports (BE `docs/AskCaboodle-FE.md`, "Pinned reports"): a Pin action on answers of kind `answer` with a table or headline, once the stream has closed (title, period: a token or "fixed"); the pins page or board: `GET pins` (by brand), each card rendered with `GET pins/{id}/render` in the answer's own components (headline, notes, data block); the change against the previous period ("−4.6 % vs Aug 2026", or "+6.1 pts" for a percent, with the compared spans when the data stops early); the "not loaded yet" note (no figures when nothing in the period is loaded, never 0); a `problem` with Refresh; broken pins with their reason and "Re-ask to repair" (a new conversation from the pin's question); the period switch from `periodChoices` (empty: "its own dates"), rename, delete; status and "checked" from the nightly job. Personal pins only (D157). No AI call, nothing counted. Tried on the C1p page |
| C4 | The prompt gallery (BE `docs/AskCaboodle-FE.md`, "Prompt gallery"): `GET prompts` gives the tabs in one call (Organization with the starters under "Suggested by Caboodle", all "Verified"; Mine; Shared with me; Pending review when `canReview`). Cards draw each fill-in as a pill named by its `label`: a select of `choices` (a period's `detail` dates next to its label), a search box from `GET prompts/values` when `search`, two date inputs for a `range`, or a text input when `freeText`, starting on `default`. Run fills each with its choice's `text` (words, not tokens or ids), the picked value's name or the dates in words, and asks it in a new conversation with `promptId` (a `{brand}` choice becomes the `BrandID`); a missing value is asked for first. The New/Edit form (D168): title, text with "+ Insert fill-in" (also on `{`) and "Make selection a fill-in" (`GET prompts/values` without a type gives the candidates), the hint for a value written as a name (`{ABSCO}`), one card per fill-in (type, label, a default found by search, any value or the author's list, period choices, the dates format; `{brand}` takes none), a live preview of what runners see, "Improve with AI" (`POST prompts/improve`: before and after, Use this / Keep mine, never silent; suggested words with "Make it a fill-in"; 409 at 30 a day or when the allowance has stopped), who can use it (organization and people only inside an organization; an admin editing the organization's prompt can't change it), people from IAM's members search. Values outside the brand's own data are marked "not in this brand's data". Review: Approve, or Reject with a note shown to the author; `review` and `reviewNote` on the card. The composer's `/` picker from `GET picker` (starters first, then prompts, each once), filtered as the person types, ↑ ↓ Enter Esc, the first unfilled `{name}` selected after insert; send `promptId` with a question inserted from a prompt. The new error `prompt_unavailable`: keep the question and offer to send it without the prompt. No AI call until a prompt is run. Tried on the C1p page |
| C5a | Verified examples (BE `docs/AskCaboodle-FE.md`, "Verified examples"), for platform admins only. The examples in the question are off by default (D177), so `done.examples` is empty; the library screens are still needed for the suggested questions and verified prompts:<br>**The examples panel:**<ul><li>tabs by status (proposed, verified, broken, review again, rejected) with counts, from `GET examples?filter=`;</li><li>the detail: the calls as the model reads them, the slots, how it was shown, the leftovers (which keep the scope at its brand), the source answer, and the broken reason or "the catalog changed";</li><li>edit the template within its fill-ins, the scope, and the starter topic and data checks (each refusal is one sentence);</li><li>Verify with an optional note (400 with the reason when its calls don't run), Reject with a note, Re-check now, Delete;</li><li>"Similar examples" for any question (`GET examples/similar`).</li></ul>**Elsewhere:**<ul><li>"Propose as example" under a platform admin's answers, next to Pin;</li><li>`done.examples` and history `examples` (`{ id, score, template }`) in the trace;</li><li>on approved organization prompts, "Verify from a run" (`GET prompts/{id}/runs`, `POST`/`DELETE prompts/{id}/verify`) and the "Verified" badge from `verified` on the prompt and picker items.</li></ul>`GET suggestions` is unchanged. No AI call. Tried on the C1p page |
| C6 | Web search (BE `docs/AskCaboodle-FE.md`, "Web search"), for platform admins until GA:<ul><li>a "Search the web" switch for a new conversation only (send `webSearch: true` with its first question), hidden once `session` arrives, and "Web search on" from `session.webSearch` and history;</li><li>for `public_web` and `mixed` answers (`done.sourceType`, history), a fixed banner from the source type and, under the text, the `sources` event's pages (title as a link, new tab, with the cited passages);</li><li>a mixed answer's two parts, "From your Caboodle data" and "From public web sources";</li><li>"Search the web for this" when `frame.suggestWebSearch` (it asks again in a new web conversation);</li><li>`web_search_unavailable`: keep the question and offer to send it without web search;</li><li>searches in the trace (`tool: "web_search"`, "results" not "rows", the pages' titles);</li><li>no Pin or "Propose as example" on web answers;</li><li>the platform switch `webSearch` on the settings page.</li></ul>A web question costs more (about $0.01 a search plus the pages read). Tried on the C1p page |
| C6.1 | No FE change. Answers about SPINS and refusals read better: they name only data the brand has, and category and market questions are answered from SPINS Item Ranking when the brand has it |
| C7 | "Remember this name for your organization?" after a clarify (D189–D196): the option's `remember` (set by the server), `POST aliases {sessionId, messageId, option}`, a "Saved names" list with remove (and "Add a name" for admins, with C4's values lookup), "for every organization" for a platform admin without one, and the saved name in the trace (`matches[].savedName`) |
| C8 | The Flight recorder, for platform admins (BE `docs/AskCaboodle-FE.md`, "Flight recorder (C8)"): a period (this month by default, quick ranges) and an optional organization; stat tiles (questions, cost per question with the middle and the priciest 5 %, the wait, thumbs up, caught by the fact check, "can't answer" with the eval's refusal result, asked back, no answer, the cache share); two small day charts, questions and spend (never one chart with two axes), with the days as a table; the to-fix counts; the eval card (the latest full run, "same as now", "changed since" or "not recorded", the model when it differs, the checks since, the failed cases); the to-fix list (Open, Fixed, No fix needed, All; reason labels; the answer as the user saw it first, the conversation, the decision with its note, eval case and the case's latest result, the trace folded under "Technical details"); every test run with its failed cases. Keep it simple (§10.10). No AI call. Tried on the C1p page |
| C9 | Guide answers (BE `docs/AskCaboodle-FE.md`, "Caboodle guide (C9)"): normal answers whose `notes.source` says "Caboodle guide", or "Caboodle guide (not yet reviewed)" for drafts (show the part in brackets as a small marker; platform admins only see drafts, D206); the trace's `search_guide` call ("Reading the Caboodle guide: …") with `matches` of type "guide entry", counted as entries, not rows. Optional: a platform admins' guide screen from `GET askcaboodleadmin/guide` (each entry as the AI reads it, its status and Constance's question first, its sources folded, §10.10). Steps in the app stay "can't explain the steps yet" until part 2; later, optional "Open screen" links (an additive C0 piece). Tried on the C1p page |
| G2–G3 | Organization users can ask; brand and broker scope; the `BrandID` header, and cross-brand use for brokers |

### 10.9 Open FE questions (for the FE team)
- Where the organization admin's usage page and the "questions left today" indicator sit.
- How a broker's cross-brand scope is shown and switched (G3).
- The phone layout: the artifact has a top bar and a drawer for narrow screens.

### 10.10 Keep the admin screens simple (owner, 2026-10-18)

The owner found C5's example review and C4's prompt form hard to follow on the C1p test page, and asked that the final UI be much simpler: Constance and other business experts must be able to use them without help. The test page shows every field the API returns, on purpose, so that each one can be tested; the final screens show only what a person needs to decide, and the API already gives what they need (D71). The guidance:
- **Reviewing a verified example** (platform admins):
  - Show the question, the answer as the user saw it (headline, notes, text, the table or chart), and one sentence saying who gets it ("Every brand can get this example", or "Only Bubbies Ice Cream can get this example, because it mentions its own products").
  - Two buttons: "Yes, this is right, use it" and "No, it's wrong".
  - Statuses in plain words: Waiting for review, In use, Needs attention (broken, or the catalog changed), Not used.
  - The reusable wording, fill-ins, calls, tables and "Re-check now" go behind "Technical details". Suggesting it on the empty screen is one toggle with a topic.
  - The C1p page now follows this order, as a model.
- **Creating a prompt** (C4):
  - Start with one box: "Write your question as you'd ask it."
  - Highlight the words that could change ("Sprouts", "last quarter") and ask "Should people be able to change this?", one click each (`GET prompts/values` without a type already gives the candidates).
  - Types, defaults and choices are set automatically; their settings fold under "More options".
  - Sharing is one choice: Just me, My organization, or Specific people. "Improve with AI" stays one button.
- **Everywhere:** a short "What is this?" line on each admin screen, so the manual (below) is rarely needed.
- **A Platform Admin user manual** (§7.2, §8): written once the final UI exists, with its screenshots and labels.

## 11. Deploying to staging and production (tracked)

Owner, 2026-10-16: the database roles, logins and settings Ask Caboodle needs must be tracked, because they are essential when the branch goes to staging and live. Every package that adds a role, login, grant, extension, index or setting updates this list. **Since B10a the full runbook is BE `docs/AskCaboodle-Deployment.md`** (checklist in order, every migration and what it grants, the platform-admin role's tables and hidden columns, both logins and scripts, the settings per environment, check queries, the settings to set in the app, rollback). Keep both up to date: this section is the summary.

**Before the Ask Caboodle migrations run (ops, with a user that can create roles and extensions; D5):**
1. `CREATE EXTENSION IF NOT EXISTS pg_trgm;` (migration `AddAskCaboodleReadOnlyRole` tries it).
2. The group role `askcaboodle_ro` NOLOGIN. The migration creates it when the migration user can; otherwise it raises a NOTICE and skips its GRANT statements.
3. Since B10a: the group role `askcaboodle_admin_ro` NOLOGIN and `GRANT askcaboodle_ro TO askcaboodle_admin_ro` (migration `AddAskCaboodleAdminReadOnlyRole`, same rule; the membership grant has its own NOTICE when the migration user can't grant roles).

**Migrations whose grants are skipped with a NOTICE when the role is missing** (re-run their GRANT statements after creating the role): `AddAskCaboodleReadOnlyRole` (B2), `AddAskCaboodleCatalogGrants` (B4), `AddAskCaboodleCatalogCompletionGrants` (B9), from B10a `AddAskCaboodleAdminReadOnlyRole`, and from B10b `AddAskCaboodleDataPipelineGrants` (17 more tables for `askcaboodle_admin_ro`, 55 in all). The trigram indexes are built `CONCURRENTLY` outside a transaction (B2, B4).

**Logins (created once per environment, password typed in psql and never stored in git):**

| Login | Member of | Script (BE repo) | Settings on the login | Connection string goes to |
|---|---|---|---|---|
| `askcaboodle_app` | `askcaboodle_ro` | `docs/AskCaboodle-ReadOnlyLogin.sql` (B2) | `default_transaction_read_only = on`, `statement_timeout = '15s'` | `IntelligenceSettings:ReadOnlyConnectionString` |
| `askcaboodle_admin_app` (B10a) | `askcaboodle_admin_ro` | `docs/AskCaboodle-AdminReadOnlyLogin.sql` (B10a) | the same | `IntelligenceSettings:AdminReadOnlyConnectionString` |

Run each script with psql as a user that can create roles: `psql -h <host> -U <admin user> -d <database> -f docs/<script>.sql`. psql asks twice for the new password.

**Application settings per environment:**
- `IntelligenceSettings:ClaudeApiKey`: the Claude API key, from a secret store or environment variable, never from a committed settings file;
- `IntelligenceSettings:Model`: `claude-sonnet-5-5` (D45);
- the two connection strings above. Without `AdminReadOnlyConnectionString`, platform admins get the standard login and catalog and every question logs a warning (D119); it never falls back to the main connection. Production has no `IntelligenceSettings` section yet;
- the Ask Caboodle module settings (B8, per organization) and the platform settings (`askcaboodleadmin/settings`): set by the Platform Admin after the deploy.

**Since C3:** migration `AddAskCaboodlePins` (a table, no grants) and the Hangfire recurring job `ask-caboodle-pins-nightly` (03:00 UTC), registered at start-up; check it in the Hangfire dashboard after the first deploy.

**Since C4:** migration `AddAskCaboodlePrompts` (three tables and `AskMessages.PromptID`, no grants). `ImproveModel`/`ImproveSeconds` have working defaults (`claude-haiku-5-5`, 20 s); nothing to set after the deploy.

**Since C5a:** migration `AddAskCaboodleExamples` (a table and two columns, no grants). At start-up one Hangfire job brings the seed into the library; the recurring job `ask-caboodle-examples-nightly` (03:30 UTC) re-checks the verified examples on the read-only logins, with no AI call. Check both in the Hangfire dashboard after the first deploy. `ExamplesPerQuestion`/`ExampleMinimumScore`/`ExampleSearchSeconds` have working defaults (0, so the examples are off by D177; 0.55; 3 s). Retrieval calls `pg_trgm` on the main login. The names lookup reads tables the standard read-only login already has. After the deploy, a platform admin verifies the proposals; nothing but the starters is given until then.

**Since C6:** migration `AddAskCaboodleWebSearch` (two columns, no grants). `WebSearchMaxUses`/`WebSearchCountry` have working defaults (3, `US`). The searches run on Anthropic's side, so **the Anthropic organization must allow web search** (Claude Console, privacy settings) or web conversations fail; the platform setting `webSearch` (on by default) switches it off for new conversations. **Data handling:** only the search queries leave Caboodle, written by the AI from public words by rule (D183), and logged and stored with each answer; the data-handling statement (G8) must mention web search before organization users get it. Each search costs $0.01, priced into the answer and the budgets.

**Since C6.1:** no migration and no setting. Each question on a brand carries a line saying which data the brand has, from C2's hourly checks plus two SPINS checks on the standard read-only login (no new grant). **Remember (owner, 2026-10-19):** the SPINS check reads both SPINS tables whole once an hour, because neither has an index on the brand (0.4 s for local's 1.5 GB). Time it on staging before go-live (BE runbook checklist 6b, query 6). If it's slow, ask the app team for an index on `"DataUpload"."SPINSStoresInsight"("BrandID")`, which is not Ask Caboodle code.

**Since C7:** migration `AddAskCaboodleEntityAliases` (a table and its unique index, written in SQL; no grants). Nothing to set. Saved names are read on the main login; their entities are found by id in tables each read-only login already has. The purge removes deleted names after the `Intelligence` retention (D14).

**Since C9:** no migration, no grant and nothing to set. The guide ships with the code (`Guide/guide.yaml`, embedded); drafts reach platform admins only, so organization users (after G2) see only the entries Constance approved. The prompt and tools changed, so the first question after the deploy writes the hourly cache again (about $0.06).

**Found on 2026-10-16 (not Ask Caboodle code):** `caboodle/src/Hosts/API/appsettings.Staging.json` and `appsettings.Development.json` hold a Claude API key in plain text. They have been committed since `cf92952e` (4 Mar 2026), and the commit is on `master`, `develop`, `staging` and about 100 other branches on Bitbucket. The owner decides how to rotate the key and move it to a secret store; Ask Caboodle only reads `IntelligenceSettings:ClaudeApiKey`. **Also found 2026-10-17:** the same `appsettings.Development.json` holds a Google Geocoding API key (`Geocoding:ApiKey`) in plain text; rotate it with the Claude key.

**Release flow (owner):** dev goes live, then IAM, then dev is merged into the Ask branch, and Ask Caboodle merges last. Ask Caboodle's migrations are regenerated against the final dev snapshot before the PR.
