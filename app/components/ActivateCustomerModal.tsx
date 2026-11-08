'use client';

import { useCallback, useState } from 'react';
import { api } from '../lib/api';
import type { ActivatePPPoERequest, Customer } from '../lib/types';
import { useAlert } from '../context/AlertContext';
import { useT } from '../lib/i18n';
import {
  activationConfirmLabel,
  activationConflict,
  activationConflictHint,
  activationConflictMessage,
  isNoPayment,
  manualPaymentHint,
  manualPaymentOptions,
  type ActivationConflict,
} from '../lib/manualActivation';

type ActivatableCustomer = Pick<Customer, 'id' | 'name' | 'connection_type'> & Partial<Pick<Customer, 'plan'>>;

function connectionTypeOf(customer: ActivatableCustomer): 'hotspot' | 'pppoe' | 'static_ip' {
  return customer.connection_type ?? customer.plan?.connection_type ?? 'hotspot';
}

const EMPTY_FORM: ActivatePPPoERequest = { payment_method: 'cash', payment_reference: '', notes: '' };

/**
 * The Activate dialog for a PPPoE or static-IP customer: records the payment
 * (or "Activate without payment"), sets the expiry and puts the customer on
 * the router. Shared by the customer list, the "Customer registered" screen
 * and the customer page, so all three behave the same.
 */
export default function ActivateCustomerModal({
  customer,
  canManageCustomers,
  onClose,
  onActivated,
  onConflict,
}: {
  customer: ActivatableCustomer;
  canManageCustomers: boolean;
  onClose: () => void;
  onActivated: () => void;
  /** Called when the backend says the customer already paid / is active. */
  onConflict?: () => void;
}) {
  const { showAlert } = useAlert();
  const t = useT();
  const [form, setForm] = useState<ActivatePPPoERequest>(EMPTY_FORM);
  const [conflict, setConflict] = useState<ActivationConflict | null>(null);
  const [loading, setLoading] = useState(false);
  const isStatic = connectionTypeOf(customer) === 'static_ip';

  const handleActivate = useCallback(async (force = false) => {
    const payload: ActivatePPPoERequest = force ? { ...form, force: true } : form;
    const noPayment = isNoPayment(form.payment_method);
    const done = noPayment
      ? t('{name} activated without payment', { name: customer.name })
      : t('{name} activated successfully', { name: customer.name });
    try {
      setLoading(true);
      if (isStatic) {
        const result = await api.activateStatic(customer.id, payload);
        if (result.router_result === 'ok') {
          showAlert('success', done);
        } else {
          showAlert('warning', t(
            noPayment
              ? 'Activated without payment, but the router was not updated yet: {error}. It will retry automatically.'
              : 'Payment recorded, but the router was not updated yet: {error}. It will retry automatically.',
            { error: result.router_error || t('unreachable') },
          ));
        }
      } else {
        await api.activatePPPoE(customer.id, payload);
        showAlert('success', done);
      }
      setConflict(null);
      setForm(EMPTY_FORM);
      onActivated();
    } catch (err) {
      const found = activationConflict(err);
      if (found) {
        // What the caller showed was stale: say why and let it refresh.
        setConflict(found);
        onConflict?.();
        return;
      }
      showAlert('error', err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setLoading(false);
    }
  }, [customer, form, isStatic, onActivated, onConflict, showAlert, t]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="card p-6 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-testid="activate-modal"
      >
        <h3 className="text-lg font-semibold text-foreground">
          {isStatic ? 'Activate static IP' : 'Activate PPPoE'}
        </h3>
        <p className="text-sm text-foreground-muted">
          Activate <span className="font-medium text-foreground">{customer.name}</span> &mdash;{' '}
          {isNoPayment(form.payment_method) ? t('sets expiry without recording a payment, and') : 'records payment, sets expiry, and'}{' '}
          {isStatic ? 'opens access for the IP on the router.' : 'provisions the secret on the router.'}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1.5">Payment Method</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value as ActivatePPPoERequest['payment_method'] }))}
              className="select"
            >
              {manualPaymentOptions(canManageCustomers).map((o) => (
                <option key={o.value} value={o.value}>{t(o.label)}</option>
              ))}
            </select>
            <p className="text-xs text-foreground-muted mt-1" data-testid="activate-payment-hint">
              {t(manualPaymentHint(form.payment_method))}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1.5">Payment Reference</label>
            <input
              type="text"
              value={form.payment_reference || ''}
              onChange={(e) => setForm((f) => ({ ...f, payment_reference: e.target.value }))}
              className="input"
              placeholder="Receipt number (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1.5">Notes</label>
            <input
              type="text"
              value={form.notes || ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="input"
              placeholder="Optional notes"
            />
          </div>
        </div>
        {conflict && (
          <div role="alert" data-testid="activate-conflict" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm space-y-1">
            <p className="font-medium text-foreground">{activationConflictMessage(conflict)}</p>
            <p className="text-foreground-muted">{t(activationConflictHint(form.payment_method))}</p>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => handleActivate(!!conflict)}
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : conflict ? (
              t(activationConfirmLabel(form.payment_method))
            ) : (
              'Activate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
