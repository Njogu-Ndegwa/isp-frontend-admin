'use client';

import { useEffect, useState } from 'react';
import { formatValue, humanizeKey } from '../lib/assistantView';
import { assistantApi, fieldApplies, fieldSpans, setChanges, smsSegments, type ActionStatus, type FormField, type PaymentWait, type PickSource } from '../lib/assistant';
import MediaUploadField from '../ads/components/MediaUploadField';
import { PreviewFor, previewKind } from './blocks/Previews';
import dynamic from 'next/dynamic';
import { THEME_PALETTES } from '../lib/portalThemes';
import { planDuration, planSpeed } from '../lib/assistantEntities';
import { formatMoney } from '../lib/format';
import { useT } from '../lib/i18n';
import ResultBlock from './blocks/ResultBlock';
import { RouterSetupBlock, isRouterSetup } from './blocks/RouterSetupBlock';
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
  /** a payment it only started: the card waits for the PIN instead of saying Done */
  awaiting?: PaymentWait;
  /** the first Confirm shows what it would do (who gets credited, what the router check found) */
  previews?: boolean;
  preview?: unknown;
  preview_of?: string;
  /** the same change again, past the API's refusal: "Do it anyway" */
  retry_of?: string;
  reason?: string;
}

const POLL_MS = 5000;
const GIVE_UP_MS = 3 * 60_000;

/**
 * An M-Pesa payment after Confirm: the PIN prompt is on the phone, nothing is paid yet.
 * Checks the payment every few seconds (as the classic Buy SMS window does) and says
 * when it is paid or not; after a few minutes it stops and offers to check again.
 */
export type PaymentOutcome = 'pending' | 'completed' | 'failed';

function PaymentWaitNote({ wait, onOutcome }: { wait: PaymentWait; onOutcome?: (o: PaymentOutcome) => void }) {
  const t = useT();
  const [state, setState] = useState<{ status: string; summary: string } | null>(null);
  const [round, setRound] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    let on = true;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      try {
        const s = await assistantApi.paymentStatus(wait.poll);
        if (!on) return;
        setState({ status: s.paid ? 'completed' : s.status, summary: s.summary });
        // the card's badge and edge follow the money, not the Confirm
        if (s.paid) { onOutcome?.('completed'); return; }
        if (s.status === 'failed') { onOutcome?.('failed'); return; }
      } catch { /* a missed check is retried */ }
      if (!on) return;
      if (Date.now() - started > GIVE_UP_MS) { setGaveUp(true); return; }
      timer = setTimeout(check, POLL_MS);
    };
    void check();
    return () => { on = false; if (timer) clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onOutcome is a setter from the card
  }, [wait.poll, round]);

  const status = state?.status ?? 'pending';
  if (status === 'completed') {
    return <p role="status" className="mt-3 flex items-center gap-2 rounded-[10px] border border-good/30 bg-good/10 px-3 py-2.5 text-[13.5px] text-ink-1"><CheckIcon className="shrink-0 text-[var(--ai-text-good)]" />{state?.summary || t('Paid.')}</p>;
  }
  if (status === 'failed') {
    return <p role="status" className="mt-3 flex items-start gap-2 rounded-[10px] border border-bad/30 bg-bad/10 px-3 py-2.5 text-[13.5px] text-ink-1"><AlertIcon className="mt-0.5 shrink-0 text-[var(--ai-text-bad)]" />{state?.summary || t('Not paid.')}</p>;
  }
  return (
    <div role="status" className="mt-3 rounded-[10px] border border-accent/30 bg-accent-soft px-3 py-2.5 text-[13.5px] text-ink-1">
      <p className="m-0 flex items-start gap-2">{gaveUp ? <AlertIcon className="mt-0.5 shrink-0 text-accent" /> : <SpinnerIcon className="mt-0.5 shrink-0 text-accent" />}
        <span>{gaveUp ? t('Not paid yet. If you entered the PIN, it can take a minute to show.') : wait.message}</span></p>
      {gaveUp ? <button type="button" className="ai-chip mt-2 !py-1.5 text-[12.5px] font-medium" onClick={() => { setGaveUp(false); setRound((r) => r + 1); }}>{t('Check again')}</button>
        : <p className="m-0 mt-1 pl-6 text-[12px] text-ink-3">{t('This updates by itself once it is paid.')}</p>}
    </div>
  );
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
const WORDS: Record<string, string> = { pppoe: 'PPPoE', ip: 'IP', mpesa: 'M-Pesa', sms: 'SMS', mtn: 'MTN', momo: 'MoMo', api: 'API', zenopay: 'ZenoPay', mac: 'MAC', url: 'URL', id: 'ID', mb: 'MB', fup: 'FUP' };

function optionLabel(o: string): string {
  const words = o.toLowerCase().split('_').map((w) => WORDS[w] ?? w).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}


/** A friendlier name for a field than its key: "duration_value" -> "Duration", "speed" -> "Speed (e.g. 5M/5M)". */
function fieldLabel(f: FormField): string {
  const names: Record<string, string> = {
    duration_value: 'Duration', duration_unit: 'Unit', connection_type: 'Type', price: 'Price',
    max_devices: 'Devices per purchase', is_hidden: 'Hide from the portal', badge_text: 'Badge',
    max_shared_users: 'Devices per purchase', data_cap_mb: 'Data cap (MB)', fup_action: 'After the cap',
    fup_throttle_profile: 'Slow speed after the cap (e.g. 1M/1M)', fup_period: 'Cap resets',
    original_price: 'Was price', trial_once_per_customer: 'Once per customer', method_type: 'Kind',
    alt_phone: 'Other phone', mtn_target_environment: 'MTN environment',
    header_bg_image_url: 'Header photo', company_logo_url: 'Logo', color_theme: 'Colours', header_style: 'Header style',
    portal_support_phone: 'Support phone', portal_support_whatsapp: 'Support WhatsApp', image_url: 'Photo', video_url: 'Video',
    poster_url: 'Video cover photo',
  };
  if (names[f.name]) return names[f.name];
  // a picker of records reads as the record ("Plan", not "Plan id"); known words keep their spelling
  const words = (f.option_labels ? f.name.replace(/_ids?$/, '') : f.name).split('_').map((w) => WORDS[w] ?? w).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
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

// the map loads only when a form has a place to pick (Leaflet needs the browser)
const LocationPicker = dynamic(() => import('./LocationPicker'), { ssr: false, loading: () => <div className="h-[260px] rounded-[14px] bg-surface-2" /> });

/** What a person fills in first: required fields and anything already filled; the rest waits under More options. */
const isPrimary = (f: FormField, v: Value | undefined) =>
  f.required || f.kind === 'password' || (!f.default && (f.kind === 'boolean' ? v === true : !isEmpty(v)));

const FIELD = 'w-full min-w-0 rounded-[12px] border bg-[var(--ai-bg)] px-3.5 py-2.5 text-[16px] text-ink-1 outline-none transition-colors placeholder:text-ink-3 focus:border-accent/70 focus:shadow-[0_0_0_3px_var(--ai-accent-soft)] disabled:opacity-60';

/**
 * Find one of the person's own records by typing (a customer among thousands): the
 * records already listed are filtered at once, and after two letters the list's own
 * search is asked too. Each result is a thumb-sized row; tapping one picks it.
 */
function RecordSearch({ pick, known, picked, onPick, disabled, inputId }: {
  pick: PickSource;
  known: Record<string, string>;
  picked: string[];
  onPick: (id: string, label: string) => void;
  disabled: boolean;
  inputId: string;
}) {
  const t = useT();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<{ id: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const query = q.trim();
  useEffect(() => {
    if (!pick.search || query.length < 2) return;
    let on = true;
    const timer = setTimeout(() => {
      setBusy(true);
      assistantApi.pickSearch(pick, query)
        .then((rows) => { if (on) setFound(rows); })
        .catch(() => { if (on) setFound([]); })
        .finally(() => { if (on) setBusy(false); });
    }, 300);
    return () => { on = false; clearTimeout(timer); };
  }, [pick, query]);
  const local = query
    ? Object.entries(known).filter(([, label]) => label.toLowerCase().includes(query.toLowerCase())).map(([id, label]) => ({ id, label }))
    : [];
  const remote = pick.search && query.length >= 2 ? found : [];
  const rows = [...local, ...remote.filter((r) => !local.some((l) => l.id === r.id))].slice(0, 8);
  return (
    <div className="min-w-0">
      <input id={inputId} type="search" value={q} disabled={disabled} onChange={(e) => setQ(e.target.value)}
        placeholder={t('Search by name or phone')} autoComplete="off" enterKeyHint="search"
        className={`${FIELD} border-line-strong`} />
      {query ? (
        <ul className="mt-1.5 overflow-hidden rounded-[12px] border border-line">
          {rows.map((r) => {
            const on = picked.includes(r.id);
            return (
              <li key={r.id} className="border-b border-line last:border-b-0">
                <button type="button" disabled={disabled} onClick={() => { onPick(r.id, r.label); setQ(''); }}
                  className={`ai-tap flex min-h-[44px] w-full items-center gap-2 px-3.5 py-2 text-left text-[14px] ${on ? 'bg-accent-soft text-ink-1' : 'text-ink-2 hover:bg-surface-2'}`}>
                  {on ? <CheckIcon width={13} height={13} className="shrink-0 text-accent" /> : null}
                  <span className="min-w-0 truncate">{r.label}</span>
                </button>
              </li>
            );
          })}
          {!rows.length ? <li className="px-3.5 py-2.5 text-[13px] text-ink-3">{busy ? t('Searching…') : query.length < 2 ? t('Type a little more…') : t('No match.')}</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

/** The SMS count under a message: how long it is and how many SMS each person gets. */
function SmsCount({ text }: { text: string }) {
  const t = useT();
  const { chars, segments, unicode } = smsSegments(text);
  if (!chars) return null;
  return (
    <p className="mt-1 text-[11.5px] leading-snug text-ink-3">
      {t('{chars} characters · {n} SMS per person', { chars, n: segments })}
      {unicode ? ` · ${t('emoji or special letters make each SMS shorter')}` : ''}
    </p>
  );
}

/** Example values for inputs that hold one kind of thing. */
const FORMAT_PLACEHOLDER: Record<string, string> = { mac: 'AA:BB:CC:DD:EE:FF', ip: 'e.g. 172.16.4.20', phone: 'e.g. 0712 345 678' };

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
  const [uploadsOff, setUploadsOff] = useState(false);  // storage not set up: every upload field offers a link instead
  // decided once from the first values, so a field does not jump away while it is being typed in
  const [primary] = useState(() => new Set(form.filter((f) => isPrimary(f, values[f.name])).map((f) => f.name)));
  const live = form.filter((f) => fieldApplies(f, values, form));
  // a field that belongs to the chosen kind (a static IP for a static plan) is the point of choosing it: always shown
  // so is a choice other fields hang on (photo or video): the person may want to switch it
  const deciders = new Set(form.flatMap((f) => Object.keys(f.when ?? {}).map((c) => c.split('.')[0])));
  const first = (f: FormField) => primary.has(f.name) || !!f.when || deciders.has(f.name) || !!f.geo;
  const extra = live.filter((f) => !first(f));
  const visible = more || primary.size === 0 || extra.length <= 2 ? live : live.filter(first);
  const spans = fieldSpans(visible);
  const field = FIELD;
  // records found by search, by field: named on screen once picked
  const [learned, setLearned] = useState<Record<string, Record<string, string>>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  return (
    <>
    <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3.5">
      {visible.map((f) => {
        const id = `ff-${f.name}`;
        const bad = missing.has(f.name);
        const set = (v: Value) => setValues((prev) => ({ ...prev, [f.name]: v }));
        const labels = { ...(f.option_labels ?? {}), ...(learned[f.name] ?? {}) };
        const optionText = (o: string) => labels[o] ?? optionLabel(o);
        const learn = (o: string, text: string) => setLearned((l) => ({ ...l, [f.name]: { ...(l[f.name] ?? {}), [o]: text } }));
        const money = /(^|_)(price|amount|fee|cost)$/i.test(f.name);
        const unit = money && currency ? currency : f.kind === 'datetime' && f.zone ? f.zone : null;
        const label = (
          <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px]">
            <span className="font-medium text-ink-2">{t(fieldLabel(f))}{unit ? <span className="text-ink-3"> ({unit})</span> : null}</span>
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
              {/* a thumb-sized tap area around the track, the knob anchored inside it */}
              <button type="button" role="switch" aria-checked={on} aria-label={fieldLabel(f)} disabled={disabled} onClick={() => set(!on)}
                className="-mr-1 flex h-10 w-14 shrink-0 items-center justify-center rounded-full disabled:opacity-60">
                <span className={`relative block h-7 w-12 rounded-full transition-colors ${on ? 'bg-accent-fill' : 'bg-surface-3'}`}>
                  <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
                </span>
              </button>
            </div>
          );
        }
        if (f.kind === 'list' && (f.options?.length || f.pick?.search)) {
          // a set to tick (staff permissions, a router's ports, the customers who get an SMS): tap to toggle each one
          const picked = Array.isArray(values[f.name]) ? (values[f.name] as string[]) : [];
          const all = [...(f.options ?? []), ...picked.filter((p) => !(f.options ?? []).includes(p))];
          const filter = (filters[f.name] ?? '').trim().toLowerCase();
          const shownOptions = filter ? all.filter((o) => picked.includes(o) || optionText(o).toLowerCase().includes(filter)) : all;
          return (
            <div key={f.name} className="col-span-2 min-w-0">
              {label}
              {all.length > 10 && !f.pick?.search ? (
                <input type="search" aria-label={t('Filter')} value={filters[f.name] ?? ''} disabled={disabled}
                  onChange={(e) => setFilters((v) => ({ ...v, [f.name]: e.target.value }))}
                  placeholder={t('Filter')} className={`${field} mb-2 border-line-strong`} />
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {shownOptions.map((o) => {
                  const on = picked.includes(o);
                  const order = f.ordered && on ? picked.indexOf(o) + 1 : null;
                  return (
                    <button key={o} type="button" aria-pressed={on} disabled={disabled}
                      onClick={() => set(on ? picked.filter((x) => x !== o) : [...picked, o])}
                      className={`ai-tap inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${on ? 'border-accent/60 bg-accent-soft text-ink-1' : 'border-line-strong text-ink-3'}`}>
                      {order ? <span className="ai-mono rounded-full bg-accent-fill px-1.5 text-[11px] font-semibold text-white">{order}</span> : on ? '✓ ' : ''}{optionText(o)}
                    </button>
                  );
                })}
              </div>
              {f.pick?.search ? (
                <div className="mt-2">
                  <RecordSearch pick={f.pick} known={labels} picked={picked} disabled={disabled} inputId={id}
                    onPick={(o, text) => { learn(o, text); set(picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o]); }} />
                </div>
              ) : null}
              {f.ordered ? <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{t('Tap in order: the first is number 1.')}</p> : null}
              {f.hint && !f.ordered ? <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{f.hint}</p> : null}
            </div>
          );
        }
        if (f.kind === 'select' && f.pick?.search) {
          // one record among many (a customer): the chosen one, and a search to change it
          const now = String(values[f.name] ?? '');
          return (
            <div key={f.name} className="col-span-2 min-w-0">
              {label}
              {now ? (
                <p className={`mb-2 flex min-h-[44px] items-center gap-2 rounded-[12px] border px-3.5 py-2 text-[14px] text-ink-1 ${bad ? 'border-bad/60' : 'border-accent/50 bg-accent-soft'}`}>
                  <CheckIcon width={13} height={13} className="shrink-0 text-accent" /><span className="min-w-0 truncate">{optionText(now)}</span>
                </p>
              ) : null}
              <RecordSearch pick={f.pick} known={labels} picked={now ? [now] : []} disabled={disabled} inputId={id}
                onPick={(o, text) => { learn(o, text); set(o); }} />
            </div>
          );
        }
        if (f.geo) {
          // the latitude draws the map for both; the longitude has nothing of its own to draw
          const other = form.find((g) => g.geo && g.geo !== f.geo);
          if (f.geo === 'lng' && other) return null;
          const latName = f.geo === 'lat' ? f.name : other?.name;
          const lngName = f.geo === 'lng' ? f.name : other?.name;
          const lat = Number(values[latName ?? '']);
          const lng = Number(values[lngName ?? '']);
          const has = latName && lngName && values[latName] !== '' && values[latName] != null && Number.isFinite(lat) && Number.isFinite(lng);
          return (
            <div key={f.name} className="col-span-2 min-w-0">
              <LocationPicker label={t('Location on the map')} disabled={disabled} value={has ? { lat, lng } : null}
                onChange={(p) => setValues((v) => ({ ...v, [latName ?? f.name]: p ? String(p.lat) : '', ...(lngName ? { [lngName]: p ? String(p.lng) : '' } : {}) }))} />
            </div>
          );
        }
        if (f.upload) {
          // the dashboard's own uploader: pick a photo or video, it goes straight to storage, its address is the value
          const now = String(values[f.name] ?? '');
          const presets = f.presets ?? [];
          const ownPhoto = presets.some((p) => p.value === now) ? '' : now;
          const uploader = (
            <MediaUploadField kind={(f.upload.accept ?? '').startsWith('video') ? 'video' : 'image'} inputId={id}
              label={presets.length ? t('Or upload your own photo') : t(fieldLabel(f))} value={presets.length ? ownPhoto : now}
              onChange={(url) => set(url || (presets.length ? presets[0].value : ''))}
              required={f.required && !presets.length} error={bad ? t('needed') : undefined}
              uploadsOff={uploadsOff} onUploadsOff={() => setUploadsOff(true)} />
          );
          if (!presets.length) return <div key={f.name} className="col-span-2 min-w-0">{uploader}</div>;
          // built-in photos to tap, then their own: whichever was picked last is the one used
          return (
            <div key={f.name} className="col-span-2 min-w-0">
              {label}
              <div role="radiogroup" aria-label={fieldLabel(f)} className="grid grid-cols-3 gap-2 @md:grid-cols-5">
                {presets.map((p) => {
                  const on = now === p.value;
                  return (
                    <button key={p.value} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => set(p.value)}
                      className={`ai-tap group min-w-0 overflow-hidden rounded-[12px] border p-1 text-left transition-colors ${on ? 'border-accent bg-accent-soft' : 'border-line-strong hover:border-ink-3'}`}>
                      <span aria-hidden className="block h-14 w-full rounded-[8px] bg-surface-3 bg-cover bg-center" style={{ backgroundImage: `url("${p.value}")` }} />
                      <span className={`mt-1 flex items-center gap-1 px-1 pb-0.5 text-[12px] ${on ? 'font-semibold text-ink-1' : 'text-ink-2'}`}>
                        {on ? <CheckIcon width={12} height={12} className="shrink-0 text-accent" /> : null}<span className="truncate">{t(p.label)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3">{uploader}</div>
            </div>
          );
        }
        if (f.kind === 'password') {
          const visibleNow = !!shown[f.name];
          return (
            <div key={f.name} className={`min-w-0 ${spans[f.name] ?? 'col-span-2'}`}>
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
        // a choice of colour themes: swatches in each theme's own colours, not names in a list
        const swatches = f.kind === 'select' && (f.options?.length ?? 0) > 1 && (f.options ?? []).every((o) => o in THEME_PALETTES);
        if (swatches) {
          return (
            <div key={f.name} className="col-span-2 min-w-0">
              {label}
              <div role="radiogroup" aria-label={fieldLabel(f)} className="grid grid-cols-2 gap-2 @md:grid-cols-3 @2xl:grid-cols-4">
                {(f.options ?? []).map((o) => {
                  const p = THEME_PALETTES[o as keyof typeof THEME_PALETTES];
                  const on = values[f.name] === o;
                  return (
                    <button key={o} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => set(o)}
                      className={`ai-tap flex min-w-0 items-center gap-2 rounded-[12px] border px-2.5 py-2 text-left text-[12.5px] transition-colors ${on ? 'border-accent bg-accent-soft text-ink-1' : 'border-line-strong text-ink-2 hover:border-ink-3'}`}>
                      <span aria-hidden className="h-6 w-6 shrink-0 rounded-full border border-black/10"
                        style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.primaryDark})` }} />
                      <span className="min-w-0 truncate">{optionText(o)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
        return (
          <div key={f.name} className={`min-w-0 ${spans[f.name] ?? 'col-span-2'}`}>
            {label}
            {f.kind === 'select' ? (
              <select id={id} value={String(values[f.name] ?? '')} disabled={disabled} onChange={(e) => set(e.target.value)}
                className={`${field} appearance-none bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9 ${bad ? 'border-bad/60' : 'border-line-strong'}`}
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 12 8%27%3E%3Cpath d=%27M1 1.5l5 5 5-5%27 fill=%27none%27 stroke=%27%23888%27 stroke-width=%271.6%27/%3E%3C/svg%3E")' }}>
                <option value="">{t('Choose…')}</option>
                {(f.options ?? []).map((o) => <option key={o} value={o}>{optionText(o)}</option>)}
              </select>
            ) : f.multiline ? (
              <textarea id={id} disabled={disabled} value={String(values[f.name] ?? '')} onChange={(e) => set(e.target.value)}
                maxLength={f.maxLength} rows={f.sms ? 4 : 3} enterKeyHint="enter"
                className={`${field} min-h-[96px] resize-y leading-snug ${bad ? 'border-bad/60' : 'border-line-strong'}`} />
            ) : (
              <input id={id} disabled={disabled} value={String(values[f.name] ?? '')} onChange={(e) => set(e.target.value)}
                type={f.kind === 'date' ? 'date' : f.kind === 'datetime' ? 'datetime-local' : f.format === 'phone' ? 'tel' : 'text'}
                inputMode={f.kind === 'integer' ? 'numeric' : f.kind === 'number' || f.format === 'ip' ? 'decimal' : f.format === 'phone' ? 'tel' : undefined}
                maxLength={f.maxLength} autoComplete={f.format === 'phone' ? 'tel' : 'off'} enterKeyHint="next"
                autoCapitalize={f.format === 'mac' ? 'characters' : f.format ? 'off' : undefined} spellCheck={f.format ? false : undefined}
                placeholder={f.name === 'speed' ? 'e.g. 5M/5M' : f.format ? t(FORMAT_PLACEHOLDER[f.format]) : f.kind === 'list' ? t('Separate with commas') : f.kind === 'integer' || f.kind === 'number' ? '0' : ''}
                className={`${field} ${f.kind === 'integer' || f.kind === 'number' || f.format === 'mac' || f.format === 'ip' ? 'ai-mono' : ''} ${bad ? 'border-bad/60' : 'border-line-strong'}`} />
            )}
            {f.sms ? <SmsCount text={String(values[f.name] ?? '')} /> : null}
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
  // a payment started by Confirm: what M-Pesa said since (the badge reads it, not the Confirm)
  const [paid, setPaid] = useState<PaymentOutcome>('pending');
  // what the card opened with: a field nobody filled in and the person did not touch is not sent,
  // so an edit never switches off or clears what it did not show a value for
  const [opened] = useState<Values>(() => (form ? initialValues(form) : {}));
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
    const live = form.filter((f) => fieldApplies(f, values, form));  // another kind's fields are not sent
    const sent = live.filter((f) => f.value !== undefined || JSON.stringify(values[f.name]) !== JSON.stringify(opened[f.name]));
    const empty = new Set(live.filter((f) => f.required && isEmpty(values[f.name])).map((f) => f.name));
    setMissing(empty);
    if (empty.size) return;
    onDecide(true, Object.fromEntries(sent.map((f) => {
      const v = values[f.name];
      // a set the router has now (its PPPoE ports): only what was ticked and unticked is sent
      if (f.changes && f.baseline && Array.isArray(v)) return [f.name, setChanges(f.baseline, v)];
      return [f.name, v];
    })));
  };
  // a change that can be previewed: the first Confirm shows what it would do, the next one does it
  const valuesNow = JSON.stringify(values);
  // the form as it was when a preview arrived: an edit after it makes the preview out of date
  const [previewedAt, setPreviewedAt] = useState<{ of: string; values: string } | null>(null);
  if (action.preview_of && previewedAt?.of !== action.preview_of) setPreviewedAt({ of: action.preview_of, values: valuesNow });
  const previewed = !!action.preview_of && (!form || (previewedAt?.of === action.preview_of && previewedAt.values === valuesNow));
  const confirmLabel = action.retry_of ? t('Do it anyway')
    : action.previews ? (previewed ? t('Apply') : action.preview_of ? t('Check again') : t('Preview'))
      : t('Confirm');

  const paidLabel = paid === 'completed'
    ? { label: t('Paid'), cls: 'bg-good/15 text-[var(--ai-text-good)]', icon: <CheckIcon width={11} height={11} /> }
    : paid === 'failed'
      ? { label: t('Not paid'), cls: 'bg-bad/15 text-[var(--ai-text-bad)]', icon: <AlertIcon width={11} height={11} /> }
      : { label: t('Check your phone'), cls: 'bg-accent-soft text-accent', icon: <SpinnerIcon width={11} height={11} /> };
  const edge = status === 'done' && action.awaiting
    ? (paid === 'completed' ? toneColor('good') : paid === 'failed' ? toneColor('bad') : 'var(--ai-accent-fill)')
    : null;
  const badge: Record<ActionStatus, { label: string; cls: string; icon?: React.ReactNode }> = {
    pending: { label: t('Waiting for you'), cls: 'bg-accent-soft text-accent' },
    running: { label: t('Running…'), cls: 'bg-surface-3 text-ink-2', icon: <SpinnerIcon width={11} height={11} /> },
    done: action.awaiting
      ? paidLabel
      : { label: t('Done'), cls: 'bg-good/15 text-[var(--ai-text-good)]', icon: <CheckIcon width={11} height={11} /> },
    failed: { label: t('Failed'), cls: 'bg-bad/15 text-[var(--ai-text-bad)]', icon: <AlertIcon width={11} height={11} /> },
    declined: { label: t('Cancelled'), cls: 'bg-surface-3 text-ink-3' },
    expired: { label: t('Expired'), cls: 'bg-surface-3 text-ink-3' },
  };

  return (
    <section data-testid="assistant-action"
      className={`@container ai-card relative overflow-hidden ${waiting ? (danger ? '!border-bad/45' : '!border-accent/45') : ''}`}
      style={waiting ? { boxShadow: `inset 0 1px 0 var(--ai-edge), 0 0 0 4px ${danger ? 'color-mix(in srgb, var(--ai-bad) 10%, transparent)' : 'var(--ai-accent-soft)'}, var(--ai-shadow)` } : undefined}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${edge ?? (waiting ? (danger ? toneColor('bad') : 'var(--ai-accent-fill)') : status === 'done' ? toneColor('good') : status === 'failed' ? toneColor('bad') : 'var(--ai-s3)')}, transparent 85%)` }} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="ai-eyebrow">{action.retry_of ? t('Do it anyway?') : waiting ? t('Needs your OK') : t('Change')} · {t(VERB[action.method] ?? 'Change')}</p>
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
        {/* the login page or the ad as customers will see it: follows the form while it is filled in, stays after Confirm */}
        {form && previewKind(form.map((f) => f.name)) && status !== 'declined' && status !== 'expired' ? (
          <PreviewFor values={Object.fromEntries(form.filter((f) => fieldApplies(f, values, form)).map((f) => [f.name, values[f.name]]))} />
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

        {action.retry_of && action.reason && waiting ? (
          <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-bad/40 bg-bad/10 px-3 py-2 text-[13px] text-ink-1">
            <AlertIcon className="mt-0.5 shrink-0 text-bad" />
            <span><span className="font-semibold">{t('It was refused:')}</span> {action.reason} {t('Tap Do it anyway only if you are sure.')}</span>
          </p>
        ) : null}

        {waiting && action.preview !== undefined && action.preview !== null ? (
          <div className="mt-4 overflow-hidden rounded-[12px] border border-line bg-surface-2/40 p-3">
            <ResultBlock title={t('What it will do')} payload={action.preview} currency={currency} />
            <p className="mt-2 text-[12.5px] text-ink-3">
              {previewed ? t('Nothing has changed yet. Tap Apply to do it.') : t('You changed the form: tap Check again to see the new result.')}
            </p>
          </div>
        ) : null}
        {waiting && action.previews && !action.preview_of && !readOnly ? (
          <p className="mt-3 text-[12.5px] text-ink-3">{t('Preview shows what it will do first. Nothing changes until you tap Apply.')}</p>
        ) : null}

        {action.sensitive && waiting && !action.retry_of && (
          <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-bad/40 bg-bad/10 px-3 py-2 text-[13px] text-ink-1">
            <AlertIcon className="mt-0.5 shrink-0 text-bad" />
            {t('This moves money or changes where it goes. Check the amount and destination before you confirm.')}
          </p>
        )}

        {waiting && !readOnly && (
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={busy} onClick={confirm}
              className={`ai-btn ${danger ? 'ai-btn-danger' : 'ai-btn-primary'} min-h-[44px] flex-1 px-6 text-[14px] @md:flex-none`}>
              {confirmLabel}
            </button>
            <button type="button" disabled={busy} onClick={() => onDecide(false)} className="ai-btn ai-btn-ghost min-h-[44px] flex-1 px-5 text-[14px] @md:flex-none">
              {t('Cancel')}
            </button>
          </div>
        )}
        {waiting && readOnly && <p className="mt-3 text-[12.5px] text-ink-3">{t('View-as is read-only: changes are disabled.')}</p>}

        {status === 'failed' && action.detail && <p className="mt-3 break-words text-[13px] text-[var(--ai-text-bad)]">{action.detail}</p>}
        {status === 'expired' && <p className="mt-3 text-[12.5px] text-ink-3">{t('Not run. Ask again if you still want this.')}</p>}

        {status === 'done' && action.awaiting ? <PaymentWaitNote wait={action.awaiting} onOutcome={setPaid} /> : null}
      </div>
      {status === 'done' && isRouterSetup(action.payload) ? (
        <div className="border-t border-line bg-surface-2/40 p-3 sm:p-4"><RouterSetupBlock setup={action.payload} /></div>
      ) : null}
      {status === 'done' && !action.awaiting && !isRouterSetup(action.payload) && action.payload !== undefined && action.payload !== null && (
        <div className="border-t border-line bg-surface-2/40 p-3 sm:p-4">
          <ResultBlock title={t('Result')} payload={action.payload} currency={currency} />
        </div>
      )}
    </section>
  );
}
