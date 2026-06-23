'use client';

import { useState } from 'react';
import { api } from '../../../lib/api';
import { AdminReseller } from '../../../lib/types';
import { useAlert } from '../../../context/AlertContext';
import { ResellerPicker, ResellerSelection } from './ResellerPicker';

interface BroadcastViewProps {
  resellers: AdminReseller[];
  loadingResellers: boolean;
}

const DEFAULT_SELECTION: ResellerSelection = {
  reseller_ids: null,
  all_resellers: true,
  count: 0,
};

export default function BroadcastView({ resellers, loadingResellers }: BroadcastViewProps) {
  const { showAlert } = useAlert();
  const [selection, setSelection] = useState<ResellerSelection>({
    ...DEFAULT_SELECTION,
    count: resellers.length,
  });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [alsoSms, setAlsoSms] = useState(false);
  const [sending, setSending] = useState(false);

  // Keep count in sync when resellers list loads
  const effectiveSelection: ResellerSelection = selection.all_resellers
    ? { ...selection, count: resellers.length }
    : selection;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) { showAlert('error', 'Message body is required'); return; }
    if (!effectiveSelection.all_resellers && (effectiveSelection.reseller_ids ?? []).length === 0) {
      showAlert('error', 'Select at least one reseller or choose all');
      return;
    }
    setSending(true);
    try {
      const result = await api.sendInboxMessage({
        reseller_ids: effectiveSelection.all_resellers ? null : (effectiveSelection.reseller_ids ?? []),
        all_resellers: effectiveSelection.all_resellers,
        subject: subject.trim() || undefined,
        body: body.trim(),
        also_sms: alsoSms,
      });
      const smsNote = alsoSms
        ? ` SMS queued: ${result.sms_queued}. No phone: ${result.sms_skipped_no_phone}.`
        : '';
      showAlert('success', `Inbox message sent to ${result.recipients} reseller(s).${smsNote}`);
      setSubject('');
      setBody('');
      setAlsoSms(false);
      setSelection({ reseller_ids: null, all_resellers: true, count: resellers.length });
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const canSend =
    body.trim().length > 0 &&
    (effectiveSelection.all_resellers || (effectiveSelection.reseller_ids ?? []).length > 0) &&
    !sending &&
    !loadingResellers;

  return (
    <form onSubmit={handleSend} className="space-y-4 pt-4">
      <div className="card p-6 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Compose message</h3>

        {/* Recipient picker */}
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-2">Recipients</label>
          <ResellerPicker
            resellers={resellers}
            loading={loadingResellers}
            value={effectiveSelection}
            onChange={setSelection}
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">
            Subject <span className="font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input"
            placeholder="Subject line…"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">
            Body <span className="text-danger">*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="input min-h-[120px] resize-y"
            placeholder="Write your message here…"
            required
          />
        </div>

        {/* Also SMS toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={alsoSms}
            onClick={() => setAlsoSms((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              alsoSms ? 'bg-success' : 'bg-background-tertiary border border-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                alsoSms ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-foreground">
            Also send as SMS to support phone — billed to platform
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {effectiveSelection.count > 0 && (
          <span className="text-xs text-foreground-muted">
            Sending to {effectiveSelection.count.toLocaleString()} reseller{effectiveSelection.count !== 1 ? 's' : ''}
          </span>
        )}
        <button
          type="submit"
          disabled={!canSend}
          className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  );
}
