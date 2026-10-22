---
title: Hotspot Connected but No Internet? Check Your Access Point's DHCP
description: Hotspot connected but no internet while the MikroTik itself is online? Your access point is probably handing out its own IPs. How to spot it and fix it.
date: 2026-10-27
tags: connected no internet, hotspot, mikrotik, dhcp, access point, tenda
category: hotspot
image: /blog-images/hotspot-connected-no-internet/cover.webp
imageAlt: Phone showing a hotspot login page with a You're Online message, what customers should see when hotspot connected but no internet is fixed
published: true
---

<!-- Cover source: Biwavte photo library, dashboard/dashboard_portal-youre-online-success_20260614_today-i-m-going-to_00-09.jpg (own TikTok frame, 720x1280 source, cropped to 720x405 at --focus 0.30; the phone's browser title bar showing the network name was blurred before cropping, caption band below the crop, portal shows demo "Acme Internet Service" data). Visual verdict: phone overlay slightly soft but "You're Online!" reads at 360 px; face fully in frame. Replaced the desk flat-lay, which how-to-start-wifi-hotspot-business-kenya already uses. -->

Your hotspot is connected but there is no internet. Customers join the WiFi, the phone says "connected, no internet", the login page never shows up, and yet when you log in to the MikroTik it has internet and pings fine. In most cases we see, the MikroTik is not the problem. The access point is. Your Tenda, TP-Link or whatever router you use to spread the signal still has its own DHCP server switched on, and it is handing out IP addresses that the MikroTik doesn't know about.

The fix takes two minutes once you know what to look for: turn off DHCP on the access point, or put it in AP mode. Only the MikroTik should give out IP addresses on a hotspot.

*This guide follows our [TikTok on connected-but-no-internet hotspots](https://www.tiktok.com/@bitwavetechnologies/video/7696563357146647815).*

If your hotspot runs on [Bitwave hotspot billing](/hotspot-billing-system-kenya), our support team can look at the router remotely and tell you which port the second DHCP server is plugged into, so you know which device to fix.

## Why is my hotspot connected but no internet?

A hotspot shows "connected but no internet" when the phone got its IP address from the wrong device. If the access point's DHCP server is on, it answers phones before the MikroTik does. Those phones get an address, a gateway and DNS from the access point instead of the MikroTik, so the hotspot never sees them properly and never shows them the login page.

DHCP works like a race. When a phone joins the WiFi it shouts "who can give me an address?" and takes the first answer it hears. On a healthy hotspot only one device answers: the MikroTik. Plug in a Tenda with its DHCP still on, and now two devices answer. Some phones take the MikroTik's address and work normally. Others take the Tenda's address and sit there with WiFi bars and no internet.

That is why the problem looks random. One customer is browsing fine while the person next to them can't get the login page. The same phone can work in the morning and fail in the afternoon, depending on which device answered first.

## How do you tell a second DHCP server is the cause?

The quickest check is the IP address on a customer's phone. Open the WiFi details for the hotspot network and look at the IP address and gateway. If they don't match the MikroTik's hotspot range, a second DHCP server gave them out.

On a MikroTik set up with the usual defaults, hotspot clients get addresses like `192.168.88.x`. Tenda and TP-Link routers usually hand out `192.168.0.x` or `192.168.1.x`. So a phone showing `192.168.0.105` with a gateway of `192.168.0.1` is talking to the access point, not to your hotspot.

<!-- VERIFY: 192.168.88.x is the hotspot range on Bitwave-provisioned routers; confirm before publishing if some resellers use a different range. -->

You can also see it from the MikroTik side in WinBox:

- **IP → DHCP Server → Leases.** If 20 phones are connected but the MikroTik has only two or three leases, most phones are getting their address somewhere else.
- **IP → Hotspot → Hosts.** Look for hosts with addresses outside your hotspot range, such as `192.168.1.x`. Two or more clients in the same foreign range is a strong sign.
- **Log.** Messages like `host removed: limiting addresses per mac` mean the same phone is bouncing between two addresses, one from each DHCP server.

If you still aren't sure, unplug the access point you suspect, then have a customer turn WiFi off and on. If their phone now gets a `192.168.88.x` address and the login page appears, you have found it.

## How do you fix it?

Turn off the DHCP server on every access point plugged into your MikroTik. If you don't know where that setting is on your Tenda or TP-Link, switch the device to **AP mode** instead. AP mode turns off the DHCP server for you and makes the device a plain access point.

Step by step:

1. Log in to the access point's admin page from a laptop or phone connected to it directly.
2. Find the DHCP server setting (usually under LAN or Network settings) and disable it. Or find the operating mode and choose AP mode / Access Point mode.
3. Save. The device may reboot.
4. Make sure the cable from the MikroTik goes into one of the access point's LAN ports. If the access point is in AP mode, follow the manual for which port to use.
5. Ask customers to turn WiFi off and on once so their phones ask for a fresh address. This time only the MikroTik answers.

After the fix, the number of DHCP leases on the MikroTik should be close to the number of phones connected to the hotspot. If it is, you're done.

Do this for every extra router you add later. The most common way this comes back is someone adding a second Tenda to stretch coverage to a new block, plugging it in straight out of the box, and forgetting that its DHCP is on by default.

## What else causes "connected, no internet" on a hotspot?

If the access points are clean and phones still get no internet, run through these checks before calling anyone:

- **Is the MikroTik's own internet up?** In WinBox, open a terminal and ping `8.8.8.8`. If that fails, the problem is your internet line, not the hotspot.
- **Is the access point cabled to the right port?** It must go into a port that is part of the hotspot. A port left outside the hotspot bridge gives customers WiFi bars and nothing else.
- **Is it a second-hand router?** Routers bought from another provider sometimes keep an old DHCP pool on a different subnet from the hotspot. Phones get an address but no working gateway. Reset the router to factory settings before you set it up for your business.
- **Does the login page load but never finish?** Then the hotspot is working and the problem is the portal. Your billing provider's portal address has to be allowed before login (the walled garden), or the page can't load.

A related case: if one access point is plugged in through its WAN port with its own DHCP on, every customer behind it shares the access point's address, so the hotspot sees one device instead of twenty. That one usually shows up as "everyone gets internet when one person pays". The fix is the same: turn the device into an access point.

If you are setting up a new site, our [MikroTik hotspot setup guide](/blog/mikrotik-hotspot-setup-10-minutes) covers the whole router side, and [the common hotspot business mistakes](/blog/hotspot-business-mistakes-kenya) post lists other things that cost new operators customers in the first month.

## FAQ

**Why does my phone say connected but no internet on hotspot WiFi?**

Usually because it got its IP address from an access point instead of the MikroTik. Check the phone's WiFi details: if the address starts with `192.168.0.` or `192.168.1.` while your hotspot uses `192.168.88.`, a second DHCP server answered. Turn off DHCP on that access point.

**Should DHCP be on or off on the access point for a hotspot?**

Off. On a MikroTik hotspot, only the MikroTik should hand out IP addresses. Every Tenda, TP-Link or other access point behind it should have DHCP disabled or be in AP mode.

**Does AP mode turn off DHCP on a Tenda router?**

Yes. Switching a Tenda or similar router to AP mode turns off its DHCP server, so it just passes phones through to the MikroTik. If you can't find the DHCP setting, AP mode is the easier option.

## Keep the hotspot running

Most "no internet" calls are a cable, a port or a setting, not the internet line. If you would rather have someone check the router for you when it happens, [set up your hotspot on Bitwave](/signup) and we'll look at it with you.
