# Ask Caboodle — Handoff for the next session

Written 2026-10-18, after C4 (commit `40efb441`). Read this first, then §0, §4 C5 (with "C2 as built", "C3 as built" and "C4 as built": C5's library replaces C2's YAML, its templates reuse C4's typed fill-ins and C3's period tokens, and it gives organization prompts "Verified"), §7.2, §8 and §10 of [`ask-caboodle-be-implementation-plan.md`](ask-caboodle-be-implementation-plan.md).

## Starter prompt (next: C5)

> Read `docs/ask-caboodle/ask-caboodle-next-session.md`, then §0, §4 C5 (with "C2 as built", "C3 as built" and "C4 as built", whose starters, period tokens, typed fill-ins and values lookup C5 builds on), §7.2, §8 and §10 of `docs/ask-caboodle/ask-caboodle-be-implementation-plan.md` in `D:\Fork\Onboarding-Journey`. The backend is `D:\Fork\Caboodle BE Repository\caboodle.backend`, branch `feature/ask-caboodle` (last commit C4 `40efb441`; working tree clean).
>
> Next is package C5 (verified examples and short-circuit). First re-fetch `origin/feature/CS-1770-iam-service-broker-workspace` and tell me whether it has commits after `b5adb1a1`; don't merge without my go-ahead. Then post C5's short plan and its open decisions, and wait for my go-ahead. The open decisions:
> - the size: C5 grew by about a third (D92); split it (for example C5a: library, retrieval and approval; C5b: the short-circuit) or build it at once;
> - what enters the library first: C2's 21 starters (D151), organization prompts that pass an eval case (D163), thumbs-up answers and eval passes as proposals; and when the 100-question starter library with Constance is written;
> - normalizing a question for retrieval: names and periods replaced by their types with C4's values lookup and period recognition (D165–D168), then `pg_trgm` and full-text; how many examples go into the user message;
> - human approval: where a platform admin marks an example verified, and how "Verified" reaches organization prompts;
> - templates with slots: C4's fill-in types as the slots, so one verified question serves every retailer and period;
> - the nightly re-check (as C3's pins) and dropping examples when the catalog changes;
> - `GET suggestions` moving from the YAML to the library (D151), and whether verified similar questions replace C0's follow-ups.
>
> Add C5 to the C1p test page (`docs/ask-caboodle/test-page/ask-caboodle-test.html`). The items under "Parked for later" wait until I bring them up.
>
> Run the free launchers yourself (PowerShell). Finish in the usual order: build with 0 errors, all tests green, my review, then a one-line commit. Paid runs still need my approval first, with the cost stated.

## Waiting for the owner (from C4, 2026-10-18)

- **The paid "Improve with AI" check** (`improve.ps1`: `LiveImproveTests`, 8 prompts against Bubbies' values, `{ABSCO}` and an injection attempt included; about $0.001–0.002) was offered and not run. C4 was committed without it.
- **C4's fourteen points beyond the plan's wording** (plan §4 "C4 as built"): committed at the owner's request, listed for the owner to object to. The four from the fill-ins work: improvement costs in their own table, in the budgets but not the per-question report; an unpriced `ImproveModel` keeps prompts as they are; entity names stored at save; a brand's own values need a brand when saving.
- **Try it live** on the test page: restart the API first (the migration is applied locally). Building a prompt and the values lookup are free; "Improve with AI" costs about $0.0002 a click; running a prompt is a normal question (about $0.04).

## Waiting for the owner (from C3, 2026-10-18)

- **C3's two follow-ups are done (owner, 2026-10-18; plan §7.2, §8 "C3 follow-ups"):** named-date examples in the period rule (Q08 now passes `custom`; Q04 "in Q3" and Q17 "for 2027" still type their dates, so their pins stay on the dates asked), and Q62 accepting the TPR-only framing (new references 56 / 491 / 57). Re-check $0.24; Q17 failed on a claims-check misreading of a long table, with its figures right. Two free items are open in §7.2 for later: the claims judge's table note, and the promotion events example's statuses and dates.
- **C3's ten points beyond the plan's wording** (plan §4 "C3 as built"): committed at the owner's request, listed for the owner to object to.
- **Try the pins live** on the test page: answers asked before C3 typed their dates, so their pins stay on "its own dates"; a new question (≈ $0.04) gives a pin whose period can switch.
- **The optional platform-admin period case** (Q54, ≈ $0.15) was not run.

## Waiting for the owner (from C2)

- **C2's nine points beyond the plan's wording** (plan §4 "C2 as built"): committed at the owner's request, listed for the owner to object to. The owner tried the starters live ("from a bird's-eye view it's looking nice") and hasn't reviewed everything yet.

## Parked for later (owner, 2026-10-17)

The owner will bring these up; don't start them unasked.
1. **More visuals to cover the wait.** The owner liked C1p's reveal order (headline and notes, a "writing" placeholder, the text typed, then the table or chart) and thinks a few more visuals can cover most of the waiting. Ideas to bring: the current step's label in the answer area, a skeleton of the table once `present_answer` runs, small motion while the trace works. FE-side; try them on the C1p page first.
2. **Pricing.** Measured: about $0.036 for a new question, $0.05–0.09 for follow-ups deep in a conversation, plus about $0.05 for the hourly prompt-cache write when no one has asked for an hour (shared by every organization). One organization at 100 questions a day: about $110–240 a month (8 to 5 on working days, or around the clock); the hours barely matter. **The defaults don't match:** a $25 monthly budget with "stop at 100 %" stops an organization using its 100-a-day pool after about 5 days (plan §7.2). Decide with Constance.
3. **Speed and cost improvements,** each measured with the eval (6-case check ≈ $0.35 first, a full run ≈ $3.45 only for winners, approved each time):
   - one model call fewer per answer: `present_answer` carries the text (changes C0's contract; about 2–3 s less per answer);
   - fewer rejected `present_answer` calls (Q01 called it three times, about 2.4 s each);
   - effort `low` instead of `medium` (never measured);
   - a smaller system prompt (catalog index, tool descriptions): it drives the hourly cache write and every read;
   - a cost breakdown on the trace's done card for platform admins (cache write, read, output), offered and not yet answered.
4. **Tables and charts only when they help** (owner's idea): the agent decides, or a figure is built on request from the previous answer's result. Options are in plan §7.2.
5. **Sonnet 5.5 sends after-tool text in one burst** (plan §7.2): recommended to accept it for now and ask Anthropic whether a setting lifts it.
6. **C1's ten points beyond the plan's wording** (plan §4 "C1 as built"): committed at the owner's request, listed for the owner to object to.
7. **A separate Python service** (owner's question): it would not fix the burst, which comes from the API. Revisit only if the phase-2 analysis (A1–A3) calls for it.

## Where things stand

| Item | State |
|---|---|
| **Backend branch** | `feature/ask-caboodle`, last commit C4 `40efb441`, after the C3 follow-up `280b39e2`, C3's eval report `8e689053`, C3 `31d598a4`, C2's eval report `711dcaef`, C2 `4ff33590`, C1b `f8e56603`, C1 `a01dfc13`, B10b `e26a5f52`, C0b.1 `5f7e7f84`, B10a `26a85f3f`, B9 `a8387b82`, C0b `6da28c2d`, C0 `a102eed1`, B8b `b2f00e22`, B8 `02a256b6` and the IAM merge `4d0830e6`. `origin/feature/ask-caboodle` is at B8b (`b2f00e22`); C0, C0b, B9, B10a, C0b.1, B10b, C1, C1b, C2, C3 and C4 are local only. Never push unless the owner asks. |
| **Logins on `caboodle_dev`** | `askcaboodle_app` (standard) and, since B10a, `askcaboodle_admin_app` (platform admins), both created by the owner; their connection strings are the user variables below. |
| **Docs repo** | `D:\Fork\Onboarding-Journey`, branch `caboodle-access-v2`. Docs commits are one line: `Update - Ask Caboodle docs - …`. |
| **Model in the app** | **Sonnet 5.5, effort medium** since B7b (D45). Since B8, prices come from the `ModelPrices` table in code, per model and per attempt; the five price settings are gone. Development and Staging settings say `claude-sonnet-5-5`. |
| **Tests** | With C4: solution 7,198 green across 16 projects (Intelligence 861, coverage 96.9 % unit-only). Release build has 0 errors. The free DB tests (`dbtests.ps1`'s default filter, golden references included) are 77 green: the admin-login ones, C1's trace endpoint, C1b's title/rename race, C2's starter checks, C3's pin tests and C4's prompt, values and improvement-cost tests included. |
| **IAM work** | Merge from `origin/feature/CS-1770-iam-service-broker-workspace` (last merged at `b5adb1a1`; still no new commits when fetched on 2026-10-18, at C4's start). Its module settings hold Ask Caboodle's three per-organization settings; the two dollar settings are Platform Admin only. Re-fetch and re-check before each merge. |
| **Golden eval** | 67 questions in `caboodle/tests/Intelligence.Application.Test/Eval/golden.yaml` (since C2; 63 after B10b), asked as if today were 2026-10-12: 64 counted, plus "App questions" (Q42–Q44), reported apart until C9. Since C2: Q60–Q63, the starters' wordings of Q04, Q08, Q16 and Q17 (4 of 4 passed on 2026-10-17, $0.29). Every starter in `starters.yaml` must stay the exact question of a case. Since C3: `expect.period` on 24 cases and a reported `period` check (did a query take the expected token). Since B10a: a per-case `audience`, the "Platform admin" group (Q49–Q53; since B10b also Q54–Q59 on the data pipeline and the raw files), and `ASK_CABOODLE_EVAL_AUDIENCE=platform-admin`. Since C0: a counted `kind` check, `expect.kinds` for partial answers, and reported headline and database-name checks. Since C0b: a "Fact check" section and a reported `unverified_figures` check. Since B9: Q45–Q48 (fees by type, a distributor's markup, banners by region, the brand's distributors), Q41 answers the fee lines, and calculator references return fee-line figures. Reports and README are in BE `docs/AskCaboodle-Eval/`. |
| **Current baseline (C0b)** | No full run since C0b. B9 changed the catalog and the tool definitions (D110) and checked 9 cases: 9/9, $0.04 per answer. **C0b's full run, Sonnet 5.5 medium:** 38/45 counted (C0: 40/45; the difference is run-to-run flips, none caused by the check), app questions 3/3, **$0.036 per answer**, 13.5 s. 5 of 48 answers corrected by the fact check before the last tuning (about 3 of 48 expected now), none sent with the note. Failing: Q15 (borderline), Q27 (as since B7b), Q29 (a range claim, C0c's kind), Q35 (`cannot_answer` for "nothing found"; stays `answer` by D107). Q33 now accepts either kind (D107). Opus 5.5 medium was last measured in B7b: 41/45, $0.112, 26 s. |
| **Known weaknesses** | Figures in the wrong place, rankings and pattern claims ("56–68 units per store" when one week is 40; Q11, Q29; B10b's Q57 "two issue types have none open" when one has, passed because a 2 was in the results): C0c. Wrong figures and counts are now caught by C0b (Q16, Q29's "three promo periods"), and hand-added totals pass only when right. |
| **Data problems** | DI1–DI14 in [`ask-caboodle-data-issues.md`](ask-caboodle-data-issues.md) (B9 added DI11: six approved Prime fees point at no promotion; B10b added DI12: an email address in one Sprouts store's KeHE city, DI13: syncs marked failed although loaded and 3 stuck, DI14: UNFI UPC mappings stored as provider 1, and updated DI9 on zero-unit KeHE lines). The owner's rule: record and maintain them, don't fix them. Add any new one a package finds. DI9 matters for store counts: KeHE zero-case rows count as stores, both in the app and in Ask Caboodle. |

## Money (read before any paid run)

- **Who pays:** the client (Constance) pays the API bill through the Claude Console. The owner cannot add money themselves.
- **Balance:** about **$47.61**. C4 spent nothing (its improve check was not run). C3 spent $0.61: the 8-case period check $0.37 ($0.30 answers, $0.07 claims check) and the 3-case named-date re-check $0.24 (the changed prompt was cached again on its first case). The owner's live Q62 on the test page ($0.107) went to the key in `appsettings.Development.json`, as C1p's did; C2 spent $0.29 (the 4-case check of its new starters' cases); C1b spent $0.0003 (nine titles from Haiku 5.5); C1 spent $0.50 (a smoke question $0.0834, a 6-case check $0.34, a 1-case check without the fallback $0.04, 14 small timing calls $0.044); B10b spent $0.56 (a 9-case check $0.48, a 2-case re-check $0.08); B10a $0.44 (an 8-case check); B9 $0.59 (a 9-case check); C0b $3.43 (4-case check $0.41, full run $2.62, re-check of 7 $0.40); C0 $3.54; B8b nothing; B8 about $0.075. The Console has the exact figure.
- **Cache-read price (settled 2026-10-16):** Sonnet 5.5 cache reads cost $0.10 per million tokens (0.05x input, on the live pricing page), as `ModelPrices` says; the `claude-api` skill's cached $0.20 is out of date.
- **Typical costs:**

  | What | Cost |
  |---|---|
  | Full run, Sonnet 5.5 medium | ≈ $2.60 for 48 questions (≈ $0.90 of it is the claims check, which since C0b also judges the drafts of corrected answers; measured in C0b); ≈ $2.85 for B9's 52; ≈ $3.10 for B10a's 57; ≈ $3.45 for B10b's 63 |
  | Full run, Opus 5.5 medium | ≈ $6.30 (≈ $1.25 claims check; B7b) |
  | One question, Sonnet 5.5 medium | ≈ $0.04 + ≈ $0.02 claims check (+ ≈ $0.03 more when the answer was corrected) |
  | The first case of any run | ≈ $0.06–0.10: it writes the 1-hour prompt cache |
  | One question, Opus 5.5 medium | ≈ $0.11 + ≈ $0.03 claims check |

- **Rules:**
  - State the cost and get the owner's approval before every paid run.
  - Run without automatic re-runs (`-Rerun 0`). Re-check only questions whose result differs from the baseline.
  - Before a paid run that tests a fact-check change, run the free replay (below) on the last full run.
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

## Done: C0b — fact check, step 1 (commit `6da28c2d`, 2026-10-16)

Plan §4 "C0b as built" has the details and every paid run. In short:
- **Every figure the user sees is checked** (text, notes, options, table title) against the figures the model was given, one sentence at a time (`Answers/AskFigures`, `AskFactRegister`, `AskFactCheck`; `AskTextCheck.Next` is the per-sentence entry point for C1).
- **The register** is built from the exact text each tool returned, so it is rebuilt from the stored transcripts after a restart. It also holds row counts by value and, for fully shown results, column sums and averages: a hand-added total passes only when it is right.
- **One correction round** in `AskAgent`; an answer that still fails goes out with `unverifiedFigures` (the note). Since C0b the `text` event is `{ text, unverifiedFigures[] }`.
- **The system prompt and tool definitions are unchanged (D104).** `present_answer`'s reply now states the table's row count.
- **Tuned by D103 with a free replay** (`FactCheckReplayTests`, below). At review the owner kept the two tunings beyond the plan's wording (D105: figures recomputed from two checked figures; the row count in `present_answer`'s reply), kept small counts exact (D106), and let Q33 accept either kind (D107).
- **Paid, $3.43:** Q16 and Q29 now pass; the full run is 38/45 counted (C0: 40/45, flips only), $0.036 per answer; 5 of 48 corrected before the last tuning, none sent with the note.

## Decided: C0c deferred (D108)

- **C0c (plan §4):** rankings, trend words and figures in the wrong place. About one such error per full run is left (C0: Q11's ranking; C0b: Q29's range "56–68 units per store"). Only platform admins can ask until G2, so the owner deferred it to before G2, sized with C8's data from admin use. G2 lists it as a prerequisite.
- **Industry terms (§7.2):** users' day-to-day words can clash with Caboodle's ("sales" = sell-through, "depletions", "distribution" = ACV or TDPs, "the plan" = AOP, "deductions", "MCBs"). The owner is talking to Constance first. When the owner says go: draft about 50–60 terms with test questions (what users mean, how Caboodle maps it, clash or gap, proposed handling); she reviews; approved terms go to the glossary, the eval and C5. Don't start it unasked.

## Done: B9 — catalog completion (commit `a8387b82`, 2026-10-16)

Decisions D109–D116 are in plan §7; "B9 as built" is in §3 B9. In short:
- **Fee lines through the calculator:** `get_promotion_performance` takes `breakdown: "fee"` (D110). It lists each event's AD/TPR fee and each lump-sum, coupon or Prime fee: where it applies, coupon dates, the settings as entered and the amount counted (D111). The amounts are the screens' own fee summaries, so there is no new formula. The screen's way of counting is copied and explained (D112), and the fee tables still have no SQL grant.
- **Two CRM tables:** `CRM.DistributorBrands` and `CRM.RetailerRegions`, granted by migration `AddAskCaboodleCatalogCompletionGrants` (applied locally).
- **Owner rules:**
  - distributor ↔ retailer and the one markup come from `CRM.DistributorBanners`; `CRM.DistributorRetailers` is never used (D113);
  - a retailer's or banner's region comes only from `CRM.RetailerRegions`; the catalog no longer describes `Banners."RegionID"`, which disagrees for all 459 linked banners (D115);
  - `DataHub.DistributorUpcMappings` moves to B10b (D109).
- **Fact check (D116):** the correction message now ends "Don't mention the correction; write the answer as if it were the first." Q48's corrected draft had told the user it corrected two counts.
- **Tests:** a fee reconciliation DB test adds temporary fees of each kind and matches the screens to the cent (D114).
- **Eval:** Q41 now expects the fee lines; Q45–Q48 are new.
- **Paid, $0.59:** 9 of 9 passed. Q48's two wrong hand counts were caught; Q45's right fee total was a false alarm until the fee header stated the total.

## Decided: B10 planning (2026-10-16, docs only)

- **D117–D123 approved:** B10 is split; B10a builds the second login and the platform-admin audience, plus the IAM, configuration, audit, email-log, brand-link and purge data. B10b (the DataHub pipeline and raw distributor files) comes after.
- **What B10a found** (plan §3 B10 "What B10 builds on"): everything is single-audience today; Identity lives in the `ApplicationDbContext` snapshot; no audit trail holds a credential; `UserName` is the email address for 317 of 324 users (so it is hidden, D121).
- **Owner asked (2026-10-16):** track every role, login, script and setting needed for staging and live. Plan §11 holds the checklist; B10a writes it into BE `docs/AskCaboodle-Deployment.md`.
- **Two points from the owner, placed in package C1b (D124, plan §4):** a limit on questions per conversation (suggested: a setting, default 20, error `session_full`), and meaningful session titles (suggested: a 3–6 word title by Haiku 5.5 after the first answer, plus rename). C1b is built right after C1; its details are decided when it starts.
- **Settled:** Sonnet 5.5 cache reads cost $0.10 per million tokens (live pricing page; docs commit `3b4a449`).
- **For C9:** the user-documentation repo is public at https://github.com/tauhid-sifat/Caboodle-Documentations. The BA wrote it and the owner hasn't reviewed it: treat it as unverified and discuss it with the owner when C9 starts.
- **For the owner, not Ask Caboodle:** a Claude API key sits in plain text in the committed `appsettings.Staging.json` and `appsettings.Development.json` (since `cf92952e`, on `master`, `develop`, `staging`). Never print or copy it; plan §11 records it.

## Done: B10a — Platform Admin knowledge, part 1 (commit `26a85f3f`, 2026-10-16)

Plan §3 B10 "B10a as built" has the details. In short:
- **Migration `AddAskCaboodleAdminReadOnlyRole`** (applied on local `caboodle_dev`; `Down` checked): `askcaboodle_admin_ro`, a member of `askcaboodle_ro`, reads 38 more tables (13 by column). **Script `docs/AskCaboodle-AdminReadOnlyLogin.sql`** creates `askcaboodle_admin_app`; the owner runs it and sets `IntelligenceSettings__AdminReadOnlyConnectionString` (user scope).
- **The platform-admin audience** lives on the session: login, catalog, `get_table_info`, SQL guard, and a second cached system block. Without the admin connection string, platform admins get the standard audience and a warning is logged (D119). The standard fingerprint is unchanged.
- **38 catalog entries** with `audience: platform-admin`; eval group "Platform admin" Q49–Q53 (counted).
- **BE `docs/AskCaboodle-Deployment.md`:** the staging/live runbook (plan §11 is now its summary).
- **At review, D125:** the five points beyond the plan's wording were accepted as built: the inviter is `InvitedUsers."CreatedBy"` (48 of 51, not 2); `Users."ImageUrl"` and the backfill `Report` hidden too; purge retentions and table registry granted; `Deleted` in the email-log grants; the admin group counted.
- **Tests:** solution 6,886 green, Intelligence 549 (coverage 97.9 % unit-only), DB tests 45 green with the owner's admin login; build 0 errors, the only new warning the migration's CA1505.
- **Paid, $0.44:** `eval-run.ps1 -Cases "admin,Q01,Q22,Q48" -Audience platform-admin -Budget 1.20 -Rerun 0 -Model claude-sonnet-5-5 -Effort medium -Label b10a-admin`: 8 of 8 passed, all asked as a platform admin. One correction, a fact-check false alarm on "between 8 and 11 September" (fixed in C0b.1).

## Done: C0b.1 — days listed before their month (commit `5f7e7f84`, 2026-10-16)

Plan §4 "C0b.1": the fact check's day-first date pattern joined days only with "–", "-" or "to", so in "between 8 and 11 September" the "8" was read as a count. Day-first dates now also join their days with "and", "&" or commas; month-first dates are unchanged ("Aug 30–Sep 6, 68–88%" keeps its figures). The free replay of 113 stored answers (C0, C0b, B9, B10a) changes only B10a's Q53. $0 spent. Replay launcher: `replay.ps1 -Report <absolute path to a run's .json> [-Audience platform-admin]` (the report path must be absolute).

## Done: B10b — Platform Admin knowledge, part 2 (commit `e26a5f52`, 2026-10-16)

Decisions D126–D132 are in plan §7; "B10b as built" is in §3 B10. In short:
- **Migration `20261016210000_AddAskCaboodleDataPipelineGrants`** (grant-only; applied on local `caboodle_dev`; `Down` checked): `askcaboodle_admin_ro` reads 17 more tables, 55 in all.
  - **Whole tables (13):** `AddressReferences`, `BrandDataCleanupJobs`, `DistributorCustomerLinks`, `StoreCleanupChangeLogs`, `StoreListIssues`, `StoreMergeHistories`, the two `Unmapped*Records`, `UnmappedRecordResolutionAudits`, and the four raw and mapped KeHE/UNFI tables.
  - **By column (4):** `DataSyncRuns`, `ImportJobs`, `ExportJobs`, `DistributorUpcMappings`. Hidden: file locations, upload ids and part lists, the signed file link and hash (D127); the UPC mappings' notes, resolver and audit user columns (D109).
  - **Left out:** `MappingSuggestions`, `AliasAuditTrail`, `AliasMatchAttempts` and `DataMappings` (D126).
- **Catalog:** 17 `audience: platform-admin` entries, with the screens' labels. The rules to know:
  - the distributor codes differ by table (1 = UNFI in runs and sales; 3 = UNFI in customer links; 1 = UNFI in UPC mappings, DI14);
  - a failed sync may have loaded its rows (DI13);
  - the latest run per month is the one whose rows exist;
  - shipments always come from distributor sales, and the raw files only answer questions about the files.
- **Admin block:** names the pipeline topics, waives the raw-files NOT AVAILABLE entry for platform admins, keeps shipments on distributor sales, and says file locations and distributor logins are never available. The standard prompt is unchanged.
- **Eval:** Q54–Q59 (failed syncs and imports in the last 30 days, D131; a KeHE file against Caboodle; open store-list issues; merges; unmapped UPCs).
- **Tests:** solution 6,902 green, Intelligence 565 (coverage 97.9 %), DB tests 46 green with the owner's admin login (credentials scan with 29 new reviewed exceptions); build 0 errors, the only new warning the migration's CA1505.
- **Paid, $0.56:**
  - the check passed 7 of 9 ($0.48);
  - Q57 wrote "two issue types have none open" when one has none (C0c's kind), fixed by an example that lists every type with zeros;
  - Q53 was a claims-check false fail on its right "13 recipients", fixed in the notes;
  - the re-check passed 2 of 2 ($0.08).
- **At review (D132):**
  - the UPC mappings' audit user columns stay hidden;
  - the zero-unit KeHE lines will be dropped once that change reaches production, so the catalog no longer describes them (the sentence was removed before the commit);
  - the issue example that lists every type with zeros is accepted;
  - Q53's notes are accepted.
- **Concerns to visit one by one later (plan §7.2, "B10b concern 1–6"):**
  - the hard-coded store-list issue types;
  - re-recording the references when the zero-unit drop reaches the data;
  - the catalog rules once DI14 and DI13 are fixed;
  - the mask as the only guard on DI12's address;
  - checking the pipeline on staging before go-live.

  Also the bugs found outside Ask Caboodle: the Sync Runs list API, trigger labels, the export route, YoY % shown as dollars, the crawler's plain HTTP.

## Decided: C1, C1p and C1b planning (2026-10-17, docs only)

Planned in the B10b session; the owner took every decision there and starts the build in a new session.
- **C1 (D133–D139), build next:** plan §4 "What C1 builds on" and "C1 — decided design" are the spec.
  - **Checked sentences, typed out (D96):** `text-sentence {index, text}` and `text-rewind {keep}`; the final `text` stays; no raw deltas.
  - **When text goes out:** live release only after `present_answer` (D134).
  - **A corrected answer** keeps the sentences it repeats word for word (D135).
  - **The run trace:** live `step`, `tool-start` and `tool-end` events, and `GET sessions/{id}/messages/{messageId}/trace`, rebuilt from the transcript (no migration).
  - **Organization users get the trace with no database detail**; `done.queries` is for platform admins only; built now, checked in G2 (D136, D138).
  - **The agent always streams**, the eval included (D137).
  - **A cut stream** counts its `message_start` usage (D139).
  - **Paid check:** about $0.35, capped at $1.00, approved first.
- **C1p (D143), right after C1:** a live local test page for the owner. One HTML file in this docs repo, against the local API with the owner's token (plan §4 C1p). Post its short plan first.
- **C1b (D140–D142), after C1p:** 20 questions per conversation for everyone (a Platform Admin setting, `session_full`); Haiku 5.5 titles plus rename. Post its short plan first; its decisions are taken.

**Points found at planning that the build must handle** (plan §4 C1):
- **A mid-stream fallback** keeps the declined partial: when echoing that turn back, drop the thinking, redacted thinking and tool-use blocks before the last `fallback` block.
- **The splitter must equal `AskFigures.Sentences`:** test it on every answer in the eval reports, fed in random chunks.
- **The skill picks TypeScript when started from the docs repo;** the backend is C# (`csharp/claude-api/streaming.md`).
- **SDK names:** check the SDK's aggregator call (`BetaMessageContentAggregator`, `SseAggregatorExtensions`) with the compiler. Git Bash has no `strings`, so search the DLL with PowerShell.

After C1, C1p and C1b the order is C2–C9, G1–G8 and A1–A3 (A only if the demand gate says so). In GA, G1 finishes the `ask-caboodle` module's dependencies and G2 switches the endpoint to IAM's module guard: only then can organization users ask.

The FE team is reworking the theme. Plan §10 collects what the FE needs, for the final FE document.

## Done: C1 — checked text streaming and the run trace (commit `a01dfc13`, 2026-10-17)

Plan §4 "C1 as built" has the details. In short:
- **The agent streams** (`CreateStreaming` + `BetaMessageContentAggregator`); the claims check stays non-streaming (D137). Mid-stream fallbacks follow the echo rule.
- **Checked sentences** go out as `text-sentence` and `text-rewind`, with the release, hold, pause, keep and rewind rules of D134–D135; the final `text` is unchanged.
- **The run trace:** live `step`, `tool-start`, `tool-end`, and `GET sessions/{id}/messages/{messageId}/trace`; database detail and `done.queries` for platform admins only (D138). No migration.
- **Paid, $0.42:** smoke right; 6-case check 6 of 6, the streamed sentences ended as the answer in 6 of 6.
- **Committed at the owner's request;** the ten points beyond the plan's wording are listed in plan §4 for the owner to object to if needed.
- **Found:** the final text arrives in one burst. Cause (checked, $0.044): Sonnet 5.5 holds back text written right after a tool result until it is finished, whatever the request says; Sonnet 5 and a first reply stream normally. Options and the recommendation are in plan §7.2; the owner decides. Timing scripts: `burst-check.mjs`, `after-tool.mjs` (raw HTTP, the key read in the process only).
- **Launchers:** `smoke.ps1` now prints each event's time and the streamed usage; the eval report has a "Streaming (C1)" line and two timing rows.

## Done: C1p — local test page (docs repo, 2026-10-17)

`docs/ask-caboodle/test-page/ask-caboodle-test.html` (plan §4 "C1p as built"): open it from disk with the local API running (`dotnet run --project caboodle/src/Hosts/API/API.csproj --launch-profile Caboodle.Api.Development`), sign in with the `caboodle_dev` login. Each question is real: about $0.04, or about $0.10 for a platform admin's first question of an hour (the admin prompt is 15.5K tokens), billed to the key in `appsettings.Development.json`. The owner tried it live (3 questions: $0.102, $0.049, $0.087) and asked for the reveal order now built: the table or chart after the typed text. "It's looking great now." Tested free against a mock in headless Edge (scratchpad `c1p-test/mock-api.mjs`, `drive.mjs`, `drive-reveal.mjs`, and since C1b `drive-c1b.mjs`; recreate them if needed: the mock replays the smoke run's events from `smoke.log`. The latest copies, with C2's `suggestions` route (Bubbies gets everything, Acme Foods only Concepts and slowly, the brand `44444444-…` fails) and `drive-c2.mjs`, are in the C2 session's scratchpad `C:\Users\User\AppData\Local\Temp\claude\d--Fork-Onboarding-Journey\e1edcbb2-fda1-4cdc-b723-50726d5b910d\scratchpad\c1p-test`, while it lasts. Start the mock with `node mock-api.mjs smoke.log 5199 0.2`, then run `node drive-c2.mjs <page> shots`).

## Done: C1b — conversation limit and titles (commit `f8e56603`, 2026-10-17)

Plan §4 "C1b as built" has the details. In short:
- **20 questions per conversation** for everyone, platform admins included (D140, D141): the Platform Admin setting `sessionQuestionLimit` in `askcaboodleadmin/settings` (migration `20261017134829_AddAskCaboodleSessionQuestionLimit`, applied on local `caboodle_dev`, in BE `docs/AskCaboodle-Deployment.md`). **Only questions that used the model count (D144, owner).** At the limit, `session_full` before any model call.
- **Questions left** in the `session` event and `GET sessions/{id}`.
- **Titles (D142):** Haiku 5.5 writes a 3–6 word title from the question and the answer's headline after the first answer of a new conversation; it arrives in a second `session` event about a second after `done`, the composer already free. About $0.00003 each, added to the first question's cost (priced to 6 decimals: `ModelPrices.Estimate`'s 4 would round it to 0).
- **Rename:** `PATCH sessions/{id}`; a renamed conversation is never re-titled. A new conversation is saved when its first answer ends, so Rename stays off until then (owner at review).
- **At review the owner** compared it with ChatGPT (the same flow: the question as the temporary title, a title after the response) and kept the title material to the question plus the headline.
- **Found and fixed:** a follow-up rewrote the whole session row, which would have undone a rename made while it ran; follow-ups now update the counters and dates only.
- **Paid, $0.0003:** nine real questions, 9 of 9 titled in 0.7–1.3 s (table in plan §4). One wording slip: "stores" became "Retailers".
- **Test page:** "N of 20 questions left", the live title, rename from the header and history, `session_full` with "Start a new conversation".

## Done: C2 — suggested questions for an empty conversation (commit `4ff33590`, 2026-10-17)

Decisions D145–D152 are in plan §7; "C2 as built" is in §4. In short:
- **`GET askcaboodle/suggestions`** (the `BrandID` header; the same permission as the other endpoints until G2): `{ starters: [{ id, text, topic }] }`. No model call, nothing counted.
- **21 starters in `Suggestions/starters.yaml`:** 13 for brands in 8 topics, and 8 for platform admins. Each is the exact question of a golden case, and a test holds them together. No names or figures, relative periods only (D39); a unit test and a DB test enforce it.
- **Modules:** each starter lists its case reference's tables, and the catalog gives their modules (`ISchemaCatalog.StandardTableModules`).
  - Organization users go by their own access for the brands in scope (`BrandsInScope("ask-caboodle", View)`).
  - Platform admins with a brand go by the brand organization's switched-on modules (`EnabledModuleSql.ForOrganization`).
  - Without a brand, platform admins get only their own starters.
- **Data checks** (`AskStarterData`): seven checks, one query for every brand on the read-only login, kept an hour for everyone (0.3–0.8 s). On local data, 38 of 215 brands have recent sales and 29 have nothing.
- **Order:** the first starter of each topic first; the FE shows four.
- **Eval:** Q60–Q63, so 67 cases (the starters' wordings of Q04, Q08, Q16, Q17), with references recorded free.
- **Tests:** solution 7,013 green, Intelligence 676 (coverage 98.0 % unit-only), DB tests 60 green, build 0 errors.
- **Test page:** the starters come from the endpoint: four cards with a topic tag and "Show all". Tested free against the mock in headless Edge (`drive-c2.mjs`); C1p's and C1b's scenarios were re-run unchanged.
- **Committed at the owner's request**; nine points beyond the plan's wording are listed in plan §4. The owner tried it live and liked it.
- **Paid, $0.29 (after the commit):** Q60–Q63 4 of 4, none corrected. Q62 summarized 1,203 events across 113 promotions ($0.15, 7 steps). Q63 had one rejected `present_answer`: a year in the headline label.
- **Owner's questions at planning, answered in plan §4:** the follow-ups under an answer stay C0's (C5 may replace them with verified ones); a platform admin doesn't have to pick a brand.

## Done: C3 — pinned live reports (commit `31d598a4`, eval report `8e689053`, 2026-10-18)

Decisions D153–D159 are in plan §7; "C3 as built" is in §4. In short:
- **Periods (D153):** `run_sql` takes `period` (11 tokens plus `custom`, `custom_from`/`custom_to`); the server binds `@period_start`/`@period_end` and the result's first line states the dates. One prompt sentence in step 3; the tool list changed, so older conversations restart with their earlier exchanges.
- **Pins:** `POST`/`GET askcaboodle/pins`, `GET pins/{id}/render`, `PATCH pins/{id}` (title, period), `DELETE pins/{id}`; migration `20261017175702_AddAskCaboodlePins` (local `caboodle_dev`; `Down` checked). A pin keeps each shown result's call (the checked SQL and its period, or the calculator's arguments) and the view; render re-runs them with no AI call and applies C0's rules (D154).
- **Delta (D155), "not loaded yet" (D156), personal pins (D157), the nightly job `ask-caboodle-pins-nightly` at 03:00 UTC (D158), render under the viewer's access (D159).** BE `docs/AskCaboodle-FE.md` ("Pinned reports") and `docs/AskCaboodle-Deployment.md` list everything.
- **Eval:** `expect.period` on 24 cases, a reported `period` check.
- **Tests:** solution 7,095 green, Intelligence 760 (coverage 97.8 % unit-only), DB tests 65 green, build 0 errors.
- **Test page:** Pin under answers, pins in the rail, a board of live pins (delta, notes, "not loaded yet", period switch, rename, re-ask, delete). Tested free with `drive-c3.mjs`; the earlier drivers re-ran unchanged.
- **Paid, $0.37:** 7 of 8. The six relative questions took their token; Q04 and Q08 (named dates) typed their dates; Q62 listed TPR events only.
- **Follow-ups (owner, same day):** named-date examples in the period rule and Q62 accepting the TPR-only framing; re-check $0.24 (Q08 now `custom`; Q04 and Q17 still typed; Q17 failed on a claims-check misreading). The owner's live Q62 showed the fact check stopping a head-worked figure ("56" = 114 − 58) and the answer counting it with a query; it cost $0.107 over 9 steps, the high end for a listing question.

## Done: C4 — prompt gallery (commit `40efb441`, 2026-10-18)

Decisions D160–D169 are in plan §7; "C4 as built" is in §4. In short:
- **The short plan (D160–D164):** the organization's admins review organization prompts (platform admins too); private, organization and people in the same organization, nothing across organizations; runs by D144's rule; "Verified" on C2's starters only until C5; one `GET picker` call, starters first.
- **Widened at review (D165–D169, owner: "wrap this up here instead of a new plan"):** typed fill-ins (period, dates, retailer, banner, distributor, product, category, region, promotion, brand, text) with a label and a default, "any value" or the author's list; the brand's own values first (authorized, shipped in 12 months, promotions; distributor links); the Dates picker; "Make selection a fill-in" and the `{ABSCO}` hint; "Improve with AI" (Haiku 5.5, exactly the same fill-ins, before and after, 30 a day, cost in the monthly budgets).
- **Migration `20261017213333_AddAskCaboodlePrompts`** (local `caboodle_dev`; `Down` checked): `AskPrompts`, `AskPromptShares`, `AskPromptImprovements`, `AskMessages.PromptID`. No grants. Settings `ImproveModel`/`ImproveSeconds` (defaults work).
- **Endpoints:** `GET`/`POST prompts`, `PUT`/`DELETE prompts/{id}`, `POST prompts/{id}/review`, `GET prompts/values`, `POST prompts/improve`, `GET picker`; `promptId` on the ask and the new error `prompt_unavailable`. BE `docs/AskCaboodle-FE.md` ("Prompt gallery") and `docs/AskCaboodle-Deployment.md` list everything.
- **Tests:** solution 7,198 green, Intelligence 861 (coverage 96.9 % unit-only), DB tests 77 green, Release build 0 errors.
- **Test page:** the gallery in the rail (tabs, cards with fill-in pills, review, Run), the New/Edit form (insert and make fill-ins, cards per fill-in, preview, Improve with AI, sharing), the `/` picker. Tested free with `drive-c4.mjs` (13 scenarios); the earlier drivers re-ran unchanged. The mock with the prompt routes (`mock-prompts.mjs`), `drive-c4.mjs`, `run-c4.ps1` and `regress.ps1` are in `C:\Users\User\AppData\Local\Temp\claude\d--Fork-Onboarding-Journey\56cf18da-bac0-47dd-9603-54277e0ec947\scratchpad\c1p-test`, while it lasts.
- **$0 spent.** The paid improve check waits (above).

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
- `ANTHROPIC_API_KEY`, `IntelligenceSettings__ReadOnlyConnectionString` and (since B10a) `IntelligenceSettings__AdminReadOnlyConnectionString` are Windows **user** environment variables. VS Code doesn't pass them to the agent's shell. The launchers put the admin one in `ASK_CABOODLE_ADMIN_READONLY_CONNECTION_STRING`.
- The launchers below read them into the test process only and never print a value. The main dev connection string is in `caboodle/src/Hosts/API/appsettings.Development.json`.
- Recreate these launchers in the new session's scratchpad and **run them yourself with the PowerShell tool**. They are allowed in auto mode (checked again in B9); the owner doesn't want to run scripts for the agent. Paid runs still need the owner's go-ahead first.
- **What auto mode blocks:** ad-hoc secret extraction in bash (B9: a script grepping the DB password into `PGPASSWORD` for psql). For an ad-hoc read-only query, use a PowerShell script that reads the password into `PGPASSWORD` inside the same process, like the launchers do.

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
    [string]$Fallback = "1",
    [string]$Audience = ""
)
$ErrorActionPreference = 'Stop'
Set-Location "D:\Fork\Caboodle BE Repository\caboodle.backend"
$settings = Get-Content "caboodle/src/Hosts/API/appsettings.Development.json" -Raw
$env:ASK_CABOODLE_CONNECTION_STRING = ([regex]'"ConnectionString":\s*"([^"]*)"').Match($settings).Groups[1].Value
$env:ASK_CABOODLE_READONLY_CONNECTION_STRING = [Environment]::GetEnvironmentVariable('IntelligenceSettings__ReadOnlyConnectionString', 'User')
$env:ASK_CABOODLE_ADMIN_READONLY_CONNECTION_STRING = [Environment]::GetEnvironmentVariable('IntelligenceSettings__AdminReadOnlyConnectionString', 'User')
$env:ANTHROPIC_API_KEY = [Environment]::GetEnvironmentVariable('ANTHROPIC_API_KEY', 'User')
if ($Audience) { $env:ASK_CABOODLE_EVAL_AUDIENCE = $Audience }
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

**Free DB tests** (`dbtests.ps1`): the same first lines (the three connection strings, no API key), then:

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

**Free fact-check replay** (`replay.ps1`, no model calls; C0b):
- It starts with the same first lines as `dbtests.ps1` (both connection strings, no API key).
- It sets `ASK_CABOODLE_FACTCHECK_REPLAY` to a stored run's `.json` as an **absolute** path (a relative one is read from the test's `bin` folder), for example `D:\Fork\Caboodle BE Repository\caboodle.backend\docs\AskCaboodle-Eval\2026-10-16-claude-sonnet-5-5-medium-c0b.json`; optionally `ASK_CABOODLE_EVAL_CASES`, `ASK_CABOODLE_FACTCHECK_VERBOSE=1` (prints what each tool returned) and, for a run asked as a platform admin, `ASK_CABOODLE_EVAL_AUDIENCE=platform-admin` with the admin connection string.
- It runs `dotnet test … --no-build --filter "FullyQualifiedName~FactCheckReplayTests" --logger "console;verbosity=detailed"`.
- It prints, per case, what the current rules flag first (the first draft, else the answer) next to that run's claims-check findings.

**psql on `caboodle_dev`:** `C:\Program Files\PostgreSQL\17\bin\psql.exe`, host localhost, user postgres, database `caboodle_dev`. Read the password from `appsettings.Development.json` into `PGPASSWORD` inside a PowerShell script (B9's `b9-db-steps.ps1` pattern: refuse unless the connection string is localhost `caboodle_dev`, run `psql -w -f <file.sql>`, remove `PGPASSWORD` after), and never print it.

**Migrations on `caboodle_dev`:** the same PowerShell pattern with `$env:ASPNETCORE_ENVIRONMENT = 'Development'` and `dotnet ef database update --context MainDbContext --project caboodle/src/Database/Migrator/Migrator.csproj --startup-project caboodle/src/Hosts/API/API.csproj --connection $conn` (no `--no-build`). A grant-only migration can reuse the latest migration's Designer file when the model hasn't changed (diff its `BuildTargetModel` against the snapshot first).

**Paid title check** (`titles.ps1`, C1b, about $0.0003): reads `ANTHROPIC_API_KEY` from user scope into the process, sets `ASK_CABOODLE_LIVE_TITLE_TEST=1` and runs `dotnet test … --no-build --filter "FullyQualifiedName~LiveTitleTests" --logger "console;verbosity=detailed"`: nine real questions to the title model, each title printed with its time and cost. Nothing is saved.

**Paid improve check** (`improve.ps1`, C4, about $0.001–0.002): reads `ANTHROPIC_API_KEY` and the read-only connection string from user scope into the process, sets `ASK_CABOODLE_LIVE_IMPROVE_TEST=1` and runs `dotnet test … --configuration Release --no-build --filter "FullyQualifiedName~LiveImproveTests" --logger "console;verbosity=detailed"`: eight prompts improved with Bubbies' values looked up, each printed with its rewrite, note and suggested fill-ins. Nothing is saved.

**Build in Release while the owner's API runs (C4).** The owner keeps the API running from Visual Studio, which locks the Debug output: build and test with `--configuration Release` (and `--no-build` launchers with `--configuration Release` too), and never stop the owner's process.

**New migrations:** `dotnet ef migrations add <Name> --context MainDbContext --project caboodle/src/Database/Migrator/Migrator.csproj --startup-project caboodle/src/Hosts/API/API.csproj` with `ASPNETCORE_ENVIRONMENT=Development` (no database connection needed). Check that the snapshot diff holds only your change, and set a sensible `defaultValue` for a new non-null column (EF writes 0).

## Lessons from recent sessions

- **Every model the code calls needs a price check (C4).** An unpriced `ImproveModel` would have run with cost 0, so the spend would never have reached the budgets; titles already refused without a price. `AskModelPriceCheck` now warns for the agent's, the title and the improve models; add any new model there and refuse the call without a price.
- **The read-only gateway binds a null as an untyped parameter (C4).** `COALESCE(@term, '')` fails on Postgres ("could not determine data type"); cast every optional parameter (`@term::text`, `@ids::uuid[]`).
- **Owner add-ons are package-sized (C4).** "Typed fill-ins and an AI polish" doubled C4. Size such a request out loud (I sized it as a C4b) and let the owner choose before building; the owner chose to fold it in.
- **`git add -N` to list new files leaves intent-to-add entries (C4).** Undo them with `git diff --name-only --diff-filter=A -z | xargs -0 git reset -q --`.

- **Npgsql reads its legacy-timestamp switch once, at first use (C3).** The API sets it in `UseDatabase` at start-up; a test class that queries through `NpgsqlSqlGateway` before any EF context then can't write `DateTime` columns ("Kind=UTC to timestamp without time zone"). Set `AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true)` in the class's static constructor (`AskPinDatabaseTests`). A class passed alone and failed with others, which is how it showed.
- **`BrandsInScope` is the brand on screen when one is selected (C3).** To ask "may this person use brand X", use `BrandsWith(slug, action)`; `BrandsInScope` would have marked a pin "access changed" while another brand was open.
- **The SQL gateway returns dates as text** (`SqlValueFormatter`: "yyyy-MM-dd", or with a time), so code reading its rows parses them (C3's loaded months).
- **A calculation out of time has no promotions either (C3):** check `NotCalculated` before `NotFound`, or a slow calculation reads as "promotion missing".
- **The API's shapes for the FE (C3):** validation errors are `{ "error": { "messages": { "<key>": "<text>" } } }` (the test page's `readError` now reads them); a not-found is a plain-text body; camelCase keeps an `ID` suffix (`SessionID` → `sessionID`).
- **Re-running the test page's drivers (C3):** the mock keeps state between runs and the older drivers don't create their screenshot folder. C3's scratchpad `c1p-test/regress.ps1` restarts the mock for each driver and `compare.mjs` compares with the saved results (only problems and changed strings; numbers are timings). Those copies are in `C:\Users\User\AppData\Local\Temp\claude\d--Fork-Onboarding-Journey\83a88eb8-6724-4583-bd87-9c97c96a0661\scratchpad\c1p-test`, with `drive-c3.mjs` and the mock's pin routes, while it lasts.

- **`x IN (SELECT …)` over a big table needs `DISTINCT` (C2).** Without it, Postgres judged the million distributor-sales rows too big to hash and re-read them for each of 215 brands: 12 s under the read-only login's 15 s timeout. With `DISTINCT` the list is hashed once: 0.26 s. Time a new query under the read-only login with `EXPLAIN ANALYZE` before relying on it.
- **Look at the data before choosing a filter (C2).** All 215 local brands have every brand module switched on (IAM's backfill), so a module filter alone changed nothing; only 38 have recent sales. The data check is what keeps most brands from "nothing found" starters.
- **A missing key isn't "no data" for every rule (C2).** A brand the hourly check hadn't seen lost even the starters that need no data; a unit test caught it. Test the absent case on each branch of a filter.
- **YamlDotNet flow mappings (C2):** an unquoted value ending in `?` inside `{ … }` fails to parse ("did not find expected ',' or '}'"); quote it.
- **Starters tie to the eval by exact text (C2).** Rewording a starter means rewording or adding its golden case; `AskStarterLibraryTests` fails otherwise.

- **`ModelPrices.Estimate` rounds to 4 decimals (C1b).** A Haiku title costs about $0.00003 and priced as 0, so it would never have reached the budgets. Price tiny calls to 6 decimals, as `AskMessages.CostUsd` stores them.
- **A repository `UpdateAsync` writes every column (C1b).** Saving a follow-up through it would have undone a rename made while the question ran. Update only the columns you own (a targeted SQL update), and make background writes conditional ("only while the title is still the question").
- **A new conversation exists only once its first answer is saved (C1b).** Anything keyed on the session (rename, `GET sessions/{id}`, the trace) returns 404 during the first answer; the FE keeps Rename off until then.
- **Headless Edge (C1b):** `input.blur()` fires nothing when the page has no focus; dispatch `new FocusEvent('blur')`. And a regex written through a bash heredoc inside a JS template literal lost its backslash (`/\s+/` became `/s+/`): write such scripts with the Write tool.

- **Check what the code says against the data (B10b).** `KeHeQuantityRule` says zero-unit KeHE lines are never saved, but the restored data holds 261 K of them, loaded as late as 2 Oct. A catalog sentence based on the code ("not loaded") would have been wrong. Also check an assumed link before acting on it: the UPC mappings' `CreatedBy` was assumed to be the resolver, and it is empty on every row.
- **Survey in parallel, then verify (B10b).** Four read-only Explore agents (one per table group) mapped the enums, writers and screens in about 11 minutes. Each enum and claim the plan relies on was then checked with one query (e.g. 272 of 273 provider-1 UPC mappings are UNFI UPCs).
- **List every category, zeros included (B10b).** Q57's "by type" query returned only the types with open issues, and the model wrote a wrong count about the missing one. An example that lists every type with 0, as the screen's cards do, removed it.
- **Say which part an eval note withholds (B10b).** "Recipients are not available" made the claims check fail a right recipient count; say "the addresses are not available; the count is".
- **Line endings (B10b):** the Write tool and `sed -i` can leave LF. Normalize every changed file to CRLF with a PowerShell `ReadAllText`/`WriteAllText` pass (keep the BOM when there is one) before the final build and tests.
- **Build warnings per file (B10b):** the console wraps long lines, so a `Select-String` on `dotnet build` output misses them. Use `-flp:logfile=<path>;verbosity=minimal` and filter the log.

- **Check the column the app's screen uses, even for a decided case (B10a).** D123 counted `InvitedUsers."ParentUserID"` (2 of 51) as the inviter; the Admin "Invited users" screen uses `"CreatedBy"` (48 of 51). Grep the screen's query before writing the rule or the eval case.
- **Look inside free-text and JSON columns before granting them (B10a).** `OrganizationBackfillRuns."Report"` lists 18 email addresses; a `LIKE '%@%'` count per granted text or jsonb column found it.
- **YAML flow mappings (B10a):** quote any value with an apostrophe (`''` is unescaped only in single-quoted scalars) and any type with brackets (`'uuid[]'`). `SchemaCatalogTests` now fails on a `''` left in prose.
- **Count warnings with `dotnet build caboodle.sln --no-incremental` (B10a):** an incremental build doesn't re-emit the warnings of projects it skips, so new warnings can look absent.

- **Look at the data before writing an eval case (B9).** Q45 was first written for `SPROUTS 2026 - MD`, which has no fees at all. The free reference run showed it. Bubbies has one real approved promotion fee (HEB 2026), so the case moved there.
- **A tool should print every total the model will state (B9).** Q45's right "$47,073" (AD/TPR + promotion fees) was flagged because the tool printed only the two parts. The fee header now states the total. The same idea as D105's row count in `present_answer`.
- **Check which column the app's screens actually use (B9).** `CRM.Banners."RegionID"` exists, but every banner and region screen joins `CRM.RetailerRegions`, and the two disagree for all 459 linked banners. Grep the app's queries before writing a catalog rule.
- **Copy the screen's quirks, don't fix them (B9, D112).** With a month filter, the screen still counts a coupon's non-promo units inside the coupon's own dates. Ask Caboodle matches the screen; the tool's text explains the counting rules.

- **Replay before paying (C0b).** The free replay over C0's stored answers showed 16 of 48 flagged before tuning and 4 after, at $0, and the live runs then matched it.
- **A rule that excuses figures must not hide the ones it doesn't need to (C0b).** The "inside a name" rule first ran before the check, so "cases 47,412" was skipped and couldn't serve as an operand for "4,800 fewer". Excuse only figures that would otherwise fail.
- **Show a percentage near a threshold with a decimal (C0b).** The report printed 10.4 % as "10 %", hiding that D103's limit was passed.
- **A "worse" pass rate needs a history check before any blame (C0b).** 40 → 38 was cases that have flipped before; compare the same cases across earlier runs (each runs once, so ±2–3 is normal).
- **Moq's `SetupSequence` can't read the cancellation token.** Use `Setup(…).Returns<CancellationToken>(…)` with a call counter.
- **Never write markdown with backticks through bash double quotes** (`node -e "…"`): bash ran each backticked word as a command and deleted it. Edit docs with the Edit tool.
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
