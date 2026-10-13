# Ask Caboodle — Question Set (draft for review)

Status: 2026-10-13 · seeded the B6 golden eval. The eval cases, with reference SQL and checks, now live in the BE repo at `caboodle/tests/Intelligence.Application.Test/Eval/golden.yaml`, which is the source of truth from B6 on.

Questions a CPG brand user (sales lead, account manager, trade marketing) would ask, written against the data that really exists on local `caboodle_dev`. In B6 each question gets a reference SQL, the expected numbers with a tolerance, and the expected behavior; then it becomes a case in `golden.yaml`.

## Context the questions assume

| Item | Value |
|---|---|
| Brand | Bubbies Ice Cream (`0303a5ee-9913-47ef-ba6d-cdea180a723f`) — mochi ice cream, most data of any brand |
| Shipments | KeHE and UNFI, 2025-01 → 2026-09 (latest month: September 2026) |
| Today | the run date goes in the user message; "last month", "Q3", "this year" resolve from it |
| Second brand | David (`93c88f8e-5b4a-48cf-a220-219bac8a7a6c`) — rerun questions 1, 4 and 8 to avoid tuning to one brand. David's shipments run January → August 2026 only, so these three also test the data lag (no September yet, no 2025 to compare with). |

Facts found while profiling (each one is a test on purpose):
- "Albertsons" does not exist by that name: sales and CRM both call it `ABSCO`.
- "Fresh Market" matches four retailers: The Fresh Market, Yoke's Fresh Market, Guido's Fresh Marketplace, Cermak Fresh Market.
- Whole Foods Market exists in CRM and has 186 planned promotion events for Bubbies, but no shipment rows under that name.
- Publix promotion events carry an average planned lift of 580.8 % (user-entered).
- Bubbies has SPINS **Stores Insight** scan data (weekly, 6,075 stores, Apr 2025 → Sep 2026) but no SPINS item ranking. *(Corrected in B4: the earlier "no SPINS" came from the legacy `SpinsRecords` table.)*
- Bubbies has 553 live price-list rows (2,573 including deleted ones); some prices start in the future (Nov 1, 2026).
- Bubbies' 2026 sandbox plan is 2.76 M cases against 1.50 M in the approved plan.

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
| 12 | How much did we ship to Albertsons last quarter? | resolves Albertsons → ABSCO and says so | answer | B4 (glossary alias; verified: 41,149 cases Q3 2026) |
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
| 22 | What's the planned TPR spend for our Sprouts promotions in Q4? | must match the Promotion Details screen; two approved 2026 plans overlap and must not be added together | answer | B5 (verified: $40,136, overlap flagged) |

### G. Should refuse or redirect

| # | Question | Checks | Behavior | Needs |
|---|---|---|---|---|
| 23 | How many cases will we sell next year? | forecasting is out of scope; offers history | refuse | |
| 24 | What were consumer scan sales of our mochi at Sprouts last month? | answers from SPINS Stores Insight, labelled as scan sales, never mixed with shipments; states the latest SPINS week | answer | B4 |
| 25 | Delete our cancelled promotions. | read-only | refuse | |
| 26 | What's trending in frozen novelty desserts nationally? | public-market question | refuse until C6, then answer from the web, labelled | C6 |

### H. Needs more catalog

| # | Question | Checks | Behavior | Needs |
|---|---|---|---|---|
| 27 | What's our list price for Red Ripe Strawberry? | price list: latest price on or before today. **Corrected in B6:** the main product ("Bubbies Mochi Ice Cream - Red Ripe Strawberry") lists at $3.96/unit, $31.68/case since Dec 2024; only the separate "Mini Mochi (15 pc)" item starts Nov 1, 2026. The B4 check answered about the Mini Mochi item only. | answer | B4 |
| 28 | How do we rank in SPINS for frozen novelties? | no SPINS item ranking for this brand; offers Stores Insight scan data instead | refuse (no data) + offer | B4 |

### I. Catalog extension (B4)

| # | Question | Checks | Behavior | Needs |
|---|---|---|---|---|
| 29 | How are our SPINS scan sales trending at Sprouts over the last 12 weeks, and how much sells on promotion? | SPINS text retailer name, weekly velocity, promo share, duplicate check | answer | B4 (verified: $1.40 M, 239 K units, 48 % on promo) |
| 30 | At how many banners is our Ube flavor authorized, and where is it still pending? | Active vs placeholder "Not Active" rows | answer | B4 (verified: 49 banners, none pending) |
| 31 | How does our sandbox plan for this year compare with the approved plan, in cases? | labels both plans, refresh date | answer | B4 (verified: 2.76 M vs 1.50 M) |
| 32 | Which category reviews are we part of, and where do our submissions stand? | links through calendar / brand reports, status labels | answer | B4 |
| 33 | Who are our buyer contacts, and what are their email addresses? | names and titles only; says emails are not available, points to CRM → Contacts | answer + decline part | B4 |
| 34 | What's KeHE's wholesale cost for our products at the Chino warehouse? | APL via DistributorDcs, brand filter on the product | answer | B4 |
| 35 | When did we last log activity with Sprouts, and what was it? | activity notes as plain text; "no activity" when empty | answer | B4 |
| 36 | Which documents do we have for Whole Foods? | not available (File Repository) → points to Files | decline | B4 |

### J. Promotion calculator (B5)

| # | Question | Checks | Behavior | Needs |
|---|---|---|---|---|
| 37 | What's the total planned spend and net revenue of our SPROUTS 2026 - MD promotion, by product? | calculator figures per product, sum to the totals; names the overlapping re-forecast | answer | B5 (verified: $795,671 spend, $2,543,682 net) |
| 38 | Which of our Sprouts promotions has the highest TPR %? | TPR % = TPR spend ÷ gross revenue, as the screen; versions kept separate | answer | B5 (verified: 2025 CW MD, 23.6 %) |
| 39 | In the sandbox, what's the planned TPR spend and TPR % of our SPROUTS 2027 - MD scenario? | sandbox source only because asked; reporting version | answer | B5 (verified: $1,001,842, 20.0 %) |
| 40 | How do our planned cases compare with actual cases by month this year? | monthly report; states when it was last refreshed (D26). **Merged into question 20 in the golden eval (D30).** | answer | B5 (verified: "last refreshed 8 Oct 2026") |
| 41 | What were the fees on our Publix promotion, line by line? | fee totals yes; fee lines not available → promotion details screen | answer + decline part | B5 |

## Open points for the owner

1. Add, remove or reword questions — real customer phrasing beats ours.
2. ~~Question 12: glossary or learned alias?~~ Decided (D20): glossary alias list for industry facts; learned aliases per organization come in C7.
3. ~~Question 18: flag implausible plan values?~~ Decided (D21): label as planned and say a lift above 100 % looks unusually high; never correct it.
