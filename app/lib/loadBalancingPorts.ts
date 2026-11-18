// Mirrors _WAN_PORT_RE in the backend (app/api/load_balancing_routes.py): the
// factory RouterOS names of physical ethernet / SFP ports. sfp-sfpplus1 is the
// SFP+ cage on RB4011, RB5009 and CCR2004. Bridges, VLANs, wlan/wifi and
// tunnels are not WAN candidates.
export const WAN_PORT_NAME_RE =
  /^(?:ether[0-9]+|sfp[0-9]+|sfpplus[0-9]+|sfp-sfpplus[0-9]+|sfp28-[0-9]+|qsfpplus[0-9]+-[0-9]+|qsfp28-[0-9]+-[0-9]+|combo[0-9]+)$/;

export function isSupportedWanPortName(name: string | null | undefined): boolean {
  return !!name && WAN_PORT_NAME_RE.test(name);
}
