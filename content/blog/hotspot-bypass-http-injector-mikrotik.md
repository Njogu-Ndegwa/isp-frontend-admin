---
title: HTTP Injector Hotspot Bypass on MikroTik: How to Spot and Stop It
description: HTTP Injector hotspot bypass on MikroTik lets people use your WiFi without paying. How to tell it's happening on your hotspot and how to close it.
date: 2026-12-15
tags: http injector, hotspot bypass, mikrotik, hotspot security, revenue loss
category: mikrotik
image: /blog-images/hotspot-bypass-http-injector-mikrotik/cover.webp
imageAlt: Bitwave router dashboard showing the number of hotspot users online, the figure to compare with paying customers when checking for an HTTP Injector hotspot bypass on MikroTik
published: true
---

<!-- Cover source: Biwavte photo library, dashboard/dashboard_app-health-live-bandwidth_20260527_i-make-800-shillings-a_00-36.jpg (own app screen recording, 720x1280 source, cropped to 600x338 with --zoom 1.2 --focus 0.45; caption band outside the crop, no customer data visible) -->

Sharp boys have reached the ISPs. An app called HTTP Injector has been going round, and with it people are getting internet on MikroTik hotspots without paying. They skip the login page entirely. If your hotspot revenue has been dropping while the router looks as busy as ever, part of your money may be going to them. This post covers the HTTP Injector hotspot bypass on MikroTik from the operator's side: how to tell it's happening, why it works, and how to close it.

We know this one first-hand. Bitwave was hit by it too, and we patched it about a month before we made the video this post is based on. Every router set up through [Bitwave hotspot billing](/hotspot-billing-system-kenya) now gets the fix automatically.

*This guide follows our [TikTok on HTTP Injector and the "sharp boys"](https://www.tiktok.com/@bitwavetechnologies/video/7685814012893826311) (in Sheng; translated here).*

## What is the HTTP Injector hotspot bypass?

HTTP Injector is a tunnelling app for Android. Used against a hotspot, it lets a phone that has joined your WiFi but never paid open a tunnel to an outside server and get full internet through it. It doesn't matter which billing system you use. In the video Dennis calls it chaos for all billing systems, because the weakness is in how the MikroTik hotspot itself handles people who haven't logged in yet.

The people using it usually don't build anything themselves. Someone sells a ready-made settings file for the app, often shared in WhatsApp and Telegram groups, and buyers load it on their phones. In the video Dennis says a buyer can then use any WiFi out there for a week without paying, even one protected by a captive portal.

<!-- VERIFY: the transcript is unclear on what buyers pay for the config ("uneza lipa two H-links"). Left out of the copy; add the real figure if you know it. -->

## How do you know if people are bypassing your hotspot?

The first sign is money: revenue falls while the number of devices on the WiFi stays the same or grows. The second is in the router. Phones that never logged in show up in the hotspot hosts list carrying a lot of data, which a phone stuck on the login page should never do.

Things to check:

- **Revenue against traffic.** If the bandwidth graph looks like a normal month but M-Pesa payments are down, something is using the line without paying.
- **Online versus paid.** Compare the number of hotspot users connected in the evening with the number of active paid sessions. A big gap that keeps growing is a warning.
- **IP → Hotspot → Hosts in WinBox.** Hosts that are not authorized should be using almost no data. A device that has never logged in but has moved tens or hundreds of megabytes is almost certainly tunnelling. Your own access points show up in this list too, usually on addresses like `192.168.0.1` or `192.168.1.1`, so leave those out.
- **Customers who stopped buying but still sit in the area.** Regulars who used to buy daily packages and suddenly don't, while you still see them around, are worth noticing.
- **Talk in the area.** If people near your hotspot are sharing settings files and talking about "free WiFi", believe it.

## Why does the bypass work on a MikroTik hotspot?

It works because of the way a MikroTik hotspot shows the login page. Before a customer logs in, the hotspot hands their web traffic to the router's built-in web proxy, which is what serves the login page. On default setups, that proxy will also pass a connection on to an outside server. Tunnelling apps use that path to reach their own server, and once the tunnel is up the phone has internet.

The walled garden, the list of sites people can reach before paying, doesn't stop it. That list matches site names, and the tunnel doesn't present a normal site name for it to check.

This is why the bypass hits every billing system on MikroTik. It is not a bug in one company's portal or payment flow. The hole is in the router configuration, so the fix has to go on the router.

## How do you stop HTTP Injector on a MikroTik hotspot?

Stop the router's web proxy from connecting out to anything except your own portal and billing servers. The hotspot still needs the proxy to show the login page, so you can't just switch it off. You block the proxy from relaying to the outside world, with an allow-list for the addresses your billing provider uses.

The rule that worked across our routers (RouterOS 6 and 7) rejects connections the router itself opens to outside hosts on the ports the hotspot hands to the proxy, unless the destination is on the allow-list:

```
/ip firewall filter add chain=output protocol=tcp dst-port=80,3128,8080 \
    dst-address-list=!isp_portal_allow dst-address=!192.168.88.0/24 \
    action=reject reject-with=tcp-reset comment=PROXY_RELAY_BLOCK
```

`isp_portal_allow` is an address list you fill with your billing backend and portal addresses. `192.168.88.0/24` is the hotspot network; change it if yours is different. Test on one router first, and check that the login page still appears and a test payment still goes through before you roll it out.

<!-- VERIFY: Dennis, confirm you're comfortable publishing the rule. It is purely defensive (it blocks, it doesn't enable anything), but operators on other billing systems must add their own provider's addresses to the allow-list or they will break their own portal. -->

Lessons from rolling this out across our routers:

- **Cover all three ports.** Our first version blocked port 80 only. It showed hits, looked fixed, and the app moved to port 8080 and kept working. Check which ports your hotspot sends to the proxy and block all of them.
- **Don't chase the tunnel servers' addresses.** The people selling settings files change servers all the time. Blocking addresses one by one never ends.
- **Don't block all port 80 for guests.** That breaks the login page redirect for every honest customer.
- **Re-apply after any re-setup.** If a router is reset or provisioned again by hand, the rule goes with it. Check that it's still there.

After the fix, a phone trying the bypass gets a timeout and the app never connects. Paying customers shouldn't notice anything.

## FAQ

**Can HTTP Injector bypass any hotspot billing system?**

It can bypass any MikroTik hotspot where the router's web proxy is still able to relay connections to the outside, whatever billing system runs on top. The weakness is in the router setup, not in the billing software. A MikroTik with the relay blocked stops it.

**Will blocking HTTP Injector stop paying customers from using the hotspot?**

No, if the allow-list is right. Paying customers are logged in, so their traffic doesn't go through the proxy at all. Before login, they only need to reach the login page and your portal, and those addresses are on the allow-list.

**How do I know if my Bitwave hotspot is protected?**

Every router provisioned through Bitwave since the patch gets the block automatically. If your router was set up before then, or you've reset it since, comment or DM "HELP" on our TikTok and we'll check it.

## Stop sharing your revenue

If your revenue has been dropping and you suspect the sharp boys, comment or DM "HELP" on our TikTok. Dennis offers to install Bitwave on your router for free, with the protection already in place. You can also [move your hotspot to Bitwave](/signup) directly and see what it costs on the [pricing page](/pricing). For more on what eats into a new hotspot's income, read [the hotspot business mistakes we see in Kenya](/blog/hotspot-business-mistakes-kenya) and [how much a hotspot business can make](/blog/hotspot-business-profit-kenya).
