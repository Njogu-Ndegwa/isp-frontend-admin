import type { ConnectionType, CreatePlanRequest, Plan, PlanType } from '../lib/types';
import { toConnectionType } from '../lib/connectionType';

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
 * Connection types a free trial can be on. Hotspot trials are claimed by the
 * customer on the login page; PPPoE trials are given by the reseller, who
 * registers the customer on the plan and activates them. Static IP has none.
 */
export const FREE_TRIAL_CONNECTION_TYPES: ConnectionType[] = ['hotspot', 'pppoe'];

export function freeTrialAllowsConnection(type: string | null | undefined): boolean {
  return FREE_TRIAL_CONNECTION_TYPES.includes(toConnectionType(type));
}

/**
 * A free trial customers claim themselves on the hotspot login page. Only these
 * have a claim frequency ("once per customer") and a devices-per-claim count.
 */
export function isPortalTrial(plan: { plan_type?: PlanType | null; connection_type?: string | null }): boolean {
  return plan.plan_type === 'free_trial' && toConnectionType(plan.connection_type) === 'hotspot';
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
 * Free trials must cost 0 (the backend rejects anything else), so choosing one
 * zeroes the price and drops any "was" price. Hotspot and PPPoE are both kept;
 * only a static-IP plan moves to hotspot, because static IP has no trials. The
 * device count is kept: a trial can cover several devices. Leaving free trial
 * puts back the reseller's last paid price and device count; a price of 0 is
 * left at 0 so the price field asks for one.
 */
export function applyPlanType<T extends PlanTypeFields>(form: T, planType: PlanType, paid: PaidPlanValues): T {
  if (planType === 'free_trial') {
    return {
      ...form,
      plan_type: planType,
      price: 0,
      original_price: null,
      connection_type: freeTrialAllowsConnection(form.connection_type)
        ? toConnectionType(form.connection_type)
        : 'hotspot',
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

/**
 * Switch a plan form to a new connection type. Static IP is one device per
 * subscription; other types keep the device count. A free trial cannot be
 * static IP, so that choice is ignored while the form is a free trial.
 */
export function applyConnectionType<T extends PlanTypeFields>(form: T, connectionType: ConnectionType): T {
  if (form.plan_type === 'free_trial' && !freeTrialAllowsConnection(connectionType)) return form;
  return {
    ...form,
    connection_type: connectionType,
    max_shared_users: connectionType === 'static_ip' ? 1 : (form.max_shared_users ?? 1),
  };
}

/** Which plan-form fields show, and the help text under them, for this form state. */
export interface PlanFormFields {
  /** "How often can a customer use this trial?": hotspot (portal) trials only. */
  trialFrequency: boolean;
  /** The device-count field: hidden on static IP (one device per subscription). */
  devices: boolean;
  devicesHint: string;
  planTypeHint: string;
  /** Note under the connection type, or null. */
  connectionHint: string | null;
}

export const PLAN_FORM_HINTS = {
  hotspotTrialDevices: 'Devices one claimed trial covers. 1 = only the device that claimed it.',
  pppoeDevices:
    'Devices that can be online at once with the same PPPoE username and password. Each gets the full plan speed; the data cap is shared. Changing it updates active customers’ routers; their devices reconnect once.',
  hotspotDevices: '1 disables sharing. 2 allows the owner plus one extra device.',
  hotspotTrialType: 'Customers claim this plan for free from the hotspot login page. It is not counted as revenue.',
  pppoeTrialType:
    'Register a PPPoE customer on this plan and activate them: they get it free for its duration. It is not counted as revenue.',
  emergencyType: 'Emergency plans only appear on the portal while emergency mode is active on a router.',
  staticIp: 'For devices with a fixed IP on your router. Paying opens access at this speed; expiry suspends it.',
  trialConnection: 'Free trials work on Hotspot (claimed on the login page) and PPPoE (you activate the customer).',
} as const;

export function planFormFields(form: { plan_type?: PlanType | null; connection_type?: string | null }): PlanFormFields {
  const connectionType = toConnectionType(form.connection_type);
  const isFreeTrial = form.plan_type === 'free_trial';
  const portalTrial = isPortalTrial(form);
  const isPPPoE = connectionType === 'pppoe';
  return {
    trialFrequency: portalTrial,
    devices: connectionType !== 'static_ip',
    devicesHint: portalTrial
      ? PLAN_FORM_HINTS.hotspotTrialDevices
      : isPPPoE
        ? PLAN_FORM_HINTS.pppoeDevices
        : PLAN_FORM_HINTS.hotspotDevices,
    planTypeHint: isFreeTrial
      ? (isPPPoE ? PLAN_FORM_HINTS.pppoeTrialType : PLAN_FORM_HINTS.hotspotTrialType)
      : PLAN_FORM_HINTS.emergencyType,
    connectionHint: isFreeTrial
      ? PLAN_FORM_HINTS.trialConnection
      : connectionType === 'static_ip'
        ? PLAN_FORM_HINTS.staticIp
        : null,
  };
}
