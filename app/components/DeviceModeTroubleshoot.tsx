'use client';

import { useState } from 'react';
import { useT } from '../lib/i18n';

export function CopyCmd({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = command;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="bg-background-tertiary rounded-lg p-3 pr-10">
        <code className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">{command}</code>
      </div>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-background-secondary/80 hover:bg-background-secondary border border-border/50 text-foreground-muted hover:text-foreground transition-colors"
        title="Copy command"
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

/**
 * RouterOS 7 device-mode. From 7.17 routers leave the factory in `home` or
 * `basic` mode (only CCR and 1100 series get `advanced`), and both block
 * hotspot; `home` also blocks fetch and scheduler, which setup needs too.
 *
 * The per-feature command is the one we lead with because it is the same on
 * every version. The preset is not: 7.17 renamed `enterprise` to `advanced`.
 * Docs: https://help.mikrotik.com/docs/spaces/ROS/pages/93749258/Device-mode
 *
 * The setup script checks for hotspot before it changes anything, so a run that
 * stops here leaves the router untouched and the same code can simply be re-run.
 */
export default function DeviceModeTroubleshoot({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-warning/30 overflow-hidden" data-testid="device-mode-help">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-background-secondary/50 active:opacity-70"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{t('RouterOS 7: allow hotspot first')}</p>
          <p className="text-xs text-foreground-muted mt-0.5">{t('Newer MikroTik routers block hotspot until you allow it. Setup stops without this.')}</p>
        </div>
        <svg
          className={`w-4 h-4 text-foreground-muted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-3 pb-4 space-y-4 border-t border-border/50">
          <p className="text-xs text-foreground-muted pt-3 leading-relaxed">
            {t('This fixes "not allowed by device-mode" and "hotspot feature unavailable". RouterOS 6 does not need it. On a hAP lite or hAP mini, use the hotspot package help on this page instead.')}
          </p>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">{t('1. In Winbox, open New Terminal and run this')}</p>
            <CopyCmd command="/system/device-mode/update fetch=yes scheduler=yes hotspot=yes" />
            <p className="text-xs text-foreground-muted leading-relaxed">
              {t('If it says "bad command name", your version has no device-mode. Skip these steps.')}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">{t('2. Within 5 minutes, tap the reset or mode button once')}</p>
            <p className="text-xs text-foreground-muted leading-relaxed">
              {t('The router shows a 5 minute countdown. Tap the button quickly.')}{' '}
              <span className="font-medium text-foreground">{t('Do not hold it. Holding it can erase the router.')}</span>{' '}
              {t('If the button does nothing, unplug the power and plug it back in.')}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">{t('3. Wait for the router to restart, then log in again')}</p>
            <p className="text-xs text-foreground-muted leading-relaxed">
              {t('If the 5 minutes ran out, nothing changed. Go back to step 1.')}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">{t('4. Now paste your setup command')}</p>
            <p className="text-xs text-foreground-muted leading-relaxed">
              {t('A code you already tried still works until it expires. You only need a new one after that.')}
            </p>
          </div>

          <div className="rounded-lg bg-accent-primary/5 border border-accent-primary/15 p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">{t('Not sure if it worked?')}</p>
            <CopyCmd command="/system/device-mode/print" />
            <p className="text-xs text-foreground-muted leading-relaxed">
              {t('You should see')} <code className="px-1 py-0.5 rounded bg-background-tertiary text-[11px]">hotspot: yes</code>.{' '}
              {t('If it says "too many unsuccessful attempts", unplug the power once, plug it back in and start again.')}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">{t('Command refused? Use the one for your version')}</p>
            <p className="text-xs text-foreground-muted leading-relaxed">{t('RouterOS 7.17 or newer:')}</p>
            <CopyCmd command="/system/device-mode/update mode=advanced" />
            <p className="text-xs text-foreground-muted leading-relaxed">{t('Older than 7.17:')}</p>
            <CopyCmd command="/system/device-mode/update mode=enterprise" />
            <p className="text-xs text-foreground-muted leading-relaxed">{t('Then do the same button press in step 2.')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
