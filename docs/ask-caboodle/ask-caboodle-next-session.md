# Ask Caboodle — Handoff for the next session

Written 2026-10-13, at the end of the session that built B6, B6.1 and B7. Read this first, then §0 and §8 of [`ask-caboodle-be-implementation-plan.md`](ask-caboodle-be-implementation-plan.md).

## Starter prompt

> Read `docs/ask-caboodle/ask-caboodle-next-session.md`, then §0 and §8 of `docs/ask-caboodle/ask-caboodle-be-implementation-plan.md` in `D:\Fork\Onboarding-Journey`. The backend is `D:\Fork\Caboodle BE Repository\caboodle.backend`, branch `feature/ask-caboodle` (B7 committed at `2903dce3`). Start with package B7b (Sonnet readiness): post its plan and open decisions first, then wait for my go-ahead.

## Where things stand

| Item | State |
|---|---|
| **Backend branch** | `feature/ask-caboodle`, last commit `2903dce3` (B7). Commits before it: `cf0dab78` (B6.1) and `9f825cce` (B6). Origin has the branch only up to B2 (`940365b8`); never push unless the owner asks. |
| **Docs repo** | `D:\Fork\Onboarding-Journey`, branch `caboodle-access-v2`. Docs commits are one line: `Update - Ask Caboodle docs - …`. |
| **Model in the app** | Opus 5.5, effort medium. Unchanged: B7 found no cheaper setup that holds quality (D8). |
| **Tests** | Solution 6,120 green across 16 projects (Intelligence 250); build 0 errors; the 20 free DB tests are green. |
| **Golden eval** | 45 questions in `caboodle/tests/Intelligence.Application.Test/Eval/golden.yaml`, asked as if today were 2026-10-12. Reports, README and the B7 comparison are in BE `docs/AskCaboodle-Eval/`. |
| **Baseline** | B6.1 run, Opus 5.5 medium: 37/44 (Q33 didn't start at the cap), every rule check passed, about $0.10 and 25 s per question. |
| **B7 result** | Sonnet 5.5 medium 35/45 ($0.039 per question, 14 s). Haiku 5.5 medium 33/45 ($0.003, 13 s). The Sonnet re-check confirmed real drops in Distribution and Calculator. |
| **Data problems** | DI1–DI7 in [`ask-caboodle-data-issues.md`](ask-caboodle-data-issues.md). Owner: record and maintain them, don't fix them now. Add any new one a package finds. |

## Money (read before any paid run)

- **Who pays:** the client (Constance) pays the API bill through the Claude Console. The owner cannot add money themselves.
- **Balance:** on 2026-10-13 the client added **$70** (confirmed by the owner). With about $1.80 left over, about **$71.80** is available.
- **Estimate to finish everything:** $125–200, sent to the client. About $125 if Sonnet passes the tests early, because Sonnet test runs cost about half. Up to about $200 if everything stays on Opus and Python analysis is built.
- **Typical costs:**

  | What | Cost |
  |---|---|
  | Full 45-question run, Opus 5.5 medium | ≈ $5.50–6.00 (≈ $1.10–1.40 of it is the claims check) |
  | Full run, Sonnet 5.5 medium | ≈ $2.80 |
  | Full run, Sonnet 5.5 high (estimate) | ≈ $3.50 |
  | Full run, Haiku 5.5 | ≈ $1.50 (almost all claims check) |
  | One question, Opus 5.5 medium | ≈ $0.10 |

- **Rules:**
  - State the cost and get the owner's approval before every paid run.
  - Run without automatic re-runs (`ASK_CABOODLE_EVAL_RERUN=0`, D40). Re-check only questions whose result differs from the baseline.
  - Leave headroom in the cap. Each question in flight reserves $0.30, so a cap set too tight skips the last questions (Q33 was skipped this way).
  - Count paid runs against the budget and report the spend after each package.

## Next package: B7b — Sonnet readiness (proposed; needs the owner's go-ahead)

The owner wants lower cost. Sonnet is about 60 % cheaper and twice as fast, but in B7 it repeated four errors. The causes: it does less checking, applies rules that live deep in the catalog less reliably, and is misled by confusing data names. Make the free code fixes first, then one paid gate.

**1. Calculator output labels.** `get_promotion_performance` labels each figure with its definition, e.g. net $ = total revenue − total spend, so the model copies it (Q37 said "gross minus spend").

**2. Promotion search context.** Promotion candidates in `search_entity` show approved or sandbox, version, and event date span. "PUBLIX 2026 - PV KG FINAL - Copy" then visibly holds 2027 events (Q41 picked it as the 2026 plan and missed two of the four approved Publix promotions).

**3. Always-on glossary rules** (short, in the cached system prompt):
- a store is `CustomerName`, never name + city + state (Q11);
- store counts across KeHE and UNFI come from one de-duplicated query (Q08-David gave the two counts separately);
- the net revenue definition;
- list every approved promotion that matches.

**4. Paid gate, about $9–10, needs approval:**
- a full Sonnet 5.5 **high** run with the fixes (≈ $3.50);
- an Opus 5.5 medium run with the same fixes (≈ $5.50), so both models are compared on the same prompt. The fixes help Opus too.

**Decisions to post:**
- Sonnet effort to test: high (recommended) or medium.
- Whether to also re-run Opus (recommended, for a fair comparison).
- Whether the claims check should move to Sonnet 5.5 to halve its cost. This changes comparability with earlier reports.
- The D8 decision afterwards: switch the app to Sonnet only if it matches Opus in every group.

After B7b the order is B8 (guardrails), then C1–C8, G1–G8 and A1–A3 (A only if the demand gate says so). The frontend follows when the owner's mockup is ready. Open item from the D8 wording: the cost target is ≤ $0.05 per question at equal quality.

## Working agreement (owner)

1. **One package at a time.** Post the plan and open decisions, then wait for the go-ahead. "Can we do X?" is a question, not a go-ahead.
2. **Finish a package in this order:** build `caboodle.sln` with 0 errors and no new warnings, run `dotnet test caboodle.sln` (all green), the owner reviews, then commit with one line `Update - Ask Caboodle <id> - …`. No co-author trailer. Never push.
3. **Local `caboodle_dev` only.** Never staging or production. `dotnet ef` needs `ASPNETCORE_ENVIRONMENT=Development` and `--connection`.
4. **Ask before every paid run;** state the cost first.
5. **Change Ask Caboodle code only;** no brokerage exceptions (D6).
6. **Write no unneeded comments.**
7. **D39:** in a brand environment, never offer or use another brand's data. Cross-brand questions (e.g. a broker in the broker workspace) follow the user's permissions.

## How to run things

**Free:**
- the full solution: build and tests (§1.4 of the plan);
- the DB tests and golden references, which need `ASK_CABOODLE_CONNECTION_STRING` and, for the read-only login tests, `ASK_CABOODLE_READONLY_CONNECTION_STRING`.

**Secrets:**
- `ANTHROPIC_API_KEY` and `IntelligenceSettings__ReadOnlyConnectionString` are Windows **user** environment variables. VS Code doesn't pass them to the agent's shell.
- Read them into the test process only, as the launchers below do; they never print a value. Running them through the PowerShell tool was not blocked in this session.
- The main dev connection string is in `caboodle/src/Hosts/API/appsettings.Development.json`.

Recreate these in the new session's scratchpad.

**Paid eval launcher** (`eval-run.ps1`). Examples:
- `-Budget 4.00 -Rerun 0 -Model claude-sonnet-5-5 -Effort high`
- `-Cases "Q01,calculator" -Budget 1.00 -Label check`
- for Haiku, add `-Fallback 0` (Haiku 5.5 has no server-side refusal fallback).

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
    Where-Object { $_ -notmatch 'warning (SA|CS|NU|MSB)' -and $_.Trim() -ne '' }
Remove-Item -Recurse -Force caboodle/tests/*/TestResults -ErrorAction SilentlyContinue
```

**Free DB tests** (`dbtests.ps1`): the same first lines (both connection strings, no API key). Then:

```powershell
dotnet test caboodle/tests/Intelligence.Application.Test/Intelligence.Application.Test.csproj --no-build --filter "FullyQualifiedName~Intelligence.Application.Test.Live|FullyQualifiedName~GoldenReferenceTests"
```

**psql on `caboodle_dev`:** `C:\Program Files\PostgreSQL\17\bin\psql.exe`, host localhost, user postgres, database `caboodle_dev`. Read the password from `appsettings.Development.json` into `PGPASSWORD` in the same command, and never print it.

## Lessons from this session

- **Review every eval failure before trusting a score.** Run 1 measured 30/45, but 7 failures were mistakes in the eval itself (references, wording checks, evidence the claims check couldn't see). The corrected figure was 37/45.
- **The claims check must see everything the agent saw.** It now gets query results, entity-search results and calculator output; without them it flags true figures as invented. A new tool needs the same.
- **Recorded values change when the data changes.** `GoldenReferenceTests` fails on any change; re-record the values and re-read the case notes.
- **Single runs are noisy.** Several cases flip between runs, so only differences confirmed by a re-check count.
- **The agent's persistent weakness is stating patterns without checking every row** ("steadily", "every month", "most months"). The B6.1 prompt rule reduced it but didn't remove it.
- **Shell pitfalls:**
  - `node -e` with `\n` inside a C# string becomes a real line break; use the Edit tool for those lines.
  - In YAML, an unquoted `notes:` value containing `": "` breaks the file; use `>-`.
  - The Windows `python` command is a stub, so use node.
  - About 2,000 StyleCop warnings are pre-existing. Count only warnings from changed files.
