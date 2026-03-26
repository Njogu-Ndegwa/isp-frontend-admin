'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Customer, Plan, Router as RouterType, PPPoECredentials, ActivatePPPoERequest, UpdateCustomerRequest } from '../../lib/types';
import { formatDateGMT3 } from '../../lib/dateUtils';
import { useAlert } from '../../context/AlertContext';
import Header from '../../components/Header';
import { PageLoader } from '../../components/LoadingSpinner';
import DateTimePicker from '../../components/DateTimePicker';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showAlert } = useAlert();
  const customerId = Number(params.id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<PPPoECredentials | null>(null);
  const [credsLoading, setCredsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Activate form
  const [showActivateForm, setShowActivateForm] = useState(false);
  const [activateForm, setActivateForm] = useState<ActivatePPPoERequest>({
    payment_method: 'cash',
    payment_reference: '',
    notes: '',
  });

  // Confirm dialogs
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  // Edit & Delete
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const customers = await api.getCustomers();
      const found = customers.find((c) => c.id === customerId);
      if (!found) {
        setError('Customer not found');
        return;
      }
      setCustomer(found);
      const connType = found.connection_type ?? found.plan?.connection_type;
      if (connType === 'pppoe') {
        loadCredentials();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  const loadCredentials = async () => {
    try {
      setCredsLoading(true);
      const creds = await api.getPPPoECredentials(customerId);
      setCredentials(creds);
    } catch {
      // Silently handle -- credentials may not exist yet
    } finally {
      setCredsLoading(false);
    }
  };

  const handleActivate = useCallback(async () => {
    try {
      setActionLoading(true);
      await api.activatePPPoE(customerId, activateForm);
      showAlert('success', 'Customer activated successfully');
      setShowActivateForm(false);
      setActivateForm({ payment_method: 'cash', payment_reference: '', notes: '' });
      loadCustomer();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setActionLoading(false);
    }
  }, [customerId, activateForm, showAlert]);

  const handleDeactivate = useCallback(async () => {
    try {
      setActionLoading(true);
      await api.deactivatePPPoE(customerId);
      showAlert('success', 'Customer deactivated');
      setConfirmDeactivate(false);
      loadCustomer();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Deactivation failed');
    } finally {
      setActionLoading(false);
    }
  }, [customerId, showAlert]);

  const handleRegenerate = useCallback(async () => {
    try {
      setActionLoading(true);
      const newCreds = await api.regeneratePPPoEPassword(customerId);
      setCredentials(newCreds);
      showAlert('success', 'Password regenerated successfully');
      setConfirmRegenerate(false);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to regenerate password');
    } finally {
      setActionLoading(false);
    }
  }, [customerId, showAlert]);

  const handleDelete = useCallback(async () => {
    try {
      setDeleteLoading(true);
      const result = await api.deleteCustomer(customerId);
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
  }, [customerId, showAlert, router]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showAlert('success', `${label} copied`);
  };

  const formatSafeDate = (dateStr: string | undefined): string => {
    try {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return formatDateGMT3(dateStr, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const getTimeRemainingColor = (hours?: number) => {
    if (hours === undefined || hours === null) return 'text-foreground-muted';
    if (hours < 1) return 'text-red-400';
    if (hours < 6) return 'text-orange-400';
    if (hours < 24) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const formatTimeRemaining = (hours?: number) => {
    if (!hours) return '';
    if (hours < 1) return `${Math.round(hours * 60)}m remaining`;
    return `${hours.toFixed(1)}h remaining`;
  };

  if (loading) return <PageLoader />;

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

  const isPPPoE = (customer.connection_type ?? customer.plan?.connection_type) === 'pppoe';

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-6">
        <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Customers
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold text-lg">
              {(customer.name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{customer.name || 'Unknown'}</h1>
                <span className={`badge ${customer.status === 'active' ? 'badge-success' : customer.status === 'expired' ? 'badge-danger' : 'badge-neutral'} capitalize`}>
                  {customer.status}
                </span>
                {isPPPoE ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-info/10 text-info">PPPoE</span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-accent-primary/10 text-accent-primary">Hotspot</span>
                )}
              </div>
              <p className="text-sm text-foreground-muted mt-0.5">{customer.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 rounded-lg hover:bg-accent-primary/10 transition-colors text-foreground-muted hover:text-accent-primary"
              title="Edit customer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg hover:bg-danger/10 transition-colors text-foreground-muted hover:text-danger"
              title="Delete customer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Customer Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Plan" value={customer.plan?.name || 'No Plan'} />
            <InfoItem label="Price" value={`KES ${customer.plan?.price ?? '-'}`} />
            <InfoItem label="Router" value={customer.router?.name || '-'} />
            <InfoItem label="Expiry" value={formatSafeDate(customer.expiry)} />
            {customer.hours_remaining !== undefined && customer.status === 'active' && (
              <InfoItem
                label="Time Left"
                value={formatTimeRemaining(customer.hours_remaining)}
                valueClassName={getTimeRemainingColor(customer.hours_remaining)}
              />
            )}
            {customer.mac_address && (
              <InfoItem label="MAC Address" value={customer.mac_address} mono />
            )}
            {customer.pppoe_username && (
              <InfoItem label="PPPoE Username" value={customer.pppoe_username} mono />
            )}
            {customer.static_ip && (
              <InfoItem label="Static IP" value={customer.static_ip} mono />
            )}
          </div>
        </div>

        {/* PPPoE Credentials Card */}
        {isPPPoE && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">PPPoE Credentials</h2>
              {credentials && (
                <button
                  onClick={() => setConfirmRegenerate(true)}
                  className="text-xs text-warning hover:text-warning/80 font-medium transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate Password
                </button>
              )}
            </div>

            {credsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
              </div>
            ) : credentials ? (
              <div className="space-y-3">
                <div className="bg-background-tertiary rounded-lg p-3">
                  <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Username</label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-sm text-foreground">{credentials.pppoe_username}</span>
                    <button onClick={() => copyToClipboard(credentials.pppoe_username, 'Username')} className="p-1.5 rounded-md hover:bg-background-secondary transition-colors text-foreground-muted hover:text-foreground">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="bg-background-tertiary rounded-lg p-3">
                  <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Password</label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-sm text-foreground">
                      {showPassword ? credentials.pppoe_password : '\u2022'.repeat(credentials.pppoe_password.length)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setShowPassword(!showPassword)} className="p-1.5 rounded-md hover:bg-background-secondary transition-colors text-foreground-muted hover:text-foreground">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          {showPassword ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          ) : (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </>
                          )}
                        </svg>
                      </button>
                      <button onClick={() => copyToClipboard(credentials.pppoe_password, 'Password')} className="p-1.5 rounded-md hover:bg-background-secondary transition-colors text-foreground-muted hover:text-foreground">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(`Username: ${credentials.pppoe_username}\nPassword: ${credentials.pppoe_password}`, 'Credentials')}
                  className="btn-secondary w-full flex items-center justify-center gap-2 mt-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy All Credentials
                </button>
              </div>
            ) : (
              <p className="text-sm text-foreground-muted py-4 text-center">No credentials available</p>
            )}
          </div>
        )}

        {/* PPPoE Actions */}
        {isPPPoE && (
          <div className="card p-5 space-y-4 lg:col-span-2">
            <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">PPPoE Actions</h2>

            {!showActivateForm ? (
              <div className="flex flex-wrap gap-3">
                {(customer.status === 'inactive' || customer.status === 'expired') && (
                  <button
                    onClick={() => setShowActivateForm(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9.172 14.828a4 4 0 010-5.656m5.656 0a4 4 0 010 5.656M12 12h.01" />
                    </svg>
                    Activate PPPoE
                  </button>
                )}
                {customer.status === 'active' && (
                  <button
                    onClick={() => setConfirmDeactivate(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-danger text-white hover:bg-danger/90 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Deactivate PPPoE
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-border rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-foreground">Activate PPPoE</h3>
                <p className="text-xs text-foreground-muted">Records payment, sets expiry based on plan duration, and provisions the PPPoE secret on the MikroTik router.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1.5">Payment Method</label>
                    <select
                      value={activateForm.payment_method}
                      onChange={(e) => setActivateForm((f) => ({ ...f, payment_method: e.target.value as ActivatePPPoERequest['payment_method'] }))}
                      className="select"
                    >
                      <option value="cash">Cash</option>
                      <option value="mpesa">M-Pesa</option>
                      <option value="voucher">Voucher</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1.5">Payment Reference</label>
                    <input
                      type="text"
                      value={activateForm.payment_reference || ''}
                      onChange={(e) => setActivateForm((f) => ({ ...f, payment_reference: e.target.value }))}
                      className="input"
                      placeholder="Receipt # (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1.5">Notes</label>
                    <input
                      type="text"
                      value={activateForm.notes || ''}
                      onChange={(e) => setActivateForm((f) => ({ ...f, notes: e.target.value }))}
                      className="input"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowActivateForm(false)} className="btn-secondary">Cancel</button>
                  <button onClick={handleActivate} disabled={actionLoading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    {actionLoading ? (
                      <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    ) : (
                      'Confirm Activation'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deactivate Confirm */}
      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmDeactivate(false)}>
          <div className="card p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Deactivate PPPoE</h3>
            <p className="text-sm text-foreground-muted">
              This will disconnect {customer.name}&apos;s active session and remove the PPPoE secret from the router. Are you sure?
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmDeactivate(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleDeactivate}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-danger text-white hover:bg-danger/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Deactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Password Confirm */}
      {confirmRegenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmRegenerate(false)}>
          <div className="card p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Regenerate Password</h3>
            <p className="text-sm text-foreground-muted">
              This will generate a new PPPoE password for {customer.name}. If the customer is active, the secret will be re-provisioned on the router. The customer will need the new password.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmRegenerate(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleRegenerate}
                disabled={actionLoading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  'Regenerate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadCustomer();
          }}
        />
      )}

      {/* Delete Customer Confirm */}
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

function EditCustomerModal({
  customer,
  onClose,
  onSuccess,
}: {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [routers, setRouters] = useState<RouterType[]>([]);
  const [formLoading, setFormLoading] = useState(true);

  const isPPPoE = (customer.connection_type ?? customer.plan?.connection_type) === 'pppoe';

  const toLocalDatetime = (iso: string | undefined): string => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ''; }
  };

  const [formData, setFormData] = useState<UpdateCustomerRequest>({
    name: customer.name || '',
    phone: customer.phone || '',
    plan_id: customer.plan_id ?? customer.plan?.id,
    router_id: customer.router_id ?? customer.router?.id,
    mac_address: customer.mac_address || '',
    pppoe_username: customer.pppoe_username || '',
    pppoe_password: '',
    static_ip: customer.static_ip || '',
    expiry: toLocalDatetime(customer.expiry),
  });

  useEffect(() => {
    (async () => {
      try {
        const [p, r] = await Promise.all([api.getPlans(), api.getRouters()]);
        setPlans(p);
        setRouters(r);
      } catch {
        setError('Failed to load plans/routers');
      } finally {
        setFormLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
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
        onClose();
        return;
      }

      const result = await api.updateCustomer(customer.id, payload);
      showAlert('success', `${result.customer.name} updated successfully`);
      if (result.pppoe_reprovisioned === 'failed') {
        showAlert('warning', 'PPPoE re-provisioning failed — check router manually');
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg card p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Edit Customer</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-background-tertiary transition-colors">
            <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
            {error}
          </div>
        )}

        {formLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="Customer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
                placeholder="+254712345678"
                inputMode="numeric"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Plan</label>
                <select
                  value={formData.plan_id || ''}
                  onChange={(e) => setFormData({ ...formData, plan_id: Number(e.target.value) })}
                  className="select"
                >
                  <option value="" disabled>Select plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — KES {plan.price}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Router</label>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">MAC Address</label>
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
                    <label className="block text-sm font-medium text-foreground mb-2">PPPoE Username</label>
                    <input
                      type="text"
                      value={formData.pppoe_username || ''}
                      onChange={(e) => setFormData({ ...formData, pppoe_username: e.target.value })}
                      className="input font-mono"
                      placeholder="pppoe_username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">PPPoE Password</label>
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
                    <label className="block text-sm font-medium text-foreground mb-2">Static IP</label>
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
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {loading ? (
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
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value, mono, valueClassName }: { label: string; value: string; mono?: boolean; valueClassName?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">{label}</p>
      <p className={`text-sm mt-0.5 ${mono ? 'font-mono' : ''} ${valueClassName || 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}
