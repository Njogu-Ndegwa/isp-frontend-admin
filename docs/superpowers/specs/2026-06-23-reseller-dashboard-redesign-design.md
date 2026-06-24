# Reseller Dashboard Redesign — Design Spec

**Date:** 2026-06-23
**Status:** Approved for planning
**Scope:** Presentation-layer redesign of the reseller dashboard landing page (`app/dashboard/`). Full visual + layout overhaul, desktop-first bento grid, purpose-built mobile. Implemented in a separate git worktree.

---

## 1. Problem

`app/dashboard/DashboardClient.tsx` is a **2,172-line monolith** that renders all 14 dashboard sections as a single vertical `space-y-6` column of full-width cards. Consequences:

- **Desktop is a stretched phone layout.** Every section is full-width and stacked, so a wide screen shows one tall column with huge horizontal whitespace and endless vertical scroll. No use of the horizontal axis, no visual hierarchy (everything is the same width/weight).
- **No information architecture.** Business/revenue data and network/operations data are interleaved with no grouping, so there's no "scan in 5 seconds" overview.
- **Redundancy.** Three separate views render daily revenue: `RevenueOverTimeChart` (Recharts), the "Daily Revenue" bar-list, and the "Day breakdown" grid + day-detail panel.
- **Maintainability.** A single 2,172-line client component holds layout, ~10 section components, gauges, charts, table renderers, helpers, and a dozen inline icon components.

This is the canonical "single full-width column / wall of equal cards" anti-pattern.

## 2. Goals

1. **Kill the endless scroll on desktop** via a responsive 12-column bento grid that uses horizontal space — paired cards side-by-side, differentiated sizes, 5–7 primary widgets above the fold.
2. **Introduce information architecture**: group by domain (Revenue → Network → Traffic → Rankings → Detail), tier by priority (primary visible, secondary collapsed).
3. **Purpose-built responsive behavior** at three tiers (desktop ≥1280, tablet 768–1280, mobile <768) — the content *reflows*, it is not stretched (desktop) or squeezed (mobile).
4. **Visual refresh** within the existing token system: tighter KPI cards with sparklines, consistent compact section headers, de-cluttered charts, bullet-bar device health.
5. **Decompose the monolith** into a focused `app/dashboard/components/` folder; `DashboardClient.tsx` becomes data orchestration + grid composition.

## 3. Non-goals (explicitly out of scope)

- **No backend / API changes.** All existing endpoints, payload shapes, demo-mode data, and the `api` client stay untouched.
- **No new data.** We reorganize and restyle the data we already fetch. (KPI deltas are NOT added — see §8.)
- **No app-shell redesign.** The collapsible sidebar (`--app-sidebar-w`), `Header`, mobile bottom nav, and global theme remain. The redesign lives inside the existing shell.
- **No theme/token changes that affect other pages.** New chart-color tokens are additive; existing `--*` variables and utility classes are reused, not modified in breaking ways.
- **No removal of any data series** — redundant *views* are consolidated (§7), but every metric currently shown remains reachable.

## 4. Preserved behavior (must not regress)

The rebuild keeps all current data/runtime behavior:

- Staggered non-blocking loads (`DASHBOARD_LOAD_DELAYS_MS`) and auto-refresh intervals (MikroTik 60s, top users 60s, bandwidth 120s, stale-health retry backoff).
- Visibility-gated refresh (`isDashboardVisible()`), router-gating (most sections render only when `selectedRouterId` is set), `hasRouters` empty-state handling.
- Demo mode (`api.isDemoMode()`), GMT+3 date/time formatting (`dateUtils`), subscription alert banner + `buildSubscriptionAlert`, onboarding checklist (deferred), the period filter (`Today/3D/7D/14D/30D/This Month/Custom` + custom range).
- Per-section loading skeletons, error+retry, and empty states.
- Recharts components stay **dynamically imported with `ssr:false`** to keep them out of the route's First Load JS; the `DashboardIsland` client-only island pattern is retained.
- Both **light and dark** themes (all styling via existing CSS-var tokens).

## 5. Information architecture

Ordered top → bottom, grouped by domain, tiered by access frequency:

- **Control bar (sticky):** page title (left) · `RouterSelector` + period pills + Refresh (right). Sticks to the top of the scroll area so filters are always reachable. Subscription alert + onboarding strip render above it (unchanged conditions).
- **Tier 1 (above the fold):** KPI strip + primary revenue trend.
- **Tier 2 (visible, below the fold):** Network health, live throughput, traffic charts, ranked top-user tables.
- **Tier 3 (collapsed by default):** Daily breakdown (day list + day grid + day detail) and Network interfaces.

## 6. Desktop layout (≥1280px `xl`, 12-column grid, 24px gaps)

```
Toolbar   Dashboard ............................. [Router ▾] [Today 3D 7D 14D 30D Month Custom] ⟳

Row 1  KPIs      [ Revenue 3 ][ Transactions 3 ][ Unique Customers 3 ][ Avg Tx 3 ]   (+ sparkline)
Row 2  Revenue   [ Revenue over time ................. col-span-8 ][ Plan performance .. col-span-4 ]
Row 3  Network   [ Device health: CPU/Mem/Storage .... col-span-6 ][ Live throughput + online ... 6 ]
Row 4  Traffic   [ Download usage over time .......... col-span-6 ][ Bandwidth history .......... 6 ]
Row 5  Rankings  [ Top downloaders (live) ............ col-span-6 ][ Top users this period ...... 6 ]
Row 6  Detail    ▸ Daily breakdown (day list + grid + day detail)            (collapsible, full width)
                 ▸ Network interfaces                                        (collapsible, full width)
```

- KPI tiles: `col-span-3` each (four across). Most-important metric (Revenue) top-left per F-pattern.
- Above the fold ≈ toolbar + KPI row + start of revenue row (the 5–7 widget target).
- Content max-width capped ~1700px and centered so it doesn't sprawl on ultrawide.
- **≥1536px (`2xl`):** increase density, not whitespace — KPI strip may go to 6 tiles (`col-span-2`); Row 3 may split 4+4+4 (device health / throughput / online sessions).

## 7. Confirmed design decisions

1. **Device health: radial gauges → horizontal bullet bars.** CPU / Memory / Storage become normalized-to-% horizontal bullet bars with threshold bands (good/warn/crit), which read faster and compare better side-by-side than three radial dials. Threshold colors reuse the existing success/warning/danger tokens, reinforced with a label (never color-alone).
2. **Consolidate the three daily-revenue views.** `RevenueOverTimeChart` (Recharts) stays as the primary Tier-1 revenue trend. The "Daily Revenue" bar-list, the "Day breakdown" grid, and the day-detail panel fold into a single **collapsible "Daily breakdown"** drill-down at the bottom (Tier 3). No data is lost; clicking a day still opens its detail.
3. **KPI cards: sparkline + period label, no delta.** `getDashboardAnalytics` returns no prior-period comparison (verified: `DashboardAnalytics` has `summary`/`today`/`averages`/`dailyTrend` but no comparison field). Each KPI shows a mini **sparkline derived from `dailyTrend`** (`{date, revenue, transactions, users}`) plus the period label. No fabricated deltas; no backend change.

## 8. Component decomposition (file structure)

`DashboardClient.tsx` shrinks to: state, data-loading effects (unchanged), and JSX composing the grid from section components. New focused files under `app/dashboard/`:

```
app/dashboard/
  DashboardClient.tsx        # orchestration + grid composition (was 2172 lines → ~300–400)
  DashboardIsland.tsx        # unchanged (client-only island + skeleton)
  page.tsx                   # unchanged
  components/
    DashboardToolbar.tsx     # sticky title + RouterSelector + period pills + custom range + Refresh
    KpiStrip.tsx             # 4 KPI tiles (Revenue/Transactions/Customers/Avg Tx) + Sparkline
    Sparkline.tsx            # tiny inline SVG sparkline from a number series
    RevenueSection.tsx       # wraps RevenueOverTimeChart in the new SectionCard
    PlanPerformance.tsx      # extracted PlanPerformanceList
    NetworkHealthCard.tsx    # bullet-bar CPU/Mem/Storage + system summary + status badge
    BulletBar.tsx            # reusable horizontal bullet/threshold bar
    LiveThroughputCard.tsx   # live download/upload meters + active hotspot/pppoe "online now"
    DownloadUsageSection.tsx # service+period filters + totals + DownloadUsageChart
    BandwidthSection.tsx     # peak/avg stats + BandwidthChart
    TopDownloaders.tsx       # live top users table/cards (extracted TopUsersSection)
    TopUsageThisPeriod.tsx   # monthly FUP usage table/cards (extracted TopUsageThisMonthSection)
    DailyBreakdown.tsx       # collapsible: daily list + day grid + day detail (DailyTrend/DayCard/DayDetail)
    SectionCard.tsx          # shared card wrapper: accent bar + title + meta + inline controls + states
    icons.tsx                # shared icon components (moved out of DashboardClient)
```

- `SectionCard` standardizes the header pattern (accent bar + title + right-aligned meta/controls) and the loading/error/empty wrappers, removing the repeated big-icon-in-rounded-box that wastes vertical space.
- The existing Recharts components (`RevenueOverTimeChart`, `BandwidthChart`, `DownloadUsageChart`) are reused; only their styling/props are touched for the chart refresh (§10).
- Grid spans live in `DashboardClient.tsx` via Tailwind classes (`col-span-12 md:col-span-6 xl:col-span-3` etc.), not hard-coded inside section components, so sections stay layout-agnostic and reusable.

## 9. Responsive behavior

Mobile-first Tailwind, desktop-first design. Breakpoints: `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536.

- **Tablet (768–1280, `md`/`lg`):** KPIs 2×2; every Row 2–5 `6+6`/`8+4` pair collapses to full-width stacked. Sidebar is the 64px rail.
- **Mobile (<768):** single column in **priority order**: KPIs (1- or 2-up) → (if router selected) compact "online now + live throughput" → revenue trend → top users this period → top downloaders → traffic charts → daily breakdown (collapsed) → interfaces (collapsed). Tables remain card-ized (already implemented). Period filter is a horizontally-scrollable strip. Touch targets ≥44px. Sidebar = drawer; bottom nav unchanged.
- KPI strip uses explicit responsive columns (`grid-cols-2 lg:grid-cols-4`) for the four fixed tiles; the `auto-fit`/`minmax` reflow pattern is reserved for the optional 6-tile `2xl` variant (§6).

## 10. Visual system

All within existing tokens (amber accent, `--background*`, `--foreground*`, success/warning/danger/info/cyan, `.card`, `.badge-*`, `.period-pill`, `.stat-value`).

- **KPI cards:** anatomy = short label → large `stat-value` number → period label → inline sparkline. Built on the existing `StatCard` look (drop the unused `trend` prop path or feed it only when real data exists — here it stays unused).
- **Section headers:** consistent compact `SectionCard` header (1.5px accent bar + title + muted meta + optional inline pills), replacing per-section 40px icon tiles.
- **Charts:** add a small set of **additive chart-color CSS variables** (de-saturated, colorblind-aware — blue/orange/green/violet family) consumed by the Recharts components; **stacking off** where individual series must be read (bandwidth in/out); lighter gridlines; prefer direct labels over legends; set `accessibilityLayer` on Recharts charts. No change to existing token values used elsewhere.
- **Spacing:** 12-col grid `gap-6` (desktop) / `gap-4` (mobile); consistent card padding; 8/12/16px radii already in tokens.
- **States:** each `SectionCard` keeps skeleton / error+retry / empty variants matching current behavior.

## 11. Accessibility

- Color never the sole signal (bullet-bar status + label/icon; KPI trends if any get arrow + text).
- Maintain WCAG focus-visible outlines (already in `globals.css`) on all interactive controls; keyboard-operable collapsibles (`<details>`/button-driven).
- Touch targets ≥44px on mobile; chart tooltips reachable; `accessibilityLayer` on Recharts.
- Contrast: chart text ≥4.5:1, meaningful graphics ≥3:1, on both themes.

## 12. Performance

- Keep Recharts dynamically imported (`ssr:false`) and the client-only island; no new heavy dependencies.
- Grid is pure CSS (no JS layout). Sparklines are tiny inline SVG from already-fetched data (no extra requests).
- Collapsed Tier-3 sections can defer rendering their heavy contents until expanded.

## 13. Testing & verification

- Existing Vitest unit tests (`app/lib/__tests__`) must still pass; add unit tests for new pure helpers (`Sparkline` path math, `BulletBar` threshold→color, KPI series extraction).
- Playwright/manual verification of the dashboard at three widths (≈1440, ≈900, ≈390) in **both light and dark** themes: layout reflows correctly, no horizontal overflow, all sections render with data + in loading/empty/error states, sticky toolbar works, collapsibles open/close, demo mode renders.
- `npm run lint` clean for changed files (respecting the existing baseline).

## 14. Risks & mitigations

- **Regression in data/refresh logic** while extracting components → move the loading effects verbatim into `DashboardClient.tsx`; extract *presentation* only. Verify auto-refresh + stagger still fire.
- **Grid overflow from long strings/numbers** → `min-w-0` on grid items, tabular-nums, truncation where needed.
- **Chart color tokens leaking into other pages** → additive variables namespaced for charts; do not alter existing token values.
- **Scope creep into the app shell or backend** → explicitly out of scope (§3).
- **Large diff / hard review** → decomposition lands as discrete files; implement section-by-section behind the new grid so each is independently verifiable.

## 15. Implementation note

Implementation happens in a **separate git worktree** (per the request), created during the planning/execution phase via the using-git-worktrees workflow. This spec is the input to the implementation plan (writing-plans).
