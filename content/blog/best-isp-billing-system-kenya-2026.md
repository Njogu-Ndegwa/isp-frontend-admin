---
title: Best ISP Billing System in Kenya (2026) — An Honest Comparison
description: We compared Kenya's top ISP billing systems on M-Pesa integration, MikroTik support and real KES pricing — Bitwave, Jasiyo, Netily, Ndovu Connect and the free options.
date: 2026-07-16
tags: isp billing, mpesa, mikrotik, comparison
published: true
---

If you run a WiFi hotspot or PPPoE internet business in Kenya, your billing system is the difference between collecting every shilling automatically and chasing payments on WhatsApp at midnight. The good news: Kenya now has several capable, locally-built billing platforms. The honest news: they are more alike than their marketing suggests, so the details — setup fees, router provisioning, support — are what should decide your choice.

We build one of these systems, so read this as an informed insider's comparison, not a neutral review. Where a competitor does something well, we say so.

## What should a billing system do for a Kenyan ISP?

The baseline in 2026 is settled. Any serious option must have native **M-Pesa integration** (STK push, so customers pay without leaving the portal), **MikroTik support** for both hotspot and PPPoE, automatic activation and disconnection (no manual work when a customer pays or expires), customer and package management, and reporting you can trust. If a system is missing any of these, it is not built for this market — every platform below has all of them.

What actually separates the options is: pricing structure, what setup costs, how routers get configured, and what happens when you need help at 9pm on a Saturday.

## Price comparison (checked July 2026)

Kenya's billing market has converged on almost identical pricing — roughly KES 25 per PPPoE customer and 3% of hotspot revenue. The differences hide in the minimums and one-time fees:

| System | PPPoE | Hotspot | Monthly minimum | Setup fee |
|---|---|---|---|---|
| **Bitwave** | KES 25/user | 3% of revenue | KES 500 | **None** |
| Jasiyo | KES 25/user | 3% of revenue | KES 500 | KES 500 |
| Netily (Internetily) | KES 25/user | 3% of revenue | KES 500 | KES 500 |
| Ndovu Connect | KES 25/user (min 30 users = KES 1,500) | 3% of revenue | KES 500 | Not listed |
| Centipid | Not published | Not published | Not published | Not published |
| "Free" platforms | Free below caps | Free below caps | Paid tiers from ~KES 500 up to KES 30,000 as you grow | Varies |

<!-- VERIFY: competitor prices pulled from their public sites on 16 July 2026 — spot-check before publishing, and re-check quarterly. -->

Three things stand out. First, if anyone quotes you a very different price for the same service, ask why. Second, Ndovu's 30-user minimum means a small PPPoE operator pays KES 1,500 where others charge KES 750. Third, Centipid publishes no prices at all — you'll need a sales conversation to find out.

## What about the free billing systems?

Searches for "free ISP billing system Kenya" are everywhere, and platforms like isp.co.ke, Freeispradius and SmartPay Radius answer that demand. Here is how free actually works: the free tier is capped — one popular platform is free only while your sales stay under KES 8,000 a month — and once you cross the cap you move to paid tiers that can reach KES 30,000 a month at scale. That is not a scam; it is a freemium model. But do the maths for *your* size: a hotspot doing KES 50,000 a month pays KES 1,500 on a 3%-of-revenue model. Compare that against the paid tier the "free" platform will move you to, and check what support you get at each level before choosing based on the word "free".

## Where Bitwave is different

Since every serious platform has M-Pesa and MikroTik covered, we compete on the parts around them:

- **No setup fee.** Same market pricing as everyone else, but onboarding costs nothing — you only ever pay for what you use.
- **One-command router provisioning.** Paste one line into your MikroTik terminal and the router configures itself: hotspot, captive portal, packages, payment flow. Most operators are selling WiFi [in under two hours](/blog/how-to-start-wifi-hotspot-business-kenya) — no RouterOS expertise needed.
- **Deep MikroTik field experience.** Across the 200+ ISP networks running on Bitwave in Kenya we operate hAP lite, RB951 and hEX units, second-hand ex-provider routers, and even Starlink-backed sites — and the platform carries fixes for real-world issues (like RouterOS 7.20's hotspot changes) that generic software hits blind.
- **Free setup help on a phone call.** The number is on the site; an actual engineer picks up.

To be fair about the competition: Jasiyo's dashboard polish is real, Netily publishes useful guides, and Ndovu's pricing calculator is a genuinely helpful touch. Any of them will run a small ISP competently. Our case is simple — same price, zero setup cost, faster router onboarding, and the field experience to fix the weird problems.

## How to choose in 15 minutes

1. **Count your customers honestly.** Under ~30 PPPoE users or under KES 15,000 hotspot revenue, minimums dominate — compare the KES 500 floors and skip anything with a bigger minimum.
2. **Ask each vendor to show a live router being provisioned.** The difference between one command and an afternoon of manual RouterOS configuration is the single biggest hidden cost.
3. **Test support before you pay.** Call or message on a weekend. The response time you get as a prospect is the best one you will ever get.
4. **Take the free trial.** Every serious platform (ours included) lets you start free — run your real router on it for a week before committing.

## FAQ

**Which ISP billing system is cheapest in Kenya?**
For most small operators the paid platforms cost the same: about KES 25 per PPPoE customer or 3% of hotspot revenue, with a KES 500 monthly minimum. Bitwave charges no setup fee, which makes it the cheapest to start on that standard pricing. Truly free platforms are cheaper only while you stay under their caps.

**Do all Kenyan billing systems support M-Pesa STK push?**
All the serious ones do — customers pay from the captive portal and get connected automatically. What varies is reconciliation quality and what happens when Safaricom's API has a bad day, so ask vendors how failed payments are handled.

**Can I switch billing systems without losing my customers?**
Yes. Customer lists can be exported and imported (CSV is standard), and your MikroTik router can be re-provisioned to a new platform in under an hour. The main cost of switching is re-training yourself on a new dashboard, not losing data.

## Try the no-setup-fee option

[Create a free Bitwave account](/signup), paste one command into your MikroTik, and see your first M-Pesa payment land — before you pay anything. If you get stuck, call the number on the site and a real engineer will walk you through it.
