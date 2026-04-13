'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface OnboardingStatus {
  hasRouters: boolean;
  hasPlans: boolean;
  hasPaymentMethods: boolean;
  hasProfile: boolean;
  isComplete: boolean;
  completedCount: number;
  totalSteps: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const TOTAL_STEPS = 4;

export function useOnboardingStatus(): OnboardingStatus {
  const [hasRouters, setHasRouters] = useState(false);
  const [hasPlans, setHasPlans] = useState(false);
  const [hasPaymentMethods, setHasPaymentMethods] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [routers, plans, paymentMethods, profile] = await Promise.allSettled([
        api.getRouters(),
        api.getPlans(),
        api.getPaymentMethods(),
        api.getProfile(),
      ]);

      setHasRouters(
        routers.status === 'fulfilled' && routers.value.length > 0
      );
      setHasPlans(
        plans.status === 'fulfilled' && plans.value.length > 0
      );
      setHasPaymentMethods(
        paymentMethods.status === 'fulfilled' && paymentMethods.value.length > 0
      );
      setHasProfile(
        profile.status === 'fulfilled' &&
        !!profile.value.support_phone &&
        profile.value.support_phone.trim().length > 0
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check setup status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const completedCount = [hasRouters, hasPlans, hasPaymentMethods, hasProfile].filter(Boolean).length;

  return {
    hasRouters,
    hasPlans,
    hasPaymentMethods,
    hasProfile,
    isComplete: completedCount === TOTAL_STEPS,
    completedCount,
    totalSteps: TOTAL_STEPS,
    loading,
    error,
    refresh: checkStatus,
  };
}

export async function quickOnboardingCheck(): Promise<boolean> {
  try {
    const routers = await api.getRouters();
    return routers.length > 0;
  } catch {
    return false;
  }
}
