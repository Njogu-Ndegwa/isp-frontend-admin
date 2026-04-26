'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { CreatePlanRequest, FupAction } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import Header from '../../components/Header';
import DateTimePicker from '../../components/DateTimePicker';
import { gmt3InputToISO } from '../../lib/dateUtils';

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
    data_cap_mb: null,
    fup_action: null,
    fup_throttle_profile: null,
  });

  const isPPPoE = formData.connection_type === 'pppoe';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = { ...formData };
      if (!payload.badge_text) payload.badge_text = null;
      if (!payload.original_price) payload.original_price = null;
      payload.valid_until = payload.valid_until ? gmt3InputToISO(payload.valid_until) : null;
      // FUP fields only apply to PPPoE — strip them for hotspot plans
      if (!isPPPoE) {
        payload.data_cap_mb = null;
        payload.fup_action = null;
        payload.fup_throttle_profile = null;
      } else {
        if (!payload.data_cap_mb) payload.data_cap_mb = null;
        if (!payload.fup_action) payload.fup_action = null;
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="duration_value" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Duration Value
                </label>
                <input
                  id="duration_value"
                  type="number"
                  value={formData.duration_value || ''}
                  onChange={(e) => setFormData({ ...formData, duration_value: e.target.value === '' ? 0 : (parseInt(e.target.value) || 1) })}
                  onBlur={() => { if (!formData.duration_value) setFormData(prev => ({ ...prev, duration_value: 1 })); }}
                  className="input"
                  min={1}
                  required
                />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="connection_type" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Connection Type
                </label>
                <select
                  id="connection_type"
                  value={formData.connection_type}
                  onChange={(e) => setFormData({ ...formData, connection_type: e.target.value as 'hotspot' | 'pppoe' })}
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

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-4">Advanced Options</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="plan_type" className="block text-sm font-medium text-foreground-muted mb-1.5">
                    Plan Type
                  </label>
                  <select
                    id="plan_type"
                    value={formData.plan_type || 'regular'}
                    onChange={(e) => setFormData({ ...formData, plan_type: e.target.value as 'regular' | 'emergency' })}
                    className="select"
                  >
                    <option value="regular">Regular</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="original_price" className="block text-sm font-medium text-foreground-muted mb-1.5">
                    Original Price
                  </label>
                  <input
                    id="original_price"
                    type="number"
                    value={formData.original_price ?? ''}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value ? parseInt(e.target.value) : null })}
                    className="input"
                    placeholder="For strikethrough"
                    min={0}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="badge_text" className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Badge Text
                </label>
                <input
                  id="badge_text"
                  type="text"
                  value={formData.badge_text || ''}
                  onChange={(e) => setFormData({ ...formData, badge_text: e.target.value || null })}
                  className="input"
                  placeholder='e.g., "Hot Deal", "New"'
                />
              </div>

              <div className="mb-4">
                <DateTimePicker
                  label="Valid Until"
                  value={formData.valid_until || ''}
                  onChange={(v) => setFormData({ ...formData, valid_until: v || null })}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_hidden || false}
                  onChange={(e) => setFormData({ ...formData, is_hidden: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-accent-primary focus:ring-accent-primary"
                />
                <span className="text-sm text-foreground">Hidden from public portal</span>
              </label>
            </div>

            {isPPPoE && (
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-1">Fair Usage Policy</h3>
                <p className="text-xs text-foreground-muted mb-4">Optional monthly data cap and action when exceeded. PPPoE only.</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="data_cap_mb" className="block text-sm font-medium text-foreground-muted mb-1.5">
                      Monthly Data Cap (MB)
                    </label>
                    <input
                      id="data_cap_mb"
                      type="number"
                      value={formData.data_cap_mb ?? ''}
                      onChange={(e) => setFormData({ ...formData, data_cap_mb: e.target.value ? parseInt(e.target.value) : null })}
                      className="input"
                      placeholder="e.g. 100000 (100 GB)"
                      min={0}
                    />
                    <p className="mt-1 text-xs text-foreground-muted">Leave empty or 0 for unlimited</p>
                  </div>
                  <div>
                    <label htmlFor="fup_action" className="block text-sm font-medium text-foreground-muted mb-1.5">
                      Action on Exceed
                    </label>
                    <select
                      id="fup_action"
                      value={formData.fup_action ?? ''}
                      onChange={(e) => setFormData({ ...formData, fup_action: (e.target.value || null) as FupAction | null })}
                      className="select"
                    >
                      <option value="">Default (throttle)</option>
                      <option value="throttle">Throttle</option>
                      <option value="block">Block</option>
                      <option value="notify_only">Notify Only</option>
                    </select>
                  </div>
                </div>

                {formData.fup_action === 'throttle' && (
                  <div>
                    <label htmlFor="fup_throttle_profile" className="block text-sm font-medium text-foreground-muted mb-1.5">
                      Throttle PPP Profile <span className="text-danger">*</span>
                    </label>
                    <input
                      id="fup_throttle_profile"
                      type="text"
                      value={formData.fup_throttle_profile || ''}
                      onChange={(e) => setFormData({ ...formData, fup_throttle_profile: e.target.value || null })}
                      className="input"
                      placeholder="e.g. throttled-1m"
                    />
                    <p className="mt-1 text-xs text-foreground-muted">MikroTik PPP profile to switch user to when throttled</p>
                  </div>
                )}
              </div>
            )}

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
