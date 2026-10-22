---
title: How Many Users Can a MikroTik Router Handle? Real Numbers
description: How many users can a MikroTik router handle? Real peaks from our billing system: RB951 56, hAP lite 28 on RouterOS 6 (7 on v7), RB5009 78.
date: 2026-10-30
tags: mikrotik, router capacity, hap lite, rb951, rb5009, routeros, hotspot
category: mikrotik
image: /blog-images/how-many-users-mikrotik-router/cover.webp
imageAlt: MikroTik hAP lite held up to show its Ethernet ports, wired to a Tenda router on a coffee table
published: true
---

<!-- Cover source: Biwavte photo library, equipment/equipment_hap-lite-ports-hands_20260519_hotspot-setup-is-one-of_00-54.jpg (own TikTok frame, 720x1280 source, cropped to 720x405 at --focus 0.60; caption band below the crop, no private data). Visual verdict: slightly soft but the hAP lite and its ports read clearly at 360 px. -->

How many users can a MikroTik router handle? More than Google says, if it's set up right. We pulled the numbers from the routers running on our own billing system. The busiest RB951 had 56 people online at the same time. The busiest hAP lite had 28, but only on RouterOS 6. The top router in the whole system, an RB5009, peaked at 78.

Search results usually say an RB951 carries 20 to 30 people and a hAP lite 5 to 10. Those figures are far below what we see on real hotspots in Kenya. Below are the real numbers, what they mean, and how to read your own router's load before you spend money on a bigger one. If you'd rather watch the numbers on a dashboard than guess, [Bitwave's hotspot billing](/hotspot-billing-system-kenya) shows CPU, memory and users online for every router you connect.

*This post is based on our [TikTok video on real MikroTik router capacity](https://www.tiktok.com/@bitwavetechnologies/video/7695283067061095698).*

## How many users can a MikroTik router handle in the real world?

In our billing system, the busiest router of each model reached these peaks over 30 days: an RB951 carried 56 people online at once, a hAP lite carried 28 on RouterOS 6, and an RB5009 carried 78. A hAP lite on RouterOS 7 never went above 7.

| Router | What Google usually says | Busiest one in our system |
|---|---|---|
| RB951 | 20–30 people | 56 people |
| hAP lite (RouterOS 6) | 5–10 people | 28 people |
| hAP lite (RouterOS 7) | 5–10 people | 7 people |
| RB5009 | not compared | 78 people |

<!-- VERIFY: figures are from the router-capacity video (Oct 2026): peak users online at once, busiest router of each model, last 30 days. Re-pull if this post is updated later. -->

These are people online at the same moment, not the total number of customers who paid that month. A hotspot with 28 people online at 9 PM might sell to well over 100 different phones in a week. When someone asks how many users a router can handle, the number that matters is how many are connected at your busiest hour.

They are also the busiest router of each model, not a ceiling. The RB951 that reached 56 was not falling over at 56. That was simply the most people that site had at once.

## Why is the RB951 a good router to start with?

The RB951 is a good first router because it handled 56 people at once in our system, more than double the 20 to 30 most guides quote, and it costs far less than the routers above it. It has 128 MB of RAM, which is four times what the hAP lite has, and built-in WiFi.

In earlier videos we put the RB951 at 50 to 70 people. The busiest one in our system now sits at 56, so that range holds up. For a plot, a row of shops or a student hostel, it is enough router for a long time.

One limit to know: the common RB951Ui-2HnD has 100 Mbps Ethernet ports. If your internet line is faster than 100 Mbps, the router's ports cap it, no matter how few people are online. We explain that problem in [why a MikroTik port runs at 100 Mbps instead of 1000](/blog/mikrotik-port-100mbps-not-gigabit).

## Does RouterOS 6 or RouterOS 7 matter on a hAP lite?

Yes, a lot. In our system the busiest hAP lite on RouterOS 6 carried 28 people at once. The busiest hAP lite on RouterOS 7 carried 7. Same hardware, four times the users, and the only difference is the RouterOS version.

The hAP lite is a small router with 32 MB of RAM. RouterOS 7 asks more of that memory than RouterOS 6 does, so there is less room left for the hotspot itself. If you are running a hotspot on a hAP lite, check the version in WinBox under System > Resources. If it says 7.x and the router struggles in the evening, RouterOS 6 is the first thing to try.

<!-- VERIFY: confirm the recommended downgrade path for new hAP lite units (some ship with RouterOS 7; downgrade via System > Packages > Downgrade with the 6.49.x long-term package, or Netinstall). Check that current hardware revisions still accept RouterOS 6. -->

We used to tell beginners the hAP lite was not stable past about 5 people. The billing data says a hAP lite on RouterOS 6 can do much better than that. It is still the smallest router in the range, so treat it as a starter and plan the upgrade early.

## How many users can a bigger MikroTik like the RB5009 or RB4011 handle?

The RB5009 is the busiest router in our billing system, with 78 people online at once. That is the highest peak we have on any model. The RB4011, which we used in our first ISP, is built for 200 to 500 people by our estimate, and its CPU never went past 9% for us.

78 people is a lot for a hotspot, but it is not a lot for an RB5009. The owner of that router could probably have done the same job with an L009, which costs less. Before you buy a big router, check whether your network actually needs it. Our [MikroTik L009 price guide](/blog/mikrotik-l009-price-kenya) covers that middle option.

<!-- VERIFY: the 200-500 RB4011 range is Dennis's estimate from the Feb/Mar 2026 RB4011 videos, not a measured peak from the billing system. -->

## What changes how many users your router can carry?

The model sets the ceiling, but your setup decides how close you get to it. RouterOS version, the number of firewall and queue rules, how heavy the traffic is, and the speed of your internet line all affect how many people one MikroTik can serve before it slows down.

- **RouterOS version.** The hAP lite numbers above show how much this matters on small routers.
- **What people are doing.** Fifty people on WhatsApp is lighter work than fifty people streaming video.
- **Rules and queues.** Every package speed limit is a queue. Extra firewall rules, VPNs and scripts all take CPU.
- **Your internet line.** A router can only share what comes in. If the line is full at 8 PM, users will feel slow even when the router is idle. Our post on [why hotspots slow down in the evening](/blog/hotspot-slow-evenings) goes through that.
- **Access points.** A router with headroom can still give a bad experience if one access point is covering too many people.

## How do you check how many users your MikroTik is carrying?

Look at three things at your busiest hour: CPU load, free memory and the number of users online. If the CPU sits near 100% or memory is almost gone while customers complain, the router is the bottleneck. If both have room, look at the internet line or the access points first.

In WinBox, CPU and memory are under System > Resources. Active hotspot users are under IP > Hotspot > Active, and PPPoE users under PPP > Active Connections. In the terminal you can run:

```
/system resource print
/ip hotspot active print count-only
/ppp active print count-only
```

Check at 8 or 9 PM, not at lunchtime. A router that looks relaxed at noon can be at its limit at night. Bitwave puts these numbers on one screen for each router, so you can [check your routers from your phone](/signup) without opening WinBox.

## FAQ

**How many users can a MikroTik hAP lite handle?**

The busiest hAP lite in our billing system had 28 people online at once while running RouterOS 6. The busiest one on RouterOS 7 had only 7. If you use a hAP lite for a hotspot, run RouterOS 6 and plan to upgrade as you grow.

**How many users can an RB951 handle?**

The busiest RB951 in our system carried 56 people online at the same time, against the 20 to 30 most guides quote. We put its practical range at 50 to 70 people. Its 100 Mbps ports are a limit if your internet line is faster than 100 Mbps.

**Is "number of users" the same as number of customers?**

No. Router capacity is about people connected at the same moment. A router that peaks at 30 people online can serve many more paying customers across a day or week, because they don't all connect at once.

## Tell us your number

Comment on the TikTok with the router you use and how many people it carries at peak. If you want to see those numbers for your own routers, [set up Bitwave on your MikroTik](/signup) and the dashboard will show them. Not sure which router to buy next? Read our guide to the [best MikroTik router for a hotspot business in Kenya](/blog/best-mikrotik-router-hotspot-kenya).
