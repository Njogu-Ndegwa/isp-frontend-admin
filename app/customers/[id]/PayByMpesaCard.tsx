'use client';

import type { PayByMpesa, PayByMpesaUnavailableReason } from '../../lib/types';
import type { TFunction } from '../../lib/i18n';
import { payByMpesaMessage, whatsappShareUrl } from '../../lib/customerPaybill';

/** Why there is no paybill + account, in words a reseller can act on. */
const UNAVAILABLE: Record<Exclude<PayByMpesaUnavailableReason, 'hotspot'>, string> = {
  no_paybill:
    "This customer's router doesn't collect by paybill and account number, so a paybill payment would not renew them. They pay through the M-Pesa prompt instead.",
  no_account_number:
    'No valid account number yet, so a paybill payment could not be matched to this customer. One is assigned on their next registration or payment.',
  no_pppoe_login: 'Add a PPPoE username first: a paybill payment renews the PPPoE login.',
  no_router: 'Assign a router first: a paybill payment renews the customer on their router.',
  no_plan: 'Assign a plan first: the amount to pay comes from the plan.',
};

export interface PayByMpesaCardProps {
  card: PayByMpesa;
  phone?: string | null;
  walletCredit?: number | null;
  t: TFunction;
  formatAmount: (amount: number) => string;
  /** Copy `value` and tell the user; `what` names it ("Paybill copied"). */
  onCopy: (value: string, copiedMessage: string) => void;
}

/**
 * "Pay by M-Pesa": the paybill and account number this customer pays with,
 * each with a copy button, and a ready message to share. Renders nothing for
 * hotspot customers, who pay on the WiFi login page.
 */
export default function PayByMpesaCard({ card, phone, walletCredit, t, formatAmount, onCopy }: PayByMpesaCardProps) {
  if (card.unavailable_reason === 'hotspot') return null;
  const ready = !card.unavailable_reason && card.paybill && card.account_number;
  const message = ready ? payByMpesaMessage(card, t, formatAmount) : '';

  return (
    <section className="card p-5 space-y-3" aria-labelledby="pay-by-mpesa-title" data-testid="pay-by-mpesa">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </span>
        <h3 id="pay-by-mpesa-title" className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
          {t('Pay by M-Pesa')}
        </h3>
      </div>

      {ready ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <CopyField
              label={t('Paybill')}
              value={card.paybill!}
              copyLabel={t('Copy paybill')}
              onCopy={() => onCopy(card.paybill!, t('Paybill copied'))}
            />
            <CopyField
              label={t('Account')}
              value={card.account_number!}
              copyLabel={t('Copy account number')}
              onCopy={() => onCopy(card.account_number!, t('Account number copied'))}
            />
          </div>
          {card.amount != null && (
            <div className="bg-background-tertiary rounded-lg p-3 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">{t('Amount')}</span>
              <span className="text-sm font-semibold text-foreground">{formatAmount(card.amount)}</span>
            </div>
          )}
          {(walletCredit ?? 0) > 0 && (
            <p className="text-xs text-success">
              {t('{amount} wallet credit counts towards the next payment.', { amount: formatAmount(walletCredit!) })}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onCopy(message, t('Payment message copied'))}
              className="btn-secondary text-sm py-2 px-3 inline-flex items-center justify-center gap-1.5"
            >
              <CopyIcon />
              {t('Copy message')}
            </button>
            <a
              href={whatsappShareUrl(phone, message)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm py-2 px-3 rounded-lg font-medium inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.3 2.2 2.2 0 00.1-1.3c0-.1-.2-.2-.4-.3z" />
              </svg>
              {t('Share on WhatsApp')}
            </a>
          </div>
          <p className="text-xs text-foreground-muted break-words">{message}</p>
        </>
      ) : (
        <p className="text-sm text-foreground-muted">{t(UNAVAILABLE[card.unavailable_reason as keyof typeof UNAVAILABLE] ?? UNAVAILABLE.no_paybill)}</p>
      )}
    </section>
  );
}

function CopyField({ label, value, copyLabel, onCopy }: {
  label: string;
  value: string;
  copyLabel: string;
  onCopy: () => void;
}) {
  return (
    <div className="bg-background-tertiary rounded-lg p-3 min-w-0">
      <span className="block text-xs font-medium text-foreground-muted uppercase tracking-wider">{label}</span>
      <div className="flex items-center justify-between gap-1 mt-1">
        <span className="font-mono text-base lg:text-sm xl:text-base font-semibold text-foreground truncate">{value}</span>
        <button
          type="button"
          aria-label={copyLabel}
          title={copyLabel}
          onClick={onCopy}
          className="p-1.5 -mr-1 rounded-md hover:bg-background-secondary transition-colors text-foreground-muted hover:text-foreground flex-shrink-0"
        >
          <CopyIcon />
        </button>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
