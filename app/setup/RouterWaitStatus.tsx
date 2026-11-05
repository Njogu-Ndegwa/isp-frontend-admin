'use client';

import { CopyCmd } from '../components/DeviceModeTroubleshoot';
import { whatsappHref } from '../landing/contact';
import { useT } from '../lib/i18n';
import { CODE_LIFETIME_HOURS, codeHoursLeft, routerWaitState } from './routerWait';

const RUSTDESK_HELP_MESSAGE = 'Hi Bitwave, I need help setting up my router. My RustDesk ID is: ';

/** How support really works: the owner sends a RustDesk ID, we do the setup. */
export function RouterSetupHelp() {
  const t = useT();
  return (
    <p className="text-xs text-foreground-muted text-center leading-relaxed">
      {t('Stuck? We can set it up for you.')}{' '}
      <a
        href={whatsappHref(RUSTDESK_HELP_MESSAGE)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-amber-500 hover:underline"
      >
        {t('Send your RustDesk ID on WhatsApp')}
      </a>
    </p>
  );
}

function Check({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="space-y-1.5">
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <div className="text-xs text-foreground-muted leading-relaxed space-y-1.5">{children}</div>
    </li>
  );
}

/**
 * What happens after the command is pasted, and what to look at when the
 * router stays silent. Driven only by the setup code's own age and status.
 */
export default function RouterWaitStatus({
  createdAt,
  nowMs,
  checkedByOwner,
  checking,
  onCheck,
  isRouterOs7,
  lifetimeHours = CODE_LIFETIME_HOURS,
}: {
  createdAt: string | null | undefined;
  nowMs: number;
  checkedByOwner: boolean;
  checking: boolean;
  onCheck: () => void;
  isRouterOs7: boolean;
  lifetimeHours?: number;
}) {
  const t = useT();
  const state = routerWaitState(createdAt, nowMs, checkedByOwner);
  const hoursLeft = codeHoursLeft(createdAt, nowMs, lifetimeHours);

  return (
    <div className="space-y-3" data-testid="router-wait-status" data-state={state}>
      <div className="rounded-xl border border-border p-3 space-y-2">
        <p className="text-xs font-semibold text-foreground">{t('After you paste the command')}</p>
        <ol className="text-xs text-foreground-muted leading-relaxed space-y-1 list-decimal list-inside">
          <li>{t('The router downloads its setup and applies it. This takes about 2 minutes.')}</li>
          <li>{t('The router restarts by itself, so Winbox will disconnect. That is normal.')}</li>
          <li>{t('When the router reaches us, this page moves to the next step by itself.')}</li>
        </ol>
      </div>

      {state === 'waiting' ? (
        <div className="flex items-center gap-2 px-1 text-xs text-foreground-muted" role="status">
          <span className="w-3.5 h-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin flex-shrink-0" />
          {t('Waiting for your router. We check every few seconds.')}
        </div>
      ) : (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-3" role="status">
          <div>
            <p className="text-sm font-semibold text-foreground">{t("We haven't heard from your router yet")}</p>
            <p className="text-xs text-foreground-muted mt-0.5 leading-relaxed">
              {t('If you already pasted the command, check these in Winbox, under New Terminal:')}
            </p>
          </div>
          <ol className="space-y-3">
            <Check title={t('1. Internet on port 1')}>
              <p>{t('Your internet cable must be in port 1. Run this. You should see replies.')}</p>
              <CopyCmd command="/ping 8.8.8.8 count=3" />
            </Check>
            <Check title={t('2. The right date and time')}>
              <p>{t('Run this. It should show today. If not, fix it under System, then Clock.')}</p>
              <CopyCmd command="/system clock print" />
            </Check>
            <Check title={t('3. The whole command')}>
              <p>
                {t('Use the Copy button, paste once and press Enter. The command must end with:')}{' '}
                <code className="px-1 py-0.5 rounded bg-background-tertiary text-[11px] text-foreground">/import provision.rsc;</code>
              </p>
            </Check>
            <Check title={t('4. A code that has not expired')}>
              <p>
                {hoursLeft === null
                  ? t('A code works for {hours} hours.', { hours: lifetimeHours })
                  : hoursLeft < 1
                    ? t('This code has less than 1 hour left.')
                    : t('This code has about {hours} hours left.', { hours: hoursLeft })}
              </p>
            </Check>
          </ol>
          {isRouterOs7 && (
            <p className="text-xs text-foreground-muted leading-relaxed">
              {t('Saw "not allowed by device-mode" or "hotspot feature unavailable"? Do the RouterOS 7 steps on this page first.')}
            </p>
          )}
        </div>
      )}

      <button
        onClick={onCheck}
        disabled={checking}
        className="w-full py-2.5 text-sm font-medium text-foreground-muted hover:text-foreground border border-border rounded-xl flex items-center justify-center gap-1.5 transition-colors active:opacity-70"
        style={{ touchAction: 'manipulation' }}
      >
        <svg className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {checking ? t('Checking...') : t('Check if router connected')}
      </button>
    </div>
  );
}
