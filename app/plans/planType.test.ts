import { describe, it, expect } from 'vitest';
import {
  PLAN_FORM_HINTS,
  applyConnectionType,
  applyPlanType,
  freeTrialAllowsConnection,
  getPlanType,
  isFreeTrialPlan,
  isPortalTrial,
  isTrialRepeatable,
  planFormFields,
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

  it('keeps PPPoE when switching a PPPoE plan to free trial (bug, 29 Oct)', () => {
    expect(applyPlanType(paid, 'free_trial', typed)).toEqual({
      plan_type: 'free_trial',
      price: 0,
      original_price: null,
      connection_type: 'pppoe',
      // Trials may cover several devices; the device count is left alone.
      max_shared_users: 3,
      trial_once_per_customer: true,
    });
  });

  it('keeps hotspot when switching a hotspot plan to free trial', () => {
    const next = applyPlanType({ ...paid, connection_type: 'hotspot' as const }, 'free_trial', typed);
    expect(next.connection_type).toBe('hotspot');
    expect(next.price).toBe(0);
  });

  it('moves a static-IP plan to hotspot, since static IP has no trials', () => {
    const next = applyPlanType({ ...paid, connection_type: 'static_ip' as const }, 'free_trial', typed);
    expect(next.connection_type).toBe('hotspot');
  });

  it('keeps PPPoE when leaving free trial again', () => {
    const trial = applyPlanType(paid, 'free_trial', typed);
    expect(applyPlanType(trial, 'regular', typed).connection_type).toBe('pppoe');
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

describe('free trial connection types', () => {
  it('allows hotspot and PPPoE, not static IP', () => {
    expect(freeTrialAllowsConnection('hotspot')).toBe(true);
    expect(freeTrialAllowsConnection('pppoe')).toBe(true);
    expect(freeTrialAllowsConnection('static_ip')).toBe(false);
    // Unknown or missing reads as hotspot, like everywhere else.
    expect(freeTrialAllowsConnection(undefined)).toBe(true);
  });

  it('only hotspot trials are claimed on the portal', () => {
    expect(isPortalTrial({ plan_type: 'free_trial', connection_type: 'hotspot' })).toBe(true);
    expect(isPortalTrial({ plan_type: 'free_trial' })).toBe(true);
    expect(isPortalTrial({ plan_type: 'free_trial', connection_type: 'pppoe' })).toBe(false);
    expect(isPortalTrial({ plan_type: 'regular', connection_type: 'hotspot' })).toBe(false);
  });
});

describe('applyConnectionType', () => {
  const trial = { plan_type: 'free_trial' as const, price: 0, connection_type: 'hotspot' as const, max_shared_users: 3 };

  it('lets a free trial switch to PPPoE and back', () => {
    const pppoe = applyConnectionType(trial, 'pppoe');
    expect(pppoe).toMatchObject({ plan_type: 'free_trial', connection_type: 'pppoe', max_shared_users: 3 });
    expect(applyConnectionType(pppoe, 'hotspot').connection_type).toBe('hotspot');
  });

  it('ignores static IP on a free trial', () => {
    expect(applyConnectionType(trial, 'static_ip')).toBe(trial);
  });

  it('makes a paid static-IP plan one device', () => {
    const next = applyConnectionType({ ...trial, plan_type: 'regular' as const, price: 50 }, 'static_ip');
    expect(next).toMatchObject({ connection_type: 'static_ip', max_shared_users: 1 });
  });
});

describe('planFormFields', () => {
  it('hotspot free trial: frequency picker and devices-per-claim', () => {
    const fields = planFormFields({ plan_type: 'free_trial', connection_type: 'hotspot' });
    expect(fields.trialFrequency).toBe(true);
    expect(fields.devices).toBe(true);
    expect(fields.devicesHint).toBe(PLAN_FORM_HINTS.hotspotTrialDevices);
    expect(fields.planTypeHint).toBe(PLAN_FORM_HINTS.hotspotTrialType);
    expect(fields.connectionHint).toBe(PLAN_FORM_HINTS.trialConnection);
  });

  it('PPPoE free trial: no portal fields, PPPoE device limit instead', () => {
    const fields = planFormFields({ plan_type: 'free_trial', connection_type: 'pppoe' });
    expect(fields.trialFrequency).toBe(false);
    expect(fields.devices).toBe(true);
    expect(fields.devicesHint).toBe(PLAN_FORM_HINTS.pppoeDevices);
    expect(fields.planTypeHint).toBe(PLAN_FORM_HINTS.pppoeTrialType);
    expect(fields.planTypeHint).not.toMatch(/login page/);
  });

  it('switching a trial between hotspot and PPPoE swaps the fields', () => {
    const trial = { plan_type: 'free_trial' as const, price: 0, connection_type: 'hotspot' as const, max_shared_users: 1 };
    const pppoe = applyConnectionType(trial, 'pppoe');
    expect(planFormFields(pppoe).trialFrequency).toBe(false);
    expect(planFormFields(applyConnectionType(pppoe, 'hotspot')).trialFrequency).toBe(true);
  });

  it('regular plans keep their usual fields', () => {
    expect(planFormFields({ plan_type: 'regular', connection_type: 'hotspot' })).toMatchObject({
      trialFrequency: false,
      devices: true,
      devicesHint: PLAN_FORM_HINTS.hotspotDevices,
      planTypeHint: PLAN_FORM_HINTS.emergencyType,
      connectionHint: null,
    });
    expect(planFormFields({ plan_type: 'regular', connection_type: 'pppoe' }).devicesHint).toBe(PLAN_FORM_HINTS.pppoeDevices);
    expect(planFormFields({ plan_type: 'regular', connection_type: 'static_ip' })).toMatchObject({
      devices: false,
      connectionHint: PLAN_FORM_HINTS.staticIp,
    });
  });
});
