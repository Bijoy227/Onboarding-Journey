# Ask Caboodle — Question Set (draft for review)

Status: draft 2026-10-12 · owner reviews · feeds B4 (catalog priorities) and B6 (golden eval)

Questions a CPG brand user (sales lead, account manager, trade marketing) would ask, written against the data that really exists on local `caboodle_dev`. In B6 each question gets a reference SQL, the expected numbers with a tolerance, and the expected behavior; then it becomes a case in `golden.yaml`.

## Context the questions assume

| Item | Value |
|---|---|
| Brand | Bubbies Ice Cream (`0303a5ee-9913-47ef-ba6d-cdea180a723f`) — mochi ice cream, most data of any brand |
| Shipments | KeHE and UNFI, 2025-01 → 2026-09 (latest month: September 2026) |
| Today | the run date goes in the user message; "last month", "Q3", "this year" resolve from it |
| Second brand | David (`93c88f8e-5b4a-48cf-a220-219bac8a7a6c`) — rerun questions 1, 4 and 8 to avoid tuning to one brand |

Facts found while profiling (each one is a test on purpose):
- "Albertsons" does not exist by that name: sales and CRM both call it `ABSCO`.
- "Fresh Market" matches four retailers: The Fresh Market, Yoke's Fresh Market, Guido's Fresh Marketplace, Cermak Fresh Market.
- Whole Foods Market exists in CRM and has 186 planned promotion events for Bubbies, but no shipment rows under that name.
- Publix promotion events carry an average planned lift of 580.8 % (user-entered).
- Bubbies has no SPINS rows; it has 2,573 price-list rows.

## Questions

Behavior: **answer** · **clarify** (ask or state the assumption it made) · **refuse** (say what it can't do and what it can offer instead).
"Needs" names the package after which the question should pass; blank = should pass today.

### A. Sales and trends

| # | Question | Checks | Behavior | Needs |
|---|---|---|---|---|
| 1 | How many cases did we ship last month, and how does that compare to the same month last year? | relative month, year-over-year | answer | |
| 2 | What are our year-to-date cases and dollars, split by KeHE and UNFI? | YTD, distributor split, states the last month included | answer | |
| 3 | Show our monthly cases shipped for the last 12 months. | trend, chart | answer | |
| 4 | Who were our top 5 retailers by cases in Q3? | calendar quarter, top N, "Confidential (masked by KeHE)" label | answer | |
| 5 | How are we doing at Sprouts this year compared with last year, month by month? | retailer filter, year-over-year | answer | |
| 6 | Which flavors grew the most in Q3 versus Q2? | product grouping, quarter-over-quarter | answer | |
| 7 | Which states do we ship the most to? | geography; no period given → picks one and says so | answer | |

### B. Distribution

| # | Question | Checks | Behavior | Needs |
|---|---|---|---|---|
| 8 | How many stores did we ship to in September? | stores metric | answer | |
| 9 | How many stores carry our Ube flavor? | POD by product; names the definition and period used | answer | |
| 10 | What's the velocity of Red Ripe Strawberry at Sprouts this year? | velocity metric (units / store / week) | answer | |
| 11 | Which stores stopped ordering Matcha Green Tea in the last three months? | voids | answer | |

### C. Names, spelling, ambiguity

| # | Question | Checks | Behavior | Needs |
|---|---|---|---|---|
| 12 | How much did we ship to Albertsons last quarter? | resolves Albertsons → ABSCO and says so | answer | B4 (glossary alias) or C7 |
| 13 | cases to sprots through keyhe this year | misspelled retailer and distributor | answer | B2 |
| 14 | How are we doing at Fresh Market? | four candidate retailers, no metric or period | clarify | |
| 15 | What did we ship to Whole Foods last quarter? | honest zero: no shipments under that name; mentions masked KeHE rows; offers the promotion events | answer | |

### D. Promotions (plans)

| # | Question | Checks | Behavior | Needs |
|---|---|---|---|---|
| 16 | Which promotions do we have at Sprouts in the next three months? | event overlap with a future window, active statuses (48 events) | answer | |
| 17 | How many promotion events do we have planned for 2027, by retailer? | counting events | answer | |
| 18 | What lift did we plan for our Publix promotions? | labels lift as a planned, user-entered assumption; flags the unusual value | answer | |
| 19 | Did our Sprouts promotions work? | explains lift is not measured; offers plan vs actual instead | answer | |

### E. Plan vs actual

| # | Question | Checks | Behavior | Needs |
|---|---|---|---|---|
| 20 | How did actual cases compare to plan by month this year? | monthly report, reports "last refreshed" | answer | |
| 21 | Which retailers are furthest below plan year to date? | variance ranking | answer | |

### F. Calculator figures

| # | Question | Checks | Behavior | Needs |
|---|---|---|---|---|
| 22 | What's the planned TPR spend for our Sprouts promotions in Q4? | must match the Promotion Details screen | refuse until B5, then answer | B5 |

### G. Should refuse or redirect

| # | Question | Checks | Behavior | Needs |
|---|---|---|---|---|
| 23 | How many cases will we sell next year? | forecasting is out of scope; offers history | refuse | |
| 24 | What were consumer scan sales of our mochi at Sprouts last month? | shipments are not scan sales; no SPINS for this brand | refuse | |
| 25 | Delete our cancelled promotions. | read-only | refuse | |
| 26 | What's trending in frozen novelty desserts nationally? | public-market question | refuse until C6, then answer from the web, labelled | C6 |

### H. Needs more catalog

| # | Question | Checks | Behavior | Needs |
|---|---|---|---|---|
| 27 | What's our list price for Red Ripe Strawberry? | price list table | answer | B4 |
| 28 | How do we rank in SPINS for frozen novelties? | says there is no SPINS data for this brand | refuse (no data) | B4 |

## Open points for the owner

1. Add, remove or reword questions — real customer phrasing beats ours.
2. Question 12: should "Albertsons → ABSCO" live in the catalog glossary (B4, everyone) or as a learned alias (C7, per organization)?
3. Question 18: should the agent flag implausible plan values (e.g. a 580 % lift), or only label them as planned?
