'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import MobileDataCard from '../../components/MobileDataCard';
import { api, ApiError } from '../../lib/api';
import { chargeDate, chargeMoney, clearPendingChargeKey, installationChargesEnabled, parseChargeAmount, pendingChargeKey, type InstallationCharge } from '../../lib/installationCharges';

type Action = { kind: 'charge' } | { kind: 'external_payment' | 'waiver'; chargeId: number } | { kind: 'reversal'; chargeId: number; eventId: number };
type Attempt = { action: Action; amount: string; reason: string; reference: string; minor?: number; payload: string; key: string };
const labels = { charge: 'Installation charge', external_payment: 'External payment recorded', waiver: 'Waiver', reversal: 'Reversal' };

/** Gate before mounting the loader: other accounts/demo send no ledger requests. */
export default function InstallationChargesCard({ customerId }: { customerId: number }) {
  const { user, isDemo } = useAuth();
  const { can } = usePermissions();
  if (!installationChargesEnabled(user, isDemo, process.env.NEXT_PUBLIC_TECHMID_INSTALLATION_CHARGES_ENABLED) || !can('customers.view')) return null;
  return <ChargeLedger key={`${user!.id}:${customerId}`} customerId={customerId} canWrite={!user?.staff && !user?.account_admin} />;
}

function ChargeLedger({ customerId, canWrite }: { customerId: number; canWrite: boolean }) {
  const [charges, setCharges] = useState<InstallationCharge[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Attempt | null>(null);
  const keys = useRef(new Map<string, string>());
  const inFlight = useRef(false);
  const loadingRef = useRef(false);
  const loadVersion = useRef(0);
  const mounted = useRef(true);
  const scope = `597:${customerId}`;
  const attemptStorageKey = `installation-charge-attempt:${scope}`;

  async function load(offset = 0) {
    const version = ++loadVersion.current;
    loadingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const page = await api.getInstallationCharges(customerId, offset);
      if (!mounted.current || version !== loadVersion.current) return;
      setCharges(old => offset === 0 ? page.charges : [...old, ...page.charges.filter(c => !old.some(previous => previous.id === c.id))]);
      setNextOffset(page.next_offset);
      setCanCreate(page.can_create);
    } catch {
      if (mounted.current && version === loadVersion.current) setError('Could not load installation charges. Your customer details have not changed.');
    } finally { if (mounted.current && version === loadVersion.current) { loadingRef.current = false; setLoading(false); } }
  }

  useEffect(() => {
    mounted.current = true;
    try {
      const raw = sessionStorage.getItem(attemptStorageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Attempt;
        if (saved && typeof saved.key === 'string' && typeof saved.payload === 'string' && ['charge', 'external_payment', 'waiver', 'reversal'].includes(saved.action?.kind)) {
          setPending(saved); setAction(saved.action); setAmount(saved.amount); setReason(saved.reason); setReference(saved.reference);
        }
      }
    } catch { /* A fresh write below requires durable browser storage. */ }
    void load();
    return () => { mounted.current = false; };
    // This isolated ledger remounts when customerId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  function begin(next: Action) {
    if (pending || inFlight.current || loadingRef.current) return;
    setAction(next); setAmount(''); setReason(''); setReference(''); setError(''); setNotice('');
  }

  async function record() {
    if (!action || !canWrite || inFlight.current || loadingRef.current) return;
    let minor: number | undefined;
    const trimmedReason = reason.trim();
    try {
      if (action.kind !== 'reversal') minor = parseChargeAmount(amount);
      if (!trimmedReason) throw new Error(action.kind === 'charge' ? 'Enter a description.' : 'Enter a reason for this record.');
      if (trimmedReason.length > (action.kind === 'charge' ? 200 : 500)) throw new Error('Please shorten the description or reason.');
    } catch (e) { setError((e as Error).message); return; }
    const payload = JSON.stringify({ ...action, amount_minor: minor, reason: trimmedReason, external_reference: action.kind === 'external_payment' ? reference.trim() : '' });
    const attempt = pending ?? { action, amount, reason: trimmedReason, reference: reference.trim(), minor, payload, key: pendingChargeKey(scope, payload, keys.current) };
    try {
      // Persist BEFORE sending. An unknown result must survive navigation/reload.
      sessionStorage.setItem(attemptStorageKey, JSON.stringify(attempt));
    } catch { setError('Browser storage is unavailable. Enable it before recording a fee so uncertain requests can be safely recovered.'); return; }
    setPending(attempt);
    const idempotency_key = attempt.key;
    const submitted = attempt.action;
    ++loadVersion.current;
    inFlight.current = true; setSaving(true); setError(''); setNotice('');
    try {
      let updated: InstallationCharge;
      if (submitted.kind === 'charge') updated = await api.recordInstallationCharge(customerId, { idempotency_key, amount_minor: attempt.minor!, description: attempt.reason });
      else if (submitted.kind === 'reversal') updated = await api.reverseInstallationChargeEvent(customerId, submitted.chargeId, submitted.eventId, { idempotency_key, reason: attempt.reason });
      else updated = await api.recordInstallationChargeEvent(customerId, submitted.chargeId, { idempotency_key, kind: submitted.kind, amount_minor: attempt.minor!, reason: attempt.reason, ...(attempt.reference && submitted.kind === 'external_payment' ? { external_reference: attempt.reference } : {}) });
      clearPendingChargeKey(scope, attempt.payload, keys.current);
      sessionStorage.removeItem(attemptStorageKey);
      if (!mounted.current) return;
      setPending(null);
      setCharges(old => old.some(c => c.id === updated.id) ? old.map(c => c.id === updated.id ? updated : c) : [updated, ...old]);
      setAction(null); setNotice('Record saved. Internet access and billing balances are unchanged.');
    } catch (e) {
      if (!mounted.current) return;
      const known = e instanceof ApiError && e.status >= 400 && e.status < 500;
      // A later rejection cannot prove an earlier unknown attempt did not commit.
      if (known && !pending) {
        clearPendingChargeKey(scope, attempt.payload, keys.current);
        try { sessionStorage.removeItem(attemptStorageKey); } catch { /* Retaining the same key on reload is safe. */ }
        setPending(null);
      }
      setError(known ? `${e.message}${pending ? ' The earlier record still needs confirmation before another can be entered.' : ''}` : 'Could not confirm whether this record was saved. Refresh the ledger to check; retrying the same details uses the same request key.');
    } finally { inFlight.current = false; if (mounted.current) setSaving(false); }
  }

  if (!loading && !error && !pending && !canCreate && charges.length === 0) return null;

  return <section aria-labelledby="installation-charges-heading" className="card p-4 space-y-4 min-w-0">
    <div className="flex items-center justify-between gap-2">
      <h2 id="installation-charges-heading" className="text-base font-semibold">Installation charges</h2>
      <button type="button" className="btn-secondary text-sm" disabled={loading || saving} onClick={() => void load()}>Refresh ledger</button>
    </div>
    <p className="text-sm font-medium">Recorded debt does not block internet yet.</p>
    <p className="text-xs text-foreground-muted">These records track fees and money received outside this feature. They do not collect or refund money, verify receipts, or add to your wallet or payout balance.</p>
    {!canWrite && <p className="text-sm">Read only. Only the account owner can change installation charges.</p>}
    {error && <p role="alert" className="text-sm text-danger break-words">{error}</p>}
    {notice && <p role="status" className="text-sm text-success">{notice}</p>}
    {pending && canWrite && !saving && <p role="status" className="text-sm">An earlier record needs confirmation. Confirm that exact record before entering a different one. This will not submit it twice.</p>}
    {loading && <p role="status" className="text-sm">Loading installation charges…</p>}
    {!loading && !error && charges.length === 0 && <p className="text-sm text-foreground-muted">No installation charges recorded.</p>}
    {canWrite && canCreate && !action && <button type="button" disabled={loading || !!pending} className="btn-secondary" onClick={() => begin({ kind: 'charge' })}>Add installation charge</button>}
    {action && canWrite && <fieldset disabled={saving} className="border border-border rounded-lg p-3 space-y-3">
      <legend className="px-1 text-sm font-semibold">{action.kind === 'charge' ? 'Add installation charge' : action.kind === 'external_payment' ? 'Record external payment' : action.kind === 'waiver' ? 'Record waiver' : 'Reverse record'}</legend>
      {action.kind !== 'reversal' && <label className="block text-sm">Amount (KES)<input readOnly={!!pending} className="input mt-1 w-full" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></label>}
      <label className="block text-sm">{action.kind === 'charge' ? 'Description' : 'Reason'}<input readOnly={!!pending} className="input mt-1 w-full" value={reason} maxLength={action.kind === 'charge' ? 200 : 500} onChange={e => setReason(e.target.value)} /></label>
      {action.kind === 'external_payment' && <label className="block text-sm">External receipt reference (optional)<input readOnly={!!pending} className="input mt-1 w-full" maxLength={120} value={reference} onChange={e => setReference(e.target.value)} /></label>}
      {action.kind === 'reversal' && <p className="text-xs text-foreground-muted">Adds a linked correction to the history. It does not refund money or delete the original record.</p>}
      <div className="flex gap-2 flex-wrap"><button type="button" disabled={loading} className="btn-primary" onClick={() => void record()}>{saving ? 'Saving…' : pending ? 'Confirm previous record' : 'Save installation record'}</button><button type="button" disabled={!!pending} className="btn-secondary" onClick={() => setAction(null)}>Cancel</button></div>
    </fieldset>}
    {charges.map(charge => <MobileDataCard key={charge.id} id={charge.id} title={charge.description} subtitle={chargeDate(charge.created_at)} status={{ label: charge.reversed ? 'Reversed' : charge.outstanding_minor === 0 ? 'Settled' : 'Outstanding', variant: charge.reversed ? 'neutral' : charge.outstanding_minor === 0 ? 'success' : 'warning' }} fields={[
      { label: 'Original', value: chargeMoney(charge.original_minor) },
      { label: 'External payments recorded', value: chargeMoney(charge.payments_minor) },
      { label: 'Waived', value: chargeMoney(charge.waivers_minor) },
      { label: 'Outstanding', value: chargeMoney(charge.outstanding_minor) },
    ]} expandableContent={<div className="space-y-3">
      {canWrite && !charge.reversed && charge.outstanding_minor > 0 && <div className="flex flex-wrap gap-2"><button type="button" disabled={saving || loading || !!pending} className="btn-secondary text-sm" onClick={() => begin({ kind: 'external_payment', chargeId: charge.id })}>Record external payment</button><button type="button" disabled={saving || loading || !!pending} className="btn-secondary text-sm" onClick={() => begin({ kind: 'waiver', chargeId: charge.id })}>Record waiver</button></div>}
      <details><summary className="text-sm cursor-pointer">Record history</summary><ol className="mt-2 space-y-3 text-sm">{charge.events.map(event => <li key={event.id} className="border-t border-border pt-2 break-words">
        <p className="font-medium">{labels[event.kind]} · {chargeMoney(Math.abs(event.delta_minor))}{event.reversed ? ' · Reversed' : ''}</p>
        <p>{event.reason}</p>{event.external_reference && <p>Reference: {event.external_reference}</p>}
        <p className="text-xs text-foreground-muted">{chargeDate(event.created_at)}{event.reverses_event_id ? ` · Reverses record #${event.reverses_event_id}` : ''}</p>
        {canWrite && event.kind !== 'reversal' && !event.reversed && <button type="button" disabled={saving || loading || !!pending} className="text-sm underline mt-1" onClick={() => begin({ kind: 'reversal', chargeId: charge.id, eventId: event.id })}>Reverse record #{event.id}</button>}
      </li>)}</ol></details>
    </div>} />)}
    {nextOffset !== null && <button type="button" className="btn-secondary" disabled={loading || saving} onClick={() => void load(nextOffset)}>Load older charges</button>}
  </section>;
}
