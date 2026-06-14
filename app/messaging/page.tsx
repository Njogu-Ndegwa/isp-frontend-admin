'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { SmsCreditInfo, SmsCampaign, SmsCampaignDetail, SmsTemplate, Plan } from '../lib/types';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import Tabs, { TabItem } from '../components/Tabs';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import BuySmsCreditsModal from '../components/BuySmsCreditsModal';

// ─── Segment counter (mirrors backend logic) ───────────────────────────────
const GSM7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXT = new Set(['^', '{', '}', '[', '~', ']', '|', '€', '\\']);

function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!GSM7_BASIC.includes(ch) && !GSM7_EXT.has(ch)) return false;
  }
  return true;
}

function charCount(text: string): number {
  let count = 0;
  for (const ch of text) {
    count += GSM7_EXT.has(ch) ? 2 : 1;
  }
  return count;
}

function calcSegments(text: string): { segments: number; chars: number; maxPerSegment: number; isGsm: boolean } {
  if (!text) return { segments: 0, chars: 0, maxPerSegment: 160, isGsm: true };
  const gsm = isGsm7(text);
  const chars = gsm ? charCount(text) : text.length;
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  const segments = chars <= single ? 1 : Math.ceil(chars / multi);
  return { segments, chars, maxPerSegment: chars <= single ? single : multi, isGsm: gsm };
}

// ─── Date helper ─────────────────────────────────────────────────────────
function fmtDate(dateStr: string | null | undefined): string {
  try {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'text-success bg-emerald-500/10 border-emerald-500/20',
    sent: 'text-success bg-emerald-500/10 border-emerald-500/20',
    delivered: 'text-success bg-emerald-500/10 border-emerald-500/20',
    partial: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    sending: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    queued: 'text-foreground-muted bg-background-tertiary border-border',
    failed: 'text-danger bg-red-500/10 border-red-500/20',
    canceled: 'text-foreground-muted bg-background-tertiary border-border',
  };
  const cls = map[status] ?? 'text-foreground-muted bg-background-tertiary border-border';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status}
    </span>
  );
}

// ─── Campaign detail modal ────────────────────────────────────────────────
function CampaignDetailModal({ campaignId, onClose }: { campaignId: number; onClose: () => void }) {
  const [detail, setDetail] = useState<SmsCampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const load = async () => {
      try {
        const d = await api.getSmsCampaign(campaignId);
        setDetail(d);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { document.body.style.overflow = ''; };
  }, [campaignId]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-background-secondary border border-border rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-lg shadow-xl max-h-[80vh] flex flex-col"
        style={{ paddingBottom: 'max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-foreground mb-4">Campaign #{campaignId} — Messages</h3>
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-[3px] border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        {detail && (
          <div className="overflow-y-auto flex-1 -mx-1 px-1">
            <div className="mb-3 flex items-center gap-2">
              <StatusBadge status={detail.status} />
              <span className="text-xs text-foreground-muted">{detail.messages.length} message{detail.messages.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-1.5">
              {detail.messages.map((msg, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-sm text-foreground font-mono">{msg.phone}</span>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={msg.status} />
                    {msg.error && <span className="text-xs text-danger">{msg.error}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Send ────────────────────────────────────────────────────────────
type RecipientFilter = 'all' | 'active' | 'expiring' | 'by_plan';

function SendTab({ credits, onCreditsBought, onSwitchToCredits }: {
  credits: SmsCreditInfo | null;
  onCreditsBought: () => void;
  onSwitchToCredits: () => void;
}) {
  const { showAlert } = useAlert();
  const [body, setBody] = useState('');
  const [filter, setFilter] = useState<RecipientFilter>('all');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<number | undefined>(undefined);
  const [recipientCount, setRecipientCount] = useState<number>(0);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [sending, setSending] = useState(false);

  const seg = calcSegments(body);
  const creditsNeeded = seg.segments * recipientCount;
  const balance = credits?.balance ?? 0;
  const insufficient = creditsNeeded > 0 && creditsNeeded > balance;
  const canSend = body.trim().length > 0 && recipientCount > 0 && !insufficient && !sending;

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

  // Fetch recipient count when filter/planId changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setRecipientLoading(true);
      try {
        const res = await api.getSmsRecipients(filter, planId);
        if (!cancelled) setRecipientCount(res.count);
      } catch {
        if (!cancelled) setRecipientCount(0);
      } finally {
        if (!cancelled) setRecipientLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [filter, planId]);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const payload = {
        body,
        filter,
        plan_id: filter === 'by_plan' ? planId : undefined,
      };
      const res = await api.sendSms(payload);
      showAlert('success', `Campaign sent to ${res.recipient_count} recipients (${res.credits_reserved} credits reserved)`);
      setBody('');
      onCreditsBought(); // refresh balance
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

  return (
    <div className="space-y-4">
      {/* Balance chip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-muted">Balance:</span>
          <span className={`text-sm font-semibold ${balance < 10 ? 'text-danger' : 'text-success'}`}>
            {balance.toLocaleString()} credits
          </span>
        </div>
        {credits && (
          <span className="text-xs text-foreground-muted">
            KES {credits.price_per_sms_kes}/credit
          </span>
        )}
      </div>

      {/* Template picker */}
      {templates.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-1.5">Load template</label>
          <select
            className="select"
            defaultValue=""
            onChange={(e) => {
              const t = templates.find((t) => t.id === Number(e.target.value));
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

      {/* Body textarea */}
      <div>
        <label className="block text-sm font-medium text-foreground-muted mb-1.5">Message</label>
        <textarea
          className="input min-h-[120px] resize-y"
          placeholder="Type your message here…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {/* Segment/credit counter */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-foreground-muted">
            {seg.chars} chars · {seg.segments} segment{seg.segments !== 1 ? 's' : ''} · {seg.isGsm ? 'GSM-7' : 'Unicode'}
          </span>
          {recipientCount > 0 && seg.segments > 0 && (
            <span className={`text-xs font-medium ${insufficient ? 'text-danger' : 'text-foreground-muted'}`}>
              {creditsNeeded.toLocaleString()} credits for {recipientCount} recipients
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

      {/* Recipient selector */}
      <div className="card p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Recipients</p>
        <div className="grid grid-cols-2 gap-2">
          {(['all', 'active', 'expiring', 'by_plan'] as RecipientFilter[]).map((f) => {
            const labels: Record<RecipientFilter, string> = {
              all: 'All customers',
              active: 'Active',
              expiring: 'Expiring (7d)',
              by_plan: 'By plan',
            };
            return (
              <button
                key={f}
                type="button"
                onClick={() => { setFilter(f); if (f !== 'by_plan') setPlanId(undefined); }}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  filter === f
                    ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'
                    : 'bg-background-tertiary border-border text-foreground-muted hover:text-foreground'
                }`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>
        {filter === 'by_plan' && (
          <select
            className="select"
            value={planId ?? ''}
            onChange={(e) => setPlanId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Select a plan…</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <div className="text-sm text-foreground-muted">
          {recipientLoading ? (
            <span className="animate-pulse">Counting…</span>
          ) : (
            <span>
              <span className="font-semibold text-foreground">{recipientCount.toLocaleString()}</span> recipient{recipientCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Insufficient credits notice */}
      {insufficient && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-danger flex items-center justify-between gap-2">
          <span>Insufficient credits — you need {creditsNeeded.toLocaleString()} but have {balance.toLocaleString()}.</span>
          <button type="button" onClick={onSwitchToCredits} className="text-sm font-medium underline shrink-0">
            Buy more
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        className="w-full btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {sending ? (
          <>
            <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            Sending…
          </>
        ) : (
          `Send to ${recipientCount.toLocaleString()} recipients`
        )}
      </button>
    </div>
  );
}

// ─── Tab: Credits ────────────────────────────────────────────────────────
function CreditsTab({ credits, onRefresh }: { credits: SmsCreditInfo | null; onRefresh: () => void }) {
  const { user } = useAuth();
  const [buyModal, setBuyModal] = useState<{ quantity: number; amountKes: number } | null>(null);
  const [customQty, setCustomQty] = useState('');

  if (!credits) return <div className="text-sm text-foreground-muted">Loading…</div>;

  const pricePerCredit = credits.price_per_sms_kes;

  const openBuy = (qty: number) => {
    setBuyModal({ quantity: qty, amountKes: Math.round(qty * pricePerCredit) });
  };

  const handleCustomBuy = () => {
    const qty = parseInt(customQty, 10);
    if (!qty || qty < (credits.min_purchase_credits || 1)) return;
    openBuy(qty);
  };

  return (
    <div className="space-y-6">
      {/* Balance summary */}
      <div className="card p-5 space-y-3">
        <p className="text-sm font-medium text-foreground-muted">Current Balance</p>
        <p className="text-4xl font-bold text-foreground">{credits.balance.toLocaleString()}</p>
        <p className="text-sm text-foreground-muted">SMS credits</p>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div>
            <p className="text-xs text-foreground-muted">Total purchased</p>
            <p className="text-sm font-semibold text-foreground">{credits.total_purchased.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Total spent</p>
            <p className="text-sm font-semibold text-foreground">{credits.total_spent.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Price info */}
      <div className="flex items-center gap-2 text-sm text-foreground-muted">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        KES {pricePerCredit} per SMS credit · min {credits.min_purchase_credits} credits per purchase
      </div>

      {/* Bundle buttons */}
      {credits.bundles.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Choose a bundle</p>
          <div className="grid grid-cols-2 gap-3">
            {credits.bundles.map((bundle) => (
              <button
                key={bundle.credits}
                type="button"
                onClick={() => openBuy(bundle.credits)}
                className="card p-4 text-left hover:border-accent-primary/50 transition-colors"
              >
                <p className="text-lg font-bold text-foreground">{bundle.credits.toLocaleString()}</p>
                <p className="text-xs text-foreground-muted">{bundle.label}</p>
                <p className="text-sm font-semibold text-accent-primary mt-1">
                  KES {Math.round(bundle.credits * pricePerCredit).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom quantity */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Custom quantity</p>
        <div className="flex gap-2">
          <input
            type="number"
            className="input flex-1"
            placeholder={`Min ${credits.min_purchase_credits}`}
            min={credits.min_purchase_credits}
            value={customQty}
            onChange={(e) => setCustomQty(e.target.value)}
          />
          <button
            type="button"
            onClick={handleCustomBuy}
            className="btn-primary px-4 text-sm font-semibold"
            disabled={!customQty || parseInt(customQty, 10) < (credits.min_purchase_credits || 1)}
          >
            Buy
          </button>
        </div>
        {customQty && parseInt(customQty, 10) >= (credits.min_purchase_credits || 1) && (
          <p className="text-xs text-foreground-muted mt-1">
            Total: KES {Math.round(parseInt(customQty, 10) * pricePerCredit).toLocaleString()}
          </p>
        )}
      </div>

      {buyModal && (
        <BuySmsCreditsModal
          open={true}
          onClose={() => setBuyModal(null)}
          quantity={buyModal.quantity}
          amountKes={buyModal.amountKes}
          phoneDefault={user?.support_phone || ''}
          onPurchased={() => {
            setBuyModal(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Tab: History ────────────────────────────────────────────────────────
function HistoryTab() {
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSmsCampaigns();
      setCampaigns(res.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="card p-5 text-center">
        <p className="text-sm text-danger mb-3">{error}</p>
        <button onClick={load} className="btn-primary px-4 py-2 text-sm">Retry</button>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="card p-8 text-center">
        <svg className="w-10 h-10 mx-auto text-foreground-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
        </svg>
        <p className="text-sm text-foreground-muted">No campaigns yet. Send your first message from the Send tab.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {campaigns.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setDetailId(c.id)}
            className="w-full card p-4 text-left hover:border-accent-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm text-foreground line-clamp-2 flex-1">
                {c.body.length > 120 ? c.body.slice(0, 120) + '…' : c.body}
              </p>
              <StatusBadge status={c.status} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
              <span>{fmtDate(c.created_at)}</span>
              <span>{c.recipient_count} recipients</span>
              <span className="text-success">{c.sent_count} sent</span>
              {c.failed_count > 0 && <span className="text-danger">{c.failed_count} failed</span>}
              <span>{c.total_credits} credits</span>
              {c.refunded_credits > 0 && <span className="text-success">{c.refunded_credits} refunded</span>}
            </div>
          </button>
        ))}
      </div>

      {detailId !== null && (
        <CampaignDetailModal
          campaignId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  );
}

// ─── Tab: Templates ───────────────────────────────────────────────────────
function TemplatesTab() {
  const { showAlert } = useAlert();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newBody, setNewBody] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSmsTemplates();
      setTemplates(res.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim() || !newBody.trim()) return;
    setCreating(true);
    try {
      await api.createSmsTemplate(newName.trim(), newBody.trim());
      showAlert('success', 'Template created');
      setNewName('');
      setNewBody('');
      load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.deleteSmsTemplate(id);
      showAlert('success', 'Template deleted');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="card p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">New template</p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div>
          <label className="block text-xs text-foreground-muted mb-1">Template name</label>
          <input
            className="input text-sm"
            placeholder="e.g. Monthly reminder"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-foreground-muted mb-1">Message body</label>
          <textarea
            className="input text-sm min-h-[80px] resize-y"
            placeholder="Type the template text…"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !newName.trim() || !newBody.trim()}
          className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
        >
          {creating ? 'Saving…' : 'Save template'}
        </button>
      </div>

      {/* List */}
      {templates.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-foreground-muted">No templates yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="card p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-sm text-foreground-muted mt-1 line-clamp-3">{t.body}</p>
              </div>
              {confirmDeleteId === t.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-foreground-muted">Delete?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="text-xs btn-danger px-2 py-1 disabled:opacity-50"
                  >
                    {deletingId === t.id ? '…' : 'Yes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs btn-ghost px-2 py-1"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(t.id)}
                  className="btn-ghost p-1.5 text-foreground-muted hover:text-danger transition-colors shrink-0"
                  title="Delete template"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
type TabValue = 'send' | 'credits' | 'history' | 'templates';

export default function MessagingPage() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<TabValue>('send');
  const [credits, setCredits] = useState<SmsCreditInfo | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);

  const loadCredits = useCallback(async () => {
    try {
      setCreditsLoading(true);
      const c = await api.getSmsCredits();
      setCredits(c);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load SMS credits');
    } finally {
      setCreditsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => { loadCredits(); }, [loadCredits]);

  if (user && user.role !== 'reseller') {
    return (
      <div className="space-y-6 pb-24 md:pb-6">
        <Header title="Messaging" />
        <div className="card p-8 text-center">
          <p className="text-sm text-foreground-muted">This page is only available to resellers.</p>
        </div>
      </div>
    );
  }

  const tabs: TabItem<TabValue>[] = [
    { value: 'send', label: 'Send' },
    { value: 'credits', label: 'Credits' },
    { value: 'history', label: 'History' },
    { value: 'templates', label: 'Templates' },
  ];

  if (creditsLoading) {
    return (
      <div className="space-y-6 pb-24 md:pb-6">
        <Header title="Messaging" />
        <PageLoader />
      </div>
    );
  }

  if (credits && !credits.enabled) {
    return (
      <div className="space-y-6 pb-24 md:pb-6">
        <Header title="Messaging" />
        <div className="card p-8 text-center">
          <svg className="w-10 h-10 mx-auto text-foreground-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <p className="text-sm text-foreground-muted">SMS messaging is not currently enabled for your account. Contact support to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Header title="Messaging" />

      <div className="space-y-5">
        <Tabs<TabValue>
          value={activeTab}
          onChange={setActiveTab}
          tabs={tabs}
          ariaLabel="Messaging tabs"
        />

        <div>
          {activeTab === 'send' && (
            <SendTab
              credits={credits}
              onCreditsBought={loadCredits}
              onSwitchToCredits={() => setActiveTab('credits')}
            />
          )}
          {activeTab === 'credits' && (
            <CreditsTab credits={credits} onRefresh={loadCredits} />
          )}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'templates' && <TemplatesTab />}
        </div>
      </div>
    </div>
  );
}
