# App-wide Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every page reflow cleanly from 320px→1920px with no hidden content, no horizontal clipping, and sensible layouts at every width — by fixing the sidebar/content desync, removing the overflow clip, and applying one consistent responsive convention across all ~50 pages.

**Architecture:** A CSS custom property (`--app-sidebar-w`) becomes the single source of truth for sidebar width; `<main>` consumes it so the content offset can never desync. The global `overflow-x: hidden` clip is removed so real overflow becomes visible and fixable. A Playwright harness asserts "no horizontal page overflow" for every page × width — this is the automated red/green gate (layout has no meaningful unit test; the overflow invariant is the test).

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4 (CSS `@theme`, default breakpoints sm640/md768/lg1024/xl1280), Playwright (added here).

**Conventions reference:** `docs/superpowers/specs/2026-06-06-app-responsiveness-design.md` §3 is the per-page checklist. Read it before Phase 2.

---

## File Structure

**Created:**
- `playwright.config.ts` — Playwright runner + dev-server wiring
- `e2e/pages.ts` — page inventory + width list (shared by harness)
- `e2e/responsive.spec.ts` — overflow assertion + screenshot capture per page × width
- `app/components/PageContainer.tsx` — optional max-width/padding wrapper (applied only where wide content over-stretches)

**Modified (foundation):**
- `app/globals.css` — add `--app-sidebar-w` responsive defaults; remove `html`/`body` `overflow-x: hidden`
- `app/components/CollapsibleSidebar.tsx` — breakpoint detection + collapse-preference model + publish CSS var; width/content from effective state
- `app/components/ClientLayout.tsx` — `<main>` consumes `--app-sidebar-w`; remove `md:ml-16 lg:ml-64`
- `app/components/Header.tsx`, `MobileBottomNav.tsx`, `MobileSidebar.tsx` — band audit (minor)
- `app/components/DataTable.tsx`, `MobileDataCard.tsx` — confirm scrollable/swap holds
- `package.json` — `test:e2e` script
- **Removed:** `app/components/Sidebar.tsx` (confirmed dead code — no imports)

**Modified (sweep):** every page under `app/**/page.tsx` per the §3 checklist (Phase 2 inventory).

---

## Phase 0 — Verification harness (establishes red/green)

### Task 0.1: Install Playwright

- [ ] **Step 1: Install**

Run:
```bash
npm i -D @playwright/test
npx playwright install chromium
```
Expected: `@playwright/test` in devDependencies; Chromium downloaded.

- [ ] **Step 2: Add script to `package.json`**

Add to `"scripts"`:
```json
"test:e2e": "playwright test"
```

- [ ] **Step 3: Commit**
```bash
git add package.json package-lock.json
git commit -m "test: add Playwright for responsive verification"
```

### Task 0.2: Harness config + page inventory + spec

**Files:** Create `playwright.config.ts`, `e2e/pages.ts`, `e2e/responsive.spec.ts`

- [ ] **Step 1: `playwright.config.ts`**
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2: `e2e/pages.ts`**
```ts
export const WIDTHS = [375, 768, 834, 1024, 1280];

// Reseller demo user can reach these (role: 'reseller')
export const RESELLER_PAGES = [
  '/dashboard', '/customers', '/customers/register', '/transactions',
  '/routers', '/pppoe-monitor', '/diagnostics', '/plans', '/plans/create',
  '/vouchers', '/access-credentials', '/access-credentials/create',
  '/account-statement', '/walled-garden', '/unmatched-payments',
  '/settings', '/settings/profile', '/settings/subscription',
  '/settings/subscription/payments', '/settings/subscription/invoices',
  '/settings/payment-methods', '/settings/portal-customization',
];

// Admin demo user required (role: 'admin')
export const ADMIN_PAGES = [
  '/admin', '/admin/leads', '/admin/leads/followups', '/admin/leads/analytics',
  '/admin/leads/sources', '/admin/resellers', '/admin/subscriptions',
  '/admin/subscriptions/revenue', '/admin/subscription-collections', '/shop',
];

// Public pages (own layouts, no sidebar) — lighter pass
export const PUBLIC_PAGES = ['/login', '/signup', '/landing'];
```

- [ ] **Step 3: `e2e/responsive.spec.ts`**
```ts
import { test, expect } from '@playwright/test';
import { WIDTHS, RESELLER_PAGES, ADMIN_PAGES, PUBLIC_PAGES } from './pages';

function demoInit(role: 'reseller' | 'admin') {
  const user = {
    id: 0, email: 'demo@bitwave.co.ke', role,
    organization_name: 'Demo ISP Network', subscription_status: 'trial',
  };
  return `
    localStorage.setItem('demo_mode','true');
    localStorage.setItem('auth_token','demo-token');
    localStorage.setItem('auth_user', ${JSON.stringify(JSON.stringify(user))});
  `;
}

async function checkPage(page: import('@playwright/test').Page, role: 'reseller'|'admin'|null, path: string, width: number) {
  if (role) await page.addInitScript(demoInit(role));
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600); // settle async data/empty states
  const { scrollW, clientW } = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  await page.screenshot({
    path: `e2e/screens/${role ?? 'public'}${path.replace(/\//g, '_')}-${width}.png`,
    fullPage: true,
  });
  expect(scrollW, `horizontal overflow on ${path} @ ${width}px (scrollW ${scrollW} > clientW ${clientW})`)
    .toBeLessThanOrEqual(clientW + 1);
}

for (const path of RESELLER_PAGES) for (const w of WIDTHS) {
  test(`reseller ${path} @ ${w}`, async ({ page }) => checkPage(page, 'reseller', path, w));
}
for (const path of ADMIN_PAGES) for (const w of WIDTHS) {
  test(`admin ${path} @ ${w}`, async ({ page }) => checkPage(page, 'admin', path, w));
}
for (const path of PUBLIC_PAGES) for (const w of WIDTHS) {
  test(`public ${path} @ ${w}`, async ({ page }) => checkPage(page, null, path, w));
}
```

- [ ] **Step 4: Commit**
```bash
git add playwright.config.ts e2e/pages.ts e2e/responsive.spec.ts
git commit -m "test: responsive overflow harness across pages and widths"
```

### Task 0.3: Capture RED baseline

- [ ] **Step 1: Run the harness**

Run: `npm run test:e2e`
Expected: **failures** — especially at 768/834px (tablet band) and on `/routers`, due to the sidebar overlap and overflow clip. Note which page×width combos fail; these are the targets. (Screenshots land in `e2e/screens/`.)

- [ ] **Step 2: Record the baseline failures** in the PR description / a scratch note. Do not commit screenshots (add `e2e/screens/` to `.gitignore`).
```bash
echo "e2e/screens/" >> .gitignore
git add .gitignore && git commit -m "chore: ignore e2e screenshots"
```

> Note: in demo mode without a backend, data fetches may fail and pages render empty/error/loading states. That is fine — the overflow invariant and layout reflow are data-independent. Verify whatever state renders.

---

## Phase 1 — Foundation (shared layer)

### Task 1.1: CSS-variable sidebar-width defaults

**Files:** Modify `app/globals.css`

- [ ] **Step 1:** Immediately after the `:root { … }` light-mode block (around line 37), add the responsive default for the sidebar width. This is the pre-hydration / `auto` fallback (inline style set by JS later overrides it):
```css
/* Sidebar width single-source-of-truth (JS overrides via inline style on <html>) */
:root { --app-sidebar-w: 0px; }
@media (min-width: 768px) { :root { --app-sidebar-w: 64px; } }
@media (min-width: 1024px) { :root { --app-sidebar-w: 256px; } }
```

- [ ] **Step 2: Commit**
```bash
git add app/globals.css
git commit -m "feat(layout): add --app-sidebar-w responsive defaults"
```

### Task 1.2: CollapsibleSidebar — breakpoint + preference + publish var

**Files:** Modify `app/components/CollapsibleSidebar.tsx`

- [ ] **Step 1:** Replace the collapse state block (currently `const [isCollapsed, setIsCollapsed] = useState(false);` at line 356 and the two persistence effects around lines 360–374) with the preference + breakpoint model:
```tsx
type CollapsePref = 'auto' | 'collapsed' | 'expanded';
const STORAGE_KEY_PREF = 'sidebarCollapsePref';

// ...inside the component, replacing the old isCollapsed state:
const [pref, setPref] = useState<CollapsePref>('auto');
const [bp, setBp] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
  if (typeof window === 'undefined') return 'desktop';
  if (window.matchMedia('(min-width: 1024px)').matches) return 'desktop';
  if (window.matchMedia('(min-width: 768px)').matches) return 'tablet';
  return 'mobile';
});

// Load preference (migrate legacy boolean key)
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY_PREF) as CollapsePref | null;
  if (saved === 'auto' || saved === 'collapsed' || saved === 'expanded') {
    setPref(saved);
    return;
  }
  const legacy = localStorage.getItem(STORAGE_KEY_COLLAPSED); // 'true' | 'false'
  if (legacy === 'true') setPref('collapsed');
  else if (legacy === 'false') setPref('expanded');
  // else remains 'auto'
}, []);

useEffect(() => {
  localStorage.setItem(STORAGE_KEY_PREF, pref);
}, [pref]);

// Track breakpoint live
useEffect(() => {
  const md = window.matchMedia('(min-width: 768px)');
  const lg = window.matchMedia('(min-width: 1024px)');
  const update = () => setBp(lg.matches ? 'desktop' : md.matches ? 'tablet' : 'mobile');
  update();
  md.addEventListener('change', update);
  lg.addEventListener('change', update);
  return () => {
    md.removeEventListener('change', update);
    lg.removeEventListener('change', update);
  };
}, []);

const effectiveCollapsed = pref === 'auto' ? bp === 'tablet' : pref === 'collapsed';
const sidebarWidthPx = bp === 'mobile' ? 0 : effectiveCollapsed ? 64 : 256;

// Publish the single source of truth
useEffect(() => {
  document.documentElement.style.setProperty('--app-sidebar-w', `${sidebarWidthPx}px`);
}, [sidebarWidthPx]);
```

- [ ] **Step 2:** Keep `STORAGE_KEY_COLLAPSED` constant defined (used for migration). Replace every remaining use of `isCollapsed` in render with `effectiveCollapsed`. Specifically:
  - line ~409 `const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';` → `effectiveCollapsed ? 'w-16' : 'w-64';`
  - `renderNavItem`, `renderGroup`, logo/toggle/footer blocks: `isCollapsed` → `effectiveCollapsed`.

- [ ] **Step 3:** Update the toggle button (line ~527) to set an explicit preference:
```tsx
onClick={() => setPref(effectiveCollapsed ? 'expanded' : 'collapsed')}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `isCollapsed`.

- [ ] **Step 5: Commit**
```bash
git add app/components/CollapsibleSidebar.tsx
git commit -m "feat(layout): sidebar publishes effective width to --app-sidebar-w"
```

### Task 1.3: ClientLayout main consumes the variable

**Files:** Modify `app/components/ClientLayout.tsx:101`

- [ ] **Step 1:** Replace the authed `<main>` opening tag:
```tsx
<main
  className="min-h-screen p-4 md:p-8 pb-24 md:pb-8 transition-[margin] duration-300 ease-in-out"
  style={{ marginLeft: 'var(--app-sidebar-w, 0px)' }}
>
```
(Removes `md:ml-16 lg:ml-64`; below `md` the variable is `0`, so content is full-width with the bottom nav.)

- [ ] **Step 2: Verify shell manually**

Run `npm run dev`, open `/dashboard`, and drag the window from 1400→700→400px. Expected: content offset tracks the sidebar with no overlap and no dead gap; at <768 the sidebar disappears and content is full-width; collapsing/expanding the sidebar moves content in lockstep.

- [ ] **Step 3: Commit**
```bash
git add app/components/ClientLayout.tsx
git commit -m "feat(layout): main offset tracks --app-sidebar-w (fixes tablet overlap)"
```

### Task 1.4: Remove the overflow clip

**Files:** Modify `app/globals.css:96-108`

- [ ] **Step 1:** Remove `overflow-x: hidden;` from both the `html` and `body` rules. Leave `scroll-behavior`, `min-height`, fonts, etc. intact.

- [ ] **Step 2: Re-run harness to surface real overflow**

Run: `npm run test:e2e`
Expected: the tablet-band/sidebar failures from Task 0.3 are **resolved**; any remaining failures are genuine per-page overflow sources (targets for Phase 2). Record them.

- [ ] **Step 3: Commit**
```bash
git add app/globals.css
git commit -m "fix(layout): stop clipping horizontal overflow so it can be fixed properly"
```

### Task 1.5: Shared component band audit

**Files:** Modify `app/components/Header.tsx`, `MobileBottomNav.tsx`, `MobileSidebar.tsx` as needed

- [ ] **Step 1:** `Header.tsx` desktop header action cluster (line ~164 `flex items-center gap-3 flex-shrink-0`): confirm it doesn't overflow when `action` is wide at the 768–1024 band. If it can, add `flex-wrap` to the outer `flex items-start justify-between` row (line ~142) and `min-w-0` to the title block. Apply only if the harness/manual check shows overflow.

- [ ] **Step 2:** `MobileBottomNav.tsx` / `MobileSidebar.tsx`: confirm they remain `md:hidden`/drawer-only and don't appear in the tablet band. No change expected; verify via the 768px screenshot.

- [ ] **Step 3: Commit (if changed)**
```bash
git add app/components/Header.tsx app/components/MobileBottomNav.tsx app/components/MobileSidebar.tsx
git commit -m "fix(layout): tablet-band audit of header and mobile nav"
```

### Task 1.6: DataTable / MobileDataCard confirmation

**Files:** Inspect `app/components/DataTable.tsx`, `MobileDataCard.tsx`

- [ ] **Step 1:** Confirm `DataTable` default `hidden md:block` + inner `overflow-x-auto` keeps wide tables scrolling *inside the card* (not the page) at 768px. With the overflow clip gone, a `scrollable` table must not push the page wide. If a non-`scrollable` table overflows at 768, switch that page's table to `scrollable` in Phase 2 (per-page decision, not here).

- [ ] **Step 2:** No code change expected in these components; if a structural fix is needed (e.g., the inner scroll container needs `max-w-full`), apply and commit:
```bash
git add app/components/DataTable.tsx app/components/MobileDataCard.tsx
git commit -m "fix(layout): ensure data table scroll is contained"
```

### Task 1.7: PageContainer primitive (optional, used in sweep)

**Files:** Create `app/components/PageContainer.tsx`

- [ ] **Step 1:**
```tsx
export default function PageContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`w-full max-w-[1600px] mx-auto ${className}`}>{children}</div>;
}
```
Applied in Phase 2 **only** on pages whose content visibly over-stretches on wide screens. Not forced app-wide.

- [ ] **Step 2: Commit**
```bash
git add app/components/PageContainer.tsx
git commit -m "feat(layout): add PageContainer max-width wrapper"
```

### Task 1.8: Remove dead Sidebar.tsx

**Files:** Delete `app/components/Sidebar.tsx`

- [ ] **Step 1:** Re-confirm no imports: `git grep -n "components/Sidebar'" app` returns nothing (only `MobileSidebar` is used). Delete the file.

- [ ] **Step 2: Typecheck + commit**
```bash
npx tsc --noEmit
git rm app/components/Sidebar.tsx
git commit -m "chore: remove unused Sidebar component"
```

---

## Phase 2 — Page sweep (all pages)

### Sweep Procedure (apply to every page task below)

For each page file, audit against the spec §3 checklist and fix:

1. **Grids:** replace any bare `grid-cols-N` (N>1) with `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N` (use 2 as the base only for small stat tiles).
2. **Toolbars / header actions / filter rows:** ensure `flex-wrap` or `flex-col sm:flex-row`; never a fixed horizontal row that can overflow. Collapse button labels with `hidden sm:inline` where space-tight; keep ≥40px touch targets.
3. **Fixed widths:** audit `w-[Npx]`, `min-w-[Npx]`, inline `style` widths; make fluid (`w-full`, `min-w-0`, `max-w-*`, `clamp()`) unless provably ≤ smallest container.
4. **Truncation:** add `min-w-0` to flex children wrapping `truncate` text.
5. **Tables:** desktop `DataTable` + mobile `MobileDataCard`; wide/numeric tables set `scrollable`.
6. **Modals/sheets on the page:** `w-full max-w-* mx-4 max-h-[90vh] overflow-y-auto`.
7. **Charts:** wrapped in recharts `ResponsiveContainer` with a fluid parent; no fixed pixel chart width.
8. **Maps:** explicit responsive height, full width.
9. **Wide content:** scrolls inside its own container, never the page.

**Per-page verification (the test):**
- Run the harness filtered to the page, e.g.: `npx playwright test -g "/routers"`
- Expected: PASS at all widths (no horizontal overflow). Eyeball the `e2e/screens/*<page>*` screenshots for cramping/overlap at 768 and 834.
- Commit per page (or per small group): `git commit -m "fix(responsive): <page>"`.

### Task 2.1: Routers page (deep — worst offender)

**Files:** `app/routers/page.tsx`

- [ ] **Step 1:** Apply the Sweep Procedure. Known specific targets:
  - line ~1633 `grid grid-cols-2 gap-2` → `grid grid-cols-1 sm:grid-cols-2 gap-2`
  - line ~1872 `grid grid-cols-3 gap-4` → `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
  - line ~726 already responsive (`grid-cols-2 sm:grid-cols-4 lg:grid-cols-6`) — verify it doesn't overflow at 768.
  - Audit the modals (`AddRouterModal`, `EditRouterModal`, `PortConfigModal`, `NewTokenModal`) for rule 6, and the `min-w-[100px]`/`min-w-[130px]` dropdowns (lines ~2114, ~2124) for rule 3.
  - Verify the `hidden md:block` detail panel (line ~1000) and DataTable both behave at 768–834.
- [ ] **Step 2:** Run `npx playwright test -g "/routers"` → PASS at 375/768/834/1024/1280. Review screenshots.
- [ ] **Step 3:** Commit `fix(responsive): routers page reflow`.

### Task 2.2 … 2.N: Remaining pages

Apply the Sweep Procedure + per-page verification, one commit per page (group trivial ones). Inventory (from the spec §5):

- **Core:** `/dashboard`, `/admin` (admin dashboard), `/customers`, `/customers/[id]`, `/customers/register`, `/transactions`, `/pppoe-monitor`, `/diagnostics`, `/plans`, `/plans/create`, `/vouchers`, `/access-credentials`, `/access-credentials/create`, `/access-credentials/[id]`, `/account-statement`, `/walled-garden`, `/unmatched-payments`
- **Admin:** `/admin/leads`, `/admin/leads/[id]`, `/admin/leads/followups`, `/admin/leads/analytics`, `/admin/leads/sources`, `/admin/resellers`, `/admin/resellers/[id]`, `/admin/subscriptions`, `/admin/subscriptions/[id]`, `/admin/subscriptions/revenue`, `/admin/subscription-collections`
- **Settings:** `/settings`, `/settings/profile`, `/settings/subscription`, `/settings/subscription/payments`, `/settings/subscription/invoices`, `/settings/subscription/invoices/[id]`, `/settings/payment-methods`, `/settings/portal-customization`
- **Store/Shop/Ads:** `/shop`, `/store`, `/store/products/[id]`, `/store/checkout`, `/store/track`, `/advertisers`, `/ads`, `/ads/[id]`, `/ads/analytics`, `/ratings`
- **Auth/Public:** `/login`, `/signup`, `/landing`, `/setup` (lighter pass — own layouts, no sidebar)

Dynamic `[id]` pages: verify via one representative id reachable in demo mode, or with the empty/loading state if no demo data; the overflow invariant still applies.

---

## Phase 3 — Final verification

### Task 3.1: Full-suite green + screenshot review

- [ ] **Step 1:** Run the entire harness: `npm run test:e2e`. Expected: **all PASS** (no horizontal overflow on any page × width).
- [ ] **Step 2:** Review `e2e/screens/` for the router page and a sample of each group at 768 and 834px: confirm no cramping, no overlap, grids/toolbars reflowed, tables scroll within their container.
- [ ] **Step 3:** Build sanity: `npm run build`. Expected: success.
- [ ] **Step 4:** Final commit / ready for review:
```bash
git commit -am "test: full responsive suite green" --allow-empty
```

### Task 3.2: Finish the branch
- [ ] Use superpowers:finishing-a-development-branch to choose merge/PR.

---

## Self-Review notes (author)
- **Spec coverage:** §2 diagnosis → Tasks 1.1–1.4; §3 conventions → Sweep Procedure + per-page tasks; §4 foundation → Phase 1; §5 inventory → Phase 2; §6 verification → Phase 0 + Phase 3. All covered.
- **No placeholders:** all code blocks are concrete; demo-auth uses the real `DEMO_USER` shape; admin pages use a `role:'admin'` variant.
- **Type consistency:** `CollapsePref`, `pref`, `bp`, `effectiveCollapsed`, `sidebarWidthPx`, `--app-sidebar-w` used consistently across Tasks 1.1–1.3.
- **Layout-has-no-unit-test:** the Playwright overflow invariant is the automated gate; visual screenshots are the human gate. This is the honest substitute for Red-Green on CSS.
