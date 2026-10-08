'use client';

import {
  SubscriptionReminderSmsStatus,
  SubscriptionReminderUpcoming,
} from '../../../lib/types';
import { formatDateGMT3 } from '../../../lib/dateUtils';

// Shared by the reminders page and the admin dashboard's "expiring soon" card.

export const STAGE_SHORT: Record<string, string> = { t72: '3 days', t24: '24 hours', t2: '2 hours' };

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '-';
  return formatDateGMT3(iso, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** '2d 4h' / '5h' / '40m' until (or since, with 'ago') a moment. */
export function formatRelative(hours: number): string {
  const abs = Math.abs(hours);
  const text = abs >= 24
    ? `${Math.floor(abs / 24)}d ${Math.round(abs % 24)}h`
    : abs >= 1 ? `${Math.round(abs)}h` : `${Math.max(Math.round(abs * 60), 1)}m`;
  return hours < 0 ? `${text} ago` : text;
}

const SMS_STATUS: Record<SubscriptionReminderSmsStatus, { label: string; classes: string }> = {
  sent: { label: 'SMS sent', classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  delivered: { label: 'SMS delivered', classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  queued: { label: 'SMS sending', classes: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  failed: { label: 'SMS failed', classes: 'bg-red-500/10 text-red-500 border-red-500/20' },
  no_phone: { label: 'No phone — inbox only', classes: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  not_sent: { label: 'Inbox only', classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

export function ReminderSmsBadge({ status, error }: { status: SubscriptionReminderSmsStatus; error?: string | null }) {
  const config = SMS_STATUS[status] ?? SMS_STATUS.not_sent;
  return (
    <span
      title={error ?? undefined}
      className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${config.classes}`}
    >
      {config.label}
    </span>
  );
}

/** One line: what this reseller has been sent, and what goes out next. */
export function reminderSummary(r: SubscriptionReminderUpcoming, generatedAt: string): {
  text: string;
  tone: 'muted' | 'info' | 'warning';
} {
  const sent = r.stages_sent.map((s) => STAGE_SHORT[s.stage] ?? s.stage);
  const sentText = sent.length ? `Sent: ${sent.join(', ')}` : 'None sent yet';
  if (!r.next_stage || !r.next_send_at) {
    return { text: sent.length ? `${sentText} · all done` : 'No reminder before suspension', tone: 'muted' };
  }
  const next = STAGE_SHORT[r.next_stage] ?? r.next_stage;
  const dueNow = r.next_send_at === generatedAt;
  const when = dueNow ? 'sending now' : formatWhen(r.next_send_at);
  const phoneNote = r.phone ? '' : ' (inbox only, no phone)';
  return {
    text: `${sentText} · next: ${next} before, ${when}${phoneNote}`,
    tone: r.phone ? 'info' : 'warning',
  };
}
