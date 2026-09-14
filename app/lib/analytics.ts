import { getAttributionFields } from './attribution';

type TrackingWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  ttq?: { track: (event: string, params?: Record<string, unknown>) => void };
};

/** Google Ads account, e.g. "AW-1234567890". Unset until the account exists. */
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
/** Per-conversion labels from Google Ads, e.g. "AbC-D_efGh". */
const GOOGLE_ADS_SIGNUP_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL;
const GOOGLE_ADS_CONTACT_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONTACT_LABEL;

// GA4 loads via AnalyticsScripts; gtag is absent until that script runs (and
// always absent when blocked by ad blockers), so every call is optional.
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  (window as TrackingWindow).gtag?.('event', name, params);
}

/** TikTok's pixel, same caveats — absent until the script loads, or forever. */
function trackTikTok(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  (window as TrackingWindow).ttq?.track(event, params);
}

function trackGoogleAdsConversion(label?: string) {
  if (!GOOGLE_ADS_ID || !label) return;
  trackEventRaw('conversion', { send_to: `${GOOGLE_ADS_ID}/${label}` });
}

function trackEventRaw(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  (window as TrackingWindow).gtag?.('event', name, params);
}

/**
 * A visitor created an account.
 *
 * Fired to all three at once so the same moment is counted the same way
 * everywhere: GA4 for reporting, TikTok and Google Ads for optimisation. The
 * ad platforms need their own event — they cannot read GA4 — and without it a
 * campaign can only optimise toward clicks, which is how budget gets spent on
 * traffic that never signs up.
 */
export function trackSignup() {
  const attribution = getAttributionFields();
  trackEvent('sign_up', { method: 'email', ...attribution });
  trackTikTok('CompleteRegistration', { content_name: 'reseller_signup' });
  trackGoogleAdsConversion(GOOGLE_ADS_SIGNUP_LABEL);
}

/**
 * A visitor reached for a human — tapped WhatsApp or the phone number.
 *
 * Worth counting as a conversion in its own right, not just a click. This
 * business closes in conversation rather than on the signup form, so a
 * campaign optimised only toward signups is optimising toward the wrong end of
 * the funnel. `channel` and `placement` separate WhatsApp from calls, and the
 * floating buttons from the ones written into the page, so it is possible to
 * see which of them actually earns the conversation.
 */
export function trackContact(channel: 'whatsapp' | 'phone', placement: string) {
  trackEvent('contact_click', { channel, placement, ...getAttributionFields() });
  // This pixel's TikTok business funnel uses Lead as its eligible conversion
  // event. Sending Contact is silently ignored by that funnel and leaves the
  // campaign without an optimization event.
  trackTikTok('Lead', { content_name: `${channel}_${placement}` });
  trackGoogleAdsConversion(GOOGLE_ADS_CONTACT_LABEL);
}
