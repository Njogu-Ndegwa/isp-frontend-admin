/**
 * Bitwave's own contact details, in one place.
 *
 * This is the company number shown on the public marketing site — not a
 * reseller's support number, which is always read from that reseller's record.
 */
export const PHONE_NUMBER = '+254795635364';
export const PHONE_DISPLAY = '0795 635 364';

export const TEL_HREF = `tel:${PHONE_NUMBER}`;

/**
 * A WhatsApp deep link, optionally opening with a first message already typed.
 *
 * The prefill is worth the few extra characters: someone who taps through from
 * an ad usually has no idea how to start, and an empty chat box is its own kind
 * of friction.
 */
export function whatsappHref(message?: string): string {
  const base = `https://wa.me/${PHONE_NUMBER.replace('+', '')}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const WHATSAPP_DEFAULT_MESSAGE =
  "Hi Bitwave, I'd like to know more about your ISP billing system.";

export const WHATSAPP_PRICING_MESSAGE =
  "Hi Bitwave, I'm looking at your pricing page and have a question.";
