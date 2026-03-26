'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Customer, Plan, Router as RouterType, UpdateCustomerRequest } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import Header from '../../components/Header';
import { PageLoader } from '../../components/LoadingSpinner';
import DateTimePicker from '../../components/DateTimePicker';

function toLocalDatetime(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const { showAlert } = useAlert();
  const customerId = Number(params.id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [routers, setRouters] = useState<RouterType[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formData, setFormData] = useState<UpdateCustomerRequest>({});

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
        expiry: toLocalDatetime(found.expiry),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setPageLoading(false);
    }
  };

  const isPPPoE = customer
    ? (customer.connection_type ?? customer.plan?.connection_type) === 'pppoe'
    : false;

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
      if (formData.mac_address !== (customer.mac_address || '')) payload.mac_address = formData.mac_address;
      if (formData.pppoe_username !== (customer.pppoe_username || '')) payload.pppoe_username = formData.pppoe_username;
      if (formData.pppoe_password) payload.pppoe_password = formData.pppoe_password;
      if (formData.static_ip !== (customer.static_ip || '')) payload.static_ip = formData.static_ip;
      if (formData.expiry && formData.expiry !== toLocalDatetime(customer.expiry)) {
        payload.expiry = new Date(formData.expiry).toISOString();
      }

      if (Object.keys(payload).length === 0) {
        router.push('/customers');
        return;
      }

      const result = await api.updateCustomer(customer.id, payload);
      showAlert('success', `${result.customer.name} updated successfully`);
      if (result.pppoe_reprovisioned === 'failed') {
        showAlert('warning', 'PPPoE re-provisioning failed — check router manually');
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
        title={`Edit ${customer.name || 'Customer'}`}
        subtitle="Update customer details"
        backHref="/customers"
      />

      <div className="max-w-lg mx-auto">
        <div className="card p-6">
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
                    {plan.name} — KES {plan.price} ({plan.connection_type === 'pppoe' ? 'PPPoE' : 'Hotspot'})
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

            <DateTimePicker
              label="Expiry Date"
              value={formData.expiry || ''}
              onChange={(v) => setFormData({ ...formData, expiry: v })}
            />

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
