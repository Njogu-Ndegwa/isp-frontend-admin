'use client';

import { useState } from 'react';
import type { LeadDetail, ConvertLeadRequest } from '../lib/types';
import { api } from '../lib/api';

interface ConvertLeadModalProps {
  lead: LeadDetail;
  onClose: () => void;
  onConverted: () => void;
}

export default function ConvertLeadModal({ lead, onClose, onConverted }: ConvertLeadModalProps) {
  const [form, setForm] = useState<ConvertLeadRequest>({
    email: lead.email || '',
    organization_name: '',
    password: '',
    business_name: '',
    support_phone: lead.phone || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.organization_name || !form.password) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.convertLead(lead.id, form);
      onConverted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div className="relative bg-background-secondary border border-border rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-1">Convert to Reseller</h3>
        <p className="text-sm text-foreground-muted mb-4">
          Create a reseller account for <strong>{lead.name}</strong>
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              className="input w-full"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Organization Name *</label>
            <input
              type="text"
              className="input w-full"
              value={form.organization_name}
              onChange={e => setForm(p => ({ ...p, organization_name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <input
              type="password"
              className="input w-full"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Business Name</label>
            <input
              type="text"
              className="input w-full"
              value={form.business_name}
              onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Support Phone</label>
            <input
              type="tel"
              className="input w-full"
              value={form.support_phone}
              onChange={e => setForm(p => ({ ...p, support_phone: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Converting...' : 'Convert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
