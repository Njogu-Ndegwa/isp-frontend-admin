'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useT } from '../../lib/i18n';
import type { ProvisionToken } from '../../lib/types';
import { codeHoursLeft, isCodeExpired, routerWaitState } from '../../setup/routerWait';
import { CodeBox } from '../Markdown';
import { Led, Panel } from '../ui';

/*
 * A new router's setup code, as the classic setup page shows it: the command with a
 * copy button, the three Winbox steps, then the card waits for the router to call home
 * (the code turns "provisioned") and says so. After five quiet minutes it shows the
 * checks that find why a router has not connected.
 */

export interface RouterSetup {
  token: string;
  command: string;
  note?: string | null;
  vpn_type?: string | null;
  ssid?: string | null;
  router_name?: string | null;
  created_at?: string | null;
  expires_in_hours?: number | null;
}

/** A setup-code answer (POST /api/provision/create): its command and its token. */
export function isRouterSetup(p: unknown): p is RouterSetup {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  const r = p as Record<string, unknown>;
  return typeof r.command === 'string' && typeof r.token === 'string' && 'expires_in_hours' in r;
}

const POLL_MS = 8000;

export function RouterSetupBlock({ setup }: { setup: RouterSetup }) {
  const t = useT();
  const [token, setToken] = useState<ProvisionToken | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [checked, setChecked] = useState(false);
  const done = token?.status === 'provisioned';
  const expired = token ? isCodeExpired(token) : false;

  const load = useCallback(async () => {
    try {
      const all = await api.getProvisionTokens();
      setToken(all.find((x) => x.token === setup.token) ?? null);
    } catch { /* keep waiting; the next round may answer */ }
    setNowMs(Date.now());
  }, [setup.token]);

  useEffect(() => {
    if (done || expired) return;
    const first = setTimeout(load, 1500);
    const id = setInterval(load, POLL_MS);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [load, done, expired]);

  const created = token?.created_at ?? setup.created_at ?? null;
  const late = routerWaitState(created, nowMs, checked) === 'not_heard';
  const hoursLeft = codeHoursLeft(created, nowMs, setup.expires_in_hours ?? 24);
  const v6 = setup.vpn_type === 'l2tp';

  return (
    <Panel eyebrow={<>{t('New router')}{setup.ssid ? <> · {t('Wi-Fi')} {setup.ssid}</> : null}</>}
      title={done ? t('Your router is connected') : t('Set up your MikroTik')}
      tone={done ? 'good' : expired ? 'bad' : undefined}>
      {done ? (
        <p className="flex items-center gap-2 text-[14px] text-ink-1">
          <Led tone="good" pulse />
          {t('{name} called in and is set up. It now shows on your routers.', { name: token?.router_name || setup.router_name || t('The router') })}
        </p>
      ) : (
        <>
          <ol className="mb-3 grid gap-1.5 text-[14px] leading-snug text-ink-1">
            <li><span className="ai-mono mr-1.5 text-ink-3">1</span>{t('Open Winbox and connect to the router (factory-reset is best).')}</li>
            <li><span className="ai-mono mr-1.5 text-ink-3">2</span>{t('Open New Terminal, paste the whole command once and press Enter.')}</li>
            <li><span className="ai-mono mr-1.5 text-ink-3">3</span>{t('Wait about 2 minutes. It restarts by itself and Winbox disconnects; that is normal.')}</li>
          </ol>
          <CodeBox code={setup.command} label={v6 ? t('Setup command · RouterOS 6') : t('Setup command · RouterOS 7')} />
          {!v6 ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
              {t('On RouterOS 7, if it says "not allowed by device-mode", ask here: it needs one command and a tap on the reset button first.')}
            </p>
          ) : null}
          {expired ? (
            <p className="mt-3 text-[13px] text-[var(--ai-text-bad)]">{t('This code has expired. Ask for a new one.')}</p>
          ) : late ? (
            <div className="mt-4 rounded-[10px] border border-line px-3.5 py-3">
              <p className="text-[13.5px] font-medium text-ink-1">{t('Not heard from the router yet. Check, in this order:')}</p>
              <ul className="mt-1.5 grid gap-1 text-[13px] leading-snug text-ink-2">
                <li>• {t('The internet cable is in port 1 (ether1) and the line works.')}</li>
                <li>• {t('The router’s date and time are today (System > Clock).')}</li>
                <li>• {t('The whole command was pasted: it ends with /import provision.rsc;')}</li>
                {hoursLeft !== null ? <li>• {t('This code works for {n} more hours.', { n: hoursLeft })}</li> : null}
              </ul>
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-3">
              <Led tone="live" pulse />{t('Waiting for your router to connect…')}
              <button type="button" className="ml-auto text-[12.5px] font-medium text-accent" onClick={() => setChecked(true)}>
                {t('I pasted it')}
              </button>
            </p>
          )}
        </>
      )}
    </Panel>
  );
}
