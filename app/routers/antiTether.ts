// Anti-tethering toggle copy. New routers come with it ON (the setup script
// installs the rules); the reseller can turn it off per router.
export const ANTI_TETHER_HELP =
  'Blocks customers sharing their plan via phone hotspot or their own router';

export function antiTetherToggleLabel(on: boolean | undefined): string {
  return on
    ? `Anti-tethering on (click to turn off). ${ANTI_TETHER_HELP}`
    : `Anti-tethering off (click to turn on). ${ANTI_TETHER_HELP}`;
}
