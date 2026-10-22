---
title: OLT vs Media Converter: Which One Does Your Fibre ISP Need?
description: OLT vs media converter: a media converter feeds one router over fibre. An OLT with splitters serves many homes. How each works and when to switch.
date: 2026-11-27
tags: olt vs media converter, media converter, olt, gpon, fibre isp, pppoe
category: pppoe
image: /blog-images/olt-vs-media-converter/cover.webp
imageAlt: A fibre media converter held up to the camera, showing its Ethernet port, status lights and fibre port
published: true
---

<!-- Cover source: frame at 00:22 of Dennis's raw take for TikTok 7692710395789757714 (C:\Biwavte-Content-Library\source-videos\olt-vs-mc\IMG_8113.MOV, 1080x1920 HLG, tone-mapped to SDR). Full frame added to the photo library as equipment/equipment_media-converter-held_20261004_olt-or-media-converter_00-22.jpg. Cover is a 720x405 crop around the device, no upscaling. -->

OLT vs media converter depends on how many homes you want to serve. A media converter takes one fibre in and gives one Ethernet cable out, so it feeds a single router. An OLT sends one fibre to a splitter, and the splitter divides it among many homes. Serving many homes, use an OLT. Feeding one router with a simple setup, use a media converter.

Someone asked Dennis this in the comments of one of our TikToks, and it comes up a lot from operators moving from hotspots into home internet. Many fibre home ISPs in Kenya sell monthly PPPoE subscriptions on top of this hardware, and whichever way you build the fibre side, [Bitwave's PPPoE billing](/pppoe-billing-system-kenya) handles the subscriber accounts, M-Pesa renewals and disconnections at expiry.

*This post is based on two of our TikToks: [OLT or media converter?](https://www.tiktok.com/@bitwavetechnologies/video/7692710395789757714) and [what a media converter does](https://www.tiktok.com/@bitwavetechnologies/video/7691720087719464210).*

## What does a media converter do?

A media converter changes the signal from one type of cable to another. In an ISP network it turns the electrical signal on an Ethernet cable into light on a fibre cable, or turns light back into an Ethernet signal your router can use.

You use one because fibre goes further. An Ethernet run is limited to about 100 metres, and copper picks up electrical interference along the way. Fibre carries light, so it can run much longer distances and isn't affected by that interference. That is why operators use fibre drop cable when the internet has to reach a building or a mast that is far from their base.

Media converters work in pairs, one at each end of the fibre:

1. At your end, the first converter takes Ethernet from your MikroTik or switch and sends it down the fibre as light.
2. At the far end, the second converter takes the light and gives it back as Ethernet.
3. The customer's router, or your access point, plugs into that second converter.

Single-fibre converters are sold as matched A and B units that use different wavelengths in each direction, so buy them as a pair and put one at each end.

## How does an OLT serve many homes?

An OLT (optical line terminal) sits at your base and connects to your core router. One fibre leaves an OLT port and goes to a passive splitter, which divides that fibre into several outputs, commonly 1:8, 1:16 or 1:32. Each output runs to a home, where a small box called an ONU (or ONT) turns the light back into Ethernet and often WiFi.

This design is called a PON, a passive optical network. GPON and EPON are the two common types, and you will often see both sold as "xPON". The splitters need no power, so nothing between your base and the homes has to be plugged in.

The homes on one OLT port share that port's capacity. A GPON port carries about 2.5 Gbps down and 1.25 Gbps up, divided among everyone on the split. That is plenty for a group of home subscribers, but it is worth knowing when you plan how many homes to put on each port.

## OLT vs media converter: which should you use?

Use a media converter when you need to carry internet over fibre to one place: one customer's router, one building, or one access point at a hotspot site. Use an OLT when you want to connect many homes from the same base, because one fibre and a splitter can serve a whole street.

| | Media converter | OLT + splitters |
|---|---|---|
| Fibre layout | One fibre per connection (point to point) | One fibre from the OLT port, split to many homes |
| At your base | One converter per customer | One OLT, one port per group of homes |
| At the customer | A second converter, then a router | An ONU (often with built-in WiFi) |
| Best for | One router, one building, one remote access point | Many homes on the same route |
| Setup | Plug in and go | Needs configuring and planning the splits |

The cost difference shows up as you grow. With media converters, every new home needs its own fibre run back to your base, a converter at each end, and a free port on your switch. After a few homes that becomes a lot of cable and a lot of small boxes to power and fault-find. An OLT costs more at the start, but each extra home only needs a splitter output, a drop cable and an ONU.
<!-- VERIFY: Dennis, add your own rule for the number of homes where you would move from media converters to an OLT, and typical KES prices for a media converter pair, an entry-level OLT and an ONU if you want them in the post. -->

## Can you use a media converter for a hotspot?

Yes, and this is where many hotspot operators first meet one. If your access point or a second hotspot site is more than about 100 metres from your MikroTik, Ethernet will not reach reliably. Run fibre instead and put a media converter at each end. The access point sees an ordinary Ethernet connection, and your MikroTik still runs the login page and packages. If you are planning a site without a fibre provider at all, read [how to run a hotspot business without fibre](/blog/hotspot-business-without-fibre-kenya).

## How does PPPoE work over OLT or media converter fibre?

PPPoE works the same over both. Your MikroTik runs the PPPoE server, and the customer's router or ONU logs in with a username and password.

- **Media converter:** the far-end converter plugs into the customer's router, and that router is set to PPPoE, just like the MikroTik and Tenda F3 setup in our [MikroTik PPPoE setup guide](/blog/mikrotik-pppoe-setup-tenda-f3).
- **OLT:** the ONU is either set to bridge mode, with a separate router doing the PPPoE login, or set to router mode, where the ONU logs in with PPPoE itself.

Either way, every customer has their own PPPoE account, so billing per home works the same. If you are still deciding between selling home subscriptions and running a hotspot, read [PPPoE vs hotspot](/blog/pppoe-vs-hotspot) first.

## How do you check a media converter when the internet drops?

Look at the lights before you reset anything. If the media converter isn't there, or it's faulty, your router gets nothing. Check three lights:

1. **Power.** If it is off, check the adapter and the socket.
2. **Fibre link (marked FX).** If it is off, the problem is usually on the fibre line, not your router.
3. **LAN (marked TP or LAN).** If it is off, check the Ethernet cable between the converter and the router.

A fibre light that is off usually means a broken or bent cable, a dirty connector, or a problem at the other end. Resetting the router won't fix any of those. Call your provider, or whoever installed the line, before you start changing settings.

## FAQ

**Is an OLT better than a media converter?**

Neither is better in general. A media converter is cheaper and simpler when you only need to feed one router or one building over fibre. An OLT is better when you want to connect many homes, because one fibre and a splitter can serve a group of homes.

**Do media converters always come in pairs?**

For a point-to-point link, yes. One converter turns Ethernet into light at your end and the other turns it back into Ethernet at the far end. Single-fibre models come as an A and B pair that must be used together.

**Can I run PPPoE on a GPON network?**

Yes. The MikroTik runs the PPPoE server, and either the ONU or a router behind it logs in with the customer's PPPoE username and password. Each home gets its own account, so you can bill each one separately.

## Bill your fibre customers

Once the fibre is in, the work is keeping each home's account in step with what they have paid. [Create your Bitwave account](/signup) and connect your MikroTik to start billing PPPoE subscribers by M-Pesa.
