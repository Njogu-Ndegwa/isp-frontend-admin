---
title: Hotspot Internet Slow in the Evening? It May Not Be Bandwidth
description: Hotspot internet slow in the evening but your bandwidth graph isn't full? A small MikroTik's DNS cache may be the cause. How to check it and fix it.
date: 2026-11-20
tags: slow internet, hotspot, mikrotik, dns cache, evening peak, bandwidth
category: hotspot
image: /blog-images/hotspot-slow-evenings/cover.webp
imageAlt: Bitwave bandwidth history graph showing hotspot traffic well below the line's capacity, the typical picture when hotspot internet is slow in the evening for another reason
published: true
---

<!-- Cover source: Biwavte photo library, dashboard/dashboard_bandwidth-history-graph_20260527_i-make-800-shillings-a_00-40.jpg (own app screen recording, 720x1280 source, cropped to 554x312 with --zoom 1.3 --focus 0.605; the partial phone number at the top edge and the caption band are outside the crop) -->

Every evening at around 7, the calls start: "net iko slow". Your hotspot internet is slow in the evening, so the obvious guess is that too many customers are online and you've run out of bandwidth. Many operators go straight to their internet provider and pay for a bigger line. Then the evenings stay slow anyway.

If your bandwidth graph isn't full when the complaints come in, bandwidth isn't the problem. In our experience the usual cause is the MikroTik itself: a small router runs out of memory for its DNS cache when every phone in the area is online at once, and every page starts to hang before it loads.

*This guide follows our [TikTok on slow hotspot internet in the evening](https://www.tiktok.com/@bitwavetechnologies/video/7674518099122490632).*

If you run your hotspot on [Bitwave hotspot billing](/hotspot-billing-system-kenya), the router card in the dashboard shows CPU load, memory, live bandwidth and the number of hotspot users online, so you can look at all four during the evening rush instead of guessing.

## Why is my hotspot internet slow in the evening?

When hotspot internet is slow in the evening but the bandwidth graph is not at the top of your line, the router is usually the bottleneck, not the internet line. The most common cause we see is a MikroTik with too little memory: its DNS cache fills up at peak time, so it has to look up the same sites again and again.

Here is what happens. Before a phone can open TikTok, WhatsApp or YouTube, it has to ask "where is this site?" That question is a DNS lookup, and on a hotspot the phone asks the MikroTik. The MikroTik finds the answer and keeps it in a cache in its memory, so the next phone that asks gets the answer straight away.

At 10 in the morning, with a handful of customers, that cache is small and fast. At 7 in the evening, with a hundred phones online, every one of them asking for dozens of sites, the cache fills up. On a router with very little memory, old answers get thrown out to make room and the router keeps going back out to look up sites it looked up a minute ago. Each page waits for that lookup before it even starts loading.

To a customer that feels exactly like slow internet. The page hangs, then loads at normal speed. But your line isn't full, which is why buying more bandwidth doesn't help.

## How do you check if DNS is the problem?

Check the router during the slow period, not in the morning. Open WinBox at around 7 pm and look at three things: memory, the DNS cache and the bandwidth graph. If memory is nearly used up and the cache is full while the line is below its limit, DNS is a good suspect.

1. **System → Resources.** Note the free memory and CPU load. A router with only a few megabytes free at peak time is struggling.
2. **IP → DNS.** Compare **Cache Used** with **Cache Size**. If the cache is used up during the evening rush, the router is throwing out answers to make room.
3. **Your bandwidth graph.** Look at the evening traffic against the speed you pay for. If you pay for 20 Mbps and the evening peak sits at 12, the line has room to spare.
4. **A phone on the hotspot.** Open a site you haven't visited today. If it hangs for a few seconds and then loads quickly, the delay is before the download starts, which points at the lookup, not the line.

<!-- VERIFY: Dennis, confirm the WinBox menu names (IP → DNS shows Cache Size / Cache Used; System → Resources shows free memory) match what you show resellers on RouterOS 6 and 7. -->

## How do you fix a slow hotspot in the evening?

If memory is the limit, the real fix is a MikroTik with more memory. A small router like the hAP lite is fine for a first site, but once your evening crowd grows, it can't hold enough DNS answers for everyone at once.

| MikroTik model | RAM |
|---|---|
| hAP lite | 32 MB |
| hAP ac lite | 64 MB |
| RB951Ui-2HnD | 128 MB |
| hEX | 256 MB |
| L009 | 512 MB |

<!-- VERIFY: RAM figures are from MikroTik's published specs (hAP lite RB941-2nD 32 MB, hAP ac lite 64 MB, RB951Ui-2HnD 128 MB, hEX RB750Gr3 256 MB, L009UiGS 512 MB). Check against mikrotik.com before publishing. -->

Moving from a 32 MB router to one with several times the memory gives the DNS cache room to breathe. Our posts on [how many users a MikroTik router can handle](/blog/how-many-users-mikrotik-router) and [the best MikroTik router for a hotspot in Kenya](/blog/best-mikrotik-router-hotspot-kenya) go through which model fits which size of site, and [the MikroTik L009 price in Kenya](/blog/mikrotik-l009-price-kenya) covers the most common upgrade.

If your router has plenty of free memory, you can try raising the DNS cache size under IP → DNS before you buy anything. Don't do it on a router that is already short of memory, because the cache will compete with everything else the router has to do.

<!-- VERIFY: suggestion to raise /ip dns cache-size on routers with spare RAM is general RouterOS practice, not from the video. Keep or cut. -->

## What else makes a hotspot slow at night?

DNS is the cause we see most when the graph isn't full, but rule these out too before spending money:

- **CPU at 100%.** If System → Resources shows the CPU pinned at peak time, the router can't keep up with the traffic. That also points to an upgrade.
- **Too many people on one access point.** A single cheap access point serving a whole plot gets crowded in the evening, even when the router is fine. Customers near the access point are fast, customers far away are slow. Add access points rather than bandwidth.
- **Your provider's line is congested.** If the graph never reaches the speed you pay for, at any time of day, plug a laptop straight into the provider's cable, without the MikroTik, and run a speed test in the evening. If the line is slow even then, the problem is upstream and your provider needs to fix it.
- **Packages are too generous.** If a few customers on unlimited-speed packages are pulling everything, the graph will be full, and that's a real bandwidth problem. Set speed limits per package.

If the graph is full in the evening, you do need more bandwidth, or tighter speed limits. If it isn't, look at the router first.

## FAQ

**Why is my WiFi hotspot slow at night but fast in the morning?**

At night far more phones are online, and each one makes many DNS lookups. On a MikroTik with little memory, the DNS cache fills up and the router keeps looking up the same sites again, so pages hang before loading. If your bandwidth graph isn't full at night, check the router's memory and DNS cache before upgrading your internet.

**Will buying more bandwidth fix slow evening internet on my hotspot?**

Only if your bandwidth graph is actually full in the evening. If the line has room to spare and customers still complain, more bandwidth won't help. The router is the bottleneck, and the usual fix is a MikroTik with more memory.

**Can a hAP lite handle a busy evening hotspot?**

A hAP lite has 32 MB of RAM. That is enough for a small first site, but a crowded evening can fill its DNS cache and memory. When evening complaints start and the graph isn't full, it is time to move to a bigger MikroTik.

## Watch your router, not just your line

Slow evenings cost you customers who go back to buying bundles. [Run your hotspot on Bitwave](/signup) to see router memory, CPU and live bandwidth from your phone, and check our [pricing](/pricing) to see what it costs for a site your size.
