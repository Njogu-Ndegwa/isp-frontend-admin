'use client';

import { useState } from 'react';
import { api } from '../../../lib/api';
import { AdminReseller, MessagingSettings } from '../../../lib/types';
import { useAlert } from '../../../context/AlertContext';
import FilterSelect from '../../../components/FilterSelect';
import { GatewayView } from '../../../messaging/components/GatewayView';

// ─── Admin: SMS gateways ───────────────────────────────────────────────────
// Same form the reseller sees, pointed at whichever account the admin picks:
// the platform's own, or one reseller's. Plus the switch that decides whether
// resellers may configure a gateway for themselves.

interface AdminGatewayTabProps {
  settings: MessagingSettings | null;
  resellers: AdminReseller[];
  loadingResellers: boolean;
  onRefetchSettings: () => void;
}

const PLATFORM = 'platform';

export default function AdminGatewayTab({
  settings, resellers, loadingResellers, onRefetchSettings,
}: AdminGatewayTabProps) {
  const { showAlert } = useAlert();
  const [target, setTarget] = useState<string>(PLATFORM);
  const [savingToggle, setSavingToggle] = useState(false);

  const selfService = settings?.allow_reseller_gateways ?? false;

  const toggleSelfService = async () => {
    try {
      setSavingToggle(true);
      await api.updateMessagingSettings({ allow_reseller_gateways: !selfService });
      showAlert('success', !selfService
        ? 'Resellers can now add their own gateway'
        : 'Reseller self-service turned off');
      onRefetchSettings();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Could not update setting');
    } finally {
      setSavingToggle(false);
    }
  };

  const options = [
    { value: PLATFORM, label: 'Platform gateway (the default for everyone)' },
    ...resellers.map((r) => ({
      value: String(r.id),
      label: r.organization_name || r.business_name || r.email,
    })),
  ];

  const targetUserId = target === PLATFORM ? null : Number(target);

  return (
    <div className="space-y-5">
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={selfService}
            disabled={savingToggle}
            onClick={toggleSelfService}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              selfService ? 'bg-success' : 'bg-background-tertiary border border-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                selfService ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-foreground">
            Resellers may add their own gateway {selfService ? '— on' : '— off'}
          </span>
        </div>
        <p className="text-xs text-foreground-muted">
          With this off, only you can put a reseller on their own SMS provider.
          Resellers can still see which gateway their messages go out on.
          Note that a reseller on their own gateway is still charged portal SMS
          credits.
        </p>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Configure gateway for
          </label>
          <FilterSelect
            value={target}
            onChange={setTarget}
            options={options}
            className="w-full sm:max-w-md"
          />
          <p className="text-xs text-foreground-muted mt-1">
            {targetUserId === null
              ? 'Used by every reseller who has not configured their own.'
              : 'Overrides the platform gateway for this reseller only.'}
            {loadingResellers && ' · loading resellers…'}
          </p>
        </div>

        <GatewayView key={target} admin targetUserId={targetUserId} />
      </div>
    </div>
  );
}
