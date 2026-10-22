---
title: Bitwave vs Jasiyo — Which ISP Billing System Is Right for You?
description: Bitwave vs Jasiyo compared: same KES 25 PPPoE and 3% hotspot rates, but different minimums, router support (hAP lite) and setup. Which fits you?
date: 2026-12-01
tags: jasiyo, jasiyo alternative, isp billing, mikrotik, comparison
category: comparison
image: /blog-images/bitwave-vs-jasiyo/cover.webp
imageAlt: Bitwave dashboard on a phone showing daily hotspot revenue and plan performance in KES
published: true
---

<!-- Cover: Biwavte photo library, dashboard/dashboard_daily-revenue-plans_20260615_every-monday-morning-i-check_00-33.jpg (real Bitwave admin UI over Dennis on the couch, 576x1024 source -> 576x324 crop at focus 0.30, not upscaled). INDEX has no privacy note; the burned-in caption sits outside the crop. No competitor imagery used. -->

Jasiyo and Bitwave Technologies charge the same rates: KES 25 per PPPoE customer or 3% of hotspot revenue. Choose Bitwave if you're small (its minimum is KES 500 against Jasiyo's KES 1,000), run a MikroTik hAP lite, or want [the router configured for you](/signup). Choose Jasiyo if you prefer setting up yourself on RouterOS 7 hardware.

We build Bitwave, so read this as one side's comparison. Every Jasiyo fact below comes from Jasiyo's own website, checked on 22 October 2026. Jasiyo is a capable product, and for some operators it is the better pick; we say where. For the full market, see our [comparison of Kenya's ISP billing systems](/blog/best-isp-billing-system-kenya-2026).

## How do Bitwave and Jasiyo compare side by side?

The per-customer and per-revenue rates match. The minimum, the supported routers and the setup model do not.

| | Bitwave | Jasiyo |
|---|---|---|
| Pricing model | 3% of hotspot revenue, or KES 25 per active PPPoE user per month | 3% of hotspot revenue, KES 25 per PPPoE customer per month |
| Monthly minimum | KES 500 | KES 1,000 (one minimum across the account) |
| Setup fee | None; Bitwave configures your MikroTik free | Free if you set up yourself; optional KES 500 for assisted setup |
| Who configures the router | The Bitwave team | You paste a generated script into the MikroTik terminal |
| MikroTik support | hAP lite, RB951, hEX and larger | RouterOS 7 models such as hEX S, CCR, RB5009, RB4011; hAP lite not supported |
| Routers per account | Multiple | Unlimited |
| M-Pesa | STK push from the hotspot login page, or your own paybill/till | STK Push via Daraja, or your paybill/till without API keys; bank via PayHero |
| Customer types | Hotspot, PPPoE, static IP | Hotspot, PPPoE, static IP |
| Trial | Free signup and a live demo | 7-day free trial, no card |
| Cost at KES 30,000/month hotspot revenue | KES 900 | KES 1,000 (3% is KES 900, so the minimum applies) |
| Cost at 50 PPPoE users | KES 1,250 | KES 1,250 |

<!-- Source (KSh 25/customer, 3% hotspot, single KSh 1,000 minimum across account, free self-setup, optional KSh 500 assisted setup, 7-day trial with no card, unlimited routers): https://jasiyo.com/pricing, checked 2026-10-22 -->
<!-- Source (RouterOS 7 models hEX S, CCR, RB5009, RB4011; "Not supported: MikroTik RB941-2nD, commonly known as the hAP lite"; PayHero/Paystack/ioTec gateways): https://jasiyo.com/, checked 2026-10-22 -->
<!-- Source (paste a single generated script into the MikroTik terminal; paybill/till without Daraja API keys; Bank Transfer / M-Pesa via Bank (PayHero); PPPoE, hotspot and static customers in one dashboard): https://jasiyo.com/faq, checked 2026-10-22 -->

## Which is cheaper, Bitwave or Jasiyo?

For a growing business they cost the same. At 50 PPPoE customers both charge KES 1,250 a month, and above about KES 33,000 a month in hotspot revenue the 3% is identical.

The gap is at the small end, because Jasiyo's minimum is KES 1,000 and Bitwave's is KES 500. <!-- Source: https://jasiyo.com/pricing, checked 2026-10-22 --> A new hotspot taking KES 15,000 a month pays KES 500 on Bitwave and KES 1,000 on Jasiyo. A small estate network with 20 PPPoE customers pays the same KES 500 against KES 1,000. That is KES 6,000 a year, which matters when you're still paying off the router. At KES 30,000 a month the gap shrinks to KES 100. Run your own figures on our [pricing page](/pricing).

On setup, both can cost nothing. Jasiyo is free if you connect the router yourself and KES 500 if you want their team to help you over calls and WhatsApp. <!-- Source: https://jasiyo.com/faq, checked 2026-10-22 --> Bitwave configures the router for free in every case.

## Does Jasiyo work with the MikroTik hAP lite?

No. Jasiyo's homepage lists the MikroTik RB941-2nD, the hAP lite, as not supported, and recommends building on RouterOS 7 hardware such as the hEX S, CCR, RB5009 and RB4011. Routers already running RouterOS 6 still work. <!-- Source: https://jasiyo.com/, checked 2026-10-22 -->

That matters in Kenya because the hAP lite is the cheapest MikroTik and the one many hotspots start on. Bitwave supports it, along with the RB951, hEX and larger models. If you already own a hAP lite, Bitwave lets you start selling without buying a new router. If you're buying new hardware anyway, Jasiyo's advice to build on RouterOS 7 is reasonable, and this point stops mattering.

## How does router setup differ?

Jasiyo is self-service. You name the router, let Jasiyo scan it, then paste one generated script into the MikroTik terminal. That installs an agent that connects outward, so you need no public IP or open port. Jasiyo says most ISPs are live within the hour. <!-- Source: https://jasiyo.com/faq and https://jasiyo.com/, checked 2026-10-22 -->

With Bitwave, you share access to the router and our team configures it: hotspot, login page, packages, and M-Pesa STK push with automatic activation. You never write a RouterOS command. Most operators are live in under two hours.

If you like doing it yourself and want to be selling within the hour, Jasiyo's flow suits you. If you'd rather not touch the terminal at all, Bitwave does it for you.

## What else is different?

- **SMS sender name.** In Kenya, Jasiyo's built-in SMS goes out under Jasiyo's name, not your business name, and SMS is billed separately. <!-- Source: https://jasiyo.com/ and https://jasiyo.com/pricing, checked 2026-10-22 --> Bitwave lets you send through its platform SMS gateway or connect your own SMS provider account with your own sender ID. <!-- VERIFY: own sender ID depends on the operator's SMS provider approving it; confirm wording. -->
- **Payment routes.** Jasiyo offers more settlement options, including straight to a bank paybill through PayHero, plus Paystack and ioTec. <!-- Source: https://jasiyo.com/faq and https://jasiyo.com/, checked 2026-10-22 --> Bitwave offers M-Pesa STK push through Bitwave's collection or your own paybill or till.
- **Uganda.** Jasiyo publishes Uganda pricing in UGX with MTN Mobile Money and Airtel Money. <!-- Source: https://jasiyo.com/pricing, checked 2026-10-22 -->
- **Monitoring.** Bitwave shows router uptime, the management tunnel, live usage per customer and revenue analytics for every router on the account, and disconnects expired customers automatically.

## Should I choose Bitwave or Jasiyo?

Choose Jasiyo if:

- you want to set up the router yourself and be live within the hour;
- your routers already run RouterOS 7;
- you want customer payments to settle straight into a bank account, or you operate in Uganda.

Choose Bitwave if:

- your hotspot makes under about KES 33,000 a month, or you have fewer than 40 PPPoE customers, where the KES 500 minimum saves you money;
- you run a hAP lite and don't want to replace it;
- you want the router configured for you, free. See how it works for [hotspot billing](/hotspot-billing-system-kenya) and [PPPoE billing](/pppoe-billing-system-kenya).

Comparing more than two? Read [Bitwave vs Netily](/blog/bitwave-vs-netily) and [Bitwave vs Pawa](/blog/bitwave-vs-pawa).

## FAQ

**Is Jasiyo cheaper than Bitwave?**

Not usually. The rates are the same, KES 25 per PPPoE customer or 3% of hotspot revenue, but Jasiyo's monthly minimum is KES 1,000 and Bitwave's is KES 500. Small operators pay less on Bitwave; larger ones pay the same on both.

**Can I use a MikroTik hAP lite with Jasiyo?**

Jasiyo's website lists the hAP lite (RB941-2nD) as not supported and recommends RouterOS 7 models such as the hEX S or RB5009. Bitwave supports the hAP lite.

**Does Jasiyo charge a setup fee?**

Setting up yourself is free. Jasiyo charges an optional one-time KES 500 if you want its team to set up the router with you. Bitwave has no setup fee and configures your MikroTik for free.

## Try Bitwave on your own router

[Create a free Bitwave account](/signup) or [look around the live demo](/demo) first. To talk to someone, call or WhatsApp 0795 635 364.
