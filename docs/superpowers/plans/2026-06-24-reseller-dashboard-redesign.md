# Reseller Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the reseller dashboard (`app/dashboard/`) from a single 2,172-line full-width column into a responsive 12-column bento grid with grouped, tiered sections — decomposing the monolith into focused components — without changing any data, API, or app-shell behavior.

**Architecture:** Pure presentation-layer rebuild. `DashboardClient.tsx` keeps its existing state + data-loading effects verbatim and becomes a thin grid composer that arranges new section components (extracted from its current inline definitions) into a 12-col CSS grid. Shared primitives (`SectionCard`, `Sparkline`, `BulletBar`, `icons`) are created first; section components are each a **new file** (so they can be built in parallel without editing the shared monolith); the final integration task rewrites `DashboardClient.tsx` to import them and deletes the now-duplicated inline code. Recharts components stay dynamically imported (`ssr:false`).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 (CSS-variable token system in `app/globals.css`), Recharts 3, Vitest (unit), Playwright (e2e/visual).

## Global Constraints

- **No backend/API changes.** Do not modify `app/lib/api.ts`, `app/lib/types.ts`, endpoint shapes, or demo data. Components consume existing types only.
- **No app-shell changes.** Do not touch the sidebar (`--app-sidebar-w`), `Header`, `MobileBottomNav`, or global theme bootstrap.
- **Preserve all runtime behavior:** staggered loads (`DASHBOARD_LOAD_DELAYS_MS`), auto-refresh intervals (MikroTik 60s, top users 60s, bandwidth 120s, stale-health backoff), `isDashboardVisible()` gating, router-gating (`selectedRouterId`), `hasRouters` empty handling, demo mode (`api.isDemoMode()`), GMT+3 formatting (`app/lib/dateUtils`), subscription alert + `buildSubscriptionAlert`, deferred onboarding checklist, the period filter.
- **Both light and dark themes must work** — style exclusively via existing CSS-var tokens / Tailwind token classes (`bg-background-secondary`, `text-foreground-muted`, `bg-amber-500`, etc.). No raw hex except inside Recharts where it already reads CSS vars.
- **Keep Recharts dynamically imported with `ssr:false`** and the `DashboardIsland` client-only island.
- **No data series removed.** Redundant *views* are consolidated; every metric stays reachable.
- Run from repo root `C:/Users/pc/internet-project/isp-billing-admin`. Lint: `npm run lint`. Unit: `npm run test`. E2E: `npm run test:e2e`. Dev server: `npm run dev` (http://localhost:3000).
- TypeScript strict; no `any` in new code. Match existing import style (relative paths, `'use client'` on client components).

---

## File Structure

```
app/dashboard/
  DashboardClient.tsx          MODIFY (last) — state/effects kept, body becomes grid composer; inline section defs deleted
  DashboardIsland.tsx          unchanged
  page.tsx                     unchanged
  BandwidthChart.tsx           MODIFY — chart color/grid refresh (token-driven)
  DownloadUsageChart.tsx       MODIFY — chart color/grid refresh (token-driven)
  components/
    icons.tsx                  CREATE — all dashboard icon components (moved out of DashboardClient)
    SectionCard.tsx            CREATE — shared card: header (accent bar+title+meta+controls) + loading/error/empty wrappers
    Sparkline.tsx              CREATE — pure inline-SVG sparkline from number[]
    BulletBar.tsx              CREATE — horizontal threshold/bullet bar (replaces RadialGauge)
    kpiSeries.ts               CREATE — pure helper: extract sparkline series from DailyTrend[]
    KpiStrip.tsx               CREATE — 4 KPI tiles + sparklines
    NetworkHealthCard.tsx      CREATE — bullet-bar CPU/Mem/Storage + system summary + status
    LiveThroughputCard.tsx     CREATE — live download/upload meters + active hotspot/pppoe "online now"
    InterfacesPanel.tsx        CREATE — collapsible network interfaces (extracted InterfaceCard grid)
    TopDownloaders.tsx         CREATE — live top users table/cards (extracted TopUsersSection)
    TopUsageThisPeriod.tsx     CREATE — monthly FUP usage table/cards (extracted TopUsageThisMonthSection)
    DownloadUsageSection.tsx   CREATE — service+period filters + totals + DownloadUsageChart
    BandwidthSection.tsx       CREATE — peak/avg stats + BandwidthChart
    RevenueSection.tsx         CREATE — wraps RevenueOverTimeChart in SectionCard
    PlanPerformance.tsx        CREATE — extracted PlanPerformanceList
    DailyBreakdown.tsx         CREATE — collapsible: daily list + day grid + day detail
    DashboardToolbar.tsx       CREATE — sticky title + RouterSelector + period pills + custom range + Refresh
  __tests__/
    Sparkline.test.ts          CREATE
    BulletBar.test.ts          CREATE
    kpiSeries.test.ts          CREATE
```

**Extraction source map** — current `app/dashboard/DashboardClient.tsx` line ranges to lift code from (read the file; do not retype blindly):
- Main body (state + effects): 117–404 (KEEP in place). Page JSX: 405–706.
- KPI tiles JSX: 514–567. Filter/period bar: 429–494.
- `RadialGauge` 708–786 · `BandwidthSpeedometer` 788–869 · `MikroTikSection` 871–1078.
- `formatUsageMb` 1080–1084 · `getDownloadUsageTotals` 1086–1100 · `DownloadUsageSection` 1102–1225.
- `BandwidthSection` 1227–1381 · date helpers 1383–1399.
- `TopUsersSection` 1401–1642 · `TopUsersIcon` 1644 · `BandwidthIcon` 1653 · `InterfaceCard` 1662–1691 · `formatBytes` 1693–1700.
- `DailyTrendChart` 1703–1764 · `PlanPerformanceList` 1766–1802 · `DayDetailCard` 1805–1866 · `MetricBox` 1868–1895 · `DayCard` 1897–1928 · `EmptyState` 1930–1940.
- Icons 1942–2005 (`CurrencyIcon`,`TransactionsIcon`,`UsersIcon`,`ChartIcon`,`RouterIcon`,`CpuIcon`,`MemoryIcon`,`StorageIcon`).
- `TopUsageThisMonthSection` 2007–2171.

**Parallelism:** Tasks 1–4 are foundation (sequential, in order). Tasks 5–11 each create only their own new file(s) and may run **in parallel** (fresh subagent each). Task 12 (integration) edits `DashboardClient.tsx` and must run after 5–11. Task 13 (verification) runs last.

---

### Task 1: Chart color tokens + icons module

**Files:**
- Modify: `app/globals.css` (append a chart-token block near the `@theme inline` / token definitions)
- Create: `app/dashboard/components/icons.tsx`

**Interfaces:**
- Produces: named exports from `icons.tsx`: `CurrencyIcon, TransactionsIcon, UsersIcon, ChartIcon, RouterIcon, CpuIcon, MemoryIcon, StorageIcon, TopUsersIcon, BandwidthIcon` — each `(props: { className?: string }) => JSX.Element`.
- Produces: CSS vars `--chart-1..--chart-5` (light + dark) for Recharts series colors.

- [ ] **Step 1: Add chart color tokens to `globals.css`.** In `:root` add (colorblind-aware, blue/orange/green/violet/cyan family):

```css
  /* Chart series palette (additive — do not change existing tokens) */
  --chart-1: #f59e0b; /* amber  (primary / revenue) */
  --chart-2: #0891b2; /* cyan   (download) */
  --chart-3: #059669; /* green  (upload / success) */
  --chart-4: #7c3aed; /* violet (pppoe) */
  --chart-5: #ea580c; /* orange (secondary) */
```

In `.dark` add the de-saturated/lightened dark variants:

```css
  --chart-1: #fbbf24;
  --chart-2: #22d3ee;
  --chart-3: #34d399;
  --chart-4: #a78bfa;
  --chart-5: #fb923c;
```

- [ ] **Step 2: Create `icons.tsx`.** Add `'use client'` is NOT needed (pure SVG, no hooks). Move the 10 icon component bodies verbatim from `DashboardClient.tsx` (lines 1644, 1653, 1942–2005) into named exports. Give every icon the `{ className = "w-5 h-5" }` prop signature (CurrencyIcon/TransactionsIcon/ChartIcon currently hardcode `w-5 h-5` — add the optional prop).

- [ ] **Step 3: Verify build/types.** Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors from `icons.tsx`.

- [ ] **Step 4: Commit.**

```bash
git add app/globals.css app/dashboard/components/icons.tsx
git commit -m "feat(dashboard): add chart color tokens and shared icons module"
```

---

### Task 2: SectionCard primitive

**Files:**
- Create: `app/dashboard/components/SectionCard.tsx`

**Interfaces:**
- Produces:
```ts
interface SectionCardProps {
  title: string;
  accent?: 'amber' | 'emerald' | 'cyan' | 'violet' | 'orange' | 'purple'; // default 'amber'
  meta?: React.ReactNode;          // right-aligned subtitle/count
  controls?: React.ReactNode;      // right-aligned inline controls (pills, filters)
  loading?: boolean;               // shows pulse dot next to title
  className?: string;              // extra classes on the <section> (e.g. grid spans)
  bodyClassName?: string;
  children: React.ReactNode;
}
export default function SectionCard(props: SectionCardProps): JSX.Element
// Plus a small helper for error/empty inside a card:
export function SectionError({ message, onRetry }: { message: string; onRetry?: () => void }): JSX.Element
export function SectionEmpty({ message }: { message: string }): JSX.Element
```

- [ ] **Step 1: Implement `SectionCard.tsx`** (`'use client'`). The header is the standardized compact pattern (1.5px accent bar + title + optional pulse + right-aligned meta/controls), replacing the old 40px icon tiles:

```tsx
'use client';
import React from 'react';

const ACCENT: Record<string, string> = {
  amber: 'bg-amber-500', emerald: 'bg-emerald-500', cyan: 'bg-cyan-500',
  violet: 'bg-violet-500', orange: 'bg-orange-500', purple: 'bg-purple-500',
};

interface SectionCardProps {
  title: string;
  accent?: keyof typeof ACCENT;
  meta?: React.ReactNode;
  controls?: React.ReactNode;
  loading?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export default function SectionCard({
  title, accent = 'amber', meta, controls, loading, className = '', bodyClassName = '', children,
}: SectionCardProps) {
  return (
    <section className={`card p-4 sm:p-5 animate-fade-in min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base min-w-0">
          <span className={`w-1.5 h-5 rounded-full flex-shrink-0 ${ACCENT[accent]}`} />
          <span className="truncate">{title}</span>
          {loading && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />}
        </h3>
        {(meta || controls) && (
          <div className="flex items-center gap-2 flex-shrink-0 text-[10px] sm:text-xs text-foreground-muted">
            {meta}
            {controls}
          </div>
        )}
      </div>
      <div className={`min-w-0 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function SectionError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-danger">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-ghost text-xs">Retry</button>}
    </div>
  );
}

export function SectionEmpty({ message }: { message: string }) {
  return <div className="text-center py-8 text-foreground-muted text-sm">{message}</div>;
}
```

- [ ] **Step 2: Typecheck.** Run: `npx tsc --noEmit` — Expected: clean.
- [ ] **Step 3: Commit.**

```bash
git add app/dashboard/components/SectionCard.tsx
git commit -m "feat(dashboard): add SectionCard primitive"
```

---

### Task 3: Sparkline primitive (TDD)

**Files:**
- Create: `app/dashboard/components/Sparkline.tsx`
- Test: `app/dashboard/__tests__/Sparkline.test.ts`

**Interfaces:**
- Produces:
```ts
// Pure path generator (exported for testing) — maps values to an SVG polyline `points` string.
export function sparklinePoints(values: number[], width: number, height: number): string;
// Component:
export default function Sparkline(props: { values: number[]; width?: number; height?: number; className?: string; color?: string }): JSX.Element
```
Semantics: `sparklinePoints` returns space-separated `x,y` pairs; x spans `0..width` evenly across N points; y is inverted (higher value = smaller y). Flat series (max===min) renders a horizontal line at vertical center. Empty/single-point series returns `''`.

- [ ] **Step 1: Write the failing test** `app/dashboard/__tests__/Sparkline.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sparklinePoints } from '../components/Sparkline';

describe('sparklinePoints', () => {
  it('returns empty for <2 points', () => {
    expect(sparklinePoints([], 100, 20)).toBe('');
    expect(sparklinePoints([5], 100, 20)).toBe('');
  });
  it('maps an ascending series with inverted y (first highest y, last y=0)', () => {
    const pts = sparklinePoints([0, 10], 100, 20).split(' ');
    expect(pts).toHaveLength(2);
    expect(pts[0]).toBe('0,20');   // min value -> bottom
    expect(pts[1]).toBe('100,0');  // max value -> top
  });
  it('renders a flat series at vertical center', () => {
    expect(sparklinePoints([5, 5, 5], 100, 20)).toBe('0,10 50,10 100,10');
  });
});
```

- [ ] **Step 2: Run to verify it fails.** Run: `npm run test -- Sparkline` — Expected: FAIL (`sparklinePoints` not exported).
- [ ] **Step 3: Implement `Sparkline.tsx`** (`'use client'`):

```tsx
'use client';
import React from 'react';

export function sparklinePoints(values: number[], width: number, height: number): string {
  if (!values || values.length < 2) return '';
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = Math.round(i * stepX);
      const y = span === 0 ? height / 2 : Math.round(height - ((v - min) / span) * height);
      return `${x},${y}`;
    })
    .join(' ');
}

export default function Sparkline({
  values, width = 96, height = 24, className = '', color = 'var(--chart-1)',
}: { values: number[]; width?: number; height?: number; className?: string; color?: string }) {
  const points = sparklinePoints(values, width, height);
  if (!points) return null;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 4: Run to verify it passes.** Run: `npm run test -- Sparkline` — Expected: PASS (3 tests).
- [ ] **Step 5: Commit.**

```bash
git add app/dashboard/components/Sparkline.tsx app/dashboard/__tests__/Sparkline.test.ts
git commit -m "feat(dashboard): add Sparkline primitive with tests"
```

---

### Task 4: BulletBar primitive + kpiSeries helper (TDD)

**Files:**
- Create: `app/dashboard/components/BulletBar.tsx`
- Create: `app/dashboard/components/kpiSeries.ts`
- Test: `app/dashboard/__tests__/BulletBar.test.ts`, `app/dashboard/__tests__/kpiSeries.test.ts`

**Interfaces:**
- Produces:
```ts
// BulletBar.tsx
export type BulletStatus = 'normal' | 'warning' | 'critical';
export function bulletStatus(percent: number, warning: number, danger: number): BulletStatus;
export default function BulletBar(props: {
  label: string; percent: number; subtitle?: string;
  warning?: number; danger?: number;            // default warning 60, danger 80
  icon?: React.ReactNode;
}): JSX.Element
// kpiSeries.ts
import { DailyTrend } from '../../lib/types';
export function revenueSeries(trend: DailyTrend[]): number[];
export function txالسeries... // (see below — exact names: revenueSeries, transactionSeries, userSeries)
export function transactionSeries(trend: DailyTrend[]): number[];
export function userSeries(trend: DailyTrend[]): number[];
```

- [ ] **Step 1: Write failing tests.** `app/dashboard/__tests__/BulletBar.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { bulletStatus } from '../components/BulletBar';

describe('bulletStatus', () => {
  it('normal below warning', () => expect(bulletStatus(50, 60, 80)).toBe('normal'));
  it('warning at/above warning, below danger', () => {
    expect(bulletStatus(60, 60, 80)).toBe('warning');
    expect(bulletStatus(79, 60, 80)).toBe('warning');
  });
  it('critical at/above danger', () => expect(bulletStatus(80, 60, 80)).toBe('critical'));
});
```

`app/dashboard/__tests__/kpiSeries.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { revenueSeries, transactionSeries, userSeries } from '../components/kpiSeries';
import type { DailyTrend } from '../../lib/types';

const trend: DailyTrend[] = [
  { date: '2026-06-01', label: 'Jun 1', transactions: 2, revenue: 100, users: 1 },
  { date: '2026-06-02', label: 'Jun 2', transactions: 5, revenue: 250, users: 3 },
];

describe('kpiSeries', () => {
  it('extracts revenue series in order', () => expect(revenueSeries(trend)).toEqual([100, 250]));
  it('extracts transaction series', () => expect(transactionSeries(trend)).toEqual([2, 5]));
  it('extracts user series', () => expect(userSeries(trend)).toEqual([1, 3]));
  it('handles empty', () => expect(revenueSeries([])).toEqual([]));
});
```

- [ ] **Step 2: Run to verify failure.** Run: `npm run test -- BulletBar kpiSeries` — Expected: FAIL (not exported).
- [ ] **Step 3: Implement `kpiSeries.ts`:**

```ts
import { DailyTrend } from '../../lib/types';
export const revenueSeries = (t: DailyTrend[]): number[] => t.map((d) => d.revenue);
export const transactionSeries = (t: DailyTrend[]): number[] => t.map((d) => d.transactions);
export const userSeries = (t: DailyTrend[]): number[] => t.map((d) => d.users);
```

- [ ] **Step 4: Implement `BulletBar.tsx`** (`'use client'`). Horizontal threshold bar; color via success/warning/danger tokens; status reinforced with a text label (never color-alone):

```tsx
'use client';
import React from 'react';

export type BulletStatus = 'normal' | 'warning' | 'critical';

export function bulletStatus(percent: number, warning: number, danger: number): BulletStatus {
  if (percent >= danger) return 'critical';
  if (percent >= warning) return 'warning';
  return 'normal';
}

const STATUS_BAR: Record<BulletStatus, string> = {
  normal: 'bg-emerald-500', warning: 'bg-amber-500', critical: 'bg-red-500',
};
const STATUS_TEXT: Record<BulletStatus, string> = {
  normal: 'text-emerald-500', warning: 'text-amber-500', critical: 'text-red-500',
};
const STATUS_LABEL: Record<BulletStatus, string> = {
  normal: 'Normal', warning: 'Warning', critical: 'Critical',
};

export default function BulletBar({
  label, percent, subtitle, warning = 60, danger = 80, icon,
}: { label: string; percent: number; subtitle?: string; warning?: number; danger?: number; icon?: React.ReactNode }) {
  const pct = Math.min(100, Math.max(0, percent));
  const status = bulletStatus(pct, warning, danger);
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="flex items-center gap-1.5 text-xs sm:text-sm text-foreground min-w-0">
          {icon && <span className={`${STATUS_TEXT[status]} flex-shrink-0`}>{icon}</span>}
          <span className="truncate">{label}</span>
        </span>
        <span className={`text-sm font-bold stat-value flex-shrink-0 ${STATUS_TEXT[status]}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-background-tertiary overflow-hidden">
        {/* threshold ticks */}
        <span className="absolute top-0 bottom-0 w-px bg-foreground-muted/30" style={{ left: `${warning}%` }} />
        <span className="absolute top-0 bottom-0 w-px bg-foreground-muted/40" style={{ left: `${danger}%` }} />
        <div className={`h-full rounded-full transition-all duration-700 ${STATUS_BAR[status]}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] sm:text-[10px] text-foreground-muted truncate">{subtitle}</span>
        <span className={`text-[9px] sm:text-[10px] font-medium ${STATUS_TEXT[status]}`}>{STATUS_LABEL[status]}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run to verify pass.** Run: `npm run test -- BulletBar kpiSeries` — Expected: PASS (7 tests).
- [ ] **Step 6: Commit.**

```bash
git add app/dashboard/components/BulletBar.tsx app/dashboard/components/kpiSeries.ts app/dashboard/__tests__/BulletBar.test.ts app/dashboard/__tests__/kpiSeries.test.ts
git commit -m "feat(dashboard): add BulletBar primitive and kpiSeries helpers with tests"
```

---

### Task 5: KpiStrip (parallel-safe — new file)

**Files:**
- Create: `app/dashboard/components/KpiStrip.tsx`

**Interfaces:**
- Consumes: `StatCard` (`app/components/StatCard`), `Sparkline`, `kpiSeries` (Task 3/4), icons (Task 1), `DashboardAnalytics` type, `SkeletonCard` (`app/components/LoadingSpinner`).
- Produces: `export default function KpiStrip(props: { data: DashboardAnalytics | null; loading: boolean; periodLabel: string }): JSX.Element`

- [ ] **Step 1: Implement `KpiStrip.tsx`.** Render 4 tiles (Total Revenue / Transactions / Unique Customers / Avg Transaction) reproducing the values from current `DashboardClient.tsx:514–567`, but rendered as a self-contained grid with a `Sparkline` under each value (revenue→`revenueSeries`, transactions/avg→`transactionSeries`, customers→`userSeries`). Loading → four `SkeletonCard`. Wrap each tile so the existing `StatCard` shows the metric and append `<Sparkline values={...} color="var(--chart-N)" className="w-full mt-2 opacity-70" />` (StatCard has no sparkline slot, so compose: render `StatCard` then the sparkline in a wrapping `div` with `relative`). Grid: `grid grid-cols-2 lg:grid-cols-4 gap-4`.

- [ ] **Step 2: Typecheck.** Run: `npx tsc --noEmit` — Expected: clean.
- [ ] **Step 3: Commit.**

```bash
git add app/dashboard/components/KpiStrip.tsx
git commit -m "feat(dashboard): add KpiStrip with sparklines"
```

---

### Task 6: NetworkHealthCard + LiveThroughputCard + InterfacesPanel (parallel-safe — new files)

**Files:**
- Create: `app/dashboard/components/NetworkHealthCard.tsx`, `LiveThroughputCard.tsx`, `InterfacesPanel.tsx`

**Interfaces:**
- Consumes: `MikroTikMetrics`, `MikroTikInterface` types; `SectionCard`, `SectionError` (Task 2); `BulletBar` (Task 4); icons (Task 1); `formatBytes`, GMT+3 `parseUTCToGMT3`/`formatGMT3Date` (move `formatBytes` into a small local util or `LiveThroughputCard`).
- Produces (all take `{ data: MikroTikMetrics | null; loading: boolean; error: string | null; onRetry: () => void }` except InterfacesPanel which takes `{ interfaces: MikroTikInterface[] }`):
```ts
export default function NetworkHealthCard(props): JSX.Element   // CPU/Mem/Storage bullet bars + status badge + system summary
export default function LiveThroughputCard(props): JSX.Element  // live download/upload meters + active hotspot/pppoe "online now"
export default function InterfacesPanel({ interfaces }): JSX.Element  // collapsible <details> grid of InterfaceCard
```

- [ ] **Step 1: Build `NetworkHealthCard.tsx`** from `MikroTikSection` (lines 871–1078), but replace the three `RadialGauge` (708–786) with `BulletBar` (CPU `warning:50,danger:80`; Memory `60/80`; Storage `70/90`, each with `subtitle` = used/total via `formatBytes`). Keep the status badge logic (`statusLabel`/`statusClass`, lines 954–967) and `systemSummary`. Wrap in `SectionCard title="Device Health" accent="emerald"` with `meta` = last-updated. Preserve loading skeleton + error (`SectionError`).
- [ ] **Step 2: Build `LiveThroughputCard.tsx`** from `BandwidthSpeedometer` (788–869) + the Active Users block (1027–1048): live download/upload progress meters and the hotspot/pppoe "online now" counts (with `hotspotAgeLabel`/`live` labels). `SectionCard title="Live Throughput" accent="cyan"`.
- [ ] **Step 3: Build `InterfacesPanel.tsx`** from `InterfaceCard` (1662–1691) + the `<details>` block (1059–1075), filtering out loopback. `formatBytes` (1693–1700) lives here or in a shared util imported by both.
- [ ] **Step 4: Typecheck.** Run: `npx tsc --noEmit` — Expected: clean.
- [ ] **Step 5: Commit.**

```bash
git add app/dashboard/components/NetworkHealthCard.tsx app/dashboard/components/LiveThroughputCard.tsx app/dashboard/components/InterfacesPanel.tsx
git commit -m "feat(dashboard): network health (bullet bars), live throughput, interfaces panel"
```

---

### Task 7: TopDownloaders + TopUsageThisPeriod (parallel-safe — new files)

**Files:**
- Create: `app/dashboard/components/TopDownloaders.tsx`, `TopUsageThisPeriod.tsx`

**Interfaces:**
- Consumes: `TopUsersResponse`, `ResellerTopUsageEntry` types; `SectionCard`/`SectionError`/`SectionEmpty`; `Link` (next/link, for TopUsageThisPeriod customer links); `SkeletonCard`.
- Produces:
```ts
export default function TopDownloaders(props: { data: TopUsersResponse | null; loading: boolean; error: string | null; onRetry: () => void }): JSX.Element
export default function TopUsageThisPeriod(props: { data: ResellerTopUsageEntry[] | null; loading: boolean }): JSX.Element
```

- [ ] **Step 1: Build `TopDownloaders.tsx`** from `TopUsersSection` (1401–1642) — keep the mobile-card + desktop-table dual layout and all formatting (`formatRate`/`formatUsage`, rank badges, active pulse). Wrap header in `SectionCard title="Top Downloaders" accent="violet"` with `meta` = `${n} users · ${totalQueues} queues`. The card must work inside a `col-span-6` (table already has `overflow-x-auto`).
- [ ] **Step 2: Build `TopUsageThisPeriod.tsx`** from `TopUsageThisMonthSection` (2007–2171) — keep desktop table + mobile cards, FUP coloring, customer `Link`s. `SectionCard title="Top Users This Period" accent="purple"` meta="Hotspot + PPPoE". Loading → `SkeletonCard`; empty (`data.length === 0`) → render `null` as today.
- [ ] **Step 3: Typecheck.** Run: `npx tsc --noEmit` — Expected: clean.
- [ ] **Step 4: Commit.**

```bash
git add app/dashboard/components/TopDownloaders.tsx app/dashboard/components/TopUsageThisPeriod.tsx
git commit -m "feat(dashboard): extract TopDownloaders and TopUsageThisPeriod sections"
```

---

### Task 8: DownloadUsageSection + BandwidthSection + chart restyle (parallel-safe — new files + 2 chart files)

**Files:**
- Create: `app/dashboard/components/DownloadUsageSection.tsx`, `BandwidthSection.tsx`
- Modify: `app/dashboard/DownloadUsageChart.tsx`, `app/dashboard/BandwidthChart.tsx`

**Interfaces:**
- Consumes: `BandwidthHistory` type; `DownloadUsageServiceFilter` (from `./DownloadUsageChart`); `SectionCard`/`SectionError`; the period/service option constants (move `DOWNLOAD_USAGE_PERIOD_OPTIONS`/`DOWNLOAD_USAGE_SERVICE_OPTIONS` from DashboardClient 50–61 into `DownloadUsageSection.tsx`).
- Produces:
```ts
export default function DownloadUsageSection(props: {
  data: BandwidthHistory | null; loading: boolean; error: string | null; onRetry: () => void;
  hours: number; onHoursChange: (h: number) => void;
  service: DownloadUsageServiceFilter; onServiceChange: (s: DownloadUsageServiceFilter) => void;
}): JSX.Element
export default function BandwidthSection(props: { data: BandwidthHistory | null; loading: boolean; error: string | null; onRetry: () => void }): JSX.Element
```

- [ ] **Step 1: Build `DownloadUsageSection.tsx`** from lines 1080–1225 (incl. `formatUsageMb`, `getDownloadUsageTotals`), header → `SectionCard title="Download Usage" accent="cyan"` with the service + period pill groups passed as `controls`.
- [ ] **Step 2: Build `BandwidthSection.tsx`** from lines 1227–1381, header → `SectionCard title="Bandwidth History" accent="cyan"` with current-avg as `meta` and the peak/avg stat grid + `BandwidthChart` in the body.
- [ ] **Step 3: Restyle charts to use tokens.** In `BandwidthChart.tsx` and `DownloadUsageChart.tsx`, replace hardcoded series hex with `var(--chart-2)` (download) / `var(--chart-3)` (upload) / `var(--chart-4)` (pppoe) / `var(--chart-1)` (hotspot/amber); set `<CartesianGrid stroke="var(--border)" />` and lighten; ensure **no stacking** on the bandwidth in/out series (separate `<Area>`/`<Line>` with `stackId` removed). Add `accessibilityLayer` to each top-level Recharts chart component.
- [ ] **Step 4: Typecheck + dev smoke.** Run: `npx tsc --noEmit` — Expected: clean.
- [ ] **Step 5: Commit.**

```bash
git add app/dashboard/components/DownloadUsageSection.tsx app/dashboard/components/BandwidthSection.tsx app/dashboard/DownloadUsageChart.tsx app/dashboard/BandwidthChart.tsx
git commit -m "feat(dashboard): usage/bandwidth sections + token-driven chart restyle"
```

---

### Task 9: RevenueSection + PlanPerformance (parallel-safe — new files)

**Files:**
- Create: `app/dashboard/components/RevenueSection.tsx`, `PlanPerformance.tsx`

**Interfaces:**
- Consumes: `RevenueOverTimeChart` (`app/components/RevenueOverTimeChart`, dynamic import w/ `ssr:false`); `PlanPerformance` type; `SectionCard`/`SectionEmpty`.
- Produces:
```ts
export default function RevenueSection(props: { routerId: number | null; enabled: boolean }): JSX.Element
export default function PlanPerformance(props: { plans: { name: string; count: number; revenue: number }[]; totalRevenue: number }): JSX.Element
```

- [ ] **Step 1: Build `RevenueSection.tsx`** — dynamically import `RevenueOverTimeChart` (`ssr:false`, `SkeletonCard` fallback) exactly as DashboardClient does today (lines 20–23), render it inside its own card. (RevenueOverTimeChart already renders its own card/period controls; if so, render it directly without double-wrapping — verify and keep a single card.)
- [ ] **Step 2: Build `PlanPerformance.tsx`** from `PlanPerformanceList` (1766–1802) wrapped in `SectionCard title="Plan Performance" accent="emerald"`, empty → `SectionEmpty`.
- [ ] **Step 3: Typecheck.** Run: `npx tsc --noEmit` — Expected: clean.
- [ ] **Step 4: Commit.**

```bash
git add app/dashboard/components/RevenueSection.tsx app/dashboard/components/PlanPerformance.tsx
git commit -m "feat(dashboard): revenue section + plan performance"
```

---

### Task 10: DailyBreakdown (collapsible) (parallel-safe — new file)

**Files:**
- Create: `app/dashboard/components/DailyBreakdown.tsx`

**Interfaces:**
- Consumes: `DashboardAnalytics`, `DayDetail` types; `SectionCard`/`SectionEmpty`; GMT+3 helpers; `Sparkline` optional.
- Produces: `export default function DailyBreakdown(props: { data: DashboardAnalytics; selectedDate: string | null; onDateSelect: (d: string) => void }): JSX.Element`

- [ ] **Step 1: Build `DailyBreakdown.tsx`** consolidating `DailyTrendChart` (1703–1764) + `DayDetailCard`/`MetricBox` (1805–1895) + `DayCard` (1897–1928) + the Active Days grid (679–701) into ONE collapsible section (`<details>` open=false by default) titled "Daily Breakdown". Inside: the daily revenue bar-list, the selected-day detail panel, and the day grid. Selecting a day updates via `onDateSelect`. Move `EmptyState` (1930–1940) here or into SectionCard usage. Keep all GMT+3 date helpers (move `parseUTCTimestamp`/`convertUTCTimeToLocal`/`formatLocalDate` wrappers locally).
- [ ] **Step 2: Typecheck.** Run: `npx tsc --noEmit` — Expected: clean.
- [ ] **Step 3: Commit.**

```bash
git add app/dashboard/components/DailyBreakdown.tsx
git commit -m "feat(dashboard): consolidated collapsible Daily Breakdown"
```

---

### Task 11: DashboardToolbar (sticky) (parallel-safe — new file)

**Files:**
- Create: `app/dashboard/components/DashboardToolbar.tsx`

**Interfaces:**
- Consumes: `RouterSelector` (`app/components/RouterSelector`); the `DateFilter` type + `DATE_FILTER_OPTIONS` + `isFilterEqual` (move these from DashboardClient 33–48, 164–172 into a shared `app/dashboard/dateFilter.ts` exported helper so both Toolbar and DashboardClient import them).
- Produces:
```ts
// app/dashboard/dateFilter.ts
export type DateFilter = | { type:'preset'; preset:'today'|'this_month' } | { type:'days'; days:number } | { type:'custom'; startDate:string; endDate:string };
export const DATE_FILTER_OPTIONS: { filter: DateFilter; label: string }[];
export function isFilterEqual(a: DateFilter, b: DateFilter): boolean;
export function getPeriodLabel(f: DateFilter): string;
// DashboardToolbar.tsx
export default function DashboardToolbar(props: {
  selectedRouterId: number | null; onRouterChange: (id: number | null) => void; onRoutersLoaded: (r: unknown[]) => void;
  dateFilter: DateFilter; onDateFilterChange: (f: DateFilter) => void;
  showCustomRange: boolean; onToggleCustomRange: (v: boolean) => void;
  customStartDate: string; customEndDate: string; onCustomStartChange: (v: string) => void; onCustomEndChange: (v: string) => void; onApplyCustomRange: () => void;
  onRefresh: () => void; refreshing: boolean;
}): JSX.Element
```

- [ ] **Step 1: Create `app/dashboard/dateFilter.ts`** with `DateFilter`, `DATE_FILTER_OPTIONS`, `isFilterEqual`, `getPeriodLabel` (move bodies from DashboardClient 33–48, 164–172, 383–395).
- [ ] **Step 2: Build `DashboardToolbar.tsx`** — a `sticky top-0 z-20` bar with a backdrop (`bg-background/80 backdrop-blur`) containing title + `RouterSelector` + period pills + Custom toggle + custom-range inputs + Refresh button (reproduce the markup from DashboardClient 412–493 but in one toolbar row, filters right-aligned on `sm+`). Period pills scroll horizontally on mobile (`overflow-x-auto no-scrollbar`).
- [ ] **Step 3: Typecheck.** Run: `npx tsc --noEmit` — Expected: clean.
- [ ] **Step 4: Commit.**

```bash
git add app/dashboard/dateFilter.ts app/dashboard/components/DashboardToolbar.tsx
git commit -m "feat(dashboard): sticky toolbar + shared dateFilter helpers"
```

---

### Task 12: Integrate — rewrite DashboardClient as grid composer (sequential; after 5–11)

**Files:**
- Modify: `app/dashboard/DashboardClient.tsx`

**Interfaces:**
- Consumes: every section component from Tasks 5–11 + `dateFilter.ts`.

- [ ] **Step 1: Keep all state + effects** (lines 117–404) and the subscription-alert/onboarding logic. Remove the now-extracted constants/types that moved to `dateFilter.ts` and import them instead. Delete ALL inline component definitions (lines 708–2171) — they now live in `components/`.
- [ ] **Step 2: Replace the return body** (405–704) with the bento grid. Exact composition:

```tsx
return (
  <div className="space-y-4 sm:space-y-6 pb-nav">
    {(subscriptionAlert || authAlert) && <SubscriptionAlertBanner alert={(subscriptionAlert || authAlert)!} />}

    <DashboardToolbar
      selectedRouterId={selectedRouterId} onRouterChange={setSelectedRouterId}
      onRoutersLoaded={(routers) => setHasRouters(routers.length > 0)}
      dateFilter={dateFilter} onDateFilterChange={(f) => { setDateFilter(f); setShowCustomRange(false); }}
      showCustomRange={showCustomRange} onToggleCustomRange={setShowCustomRange}
      customStartDate={customStartDate} customEndDate={customEndDate}
      onCustomStartChange={setCustomStartDate} onCustomEndChange={setCustomEndDate}
      onApplyCustomRange={applyCustomRange}
      onRefresh={refreshAll} refreshing={analyticsLoading}
    />

    <OnboardingChecklist delayMs={DASHBOARD_LOAD_DELAYS_MS.onboarding} />

    {/* Row 1 — KPIs */}
    {hasRouters !== false && (analyticsError
      ? <SectionCard title="Analytics"><SectionError message={analyticsError} onRetry={loadAnalytics} /></SectionCard>
      : <KpiStrip data={data} loading={analyticsLoading} periodLabel={getPeriodLabel(dateFilter)} />)}

    {/* 12-col bento grid */}
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
      {/* Row 2 — Revenue 8 + Plans 4 */}
      {hasRouters !== false && <div className="xl:col-span-8 min-w-0"><RevenueSection routerId={selectedRouterId} enabled={selectedRouterId !== null} /></div>}
      {!analyticsError && data && <div className="xl:col-span-4 min-w-0"><PlanPerformance plans={data.planPerformance} totalRevenue={data.summary.totalRevenue} /></div>}

      {/* Row 3 — Network 6 + 6 */}
      {selectedRouterId && <div className="xl:col-span-6 min-w-0"><NetworkHealthCard data={mikrotik} loading={mikrotikLoading} error={mikrotikError} onRetry={loadMikrotik} /></div>}
      {selectedRouterId && <div className="xl:col-span-6 min-w-0"><LiveThroughputCard data={mikrotik} loading={mikrotikLoading} error={mikrotikError} onRetry={loadMikrotik} /></div>}

      {/* Row 4 — Traffic 6 + 6 */}
      {selectedRouterId && <div className="xl:col-span-6 min-w-0"><DownloadUsageSection data={bandwidth} loading={bandwidthLoading} error={bandwidthError} onRetry={loadBandwidth} hours={downloadUsageHours} onHoursChange={setDownloadUsageHours} service={downloadUsageService} onServiceChange={setDownloadUsageService} /></div>}
      {selectedRouterId && <div className="xl:col-span-6 min-w-0"><BandwidthSection data={bandwidth} loading={bandwidthLoading} error={bandwidthError} onRetry={loadBandwidth} /></div>}

      {/* Row 5 — Rankings 6 + 6 */}
      {selectedRouterId && <div className="xl:col-span-6 min-w-0"><TopDownloaders data={topUsers} loading={topUsersLoading} error={topUsersError} onRetry={loadTopUsers} /></div>}
      <div className="xl:col-span-6 min-w-0"><TopUsageThisPeriod data={topUsageThisMonth} loading={topUsageLoading} /></div>

      {/* Row 6 — collapsible detail (full width) */}
      {!analyticsError && !analyticsLoading && data && (
        <div className="xl:col-span-12 min-w-0"><DailyBreakdown data={data} selectedDate={selectedDate} onDateSelect={setSelectedDate} /></div>
      )}
      {selectedRouterId && mikrotik?.interfaces?.length ? (
        <div className="xl:col-span-12 min-w-0"><InterfacesPanel interfaces={mikrotik.interfaces} /></div>
      ) : null}
    </div>
  </div>
);
```

- [ ] **Step 3: Typecheck + lint.** Run: `npx tsc --noEmit && npm run lint` — Expected: clean (or within existing 18-error lint baseline; no NEW errors).
- [ ] **Step 4: Dev smoke test.** Run `npm run dev`, open http://localhost:3000/dashboard (or enable demo mode), confirm it renders without console errors in light + dark.
- [ ] **Step 5: Commit.**

```bash
git add app/dashboard/DashboardClient.tsx
git commit -m "feat(dashboard): compose sections into responsive 12-col bento grid"
```

---

### Task 13: Local verification (sequential; last — before any push)

**Files:** none (verification only).

- [ ] **Step 1: Unit tests.** Run: `npm run test` — Expected: all pass (incl. new Sparkline/BulletBar/kpiSeries).
- [ ] **Step 2: Lint.** Run: `npm run lint` — Expected: no new errors vs. baseline.
- [ ] **Step 3: Production build.** Run: `npm run build` — Expected: succeeds; dashboard route compiles; Recharts not in initial chunk.
- [ ] **Step 4: Playwright/manual visual pass** using the `playwright-frontend-testing` skill. With the dev server running, load `/dashboard` (demo mode if no live API) and verify at **1440px, 900px, 390px** in **both light and dark**:
  - No horizontal page overflow at any width; bento grid reflows (4-up KPIs → 2-up → 1-up; 6+6 pairs → stacked).
  - Sticky toolbar stays pinned; period + router filters work.
  - Each section renders with data, and (force states) in loading/empty/error.
  - Device-health bullet bars show correct status colors + labels; charts render with token colors in both themes.
  - Collapsible Daily Breakdown + Interfaces open/close; selecting a day shows detail.
  - Capture before/after screenshots at each width for the PR.
- [ ] **Step 5: Report results** (paste test/lint/build output + screenshots). Do NOT push until the user has reviewed.

---

## Self-Review

**Spec coverage:**
- §5 IA (control bar, tiers) → Tasks 11, 12. ✔
- §6 desktop grid → Task 12 (exact spans). ✔
- §7 decisions: bullet bars → Tasks 4, 6; daily-view consolidation → Task 10; sparkline KPIs → Tasks 3, 5. ✔
- §8 decomposition (every file) → Tasks 1–11. ✔
- §9 responsive → Task 12 grid classes + per-section mobile layouts (preserved) + Task 13 verification. ✔
- §10 visual system (SectionCard headers, chart tokens, KPI anatomy) → Tasks 1, 2, 5, 8. ✔
- §11 accessibility (color+label, focus, `accessibilityLayer`, touch) → Tasks 4, 8, 13. ✔
- §12 performance (dynamic Recharts, CSS grid, sparkline from cached data) → Tasks 5, 8, 9, 13. ✔
- §13 testing → Tasks 3, 4, 13. ✔
- §4 preserved behavior → Task 12 Step 1 (state/effects kept verbatim). ✔

**Placeholder scan:** No TBD/TODO. Extraction steps point to exact source line ranges + show the new wrapper/interface code; pure logic shows full code.

**Type consistency:** `DateFilter`/`DATE_FILTER_OPTIONS`/`isFilterEqual`/`getPeriodLabel` defined once in `dateFilter.ts` (Task 11), imported by Toolbar + DashboardClient. Section prop signatures in each task's Produces block match the call sites in Task 12. `bulletStatus`/`sparklinePoints`/`revenueSeries`/`transactionSeries`/`userSeries` names are consistent across Tasks 3–5. Fixed a typo in the Task 4 interface sketch (canonical names: `revenueSeries`, `transactionSeries`, `userSeries`).

**Note:** `kpiSeries.ts` is created in Task 4 (with its tests) though the file lives logically with KPIs; KpiStrip (Task 5) imports it.
