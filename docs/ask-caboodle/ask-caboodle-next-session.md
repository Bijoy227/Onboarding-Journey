# Ask Caboodle — Handoff for the next session

Written 2026-10-15, after C0 and C0b's planning. Read this first, then §0, §4 (C0 "as built", C0b, C0c, C1), §7 (D79–D104 and §7.2), §8 and §10 of [`ask-caboodle-be-implementation-plan.md`](ask-caboodle-be-implementation-plan.md).

## Starter prompt

> Read `docs/ask-caboodle/ask-caboodle-next-session.md`, then §0, §4 (C0 "as built", C0b, C0c, C1), §7 (D79–D104 and §7.2), §8 and §10 of `docs/ask-caboodle/ask-caboodle-be-implementation-plan.md` in `D:\Fork\Onboarding-Journey`. The backend is `D:\Fork\Caboodle BE Repository\caboodle.backend`, branch `feature/ask-caboodle` (C0 committed at `a102eed1`; working tree clean).
>
> Build package C0b (fact check, step 1) now. Its plan (§4 C0b) and every decision it needs (D90, D91, D96, D98–D104) are approved, so don't post the plan or ask about those decisions again. Ask only if you hit something the plan and the decisions don't cover. First read the code it builds on: `Agent/AskAgent.cs`, `Agent/AskSessionState.cs`, what each tool in `Tools/` returns to the model, `Answers/`, `History/AskHistoryMapping.cs`, and the eval's `AnswerNumbers.cs`, `EvalScorer.cs` and `EvalReport.cs`. Also fetch `origin/feature/CS-1770-iam-service-broker-workspace` and tell me whether it has commits after `b5adb1a1`; don't merge without my go-ahead.
>
> Then build it with its free tests: the solution builds with 0 errors and no new warnings, and `dotnet test caboodle.sln` and the free DB tests pass. Before each paid run, tell me its cost and wait for my approval: a 4-case check (Q13, Q16, Q29, Q43, about $0.30), then a full Sonnet 5.5 medium eval (about $2.50), then any re-checks. Apply D103 before asking for my review. Update BE `docs/AskCaboodle-FE.md`, the eval README, the plan (C0b "as built", §8, §10) and this handoff, then ask me to review before committing.

## Where things stand

| Item | State |
|---|---|
| **Backend branch** | `feature/ask-caboodle`, last commit `a102eed1` (C0), after B8b `b2f00e22`, B8 `02a256b6` and the IAM merge `4d0830e6`. Origin has the branch only up to B2 (`940365b8`). Never push unless the owner asks. |
| **Docs repo** | `D:\Fork\Onboarding-Journey`, branch `caboodle-access-v2`. Docs commits are one line: `Update - Ask Caboodle docs - …`. |
| **Model in the app** | **Sonnet 5.5, effort medium** since B7b (D45). Since B8, prices come from the `ModelPrices` table in code, per model and per attempt; the five price settings are gone. Development and Staging settings say `claude-sonnet-5-5`. |
| **Tests** | Solution 6,735 green across 16 projects (Intelligence 398, coverage 97.3 % unit-only). Build has 0 errors. The 23 free DB tests are green. |
| **IAM work** | Merge from `origin/feature/CS-1770-iam-service-broker-workspace` (last merged at `b5adb1a1`; still no new commits when fetched on 2026-10-15). Its module settings hold Ask Caboodle's three per-organization settings; the two dollar settings are Platform Admin only. Re-fetch and re-check before each merge. |
| **Golden eval** | 48 questions in `caboodle/tests/Intelligence.Application.Test/Eval/golden.yaml`, asked as if today were 2026-10-12: 45 counted, plus "App questions" (Q42–Q44), reported apart until C9. Since C0: a counted `kind` check, `expect.kinds` for partial answers, and reported headline and database-name checks. Reports and README are in BE `docs/AskCaboodle-Eval/`. |
| **Current baseline (C0)** | **Sonnet 5.5 medium:** 40/45 counted (B7b: 39/45), app questions 3/3, **$0.035 per answer**, 13 s. Re-checks fixed Q04-DAVID, Q19, Q43 and Q44; still failing: Q11, Q29 (wording slips) and Q27 (as in B7b). Opus 5.5 medium was last measured in B7b: 41/45, $0.112, 26 s. |
| **Known weaknesses** | Pattern and counting claims in the wording ("three promo windows" for two, a skipped row in a ranking; Q11, Q29). Hand-added totals are fixed where the server computes the headline or totals (C0: Q03 and Q13 now pass). |
| **Data problems** | DI1–DI10 in [`ask-caboodle-data-issues.md`](ask-caboodle-data-issues.md). The owner's rule: record and maintain them, don't fix them. Add any new one a package finds. DI9 matters for store counts: KeHE zero-case rows count as stores, both in the app and in Ask Caboodle. |

## Money (read before any paid run)

- **Who pays:** the client (Constance) pays the API bill through the Claude Console. The owner cannot add money themselves.
- **Balance:** about **$54.03**. C0 spent $3.54 (4-case check $0.24, re-checks $0.11 + $0.50 + $0.30, full run $2.39); B8b nothing; B8 about $0.075. The Console has the exact figure.
- **Cache-read price to confirm:** the app's price table and B8 use $0.10 per million tokens for Sonnet 5.5 cache reads; the `claude-api` skill's table says $0.20. If the Console shows $0.20, Sonnet answers cost about 14 % more than the reports say.
- **Typical costs:**

  | What | Cost |
  |---|---|
  | Full 48-question run, Sonnet 5.5 medium | ≈ $2.40 (≈ $0.80 of it is the claims check; measured in C0) |
  | Full run, Opus 5.5 medium | ≈ $6.30 (≈ $1.25 claims check) |
  | One question, Sonnet 5.5 medium | ≈ $0.04 + ≈ $0.02 claims check |
  | One question, Opus 5.5 medium | ≈ $0.11 + ≈ $0.03 claims check |

- **Rules:**
  - State the cost and get the owner's approval before every paid run.
  - Run without automatic re-runs (`-Rerun 0`). Re-check only questions whose result differs from the baseline.
  - Each question in flight reserves $0.30 of the cap, so leave headroom or the last questions are skipped.
  - Report the spend after each package.
  - The eval's default model is now the app's: Sonnet 5.5. Pass `-Model` explicitly anyway.

## Done: B8 — Guardrails (commit `02a256b6`, 2026-10-14)

Decisions D46–D58 are in plan §7, and the design and "as built" notes are in §3 B8. B8 delivered:
- a shared daily question pool per organization (default 100), and each platform admin's own limit (50);
- monthly $ budgets with "stop at 100 %";
- prices by model;
- `error.code` on every error, plus the `busy` checks;
- dollars and the model shown to platform admins only.

The smoke run showed that real responses always carry `usage.iterations`, with a `message` entry that has no model. B8 reads the list only after a fallback.

Its answer stated 93,376 cases where the months add up to 92,376: the known hand-added-total weakness.

Sonnet 5.5 cache reads cost $0.10 per million tokens, not $0.20, so B7b's Sonnet medium cost was about **$0.035** per answer.

## Done: B8b — settings and usage data (commit `b2f00e22`, 2026-10-14)

Decisions D59–D68 are in plan §7; "B8b as built" is in §3 B8. B8b is the API only, with no migration and no model calls.

Five endpoints:
- **`GET askcaboodle/usage`:** questions left today and your own usage. `costUsd` for platform admins only.
- **`GET askcaboodle/organization-usage`:** IAM `organization.update`. The pool, used and left today, "X %" from 50 %, and one row per member (name, email). There are no fields for dollars or the model.
- **`GET`/`PUT askcaboodleadmin/settings`, `GET askcaboodleadmin/usage`, `GET askcaboodleadmin/budgets`:** the admin permission plus `IsPlatformAdmin`, because a custom role can carry the permission.

Three points to remember:
- **G2 must leave two guards alone (D59):** `organization-usage` and `AskCaboodleAdminController`.
- **Deleted sessions count in the reports** until the soft-delete purge removes them (D63).
- **One rule for the allowance:** `AskAllowance` (left today, stopped, %) is shared by the ask check and the endpoints.

## Done: FE review (2026-10-15, docs only)

The owner's Workbench artifact was reviewed. It sets the functionality, not the look (D69); the FE team owns the theme. The results are in the plan:
- **C0, the answer contract, is the new first package of 1c** (D70).
- **C1, C3, C4 and C8** gained what the FE needs.
- **The backend/FE split** is D71 (§10.3).
- **The open points** are in §7.2.
- **§10 collects the FE notes** for the final FE document. Add a line to §10.8 in every package that changes something the user sees.

Two findings to remember:
- **`done.queries` (raw SQL) goes to everyone today.** Decide in C1, before G2.
- **Pins must re-run the tool call (SQL or calculator), not only SQL** (C3).

## Done: plan update (2026-10-15, docs only)

Decisions D72–D78:
- **The order** is now C0 → B9 → B10 → C1 → … → C9 (since D90: C0 → C0b → B9 → …).
- **B9, catalog completion:** the promotion fee lines through the calculator (still no SQL grant), plus `CRM.DistributorRetailers`, `DistributorBrands` and `RetailerRegions`. `DataHub.DistributorUpcMappings` is optional, decided when B9 starts.
- **B10, Platform Admin knowledge:** platform admins can ask about everything except credentials, through a second read-only login with its own grants.
  - Personal email and phone data waits for G8 and Constance's agreement (D72).
  - No other users' questions (D73).
  - Email logs: metadata only (D74).
  - Organization users stay on their IAM access (G3–G5).
- **C9, Caboodle guide:**
  - concepts and relationships first, with how-to steps after the FE rework;
  - sources: the user-documentation GitHub repo (the owner gives access when possible), the catalog and the app's rules;
  - **Constance reviews and approves the content.**
- **C0 item 11 (D78):** until the guide exists, the agent never writes app steps; it points to the screen instead.
- **§9 rework:** it now explains its two lists, carries a "Plan" column on every row, and lists the tables that were missing.

## Done: C0 — answer contract (commit `a102eed1`, 2026-10-15)

Decisions D79–D89 are in plan §7; "C0 as built" (§4) has the details and every paid check. In short:
- **Every answer is one fixed set of pieces:** `kind` (`answer`, `clarify`, `cannot_answer`), headline, notes, options, the table, suggestions. A `frame` event carries the first four; history returns them.
- **The server computes every figure shown as a fact** (headline, totals, highlighted rows) from rules, in `Answers/AskAnswerRules`, which C3's pins will reuse. Nothing is computed over a result cut at 500 rows. The computed figures go back to the model, which ends hand-added totals in the text.
- **`present_answer` rejects only what would make the answer wrong or misleading,** because each rejection costs a model step; harmless extras are dropped. A later valid call replaces the earlier one (D84).
- **Migration `AddAskCaboodleAnswerPieces`** (local only): `AskMessages.PiecesJson`, `AskFeedback.Reason`.
- **Prompt:**
  - no "Source:" line; the period note gives the months actually covered (D80);
  - forecasts stay `cannot_answer` (D86);
  - app questions: concepts only, no steps (D78, D88);
  - never table or column names.
- **The owner's bar (D89):** precise and concise; a wrong figure is worse than none; more answer kinds are welcome if they serve that.

**After C0, the owner decided (D89 goal, D90–D97):**
- **C0b, a fact check, comes next,** before B9.
- **C5 grows:** a starter library of at least 100 questions, mostly for brands and brokers, verified with Constance; plus human approval and a nightly re-check (D92).
- **Data problems:** fixed at the source later by the owner; until then, record them and keep the warnings (D93).
- **Model:** stay on Sonnet (D94).
- **No second model check per answer;** re-running a step to confirm an answer is a "later" item in §7.2 (D95).
- **The goal (D89):** right about 95 % of the time and honest about the rest.
- **Feedback loop (D97):** thumbs-down answers go to C8's triage list, and each fixed one becomes an eval case.
- **Panel 3 for streaming (D96)**, and C0c (fact check step 2) right after C0b, go or no-go with C0b's numbers.
- **Open for the owner:** the Sonnet cache-read price in the Console ($0.10 or $0.20; §7.2).

## Next package: C0b — fact check, step 1 (approved: build it)

Plan §4 C0b has the full plan. Every decision it needs is approved (D90, D91, D96, D98–D104), so build it without posting the plan again. In short:
- **Figure reader** (`Answers/AskFigures`): the eval's number reader moved into the app. It reads `$`, `%`, `K`/`M`, decimals, ranges, and counting words up to twenty.
- **Fact register** (`Answers/AskFactRegister`): kept with the session; each tool adds what it returned.
  - **Values:** result cells, row counts, calculator and search figures, the headline, totals and highlights.
  - **The question:** the user's numbers and today's date.
  - **Reference text:** numbers in the catalog text, used only for large or exact figures.
  - **After a restart:** the register is rebuilt from the stored transcripts.
- **Check, one sentence at a time:**
  - **Rounding (D100):** a figure passes when a known value rounds to it at the precision shown.
  - **Small counts (D98):** they pass only against values, row counts or the question; an answer that ran no query may also use catalog numbers.
  - **Never flagged (D99):** years and dates, list numbering, numbers inside names, numbers from the question.
- **One correction round in `AskAgent`:**
  - one appended user message names the failing figures; the history stays append-only (preserved thinking), so never edit earlier turns;
  - the round counts toward the 12 steps and 180 s (D102).
- **Still failing (D101):** the answer goes out with *"Some figures in this answer couldn't be checked against the data: 93,376."*
  - `unverifiedFigures` is sent on the `text` event and in `GET sessions/{id}`, and stored in `PiecesJson` (no migration);
  - the figures are logged for C8's triage.
- **The system prompt and tool definitions don't change (D104).**
- **Eval:** reported checks for unverified figures and corrections; false alarms counted against the claims check. Test cases: Q16 and Q29 (counts), Q42–Q44 (catalog numbers). Tune by D103 before the review.
- **Paid, each approved first:** a 4-case check (Q13, Q16, Q29, Q43, about $0.30), a full run (about $2.50), re-checks. About $3–4 in total.
- **Streaming (D96):** panel 3 of the demo (https://claude.ai/artifact/BEggmtkXmewyuQ5B2W3pYA). C0b only builds the per-sentence check; C1 streams with it.

Step 2 is package C0c (plan §4): rankings, trend words and figures in the wrong place (e.g. Q11, "July: 8,036" when that's April's). It is decided with C0b's numbers.

## After C0b: B9 — catalog completion (post the plan first)

From plan §3 B9:
- **Promotion fee lines through the calculator:** a fee-line breakdown in `get_promotion_performance` (name, type, where it applies, coupon dates, amount), for approved and sandbox promotions. The fee tables stay calculator-only, with no SQL grant. First find where the app computes each fee's amount and reuse that code. Remove `not_available.promotion_fee_lines`.
- **Three CRM tables** with catalog entries, module tags and examples: `DistributorRetailers` (with markup), `DistributorBrands`, `RetailerRegions`. One grant migration, local only.
- **Decide at the start:** whether to grant `DataHub.DistributorUpcMappings` (without `ResolutionNotes` and `ResolvedBy`).
- **§9:** update the rows B9 changes.
- **Tests:** the grant-vs-catalog and drift tests, every example as `askcaboodle_app`, and a fee-line reconciliation against the screens.
- **Eval:** 3–4 new cases. Q41 ("fees line by line") will change: today it accepts `answer` or `cannot_answer`; after B9 the fee lines are answerable, so update its notes, checks and kinds.
- **Paid:** a targeted check of the new cases plus 4 regression cases, about $0.60 on Sonnet 5.5 medium, approved first. A full run (≈ $2.40) only if results differ.

After B9 comes B10 (plan §3), then C1.

## After B10: C1 — token streaming and the run trace

From plan §4 C1 (the run-trace part was added by the FE review):
- `AnthropicConversation.SendStreamingAsync` with the SDK's streaming call. It collects the content blocks (text, thinking with signatures, tool-use input JSON, server-tool blocks) and rebuilds the assistant message for the history.
- `text-delta` events go to the sink. The final `text` event keeps the full markdown.
- Optional: thinking `display: "updates"` (a beta) as `progress` notes.
- Tests on stubbed SSE responses: a text-only turn, a tool-use turn, and thinking with a signature.
- Update BE `docs/AskCaboodle-FE.md`.
- **The run trace:**
  - live step and tool-call events;
  - `GET sessions/{id}/messages/{messageId}/trace` for past answers;
  - `maxSteps` and `wallClockSeconds` for the meters;
  - the role filter for SQL and schema detail.

Load the `claude-api` skill before touching the SDK code; don't work from memory.

**Decisions to post** (suggestions; check them against the code first):
- the event name and payload of the deltas, and whether `text` stays the final event;
- whether to use the thinking-updates beta now or later;
- whether the eval harness and the claims check keep the non-streaming call, so the reports stay comparable;
- what a client disconnect mid-stream stores. B8 already counts such questions as cancelled, with their cost.

**Paid check:** probably one smoke question on Sonnet 5.5 medium, about $0.05, to confirm a real stream. State the cost and wait for approval.

After C1 the order is C2–C9, G1–G8 and A1–A3 (A only if the demand gate says so). In GA, G1 finishes the `ask-caboodle` module's dependencies and G2 switches the endpoint to IAM's module guard: only then can organization users ask.

The FE team is reworking the theme. Plan §10 collects what the FE needs, for the final FE document.

## Working agreement (owner)

1. **One package at a time.** Post the plan and open decisions, then wait for the go-ahead. "Can we do X?" is a question, not a go-ahead.
2. **Finish a package in this order:**
   - build `caboodle.sln` with 0 errors and no new warnings;
   - run `dotnet test caboodle.sln` (all green);
   - the owner reviews;
   - commit with one line, `Update - Ask Caboodle <id> - …`, with no co-author trailer. Never push.
3. **Local `caboodle_dev` only.** Never staging or production. `dotnet ef` needs `ASPNETCORE_ENVIRONMENT=Development` and `--connection`.
4. **Ask before every paid run,** and state the cost first.
5. **Change Ask Caboodle code only;** no brokerage exceptions (D6).
6. **Write no unneeded comments.**
7. **D39:** in a brand environment, never offer or use another brand's data. The system prompt is shared by every brand, so never put one brand's names or figures in it.

## How to run things

**Free:**
- the full solution build and tests (§1.4 of the plan);
- the DB tests and golden references.

**Secrets:**
- `ANTHROPIC_API_KEY` and `IntelligenceSettings__ReadOnlyConnectionString` are Windows **user** environment variables. VS Code doesn't pass them to the agent's shell.
- The launchers below read them into the test process only and never print a value. The main dev connection string is in `caboodle/src/Hosts/API/appsettings.Development.json`.
- Recreate these launchers in the new session's scratchpad.

**Paid eval launcher** (`eval-run.ps1`). Examples:
- `-Budget 4.50 -Rerun 0 -Model claude-sonnet-5-5 -Effort medium -Label b8`
- `-Cases "Q01,calculator" -Budget 1.00 -Rerun 0 -Model claude-sonnet-5-5 -Effort medium -Label check`

Run it with `$ErrorActionPreference = 'Continue'`.

```powershell
param(
    [string]$Cases = "",
    [Parameter(Mandatory = $true)][string]$Budget,
    [string]$Label = "",
    [string]$Rerun = "1",
    [string]$Model = "",
    [string]$Effort = "",
    [string]$Fallback = "1"
)
$ErrorActionPreference = 'Stop'
Set-Location "D:\Fork\Caboodle BE Repository\caboodle.backend"
$settings = Get-Content "caboodle/src/Hosts/API/appsettings.Development.json" -Raw
$env:ASK_CABOODLE_CONNECTION_STRING = ([regex]'"ConnectionString":\s*"([^"]*)"').Match($settings).Groups[1].Value
$env:ASK_CABOODLE_READONLY_CONNECTION_STRING = [Environment]::GetEnvironmentVariable('IntelligenceSettings__ReadOnlyConnectionString', 'User')
$env:ANTHROPIC_API_KEY = [Environment]::GetEnvironmentVariable('ANTHROPIC_API_KEY', 'User')
$env:ASK_CABOODLE_EVAL = '1'
$env:ASK_CABOODLE_EVAL_BUDGET_USD = $Budget
$env:ASK_CABOODLE_EVAL_RERUN = $Rerun
$env:ASK_CABOODLE_EVAL_REFUSAL_FALLBACK = $Fallback
if ($Model) { $env:ASK_CABOODLE_EVAL_MODEL = $Model }
if ($Effort) { $env:ASK_CABOODLE_EVAL_EFFORT = $Effort }
if ($Cases) { $env:ASK_CABOODLE_EVAL_CASES = $Cases }
if ($Label) { $env:ASK_CABOODLE_EVAL_LABEL = $Label }
dotnet test caboodle/tests/Intelligence.Application.Test/Intelligence.Application.Test.csproj --no-build --filter "FullyQualifiedName~GoldenEvalTests" --logger "console;verbosity=detailed" 2>&1 |
    ForEach-Object { "$_" } | Where-Object { $_ -notmatch 'warning (SA|CS|NU|MSB)' -and $_.Trim() -ne '' }
Remove-Item -Recurse -Force caboodle/tests/*/TestResults -ErrorAction SilentlyContinue
```

**Free DB tests** (`dbtests.ps1`): the same first lines (both connection strings, no API key), then:

```powershell
param([string]$Filter = "FullyQualifiedName~Intelligence.Application.Test.Live|FullyQualifiedName~GoldenReferenceTests")
dotnet test caboodle/tests/Intelligence.Application.Test/Intelligence.Application.Test.csproj --no-build --filter $Filter --logger "console;verbosity=normal" 2>&1 |
    ForEach-Object { "$_" } | Where-Object { $_ -notmatch 'warning (SA|CS|NU|MSB)' -and $_.Trim() -ne '' }
```

**One paid smoke question** (`smoke.ps1`, about $0.05 on Sonnet 5.5 medium; B8's paid check):
- It starts with the same first lines as the other launchers: both connection strings, plus `ANTHROPIC_API_KEY` from user scope.
- It then sets `ASK_CABOODLE_LIVE_TEST=1`, `ASK_CABOODLE_BRAND_ID` (default Bubbies, `0303a5ee-9913-47ef-ba6d-cdea180a723f`) and `ASK_CABOODLE_QUESTION`.
- It runs `dotnet test … --no-build --filter "FullyQualifiedName~AnswersAQuestionEndToEnd"`.
- Run it once, never twice in one command.

**psql on `caboodle_dev`:** `C:\Program Files\PostgreSQL\17\bin\psql.exe`, host localhost, user postgres, database `caboodle_dev`. Read the password from `appsettings.Development.json` into `PGPASSWORD` in the same command, and never print it.

## Lessons from recent sessions

- **Moving words out of the text can drop a check the old wording forced (C0).** The old "Source: …, Jul–Aug 2026" line made the model check how far the data runs. With the period in a note, it wrote the period asked until the rule said "the months actually covered, checked against the latest month".
- **Every `present_answer` rejection costs a model step.** Default what is harmless (chart none without a result, the headline's result) and reject only what would be wrong. Read `toolCalls[].isError` in the eval JSON after each run.
- **Expected kinds need judgment.** A question the data answers only in part fits `answer` or `cannot_answer`; list both in `expect.kinds` instead of failing a good answer.
- **The access context (B8b):**
  - `IAccessContext.GetCurrentAsync` throws "Select an organization." for a user with several memberships and no `OrganizationID` header. A check that needs no organization (is this a platform admin?) should use `GetUserAccessAsync`.
  - `HasOrgPermission` is always true for platform admins, even without an organization, so an org endpoint must still check that one is picked.
- **Check what the agent actually saw before blaming the model.** Sonnet's B7 Publix error came from the name search: it showed only 5 candidates per type and 10 in all, and the real 2026 plan was cut. The claims check now sees the search output, not the raw rows.
- **A special-case filter in a catalog example leaks into other questions.** The void example's `CasesShipped > 0` made Sonnet filter store counts too. Say plainly which questions a filter is for.
- **Check a few cases before a full run.** The 4-case check ($0.57 for two rounds) found two fixable gaps before $12 of full runs.
- **Keep the prompt fixed across runs that are compared,** and never rebuild while an eval is running.
- **A model switch needs a price switch.** The cost estimate uses the five price settings (B8 will tie them to the model).
- **Sonnet 5.5 high is no better than medium here,** and costs more.
- **Shell pitfalls:**
  - in PowerShell, `dotnet test` stderr lines arrive as error records, so turn them into strings before `.Trim()` (the launchers above do);
  - shell edits can leave LF line endings, so convert changed files to CRLF before committing;
  - in YAML, an unquoted `notes:` value containing `": "` breaks the file; use `>-`;
  - the Windows `python` command is a stub, so use node. Write node scripts with the Write tool: a bash heredoc turned `\\` into `\` and broke one;
  - about 2,200 StyleCop warnings are pre-existing, so count only warnings from changed files. Every migration also gets CA1505;
  - `dotnet ef database update --no-build` runs the last build, which may predate a migration you just added: C0's first update applied nothing. Run it without `--no-build`, then check the columns in psql;
  - the connection string's keys have leading spaces (` Password=`), so trim them when reading the password for psql, and pass `-w` so psql never waits for a password prompt;
  - PowerShell `*>` writes the log as UTF-16; strip the null bytes (`tr -d '\0'`) before grepping it in bash.
