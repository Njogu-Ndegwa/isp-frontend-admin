'use client';

import Link from 'next/link';
import { ResellerPayoutSettings, SettlementMode } from '../lib/types';
import { formatAmount } from '../lib/format';

interface SettlementModeCardProps {
  settings: ResellerPayoutSettings;
  saving: boolean;
  onChoose: (mode: SettlementMode) => void;
}

const DirectIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const PlatformIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10l9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18" />
  </svg>
);

const OPTIONS: {
  mode: SettlementMode;
  title: string;
  tagline: string;
  points: string[];
  icon: React.ReactNode;
  iconClass: string;
}[] = [
  {
    mode: 'direct',
    title: 'Straight to my account',
    tagline: 'Each payment lands in your account the moment the customer pays.',
    points: ['Instant', 'No payout fees', 'Nothing to withdraw'],
    icon: <DirectIcon />,
    iconClass: 'bg-emerald-500/10 text-emerald-500',
  },
  {
    mode: 'platform',
    title: 'Collected by Bitwave',
    tagline: 'Bitwave holds your earnings and pays them out on your schedule.',
    points: ['Scheduled payouts', 'Payout fees apply', 'Withdraw any time'],
    icon: <PlatformIcon />,
    iconClass: 'bg-amber-500/10 text-amber-500',
  },
];

export default function SettlementModeCard({ settings, saving, onChoose }: SettlementModeCardProps) {
  const isDirect = settings.settlement_mode === 'direct';
  const available = settings.direct_settlement_available;
  const method = settings.payment_method;

  const destination = method ? (
    <span className="font-semibold text-foreground">
      {method.label}
      {method.destination ? <span className="font-mono"> · {method.destination}</span> : null}
    </span>
  ) : (
    <span className="font-semibold text-foreground">your account</span>
  );

  const addMethodLink = (
    <Link href="/settings/payment-methods" className="underline font-medium">
      Payment Methods
    </Link>
  );

  let status: { tone: string; body: React.ReactNode };
  if (isDirect && !available) {
    // New accounts start on direct, usually before a payout account exists.
    status = {
      tone: 'bg-amber-500/10 text-amber-500',
      body: (
        <>
          Add an M-Pesa paybill, till or bank account in {addMethodLink} to start receiving payments
          directly. Until then Bitwave collects them and pays you out on your schedule.
        </>
      ),
    };
  } else if (isDirect) {
    status = {
      tone: 'bg-emerald-500/10 text-emerald-500',
      body: (
        <>
          Customer payments go straight to {destination}.{' '}
          <span className="whitespace-nowrap">
            Last 30 days: <span className="font-semibold text-foreground">{formatAmount(settings.direct_received_30d)}</span>
          </span>
        </>
      ),
    };
  } else if (!available) {
    status = {
      tone: 'bg-amber-500/10 text-amber-500',
      body: <>To receive payments directly, add an M-Pesa paybill, till or bank account in {addMethodLink}.</>,
    };
  } else {
    status = {
      tone: 'bg-background-tertiary text-foreground-muted',
      body: <>Customers pay Bitwave&apos;s paybill. Your balance is paid out to {destination} on your schedule.</>,
    };
  }

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="settlement-heading">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 id="settlement-heading" className="text-sm font-semibold text-foreground">
            How you receive customer payments
          </h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Choose where your customers&apos; M-Pesa payments go. You can switch at any time.
          </p>
        </div>
        {saving && (
          <span className="shrink-0 inline-flex items-center gap-1.5 text-xs text-foreground-muted">
            <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Saving
          </span>
        )}
      </div>

      <div role="radiogroup" aria-labelledby="settlement-heading" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map((opt) => {
          const selected = settings.settlement_mode === opt.mode;
          const disabled = saving || (opt.mode === 'direct' && !isDirect && !available);
          return (
            <button
              key={opt.mode}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => { if (!selected) onChoose(opt.mode); }}
              className={`group relative text-left rounded-2xl border p-4 transition-all touch-manipulation disabled:cursor-not-allowed ${
                selected
                  ? 'border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary/30'
                  : 'border-border hover:border-foreground-muted/40 hover:bg-background-tertiary/60 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${opt.iconClass}`}>
                  {opt.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-semibold ${selected ? 'text-accent-primary' : 'text-foreground'}`}>
                      {opt.title}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selected ? 'border-accent-primary bg-accent-primary text-white' : 'border-border'
                      }`}
                    >
                      {selected && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-muted mt-1 leading-relaxed">{opt.tagline}</p>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {opt.points.map((point) => (
                      <li
                        key={point}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-background-tertiary text-foreground-muted"
                      >
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className={`mt-4 rounded-xl px-3 py-2.5 text-xs leading-relaxed ${status.tone}`}>{status.body}</div>
    </section>
  );
}
