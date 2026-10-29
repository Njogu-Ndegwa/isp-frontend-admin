'use client';

import dynamic from 'next/dynamic';
import RouteIslandSkeleton from '../../components/RouteIslandSkeleton';
import { useAuth } from '../../context/AuthContext';
import { isStaffUser } from '../../lib/permissions';

const ProfileSettingsClient = dynamic(() => import('./ProfileSettingsClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

const StaffProfileClient = dynamic(() => import('./StaffProfileClient'), {
  ssr: false,
  loading: () => <RouteIslandSkeleton stats={0} panels={2} />,
});

// The owner's profile (business details, delete account) loads /api/profile,
// which is the OWNER's record; a staff member gets their own page instead.
export default function ProfileSettingsIsland() {
  const { user } = useAuth();
  return isStaffUser(user) ? <StaffProfileClient /> : <ProfileSettingsClient />;
}
