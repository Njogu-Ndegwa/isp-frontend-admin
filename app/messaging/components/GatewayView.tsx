'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../../lib/api';
import {
  SmsProviderSpec,
  SmsProviderField,
  SmsProviderAccount,
  SmsEffectiveGateway,
} from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import { PageLoader } from '../../components/LoadingSpinner';
import FilterSelect from '../../components/FilterSelect';

// ─── SMS gateway ───────────────────────────────────────────────────────────
// Two choices, in this order:
//   1. platform gateway (nothing to configure) or your own
//   2. if your own: which provider, then its fields
//
// The field list per provider is NOT hardcoded here. It comes from
// GET /messaging/providers, so a gateway added on the backend shows up in
// this form with no frontend change.
//
// Switching back to the platform gateway deactivates the account rather than
// deleting it, so saved credentials survive and switching back is one click.

interface GatewayViewProps {
  /** Admin variant talks to the /admin endpoints and can target a reseller. */
  admin?: boolean;
  /** Admin only: whose gateway to manage. Omit for the platform's own. */
  targetUserId?: number | null;
}

type Mode = 'platform' | 'own';

export function GatewayView({ admin = false, targetUserId }: GatewayViewProps) {
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specs, setSpecs] = useState<SmsProviderSpec[]>([]);
  const [accounts, setAccounts] = useState<SmsProviderAccount[]>([]);
  const [effective, setEffective] = useState<SmsEffectiveGateway | null>(null);
  const [selfService, setSelfService] = useState(true);

  const [mode, setMode] = useState<Mode>('platform');
  const [providerName, setProviderName] = useState('');
  const [senderId, setSenderId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);

  const spec = useMemo(
    () => specs.find((s) => s.name === providerName) ?? null,
    [specs, providerName],
  );
  const activeAccount = useMemo(
    () => accounts.find((a) => a.is_active) ?? null,
    [accounts],
  );
  // Fields with a working default are secondary — most accounts never touch
  // them, but they must stay reachable because some deployments differ.
  const [mainFields, advancedFields] = useMemo<[SmsProviderField[], SmsProviderField[]]>(() => {
    if (!spec) return [[], []];
    const advanced = spec.fields.filter(
      (f) => f.default !== '' && !f.secret && f.key !== 'base_url',
    );
    return [spec.fields.filter((f) => !advanced.includes(f)), advanced];
  }, [spec]);

  const defaultsFor = (s: SmsProviderSpec | null): Record<string, string> => {
    const out: Record<string, string> = {};
    (s?.fields ?? []).forEach((f) => { out[f.key] = f.default; });
    return out;
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (admin) {
        const [{ providers }, { accounts: rows }] = await Promise.all([
          api.getAdminSmsProviders(),
          api.getAdminSmsProviderAccounts(
            targetUserId == null ? { scope: 'platform' } : { user_id: targetUserId },
          ),
        ]);
        setSpecs(providers);
        setAccounts(rows);
        setEffective(null);
        setSelfService(true);
      } else {
        const data = await api.getSmsProviderAccounts();
        const { providers } = await api.getSmsProviders();
        setSpecs(providers);
        setAccounts(data.accounts);
        setEffective(data.effective);
        setSelfService(data.self_service_enabled);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SMS gateways');
    } finally {
      setLoading(false);
    }
  }, [admin, targetUserId]);

  useEffect(() => { load(); }, [load]);

  // Seed the form from whatever is configured, once loaded.
  useEffect(() => {
    if (loading) return;
    const current = accounts.find((a) => a.is_active) ?? null;
    if (current) {
      setMode('own');
      setProviderName(current.provider);
      setSenderId(current.sender_id ?? '');
      const s = specs.find((x) => x.name === current.provider) ?? null;
      const seeded = defaultsFor(s);
      Object.entries(current.credentials ?? {}).forEach(([k, v]) => {
        // Secrets come back masked; leave them blank so an untouched save
        // keeps the stored value rather than writing the mask back.
        const field = s?.fields.find((f) => f.key === k);
        if (field && !field.secret && v != null) seeded[k] = v;
      });
      setValues(seeded);
    } else {
      setMode('platform');
      const first = specs[0]?.name ?? '';
      setProviderName(first);
      setValues(defaultsFor(specs.find((x) => x.name === first) ?? null));
    }
  }, [loading, accounts, specs]);

  const pickProvider = (name: string) => {
    setProviderName(name);
    setValues(defaultsFor(specs.find((s) => s.name === name) ?? null));
    setShowSecret({});
  };

  const useOurs = async () => {
    if (!activeAccount) { setMode('platform'); return; }
    try {
      setSaving(true);
      if (admin) await api.deactivateAdminSmsProviderAccount(activeAccount.id);
      else await api.deactivateSmsProviderAccount(activeAccount.id);
      showAlert('success', 'Switched to the platform gateway');
      setMode('platform');
      await load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Could not switch gateway');
    } finally {
      setSaving(false);
    }
  };

  const missingRequired = (): string | null => {
    if (!spec) return 'Choose a provider first';
    for (const f of spec.fields) {
      if (!f.required) continue;
      const given = (values[f.key] ?? '').trim();
      // An existing secret may stay blank — the backend keeps the stored one.
      const alreadyStored = Boolean(activeAccount?.credentials?.[f.key]);
      if (!given && !(f.secret && alreadyStored)) return `${f.label} is required`;
    }
    return null;
  };

  const save = async () => {
    const problem = missingRequired();
    if (problem) { showAlert('error', problem); return; }
    const payload = {
      label: spec ? `${spec.label} gateway` : 'SMS gateway',
      sender_id: senderId.trim() || null,
      // Blank secrets are omitted so they keep their stored value.
      credentials: Object.fromEntries(
        Object.entries(values).filter(([, v]) => (v ?? '') !== ''),
      ) as Record<string, string>,
      is_default: true,
      is_active: true,
    };
    try {
      setSaving(true);
      const reuse = accounts.find((a) => a.provider === providerName);
      if (reuse) {
        if (admin) await api.updateAdminSmsProviderAccount(reuse.id, payload);
        else await api.updateSmsProviderAccount(reuse.id, payload);
      } else if (admin) {
        await api.createAdminSmsProviderAccount({
          ...payload, provider: providerName, user_id: targetUserId ?? null,
        });
      } else {
        await api.createSmsProviderAccount({ ...payload, provider: providerName });
      }
      showAlert('success', 'Gateway saved');
      await load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Could not save gateway');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!activeAccount) { showAlert('error', 'Save the gateway first'); return; }
    if (!testPhone.trim()) { showAlert('error', 'Enter a phone number to test'); return; }
    try {
      setTesting(true);
      const result = admin
        ? await api.testAdminSmsProviderAccount(activeAccount.id, testPhone.trim())
        : await api.testSmsProviderAccount(activeAccount.id, testPhone.trim());
      if (result.ok) showAlert('success', `Test message accepted by ${result.provider}`);
      else showAlert('error', result.error || 'Test message was rejected');
      await load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Test send failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
        {error}
      </div>
    );
  }

  const locked = !admin && !selfService;
  const onPlatform = mode === 'platform';

  return (
    <div className="space-y-4">
      {effective && (
        <div className="rounded-xl border border-border bg-background-secondary p-4">
          <p className="text-xs text-foreground-muted">Your messages go out via</p>
          <p className="text-sm text-foreground mt-0.5">
            {effective.source === 'reseller'
              ? `${activeAccount?.provider_label ?? effective.provider} — your own gateway`
              : 'The platform gateway'}
            {effective.sender_id && (
              <span className="text-foreground-muted"> · sender {effective.sender_id}</span>
            )}
          </p>
        </div>
      )}

      {locked && (
        <div className="rounded-xl border border-border bg-background-secondary p-4 text-sm text-foreground-muted">
          Using your own SMS gateway is turned off for this account. Contact
          support if you have your own SMS provider you would like to use.
        </div>
      )}

      <fieldset disabled={locked} className={locked ? 'opacity-60' : undefined}>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={useOurs}
            className={`text-left rounded-xl border p-4 transition-colors ${
              onPlatform
                ? 'border-accent-primary bg-accent-primary/5'
                : 'border-border bg-background-secondary hover:border-border-strong'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                onPlatform ? 'border-accent-primary' : 'border-border'
              }`}>
                {onPlatform && <span className="w-2 h-2 rounded-full bg-accent-primary" />}
              </span>
              <span className="text-sm font-medium text-foreground">Use the platform gateway</span>
            </span>
            <span className="block text-xs text-foreground-muted mt-1.5 pl-6">
              Nothing to set up. We send on your behalf.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode('own')}
            className={`text-left rounded-xl border p-4 transition-colors ${
              !onPlatform
                ? 'border-accent-primary bg-accent-primary/5'
                : 'border-border bg-background-secondary hover:border-border-strong'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                !onPlatform ? 'border-accent-primary' : 'border-border'
              }`}>
                {!onPlatform && <span className="w-2 h-2 rounded-full bg-accent-primary" />}
              </span>
              <span className="text-sm font-medium text-foreground">Use my own gateway</span>
            </span>
            <span className="block text-xs text-foreground-muted mt-1.5 pl-6">
              Your own SMS provider, contract and sender ID.
            </span>
          </button>
        </div>

        {!onPlatform && (
          <div className="mt-4 rounded-xl border border-border bg-background-secondary p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Provider</label>
              <FilterSelect
                value={providerName}
                onChange={pickProvider}
                options={specs.map((s) => ({ value: s.name, label: s.label }))}
                className="w-full"
              />
              {spec && (
                <p className="text-xs text-foreground-muted mt-1">
                  Available in {spec.countries.join(', ')}
                  {spec.docs_url && (
                    <>
                      {' · '}
                      <a href={spec.docs_url} target="_blank" rel="noreferrer"
                         className="text-accent-primary hover:underline">provider docs</a>
                    </>
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Sender ID</label>
              <input
                type="text"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                placeholder={spec?.sender_id_hint ?? 'Your approved sender ID'}
                className="w-full h-[42px] px-3.5 rounded-xl bg-background-tertiary border border-border text-foreground text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary transition-all"
              />
              {spec?.sender_id_hint && (
                <p className="text-xs text-foreground-muted mt-1">{spec.sender_id_hint}</p>
              )}
            </div>

            {spec && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Credentials</label>
                <div className="space-y-3">
                  {mainFields.map((f) => (
                    <CredentialField
                      key={f.key}
                      field={f}
                      value={values[f.key] ?? ''}
                      stored={activeAccount?.credentials?.[f.key] ?? null}
                      visible={Boolean(showSecret[f.key])}
                      onToggle={() => setShowSecret((p) => ({ ...p, [f.key]: !p[f.key] }))}
                      onChange={(v) => setValues((p) => ({ ...p, [f.key]: v }))}
                    />
                  ))}
                </div>

                {advancedFields.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((v) => !v)}
                      className="text-xs text-foreground-muted hover:text-foreground transition-colors"
                    >
                      {showAdvanced ? 'Hide' : 'Show'} advanced settings ({advancedFields.length})
                      <span className="text-foreground-muted/70"> — defaults suit most accounts</span>
                    </button>
                    {showAdvanced && (
                      <div className="space-y-3 mt-3">
                        {advancedFields.map((f) => (
                          <CredentialField
                            key={f.key}
                            field={f}
                            value={values[f.key] ?? ''}
                            stored={activeAccount?.credentials?.[f.key] ?? null}
                            visible={Boolean(showSecret[f.key])}
                            onToggle={() => setShowSecret((p) => ({ ...p, [f.key]: !p[f.key] }))}
                            onChange={(v) => setValues((p) => ({ ...p, [f.key]: v }))}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl bg-accent-primary text-white font-medium text-sm disabled:opacity-60 transition-opacity"
              >
                {saving ? 'Saving…' : 'Save gateway'}
              </button>
              {activeAccount && (
                <>
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="0712345678"
                    className="h-[42px] w-[160px] px-3.5 rounded-xl bg-background-tertiary border border-border text-foreground text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={sendTest}
                    disabled={testing}
                    className="px-4 py-2.5 rounded-xl bg-background-tertiary text-foreground font-medium text-sm disabled:opacity-60 transition-opacity"
                  >
                    {testing ? 'Sending…' : 'Send test SMS'}
                  </button>
                </>
              )}
            </div>

            {activeAccount?.last_test_at && (
              <p className={`text-xs ${activeAccount.last_test_ok ? 'text-green-400' : 'text-red-400'}`}>
                {activeAccount.last_test_ok
                  ? 'Last test delivered'
                  : `Last test failed: ${activeAccount.last_test_error ?? 'unknown error'}`}
              </p>
            )}
            {(activeAccount?.config_problems?.length ?? 0) > 0 && (
              <p className="text-xs text-red-400">
                {activeAccount!.config_problems.join('. ')}
              </p>
            )}
            <p className="text-xs text-foreground-muted">
              A test send uses one message from your gateway&apos;s own balance.
              It does not use portal SMS credits.
            </p>
          </div>
        )}
      </fieldset>
    </div>
  );
}

// A single credential input. Secrets render as a password field with a
// reveal toggle, and show their stored mask as the placeholder so leaving
// the box empty visibly means "keep what is saved".
function CredentialField({
  field, value, stored, visible, onToggle, onChange,
}: {
  field: SmsProviderField;
  value: string;
  stored: string | null;
  visible: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-foreground-muted mb-1">
        {field.label}
        {field.required
          ? <span className="text-red-500"> *</span>
          : <span className="text-foreground-muted/70"> (optional)</span>}
      </label>
      <div className="relative">
        <input
          type={field.secret && !visible ? 'password' : 'text'}
          name={`sms_${field.key}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            field.secret && stored
              ? `${stored} (unchanged)`
              : field.default || `Enter ${field.label.toLowerCase()}`
          }
          autoComplete={field.secret ? 'new-password' : 'off'}
          data-lpignore="true"
          data-form-type="other"
          className="w-full h-[42px] px-3.5 rounded-xl bg-background-tertiary border border-border text-foreground text-sm font-mono placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary transition-all pr-10"
        />
        {field.secret && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={visible ? 'Hide value' : 'Show value'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-foreground-muted hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {visible ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              )}
            </svg>
          </button>
        )}
      </div>
      {field.help && <p className="text-xs text-foreground-muted mt-1">{field.help}</p>}
    </div>
  );
}

export default GatewayView;
