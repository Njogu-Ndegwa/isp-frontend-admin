type TunnelType = 'wireguard' | 'l2tp' | 'auto' | null | undefined;

const TUNNEL_LABELS: Record<'wireguard' | 'l2tp' | 'auto', string> = {
  wireguard: 'v7 WireGuard',
  l2tp: 'v6 L2TP',
  auto: 'Auto detect',
};

const TUNNEL_CLASSES: Record<'wireguard' | 'l2tp' | 'auto', string> = {
  wireguard: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  l2tp: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  auto: 'bg-background-tertiary text-foreground-muted border-border',
};

export default function InsuranceTunnelBadge({ type }: { type: TunnelType }) {
  const normalized = type === 'wireguard' || type === 'l2tp' ? type : 'auto';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none ${TUNNEL_CLASSES[normalized]}`}
      title={normalized === 'auto' ? 'RouterOS version will be detected live before applying' : 'Inferred from the provisioning token'}
    >
      {TUNNEL_LABELS[normalized]}
    </span>
  );
}
