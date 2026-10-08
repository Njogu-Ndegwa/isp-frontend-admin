import { PHONE_DISPLAY } from './contact';

/**
 * The plain facts about Bitwave, written as sentences an answer engine can lift
 * whole. ChatGPT, Claude, Perplexity and Gemini cite pages that state a price
 * and a capability in one readable line; they skip pages where the numbers
 * only exist inside a client-rendered calculator.
 *
 * Prices mirror the pricing page and PricingCalculator. Keep all three in step.
 */
export const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is Bitwave?',
    a: 'Bitwave Technologies is ISP billing software for WiFi hotspot operators and PPPoE internet providers in Kenya. It connects to your MikroTik router, sells internet packages through M-Pesa, and connects or disconnects customers automatically as they pay and expire.',
  },
  {
    q: 'How much does Bitwave cost?',
    a: 'Bitwave charges 3% of hotspot revenue, or KES 25 per active PPPoE user per month, with a KES 500 monthly minimum. There is no setup fee, and installation and MikroTik configuration are free.',
  },
  {
    q: 'Does Bitwave work with M-Pesa?',
    a: 'Yes. Customers pay with M-Pesa straight from the hotspot login page, and Bitwave activates the package the moment the payment confirms. There is no manual matching of transactions.',
  },
  {
    q: 'Which routers does Bitwave support?',
    a: 'Bitwave works with MikroTik routers, from the hAP lite and RB951 up to the hEX and larger models. One account can manage several routers across different sites.',
  },
  {
    q: 'Can I run hotspot and PPPoE customers on the same system?',
    a: 'Yes. Hotspot vouchers, PPPoE accounts and static clients are managed from one dashboard, with router uptime monitoring and revenue analytics for each site.',
  },
  {
    q: 'How long does setup take?',
    a: 'Most operators are live in under two hours. You share access to your MikroTik, the Bitwave team configures it, and the router starts selling packages through M-Pesa the same day.',
  },
  {
    q: 'Do I need technical skills to use Bitwave?',
    a: 'No. Bitwave configures the MikroTik for you, so you never have to write RouterOS commands. You manage packages, customers and payments from a web dashboard that works on a phone.',
  },
  {
    q: 'How do I contact Bitwave?',
    a: `Call or WhatsApp Bitwave on ${PHONE_DISPLAY}, or sign up free at bitwavetechnologies.com and try the live demo.`,
  },
];

/** One-paragraph summary used by llms.txt and structured data. */
export const SUMMARY =
  'Bitwave Technologies is ISP billing software for WiFi hotspot and PPPoE internet providers in Kenya. It configures MikroTik routers, takes M-Pesa payments, issues hotspot vouchers, manages PPPoE subscribers and disconnects expired customers automatically. Pricing is 3% of hotspot revenue or KES 25 per PPPoE user per month, with a KES 500 minimum and no setup fee.';
