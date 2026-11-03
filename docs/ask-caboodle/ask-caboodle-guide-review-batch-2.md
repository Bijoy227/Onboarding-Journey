# Caboodle guide — batch 2 of 3, for review

Draft of 3 November 2026, for review with Constance. Generated from the guide file in the code, so what you approve is exactly what Ask Caboodle reads.

Ask Caboodle answers questions about how Caboodle works (what a term means, how things connect, the rules the app follows) only from these entries. We wrote each one from Caboodle's code, not from memory. Until you approve an entry, only Caboodle's own team sees answers that use it, marked "not yet reviewed".

What we ask of you: for each entry, mark Keep, Change or Drop; write any correction in your own words; and note how your clients say it (the words they use), so Ask Caboodle understands them. The entries give no steps in the app (where to click): those come after the new screens.

This batch: Promotions and trade spend, Shipments and store measures, SPINS scan data (20 entries).

## Questions to settle first

The code doesn't settle these; your answers decide the wording.

- **33. Allowances:** The app works out MCB on a book cost of 1.45 × the case cost. Is that the rule your clients expect?
- **35. Trade spend, trade rate and net revenue:** Net revenue takes the allowances off twice: total revenue is already after allowances, and net then subtracts TPR spend, which is the same allowances. Is that how your clients expect net to work?

## Promotions and trade spend

### 28. Promotion family

For: everyone. Also called: sandbox promotion, sandbox, trade spend sandbox, what-if plan, promotion plan.

**What it means.** A promotion family is a promotion as the business thinks of it, planned in the sandbox. It holds one or more versions: alternative plans for the same promotion, each with its own events and fees.

**Rules**

- Family names are unique within the brand.
- Creating a promotion creates the family with version 1, which is also its reporting version.
- How many versions a family may have is a setting for the brand; only versions that exist count, so deleting one frees a place.
- At most one version is pushed to brand-approved promotions, and exactly one is the reporting version.
- The brand's limits on how many promotions it has count a family once, and apply to its brokerages too.

**Example.** A summer promotion at one retailer is one family, with a 4-week TPR in version 1 and a 6-week TPR in version 2.

**Related:** 29. Promotion version, 30. Approved promotion, 31. Promotion event

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 29. Promotion version

For: everyone. Also called: version, versions, reporting version.

**What it means.** A version is one complete plan of a promotion family: a full copy of its events and fees that can be changed on its own.

**Rules**

- A new version copies a version you choose, with its events, fees and dates.
- Version numbers are never reused, and version names are unique within the family.
- The reporting version is the one the sandbox reports read, picked by a person; it doesn't have to be the pushed version.
- The pushed version and the reporting version can't be deleted; deleting another version is permanent.
- The pushed version is flagged out of date when its name, events or fees change after the last push.

**Example.** Version 2 copies version 1 and lengthens the TPR; version 1 stays the reporting version until someone changes it.

**Related:** 28. Promotion family, 30. Approved promotion

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 30. Approved promotion

For: everyone. Also called: brand approved, brand approved promotion, push, pushed promotion, simple promotion, approve a promotion.

**What it means.** An approved promotion is the plan the brand runs with, under Brand Approved. Most are pushed from a sandbox version: pushing is how a promotion is approved.

**Rules**

- Pushing copies one version into its family's single approved promotion; pushing again replaces the approved events and fees with the version's.
- A re-push also brings each event's status back from the sandbox, so status changes made since on the calendar are lost.
- Before a push Caboodle checks only that the version has at least one event; there is no other approval step and no status on the promotion itself.
- Pushing needs update rights in the sandbox, and create (first push) or update rights in approved promotions.
- Approved promotions can also be made directly (EDLP only, simple, or a copy); those aren't linked to a sandbox family.
- Simple promotions record events and fees for the calendars only: they have no case or revenue figures and aren't in the monthly report.
- Promotion fees are entered in the sandbox; in an approved promotion they are read only.
- Deleting a sandbox family also deletes its approved promotion; deleting an approved promotion keeps the family.

**Example.** Once the plan is agreed, the brand pushes version 2 of a family, and its events appear on the promotional calendar.

**Related:** 28. Promotion family, 29. Promotion version, 31. Promotion event, 38. Promotional calendar

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 31. Promotion event

For: everyone. Also called: event, events, event status, cancelled event, promotion events.

**What it means.** A promotion event is one product at one banner for a date range, with its planned lift, weekly sales, stores, allowances, AD/TPR fee and status.

**Rules**

- An event belongs to one version or one approved promotion, and covers one retailer, banner, product and category.
- An event's stores can't be more than the banner's door count.
- An event's unit price comes from the brand's list price in effect on its start date for the event's distributor.
- Statuses Active, Pending, Retailer Approved and Completed count in promotion figures and the monthly report; Cancelled, Did Not Run and Declined events stay listed but count for nothing.
- Any status can change to any other: in the sandbox, on the brand's promotional calendar, or in the brokerage's promotional management.
- Caboodle doesn't stop events from overlapping; overlapping events for the same banner and product are merged when the baseline is worked out.

**Example.** A 4-week TPR of one ice cream at a Sprouts banner in July with a $1.00 scan allowance, status Retailer Approved.

**Related:** 30. Approved promotion, 32. TPR and EDLP, 33. Allowances, 36. Baseline and lift, 22. List price

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 32. TPR and EDLP

For: everyone. Also called: tpr, edlp, temporary price reduction, everyday low price, promotion type, edlp only.

**What it means.** A TPR (temporary price reduction) is a time-boxed promotion with start and end dates. An EDLP (everyday low price) is a year-round allowance.

**Rules**

- An EDLP event covers the whole year, 1 January to 31 December, shows in every month on the calendar and has no lift.
- An EDLP event's everyday allowance is also applied to the TPR events for the same banner and product; deleting the EDLP event sets it back to zero.
- A TPR event's spend is its allowances on its promo cases; an EDLP event's spend is its allowance on the baseline cases.
- The promotion details' month filter leaves EDLP events out.

**Example.** A brand gives a retailer a $0.50 everyday allowance all year (EDLP) and runs two 4-week TPRs on top.

**Related:** 31. Promotion event, 33. Allowances, 35. Trade spend, trade rate and net revenue

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 33. Allowances

For: everyone. Also called: allowance, scan allowance, off-invoice, oi, mcb, everyday allowance, case allowance.

**What it means.** Allowances are what a brand gives the retailer on a promotion event, per unit or per case: scan ($ per unit), off-invoice (% of the case cost), MCB (% of the book cost) and everyday ($ per unit).

**Rules**

- Total case allowance = scan × case pack + case cost × off-invoice % + book cost × MCB % + everyday × case pack, where the book cost is the case cost × 1.45.
- TPR spend is the total case allowance × the event's promo cases.
- Allowances are typed on each event; the everyday allowance can come from the brand's EDLP event at that banner.

**Example.** On a $36.00 case of 12, a $0.50 scan allowance and 10% off-invoice make a case allowance of $6.00 + $3.60 = $9.60.

**Related:** 31. Promotion event, 32. TPR and EDLP, 35. Trade spend, trade rate and net revenue, 16. A banner's distributor and markup

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 34. Promotion fees

For: everyone. Also called: fees, fee, ad tpr fee, lump sum, coupon, prime, prime membership allowance.

**What it means.** A promotion has two kinds of fee: the AD/TPR fee, a flat amount on each event, and the promotion fees entered on the promotion itself: lump sum, coupon and Prime membership allowance.

**Rules**

- An AD/TPR fee counts only on events whose status counts.
- A promotion fee needs a name and at least one banner, and may list products.
- Lump sum: split evenly across its banners, then across each banner's products with counted events; a banner without counted events gets nothing, so less than the amount entered can count.
- Coupon: for each banner and product, the cases inside the coupon dates × case pack × redemption % × coupon value, plus the coupon's own lump sum when an event overlaps the coupon dates.
- Prime membership allowance: for each event it covers, promo cases × case pack × (allowance per unit + membership allowance per unit) × redemption %.
- Total spend = TPR spend + AD/TPR fees + promotion fees.

**Example.** A $3,000 lump sum on three banners counts $1,000 for each banner that has counted events.

**Related:** 35. Trade spend, trade rate and net revenue, 31. Promotion event, 30. Approved promotion

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 35. Trade spend, trade rate and net revenue

For: everyone. Also called: trade spend, tpr spend, total spend, trade rate, tpr percent, net revenue, net dollars, gross revenue, promotion figures.

**What it means.** Caboodle's trade-spend calculator works out a promotion's planned figures from its events, prices and allowances. Only events with a counted status are included.

**Rules**

- Case cost = case pack × the unit list price in effect.
- Promo revenue = (case cost − total case allowance) × promo cases; non-promo revenue = baseline cases × the case cost on each day; total revenue = promo revenue + non-promo revenue.
- Gross revenue = promo cases × case cost + non-promo revenue.
- TPR spend = total case allowance × promo cases; total spend = TPR spend + AD/TPR fees + promotion fees.
- Net revenue = total revenue − total spend.
- TPR % = TPR spend ÷ gross revenue; trade rate = total spend ÷ gross revenue.
- Ask Caboodle gets these figures from the same calculator as the promotion screens, never from its own sums.

**Example.** A promotion with $100,000 gross revenue and $12,000 total spend has a trade rate of 12%.

**Related:** 33. Allowances, 34. Promotion fees, 36. Baseline and lift, 37. Monthly report (plan vs actual)

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 36. Baseline and lift

For: everyone. Also called: lift, baseline, average weekly sales, non-promo cases, promo cases, planned volume, promo vs non-promo.

**What it means.** A promotion's planned volume comes from two numbers people type in: average weekly sales (units per store per week) and the planned lift (the % more sold during the event).

**Rules**

- Baseline (non-promo) cases: for every stretch of the year with no event, stores × weeks × average weekly sales ÷ case pack.
- Promo cases = the baseline's weekly cases × the event's weeks × (1 + lift %); a negative lift counts as 0.
- Average weekly sales is set per product for the whole promotion; a year is 52.143 weeks, shortened by the product's active or discontinued date at the banner.
- Actual lift, ACV and scan % are recorded on events, but no figure uses them.
- These are plans people type in, not measured sales; velocity from distributor sales is a different measure.

**Example.** 100 stores selling 3 units a week with a case pack of 6 make 50 baseline cases a week; a 4-week event at 40% lift plans 280 promo cases.

**Related:** 35. Trade spend, trade rate and net revenue, 31. Promotion event, 42. Velocity

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 37. Monthly report (plan vs actual)

For: everyone. Also called: plan vs actual, monthly report, variance, actuals, actual cases.

**What it means.** The monthly report compares a brand's planned promotion volume and revenue, month by month, with actual shipments. It is a snapshot, rebuilt when someone refreshes it.

**Rules**

- Planned rows come from approved standard promotions' counted events; promo cases and revenue are spread over the calendar months by days. The sandbox's version of the report uses each family's reporting version.
- Actual rows come from distributor sales (cases shipped and sales dollars by month), matched to Caboodle's banners by banner name; actuals can also be imported from a file.
- A refresh updates or adds rows and records when it ran; it never clears old actual rows.
- Variance = (actual cases − planned cases) ÷ planned cases, left blank when the plan is 0.
- Figures after the last refresh aren't in it, so always check when it was last refreshed.

**Example.** Planned 1,200 cases at a banner in July against 1,050 actual cases is a variance of −12.5%.

**Related:** 30. Approved promotion, 29. Promotion version, 39. Distributor sales (shipments), 35. Trade spend, trade rate and net revenue

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 38. Promotional calendar

For: everyone. Also called: promotion calendar, promos at a glance, calendar notes, promotional management.

**What it means.** The promotional calendar shows a brand's approved promotion events, one row per banner and one column per month, with each event's status. Brokerages see the same kind of view across their brands in promotional management.

**Rules**

- It shows approved events only, of every status, simple promotions included; EDLP events show in every month.
- An event shows in a year when it starts or ends in that year.
- Events whose retailer, banner, product, category or banner-distributor link is missing are hidden.
- Calendar notes are the brand's free-text lines for a year, one cell per month, not tied to a promotion; brokers can read them.

**Example.** The July column for one banner lists the two TPR events running there, each with its status.

**Related:** 30. Approved promotion, 31. Promotion event, 32. TPR and EDLP

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

## Shipments and store measures

### 39. Distributor sales (shipments)

For: everyone. Also called: shipments, sell-in, distributor sales report, cases shipped, sales dollars, sales data.

**What it means.** Distributor sales are the monthly shipments KeHE and UNFI made of a brand's products from their warehouses to stores: sell-in, not what shoppers bought.

**Rules**

- Each line is one store, warehouse, product and month from the distributor's file; a store can have several lines for the same product and month.
- A month is loaded for a brand and distributor by a Caboodle sync or a brand's upload; loading a month again replaces it.
- The files have no month of their own: whoever loads a file picks its month.
- A line reaches distributor sales only when its retailer, store and UPC are all matched; until then Caboodle's team holds it back.
- The dollars are the distributor file's figure (KeHE's current-year cost, UNFI's sales dollars), not what shoppers paid.
- Shipments and SPINS scan sales measure different things and are never added together.

**Example.** A brand's September UNFI shipments are one month of lines, one per store, warehouse and product.

**Related:** 40. KeHE and UNFI, 41. Store count and points of distribution, 42. Velocity, 44. SPINS, 63. Unmapped records

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 40. KeHE and UNFI

For: everyone. Also called: kehe, unfi, kehe vs unfi, distributor files.

**What it means.** KeHE and UNFI are the two distributors whose files Caboodle loads. Their files differ, so their figures arrive differently.

**Rules**

- KeHE files give units and cost, and Caboodle works out KeHE cases from the product's case pack; UNFI files give cases and sales dollars, with no units.
- KeHE gives each department of a store its own customer number; UNFI identifies stores by its own number.
- KeHE files also hold prior-year quantity and cost, kept only with the raw file, not in distributor sales.
- A KeHE line whose retailer area is "Single Store" belongs to the retailer KeHE Independents, and a line marked "Confidential" to the Confidential retailer.
- Changing a product's case pack recalculates all its KeHE cases.

**Example.** The same store can appear under two KeHE customer numbers, one per department.

**Related:** 39. Distributor sales (shipments), 21. Cases, units and case pack, 14. Distributor

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 41. Store count and points of distribution

For: everyone. Also called: store count, pod, points of distribution, distribution.

**What it means.** A store count is the number of distinct stores that received a product in a period; points of distribution (POD) count store and product pairs.

**Rules**

- Count each store once over the whole period: never add up per-month or per-distributor store counts.
- POD for one product is the stores that received it; for several products, add each product's stores.
- Caboodle's distributor sales report shows 0 POD for a retailer, store or city whose cases add up to 0.
- Store counts come from shipments; a banner's door count is how many stores the banner has.

**Example.** Two products each shipped to 40 stores give 80 points of distribution, even if the 40 stores are the same.

**Related:** 39. Distributor sales (shipments), 42. Velocity, 43. Void, 11. Banner

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 42. Velocity

For: everyone. Also called: units per store per week, sales rate.

**What it means.** Velocity is units per store per week. From distributor sales it is units shipped ÷ stores ÷ weeks; SPINS has its own scan-based measures per store selling.

**Rules**

- In Caboodle's distributor sales report, units are cases × case pack, and a month counts as 4.43, 4.29 or 4.0 weeks by its length.
- It is worked out per product, so a product that reached more stores can have a lower velocity.
- The average weekly sales on a promotion is typed in by people; it isn't this measure.

**Example.** 1,200 units to 50 stores in a 4.43-week month is about 5.4 units per store per week.

**Related:** 41. Store count and points of distribution, 39. Distributor sales (shipments), 36. Baseline and lift

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 43. Void

For: everyone. Also called: voids, lost distribution, store void.

**What it means.** A void is a store that received a product before and then stopped: a lost point of distribution.

**Rules**

- Caboodle's store void report shows units per store, product and month, and the gaps show the voids; it doesn't count them.
- A month not loaded yet looks the same as a void, so check how far the data runs.

**Example.** A store that received a product every month until June and nothing since is a void from July.

**Related:** 41. Store count and points of distribution, 39. Distributor sales (shipments)

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

## SPINS scan data

### 44. SPINS

For: everyone. Also called: spins data, syndicated data, scan data, sell-through.

**What it means.** SPINS is syndicated retail data the brand buys and uploads: what shoppers bought at the register in the stores SPINS covers (sell-through). Distributor sales are sell-in: shipments to stores.

**Rules**

- Brands upload SPINS files themselves; Caboodle can't sync them.
- There are two SPINS reports: Stores Insight (the brand's own products, store by store and week by week) and Item Ranking (the whole category in a market, competitors included).
- Uploads add to what is there: a file uploaded twice counts twice until it is deleted.
- SPINS and shipments are never added together.

**Example.** SPINS can show what shoppers bought of a product at a retailer last quarter, while distributor sales show what was shipped to its stores.

**Related:** 45. SPINS Stores Insight, 46. SPINS Item Ranking, 47. ARP and ACV, 39. Distributor sales (shipments)

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 45. SPINS Stores Insight

For: everyone. Also called: stores insight, scan sales, store scan data.

**What it means.** Stores Insight is SPINS store-level data for the brand's own products: dollars, units, average retail price and promotion shares per store and week.

**Rules**

- Each line is one product at one store for a time window; the window's length in weeks and its end date come from the file.
- The file has no brand column: it is the brand's because the brand uploaded it.
- It covers the stores SPINS covers, which aren't linked to Caboodle's store list.

**Example.** One line gives a product's dollars and units at one store for the week ending on a Sunday.

**Related:** 44. SPINS, 46. SPINS Item Ranking, 47. ARP and ACV

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 46. SPINS Item Ranking

For: everyone. Also called: item ranking, category ranking, market ranking, competitors, category sales, market share.

**What it means.** Item Ranking is SPINS market data for a whole category in a market such as TOTAL US, competitors included: each item's rank, dollars and change, dollar share, units, ARP and % ACV.

**Rules**

- It is Caboodle's own market data: questions about the brand's category, competitors and market are answered from it before any web search.
- Each upload covers a window (for example 52 weeks ending on a date); windows overlap, so a total adds up one window only.
- Caboodle's Item Ranking screens add up every window that ends in the latest year, so their totals can differ from a one-window total.
- "Nationally" means the TOTAL US market.

**Example.** A 52-week window ending in June ranks every frozen dessert item in TOTAL US by dollars.

**Related:** 44. SPINS, 45. SPINS Stores Insight, 47. ARP and ACV

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 47. ARP and ACV

For: everyone. Also called: arp, average retail price, acv, all commodity volume.

**What it means.** ARP (average retail price) is the average price per unit shoppers paid, from SPINS. ACV (all-commodity volume) is SPINS's weighted distribution: the share of the market's sales done by the stores that carry an item.

**Rules**

- Both come from SPINS, never from shipments.
- The ACV typed on a promotion event isn't used by any figure.

**Example.** A % ACV of 60 means stores doing 60% of the market's sales carry the item.

**Related:** 44. SPINS, 46. SPINS Item Ranking, 23. List price, wholesale cost and shelf price

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |
