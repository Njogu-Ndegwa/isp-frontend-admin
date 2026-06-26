# Transactions page — summary cards redesign

**Date:** 2026-06-26
**Repos:** `isp-billing-admin` (frontend) + `isp-billing` (backend)
**Frontend worktree:** `worktree-transactions-summary-cards` (off `origin/master`)
**Status:** Approved design (pending spec review)

## Problem

The Transactions page top cards currently show: **Total Transactions**, **Total Amount**,
**Completed**, **Failed**. These over-emphasize transaction *counts*, which aren't what the
operator cares about — they care about **money**. There's also no **Hotspot vs PPPoE**
revenue split and no sense of **current-month** earnings.

## Goals

1. Remove the **Total Transactions**, **Completed**, and **Failed** cards.
2. Make every card a **money (KES) figure** — no transaction counts anywhere.
3. Show a **Hotspot vs PPPoE** revenue split.
4. Show **This Month** earnings, defaulting to the current calendar month and responding to
   the **method + date** filters. Keep an **All Time** lifetime reference.
5. The transactions **table stays all-time** (unchanged).

Non-goals: changing the transactions table, the bottom "Revenue by Payment Type / Router"
sections, or the C2B transaction source (the summary endpoint already excludes C2B).

## Final card lineup

Grid stays `grid-cols-2 lg:grid-cols-4` (2×2 mobile/tablet, 1×4 desktop). **No counts** —
each card is a single KES figure. `Hotspot + PPPoE = This Month`.

| Card | Value | Subtitle | Scope | Accent |
|------|-------|----------|-------|--------|
| **This Month** | Completed revenue (KES) for the current month | `+ X free comp` only when `compensation_total > 0` | month; follows date+method filters | primary |
| **Hotspot** | Completed hotspot revenue (KES) | — | month; follows date+method filters | success |
| **PPPoE** | Completed PPPoE revenue (KES) | — | month; follows date+method filters | info |
| **All Time** | Completed lifetime revenue (KES) | — | fixed; ignores all filters | secondary |

- **This Month** is the headline; **Hotspot + PPPoE** are its split (they may not sum exactly
  to This Month when a plan's `connection_type` is `static_ip`/`null` — expected/acceptable).
- **All Time** is a stable lifetime KPI; it does not change with filters.
- Icons: This Month = calendar, Hotspot = wifi, PPPoE = ethernet/cable, All Time = coins/stack.
- A small **scope caption** above the grid states the active period for the filtered cards
  (e.g. "June 2026", or the selected date), making clear the cards are month-scoped while the
  table is all-time.

## Scope & filter behavior

- **Default scope = current calendar month** for This Month / Hotspot / PPPoE. Achieved on
  the frontend by passing `start_date`/`end_date` (month bounds) to the scoped summary call
  when no date filter is set.
- **Method filter** → passed to the scoped summary call (already supported).
- **Date filter** (single day via `FilterDatePicker`) → passed as `date`; overrides the month
  default for the three scoped cards. The **This Month** label then flips to the selected date
  (e.g. `26 Jun 2026`), and the scope caption matches.
- **Status filter** stays **table-only** (existing behavior); the money cards intentionally
  ignore it.
- **All Time** is driven by a separate, unfiltered summary call and never changes with the
  filters.

## Backend change — `isp-billing`

File: `app/api/payment_routes.py`, endpoint `GET /api/mpesa/transactions/summary`.

The endpoint already gathers `rows` from two sources (M-Pesa `MpesaTransaction` +
`CustomerPayment`) and applies `router_id` / `payment_method` / `date` / `start_date` /
`end_date` filters. Add a **`Plan` join** (`Customer.plan_id == Plan.id`, outer — same join
the list and failed endpoints use) so each row carries its `connection_type`, then add one
new block to the response:

```jsonc
"connection_type_breakdown": {
  "hotspot": { "count": N, "amount": N },   // completed + counts_as_revenue rows only
  "pppoe":   { "count": N, "amount": N }
}
```

Rules (consistent with the existing `status_breakdown.completed` the cards read):
- `amount` = sum of `amount` for rows where `status == "completed"` **and**
  `counts_as_revenue` is true, grouped by `connection_type`.
- `count` is included for completeness/consistency but the UI uses only `amount`.
- Only `hotspot` and `pppoe` keys are emitted; `static_ip`/`null` rows are excluded from the
  split (still included in the overall `total_amount` / `status_breakdown`).

No `current_month` or all-time fields are needed server-side: the frontend scopes one call to
the month and makes a second unfiltered call for All Time, both reusing
`status_breakdown.completed.amount`.

### Backend test (TDD)

Add a test mirroring `tests/test_compensation_transaction_totals.py` style:
- Seed completed transactions across hotspot and pppoe plans (+ one `static_ip`/`null`).
- Assert `connection_type_breakdown.hotspot` and `.pppoe` amounts are correct.
- Assert the `static_ip`/`null` row is excluded from the split but present in `total_amount`.
- Assert non-completed (pending/failed) rows are excluded from the split amounts.

## Frontend changes — `isp-billing-admin`

1. **`app/lib/types.ts`** — extend `TransactionSummary`:
   ```ts
   connection_type_breakdown?: {
     hotspot?: StatusBreakdown;
     pppoe?: StatusBreakdown;
   };
   ```
   Optional, so the UI degrades gracefully (treat missing as `0`).

2. **`app/transactions/TransactionsClient.tsx`**:
   - Add an `allTimeSummary` state, fetched once via `getTransactionSummary` with **no**
     date/method args (refetched only on manual refresh, not on filter change) → feeds the
     **All Time** card.
   - For the scoped summary call (both the search and non-search effects): when `dateFilter`
     is empty pass current-month `start_date`/`end_date`; when set, pass `exactDate` as
     `date`. The `getTransactions` call for the table is **unchanged** (all-time / `exactDate`).
   - Replace the four `StatCard`s with **This Month / Hotspot / PPPoE / All Time** (money
     only).
   - Add a month-label + scope-caption helper (`This Month` / formatted date).
   - Add calendar / wifi / ethernet / coins icons.

3. **`app/lib/demoData.ts`** — add `connection_type_breakdown` to `demoTransactionSummary` so
   demo mode renders the split.

4. Leave the desktop table, mobile cards, pagination, and the bottom breakdown sections
   untouched.

## Data flow

```
TransactionsClient
  ├─ getTransactions(... exactDate ...)                       → table (all-time, unchanged)
  ├─ getTransactionSummary(startDate/endDate=month OR date=exactDate, method)   [scoped]
  │      → This Month = status_breakdown.completed.amount
  │      → Hotspot    = connection_type_breakdown.hotspot.amount
  │      → PPPoE      = connection_type_breakdown.pppoe.amount
  └─ getTransactionSummary(no date, no method)                                  [unfiltered]
         → All Time   = status_breakdown.completed.amount
```

## Error / edge handling

- Missing `connection_type_breakdown` (older backend / demo not updated) → Hotspot/PPPoE show
  `KES 0`, no crash.
- No revenue in the month → cards show `KES 0`; table empty states unchanged.
- Failed/aborted All-Time call → that card shows `KES 0` (or a dash); does not block the
  scoped cards.
- Month boundary computation uses local time consistent with the app's date handling
  (`dateUtils` / GMT+3); verify against `FilterDatePicker`'s `YYYY-MM-DD` format during
  implementation.

## Worktrees

- Frontend: worktree `worktree-transactions-summary-cards` off `origin/master` in
  `isp-billing-admin` (created; local `master` was 57 commits behind origin, so the worktree
  bases off the up-to-date `origin/master`).
- Backend: a new worktree off its main branch in `isp-billing` (created at implementation
  time).
- Coordinated FE+BE change, per the project's worktree-isolation preference.

## Verification

- Backend: new unit test passes; existing summary tests still pass.
- Frontend: typecheck + lint clean; demo-mode visual check of all four money cards and filter
  responsiveness (method change, date pick, clear) — confirming Hotspot + PPPoE ≈ This Month
  and All Time stays fixed.
