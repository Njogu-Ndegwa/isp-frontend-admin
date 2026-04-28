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

function isDemo(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('demo_mode') === 'true';
}

export function useOnboardingStatus(): OnboardingStatus {
  const [hasRouters, setHasRouters] = useState(false);
  const [hasPlans, setHasPlans] = useState(false);
  const [hasPaymentMethods, setHasPaymentMethods] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    // Demo mode is treated as a fully set-up account. There's nothing for
    // the demo user to actually configure, so we short-circuit instead of
    // letting the onboarding nudges/checklist appear.
    if (isDemo()) {
      setHasRouters(true);
      setHasPlans(true);
      setHasPaymentMethods(true);
      setHasProfile(true);
      setLoading(false);
      setError(null);
      return;
    }

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

export interface OnboardingCheckResult {
  hasRouters: boolean;
  hasPlans: boolean;
  hasPaymentMethods: boolean;
  hasProfile: boolean;
  isComplete: boolean;
  completedCount: number;
  firstIncompleteStep: number;
}

export async function fullOnboardingCheck(): Promise<OnboardingCheckResult> {
  if (isDemo()) {
    return {
      hasRouters: true,
      hasPlans: true,
      hasPaymentMethods: true,
      hasProfile: true,
      isComplete: true,
      completedCount: TOTAL_STEPS,
      firstIncompleteStep: 0,
    };
  }
  try {
    const [routers, plans, paymentMethods, profile] = await Promise.allSettled([
      api.getRouters(),
      api.getPlans(),
      api.getPaymentMethods(),
      api.getProfile(),
    ]);

    const hasRouters = routers.status === 'fulfilled' && routers.value.length > 0;
    const hasPlans = plans.status === 'fulfilled' && plans.value.length > 0;
    const hasPaymentMethods = paymentMethods.status === 'fulfilled' && paymentMethods.value.length > 0;
    const hasProfile =
      profile.status === 'fulfilled' &&
      !!profile.value.support_phone &&
      profile.value.support_phone.trim().length > 0;

    const steps = [hasRouters, hasPlans, hasPaymentMethods, hasProfile];
    const completedCount = steps.filter(Boolean).length;
    const firstIncompleteStep = steps.findIndex(done => !done);

    return {
      hasRouters,
      hasPlans,
      hasPaymentMethods,
      hasProfile,
      isComplete: completedCount === TOTAL_STEPS,
      completedCount,
      firstIncompleteStep: firstIncompleteStep === -1 ? 0 : firstIncompleteStep,
    };
  } catch {
    return {
      hasRouters: false,
      hasPlans: false,
      hasPaymentMethods: false,
      hasProfile: false,
      isComplete: false,
      completedCount: 0,
      firstIncompleteStep: 0,
    };
  }
}
