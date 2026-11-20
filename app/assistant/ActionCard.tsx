'use client';

import { useEffect, useState } from 'react';
import { formatValue, humanizeKey } from '../lib/assistantView';
import type { ActionStatus, FormField } from '../lib/assistant';
import { planDuration, planSpeed } from '../lib/assistantEntities';
import { formatMoney } from '../lib/format';
import { useT } from '../lib/i18n';
import ResultBlock from './blocks/ResultBlock';
import { AlertIcon, ArrowRightIcon, CheckIcon, SpinnerIcon } from './icons';
import { toneColor } from './charts/shared';

export interface ActionCardData {
  action_id: string;
  title: string;
  summary: string;
  method: string;
  path: string;
  query?: Record<string, unknown> | null;
  body?: unknown;
  sensitive?: boolean;
  expires_at?: string;
  status: ActionStatus;
  detail?: string;
  payload?: unknown;
  /** the change as a form the person completes before Confirm */
  form?: FormField[];
}

function fields(value: unknown): [string, unknown][] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value === undefined || value === null ? [] : [['value', value]];
  return Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== null && v !== '');
}

const MONEY_FIELD = /(^|_)(price|amount|balance|fee|cost|original_price)$/i;

/**
 * The values of a change, said the way the dashboard says them: a price with its
 * currency, a plan's length as "7 days" instead of two fields, a speed in Mbps.
 */
function readable(params: [string, unknown][], currency?: string | null): [string, string][] {
  const map = new Map(params);
  const out: [string, string][] = [];
  const hasDuration = map.has('duration_value') && map.has('duration_unit');
  for (const [k, v] of params) {
    if (hasDuration && k === 'duration_unit') continue;
    if (hasDuration && k === 'duration_value') {
      out.push(['Duration', planDuration({ duration_value: v, duration_unit: map.get('duration_unit') })]);
    } else if (MONEY_FIELD.test(k) && typeof v === 'number') {
      out.push([humanizeKey(k), formatMoney(v, currency ?? 'KES')]);
    } else if (k === 'speed') {
      out.push(['Speed', planSpeed(v) ?? formatValue(v)]);
    } else {
      out.push([humanizeKey(k), typeof v === 'string' && /^[a-z]+(_[a-z]+)*$/.test(v) && k.endsWith('_type') ? humanizeKey(v) : formatValue(v)]);
    }
  }
  return out;
}

const VERB: Record<string, string> = { POST: 'Create / run', PUT: 'Update', PATCH: 'Update', DELETE: 'Delete' };

/* ---------------- the form ---------------- */

type Value = string | boolean | string[];
type Values = Record<string, Value>;

/** Choices read the way people say them: "HOURS" -> "Hours", "pppoe" -> "PPPoE". */
function optionLabel(o: string): string {
  const special: Record<string, string> = { pppoe: 'PPPoE', static_ip: 'Static IP', mpesa: 'M-Pesa', sms: 'SMS', ip: 'IP' };
  const k = o.toLowerCase();
  if (special[k]) return special[k];
  const words = k.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A friendlier name for a field than its key: "duration_value" -> "Duration", "speed" -> "Speed (e.g. 5M/5M)". */
function fieldLabel(f: FormField): string {
  const names: Record<string, string> = {
    duration_value: 'Duration', duration_unit: 'Unit', connection_type: 'Type', price: 'Price',
    max_devices: 'Devices per purchase', is_hidden: 'Hide from the portal', badge_text: 'Badge',
  };
  return names[f.name] ?? f.label;
}

const initialValues = (form: FormField[]): Values => Object.fromEntries(form.map((f): [string, Value] => {
  if (f.kind === 'boolean') return [f.name, f.value === true];
  if (f.kind === 'list') {
    const items = Array.isArray(f.value) ? f.value.map(String) : [];
    return [f.name, f.options?.length ? items : items.join(', ')];
  }
  return [f.name, f.value === undefined || f.value === null ? '' : String(f.value)];
}));

const isEmpty = (v: Value | undefined) => v === undefined || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);

/** What a person fills in first: required fields and anything already filled; the rest waits under More options. */
const isPrimary = (f: FormField, v: Value | undefined) =>
  f.required || f.kind === 'password' || (f.kind === 'boolean' ? v === true : !isEmpty(v));

/** Short answers (a number, a choice) sit two to a row even on a phone; words take the full row there. */
const isShort = (f: FormField) => f.kind === 'integer' || f.kind === 'number' || f.kind === 'select';

/**
 * The change as a form: each field the API takes, filled with what the assistant
 * already knows, in inputs made for a thumb (16 px text, so a phone does not zoom;
 * number keypads for numbers; native pickers for choices). Required fields are
 * marked and checked before anything is sent; the server checks them again.
 */
function FormFields({ form, values, setValues, missing, disabled, currency }: {
  form: FormField[];
  values: Values;
  setValues: (fn: (v: Values) => Values) => void;
  missing: Set<string>;
  disabled: boolean;
  currency?: string | null;
}) {
  const t = useT();
  const [more, setMore] = useState(false);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  // decided once from the first values, so a field does not jump away while it is being typed in
  const [primary] = useState(() => new Set(form.filter((f) => isPrimary(f, values[f.name])).map((f) => f.name)));
  const extra = form.filter((f) => !primary.has(f.name));
  const visible = more || primary.size === 0 || extra.length <= 2 ? form : form.filter((f) => primary.has(f.name));
  const field = 'w-full min-w-0 rounded-[12px] border bg-[var(--ai-bg)] px-3.5 py-2.5 text-[16px] text-ink-1 outline-none transition-colors placeholder:text-ink-3 focus:border-accent/70 focus:shadow-[0_0_0_3px_var(--ai-accent-soft)] disabled:opacity-60';
  return (
    <>
    <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3.5">
      {visible.map((f) => {
        const id = `ff-${f.name}`;
        const bad = missing.has(f.name);
        const set = (v: Value) => setValues((prev) => ({ ...prev, [f.name]: v }));
        const optionText = (o: string) => f.option_labels?.[o] ?? optionLabel(o);
        const money = /(^|_)(price|amount|fee|cost)$/i.test(f.name);
        const label = (
          <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px]">
            <span className="font-medium text-ink-2">{t(fieldLabel(f))}{money && currency ? <span className="text-ink-3"> ({currency})</span> : null}</span>
            {bad ? <span className="ai-mono text-[11px] text-[var(--ai-text-bad)]">{t('needed')}</span>
              : !f.required ? <span className="ai-mono text-[11px] text-ink-3">{t('optional')}</span> : null}
          </label>
        );
        if (f.kind === 'boolean') {
          const on = values[f.name] === true;
          return (
            <div key={f.name} className="col-span-2 flex items-center justify-between gap-3 rounded-[12px] border border-line px-3.5 py-2.5">
              <span className="min-w-0">
                <span className="block text-[14px] text-ink-1">{t(fieldLabel(f))}</span>
                {f.hint ? <span className="block text-[12px] leading-snug text-ink-3">{f.hint}</span> : null}
              </span>
              <button type="button" role="switch" aria-checked={on} aria-label={fieldLabel(f)} disabled={disabled} onClick={() => set(!on)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-accent-fill' : 'bg-surface-3'}`}>
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
          );
        }
        if (f.kind === 'list' && f.options?.length) {
          // a fixed set (staff permissions): tap to toggle each one
          const picked = Array.isArray(values[f.name]) ? (values[f.name] as string[]) : [];
          return (
            <div key={f.name} className="col-span-2 min-w-0">
              {label}
              <div className="flex flex-wrap gap-1.5">
                {f.options.map((o) => {
                  const on = picked.includes(o);
                  return (
                    <button key={o} type="button" aria-pressed={on} disabled={disabled}
                      onClick={() => set(on ? picked.filter((x) => x !== o) : [...picked, o])}
                      className={`ai-tap rounded-full border px-3 py-1.5 text-[12.5px] transition-colors ${on ? 'border-accent/60 bg-accent-soft text-ink-1' : 'border-line-strong text-ink-3'}`}>
                      {on ? '✓ ' : ''}{optionText(o)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
        if (f.kind === 'password') {
          const visibleNow = !!shown[f.name];
          return (
            <div key={f.name} className="col-span-2 min-w-0 @md:col-span-1">
              {label}
              <div className="relative">
                <input id={id} disabled={disabled} value={String(values[f.name] ?? '')} onChange={(e) => set(e.target.value)}
                  type={visibleNow ? 'text' : 'password'} autoComplete="new-password" autoCapitalize="off" spellCheck={false}
                  className={`${field} pr-16 ${bad ? 'border-bad/60' : 'border-line-strong'}`} />
                <button type="button" onClick={() => setShown((s) => ({ ...s, [f.name]: !visibleNow }))}
                  className="ai-tap absolute inset-y-0 right-1 my-auto h-9 rounded-[9px] px-2.5 text-[12px] text-ink-3 hover:text-ink-1">
                  {visibleNow ? t('Hide') : t('Show')}
                </button>
              </div>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{t('Goes straight to your account. The assistant never sees it.')}</p>
            </div>
          );
        }
        return (
          <div key={f.name} className={`min-w-0 ${isShort(f) ? 'col-span-1' : f.kind === 'text' && (f.maxLength ?? 0) > 120 ? 'col-span-2' : 'col-span-2 @md:col-span-1'}`}>
            {label}
            {f.kind === 'select' ? (
              <select id={id} value={String(values[f.name] ?? '')} disabled={disabled} onChange={(e) => set(e.target.value)}
                className={`${field} appearance-none bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9 ${bad ? 'border-bad/60' : 'border-line-strong'}`}
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 12 8%27%3E%3Cpath d=%27M1 1.5l5 5 5-5%27 fill=%27none%27 stroke=%27%23888%27 stroke-width=%271.6%27/%3E%3C/svg%3E")' }}>
                <option value="">{t('Choose…')}</option>
                {(f.options ?? []).map((o) => <option key={o} value={o}>{optionText(o)}</option>)}
              </select>
            ) : (
              <input id={id} disabled={disabled} value={String(values[f.name] ?? '')} onChange={(e) => set(e.target.value)}
                type={f.kind === 'date' ? 'date' : f.kind === 'datetime' ? 'datetime-local' : 'text'}
                inputMode={f.kind === 'integer' ? 'numeric' : f.kind === 'number' ? 'decimal' : undefined}
                maxLength={f.maxLength} autoComplete="off" enterKeyHint="next"
                placeholder={f.name === 'speed' ? 'e.g. 5M/5M' : f.kind === 'list' ? t('Separate with commas') : f.kind === 'integer' || f.kind === 'number' ? '0' : ''}
                className={`${field} ${f.kind === 'integer' || f.kind === 'number' ? 'ai-mono' : ''} ${bad ? 'border-bad/60' : 'border-line-strong'}`} />
            )}
            {f.hint && f.kind !== 'select' ? <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{f.hint}</p> : null}
          </div>
        );
      })}
    </div>
    {extra.length > 2 && primary.size > 0 ? (
      <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more}
        className="ai-tap group mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-accent">
        <ArrowRightIcon width={12} height={12} className={`transition-transform ${more ? 'rotate-90' : ''}`} />
        {more ? t('Fewer options') : t('More options ({n})', { n: extra.length })}
      </button>
    ) : null}
    </>
  );
}

/**
 * A change the assistant proposes. Nothing runs until the person taps Confirm:
 * the card says in plain words what will happen and with which values.
 */
export default function ActionCard({ action, busy, readOnly, currency, onDecide }: {
  action: ActionCardData;
  busy: boolean;
  readOnly?: boolean;
  currency?: string | null;
  onDecide: (approve: boolean, values?: Record<string, unknown>) => void;
}) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  const form = action.form?.length ? action.form : null;
  const [values, setValues] = useState<Values>(() => (form ? initialValues(form) : {}));
  const [missing, setMissing] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (action.status !== 'pending') return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [action.status]);
  const expired = action.status === 'pending' && !!action.expires_at && new Date(action.expires_at).getTime() < now;
  const status: ActionStatus = expired ? 'expired' : action.status;
  const params = readable([...fields(action.query), ...fields(action.body)], currency);
  const danger = action.method === 'DELETE' || action.sensitive;
  const waiting = status === 'pending';
  const editing = !!form && waiting && !readOnly;
  // the server's word on the last try ("Please fix: 'price' is required")
  const refusal = waiting && action.detail ? action.detail : null;
  const confirm = () => {
    if (!form) { onDecide(true); return; }
    const empty = new Set(form.filter((f) => f.required && isEmpty(values[f.name])).map((f) => f.name));
    setMissing(empty);
    if (empty.size) return;
    onDecide(true, Object.fromEntries(form.map((f) => [f.name, values[f.name]])));
  };

  const badge: Record<ActionStatus, { label: string; cls: string; icon?: React.ReactNode }> = {
    pending: { label: t('Waiting for you'), cls: 'bg-accent-soft text-accent' },
    running: { label: t('Running…'), cls: 'bg-surface-3 text-ink-2', icon: <SpinnerIcon width={11} height={11} /> },
    done: { label: t('Done'), cls: 'bg-good/15 text-[var(--ai-text-good)]', icon: <CheckIcon width={11} height={11} /> },
    failed: { label: t('Failed'), cls: 'bg-bad/15 text-[var(--ai-text-bad)]', icon: <AlertIcon width={11} height={11} /> },
    declined: { label: t('Cancelled'), cls: 'bg-surface-3 text-ink-3' },
    expired: { label: t('Expired'), cls: 'bg-surface-3 text-ink-3' },
  };

  return (
    <section data-testid="assistant-action"
      className={`@container ai-card relative overflow-hidden ${waiting ? (danger ? '!border-bad/45' : '!border-accent/45') : ''}`}
      style={waiting ? { boxShadow: `inset 0 1px 0 var(--ai-edge), 0 0 0 4px ${danger ? 'color-mix(in srgb, var(--ai-bad) 10%, transparent)' : 'var(--ai-accent-soft)'}, var(--ai-shadow)` } : undefined}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${waiting ? (danger ? toneColor('bad') : 'var(--ai-accent-fill)') : status === 'done' ? toneColor('good') : status === 'failed' ? toneColor('bad') : 'var(--ai-s3)'}, transparent 85%)` }} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="ai-eyebrow">{waiting ? t('Needs your OK') : t('Change')} · {t(VERB[action.method] ?? 'Change')}</p>
            <p className="ai-display mt-1.5 break-words text-[16.5px] font-semibold leading-snug text-ink-1">{action.summary || action.title}</p>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${badge[status].cls}`}>
            {badge[status].icon}{badge[status].label}
          </span>
        </div>

        {editing ? (
          <FormFields form={form!} values={values} disabled={busy} currency={currency}
            setValues={(fn) => { setValues(fn); setMissing(new Set()); }} missing={missing} />
        ) : null}
        {editing && missing.size ? <p role="alert" className="mt-3 text-[13px] text-[var(--ai-text-bad)]">{t('Fill in the marked fields, then tap Confirm.')}</p> : null}
        {refusal && !missing.size ? <p role="alert" className="mt-3 break-words text-[13px] text-[var(--ai-text-bad)]">{refusal}</p> : null}

        {!form && params.length > 0 && (
          <dl className="ai-well mt-4 grid grid-cols-1 gap-x-8 px-3.5 py-1 text-[13px] @2xl:grid-cols-2">
            {params.slice(0, 24).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(7rem,40%)_1fr] gap-x-3 border-b border-line py-2 last:border-b-0">
                <dt className="text-ink-3">{k}</dt>
                <dd className="min-w-0 break-words text-ink-1">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {action.sensitive && waiting && (
          <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-bad/40 bg-bad/10 px-3 py-2 text-[13px] text-ink-1">
            <AlertIcon className="mt-0.5 shrink-0 text-bad" />
            {t('This moves money or changes where it goes. Check the amount and destination before you confirm.')}
          </p>
        )}

        {waiting && !readOnly && (
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={busy} onClick={confirm}
              className={`ai-btn ${danger ? 'ai-btn-danger' : 'ai-btn-primary'} min-h-[44px] flex-1 px-6 text-[14px] @md:flex-none`}>
              {t('Confirm')}
            </button>
            <button type="button" disabled={busy} onClick={() => onDecide(false)} className="ai-btn ai-btn-ghost min-h-[44px] flex-1 px-5 text-[14px] @md:flex-none">
              {t('Cancel')}
            </button>
          </div>
        )}
        {waiting && readOnly && <p className="mt-3 text-[12.5px] text-ink-3">{t('View-as is read-only: changes are disabled.')}</p>}

        {status === 'failed' && action.detail && <p className="mt-3 break-words text-[13px] text-[var(--ai-text-bad)]">{action.detail}</p>}
        {status === 'expired' && <p className="mt-3 text-[12.5px] text-ink-3">{t('Not run. Ask again if you still want this.')}</p>}

        <p className="ai-mono mt-3 break-all text-[11px] text-ink-3"><span className="text-ink-2">{action.method}</span> {action.path} · {action.title}</p>
      </div>
      {status === 'done' && action.payload !== undefined && action.payload !== null && (
        <div className="border-t border-line bg-surface-2/40 p-3 sm:p-4">
          <ResultBlock title={t('Result')} payload={action.payload} currency={currency} />
        </div>
      )}
    </section>
  );
}
