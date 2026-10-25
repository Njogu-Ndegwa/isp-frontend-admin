'use client';

/** PPPoE plans with 2+ devices: share the plan speed across the login's devices. */
export default function SharedSpeedField({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div data-testid="shared-speed-field">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 w-4 h-4 rounded border-border text-accent-primary focus:ring-accent-primary"
        />
        <span>
          <span className="block text-sm font-medium text-foreground">Share speed across devices</span>
          <span className="block text-xs text-foreground-muted">
            {checked
              ? 'All devices on one login share the plan speed. Example: 4 devices on a 30 Mbps plan share 30 Mbps.'
              : 'Off: each device gets the full plan speed. Turn on to make all devices on one login share it.'}
            {' '}Changing it updates active customers’ routers; their devices reconnect once.
          </span>
        </span>
      </label>
    </div>
  );
}
