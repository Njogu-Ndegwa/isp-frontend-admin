// PPPoE "share speed across devices": with it on, all devices on one login
// share the plan speed (one limit on the router) instead of each getting the
// full speed. Only means something for a PPPoE plan allowing 2+ devices.

export function showsSharedSpeedToggle(
  connectionType: string | null | undefined,
  maxSharedUsers: number | null | undefined,
): boolean {
  return connectionType === 'pppoe' && (Number(maxSharedUsers) || 1) > 1;
}

/** Value to send to the API: never true where the switch is hidden. */
export function sharedSpeedForPayload(
  connectionType: string | null | undefined,
  maxSharedUsers: number | null | undefined,
  value: boolean | null | undefined,
): boolean {
  return showsSharedSpeedToggle(connectionType, maxSharedUsers) && Boolean(value);
}

/** Hint under the PPPoE device count. */
export function pppoeDevicesHint(sharedSpeed: boolean): string {
  return sharedSpeed
    ? 'Devices that can be online at once with the same PPPoE username and password. They share the plan speed and the data cap. Changing it updates active customers’ routers; their devices reconnect once.'
    : 'Devices that can be online at once with the same PPPoE username and password. Each gets the full plan speed; the data cap is shared. Changing it updates active customers’ routers; their devices reconnect once.';
}

/** Line under a customer's connected PPPoE sessions. */
export function pppoeSessionsSpeedNote(
  sharedSpeed: boolean,
  sessions: number,
  planSpeed?: string | null,
): string {
  if (sharedSpeed) {
    return planSpeed
      ? `Sessions share the plan speed: together they use up to ${planSpeed}.`
      : 'Sessions share the plan speed.';
  }
  return `Each session has its own speed limit, so together they can use up to ${sessions}× the plan speed.`;
}
