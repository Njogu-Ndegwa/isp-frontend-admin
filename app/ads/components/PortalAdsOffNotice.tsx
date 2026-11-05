'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useT } from '../../lib/i18n';

/** Show Ads is off by default, and a portal with it off shows no ads at all:
 *  not the reseller's own promo, and not an ad a shop paid for. The backend
 *  refuses to prompt a shop until it is on. Staff who can't read the portal
 *  settings simply see nothing here. */
export default function PortalAdsOffNotice() {
  const t = useT();
  const [off, setOff] = useState(false);

  useEffect(() => {
    let alive = true;
    api.getPortalSettings()
      .then((r) => { if (alive) setOff(!r.settings.show_ads); })
      .catch(() => { /* no notice is the safe fallback */ });
    return () => { alive = false; };
  }, []);

  if (!off) return null;
  return (
    <div className="mb-5 rounded-2xl border border-warning/30 bg-warning/10 p-4" role="note" data-testid="portal-ads-off">
      <p className="text-sm font-semibold text-foreground">{t('Ads are switched off on your portal')}</p>
      <p className="mt-0.5 text-sm text-foreground-muted">
        {t('Customers won’t see any ad until you turn on Show Ads, and you can’t send a shop an M-Pesa prompt. Paid days don’t count while it’s off.')}
      </p>
      <Link href="/settings/portal-customization" className="mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-accent-primary hover:underline">
        {t('Turn on Show Ads')} →
      </Link>
    </div>
  );
}
