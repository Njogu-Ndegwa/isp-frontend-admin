'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAlert } from '../../context/AlertContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatAmount } from '../../lib/format';
import type { ActivatePPPoERequest, Customer, StaticActionResponse, StaticStatusResponse } from '../../lib/types';
import { staticFindings, type StaticTone } from './staticIp';

const TONE_CLASS: Record<StaticTone, string> = {
  success: 'bg-success/10 border-success/20 text-success',
  warning: 'bg-warning/10 border-warning/30 text-warning',
  danger: 'bg-danger/10 border-danger/30 text-danger',
  neutral: 'bg-background-tertiary border-border text-foreground-muted',
};

/**
 * Router control for a static-IP customer: what the router is doing for this
 * IP right now, plus record-payment, suspend, re-sync and device-pin actions.
 * Status is read when the card opens and after every action — not on a timer.
 */
export default function StaticIpPanel({ customer, onChanged }: { customer: Customer; onChanged: () => void }) {
  const { showAlert } = useAlert();
  const [status, setStatus] = useState<StaticStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmUnpin, setConfirmUnpin] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState<ActivatePPPoERequest>({ payment_method: 'cash' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await api.getStaticStatus(customer.id));
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Could not read the router');
    } finally {
      setLoading(false);
    }
  }, [customer.id, showAlert]);

  useEffect(() => { void load(); }, [load]);

  const run = async (name: string, action: () => Promise<StaticActionResponse>, success: string) => {
    setBusy(name);
    try {
      const result = await action();
      if (result.router_result === 'ok') {
        showAlert('success', success);
      } else {
        showAlert('warning', `Saved, but the router was not updated yet: ${result.router_error || 'unreachable'}. It will retry automatically.`);
      }
      if (result.mac_mismatch) {
        showAlert('warning', `Another device (${result.observed_mac}) is using this IP and is being blocked.`);
      }
      onChanged();
      await load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const findings = status ? staticFindings(status) : [];
  const r = status?.router;
  const pinned = status?.static_mac || r?.pinned_mac || null;
  const access = status?.actual_access ?? null;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Static IP control</h3>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="text-xs text-foreground-muted hover:text-foreground disabled:opacity-50"
        >
          {loading ? 'Reading router…' : 'Refresh'}
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-background-tertiary rounded-lg p-3">
          <dt className="text-xs text-foreground-muted uppercase tracking-wider">IP address</dt>
          <dd className="font-mono text-foreground mt-1">{customer.static_ip || '—'}</dd>
        </div>
        <div className="bg-background-tertiary rounded-lg p-3">
          <dt className="text-xs text-foreground-muted uppercase tracking-wider">Router access</dt>
          <dd className="mt-1">
            {access === 'enabled' && <span className="badge badge-success">Enabled</span>}
            {access === 'suspended' && <span className="badge badge-danger">Suspended</span>}
            {access === null && <span className="text-foreground-muted">{loading ? '…' : 'Unknown'}</span>}
          </dd>
        </div>
        <div className="bg-background-tertiary rounded-lg p-3">
          <dt className="text-xs text-foreground-muted uppercase tracking-wider">Speed limit</dt>
          <dd className="font-mono text-foreground mt-1">{r?.queue?.max_limit || '—'}</dd>
        </div>
        <div className="bg-background-tertiary rounded-lg p-3">
          <dt className="text-xs text-foreground-muted uppercase tracking-wider">Device seen</dt>
          <dd className="mt-1 text-foreground">
            {r?.host ? (
              <span className="font-mono text-xs">{r.host.mac}{r.host.idle_time ? ` · idle ${r.host.idle_time}` : ''}</span>
            ) : (
              <span className="text-foreground-muted">{loading ? '…' : 'Not connected'}</span>
            )}
          </dd>
        </div>
        <div className="bg-background-tertiary rounded-lg p-3 col-span-2">
          <dt className="text-xs text-foreground-muted uppercase tracking-wider">Pinned device (blocks anyone else using this IP)</dt>
          <dd className="font-mono text-foreground mt-1 flex items-center justify-between gap-2">
            <span>{pinned || 'Not pinned yet'}</span>
            {typeof r?.pin_hits === 'number' && r.pin_hits > 0 && (
              <span className="text-xs text-warning font-sans">{r.pin_hits} blocked packets</span>
            )}
          </dd>
        </div>
      </dl>

      {findings.length > 0 && (
        <ul className="space-y-2">
          {findings.map((f) => (
            <li key={f.text} className={`text-xs rounded-lg border p-3 ${TONE_CLASS[f.tone]}`}>{f.text}</li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-primary col-span-2" disabled={!!busy} onClick={() => setPayOpen(true)}>
          Record payment &amp; activate
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={!!busy}
          onClick={() => void run('sync', () => api.syncStatic(customer.id), 'Router updated')}
        >
          {busy === 'sync' ? 'Syncing…' : 'Re-sync router'}
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-lg text-sm font-medium border border-danger/30 text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
          disabled={!!busy || access === 'suspended'}
          onClick={() => setConfirmSuspend(true)}
        >
          Suspend now
        </button>
        {r?.observed_mac && r.observed_mac !== pinned && (
          <button
            type="button"
            className="btn-secondary col-span-2"
            disabled={!!busy}
            onClick={() => void run('pin', () => api.pinStatic(customer.id, r.observed_mac ?? null), `Pinned to ${r.observed_mac}`)}
          >
            Pin to the device seen now ({r.observed_mac})
          </button>
        )}
        {pinned && (
          <button
            type="button"
            className="btn-secondary col-span-2"
            disabled={!!busy}
            onClick={() => setConfirmUnpin(true)}
          >
            Reset device pin
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmSuspend}
        onClose={() => setConfirmSuspend(false)}
        onConfirm={() => {
          setConfirmSuspend(false);
          void run('suspend', () => api.suspendStatic(customer.id), 'Suspended: the device now sees the payment page');
        }}
        title="Suspend static IP"
        message={`${customer.name || 'This customer'} loses internet now and sees the payment page until a payment is recorded.`}
        confirmLabel="Suspend"
        variant="danger"
        loading={busy === 'suspend'}
      />
      <ConfirmDialog
        isOpen={confirmUnpin}
        onClose={() => setConfirmUnpin(false)}
        onConfirm={() => {
          setConfirmUnpin(false);
          void run('unpin', () => api.pinStatic(customer.id, null), 'Pin cleared: the next device seen while paid up will be pinned');
        }}
        title="Reset device pin"
        message="Use this when the customer replaced their router. Until the new device is seen, anyone who types in this IP can use it."
        confirmLabel="Reset pin"
        variant="warning"
        loading={busy === 'unpin'}
      />

      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPayOpen(false)}>
          <div className="card p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Record payment</h3>
            <p className="text-sm text-foreground-muted">
              Records {customer.plan?.price != null ? formatAmount(customer.plan.price) : 'the plan price'} for{' '}
              {customer.plan?.name || 'the plan'}, extends the expiry and opens access on the router.
            </p>
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-1.5">Payment method</label>
              <select
                className="select"
                value={payForm.payment_method}
                onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value as ActivatePPPoERequest['payment_method'] })}
              >
                <option value="cash">Cash</option>
                <option value="mpesa">M-Pesa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-1.5">Reference (optional)</label>
              <input
                className="input"
                value={payForm.payment_reference || ''}
                onChange={(e) => setPayForm({ ...payForm, payment_reference: e.target.value })}
                placeholder="e.g. M-Pesa code"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setPayOpen(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={!!busy}
                onClick={() => {
                  setPayOpen(false);
                  void run('pay', () => api.activateStatic(customer.id, payForm), 'Payment recorded and access opened');
                }}
              >
                {busy === 'pay' ? 'Saving…' : 'Record payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
