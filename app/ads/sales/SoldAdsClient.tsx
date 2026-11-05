'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import type { AdReviewRules, AdSaleSummary, AdSalesListResponse, AdSellingMode } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useT } from '../../lib/i18n';
import Header from '../../components/Header';
import MobileDataCard from '../../components/MobileDataCard';
import ConfirmDialog from '../../components/ConfirmDialog';
import { PageLoader } from '../../components/LoadingSpinner';
import { utcToGMT3DateOnly } from '../../lib/dateUtils';
import { formatDay } from '../adModel';
import { PAYOUT_META, SALE_STATE_META, displayPhone, kes } from '../adSale';

type Filter = 'all' | 'awaiting_payment' | 'live' | 'refund_due';

const TONE: Record<string, string> = {
  info: 'badge-info', success: 'badge-success', warning: 'badge-warning', danger: 'badge-danger', neutral: 'badge-neutral',
};

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background-secondary p-3.5 sm:p-4">
      <p className="text-xs font-medium text-foreground-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-foreground-muted">{hint}</p>}
    </div>
  );
}

const SELLING_MODE_COPY: Record<AdSellingMode, { label: string; desc: string }> = {
  off: { label: 'Off', desc: 'Nobody can sell ads or send prompts. A prompt already sent still counts if the shop pays it.' },
  allowlist: { label: 'Pilot list only', desc: 'Only the resellers listed below can sell.' },
  everyone: { label: 'Every Kenyan reseller', desc: 'Selling is open to all. Use this once the end-to-end test has passed.' },
};

function parseIds(text: string): number[] | null {
  const parts = text.split(/[,\s]+/).filter(Boolean);
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  return parts.map(Number);
}

function BlockedWordsCard() {
  const t = useT();
  const { showAlert } = useAlert();
  const [rules, setRules] = useState<AdReviewRules | null>(null);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<AdSellingMode>('allowlist');
  const [idsText, setIdsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingSelling, setSavingSelling] = useState(false);
  const [confirmEveryone, setConfirmEveryone] = useState(false);

  const apply = (r: AdReviewRules) => {
    setRules(r);
    setMode(r.selling_mode);
    setIdsText(r.selling_allowlist.map((row) => row.id).join(', '));
  };

  useEffect(() => {
    api.getAdReviewRules().then((r) => { apply(r); setText(r.blocked_words.join(', ')); }).catch(() => setRules(null));
  }, []);

  if (!rules) return null;
  const save = async () => {
    setSaving(true);
    try {
      const words = text.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);
      const out = await api.saveAdReviewRules({ blocked_words: words });
      setText(out.blocked_words.join(', '));
      showAlert('success', t('Blocked words saved.'));
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not save.'));
    } finally {
      setSaving(false);
    }
  };
  const saveSelling = async () => {
    const ids = parseIds(idsText);
    if (ids === null) {
      showAlert('error', t('Use reseller ID numbers separated by commas, e.g. 20, 45.'));
      return;
    }
    setSavingSelling(true);
    try {
      apply(await api.saveAdReviewRules({ selling_mode: mode, selling_allowlist: ids }));
      setConfirmEveryone(false);
      showAlert('success', t('Saved.'));
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not save.'));
    } finally {
      setSavingSelling(false);
    }
  };
  return (
    <>
    <section className="mt-6 rounded-2xl border border-border bg-background-secondary p-4 sm:p-5" data-testid="selling-switch">
      <h2 className="text-base font-semibold text-foreground">{t('Who can sell ads')}</h2>
      <p className="mt-1 text-xs text-foreground-muted">
        {t('Sold ads take real M-Pesa money from shops. Own promos are not affected by this switch.')}
      </p>
      <fieldset className="mt-3 space-y-2">
        <legend className="sr-only">{t('Who can sell ads')}</legend>
        {rules.selling_modes.map((m) => (
          <label key={m} className={`flex min-h-[44px] cursor-pointer gap-3 rounded-xl border p-3 ${mode === m ? 'border-accent-primary bg-accent-primary/10' : 'border-border'}`}>
            <input type="radio" name="selling-mode" className="mt-1" checked={mode === m} onChange={() => setMode(m)} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{t(SELLING_MODE_COPY[m].label)}</span>
              <span className="block text-xs text-foreground-muted">{t(SELLING_MODE_COPY[m].desc)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label htmlFor="selling-allowlist" className="mt-4 block text-sm font-medium text-foreground">{t('Pilot list (reseller IDs)')}</label>
      <input id="selling-allowlist" className="input mt-1.5" value={idsText} onChange={(e) => setIdsText(e.target.value)} placeholder="20, 45" />
      {rules.selling_allowlist.length > 0 && (
        <p className="mt-1 text-xs text-foreground-muted">
          {t('Saved now: {list}', { list: rules.selling_allowlist.map((row) => `${row.name ?? t('Unknown')} (#${row.id})`).join(', ') })}
        </p>
      )}
      <div className="mt-3">
        <button
          type="button" className="btn-primary min-h-[44px]" disabled={savingSelling}
          onClick={() => { if (mode === 'everyone' && rules.selling_mode !== 'everyone') setConfirmEveryone(true); else void saveSelling(); }}
        >
          {savingSelling ? t('Saving…') : t('Save')}
        </button>
      </div>
    </section>
    <ConfirmDialog
      isOpen={confirmEveryone}
      onClose={() => setConfirmEveryone(false)}
      onConfirm={() => void saveSelling()}
      title={t('Open selling to every Kenyan reseller?')}
      message={t('They will be able to send real M-Pesa prompts to shops straight away.')}
      confirmLabel={t('Open selling')}
      loading={savingSelling}
    />
    
    <section className="mt-6 rounded-2xl border border-border bg-background-secondary p-4 sm:p-5">
      <h2 className="text-base font-semibold text-foreground">{t('Automatic checks')}</h2>
      <p className="mt-1 text-xs text-foreground-muted">
        {t('Every ad goes through these checks. Nobody reviews it after that: own promos go live straight away and sold ads go live when the shop pays.')}
      </p>
      <label htmlFor="blocked-words" className="mt-4 block text-sm font-medium text-foreground">{t('Blocked words')}</label>
      <textarea id="blocked-words" rows={3} className="input mt-1.5" value={text} onChange={(e) => setText(e.target.value)} />
      <p className="mt-1 text-xs text-foreground-muted">{t('Comma separated. Whole words only: “bet” blocks “bet now” but not “better”.')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-primary min-h-[44px]" onClick={() => void save()} disabled={saving}>{saving ? t('Saving…') : t('Save')}</button>
        <button type="button" className="btn-secondary min-h-[44px]" onClick={() => setText(rules.default_blocked_words.join(', '))}>{t('Use the default list')}</button>
      </div>
    </section>
    </>
  );
}

export default function SoldAdsClient() {
  const t = useT();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const isAdmin = user?.role === 'admin';
  const [filter, setFilter] = useState<Filter>('all');
  const [data, setData] = useState<AdSalesListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<AdSaleSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.getAdSales({
        state: filter === 'awaiting_payment' || filter === 'live' ? filter : undefined,
        payout_status: filter === 'refund_due' ? 'refund_due' : undefined,
        perPage: 100,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not load sold ads.'));
    }
  }, [filter, t]);

  useEffect(() => { void load(); }, [load]);

  const markRefunded = async (row: AdSaleSummary) => {
    if (!row.ad_id) return;
    setBusy(true);
    try {
      const detail = await api.getAdSale(row.ad_id);
      const due = (detail.payments ?? []).filter((p) => p.refund_status === 'due');
      for (const p of due) await api.markAdPaymentRefunded(p.id);
      showAlert('success', t('Marked as refunded.'));
      setRefunding(null);
      await load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not save.'));
    } finally {
      setBusy(false);
    }
  };

  if (!data && !error) return <PageLoader />;

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('All') },
    { value: 'awaiting_payment', label: t('Waiting for payment') },
    { value: 'live', label: t('Live') },
    { value: 'refund_due', label: t('Refund due') },
  ];

  return (
    <div className="pb-8">
      <Header
        title={isAdmin ? t('Sold ads') : t('Ads I sold')}
        subtitle={isAdmin
          ? t('Ads resellers sold to local shops, paid through Bitwave: 20% Bitwave, 80% reseller')
          : t('Shops pay Bitwave by M-Pesa. The ad goes live as soon as they pay and you get 80% in your normal payout, where M-Pesa’s transfer fee applies.')}
        backHref="/ads"
      />

      {error && (
        <div className="mb-4 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
          {error} <button type="button" className="ml-2 font-semibold text-accent-primary" onClick={() => void load()}>{t('Try again')}</button>
        </div>
      )}

      {data && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label={t('Shops paid')} value={kes(data.totals.paid_total)} />
            <Tile label={t('Bitwave fee 20%')} value={kes(data.totals.bitwave_fee_net_total)} />
            <Tile label={isAdmin ? t('Resellers’ 80%') : t('You get')} value={kes(data.totals.reseller_share_net_total)}
              hint={data.totals.reseller_recovered_total > 0
                ? t('{amount} recovered for refunds', { amount: kes(data.totals.reseller_recovered_total) })
                : t('{amount} already credited to payout', { amount: kes(data.totals.credited_total) })} />
            <Tile label={t('Refunds due')} value={kes(data.totals.refund_due_total)}
              hint={data.totals.refunded_total > 0 ? t('{amount} refunded so far', { amount: kes(data.totals.refunded_total) }) : undefined} />
          </div>

          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={t('Filter')}>
            {filters.map((f) => (
              <button
                key={f.value} type="button" role="tab" aria-selected={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`min-h-[40px] rounded-full border px-4 text-sm font-medium ${filter === f.value ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-border text-foreground-muted hover:text-foreground'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {data.sales.length === 0 ? (
            <div className="rounded-2xl border border-border bg-background-secondary p-8 text-center text-sm text-foreground-muted">
              {isAdmin ? t('No sold ads here yet.') : t('No sold ads yet. Create one from New ad → An ad I sold.')}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border border-border bg-background-secondary md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-foreground-muted">
                      <th className="px-4 py-2.5 font-medium">{t('Ad')}</th>
                      {isAdmin && <th className="px-3 py-2.5 font-medium">{t('Reseller')}</th>}
                      <th className="px-3 py-2.5 font-medium">{t('Status')}</th>
                      <th className="px-3 py-2.5 text-right font-medium">{t('Paid')}</th>
                      <th className="px-3 py-2.5 text-right font-medium">{t('Bitwave 20%')}</th>
                      <th className="px-3 py-2.5 text-right font-medium">{t('Reseller 80%')}</th>
                      <th className="px-3 py-2.5 font-medium">{t('Payout')}</th>
                      <th className="px-4 py-2.5 font-medium">{t('Runs until')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.sales.map((s) => {
                      const meta = SALE_STATE_META[s.state];
                      return (
                        <tr key={s.sale_id}>
                          <td className="px-4 py-3">
                            <Link href={`/ads/${s.ad_id}`} className="font-medium text-foreground hover:underline">{s.title ?? `#${s.ad_id}`}</Link>
                            <p className="text-xs text-foreground-muted">{s.business_name} · {displayPhone(s.business_phone)}</p>
                          </td>
                          {isAdmin && <td className="px-3 py-3 text-foreground">{s.owner_name ?? `#${s.owner_user_id}`}</td>}
                          <td className="px-3 py-3">
                            <span className={`badge ${TONE[meta.tone]}`}>{t(meta.label)}</span>
                            {s.amount_due !== null && <p className="mt-1 text-xs text-foreground-muted">{t('Due: {amount}', { amount: kes(s.amount_due) })}</p>}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">{kes(s.paid_total)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-foreground-muted">{kes(s.bitwave_fee_net_total)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{kes(s.reseller_share_net_total)}</td>
                          <td className="px-3 py-3 text-xs">
                            {t(PAYOUT_META[s.payout_status])}
                            {isAdmin && s.payout_status === 'refund_due' && (
                              <button type="button" className="mt-1 block font-semibold text-accent-primary hover:underline" onClick={() => setRefunding(s)}>
                                {t('Mark refunded')} ({kes(s.refund_due_total)})
                              </button>
                            )}
                            {s.reseller_recovered_total + s.bitwave_refund_part_total > 0 && (
                              <p className="mt-1 text-foreground-muted">
                                {t('{reseller} from the reseller, {bitwave} from Bitwave', { reseller: kes(s.reseller_recovered_total), bitwave: kes(s.bitwave_refund_part_total) })}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground-muted">{s.live_until ? formatDay(utcToGMT3DateOnly(s.live_until)) : '–'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 md:hidden">
                {data.sales.map((s) => {
                  const meta = SALE_STATE_META[s.state];
                  return (
                    <div key={s.sale_id}>
                    <MobileDataCard
                      id={s.sale_id}
                      title={s.title ?? `#${s.ad_id}`}
                      subtitle={isAdmin ? `${s.business_name} · ${s.owner_name ?? ''}` : s.business_name}
                      href={`/ads/${s.ad_id}`}
                      status={{ label: t(meta.label), variant: meta.tone }}
                      fields={[
                        { label: t('Paid'), value: kes(s.paid_total) },
                        { label: t('Bitwave 20%'), value: kes(s.bitwave_fee_net_total) },
                        { label: t('Reseller 80%'), value: kes(s.reseller_share_net_total) },
                        { label: t('Payout'), value: t(PAYOUT_META[s.payout_status]) },
                        ...(s.refund_due_total > 0 ? [{ label: t('Refund due'), value: kes(s.refund_due_total) }] : []),
                        ...(s.reseller_recovered_total > 0 ? [{ label: t('From the reseller'), value: kes(s.reseller_recovered_total) }] : []),
                        ...(s.bitwave_refund_part_total > 0 ? [{ label: t('From Bitwave'), value: kes(s.bitwave_refund_part_total) }] : []),
                        ...(s.amount_due !== null ? [{ label: t('Due'), value: kes(s.amount_due) }] : []),
                      ]}
                    />
                    {/* Outside the card: the whole card is a link, and its fields layout has no footer. */}
                    {isAdmin && s.payout_status === 'refund_due' && (
                      <button type="button" className="mt-1 min-h-[44px] w-full rounded-xl border border-border text-sm font-semibold text-accent-primary" onClick={() => setRefunding(s)}>
                        {t('Mark refunded')} ({kes(s.refund_due_total)})
                      </button>
                    )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {isAdmin && <BlockedWordsCard />}

      <ConfirmDialog
        isOpen={!!refunding}
        onClose={() => setRefunding(null)}
        onConfirm={() => { if (refunding) void markRefunded(refunding); }}
        title={t('Mark this refund as done?')}
        message={t('Only do this after you have sent {amount} back to {phone} yourself. This records the refund; it does not send any money.', {
          amount: kes(refunding?.refund_due_total), phone: displayPhone(refunding?.business_phone),
        })}
        confirmLabel={t('Mark refunded')}
        loading={busy}
      />
    </div>
  );
}
