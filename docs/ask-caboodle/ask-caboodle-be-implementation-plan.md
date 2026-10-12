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

**Starter prompt for the new session:**
> Read `docs/ask-caboodle/ask-caboodle-be-implementation-plan.md` and `docs/ask-caboodle/ask-caboodle-design.md` in `D:\Fork\Onboarding-Journey`. The backend is `D:\Fork\Caboodle BE Repository\caboodle.backend`, branch `feature/ask-caboodle`. Start with package B0 and follow §0 of the plan.

---

## 1. Current state (as of 2026-10-11)

### 1.1 Repository and branch

| Item | Value |
|---|---|
| BE repo | `D:\Fork\Caboodle BE Repository\caboodle.backend` (.NET 6, C# 10, Postgres, EF Core 6, MediatR, Hangfire) |
| Branch | `feature/ask-caboodle` — local only, not pushed |
| Base | `origin/feature/CS-1770-iam-service-product-spec` @ `cba9c60d` (CS-1770 IAM foundation + latest `develop` + the IAM module work) |
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

### B5 — `get_promotion_performance` (calculator figures)
- Tier-3 tool wrapping the same code the screens use (`TradeSpendDTOBuilder` / `PromotionDTOBuilder`, `Modules.Shared.Application/TradeSpendCalculation`). Needs a brand-explicit entry point (the builder reads `ICurrentUser.GetBrandID()` today) — add an overload taking `brandId`, no behavior change for existing callers.
- Input: promotion ids (list), `brandId`, `detail` (summary | by-month); output: planned promo/non-promo cases & revenue, TPR spend, fees, TPR % — summary only.
- Reconciliation test: tool output equals the Promotion Details numbers for 3 seeded promotions.
- Catalog: replace "you cannot calculate them" rule with the tool.
- **Done when:** questions like "what's the planned TPR spend of our spring Sprouts promotion" match the app.

### B6 — Golden eval set + harness
- `caboodle/tests/Intelligence.Application.Test/Eval/golden.yaml`: 25–30 questions across categories — sales totals/trends, retailer/banner/product filters, misspellings, relative dates (Q2, last quarter, YTD), metrics (stores, POD, velocity), plan vs actual, promotions listing, calculator figures (B5), ambiguity → clarification, unanswerable → honest refusal.
- Each case: question, brand, **reference SQL** (ground truth computed live on `caboodle_dev`), expected key numbers with tolerance, expected behavior (answer | clarify | refuse), required entity mention.
- Harness (opt-in like the live test): runs every case, deterministic scoring (numbers present within tolerance, behavior matches), records steps, latency, tokens, cost; writes `docs/ask-caboodle/eval-results/<date>-<config>.md`.
- Cost per full run ≈ 30 × $0.08–0.12 ≈ $3 on Opus — **approval per run**.
- **Done when:** baseline report committed (current config).

### B7 — Model / effort tuning (cost L6, L7) — eval-gated
- Run the eval matrix (owner approves budget, ≈ $8–12 total): Opus 5.5 {medium, low}, Sonnet 5.5 {high, medium}, optionally Haiku 5.5 {medium}.
- Pick the cheapest config whose pass rate ≥ baseline overall **and** in every category; present the table to the owner; owner decides; set `IntelligenceSettings:Model/Effort`.
- Note: switching model starts fresh conversations (thinking blocks are model-bound) — fine because sessions are per question flow.
- **Done when:** decision recorded here + config updated.

### B8 — Guardrails
- Per-user daily question cap (`IntelligenceSettings:DailyQuestionLimit`), one concurrent question per session (already gated), per-org monthly budget hook (log + warn), cost per turn persisted (B3). Rate-limit → friendly `error` event.
- **Done when:** caps enforced with tests.

---

## 4. Phase 1c — Experience layer (still admin-only)

### C1 — Token streaming
- `AnthropicConversation.SendStreamingAsync` using `client.Beta.Messages.CreateStreaming`: accumulate content blocks (text deltas, thinking deltas + signature deltas, tool_use input JSON deltas, server-tool blocks), rebuild the assistant message for the append-only history, stream **text deltas** to the sink as `text-delta` events; final `text` event keeps the full markdown for clients that don't stream.
- Optional: `thinking.display: "updates"` (beta `thinking-display-updates-2026-08-18`) → short progress notes as `progress` events.
- Tests: stubbed SSE HTTP responses (text-only turn, tool-use turn, thinking with signature).
- FE contract update.

### C2 — Suggested questions (empty state)
- `GET suggestions` → curated starters (static YAML per org type, later from the gallery/eval set). Zero LLM cost.

### C3 — Pinned live reports
- Relative periods: add optional `period` argument to `run_sql` (`last-full-month`, `last-full-quarter`, `ytd`, `last-12-months`, `custom`) — backend resolves to `@period_start/@period_end` parameters (inclusive/exclusive), the model writes SQL with those parameters for relative questions (system prompt rule). Stored plans then stay live.
- Entities: `PinnedReport { OwnerId, OrganizationId?, BrandId?, Title, Question, Sql, PeriodToken?, VizSpecJson, CatalogVersion, Status (active | broken), LastValidatedOn }`.
- Endpoints: `POST pins` (from a `data` result id — server keeps the SQL; re-validated by `SqlGuard`), `GET pins`, `GET pins/{id}/render` (re-executes SQL with the current period; **no LLM call**), `DELETE pins/{id}`.
- Hangfire recurring job (registrar pattern) re-validates all pins nightly; failures flag `broken`.
- Web-research and analysis answers are not pinnable.

### C4 — Prompt gallery
- `Prompt { OwnerId, OrganizationId, Visibility (private | organization | shared), Title, Text, VariablesJson }`, `PromptShare { PromptId, UserId }`; CRUD + share endpoints; variables (`{brand}`, `{period}`) resolved via entity search / period tokens; seeded starter prompts per org type (from eval-verified questions).

### C5 — Verified examples (few-shot) and short-circuit
- `VerifiedExample { NormalizedQuestion, Sql/ToolPlanJson, CatalogVersion, Source (thumbs-up | eval), BrandScope }`; entries only from thumbs-up (B3) or eval passes (B6).
- Retrieval with `pg_trgm` similarity + full-text on the normalized question (entity names replaced by type placeholders); top 2–3 injected into the **user** message (keeps the system prefix cached).
- Phase 2 of C5 (eval-gated): strict short-circuit for near-identical questions with identical re-resolved entities — re-run stored SQL, one short answer call.
- Invalidate on catalog version change (drift).

### C6 — Public web research
- Server tools `web_search_20260209` (+ `web_fetch_20260209`), `max_uses` 3, `user_location` US; declared at session start only when `IntelligenceSettings:EnableWebSearch` (later per-org setting) — never toggled mid-session (append-only).
- History conversion must handle `server_tool_use`, `web_search_tool_result`, `web_fetch_tool_result` blocks and `pause_turn` (resend to continue).
- Detect web results → `sourceType` = `public_web` | `mixed` in `done`; new `sources` event (url, title, cited text); system prompt rules: web only for market/industry questions, no Caboodle figures in queries, cite everything, split mixed answers.
- Audit web queries + URLs; excluded from pins and verified examples.

### C7 — Learned entity aliases
- `EntityAlias { OrganizationId?, EntityType, EntityId, Alias, Status, CreatedBy }`; `GET/POST/DELETE aliases`; offered after a confirmed disambiguation ("remember WFM for your organization?"); included in `search_entity` (match source `alias`). Never writes `DataHub.UnifiedEntityAlias`.

### C8 — Cost & quality dashboard data
- Admin endpoints aggregating audit tables: questions/day, cost per question (p50/p95), steps, cache-hit ratio, thumbs ratio, error/refusal rate, latest eval pass rate, top failing questions.

---

## 5. GA — Brand + Broker versions

Prerequisites already met: IAM foundation + module work on the branch base; staging aligned with production (PG 15, `security_invoker`).

### G1 — Module catalog seed
- Brand audience: add Ask Caboodle `OptionalDataSource` deps `distributor-sales-report`, `spins`, `kehe`, `unfi`, `monthly-report` (design Q13).
- Broker audience: add the `ask-caboodle` node to `BrokerRoots` with `OptionalDataSource` deps on the broker-audience data-source modules **that IAM defines** (today: product-spec, retailers, regions, distributors, approved-promotions, trade-spend-sandbox, market-overview, category-review, distributor-apl). Only the Ask Caboodle entries are added; other modules are IAM's (D6).

### G2 — Endpoint guard switch
- Replace the phase-1 `MustHavePermission` with `[RequireModule(ModuleSlugs.AskCaboodle, ModuleSlugs.AskCaboodle, ModuleActions.View, CrossBrand = true)]` on every action; owner checks on sessions/pins/prompts (`DemandBrandAsync`, owner id).
- API.Test reflection test stays green.

### G3 — Agent access context
- Build `AgentAccessContext { Audience, OrganizationId, BrandAllowlist (BrandsWith(ask-caboodle, View)), BrandModules (brand → slugs from Brands[brandId].Modules), ActiveBrandId? }` per request from `IAccessContext.GetCurrentAsync()`.
- Pass entitlements (allowed brands with names, allowed tables) in the **first user message** — the system prompt stays identical for everyone (cost L3).
- Catalog tables carry `module:` (B4); `get_table_info` refuses non-entitled tables.

### G4 — Row-level security (the real boundary)
- Migration: RLS policies `TO askcaboodle_ro` only (app unaffected) on every brand-keyed catalog table: `"BrandID" = ANY(string_to_array(current_setting('app.allowed_brand_ids', true), ',')::uuid[])` plus module gating via `app.allowed_brand_modules` (brand:slug pairs) per table module; brokerage-owned tables: `"BrokerageOrganizationID" = current_setting('app.organization_id', true)::uuid`. Shared reference tables: no RLS. Tier-2 views created `WITH (security_invoker = true)`.
- Gateway: `SET LOCAL app.allowed_brand_ids / app.allowed_brand_modules / app.organization_id` inside the read-only transaction from `AgentAccessContext` (parameterized `set_config`, never string-built from headers).
- Integration tests on `caboodle_dev` with the RO login role.

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
| D2 | Execution order | **Approved:** B0→B8, C1→C8, G1→G8, A1→A3; FE in parallel once the mockup is ready. |
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

## 8. Progress log

| Package | Status | Commit | Notes |
|---|---|---|---|
| 1a | done | `b2b9996a` | 68 tests; $0.12–0.14/question baseline |
| B0 | done | — (no code) | 2026-10-12: branch `feature/ask-caboodle` @ `b2b9996a`, clean; IAM base `cba9c60d` unchanged and `origin/develop` fully contained after fetch; build 0 errors (2,178 pre-existing StyleCop warnings); tests 5,193/5,193 green (Intelligence 68, DB gateway test verified on `caboodle_dev`); migrations 166 applied, 0 pending, last `RemoveLegacyIntelligenceTables`. Live smoke (= B1 "before"): correct — 92,376 KeHE cases to Sprouts Jan–Sep 2026, monthly figures match direct SQL; one narrative slip ("stores rose every month since April" — May dipped to 484, the duplicated Feb/May upload) → B6 should check narrative claims, not just numbers. `ANTHROPIC_API_KEY` is a Windows user variable; VS Code did not pass it to the agent shell, so the scratchpad smoke script reads it from the user scope into the test process only. Question set drafted: [`ask-caboodle-question-set.md`](ask-caboodle-question-set.md). **Safety:** `dotnet ef` defaults to the Production environment (prod RDS in `appsettings.Production.json`) — always run it with `ASPNETCORE_ENVIRONMENT=Development` and `--connection` to local. |
| B1 | done | `59710708` | Same question, brand and answer before/after (Opus 5.5, medium). **Before** $0.1159: 4 calls, 17.4 s, uncached input 14,889, cache read 14,403, write 4,801 (system+tools prefix), output 1,472. **After** $0.0701 (−40 %): 4 calls, 19.4 s, uncached input 10, read 29,012, write 5,800 (conversation only), output 1,764 — the prefix was still warm from the "before" run. Derived from the measured tokens at equal output (1,472): prefix warm (later questions within the hour) **≈ $0.064 (−45 %)**; first question of an hour with the 1h prefix ≈ $0.102 (−12 %); with a 5m prefix it would be ≈ $0.087 (−25 %). Conversation caching alone saves ≈ $0.029/question (input $0.060 → $0.031). Note for B3/B7: the conversation tail is 5m, so a follow-up asked > 5 min later rewrites the history — revisit with measured follow-up gaps. Intelligence tests 72 (coverage 97.7 %). |
| B2 | done | `940365b8` | Migration `20261011191206_AddAskCaboodleReadOnlyRole` (applied on local `caboodle_dev`): `pg_trgm`; `askcaboodle_ro` NOLOGIN (skipped with a NOTICE where the migration user can't create roles — ops creates the roles before that deploy); USAGE on 7 schemas + SELECT on exactly 19 tables (16 catalog + `CRM.DistributionCenters`, `DataHub.UnifiedEntityAliases`, `DataHub.UnifiedEntities` for entity search), nothing else; 12 partial GIN trigram indexes built CONCURRENTLY (the plan's 11 + alias `RawValue`). Role settings (`default_transaction_read_only`, `statement_timeout` 15s) live on the login role — group-role settings are not inherited. Login `askcaboodle_app` created by the owner with `docs/AskCaboodle-ReadOnlyLogin.sql` (password via `\password`); dev connection string in the Windows user variable `IntelligenceSettings__ReadOnlyConnectionString`, not in git. Entity search: names also match by trigram (`%` / `<%`), ranked by GREATEST(similarity, word_similarity), labelled `trigram`, scored 0.4–0.65 (below exact/prefix/alias/contains), shorter name wins ties. Tests: grant-vs-catalog+registry consistency (parses the migration), DB tests as the RO login (reads granted tables; Identity refused 42501; writes refused 25006 / 42501; timeout 15s; every registry query runs; wallmart, sprots, krogr, pubix, keyhe, unfy resolve). Intelligence 84 tests, coverage 97.8 %; solution 5,209 green. Paid run on the RO login, "cases to sprots through keyhe this year": correct (92,376 cases, $2,926,472, names stated), 4 calls, 15.9 s, $0.0998 (first question of the hour). |
| B3 | done | `4263a43c` | 2026-10-12. `Modules.Intelligence.Domain` re-added (sln with the original project GUID, Dockerfile, references; also fixed the missing `EndProject` that 1a left on `Brand.Application.Test` and the dangling Shared.Infrastructure reference). Migration `20261012054802_AddAskCaboodleSessions` (applied on local `caboodle_dev`): `Intelligence.AskSessions`, `AskMessages` (unique session + sequence), `AskToolCalls`, `AskFeedback` (unique message + user); child FKs cascade; no grants to `askcaboodle_ro`. Endpoints `GET sessions`, `GET sessions/{id}`, `DELETE sessions/{id}`, `POST feedback` (same admin permission); FE contract `docs/AskCaboodle-FE.md`. Tests: stubbed replay test proves a restored conversation sends a byte-identical request; opt-in DB test on `caboodle_dev` (write → new scope → follow-up → empty cache rebuild → history/feedback/delete endpoints, rows removed afterwards). Intelligence 140 tests, coverage 95.2 % unit-only / 98.5 % with DB; solution 5,265 green; build 0 errors, no new warnings. **Paid check (D15), $0.23 total**, brand Bubbies, three "processes" with their own cache and DB scope: Q1 new session — 92,376 KeHE cases to Sprouts (matches B0/B2), 4 calls, $0.1022; Q2 after the restart — replayed verbatim (`StartsConversation` false), cache read 33,029 / write 1,834, 3 calls, $0.0403; Q3 with a 10 K trigger — `clear_tool_uses` accepted by Opus 5.5 and cleared 3.4–7.2 K tokens on each call, answered (UNFI 437 cases, not cross-checked), $0.0900 (cache rewritten after clearing — why the default trigger is high). Test helper for these runs: `LiveRestartTests` (opt-in `ASK_CABOODLE_LIVE_RESTART_TEST=1`). |
| B4 | next | | Start by posting the B4 plan and open decisions (§0); the owner reviews the priority table list. Local env for live/DB tests as in the B3 row: `ANTHROPIC_API_KEY` and `IntelligenceSettings__ReadOnlyConnectionString` from the Windows **user** scope, `ASK_CABOODLE_CONNECTION_STRING` (local `caboodle_dev` from `appsettings.Development.json`) and `ASK_CABOODLE_READONLY_CONNECTION_STRING`. |
| B5 … A3 | todo | | |
