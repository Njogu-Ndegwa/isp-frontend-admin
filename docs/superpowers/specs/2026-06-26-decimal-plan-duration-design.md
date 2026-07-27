# Decimal plan duration entry (frontend-only)

**Date:** 2026-06-26
**Branch / worktree:** `worktree-decimal-plan-values`
**Status:** Approved, implementing

## Problem

Admins want to create plans with decimal values, e.g. **2.5 Mbps** speed or
**1.5 hours** duration. Today this is blocked in the admin UI.

## Investigation findings

- **Speed decimals already work end-to-end. No change needed.**
  - Backend `Plan.speed` is a `String` column (`isp-billing/app/db/models.py:210`).
  - MikroTik and RADIUS parsers explicitly accept decimals
    (`mikrotik_api.py:54` regex `^(\d+(?:\.\d+)?)...`, `radius_service.py:660`
    `char == '.'`), emitting `2.5M/2.5M`.
  - Frontend speed field is free-text (`CreatePlanClient.tsx:116`,
    `PlansClient.tsx:772`). Entering `2.5M/2.5M` works.
- **Duration decimals are blocked on both sides.**
  - Frontend: `parseInt(e.target.value)` truncates `1.5 → 1` in the create form
    (`CreatePlanClient.tsx:137`) and edit modal (`PlansClient.tsx:788`).
  - Backend: `duration_value` is an `Integer` column + Pydantic `int`, and
    billing day-credit logic uses integer division `duration_value // 24`
    (`payment_routes.py:100`, `c2b_routes.py:290`). A decimal would be rejected,
    and even if forced, sub-day durations floor to 1 day for billing.

## Decision

Support decimal duration entry **on the frontend only**, by normalizing a
decimal duration to the coarsest whole-number unit the backend already accepts.
The DB keeps `duration_value` as an integer. No backend change, no billing-math
risk. (Chosen over a true-decimal backend change, which touches billing math.)

## Conversion rule

Convert the typed `(value, unit)` to total minutes (rounded to the nearest
minute — the backend's finest unit is `MINUTES`), then pick the coarsest unit
that keeps the result a whole number. **Integers pass through unchanged** so
existing behavior (e.g. `60` Minutes stays `60` Minutes) is untouched; the
conversion only applies to fractional input.

| Typed        | Stored as     | Reason                       |
|--------------|---------------|------------------------------|
| `1.5` Hours  | `90` Minutes  | 90 min, not ÷60-clean        |
| `0.5` Hours  | `30` Minutes  |                              |
| `1.5` Days   | `36` Hours    | 2160 min, ÷60-clean          |
| `2.5` Days   | `60` Hours    |                              |
| `1.1` Days   | `1584` Minutes| not ÷60-clean                |
| `1.5` Minutes| `2` Minutes   | rounded; no sub-minute unit  |
| `3` Days     | `3` Days      | integer → unchanged          |

Round-trips cleanly: re-opening a saved `90 Minutes` plan to edit shows
`90 Minutes`; the list already renders `{value} {unit}`.

## Components

1. **New `app/plans/duration.ts`** — pure helpers, mirrors `app/plans/dataCap.ts`:
   - `normalizeDuration(value, unit) → { value, unit } | null` (null when the
     input does not resolve to at least one whole minute).
   - `describeDuration(value, unit) → string` (e.g. `"90 minutes"`, `"1 hour"`)
     for the live preview hint.
2. **New `app/plans/duration.test.ts`** — vitest unit tests (written first),
   covering the table above plus: integer pass-through per unit, fractional
   minutes rounding, and sub-1-minute / invalid input → `null`.
3. **Edit `CreatePlanClient.tsx`** — bind the duration field to a raw string
   state (mirrors the `dataCapValue` pattern, avoiding the controlled-number
   reformatting bug), `step="any"`, relax `min` so `0.5` is allowed, normalize
   in `handleSubmit`, and show a muted "Will be saved as …" hint only when the
   conversion changes the value.
4. **Edit `PlansClient.tsx` `EditPlanModal`** — same changes.

## Edge cases

- Integer input in any unit passes through untouched.
- Fractional minutes round to the nearest whole minute (no seconds unit exists);
  the preview makes the rounding visible.
- Input that resolves to `< 1` minute (e.g. empty/0) falls back to the existing
  empty→1 default; a genuinely invalid duration blocks submit with a message.

## Out of scope (confirmed)

- Speed (already works as free-text).
- Price (whole KES by design).
- Any backend change.

## Testing

- vitest on `duration.ts` (the conversion table + edge cases).
- Manual check of both create and edit forms in the running app: typing `1.5`
  Hours shows the hint and saves `90 Minutes`; integers unchanged.
