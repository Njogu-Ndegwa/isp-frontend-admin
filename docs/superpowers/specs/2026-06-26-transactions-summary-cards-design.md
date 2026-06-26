# Transactions page — summary cards redesign

**Date:** 2026-06-26
**Repos:** `isp-billing-admin` (frontend) + `isp-billing` (backend)
**Frontend worktree:** `worktree-transactions-summary-cards` (off `origin/master`)
**Status:** Approved design (pending spec review)

## Problem

The Transactions page top cards currently show: **Total Transactions**, **Total Amount**,
**Completed**, **Failed**. Two of these are low-value:

- **Total Transactions** — an all-time count nobody acts on.
- **Failed** — a standalone failure count that isn't actionable here.

What's missing is the **Hotspot vs PPPoE revenue split** and a sense of **current-month
activity**. The cards should also clearly reflect the active filters.

## Goals

1. Remove the **Total Transactions** and **Failed** cards.
2. Add a **Hotspot vs PPPoE** revenue split.
3. Replace the removed cards with a **This Month** activity card.
4. All four cards **default to the current calendar month** and **respond to filters**
   (method + date). The transactions **table stays all-time** (unchanged).

Non-goals: changing the transactions table, the bottom "Revenue by Payment Type / Router"
sections, or the C2B transaction source (the summary endpoint already excludes C2B).

## Final card lineup

Grid stays `grid-cols-2 lg:grid-cols-4` (2×2 mobile/tablet, 1×4 desktop).

| Card | Primary value | Subtitle | Accent |
|------|---------------|----------|--------|
| **Revenue** | Completed revenue (KES) for the scoped/filtered set | `+ X free comp` when `compensation_total > 0` (kept from today) | success |
| **Hotspot** | Completed hotspot revenue (KES) | `N transactions` | primary |
| **PPPoE** | Completed PPPoE revenue (KES) | `N transactions` | info |
| **This Month** | Transaction count (all statuses) in scope | `N completed · M failed` (reclaims the removed Failed card) | secondary |

> **Note (design wrinkle):** because all four cards now default to the current month, the
> originally-previewed "This Month" subtitle (revenue in KES) would duplicate the Revenue
> card's value. To satisfy the user's request for "useful info on this card" and avoid
> redundancy, the subtitle instead shows completed-vs-failed counts derived from
> `status_breakdown` (no extra backend work). Alternative considered: a single "N% completed"
> success rate — see spec-review note.

- **Revenue** is the source-of-truth total. **Hotspot + PPPoE** are a split highlight; they
  may not sum exactly to Revenue when a plan's `connection_type` is `static_ip`/`null`. That
  is expected and acceptable.
- Icons: Hotspot = wifi, PPPoE = ethernet/cable, This Month = calendar.

## Scope & filter behavior

- **Default scope = current calendar month** for all four cards. Achieved purely on the
  frontend by passing `start_date`/`end_date` (month bounds) to the summary call when no date
  filter is set.
- **Method filter** → passed to the summary (already supported today).
- **Date filter** (single day via `FilterDatePicker`) → passed as `date`; overrides the
  month default. The **This Month** card label then flips from `This Month` to the selected
  date (e.g. `26 Jun 2026`).
- **Status filter** stays **table-only** (existing behavior). A revenue figure filtered to
  "failed" isn't meaningful, so the cards intentionally ignore status.
- A small **scope caption** above the card grid states the active period (e.g. "June 2026"
  or the selected date) so it's clear the cards are month-scoped while the table is all-time.

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

Rules (consistent with the existing `status_breakdown.completed` used by the Revenue card):
- `amount` = sum of `amount` for rows where `status == "completed"` **and**
  `counts_as_revenue` is true, grouped by `connection_type`.
- `count` = number of those completed revenue rows per type.
- Only `hotspot` and `pppoe` keys are emitted; `static_ip`/`null` rows are excluded from the
  split (still included in the overall `total_amount` / `status_breakdown`).

No `current_month` block is needed — the frontend scopes the request to the month, so the
existing `total_transactions` (count) and `status_breakdown.completed.amount` (revenue)
already describe the month for the **This Month** card.

### Backend test (TDD)

Add a test mirroring `tests/test_compensation_transaction_totals.py` style:
- Seed completed transactions across hotspot and pppoe plans (+ one `static_ip`/`null`).
- Assert `connection_type_breakdown.hotspot` and `.pppoe` counts/amounts are correct.
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
   - Compute the current-month `start_date`/`end_date` (helper) and pass them to
     `getTransactionSummary` when `dateFilter` is empty; pass `exactDate` (as `date`) when
     set. Apply in **both** load effects (search and non-search paths). The `getTransactions`
     call for the table is **unchanged** (still all-time / `exactDate` only).
   - Replace the four `StatCard`s with **Revenue / Hotspot / PPPoE / This Month**.
   - Add a month-label helper (`This Month` by default; formatted date when `dateFilter` set).
   - Add the scope caption above the grid.
   - Add wifi / ethernet / calendar icons.

3. **`app/lib/demoData.ts`** — add `connection_type_breakdown` to `demoTransactionSummary`
   so demo mode renders the new cards.

4. Leave the desktop table, mobile cards, pagination, and the bottom breakdown sections
   untouched.

## Data flow

```
TransactionsClient
  ├─ getTransactions(... exactDate ...)      → table (all-time, unchanged)
  └─ getTransactionSummary(... startDate/endDate=month OR date=exactDate, method ...)
        → Revenue      = status_breakdown.completed.amount
        → Hotspot      = connection_type_breakdown.hotspot.{amount,count}
        → PPPoE        = connection_type_breakdown.pppoe.{amount,count}
        → This Month   = total_transactions (count)
                         + status_breakdown.completed.count / status_breakdown.failed.count
```

## Error / edge handling

- Missing `connection_type_breakdown` (older backend / demo not updated) → cards show `KES 0`
  / `0 transactions`, no crash.
- No transactions in the month → cards show zeros; existing empty states on table unchanged.
- Month boundary computation uses local time consistent with the app's date handling
  (`dateUtils` / GMT+3); verify against `FilterDatePicker`'s `YYYY-MM-DD` format during
  implementation.

## Worktrees

- Frontend: worktree `worktree-transactions-summary-cards` off `origin/master` in
  `isp-billing-admin` (created; local `master` was 57 commits behind origin, so the worktree
  bases off the up-to-date `origin/master`).
- Backend: a new worktree off its main branch in `isp-billing` (to be created at
  implementation time).
- Coordinated FE+BE change, per the project's worktree-isolation preference.

## Verification

- Backend: new unit test passes; existing summary tests still pass.
- Frontend: typecheck + lint clean; demo-mode visual check of all four cards and filter
  responsiveness (method change, date pick, clear).
