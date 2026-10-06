import { describe, it, expect } from 'vitest';
import {
  applyPlanType,
  getPlanType,
  isFreeTrialPlan,
  isTrialRepeatable,
  trialFrequencyLabel,
} from './planType';

describe('getPlanType', () => {
  it('passes known plan types through', () => {
    expect(getPlanType({ plan_type: 'regular' })).toBe('regular');
    expect(getPlanType({ plan_type: 'emergency' })).toBe('emergency');
    expect(getPlanType({ plan_type: 'free_trial' })).toBe('free_trial');
  });

  it('treats missing or unknown plan types as regular', () => {
    expect(getPlanType({})).toBe('regular');
    expect(getPlanType({ plan_type: 'special_offer' as never })).toBe('regular');
  });
});

describe('isFreeTrialPlan', () => {
  it('is true only for free_trial', () => {
    expect(isFreeTrialPlan({ plan_type: 'free_trial' })).toBe(true);
    expect(isFreeTrialPlan({ plan_type: 'regular' })).toBe(false);
    expect(isFreeTrialPlan({})).toBe(false);
  });
});

describe('trial frequency', () => {
  it('defaults to once per customer unless explicitly false', () => {
    expect(isTrialRepeatable({})).toBe(false);
    expect(isTrialRepeatable({ trial_once_per_customer: true })).toBe(false);
    expect(isTrialRepeatable({ trial_once_per_customer: false })).toBe(true);
    expect(trialFrequencyLabel({})).toBe('Once per customer');
    expect(trialFrequencyLabel({ trial_once_per_customer: false })).toBe('Repeatable');
  });
});

describe('applyPlanType', () => {
  const paid = {
    plan_type: 'regular' as const,
    price: 50,
    original_price: 80,
    connection_type: 'pppoe' as const,
    max_shared_users: 3,
  };
  const typed = { price: 50, maxSharedUsers: 3 };

  it('forces a free, hotspot, once-per-customer plan when switching to free trial', () => {
    expect(applyPlanType(paid, 'free_trial', typed)).toEqual({
      plan_type: 'free_trial',
      price: 0,
      original_price: null,
      connection_type: 'hotspot',
      // Trials may cover several devices; the device count is left alone.
      max_shared_users: 3,
      trial_once_per_customer: true,
    });
  });

  it('keeps an existing repeatable choice when re-selecting free trial', () => {
    const next = applyPlanType({ ...paid, trial_once_per_customer: false }, 'free_trial', typed);
    expect(next.trial_once_per_customer).toBe(false);
  });

  it('restores the last paid price and device count when leaving free trial', () => {
    const trial = applyPlanType(paid, 'free_trial', typed);
    expect(applyPlanType(trial, 'regular', typed)).toMatchObject({
      plan_type: 'regular',
      price: 50,
      max_shared_users: 3,
    });
  });

  it('leaves the price at 0 and sharing at 1 when there is nothing to restore', () => {
    const next = applyPlanType(
      { plan_type: 'free_trial' as const, price: 0, max_shared_users: 1 },
      'regular',
      { price: 0, maxSharedUsers: 0 },
    );
    expect(next.price).toBe(0);
    expect(next.max_shared_users).toBe(1);
  });

  it('clamps a restored device count to the 1-50 range', () => {
    const trial = { plan_type: 'free_trial' as const, price: 0, max_shared_users: 1 };
    expect(applyPlanType(trial, 'regular', { price: 50, maxSharedUsers: 99 }).max_shared_users).toBe(50);
  });

  it('only changes the type when moving between paid types', () => {
    expect(applyPlanType(paid, 'emergency', { price: 999, maxSharedUsers: 9 })).toEqual({
      ...paid,
      plan_type: 'emergency',
    });
  });
});
