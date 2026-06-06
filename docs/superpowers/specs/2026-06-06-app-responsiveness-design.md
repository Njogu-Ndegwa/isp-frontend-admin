# App-wide Responsiveness — Design Spec

- **Date:** 2026-06-06
- **Author:** Dennis (with Claude Code)
- **Status:** Draft for review
- **Scope decisions (confirmed):** Full app, all ~50 pages · Visual verification across widths · Establish a consistent responsive system (incl. layout shell) · CSS-variable sidebar↔content sync · Pinch-zoom left disabled (unchanged)

---

## 1. Problem & Goals

The admin app has a desktop view and a mobile view, but the **in-between (tablet, ~768–1024px) range is broken** and pages "don't respond" to window resizing. The **Routers page** is the worst affected.

**Goal:** Every page reflows cleanly and continuously from 320px → 1920px with no content hidden, no horizontal clipping, no cramped overlap, and sensible layouts at every width. Establish a single, documented responsive system and apply it across the whole app.

**Non-goals:** No visual redesign beyond what responsiveness requires. No functional/business-logic changes. No data-model or API changes. Pinch-zoom viewport settings stay as-is.

---

## 2. Root-cause Diagnosis

| # | Problem | Evidence | Effect |
|---|---------|----------|--------|
| 1 | **Sidebar width is decoupled from content offset.** Sidebar width is JS state (`w-16`=64px / `w-64`=256px, default *expanded*). Content offset is CSS breakpoints (`md:ml-16 lg:ml-64`). Nothing syncs them. | `CollapsibleSidebar.tsx:356,409,509`; `ClientLayout.tsx:101` | At **768–1023px** the expanded 256px sidebar overlaps content that reserves only 64px → left ~192px of every page is hidden behind the sidebar. At **≥1024px collapsed** → 192px dead gap. **Primary cause** of "router page isn't responsive / doesn't respond to resize." |
| 2 | **`overflow-x: hidden` on `html` + `body`.** | `globals.css:98,106` | Over-wide content is *clipped* rather than reflowing/scrolling → page looks frozen/broken instead of responsive. Masks the real overflow sources. |
| 3 | **Single hard breakpoint (`md`=768px)** drives sidebar, Header, MobileBottomNav, MobileSidebar, and every table↔card switch. | `CollapsibleSidebar.tsx:509` (`hidden md:flex`), `Header.tsx:58,141`, `MobileBottomNav.tsx:125`, `DataTable.tsx:72` | Nothing is tuned for the tablet band; the layout snaps once at 768px and is cramped just above it. |
| 4 | **Non-responsive grids, fixed widths, non-wrapping toolbars** scattered through pages. | e.g. `routers/page.tsx:1633` (`grid-cols-2`), `:1872` (`grid-cols-3`) | Overflow and squashing at mid widths. |

---

## 3. The Responsive System (conventions — the contract for the page sweep)

Tailwind v4 default breakpoints: `sm`=640, `md`=768, `lg`=1024, `xl`=1280, `2xl`=1536.

**Layout-band semantics:**

| Band | Width | Sidebar | Content offset | Page layout |
|------|-------|---------|----------------|-------------|
| Mobile | <768 (`base..md`) | hidden (bottom nav + drawer) | 0 | single column, cards, full-width |
| Tablet | 768–1023 (`md`) | **rail, 64px** (default) | 64px | tables appear (scrollable), 2-col grids |
| Desktop | 1024–1279 (`lg`) | **expanded, 256px** (default) | 256px | full tables, 3-col grids |
| Wide | ≥1280 (`xl`/`2xl`) | expanded | 256px | optional max-width container, 3–4 col grids |

**Rules enforced everywhere (the checklist each page is audited against):**

1. **Content offset always equals rendered sidebar width** (see §4).
2. **No bare `grid-cols-N` (N>1).** Always start at 1 (or 2 for small stat tiles) and step up: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
3. **Toolbars / filter rows / header action clusters never overflow:** use `flex-wrap` or `flex-col sm:flex-row`. Buttons may collapse labels (`hidden sm:inline`) but stay tappable (≥40px touch target).
4. **Tables:** desktop `DataTable` + mobile `MobileDataCard`, toggled at `md`. Wide/numeric tables (≥7 cols or technical data) set `scrollable` so they scroll inside their own container, never the page.
5. **Fixed pixel widths** (`w-[Npx]`, `min-w-[Npx]`, inline `style` widths) are audited; made fluid (`w-full`, `min-w-0`, `max-w-*`, `clamp()`) unless provably ≤ smallest container.
6. **`min-w-0`** on flex children that contain truncating text, so `truncate` actually works instead of forcing overflow.
7. **Modals/dialogs/bottom sheets:** `w-full max-w-* mx-4 max-h-[90vh] overflow-y-auto`; never wider than viewport.
8. **Charts** (recharts) wrapped in `ResponsiveContainer` with a fluid parent; no fixed pixel chart widths.
9. **Maps** (leaflet) given an explicit responsive height, full width.
10. **Wide content scrolls inside its container, not the page.** After overflow sources are fixed, the body-level `overflow-x: hidden` is removed (§4) so nothing is silently clipped.

**Shared primitive:** introduce a `PageContainer` wrapper (consistent max-width on wide screens + responsive horizontal padding) and apply it as pages are swept. Document the canonical grid/toolbar snippets inline in code comments where helpful.

---

## 4. Foundation Changes (Phase 1 — shared layer)

These cascade to every page; do them first and verify before the sweep.

### 4.1 Sidebar ↔ content sync (CSS-variable mechanism)

**Behavior contract:**
- `<main>` `margin-left` is always exactly the rendered sidebar width.
- Sidebar hidden below `md` → offset `0`.
- Default **rail (64px)** in `[768,1024)`, **expanded (256px)** at `≥1024`.
- Manual collapse/expand toggle overrides the default and persists (localStorage).
- Reflows **live** on window resize (no reload, no mount-only snapshot).

**Mechanism:**
- `CollapsibleSidebar` computes its effective width from `(breakpoint, collapse preference)` and writes it to a CSS custom property on `document.documentElement`: `--app-sidebar-w` (e.g. `0px` / `64px` / `256px`). Written in a layout effect keyed on breakpoint + preference, and updated on a `matchMedia`/resize listener.
- The rendered sidebar `<aside>` width uses the same computed value (single source of truth — no separate `w-16`/`w-64` that can drift).
- `ClientLayout`'s `<main>` replaces `md:ml-16 lg:ml-64` with `style={{ marginLeft: 'var(--app-sidebar-w, 0px)' }}` (plus a `transition` for smoothness). Below `md` the var is `0`.
- Collapse preference model: `'auto' | 'collapsed' | 'expanded'` (default `auto` derives from breakpoint; explicit toggle sets the other two). Keeps backward-compatible behavior while fixing the desync.

### 4.2 Overflow strategy
- Audit and fix every real horizontal-overflow source surfaced once clipping is removed (in the sweep).
- Remove `overflow-x: hidden` from `html`/`body` in `globals.css` **after** §4.1 lands and the shell verifies clean, so legitimate wide tables scroll within their `overflow-x-auto` containers and bugs become visible instead of hidden. (If a stubborn source remains, contain it locally rather than re-clipping globally.)

### 4.3 Shared components to audit/fix
- `ClientLayout` — main offset (§4.1), padding scale, `pb-nav` for bottom nav.
- `CollapsibleSidebar` — effective-width computation, breakpoint defaults, publish CSS var.
- `Header` — desktop/mobile split already exists; verify action cluster wraps; check tablet band.
- `MobileBottomNav`, `MobileSidebar` — verify drawer/nav at the md boundary; confirm `Sidebar.tsx` is dead code (remove or leave out of scope) — **verify usage first**.
- `DataTable` / `MobileDataCard` — confirm scrollable behavior and the card/table swap hold across the band.
- Modal/dialog components (`*Modal.tsx`, `ConfirmDialog`, `BottomSheet`, `DateTimePicker`, `PortalPreview`) — apply rule §3.7.

---

## 5. Page Sweep (Phase 2 — all pages)

Each page is audited against the §3 checklist and fixed. The Routers page (`app/routers/page.tsx`, 2548 lines) gets first and deepest attention.

**Page inventory (grouped):**
- **Core:** dashboard, admin, customers, customers/[id], customers/register, transactions, routers, pppoe-monitor, diagnostics, plans, plans/create, vouchers, access-credentials(+create,[id]), account-statement, walled-garden, unmatched-payments
- **Admin:** admin/leads(+[id],followups,analytics,sources), admin/resellers(+[id]), admin/subscriptions(+[id],revenue), admin/subscription-collections
- **Settings:** settings, settings/profile, settings/subscription(+payments,invoices,invoices/[id]), settings/payment-methods, settings/portal-customization
- **Store/Shop/Ads:** shop, store(+products/[id],checkout,track), advertisers, ads(+[id],analytics), ratings
- **Auth/Public:** login, signup, landing, setup

(Public/auth pages have their own layouts and no sidebar — they get a lighter responsive pass.)

---

## 6. Verification (Phase 3 — visual proof)

- Run `next dev`; drive with a headless browser (add Playwright as a devDependency).
- Authenticate via the app's **Demo Mode** so pages render with sample data without real credentials. (Confirm demo entry path during Phase 3 setup.)
- For every page, capture screenshots at **375 / 768 / 834 / 1024 / 1280** px and check: no content hidden behind sidebar, no horizontal page scroll/clip, no cramped overlap, grids/toolbars reflow, tables scroll within their container.
- Fix regressions and re-shoot until clean. Record before/after for the Routers page specifically.

---

## 7. Risks & Mitigations

- **Removing `overflow-x: hidden` exposes latent horizontal scroll.** → Remove only after the shell verifies clean; fix sources in the sweep; contain locally if needed.
- **Sidebar sync touches the most load-bearing layout.** → CSS-variable approach keeps the fixed-position architecture (low blast radius vs. a flex refactor); verify shell first before sweeping pages.
- **50-page sweep risks inconsistency.** → The §3 checklist is the shared contract; parallel agents follow it verbatim; visual verification is the backstop.
- **Demo Mode may not cover every page.** → For pages without demo data, verify layout with empty/loading states.

---

## 8. Out of Scope
- Pinch-zoom / viewport `maximumScale` (left disabled by decision).
- Visual redesign, color/theme changes, copy changes.
- Functional, data, or API changes.
