'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import type { Ad } from '../../../lib/types';
import { useT } from '../../../lib/i18n';
import Header from '../../../components/Header';
import { PageLoader } from '../../../components/LoadingSpinner';
import AdEditor from '../../components/AdEditor';

export default function EditAdClient() {
  const t = useT();
  const params = useParams();
  const adId = Number(params.id);
  const [ad, setAd] = useState<Ad | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getManagedAd(adId)
      .then((a) => { if (!cancelled) setAd(a); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this ad.'); });
    return () => { cancelled = true; };
  }, [adId]);

  if (error) {
    return (
      <div>
        <Header title={t('Edit ad')} backHref="/ads" />
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-background-secondary p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground">{t('Ad not found')}</h2>
          <p className="mt-1 text-sm text-foreground-muted">{error}</p>
          <Link href="/ads" className="btn-primary mt-4 inline-flex min-h-[44px] items-center">{t('Back to ads')}</Link>
        </div>
      </div>
    );
  }
  if (!ad) return <PageLoader />;
  return <AdEditor ad={ad} />;
}
