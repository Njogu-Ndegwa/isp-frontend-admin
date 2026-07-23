---
title: MikroTik Hotspot Setup in Under 10 Minutes (Works on hAP lite)
description: Set up a MikroTik router for hotspot or PPPoE billing in under 10 minutes — reset, Winbox, one provisioning command. Works on RB951, hAP lite and hEX.
date: 2026-07-15
tags: mikrotik, hotspot, winbox, setup
category: mikrotik
image: /blog-images/mikrotik-hotspot-setup-10-minutes/cover.webp
imageAlt: MikroTik hAP lite held up showing its yellow ethernet ports
published: false
---

Setting up a MikroTik router for a hotspot business sounds intimidating — RouterOS has hundreds of menus, and one wrong firewall rule can lock you out. But with the right flow it takes less than 10 minutes, and it works on everything from a hAP lite to an RB951 or a hEX. This is the exact process we use, step by step.

*This guide follows our [TikTok tutorial](https://www.tiktok.com/@bitwavetechnologies/video/7662648828603993352) — watch it for the visual version.*

## What you need

- Any MikroTik router running RouterOS — RB951, hAP lite, hEX, or bigger
- A laptop connected to the router (any LAN port, ether2–ether5)
- An internet connection plugged into **port 1 (ether1)** of the MikroTik
- [Winbox](https://mikrotik.com/download) — MikroTik's free management tool

## Step 1: Connect and open Winbox

Connect the MikroTik to your laptop with an ethernet cable, then open Winbox. If you don't have Winbox yet, download it free from MikroTik's site. Winbox finds your router on the Neighbors tab even before it has an IP address — connect by MAC address.

## Step 2: Reset the router to a clean state

You want a fresh router with no leftover configuration — especially if the router is second-hand, since old settings can silently break your hotspot later.

In Winbox: **System → Reset Configuration**, then confirm.

![Winbox reset configuration confirmation dialog during MikroTik hotspot setup](/blog-images/mikrotik-hotspot-setup-10-minutes/winbox-reset-confirmation.webp)

After the reboot, log in with the default password printed on the sticker at the back of the router. RouterOS may ask you to change the password — that's normal, go ahead.

## Step 3: Open the terminal

Inside Winbox, open **New Terminal**. Everything else happens with a single command you'll paste here — no manual menu clicking.

## Step 4: Get your provisioning command from Bitwave

On your laptop, go to [bitwavetechnologies.com](https://bitwavetechnologies.com) and sign up. You're redirected straight into the setup flow, and the first step is **token provisioning**: the platform generates a one-line command tied to your account.

![Bitwave setup page showing the generated MikroTik provisioning command ready to copy](/blog-images/mikrotik-hotspot-setup-10-minutes/bitwave-provisioning-token.webp)

Copy that command and paste it into the Winbox terminal, then hit Enter.

The router now downloads its full configuration from the internet — hotspot, captive portal, user packages and M-Pesa payment flow, all pre-configured. That's why ether1 must have a live internet connection.

## Step 5: Reboot and you're done

After about 20 seconds the download completes and the router asks to reboot — click yes. When it comes back up, your hotspot is live: customers connect to the WiFi, land on your branded portal, and pay via M-Pesa.

## Troubleshooting

- **Download does nothing?** Check that port 1 actually has internet — an ethernet cable that's plugged in but has no upstream connection is the most common cause.
- **Second-hand router acting strangely after setup?** Reset again and make sure the reset completed before pasting the command. Old provider config on ex-ISP routers is a known trap.
- **Stuck anywhere?** Comment "help" on the TikTok or call the number in our bio — free setup help is part of the deal.

## FAQ

**Does this work on a hAP lite?**
Yes — hAP lite, RB951, hEX, and any MikroTik running RouterOS. One caveat from the field: on RouterOS 7.20 and newer, small models like the hAP lite ship the hotspot feature as a separate package that must be installed once before setup. If the import stops with a script error at a hotspot line, that's the cause — install the hotspot package for your exact RouterOS version, reboot, and rerun the command (or call us and we'll do it with you, free).

**Do I need to know RouterOS commands?**
No. The reset and one pasted command are all the terminal work; the platform configures the rest.

**Can I use this for PPPoE instead of hotspot?**
Yes — the same provisioning flow supports both hotspot and PPPoE billing; you choose your setup in the platform.

## Set up your first router now

[Create a free Bitwave account](/signup) and have your MikroTik selling WiFi in under 10 minutes. If you get stuck, free help is a phone call away.
