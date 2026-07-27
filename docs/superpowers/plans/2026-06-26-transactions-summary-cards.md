# Transactions Summary Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Transactions page top cards with money-only cards — This Month / Hotspot / PPPoE / All Time — backed by a new connection-type revenue breakdown from the summary API.

**Architecture:** Backend adds a `connection_type_breakdown` (hotspot/pppoe completed revenue) to `GET /api/mpesa/transactions/summary` via a `Plan` join. Frontend makes two summary calls — one month-scoped (or date-filtered) for This Month/Hotspot/PPPoE, one unfiltered for All Time — and renders four KES `StatCard`s. The transactions table is unchanged.

**Tech Stack:** Backend FastAPI + SQLAlchemy async + pytest (in-memory sqlite). Frontend Next.js 16 + React 19 + TypeScript + vitest.

## Global Constraints

- Money only — no transaction counts on any card.
- `Hotspot + PPPoE` revenue ≈ `This Month` revenue (may differ if a plan's `connection_type` is `static_ip`/`null`).
- All amounts are completed + `counts_as_revenue` revenue, consistent with the existing `status_breakdown.completed.amount`.
- All Time card ignores all filters; This Month/Hotspot/PPPoE follow method + date filters and default to the current calendar month.
- Status filter stays table-only. The table stays all-time (unchanged).
- KES formatting via `formatKES` from `app/lib/format.ts`. Dates in GMT+3 via `app/lib/dateUtils.ts`.
- Frontend worktree: `worktree-transactions-summary-cards` (off `origin/master`). Backend worktree: created off `origin/main` in Task 1.

---

### Task 1: Backend — `connection_type_breakdown` in summary endpoint

**Repo/worktree:** `isp-billing`, new worktree off `origin/main`.

**Files:**
- Create: `tests/test_transactions_connection_type_breakdown.py`
- Modify: `app/api/payment_routes.py` (summary endpoint, ~lines 1529–1637)

**Interfaces:**
- Produces: `GET /api/mpesa/transactions/summary` response gains
  `connection_type_breakdown: { hotspot: {count, amount}, pppoe: {count, amount} }`
  (completed + revenue rows only; both keys always present).

- [ ] **Step 1: Create the backend worktree**

```bash
cd /c/Users/pc/internet-project/isp-billing
git fetch origin
git worktree add .claude/worktrees/transactions-summary-cards -b transactions-summary-cards origin/main
cd .claude/worktrees/transactions-summary-cards
```

- [ ] **Step 2: Write the failing test**

Create `tests/test_transactions_connection_type_breakdown.py`:

```python
"""
TDD test: the transactions summary must report a connection_type_breakdown
(hotspot vs pppoe) covering only completed, revenue-counting transactions.
static_ip / null plans are excluded from the split but still in the totals.
"""
from types import SimpleNamespace

import pytest

from app.db.models import (
    ConnectionType,
    CustomerPayment,
    PaymentMethod,
    PaymentStatus,
    UserRole,
)
from tests.factories import make_customer, make_plan, make_reseller, make_router

pytestmark = pytest.mark.asyncio


async def _add_payment(db, customer, reseller, *, amount,
                       counts_as_revenue=True, status=PaymentStatus.COMPLETED):
    payment = CustomerPayment(
        customer_id=customer.id,
        reseller_id=reseller.id,
        amount=amount,
        payment_method=PaymentMethod.CASH,
        payment_reference=f"REF-{customer.id}-{amount}-{status.value}",
        days_paid_for=1,
        status=status,
        counts_as_revenue=counts_as_revenue,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


async def test_summary_reports_connection_type_breakdown(db, monkeypatch):
    from app.api import payment_routes

    reseller = await make_reseller(db, email="ct-reseller@example.com")
    router = await make_router(db, reseller, ip_address="10.0.9.1")

    hotspot_plan = await make_plan(db, reseller, price=100, connection_type=ConnectionType.HOTSPOT)
    pppoe_plan = await make_plan(db, reseller, price=300, connection_type=ConnectionType.PPPOE)
    static_plan = await make_plan(db, reseller, price=500, connection_type=ConnectionType.STATIC_IP)

    hotspot_customer = await make_customer(
        db, reseller, hotspot_plan, router,
        phone="254700000091", mac_address="AA:BB:CC:DD:09:01")
    pppoe_customer = await make_customer(
        db, reseller, pppoe_plan, router,
        phone="254700000092", mac_address="AA:BB:CC:DD:09:02")
    static_customer = await make_customer(
        db, reseller, static_plan, router,
        phone="254700000093", mac_address="AA:BB:CC:DD:09:03")

    # Hotspot: two completed sales 100 + 100 = 200
    await _add_payment(db, hotspot_customer, reseller, amount=100.0)
    await _add_payment(db, hotspot_customer, reseller, amount=100.0)
    # PPPoE: one completed sale 300
    await _add_payment(db, pppoe_customer, reseller, amount=300.0)
    # Static IP: one completed sale 500 (in totals, excluded from split)
    await _add_payment(db, static_customer, reseller, amount=500.0)
    # Hotspot pending (not completed -> excluded from split)
    await _add_payment(db, hotspot_customer, reseller, amount=999.0, status=PaymentStatus.PENDING)
    # Hotspot compensation (not revenue -> excluded from split)
    await _add_payment(db, hotspot_customer, reseller, amount=50.0, counts_as_revenue=False)

    async def fake_current_user(token, db):
        return SimpleNamespace(id=reseller.id, role=UserRole.RESELLER)

    monkeypatch.setattr(payment_routes, "get_current_user", fake_current_user)

    result = await payment_routes.get_mpesa_transactions_summary(
        router_id=None, payment_method=None, date=None,
        start_date=None, end_date=None, db=db, token="test-token",
    )

    ctb = result["connection_type_breakdown"]
    assert ctb["hotspot"] == {"count": 2, "amount": 200.0}, ctb
    assert ctb["pppoe"] == {"count": 1, "amount": 300.0}, ctb
    assert "static_ip" not in ctb, "static_ip must be excluded from the split"

    # static_ip revenue is still part of the overall completed total
    completed = result["status_breakdown"]["completed"]
    assert completed["count"] == 4, completed
    assert completed["amount"] == 1000.0, completed
```

- [ ] **Step 3: Run the test, verify it fails**

```bash
python -m pytest tests/test_transactions_connection_type_breakdown.py -v
```
Expected: FAIL with `KeyError: 'connection_type_breakdown'`.

- [ ] **Step 4: Add the `Plan` join + breakdown in `app/api/payment_routes.py`**

In `get_mpesa_transactions_summary`, the M-Pesa query — change the select/join and the row loop:

```python
        if want_mpesa:
            mpesa_stmt = (
                select(MpesaTransaction, Customer, Router, Plan)
                .join(Customer, MpesaTransaction.customer_id == Customer.id, isouter=True)
                .join(Router, Customer.router_id == Router.id, isouter=True)
                .join(Plan, Customer.plan_id == Plan.id, isouter=True)
                .where(
                    (Customer.user_id == user.id) | (MpesaTransaction.customer_id == None)
                )
            )
            if router_id:
                mpesa_stmt = mpesa_stmt.where(Router.id == router_id)
            if date_start:
                mpesa_stmt = mpesa_stmt.where(MpesaTransaction.created_at >= date_start)
            if date_end:
                mpesa_stmt = mpesa_stmt.where(MpesaTransaction.created_at <= date_end)

            for tx, customer, rtr, plan in (await db.execute(mpesa_stmt)).all():
                rows.append({
                    "amount": float(tx.amount),
                    "status": tx.status.value,
                    "method": "mobile_money",
                    "router_name": rtr.name if rtr else None,
                    "router_id": rtr.id if rtr else None,
                    "counts_as_revenue": True,
                    "connection_type": plan.connection_type.value if plan and plan.connection_type else None,
                })
```

The CustomerPayment query — same treatment:

```python
        if want_other:
            cp_stmt = (
                select(CustomerPayment, Customer, Router, Plan)
                .outerjoin(Customer, CustomerPayment.customer_id == Customer.id)
                .outerjoin(Router, Customer.router_id == Router.id)
                .outerjoin(Plan, Customer.plan_id == Plan.id)
                .where(
                    CustomerPayment.reseller_id == user.id,
                    CustomerPayment.payment_method != PaymentMethod.MOBILE_MONEY,
                )
            )
            if payment_method and payment_method != "mobile_money":
                try:
                    pm_enum = PaymentMethod(payment_method.lower())
                    cp_stmt = cp_stmt.where(CustomerPayment.payment_method == pm_enum)
                except ValueError:
                    pass
            if router_id:
                cp_stmt = cp_stmt.where(Customer.router_id == router_id)
            if date_start:
                cp_stmt = cp_stmt.where(CustomerPayment.created_at >= date_start)
            if date_end:
                cp_stmt = cp_stmt.where(CustomerPayment.created_at <= date_end)

            for pay, customer, rtr, plan in (await db.execute(cp_stmt)).all():
                rows.append({
                    "amount": float(pay.amount),
                    "status": pay.status.value if pay.status else "completed",
                    "method": pay.payment_method.value,
                    "router_name": rtr.name if rtr else None,
                    "router_id": rtr.id if rtr else None,
                    "counts_as_revenue": bool(pay.counts_as_revenue),
                    "connection_type": plan.connection_type.value if plan and plan.connection_type else None,
                })
```

After the `router_breakdown` loop and before the `return`, add:

```python
        connection_type_breakdown: dict = {
            "hotspot": {"count": 0, "amount": 0},
            "pppoe": {"count": 0, "amount": 0},
        }
        for r in rows:
            ct = r.get("connection_type")
            if ct not in ("hotspot", "pppoe"):
                continue
            if r["status"] != "completed" or not r["counts_as_revenue"]:
                continue
            connection_type_breakdown[ct]["count"] += 1
            connection_type_breakdown[ct]["amount"] += r["amount"]
        for ct in connection_type_breakdown:
            connection_type_breakdown[ct]["amount"] = round(connection_type_breakdown[ct]["amount"], 2)
```

Add it to the returned dict (next to `router_breakdown`):

```python
            "router_breakdown": router_breakdown,
            "connection_type_breakdown": connection_type_breakdown,
```

- [ ] **Step 5: Run the test, verify it passes**

```bash
python -m pytest tests/test_transactions_connection_type_breakdown.py -v
```
Expected: PASS. Then run the related suite to confirm no regression:
```bash
python -m pytest tests/test_compensation_transaction_totals.py -v
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/test_transactions_connection_type_breakdown.py app/api/payment_routes.py
git commit -m "Add connection_type_breakdown to transactions summary endpoint"
```

---

### Task 2: Frontend — extend `TransactionSummary` type + demo data

**Repo/worktree:** `isp-billing-admin`, `worktree-transactions-summary-cards`.

**Files:**
- Modify: `app/lib/types.ts` (`TransactionSummary`, after `method_breakdown`)
- Modify: `app/lib/demoData.ts` (`demoTransactionSummary`)

**Interfaces:**
- Produces: `TransactionSummary.connection_type_breakdown?: { hotspot?: StatusBreakdown; pppoe?: StatusBreakdown }`.

- [ ] **Step 1: Add the field to `TransactionSummary`** (`app/lib/types.ts`)

Add directly under the `method_breakdown?: ...` line:

```ts
  method_breakdown?: Record<string, StatusBreakdown>;
  connection_type_breakdown?: {
    hotspot?: StatusBreakdown;
    pppoe?: StatusBreakdown;
  };
```

- [ ] **Step 2: Add demo data** (`app/lib/demoData.ts`)

In `demoTransactionSummary`, add after `method_breakdown`:

```ts
  connection_type_breakdown: {
    hotspot: { count: 14, amount: 26500 },
    pppoe: { count: 5, amount: 12000 },
  },
```
(26500 + 12000 = 38500 = `status_breakdown.completed.amount`.)

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/lib/types.ts app/lib/demoData.ts
git commit -m "Add connection_type_breakdown to TransactionSummary type and demo data"
```

---

### Task 3: Frontend — pure scope/label helpers (TDD)

**Files:**
- Create: `app/transactions/summaryScope.ts`
- Test: `app/transactions/__tests__/summaryScope.test.ts`

**Interfaces:**
- Produces:
  - `currentMonthRangeGMT3(nowGmt3: Date): { start: string; end: string }`
  - `scopedSummaryDates(dateFilter: string, nowGmt3: Date): { startDate?: string; endDate?: string; date?: string }`
  - `formatDateLabel(dateFilter: string): string`
  - `thisMonthCardTitle(dateFilter: string): string`
  - `scopeCaption(dateFilter: string, nowGmt3: Date): string`
  - `nowGmt3` is the value of `getCurrentTimeGMT3()` (a Date whose UTC fields hold GMT+3 wall-clock).

- [ ] **Step 1: Write the failing test** (`app/transactions/__tests__/summaryScope.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import {
  currentMonthRangeGMT3,
  scopedSummaryDates,
  formatDateLabel,
  thisMonthCardTitle,
  scopeCaption,
} from '../summaryScope';

// Dates built with Date.UTC so getUTC* fields read back the GMT+3 wall clock,
// matching how getCurrentTimeGMT3() encodes time.
const JUNE = new Date(Date.UTC(2026, 5, 15)); // 15 June 2026
const FEB_LEAP = new Date(Date.UTC(2024, 1, 10)); // Feb 2024 (leap year)

describe('currentMonthRangeGMT3', () => {
  it('returns first and last day of the month', () => {
    expect(currentMonthRangeGMT3(JUNE)).toEqual({ start: '2026-06-01', end: '2026-06-30' });
  });
  it('handles February in a leap year', () => {
    expect(currentMonthRangeGMT3(FEB_LEAP)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });
});

describe('scopedSummaryDates', () => {
  it('uses the month range when no date filter is set', () => {
    expect(scopedSummaryDates('', JUNE)).toEqual({
      startDate: '2026-06-01', endDate: '2026-06-30', date: undefined,
    });
  });
  it('uses the exact date when a date filter is set', () => {
    expect(scopedSummaryDates('2026-06-26', JUNE)).toEqual({
      startDate: undefined, endDate: undefined, date: '2026-06-26',
    });
  });
});

describe('labels', () => {
  it('formats a YYYY-MM-DD filter as a readable date', () => {
    expect(formatDateLabel('2026-06-26')).toBe('26 Jun 2026');
  });
  it('this-month card title defaults, follows the date filter', () => {
    expect(thisMonthCardTitle('')).toBe('This Month');
    expect(thisMonthCardTitle('2026-06-26')).toBe('26 Jun 2026');
  });
  it('scope caption shows month name or the selected date', () => {
    expect(scopeCaption('', JUNE)).toBe('June 2026');
    expect(scopeCaption('2026-06-26', JUNE)).toBe('26 Jun 2026');
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
npx vitest run app/transactions/__tests__/summaryScope.test.ts
```
Expected: FAIL (module `../summaryScope` not found).

- [ ] **Step 3: Implement `app/transactions/summaryScope.ts`**

```ts
/**
 * Pure helpers for the Transactions summary cards: month-range computation
 * and scope/label strings. Kept free of React/DOM so they are unit-testable.
 * `nowGmt3` is the value returned by getCurrentTimeGMT3() — a Date whose UTC
 * fields hold the GMT+3 wall-clock time.
 */

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad2 = (n: number) => String(n).padStart(2, '0');

export function currentMonthRangeGMT3(nowGmt3: Date): { start: string; end: string } {
  const y = nowGmt3.getUTCFullYear();
  const m = nowGmt3.getUTCMonth(); // 0-11
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { start: `${y}-${pad2(m + 1)}-01`, end: `${y}-${pad2(m + 1)}-${pad2(lastDay)}` };
}

export function scopedSummaryDates(
  dateFilter: string,
  nowGmt3: Date,
): { startDate?: string; endDate?: string; date?: string } {
  if (dateFilter) return { startDate: undefined, endDate: undefined, date: dateFilter };
  const { start, end } = currentMonthRangeGMT3(nowGmt3);
  return { startDate: start, endDate: end, date: undefined };
}

export function formatDateLabel(dateFilter: string): string {
  const [y, m, d] = dateFilter.split('-').map(Number);
  return y && m && d ? `${d} ${SHORT_MONTHS[m - 1]} ${y}` : dateFilter;
}

export function thisMonthCardTitle(dateFilter: string): string {
  return dateFilter ? formatDateLabel(dateFilter) : 'This Month';
}

export function scopeCaption(dateFilter: string, nowGmt3: Date): string {
  if (dateFilter) return formatDateLabel(dateFilter);
  return `${FULL_MONTHS[nowGmt3.getUTCMonth()]} ${nowGmt3.getUTCFullYear()}`;
}
```

- [ ] **Step 4: Run the test, verify it passes**

```bash
npx vitest run app/transactions/__tests__/summaryScope.test.ts
```
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add app/transactions/summaryScope.ts app/transactions/__tests__/summaryScope.test.ts
git commit -m "Add transactions summary scope/label helpers with tests"
```

---

### Task 4: Frontend — wire the new cards into `TransactionsClient`

**Files:**
- Modify: `app/transactions/TransactionsClient.tsx`

**Interfaces:**
- Consumes: `scopedSummaryDates`, `thisMonthCardTitle`, `scopeCaption` (Task 3);
  `connection_type_breakdown` (Task 2); `getCurrentTimeGMT3` (dateUtils); `formatKES`.

- [ ] **Step 1: Add imports** (top of `TransactionsClient.tsx`)

After the existing `import { formatKES } from '../lib/format';` line, add:

```tsx
import { getCurrentTimeGMT3 } from '../lib/dateUtils';
import { scopedSummaryDates, thisMonthCardTitle, scopeCaption } from './summaryScope';
```

- [ ] **Step 2: Add the All-Time summary state**

After `const [summary, setSummary] = useState<TransactionSummary | null>(null);` add:

```tsx
  const [allTimeSummary, setAllTimeSummary] = useState<TransactionSummary | null>(null);
```

- [ ] **Step 3: Scope the two existing summary calls to the month/date**

In the **non-search** effect, replace the `Promise.all` block:

```tsx
        const { startDate, endDate, date } = scopedSummaryDates(dateFilter, getCurrentTimeGMT3());
        const [txResult, summaryData] = await Promise.all([
          api.getTransactions(1, undefined, undefined, undefined, status, controller.signal, method, exactDate, page, perPage),
          api.getTransactionSummary(1, undefined, startDate, endDate, controller.signal, method, date),
        ]);
```

In the **search** effect, replace its `Promise.all` block:

```tsx
        const { startDate, endDate, date } = scopedSummaryDates(dateFilter, getCurrentTimeGMT3());
        const [txResult, summaryData] = await Promise.all([
          api.getTransactions(1, undefined, undefined, undefined, status, controller.signal, method, exactDate, 1, 10000),
          api.getTransactionSummary(1, undefined, startDate, endDate, controller.signal, method, date),
        ]);
```

- [ ] **Step 4: Add an All-Time summary effect**

Immediately after the search effect (before `handleManualProvision`), add:

```tsx
  // All-time revenue card: unfiltered, fetched once (and on manual refresh).
  useEffect(() => {
    const controller = new AbortController();
    api.getTransactionSummary(1, undefined, undefined, undefined, controller.signal)
      .then((s) => { if (!controller.signal.aborted) setAllTimeSummary(s); })
      .catch(() => { /* non-blocking: card falls back to KES 0 */ });
    return () => controller.abort();
  }, [refreshKey]);
```

- [ ] **Step 5: Replace the summary cards block**

Replace the entire `{/* Summary Stats */}` block (the `{summary && ( ... )}` grid of four StatCards) with:

```tsx
      {/* Summary Stats — money only; This Month/Hotspot/PPPoE follow filters, All Time is fixed */}
      {summary && (
        <div className="mb-6">
          <p className="text-xs text-foreground-muted mb-2 sm:mb-3">
            <span className="font-medium text-foreground">Revenue</span>
            {' · '}{scopeCaption(dateFilter, getCurrentTimeGMT3())}
            {methodFilter !== 'all' ? ` · ${PAYMENT_METHOD_LABELS[methodFilter]?.label || methodFilter}` : ''}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="animate-fade-in delay-1">
              <StatCard
                title={thisMonthCardTitle(dateFilter)}
                value={formatKES(summary.status_breakdown.completed?.amount || 0)}
                subtitle={summary.compensation_total && summary.compensation_total > 0
                  ? `+ ${formatKES(summary.compensation_total)} free comp`
                  : undefined}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                accent="primary"
              />
            </div>
            <div className="animate-fade-in delay-2">
              <StatCard
                title="Hotspot"
                value={formatKES(summary.connection_type_breakdown?.hotspot?.amount || 0)}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M5.636 13.929a9 9 0 0112.728 0M3.161 11.455a12.5 12.5 0 0117.678 0M12 20h.01" />
                  </svg>
                }
                accent="success"
              />
            </div>
            <div className="animate-fade-in delay-3">
              <StatCard
                title="PPPoE"
                value={formatKES(summary.connection_type_breakdown?.pppoe?.amount || 0)}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                }
                accent="info"
              />
            </div>
            <div className="animate-fade-in delay-4">
              <StatCard
                title="All Time"
                value={formatKES(allTimeSummary?.status_breakdown.completed?.amount || 0)}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
                accent="secondary"
              />
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 6: Typecheck + lint**

```bash
npx tsc --noEmit
npm run lint
```
Expected: no new errors/warnings introduced by these files.

- [ ] **Step 7: Visual check in demo mode**

Run `npm run dev`, open the Transactions page in demo mode, confirm: four cards (This Month / Hotspot / PPPoE / All Time), all KES; Hotspot (26,500) + PPPoE (12,000) = This Month (38,500); caption shows the current month; picking a date filter flips the first card's title to that date; method filter appends to the caption.

- [ ] **Step 8: Commit**

```bash
git add app/transactions/TransactionsClient.tsx
git commit -m "Replace transactions cards with money-only This Month/Hotspot/PPPoE/All Time"
```

---

## Self-Review

- **Spec coverage:** remove Total Transactions/Completed/Failed + add money cards (Task 4); Hotspot/PPPoE split (Task 1 backend + Task 4 render); This Month + All Time + month default + filter response (Tasks 3–4); backend `connection_type_breakdown` + test (Task 1); types + demo (Task 2). Table untouched (no task modifies it). ✓
- **Placeholder scan:** all steps contain concrete code/commands. ✓
- **Type consistency:** `connection_type_breakdown` shape identical in types.ts, demoData.ts, backend, and component reads; helper signatures match between Task 3 definition and Task 4 usage. ✓
