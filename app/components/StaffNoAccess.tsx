'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useT } from '../lib/i18n';
import { staffBusinessName } from '../lib/permissions';

/**
 * Shown instead of a page a staff member may not open (`landing` set), or when
 * the owner hasn't given them any page yet (`landing` null).
 */
export default function StaffNoAccess({ landing }: { landing: string | null }) {
  const { user, logout } = useAuth();
  const t = useT();
  const business = staffBusinessName(user);

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4" data-testid="staff-no-access">
      <div className="w-14 h-14 rounded-2xl bg-background-tertiary text-foreground-muted flex items-center justify-center mb-4">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      {landing ? (
        <>
          <h2 className="text-lg font-semibold text-foreground">{t("You don't have access to this page")}</h2>
          <p className="text-sm text-foreground-muted mt-1 max-w-sm">
            {t('Ask the account owner if you need it.')}
          </p>
          <Link href={landing} className="btn-primary mt-5 px-5 py-2 text-sm">
            {t('Go to my pages')}
          </Link>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-foreground">{t('No pages assigned yet')}</h2>
          <p className="text-sm text-foreground-muted mt-1 max-w-sm">
            {business
              ? t('Ask the owner of {business} to give you access.', { business })
              : t('Ask the account owner to give you access.')}
          </p>
          <button
            type="button"
            onClick={() => { logout(); window.location.assign('/login'); }}
            className="mt-5 px-5 py-2 text-sm rounded-xl border border-border text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
          >
            {t('Log out')}
          </button>
        </>
      )}
    </div>
  );
}
