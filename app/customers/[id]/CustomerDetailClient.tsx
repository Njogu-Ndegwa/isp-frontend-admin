'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { copyText } from '../../lib/clipboard';
import { PLATFORM_PAYBILL, customerPaybill, paybillForCustomer } from '../../lib/customerPaybill';
import { Customer, Plan, Router as RouterType, UpdateCustomerRequest, CustomerUsageResponse, CustomerUsageLive } from '../../lib/types';
import {
  QUEUE_STATUS_LABEL, QUEUE_STATUS_TONE, formatAge, formatBps, formatMaxLimit,
} from '../../lib/live';
import { useAlert } from '../../context/AlertContext';
import Header from '../../components/Header';
import { PageLoader } from '../../components/LoadingSpinner';
import DateTimePicker from '../../components/DateTimePicker';
import { utcToGMT3Input, gmt3InputToISO } from '../../lib/dateUtils';
import { formatAmount } from '../../lib/format';
import { isFreeTrialPlan } from '../../plans/planType';
import GracePeriodCard from './GracePeriodCard';
import PaymentHistoryPanel from './PaymentHistoryPanel';
import RelatedAccounts from './RelatedAccounts';
import UsageHistoryPanel from './UsageHistoryPanel';
import ConnectedDevicesPanel from './ConnectedDevicesPanel';
import HotspotDevicesPanel from './HotspotDevicesPanel';
import StaticIpPanel from './StaticIpPanel';
import { connectionTypeLabel } from '../../lib/connectionType';
import { canActivatePaidUntil, formatPaidUntil, pppoeSaveNotice } from './pppoeActivation';


export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const { showAlert } = useAlert();
  const customerId = Number(params.id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [routers, setRouters] = useState<RouterType[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formData, setFormData] = useState<UpdateCustomerRequest>({});
  // "Activate now – already paid until <date>": an explicit choice, never
  // implied by editing the expiry (that alone leaves the customer inactive).
  const [activatePaidUntil, setActivatePaidUntil] = useState(false);
  const [usage, setUsage] = useState<CustomerUsageResponse | null>(null);
  // Reseller-wide paybill, fetched only when the API did not send the
  // customer's own `payment_paybill` (older backend, demo mode).
  const [fallbackPaybill, setFallbackPaybill] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    try {
      setPageLoading(true);
      const [customers, plansData, routersData] = await Promise.all([
        api.getCustomers(),
        api.getPlans(),
        api.getRouters(),
      ]);
      const found = customers.find((c) => c.id === customerId);
      if (!found) {
        setError('Customer not found');
        return;
      }
      setCustomer(found);
      if (found.payment_paybill === undefined) {
        api.getPaymentMethods()
          .then((methods) => setFallbackPaybill(customerPaybill(methods)))
          .catch(() => setFallbackPaybill(PLATFORM_PAYBILL));
      }
      setAllCustomers(customers);
      setPlans(plansData);
      setRouters(routersData);
      setFormData({
        name: found.name || '',
        phone: found.phone || '',
        plan_id: found.plan_id ?? found.plan?.id,
        router_id: found.router_id ?? found.router?.id,
        mac_address: found.mac_address || '',
        pppoe_username: found.pppoe_username || '',
        pppoe_password: '',
        static_ip: found.static_ip || '',
        static_mac: found.static_mac || '',
        expiry: utcToGMT3Input(found.expiry),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setPageLoading(false);
    }
  };

  const connectionType = customer
    ? (customer.connection_type ?? customer.plan?.connection_type ?? 'hotspot')
    : null;
  const isPPPoE = connectionType === 'pppoe';
  const isStatic = connectionType === 'static_ip';
  const tracksUsage = connectionType === 'pppoe' || connectionType === 'hotspot' || isStatic;

  // Fetched when the page opens and when the user presses Refresh — never on a
  // timer, so server cost follows actual views, not open tabs. The router
  // pushes fresh numbers every few seconds, so every fetch is already current.
  const usageCustomerId = customer?.id;
  const [usageLoading, setUsageLoading] = useState(false);
  const fetchUsage = useCallback(() => {
    if (!usageCustomerId || !tracksUsage) return Promise.resolve();
    return api.getCustomerUsage(usageCustomerId)
      .then((data) => setUsage(data))
      .catch(() => {});
  }, [usageCustomerId, tracksUsage]);
  useEffect(() => { void fetchUsage(); }, [fetchUsage]);
  const loadUsage = () => {
    setUsageLoading(true);
    void fetchUsage().finally(() => setUsageLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    try {
      setSaving(true);
      setFormError(null);
      const payload: UpdateCustomerRequest = {};
      if (formData.name && formData.name !== customer.name) payload.name = formData.name;
      if (formData.phone && formData.phone !== customer.phone) payload.phone = formData.phone;
      if (formData.plan_id && formData.plan_id !== (customer.plan_id ?? customer.plan?.id)) payload.plan_id = formData.plan_id;
      if (formData.router_id && formData.router_id !== (customer.router_id ?? customer.router?.id)) payload.router_id = formData.router_id;
      if (!isStatic && formData.mac_address !== (customer.mac_address || '')) payload.mac_address = formData.mac_address;
      if (isStatic && formData.static_mac !== (customer.static_mac || '')) payload.static_mac = formData.static_mac;
      if (formData.pppoe_username !== (customer.pppoe_username || '')) payload.pppoe_username = formData.pppoe_username;
      if (formData.pppoe_password) payload.pppoe_password = formData.pppoe_password;
      if (formData.static_ip !== (customer.static_ip || '')) payload.static_ip = formData.static_ip;
      if (formData.expiry && formData.expiry !== utcToGMT3Input(customer.expiry)) {
        payload.expiry = gmt3InputToISO(formData.expiry);
      }
      const activating = activatePaidUntil && canActivatePaidUntil(customer, isPPPoE, formData.expiry);
      if (activating) payload.activate_paid_until = true;

      // Saving an active PPPoE customer with no changes still goes to the
      // server: it puts their login back on the router if it went missing.
      const resaveActivePPPoE = isPPPoE && customer.status === 'active';
      if (Object.keys(payload).length === 0 && !resaveActivePPPoE) {
        router.push('/customers');
        return;
      }

      const result = await api.updateCustomer(customer.id, payload);
      showAlert('success', `${result.customer.name} updated successfully`);
      const routerNotice = pppoeSaveNotice(result);
      if (routerNotice) showAlert(routerNotice.tone, routerNotice.text);
      if (result.static_reprovisioned === 'failed') {
        showAlert('warning', 'Saved, but the router was not updated yet. It retries automatically; use Re-sync to try now.');
      }
      router.push('/customers');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    try {
      setDeleteLoading(true);
      const result = await api.deleteCustomer(customer.id);
      showAlert('success', result.message);
      if (result.pppoe_deprovisioned === 'failed') {
        showAlert('warning', 'PPPoE de-provisioning failed — manual cleanup may be needed');
      }
      router.push('/customers');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to delete customer');
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  };

  if (pageLoading) return <PageLoader />;

  if (error || !customer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">{error || 'Customer not found'}</h2>
          <Link href="/customers" className="btn-primary mt-4 inline-block">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={customer.name || 'Customer'}
        subtitle="Usage, payments and account details"
        backHref="/customers"
      />

      {/* Phones and small tablets: one column. From 1024px: what is happening with
          the customer (activity, usage, payments) on the left, the details you
          edit on the right, instead of one narrow strip down the middle. */}
      <div className="max-w-2xl mx-auto space-y-4 lg:max-w-none lg:mx-0 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:items-start">
        <div className="space-y-4 min-w-0">
          <Link
            href={`/customers/${customer.id}/activity`}
            className="card p-4 flex items-center justify-between gap-3 hover:bg-background-tertiary/50 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Activity log</p>
              <p className="text-xs text-foreground-muted">
                Connections, drops, payments, changes{isPPPoE ? ' and what the PPPoE server said' : ' and router messages'}
              </p>
            </div>
            <svg className="w-5 h-5 text-foreground-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* The usage card carries its own Refresh; keep a standalone one
              only when that card has nothing to show. */}
          {tracksUsage && usage && !usage.period && !usage.plan_data_cap_mb && (
            <div className="flex justify-end">
              <RefreshButton onClick={loadUsage} refreshing={usageLoading} />
            </div>
          )}
          {usage?.live && customer && (
            <LivePanel live={usage.live} routerId={customer.router_id ?? customer.router?.id ?? null} />
          )}
          {isPPPoE && customer.pppoe_username && <ConnectedDevicesPanel customerId={customer.id} />}
          {isStatic && <StaticIpPanel customer={customer} onChanged={loadData} />}
          {connectionType === 'hotspot' && <HotspotDevicesPanel customerId={customer.id} />}
          {tracksUsage && usage && <UsagePanel usage={usage} onRefresh={loadUsage} refreshing={usageLoading} />}
          {tracksUsage && <UsageHistoryPanel customerId={customer.id} />}

          <PaymentHistoryPanel key={customer.id} customerId={customer.id} />
        </div>

        <div className="space-y-4 min-w-0">
          {/* Static-IP customers pay through the same paybill account as PPPoE. */}
          {(isPPPoE || isStatic) && (
            <div className="card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Paybill Payment Instructions</h3>
              <div className="space-y-2">
                <PaybillRow
                  paybill={paybillForCustomer(customer, fallbackPaybill)}
                  loading={customer.payment_paybill === undefined && fallbackPaybill === null}
                  onCopy={async (value) => {
                    const ok = await copyText(value);
                    showAlert(ok ? 'success' : 'error', ok ? 'Paybill copied' : 'Copy failed — select and copy manually');
                  }}
                />
                <div className="bg-background-tertiary rounded-lg p-3">
                  <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Account Number</label>
                  {customer.account_number ? (
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-sm text-foreground">{customer.account_number}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await copyText(customer.account_number!);
                          showAlert(ok ? 'success' : 'error', ok ? 'Account number copied' : 'Copy failed — select and copy manually');
                        }}
                        className="p-1.5 rounded-md hover:bg-background-secondary transition-colors text-foreground-muted hover:text-foreground"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-foreground-muted mt-1">Not yet assigned — will be generated on next registration or payment</p>
                  )}
                </div>
                <div className="bg-background-tertiary rounded-lg p-3">
                  <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Plan Amount</label>
                  <div className="mt-1">
                    <span className="text-sm font-medium text-foreground">{customer.plan?.price != null ? formatAmount(customer.plan.price) : '-'}</span>
                  </div>
                </div>
                {(customer.wallet_credit_kes ?? 0) > 0 && (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                    <label className="text-xs font-medium text-success uppercase tracking-wider">Wallet Credit</label>
                    <div className="mt-1">
                      <span className="text-sm font-semibold text-success">{formatAmount(customer.wallet_credit_kes)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <GracePeriodCard
            customer={customer}
            onSaved={(result) => setCustomer({
              ...customer,
              status: result.status,
              grace_period_minutes: result.grace_period_minutes,
              effective_expiry: result.effective_expiry,
              in_grace: result.in_grace,
            })}
          />
          <RelatedAccounts customer={customer} customers={allCustomers} />
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-4">Customer details</h3>
            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="+254712345678"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Plan</label>
                <select
                  value={formData.plan_id || ''}
                  onChange={(e) => setFormData({ ...formData, plan_id: Number(e.target.value) })}
                  className="select"
                >
                  <option value="" disabled>Select plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — {isFreeTrialPlan(plan) ? 'Free trial' : formatAmount(plan.price)} ({connectionTypeLabel(plan.connection_type)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Router</label>
                <select
                  value={formData.router_id || ''}
                  onChange={(e) => setFormData({ ...formData, router_id: Number(e.target.value) })}
                  className="select"
                >
                  <option value="" disabled>Select router</option>
                  {routers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {isStatic ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1.5">Static IP</label>
                    <input
                      type="text"
                      value={formData.static_ip || ''}
                      onChange={(e) => setFormData({ ...formData, static_ip: e.target.value })}
                      className="input font-mono"
                      placeholder="192.168.2.24"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1.5">Pinned device MAC</label>
                    <input
                      type="text"
                      value={formData.static_mac || ''}
                      onChange={(e) => setFormData({ ...formData, static_mac: e.target.value })}
                      className="input font-mono"
                      placeholder="Learned automatically"
                    />
                    <p className="mt-1 text-xs text-foreground-muted">Only this device can use the IP. Clear it to re-learn after the customer changes router.</p>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-1.5">MAC Address</label>
                  <input
                    type="text"
                    value={formData.mac_address || ''}
                    onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                    className="input font-mono"
                    placeholder="AA:BB:CC:DD:EE:FF"
                  />
                </div>
              )}

              <DateTimePicker
                label="Expiry Date"
                value={formData.expiry || ''}
                onChange={(v) => setFormData({ ...formData, expiry: v })}
              />

              {isPPPoE && customer.status !== 'active' && (
                canActivatePaidUntil(customer, isPPPoE, formData.expiry) ? (
                  <label
                    className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 cursor-pointer"
                    data-testid="activate-paid-until"
                  >
                    <input
                      type="checkbox"
                      checked={activatePaidUntil}
                      onChange={(e) => setActivatePaidUntil(e.target.checked)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-accent-primary"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-foreground">
                        Activate now — already paid until {formatPaidUntil(formData.expiry)}
                      </span>
                      <span className="block text-xs text-foreground-muted mt-0.5">
                        For customers who already paid you, e.g. moved from another system. They go on the
                        router until that date. No payment is recorded and it does not count as revenue.
                      </span>
                    </span>
                  </label>
                ) : (
                  <p className="text-xs text-foreground-muted" data-testid="inactive-expiry-hint">
                    This customer is inactive, so saving does not put them on the router. To activate someone who
                    has already paid, set the expiry to the date they paid until and tick &quot;Activate now&quot;.
                  </p>
                )
              )}

              {isPPPoE && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-4">PPPoE Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground-muted mb-1.5">PPPoE Username</label>
                      <input
                        type="text"
                        value={formData.pppoe_username || ''}
                        onChange={(e) => setFormData({ ...formData, pppoe_username: e.target.value })}
                        className="input font-mono"
                        placeholder="pppoe_username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground-muted mb-1.5">PPPoE Password</label>
                      <input
                        type="text"
                        value={formData.pppoe_password || ''}
                        onChange={(e) => setFormData({ ...formData, pppoe_password: e.target.value })}
                        className="input font-mono"
                        placeholder="Leave empty to keep current"
                      />
                      <p className="mt-1 text-xs text-foreground-muted">Only fill in to change the current password</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground-muted mb-1.5">Static IP</label>
                      <input
                        type="text"
                        value={formData.static_ip || ''}
                        onChange={(e) => setFormData({ ...formData, static_ip: e.target.value })}
                        className="input font-mono"
                        placeholder="Leave empty for dynamic"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Link href="/customers" className="btn-secondary flex-1 text-center">
                  Cancel
                </Link>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>

            {/* Delete section */}
            <div className="mt-6 pt-6 border-t border-border">
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium border border-danger/30 text-danger hover:bg-danger/10 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmDelete(false)}>
          <div className="card p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 mx-auto rounded-full bg-danger/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground text-center">Delete Customer</h3>
            <p className="text-sm text-foreground-muted text-center">
              Are you sure you want to delete <span className="font-medium text-foreground">{customer.name}</span>? This action cannot be undone.
              {isPPPoE && ' Any active PPPoE session will be de-provisioned from the router.'}
              {isStatic && ' The static IP\'s access, speed limit and device pin are removed from the router.'}
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-danger text-white hover:bg-danger/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleteLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LivePanel({ live, routerId }: { live: CustomerUsageLive; routerId: number | null }) {
  return (
    <div className="card p-4 space-y-3" data-testid="live-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Live now</h3>
        <span className="text-[11px] text-foreground-muted tabular-nums">
          Router report {formatAge(live.report_age_seconds)} · every {live.interval_seconds}s
        </span>
      </div>
      <div className="flex items-center gap-2">
        {live.online ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-500 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-foreground-muted text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-foreground-muted/40" /> Offline
          </span>
        )}
        {live.ip && <span className="font-mono text-xs text-foreground-muted">{live.ip}</span>}
      </div>
      {live.online && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-background-tertiary/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-foreground-muted">Download now</p>
            <p className="text-lg font-semibold text-accent-primary tabular-nums">{formatBps(live.rate_down_bps)}</p>
          </div>
          <div className="rounded-lg bg-background-tertiary/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-foreground-muted">Upload now</p>
            <p className="text-lg font-semibold text-teal-500 tabular-nums">{formatBps(live.rate_up_bps)}</p>
          </div>
        </div>
      )}
      {live.online && (
        <div className="text-xs space-y-1">
          <p className={QUEUE_STATUS_TONE[live.queue_status]}>{QUEUE_STATUS_LABEL[live.queue_status]}</p>
          {live.max_limit && (
            <p className="text-foreground-muted">Speed limit in effect: {formatMaxLimit(live.max_limit)}</p>
          )}
        </div>
      )}
      {routerId && (
        <Link href={`/routers/${routerId}/live`} className="text-xs text-accent-primary hover:underline">
          Open router live view →
        </Link>
      )}
    </div>
  );
}

/** The paybill the customer pays into with their account number. */
function PaybillRow({ paybill, loading, onCopy }: {
  paybill: string | null;
  loading: boolean;
  onCopy: (value: string) => void;
}) {
  return (
    <div className="bg-background-tertiary rounded-lg p-3">
      <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Paybill</label>
      {loading ? (
        <p className="text-xs text-foreground-muted mt-1">Loading…</p>
      ) : paybill ? (
        <div className="flex items-center justify-between mt-1">
          <span className="font-mono text-sm text-foreground">{paybill}</span>
          <button
            type="button"
            aria-label="Copy paybill"
            onClick={() => onCopy(paybill)}
            className="p-1.5 rounded-md hover:bg-background-secondary transition-colors text-foreground-muted hover:text-foreground"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      ) : (
        <p className="text-xs text-foreground-muted mt-1">
          No account-number paybill on this customer&apos;s router. They pay through the payment prompt instead.
        </p>
      )}
    </div>
  );
}

function RefreshButton({ onClick, refreshing }: { onClick: () => void; refreshing: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      className="text-xs font-medium text-accent-primary hover:underline disabled:opacity-50 whitespace-nowrap"
    >
      {refreshing ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}

function UsagePanel({ usage, onRefresh, refreshing }: {
  usage: CustomerUsageResponse;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const period = usage.period;

  if (!period) {
    if (!usage.plan_data_cap_mb) return null;
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Usage</h3>
          <RefreshButton onClick={onRefresh} refreshing={refreshing} />
        </div>
        <p className="text-sm text-foreground-muted">No billing period yet — usage tracking starts after the first renewal.</p>
      </div>
    );
  }

  const cap = period.cap_mb;
  // Daily FUP: the cap is measured against today's usage, not the whole period.
  const isDaily = usage.plan_fup_period === 'daily' && period.fup_window_used_mb != null;
  const total = isDaily ? (period.fup_window_used_mb ?? 0) : period.total_mb;
  const percent = Math.min(
    100,
    Math.max(0, (isDaily ? period.fup_window_percent_used : period.percent_used) || 0),
  );
  const isOver = cap != null && total >= cap;
  const fupActive = period.fup_active;
  const action = period.fup_action || usage.plan_fup_action;

  const barColor = fupActive
    ? 'bg-danger'
    : percent >= 90
    ? 'bg-warning'
    : percent >= 75
    ? 'bg-amber-500'
    : 'bg-accent-primary';

  const formatMb = (mb: number): string => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const actionLabel = (a: string | null | undefined) => {
    switch (a) {
      case 'throttle': return 'Throttled';
      case 'block': return 'Blocked';
      case 'notify_only': return 'Cap exceeded — notify only';
      default: return 'FUP active';
    }
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">{isDaily ? "Today's Usage" : 'This Period Usage'}</h3>
        <div className="flex items-center gap-3">
          {action && (
            <span className="text-[10px] uppercase tracking-wider text-foreground-muted">
              FUP: <span className="text-foreground font-medium">{action.replace('_', ' ')}</span>
            </span>
          )}
          <RefreshButton onClick={onRefresh} refreshing={refreshing} />
        </div>
      </div>

      {fupActive && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 flex items-start gap-2">
          <svg className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-xs text-danger">
            <p className="font-semibold">FUP triggered — {actionLabel(period.fup_action_taken || action)}</p>
            <p className="opacity-80">{isDaily ? 'Auto-lifts at midnight (EAT) or on renewal.' : 'Auto-lifts on next renewal.'}</p>
          </div>
        </div>
      )}

      {!fupActive && isOver && cap != null && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning">
          Cap exceeded — FUP action will apply on next bandwidth snapshot.
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-lg font-semibold text-foreground">{formatMb(total)}</span>
          <span className="text-xs text-foreground-muted">
            {cap != null ? `of ${formatMb(cap)}` : 'Unlimited'}
          </span>
        </div>
        {cap != null ? (
          <div className="w-full h-2 rounded-full bg-background-tertiary overflow-hidden">
            <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percent}%` }} />
          </div>
        ) : (
          <div className="w-full h-2 rounded-full bg-success/30" />
        )}
        <div className="flex items-center justify-between mt-1.5 text-xs text-foreground-muted">
          <span>{percent.toFixed(1)}% used</span>
          <span>
            {isDaily ? `This period ${formatMb(period.total_mb)}` : `↓ ${formatMb(period.download_mb)} · ↑ ${formatMb(period.upload_mb)}`}
          </span>
        </div>
      </div>
    </div>
  );
}
