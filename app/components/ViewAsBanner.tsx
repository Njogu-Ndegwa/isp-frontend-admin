'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  adminReturnPath,
  formatCountdown,
  getImpersonation,
  impersonationMsLeft,
  restoreAdmin,
  IMPERSONATION_READ_ONLY_EVENT,
  type ImpersonationOrigin,
} from '../lib/impersonation';
import { useT } from '../lib/i18n';
import { EyeIcon } from './ViewAsResellerDialog';

/** Don't let a hung network keep the admin stuck in the reseller's session. */
const END_REQUEST_TIMEOUT_MS = 4000;

/**
 * Sticky top banner while an admin is viewing as a reseller (read-only).
 * Loaded client-only (see ClientLayout), so reading storage on first render
 * is safe. Sits in normal flow at the top, so it never covers the fixed
 * mobile bottom nav.
 */
export default function ViewAsBanner() {
  const t = useT();
  const [origin] = useState<ImpersonationOrigin | null>(() => getImpersonation());
  const [now, setNow] = useState(() => Date.now());
  const [exiting, setExiting] = useState(false);
  const [blockedNotice, setBlockedNotice] = useState(false);
  const exitingRef = useRef(false);

  const exit = useCallback(async (ended: boolean) => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    try {
      await Promise.race([
        api.endImpersonation(),
        new Promise((resolve) => setTimeout(resolve, END_REQUEST_TIMEOUT_MS)),
      ]);
    } catch {
      // Best effort: the server also ends it at expiry.
    }
    const restored = restoreAdmin();
    window.location.assign(adminReturnPath(restored ?? origin, ended));
  }, [origin]);

  // Tick the countdown; auto-exit (same as Exit) when it reaches zero.
  useEffect(() => {
    if (!origin) return;
    const tick = () => {
      const at = Date.now();
      setNow(at);
      if (impersonationMsLeft(origin, at) <= 0) void exit(true);
    };
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [origin, exit]);

  const msLeft = origin ? impersonationMsLeft(origin, now) : 0;

  useEffect(() => {
    if (!origin) return;
    let timer: number | undefined;
    const onBlocked = () => {
      setBlockedNotice(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setBlockedNotice(false), 5000);
    };
    window.addEventListener(IMPERSONATION_READ_ONLY_EVENT, onBlocked);
    return () => {
      window.removeEventListener(IMPERSONATION_READ_ONLY_EVENT, onBlocked);
      window.clearTimeout(timer);
    };
  }, [origin]);

  if (!origin) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="view-as-banner"
      className="sticky top-0 z-40 bg-background-secondary border-b border-warning/40 shadow-sm transition-[margin] duration-300 ease-in-out"
      style={{ marginLeft: 'var(--app-sidebar-w, 0px)' }}
    >
      <div className={`transition-colors ${blockedNotice ? 'bg-warning/25' : 'bg-warning/12'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0 text-warning">
              <EyeIcon className="w-4 h-4" />
            </span>
            <p className={`text-xs sm:text-sm text-foreground min-w-0 ${blockedNotice ? 'line-clamp-2' : 'truncate'}`}>
              {blockedNotice ? (
                <span className="font-medium">{t('Read-only: changes are disabled while viewing as.')}</span>
              ) : (
                <>
                  <span className="font-semibold text-warning">{t('Viewing as {name}', { name: origin.resellerName })}</span>
                  <span className="text-foreground-muted"> · {t('read-only')} · </span>
                  <span className="tabular-nums font-medium" data-testid="view-as-countdown">
                    {t('{time} left', { time: formatCountdown(msLeft) })}
                  </span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void exit(false)}
            disabled={exiting}
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-warning text-[#09090b] hover:opacity-90 active:opacity-70 touch-manipulation transition-opacity disabled:opacity-60"
          >
            {exiting ? t('Exiting...') : t('Exit')}
          </button>
        </div>
      </div>
    </div>
  );
}
