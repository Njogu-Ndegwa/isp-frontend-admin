'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { UnmatchedPayment, Customer } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import { useAlert } from '../context/AlertContext';
import Header from '../components/Header';
import DataTable, { DataTableColumn } from '../components/DataTable';
import MobileDataCard from '../components/MobileDataCard';
import Tabs from '../components/Tabs';
import SearchInput from '../components/SearchInput';
import { PageLoader } from '../components/LoadingSpinner';

// ─── Constants ──────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  unknown_account: 'Unknown account number',
  amount_too_low: 'Amount below plan price',
  wrong_reseller: 'Wrong paybill used',
  invalid_luhn: 'Invalid account number (typo)',
};

const REASON_COLORS: Record<string, string> = {
  unknown_account: 'badge-neutral',
  amount_too_low: 'badge-danger',
  wrong_reseller: 'badge-neutral',
  invalid_luhn: 'badge-danger',
};

const COLUMNS: DataTableColumn[] = [
  { key: 'trans_id', label: 'Trans ID' },
  { key: 'amount', label: 'Amount' },
  { key: 'account', label: 'Account Typed' },
  { key: 'phone', label: 'Phone', className: 'hidden lg:table-cell' },
  { key: 'reason', label: 'Reason' },
  { key: 'received', label: 'Received', className: 'hidden lg:table-cell' },
  { key: 'actions', label: '' },
];

// ─── Page ───────────────────────────────────────────────────────────

export default function UnmatchedPaymentsPage() {
  const { showAlert } = useAlert();

  // Data
  const [payments, setPayments] = useState<UnmatchedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'unresolved' | 'resolved'>('unresolved');

  // Attribution modal
  const [attributeTarget, setAttributeTarget] = useState<UnmatchedPayment | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [attributeNotes, setAttributeNotes] = useState('');
  const [attributing, setAttributing] = useState(false);

  // ── Fetch payments ────────────────────────────────────────────────

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const resolved = tab === 'resolved';
      const data = await api.getUnmatchedPayments(resolved, 200);
      setPayments(data);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [tab, showAlert]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // ── Fetch customers when modal opens ──────────────────────────────

  useEffect(() => {
    if (!attributeTarget) return;
    let cancelled = false;
    setCustomersLoading(true);
    setCustomerSearch('');
    setSelectedCustomerId(null);
    setAttributeNotes('');

    api
      .getCustomers(1)
      .then((result) => {
        if (cancelled) return;
        setCustomers(result);
      })
      .catch(() => {
        if (!cancelled) showAlert('error', 'Failed to load customers');
      })
      .finally(() => {
        if (!cancelled) setCustomersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attributeTarget, showAlert]);

  // ── Filter customers by search ────────────────────────────────────

  const filteredCustomers = customerSearch.trim()
    ? customers.filter((c) => {
        const q = customerSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.account_number && c.account_number.toLowerCase().includes(q))
        );
      })
    : customers;

  // ── Attribute handler ─────────────────────────────────────────────

  const handleAttribute = async () => {
    if (!attributeTarget || !selectedCustomerId) return;
    setAttributing(true);
    try {
      const result = await api.attributeUnmatchedPayment(attributeTarget.id, {
        customer_id: selectedCustomerId,
        notes: attributeNotes.trim() || undefined,
      });
      showAlert(
        'success',
        `Payment attributed. Wallet credit: KES ${result.new_wallet_credit_kes}`,
      );
      // Remove the resolved payment from the list
      setPayments((prev) => prev.filter((p) => p.id !== attributeTarget.id));
      setAttributeTarget(null);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Attribution failed');
    } finally {
      setAttributing(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────

  const renderCell = (payment: UnmatchedPayment, key: string) => {
    switch (key) {
      case 'trans_id':
        return (
          <span className="font-mono text-sm">{payment.transaction.trans_id}</span>
        );
      case 'amount':
        return (
          <span className="font-semibold">KES {payment.transaction.trans_amount}</span>
        );
      case 'account':
        return (
          <span className="font-mono text-sm">{payment.transaction.bill_ref_number}</span>
        );
      case 'phone':
        return <span className="text-sm">{payment.transaction.msisdn}</span>;
      case 'reason':
        return (
          <span className={`badge ${REASON_COLORS[payment.reason] || 'badge-neutral'}`}>
            {REASON_LABELS[payment.reason] || payment.reason}
          </span>
        );
      case 'received':
        return (
          <span className="text-sm text-foreground-muted">
            {formatDateGMT3(payment.transaction.received_at, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        );
      case 'actions':
        if (tab === 'resolved') {
          return (
            <span className="badge badge-success text-xs">Resolved</span>
          );
        }
        return (
          <button
            onClick={() => setAttributeTarget(payment)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors"
          >
            Attribute
          </button>
        );
      default:
        return null;
    }
  };

  // ── Loading state ─────────────────────────────────────────────────

  if (loading && payments.length === 0) {
    return (
      <>
        <Header title="Unmatched Payments" subtitle="C2B payments that need manual attribution" />
        <PageLoader />
      </>
    );
  }

  // ── Main render ───────────────────────────────────────────────────

  return (
    <>
      <Header
        title="Unmatched Payments"
        subtitle="C2B payments that need manual attribution"
      />

      {/* Tabs */}
      <Tabs<'unresolved' | 'resolved'>
        value={tab}
        onChange={setTab}
        ariaLabel="Payment status"
        tabs={[
          { value: 'unresolved', label: 'Unresolved', count: payments.length || undefined },
          { value: 'resolved', label: 'Resolved' },
        ]}
      />

      {/* Desktop table */}
      <DataTable<UnmatchedPayment>
        columns={COLUMNS}
        data={payments}
        rowKey={(p) => p.id}
        renderCell={renderCell}
        loading={loading}
        className="hidden md:block card mt-4 animate-fade-in"
        emptyState={{
          icon: (
            <svg className="w-12 h-12 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          message:
            tab === 'unresolved'
              ? 'No unresolved payments. All C2B transactions have been matched.'
              : 'No resolved payments found.',
        }}
      />

      {/* Mobile cards */}
      <div className="md:hidden mt-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 rounded skeleton mb-3 w-2/3" />
              <div className="h-3 rounded skeleton mb-2 w-1/2" />
              <div className="h-3 rounded skeleton w-1/3" />
            </div>
          ))
        ) : payments.length === 0 ? (
          <div className="card p-8 text-center">
            <svg className="w-12 h-12 text-foreground-muted mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-foreground-muted text-sm">
              {tab === 'unresolved'
                ? 'No unresolved payments. All C2B transactions have been matched.'
                : 'No resolved payments found.'}
            </p>
          </div>
        ) : (
          payments.map((payment) => (
            <MobileDataCard
              key={payment.id}
              id={payment.id}
              title={`KES ${payment.transaction.trans_amount}`}
              subtitle={payment.transaction.trans_id}
              badge={{
                label: REASON_LABELS[payment.reason] || payment.reason,
                variant: 'neutral',
              }}
              status={{
                label: tab === 'unresolved' ? 'Pending' : 'Resolved',
                variant: tab === 'unresolved' ? 'warning' : 'success',
              }}
              value={{ text: payment.transaction.bill_ref_number }}
              secondary={{
                left: payment.transaction.msisdn,
                right: formatDateGMT3(payment.transaction.received_at, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              }}
              rightAction={
                tab === 'unresolved' ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAttributeTarget(payment);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-primary text-white"
                  >
                    Attribute
                  </button>
                ) : undefined
              }
            />
          ))
        )}
      </div>

      {/* ── Attribution Modal ──────────────────────────────────────── */}
      {attributeTarget && (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setAttributeTarget(null)}
          />

          {/* Panel */}
          <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-background-secondary rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">Attribute Payment</h2>
                <p className="text-sm text-foreground-muted truncate">
                  {attributeTarget.transaction.trans_id} &mdash; KES{' '}
                  {attributeTarget.transaction.trans_amount}
                </p>
              </div>
              <button
                onClick={() => setAttributeTarget(null)}
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Customer search */}
            <div className="px-5 pt-4 flex-shrink-0">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Select Customer
              </label>
              <SearchInput
                value={customerSearch}
                onChange={setCustomerSearch}
                placeholder="Search by name, phone, or account..."
              />
            </div>

            {/* Customer list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0" style={{ maxHeight: '40vh' }}>
              {customersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-lg skeleton" />
                  ))}
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-8 text-center text-foreground-muted text-sm">
                  {customerSearch.trim()
                    ? 'No customers match your search.'
                    : 'No customers found.'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCustomers.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCustomerId === c.id
                          ? 'bg-accent-primary/10 ring-1 ring-accent-primary/30'
                          : 'hover:bg-background-tertiary'
                      }`}
                    >
                      <input
                        type="radio"
                        name="customer"
                        checked={selectedCustomerId === c.id}
                        onChange={() => setSelectedCustomerId(c.id)}
                        className="w-4 h-4 text-accent-primary border-border focus:ring-accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-foreground-muted truncate">
                          {c.phone}
                          {c.account_number ? ` · ${c.account_number}` : ''}
                        </p>
                      </div>
                      <span
                        className={`badge text-[11px] ${
                          c.status === 'active' ? 'badge-success' : 'badge-neutral'
                        }`}
                      >
                        {c.status}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="px-5 pb-3 flex-shrink-0">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Notes <span className="text-foreground-muted font-normal">(optional)</span>
              </label>
              <textarea
                value={attributeNotes}
                onChange={(e) => setAttributeNotes(e.target.value)}
                placeholder="Reason for attribution..."
                rows={2}
                className="input w-full resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <button
                onClick={() => setAttributeTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-background-tertiary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAttribute}
                disabled={!selectedCustomerId || attributing}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-primary text-white hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {attributing ? 'Attributing...' : 'Attribute Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
