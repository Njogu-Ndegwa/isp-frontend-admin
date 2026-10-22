---
title: Bitwave vs Netily (Internetily) — Which ISP Billing System to Choose?
description: Bitwave vs Netily: both charge KES 25 per PPPoE user or 3% of hotspot revenue. The difference is the setup fee, router setup and feature focus.
date: 2026-11-13
tags: netily, internetily, netily alternative, isp billing, comparison
category: comparison
image: /blog-images/bitwave-vs-netily/cover.webp
imageAlt: Bitwave dashboard on a phone showing a MikroTik router's CPU, memory and storage load with 26 hotspot users online
published: true
---

<!-- Cover: Biwavte photo library, dashboard/dashboard_app-health-live-bandwidth_20260527_i-make-800-shillings-a_00-36.jpg (real Bitwave admin UI, 720x1280 source -> 720x405 crop at focus 0.32). INDEX has no privacy note for this frame; the burned-in caption sits outside the crop. No competitor imagery used. -->

Netily (the product now calls itself Internetily) and Bitwave Technologies charge the same rates: KES 25 per PPPoE subscriber or 3% of hotspot revenue, with a KES 500 monthly minimum. Choose Bitwave if you run MikroTik and want [free router setup with no activation fee](/signup). Choose Netily if you want a subscriber self-service portal or run mixed-vendor equipment.

We build Bitwave, so this is a comparison written by one side. Every Netily fact below comes from Netily's own website, checked on 22 October 2026, and where Netily is the better choice we say so. For the wider market, see our [comparison of Kenya's ISP billing systems](/blog/best-isp-billing-system-kenya-2026).

## How do Bitwave and Netily compare side by side?

On price the two are almost identical. The differences are in the one-time fee, who configures the router, and what each product puts its effort into.

| | Bitwave | Netily (Internetily) |
|---|---|---|
| Pricing model | 3% of hotspot revenue, or KES 25 per active PPPoE user per month | 3% of hotspot revenue, KES 25 per billable PPPoE subscriber |
| Monthly minimum | KES 500 | KES 500 |
| Setup or activation fee | None | KES 500 one-time activation after the trial |
| Router configuration | Bitwave configures your MikroTik for free | You add the router to Netily; help offered during the trial |
| Equipment listed | MikroTik: hAP lite, RB951, hEX and larger | MikroTik, plus Ubiquiti, TP-Link, Tenda, Cambium, Huawei, Starlink, FreeRADIUS |
| Routers per account | Multiple | Unlimited |
| M-Pesa | STK push from the hotspot login page, or your own paybill/till | STK Push or paybill, with your own Daraja Till/Paybill credentials |
| Trial | Free signup and a live demo | Trial on request, plus a read-only demo |
| Cost at KES 30,000/month hotspot revenue | KES 900 | KES 900, plus KES 500 once |
| Cost at 50 PPPoE users | KES 1,250 | KES 1,250, plus KES 500 once |

<!-- Source (Netily pricing model, KES 500 minimum, KES 500 activation after trial, unlimited routers, trial on request): https://netily.co.ke/pricing, checked 2026-10-22 -->
<!-- Source (equipment list "Works with the routers you already own", STK Push or paybill, Daraja Till/Paybill with own credentials, read-only demo): https://netily.co.ke/, checked 2026-10-22 -->
<!-- Source (non-MikroTik equipment: "Tell us how it fits into your network so we can confirm the integration path"): https://netily.co.ke/integrations, checked 2026-10-22 -->
<!-- Netily trial length: not published on their site. -->

Netily's equipment list deserves a footnote. Its integrations page asks owners of Ubiquiti, TP-Link, Tenda, Cambium, Huawei or Starlink gear to get in touch so Netily can "confirm the integration path". <!-- Source: https://netily.co.ke/integrations, checked 2026-10-22 --> Treat it as a conversation to have before you sign up, not a guarantee for your exact device.

## Which is cheaper, Bitwave or Netily?

Month to month they cost the same. A hotspot that takes KES 30,000 a month pays KES 900 on either platform. Fifty PPPoE users cost KES 1,250 on either. A small site under the minimum pays KES 500 on either.

The only price difference is Netily's KES 500 activation fee after the trial. <!-- Source: https://netily.co.ke/pricing, checked 2026-10-22 --> Over a first year at KES 30,000 a month, that is KES 11,300 on Netily against KES 10,800 on Bitwave. Five hundred shillings should not decide a billing system on its own, so look at the setup and features instead. You can check your own numbers on our [pricing page](/pricing).

## Who sets up the MikroTik router?

This is where the two differ most in practice. With Bitwave, our team configures the router for you, free of charge: hotspot, login page, packages and the M-Pesa flow. You never type a RouterOS command, and most operators are selling packages in under two hours.

Netily describes its approach as "Add a router to Internetily once", after which PPPoE profiles, queues and subscriber access are managed from the dashboard. <!-- Source: https://netily.co.ke/features, checked 2026-10-22 --> It also says it will help you get your network set up during the trial and supports a secure tunnel, so you don't need a static IP. <!-- Source: https://netily.co.ke/pricing (FAQ), checked 2026-10-22 --> If you're comfortable in WinBox, either route works. If you're not, ask Netily exactly how much of the configuration they do for you.

## Where is Netily the better fit?

Netily's feature list goes further on the subscriber side of a fibre or wireless ISP. It advertises a subscriber portal for renewals, receipts, password resets and support tickets, recurring invoicing, payment reconciliation across M-Pesa, Airtel Money, bank deposits and cash, voucher agents you can track, staff roles with an action log, and remote management of compatible TR-069 CPE. <!-- Source: https://netily.co.ke/features and https://netily.co.ke/integrations, checked 2026-10-22 --> It also lists payments in Uganda and Tanzania, including MTN MoMo and Flutterwave. <!-- Source: https://netily.co.ke/, checked 2026-10-22 -->

<!-- VERIFY: confirm Bitwave does not offer a subscriber self-service ticket portal, customer invoicing, TR-069 or Airtel Money before publishing; nothing in the admin app (app/) suggests it does, but the captive portal lives in the backend repo. -->

If you run a fibre ISP with hundreds of home subscribers who expect invoices and a self-service account, or you operate outside Kenya, Netily is built for that.

## Where is Bitwave the better fit?

Bitwave suits operators who want the billing and the router handled for them and who run on MikroTik, including the cheap hAP lite most Kenyan hotspots start on.

- **No setup cost at all.** No activation fee, and installation and MikroTik configuration are free.
- **M-Pesa from the login page.** Customers pay by STK push on the [hotspot login page](/hotspot-billing-system-kenya) and the package activates when the payment confirms. You can use Bitwave's collection or your own paybill or till.
- **Hotspot, PPPoE and static IP on one dashboard.** Vouchers, [PPPoE accounts](/pppoe-billing-system-kenya) and static-IP clients sit together, and expired customers disconnect automatically.
- **Router monitoring.** You see router uptime, the management tunnel, live usage per customer and revenue analytics, across several routers on one account.

## Should I choose Bitwave or Netily?

Choose Netily if:

- you need a subscriber portal with tickets and password resets, or recurring invoicing;
- your network mixes Ubiquiti, Cambium or Huawei gear and you want one vendor to look at all of it;
- you bill customers in Uganda or Tanzania.

Choose Bitwave if:

- you run MikroTik, from a hAP lite upward;
- you want the router configured for you at no cost;
- you want to start without paying anything up front.

Also weighing Jasiyo or Pawa? We wrote [Bitwave vs Jasiyo](/blog/bitwave-vs-jasiyo) and [Bitwave vs Pawa](/blog/bitwave-vs-pawa) the same way.

## FAQ

**Is Netily the same as Internetily?**

Yes. The site at netily.co.ke now brands the product as Internetily. The pricing is KES 25 per billable PPPoE subscriber or 3% of hotspot revenue, with a KES 500 monthly minimum and a KES 500 activation fee after the trial.

**Is Bitwave cheaper than Netily?**

The monthly rates are the same. Bitwave has no activation fee, so it costs KES 500 less to start. At KES 30,000 a month in hotspot revenue both charge KES 900 a month.

**Can I move my customers from Netily to Bitwave?**

Yes. Your MikroTik router stays the same; the Bitwave team reconfigures it for free and sets up your packages. Call 0795 635 364 to plan the move so your customers are not left offline.
<!-- VERIFY: confirm how Bitwave brings across an existing PPPoE customer list (import tool or done by the team) before publishing; only a static-IP import modal was found in app/. -->

## Try Bitwave on your own router

[Create a free Bitwave account](/signup) or [open the live demo](/demo) to see the dashboard first. If you'd rather talk it through, call or WhatsApp 0795 635 364.
