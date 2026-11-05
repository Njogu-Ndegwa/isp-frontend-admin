'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { Ad, AdSaleSummary } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import { useT } from '../../lib/i18n';
import { copyText } from '../../lib/clipboard';
import { formatDay } from '../adModel';
import { utcToGMT3DateOnly } from '../../lib/dateUtils';
import {
  PAYOUT_META,
  PROMPT_META,
  SALE_STATE_META,
  daysLeft,
  displayPhone,
  emptySaleTerms,
  kes,
  promptInFlight,
  validateSaleTerms,
  type SaleTermsErrors,
  type SaleTermsForm,
} from '../adSale';
import SaleTermsFields from './SaleTermsFields';

const TONE: Record<string, string> = {
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
};

const POLL_MS = 3000;

function termsFrom(sale: AdSaleSummary | null | undefined): SaleTermsForm {
  if (!sale) return emptySaleTerms();
  return {
    business_name: sale.business_name,
    business_phone: displayPhone(sale.business_phone),
    // What is due, if anything: a renewal can be at a different price.
    weeks: String(sale.due_weeks ?? sale.weeks),
    price_per_week: String(sale.due_price_per_week ?? sale.price_per_week),
  };
}

/**
 * Payment for a sold ad: the M-Pesa prompt to the shop as the main action,
 * its live status (Prompt sent, Waiting for PIN, Paid, or Cancelled / Failed /
 * Timed out with M-Pesa's reason), Send again, renewal 2 days before the end,
 * the 80/20 split and the shop's link. Polls while a prompt is on the phone.
 */
export default function SalePanel({
  ad,
  canManage,
  isAdmin,
  onChanged,
}: {
  ad: Ad;
  canManage: boolean;
  isAdmin: boolean;
  onChanged?: () => void;
}) {
  const t = useT();
  const { showAlert } = useAlert();
  const [sale, setSale] = useState<AdSaleSummary | null>(ad.sale ?? null);
  const [form, setForm] = useState<SaleTermsForm>(() => termsFrom(ad.sale));
  const [errors, setErrors] = useState<SaleTermsErrors>({});
  const [open, setOpen] = useState<'prompt' | 'renew' | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [priceTold, setPriceTold] = useState(false);
  const wasPaid = useRef(sale?.prompt?.status === 'paid');
  // Selling is a pilot until a Bitwave admin opens it. Closed until we know.
  const [sellingOpen, setSellingOpen] = useState(false);

  useEffect(() => {
    if (ad.slot !== 'reseller' || isAdmin) return;
    api.getAdSellingAccess().then((r) => setSellingOpen(r.allowed)).catch(() => setSellingOpen(false));
  }, [ad.slot, isAdmin]);

  const refresh = useCallback(async () => {
    try {
      const next = await api.getAdSale(ad.id);
      setSale(next);
      if (next.prompt?.status === 'paid' && !wasPaid.current) {
        wasPaid.current = true;
        showAlert('success', t('Paid. The shop’s payment came in.'));
        onChanged?.();
      }
    } catch {
      /* keep the last known state; the next poll tries again */
    }
  }, [ad.id, onChanged, showAlert, t]);

  useEffect(() => { if (ad.slot === 'reseller') void refresh(); }, [ad.slot, refresh]);

  const polling = promptInFlight(sale);
  useEffect(() => {
    if (!polling) return;
    const id = window.setInterval(() => { void refresh(); }, POLL_MS);
    return () => window.clearInterval(id);
  }, [polling, refresh]);

  if (ad.slot !== 'reseller') return null;

  const canAct = canManage && !isAdmin && sellingOpen;
  const comingSoon = canManage && !isAdmin && !sellingOpen;
  const stateMeta = sale ? SALE_STATE_META[sale.state] : SALE_STATE_META.awaiting_payment;
  const prompt = sale?.prompt ?? null;
  const promptMeta = prompt ? PROMPT_META[prompt.status] : null;
  const left = daysLeft(sale?.live_until);
  const blocked = sale ? ['rejected', 'taken_down', 'deleted'].includes(sale.state) : false;
  const showRenew = !!sale && sale.can_renew && (sale.renewal_due || sale.state === 'ended');

  // A renewal at a new price: the reseller has to have told the shop first.
  const renewing = open === 'renew' || (open === 'prompt' && sale?.due_kind === 'renewal');
  const formPrice = Number(form.price_per_week);
  const newPrice = !!sale && renewing && formPrice !== sale.price_per_week
    && formPrice !== sale.due_price_per_week;

  const submit = async (mode: 'start' | 'prompt' | 'renew') => {
    const found = validateSaleTerms(form, mode === 'start');
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const body = {
        phone: form.business_phone.trim(),
        weeks: Number(form.weeks),
        price_per_week: Number(form.price_per_week),
        ...(newPrice ? { confirm_new_price: priceTold } : {}),
      };
      const next = mode === 'start'
        ? await api.startAdSale(ad.id, {
          business_name: form.business_name.trim(), business_phone: body.phone,
          weeks: body.weeks, price_per_week: body.price_per_week,
        })
        : mode === 'renew'
          ? await api.renewSoldAd(ad.id, body)
          : await api.sendAdPaymentPrompt(ad.id, body);
      setSale(next);
      setOpen(null);
      const result = next.prompt_result;
      if (result && !result.sent) showAlert('info', t(result.message));
      else showAlert('success', t('M-Pesa prompt sent to {phone}. Ask them to enter their PIN.', { phone: displayPhone(next.prompt?.phone) }));
      onChanged?.();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not send the prompt.'));
      void refresh();
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!sale) return;
    const ok = await copyText(sale.share_url);
    showAlert(ok ? 'success' : 'error', ok ? t('Link copied. Send it to the shop on WhatsApp.') : t('Could not copy the link.'));
  };

  const promptForm = (mode: 'prompt' | 'renew') => (
    <div className="mt-4 space-y-4 rounded-xl border border-border p-4" data-testid={`sale-${mode}-form`}>
      <p className="text-sm font-semibold text-foreground">
        {mode === 'renew' ? t('Renew: send the shop an M-Pesa prompt') : t('Confirm the number and amount')}
      </p>
      <SaleTermsFields value={form} errors={errors} onChange={setForm} showName={false} />
      {newPrice && sale && (
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-foreground" data-testid="new-price-told">
          <input type="checkbox" className="mt-0.5 h-5 w-5 flex-shrink-0" checked={priceTold} onChange={(e) => setPriceTold(e.target.checked)} />
          <span>
            {t('I told the shop the new price: {now} a week, was {was}. It applies from this renewal; what they already paid doesn’t change.', { now: kes(formPrice), was: kes(sale.price_per_week) })}
          </span>
        </label>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary min-h-[44px]" onClick={() => setOpen(null)} disabled={busy}>{t('Cancel')}</button>
        <button type="button" className="btn-primary min-h-[44px]" onClick={() => void submit(mode)} disabled={busy || (newPrice && !priceTold)}>
          {busy ? t('Sending…') : t('Send M-Pesa prompt')}
        </button>
      </div>
    </div>
  );

  return (
    <section className="mb-5 rounded-2xl border border-border bg-background-secondary p-4 sm:p-5" data-testid="sale-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{t('Payment from the shop')}</h2>
          {sale && (
            <p className="text-xs text-foreground-muted">
              {sale.business_name} · {displayPhone(sale.business_phone)} · {kes(sale.price_per_week)} {t('a week')}
            </p>
          )}
        </div>
        <span className={`badge ${TONE[stateMeta.tone]}`}>{t(stateMeta.label)}</span>
      </div>

      {comingSoon && (
        <p className="mt-3 rounded-xl bg-background-tertiary/60 p-3 text-sm text-foreground" data-testid="selling-coming-soon">
          {t('Selling ads through Bitwave is coming soon. We’re testing it with a few networks first, so payment prompts can’t be sent from your account yet.')}
        </p>
      )}

      {!sale ? (
        canAct ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-foreground-muted">{t('This ad was made before payments. Add the shop’s details and send them the M-Pesa prompt. It goes live as soon as they pay.')}</p>
            <SaleTermsFields value={form} errors={errors} onChange={setForm} />
            <button type="button" className="btn-primary min-h-[44px] w-full sm:w-auto" onClick={() => void submit('start')} disabled={busy}>
              {busy ? t('Sending…') : t('Send M-Pesa prompt')}
            </button>
          </div>
        ) : comingSoon ? null : (
          <p className="mt-3 text-sm text-foreground-muted">{t('No payment yet. The ad can’t run until the shop pays.')}</p>
        )
      ) : (
        <>
          {prompt && promptMeta && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-background-tertiary/60 p-3" aria-live="polite" data-testid="prompt-status">
              <span className={`badge ${TONE[promptMeta.tone]} gap-1.5`}>
                {promptMeta.busy && <span className="h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden="true" />}
                {t(promptMeta.label)}
              </span>
              <span className="text-sm text-foreground">
                {kes(prompt.amount)} → {displayPhone(prompt.phone)}
                {prompt.kind === 'renewal' && <span className="text-foreground-muted"> · {t('renewal')}</span>}
              </span>
              {prompt.reason && <span className="w-full text-xs text-foreground-muted">{t('M-Pesa said:')} {prompt.reason}</span>}
              {promptMeta.busy && <span className="w-full text-xs text-foreground-muted">{t('The shop has about a minute to enter their M-Pesa PIN. This updates by itself.')}</span>}
            </div>
          )}

          {sale.amount_due !== null && !blocked && (
            <p className="mt-3 text-sm text-foreground">
              {t('Due: {amount}', { amount: kes(sale.amount_due) })}
              {sale.price_changed_from !== null && (
                <span className="block text-xs text-foreground-muted" data-testid="price-change">
                  {t('New price from this renewal: {now} a week, was {was}.', { now: kes(sale.due_price_per_week), was: kes(sale.price_changed_from) })}
                </span>
              )}
            </p>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border p-2.5">
              <p className="text-[11px] text-foreground-muted">{t('Shop paid')}</p>
              <p className="text-sm font-bold tabular-nums text-foreground">{kes(sale.paid_total)}</p>
            </div>
            <div className="rounded-xl border border-border p-2.5">
              <p className="text-[11px] text-foreground-muted">{t('Bitwave fee 20%')}</p>
              <p className="text-sm font-semibold tabular-nums text-foreground-muted">{kes(sale.bitwave_fee_net_total)}</p>
            </div>
            <div className="rounded-xl border border-border p-2.5">
              <p className="text-[11px] text-foreground-muted">{t('You get')}</p>
              <p className="text-sm font-bold tabular-nums text-success">{kes(sale.reseller_share_net_total)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            {t(PAYOUT_META[sale.payout_status])}
            {!isAdmin && <> · {t('M-Pesa’s transfer fee applies when this is paid out to you.')}</>}
          </p>

          {sale.live_from && sale.live_until && (
            <p className="mt-2 text-sm text-foreground">
              {t('Paid period')}: {formatDay(utcToGMT3DateOnly(sale.live_from))} → {formatDay(utcToGMT3DateOnly(sale.live_until))}
              {left !== null && sale.state === 'live' && (
                <span className="text-foreground-muted"> · {left === 1 ? t('1 day left') : t('{n} days left', { n: left })}</span>
              )}
            </p>
          )}
          {sale.clock_stopped && (
            <p className="mt-2 rounded-xl bg-background-tertiary/60 p-3 text-sm text-foreground" data-testid="clock-stopped">
              {sale.off_reason === 'show_ads_off'
                ? t('Show Ads is off, so this ad isn’t showing. Its paid days aren’t counting, and the end date moves out by the time it was off.')
                : t('This ad isn’t showing. Its paid days aren’t counting, and the end date moves out by the time it was off.')}
            </p>
          )}
          {sale.weeks_banked > 0 && (
            <p className="mt-2 text-sm text-foreground-muted">
              {t('{n} paid week(s) start when the ad goes live.', { n: sale.weeks_banked })}
            </p>
          )}
          {sale.refund_due_total > 0 && (
            <p className="mt-2 rounded-xl bg-warning/10 p-3 text-sm text-foreground">
              {t('{amount} is waiting for Bitwave to refund to the shop.', { amount: kes(sale.refund_due_total) })}
            </p>
          )}
          {sale.reseller_recovered_total + sale.bitwave_refund_part_total > 0 && (
            <p className="mt-2 text-xs text-foreground-muted" data-testid="refund-split">
              {isAdmin
                ? t('Unused days refunded: {reseller} recovered from the reseller’s payout, {bitwave} from Bitwave’s fee.', { reseller: kes(sale.reseller_recovered_total), bitwave: kes(sale.bitwave_refund_part_total) })
                : t('Unused days refunded: {reseller} comes off your payout, {bitwave} from Bitwave’s fee.', { reseller: kes(sale.reseller_recovered_total), bitwave: kes(sale.bitwave_refund_part_total) })}
            </p>
          )}
          {showRenew && (
            <p className="mt-3 rounded-xl bg-info/10 p-3 text-sm text-foreground" data-testid="renewal-offer">
              {sale.state === 'ended'
                ? t('This ad has ended. Renew it with one prompt to the shop.')
                : t('This ad ends soon. Renew it with one prompt to the shop, same price.')}
            </p>
          )}

          {canManage && !isAdmin && !canAct && !blocked && (
            <div className="mt-4">
              <button type="button" className="btn-secondary min-h-[44px]" onClick={() => void copyLink()}>{t('Copy shop link')}</button>
            </div>
          )}
          {canAct && !blocked && (
            <div className="mt-4 flex flex-wrap gap-2">
              {sale.amount_due !== null && (
                <button
                  type="button" className="btn-primary min-h-[44px] flex-1 sm:flex-none"
                  disabled={busy || !sale.can_resend}
                  title={!sale.can_resend ? t('A prompt is on the shop’s phone, or 3 were sent in the last 10 minutes.') : undefined}
                  onClick={() => { setForm(termsFrom(sale)); setErrors({}); setPriceTold(false); setOpen(open === 'prompt' ? null : 'prompt'); }}
                >
                  {prompt && prompt.status !== 'paid' && !promptMeta?.busy ? t('Send again') : t('Send M-Pesa prompt')}
                </button>
              )}
              {showRenew && sale.amount_due === null && (
                <button
                  type="button" className="btn-primary min-h-[44px] flex-1 sm:flex-none" disabled={busy}
                  onClick={() => { setForm(termsFrom(sale)); setErrors({}); setPriceTold(false); setOpen(open === 'renew' ? null : 'renew'); }}
                >
                  {t('Renew')}
                </button>
              )}
              <button type="button" className="btn-secondary min-h-[44px] flex-1 sm:flex-none" onClick={() => void copyLink()}>
                {t('Copy shop link')}
              </button>
            </div>
          )}
          {open === 'prompt' && promptForm('prompt')}
          {open === 'renew' && promptForm('renew')}

          {!!sale.payments?.length && (
            <div className="mt-4">
              <button type="button" className="text-sm font-medium text-accent-primary hover:underline" onClick={() => setShowHistory((v) => !v)}>
                {showHistory ? t('Hide payment history') : t('Payment history ({n})', { n: sale.payments.length })}
              </button>
              {showHistory && (
                <ul className="mt-2 divide-y divide-border rounded-xl border border-border text-sm">
                  {sale.payments.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span className="text-foreground">
                        {kes(p.amount)} · {p.weeks === 1 ? t('1 week') : t('{n} weeks', { n: p.weeks })}
                        {p.kind === 'renewal' && <span className="text-foreground-muted"> · {t('renewal')}</span>}
                      </span>
                      <span className="text-xs text-foreground-muted">
                        {t(PROMPT_META[(p.status === 'awaiting_payment' ? 'waiting_for_pin' : p.status) as keyof typeof PROMPT_META]?.label ?? p.status)}
                        {p.mpesa_receipt ? ` · ${p.mpesa_receipt}` : ''}
                        {p.is_duplicate ? ` · ${t('paid twice')}` : ''}
                        {p.refund_status === 'due' ? ` · ${t('refund due')}` : p.refund_status === 'refunded' ? ` · ${t('refunded')}` : ''}
                        {p.refund_status && p.refund_amount !== null ? ` ${kes(p.refund_amount)}` : ''}
                      </span>
                      {p.refund_reason && <span className="w-full text-xs text-foreground-muted">{p.refund_reason}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
