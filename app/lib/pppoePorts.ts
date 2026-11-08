import type { Router } from './types';

/**
 * Routers → Ports configuration for one router. RoutersClient reads `?ports=`
 * and opens that router's Port configuration dialog.
 */
export function portsConfigHref(routerId: number): string {
  return `/routers?ports=${routerId}`;
}

/** The router id in a `/routers?ports=<id>` link, or null. */
export function portsRouterIdFromSearch(search: string): number | null {
  const raw = new URLSearchParams(search).get('ports');
  const id = raw ? Number(raw) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Whether Ports configuration has any port answering PPPoE on this router
 * (a PPPoE-only port or a PPPoE + hotspot port). Saved config only; the
 * customer page checks the router live.
 */
export function routerHasPPPoEPort(
  router: Pick<Router, 'pppoe_ports' | 'dual_ports'> | null | undefined,
): boolean {
  if (!router) return false;
  return (router.pppoe_ports?.length ?? 0) > 0 || (router.dual_ports?.length ?? 0) > 0;
}

export const NO_PPPOE_SERVER_MESSAGE =
  "PPPoE isn't turned on for any port on this router, so this customer can't connect yet.";

export const NO_PPPOE_PORT_ON_CREATE_MESSAGE =
  "PPPoE isn't turned on for any port on this router, so this customer won't be able to connect until you turn it on for a port.";

export const OPEN_PORTS_CONFIGURATION = 'Open Ports configuration';
