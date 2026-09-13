'use client';

import { PHONE_DISPLAY, TEL_HREF, WHATSAPP_PRICING_MESSAGE, whatsappHref } from '../landing/contact';
import { trackContact } from '../lib/analytics';

/**
 * The call and WhatsApp buttons written into the pricing page.
 *
 * A client component only so the taps can be counted — this is the page paid
 * traffic lands on, so knowing whether the conversation started here or from
 * the floating pair is what tells you which one is worth keeping.
 *
 * id="contact" makes the floating buttons stand down while these are on screen;
 * two sets of the same two options crowding each other reads as a mistake.
 */
export default function PricingContactButtons() {
  return (
    <div id="contact" className="flex flex-col sm:flex-row items-center gap-3 pt-2">
      <a
        href={whatsappHref(WHATSAPP_PRICING_MESSAGE)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackContact('whatsapp', 'pricing_inline')}
        className="w-full sm:w-auto px-6 py-3 rounded-xl border border-emerald-500/40 text-emerald-500 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/10 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
        </svg>
        WhatsApp {PHONE_DISPLAY}
      </a>
      <a
        href={TEL_HREF}
        onClick={() => trackContact('phone', 'pricing_inline')}
        className="w-full sm:w-auto px-6 py-3 rounded-xl border border-border text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:border-amber-500/40 hover:text-amber-500 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        Call {PHONE_DISPLAY}
      </a>
    </div>
  );
}
