'use client';

import { useState } from 'react';
import { api } from '../../lib/api';
import { copyText } from '../../lib/clipboard';
import { useT } from '../../lib/i18n';
import { CheckIcon, CopyIcon } from '../icons';
import { Panel } from '../ui';
import { PERMISSIONS, useOffer } from './access';

/*
 * A PPPoE customer's login, as the classic customers page gives it: the username,
 * the password behind a Show tap, copy buttons, and where their router plugs in.
 * The server sends the password on the live answer only, for the signed-in person;
 * a reopened chat keeps it out (`password_on_request`) and Show reads it again from
 * GET /api/customers/{id}/pppoe-credentials with the person's own access.
 */

export interface PppoeLogin {
  customer_id: number | null;
  name: string | null;
  username: string;
  password: string | null;
  /** the password is not in this copy of the answer: Show reads it from the API */
  onRequest: boolean;
  routerName: string | null;
  ports: string[];
}

/** The card's data from a `pppoe_login` result, or null when it is not one. */
export function pppoeLoginOf(payload: unknown): PppoeLogin | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.pppoe_username !== 'string' || !p.pppoe_username) return null;
  const password = typeof p.pppoe_password === 'string' && p.pppoe_password && !p.pppoe_password.startsWith('••••')
    ? p.pppoe_password : null;
  return {
    customer_id: typeof p.customer_id === 'number' ? p.customer_id : null,
    name: typeof p.name === 'string' ? p.name : null,
    username: p.pppoe_username,
    password,
    onRequest: !password && p.password_on_request === true,
    routerName: typeof p.router_name === 'string' ? p.router_name : null,
    ports: Array.isArray(p.pppoe_ports) ? p.pppoe_ports.filter((x): x is string => typeof x === 'string') : [],
  };
}

function CopyButton({ label, value }: { label: string; value: () => Promise<string | null> }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="ai-btn ai-btn-quiet shrink-0 text-accent" aria-label={label}
      onClick={async () => {
        const text = await value();
        if (text && (await copyText(text))) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
      }}>
      {copied ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
      <span className="text-[12.5px] font-semibold">{copied ? t('Copied') : t('Copy')}</span>
    </button>
  );
}

export function PppoeLoginBlock({ title, login }: { title: string; login: PppoeLogin }) {
  const t = useT();
  const offer = useOffer();
  const [password, setPassword] = useState<string | null>(login.password);
  const [shown, setShown] = useState(false);
  const [error, setError] = useState('');
  // the live answer already carries it; a reopened chat reads it the way the customers page does
  const canFetch = login.onRequest && login.customer_id !== null && offer.change(PERMISSIONS.customersManage);
  const available = !!password || canFetch;

  const load = async (): Promise<string | null> => {
    if (password) return password;
    if (!canFetch || login.customer_id === null) return null;
    try {
      const creds = await api.getPPPoECredentials(login.customer_id);
      setPassword(creds.pppoe_password || null);
      setError('');
      return creds.pppoe_password || null;
    } catch {
      setError(t('Could not read the password. Open the customer page to see it.'));
      return null;
    }
  };

  const row = 'flex min-w-0 items-center gap-2 border-b border-line py-2 last:border-b-0';
  return (
    <Panel eyebrow={t('PPPoE login')} title={login.name || title}
      note={t('Type these into the customer’s router exactly as shown: capitals and spaces count.')}>
      <dl className="ai-well px-3.5 py-1 text-[13.5px]" data-testid="pppoe-login-card">
        <div className={row}>
          <dt className="w-24 shrink-0 text-ink-3">{t('Username')}</dt>
          <dd className="ai-mono min-w-0 flex-1 break-all text-ink-1">{login.username}</dd>
          <CopyButton label={t('Copy username')} value={async () => login.username} />
        </div>
        <div className={row}>
          <dt className="w-24 shrink-0 text-ink-3">{t('Password')}</dt>
          <dd className="ai-mono min-w-0 flex-1 break-all text-ink-1" data-testid="pppoe-login-password">
            {shown && password ? password : '••••••••'}
          </dd>
          {available ? (
            <>
              <button type="button" className="ai-btn ai-btn-quiet shrink-0 text-accent" data-testid="pppoe-login-show"
                onClick={async () => { if (shown) { setShown(false); return; } if (await load()) setShown(true); }}>
                <span className="text-[12.5px] font-semibold">{shown ? t('Hide') : t('Show')}</span>
              </button>
              <CopyButton label={t('Copy password')} value={load} />
            </>
          ) : (
            <span className="shrink-0 text-[12px] text-ink-3">{t('Not shown in this view')}</span>
          )}
        </div>
        {login.routerName ? (
          <div className={row}>
            <dt className="w-24 shrink-0 text-ink-3">{t('Router')}</dt>
            <dd className="min-w-0 flex-1 break-words text-ink-1">{login.routerName}</dd>
          </div>
        ) : null}
        <div className={row}>
          <dt className="w-24 shrink-0 text-ink-3">{t('PPPoE ports')}</dt>
          <dd className="ai-mono min-w-0 flex-1 break-words text-ink-1">{login.ports.length ? login.ports.join(', ') : t('None set yet')}</dd>
        </div>
      </dl>
      {error ? <p className="mt-2 text-[13px] text-[var(--ai-text-bad)]">{error}</p> : null}
      <ol className="mt-3 grid gap-1 text-[13px] leading-snug text-ink-2">
        <li><span className="ai-mono mr-1.5 text-ink-3">1</span>{t('On the customer’s router choose router mode (not bridge or access point).')}</li>
        <li><span className="ai-mono mr-1.5 text-ink-3">2</span>{t('Set the WAN / internet connection type to PPPoE and enter the username and password. No VLAN is needed.')}</li>
        <li><span className="ai-mono mr-1.5 text-ink-3">3</span>{login.ports.length
          ? t('Plug a cable from its WAN port into {ports} on the MikroTik.', { ports: login.ports.join(' / ') })
          : t('Plug a cable from its WAN port into a PPPoE port on the MikroTik.')}</li>
      </ol>
    </Panel>
  );
}
