'use client';

import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  canAccessPath,
  firstAccessiblePath,
  hasPermission,
  isAccountOwner,
  isStaffUser,
} from '../lib/permissions';

/**
 * What the signed-in user may do. Owners and admins can do everything; staff
 * only what the owner granted. The backend enforces it too, so this only
 * decides what to show.
 */
export function usePermissions() {
  const { user } = useAuth();
  return useMemo(() => ({
    isStaff: isStaffUser(user),
    isOwner: isAccountOwner(user),
    staff: user?.staff ?? null,
    can: (permission: string) => hasPermission(user, permission),
    canAccess: (pathname: string) => canAccessPath(user, pathname),
    landingPath: firstAccessiblePath(user),
  }), [user]);
}
