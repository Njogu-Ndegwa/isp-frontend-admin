import type { SolutionPath } from './paths';

/**
 * Copy for the commercial landing pages — one page per buying query a Kenyan
 * operator types ("hotspot billing system kenya", "pppoe billing system
 * kenya" …). Blog posts answer how-to questions; these pages answer "what do I
 * buy", which is what ranks for those queries (competitors win them with
 * exactly this kind of page, not with blog posts).
 *
 * Every page has to stand on its own: a different reader, different steps,
 * different FAQ. Near-copies of one page across four URLs would read as
 * doorway pages to Google and help none of them.
 *
 * Facts must match the product and landingFacts.ts. Prices mirror the pricing
 * page and PricingCalculator — keep all of them in step.
 */

export interface SolutionSection {
  /** Phrased as the question the reader is asking; answered in the first paragraph. */
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface Solution {
  path: SolutionPath;
  /** The search query the page is built around. */
  keyword: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  /** Answers the query in the first 60 words — the passage answer engines lift. */
  intro: string;
  steps: { heading: string; items: { title: string; text: string }[] };
  sections: SolutionSection[];
  pricing: { heading: string; note: string; rows: { setup: string; cost: string }[] };
  faqs: { q: string; a: string }[];
  /** Blog categories whose live posts are listed under "Guides". */
  guideCategories: string[];
  /** Sister solution pages linked at the bottom. */
  related: SolutionPath[];
}

export const SOLUTIONS: Record<SolutionPath, Solution> = {
  '/hotspot-billing-system-kenya': {
    path: '/hotspot-billing-system-kenya',
    keyword: 'hotspot billing system kenya',
    metaTitle: 'Hotspot Billing System in Kenya: M-Pesa & MikroTik | Bitwave',
    metaDescription:
      'Hotspot billing system for Kenyan WiFi businesses: customers pay with M-Pesa on your login page and get online automatically. 3% of revenue, KES 500 min.',
    eyebrow: 'Hotspot billing',
    h1: 'Hotspot billing system for WiFi businesses in Kenya',
    intro:
      'Bitwave is a hotspot billing system for Kenyan WiFi operators. A customer joins your WiFi, picks a package on your login page, pays with M-Pesa and is online the moment the payment confirms. When the package runs out, the MikroTik cuts them off by itself. You pay 3% of hotspot revenue, with a KES 500 monthly minimum.',
    steps: {
      heading: 'How does a customer buy WiFi on a Bitwave hotspot?',
      items: [
        {
          title: 'Connect',
          text: 'They join your WiFi name and the login page opens with your packages, in the order you set.',
        },
        {
          title: 'Choose and pay',
          text: 'They tap a package, say KES 10 for an hour, and approve the M-Pesa prompt that pops up on the phone.',
        },
        {
          title: 'Browse',
          text: 'The package starts as soon as M-Pesa confirms. No voucher to type and no one calling you to say they paid.',
        },
        {
          title: 'Expire',
          text: 'When the time is up the router disconnects them, and the login page is there when they want another package.',
        },
      ],
    },
    sections: [
      {
        heading: 'What does the hotspot billing system include?',
        paragraphs: [
          'Everything a hotspot needs to sell internet without you standing at the door. You set the packages and prices; the system takes the money and switches people on and off.',
        ],
        bullets: [
          'A login page with your business name, colours and package order',
          'Time-based packages, plus free-trial plans that can cover several devices',
          'Plans that cover more than one device, for families and small shops',
          'Vouchers for cash sales: generate a batch, download it as CSV, disable any code',
          'Smart TVs and other devices without a browser, paid for from a phone',
          'SMS payment receipts and expiry reminders, in wording you can edit',
          'Outage compensation that gives customers back the time they lost when your site was down',
          'A walled garden for sites customers can open before they pay',
          'Live view of who is online, their usage, and the health of each router',
        ],
      },
      {
        heading: 'Which MikroTik routers work with Bitwave hotspot billing?',
        paragraphs: [
          'Any MikroTik running RouterOS, from a hAP lite or RB951 up to a hEX and bigger routers. Bitwave configures the router for you: you share access, our team sets up the hotspot, and you never write a RouterOS command. Most operators are selling packages the same day, usually within two hours.',
          'One account can run several routers, so a second plot or a second building is a new router on the same dashboard, not a second system.',
        ],
      },
    ],
    pricing: {
      heading: 'How much does hotspot billing cost?',
      note: '3% of the hotspot revenue that goes through Bitwave, with a KES 500 monthly minimum. No setup fee, and installation is free.',
      rows: [
        { setup: 'KES 10,000 of packages a month', cost: 'KES 500 (the minimum)' },
        { setup: 'KES 30,000 of packages a month', cost: 'KES 900' },
        { setup: 'KES 60,000 of packages a month', cost: 'KES 1,800' },
      ],
    },
    faqs: [
      {
        q: 'Do customers need a voucher to pay for hotspot WiFi?',
        a: 'No. Customers pay with M-Pesa straight from the hotspot login page and are connected as soon as the payment confirms. Vouchers are there if you also want to sell for cash.',
      },
      {
        q: 'Where does the M-Pesa money from my hotspot go?',
        a: "You choose. Payments can be paid out to your M-Pesa paybill, till or bank account, directly or on your payout schedule, or you can connect your own M-Pesa API keys so the STK push runs on your own shortcode.",
      },
      {
        q: 'Can I run hotspot and PPPoE customers on the same account?',
        a: 'Yes. Hotspot packages, PPPoE accounts and static-IP clients sit on one dashboard, and each is billed at its own rate.',
      },
      {
        q: 'What happens to customers when my internet goes down?',
        a: 'Bitwave can run outage compensation, which adds the lost time back to the customers who were affected, so nobody pays for hours they could not use.',
      },
    ],
    guideCategories: ['hotspot', 'mikrotik'],
    related: ['/mpesa-wifi-billing-kenya', '/pppoe-billing-system-kenya', '/wifi-billing-system-kenya'],
  },

  '/pppoe-billing-system-kenya': {
    path: '/pppoe-billing-system-kenya',
    keyword: 'pppoe billing system kenya',
    metaTitle: 'PPPoE Billing System in Kenya: KES 25 per User | Bitwave',
    metaDescription:
      'PPPoE billing for Kenyan home internet providers: M-Pesa payments, automatic disconnection at expiry, SMS receipts. KES 25 per active user a month.',
    eyebrow: 'PPPoE billing',
    h1: 'PPPoE billing system for home internet providers in Kenya',
    intro:
      'If you sell monthly home internet over PPPoE, Bitwave keeps every account in step with what the customer has paid. Each customer gets PPPoE credentials, pays by M-Pesa and is reconnected as soon as the payment lands. Accounts that are not renewed go off on the expiry date. It costs KES 25 per active PPPoE user a month, with a KES 500 minimum.',
    steps: {
      heading: 'How does PPPoE billing work with Bitwave?',
      items: [
        {
          title: 'Register the customer',
          text: 'Add them with a plan. Bitwave generates their PPPoE username and password for the router in their house.',
        },
        {
          title: 'They pay by M-Pesa',
          text: 'The payment is matched to their account automatically and a receipt goes out by SMS.',
        },
        {
          title: 'Reminded before expiry',
          text: 'An SMS reminds them before the month runs out, so renewals come in before the line goes quiet.',
        },
        {
          title: 'Off when unpaid, on when paid',
          text: 'An unpaid account disconnects at expiry. The moment they pay, it comes back without you touching the router.',
        },
      ],
    },
    sections: [
      {
        heading: 'What do you get for your PPPoE customers?',
        paragraphs: [
          'The work that usually eats a PPPoE operator\'s evenings: matching payments, chasing late payers and remembering who to switch off. Bitwave does it from the payment records.',
        ],
        bullets: [
          'PPPoE credentials generated when you register a customer',
          'Automatic disconnection at expiry and reconnection on payment',
          'SMS welcome messages, payment receipts and expiry reminders, in wording you can edit',
          'An Unmatched Payments screen for money sent with the wrong account number, so you can assign it in one step',
          'Static-IP customers on the same dashboard, with suspend and resume',
          'Live usage and a usage history chart for each customer',
          'An activity log on every customer, so you can see what changed and when',
          'Outage compensation to give back days lost to a long outage',
        ],
      },
      {
        heading: 'Does it work with Tenda routers, fibre and wireless links?',
        paragraphs: [
          'Yes. Bitwave works at the MikroTik that runs your PPPoE server, so the link to the house can be fibre through a media converter or OLT, a wireless point-to-point, or a cable run. On the customer side, any router that can dial PPPoE works; many Kenyan operators use a Tenda F3.',
          'Already running customers on spreadsheets or another system? The Bitwave team configures your MikroTik and helps you bring your customer list across.',
        ],
      },
    ],
    pricing: {
      heading: 'How much does PPPoE billing cost?',
      note: 'KES 25 per active PPPoE user per month, with a KES 500 monthly minimum. Disconnected accounts are not counted. No setup fee.',
      rows: [
        { setup: '15 active customers', cost: 'KES 500 (the minimum)' },
        { setup: '30 active customers', cost: 'KES 750' },
        { setup: '100 active customers', cost: 'KES 2,500' },
        { setup: '300 active customers', cost: 'KES 7,500' },
      ],
    },
    faqs: [
      {
        q: 'How do PPPoE customers pay their monthly bill?',
        a: 'By M-Pesa. Each payment is matched to the customer\'s account and the connection is renewed straight away, with an SMS receipt. Payments sent with a wrong account number land on the Unmatched Payments screen for you to assign.',
      },
      {
        q: 'Do I pay for PPPoE customers who are disconnected?',
        a: 'No. The KES 25 is per active PPPoE user per month. A customer who has expired and not renewed is not billed.',
      },
      {
        q: 'Can I move my existing PPPoE customers to Bitwave?',
        a: 'Yes. The Bitwave team configures your MikroTik and helps you bring your existing customers across from spreadsheets or your current system.',
      },
      {
        q: 'Can I also sell hotspot packages on the same network?',
        a: 'Yes. Hotspot packages are billed at 3% of hotspot revenue and sit on the same dashboard as your PPPoE accounts.',
      },
    ],
    guideCategories: ['pppoe', 'mikrotik'],
    related: ['/hotspot-billing-system-kenya', '/mpesa-wifi-billing-kenya', '/wifi-billing-system-kenya'],
  },

  '/mpesa-wifi-billing-kenya': {
    path: '/mpesa-wifi-billing-kenya',
    keyword: 'mpesa wifi billing',
    metaTitle: 'M-Pesa WiFi Billing for Hotspot & PPPoE in Kenya | Bitwave',
    metaDescription:
      'M-Pesa WiFi billing for Kenyan operators: customers pay by STK push or paybill and get online automatically. Payouts to your paybill, till or bank.',
    eyebrow: 'M-Pesa billing',
    h1: 'M-Pesa WiFi billing that switches customers on the moment they pay',
    intro:
      'Bitwave connects M-Pesa to your MikroTik. On a hotspot the customer approves an M-Pesa prompt on your login page; on PPPoE they pay their monthly bill by M-Pesa. Once the payment confirms, Bitwave activates the package. Nobody reads an M-Pesa SMS and types a code into a router.',
    steps: {
      heading: 'How does an M-Pesa payment become an internet connection?',
      items: [
        {
          title: 'Customer pays',
          text: 'An STK push from the hotspot login page, or a monthly payment for a PPPoE account.',
        },
        {
          title: 'M-Pesa confirms',
          text: 'Bitwave receives the confirmation and matches it to the package or the account.',
        },
        {
          title: 'Router acts',
          text: 'The MikroTik lets the customer on immediately and an SMS receipt goes out.',
        },
        {
          title: 'You see it',
          text: 'The payment appears on your transactions page with the time, amount and customer.',
        },
      ],
    },
    sections: [
      {
        heading: 'Where does the M-Pesa money go?',
        paragraphs: [
          'There are two ways to set it up, and you pick one in Settings → Payment Methods.',
        ],
        bullets: [
          'Payouts: customers pay through Bitwave, and your earnings are paid out to your M-Pesa paybill, Buy Goods till or bank account, directly or on your payout schedule. Your account statement shows every payment and every payout.',
          'M-Pesa Direct: connect your own M-Pesa API keys and business shortcode, and the STK push runs on your own paybill.',
        ],
      },
      {
        heading: 'What happens when an M-Pesa payment does not match?',
        paragraphs: [
          'A customer sometimes pays with the wrong account number, or from someone else\'s phone. Those payments are not lost: they sit on the Unmatched Payments screen until you assign them to the right customer, and the customer is connected as soon as you do.',
          'Cash customers can still be served with vouchers, which you generate in batches and download as CSV.',
        ],
      },
    ],
    pricing: {
      heading: 'What does M-Pesa billing cost?',
      note: 'M-Pesa billing is included in the normal Bitwave rates. There is no separate M-Pesa integration fee and no setup fee.',
      rows: [
        { setup: 'Hotspot packages', cost: '3% of revenue' },
        { setup: 'PPPoE customers', cost: 'KES 25 per active user' },
        { setup: 'Monthly minimum', cost: 'KES 500' },
      ],
    },
    faqs: [
      {
        q: 'Do I need my own M-Pesa API account to use Bitwave?',
        a: 'No. You can take payments through Bitwave and have your earnings paid out to your paybill, till or bank account. If you already have M-Pesa API keys, you can connect them instead and run the STK push on your own shortcode.',
      },
      {
        q: 'How fast is a customer connected after paying?',
        a: 'As soon as M-Pesa confirms the payment. Bitwave activates the package on the MikroTik automatically, so the customer does not wait for anyone to check their message.',
      },
      {
        q: 'Can customers pay for WiFi on a smart TV with M-Pesa?',
        a: 'Yes. The TV is registered from a phone using its MAC address, the phone pays with M-Pesa, and the TV then connects without needing a browser.',
      },
    ],
    guideCategories: ['mpesa', 'hotspot'],
    related: ['/hotspot-billing-system-kenya', '/pppoe-billing-system-kenya', '/wifi-billing-system-kenya'],
  },

  '/wifi-billing-system-kenya': {
    path: '/wifi-billing-system-kenya',
    keyword: 'wifi billing system kenya',
    metaTitle: 'WiFi Billing System in Kenya for Plots, Apartments & Hotspots',
    metaDescription:
      'WiFi billing system for Kenyan internet businesses: M-Pesa hotspot packages for public WiFi, PPPoE for homes and apartments, one dashboard for both.',
    eyebrow: 'WiFi billing',
    h1: 'WiFi billing system for plots, apartments and hotspots in Kenya',
    intro:
      'A WiFi billing system decides who gets internet and for how long, based on who has paid. Bitwave does it two ways for Kenyan operators: hotspot billing for pay-as-you-go WiFi bought with M-Pesa, and PPPoE billing for monthly home connections. Most operators start with one and add the other on the same account.',
    steps: {
      heading: 'How do you start selling WiFi with Bitwave?',
      items: [
        {
          title: 'Sign up',
          text: 'Create a free account. Billing starts once you have customers.',
        },
        {
          title: 'Share your MikroTik',
          text: 'Our team configures hotspot, PPPoE or both on your router. You never write RouterOS commands.',
        },
        {
          title: 'Set your packages',
          text: 'Hourly, daily and weekly hotspot packages, monthly PPPoE plans, or both.',
        },
        {
          title: 'Collect by M-Pesa',
          text: 'Customers pay, the router connects them, and expired customers drop off on their own.',
        },
      ],
    },
    sections: [
      {
        heading: 'Which WiFi billing model fits your premises?',
        paragraphs: [
          'Start from how your customers want to pay. People who buy a little at a time want hotspot packages; households that want internet all month want a PPPoE account. Here is how it usually works out:',
        ],
        bullets: [
          'Rental plots and hostels: hotspot packages that tenants buy by the hour, day or week',
          'Apartments and estates with a router in each house: PPPoE accounts billed monthly',
          'Shops, cafés, salons and stages: hotspot, often with a free-trial plan to bring people in',
          'Offices and small businesses: PPPoE, or a static IP for those who need one',
          'A mix of all of these: hotspot and PPPoE on the same account, each billed at its own rate',
        ],
      },
      {
        heading: 'What comes with every Bitwave WiFi billing setup?',
        paragraphs: [
          'Whichever model you run, the basics are the same. Payments come in by M-Pesa and switch customers on automatically. Expired customers are switched off. You can see your routers\' health, who is online and what you earned today from a phone, across as many routers and sites as you run.',
          'Bitwave is billing software, so you bring the internet: fibre, a wireless link or even a 4G/5G router to begin with. Bitwave decides who gets to use it.',
        ],
      },
    ],
    pricing: {
      heading: 'How much does a WiFi billing system cost?',
      note: 'You pay a share of what you earn, not a licence fee. No setup fee, and installation and MikroTik configuration are free.',
      rows: [
        { setup: 'Hotspot', cost: '3% of revenue' },
        { setup: 'PPPoE', cost: 'KES 25 per active user a month' },
        { setup: 'Minimum', cost: 'KES 500 a month' },
      ],
    },
    faqs: [
      {
        q: 'Do I need my own internet connection to use a WiFi billing system?',
        a: 'Yes. Bitwave is the billing system, not the internet provider. You bring the connection, such as fibre, a wireless link or a 4G/5G router, and Bitwave controls who can use it based on payments.',
      },
      {
        q: 'Can I start with one router?',
        a: 'Yes. Many operators start with a single MikroTik hAP lite and add routers as they grow. Every router runs from the same account.',
      },
      {
        q: 'How long does it take to go live?',
        a: 'Most operators are live in under two hours. You share access to your MikroTik, the Bitwave team configures it, and you can sell packages through M-Pesa the same day.',
      },
    ],
    guideCategories: ['business', 'hotspot', 'pppoe'],
    related: ['/hotspot-billing-system-kenya', '/pppoe-billing-system-kenya', '/mpesa-wifi-billing-kenya'],
  },
};

/** Short labels for cross-links between solution pages and from the blog. */
export const SOLUTION_LINK_LABELS: Record<SolutionPath, string> = {
  '/hotspot-billing-system-kenya': 'Hotspot billing system',
  '/pppoe-billing-system-kenya': 'PPPoE billing system',
  '/mpesa-wifi-billing-kenya': 'M-Pesa WiFi billing',
  '/wifi-billing-system-kenya': 'WiFi billing for plots & apartments',
};
