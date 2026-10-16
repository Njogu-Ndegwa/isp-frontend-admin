import type { PortAnalyticsPort, Router, RouterLive } from './types';

export function configuredWanPorts(router?: Pick<Router, 'lb_enabled' | 'lb_config'>): string[] {
  return router?.lb_enabled && router.lb_config?.wan_ports?.length
    ? router.lb_config.wan_ports
    : ['ether1'];
}

export function withWanRoles(ports: PortAnalyticsPort[], wanPorts: string[]): PortAnalyticsPort[] {
  return ports.map((port) => ({ ...port, uplink: !port.bridge && wanPorts.includes(port.port) }));
}

export function wanTraffic(report: RouterLive | null, routerId: number, portName: string) {
  if (!report || report.router_id !== routerId) return null;
  const port = report.ports?.find((item) => item.name === portName);
  if (!port) return null;
  const validRate = (value: number | null) => value != null && Number.isFinite(value) && value >= 0;
  const stale = !Number.isFinite(report.report_age_seconds)
    || report.report_age_seconds > Math.max(180, 3 * report.interval_seconds);
  return {
    rxBps: validRate(port.rx_bps) ? port.rx_bps : null,
    txBps: validRate(port.tx_bps) ? port.tx_bps : null,
    ageSeconds: report.report_age_seconds,
    stale,
  };
}
