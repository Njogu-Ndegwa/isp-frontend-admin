'use client';

import { useId, useMemo, useState } from 'react';
import type { Router } from '../../lib/types';
import { useT } from '../../lib/i18n';

/**
 * Which routers an ad shows on. `null` = all the owner's routers (for a
 * Bitwave ad: network-wide). An empty list is a separate state the form
 * refuses to save, so "Choose routers" with nothing ticked can't silently
 * take the ad off every portal.
 */
export default function AdRouterPicker({
  routers,
  value,
  onChange,
  isAdmin,
  error,
}: {
  routers: Router[];
  value: number[] | null;
  onChange: (next: number[] | null) => void;
  isAdmin: boolean;
  error?: string;
}) {
  const t = useT();
  const id = useId();
  const [query, setQuery] = useState('');
  const scoped = value !== null;
  const selected = value ?? [];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return routers;
    return routers.filter((r) =>
      [r.name, r.identity, r.owner_name].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [routers, query]);

  const toggle = (routerId: number) =>
    onChange(selected.includes(routerId) ? selected.filter((x) => x !== routerId) : [...selected, routerId]);

  const option = (active: boolean) =>
    `flex-1 min-h-[44px] rounded-xl border px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${
      active
        ? 'border-accent-primary bg-accent-primary/10 font-semibold text-accent-primary'
        : 'border-border text-foreground-muted hover:border-foreground-muted'
    }`;

  return (
    <fieldset aria-describedby={`${id}-help`}>
      <legend className="mb-2 block text-sm font-medium text-foreground">{t('Show on')}</legend>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" aria-pressed={!scoped} onClick={() => onChange(null)} className={option(!scoped)}>
          {isAdmin ? t('Every router (network-wide)') : t('All my routers')}
        </button>
        <button
          type="button"
          aria-pressed={scoped}
          disabled={routers.length === 0}
          onClick={() => onChange(selected)}
          className={`${option(scoped)} disabled:opacity-50`}
        >
          {t('Choose routers')}
        </button>
      </div>

      {!scoped && (
        <p id={`${id}-help`} className="mt-2 text-xs text-foreground-muted">
          {isAdmin
            ? t('Shows on every Bitwave portal, including routers added later.')
            : t('Shows on every router you own, including any you add later.')}
        </p>
      )}

      {scoped && (
        <div className="mt-3">
          {routers.length > 8 && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input mb-2"
              placeholder={isAdmin ? t('Search routers or resellers') : t('Search routers')}
              aria-label={t('Search routers')}
            />
          )}
          <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-xl border border-border p-1.5">
            {visible.length === 0 && (
              <p className="px-2 py-3 text-sm text-foreground-muted">{t('No routers match.')}</p>
            )}
            {visible.map((r) => (
              <label
                key={r.id}
                className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm hover:bg-background-tertiary"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(r.id)}
                  onChange={() => toggle(r.id)}
                  className="h-5 w-5 flex-shrink-0 rounded border-border accent-amber-500"
                />
                <span className="min-w-0 flex-1 truncate text-foreground">{r.name}</span>
                {isAdmin && r.owner_name && (
                  <span className="max-w-[45%] truncate text-xs text-foreground-muted">{r.owner_name}</span>
                )}
              </label>
            ))}
          </div>
          <p id={`${id}-help`} className={`mt-2 text-xs ${error || selected.length === 0 ? 'text-danger' : 'text-foreground-muted'}`}>
            {selected.length === 0
              ? t('Pick at least one router, or choose “All my routers”.')
              : t('Shows on {n} of {total} routers.', { n: selected.length, total: routers.length })}
          </p>
        </div>
      )}
    </fieldset>
  );
}
