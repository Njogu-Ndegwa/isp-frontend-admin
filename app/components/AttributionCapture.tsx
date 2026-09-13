'use client';

import { useEffect } from 'react';
import { captureAttribution } from '../lib/attribution';

/**
 * Records where the visitor came from, once per document load.
 *
 * Mount-only is deliberate: an ad click is always a fresh page load, so the
 * campaign parameters are present here. Client-side navigation within the site
 * never introduces a new external source, so re-running on route change would
 * only overwrite a real referrer with our own host.
 */
export default function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);

  return null;
}
