'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import type { AdminExpiredOnlineAudit } from '../lib/types';

export default function ExpiredOnlineMonitor() {
  const [audit, setAudit] = useState<AdminExpiredOnlineAudit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const next = await api.getAdminExpiredOnlineAudit();
        if (alive) { setAudit(next); setError(null); }
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Live expiry check unavailable');
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  const checked = audit?.checked_routers ?? 0;
  const total = audit?.candidate_routers ?? 0;
  const failed = audit?.failed_router_ids.length ?? 0;
  const count = audit?.count ?? 0;
  const complete = Boolean(audit?.completed_at);
  const hasIssue = count > 0;

  return (
    <section className={`card p-4 border ${hasIssue ? 'border-danger' : 'border-border'}`} aria-label="Expired customers still online">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`font-semibold ${hasIssue ? 'text-danger' : ''}`}>Expired customers still online</h2>
          <p className="text-sm text-foreground-muted mt-1">
            {error ? `Live check unavailable: ${error}`
              : audit?.running || !complete ? `Checking live hotspot sessions · ${checked}/${total || '…'} routers checked`
              : `${count} confirmed live session${count === 1 ? '' : 's'} · ${checked}/${total} routers checked${failed ? ` · ${failed} unreachable` : ''}`}
          </p>
        </div>
        <span className={`text-2xl font-bold ${hasIssue ? 'text-danger' : ''}`}>
          {complete ? count : '…'}
        </span>
      </div>
      {audit?.completed_at && (
        <p className="text-xs text-foreground-muted mt-2">
          Last live check: {new Date(audit.completed_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
          {audit.running ? ' · refreshing' : ''}
        </p>
      )}
      {audit?.error && <p className="text-sm text-danger mt-2">Scan failed: {audit.error}</p>}
      {hasIssue && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium">View affected customers</summary>
          <ul className="mt-2 max-h-72 overflow-y-auto divide-y divide-border text-sm">
            {audit?.customers.map((customer) => (
              <li key={`${customer.router_id}-${customer.customer_id}`} className="py-2 flex flex-wrap justify-between gap-2">
                <span>
                  <Link href={`/customers/${customer.customer_id}`} className="text-primary hover:underline">
                    {customer.customer_name} #{customer.customer_id}
                  </Link>
                  <span className="text-foreground-muted"> · {customer.reseller_name} · {customer.router_name}</span>
                </span>
                <span className="text-foreground-muted">{customer.status} · {customer.hotspot_user_present ? 'login remains' : 'session remains'}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-xs text-foreground-muted mt-3">
        Counts require a live authorized hotspot session. Database status alone is not proof of access.
      </p>
    </section>
  );
}
