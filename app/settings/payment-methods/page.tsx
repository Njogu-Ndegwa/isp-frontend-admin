'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import {
  PaymentMethodConfig,
  PaymentMethodType,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
  Router,
} from '../../lib/types';
import { PageLoader } from '../../components/LoadingSpinner';
import { useAlert } from '../../context/AlertContext';
import FilterSelect from '../../components/FilterSelect';
import DataTable, { DataTableColumn } from '../../components/DataTable';

const PAYMENT_METHOD_COLUMNS: DataTableColumn[] = [
  { key: 'method', label: 'Method', className: 'max-w-[260px]' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
];

const ROUTER_ASSIGNMENT_COLUMNS: DataTableColumn[] = [
  { key: 'router', label: 'Router', className: 'w-[40%]' },
  { key: 'status', label: 'Status', className: 'w-[20%]' },
  { key: 'current_method', label: 'Current Method', className: 'w-[20%]' },
  { key: 'actions', label: 'Actions', className: 'w-[20%]' },
];

const PAYMENT_METHOD_TYPES: { value: PaymentMethodType; label: string; description: string }[] = [
  { value: 'bank_account', label: 'Bank Account', description: 'Bank paybill and account number' },
  { value: 'mpesa_paybill', label: 'M-Pesa Paybill', description: 'System collects via paybill — admin pays you later' },
  { value: 'mpesa_paybill_with_keys', label: 'M-Pesa Direct', description: 'Direct STK Push using your own M-Pesa API keys' },
  { value: 'zenopay', label: 'ZenoPay (Tanzania)', description: 'Tanzanian mobile money via ZenoPay' },
  { value: 'mtn_momo', label: 'MTN Mobile Money', description: 'MTN MoMo RequestToPay using your own API User credentials' },
];

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

const FIELDS_BY_TYPE: Record<PaymentMethodType, FieldDef[]> = {
  bank_account: [
    { key: 'bank_paybill_number', label: 'Bank Paybill Number', type: 'text', required: true },
    { key: 'bank_account_number', label: 'Bank Account Number', type: 'text', required: true },
  ],
  mpesa_paybill: [
    { key: 'mpesa_paybill_number', label: 'M-Pesa Paybill Number', type: 'text', required: true },
  ],
  mpesa_paybill_with_keys: [
    { key: 'mpesa_shortcode', label: 'Business Shortcode', type: 'text', required: true },
    { key: 'mpesa_passkey', label: 'Passkey', type: 'text', required: true },
    { key: 'mpesa_consumer_key', label: 'Consumer Key', type: 'password', required: true },
    { key: 'mpesa_consumer_secret', label: 'Consumer Secret', type: 'password', required: true },
  ],
  zenopay: [
    { key: 'zenopay_api_key', label: 'API Key', type: 'password', required: true },
    { key: 'zenopay_account_id', label: 'Account ID', type: 'text', required: false },
  ],
  mtn_momo: [
    {
      key: 'mtn_api_user',
      label: 'API User (UUID)',
      type: 'text',
      required: true,
      placeholder: 'e.g. 64f8c775-6dff-45c0-93e0-39a9cd78df8b',
    },
    { key: 'mtn_api_key', label: 'API Key', type: 'password', required: true },
    { key: 'mtn_subscription_key', label: 'Primary Subscription Key', type: 'password', required: true },
    {
      key: 'mtn_target_environment',
      label: 'Target Environment',
      type: 'select',
      required: true,
      options: [
        { value: 'sandbox', label: 'Sandbox' },
        { value: 'mtnuganda', label: 'MTN Uganda' },
        { value: 'mtnghana', label: 'MTN Ghana' },
        { value: 'mtncongo', label: 'MTN Congo' },
        { value: 'mtnivorycoast', label: 'MTN Ivory Coast' },
        { value: 'mtncameroon', label: 'MTN Cameroon' },
        { value: 'mtnbenin', label: 'MTN Benin' },
        { value: 'mtnswaziland', label: 'MTN eSwatini' },
        { value: 'mtnguineaconakry', label: 'MTN Guinea' },
        { value: 'mtnzambia', label: 'MTN Zambia' },
        { value: 'mtnliberia', label: 'MTN Liberia' },
        { value: 'mtnsouthafrica', label: 'MTN South Africa' },
      ],
    },
    { key: 'mtn_currency', label: 'Currency', type: 'text', required: true, placeholder: 'EUR (sandbox) / UGX / GHS / …' },
    {
      key: 'mtn_base_url',
      label: 'Base URL (optional)',
      type: 'text',
      required: false,
      placeholder: 'https://sandbox.momodeveloper.mtn.com',
    },
  ],
};

function isMasked(value: string): boolean {
  return /^\*{4,}/.test(value);
}

function getVisibleFields(method: PaymentMethodConfig): { key: string; value: string }[] {
  const fields = FIELDS_BY_TYPE[method.method_type] ?? [];
  const result: { key: string; value: string }[] = [];
  for (const f of fields) {
    const val = (method as unknown as Record<string, unknown>)[f.key];
    if (typeof val === 'string' && val) {
      result.push({ key: f.label, value: val });
    }
  }
  return result;
}

function getTypeColor(type: PaymentMethodType) {
  switch (type) {
    case 'mpesa_paybill':
    case 'mpesa_paybill_with_keys':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'bank_account':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'zenopay':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'mtn_momo':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
}

function getTypeLabel(type: PaymentMethodType): string {
  return PAYMENT_METHOD_TYPES.find(t => t.value === type)?.label ?? type;
}

function hasTestableCredentials(type: PaymentMethodType): boolean {
  return type === 'mpesa_paybill_with_keys' || type === 'zenopay' || type === 'mtn_momo';
}

export default function PaymentMethodsPage() {
  const { showAlert } = useAlert();
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodConfig | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning';
    onConfirm: () => void;
  } | null>(null);

  // Assignment modal
  const [assignModalRouter, setAssignModalRouter] = useState<Router | null>(null);
  const [assignMethodId, setAssignMethodId] = useState<number | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  // Form state
  const [formLabel, setFormLabel] = useState('');
  const [formType, setFormType] = useState<PaymentMethodType>('mpesa_paybill_with_keys');
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [methodsData, routersData] = await Promise.all([
        api.getPaymentMethods(showInactive),
        api.getRouters(),
      ]);
      setMethods(methodsData);
      setRouters(routersData);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  }, [showInactive, showAlert]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormLabel('');
    setFormType('mpesa_paybill_with_keys');
    setFormFields({});
    setEditingMethod(null);
    setShowForm(false);
    setShowSecrets({});
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const applyTypeDefaults = (type: PaymentMethodType): Record<string, string> => {
    if (type === 'mtn_momo') {
      return {
        mtn_target_environment: 'sandbox',
        mtn_currency: 'EUR',
        mtn_base_url: 'https://sandbox.momodeveloper.mtn.com',
      };
    }
    return {};
  };

  const openEditForm = async (method: PaymentMethodConfig) => {
    try {
      const full = await api.getPaymentMethod(method.id);
      setEditingMethod(full);
      setFormLabel(full.label);
      setFormType(full.method_type);
      const fields: Record<string, string> = {};
      for (const f of FIELDS_BY_TYPE[full.method_type] ?? []) {
        const val = (full as unknown as Record<string, unknown>)[f.key];
        if (typeof val === 'string') fields[f.key] = val;
      }
      setFormFields(fields);
      setShowForm(true);
      setShowSecrets({});
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load payment method details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (editingMethod) {
        const body: Record<string, string | boolean> = { label: formLabel };
        for (const [key, value] of Object.entries(formFields)) {
          if (value && !isMasked(value)) {
            body[key] = value;
          }
        }
        await api.updatePaymentMethod(editingMethod.id, body as unknown as UpdatePaymentMethodRequest);
        showAlert('success', 'Payment method updated');
      } else {
        const body: Record<string, string> = {
          method_type: formType,
          label: formLabel,
        };
        for (const [key, value] of Object.entries(formFields)) {
          if (value) {
            body[key] = value;
          }
        }
        await api.createPaymentMethod(body as unknown as CreatePaymentMethodRequest);
        showAlert('success', 'Payment method created');
      }
      resetForm();
      loadData();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to save payment method');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    const method = methods.find(m => m.id === id);
    setConfirmModal({
      title: 'Deactivate Payment Method',
      message: `This will deactivate "${method?.label || 'this method'}" and unassign it from all routers. This action cannot be undone.`,
      confirmLabel: 'Deactivate',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(null);
        setDeletingId(id);
        try {
          await api.deletePaymentMethod(id);
          showAlert('success', 'Payment method deactivated');
          loadData();
        } catch (err) {
          showAlert('error', err instanceof Error ? err.message : 'Failed to delete payment method');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const result = await api.testPaymentMethod(id);
      if (result.status === 'success') {
        showAlert('success', result.message || 'Credentials validated successfully');
      } else {
        showAlert('error', result.message || 'Credential validation failed');
      }
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleAssign = async () => {
    if (!assignModalRouter) return;
    setAssignLoading(true);
    try {
      await api.assignRouterPaymentMethod(assignModalRouter.id, assignMethodId);
      showAlert('success', assignMethodId
        ? `Payment method assigned to ${assignModalRouter.name}`
        : `Payment method removed from ${assignModalRouter.name}`
      );
      setAssignModalRouter(null);
      loadData();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to assign payment method');
    } finally {
      setAssignLoading(false);
    }
  };

  const [unassigningRouterId, setUnassigningRouterId] = useState<number | null>(null);

  const handleUnassign = (router: Router) => {
    const assignedMethod = router.payment_method_id
      ? methods.find(m => m.id === router.payment_method_id)
      : null;
    setConfirmModal({
      title: 'Remove Assignment',
      message: `Remove "${assignedMethod?.label || 'payment method'}" from ${router.name} and revert to legacy payment flow?`,
      confirmLabel: 'Remove',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmModal(null);
        setUnassigningRouterId(router.id);
        try {
          await api.assignRouterPaymentMethod(router.id, null);
          showAlert('success', `Payment method removed from ${router.name}`);
          loadData();
        } catch (err) {
          showAlert('error', err instanceof Error ? err.message : 'Failed to remove payment method');
        } finally {
          setUnassigningRouterId(null);
        }
      },
    });
  };

  if (loading && methods.length === 0) {
    return <PageLoader />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Payment Methods</h2>
          <p className="text-xs text-foreground-muted mt-0.5">Configure payment methods and assign them to routers</p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-primary text-white font-medium text-sm hover:bg-accent-primary/90 transition-colors active:opacity-70"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Add Method</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Inactive toggle */}
      <div className="flex items-center gap-3 mb-6">
        <label className="flex items-center gap-2 text-sm text-foreground-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-border text-accent-primary focus:ring-accent-primary"
          />
          Show inactive methods
        </label>
      </div>

      {/* Payment Methods List */}
      {methods.length === 0 && !loading ? (
        <div className="text-center py-16 bg-background-secondary rounded-2xl border border-border">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No payment methods configured</h3>
          <p className="text-foreground-muted text-sm mb-6">Add your first payment method to start accepting payments</p>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary text-white font-medium text-sm hover:bg-accent-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Payment Method
          </button>
        </div>
      ) : (
        <DataTable<PaymentMethodConfig>
          columns={PAYMENT_METHOD_COLUMNS}
          data={methods}
          rowKey={(m) => m.id}
          className="card animate-fade-in"
          rowClassName={(m) => !m.is_active ? 'opacity-60' : ''}
          renderCell={(method, key) => {
            switch (key) {
              case 'method':
                return (
                  <div className="min-w-0 max-w-[260px]">
                    <div className="font-medium text-foreground truncate">{method.label}</div>
                    {getVisibleFields(method).slice(0, 1).map(({ key: fk, value }) => (
                      <div key={fk} className="text-xs text-foreground-muted font-mono truncate">{value}</div>
                    ))}
                  </div>
                );
              case 'type':
                return (
                  <span className={`badge border ${getTypeColor(method.method_type)}`}>
                    {getTypeLabel(method.method_type)}
                  </span>
                );
              case 'status':
                return (
                  <span className={`badge ${method.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {method.is_active ? 'Active' : 'Inactive'}
                  </span>
                );
              case 'actions':
                return (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {hasTestableCredentials(method.method_type) && (
                      <button
                        onClick={() => handleTest(method.id)}
                        disabled={testingId === method.id || !method.is_active}
                        className="p-1.5 rounded-md hover:bg-background-tertiary transition-colors text-foreground-muted hover:text-foreground disabled:opacity-50"
                        title="Test credentials"
                      >
                        {testingId === method.id ? (
                          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => openEditForm(method)}
                      className="p-1.5 rounded-md hover:bg-accent-primary/10 transition-colors text-foreground-muted hover:text-accent-primary"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(method.id)}
                      disabled={deletingId === method.id}
                      className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-foreground-muted hover:text-danger disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === method.id ? (
                        <div className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              default:
                return null;
            }
          }}
          emptyState={{ message: 'No payment methods configured' }}
        />
      )}

      {/* Router Assignment Section */}
      {routers.length > 0 && methods.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-foreground mb-1">Router Assignments</h2>
          <p className="text-sm text-foreground-muted mb-4">Assign payment methods to routers, or revert to legacy behavior</p>

          <DataTable<Router>
            columns={ROUTER_ASSIGNMENT_COLUMNS}
            data={routers}
            rowKey={(r) => r.id}
            className="card animate-fade-in"
            renderCell={(router, key) => {
              const assignedMethod = router.payment_method_id
                ? methods.find(m => m.id === router.payment_method_id)
                : null;
              switch (key) {
                case 'router':
                  return (
                    <div>
                      <div className="font-medium text-foreground">{router.name}</div>
                      <div className="text-xs text-foreground-muted">{router.ip_address}:{router.port}</div>
                    </div>
                  );
                case 'status':
                  return (
                    <span className={`badge ${
                      router.status === 'online' ? 'badge-success'
                        : router.status === 'offline' ? 'badge-danger'
                        : 'badge-neutral'
                    }`}>
                      {router.status || 'unknown'}
                    </span>
                  );
                case 'current_method':
                  return assignedMethod ? (
                    <span className="badge bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                      {assignedMethod.label}
                    </span>
                  ) : (
                    <span className="text-sm text-foreground-muted">Legacy (system default)</span>
                  );
                case 'actions':
                  return (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setAssignModalRouter(router);
                          setAssignMethodId(router.payment_method_id ?? null);
                        }}
                        className="p-1.5 rounded-md hover:bg-accent-primary/10 transition-colors text-foreground-muted hover:text-accent-primary"
                        title={assignedMethod ? 'Change method' : 'Assign method'}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {assignedMethod && (
                        <button
                          onClick={() => handleUnassign(router)}
                          disabled={unassigningRouterId === router.id}
                          className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-foreground-muted hover:text-danger disabled:opacity-50"
                          title="Remove assignment"
                        >
                          {unassigningRouterId === router.id ? (
                            <div className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  );
                default:
                  return null;
              }
            }}
            emptyState={{ message: 'No routers configured' }}
          />
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-background-secondary rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
              <h2 className="text-lg font-semibold text-foreground">
                {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
              </h2>
              <button onClick={resetForm} className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Label</label>
                <input
                  type="text"
                  name="pm_label"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g. My M-Pesa Direct"
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full h-[42px] px-3.5 rounded-xl bg-background-tertiary border border-border text-foreground text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary transition-all"
                />
              </div>

              {/* Type (only on create) */}
              {!editingMethod && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
                  <FilterSelect
                    value={formType}
                    onChange={(v) => {
                      const nextType = v as PaymentMethodType;
                      setFormType(nextType);
                      setFormFields(applyTypeDefaults(nextType));
                    }}
                    options={PAYMENT_METHOD_TYPES.map(t => ({ value: t.value, label: t.label }))}
                    className="w-full"
                  />
                  <p className="text-xs text-foreground-muted mt-1">
                    {PAYMENT_METHOD_TYPES.find(t => t.value === formType)?.description}
                  </p>
                </div>
              )}

              {/* Type-specific fields */}
              {(FIELDS_BY_TYPE[editingMethod?.method_type ?? formType] ?? []).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {editingMethod ? 'Credentials' : 'Configuration'}
                  </label>
                  <div className="space-y-3">
                    {(FIELDS_BY_TYPE[editingMethod?.method_type ?? formType] ?? []).map((field) => {
                      const isPassword = field.type === 'password';
                      const isSelect = field.type === 'select';
                      const isVisible = showSecrets[field.key];

                      if (isSelect) {
                        return (
                          <div key={field.key}>
                            <label className="block text-xs text-foreground-muted mb-1">
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <FilterSelect
                              value={formFields[field.key] || ''}
                              onChange={(v) => setFormFields(prev => ({ ...prev, [field.key]: v }))}
                              options={field.options ?? []}
                              className="w-full"
                            />
                          </div>
                        );
                      }

                      return (
                        <div key={field.key}>
                          <label className="block text-xs text-foreground-muted mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <div className="relative">
                            <input
                              type={isPassword && !isVisible ? 'password' : 'text'}
                              name={`pm_${field.key}`}
                              value={formFields[field.key] || ''}
                              onChange={(e) => setFormFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={editingMethod ? '(unchanged)' : (field.placeholder ?? `Enter ${field.label.toLowerCase()}`)}
                              required={field.required && !editingMethod}
                              autoComplete={isPassword ? 'new-password' : 'off'}
                              data-lpignore="true"
                              data-form-type="other"
                              className="w-full h-[42px] px-3.5 rounded-xl bg-background-tertiary border border-border text-foreground text-sm font-mono placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary transition-all pr-10"
                            />
                            {isPassword && (
                              <button
                                type="button"
                                onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-foreground-muted hover:text-foreground transition-colors"
                              >
                                {isVisible ? (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-background-tertiary text-foreground-muted font-medium text-sm hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-accent-primary text-white font-medium text-sm hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : editingMethod ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmModal(null)} />
          <div className="relative w-full sm:max-w-sm bg-background-secondary rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
                confirmModal.variant === 'danger' ? 'bg-danger/10' : 'bg-warning/10'
              }`}>
                <svg className={`w-6 h-6 ${confirmModal.variant === 'danger' ? 'text-danger' : 'text-warning'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-foreground-muted">{confirmModal.message}</p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-background-tertiary text-foreground-muted font-medium text-sm hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-colors ${
                  confirmModal.variant === 'danger'
                    ? 'bg-danger hover:bg-danger/90'
                    : 'bg-warning hover:bg-warning/90'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignModalRouter && (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAssignModalRouter(null)} />
          <div className="relative w-full sm:max-w-md bg-background-secondary rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Assign Payment Method</h2>
                <p className="text-sm text-foreground-muted">{assignModalRouter.name}</p>
              </div>
              <button onClick={() => setAssignModalRouter(null)} className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Legacy option */}
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                assignMethodId === null ? 'border-accent-primary bg-accent-primary/5' : 'border-border hover:bg-background-tertiary'
              }`}>
                <input
                  type="radio"
                  name="assignment"
                  checked={assignMethodId === null}
                  onChange={() => setAssignMethodId(null)}
                  className="text-accent-primary focus:ring-accent-primary"
                />
                <div>
                  <div className="text-sm font-medium text-foreground">Legacy (no assignment)</div>
                  <div className="text-xs text-foreground-muted">Use system default payment flow</div>
                </div>
              </label>

              {methods.filter(m => m.is_active).map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    assignMethodId === method.id ? 'border-accent-primary bg-accent-primary/5' : 'border-border hover:bg-background-tertiary'
                  }`}
                >
                  <input
                    type="radio"
                    name="assignment"
                    checked={assignMethodId === method.id}
                    onChange={() => setAssignMethodId(method.id)}
                    className="text-accent-primary focus:ring-accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">{method.label}</span>
                    <span className="text-xs text-foreground-muted">{getTypeLabel(method.method_type)}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => setAssignModalRouter(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-background-tertiary text-foreground-muted font-medium text-sm hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assignLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-accent-primary text-white font-medium text-sm hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
              >
                {assignLoading ? 'Saving...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
