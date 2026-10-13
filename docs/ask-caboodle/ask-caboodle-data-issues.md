# Ask Caboodle — Data issues found while building

Status: open list, started 2026-10-13 (B6). The owner reviews these later (decision 2026-10-13); nothing is fixed for now.

This file lists problems in Caboodle's **data** that Ask Caboodle work has uncovered. These are not bugs in Ask Caboodle code. Each one makes some answers wrong or misleading, even when the agent reads the data correctly. Update the file whenever a package finds a new issue, or when one is fixed. A fix also needs the related golden eval references re-recorded (`GoldenReferenceTests`).

All figures are from local `caboodle_dev` (restore of 2026-10-11), brand Bubbies Ice Cream unless noted.

## Open

| # | Problem | Where | Evidence | Effect on Ask Caboodle answers | Found |
|---|---|---|---|---|---|
| DI1 | KeHE's January–May 2025 rows hold **units in the cases column** | `DataUpload.DistributorSalesRecords` (Source 2 = KeHE), `CasesShipped` | Units per case are 1.1–1.5 for January–May 2025 and 8.0 from June 2025 on. January–May 2025 shows 475,535 "cases" against 626,675 units. | Every 2025 or all-time case total is inflated: 2025 shows 925,817 cases, and Sprouts January–September 2025 shows 420,643 cases, while its dollars are only 10 % above 2026. Year-over-year case comparisons with early 2025 are wrong. Dollars and units are fine. In B6 the agent noticed this once by itself (golden case Q05). | B6 |
| DI2 | The approved monthly report **repeats a retailer's actuals under each of its banner names** | `TradeSpend.BrandApprovedMonthlyReport`, Type 3 / 6 rows | Sprouts' January 2026 actuals (≈ 10,500 cases) appear under "Sprouts", "Sprouts Farmer's Market" and "Sprouts Farmers Market". For all retailers, January 2026 shows 108,282 actual cases against 41,986 shipped. | Plan-vs-actual answers (golden Q19–Q21, the B5 "planned vs actual" check) overstate actuals. The Monthly Report screen probably shows the same; not yet checked. | B6 |
| DI3 | The approved monthly report **counts both approved 2026 Sprouts plans** | `TradeSpend.BrandApprovedMonthlyReport`, Type 1 / 2 rows | Planned 2026 Sprouts cases = 245,361 = "SPROUTS 2026 - MD" (123,997) + its re-forecast "... CW ACTUAL THRU JUNE 07.24.26" (121,364). | The plan side is doubled for Sprouts 2026, so the variance is wrong. Ask Caboodle's promotion tool reports overlapping plans separately (D27), but the report cannot. Ask the brand which plan is current. | B5 (suspected), B6 (confirmed) |
| DI4 | The monthly report's **July–September 2026 actuals look stale** | `TradeSpend.BrandApprovedMonthlyReport` | The report shows 22,916 / 23,974 / 19,480 actual cases for July–September, against ≈ 48,000–57,000 a month shipped. Last refreshed 8 Oct 2026, with parts on 5 Aug 2026. | Plan-vs-actual answers for recent months understate actuals. The agent flags this when it compares against shipments. | B5, B6 |
| DI5 | KeHE's **May 2026 upload is a copy of February 2026** | `DataUpload.DistributorSalesRecords` (KeHE) | February and May 2026 have identical totals: 16,860 rows, 20,536 cases, $655,080. Sprouts alone: 10,526 cases and $333,464 in both months. | May 2026 KeHE figures are February's. May's store count and every May trend are wrong. | B0, confirmed B6 |
| DI6 | SPINS uploads **only append**, so some brands have duplicated weeks | `DataUpload.SPINSStoresInsight`, `SPINSItemsRanking` | Two brands have the same weeks stored twice. Bubbies' Sprouts weeks are clean. | Totals for affected weeks double unless the agent checks for duplicates; the catalog tells it to. | B4 |

## Fixed

None yet.
