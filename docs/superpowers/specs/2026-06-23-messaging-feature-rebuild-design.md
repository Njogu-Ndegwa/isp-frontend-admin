# Messaging Feature Rebuild — Design

**Date:** 2026-06-23
**Author:** Dennis (with Claude)
**Status:** Approved (design), pending implementation
**Repos:** `isp-billing-admin` (Next.js frontend), `isp-billing` (FastAPI backend) — both worked in isolated worktrees on branch `worktree-messaging-rebuild`.

## Problem

The SMS messaging feature works at the data layer but fails the user at the UI/UX layer:

1. **Cannot message specific people.** The reseller Send screen only offers four canned filters (All / Active / Expiring / By plan). There is no way to pick an individual customer or a hand-built list — even though the backend `POST /api/messaging/send` already accepts a `customer_ids[]` array.
2. **No visible send status.** After sending you get a toast, then must navigate History → click a campaign → a static modal that loads once. Sends dispatch in a background task (`queued → sent/failed`, campaign finalizes `completed/partial/failed`) but the UI never reflects this live.
3. **Credit accounting is invisible.** Server-side credits are correct — reserve `segments × recipients`, deduct, then refund every failed recipient, all recorded in `sms_credit_transactions`. None of that ledger is exposed, so the user cannot verify batch math.
4. **Design.** The reseller and admin pages feel disjointed and the user is not satisfied with them.

The system is **used mostly on mobile phones**, so the rebuild is **mobile-first**.

## Goals

- Rebuild both messaging surfaces (reseller `app/messaging`, admin `app/admin/messaging`) with one consistent, mobile-first design.
- Reseller can target an audience by **mode** (All / Active / Expiring / By plan / Specific people) and **refine the exact recipient set** (search, select-all, select-none, per-person tick/untick, chips).
- Reseller sees **live send status** immediately after sending and can drill into per-recipient delivery (who got it, who failed, why), filterable by status.
- Reseller sees a **credit ledger** — balance plus every movement (purchase, send debit, refund, admin adjustment).
- Admin can broadcast to **specific resellers** (multi-select) or all, unified visual design, and view a reseller's credit ledger.

## Non-Goals

- No delivery-receipt (DLR) webhook. The provider (TalkSASA) returns synchronous send results only; realistic statuses remain `queued / sent / failed`. `delivered` is shown if the provider reports it but is not actively polled.
- No message scheduling (future enhancement; out of scope).
- No new database tables or migrations — all required columns/tables already exist.
- No changes to M-Pesa credit purchase flow (works correctly).

## Architecture

Two repos, each in its own worktree on branch `worktree-messaging-rebuild`.

### Backend (`isp-billing`) — additive route/service changes only

**1. `resolve_recipients()` + `GET /api/messaging/recipients`** (`sms_dispatch.py`, `messaging_routes.py`)
- Include customer **`name`** in each recipient row: `{customer_id, name, phone}`.
- New optional `search` query param — case-insensitive substring match on `Customer.name` OR `Customer.phone`. Powers the "Specific people" picker.
- New optional `exclude_customer_ids` — used with a segment filter to express "whole segment minus a few deselected."
- Add `limit` (default 50) + `offset` for paged picker display; response gains `has_more`. `count` remains the **true total** for the current filter/search (post phone-dedup), so the cost preview stays accurate.

**2. `POST /api/messaging/send`** (`messaging_routes.py`)
- Accept `exclude_customer_ids[]` alongside existing `customer_ids[]` / `filter` / `plan_id`.
- Recipient resolution precedence: explicit `customer_ids` → else `filter` (+ `plan_id`) minus `exclude_customer_ids`. (Mirrors the three UI states: hand-picked / segment untouched / segment refined.)
- Credit reserve/deduct/refund logic unchanged.

**3. New `GET /api/messaging/credits/ledger`** (`messaging_routes.py`)
- Reseller-scoped list of `SmsCreditTransaction`, newest first, paginated (`limit`/`offset`).
- Row: `{id, kind, change, balance_after, reference, note, created_at}`. `kind ∈ {purchase, send_debit, refund, admin_adjustment}`.

**4. `GET /api/messaging/campaigns/{id}`** (campaign detail)
- Add customer **`name`** to each message row (LEFT JOIN `Customer`), so Activity per-recipient view shows names.
- Add a `counts` summary `{total, sent, failed, queued, delivered}` for the status-filter tabs.

**5. Admin broadcast `POST /api/admin/messaging/inbox`** (`admin_messaging_routes.py`)
- Replace `recipient: str` with `{reseller_ids: int[] | null, all_resellers: bool}` (multi-select specific resellers OR all). Keep the inbox-message + optional-SMS behavior and the `also_sms` billing note.

**6. New `GET /api/admin/messaging/resellers/{id}/ledger`** (`admin_messaging_routes.py`)
- Admin view of a reseller's `SmsCreditTransaction` (same shape as #3). Lets admin audit the credit math behind credit sales.

No model changes. No migrations.

### Frontend (`isp-billing-admin`)

**Reseller — `app/messaging/` (rewrite `MessagingClient.tsx` into focused components):**
- `MessagingPage` — section nav (Compose · Activity · Templates · Credits), balance chip in header, role/enabled guards (unchanged behavior).
- `ComposeView` — recipient picker + message editor (template load/save, segment counter) + live cost summary + sticky send bar + phone preview.
- `RecipientPicker` — the audience model. Mode pills; for each mode a checkable, searchable list with select-all / select-none and per-row tick; selections render as removable chips. On mobile it opens as a **full-height bottom sheet**. Emits the send descriptor: `{filter, plan_id}` (segment untouched) | `{filter, plan_id, exclude_customer_ids}` (segment refined) | `{customer_ids}` (specific people).
- `ActivityView` — summary stat cards (Sent 30d / Failed / In progress / Refunded, computed client-side from the campaigns list); campaign cards with status badge + counts; **polls** `getSmsCampaign`/campaigns every ~4s while any campaign is `queued`/`sending`, stops when settled; tap a card → per-recipient sheet with All / Sent / Failed status tabs + error reasons.
- `CreditsView` — balance + total purchased + net spent; buy bundles + custom quantity (existing `BuySmsCreditsModal`); **ledger** list.
- `TemplatesView` — refined version of existing templates CRUD.

**Admin — `app/admin/messaging/` (rewrite `AdminMessagingClient.tsx`):**
- Same visual system. Tabs: Settings · Credit sales · Message resellers · SMS history.
- "Message resellers" gains a **multi-select reseller picker** (same pattern as the reseller customer picker, reseller entities) + all-resellers toggle.
- Credit sales: per-reseller **ledger** drill-in (via new admin ledger endpoint) alongside the existing orders table + manual adjust.

**Shared:**
- `app/lib/api.ts` — update `getSmsRecipients` (search/limit/offset/exclude), add `getSmsCreditLedger`, enhanced `getSmsCampaign` type, `sendInboxMessage` multi-select, `getAdminResellerLedger`.
- `app/lib/types.ts` — `SmsRecipient.name`; `SmsCreditTransaction` + ledger response; campaign detail message `name` + `counts`; admin broadcast request shape.
- Reuse existing primitives: `Tabs`, `Header`, `LoadingSpinner`, `BuySmsCreditsModal`, the `calcSegments` GSM-7 helper, `AlertContext`, `AuthContext`.

### Data flow (send → status → credits)

1. Compose resolves a send descriptor; cost preview = `calcSegments(body).segments × selectedCount`.
2. `POST /send` resolves recipients, reserves `total` credits (`try_deduct`, ledger `send_debit`), creates `SmsCampaign` (`queued`) + per-recipient `SmsMessage` rows, returns `{campaign_id, recipient_count, credits_reserved}`. UI shows it immediately in Activity as `sending`.
3. Background `dispatch_campaign` sends in chunks; per chunk persists `sent/failed`, refunds failed credits (ledger `refund`), finalizes campaign `completed/partial/failed`.
4. Activity polls campaign detail until settled; Credits ledger reflects the debit and any refunds.

## Mobile-first principles

- Single column; mode pills horizontal-scroll; recipient picker is a full-height sheet with 44px+ tap targets.
- **Sticky bottom send bar** (cost + Send) above the app's bottom nav, `env(safe-area-inset-bottom)` aware.
- Activity/Credits use stacked cards on mobile, tables only at `lg+`.
- Desktop widens Compose into the two-column (compose + sticky cost sidebar) layout.

## Error handling

- Insufficient credits: cost panel turns red with shortfall + "Buy" shortcut; send disabled. Backend re-checks and returns 400 with `{required, balance, shortfall}`.
- Empty recipient set: send disabled; backend returns 400 "No recipients matched".
- Network/provider failure during dispatch: messages marked `failed` with provider error, credits refunded, campaign `partial`/`failed` — all visible in Activity.
- Polling backs off/stops on error and offers manual refresh.

## Testing

- **Backend (TDD, pytest):** extend `tests/test_messaging_routes.py`, `test_messaging_dispatch.py`, `test_admin_messaging_routes.py`:
  - recipients with `search`, `exclude_customer_ids`, `name` in payload, paging + accurate `count`.
  - send with `exclude_customer_ids` resolves correct set and charges matching credits.
  - ledger endpoint returns transactions scoped to the reseller, newest first.
  - campaign detail includes names + counts.
  - admin broadcast multi-select resellers; admin reseller ledger.
- **Frontend:** `npm run build` + `npm run lint` clean (relative to baseline); `npm test` (vitest); Playwright smoke of the compose→send→activity flow; manual mobile-viewport verification.

## Rollout

- Each repo: branch `worktree-messaging-rebuild` in a worktree; PR per repo. Frontend depends on backend endpoints, so backend merges/deploys first (or both behind the already-existing `enabled` settings flag).
