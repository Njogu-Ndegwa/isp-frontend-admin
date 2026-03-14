'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Plan, Router, RegisterCustomerRequest, PPPoECredentials } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import Header from '../../components/Header';
import { PageLoader } from '../../components/LoadingSpinner';

export default function RegisterCustomerPage() {
  const router = useRouter();
  const { showAlert } = useAlert();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [credentials, setCredentials] = useState<PPPoECredentials | null>(null);

  const [formData, setFormData] = useState<RegisterCustomerRequest>({
    name: '',
    phone: '',
    plan_id: 0,
    router_id: 0,
  });

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      const [plansData, routersData] = await Promise.all([
        api.getPlans(),
        api.getRouters(),
      ]);
      setPlans(plansData);
      setRouters(routersData);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === formData.plan_id);
  const isPPPoE = selectedPlan?.connection_type === 'pppoe';

  const update = <K extends keyof RegisterCustomerRequest>(field: K, value: RegisterCustomerRequest[K]) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plan_id || !formData.router_id) {
      showAlert('error', 'Please select a plan and router.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: RegisterCustomerRequest = {
        name: formData.name,
        phone: formData.phone,
        plan_id: formData.plan_id,
        router_id: formData.router_id,
      };
      if (formData.pppoe_username) payload.pppoe_username = formData.pppoe_username;
      if (formData.pppoe_password) payload.pppoe_password = formData.pppoe_password;
      if (formData.mac_address) payload.mac_address = formData.mac_address;
      if (formData.static_ip) payload.static_ip = formData.static_ip;

      const customer = await api.registerCustomer(payload);
      showAlert('success', `Customer "${customer.name}" registered successfully!`);

      const customerIsPPPoE = isPPPoE || customer.plan?.connection_type === 'pppoe';
      if (customerIsPPPoE) {
        try {
          const creds = await api.getPPPoECredentials(customer.id);
          setCredentials(creds);
          return;
        } catch {
          // credentials fetch failed, still redirect
        }
      }
      router.push('/customers');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showAlert('success', `${label} copied to clipboard`);
  };

  if (loading) return <PageLoader />;

  if (credentials) {
    return (
      <div>
        <Header title="Customer Registered" subtitle="PPPoE credentials generated" />
        <div className="max-w-md mx-auto">
          <div className="card p-6 space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">{credentials.customer_name}</h3>
              <p className="text-sm text-foreground-muted mt-1">Give these credentials to the customer for their CPE router</p>
            </div>

            <div className="space-y-3">
              <div className="bg-background-tertiary rounded-lg p-3">
                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">PPPoE Username</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm text-foreground">{credentials.pppoe_username}</span>
                  <button
                    onClick={() => copyToClipboard(credentials.pppoe_username, 'Username')}
                    className="p-1.5 rounded-md hover:bg-background-secondary transition-colors text-foreground-muted hover:text-foreground"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="bg-background-tertiary rounded-lg p-3">
                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">PPPoE Password</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm text-foreground">{credentials.pppoe_password}</span>
                  <button
                    onClick={() => copyToClipboard(credentials.pppoe_password, 'Password')}
                    className="p-1.5 rounded-md hover:bg-background-secondary transition-colors text-foreground-muted hover:text-foreground"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  copyToClipboard(
                    `Username: ${credentials.pppoe_username}\nPassword: ${credentials.pppoe_password}`,
                    'Credentials'
                  );
                }}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy All
              </button>
              <Link href="/customers" className="btn-primary flex-1 text-center">
                Done
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Register Customer"
        subtitle="Add a new hotspot or PPPoE customer"
      />

      <div className="max-w-lg mx-auto">
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground-muted mb-1.5">
                Customer Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => update('name', e.target.value)}
                className="input"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground-muted mb-1.5">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="input"
                placeholder="254712345678"
                required
                inputMode="numeric"
              />
            </div>

            <div>
              <label htmlFor="plan_id" className="block text-sm font-medium text-foreground-muted mb-1.5">
                Plan
              </label>
              <select
                id="plan_id"
                value={formData.plan_id || ''}
                onChange={(e) => update('plan_id', Number(e.target.value))}
                className="select"
                required
              >
                <option value="" disabled>Select a plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — KES {plan.price} ({plan.connection_type === 'pppoe' ? 'PPPoE' : 'Hotspot'})
                  </option>
                ))}
              </select>
              {selectedPlan && (
                <p className="mt-1.5 text-xs text-foreground-muted">
                  {selectedPlan.download_speed || selectedPlan.speed} · {selectedPlan.duration_value} {selectedPlan.duration_unit.toLowerCase()}
                  {isPPPoE && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-info/10 text-info">
                      PPPoE — credentials auto-generated
                    </span>
                  )}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="router_id" className="block text-sm font-medium text-foreground-muted mb-1.5">
                Router
              </label>
              <select
                id="router_id"
                value={formData.router_id || ''}
                onChange={(e) => update('router_id', Number(e.target.value))}
                className="select"
                required
              >
                <option value="" disabled>Select a router</option>
                {routers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.ip_address})
                  </option>
                ))}
              </select>
            </div>

            {isPPPoE && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  Advanced PPPoE Options
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3 pl-5 border-l-2 border-border">
                    <div>
                      <label htmlFor="pppoe_username" className="block text-sm font-medium text-foreground-muted mb-1.5">
                        Custom Username
                      </label>
                      <input
                        id="pppoe_username"
                        type="text"
                        value={formData.pppoe_username || ''}
                        onChange={(e) => update('pppoe_username', e.target.value || undefined)}
                        className="input"
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                    <div>
                      <label htmlFor="pppoe_password" className="block text-sm font-medium text-foreground-muted mb-1.5">
                        Custom Password
                      </label>
                      <input
                        id="pppoe_password"
                        type="text"
                        value={formData.pppoe_password || ''}
                        onChange={(e) => update('pppoe_password', e.target.value || undefined)}
                        className="input"
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                    <div>
                      <label htmlFor="static_ip" className="block text-sm font-medium text-foreground-muted mb-1.5">
                        Static IP
                      </label>
                      <input
                        id="static_ip"
                        type="text"
                        value={formData.static_ip || ''}
                        onChange={(e) => update('static_ip', e.target.value || undefined)}
                        className="input"
                        placeholder="Leave empty for dynamic"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isPPPoE && (
              <div>
                <label htmlFor="mac_address" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  MAC Address
                </label>
                <input
                  id="mac_address"
                  type="text"
                  value={formData.mac_address || ''}
                  onChange={(e) => update('mac_address', e.target.value || undefined)}
                  className="input"
                  placeholder="AA:BB:CC:DD:EE:FF (optional)"
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Link href="/customers" className="btn-secondary flex-1 text-center">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register Customer'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
