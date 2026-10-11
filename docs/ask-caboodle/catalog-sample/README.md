# Ask Caboodle — Schema Catalog (sample slice)

This folder is a **small, real slice** of the catalog described in the design doc (§5), built from the BE branch `feature/ask-caboodle-phase1`. It shows the format, the depth, and exactly what the agent sees. In production it lives in the BE repo (e.g. `caboodle/src/Modules/AskCaboodle/Catalog/`) and is reviewed in PRs like code.

## What the catalog is

The agent writes SQL against Caboodle's database. The database alone can't tell it what anything *means*: 106 tables, ~2,000 columns, only 9 declared foreign keys, names like `CustomerName` that actually mean "store", joins on lower-cased banner **text**, fields that are user-typed guesses rather than facts. The catalog is the written-down business knowledge that turns "plausible SQL" into "the same number the app shows".

It has five kinds of content:

| Level | File(s) | Holds |
|---|---|---|
| **Global** | `glossary.yaml` | conventions every query obeys (soft delete, quoting, audit columns), business glossary (case, pack, door, POD, velocity, TPR, EDLP, lift…), date and data semantics |
| **Schema** | `schemas/*.yaml` | what the schema is for, owning module slugs, which tables are canonical vs raw vs never-query |
| **Table** | `tables/*.yaml` | purpose, **grain** (what one row is), scope, every column's meaning and enum values, relationships, rules, verified examples, provenance |
| **Join paths** | `join-paths.yaml` | multi-hop routes between business concepts, including text joins and their failure modes |
| **Metrics** | `metrics.yaml` | each business figure → which tier serves it (rollup / canonical view / C# tool) so numbers reconcile with the app |

Three kinds of relationship are recorded, because the agent needs all three:

- **Database-level** — declared FKs (rare here: 9 in the whole schema).
- **Logical** — id columns with no FK (`Banners.RetailerID` → `Retailers.ID`), and **text joins** the app actually uses (`LOWER(TRIM(BannerName)) = LOWER(TRIM(Banner))`).
- **Business** — relationships that exist only in meaning: "a planned promotion and the shipments it produced", "only the reporting version of a promotion family counts". These usually become a join path or a routing rule ("don't join; call the tool").

## What the agent actually sees

The agent never reads these YAML files directly. A build step renders two things:

1. **The index** (`generated/system-prompt-index.txt`) — one line per table, in the cached system prompt, together with the glossary. Small enough to send on every call.
2. **Table detail on demand** (`generated/get_table_info-output.md`) — when the agent calls `get_table_info(["DataUpload.DistributorSalesRecords"])`, it gets that table's rendered entry plus the relevant join paths and metrics.

`example-trace.md` walks one real question through the loop: entity resolution → table detail → SQL → answer, and a second question that the catalog *routes away* from SQL.

## How it gets built (and kept "as perfect as possible")

Perfect everywhere on day one is not achievable or necessary; **perfect where questions land, and provably correct where it states something**, is. Coverage is tiered:

| Tier | Tables | Depth |
|---|---|---|
| Gold | ~25–30 priority tables (TradeSpend, Sandbox, DataUpload sales, CRM, ProductSpecs, Brand/Organization) | every column explained, rules, join paths, verified examples, human-reviewed |
| Silver | the rest of the granted tables | generated + mined + profiled; meanings marked `to_verify` until a question needs them |
| Excluded | Identity, Email, Auditing, Hangfire, IAM secrets, raw import tables | listed in the schema file as never-query; not granted to `askcaboodle_ro` |

Build layers, cheapest first:

1. **Generate** skeletons from `MainDbContextModelSnapshot.cs` + enum reflection — names, types, indexes, enum int→name maps. Zero judgment, 100 % coverage, regenerated on every migration.
2. **Mine the code** — one agent per module reads entities, EF configs, Dapper SQL, validators, specifications and `docs/`, and proposes meanings, joins and rules **with file:line citations** (`provenance:` in each file).
3. **Profile the data** on the prod restore — row counts, date coverage, null rates, distinct values, and **orphan rates for every proposed relationship**. A join is `verified: true` only when the data agrees.
4. **Human review** of Gold tables — the business owner answers what code can't (e.g. fiscal quarters, which POD definition is "the" POD).
5. **Flywheel** — every wrong answer becomes one catalog sentence + one eval question.

Gates keep it correct over time: the **drift test** fails CI when a migration changes a table without a catalog update; **reconciliation tests** prove canonical views equal the app's stored numbers; the **eval set** gates every catalog change.

## Files in this sample

```
glossary.yaml                                   global conventions + glossary (excerpt)
schemas/CRM.yaml, schemas/DataUpload.yaml       schema level (excerpts)
tables/CRM.Retailers.yaml                       small reference table
tables/CRM.Banners.yaml                         reference table with a logical FK
tables/CRM.DistributorBanners.yaml              brand-scoped bridge table
tables/DataUpload.DistributorSalesRecords.yaml  the main fact table (full depth)
tables/TradeSpendSandbox.PromotionalEvents.yaml a table whose numbers must NOT be computed in SQL
join-paths.yaml                                 4 paths
metrics.yaml                                    6 metrics across the three tiers
generated/system-prompt-index.txt               what goes in the cached prompt
generated/get_table_info-output.md              what the tool returns
example-trace.md                                two questions end to end
```

Values marked `null  # profiler` are filled by layer 3; entries marked `verified: false` are mined but not yet confirmed against data — shown deliberately, because that state is normal while the catalog is being built.
