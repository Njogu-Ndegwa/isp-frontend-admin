'use client';
import React from 'react';
import type { MikroTikInterface } from '../../lib/types';

// Single source of truth for formatBytes — imported by NetworkHealthCard
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function InterfaceCard({ iface }: { iface: MikroTikInterface }) {
  const isActive = iface.running && !iface.disabled;
  const typeIcons: Record<string, string> = {
    'ether': '🔌',
    'wlan': '📶',
    'bridge': '🌉',
    'wg': '🔒',
  };

  return (
    <div className={`p-3 rounded-lg border ${
      isActive
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : 'bg-background-tertiary border-transparent'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">{typeIcons[iface.type] || '📡'}</span>
        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-foreground-muted/30'}`} />
      </div>
      <p className="font-medium text-xs text-foreground truncate">{iface.name}</p>
      {isActive && (iface.rx_byte > 0 || iface.tx_byte > 0) && (
        <div className="mt-1.5 text-[10px] text-foreground-muted space-y-0.5">
          <p>↓ {formatBytes(iface.rx_byte)}</p>
          <p>↑ {formatBytes(iface.tx_byte)}</p>
        </div>
      )}
    </div>
  );
}

export default function InterfacesPanel({ interfaces }: { interfaces: MikroTikInterface[] }): React.JSX.Element {
  const visible = interfaces.filter((i) => i?.type !== 'loopback');

  if (visible.length === 0) return <></>;

  return (
    <details className="mt-5 group">
      <summary className="cursor-pointer text-xs text-foreground-muted uppercase tracking-wide mb-3 flex items-center gap-2 hover:text-foreground transition-colors">
        <span className="w-4 h-4 rounded bg-background-tertiary flex items-center justify-center group-open:rotate-90 transition-transform">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
        Network Interfaces ({visible.length})
      </summary>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 animate-fade-in">
        {visible.map((iface, index) => (
          iface && <InterfaceCard key={iface.name || `${iface.type}-${index}`} iface={iface} />
        ))}
      </div>
    </details>
  );
}
