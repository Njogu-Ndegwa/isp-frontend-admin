'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { CreateAccessCredentialRequest, Router as RouterType, CreateAccessCredentialResponse } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import Header from '../../components/Header';

export default function CreateAccessCredentialPage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [routers, setRouters] = useState<RouterType[]>([]);
  const [loading, setLoading] = useState(false);
  const [routersLoading, setRoutersLoading] = useState(true);
  const [result, setResult] = useState<CreateAccessCredentialResponse | null>(null);

  const [formData, setFormData] = useState<CreateAccessCredentialRequest>({
    router_id: 0,
    username: '',
    password: '',
    rate_limit: '',
    data_cap_mb: null,
    label: '',
  });

  useEffect(() => {
    api.getRouters().then((data) => {
      setRouters(data);
      if (data.length > 0) {
        setFormData((f) => ({ ...f, router_id: data[0].id }));
      }
    }).catch((err) => {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load routers');
    }).finally(() => setRoutersLoading(false));
  }, [showAlert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.router_id) {
      showAlert('error', 'Please select a router');
      return;
    }
    try {
      setLoading(true);
      const payload: CreateAccessCredentialRequest = {
        router_id: formData.router_id,
        ...(formData.username ? { username: formData.username.trim().toLowerCase() } : {}),
        ...(formData.password ? { password: formData.password } : {}),
        ...(formData.rate_limit ? { rate_limit: formData.rate_limit } : {}),
        ...(formData.data_cap_mb ? { data_cap_mb: formData.data_cap_mb } : {}),
        ...(formData.label ? { label: formData.label } : {}),
      };
      const created = await api.createAccessCredential(payload);
      setResult(created);
      if (created.warning) {
        showAlert('warning', created.warning);
      } else {
        showAlert('success', `Credential ${created.username} created`);
      }
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to create credential');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showAlert('success', `${label} copied`);
  };

  if (result) {
    return (
      <div>
        <Header
          title="Credential Created"
          subtitle="Save the password now — this is the only time it's shown without a reveal request."
          backHref="/access-credentials"
        />
        <div className="max-w-md mx-auto">
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground text-center">Credential Created</h3>

            {result.warning && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
                <strong>Warning:</strong> {result.warning}
              </div>
            )}

            <div className="space-y-3">
              <div className="bg-background-tertiary rounded-lg p-3">
                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Username</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm text-foreground">{result.username}</span>
                  <button onClick={() => copyToClipboard(result.username, 'Username')} className="p-1.5 rounded-md hover:bg-background-secondary text-foreground-muted hover:text-foreground">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              {result.password && (
                <div className="bg-background-tertiary rounded-lg p-3">
                  <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Password</label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-sm text-foreground break-all">{result.password}</span>
                    <button onClick={() => copyToClipboard(result.password!, 'Password')} className="p-1.5 rounded-md hover:bg-background-secondary text-foreground-muted hover:text-foreground flex-shrink-0 ml-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => result.password && copyToClipboard(`Username: ${result.username}\nPassword: ${result.password}`, 'Credentials')}
                className="btn-secondary flex-1"
              >
                Copy Both
              </button>
              <Link href="/access-credentials" className="btn-primary flex-1 text-center">
                Done
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="New Access Credential"
        subtitle="Mint a perpetual hotspot login (no time limit, single device)"
        backHref="/access-credentials"
      />
      <div className="max-w-lg mx-auto">
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="router_id" className="block text-sm font-medium text-foreground-muted mb-1.5">
                Router <span className="text-danger">*</span>
              </label>
              <select
                id="router_id"
                value={formData.router_id || ''}
                onChange={(e) => setFormData({ ...formData, router_id: Number(e.target.value) })}
                className="select"
                required
                disabled={routersLoading}
              >
                <option value="" disabled>{routersLoading ? 'Loading…' : 'Select router'}</option>
                {routers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="label" className="block text-sm font-medium text-foreground-muted mb-1.5">
                Label
              </label>
              <input
                id="label"
                type="text"
                value={formData.label || ''}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="input"
                placeholder='e.g., "Front desk laptop"'
                maxLength={120}
              />
              <p className="mt-1 text-xs text-foreground-muted">A free-form name to remember who this credential is for.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  className="input font-mono"
                  placeholder="Auto-generate"
                  pattern="[a-z0-9][a-z0-9._-]{2,63}"
                  title="3-64 chars, lowercase letters/digits/.-_, must start with letter or digit"
                />
                <p className="mt-1 text-xs text-foreground-muted">3-64 chars, lowercase. Leave empty to auto-generate.</p>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="text"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input font-mono"
                  placeholder="Auto-generate"
                />
                <p className="mt-1 text-xs text-foreground-muted">Leave empty to auto-generate a strong password.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rate_limit" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Rate Limit
                </label>
                <input
                  id="rate_limit"
                  type="text"
                  value={formData.rate_limit || ''}
                  onChange={(e) => setFormData({ ...formData, rate_limit: e.target.value })}
                  className="input font-mono"
                  placeholder="e.g. 5M/2M"
                />
                <p className="mt-1 text-xs text-foreground-muted">MikroTik upload/download. Leave empty for unlimited.</p>
              </div>
              <div>
                <label htmlFor="data_cap_mb" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Lifetime Data Cap (MB)
                </label>
                <input
                  id="data_cap_mb"
                  type="number"
                  value={formData.data_cap_mb ?? ''}
                  onChange={(e) => setFormData({ ...formData, data_cap_mb: e.target.value ? parseInt(e.target.value) : null })}
                  className="input"
                  placeholder="Unlimited"
                  min={0}
                />
                <p className="mt-1 text-xs text-foreground-muted">Lifetime cap (not monthly). Leave empty for unlimited.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Link href="/access-credentials" className="btn-secondary flex-1 text-center">Cancel</Link>
              <button
                type="submit"
                disabled={loading || !formData.router_id}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create Credential'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
