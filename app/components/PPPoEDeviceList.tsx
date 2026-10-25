'use client';

import type { PPPoEDevice } from '../lib/types';
import { formatBps, formatBytes, formatMaxLimit } from '../lib/live';
import { pppoeSessionsSpeedNote } from '../plans/sharedSpeed';

function rateBps(rate: string): number {
  return parseInt(rate, 10) || 0;
}

/**
 * Every active session under one PPPoE username, with its IP and MAC.
 *
 * `onlyOne` is the secret's profile `only-one` setting. When it is `yes` the
 * router rejects a second login, so the list can only ever show one device.
 *
 * `sharedSpeed`: the plan shares its speed across the login's devices. All
 * sessions then sit on ONE router queue, so every row reports that queue's
 * counters and the totals must not add them up again.
 */
export default function PPPoEDeviceList({
  devices,
  onlyOne,
  planSpeed,
  sharedSpeed = false,
}: {
  devices: PPPoEDevice[];
  onlyOne?: string | null;
  planSpeed?: string | null;
  sharedSpeed?: boolean;
}) {
  // One shared queue: every session reports the same counters, so take one.
  const combine = (t: number, v: number) => (sharedSpeed ? Math.max(t, v) : t + v);
  const totalDown = devices.reduce((t, d) => combine(t, rateBps(d.download_rate)), 0);
  const totalUp = devices.reduce((t, d) => combine(t, rateBps(d.upload_rate)), 0);
  const totalDownloaded = devices.reduce((t, d) => combine(t, d.download_bytes || 0), 0);
  const totalUploaded = devices.reduce((t, d) => combine(t, d.upload_bytes || 0), 0);
  const limited = devices.filter((d) => d.has_queue && d.max_limit);
  const blocksSecondDevice = onlyOne === 'yes';

  return (
    <div className="space-y-3" data-testid="pppoe-device-list">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
        <span>
          <span className="font-semibold text-foreground">{devices.length}</span>{' '}
          PPPoE session{devices.length === 1 ? '' : 's'} active
        </span>
        {devices.length > 1 && (
          <span>
            Combined <span className="text-accent-primary font-medium">↓ {formatBps(totalDown)}</span>{' '}
            <span className="text-teal-500 font-medium">↑ {formatBps(totalUp)}</span>
          </span>
        )}
        <span>
          Session data <span className="font-medium text-foreground">↓ {formatBytes(totalDownloaded)} · ↑ {formatBytes(totalUploaded)}</span>
        </span>
        {planSpeed && <span>Plan {planSpeed}</span>}
        {onlyOne && (
          <span className="font-mono">only-one={onlyOne}</span>
        )}
      </div>

      {devices.length === 0 ? (
        <p className="text-sm text-foreground-muted">No PPPoE session is active for this username right now.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {devices.map((d, i) => (
            <li key={d.id || `${d.address}-${i}`} className="p-3 grid grid-cols-2 sm:grid-cols-[2rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-1.5 items-center text-sm">
              <span className="hidden sm:flex w-6 h-6 rounded-full bg-success/10 text-success text-xs font-semibold items-center justify-center">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-foreground truncate" title="IP address">{d.address || '—'}</p>
                <p className="font-mono text-xs text-foreground-muted truncate" title="MAC address (caller-id)">
                  {d.caller_id || 'MAC unknown'}
                </p>
              </div>
              <div className="text-right sm:text-left">
                <p>
                  <span className="text-accent-primary whitespace-nowrap">↓ {formatBps(rateBps(d.download_rate))}</span>{' '}
                  <span className="text-teal-500 whitespace-nowrap">↑ {formatBps(rateBps(d.upload_rate))}</span>
                </p>
                <p className="text-xs text-foreground-muted">up {d.uptime || '—'}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 text-xs text-foreground-muted sm:text-right">
                <p>↓ {formatBytes(d.download_bytes)} / ↑ {formatBytes(d.upload_bytes)} this session</p>
                <p className={d.has_queue ? '' : 'text-warning'}>
                  {d.has_queue ? `Limit ${formatMaxLimit(d.max_limit)}` : 'No speed limit queue'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {devices.length > 1 && limited.length === devices.length && (
        <p className="text-xs text-foreground-muted" data-testid="pppoe-speed-note">
          {pppoeSessionsSpeedNote(sharedSpeed, devices.length, planSpeed)}
        </p>
      )}
      {blocksSecondDevice && (
        <p className="text-xs text-foreground-muted">
          This profile has <span className="font-mono">only-one=yes</span>: the router rejects a second session
          logging in with the same username.
        </p>
      )}
      <p className="text-xs text-foreground-muted">
        These are sessions connected with this PPPoE login. Phones and laptops behind one Wi-Fi router share its session and are not listed separately here. Data counters reset when a session reconnects.
      </p>
    </div>
  );
}
