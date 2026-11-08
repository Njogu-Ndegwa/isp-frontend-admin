---
title: WiFi Voucher System in Kenya: How to Sell Hotspot Internet for Cash
description: A WiFi voucher system lets your hotspot sell internet for cash. Generate codes, hand them to customers, and the router connects them. Here's how.
date: 2026-11-23
tags: wifi voucher system kenya, hotspot vouchers, mikrotik hotspot voucher, sell wifi for cash, hotspot billing, wifi business kenya
category: hotspot
image: /blog-images/wifi-voucher-system-kenya/cover.webp
imageAlt: Stack of blank paper slips, a few coins and a phone on a kiosk counter, with a generic white WiFi router on the shelf behind
published: true
---

<!-- Cover source: AI-generated with Higgsfield generate_image (model gpt_image_2_6) on 2026-11-08. Prompt: "Realistic professional photograph of a small shop counter in a Kenyan neighbourhood kiosk. On the wooden counter: a neat stack of small blank white paper slips (like printed WiFi vouchers, but with no readable text), a few loose coins, and a basic smartphone lying face down. Behind them, slightly out of focus, a generic plain white wireless router with two antennas on a shelf. Warm natural daylight, shallow depth of field. No people, no faces, no logos, no readable text." Illustration only; not Bitwave's network, shop or customer. -->

A WiFi voucher system lets your hotspot sell internet to customers who pay in cash. You generate a batch of access codes for a package, sell each code over the counter, and the customer types it into the hotspot login page to get online. In Kenya it's the simplest way to serve the customer who has coins but no M-Pesa balance.

Many hotspots still run cash sales from a notebook, and it gets messy: codes written twice, codes nobody can account for, attendants who "forgot" a sale. A billing system fixes that by tracking every code from creation to use. With Bitwave Technologies you can [generate hotspot vouchers from your dashboard](/signup) and sell them the same day, alongside M-Pesa.

## What is a WiFi voucher system?

A WiFi voucher system is software that creates one-time access codes for your hotspot packages and tells your router which codes are valid. Each voucher is tied to a package, such as one hour or one day, so the customer gets exactly what they paid for, and the system marks the code as used once it's redeemed.

On a MikroTik hotspot, the voucher replaces the M-Pesa step, not the login page. The customer still connects to your WiFi and sees your captive portal. Instead of paying with M-Pesa, they enter the code they bought. Everything after that is the same: the router connects them and disconnects them when the package ends.

## Who should sell WiFi vouchers?

Vouchers suit any hotspot where a meaningful share of customers would rather pay cash, or need someone else to pay for them. In Dennis's video on the Bitwave Technologies TikTok, the examples are:

- **Estate WiFi businesses**, where a shop or caretaker sells codes to residents.
- **Shops that resell internet**, like a kiosk or M-Pesa agent that adds WiFi codes to what it sells.
- **Hostels and apartments**, where a landlord or manager hands out access.
- **Small ISPs starting out**, who want to sell before every customer is comfortable paying by phone.

If nearly all your customers already pay with M-Pesa, you may not need vouchers at all. The [M-Pesa WiFi hotspot](/blog/mpesa-wifi-hotspot) flow is faster for them and doesn't need an attendant. Most operators run both: M-Pesa for the majority, vouchers for cash.

## How do you sell hotspot vouchers with Bitwave?

You create vouchers in the Bitwave dashboard, copy or download the codes, and sell them. The router side is already done: Bitwave configures your MikroTik hotspot for you, so there's nothing to set up on the router for vouchers. Here is the flow Dennis shows in the video:

1. **Open Vouchers.** In the Bitwave dashboard, go to More, then Vouchers.
2. **Click Generate.** Choose the package the vouchers are for, then the quantity, from 1 to 100 in one batch.
3. **Choose the purpose.** "Sale" vouchers count as revenue in your reports. "Compensation" vouchers are free codes, for example to make up for an outage, and don't count as revenue. Compensation vouchers have a daily limit.
4. **Pick a router, or leave it on Any Router.** If you run several sites, you can tie a batch to one router.
5. **Copy or download the codes.** Copy a single code to send to a customer, or use Download CSV to get the whole batch for printing.
6. **Sell the code.** The customer pays you cash and gets the code on paper, by SMS or on WhatsApp.

## How does a customer use a WiFi voucher?

The customer connects to your hotspot WiFi, opens the login page, types the voucher code, verifies it and taps to redeem. The router connects them for the length of the package. It takes about as long as typing the code, and the customer needs no app, no account and no M-Pesa balance.

The same login page also takes M-Pesa, so one portal serves both kinds of customer. If you want the page to carry your own name and colours, see our guide to a [custom hotspot login page](/blog/custom-hotspot-login-page).

## How do you stop voucher fraud and lost cash?

The way to protect cash sales is to make every code traceable. With paper codes and a notebook, you can't tell which codes were sold, which were used, or who sold them. A voucher system records all of that for you.

In the Bitwave Vouchers page, each code shows a status: Available, Used, Disabled or Expired. You can search by code, package or router, and filter by status. That gives you a simple check at the end of each day: the number of codes marked Used should match the cash in the till.

Three more controls help:

- **Disable a code** if a printed sheet goes missing or a code was handed out by mistake. A disabled code can't be redeemed.
- **Give attendants their own login.** Bitwave's staff roles include a Cashier role that can view customers, generate vouchers and see payments, without access to your money or account settings.
- **Keep sale and compensation codes apart.** Because free codes are marked as compensation and capped per day, they can't hide inside your sales figures.

## What should a voucher cost?

Price your vouchers the same as your M-Pesa packages. A customer who pays cash should get the same hour or day as one who pays by phone, otherwise word spreads and everyone queues at the counter for the cheaper option. A voucher is just another way to pay for a package you already sell, so it uses the plans and prices you've set up in Bitwave.

If you're still choosing your packages, our breakdown of [hotspot package prices in Kenya](/blog/hotspot-package-prices-kenya) shows which prices sell most, from 84,804 real payments. To see what Bitwave would cost for your revenue, check the [pricing page](/pricing).

## WiFi vouchers or M-Pesa: which should a hotspot use?

Use M-Pesa as the default and vouchers for cash customers. M-Pesa needs no attendant, works at 2 a.m., and the money goes straight to your paybill or till. Vouchers need someone to sell them, but they reach customers M-Pesa can't, and they're useful for gifts, prepaid hostel access and compensation.

| | M-Pesa | Vouchers |
|---|---|---|
| Customer pays | By phone, from the login page | Cash, to you or an attendant |
| Needs an attendant | No | Yes, to sell the codes |
| Works without M-Pesa balance | No | Yes |
| Good for | Most customers, any hour | Cash customers, hostels, gifts, outage compensation |
| Tracked in Bitwave | Transactions page | Vouchers page, by status |

Bitwave's [hotspot billing system](/hotspot-billing-system-kenya) runs both from one dashboard, so you don't have to pick one.

## FAQ

**Can I print WiFi vouchers for my hotspot?**

Yes. In Bitwave you generate up to 100 vouchers at a time for a package, then use Download CSV to get the batch. You can print the codes from the spreadsheet, or copy single codes to send by SMS or WhatsApp.

**Do WiFi vouchers work on a MikroTik hotspot?**

Yes. The customer enters the voucher code on the same MikroTik hotspot login page that takes M-Pesa, and the router connects them for the length of the package. Bitwave configures the MikroTik for you, so no RouterOS commands are needed for vouchers.

**Can I give a free WiFi voucher to a customer after an outage?**

Yes. When you generate vouchers in Bitwave, set the purpose to Compensation. These codes are free, don't count as revenue in your reports, and are limited to a set number per day so they can't be misused.

## Start selling vouchers today

[Create a free Bitwave account](/signup) and generate your first batch of vouchers in a few minutes, or [open the live demo](/demo) to see the Vouchers page first. If you'd like help setting up, call or WhatsApp 0795 635 364.
