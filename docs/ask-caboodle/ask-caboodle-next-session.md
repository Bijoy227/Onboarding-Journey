# Ask Caboodle — Handoff for the next session

Written 2026-10-14, at the end of the session that built B7b. Read this first, then §0 and §8 of [`ask-caboodle-be-implementation-plan.md`](ask-caboodle-be-implementation-plan.md).

## Starter prompt

> Read `docs/ask-caboodle/ask-caboodle-next-session.md`, then §0 and §8 of `docs/ask-caboodle/ask-caboodle-be-implementation-plan.md` in `D:\Fork\Onboarding-Journey`. The backend is `D:\Fork\Caboodle BE Repository\caboodle.backend`, branch `feature/ask-caboodle` (B7b committed at `d7e48370`). Start with package B8 (guardrails): post its plan and open decisions first, then wait for my go-ahead.

## Where things stand

| Item | State |
|---|---|
| **Backend branch** | `feature/ask-caboodle`, last commit `d7e48370` (B7b). Origin has the branch only up to B2 (`940365b8`). Never push unless the owner asks. |
| **Docs repo** | `D:\Fork\Onboarding-Journey`, branch `caboodle-access-v2`. Docs commits are one line: `Update - Ask Caboodle docs - …`. |
| **Model in the app** | **Sonnet 5.5, effort medium** since B7b (D45). Its prices are the defaults of the five `*PricePerMillionTokens` settings, and Development and Staging settings say `claude-sonnet-5-5`. |
| **Tests** | Solution 6,129 green across 16 projects (Intelligence 259, coverage 96.3 % unit-only). Build has 0 errors. The 21 free DB tests are green. |
| **Golden eval** | 45 questions in `caboodle/tests/Intelligence.Application.Test/Eval/golden.yaml`, asked as if today were 2026-10-12. Reports, README and the B7b comparison are in BE `docs/AskCaboodle-Eval/`. |
| **Current baseline (B7b)** | **Sonnet 5.5 medium:** 39/45 in the full run; on confirmed results it matches or beats Opus in every group; $0.040 and 14 s per answer. **Opus 5.5 medium**, same prompt: 41/45, $0.112, 26 s. Sonnet's Q06 and Q09 were fixed after the full run and verified on both models. |
| **Known weaknesses** | Pattern claims ("most months", "rose every month") and hand-added totals, on both models (Q03; Opus also Q10, Q13, Q29). |
| **Data problems** | DI1–DI10 in [`ask-caboodle-data-issues.md`](ask-caboodle-data-issues.md). The owner's rule: record and maintain them, don't fix them. Add any new one a package finds. DI9 matters for store counts: KeHE zero-case rows count as stores, both in the app and in Ask Caboodle. |

## Money (read before any paid run)

- **Who pays:** the client (Constance) pays the API bill through the Claude Console. The owner cannot add money themselves.
- **Balance:** about **$57.65** after B7b, which spent $14.14 of the $71.80.
- **Typical costs:**

  | What | Cost |
  |---|---|
  | Full 45-question run, Sonnet 5.5 medium | ≈ $2.60 (≈ $0.80 of it is the claims check) |
  | Full run, Opus 5.5 medium | ≈ $6.30 (≈ $1.25 claims check) |
  | One question, Sonnet 5.5 medium | ≈ $0.04 + ≈ $0.02 claims check |
  | One question, Opus 5.5 medium | ≈ $0.11 + ≈ $0.03 claims check |

- **Rules:**
  - State the cost and get the owner's approval before every paid run.
  - Run without automatic re-runs (`-Rerun 0`). Re-check only questions whose result differs from the baseline.
  - Each question in flight reserves $0.30 of the cap, so leave headroom or the last questions are skipped.
  - Report the spend after each package.
  - The eval's default model is now the app's: Sonnet 5.5. Pass `-Model` explicitly anyway.

## Next package: B8 — Guardrails (needs the owner's go-ahead)

From plan §3 B8:
- a per-user daily question cap;
- one question at a time per session (already in place);
- a per-organization monthly budget hook (log and warn);
- cost per turn persisted (already done in B3);
- rate limits turned into a friendly `error` event.

B7b added one item: take the prices for the cost estimate from the configured model, with a price table like the eval's `ModelPrice`. A model change can then never misprice answers or budgets. Today the five price settings must be changed by hand together with `Model`.

**Decisions to post** (no recommendation made yet):
- the daily cap value, and whether admins are exempt;
- what the user sees at the cap;
- budget thresholds, and where the warning goes;
- whether B8 needs a paid check. It probably needs at most a single smoke question, because the guardrails don't change answers.

After B8 the order is C1–C8, G1–G8 and A1–A3 (A only if the demand gate says so). The frontend follows when the owner's mockup is ready.

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

**psql on `caboodle_dev`:** `C:\Program Files\PostgreSQL\17\bin\psql.exe`, host localhost, user postgres, database `caboodle_dev`. Read the password from `appsettings.Development.json` into `PGPASSWORD` in the same command, and never print it.

## Lessons from this session

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
  - the Windows `python` command is a stub, so use node;
  - about 2,200 StyleCop warnings are pre-existing, so count only warnings from changed files.
