'use client';

import { useState } from 'react';
import { CopyCmd } from './DeviceModeTroubleshoot';
import { API_BASE_URL } from '../lib/api';

/**
 * Troubleshooter for the provisioning import dying with
 * `Script Error: expected end of command (line ... column ...)`.
 *
 * Root cause (incident 2026-06-10, Router-0497 / hAP lite): small smips
 * devices (hAP lite, hAP mini) on RouterOS 7.20+ ship WITHOUT the hotspot
 * feature -- MikroTik moved it to a separate package to fit 16MB flash.
 * The /ip hotspot menus don't exist, so the provisioning script fails to
 * PARSE at its first /ip hotspot line and aborts mid-import, leaving the
 * router half-configured. Device-mode can show `hotspot: yes` and it will
 * STILL fail -- the package simply isn't installed.
 */
export default function HotspotPackageTroubleshoot() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-background-secondary/50 active:opacity-70"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Getting &quot;Script Error: expected end of command&quot;?</p>
          <p className="text-xs text-foreground-muted mt-0.5">Hotspot package missing (hAP lite/mini) &mdash; tap to see fix</p>
        </div>
        <svg
          className={`w-4 h-4 text-foreground-muted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-3 pb-4 space-y-4 border-t border-border/50">
          {/* Why this happens */}
          <p className="text-xs text-foreground-muted pt-3 leading-relaxed">
            If the provisioning command downloads fine (code 200) but the import dies with{' '}
            <code className="px-1 py-0.5 rounded bg-background-tertiary text-[11px]">Script Error: expected end of command (line 112 column 51)</code>{' '}
            (line number may vary), the router is missing the <span className="font-medium text-foreground">hotspot feature</span>.
            Small devices like the <span className="font-medium text-foreground">hAP lite / hAP mini</span> (smips) on RouterOS 7.20 and newer ship hotspot as a
            separate package that is NOT installed by default. Device-mode can show{' '}
            <code className="px-1 py-0.5 rounded bg-background-tertiary text-[11px]">hotspot: yes</code> and it will still fail.
          </p>

          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">STEP 1</span>
              <span className="text-xs font-semibold text-foreground">Confirm the package is missing</span>
            </div>
            <CopyCmd command="/system package print" />
            <p className="text-xs text-foreground-muted leading-relaxed">
              If <code className="px-1 py-0.5 rounded bg-background-tertiary text-[11px]">hotspot</code> is not in the list, continue. Also note your exact{' '}
              <span className="font-medium text-foreground">version</span> and <span className="font-medium text-foreground">architecture-name</span> from:
            </p>
            <CopyCmd command="/system resource print" />
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">STEP 2</span>
              <span className="text-xs font-semibold text-foreground">Install the hotspot package and reboot</span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Replace the version and architecture to match your router exactly (example shown for 7.23.1 on smips):
            </p>
            <CopyCmd command={'/tool fetch url="https://download.mikrotik.com/routeros/7.23.1/hotspot-7.23.1-smips.npk"'} />
            <CopyCmd command="/system reboot" />
            <p className="text-xs text-foreground-muted leading-relaxed">
              The package installs during the reboot. Afterwards <code className="px-1 py-0.5 rounded bg-background-tertiary text-[11px]">/system package print</code> should list{' '}
              <code className="px-1 py-0.5 rounded bg-background-tertiary text-[11px]">hotspot</code>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">STEP 3</span>
              <span className="text-xs font-semibold text-foreground">Re-run the provisioning command above</span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              If the re-run fails with <code className="px-1 py-0.5 rounded bg-background-tertiary text-[11px]">already have such name</code> at the WireGuard step
              (leftovers from the first half-run), clean them up first, then re-run:
            </p>
            <CopyCmd command={'/ip address remove [find where interface=wg-aws]\n/interface wireguard peers remove [find where interface=wg-aws]\n/interface wireguard remove [find where name=wg-aws]\n/ip firewall filter remove [find where comment="Allow WireGuard"]\n/ip firewall nat remove [find where comment="NAT for internet access"]'} />
          </div>

          {/* If router works but doesn't appear */}
          <div className="rounded-lg bg-accent-primary/5 border border-accent-primary/15 p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Hotspot working but the router never appears here?
            </p>
            <p className="text-xs text-foreground-muted leading-relaxed">
              The router&apos;s final &quot;register me&quot; call to the server can get lost (it only tries once before rebooting).
              While the token is still pending, open this URL in any browser to register it manually &mdash; replace{' '}
              <code className="px-1 py-0.5 rounded bg-background-tertiary text-[11px]">&lt;token&gt;</code> with the token from the pending list below:
            </p>
            <CopyCmd command={`${API_BASE_URL}/provision/<token>/complete`} />
          </div>
        </div>
      </div>
    </div>
  );
}
