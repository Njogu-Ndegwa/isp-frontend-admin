'use client';

/*
 * What an answer may offer the person reading it. An answer's chips are next steps
 * ("Renew", "Send SMS", "Edit plan"); a staff member who may only view customers is
 * not shown the ones they cannot use, and a read-only view (an admin viewing as a
 * reseller) is shown no change at all. The backend refuses either way: this only
 * keeps buttons that would fail off the screen (app/lib/permissions.ts).
 */
import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { canOffer, PERMISSIONS, type PageRequirement } from '../../lib/permissions';
import type { AuthUser } from '../../lib/types';

export { PERMISSIONS };

interface Access {
  readOnly: boolean;
  /** stands in for the signed-in user (the design preview shows a view-only staff member) */
  user?: Pick<AuthUser, 'role' | 'staff'> | null;
}

const AccessContext = createContext<Access>({ readOnly: false });

/** Sets what answers inside may offer; a view set further out (read-only, a stand-in user) carries through. */
export function AnswerAccess({ readOnly = false, user, children }: Partial<Access> & { children: React.ReactNode }) {
  const parent = useContext(AccessContext);
  const ro = readOnly || parent.readOnly;
  const who = user !== undefined ? user : parent.user;
  const value = useMemo(() => ({ readOnly: ro, user: who }), [ro, who]);
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export interface Offer {
  /** a chip that prepares a change (renew, SMS, edit): needs the permission and a writable view */
  change: (need: PageRequirement) => boolean;
  /** a chip that only reads, but reads something the permission guards (money, routers) */
  see: (need: PageRequirement) => boolean;
}

export function useOffer(): Offer {
  const ctx = useContext(AccessContext);
  const { user: signedIn } = useAuth();
  const user = ctx.user !== undefined ? ctx.user : signedIn;
  return useMemo(() => ({
    change: (need) => canOffer(user, ctx.readOnly, need, true),
    see: (need) => canOffer(user, ctx.readOnly, need, false),
  }), [user, ctx.readOnly]);
}

/** Money figures: the dashboard or the payments list is enough to read them. */
export const MONEY_VIEW: readonly string[] = [PERMISSIONS.dashboardView, PERMISSIONS.transactionsView];
