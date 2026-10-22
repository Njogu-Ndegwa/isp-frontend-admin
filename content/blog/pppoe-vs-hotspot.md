---
title: PPPoE vs Hotspot: Which Should You Start With in Kenya?
description: PPPoE vs hotspot: if you're new, start with a hotspot. It is cheaper to set up and needs less support. How each one bills, and when to run both.
date: 2026-11-03
tags: pppoe vs hotspot, pppoe, hotspot business, isp business kenya, mikrotik
category: pppoe
image: /blog-images/pppoe-vs-hotspot/cover.webp
imageAlt: Dennis of Bitwave Technologies explaining whether to start with a hotspot or PPPoE
published: true
---

<!-- Cover source: frame at 00:11.5 of our TikTok 7650798433111969042 ("Hotspot or PPPoE, which one should you start with?"), local copy C:\Biwavte-Content-Library\source-videos\20260613_hotspot-or-pppoe-which-one_2919.mp4, 720x1280 source; 720x405 head-and-shoulders crop at y=215, burned-in caption band (~75% height) outside the crop. Chose this over the desk flatlay (equipment_desk-flatlay-cpe-haplite) because hotspot-connected-no-internet already uses that photo. -->

PPPoE vs hotspot comes down to how much money you have and how much time you can give the business. If you are a beginner in Kenya, start with a hotspot. It is easier to set up, less complicated, and your customers will call you far less often. Move to PPPoE once the hotspot is running and you have learned how the business works.

Both models sell the same thing, internet, but they sell it in different ways. A hotspot sells short packages to whoever is nearby: an hour, a day, a week. PPPoE sells a monthly subscription to a fixed home or shop, with its own router and its own login. Whichever one you choose, you need a billing system to collect payments and cut off customers whose time has run out. [Bitwave hotspot billing](/hotspot-billing-system-kenya) does that for hotspots, and the same platform handles PPPoE subscribers.

*This post is based on two of our TikToks: [Hotspot or PPPoE, which one should you start with?](https://www.tiktok.com/@bitwavetechnologies/video/7650798433111969042) and [setting up PPPoE between a MikroTik and a Tenda F3](https://www.tiktok.com/@bitwavetechnologies/video/7640488584063110407).*

## PPPoE vs hotspot: what is the difference?

A hotspot is shared WiFi. Customers connect to your network, see a login page, pay with M-Pesa or enter a voucher code, and get online until their package expires. PPPoE (Point-to-Point Protocol over Ethernet) is a dedicated connection. Each customer has a router at home that logs in to your MikroTik with its own username and password.

That one difference drives everything else:

| | Hotspot | PPPoE |
|---|---|---|
| Who buys | Anyone in range of your WiFi | A household or business you have connected |
| How they log in | Login page in the browser, M-Pesa or voucher | Their router logs in with a PPPoE username and password |
| What they buy | Short packages (hours, days, weeks) | A monthly subscription |
| What you install | A MikroTik and access points at your site | A cable and a router at every customer's premises |
| Support load | Low | Higher, because customers call from home |

## How does each one bill customers?

A hotspot bills per package. The customer picks a package on your login page, pays by M-Pesa, and the MikroTik lets them on until the time or data runs out. You can also sell printed vouchers to people who prefer cash. Income comes in small amounts throughout the day.

PPPoE bills per month. Each customer has an account tied to their PPPoE username. They pay for the month, the account stays active until the expiry date, and the billing system disconnects them if they don't renew. When they pay again, they are reconnected.

Bitwave's own pricing follows the same split. Hotspot billing costs 3% of your hotspot revenue. PPPoE billing costs KES 25 per active PPPoE user per month. Both have a KES 500 monthly minimum and no setup fee. The [pricing page](/pricing) has a calculator if you want to plug in your own numbers.
<!-- VERIFY: how the bill is worked out for an account that runs both hotspot and PPPoE (3% plus KES 25 per user, one KES 500 minimum or two?) -->

## Which should a beginner start with?

Start with a hotspot. That is what Dennis recommends to anyone who asks, for three reasons he gives in the video.

1. **It is easier to set up.** One MikroTik, an access point and an internet line can run a hotspot. Our guide to [setting up a MikroTik hotspot in 10 minutes](/blog/mikrotik-hotspot-setup-10-minutes) shows the whole process.
2. **It is less complicated.** There is no cable to lay to each customer and no router to configure in each house.
3. **It needs much less customer support.** A hotspot can run on its own while you are somewhere else. Customers pay, get online and drop off without you being involved.

PPPoE costs more to start because of the work around it. You will probably have to lay cable to each customer, sometimes drop cable if they are far away. Then customers call you whenever the internet is not working at home, so you need people to answer those calls and go out to fix things. That is a wage bill a beginner with a small budget doesn't need in the first months.

If you are still working out your starting budget, read [how much a hotspot business costs in Kenya](/blog/hotspot-business-cost-kenya) for the full equipment list.

## What equipment does each one need?

Both need an internet source and a MikroTik router. The difference is what sits between the MikroTik and the customer.

For a hotspot you need:

- An internet connection at the site
- A MikroTik router such as the hAP lite to run the login page and enforce packages
- One or more access points to spread the WiFi to where customers are
- Ethernet cable and someone to install it

For PPPoE you need:

- An internet connection at your base
- A MikroTik router running the PPPoE server
- A router in every customer's home, such as a Tenda F3, set to connect using PPPoE
- A cable run to every customer: ethernet for short distances, fibre for longer ones
- For fibre, a media converter or an OLT, depending on how many homes you serve (see [OLT vs media converter](/blog/olt-vs-media-converter))

The PPPoE side of the MikroTik is not hard. In the second video Dennis connects a MikroTik RB951 to a Tenda F3 in under ten minutes: internet into port 1 of the MikroTik, PPPoE on port 2, a cable from port 2 to the Tenda, then the customer's username and password typed into the Tenda. The step-by-step version is in our [MikroTik PPPoE setup guide](/blog/mikrotik-pppoe-setup-tenda-f3). The cost is in what comes after: the cable to each home and the visits when something breaks.

## Why does PPPoE need more customer support?

PPPoE customers pay for a monthly service at home, so they expect it to work all the time and they call you when it doesn't. Every home has its own cable, its own router and its own power supply, and any of them can fail. A hotspot customer whose connection drops just reconnects or tries again later.

That support has to be paid for. Somebody has to pick up the phone, work out whether the problem is the customer's router, the cable or your network, and sometimes go to the house. On a hotspot most of that work doesn't exist.

## When should you run both?

Run both once your hotspot is stable and you understand the business. Dennis's advice is to start with the hotspot, grow it, learn the ropes, and then add PPPoE. By then you know your area, you have some income coming in, and you can afford the cabling and the support.

Common reasons to add PPPoE next to a hotspot:

- Customers near your site ask for internet at home, not just on their phones
- You want steadier income that arrives once a month instead of a few shillings at a time
- Homes and shops nearby need a fixed connection for a TV, CCTV or several devices

A single MikroTik can serve hotspot users on one interface and PPPoE customers on another, so you don't always need new core equipment to start. Bitwave shows both kinds of customer on one dashboard. When you are ready, the [PPPoE billing system](/pppoe-billing-system-kenya) handles monthly accounts, M-Pesa renewals and disconnection at expiry.

## FAQ

**Is PPPoE better than hotspot?**

Neither is better for everyone. A hotspot is cheaper and simpler to start and needs little support. PPPoE gives you monthly subscribers on fixed connections but costs more to set up because of cabling, home routers and customer support. Most beginners should start with a hotspot.

**Can one MikroTik run a hotspot and PPPoE at the same time?**

Yes. RouterOS can run a hotspot server and a PPPoE server on the same MikroTik, each on its own interface or bridge. Check that the router has enough capacity for the total number of users before you add the second service.

**Do PPPoE customers pay with M-Pesa?**

They can. With Bitwave, each PPPoE customer pays by M-Pesa and is reconnected as soon as the payment lands. Accounts that are not renewed go off on the expiry date.

## Start with the hotspot

Get a hotspot running first, learn how your area buys internet, then add PPPoE when you can carry the extra work. [Create your Bitwave account](/signup) and we'll set up billing on your MikroTik for either one.
