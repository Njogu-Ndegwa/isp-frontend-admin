---
title: M-Pesa Till or Paybill for a Hotspot Business in Kenya?
description: M-Pesa till or paybill for your hotspot? A till suits small hotspot payments and needs no account number. A paybill suits monthly PPPoE accounts.
date: 2026-11-20
tags: mpesa till or paybill, m-pesa, hotspot business, paybill, buy goods till, kenya
category: mpesa
image: /blog-images/mpesa-till-or-paybill-hotspot/cover.webp
imageAlt: Bitwave account statement on a phone showing customer payments going straight to a bank account, one way to choose M-Pesa till or paybill for a hotspot
published: true
---

<!-- Cover source: frame at 00:14 of our TikTok 7690555167653088519, own Bitwave screen recording, cropped to 720x405 at --focus 0.26 so the burned-in caption is outside the crop. -->

M-Pesa till or paybill for your hotspot business? For most new hotspots, a Buy Goods till is the better first choice: customers buy small packages, nobody has to type an account number, and it usually opens faster. A paybill makes more sense for monthly home customers on PPPoE, because each payment has to find the right account.

You also don't need either one before you start. On [Bitwave's M-Pesa WiFi billing](/mpesa-wifi-billing-kenya), you can sell packages while your application is still with Safaricom, then switch to your own till, paybill or bank account when it is ready.

*This guide follows our [TikTok on receiving customer payments directly](https://www.tiktok.com/@bitwavetechnologies/video/7690555167653088519) and our [TikTok on the three challenges of starting an ISP](https://www.tiktok.com/@bitwavetechnologies/video/7609346632554958098).*

## What is the difference between an M-Pesa till and a paybill?

A till (Lipa na M-Pesa Buy Goods) takes a payment with no account number, like paying at a shop. A paybill asks the customer for a business number and an account number, so each payment can be tied to a bill. That one field decides which suits your business.

| | Buy Goods till | Paybill |
|---|---|---|
| Account number | None | Required from the customer |
| Who pays the Safaricom fee | The business | The business chooses: customer, business or split |
| Typical time to open | 1 to 3 working days | 3 to 10 working days |
| Best fit | Hotspot packages | Monthly PPPoE accounts |

<!-- Sources: account number, who pays, and timeframes from https://paybillke.com/guides/how-to-register-mpesa-till-2026 and https://paybillke.com/guides/how-to-get-mpesa-paybill-number-2026 (independent directory, not Safaricom; checked 2026-11-05). -->

The timeframes in that table come from an independent 2026 guide and assume your documents are complete. Real life can be slower. When Dennis applied for a paybill, it took about a month of following up with Safaricom, so don't plan around the best case.

## Which is cheaper for hotspot packages, a till or a paybill?

A till is usually cheaper for hotspot packages. Since 7 August 2026, Safaricom has not charged a business for Buy Goods collections of KSh 500 or less. Above that the fee is 0.55%, capped at KSh 200. The customer pays nothing on a till, apart from fuel stations.

<!-- Sources: https://thekenyatimes.com/business/safaricom-reduces-m-pesa-business-charges-list-of-new-charges/ and https://thestandard.ke/sports/amp/business/article/2001554316/safaricom-halves-m-pesa-merchant-fees-in-cbk-led-move (both August 2026); customer side: https://www.the-star.co.ke/news/2025-03-13-explainer-what-to-know-about-lipa-na-m-pesa -->

That matters because hotspot payments are small. In our data, [KSh 10 is the package people buy most](/blog/hotspot-package-prices-kenya), and almost nothing on a typical hotspot price list comes near KSh 500. On a till you run yourself, the Safaricom collection fee on those sales is zero at today's tariff.

Paybill pricing depends on the option you choose when you open it. You can make the customer pay the fee, pay it yourself, or split it. On a KSh 10 package, even a small customer charge is noticeable, so ask Safaricom for the current tariff before you decide. Safaricom changes these rates from time to time, and the August 2026 cut is a recent example.

## Why do PPPoE businesses need a paybill?

PPPoE customers pay a monthly bill for a named account, and a paybill's account number field is built for that. When the customer types their account number, the billing system can credit the right home and renew it. A till has no such field, so you lose that automatic match on a manual payment.

A hotspot doesn't have this problem. The customer picks a package on your login page and approves an M-Pesa prompt, so the system already knows which phone and which package the payment is for. If you are still deciding between the two models, our [PPPoE vs hotspot guide](/blog/pppoe-vs-hotspot) covers it.

If you plan to run both, a paybill can serve both. It takes longer to get, so one workable path is to start the hotspot now and add the paybill when you add home customers.

## What do you need to apply for a till or paybill?

A sole proprietor generally needs a national ID, a KRA PIN certificate, a county business permit in the trading name, a bank settlement letter or stamped cheque leaf, and a passport photo. A limited company also needs its incorporation certificate, a recent CR12 and details of each director.

<!-- Source: https://paybillke.com/guides/how-to-register-mpesa-till-2026 and https://paybillke.com/guides/how-to-get-mpesa-paybill-number-2026, checked 2026-11-05. Secondary source; Safaricom's own KYC wording is general. -->

This list comes from an independent guide rather than from Safaricom, so confirm it at a Safaricom shop before you make the trip. One common delay is a name on the KRA PIN that doesn't match the permit, so check those two first.

Do this early. Dennis once rented a base before having a paybill, then spent a month paying rent on a place that earned nothing. That story, and the rest of the startup order, is in our [guide to starting a WiFi hotspot business](/blog/how-to-start-wifi-hotspot-business-kenya).

## Can hotspot payments go straight to your bank account?

Yes. On Bitwave you can add a bank paybill and account number, an M-Pesa paybill, or a Buy Goods till under Settings, then Payment Methods. In direct mode, each customer payment lands in that account the moment they pay. There is nothing to withdraw, and Bitwave charges no payout fee.

Here are the routes Bitwave Technologies supports for operators in Kenya:

- **Direct to your account.** Each payment goes to your till, paybill or bank. No payout fees. The M-Pesa prompt shows Bitwave's name with your business as the account, and refunds are yours to make.
- **Collected by Bitwave.** Payments go to Bitwave's paybill, then get paid out to you on a schedule, or whenever you withdraw. Payout fees apply. This route works before you have a till or paybill.
- **M-Pesa Direct.** You bring your own M-Pesa API keys, and the STK push runs on your own shortcode.

Before direct mode, an operator would wait for a payout or withdraw by hand. In the screen recording in our video, withdrawing KES 5,818 from a Bitwave balance showed a KES 42 transaction fee. Those are the fees direct mode removes. Bitwave's [normal hotspot and PPPoE rates](/#pricing) still apply, and there is no separate M-Pesa fee or setup fee. You can switch between the routes at any time.

## So which should you open first?

Open a till first if you are starting with a hotspot. Open a paybill first if you are selling monthly home connections, or plan to soon. If you have a business bank account and want the money there, you may not need a new M-Pesa number at all, since a bank paybill and account number can work.

Three quick checks before you apply:

1. **What are you selling?** Small packages point to a till. Monthly accounts point to a paybill.
2. **Are your papers ready?** Make sure the names on your KRA PIN and business permit match.
3. **Can you afford to wait?** If not, [start collecting through Bitwave](/signup) and switch to your own account when Safaricom approves it.

## FAQ

**Can I start a hotspot business without a till or paybill?**

Yes. A new Bitwave account can take M-Pesa payments before you have your own till or paybill. Bitwave collects the money and pays it out on your schedule, with payout fees, until you add your own payment method and switch to direct.

**Can I use Pochi la Biashara for my hotspot business?**

Not through Bitwave at the moment. Bitwave's payment methods in Kenya are a Buy Goods till, an M-Pesa paybill, a bank paybill and account number, or your own M-Pesa API keys. Pochi la Biashara runs on your personal line and gives you no separate business number.

**Can I enter my phone number as the till number?**

No. A Buy Goods till is its own number issued by Safaricom, not your phone number. Bitwave's settings ask for a till of 4 to 9 digits. If you don't have one yet, collect through Bitwave in the meantime.
