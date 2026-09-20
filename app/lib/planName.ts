/**
 * Package-name rules, shared by every form that edits a plan name and by the
 * portal preview that renders one.
 *
 * The captive portal prints the package name verbatim on the plan card. A card
 * is about 160px wide on a phone, which is roughly 14 characters per line at
 * the card's heading size. The portal scales the type down as a name grows, but
 * that only buys so much: past 28 characters the name drops to a third size and
 * starts wrapping to three or four lines, and the plan grid stops reading as a
 * grid. 28 characters is two comfortable lines on the narrowest phone we see,
 * so that is where the admin stops people rather than letting them discover the
 * problem on a customer's screen.
 */
export const MAX_PLAN_NAME_LENGTH = 28;

/** Names at or under this length hold the card's full heading size. */
export const COMFORTABLE_PLAN_NAME_LENGTH = 16;

export function planNameLength(name: string | null | undefined): number {
  return (name || '').trim().length;
}

export function isPlanNameTooLong(name: string | null | undefined): boolean {
  return planNameLength(name) > MAX_PLAN_NAME_LENGTH;
}

/**
 * The message shown under the field. Returns null while the name is fine, so
 * callers can render nothing rather than a permanently-present hint.
 *
 * Plans created before this limit existed can be longer than the cap. Those
 * names are not rejected on sight — the reseller is told to shorten the one
 * they are already editing, which is the only moment we can ask.
 */
export function planNameWarning(name: string | null | undefined): string | null {
  const len = planNameLength(name);
  if (len > MAX_PLAN_NAME_LENGTH) {
    const over = len - MAX_PLAN_NAME_LENGTH;
    return `${over} character${over === 1 ? '' : 's'} too long. Shorten it to ${MAX_PLAN_NAME_LENGTH} to save — longer names get squeezed on customers' phones.`;
  }
  if (len > COMFORTABLE_PLAN_NAME_LENGTH) {
    return 'Still fits, but the portal will print this in smaller type.';
  }
  return null;
}
