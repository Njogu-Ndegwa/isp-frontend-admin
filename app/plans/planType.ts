import type { CreatePlanRequest, Plan, PlanType } from '../lib/types';

/** Every plan type the admin knows how to show. Anything else is treated as regular. */
export const PLAN_TYPES: PlanType[] = ['regular', 'emergency', 'free_trial'];

/** Missing or unknown plan types (older plans, new backend values) read as regular. */
export function getPlanType(plan: Pick<Plan, 'plan_type'>): PlanType {
  return plan.plan_type && PLAN_TYPES.includes(plan.plan_type) ? plan.plan_type : 'regular';
}

export function isFreeTrialPlan(plan: Pick<Plan, 'plan_type'>): boolean {
  return plan.plan_type === 'free_trial';
}

/**
 * Lower-case label keys, rendered through t() with a `capitalize` class like the
 * existing 'regular' / 'emergency' keys.
 */
export const PLAN_TYPE_LABEL: Record<PlanType, string> = {
  regular: 'regular',
  emergency: 'emergency',
  free_trial: 'free trial',
};

/** Title-case labels for places that don't capitalize with CSS. */
export const PLAN_TYPE_TITLE: Record<PlanType, string> = {
  regular: 'Regular',
  emergency: 'Emergency',
  free_trial: 'Free trial',
};

export const PLAN_TYPE_BADGE: Record<PlanType, string> = {
  regular: 'badge-success',
  emergency: 'badge-warning',
  free_trial: 'badge-cyan',
};

export const PLAN_TYPE_AVATAR: Record<PlanType, 'primary' | 'warning' | 'info'> = {
  regular: 'primary',
  emergency: 'warning',
  free_trial: 'info',
};

export const PLAN_TYPE_AVATAR_CLASS: Record<PlanType, string> = {
  regular: 'bg-accent-primary/10 text-accent-primary',
  emergency: 'bg-warning/10 text-warning',
  free_trial: 'bg-info/10 text-info',
};

/** The backend defaults trial_once_per_customer to true, so only an explicit false is repeatable. */
export function isTrialRepeatable(plan: Pick<Plan, 'trial_once_per_customer'>): boolean {
  return plan.trial_once_per_customer === false;
}

export function trialFrequencyLabel(plan: Pick<Plan, 'trial_once_per_customer'>): string {
  return isTrialRepeatable(plan) ? 'Repeatable' : 'Once per customer';
}

type PlanTypeFields = Partial<
  Pick<
    CreatePlanRequest,
    'plan_type' | 'price' | 'original_price' | 'connection_type' | 'trial_once_per_customer' | 'max_shared_users'
  >
>;

/** What the reseller last typed for a paid plan, put back when they leave Free Trial. */
export interface PaidPlanValues {
  price: number;
  maxSharedUsers: number;
}

/**
 * Switch a plan form to a new plan type.
 *
 * Free trials must cost 0 and be hotspot plans (the backend rejects anything
 * else), so choosing one zeroes the price, drops any "was" price and forces
 * hotspot. The device count is kept: a trial can cover several devices. Leaving
 * free trial puts back the reseller's last paid price and device count; a price
 * of 0 is left at 0 so the price field asks for one.
 */
export function applyPlanType<T extends PlanTypeFields>(form: T, planType: PlanType, paid: PaidPlanValues): T {
  if (planType === 'free_trial') {
    return {
      ...form,
      plan_type: planType,
      price: 0,
      original_price: null,
      connection_type: 'hotspot',
      trial_once_per_customer: form.trial_once_per_customer ?? true,
    };
  }
  if (form.plan_type === 'free_trial') {
    return {
      ...form,
      plan_type: planType,
      price: paid.price > 0 ? paid.price : 0,
      max_shared_users: Math.max(1, Math.min(50, paid.maxSharedUsers || 1)),
    };
  }
  return { ...form, plan_type: planType };
}
