# Caboodle guide — batch 3 of 3, for review

Draft of 3 November 2026, for review with Constance. Generated from the guide file in the code, so what you approve is exactly what Ask Caboodle reads.

Ask Caboodle answers questions about how Caboodle works (what a term means, how things connect, the rules the app follows) only from these entries. We wrote each one from Caboodle's code, not from memory. Until you approve an entry, only Caboodle's own team sees answers that use it, marked "not yet reviewed".

What we ask of you: for each entry, mark Keep, Change or Drop; write any correction in your own words; and note how your clients say it (the words they use), so Ask Caboodle understands them. The entries give no steps in the app (where to click): those come after the new screens.

This batch: Category reviews, reports, files and contacts, Ask Caboodle itself, The data pipeline (platform admins) (18 entries).

## Questions to settle first

The code doesn't settle these; your answers decide the wording.

- **51. Market overview:** The app moves an authorization only upward: Pending, Commit, Approved, Active. Is that the order your clients use?

## Category reviews, reports, files and contacts

### 48. Category review

For: everyone. Also called: line review, review window, open review, category reviews.

**What it means.** A category review is a retailer's periodic review of a category (a line review): the window in which brands submit new items. Caboodle records each review with its retailer, region, category, review month, review start and end dates and reset date.

**Rules**

- A brokerage keeps its own list of reviews, which the brands connected to it can view; a brand can also keep its own reviews.
- The month is a calendar month or "Open Review".
- Region, retailer and category are required, and the same review can't be added twice; deleting a review is permanent.
- Calendar entries and brand reports keep their own copy of the review's details: editing the review updates them, and deleting the review leaves them in place with the details they had.
- The retailer and category are typed text: they aren't Caboodle's retailer list or the brand's product categories.

**Example.** A retailer's frozen dessert review in March, with submissions open from January to February and the reset in June.

**Related:** 49. Category review calendar, 50. Brand report, 20. Product category

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 49. Category review calendar

For: everyone. Also called: review calendar, category review report.

**What it means.** A brand's category review calendar holds the reviews placed on it by the brand or its brokerages, grouped by retailer and category, in their review month (or Open Review) and again in their reset month.

**Rules**

- The brand and its brokerages can both add reviews to the brand's calendar or take them off.
- Adding a brokerage's review to a brand's calendar starts a brand report for it; taking it off keeps the brand reports.
- A brokerage can email the brand's admins about reviews, and can assign brands to a review's dates, which emails them its details.

**Example.** A brokerage adds a retailer's March review to a brand's calendar, which starts that brand's report on it.

**Related:** 48. Category review, 50. Brand report

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 50. Brand report

For: everyone. Also called: brand reports, notify brand, submission status, brand response, internal notes, external notes, review result.

**What it means.** A brand report is a brokerage's follow-up for one brand on one of the brokerage's category reviews: whether the brand is submitting, its response, what is awaited, the next action with its due date, and the review's result.

**Rules**

- A brand report is created by Notify Brand (which also emails the brand's people), by hand, or when the review is added to the brand's calendar; a brand and a review have one report.
- Only the brokerage writes it; the brand sees every brokerage's reports about it, view only.
- Notes are internal (the brokerage only) or external (shared with the brand).
- The status choices (Submission Status, Brand Response, Waiting On, Next Action, Review Result) are one list for every brokerage, kept by Caboodle's platform admins.

**Example.** After a review, the brokerage sets the brand's Review Result and adds an external note the brand can read.

**Related:** 48. Category review, 49. Category review calendar, 3. Brokerage

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 51. Market overview

For: everyone. Also called: broker market activities, field observation, market activity, market overviews.

**What it means.** A market overview is a brokerage's dated field observation of a brand's product at a retailer and banner (and optionally a store or warehouse): its status there, launch date, training, case stack and a comment.

**Rules**

- Only brokerages record them, and each sees and edits only its own; the brand sees every brokerage's observations of its products as Broker Market Activities, view and export only.
- Brokers can pick only banners linked to the brand through its distributors.
- An observation updates the product's authorization at that banner, but only upward (Pending, then Commit, then Approved, then Active). It never changes an Active or Discontinued authorization, and Not Active, Declined or Discontinued apply only over Not Active, Declined or no authorization.
- Deleting an observation doesn't undo the change to the authorization.

**Example.** A broker records a product as Active at a banner on 3 May, and the product's authorization there becomes Active from that date.

**Related:** 24. Authorization, 3. Brokerage, 25. Authorized vs shipping

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 52. Files

For: everyone. Also called: file repository, documents, private files, share link.

**What it means.** Files is a brand's or a brokerage's document store: sell sheets, decks, contracts and other documents, in folders.

**Rules**

- A brand's files and a brokerage's own files are separate; a brokerage with the files module on a connected brand works in the brand's files.
- Private files and folders are seen only by the company's own members who may see private files (its admins, by default); a brokerage never sees a brand's private files.
- A share link opens a file without signing in. Private files can't be shared, and a link stops working when it is revoked or expires or its file becomes private.
- Ask Caboodle can't read the documents in Files.

**Example.** A brand keeps its sell sheets in Files and shares one with a buyer through a link.

**Related:** 3. Brokerage, 5. Members and roles

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 53. Contacts

For: everyone. Also called: contact, address book, buyer contacts.

**What it means.** Contacts are a brand's own address book: name, title, business name, email, phone and notes for the people it deals with.

**Rules**

- Each contact belongs to one brand; a brokerage uses them only through a connected brand that has the contacts module.
- Business name and title are typed text: a contact isn't linked to a retailer or banner directly, only through activities.
- Email and phone are unique within the brand.
- Ask Caboodle can give contacts' names, titles and companies, never their emails, phone numbers or notes.

**Example.** A brand's contact for one retailer's frozen category, with the buyer's title and company.

**Related:** 54. Activities and pipeline, 2. Brand

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 54. Activities and pipeline

For: everyone. Also called: pipeline, banner activity, activities, deal stage, plan board, pipeline task.

**What it means.** Banner activities are dated notes a brand logs on a banner. The pipeline is the brand's boards (plans) of task cards moving through stages, each optionally about a retailer.

**Rules**

- A banner activity can name one of the brand's contacts, and people mentioned in it get an email.
- A pipeline task needs a title, a plan and a stage; a retailer is optional, and there is no banner or product on it.
- Stages are shared by every brand unless a brand adds its own.
- An activity on a task that tags a banner is also logged on that banner.
- A plan can't be deleted while it has tasks; deleting a task deletes its activities.

**Example.** A task "Pitch new flavors" on the 2027 plan moves from one stage to the next as the meetings happen.

**Related:** 53. Contacts, 11. Banner

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 55. Reports and dashboards

For: everyone. Also called: reports, dashboard, sales tracker, retail reports, product status summary, trade spend roll up.

**What it means.** Caboodle's reports summarize the other modules' data: product statuses, promotions, field observations, category reviews and shipments.

**Rules**

- Product Status Summary (dashboard): for each category and product, how many banners it is Active, Discontinued or Not Active at.
- Trade Spend Roll Up: the brand's promotions rolled up.
- Broker Market Activities: every brokerage's market overviews of the brand's products.
- Category Review Report: the category review list and calendar.
- Retail Reports: the retailers and banners carrying the brand's products. Sales Tracker: for each banner, how many of the brand's products are in each status.

**Example.** The Sales Tracker shows a banner with 8 products Active and 3 Pending.

**Related:** 24. Authorization, 51. Market overview, 49. Category review calendar, 35. Trade spend, trade rate and net revenue

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

## Ask Caboodle itself

### 56. Ask Caboodle

For: everyone. Also called: ai assistant, caboodle ai, the ai.

**What it means.** Ask Caboodle is Caboodle's AI analyst: it answers questions in plain words from the Caboodle data the person may see, and explains Caboodle's terms from this guide.

**Rules**

- Every figure comes from a query or Caboodle's calculators, never from general knowledge, and a figure it couldn't check against the data is marked.
- On a brand, it uses only that brand's data.
- It can't change data or forecast, and it can't explain steps in the app yet.
- It is a module: an organization has it only when Caboodle switches it on.

**Example.** Asked how many cases shipped last month, it queries distributor sales and shows the months its answer covers.

**Related:** 57. Ask Caboodle limits, 58. Pinned report, 59. Saved prompt, 60. Saved name

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 57. Ask Caboodle limits

For: everyone. Also called: questions per day, daily limit, conversation limit, questions left, question limit.

**What it means.** Ask Caboodle has limits: a daily number of questions shared by the organization, a number of questions per conversation, and a monthly allowance.

**Rules**

- The organization's daily questions are a module setting Caboodle sets, and every member draws on the same pool; platform admins have their own daily limit.
- A conversation holds a set number of questions; after that, start a new conversation.
- Only questions that reached the AI count.
- Ask Caboodle can also stop for the rest of the month when the organization's monthly allowance is used.

**Example.** When the day's questions are used up, Ask Caboodle says when it can answer again.

**Related:** 56. Ask Caboodle, 8. Module

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 58. Pinned report

For: everyone. Also called: pin, pins, pinned reports.

**What it means.** A pinned report is an answer saved to your board that stays live: opening it runs its query again, with no AI, on the latest data.

**Rules**

- A pin keeps the answer's query and view; it can switch period when the question used a relative period such as last month.
- It shows the change against the previous period, or says the data isn't loaded yet.
- Pins are personal; each is checked every night and marked when it breaks.
- A pin shows only data you may see when you open it.

**Example.** A pin of last month's cases by retailer shows October's figures once October is loaded.

**Related:** 56. Ask Caboodle

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 59. Saved prompt

For: everyone. Also called: prompt gallery, prompt, prompts, fill-in, verified prompt.

**What it means.** A saved prompt is a question kept in the prompt gallery to ask again, with fill-ins (a period, a retailer, a product) that people pick when they run it.

**Rules**

- A prompt is private, shared with the organization, or shared with chosen people in it.
- A prompt shared with the organization waits for the organization's admins to approve it.
- Prompts marked Verified come from Caboodle's suggested questions or were checked from a run.

**Example.** "How many cases did we ship to {retailer} in {period}?" runs for whichever retailer and period people pick.

**Related:** 56. Ask Caboodle

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 60. Saved name

For: everyone. Also called: saved names, nickname, remember this name.

**What it means.** A saved name is your organization's own word for a retailer, banner, distributor or product, saved when Ask Caboodle asked which one you meant.

**Rules**

- Once saved, Ask Caboodle uses it for everyone in the organization and says so in its answer.
- Admins can add names directly, and saved names can be removed.

**Example.** After you pick The Fresh Market for "Fresh", the next question about "Fresh" goes straight to it.

**Related:** 56. Ask Caboodle

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 61. Web search in Ask Caboodle

For: Caboodle's platform admins only. Also called: search the web, public web.

**What it means.** A conversation started with Search the web lets Ask Caboodle search the public web for questions about the market, the category, competitors or a retailer's news.

**Rules**

- The brand's own business is answered from Caboodle's data, never the web; for the brand's category and market it uses SPINS Item Ranking first.
- Search queries hold only public words, never figures or names from Caboodle's data.
- Every web fact is cited, and web figures never go into a Caboodle table or total.
- Each search costs money; for now only platform admins can start such a conversation.

**Example.** Asked about consumer trends in frozen desserts, it searches the web and lists the sources it used.

**Related:** 56. Ask Caboodle, 46. SPINS Item Ranking

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

## The data pipeline (platform admins)

### 62. Data sync and uploads

For: Caboodle's platform admins only. Also called: sync run, data sync, run sync, import job, file upload, sync status.

**What it means.** Distributor sales arrive by a Caboodle sync, which downloads a brand's monthly KeHE or UNFI report from the distributor's portal, or by a brand uploading the file. Each load is a sync run for one brand, distributor and month.

**Rules**

- Nothing syncs on a schedule: a platform admin starts each sync.
- A run ends failed on any error, partially succeeded when some lines are unmapped, and succeeded otherwise; a failed run may still have loaded its rows, and the latest run of a month is the one whose rows exist.
- Loading a month replaces that brand's month for that distributor.
- Syncs and uploads don't start while a store clean-up runs.
- "Map existing data" runs are dated January 2000.

**Example.** A sync of a brand's September KeHE report that leaves 40 lines unmapped ends partially succeeded.

**Related:** 39. Distributor sales (shipments), 63. Unmapped records

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 63. Unmapped records

For: Caboodle's platform admins only. Also called: unmapped, unmapped lines, resolve unmapped.

**What it means.** An unmapped record is a distributor file line whose retailer, store or UPC Caboodle couldn't match. It waits outside distributor sales until a platform admin resolves it.

**Rules**

- A line needs all three matched: the retailer (by an approved alias), the store (by customer number, address or location) and the UPC (the brand's product, or a UPC mapping).
- Resolving a retailer or a store applies to every brand; resolving a UPC applies to one brand and distributor.
- A new store found at a full address waits for approval before its lines move.
- Approving moves every brand's fully resolved lines into distributor sales at once.
- Ignoring a value on lines that already moved only marks them; they still count.

**Example.** A UNFI line with a new spelling of a retailer's name waits until an admin points that spelling at the retailer.

**Related:** 62. Data sync and uploads, 64. Retailer aliases and UPC mappings, 39. Distributor sales (shipments)

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 64. Retailer aliases and UPC mappings

For: Caboodle's platform admins only. Also called: retailer alias, store alias, upc mapping, customer link, entity resolution.

**What it means.** Aliases and mappings are how Caboodle recognizes distributors' spellings: an alias points a raw retailer or store spelling at one retailer or store, a customer link ties a distributor's customer number to a store, and a UPC mapping ties a distributor's UPC to a brand's product.

**Rules**

- Only approved aliases are used; platform admins approve, reject or retire them, and aliases made while resolving lines are approved at once.
- A UPC mapping made by hand is tried before a direct UPC match.

**Example.** The spellings "SPROUTS FARMERS MKT" and "Sprouts

**Related:** 63. Unmapped records, 12. Store

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 65. Store list issues and clean-up

For: Caboodle's platform admins only. Also called: store list issues, store merge, store clean-up.

**What it means.** Caboodle checks its store list for problems (issues) such as stores at one address, missing banners or incomplete addresses; platform admins fix them, merge duplicate stores and run clean-ups.

**Rules**

- The issue types are pseudo-labelled store, out-of-date retailer name, chain in CRM twice, missing banner, stores at one address, store key conflict, incomplete address, suspect location, broken characters, unlinked sales rows, and a banner that isn't one of the store's retailer's banners.
- An issue is open, ignored or resolved.
- When an admin decides a store's retailer is right, the store's sales rows take that retailer from then on, whatever retailer the distributor's file or a later sync gives them.

**Example.** Two store list entries at one address show as an issue until an admin merges them or marks it ignored.

**Related:** 12. Store, 63. Unmapped records

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |
