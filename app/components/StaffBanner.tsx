'use client';

import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useT } from '../lib/i18n';
import { isStaffUser, staffBusinessName, STAFF_PERMISSION_DENIED_EVENT } from '../lib/permissions';

/**
 * Slim, calm banner while a staff sub-user is signed in, so it's always clear
 * whose account this is. Also turns the API client's "not allowed" events
 * (403 staff_permission_denied) into a toast, without signing anyone out.
 * Sits in normal flow at the top, so it never covers the fixed bottom nav.
 */
export default function StaffBanner() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const t = useT();
  const isStaff = isStaffUser(user);

  useEffect(() => {
    if (!isStaff) return;
    const onDenied = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      showAlert('error', detail?.message || t('You do not have permission to do this. Ask the account owner.'));
    };
    window.addEventListener(STAFF_PERMISSION_DENIED_EVENT, onDenied);
    return () => window.removeEventListener(STAFF_PERMISSION_DENIED_EVENT, onDenied);
  }, [isStaff, showAlert, t]);

  if (!isStaff || !user?.staff) return null;

  const business = staffBusinessName(user);

  return (
    <div
      role="status"
      data-testid="staff-banner"
      className="bg-background-secondary border-b border-border transition-[margin] duration-300 ease-in-out"
      style={{ marginLeft: 'var(--app-sidebar-w, 0px)' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0 text-info">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </span>
        <p className="text-xs text-foreground-muted truncate min-w-0">
          {business
            ? t('Logged in as {name} (Staff of {business})', { name: user.staff.name || user.staff.email, business })
            : t('Logged in as {name} (Staff)', { name: user.staff.name || user.staff.email })}
        </p>
      </div>
    </div>
  );
}
