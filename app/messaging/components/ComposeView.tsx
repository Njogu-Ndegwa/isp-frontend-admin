'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { SmsCreditInfo, SmsTemplate, Plan } from '../../lib/types';
import { calcSegments } from '../lib/segments';
import { RecipientPicker, RecipientSelection, AudienceMode } from './RecipientPicker';
import { useAlert } from '../../context/AlertContext';

// ─── Default selection ────────────────────────────────────────────────────────
const DEFAULT_SELECTION: RecipientSelection = {
  mode: 'all' as AudienceMode,
  filter: 'all',
  count: 0,
  summaryLabel: 'All · 0',
};

// ─── Props ─────────────────────────────────────────────────────────────────────
interface ComposeViewProps {
  credits: SmsCreditInfo;
  onSent: (campaignId: number) => void;
  onSwitchToCredits: () => void;
}

// ─── ComposeView ──────────────────────────────────────────────────────────────
export function ComposeView({ credits, onSent, onSwitchToCredits }: ComposeViewProps) {
  const { showAlert } = useAlert();
  const [body, setBody] = useState('');
  const [selection, setSelection] = useState<RecipientSelection>(DEFAULT_SELECTION);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [sending, setSending] = useState(false);

  const seg = calcSegments(body);
  const creditsNeeded = seg.segments * selection.count;
  const balance = credits.balance;
  const insufficient = creditsNeeded > 0 && creditsNeeded > balance;
  const canSend = body.trim().length > 0 && selection.count > 0 && !insufficient && !sending;

  const loadPlans = useCallback(async () => {
    try {
      const p = await api.getPlans();
      setPlans(p);
    } catch {
      // non-critical
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const t = await api.getSmsTemplates();
      setTemplates(t.templates);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadPlans();
    loadTemplates();
  }, [loadPlans, loadTemplates]);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const payload = {
        body,
        filter: selection.filter,
        plan_id: selection.mode === 'by_plan' ? selection.planId : undefined,
        customer_ids: selection.customer_ids,
        exclude_customer_ids: selection.exclude_customer_ids,
      };
      const res = await api.sendSms(payload);
      showAlert('success', `Campaign sent to ${res.recipient_count} recipients (${res.credits_reserved} credits reserved)`);
      setBody('');
      setSelection(DEFAULT_SELECTION);
      onSent(res.campaign_id);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!saveTemplateName.trim() || !body.trim()) return;
    setSavingTemplate(true);
    try {
      await api.createSmsTemplate(saveTemplateName.trim(), body);
      showAlert('success', 'Template saved');
      setSaveTemplateName('');
      setShowSaveTemplate(false);
      loadTemplates();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Two-column on desktop */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* ── Left: Recipients + Compose ─────────────────────────────────── */}
        <div className="flex-1 space-y-4">
          {/* Recipients */}
          <div className="card p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Recipients</p>
            <RecipientPicker plans={plans} value={selection} onChange={setSelection} />
          </div>

          {/* Template picker */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-1.5">
                Load template
              </label>
              <select
                className="select"
                defaultValue=""
                onChange={(e) => {
                  const t = templates.find((tmpl) => tmpl.id === Number(e.target.value));
                  if (t) setBody(t.body);
                  e.target.value = '';
                }}
              >
                <option value="" disabled>Pick a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Message body */}
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1.5">
              Message
            </label>
            <textarea
              className="input min-h-[140px] resize-y"
              placeholder="Type your message here…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            {/* Segment counter */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-foreground-muted">
                {seg.chars} chars · {seg.segments} segment{seg.segments !== 1 ? 's' : ''} · {seg.isGsm ? 'GSM-7' : 'Unicode'}
              </span>
              {body && (
                <span className="text-xs text-foreground-muted">
                  Max {seg.maxPerSegment} chars/segment
                </span>
              )}
            </div>
          </div>

          {/* Save as template */}
          <div>
            <button
              type="button"
              onClick={() => setShowSaveTemplate(!showSaveTemplate)}
              className="text-xs text-accent-primary hover:underline"
            >
              {showSaveTemplate ? 'Cancel save' : '+ Save as template'}
            </button>
            {showSaveTemplate && (
              <div className="flex gap-2 mt-2">
                <input
                  className="input flex-1 text-sm"
                  placeholder="Template name"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate || !saveTemplateName.trim()}
                  className="btn-secondary text-sm px-3 disabled:opacity-50"
                >
                  {savingTemplate ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Send summary (desktop) / sticky bottom bar (mobile) ── */}
        <div className="lg:w-72 shrink-0">
          {/* Desktop summary card */}
          <div className="hidden lg:block card p-4 space-y-3 sticky top-4">
            <SendSummary
              selection={selection}
              segments={seg.segments}
              creditsNeeded={creditsNeeded}
              balance={balance}
              balanceAfter={balance - creditsNeeded}
              insufficient={insufficient}
              sending={sending}
              canSend={canSend}
              onSend={handleSend}
              onSwitchToCredits={onSwitchToCredits}
            />
          </div>
        </div>
      </div>

      {/* Sticky bottom bar on mobile */}
      <div
        className="lg:hidden sticky bottom-0 z-10 bg-background-secondary border-t border-border -mx-4 px-4 pt-3"
        style={{ paddingBottom: 'max(0.75rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <SendSummary
          selection={selection}
          segments={seg.segments}
          creditsNeeded={creditsNeeded}
          balance={balance}
          balanceAfter={balance - creditsNeeded}
          insufficient={insufficient}
          sending={sending}
          canSend={canSend}
          onSend={handleSend}
          onSwitchToCredits={onSwitchToCredits}
          compact
        />
      </div>
    </div>
  );
}

// ─── Send summary sub-component ───────────────────────────────────────────────
interface SendSummaryProps {
  selection: RecipientSelection;
  segments: number;
  creditsNeeded: number;
  balance: number;
  balanceAfter: number;
  insufficient: boolean;
  sending: boolean;
  canSend: boolean;
  onSend: () => void;
  onSwitchToCredits: () => void;
  compact?: boolean;
}

function SendSummary({
  selection,
  segments,
  creditsNeeded,
  balance,
  balanceAfter,
  insufficient,
  sending,
  canSend,
  onSend,
  onSwitchToCredits,
  compact = false,
}: SendSummaryProps) {
  if (compact) {
    // Mobile: condensed row
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground-muted truncate">
            {selection.count.toLocaleString()} recipients · {creditsNeeded.toLocaleString()} credits
          </p>
          {insufficient && (
            <p className="text-xs text-danger">
              Need {creditsNeeded.toLocaleString()}, have {balance.toLocaleString()}.{' '}
              <button type="button" onClick={onSwitchToCredits} className="underline">
                Buy more
              </button>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="btn-primary text-sm px-4 py-2.5 font-semibold flex items-center gap-2 disabled:opacity-50 shrink-0"
        >
          {sending ? (
            <>
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              Sending…
            </>
          ) : (
            'Send'
          )}
        </button>
      </div>
    );
  }

  // Desktop: full summary card content
  return (
    <>
      <p className="text-sm font-medium text-foreground mb-1">Send summary</p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-foreground-muted">Recipients</span>
          <span className="font-medium text-foreground">{selection.count.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-muted">Segments/msg</span>
          <span className="font-medium text-foreground">{segments || '—'}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2">
          <span className="text-foreground-muted">Credits needed</span>
          <span className={`font-semibold ${insufficient ? 'text-danger' : 'text-foreground'}`}>
            {creditsNeeded.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-muted">Balance now</span>
          <span className="font-medium text-foreground">{balance.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-muted">Balance after</span>
          <span className={`font-semibold ${balanceAfter < 0 ? 'text-danger' : 'text-success'}`}>
            {balanceAfter.toLocaleString()}
          </span>
        </div>
      </div>

      {insufficient && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-danger flex items-center justify-between gap-2">
          <span>Insufficient credits</span>
          <button type="button" onClick={onSwitchToCredits} className="underline shrink-0">
            Buy more
          </button>
        </div>
      )}

      {/* Phone preview bubble */}
      {!insufficient && creditsNeeded > 0 && (
        <div className="rounded-2xl bg-background-tertiary border border-border p-3">
          <p className="text-xs text-foreground-muted mb-1">Preview</p>
          <div className="bg-amber-500/10 rounded-xl rounded-tl-sm p-2.5 max-w-[85%]">
            <p className="text-xs text-foreground break-words leading-relaxed">
              {'{message preview}'}
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        className="w-full btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {sending ? (
          <>
            <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            Sending…
          </>
        ) : (
          `Send to ${selection.count.toLocaleString()} recipients`
        )}
      </button>
    </>
  );
}
