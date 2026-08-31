---
title: MikroTik PPPoE Setup: Connect a Tenda F3 in 10 Minutes
description: MikroTik PPPoE setup guide: connect an RB951 to a Tenda F3, create customer credentials, and test the link in under 10 minutes.
date: 2026-08-26
tags: mikrotik, pppoe, tenda f3, isp setup
category: pppoe
image: /blog-images/mikrotik-pppoe-setup-tenda-f3/cover-crisp.webp
imageAlt: Clear close-up of a wired WiFi router used in a MikroTik PPPoE setup
published: true
---

<!-- Cover source: https://www.pexels.com/photo/modern-wifi-6-router-on-wooden-desk-32698507/ | License: https://www.pexels.com/license/ -->

A MikroTik PPPoE setup lets an ISP authenticate each customer with a username and password, control access from the MikroTik, and deliver the connection through an ordinary customer router. In this example, internet enters a MikroTik RB951 on ether1 and leaves through ether2 to a Tenda F3.

The physical setup is simple: one MikroTik, one Tenda router, and two ethernet cables. The MikroTik controls the PPPoE account. The Tenda uses that account to connect, then supplies WiFi inside the customer's house or shop.

If you want the billing platform to handle the customer account and router management, you can [create a Bitwave account](/signup) before starting. The source video demonstrates the complete connection in less than ten minutes.

*This guide follows our [MikroTik-to-Tenda PPPoE TikTok tutorial](https://www.tiktok.com/@bitwavetechnologies/video/7640488584063110407).*

## How does a MikroTik PPPoE setup work?

A MikroTik PPPoE setup separates the ISP network from the customer's local network. The MikroTik receives internet from the upstream provider, runs the PPPoE service, and checks the customer's username and password. The Tenda F3 logs in as the customer and shares the approved connection over WiFi and its LAN ports.

The connection follows this path:

| Connection | Purpose |
|---|---|
| ISP or upstream router to MikroTik ether1 | Brings internet into the MikroTik |
| MikroTik ether2 to Tenda WAN port | Carries the customer's PPPoE connection |
| Tenda WiFi or LAN ports to customer devices | Provides internet inside the premises |

Keeping these roles clear prevents the most common cabling mistake: connecting the Tenda to the MikroTik's upstream port.

## What equipment do you need?

You need a MikroTik router that can run the PPPoE service, a customer router that supports PPPoE on its WAN interface, and two working ethernet cables. The video uses a MikroTik RB951 and a Tenda F3, but the same layout can work with other MikroTik and customer-router models.

For this setup, prepare:

- A MikroTik RB951 or another supported MikroTik
- A Tenda F3 or another router with a PPPoE WAN option
- One ethernet cable for the upstream internet
- One ethernet cable between the MikroTik and Tenda
- A laptop or phone for opening the router settings
- A PPPoE username and password for the customer

If you are still choosing equipment for your first site, read our [WiFi hotspot business guide for Kenya](/blog/how-to-start-wifi-hotspot-business-kenya) before buying routers and access points.

## How do you complete the MikroTik PPPoE setup?

The setup has six parts: connect the MikroTik to Bitwave, assign the correct physical ports, connect the upstream internet, create the customer's PPPoE account, enter the credentials on the Tenda F3, and confirm that the Tenda receives internet.

### 1. Connect the MikroTik to your billing system

Sign in to Bitwave and connect the MikroTik router to your account. The router should appear in the dashboard before you create the customer.

This gives you one place to manage the router and the customer's PPPoE account. It also makes later changes easier because you do not have to manage every customer directly inside RouterOS.

### 2. Put the upstream internet on ether1

Connect the cable from your ISP, fibre terminal, upstream router, or other internet source to ether1 on the MikroTik.

Check that the MikroTik itself has internet before continuing. If the upstream connection is down, the Tenda may authenticate successfully but still have no usable internet.

### 3. Configure PPPoE on ether2

Use ether2 as the customer-facing PPPoE port. This is the port that will connect to the Tenda F3.

The PPPoE service must listen on the interface used for the customer connection. If it is attached to a different bridge or ethernet port, the Tenda will keep trying to connect but will never reach the service.

Keep ether1 and ether2 in their assigned roles:

- ether1: upstream internet
- ether2: PPPoE customer connection

### 4. Connect ether2 to the Tenda F3

Run the second ethernet cable from MikroTik ether2 to the Tenda F3's WAN or Internet port. Dennis refers to this as port 1 on the Tenda in the video.

Do not connect the cable to one of the Tenda's ordinary LAN ports. The PPPoE username and password are entered on the WAN connection, so the cable must use the port assigned to that connection.

### 5. Create the PPPoE customer

Create a customer in Bitwave and assign that customer a PPPoE username and password. Use credentials that are unique to that customer.

Copy both values carefully. PPPoE credentials are case-sensitive, and an extra space or mistyped character is enough to stop the connection.

This account is what lets the MikroTik identify the customer. It can also be tied to the customer's package, access status, and bandwidth settings.

### 6. Enter the credentials on the Tenda

Open the Tenda F3 administration page and find its internet or WAN settings. Choose PPPoE as the internet connection type.

Enter the username and password created for the customer, save the settings, and allow the Tenda a short time to connect. Once authenticated, its internet status should change to connected.

Join the Tenda WiFi from a phone or laptop and open a website. The video also checks the resulting speed to confirm that traffic is passing through the MikroTik.

## How do you check that the connection is working?

A working setup has physical link lights on both routers, a connected PPPoE session on the MikroTik, and a connected internet status on the Tenda. The final test is a phone or laptop using the Tenda WiFi to load a website or run a speed test.

Check the connection in this order:

1. Confirm that the upstream cable is connected to MikroTik ether1.
2. Confirm that ether2 is connected to the Tenda WAN port.
3. Check that the customer's PPPoE session appears as active.
4. Confirm that the Tenda reports its internet connection as connected.
5. Test browsing from a device connected to the Tenda.

Following that order helps you identify which side of the connection has failed.

## Why is the Tenda F3 not connecting?

If the Tenda reports that PPPoE is disconnected, first re-enter the username and password. Compare them directly with the customer account in Bitwave.

Next, check the cable between MikroTik ether2 and the Tenda WAN port. A link light should appear at both ends. If there is no light, try another cable before changing the router configuration.

If the cable works and the credentials are correct, confirm that the PPPoE service is assigned to ether2. A service listening on the wrong interface cannot receive the Tenda's login request.

When the Tenda shows connected but customer devices still have no internet, test the upstream connection on ether1. The PPPoE session and upstream internet are separate parts of the setup; one can work while the other is down.

## How does billing help when you add more customers?

A single test customer can be managed directly on a MikroTik. That becomes awkward when customers join, expire, change packages, or need new credentials.

Bitwave keeps the customer account, package, access status, and router connection together. You can create a separate PPPoE account for each customer instead of sharing one password across several houses.

This also gives you a cleaner record of which customer owns each connection. If a customer stops paying or changes package, you update the account attached to that customer rather than rebuilding the Tenda configuration.

## FAQ

**Can a Tenda F3 connect to a MikroTik using PPPoE?**

Yes. Set the Tenda F3's WAN connection type to PPPoE, then enter the username and password created on the MikroTik or through Bitwave. Connect the Tenda WAN port to the MikroTik interface running the PPPoE service.

**Which MikroTik port should I use for PPPoE customers?**

The source video uses ether2 for the customer connection and ether1 for upstream internet. Other ports can be used, but the physical cable and the interface selected for the PPPoE service must match.

**Do I need a public IP address for this setup?**

The demonstrated connection does not depend on the customer having a public IP address. The Tenda authenticates to the MikroTik with PPPoE credentials, and the MikroTik provides access through its upstream internet connection.

## Set up your first PPPoE customer

[Create your Bitwave account](/signup), connect your MikroTik, and add the first customer credentials. With the ports mapped correctly, the MikroTik RB951 and Tenda F3 can be connected and tested in under ten minutes.
