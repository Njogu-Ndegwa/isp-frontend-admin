'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../lib/api';
import type { PublicAdReport } from '../../lib/types';
import { useT } from '../../lib/i18n';
import { utcToGMT3DateOnly } from '../../lib/dateUtils';
import { formatDay } from '../../ads/adModel';
import { SALE_STATE_META, kes, normalizeKenyanMobile } from '../../ads/adSale';

/**
 * The shop's read-only link for an ad it paid for: dates, views and taps, and
 * a Pay button while a payment is due. Shows nothing private about the
 * reseller (no fees, phones or device data). Public: no login.
 */
export default function PromoReportClient() {
  const t = useT();
  const params = useParams();
  const token = String(params.token ?? '');
  const [report, setReport] = useState<PublicAdReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReport(await api.getPublicAdReport(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('This link doesn’t work.'));
    }
  }, [token, t]);

  useEffect(() => { void load(); }, [load]);

  const pay = async () => {
    if (phone && !normalizeKenyanMobile(phone)) {
      setMessage(t('Enter an M-Pesa number, e.g. 0712 345 678.'));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const out = await api.payFromPublicAdLink(token, phone || undefined);
      setMessage(out.sent ? t('Check your phone and enter your M-Pesa PIN.') : t(out.message));
      window.setTimeout(() => { void load(); }, 20_000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('Could not send the prompt.'));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <main className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-background-secondary p-8 text-center">
          <h1 className="text-lg font-semibold text-foreground">{t('Link not found')}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{t('Ask the WiFi owner who sold you the ad for a new link.')}</p>
        </div>
      </main>
    );
  }
  if (!report) {
    return <main className="min-h-screen bg-background px-4 py-8"><div className="mx-auto h-64 max-w-xl animate-pulse rounded-2xl bg-background-secondary" /></main>;
  }

  const meta = SALE_STATE_META[report.state];
  const maxViews = Math.max(1, ...report.daily.map((d) => d.views));

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="rounded-2xl border border-border bg-background-secondary p-4 sm:p-5">
          <div className="flex gap-4">
            {report.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={report.image_url} alt="" className="h-20 w-20 flex-shrink-0 rounded-xl object-cover" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-foreground-muted">{t('Your ad on {network} WiFi', { network: report.network_name ?? 'Bitwave' })}</p>
              <h1 className="mt-0.5 text-lg font-bold text-foreground">{report.title ?? report.business_name}</h1>
              <p className="text-sm text-foreground-muted">{report.business_name}</p>
              <span className="badge badge-neutral mt-2">{t(meta.label)}</span>
            </div>
          </div>
          {report.live_from && report.live_until && (
            <p className="mt-3 text-sm text-foreground">
              {t('Runs')}: {formatDay(utcToGMT3DateOnly(report.live_from))} → {formatDay(utcToGMT3DateOnly(report.live_until))}
            </p>
          )}
        </header>

        {report.payment_due && (
          <section className="rounded-2xl border border-accent-primary/40 bg-accent-primary/5 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">
              {report.payment_due.kind === 'renewal' ? t('Renew your ad') : t('Pay for your ad')}
            </h2>
            <p className="mt-1 text-sm text-foreground">
              {t('{weeks} week(s) at {price} a week: {total}', {
                weeks: report.payment_due.weeks, price: kes(report.payment_due.price_per_week), total: kes(report.payment_due.amount),
              })}
            </p>
            <p className="mt-1 text-xs text-foreground-muted">{t('You pay Bitwave Technologies by M-Pesa. The weeks start when the ad goes live.')}</p>
            <label htmlFor="pay-phone" className="mt-3 block text-sm font-medium text-foreground">{t('M-Pesa number (leave empty to use the one on file)')}</label>
            <input id="pay-phone" type="tel" inputMode="tel" className="input mt-1.5" value={phone} maxLength={16}
              onChange={(e) => setPhone(e.target.value)} placeholder={t('e.g. 0712 345 678')} />
            <button type="button" className="btn-primary mt-3 min-h-[44px] w-full" onClick={() => void pay()} disabled={busy}>
              {busy ? t('Sending…') : t('Send me the M-Pesa prompt')}
            </button>
            {message && <p className="mt-2 text-sm text-foreground" role="status">{message}</p>}
          </section>
        )}

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-background-secondary p-4">
            <p className="text-xs text-foreground-muted">{t('Views')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{report.views.toLocaleString('en-US')}</p>
            <p className="text-[11px] text-foreground-muted">{t('Different phones per day')}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background-secondary p-4">
            <p className="text-xs text-foreground-muted">{t('Taps')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{report.taps.toLocaleString('en-US')}</p>
            <p className="text-[11px] text-foreground-muted">{t('Calls and other taps')}</p>
          </div>
        </section>

        {report.daily.length > 0 && (
          <section className="rounded-2xl border border-border bg-background-secondary p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold text-foreground">{t('Day by day')}</h2>
            <ul className="space-y-1.5">
              {report.daily.map((d) => (
                <li key={d.day} className="flex items-center gap-3 text-sm">
                  <span className="w-24 flex-shrink-0 text-foreground-muted">{formatDay(d.day)}</span>
                  <span className="h-2.5 rounded-full bg-amber-500" style={{ width: `${Math.max(2, (d.views / maxViews) * 100)}%`, maxWidth: '50%' }} aria-hidden="true" />
                  <span className="tabular-nums text-foreground">{d.views}</span>
                  <span className="ml-auto tabular-nums text-foreground-muted">{t('{n} taps', { n: d.taps })}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="text-center text-xs text-foreground-muted">{t('Counted once per phone per day. Powered by Bitwave.')}</p>
      </div>
    </main>
  );
}
