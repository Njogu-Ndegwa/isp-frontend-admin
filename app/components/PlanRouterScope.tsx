'use client';

import { Router } from '../lib/types';

/**
 * Picks which routers a plan is offered on.
 *
 * `null` means "all routers" and is the default for every plan — it is a
 * deliberately distinct state from an empty selection, so switching to
 * "Specific routers" without ticking anything cannot silently pull a plan off
 * every captive portal. The Save button is blocked until at least one router is
 * chosen.
 */
export default function PlanRouterScope({
  routers,
  value,
  onChange,
  disabled = false,
}: {
  routers: Router[];
  value: number[] | null;
  onChange: (next: number[] | null) => void;
  disabled?: boolean;
}) {
  const scoped = value !== null;
  const selected = value ?? [];

  const toggle = (routerId: number) => {
    if (selected.includes(routerId)) {
      onChange(selected.filter((id) => id !== routerId));
    } else {
      onChange([...selected, routerId]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">Available on</label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
            !scoped
              ? 'border-primary bg-primary/10 text-primary font-medium'
              : 'border-border text-foreground-muted hover:border-foreground-muted'
          }`}
        >
          All routers
        </button>
        <button
          type="button"
          disabled={disabled || routers.length === 0}
          onClick={() => onChange(selected)}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
            scoped
              ? 'border-primary bg-primary/10 text-primary font-medium'
              : 'border-border text-foreground-muted hover:border-foreground-muted'
          } disabled:opacity-50`}
        >
          Specific routers
        </button>
      </div>

      {!scoped && (
        <p className="mt-2 text-xs text-foreground-muted">
          This plan shows on every router you own, including any you add later.
        </p>
      )}

      {scoped && (
        <div className="mt-3">
          {routers.length === 0 ? (
            <p className="text-xs text-foreground-muted">
              You have no routers yet. Add a router first, or leave this plan on “All routers”.
            </p>
          ) : (
            <>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {routers.map((router) => (
                  <label
                    key={router.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-background-muted"
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={selected.includes(router.id)}
                      onChange={() => toggle(router.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="truncate text-foreground">{router.name}</span>
                  </label>
                ))}
              </div>
              <p
                className={`mt-2 text-xs ${
                  selected.length === 0 ? 'text-danger' : 'text-foreground-muted'
                }`}
              >
                {selected.length === 0
                  ? 'Select at least one router, or switch back to “All routers”.'
                  : `Shown on ${selected.length} of ${routers.length} routers.`}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** True when the current selection cannot be saved. */
export function isRouterScopeIncomplete(value: number[] | null): boolean {
  return value !== null && value.length === 0;
}

/** Short label for plan lists/cards. */
export function describeRouterScope(
  routerIds: number[] | null | undefined,
  routers: Router[],
): string {
  if (!routerIds || routerIds.length === 0) return 'All routers';
  if (routerIds.length === 1) {
    const match = routers.find((r) => r.id === routerIds[0]);
    return match ? match.name : '1 router';
  }
  return `${routerIds.length} routers`;
}
