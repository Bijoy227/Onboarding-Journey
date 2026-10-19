# Caboodle guide — batch 1 of 3, for review

Draft of 19 October 2026, for review with Constance. Generated from the guide file in the code, so what you approve is exactly what Ask Caboodle reads.

Ask Caboodle answers questions about how Caboodle works (what a term means, how things connect, the rules the app follows) only from these entries. We wrote each one from Caboodle's code, not from memory. Until you approve an entry, only Caboodle's own team sees answers that use it, marked "not yet reviewed".

What we ask of you: for each entry, mark Keep, Change or Drop; write any correction in your own words; and note how your clients say it (the words they use), so Ask Caboodle understands them. The entries give no steps in the app (where to click): those come after the new screens.

This batch: Your organization and access, Retailers, banners, stores and distributors, Products, prices and authorizations (27 entries).

## Questions to settle first

The code doesn't settle these; your answers decide the wording.

- **24. Authorization:** The app doesn't define what each status means. What do Pending, Commit and Approved mean for your clients, which comes first, and which statuses count as "authorized"?
- **26. Distributor APL:** The BA's documents also read APL as "Authorized Price List", and their memo says the Retail APL and Distributor APL names are awaiting a ruling. Which names do your clients use?

## Your organization and access

### 1. Organization

For: everyone. Also called: company, organization type.

**What it means.** An organization is a company that uses Caboodle: either a brand or a brokerage. People use Caboodle as members of an organization, and what they see depends on the organization's modules and their own access.

**Rules**

- Every organization is either a brand or a brokerage; there are no other types.
- A new organization starts with no modules switched on; Caboodle's platform admins switch them on.
- A person can belong to several organizations and works in one at a time.
- When Caboodle suspends an organization, its members lose access to it, and a suspended brand also disappears for the brokerages connected to it.

**Example.** An ice cream brand is one organization; the brokerage that represents it at retailers is another.

**Related:** 2. Brand, 3. Brokerage, 5. Members and roles, 8. Module, 4. Brand connection

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 2. Brand

For: everyone. Also called: brand organization, cpg brand, manufacturer.

**What it means.** A brand is a company that makes products and sells them through distributors to retailers. In Caboodle a brand is an organization, and its products, prices, promotions, sales data and contacts belong to it.

**Rules**

- A brand's own records (products, prices, promotions, distributor sales, SPINS data, contacts) are seen only by the brand and the brokerages connected to it.
- A brand can be represented by several brokerages, each through its own connection.
- Retailers, banners, stores, regions and distributors are shared reference data that every brand uses.

**Example.** An ice cream brand keeps its products, list prices and promotions in Caboodle and sees what KeHE and UNFI shipped to stores.

**Related:** 1. Organization, 3. Brokerage, 4. Brand connection, 19. Product

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 3. Brokerage

For: everyone. Also called: broker, broker company, brokerage organization, food broker.

**What it means.** A brokerage is a company that represents brands at retailers. In Caboodle a brokerage is an organization: it works on the brands connected to it and keeps its own records about them, such as market overviews, category reviews and brand reports.

**Rules**

- A brokerage works on a brand only while a connection between the two is active.
- Records a brokerage writes about a brand, such as market overviews and brand reports, belong to that brokerage; another brokerage on the same brand never sees them.
- The brand sees the market overviews and brand reports about it, view only.
- A brokerage also has records of its own, apart from any brand: its list of category reviews and its files.

**Example.** A brokerage represents three brands; on each one it records market overviews that only it and that brand see.

**Related:** 4. Brand connection, 2. Brand, 51. Market overview, 50. Brand report, 48. Category review

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 4. Brand connection

For: everyone. Also called: connected brand, connected brokerage, brokerage connection, how brokerages work with brands.

**What it means.** A brand connection links a brand to a brokerage that represents it. While the connection is active, the brokerage's people can work on that brand in Caboodle.

**Rules**

- Only Caboodle's platform admins create, suspend or end a connection, and it is active as soon as it is created; neither the brand nor the brokerage requests or accepts it.
- A brand can have several brokerages; a brand and a brokerage have at most one open connection.
- On a connected brand, the brokerage gets every module the brand has switched on, plus its own brokerage modules. The brand doesn't choose which.
- Brokerage admins work on every connected brand; a broker works only on the connected brands their admins give them.
- A suspended connection gives no access but keeps each person's brand access. An ended connection removes the brokerage people's access to that brand and can't be reopened: a new connection is needed.
- Brand members see the brand's brokerages and the brokerage people working on the brand, view only.

**Example.** Caboodle connects an ice cream brand to its brokerage; the brokerage admin then gives the brand to the broker who covers it.

**Related:** 2. Brand, 3. Brokerage, 7. Brand access, 8. Module, 9. Caboodle platform admin

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 5. Members and roles

For: everyone. Also called: member, members, role, roles, brand admin, brand member, brokerage admin, broker role, organization admin, permissions.

**What it means.** People use Caboodle as members of an organization. Each member has a role, and the role decides what they can manage in the organization; what they can see and do in each module comes from the modules and their brand access.

**Rules**

- A brand has two built-in roles, Brand Admin and Brand Member; a brokerage has Brokerage Admin and Broker.
- Admins can manage everything in their organization: its details, members, invitations, join requests, email domains, brand access and private files. Brand Members can see the organization, its members and its connections; Brokers can see the organization and its members.
- Only Caboodle's platform admins create roles beyond the built-in ones; a role made for brands can be used by every brand.
- A member who can change roles assigns them; nobody can change their own role, suspend or remove themselves, and an organization always keeps at least one active member who can change roles.
- A suspended member keeps their place but has no access until reactivated; a removed member loses this organization only, not their account or their other organizations.

**Example.** In a brokerage, the Brokerage Admin invites a new Broker and gives them two of the brokerage's connected brands.

**Related:** 1. Organization, 6. Joining an organization, 7. Brand access, 9. Caboodle platform admin

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 6. Joining an organization

For: everyone. Also called: invitation, invite, access request, request to join, email domain, join.

**What it means.** A person joins an organization by invitation, by asking to join and being approved, or by creating their own organization; Caboodle's platform admins can also add people.

**Rules**

- An invitation link works for 7 days, and only for an account with the invited email address.
- Who may ask to join depends on the organization's joining rule: anyone, only people whose email domain is one of the organization's domains, or nobody (invitation only). A member who can approve requests approves or rejects them and picks the role.
- An email domain lets people with that domain find the organization and ask to join; it never adds anyone by itself. Each domain belongs to one organization, public email domains can't be added, and removing a domain never removes members.
- Anyone signed in can create their own organization and becomes its admin.

**Example.** A new team member gets an invitation, signs up with the invited email address within 7 days, and joins the brand.

**Related:** 5. Members and roles, 1. Organization

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 7. Brand access

For: everyone (mainly organization admins). Also called: full access, custom access, member access.

**What it means.** Brand access decides which brands a member can work on and, when it is limited, which modules and actions they can use on each.

**Rules**

- In a brand, every member gets the brand in full when they join; an admin can narrow a Brand Member to chosen modules and actions.
- In a brokerage, admins work on every connected brand. A Broker works only on the connected brands given to them, each in full (every module the brand has switched on) or custom (chosen modules with chosen actions: view, create, update, delete, import, export).
- Admin roles can't be limited.
- A brand a member has no access to is invisible to them, and its records answer as not found.

**Example.** A Broker given one brand with view-only access to approved promotions can open its promotions but not change them.

**Related:** 5. Members and roles, 4. Brand connection, 8. Module

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 8. Module

For: everyone. Also called: modules, feature, module settings, settings, switched on.

**What it means.** A module is one part of Caboodle, such as products and pricing, approved promotions, the distributor sales report or Ask Caboodle. An organization has only the modules Caboodle's platform admins switch on for it.

**Rules**

- Brands and brokerages have separate lists of modules; a brokerage on a connected brand also uses the brand's switched-on modules.
- Some modules need others: a module can't be switched on while one it depends on is off (market overview needs products, regions, retailers and distributors); switching on approved promotions also switches on the sandbox; and a module can't be switched off while a switched-on module depends on it.
- What a person may do in a module is one or more actions: view, create, update, delete, import and export.
- Module settings are limits per organization, such as how many versions a sandbox promotion may have, the largest data upload or the daily Ask Caboodle questions. Only Caboodle's platform admins change them; an organization's admins can view most of them.

**Example.** A brand without the SPINS module doesn't see SPINS reports or upload SPINS files.

**Related:** 1. Organization, 7. Brand access, 9. Caboodle platform admin

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 9. Caboodle platform admin

For: everyone. Also called: platform admin, caboodle admin, support access, caboodle team.

**What it means.** Caboodle's platform admins are Caboodle's own team. They set up organizations and connections, switch modules on, set module settings and keep the shared reference data, and they can open any organization to help.

**Rules**

- Only platform admins create, suspend or restore organizations; create, suspend or end brand connections; create roles beyond the built-in ones; switch modules on or off; and change module settings.
- Only platform admins manage the shared retailers, banners, stores, regions, distributors and distribution centers, and the pipeline that loads distributor files.
- A platform admin can open any organization without being a member (support access); there they see only the modules that organization has switched on.

**Example.** To add a brokerage for a brand, a Caboodle platform admin creates the brokerage and connects it to the brand.

**Related:** 1. Organization, 4. Brand connection, 8. Module

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

## Retailers, banners, stores and distributors

### 10. Retailer

For: everyone. Also called: chain, corporate parent, retailers.

**What it means.** A retailer is the chain or corporate parent that owns stores, such as Sprouts, Publix or Kroger.

**Rules**

- Retailers are shared reference data: every brand sees the same retailers, and only Caboodle's platform admins add or change them.
- A retailer has one or more banners, and its stores belong to those banners.
- A brand's list of retailers shows those with at least one banner linked to one of the brand's distributors.
- A retailer can't be deleted while it has banners.

**Example.** Kroger is a retailer; Fred Meyer and Ralphs are two of its banners.

**Related:** 11. Banner, 12. Store, 13. Region, 17. How retailers, banners and stores connect

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 11. Banner

For: everyone. Also called: store brand, door count, banners.

**What it means.** A banner is a store brand under a retailer: the name on the stores.

**Rules**

- Each banner belongs to exactly one retailer.
- A banner's door count is its number of stores, typed in by Caboodle's platform admins; it isn't counted from the store list.
- Banners are shared reference data, managed by Caboodle's platform admins.
- Authorizations, a brand's distributor links and promotion events are all set per banner.
- A banner can't be deleted while it has authorizations or activities.

**Example.** Fred Meyer and Ralphs are banners of the retailer Kroger.

**Related:** 10. Retailer, 12. Store, 17. How retailers, banners and stores connect, 16. A banner's distributor and markup

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 12. Store

For: everyone. Also called: door, ship-to location, store list, stores.

**What it means.** A store is one location of a banner. Caboodle's store list holds every store with its retailer, banner, address and region.

**Rules**

- Each store belongs to one retailer and one of its banners.
- Caboodle's platform admins keep the store list. Stores in distributor files are matched to it, and a new address can add a store for an admin to approve.
- In distributor sales, the store is the ship-to customer in the distributor's file, matched to the store list.

**Example.** One Sprouts store in Phoenix is one entry in the store list, under the retailer Sprouts and its banner.

**Related:** 11. Banner, 10. Retailer, 41. Store count and points of distribution

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 13. Region

For: everyone. Also called: regions, retailer region, area.

**What it means.** A region is an area Caboodle uses to group retailers, banners, distribution centers and stores.

**Rules**

- Regions are shared reference data, managed by Caboodle's platform admins.
- A retailer's regions are set retailer by retailer, optionally for one of its banners, so a retailer or a banner can be in several regions.
- Each distribution center is in one region.
- In distributor sales, a line's region is the retailer's region in Caboodle, else one worked out from the store's state, else National.

**Example.** A retailer can be set up in both the West and the Southwest regions.

**Related:** 10. Retailer, 11. Banner, 15. Distribution center

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 14. Distributor

For: everyone. Also called: wholesaler, sub-distributor, delivery method, delivery methods, distributors.

**What it means.** A distributor is a wholesaler that buys a brand's products and ships them from its warehouses to stores, such as KeHE or UNFI. Sub-distributors under a distributor are called delivery methods.

**Rules**

- Distributors are shared reference data, managed by Caboodle's platform admins; a delivery method sits under one top-level distributor, one level deep.
- A brand links the distributors it works with, then their delivery methods; a distributor must be linked before its delivery methods.
- Prices and promotions use the brand's linked delivery methods, and its linked distributors that have none.
- A distributor can't be removed from a brand while the brand has prices for it.

**Example.** A brand links UNFI and the UNFI delivery methods it uses, and sets a list price for each.

**Related:** 15. Distribution center, 16. A banner's distributor and markup, 22. List price, 40. KeHE and UNFI

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 15. Distribution center

For: everyone. Also called: dc, warehouse, distributor warehouse, distribution centers.

**What it means.** A distribution center (DC) is one of a distributor's warehouses.

**Rules**

- Each distribution center belongs to one distributor and one region.
- Distributor sales record the distribution center each shipment left from.
- A distributor's APL is kept per distribution center.

**Example.** A KeHE warehouse that ships to stores in the Northwest is one distribution center.

**Related:** 14. Distributor, 26. Distributor APL, 13. Region

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 16. A banner's distributor and markup

For: everyone. Also called: distributor markup, markup, distributor banner link, which distributor serves a banner.

**What it means.** For each brand, every banner is served by one of the brand's distributors (or delivery methods), with a markup: the percentage the distributor adds to the brand's case cost when it sells to the retailer.

**Rules**

- The brand sets which distributor serves each banner and the markup; a banner has one distributor for the brand, and the markup can't be negative.
- In promotion figures, the retailer's case cost is the brand's case cost plus the markup; take off the case allowances and it is the retailer's net case cost.
- An approved promotion event takes its distributor from this link, so its price is the brand's list price for that distributor.
- A brokerage can record market overviews only at banners linked to the brand this way.
- A banner can't be unlinked from a distributor while approved promotion events use them together.

**Example.** A brand links a Sprouts banner to KeHE with a 25% markup, so a $36.00 case costs Sprouts $45.00 before allowances.

**Related:** 11. Banner, 14. Distributor, 22. List price, 33. Allowances, 27. How a product connects to banners, retailers and distributors

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 17. How retailers, banners and stores connect

For: everyone. Also called: retail structure, retailer hierarchy, banners and stores.

**What it means.** Caboodle's retail map has three levels: a retailer (the chain) has banners (its store brands), and each banner has stores.

**Rules**

- A banner belongs to one retailer, and a store to one banner (and so to that retailer).
- A banner's door count is its number of stores.
- Brands deal with retailers banner by banner: authorizations, a banner's distributor and promotion events are set per banner, and a retailer's figures add up its banners.
- Regions group retailers and banners by area, and a banner can be in several regions.

**Example.** Kroger (the retailer) has the banner Ralphs, and one Ralphs store in Los Angeles is a store.

**Related:** 10. Retailer, 11. Banner, 12. Store, 13. Region

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 18. Retailer promo rules

For: everyone. Also called: promo rules, promotion rules, retailer rules.

**What it means.** Retailer promo rules are reference notes on how a retailer runs promotions, per retailer, banner and region: its new item policy, AD and TPR fees, promotion length, minimum allowance and off-shelf requirements, and whether it accepts off-invoice, MCB and scan allowances.

**Rules**

- They are notes for planning: no calculation or check in Caboodle uses them.
- They are shared reference data, not one brand's.

**Example.** A retailer's rule for one banner and region might say promotions run four weeks and it accepts scan allowances.

**Related:** 10. Retailer, 33. Allowances, 34. Promotion fees

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

## Products, prices and authorizations

### 19. Product

For: everyone. Also called: sku, item, product specification, upc, products.

**What it means.** A product is one item a brand sells, identified by its UPC. Its specification holds the name, UPC, case UPC, size, case pack and dimensions, its category, and the KeHE and UNFI item codes.

**Rules**

- A product belongs to one brand, and its UPC is unique within the brand; another brand can use the same UPC.
- A product needs a name, a UPC, a case pack and a category.
- A product has no status of its own: its status is set banner by banner, by its authorization at each banner.
- A new product gets a Not Active authorization at every banner that exists then, and an empty list price for each of the brand's distributors.
- Changing a product's case pack recalculates its KeHE cases in the brand's distributor sales.
- The KeHE and UNFI item codes are stored and shown only; distributor sales match products by UPC.

**Example.** A 4-pint pack of strawberry ice cream with its own UPC and a case pack of 6.

**Related:** 20. Product category, 21. Cases, units and case pack, 22. List price, 24. Authorization, 27. How a product connects to banners, retailers and distributors

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 20. Product category

For: everyone. Also called: category, categories, product categories.

**What it means.** A product category is the brand's own grouping of its products, used in promotions and reports.

**Rules**

- Categories belong to one brand, and a category's name is unique within the brand.
- Each product has one category; a promotion event needs one, and a product without a category can't go on a promotion.
- A category can't be deleted while products or prices use it.
- It isn't the category of a category review, which is typed text about a retailer's review, and SPINS data uses SPINS's own categories.

**Example.** A brand might group its products into Mochi, Pints and Novelties.

**Related:** 19. Product, 48. Category review, 46. SPINS Item Ranking

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 21. Cases, units and case pack

For: everyone. Also called: case, cases, unit, units, case pack, each, eaches, pack.

**What it means.** A unit (an each) is one sellable item; a case is the shipping unit that holds a product's case pack of units.

**Rules**

- Cases = units ÷ case pack, and units = cases × case pack, using the product's case pack in Caboodle.
- KeHE files report units, so Caboodle works out KeHE cases from the case pack; UNFI files report cases.
- A product's case price is its unit list price × its case pack.

**Example.** With a case pack of 12, 240 units shipped are 20 cases.

**Related:** 19. Product, 22. List price, 40. KeHE and UNFI

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 22. List price

For: everyone. Also called: price list, unit price, case price, price in effect, valid from, case cost.

**What it means.** A product's list price is what the brand charges per unit through a distributor, from a valid-from date. A case costs the list price × the case pack.

**Rules**

- A list price is set per product and distributor (or delivery method) and starts on its valid-from date; there is one price per product, distributor and date, and it can't be negative.
- The distributor must be one of the brand's linked distributors.
- The price in effect on a day is the one with the latest valid-from date on or before that day. A promotion event uses the price in effect on its start date for its distributor, or 0 when there is none.
- Saving a price re-prices the brand's approved and sandbox events that start on or after its valid-from date; a price import doesn't.
- Changing a price's valid-from date adds a new price instead of moving the old one.

**Example.** A price of $3.00 a unit through KeHE from 1 March means a case of 12 costs $36.00 from that day.

**Related:** 19. Product, 23. List price, wholesale cost and shelf price, 16. A banner's distributor and markup, 31. Promotion event

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 23. List price, wholesale cost and shelf price

For: everyone. Also called: shelf price, srp, suggested retail price, three prices, retail price.

**What it means.** Three prices are easy to mix up. The list price is what the brand charges the distributor per unit. The wholesale cost is what the distributor charges, recorded per warehouse in its APL. The shelf price is what shoppers pay in the store.

**Rules**

- The brand sets its list prices, brokers record distributors' wholesale costs, and the retailer sets the shelf price.
- In promotions, the shelf price is the unit SRP typed on each event; with the retailer's cost it gives the retailer's margin. Caboodle never works out a shelf price from the list price.
- Promotion figures use the list price and the banner's markup, not the wholesale cost.
- SPINS ARP is the average price shoppers actually paid, from scan data.

**Example.** A unit listed at $3.00 might have a wholesale cost of $3.60 and an SRP of $5.99.

**Related:** 22. List price, 26. Distributor APL, 16. A banner's distributor and markup, 47. ARP and ACV

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 24. Authorization

For: everyone. Also called: banner authorization, banner sku, product status, retail apl, sku status, authorized, authorizations.

**What it means.** An authorization is a product's status at one banner, with its active and discontinued dates.

**Rules**

- There is one authorization per brand, banner and product, with one of seven statuses: Active, Pending, Commit, Approved, Not Active, Declined or Discontinued.
- The active date is kept when the status is Active, and the discontinued date when it is Discontinued. In promotion figures the product's year at the banner starts on its active date and ends the day before its discontinued date.
- Brand users set authorizations, a brokerage's market overviews also move them, and every new product starts as Not Active at each banner that exists then.
- A product can go on a promotion at a banner only when it has an authorization there (in any status) and the banner is linked to the event's distributor.
- An authorization used by a sandbox promotion can't be deleted, and a banner with authorizations can't be deleted.
- Brands see authorizations in Retail Reports and the Sales Tracker; brokers see them as the Retail APL.

**Example.** A product can be Active at one banner, Pending at another and Not Active at a third.

**Related:** 19. Product, 51. Market overview, 25. Authorized vs shipping, 27. How a product connects to banners, retailers and distributors

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 25. Authorized vs shipping

For: everyone. Also called: authorized but not shipping, authorization and shipments.

**What it means.** An authorization is the status people record for a product at a banner; shipments are what distributors actually delivered to the banner's stores. The two can disagree.

**Rules**

- Caboodle doesn't update one from the other: authorizations change only when people (or brokerage market overviews) change them, and shipments come from distributor files.
- Ask Caboodle answers the two separately: authorization questions from the authorizations, shipping questions from distributor sales.

**Example.** A new item authorized at a banner in June may show its first shipments to that banner's stores in August.

**Related:** 24. Authorization, 39. Distributor sales (shipments), 51. Market overview

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 26. Distributor APL

For: everyone. Also called: apl, approved product list, wholesale cost, distributor item code.

**What it means.** A distributor's APL (approved product list) lists the products a distributor warehouse carries, with the distributor's item code and its wholesale case and unit cost.

**Rules**

- There is one line per distribution center and UPC, tied to a brand through the UPC of the brand's product.
- Brokers keep it; importing a file again overwrites the lines for the same warehouse and UPC.
- Promotion figures don't use the wholesale cost.
- It isn't the Retail APL, which is the list of a product's authorizations at banners.

**Example.** One KeHE warehouse's APL line for a product gives KeHE's item code and its wholesale cost per case and per unit.

**Related:** 15. Distribution center, 23. List price, wholesale cost and shelf price, 24. Authorization

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |

### 27. How a product connects to banners, retailers and distributors

For: everyone. Also called: product connections, product and banner, product and retailer, product and distributor, where a product is sold.

**What it means.** A product reaches retailers and distributors through a few links: its authorization at each banner, the brand's distributor for each banner, its list prices per distributor, and the distributors' warehouse lists.

**Rules**

- Product and brand: a product belongs to one brand and one of the brand's categories.
- Product and distributor: the brand links its distributors and delivery methods, and sets the product's list price for each.
- Product and banner: the product has an authorization at each banner (its status there), and the brand links each banner to one distributor with a markup.
- Product and retailer: only through the retailer's banners; there is no direct link between a product and a retailer.
- Product and distribution center: through the distributor's APL, matched by UPC.
- In a promotion event they meet: one product, at one banner of a retailer, through the banner's distributor, at that distributor's list price in effect.
- In distributor sales, a shipment line is matched to the product by its UPC (or a UPC mapping Caboodle has made) and to a store, which gives its banner and retailer.

**Example.** An item authorized Active at Ralphs, whose banner the brand links to KeHE, is priced on a Ralphs promotion at the brand's KeHE list price, and the retailer's cost adds the markup.

**Related:** 19. Product, 24. Authorization, 16. A banner's distributor and markup, 22. List price, 26. Distributor APL, 39. Distributor sales (shipments)

| Keep / Change / Drop | Your correction | How your clients say it |
|---|---|---|
| | | |
