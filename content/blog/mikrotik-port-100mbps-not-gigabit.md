---
title: MikroTik Port Running at 100Mbps Instead of 1000? Fix It
description: MikroTik port running at 100Mbps instead of 1000? Usually one bad wire or crimp in the cable. Check the Rate in WinBox and fix it in minutes.
date: 2026-12-11
tags: mikrotik, gigabit, ethernet cable, winbox, routeros, slow internet
category: mikrotik
image: /blog-images/mikrotik-port-100mbps-not-gigabit/cover.webp
imageAlt: WinBox open on a laptop, ready to log in to a MikroTik router and check its port rate
published: true
---

<!-- Cover source: Biwavte photo library, dashboard/dashboard_winbox-setup-laptop_20260715_a-detailed-tutorial-on-how_01-00.jpg (own TikTok frame, 720x1280 source, cropped to 720x405 at --focus 0.30; caption band below the crop). The demo router's MAC address was blurred in both places it appeared. Visual verdict: sharp enough, WinBox and the MikroTik logo read at 360 px. -->

You pay for 200 Mbps, but your customers only ever get about 100. If your MikroTik port is running at 100Mbps instead of 1000, the router is quietly dropping half your internet and gives you no warning. The cause is almost always the Ethernet cable: gigabit needs all 8 wires inside it, and 100 Mbps needs only 4. One broken wire or a bad crimp and the port falls back to 100.

You can confirm it in under a minute. Open WinBox, go to Interfaces, double-click the port your internet comes in on and look at the Rate. If it says 100Mbps on a gigabit router, check the cable. If your billing dashboard shows live bandwidth, like [Bitwave's hotspot billing](/hotspot-billing-system-kenya) does, a total that never climbs past about 95 Mbps on a 200 Mbps line is the first clue.

*This post is based on our [TikTok on MikroTik gigabit ports stuck at 100 Mbps](https://www.tiktok.com/@bitwavetechnologies/video/7699185901565480210).*

## Why is my MikroTik port running at 100Mbps instead of 1000?

A gigabit MikroTik port drops to 100 Mbps when the link can only use two of the four wire pairs in the cable. That happens when one of the 8 wires is broken, a connector is badly crimped, or the cable itself only has 4 wires. The port still connects, so nothing looks wrong, but it carries half your capacity or less.

An Ethernet cable has 8 small wires inside, twisted into 4 pairs. 100 Mbps Ethernet uses 2 of those pairs: 4 wires. Gigabit uses all 4 pairs: 8 wires. When the two ends of the cable negotiate a speed, they agree on the fastest one that works. If any of the extra wires gigabit needs is faulty, they settle on 100 Mbps and carry on.

The common causes, roughly in the order we find them:

- **A bad crimp.** One wire not pushed fully into the RJ45 connector, or the wires in the wrong order.
- **A broken wire.** A cable bent sharply, stepped on, pinched in a door or chewed somewhere along the run.
- **The wrong cable.** Cheap 4-wire cable, sometimes sold as "Ethernet cable", only ever carries 100 Mbps.
- **A 100 Mbps device at the other end.** If the media converter or ISP box only has 100 Mbps ports, the link can't go faster. Our post on [OLTs and media converters](/blog/olt-vs-media-converter) covers that equipment.

## How do you check the port speed in WinBox?

In WinBox, open Interfaces, double-click the interface your internet comes in on, and look at the Rate field. 1Gbps means the port is working at full speed. 100Mbps on a gigabit router means the cable or the device at the other end is holding it back.

Step by step:

1. Log in to the router with WinBox.
2. Click **Interfaces** in the left menu.
3. Find the WAN port, the one your internet line plugs into. It's often ether1.
4. Double-click it and open the **Status** tab.
5. Read **Rate**, and check that **Full Duplex** is ticked.

<!-- VERIFY: field location. On recent WinBox builds Rate and Full Duplex appear on the interface's Status tab; confirm on both RouterOS 6 and 7 WinBox before publishing, and add a screenshot if possible. -->

From the RouterOS terminal you get the same information with:

```
/interface ethernet monitor ether1 once
```

Look at the `rate` line. It also shows whether auto-negotiation finished and whether the link is full duplex. Check the LAN port that feeds your access points too. A 100 Mbps link there limits every customer behind that access point.

## Is my router just a 100 Mbps router?

Some MikroTik routers have 100 Mbps ports by design, and no cable will make them faster. The hAP lite and the RB951Ui-2HnD both have 100 Mbps Ethernet ports. On those, a Rate of 100Mbps is normal, and if your internet line is faster than 100 Mbps the router itself is the bottleneck.

Routers with Gigabit ports include the hEX, the L009 and the RB4011. If you're on a hAP lite or RB951 and your provider has upgraded you past 100 Mbps, it's time for one of those. Our guide to the [best MikroTik router for a hotspot business in Kenya](/blog/best-mikrotik-router-hotspot-kenya) compares them by price and number of users.

## How do you fix a gigabit port stuck at 100 Mbps?

Replace or re-crimp the cable first, because that fixes most cases. Use a full 8-wire Cat5e or Cat6 cable, crimp both ends to the same standard (T568B on both is the usual choice), and check that every wire reaches the end of the connector. Then reconnect and check the Rate again.

If that doesn't do it, work through these:

1. **Swap in a short, known-good patch cable** between the router and the ISP device. If the Rate jumps to 1Gbps, the problem is your long cable run.
2. **Run a cable test on the router.** Many MikroTik models support `/interface ethernet cable-test ether1`, which reports each pair and can show where a wire is open or shorted.
3. **Check the device at the other end.** Log in to the ONT, media converter or ISP router and confirm its port is gigabit.
4. **Leave auto-negotiation on.** Forcing the speed on one side only can cause a duplex mismatch, which is slower than a clean 100 Mbps link. In the interface's Ethernet tab, auto-negotiation should be ticked and the advertised speeds should include 1G full.
5. **Keep runs under 100 metres.** That is the limit for copper Ethernet. Past it, use a switch in between or fibre.

<!-- VERIFY: cable-test support varies by model and RouterOS version; confirm it works on the routers Bitwave customers commonly use (hEX, L009, RB4011). -->

## How do you know if your customers are affected?

Your customers are affected if total usage never goes above about 95 Mbps, even at your busiest hour on a line rated higher than that. Each customer's own speed limit can look normal, but there isn't enough capacity to go round, so evenings feel slow for everyone.

That's why the problem goes unnoticed. Nobody gets an error. The internet just feels slow at 8 PM, and the owner blames the ISP or the number of users. If your evening bandwidth graph runs flat along a ceiling near 100 Mbps, check the port rate before anything else. If the graph isn't full at all, the slowdown is something else, and our post on [why hotspots slow down in the evening](/blog/hotspot-slow-evenings) covers the other causes.

On Bitwave you can watch live bandwidth and the 24-hour bandwidth history for each router from your phone, [whether you run hotspot or PPPoE](/pppoe-billing-system-kenya), so a flat line at 100 Mbps is easy to spot.

## FAQ

**Why does my gigabit MikroTik show 100Mbps?**

Usually because of the Ethernet cable. Gigabit needs all 8 wires; 100 Mbps uses only 4. If one wire is broken, badly crimped, or the cable only has 4 wires, the port drops to 100 Mbps without warning. The other common cause is a device at the other end that only supports 100 Mbps.

**Can a bad Ethernet cable cut my internet speed in half?**

Yes. On a 200 Mbps line, a cable fault that drops the link to 100 Mbps leaves you with half your capacity, and real throughput ends up slightly below 100 Mbps. Re-crimping or replacing the cable with a full 8-wire Cat5e or Cat6 cable usually brings the port back to 1Gbps.

**Are hAP lite ports gigabit?**

No. The hAP lite and the RB951Ui-2HnD have 100 Mbps Ethernet ports, so 100Mbps is their normal rate. If your internet line is faster than 100 Mbps, you need a MikroTik with Gigabit ports, such as the hEX, L009 or RB4011.

## Check yours now

Open WinBox and look at the Rate on your internet port. Then tell us on the TikTok what yours says. If you want to see your bandwidth ceiling without opening WinBox, [connect your MikroTik to Bitwave](/signup) and watch the live graph from your phone.
