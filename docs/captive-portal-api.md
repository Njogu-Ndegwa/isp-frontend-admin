# Captive Portal API Reference

## The one endpoint you need

```
GET https://isp.bitwavetechnologies.com/api/public/portal/{identity}
```

**No auth. No request body.** One fetch on page load — returns everything the portal needs in a single round trip.

`identity` is the MikroTik router identity string that arrives in the URL query param `?router=...` (already handled by `getUrlParams()` in `script.js`).

### How the frontend already calls it

```js
// script.js — already in place
const PORTAL_ENDPOINT = `${API_BASE_URL}/public/portal`;
const url = `${PORTAL_ENDPOINT}/${encodeURIComponent(identity)}`;

fetch(getProxiedUrl(url), {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    mode: 'cors'
});
```

No `connection_type` query param is sent. Plans are filtered client-side in `transformPlansData`.

---

## Full response shape

```jsonc
{
  "router":        { ... },   // already consumed ✅
  "plan_flags":    { ... },   // already consumed ✅
  "plans":         [ ... ],   // already consumed ✅
  "ads":           [ ... ],   // already consumed ✅ (via window._portalAds)
  "portal_settings": { ... }  // NEW — not yet consumed ⬅
}
```

---

## `router` — already wired in `script.js`

The `.then()` handler reads these fields:

```js
routerId            = data.router.router_id;
routerAuthMethod    = data.router.auth_method || 'DIRECT_API';
routerBusinessName  = data.router.business_name || null;
routerPaymentMethods = data.router.payment_methods || ['mpesa', 'voucher'];
// also: data.router.support_phone → updateSupportPhone()
```

Full object from the API:

```jsonc
{
  "router_id": 12,
  "name": "Branch Office",
  "identity": "MikroTik-A1B2",
  "user_id": 4,
  "auth_method": "DIRECT_API",        // "DIRECT_API" | "RADIUS"
  "business_name": "Fahari Networks",
  "payment_methods": ["mpesa", "voucher"],
  "support_phone": "0712345678"
}
```

---

## `plan_flags` — already wired in `script.js`

```js
planFlags = data.plan_flags;  // used by transformPlansData + applyPlanFlags
```

```jsonc
{
  "has_emergency_plans": false,
  "has_special_offers": true,
  "emergency_mode_active": false,
  "emergency_message": null       // string or null — shown in the emergency banner
}
```

---

## `plans` — already wired in `script.js`

```js
cachePlans(data.plans);
displayPlans(data.plans);  // calls transformPlansData internally
```

Each plan object:

```jsonc
{
  "id": 7,
  "name": "Daily 5Mbps",
  "speed": "5M/5M",              // MikroTik rate-limit string, null if not set
  "price": 50,
  "duration_value": 1,
  "duration_unit": "days",       // "hours" | "days" | "weeks" | "months"
  "connection_type": "hotspot",  // "hotspot" | "pppoe"
  "router_profile": "5mbps",
  "user_id": 4,
  "plan_type": "regular",        // "regular" | "special_offer" | "emergency"
  "is_hidden": false,
  "badge_text": null,            // e.g. "🔥 Popular" — shown on card
  "original_price": null,        // set for special_offer plans
  "valid_until": null,           // ISO-8601 expiry, or null
  "data_cap_mb": null,           // null = unlimited data
  "fup_action": null,            // "throttle" | "disconnect" | null
  "fup_throttle_profile": null
}
```

> **Note on `is_bestseller`:** `script.js` checks `data.plans.find(p => p.is_bestseller)` but the backend does not return this field — the fallback `BESTSELLER_PLAN_ID = 13` is used instead. The frontend calculates a "popular" plan from time-to-price ratio automatically.

`transformPlansData` filters out:
- `is_hidden: true`
- `connection_type !== 'hotspot'`
- `plan_type === 'emergency'` when `planFlags.emergency_mode_active` is false
- `plan_type === 'special_offer'` when `planFlags.has_special_offers` is false

---

## `ads` — already wired in `script.js`

```js
window._portalAds = data.ads || [];  // ads.js picks this up
```

```jsonc
[
  {
    "id": 3,
    "title": "Fresh Milk",
    "description": "Farm-fresh daily delivery",
    "image_url": "https://cdn.example.com/milk.jpg",
    "seller_name": "Kamau Farms",
    "seller_location": "Kiambu",
    "phone_number": "0700000000",
    "whatsapp_number": "0700000000",
    "price": "KES 80/litre",
    "price_value": 80,
    "badge_type": null,          // null | "hot_deal" | "new" | "limited"
    "badge_text": "Today only",
    "category": "food"
  }
]
```

---

## `portal_settings` — NEW, needs to be wired ⬅

Currently `data.portal_settings` arrives in the response but nothing in `script.js` reads it yet. This is the block to add.

Full object:

```jsonc
{
  "color_theme": "ocean_blue",
  // ocean_blue | emerald_green | sunset_orange | midnight_purple | rose_gold | slate_gray

  "header_style": "standard",
  // standard | minimal | hero | compact

  "show_welcome_banner": true,
  "welcome_title": "Fahari Networks",  // null if not set — falls back to business_name
  "welcome_subtitle": "Fast & reliable internet",

  "company_logo_url": "https://cdn.example.com/logo.png",
  "header_bg_image_url": null,         // used by "hero" header_style

  "show_ads": true,

  "footer_text": "© 2026 Fahari Networks",

  "portal_support_phone": "0712345678",    // already falls back to router.support_phone on the server
  "portal_support_whatsapp": "0712345678",

  "show_ratings": true,
  "show_reconnect_button": true,
  "show_social_links": false,
  "show_plan_speed": true,   // ← NEW: if false, hide speed on plan cards

  "facebook_url": null,
  "whatsapp_group_url": null,
  "instagram_url": null,

  "show_announcement": false,
  "announcement_type": "info",   // "info" | "warning" | "success"
  "announcement_text": null,

  "portal_language": "en",       // "en" | "sw" | "fr"

  "plans_section_title": null,   // custom heading above plan grid, null = use default
  "featured_plan_ids": "3,7"    // comma-separated plan IDs to pin at top; null if none
}
```

### Suggested wiring in `script.js`

Inside the `.then(data => { ... })` block, after the existing sections:

```js
// ---- Portal Settings ----
if (data.portal_settings) {
    applyPortalSettings(data.portal_settings);
}
```

```js
// Suggested implementation
let portalSettings = {};

function applyPortalSettings(settings) {
    portalSettings = settings;

    // featured_plan_ids — parse into an array of numbers for plan ordering
    if (settings.featured_plan_ids) {
        window.featuredPlanIds = settings.featured_plan_ids
            .split(',')
            .map(Number)
            .filter(Boolean);
    }

    // All other fields are available on portalSettings whenever you need them:
    // portalSettings.show_plan_speed
    // portalSettings.show_welcome_banner
    // portalSettings.color_theme
    // etc.
}
```

```js
// In the plan card render function — honour show_plan_speed:
const speedHtml = (portalSettings.show_plan_speed !== false && plan.speed)
    ? `<div class="plan-speed">${plan.speed}</div>`
    : '';
```

---

## Error responses

| Status | When |
|---|---|
| `404` | No router found with that identity |
| `500` | Server error |

```jsonc
{ "detail": "Router with identity 'MikroTik-XYZ' not found" }
```

The fallback path in `script.js` is already handled — if this endpoint fails, it falls back to `GET /api/routers/by-identity/{identity}` + `GET /api/public/plans/{routerId}` individually.
