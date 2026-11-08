'use client';

import Link from 'next/link';
import { useT } from '../lib/i18n';
import { OPEN_PORTS_CONFIGURATION, portsConfigHref } from '../lib/pppoePorts';

// Amber note for a PPPoE customer on a router where no port runs PPPoE: the
// login can be perfect and still never connect. Links straight to Routers →
// Ports configuration for that router.
export default function NoPPPoEPortNotice({
  routerId,
  message,
  testId = 'no-pppoe-port-notice',
}: {
  routerId: number;
  message: string;
  testId?: string;
}) {
  const t = useT();
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
      data-testid={testId}
      role="status"
    >
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      <div className="space-y-1.5 min-w-0">
        <p>{t(message)}</p>
        <Link
          href={portsConfigHref(routerId)}
          className="inline-block text-xs font-semibold underline hover:no-underline"
        >
          {t(OPEN_PORTS_CONFIGURATION)}
        </Link>
      </div>
    </div>
  );
}
