# Admin Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all verified findings from the 2026-06-09 full-app audit: performance (bundle size, blocking scripts, polling), bugs, responsiveness, cross-browser clipboard, accessibility, security headers, dependency CVEs, error pages, SEO metadata, and a unit-test foundation for money/date code.

**Architecture:** Mostly surgical edits to existing files. New shared modules: `app/lib/format.ts` (canonical KES formatter), `app/lib/clipboard.ts` (safe copy with fallback). recharts becomes `next/dynamic` everywhere; `demoData` becomes a lazy import. Vitest is added for pure-function unit tests (no jsdom needed).

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Playwright (existing e2e), Vitest (new).

**Out of scope (documented decisions):**
- Sentry/error reporting — needs an account + DSN from the user.
- Backend `user_id` / role enforcement — lives in the backend repo. **User must verify the API derives tenant from the token.**
- Server-side search for transactions/customers, batch usage endpoint — need backend endpoints.
- `useFetch` consolidation across 34 pages, `<img>`→`next/image` — deferred, larger refactors.
- Dropped as false positives after verification: api.ts:1390 JSON-before-ok (already `.catch(() => ({}))`-guarded), vouchers search-vs-status bug (deps include `statusFilter`), dashboard empty-data crash (guarded at dashboard/page.tsx:174).

---

### Task 0: Commit pending WIP so audit fixes are isolated

The working tree has the user's in-progress PPPoE-import/unmatched-payments work. Commit it as-is first so every following commit is purely an audit fix.

- [ ] **Step 1: Commit existing changes**

```powershell
git add app/admin/page.tsx app/customers/page.tsx app/lib/api.ts app/lib/types.ts app/routers/page.tsx app/components/PPPoEImportModal.tsx app/unmatched-payments/ docs/captive-portal-api.md docs/captive-portal-customization.md
git commit -m "feat: PPPoE import modal extraction, unmatched payments page, captive portal docs"
```
(Leave `.cursor/` and `nul` out — handled in Task 15.)

---

### Task 1: Vitest setup + canonical `formatKES` (TDD)

**Files:**
- Create: `app/lib/format.ts`
- Test: `app/lib/__tests__/format.test.ts`
- Modify: `package.json` (add `"test": "vitest run"` script)

- [ ] **Step 1: Install vitest**

```powershell
npm install -D vitest
```

- [ ] **Step 2: Write the failing test** — `app/lib/__tests__/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatKES } from '../format';

describe('formatKES', () => {
  it('formats whole amounts with grouping and no decimals', () => {
    expect(formatKES(1500)).toBe('KES 1,500');
  });
  it('rounds fractional amounts to whole shillings', () => {
    expect(formatKES(1500.6)).toBe('KES 1,501');
  });
  it('handles zero', () => {
    expect(formatKES(0)).toBe('KES 0');
  });
  it('handles negative amounts', () => {
    expect(formatKES(-250)).toBe('KES -250');
  });
  it('falls back gracefully for null/undefined/NaN', () => {
    expect(formatKES(undefined)).toBe('KES 0');
    expect(formatKES(null)).toBe('KES 0');
    expect(formatKES(NaN)).toBe('KES 0');
  });
});
```

- [ ] **Step 3: Run to verify it fails**: `npx vitest run` — expect FAIL (`format` not found).

- [ ] **Step 4: Implement** — `app/lib/format.ts`:

```ts
/**
 * Canonical KES currency formatter. Whole shillings, en-KE grouping.
 * Single source of truth — do not redefine formatKES in components.
 */
export function formatKES(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  try {
    return `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  } catch {
    return `KES ${Math.round(value)}`;
  }
}
```

- [ ] **Step 5: Add script** to package.json: `"test": "vitest run"`. Run `npm test` — expect PASS.
- [ ] **Step 6: Commit**: `git add -A; git commit -m "feat(lib): canonical formatKES with vitest foundation"`

### Task 2: Replace duplicated formatKES definitions + inconsistent amount display

**Files (grep `formatKES|toLocaleString` to confirm exact set):**
- Modify: `app/components/DailyTransactionsChart.tsx`, `app/components/InvoiceChargeBreakdown.tsx`, `app/components/PayInvoiceModal.tsx`, `app/components/ResellerCharts.tsx`, `app/components/RevenueOverTimeChart.tsx`, `app/admin/page.tsx`, `app/account-statement/page.tsx`, `app/admin/resellers/page.tsx` (and/or `[id]`), `app/admin/subscriptions/page.tsx`, `app/landing/page.tsx`, `app/transactions/page.tsx:587`

- [ ] **Step 1:** In each file with a local `const formatKES = ...`, delete the local definition and add `import { formatKES } from '<rel-path>/lib/format';`. Keep call sites unchanged.
- [ ] **Step 2:** `app/transactions/page.tsx:587` — change `KES {tx.amount.toLocaleString()}` to `{formatKES(tx.amount)}` (import it). This fixes the cross-page inconsistency (account statement shows whole shillings; transactions showed locale-dependent decimals).
- [ ] **Step 3:** `npx tsc --noEmit` (or `npm run build` later) + `npm test` — expect PASS.
- [ ] **Step 4: Commit**: `git commit -am "refactor: single formatKES source, consistent KES display"`

### Task 3: Characterization tests for dateUtils (GMT+3 money-adjacent date math)

**Files:**
- Test: `app/lib/__tests__/dateUtils.test.ts`

- [ ] **Step 1: Write tests** (these characterize current behavior — they should pass immediately; if one fails, that's a real bug to investigate, not a test to delete):

```ts
import { describe, it, expect } from 'vitest';
import { parseUTCToGMT3, gmt3InputToISO, utcToGMT3Input, formatTimeGMT3 } from '../dateUtils';

describe('parseUTCToGMT3', () => {
  it('shifts a Z-suffixed UTC timestamp by +3h', () => {
    const d = parseUTCToGMT3('2026-06-09T10:00:00Z');
    expect(d.getUTCHours()).toBe(13);
  });
  it('treats a naive timestamp as UTC', () => {
    const d = parseUTCToGMT3('2026-06-09T10:00:00');
    expect(d.getUTCHours()).toBe(13);
  });
  it('crosses date boundary correctly', () => {
    const d = parseUTCToGMT3('2026-06-09T22:30:00Z');
    expect(d.getUTCDate()).toBe(10);
    expect(d.getUTCHours()).toBe(1);
  });
});

describe('gmt3InputToISO / utcToGMT3Input round-trip', () => {
  it('round-trips a wall-clock value', () => {
    const iso = gmt3InputToISO('2026-06-09T15:30');
    expect(iso).toBe('2026-06-09T12:30:00.000Z');
    expect(utcToGMT3Input(iso)).toBe('2026-06-09T15:30');
  });
});

describe('formatTimeGMT3', () => {
  it('converts a UTC HH:MM to GMT+3 12h display', () => {
    expect(formatTimeGMT3('10:00', '2026-06-09')).toBe('1:00 PM');
  });
  it('passes through "-" placeholder', () => {
    expect(formatTimeGMT3('-')).toBe('-');
  });
});
```

- [ ] **Step 2:** `npm test` — expect PASS (investigate any failure before proceeding).
- [ ] **Step 3: Commit**: `git commit -am "test: characterize GMT+3 date utilities"`

### Task 4: Quick wins — blocking script, grids, passkey mask, badge contrast

**Files:**
- Modify: `app/layout.tsx:48`, `app/components/PPPoEImportModal.tsx:429`, `app/routers/page.tsx` (batch summary grid), `app/settings/payment-methods/page.tsx:58`, `app/components/InvoiceStatusBadge.tsx:11`

- [ ] **Step 1:** `app/layout.tsx:48` — `strategy="beforeInteractive"` → `strategy="lazyOnload"` (Contentsquare must not block hydration; also neutralizes the GHSA-gx5p-jg67-6x7h surface).
- [ ] **Step 2:** `PPPoEImportModal.tsx:429` — `grid grid-cols-2 sm:grid-cols-5` → `grid grid-cols-2 md:grid-cols-5` (no 5-col cram in the 640–767px band).
- [ ] **Step 3:** `app/routers/page.tsx` — find `grid-cols-2 sm:grid-cols-4 lg:grid-cols-8` (batch summary metrics, ~line 820) → `grid-cols-2 sm:grid-cols-4 xl:grid-cols-8` (4 cols at 1024, 8 only at ≥1280 where cards are ~150px).
- [ ] **Step 4:** `payment-methods/page.tsx:58` — `{ key: 'mpesa_passkey', label: 'Passkey', type: 'text', ...}` → `type: 'password'` (mask like consumer key/secret).
- [ ] **Step 5:** `InvoiceStatusBadge.tsx:11` — `text-gray-400` → `text-gray-600 dark:text-gray-400` (light-mode contrast).
- [ ] **Step 6: Commit**: `git commit -am "fix: lazyOnload analytics, tablet grids, passkey mask, badge contrast"`

### Task 5: Accessibility — focus styles, aria labels, dialog semantics

**Files:**
- Modify: `app/globals.css` (after `.btn-*` blocks), `app/components/Header.tsx:71,84`, `app/components/ConfirmDialog.tsx:54-57`, `app/components/SearchInput.tsx:36`

- [ ] **Step 1: globals.css** — add after the button styles:

```css
.btn-primary:focus-visible,
.btn-secondary:focus-visible,
.btn-ghost:focus-visible,
.btn-danger:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Header.tsx** — sidebar button (line 71): add `aria-label="Open navigation menu"`. User-menu button (line 84): add `aria-label="User menu"`, `aria-haspopup="menu"`, `aria-expanded={showUserMenu}`.
- [ ] **Step 3: ConfirmDialog.tsx** — on the inner panel div (line 56): add `role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title"`; give the `<h3>` `id="confirm-dialog-title"`.
- [ ] **Step 4: SearchInput.tsx** — add `aria-label={placeholder}` to the `<input>` (line 36).
- [ ] **Step 5: Commit**: `git commit -am "fix(a11y): focus-visible buttons, aria labels, dialog semantics"`

### Task 6: Safe clipboard utility + fix 6 unguarded copy sites

**Files:**
- Create: `app/lib/clipboard.ts`
- Modify: `app/access-credentials/page.tsx:212`, `app/access-credentials/[id]/page.tsx:102`, `app/access-credentials/create/page.tsx:69`, `app/customers/page.tsx:578`, `app/customers/[id]/page.tsx:184`, `app/customers/register/page.tsx:97`

- [ ] **Step 1:** `app/lib/clipboard.ts`:

```ts
/**
 * Copy text to clipboard with a fallback for Safari/non-HTTPS contexts
 * where navigator.clipboard is unavailable or rejects.
 * Returns true on success.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 2:** Replace each fire-and-forget handler. Pattern (same at all 5 named-handler sites):

```ts
const copyToClipboard = async (text: string, label: string) => {
  const ok = await copyText(text);
  showAlert(ok ? 'success' : 'error', ok ? `${label} copied` : 'Copy failed — select and copy manually');
};
```

For the inline site `customers/[id]/page.tsx:184`:

```tsx
onClick={async () => {
  const ok = await copyText(customer.account_number!);
  showAlert(ok ? 'success' : 'error', ok ? 'Account number copied' : 'Copy failed — select and copy manually');
}}
```

- [ ] **Step 3:** `npx tsc --noEmit` clean. **Commit**: `git commit -am "fix: clipboard fallback for Safari/non-HTTPS at credential copy sites"`

### Task 7: Account statement — stop refetching on every filter keystroke

**Files:**
- Modify: `app/account-statement/page.tsx:66-68`

- [ ] **Step 1:** Replace the effect (currently re-runs whenever `fetchStatement` identity changes, i.e. on every `startDate`/`endDate` edit, duplicating the explicit Apply fetch):

```ts
useEffect(() => {
  fetchStatement(1, undefined, perPage);
  // Refetch only on mount and per-page-size change; date filters fetch
  // explicitly via Apply/Clear. fetchStatement identity is intentionally
  // excluded so typing a date doesn't trigger a fetch per keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [perPage]);
```

- [ ] **Step 2:** Verify the per-page selector and pagination still work by reading their handlers (pagination calls `fetchStatement(newPage, ...)` directly — unchanged). `npm run lint` clean.
- [ ] **Step 3: Commit**: `git commit -am "fix(account-statement): fetch on apply, not per keystroke"`

### Task 8: Normalize getCustomers/getActiveCustomers response shapes

**Files:**
- Modify: `app/lib/api.ts:543-554` (and the analogous block in `getActiveCustomers`)

- [ ] **Step 1:** In `getCustomers`, replace the tail:

```ts
const result = await this.handleResponse<Customer[] | PaginatedResponse<Customer>>(response);
if (page && perPage) {
  if (Array.isArray(result)) {
    const total = result.length;
    const start = (page - 1) * perPage;
    return { data: result.slice(start, start + perPage), page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) || 1 };
  }
  return result;
}
// Caller expects a plain array — normalize a paginated envelope if the
// backend ever returns one for an unpaginated request.
return Array.isArray(result) ? result : (result.data ?? []);
```

- [ ] **Step 2:** Apply the same normalization to `getActiveCustomers` (starts api.ts:556) if it has the same dual-shape handling.
- [ ] **Step 3:** `npx tsc --noEmit` clean. **Commit**: `git commit -am "fix(api): normalize customer list response shapes for unpaginated callers"`

### Task 9: Gate background polls on tab visibility

**Files:**
- Modify: `app/pppoe-monitor/page.tsx:535`, `app/diagnostics/page.tsx:197-201`

- [ ] **Step 1: pppoe-monitor** — line 535:

```ts
const interval = setInterval(() => {
  if (document.visibilityState === 'visible') fetchData(selectedRouterId, 'poll');
}, POLL_INTERVAL);
```

- [ ] **Step 2: diagnostics** — wrap the interval body the same way:

```ts
const interval = setInterval(() => {
  if (document.visibilityState !== 'visible') return;
  if (activeTab === 'pppoe') loadPppoeOverview();
  else if (activeTab === 'hotspot') loadHotspotOverview();
  else if (activeTab === 'ports') loadPortStatus();
}, 60000);
```

- [ ] **Step 3: Commit**: `git commit -am "perf: pause pppoe/diagnostics polls while tab hidden"`

### Task 10: Lazy-load demoData (removes ~130KB from every page's baseline)

**Files:**
- Modify: `app/lib/api.ts:212` (static import → lazy loader; 64 `demo.` references)

- [ ] **Step 1:** Replace `import * as demo from './demoData';` with:

```ts
type DemoModule = typeof import('./demoData');
let demoModulePromise: Promise<DemoModule> | null = null;
const loadDemo = (): Promise<DemoModule> => (demoModulePromise ??= import('./demoData'));

// Kept local so the synchronous demoBlock() doesn't need the module.
const DEMO_WRITE_ERROR = 'This action is not available in demo mode. Sign up for a free account to get started!';
```

- [ ] **Step 2:** `demoBlock()` — use the local `DEMO_WRITE_ERROR` constant instead of `demo.DEMO_WRITE_ERROR`.
- [ ] **Step 3:** Mechanical replace of remaining references — every other `demo.` use sits inside an async method's `isDemoMode()` branch: `demo.X` → `(await loadDemo()).X`. Use PowerShell regex replace, then verify zero remaining bare references:

```powershell
(Get-Content app/lib/api.ts -Raw) -replace 'demo\.', '(await loadDemo()).' | Set-Content app/lib/api.ts -Encoding utf8
```

Then fix the two intentional locals this over-replaces (the loader lines themselves and DEMO_WRITE_ERROR, if touched) and run `npx tsc --noEmit` — any `await` in a non-async context surfaces here; fix individually (expected: none, all demo branches are async).
- [ ] **Step 4:** `npm run build` — confirm `demoData` now lands in its own async chunk (search build output / `.next` chunks for demo fixture strings absent from shared chunks).
- [ ] **Step 5: Commit**: `git commit -am "perf: lazy-load demo dataset out of the baseline bundle"`

### Task 11: Dynamic-import recharts everywhere (5 pages, 3 shared components)

The recipe per site: extract in-page chart components to their own `'use client'` file (verbatim move of the component + its recharts imports + local helpers/types), then consume via `next/dynamic` with `ssr: false` and a skeleton. Already-separate chart components only need their consumers switched to `next/dynamic`.

**Files:**
- Create: `app/dashboard/DailyTrendChart.tsx` (move component from `app/dashboard/page.tsx:1586`), chart extractions for `app/admin/page.tsx`, `app/admin/leads/analytics/page.tsx`, `app/admin/subscriptions/revenue/page.tsx` (one `Charts.tsx` sibling per page)
- Modify: consumers of `app/components/DailyTransactionsChart.tsx`, `app/components/RevenueOverTimeChart.tsx`, `app/components/ResellerCharts.tsx` (grep for their import sites)

- [ ] **Step 1: dashboard** — move `DailyTrendChart` (page.tsx:1586) plus the recharts import block (page.tsx:9-18) into `app/dashboard/DailyTrendChart.tsx` with `'use client'` and a default export. In page.tsx:

```tsx
import dynamic from 'next/dynamic';
import { SkeletonCard } from '../components/LoadingSpinner';

const DailyTrendChart = dynamic(() => import('./DailyTrendChart'), {
  ssr: false,
  loading: () => <SkeletonCard />,
});
const RevenueOverTimeChart = dynamic(() => import('../components/RevenueOverTimeChart'), {
  ssr: false,
  loading: () => <SkeletonCard />,
});
```

Remove the static recharts and RevenueOverTimeChart imports.
- [ ] **Step 2: admin/page.tsx** — identify the in-file components using the recharts imports (lines 33-36); move them verbatim to `app/admin/AdminCharts.tsx` (named exports). Consume each via `dynamic(() => import('./AdminCharts').then(m => m.<Name>), { ssr: false, loading: () => <SkeletonCard /> })`. Same skeleton import pattern as Step 1.
- [ ] **Step 3: admin/leads/analytics/page.tsx** — same recipe → `app/admin/leads/analytics/AnalyticsCharts.tsx`.
- [ ] **Step 4: admin/subscriptions/revenue/page.tsx** — extract the Pie chart JSX into `app/admin/subscriptions/revenue/RevenuePie.tsx`; dynamic-import it.
- [ ] **Step 5:** Grep consumers of `DailyTransactionsChart` and `ResellerCharts`; switch those imports to `next/dynamic` with the same options.
- [ ] **Step 6:** `npm run build` — verify chart routes' First Load JS drops (compare `/admin`, `/dashboard` script bytes before/after; expect roughly −300KB raw on each chart route) and that recharts no longer appears in more than one chunk.
- [ ] **Step 7: Commit**: `git commit -am "perf: code-split recharts behind next/dynamic on all chart routes"`

### Task 12: Route-level error, 404, and loading pages

**Files:**
- Create: `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`

- [ ] **Step 1:** `app/error.tsx`:

```tsx
'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
      <p className="text-sm text-foreground-muted max-w-md">{error.message || 'An unexpected error occurred.'}</p>
      <button onClick={reset} className="btn-primary">Try again</button>
    </div>
  );
}
```

- [ ] **Step 2:** `app/not-found.tsx`:

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">Page not found</h2>
      <p className="text-sm text-foreground-muted">The page you are looking for does not exist.</p>
      <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
    </div>
  );
}
```

- [ ] **Step 3:** `app/loading.tsx` — reuse the existing spinner:

```tsx
import { PageLoader } from './components/LoadingSpinner';

export default function Loading() {
  return <PageLoader />;
}
```

(Check `LoadingSpinner.tsx` exports first; if `PageLoader` isn't exported there, use the component pages actually use, e.g. copy the spinner markup.)
- [ ] **Step 4:** `npm run build` clean. **Commit**: `git commit -am "feat: route-level error, not-found and loading pages"`

### Task 13: Landing page metadata (SEO for the acquisition page)

**Files:**
- Modify: `app/landing/layout.tsx` (server component — metadata export works here even though the page is a client component)

- [ ] **Step 1:** Add to `app/landing/layout.tsx`:

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bitwave ISP Billing — Hotspot & PPPoE Billing for Kenyan ISPs',
  description:
    'Automate your ISP billing: M-Pesa payments, hotspot vouchers, PPPoE management, MikroTik integration and customer analytics. Start free.',
};
```

(Keep the existing default export; merge if the file already exports anything.)
- [ ] **Step 2: Commit**: `git commit -am "feat(seo): landing page metadata"`

### Task 14: Security headers in next.config.ts

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1:** Add a `headers()` block:

```ts
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // unsafe-inline: Next inline runtime + GA bootstrap; tighten with nonces later
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://t.contentsquare.net https://*.contentsquare.net https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://isp.bitwavetechnologies.com https://www.google-analytics.com https://*.google-analytics.com https://*.contentsquare.net https://va.vercel-scripts.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  images: { /* unchanged */ },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

- [ ] **Step 2:** `npm run build`; then `npm run test:e2e` later (Task 16) watches for CSP breakage — if Playwright console shows CSP violations for legitimate origins (e.g. leaflet tiles), extend the relevant directive rather than removing CSP.
- [ ] **Step 3: Commit**: `git commit -am "feat(security): CSP and security headers"`

### Task 15: Repo hygiene

**Files:**
- Modify: `.gitignore`; Delete: `nul`

- [ ] **Step 1:** Append to `.gitignore`: `.cursor/` and `nul`.
- [ ] **Step 2:** Delete the stray `nul` file (Windows reserved name — needs the extended path):

```powershell
Remove-Item "\\?\C:\Users\pc\internet-project\isp-billing-admin\nul" -Force
```

- [ ] **Step 3: Commit**: `git commit -am "chore: ignore .cursor, remove stray nul artifact"`

### Task 16: Responsive harness — add 320px width, full run

**Files:**
- Modify: `e2e/pages.ts:1`

- [ ] **Step 1:** `export const WIDTHS = [320, 375, 768, 834, 1024, 1280];`
- [ ] **Step 2:** `npm run test:e2e` — full suite. Any 320px overflow failures are real findings: fix per the convention checklist (`docs/superpowers/specs/2026-06-06-app-responsiveness-design.md`) before committing.
- [ ] **Step 3: Commit**: `git commit -am "test: cover 320px viewport in responsive harness"`

### Task 17: Dependency upgrades — clear the 4 high CVEs (last, riskiest)

- [ ] **Step 1:** `npm audit fix` (clears picomatch/minimatch ReDoS).
- [ ] **Step 2:** `npm install next@16.2.7 eslint-config-next@16.2.7` (patched line per audit).
- [ ] **Step 3:** `npm audit` — expect 0 high. `npm run build` + `npm test` + `npm run test:e2e` — all green.
- [ ] **Step 4: Commit**: `git commit -am "chore(deps): upgrade Next to patched 16.2.x, audit fixes"`

### Task 18: Final verification

- [ ] **Step 1:** `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` — all green in one final pass.
- [ ] **Step 2:** Compare bundle: confirm baseline First Load JS dropped (demoData out) and chart routes dropped ~300KB raw each (recharts split).
- [ ] **Step 3:** Report results with before/after numbers.
