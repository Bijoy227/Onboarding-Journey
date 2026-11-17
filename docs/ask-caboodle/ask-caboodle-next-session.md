# Ask Caboodle — Handoff for the next session

Updated 2026-11-16, after the FE contract fixes (`7a156843a`), the fourth `develop` merge (`f71c649ee`) and develop sync 3 with the period examples (`e45bf2c17`, with its eval report). Before them the same day: the third `develop` merge (`d36d3ac20`), G1 (`905d8bdc7`) and the Pipeline cases with the sync error text (`447ed8a5d`, with its eval report). Written 2026-11-12, after the second `develop` merge (`fd497f8e6`) and develop sync 2 (`f2a93e64f`, with its eval report). Before them: the FE handover (`a71c5d9dc`), C9.1 (`053371c2`), the IAM sync (`607edfd6`) and the first `develop` merge (`52cca716`). Read this first, then §0, §4 "Develop sync 2", "C9.1" and "IAM sync", §5 (GA, with the G1, G3 and G4 notes from develop sync 2), §7.2, §8, §9 and §10 of [`ask-caboodle-be-implementation-plan.md`](ask-caboodle-be-implementation-plan.md).

## Starter prompt (next: C0c's paid check and commit, then G2)

> Read `docs/ask-caboodle/ask-caboodle-next-session.md`, then §0, §4 "C0c" (with "As built"), "FE contract fixes" and "FE integration run", §5 (GA, with G1 as built), §7.2, §8 and §9 of `docs/ask-caboodle/ask-caboodle-be-implementation-plan.md` in `D:\Fork\Onboarding-Journey`. The backend is `D:\Fork\Caboodle BE Repository\caboodle.backend`, branch `feature/ask-caboodle` (last commit: the FE integration run's FE updates entry `2ebe501b9`, after the FE contract fixes `7a156843a`; then C0c `7a3ed4939`; working tree clean apart from the owner's own untracked docs).
>
> First fetch and tell me whether `origin/develop` has commits after `94374e4f1`; don't merge without my go-ahead. Paid runs need my words "run the paid check" with the cost stated; the permission check refuses anything less.
>
> If C0c is still uncommitted (see "Waiting for the owner (C0c)"), ask me for its paid check in so many words ("run the paid check", about $1, cap $1.20), report it, and wait for my "commit". Then post G2's short plan (plan §5 G2: organization users can ask; D108's prerequisite C0c done), with its open decisions in simple English, and wait for my go-ahead. Platform admins ask from the admin panel (D243); the FE builds that.
>
> Run the free launchers yourself (PowerShell). Finish in the usual order: build with 0 errors, all tests green, my review, then a one-line commit. Paid runs still need my approval first, with the cost stated.

## Done (C0c, 2026-11-17)

- **Decided (owner, 2026-11-17):** platform admins ask from the admin panel only (D243; the FE updates document tells the FE team it needs the Ask screens and a brand picker there). C0c: checks only, C0b's rewrite-then-note, clear cases only, a targeted paid check (D244–D247).
- **Committed** `7a3ed4939` (plan §4 C0c "As built", D248): the facts line under each result, the statement check (counted lists, rankings, peaks and lows, "every month", "rose … then eased", a figure on the wrong row), the hold for counted lists, the correction wording, prompt rules, the eval judge's full-table note, the guide rule (review batch 3), the FE contract and updates document. Solution 10,333 green (Intelligence 1,142), DB tests 84.
- **Free replay:** 626 stored answers, 7 flags, all right, none false (4 first-pass false alarms fixed and kept as tests). The checks catch 3 of the 12 sized mistakes; the rest are left to the prompt rules.
- **Paid check, $0.97 (owner: "run the paid check"):** 11 of 12. Q55's "four groups" was caught live and corrected (the eval judge missed it on the draft, so the report calls it a false alarm). Q62 failed on dates against the window and "the table shows only the first rows". No statement false alarm. Report `docs/AskCaboodle-Eval/2026-11-17-claude-sonnet-5-5-medium-c0c.md`, committed with it.

## Waiting for the owner (FE integration run, 2026-11-16)

- **Ran** both FE branches against the local API (plan §4 "FE integration run"); paid $0.28, 5 questions (balance about $40.21).
- **Decision needed (owner + FE team):** platform admins can't reach Ask Caboodle in the app (IAM guards send them to `/use-admin-app`; the admin panel has no Ask screen), and the app never sends a `BrandID` for a platform admin. Likely shape: let platform admins open Ask Caboodle in the app with a brand picker. No backend change.
- **Committed:** the FE updates entry (BE `2ebe501b9`), with this plan and handoff.
- **Local leftovers** (deletes refused by the permission check): a proposed example, a decided to-fix item, a pin and four test conversations; listed in plan §4.
- **How it ran** (for a re-run): `git archive` of each branch into a folder on D: (Next can't follow dependency links across drives), junctions to their `node_modules`, `.env` with `NEXT_PUBLIC_CABOODLE_API_URL=http://localhost:5000`, the mock switches off, `next dev` (admin with `--webpack`: Turbopack refuses the junction), the API with scratchpad `m3/api-run.ps1`, Playwright scripts in scratchpad `pw/` (separate Chrome profiles per app: NextAuth cookies on `localhost` are shared across ports). The owner signs in; the login page takes `?email=`.

## Done (FE contract fixes, 2026-11-16)

- **Committed** `7a156843a` (plan §4 "FE contract fixes", D238–D242; owner: "go for the package", item 2 as recommended):
  - the to-fix save works (the validator's `MessageId` rule removed);
  - editors get each prompt fill-in as saved (`saved`); a save keeps other brands' values; an approval stays when nothing changed;
  - the title's `session` event keeps `webSearch`;
  - a refused question is a 400 JSON (`EventStreamAttribute`);
  - contract fixes (`entityID`/`brandID`, 366 days counting both ends, `saved`);
  - the new FE document BE `docs/AskCaboodle-FE-Updates.md` (backend changes and the FE-side list), linked from the handover.
- **Results:** solution 10,314 green (Intelligence 1,123, API 59), DB tests 84, Release build 0 errors. No paid check (the agent's answers don't change).
- **For the FE team:** `docs/AskCaboodle-FE-Updates.md`, `AskCaboodle-FE.md` and `AskCaboodle-FE-Handover.md` reach them when `feature/ask-caboodle` is pushed (owner's call; nothing since `42f00437`, 19 Oct, is pushed), or the owner sends the files.
- **Next (owner, 2026-11-16):** the FE integration run.

## Done (develop sync 3 and the period examples, 2026-11-16)

- **Merged and committed:** the fourth develop merge `f71c649ee` (CS-1679: a promotion event must end on or after its start, in the same year, checked on save; CI change).
- **Committed** `e45bf2c17` (owner, 2026-11-16; plan §4 "Develop sync 3", D236–D237): the guide's event date rule; the 13 catalog examples with a window now pass `run_sql`'s period and name it; two guard tests; four golden references start on 13 Sep (figures unchanged). Solution 10,305 green, DB tests 84 green.
- **Paid re-check, $0.46 (owner: "run the paid check"):** 3 of 6 (Q52, Q53, Q58). Every window and every figure right. Q55 ("four groups" over three), Q54 ("most mapped thousands", 5 of 13 did) and Q62 ("starting in the window" for two that start before it) failed on one sentence each: C0c's kind, added to its sizing (plan §7.2). Report `docs/AskCaboodle-Eval/2026-11-16-claude-sonnet-5-5-medium-period-examples.md`, committed with it.
- **FE (owner, 2026-11-16: "FE is done"):** branch `feature/CS-1362-dashboard-ask-caboodle` in `caboodle.web` (app screens) and `caboodle.admin` (platform-admin screens). Both run on sample data (`USE_ASK_CABOODLE_MOCK = true`; admin `USE_MOCK_DATA: true`, "backend not on any environment yet"), not tried in a browser. The field-by-field contract check followed (section above).
- **New data issue DI18:** older promotion events break the new rule locally (38 approved and 14 sandbox end before they start; 15 and 16 cross a year). Recorded, not fixed.
- **Constance:** review batch 2 gained the event date rule. If batch 2 has already gone out, the line goes with the next batch.

## Done (Pipeline cases and sync error text, 2026-11-16)

- **Committed:** `447ed8a5d` (plan §8 "Pipeline cases + sync error text", D235), with the paid check's report.
- **Paid check, $0.29 (owner approved):** 3 of 4. Q81, Q82 (the new Pipeline cases) and Q41 passed. Q55 failed, not because of this batch: the ImportJobs catalog example for Q55's own question filtered with `CURRENT_DATE - 30` instead of the period. Fixed in develop sync 3 (above).
- **Done:** the local Pipeline move (359 projects, 794 tasks; recorded under the platform admin's account; files skipped locally). The security item: Ask Caboodle no longer reads a sync run's error text (D235); the app team should still redact it at the source, and then a new migration grants it back.
- **Constance:** the owner sends the review documents on 2026-11-16.

## Waiting for the owner (from G1, 2026-11-16)

- **G1 is committed** (`905d8bdc7`, owner, 2026-11-16; nothing pushed). Plan §5 "G1" has the finding and what was built; D231–D234 in §7.
- **The finding behind it:** in IAM's module list, an "optional data source" link changes nobody's access but locks the admin's module switches like a required one. The planned links (distributor sales, SPINS, KeHE, UNFI, monthly report, Pipelines) would have made every brand need all of them to use Ask Caboodle. None were added; what Ask Caboodle reads follows each person's modules in G3.
- **`Organization.PlatformStaffInvitations` is not read (D234):** the owner didn't take it up; say the word to have it read like the organization invitations, without the email and token.
- **Still waiting from before:** done or moved to the section above (the Pipeline move, Q81/Q82, the security item, Constance's batch 1).

## Waiting for the owner (from develop sync 2, 2026-11-12)

- **Committed** (owner, 2026-11-12): the FE handover `a71c5d9dc`, the merge `fd497f8e6` and develop sync 2 `f2a93e64f`; nothing is pushed (Bitbucket's `feature/ask-caboodle` is still at `42f00437`, 19 Oct).
- **Security, before staging (plan §11; decided 2026-11-16, D235: the column is hidden):** the KeHE crawler's validation errors can echo the request (with the KeHE login and password) into `DataSyncRuns."ErrorMessage"`, which platform admins' login reads. None of the 52 local messages does. Either the app team redacts the crawler's error text, or a grant migration hides the column from `askcaboodle_admin_ro`.
- **Run the Pipeline move locally (done 2026-11-16 by Claude, through a harness)** (CS-1652 runbook step 4): restart the API on the merged branch, then as a platform admin `POST /api/v1/pipelinemigration/run` and wait for `GET /api/v1/pipelinemigration/status` to show it completed. Until then the new Pipeline is empty locally (the old one holds 359 boards; Bubbies 2 boards, 21 cards).
- **Then the Pipeline cases** (drafted, not in `golden.yaml` yet): Q81 "How many open tasks do we have in our Pipeline, and how many are overdue?" (open and done by status category, overdue against 2026-10-12; moved tasks have no due date, so none is overdue) and Q82 "Which projects are in our Pipeline, and who owns each one, us or a brokerage?" (projects by owner). Record their values from the moved data, then the paid check with the Q41/Q55 re-check, about $0.30.
- **D223–D230 were decided by Claude** along the owner's answers (plan §7): the ones to look at are D224 (until G3/G4 a brand's Pipeline is every project filed under it, with its owner) and D227 (shared-address rules and the KeHE sync choices not catalogued, on request).
- **Found, not changed** (plan §4 "Develop sync 2"): monthly report actuals can double after a back-dated relink; a sandbox push can give an event a distributor the app then hides; a relinked event with no price gets none while a moved one gets 0; a price import overwrites a valid-from date; the KeHE sync accepts an inferred connection. DI17 (simple promotions' per-month fee copies from before CS-1826; none locally).
- **Send Constance the review documents:** all three batches were regenerated with the current guide (about 20 entries changed); batch 1 is still unsent.
- **Try it live:** restart the API (the grants migration is applied locally). The catalog, glossary and guide changed, so the first question writes the hourly cache again (about $0.06). On Bubbies: "Which distributor serves Sprouts for us, and at what markup?" (the current link), "What were the fees on our Publix promotion?"; as a platform admin: "Which KeHE syncs ran last month, with which supplier?"; after the move, "What's overdue in our Pipeline?".

## Waiting for the owner (from C9.1, 2026-11-04)

- **D215–D222 were decided by Claude** (the owner delegated C9.1's decisions and reviewed at the end): listed in plan §7 for the owner to overturn. The two to look at: D221 (which brokerage reviews a brand sees is stated, not filtered, until G4) and D222 (the examples seed left as is; its distributor-sales examples go out of use by themselves).
- **Found, not changed** (plan §4 "C9.1"): the app's on-screen velocity takes the weeks from the current page's products only; rows released later from the unmapped queue keep KeHE's region text or none (app team, D6).
- **Try it live:** restart the API (no migration). The catalog changed, so the first question writes the hourly cache again (about $0.06). On Bubbies, "How many stores did we ship to in September?" now gives 4,986, the app's figure.

## Waiting for the owner (from the IAM sync, 2026-11-03)

- **The IAM sync's four points beyond the plan's wording** (plan §4 "IAM sync"): committed at the owner's request, listed for the owner to object to. The biggest: `Identity.UserClaims` left B10a's "never granted" list, because since CS-1812 it holds only Platform Staff permissions.
- **Q76 prints database codes: fixed in C9.1** (D220); it passed C9.1's paid check.
- **Send Constance the review documents:** all three batches were regenerated with the current text (batch 2 again in C9.1 for the store-count rule; batch 1 still unsent, D211).
- **Platform Staff in Ask Caboodle (D210):** ordinary users for now; decide again at G3 (plan G3 note).
- **Try it live:** restart the API on the merged branch (all migrations are applied locally). The catalog and guide changed, so the first question writes the hourly cache again (about $0.06). As a platform admin, "Who are Caboodle's platform staff?" (none locally) or "How do invitations work?"; on Bubbies, "Which category reviews are on our calendar?". The admin role names change to "Organization Admin" when the API's role seeder runs at start-up.

## Waiting for the owner (from C9, 2026-10-19)

- **C9's eight points beyond the plan's wording** (plan §4 "C9 as built"): committed at the owner's request, listed for the owner to object to. The biggest: 65 entries (not about 55), each with business rules and an example, and module names (Broker Market Activities, Retail Reports, Sales Tracker) used as names, which D88 held back until C9.
- **The re-check after the free fixes: done in the IAM sync (D212, $0.69):** Concepts 8 of 9 counting Q42 under D214 (C9: 4 of 9), Q01 and Q10 passed; Q76 now fails on glossary codes (above). C9's own check ($0.48) had passed Q01, Q10 and 4 of 9 concept cases. The fixes: a guide answer is `answer` (Q43, Q44, Q76 had right text as `cannot_answer`); the AI never says what the asker can do (Q78); the claims check gets the glossary and stops judging data-collection statements against the guide (Q76, Q80); and an eval fault since C3: queries with a period token were hidden from the claims check (Q80; it only ever made the check stricter).
- **Send Constance batch 1** ([`ask-caboodle-guide-review-batch-1.md`](ask-caboodle-guide-review-batch-1.md), 27 entries; batches 2 and 3 after), as is or as a Word file. Five entries carry a question for her: the authorization statuses, APL's name, MCB's 1.45 book cost, net revenue's allowances, and the market overview's order of statuses.
- **Decide on C9's findings** (plan §7.2): the catalog lines the code contradicts, the store count first (since CS-1718 the app counts Store List stores, the catalog customer names); net revenue taking the allowances off twice (for Constance); the list for the app team.
- **Try it live:** rebuild and restart the API (no migration). The prompt and tools changed, so the first question writes the hourly cache again (about $0.06); a guide question costs about $0.02. Ask "What is a promotion family?" or "How does a product connect to retailers?"; the source note says "Caboodle guide (not yet reviewed)". **Caboodle guide** in the rail lists every entry.

## Waiting for the owner (from C8, 2026-10-19)

- **C8's ten points beyond the plan's wording** (plan §4 "C8 as built"): committed at the owner's request, listed for the owner to object to. The biggest: the eval results are a file that ships with the code (D198), not a table, and each run shows as its report scored it (C0's full run shows 36 of 45; the plan's 40 came from the kinds fix at review).
- **The eval card says "not recorded"** until a full run records the prompt and catalog versions: every run so far predates C8. The next full run (about $3.45, approved first) would give it one; not proposed now.
- **Try it live:** rebuild and restart the API (the migration is applied locally). As a platform admin, open **Flight recorder** in the rail. Free: no AI call. Locally there are only the owner's 21 test questions (16–18 Oct): "Last 30 days" shows them. The to-fix list is empty until an answer gets a thumbs down (give one, and it appears under Open); mark it Fixed with a note and a case id such as Q75.

## Waiting for the owner (from C7, 2026-10-19)

- **C7's nine points beyond the plan's wording** (plan §4 "C7 as built"): committed at the owner's request, listed for the owner to object to. The biggest is D196: the server, not the AI, works out which options offer to save a name.
- **To do, D197: the clarify options should be the matches the brand sells to** (plan §7.2). "How are we doing at Fresh?" offers Sun Fresh, Fresh Plus, Amazon Fresh and Fresh Direct, not The Fresh Market (11,723 cases in the last 12 months) or Fresh Thyme Market (2,767). The proposed server rule ranks the matches by the brand's cases from an hourly query (1.5 s for all brands), with no extra step or model call. Its check: Q74, Q14 and Q12, about $0.20.
- **Q14 answered without asking** in the paid check, as in the owner's live test: it took The Fresh Market and named no other, so there was nothing to offer. It flips between runs; watch it in the next full run (plan §7.2).
- **Try it live:** rebuild and restart the API (the migration is applied locally). The tool definition changed, so the first question writes the hourly cache again (about $0.06). On Bubbies, ask "How are we doing at Fresh?", click an option, then **Remember**. In a new conversation, "How many cases did we ship to Fresh this year?" should answer for that retailer without asking. **Saved names** in the rail lists and removes names; admins can also add one there.

## Waiting for the owner (from C6.1, 2026-10-19)

- **Q71's category total and two pattern claims** (plan §7.2): it answered from SPINS Item Ranking as it should, but summed only the items with a year-ago change ($61.7M, not $62.6M), and said growth was "concentrated in a few items" and "driven by distribution". These are C0c's kind. **Decided (owner): left for C0c.**
- **Q25's wording slip** (plan §7.2): "I can't tell which promotions are cancelled", when the data marks 67. It isn't caused by the line, so it's noted and should be watched in the next full run.
- **Remember (owner):** the hourly SPINS check reads both SPINS tables whole (no brand index). Time it on staging before go-live (BE runbook checklist 6b, query 6; plan §11).
- **DI15:** Primal Kitchen's Item Ranking holds Dr. Tung's store-level rows. Ask which file was meant. Until then, its data line says it has Item Ranking data.
- **Not run, by the owner's choice ("no need if optional"):** Q01 and Q10 as controls for the new glossary entry, and Q26 with web search for the changed web rule.
- **Test page fix (owner, 2026-10-19):** changing brand failed with "sortingOrder is required": `GET brands` declares a non-nullable `string sortingOrder` with a default, and .NET 6 treats it as required. The page now sends `sortingOrder=ASC` (the backend's `Constants.SORTINGORDER`).
- **Try it live:** rebuild and restart the API (no migration). The glossary changed, so the first question writes the hourly cache again (about $0.06). On Rise & Puff, ask "How do we rank in our category?". On Bubbies, "What's trending in frozen novelties nationally?" should name only Bubbies' data and offer web search.

## Waiting for the owner (from C6, 2026-10-19)

- **C6's eleven points beyond the plan's wording** (plan §4 "C6 as built"): committed at the owner's request, listed for the owner to object to.
- **Follow-ups from the 9-case check** (plan §7.2), built at the owner's request ($0.50):
  - **Q66, done:** a web figure passes only when a passage the same answer cites holds it. Q26 and Q66 passed.
  - **Q69, done in C6.1:** with the brand's data line, Q69 passed 2 of 2 and offers only what Bubbies has (D186).
- **Before staging:** web search must be allowed for the Anthropic organization of the environment's key (Claude Console, privacy settings), and G8's data-handling statement must mention it (plan §11). Locally it works: the local API's key (in `appsettings.Development.json`) is the same key as the Windows `ANTHROPIC_API_KEY` the smoke and eval runs used, and those ran real searches (checked 2026-10-19 without printing either key; scratchpad `c6/key-source.ps1`).
- **Try it live:** rebuild and restart the API (the migration is applied locally; its `Down` round trip cleared the "web search" mark on earlier local conversations). On the test page, "Search the web" sits next to Ask for a new conversation; a web question costs about $0.05–0.11.

## Waiting for the owner (from C5a, 2026-10-18)

- **D177, the examples in the question are off** (`ExamplesPerQuestion` 0). The owner delegated the call: "if it doesn't worth it then shut it down".
  - **Evidence:** three paid checks ($1.02). 18 answers with examples passed 13; the same cases' last runs without passed 17. Every figure was right, and each failure was one sentence of wording. Only 2 answers saved a step, for 3–5 % more per answer.
  - **Turning them back on** is one setting (`2`); the eval measures them with `ASK_CABOODLE_EVAL_EXAMPLES=2` or `own`.
- **19 golden-case proposals** are left to verify, on the test page's "Examples" panel (free). Each shows its passing run's answer first. There is no rush while the examples are off; they matter for C5b and for the suggested questions.
  - The owner verified Q10.
  - Claude verified Q12, Q18, Q19 and Q22 for the owner, after re-checking their figures on `caboodle_dev`, with a note on each (owner: "review the questions on your own").
- **The 100-question draft** for Constance: [`ask-caboodle-starter-library-draft.md`](ask-caboodle-starter-library-draft.md) (D171). Its paid run (about $4–6) waits until she has marked it.
- **C5a's thirteen points beyond the plan's wording** (plan §4 "C5a as built"): committed at the owner's request, listed for the owner to object to.
- **To do, after the final UI:** simpler admin screens (plan §10.10) and a Platform Admin user manual (plan §8 "Admin manual").
- **Try it live:** rebuild and restart the API first (the seed syncs at start-up). The examples panel, verifying and "Similar examples" are free; "Similar examples" now says the examples are switched off.

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
| **Backend branch** | `feature/ask-caboodle`. Since 2026-11-16: the third `develop` merge `d36d3ac20` (`origin/develop` @ `49e3b55d9`, PR #927) and G1 `905d8bdc7` on top. Since 2026-11-12: develop sync 2 `f2a93e64f` (with its eval report), after the second `develop` merge `fd497f8e6` (`origin/develop` @ `719490ad2`) and the FE handover `a71c5d9dc`. Then C9.1 `053371c2` (with its eval report, 2026-11-04), after the IAM sync `607edfd6` (with its eval reports) and the `develop` merge `52cca716` (2026-11-03). Pushed by the owner up to `42f00437` (last push 2026-10-26); everything after it is local only, so the "is at B8b" sentence at the end of this row is out of date. Before them: C9's eval report `42f00437`, after C9 `b481988e` and C8 `e4fbdd34`, after C7's eval report `f19df64d` and C7 `5f650db6`, after C6.1's eval reports `714ba095` and C6.1 `ed309b8c`, after C6's eval reports `66702182` and C6 `e36c6734`, after C5a's eval reports `7477212d`, C5a `4ee2a349` and C4 `40efb441`. Earlier commits: the C3 follow-up `280b39e2`, C3's eval report `8e689053`, C3 `31d598a4`, C2's eval report `711dcaef`, C2 `4ff33590`, C1b `f8e56603`, C1 `a01dfc13`, B10b `e26a5f52`, C0b.1 `5f7e7f84`, B10a `26a85f3f`, B9 `a8387b82`, C0b `6da28c2d`, C0 `a102eed1`, B8b `b2f00e22`, B8 `02a256b6` and the IAM merge `4d0830e6`. `origin/feature/ask-caboodle` is at B8b (`b2f00e22`); C0, C0b, B9, B10a, C0b.1, B10b, C1, C1b, C2, C3, C4, C5a, C6, C6.1, C7, C8 and C9 are local only. Never push unless the owner asks. |
| **Logins on `caboodle_dev`** | `askcaboodle_app` (standard) and, since B10a, `askcaboodle_admin_app` (platform admins), both created by the owner; their connection strings are the user variables below. |
| **Docs repo** | `D:\Fork\Onboarding-Journey`, branch `caboodle-access-v2`. Docs commits are one line: `Update - Ask Caboodle docs - …`. |
| **Model in the app** | **Sonnet 5.5, effort medium** since B7b (D45). Since B8, prices come from the `ModelPrices` table in code, per model and per attempt; the five price settings are gone. Development and Staging settings say `claude-sonnet-5-5`. |
| **Tests** | With G1 (after the third merge): solution 10,270 green across 17 projects (Intelligence 1,116, two new in `Catalog/ModuleSeedTests`), DB tests 84 green, Release build 0 errors. With develop sync 2: solution 10,227 green across 17 projects (the second merge brought about 2,500 tests of other modules and the Pipelines test project; Intelligence 1,114), DB tests 84 green, Release build 0 errors, the only new warning the migration's CA1505. With C9.1: solution 7,697 green across 16 projects (Intelligence 1,113), DB tests 84 green (they also run every catalog example's SQL), Release build 0 errors. With the IAM sync: solution 7,697 green across 16 projects (the `develop` merge brought about 250 tests of other modules; Intelligence 1,113), DB tests 84 green, Release build 0 errors. With C9: solution 7,447 green across 16 projects (Intelligence 1,110), DB tests 84 green, Release build 0 errors and no new warnings. With C8: solution 7,371 green across 16 projects (Intelligence 1,034; C7: 7,353 and 1,016; C6.1: 7,321 and 984). Release build 0 errors, the only new warning the migration's CA1505. The free DB tests (`dbtests.ps1`'s default filter, golden references included) are 84 green: C8 added the Flight recorder's figures, to-fix list and decisions on `caboodle_dev`, C7 the saved-names flow on `caboodle_dev` and every entity type found by id as the read-only login, and C6.1 the brand data line's checks. They include the admin-login tests, C1's trace endpoint, C1b's title/rename race, C2's starter checks, C3's pin tests, C4's prompt, values and improvement-cost tests, and C5a's library, names, seed and prompt-verification tests. |
| **IAM work** | **In `develop` since 2026-11-02 (PR #889).** Merge from `origin/develop` now (last merged at `7f6b2b32`, commit `52cca716`, 2026-11-03), as the release flow says. Before that: `origin/feature/CS-1770-iam-service-broker-workspace`, last merged at `b5adb1a1`. IAM's module settings hold Ask Caboodle's three per-organization settings; the two dollar settings are Platform Admin only. New since the merge: Platform Staff and `ActsAsPlatform` (D210, plan G3), "Organization Admin" role names, invitations under the email-domain rule. Re-fetch and re-check before each merge. |
| **Golden eval** | Since C9.1 the store references count the app's store key (the Store List store, else name + 5-digit ZIP; 21 values re-recorded, e.g. Bubbies' September stores 4,986) and Q10's velocity takes cases × pack. Since the IAM sync Q42 accepts either kind (D214). 84 questions in `caboodle/tests/Intelligence.Application.Test/Eval/golden.yaml` since C9: the counted "Concepts" group (Q42–Q44 and Q75–Q80, the Caboodle guide; the old "App questions" group stays defined with no cases, so past runs keep their scores), and the claims check reads the guide entries and the glossary. Since C9 queries with a period token are back in the claims check's evidence (hidden since C3). Before C9: 78 questions (since C7: Q72–Q74, saved names; 75 after C6.1, with Q70–Q71, SPINS Item Ranking for the new brand `riseandpuff`; 73 after C6; 67 after C2). Since C7 a case can carry `aliases`, given to the agent as its organization's saved names, and `expect.remember`, a reported check that a clarify offered to save the word (Q14, Q74). Since C6.1 each case's context carries the app's "data this brand has" line, and the claims check reads it; asked as if today were 2026-10-12: 64 counted, plus "App questions" (Q42–Q44), reported apart until C9, and since C6 "Public web" (Q26, Q64–Q68, asked with web search; reported apart, because live web results change). Q69 is Q26's question without web search. Web expectations: `source_types`, `sources_min`, `queries_absent`, `suggest_web_search`; the report lists each web answer's sources. Since C2: Q60–Q63, the starters' wordings of Q04, Q08, Q16 and Q17 (4 of 4 passed on 2026-10-17, $0.29). Every starter in `starters.yaml` must stay the exact question of a case. Since C3: `expect.period` on 24 cases and a reported `period` check (did a query take the expected token). Since B10a: a per-case `audience`, the "Platform admin" group (Q49–Q53; since B10b also Q54–Q59 on the data pipeline and the raw files), and `ASK_CABOODLE_EVAL_AUDIENCE=platform-admin`. Since C0: a counted `kind` check, `expect.kinds` for partial answers, and reported headline and database-name checks. Since C0b: a "Fact check" section and a reported `unverified_figures` check. Since B9: Q45–Q48 (fees by type, a distributor's markup, banners by region, the brand's distributors), Q41 answers the fee lines, and calculator references return fee-line figures. Since C5a, a case can be asked with the verified examples the app would give it, except its own and those of its other wordings (`Eval/EvalExamples`); they follow the app's setting, off since D177, and `ASK_CABOODLE_EVAL_EXAMPLES=2` (or `own`, which also gives a case its own) turns them on. The report lists the examples given. Since C8 each run records its prompt and catalog versions and rewrites the Flight recorder's summary of every run (`FlightRecorder/eval-runs.json`, embedded in the API; commit it with the reports); `EvalSummariesTests` fails while the summary is out of date with the reports, and the free `EvalSummaryTool` (`summary.ps1`) rebuilds it. Reports and README are in BE `docs/AskCaboodle-Eval/`. |
| **Current baseline (C0b)** | No full run since C0b. B9 changed the catalog and the tool definitions (D110) and checked 9 cases: 9/9, $0.04 per answer. **C0b's full run, Sonnet 5.5 medium:** 38/45 counted (C0: 40/45; the difference is run-to-run flips, none caused by the check), app questions 3/3, **$0.036 per answer**, 13.5 s. 5 of 48 answers corrected by the fact check before the last tuning (about 3 of 48 expected now), none sent with the note. Failing: Q15 (borderline), Q27 (as since B7b), Q29 (a range claim, C0c's kind), Q35 (`cannot_answer` for "nothing found"; stays `answer` by D107). Q33 now accepts either kind (D107). Opus 5.5 medium was last measured in B7b: 41/45, $0.112, 26 s. |
| **Known weaknesses** | Figures in the wrong place, rankings and pattern claims ("56–68 units per store" when one week is 40; Q11, Q29; B10b's Q57 "two issue types have none open" when one has, passed because a 2 was in the results): C0c. Wrong figures and counts are now caught by C0b (Q16, Q29's "three promo periods"), and hand-added totals pass only when right. |
| **Data problems** | DI1–DI16 in [`ask-caboodle-data-issues.md`](ask-caboodle-data-issues.md) (C6.1 added DI15: Primal Kitchen's SPINS Item Ranking holds Dr. Tung's store-level rows, and DI16: SPINS market names with a trailing space; B9 added DI11: six approved Prime fees point at no promotion; B10b added DI12: an email address in one Sprouts store's KeHE city, DI13: syncs marked failed although loaded and 3 stuck, DI14: UNFI UPC mappings stored as provider 1, and updated DI9 on zero-unit KeHE lines). The owner's rule: record and maintain them, don't fix them. Add any new one a package finds. DI9 matters for store counts: KeHE zero-case rows count as stores, both in the app and in Ask Caboodle. |

## Money (read before any paid run)

- **Who pays:** the client (Constance) pays the API bill through the Claude Console. The owner cannot add money themselves.
- **Balance:** about **$39.24**. C0c spent $0.97 on its 12-case check (`c0c`, the owner said "run the paid check"). The FE integration run spent $0.28 (5 questions through the FE, owner-approved up to $0.50). Develop sync 3 spent $0.46 on its 6-case re-check (`period-examples`, the owner said "run the paid check"; $0.29 answers, $0.17 claims check). The Pipeline cases spent $0.29 (4 cases). Develop sync 2 spent $0.81 on its 10-case check (`develop-sync`, the owner approved "the paid check" estimated at $0.50–0.70; the first case paid the hourly cache write and a correction, $0.23). C9.1 spent $0.69 on its 10-case check (`c91`: $0.44 answers, $0.24 claims check; run budget $1.20 for a $1.00 cap, nothing skipped). The IAM sync spent $0.69 on C9's re-check, in three runs because of the budget reservation (below): $0.52 (Q01, Q10 and six concept cases), $0.11 (Q43, Q44), $0.06 (Q76). C9 spent $0.48 (the 11-case check: $0.30 answers, $0.18 claims check). C8 spent nothing (no model calls). C7 spent $0.41 on the 7-case check ($0.28 answers, $0.12 claims check). The owner's live questions on the test page since C6.1 cost $0.32 (three C6.1 tries $0.09, five C7 tries $0.23 with the cache write), on the key in `appsettings.Development.json`; `AskMessages.CostUsd` holds them (scratchpad `c7/live-cost.sql`). C6.1 spent $0.53: the refuse group and Q69 with the data line ($0.13 + $0.01), then the SPINS check of 5 cases ($0.38). C6 spent $1.42: the web smoke with a restored follow-up ($0.17), the 9-case check ($0.75: $0.57 answers, $0.18 claims check) and the follow-ups' re-checks ($0.34 + $0.16). A web question costs about $0.05–0.08 (each search $0.01 plus the pages read), and the first web question of an hour about $0.06 more for its own prompt cache. C5a spent $1.02: the 8 cases that got a verified example ($0.49), then the promotions ($0.29) and the repeated questions ($0.24). C4 spent nothing (its improve check was not run). C3 spent $0.61: the 8-case period check $0.37 ($0.30 answers, $0.07 claims check) and the 3-case named-date re-check $0.24 (the changed prompt was cached again on its first case). The owner's live Q62 on the test page ($0.107) went to the key in `appsettings.Development.json`, as C1p's did; C2 spent $0.29 (the 4-case check of its new starters' cases); C1b spent $0.0003 (nine titles from Haiku 5.5); C1 spent $0.50 (a smoke question $0.0834, a 6-case check $0.34, a 1-case check without the fallback $0.04, 14 small timing calls $0.044); B10b spent $0.56 (a 9-case check $0.48, a 2-case re-check $0.08); B10a $0.44 (an 8-case check); B9 $0.59 (a 9-case check); C0b $3.43 (4-case check $0.41, full run $2.62, re-check of 7 $0.40); C0 $3.54; B8b nothing; B8 about $0.075. The Console has the exact figure.
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
  - Each question in flight reserves $0.30 of the cap, so leave headroom or the last questions are skipped. The run's `-Budget` is not the owner's cap: set it to the expected spend plus $0.30 plus a margin, and watch the real spend against the cap (the IAM sync's first run used the cap as the budget and skipped three cases).
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

## Done: C5a — verified examples (commit `4ee2a349`, eval reports `7477212d`, 2026-10-18)

Decisions D170–D176 are in plan §7, and "C5a as built" is in §4. In short:
- **The library:**
  - Migration `20261018111702_AddAskCaboodleExamples` (local `caboodle_dev`; `Down` checked) adds `Intelligence.AskExamples`, `AskMessages.ExamplesJson` and `AskPrompts.ExampleID`. No grants.
  - An example is built from an answer as a pin is (C3). Ids that the answer looked up become C4-typed slots; leftovers (a brand's own ids, codes, names or words) keep it with its brand (D39).
- **Retrieval and the block:**
  - The question is shaped with the brand's names (names, periods, dates and numbers become words).
  - It is scored with `pg_trgm` plus the share of stemmed words, and gets at most 2 examples from 0.55, within 3 s; on failure it answers without them.
  - A `<verified_examples>` block goes in the user message after `<context>`; the system prompt is unchanged. The fact check reads the message without the block.
- **Approval:** 11 platform-admin routes under `askcaboodleadmin/examples` and `prompts/{id}/runs|verify`. Thumbs-up and "Propose as example" make proposals; Verify runs the calls first.
- **Seed:**
  - `Examples/examples.json` is written by the free `ExampleSeedTool` from the eval reports: 35 entries, 45 in the library with the starters that have no usable run.
  - The 21 starters are verified at once (11 with calls); the 24 others are proposals.
  - It syncs at start-up and nightly.
- **Nightly re-check:** `ask-caboodle-examples-nightly` at 03:30 UTC, through the pins' runner. A broken example is out of use until it passes; a catalog change sends it to "review again".
- **Starters and prompts:**
  - `GET suggestions` reads the library's starters, with the same output and `starters.yaml` as the fallback.
  - An organization prompt verified from a run shows "Verified" until its text or fill-ins change.
- **Eval:** leave-one-out (each case's own example and its other wordings). The free `ExampleRetrievalTool` shows 13 of 65 cases with a match at 0.55.
- **Tests:** solution 7,284 green, Intelligence 947, DB tests 80 green, Release build 0 errors.
- **Test page:**
  - the "Examples" panel, "Propose as example", the examples given in the trace, and "Verify from a run" on organization prompts;
  - tested free with `drive-c5.mjs` (10 scenarios), and the earlier drivers re-ran unchanged except C4's new button.
  - The mock's example routes (`mock-examples.mjs`), `drive-c5.mjs`, `run-c5.ps1` and `regress.ps1` are in `C:\Users\User\AppData\Local\Temp\claude\d--Fork-Onboarding-Journey\d8e1e999-2d82-430e-92d0-1df942168c79\scratchpad\c1p-test`, while it lasts.
- **Paid, $1.02, and D177:**
  - The three checks passed 13 of 18 with examples, against 17 of 18 for the same cases' last runs without; every figure was right.
  - The examples in the question are off (`ExamplesPerQuestion` 0), as the owner delegated.
  - Before the second and third checks: two free retrieval fixes (part of a product's name reads as a product; retailer names from aliases need a fifth of a retailer's aliases, counting case variants once), and four proposals verified by Claude for the owner.
- **The 100-question draft:** `ask-caboodle-starter-library-draft.md` (100 questions in 15 topics), for the owner and Constance.
- **After the owner's first look (2026-10-18):**
  - The owner got lost in a proposal's detail: the seeded ones showed only their SQL. Each seed entry now carries its passing run's answer, read by key; there is no database change.
  - The test page's detail now leads with "1. Is this answer right?" and "2. Who can get it?", with the technical parts folded away.
  - The owner asked for simpler admin screens in the final UI (plan §10.10) and a Platform Admin user manual after it (plan §8 "Admin manual", §7.2). Both are on the to-do list; neither is built now.

## Done: C6.1 — data this brand has, and SPINS (commit `ed309b8c`, eval reports `714ba095`, 2026-10-19)

Decisions D186–D188 are in plan §7; "C6.1" is in §4. In short:
- **The line:** each question on a brand carries `<brand_data>` in its context: which kinds of data the brand has and which weren't found, from C2's hourly checks plus two SPINS checks (their own hourly query). There's no extra step or model call. The fact check skips the block, and the eval's claims check reads it as support.
- **SPINS, as the owner set it out (D188):**
  - SPINS is syndicated sell-through: what shoppers bought at the register. Distributor sales are sell-in, shipments to stores.
  - Stores Insight holds the brand's own products, per store and week.
  - Item Ranking holds the whole category, competitors included, for a market such as TOTAL US. It is Caboodle's own market data, used before any web search.
  - Built in the glossary, both catalog entries, the web rule and `suggest_web_search`.
- **Eval:** Q28 accepts the line as its check (D187); Q69's note is corrected; Q70–Q71 cover Rise & Puff's Item Ranking. 75 cases.
- **Paid, $0.53:**
  - with the line: refuse group 3 of 5, and Q69 2 of 2 (0 of 2 before);
  - after the SPINS fix: 4 of 5. Q71 answered from the right data but failed on a filtered category total and two pattern claims (C0c's kind).
- **Also in the session:** C7 was planned and decided (D189–D195; plan §4 "C7 — decided").
- **This session's launchers and scripts** (`eval-run.ps1` and `dbtests.ps1` in Release, `crlf.ps1`, and `c7/psql.ps1` with the read-only queries behind DI15, DI16 and the new cases) are in `C:\Users\User\AppData\Local\Temp\claude\d--Fork-Onboarding-Journey\6c9a3e21-bdea-417f-91b2-bee8aaf38ad5\scratchpad`, while it lasts.

## Done: the second develop merge (`fd497f8e6`) and develop sync 2 (`f2a93e64f`, 2026-11-12)

Plan §4 "Develop sync 2" has the details; decisions D223–D230 are in plan §7. In short:
- **The merge:** `origin/develop` @ `719490ad2`, 19 PRs; the seven expected conflicts resolved; both snapshots consistent; 14 migrations applied on `caboodle_dev`.
- **The sync:** the new Pipeline catalogued (four tables) and the old CRM Pipeline out; dated distributor links as the app picks them; Ask Caboodle's spans and simple fees follow the screens' visibility (and keep EDLP events under a month filter); 31 guide entries re-read, about 20 changed, checks re-recorded; the small items (shared-address store matching, the KeHE run's supplier and brand, inferred connections, export and import types, copied sandbox promotions, CS-1826's DI17); migration `AddAskCaboodleDevelopSyncGrants` applied locally.
- **Paid, $0.81:** 7 of 10, every figure right; see "Waiting for the owner".
- **How it ran:** five read-only surveys and two editing agents (each on its own files), then a full diff review and hand checks. The surveys found what the merge changed without touching Ask Caboodle files (the lesson from the first IAM sync), including the security point.
- **This session's launchers** (`common.ps1`, `build.ps1`, `test-all.ps1`, `dbtests.ps1`, `migrations.ps1` (list, update, add, snapshot-check), `psql.ps1`, `guide.ps1`, `eval-run.ps1`, `crlf.ps1`, and the queries) are in `C:\Users\User\AppData\Local\Temp\claude\6cad5128e187ea87\9f9a792f-45c0-4784-b5a3-f9021cf2fa83\scratchpad\sync`, while it lasts.

## Done: C9.1 — the catalog follows the code (commit `053371c2`, 2026-11-04)

Plan §4 "C9.1" has the details; decisions D215–D222 are in plan §7 (decided by Claude at the owner's request, for the owner to overturn). In short:
- **Store count (D215):** the app's store key everywhere in the catalog; the golden store references re-recorded free.
- **Velocity, POD, region (D216–D218)** as the app's reports; **about twenty more lines (D219)** re-verified against the code by three read-only agents and fixed (58 edits in 22 files); **Q76 (D220):** the glossary's TPR and EDLP lines without codes.
- **Paid, $0.69:** 10 of 10, no answer corrected.
- **This session's scripts** (`c91/psql.ps1`, `c91/golden-store-key.ps1`, `c91/golden-rerecord.ps1`, `c91/catalog-fixes.ps1` and the queries, besides the `merge/` launchers) are in `C:\Users\User\AppData\Local\Temp\claude\d--Fork-Onboarding-Journey\425c50f3-e289-4302-a303-c94313e34db3\scratchpad`, while it lasts.

## Done: the develop merge (`52cca716`) and the IAM sync (`607edfd6`, 2026-11-03)

Plan §4 "IAM sync" has the details; decisions D210–D214 are in plan §7. In short:
- **The merge:** `origin/develop` @ `7f6b2b32` (the final IAM from PR #889 and four other `develop` merges), no conflicts, no Ask Caboodle file touched; five `develop` migrations applied on `caboodle_dev`; only the guide drift check went red.
- **The IAM sync:** 5 guide entries rewritten and 7 re-checked; the catalog reads the category review copies on calendar entries and brand reports, and knows Platform Staff, the "Organization Admin" names, the new store-list issue type and flag; migration `20261103165300_AddAskCaboodleIamSyncGrants` (grants only, applied locally); Constance's review documents regenerated.
- **Paid, $0.69:** Concepts 8 of 9 with D214; Q76 prints glossary codes (C9.1).
- **This session's launchers** (`eval-run.ps1`, `dbtests.ps1`, `guide.ps1`, `migrate-roundtrip.ps1`, `snapshot-check.ps1`, `apply-migrations.ps1`, `migration-status.ps1`, `facts.ps1`, all in Release) are in `C:\Users\User\AppData\Local\Temp\claude\d--Fork-Onboarding-Journey\425c50f3-e289-4302-a303-c94313e34db3\scratchpad\merge`, while it lasts.

## Done: C9 part 1 — the Caboodle guide (commit `b481988e`, eval report `42f00437`, 2026-10-19)

Decisions D203–D209 are in plan §7; "C9 — decided" and "C9 as built" are in §4. In short:
- **The guide:** 65 entries in 9 topics (`Guide/guide.yaml`, embedded), written from six surveys of the code (each fact with file and line, the key ones re-checked by hand), all drafts. Each entry: what it means, business rules, an example, related entries, its sources, and a question for Constance where the code doesn't settle the meaning. The owner's addition: how a product connects to banners, retailers and distributors.
- **The AI:** `search_guide` (at most 4 entries; names the words no entry covers), a prompt rule (answer from the entries, never from general knowledge; no steps; never what the asker can do), and the server's source note "Caboodle guide (not yet reviewed)". Platform admins read drafts; organization users approved entries only (D206).
- **Drift:** `guide-checks.json` records each entry's sources; a test fails when one changes, or when an approved entry's text changes. `guide.ps1 -Checks` records them after a re-check.
- **Constance:** three review documents generated from the guide (`guide.ps1 -Review <folder>`), Keep / Change / Drop under each entry.
- **Endpoint:** `GET askcaboodleadmin/guide` (platform admins). No migration.
- **Eval:** the counted "Concepts" group (Q42–Q44, Q75–Q80), 84 cases; the claims check reads the entries and the glossary and flags steps and invented terms; period queries are back in its evidence (hidden since C3).
- **Tests:** solution 7,447 green (Intelligence 1,110), DB tests 84; the test page's `drive-c9.mjs` (7 scenarios), the earlier drivers unchanged.
- **Paid, $0.48:** see "Waiting for the owner".
- **This session's launchers and scripts** (`build.ps1`, `test-all.ps1`, `unitf.ps1` (failures only), `dbtests.ps1`, `eval-run.ps1`, `guide.ps1`, `crlf.ps1`, and `c1p-test/` with `mock-guide.mjs`, `guide-data.json` (the guide converted with the build's YamlDotNet), `drive-c9.mjs`, `run-c9.ps1`, `regress-c9.ps1`) and the cloned BA repo (`userdocs/repo`) are in `C:\Users\User\AppData\Local\Temp\claude\d--Fork-Onboarding-Journey\8ee9b1a1-6676-46c2-911a-d13715e8d7db\scratchpad`, while it lasts.

## Done: C8 — the Flight recorder (commit `e4fbdd34`, 2026-10-19)

Decisions D198–D202 are in plan §7; "C8 — decided" and "C8 as built" are in §4. In short:
- **The figures:** for a period (this month by default) and optionally one organization: questions by how they ended and by kind, cost per question (average, median, the priciest 5 %), steps, the wait, the cache share, thumbs, answers corrected by the fact check or sent with unchecked figures, rejected answer attempts, and every day. Read from the `Intelligence` tables; no AI call.
- **The eval card (D198, D201):** the summaries of the 45 eval runs ship with the code (`FlightRecorder/eval-runs.json`); the card shows the newest full run on the app's model (C0b: 38 of 45, "not recorded"), its refuse group, and the checks since. The eval now records its prompt and catalog versions and rewrites the summary after each run.
- **The to-fix list (D97, D199–D202):** thumbs down, figures sent unchecked, no answer; each with the answer as shown, the conversation, the trace, who asked (D200), and Open / Fixed / No fix needed with a note and an eval case.
- **Built:** migration `AddAskCaboodleFlightRecorder` (applied locally, `Down` checked: `AskTriageItems`, `AskMessages.FactCheckCorrected` filled from the transcripts, a date index), five admin endpoints, the eval's summary writer and tool, the test page's board.
- **Tests:** solution 7,371 green (Intelligence 1,034), DB tests 84; the test page's `drive-c8.mjs` (8 scenarios) and the earlier drivers unchanged. $0 spent.
- **This session's launchers and scripts** (`build.ps1`, `test-all.ps1`, `unit.ps1`, `dbtests.ps1` and `eval-run.ps1` in Release, `crlf.ps1`, `c8/psql.ps1`, `c8/migrate.ps1`, `c8/migration-add.ps1`, `c8/summary.ps1`, the audit queries, and `c1p-test/` with `mock-flight.mjs`, `drive-c8.mjs`, `run-c8.ps1` and `regress-c8.ps1`) are in `C:\Users\User\AppData\Local\Temp\claude\d--Fork-Onboarding-Journey\970031df-4f12-4be1-b3ae-0c6f1d7f6c6c\scratchpad`, while it lasts.

## Done: C7 — saved names (commit `5f650db6`, eval report `f19df64d`, 2026-10-19)

Decisions D189–D197 are in plan §7; "C7 — decided" and "C7 as built" are in §4. In short:
- **Saved names:** after a clarify, a person can save their word ("Fresh") for the entity they picked. From then on the name search finds it by that word for everyone in the organization, and the answer says it used the saved name. A platform admin outside any organization saves for every organization. The names are listed, removed and (by admins) added on "Saved names".
- **Built:** migration `AddAskCaboodleEntityAliases` (applied locally, `Down` checked), `GET`/`POST aliases` and `DELETE aliases/{id}`, the names in `search_entity` (found by id through each type's new `ByIdSql`), the offer on clarify options, `savedName` in the trace, and the test page.
- **The owner's live test changed the offer (D196):** the AI left `entity_id` empty, and its second answer's options came from a query, so no offer appeared. The server now works it out: the word from the conversation's name searches, each option by its id, its label or one exact-name lookup.
- **Eval:** `aliases` on a case, the reported `remember` check, Q72–Q74. 78 cases.
- **Paid, $0.41:** 5 of 7. Q72 and Q73 used the saved names. Q74 asked, and every option offered to save "Fresh", but the options weren't the retailers Bubbies ships to (D197, on the to-do list). Q14 answered without asking, as in the owner's live test. Q15 failed as it has since C0.
- **This session's launchers and scripts** (`eval-run.ps1` and `dbtests.ps1` in Release, `crlf.ps1`, `c7/psql.ps1` with its queries, `c1p-test/drive-c7.mjs` with the mock's alias routes) are in `C:\Users\User\AppData\Local\Temp\claude\d--Fork-Onboarding-Journey\6c9a3e21-bdea-417f-91b2-bee8aaf38ad5\scratchpad`, while it lasts.

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

**Free examples seed** (`seed.ps1`, C5a, no model calls): the three connection strings of the DB tests, then `ASK_CABOODLE_EXAMPLE_SEED` set to the absolute path of `caboodle/src/Modules/Intelligence/Modules.Intelligence.Application/Examples/examples.json`, then `dotnet test … --configuration Release --no-build --filter "FullyQualifiedName~ExampleSeedTool" --logger "console;verbosity=detailed"`.
- It rewrites the seed from the stored eval reports. Review the diff before committing.
- After a seed change, rebuild: the file is an embedded resource.

**Free guide tools** (`guide.ps1`, C9, no model calls): `-Checks` records what each guide entry was written from (`caboodle/tests/Intelligence.Application.Test/Guide/guide-checks.json`), after re-checking the entries whose sources changed; `-Review <absolute folder>` writes Constance's review documents, one per batch. Both run `--no-build` in Release, so build first. After a guide change, also refresh the test page's mock (`c1p-test/guide-data.json`, converted with the build's `YamlDotNet.dll`).

**Free retrieval check** (`retrieval.ps1`, C5a, no model calls): the same first lines, `ASK_CABOODLE_EXAMPLE_RETRIEVAL=1`, then the filter `FullyQualifiedName~ExampleRetrievalTool`.
- It syncs the seed into `caboodle_dev`'s library as the API's start-up does.
- It then prints every golden question's shaped text and its closest examples (with trigram and word scores, under the eval's leave-one-out), and how many cases match at each threshold.
- Run it before changing `ExampleMinimumScore`, `AskQuestionShape` or `AskExampleNames`.

**Build in Release while the owner's API runs (C4).** The owner keeps the API running from Visual Studio, which locks the Debug output: build and test with `--configuration Release` (and `--no-build` launchers with `--configuration Release` too), and never stop the owner's process. The launchers above omit it: add `--configuration Release` to their `dotnet test` line, or a `--no-build` run tests the stale Debug build (C6.1's copies in the scratchpad have it).

**New migrations:** `dotnet ef migrations add <Name> --context MainDbContext --project caboodle/src/Database/Migrator/Migrator.csproj --startup-project caboodle/src/Hosts/API/API.csproj` with `ASPNETCORE_ENVIRONMENT=Development` (no database connection needed). Check that the snapshot diff holds only your change, and set a sensible `defaultValue` for a new non-null column (EF writes 0).

## Lessons from recent sessions

- **The eval asks as of 2026-10-12, so catalog text must not name a later date (develop sync 2, D230).** "Replaced in November 2026" or "links made before 10 Nov 2026" would read as the future to the AI under eval. Say "before links had dates" instead.
- **Every number a golden reference returns must be recorded (develop sync 2).** Q35's added Pipeline count failed the free reference test as "returned but not recorded"; a column that depends on data still to come doesn't belong in the reference.
- **Split editing agents by file, never by topic (develop sync 2).** Two agents wrote the catalog at once without clashing because each owned its own files; the glossary had one owner.
- **A survey of what a merge changed finds what no Ask Caboodle file shows (develop sync 2).** The KeHE crawler's error text can echo the login and password into a column platform admins read; only reading the new sync code showed it.

- **The guide is a cross-check for the catalog (C9.1).** Both describe the same code, but the guide was written from C9's surveys and the catalog much earlier: where they disagreed, the guide was right every time. When the catalog says how something works, compare it with the guide entry that cites the same table.
- **Verify many small claims in parallel, then re-check the key ones (C9.1).** Three read-only agents, each with a list of claims and asked for file, line and the contradicting catalog line, covered about twenty claims at once; a hand check of the riskiest ones and one data query confirmed them before any edit. One checked script applied all 58 edits, refusing to write if any old text didn't match.

- **A merge from `develop` can change what Ask Caboodle says without touching its files (IAM sync).** The develop merge changed no Ask Caboodle file, yet the app now shows calendar entries of deleted reviews, names its admin roles differently and has Platform Staff. The guide's drift check caught the guide; the catalog had no such check, so read the merged migrations and the changed queries of every module the catalog covers.
- **The glossary feeds answers too (IAM sync).** It was written for writing queries, so some lines carry codes ("PromotionType 2", "Month = 0"); a guide answer copied one. Keep user-facing definitions in users' words and the codes in the catalog's table entries.

- **A heuristic breaks when a new caller starts using what it keys on (C9).** The eval told name searches from queries by "has parameters"; C3 gave `run_sql` period parameters, so for two weeks the claims check never saw a query with a period token. When a feature adds a field or parameter, grep for code that branches on it.
- **A definition is an answer, not a refusal (C9).** The kind rule's "the data can't answer it" made three right guide explanations `cannot_answer`. A new kind of answer needs its own line in the kind rule.
- **Survey the code before writing what it does (C9).** The BA's documents, and an early draft of the plan, assumed a brand accepts a brokerage's connection request; the code has no such step (only platform admins connect them). Six read-only surveys with file and line, then hand checks of the key claims, kept the guide right.
- **The AI fills in who the user is (C9).** Asked how a brokerage gets the brand, it said "since you're a platform admin, you can…". Until roles reach the agent (part 2, G3), the prompt says it doesn't know the asker's role.


- **A driver's text check can match the negation of what it waits for (C8).** "Ask Caboodle hasn't changed since this run" holds "changed since", so the wait for the changed card passed at once and read the old card. Wait for words only the expected state has ("changed after this run"), or for state, not text.
- **The test page remembers the organization across reloads (C8).** A driver that opens a board with a URL parameter (`flight=1`) right after a member's scenario still sends that organization on the first request. Open the page, clear the organization, then open the board.
- **Stored transcripts escape `<` as `\u003C` (C8),** and `LIKE` treats the backslash as its escape character. Search them with `strpos` and a literal without the backslash (`'u003Cfact_check'`).
- **A mock started with `Start-Process -RedirectStandardOutput` loses its last log lines when it is killed (C8).** Don't read its tail as the order of requests; record requests in the driver (`Network.requestWillBeSent`) instead.
- **An answer's data block shows its chart first (C8).** A driver counting table rows sees none; check the block's title or its canvas.

- **Don't hang a feature on an optional field the AI fills (C7).** The offer needed `entity_id` on each option. In the owner's first live test the AI left it empty and built the options from a query. The server now works out what it can from what it already holds: the conversation's name searches and the options' labels. Try a model-facing feature live once before its paid check.
- **The AI asks only when no match is clearly best (C7).** "Fresh Market" and "WFM" never asked: The Fresh Market wins on its name, and the glossary maps WFM. To test a clarify, find a word with several equally weak matches ("Fresh": 16 retailers, none called just that).
- **Tests and an eval at the same time (C7):** coverlet couldn't instrument a dll the eval had open. It only warned, and every test still ran. Run them one after the other when coverage matters.
- **A .NET 6 action's non-nullable `string` query parameter is required even with a default (C6.1 follow-up).** `GET brands` failed with "sortingOrder is required" until the test page sent `sortingOrder=ASC`.


- **When answers keep confusing a data source, ask the owner what it is (C6.1).** C6's rule sent "the market, the category, competitors" to the web, and an eval note said Caboodle "doesn't hold national market data". But SPINS Item Ranking *is* national category data with competitors. Check a routing rule against the catalog before writing it.
- **Give the claims check what the agent was given (C6.1).** Without the data line as evidence, a right "the brand has SPINS scan sales" fails as unsupported, which is how Q69 had failed.
- **Look at a data source's rows before writing a case (C6.1).** Primal Kitchen's "Item Ranking" was Dr. Tung's store-level data (DI15), and Rise & Puff's only window is 18 months old, which its cases' notes must say.
- **A per-brand `EXISTS` over a big table without a brand index runs a full scan per brand (C6.1).** 215 brands × 1.5 GB never finished. Read the table once with `DISTINCT` instead. Stopping psql doesn't stop the server's query: cancel it with `pg_cancel_backend` (scratchpad `c7/cancel.sql`).
- **`sed -i` in Git Bash turns CRLF files into LF (C6.1).** Run the line-ending check after any sed edit. The scratchpad's `crlf.ps1 -Fix` uses full paths, because .NET's current directory isn't PowerShell's location. The repo stores LF and checks out CRLF (`core.autocrlf true`).

- **Measure a feature where it can help, then let the numbers decide (C5a).** The examples were tested on cases that already passed, so they couldn't show a gain. The leave-one-out hides the repeated question on purpose. Three small checks ($1.02) showed no gain and a 3–5 % cost, so they went off by one setting; the rest of the package stays useful.
- **A catch-all retailer's aliases are its member stores (C5a).** "UNFI Independents" and "KeHE Independents" hold hundreds of store names, whose first words are plain words ("price", "house", "discount"). Any rule that learns names from aliases needs a share of the retailer's own aliases, and must count case variants once ("Price Chopper" and "PRICE CHOPPER" made "price" a retailer).
- **Show the reviewer the answer, not the SQL (C5a).** The owner got lost in a proposal that showed only its query. A verify screen leads with what the user saw, and the technical parts fold away (plan §10.10).
- **Seed from the eval, then leave each case's own example out (C5a).** A library seeded from the golden cases' passing runs would turn the eval into copying. `EvalExamples.Excluded` leaves out each case's own example, the same question on another brand, and its other wordings (Q04/Q60, Q08/Q61, Q16/Q62, Q17/Q63).
- **Only ids become slots (C5a).** The first seed turned the SQL's `CASE` labels ('UNFI', 'KeHE') into slots, so an example would have generalized a fixed code's label. A name written in SQL stays as written; a brand's own one is a leftover.
- **Look for a brand's own words everywhere an example shows (C5a).** "Ube" leaked through the question ("our Ube flavor") and a column alias (`all_ube_stores`) after the ids and names were caught. The leftovers now read the question, the SQL's literals and its column aliases, against the brand's own product, category and brand words that no shared name holds.
- **Trigram similarity alone matches the wrong question (C5a).** Shaped questions share most of their letters ("how many … slotretailer slotperiod"). Averaging in the share of stemmed content words (slot words and "many"/"much" left out) separated cases from stores. Tune it with the free retrieval tool, never with paid runs.
- **People call a retailer by its aliases' first words (C5a).** "Albertsons" wasn't a name the lists knew (the retailer is ABSCO). The first word or two that at least two of one retailer's aliases share, and no other retailer's do, now name it. A one-word start that only comes with the same second word is dropped ("whole").
- **`ORDER BY 2 + 3` in Postgres sorts by a constant (C5a).** Positional numbers work only alone. Wrap the scores in a CTE and order by the named columns.
- **`node -e` through bash loses C# and regex text (C5a).** `$@"…"` (a verbatim interpolated string) was eaten by the shell, and `\b` in a JavaScript string became a backspace character. Write such scripts and edits with the Write or Edit tool, then scan the changed files for control characters.
- **An entity's `ID` setter is protected (C5a).** To rewrite a stored row from a new object, update by id (`UpdateSeedAsync(id, content, …)`) instead of copying the id across.
- **`StartupTests` resolves every handler (C5a).** A new `IRepository<T>` the handlers take must be registered in the test's service collection too.

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
