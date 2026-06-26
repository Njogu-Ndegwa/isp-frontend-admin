'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { CreatePlanRequest } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import Header from '../../components/Header';
import { gmt3InputToISO } from '../../lib/dateUtils';
import { DataCapUnit, dataCapInputToMb } from '../dataCap';
import { normalizeDuration, describeDuration } from '../duration';

export default function CreatePlanPage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePlanRequest>({
    name: '',
    speed: '5M/2M',
    price: 50,
    duration_value: 1,
    duration_unit: 'HOURS',
    connection_type: 'hotspot',
    router_profile: 'default',
    plan_type: 'regular',
    is_hidden: false,
    badge_text: null,
    original_price: null,
    valid_until: null,
    max_shared_users: 1,
    data_cap_mb: null,
    fup_action: null,
    fup_throttle_profile: null,
  });
  const [dataCapValue, setDataCapValue] = useState('');
  const [dataCapUnit, setDataCapUnit] = useState<DataCapUnit>('GB');
  const [showFup, setShowFup] = useState(false);
  const [durationInput, setDurationInput] = useState(String(formData.duration_value));

  const isPPPoE = formData.connection_type === 'pppoe';
  const dataCapMb = dataCapInputToMb(dataCapValue, dataCapUnit);

  const parsedDuration = parseFloat(durationInput);
  const normalizedDuration = Number.isFinite(parsedDuration)
    ? normalizeDuration(parsedDuration, formData.duration_unit)
    : null;
  const durationHint =
    normalizedDuration &&
    !(normalizedDuration.value === parsedDuration && normalizedDuration.unit === formData.duration_unit)
      ? `Will be saved as ${describeDuration(normalizedDuration.value, normalizedDuration.unit)}`
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = { ...formData };
      const normalized = normalizeDuration(parseFloat(durationInput), formData.duration_unit);
      if (!normalized) {
        showAlert('error', 'Please enter a valid duration of at least 1 minute.');
        return;
      }
      payload.duration_value = normalized.value;
      payload.duration_unit = normalized.unit;
      if (!payload.badge_text) payload.badge_text = null;
      if (!payload.original_price) payload.original_price = null;
      payload.valid_until = payload.valid_until ? gmt3InputToISO(payload.valid_until) : null;
      payload.max_shared_users = isPPPoE ? 1 : Math.max(1, Math.min(50, Number(payload.max_shared_users) || 1));
      payload.data_cap_mb = showFup ? dataCapMb : null;
      // Clear FUP fields when the plan is uncapped.
      if (!payload.data_cap_mb) {
        payload.data_cap_mb = null;
        payload.fup_action = null;
        payload.fup_throttle_profile = null;
      } else {
        payload.fup_action = 'throttle';
        if (!payload.fup_throttle_profile) payload.fup_throttle_profile = null;
      }
      await api.createPlan(payload);
      showAlert('success', `Plan "${formData.name}" created successfully!`);
      router.push('/plans');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Create Plan"
        subtitle="Add a new internet plan"
        backHref="/plans"
      />

      <div className="max-w-lg mx-auto">
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground-muted mb-1.5">
                Plan Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="e.g., 1 Hour Plan"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Price (KES)
                </label>
                <input
                  id="price"
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                  className="input"
                  min={1}
                  required
                />
              </div>
              <div>
                <label htmlFor="speed" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Speed (Down/Up)
                </label>
                <input
                  id="speed"
                  type="text"
                  value={formData.speed}
                  onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
                  className="input"
                  placeholder="e.g., 5M/2M"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="duration_value" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Duration Value
                </label>
                <input
                  id="duration_value"
                  type="number"
                  inputMode="decimal"
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  onBlur={() => { if (!durationInput.trim()) setDurationInput('1'); }}
                  className="input"
                  min={0}
                  step="any"
                  required
                />
                {durationHint && (
                  <p className="mt-1 text-xs text-foreground-muted">{durationHint}</p>
                )}
              </div>
              <div>
                <label htmlFor="duration_unit" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Duration Unit
                </label>
                <select
                  id="duration_unit"
                  value={formData.duration_unit}
                  onChange={(e) => setFormData({ ...formData, duration_unit: e.target.value as 'HOURS' | 'DAYS' | 'MINUTES' })}
                  className="select"
                >
                  <option value="MINUTES">Minutes</option>
                  <option value="HOURS">Hours</option>
                  <option value="DAYS">Days</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="connection_type" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Connection Type
                </label>
                <select
                  id="connection_type"
                  value={formData.connection_type}
                  onChange={(e) => {
                    const connectionType = e.target.value as 'hotspot' | 'pppoe';
                    setFormData({
                      ...formData,
                      connection_type: connectionType,
                      max_shared_users: connectionType === 'pppoe' ? 1 : (formData.max_shared_users ?? 1),
                    });
                  }}
                  className="select"
                >
                  <option value="hotspot">Hotspot</option>
                  <option value="pppoe">PPPoE</option>
                </select>
              </div>
              <div>
                <label htmlFor="router_profile" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Router Profile
                </label>
                <input
                  id="router_profile"
                  type="text"
                  value={formData.router_profile || ''}
                  onChange={(e) => setFormData({ ...formData, router_profile: e.target.value })}
                  className="input"
                  placeholder="default"
                />
              </div>
            </div>

            {!isPPPoE && (
              <div>
                <label htmlFor="max_shared_users" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Subscription Devices
                </label>
                <input
                  id="max_shared_users"
                  type="number"
                  value={formData.max_shared_users ?? 1}
                  onChange={(e) => setFormData({ ...formData, max_shared_users: e.target.value === '' ? 1 : (parseInt(e.target.value, 10) || 1) })}
                  onBlur={() => setFormData((prev) => ({ ...prev, max_shared_users: Math.max(1, Math.min(50, Number(prev.max_shared_users) || 1)) }))}
                  className="input"
                  min={1}
                  max={50}
                />
                <p className="mt-1 text-xs text-foreground-muted">1 disables sharing. 2 allows the owner plus one extra device.</p>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFup}
                  onChange={(e) => setShowFup(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent-primary focus:ring-accent-primary"
                />
                <span className="text-sm font-medium text-foreground">Show Fair Usage Policy</span>
              </label>

              {showFup && (
                <div className="mt-4">
                <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-1">Fair Usage Policy</h3>
                <p className="text-xs text-foreground-muted mb-4">
                  Optional data cap for each paid plan period. When the cap is reached, the connection is slowed to a lesser speed.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="data_cap_value" className="block text-sm font-medium text-foreground-muted mb-1.5">
                      Data Cap
                    </label>
                    <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
                      <input
                        id="data_cap_value"
                        type="number"
                        value={dataCapValue}
                        onChange={(e) => setDataCapValue(e.target.value)}
                        className="input"
                        placeholder={dataCapUnit === 'GB' ? 'e.g. 100' : 'e.g. 500'}
                        min={0}
                        step={dataCapUnit === 'GB' ? '0.1' : '1'}
                      />
                      <select
                        aria-label="Data cap unit"
                        value={dataCapUnit}
                        onChange={(e) => setDataCapUnit(e.target.value as DataCapUnit)}
                        className="select"
                      >
                        <option value="MB">MB</option>
                        <option value="GB">GB</option>
                      </select>
                    </div>
                    <p className="mt-1 text-xs text-foreground-muted">Leave empty or 0 for unlimited</p>
                  </div>
                  <div>
                    <label htmlFor="fup_throttle_profile" className="block text-sm font-medium text-foreground-muted mb-1.5">
                      Slow Speed (Down/Up)
                    </label>
                    <input
                      id="fup_throttle_profile"
                      type="text"
                      value={formData.fup_throttle_profile || ''}
                      onChange={(e) => setFormData({ ...formData, fup_throttle_profile: e.target.value || null })}
                      className="input"
                      placeholder="e.g., 5M/2M"
                    />
                    <p className="mt-1 text-xs text-foreground-muted">
                      Speed to apply after the data cap is reached; blank uses 1M/1M
                    </p>
                  </div>
                </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Link href="/plans" className="btn-secondary flex-1 text-center">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Plan'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
