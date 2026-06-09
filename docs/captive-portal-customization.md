# Captive Portal Customization — Frontend Guide

> **Scope:** This document covers everything the portal customization system adds to the captive portal page — themes, layout modes, feature flags, and all the combinations that need to be handled. API contracts and endpoint wiring are covered separately.

---

## How settings reach the page

All customization lives in `portal_settings` inside the single public portal response. Once that object is available, the frontend applies it. Nothing is fetched twice — the whole set of settings comes in the same payload as plans, ads, and router info.

The key field names used throughout this document match exactly what arrives in `portal_settings`.

---

## 1. Color Themes (`color_theme`)

Six named themes are defined. Each theme is a **full palette** — not just an accent color. Every themed element on the page (backgrounds, buttons, plan cards, support CTAs, promo strip, step indicators, text) reads from this palette.

### Theme Palette Structure

Each theme resolves to 14 color tokens:

| Token | Role |
|---|---|
| `primary` | Main brand color — buttons, plan prices, step circles, plan card borders, CTA |
| `primaryLight` | Lighter tint — hover states, gradients |
| `primaryDark` | Darker shade — gradient endpoint, pressed states |
| `accent` | Secondary highlight — plan card top-bar gradient endpoint, promo strip tint |
| `background` | Page background fill |
| `surface` | Card / panel background |
| `text` | Primary body text |
| `textSecondary` | Muted labels, subtitles, hints |
| `textInverse` | Text on dark/primary backgrounds (always white) |
| `border` | Dividers, input outlines |
| `success` | Positive states (ratings, success banners) |
| `error` | Destructive / alert states |
| `info` | Informational highlights |
| `warning` | Warning banners |

### The 6 Themes

#### `sunset_orange` (default)
```
primary:        #E85D04   (deep orange)
primaryLight:   #F48C06
primaryDark:    #DC2F02
accent:         #FFBA08   (golden yellow)
background:     #FFFCF2   (warm cream)
surface:        #FFFFFF
```
Warm, energetic feel. Cream background pairs with the deep orange primary. The golden accent creates a sunrise gradient on plan cards.

#### `ocean_blue`
```
primary:        #3B82F6   (blue-500)
primaryLight:   #60A5FA
primaryDark:    #2563EB
accent:         #06B6D4   (cyan-500)
background:     #F0F7FF   (light sky wash)
surface:        #FFFFFF
```
Cool and professional. Works well for corporate or tech-forward ISPs. The cyan accent blends naturally into plan card gradients.

#### `emerald_green`
```
primary:        #10B981   (emerald-500)
primaryLight:   #34D399
primaryDark:    #059669
accent:         #84CC16   (lime-400)
background:     #F0FDF4   (pale mint)
surface:        #FFFFFF
```
Fresh and approachable. The lime accent creates vivid plan card highlights. Good for community networks.

#### `bright_violet`
```
primary:        #8B5CF6   (violet-500)
primaryLight:   #A78BFA
primaryDark:    #7C3AED
accent:         #F472B6   (pink-400)
background:     #FAF5FF   (light lavender)
surface:        #FFFFFF
```
Vibrant and modern. The pink accent creates a striking gradient on plan cards. Works for youth-facing brands.

#### `rose_gold`
```
primary:        #E11D48   (rose-600)
primaryLight:   #FB7185
primaryDark:    #BE123C
accent:         #FB923C   (orange-400)
background:     #FFF1F2   (faint blush)
surface:        #FFFFFF
```
Bold and premium-feeling. The warm orange accent softens the strong rose primary in gradients.

#### `slate_gray`
```
primary:        #475569   (slate-600)
primaryLight:   #64748B
primaryDark:    #334155
accent:         #F97316   (orange-500)
background:     #F8FAFC   (near-white gray)
surface:        #FFFFFF
```
Neutral and understated. The orange accent pops against the muted palette — used exclusively for plan card gradient highlights and the promo CTA.

### What the theme colors actually touch

- **Hero header:** gradient overlay uses `primary` → `primaryDark` at varying opacity over the background image (or as a solid gradient if no image).
- **Standard header:** brand name text uses `primary`; the "Help" button uses `background` fill with `border` outline.
- **Status bar (in preview bezel):** background is `primary` in hero mode, `surface` in standard mode.
- **Step indicators (1 → 2 → 3):** circle fill is `primary`.
- **Reconnect block:** intentionally uses a hardcoded blue (`#3B82F6`) regardless of theme — this is intentional because reconnect is a universal utility action.
- **Plan cards:** price text uses `primary`; popular card border uses `primary`; the diagonal ribbon uses `primary`; the top-bar gradient on hover goes from `primary` to `accent`.
- **Speed pill on plan cards:** `text` fill / `textInverse` label.
- **Promo strip:** tinted background uses `primary` at 10% + `accent` at 8%; CTA button is solid `primary`.
- **Footer:** uses `textSecondary` text on `border` top divider.
- **Ads section:** mostly theme-neutral but ad prices use `primary`.

---

## 2. Header Layout (`header_style`)

Two modes are fully implemented. Two more exist as type values (`minimal`, `compact`) but are not yet rendered differently from standard — treat them as aliases for `standard` until explicitly designed.

### `standard`

A sticky, compact header bar that stays pinned at the top of the scroll container.

**Contains:**
- An animated 📡 icon (pulsing scale animation)
- The brand name (`welcome_title`, fallback: `"Demo ISP"`) in `primary` color
- A `"Public WiFi"` tagline beneath the name
- A pill-shaped **Help** button on the right → links to `tel:{portal_support_phone}` if set, else `#`

**When `portal_support_whatsapp` is set:** the standard header still shows a phone Help button (WhatsApp is only promoted in hero mode).

**Background:** `surface` color (white in all themes). Has a subtle bottom border and `backdrop-filter: blur(12px)`.

### `hero`

A full-width immersive header that does **not** stick — it scrolls away as the user moves down.

**Visual construction:**
1. A background image layer (from `header_bg_image_url`) if set
2. A gradient overlay: `linear-gradient(135deg, {primary}bb 0%, {primaryDark}88 100%)` at ~73% and ~53% opacity respectively — this tints the photo with the theme color
3. If no image URL is provided, the gradient runs solid (full opacity, no image)

**Contains:**
- If `company_logo_url` is set: a 44×44px rounded logo image
- If no logo: a decorative WiFi SVG icon with white strokes at varying opacity
- `welcome_title` as the main `<h1>` (fallback: `"Demo ISP"`)
- `welcome_subtitle` as a subheading (fallback: `"Public WiFi"`)
- Three feature pills: ⚡ Fast · 🔒 Secure · 📱 Easy (always shown)
- A support CTA button (see below)

**Support button in hero mode:**
- If `portal_support_whatsapp` is set → a green-tinted **WhatsApp** button linking to `https://wa.me/{number}`
- Otherwise → a **Call Support** button linking to `tel:{portal_support_phone}` (or `href="#"` if neither is set)
- The button is glass-effect: white border at 70% opacity, white fill at 15% opacity, backdrop blur

**Hero background presets (used by the admin UI):**

| Label | Subject |
|---|---|
| City | Aerial city night lights |
| People | Community gathering |
| Nature | Landscape / outdoors |
| Café | Café / coffee shop |
| Tech | Circuit board / tech |

The portal page itself just uses whatever URL is in `header_bg_image_url` — the preset list is only relevant to the admin settings picker.

**Auto-seed behavior:** when the admin switches to Hero style and no image URL is currently set, the admin UI automatically sets `header_bg_image_url` to the Nature preset. The portal page does not need to replicate this logic.

---

## 3. Feature Toggles

### `show_ads` (boolean)

Controls whether the **marketplace ads strip** appears.

**When `true`:** a horizontal scroll strip appears at the top of the main content area (immediately below the header, before the steps). It shows:
- A section heading "🛒 Soko Deals Today" + a small "AD" badge
- Horizontally scrollable ad cards (snap scroll, no scrollbar)
- Each real ad card: product image / emoji, HOT/NEW/SALE badge chip, name, seller, price
- A "Your Ad Here" placeholder card at the end of the scroll
- A "← Swipe for more deals →" hint line

**When `false`:** the entire section is omitted, no empty space.

The ads data comes from the `ads` array in the portal response (see the API doc). `show_ads` is the gate that decides whether to render the section at all — if `show_ads` is `false`, skip rendering even if `ads` is non-empty.

### `show_plan_speed` (boolean)

Controls whether a speed pill appears on each plan card.

**When `true`:** each plan card shows a dark pill below the price with the rate-limit string, e.g. `5M/2M`. Styled as a dark (`text` color) rounded badge with `textInverse` label.

**When `false`:** the speed pill is completely hidden. The plan card reflows — the price and duration fill the space naturally.

The speed value itself comes from `plan.speed` in the plans array. If a plan has `speed: null` or `speed: ""`, no pill is shown regardless of this flag.

### `show_reconnect_button` (boolean)

Controls whether the **Reconnect block** is shown.

**When `true`:** a card appears between the steps and the plans section. It contains:
- An icon + title "Already paid? Reconnect"
- A subtitle explaining phone/voucher input
- An input field + Reconnect button

The reconnect block uses a hardcoded blue color scheme regardless of theme (blue border, blue button, blue gradient header). This is intentional.

**When `false`:** the block is omitted entirely.

> **Note:** The admin portal customization UI currently forces `show_reconnect_button: true` in its live preview. The actual portal page should respect whatever value the backend sends.

### `show_welcome_banner` (boolean)

Controls a welcome banner that appears at the top of the main content area (independent of the hero header).

**When `true`:** show a styled banner using `welcome_title` and `welcome_subtitle`. Applies in both `standard` and `hero` header modes.

**When `false`:** omit it.

> The admin UI currently hides this toggle and forces `false` in preview. It is in the settings object and the backend sends it.

### `show_ratings` (boolean)

Controls whether a ratings / feedback widget is shown on the page.

**When `true`:** show a star-rating or thumbs UI for users to rate the connection.

**When `false`:** omit it.

> Currently not rendered in the preview. Needs to be designed and implemented on the portal side.

### `show_social_links` (boolean)

Controls whether social media links are shown.

**When `true`:** display links using `facebook_url`, `whatsapp_group_url`, `instagram_url` (only show links that are non-null).

**When `false`:** omit the social section entirely.

> Currently not rendered in the preview. Needs implementation on the portal side.

### `show_announcement` (boolean)

Controls whether an announcement banner is shown.

**When `true`:** render a banner with `announcement_text`, styled according to `announcement_type`.

**When `false`:** omit it.

---

## 4. Announcement Banner

When `show_announcement` is `true`, show a banner. The `announcement_type` controls its visual style:

| Type | Intent | Suggested colors |
|---|---|---|
| `info` | Neutral information | Blue tint — `info` token from palette |
| `warning` | Caution / alert | Amber — `warning` token from palette |
| `success` | Positive news | Green — `success` token from palette |

**Content:** `announcement_text` — render as plain text. If `show_announcement` is `true` but `announcement_text` is `null` or empty, skip the banner (don't render an empty box).

---

## 5. Branding Fields

### `welcome_title` (string | null)
Used in:
- Hero header as the main `<h1>`
- Standard header as the brand name
- Welcome banner (when `show_welcome_banner` is `true`)

**Fallback chain:** `welcome_title` → `router.business_name` → `"Demo ISP"`

### `welcome_subtitle` (string | null)
Used in:
- Hero header as the subtitle paragraph
- Welcome banner body

**Fallback:** `"Public WiFi"`

### `company_logo_url` (string | null)
Used in:
- Hero header only — replaces the decorative WiFi SVG with a 44×44px `<img>`

In standard header mode, the logo is currently not shown (the 📡 emoji icon is used). If you want to show the logo in standard mode too, that would be an enhancement.

### `header_bg_image_url` (string | null)
Only used when `header_style === 'hero'`.

- Non-null: image is rendered as the hero background, with the theme gradient overlaid on top
- Null: the hero renders with the solid theme gradient (no photo), which still looks good

### `footer_text` (string | null)
Replaces the default footer line.

**Default (when null):** `"© {year} Bitwave Technologies. All rights reserved."`

When set, render `footer_text` verbatim instead.

---

## 6. Plans Section

### `plans_section_title` (string | null)
The heading above the plan grid.

**Default (when null):** `"Choose Your Plan"`

### `featured_plan_ids` (string | null)
A comma-separated string of plan IDs, e.g. `"3,7,12"`.

Parse with:
```js
const featured = settings.featured_plan_ids
  ? settings.featured_plan_ids.split(',').map(Number).filter(Boolean)
  : [];
```

**When non-empty:** sort the displayed plan list so that featured plan IDs appear first (in the order given), followed by remaining plans. Do not filter out non-featured plans — they still appear, just after.

**When null:** display plans in their default order.

---

## 7. Support Contacts

### `portal_support_phone` (string | null)
A phone number (may include country code, e.g. `+254712345678` or `0712345678`).

Used in:
- Standard header **Help** button → `tel:{number}`
- Hero header support button → `tel:{number}` (when no WhatsApp)
- Promo strip **Call Now** button → `tel:{number}`

**Fallback:** `router.support_phone` from the router object (the backend already handles this fallback server-side and puts the resolved number into `portal_settings.portal_support_phone`).

### `portal_support_whatsapp` (string | null)
A WhatsApp-compatible phone number.

Used in:
- Hero header only — when set, replaces the phone Call button with a green **WhatsApp** button linking to `https://wa.me/{number}`
- Standard header is not affected (always shows phone help button)

**Priority rule in hero mode:** if `portal_support_whatsapp` is set, show WhatsApp. If not, show phone. If neither, show a generic "Contact Support" link with `href="#"`.

---

## 8. Social Links

All three are `string | null`. Only render a link if both `show_social_links` is `true` AND the specific URL is non-null.

| Field | Platform |
|---|---|
| `facebook_url` | Facebook page |
| `whatsapp_group_url` | WhatsApp community group |
| `instagram_url` | Instagram profile |

---

## 9. Language (`portal_language`)

Three supported values:

| Value | Language |
|---|---|
| `en` | English (default) |
| `sw` | Swahili |
| `fr` | French |

All user-facing strings that appear in the portal should be rendered in the selected language. This applies to:
- Static labels: "Choose Your Plan", "Already paid? Reconnect", "Pick Plan", "Enter Phone", "Pay & Connect", "Call Support", etc.
- Dynamic content (plan names, ad titles) may stay in their original language since they come from the database

---

## 10. The Always-Present Sections

These sections render regardless of settings. They are not toggle-controlled:

| Section | What it is |
|---|---|
| Header | Either standard or hero — always present |
| Steps (1→2→3) | "Pick Plan → Enter Phone → Pay & Connect" indicator |
| Plans grid | Always shown; content comes from `plans` array |
| Promo strip | "Need Home WiFi?" callout with Call Now button |
| Footer | Copyright line (customizable via `footer_text`) |

---

## 11. Conditional Sections — Full Matrix

| Setting | Condition | Shown |
|---|---|---|
| Ads strip | `show_ads: true` AND `ads` array is non-empty | Yes |
| Ads strip | `show_ads: false` | No |
| Speed pill on plan card | `show_plan_speed: true` AND `plan.speed` is non-null | Yes |
| Speed pill | `show_plan_speed: false` OR `plan.speed` is null | No |
| Reconnect block | `show_reconnect_button: true` | Yes |
| Welcome banner | `show_welcome_banner: true` AND title or subtitle is set | Yes |
| Announcement | `show_announcement: true` AND `announcement_text` is non-null/non-empty | Yes |
| Ratings widget | `show_ratings: true` | Yes |
| Social links | `show_social_links: true` AND at least one URL is non-null | Yes |
| Logo in hero | `header_style: 'hero'` AND `company_logo_url` is non-null | Yes |
| WiFi SVG in hero | `header_style: 'hero'` AND `company_logo_url` is null | Yes |
| Hero photo | `header_style: 'hero'` AND `header_bg_image_url` is non-null | Yes |
| WhatsApp button | `header_style: 'hero'` AND `portal_support_whatsapp` is non-null | Yes |
| Phone button | `header_style: 'hero'` AND `portal_support_whatsapp` is null | Yes |
| Footer override | `footer_text` is non-null | Shows custom text |
| Footer default | `footer_text` is null | Shows Bitwave copyright |

---

## 12. Page Layout & Section Order

The page renders top to bottom in this order:

```
[Header — standard sticky bar OR hero full-width]
  [Announcement banner]          ← if show_announcement
  [Welcome banner]               ← if show_welcome_banner
[Ads strip]                      ← if show_ads
[Steps: 1→2→3]
[Reconnect block]                ← if show_reconnect_button
[Plans grid]
  (with speed pills if show_plan_speed)
  (featured plans pinned to top if featured_plan_ids)
[Promo: "Need Home WiFi?"]
[Social links]                   ← if show_social_links
[Ratings]                        ← if show_ratings
[Footer]
```

---

## 13. CSS Variable Approach

The admin preview injects the palette as CSS custom properties scoped to the portal container. On the actual portal page, the same variables should be set on the root or a wrapping element:

```css
--p-primary:      {palette.primary};
--p-primary-dark: {palette.primaryDark};
--p-accent:       {palette.accent};
--p-bg:           {palette.background};
--p-surface:      {palette.surface};
--p-text:         {palette.text};
--p-text-sec:     {palette.textSecondary};
--p-text-inv:     {palette.textInverse};
--p-border:       {palette.border};
```

Semantic tokens (`success`, `error`, `info`, `warning`) are the same across all themes:

```
success:  #10B981
error:    #EF4444
info:     #3B82F6
warning:  #F59E0B
```

(Exception: `emerald_green` uses `#16A34A` for success, and `ocean_blue` uses `#0EA5E9` for info.)

---

## 14. Notable Design Decisions

**Reconnect block is theme-independent.** It always uses blue (`#3B82F6` / `#2563EB`). This is deliberate — the reconnect action is a utility, not a brand touchpoint, and blue universally signals "action/link".

**Hero gradient opacity.** The photo overlay gradient uses `primarybb` (73% opacity) → `primaryDark88` (53% opacity). This keeps the photo visible and textured while ensuring sufficient contrast for white text.

**Plan card popular ribbon.** The "Best Value" diagonal ribbon in the corner uses a CSS `::after` pseudo-element rotated 45°. It uses solid `primary` background with white text.

**Ads section background.** Intentionally uses a warm cream gradient (`#FFF8E8` → `#FFF5E1`) rather than the theme background — this gives the ads strip a marketplace-feel regardless of theme.

**Speed pill contrast.** The speed pill uses `text` as background and `textInverse` (white) as label. Since `text` is always `#1A1A1A` across all themes, this is always a dark pill with white text.

**Font.** DM Sans is the portal font (`font-family: 'DM Sans', -apple-system, ...`). Make sure the portal HTML loads DM Sans from Google Fonts or bundles it.

---

## 15. `minimal` and `compact` Header Styles

These values exist in the type system and the backend may send them, but they have **no distinct rendering** currently. Treat them as `standard` until they are designed. A safe fallback:

```js
if (header_style === 'hero') {
    renderHeroHeader();
} else {
    renderStandardHeader(); // handles standard, minimal, compact, and any unknown value
}
```

---

## 16. Defaults to Fall Back To

If the backend sends `portal_settings: null` or the field is missing, use these defaults:

| Field | Default |
|---|---|
| `color_theme` | `sunset_orange` |
| `header_style` | `standard` |
| `show_ads` | `false` |
| `show_plan_speed` | `true` |
| `show_reconnect_button` | `true` |
| `show_welcome_banner` | `false` |
| `show_ratings` | `false` |
| `show_social_links` | `false` |
| `show_announcement` | `false` |
| `portal_language` | `en` |
| `welcome_title` | `null` → fall back to `router.business_name` |
| `plans_section_title` | `null` → "Choose Your Plan" |
| `footer_text` | `null` → "© {year} Bitwave Technologies. All rights reserved." |
| `featured_plan_ids` | `null` → no reordering |
