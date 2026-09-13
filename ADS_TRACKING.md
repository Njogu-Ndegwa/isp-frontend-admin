# Ad conversion tracking

What the site reports to TikTok and Google Ads, and how to switch it on.

## Switching it on

Four environment variables, all optional. Set them in Vercel (and in the
Hetzner deploy env), then redeploy. **Unset means the script never loads** — no
stray requests, nothing half-wired.

| Variable | Where it comes from | Example |
|---|---|---|
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | TikTok Ads Manager → Tools → Events → Web Events → the pixel's ID | `CJKL3MBC77U1234567` |
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | Google Ads → Goals → Conversions → the account's tag ID | `AW-1234567890` |
| `NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL` | the *conversion label* of the signup action | `AbC-D_efGhIjKl` |
| `NEXT_PUBLIC_GOOGLE_ADS_CONTACT_LABEL` | the conversion label of the contact action | `MnO-P_qrStUvWx` |

TikTok needs no per-event configuration — the events below are standard names
it already understands.

## What is reported

| Moment | GA4 | TikTok | Google Ads |
|---|---|---|---|
| Reseller completes signup | `sign_up` | `CompleteRegistration` | signup conversion |
| Visitor taps WhatsApp or Call | `contact_click` | `Contact` | contact conversion |

**Why contact clicks count as a conversion.** This business closes in a
WhatsApp conversation, not on the signup form. A campaign optimised only
toward completed signups is optimising toward the far end of a funnel most
buyers never reach directly — the platforms would learn to find form-fillers
rather than the people who actually become resellers. Counting the
conversation makes the optimisation match how money is really made here.

Both events carry `channel` (whatsapp/phone) and `placement`
(`floating`, `contact_section`, `pricing_inline`), so it is possible to see
which button earns the conversation and drop the ones that don't.

The GA4 events also carry the visitor's first-touch attribution — `utm_source`,
`utm_campaign`, `gclid`, `ttclid` — from `app/lib/attribution.ts`.

## After switching it on

1. **GA4:** mark `sign_up` and `contact_click` as key events, or they will not
   appear as conversions in reports.
2. **TikTok:** Events Manager → Test Events, load the site, tap Chat with us,
   confirm `Contact` arrives. Then verify the domain, or the pixel's data is
   discounted.
3. **Google Ads:** the Tag Assistant extension shows whether the conversion
   fired and whether the label matched.

Never fire a conversion on a page load — only on the real action. A conversion
that fires on every visit teaches the platform that every visitor converted,
and it will happily spend the budget finding more of them.

## Code

- `app/components/AnalyticsScripts.tsx` — loads GA4 always, TikTok and Google
  Ads only when configured.
- `app/lib/analytics.ts` — `trackSignup()` and `trackContact()`; every call is
  optional, because an ad blocker or a slow script means the tracker simply
  is not there.
- Callers: `app/signup/SignupClient.tsx`, `app/components/FloatingContact.tsx`,
  `app/pricing/PricingContactButtons.tsx`, `app/landing/LandingSections.tsx`.
