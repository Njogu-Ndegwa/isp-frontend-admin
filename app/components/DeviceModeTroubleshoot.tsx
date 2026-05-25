'use client';

import { useState } from 'react';

function CopyCmd({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = command;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="bg-background-tertiary rounded-lg p-3 pr-10 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <code className="text-xs font-mono text-foreground whitespace-pre">{command}</code>
      </div>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-background-secondary/80 hover:bg-background-secondary border border-border/50 text-foreground-muted hover:text-foreground transition-colors"
        title="Copy command"
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function DeviceModeTroubleshoot() {
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
          <p className="text-sm font-medium text-foreground">Getting &quot;not allowed by device-mode&quot;?</p>
          <p className="text-xs text-foreground-muted mt-0.5">RouterOS v7 fix &mdash; tap to see commands</p>
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
            RouterOS v7 has a <span className="font-medium text-foreground">device-mode</span> security feature that blocks <code className="px-1 py-0.5 rounded bg-background-tertiary text-[11px]">/tool fetch</code> by default. You need to enable it before running the provisioning command.
          </p>

          {/* Option A */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">OPTION A</span>
              <span className="text-xs font-semibold text-foreground">Switch to Enterprise Mode (recommended)</span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              This unlocks all restricted features at once:
            </p>
            <CopyCmd command="/system/device-mode/update mode=enterprise" />
          </div>

          {/* Option B */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">OPTION B</span>
              <span className="text-xs font-semibold text-foreground">Enable individual features</span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              If enterprise mode is not available on your router, enable the required features individually:
            </p>
            <CopyCmd command="/system/device-mode/update fetch=yes scheduler=yes hotspot=yes" />
            <p className="text-xs text-foreground-muted leading-relaxed">
              To enable everything (fetch, hotspot, scheduler, email, proxy, and more):
            </p>
            <CopyCmd command={`/system/device-mode/update fetch=yes scheduler=yes hotspot=yes email=yes proxy=yes romon=yes socks=yes bandwidth-test=yes traffic-gen=yes sniffer=yes container=yes smb=yes`} />
          </div>

          {/* Confirm step */}
          <div className="rounded-lg bg-accent-primary/5 border border-accent-primary/15 p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              After running the command
            </p>
            <ol className="text-xs text-foreground-muted leading-relaxed space-y-1 list-decimal list-inside">
              <li>The router will ask you to <span className="font-medium text-foreground">press the physical reset/mode button</span> (usually within 60 seconds)</li>
              <li>Press the button on the router to confirm</li>
              <li>Verify the change:</li>
            </ol>
            <CopyCmd command="/system/device-mode/print" />
            <p className="text-xs text-foreground-muted leading-relaxed">
              Check that <code className="px-1 py-0.5 rounded bg-background-tertiary text-[11px]">fetch: yes</code> and <code className="px-1 py-0.5 rounded bg-background-tertiary text-[11px]">hotspot: yes</code> are shown, then retry the provisioning command.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
