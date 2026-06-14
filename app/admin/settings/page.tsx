'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { CompensationLimitSetting } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';

export default function PlatformSettingsPage() {
  const { user } = useAuth();
  const [setting, setSetting] = useState<CompensationLimitSetting | null>(null);
  const [inputValue, setInputValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await api.getCompensationLimitSetting();
        setSetting(result);
        setInputValue(result.daily_limit);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSetting();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await api.updateCompensationLimit(inputValue);
      setSetting(result);
      setInputValue(result.daily_limit);
      setSuccessMessage('Compensation voucher daily limit updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
          <p className="text-foreground-muted text-sm">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Header
        title="Platform Settings"
        subtitle="Global configuration for the ISP billing platform"
      />

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400/60 hover:text-emerald-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="card p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Compensation vouchers</h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Set the maximum number of compensation vouchers any reseller can issue per day.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-9 rounded-xl bg-background-tertiary animate-pulse" />
            <div className="h-4 w-48 rounded bg-background-tertiary animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 max-w-xs">
                <label className="block text-xs text-foreground-muted mb-1">
                  Daily limit (per reseller)
                </label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={inputValue}
                  onChange={(e) => setInputValue(Number(e.target.value))}
                  disabled={saving}
                  className="input text-sm w-full"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="btn-primary px-5 py-2 text-sm disabled:opacity-50 sm:mb-0"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving…
                  </span>
                ) : 'Save'}
              </button>
            </div>

            {setting && (
              <p className="text-xs text-foreground-muted">
                Platform default: <span className="font-medium text-foreground">{setting.default}</span>
                {' · '}
                {setting.is_overridden ? (
                  <span className="text-amber-500">Currently overridden</span>
                ) : (
                  <span>Using platform default</span>
                )}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
