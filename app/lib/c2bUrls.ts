import { API_ORIGIN } from './api';

export interface C2BCallbackUrls {
  confirmation_url: string;
  validation_url: string;
}

/**
 * The URLs Safaricom calls when a paybill receives money.
 *
 * They must point at the FastAPI backend, which is the only host that serves
 * POST /api/c2b/confirmation and /api/c2b/validation. Never build them from
 * window.location: the dashboard runs on the Next.js frontend hosts
 * (bitwavetechnologies.com, isp-admin.bitwavetechnologies.net), which return
 * 404 for /api/c2b/*, so Safaricom would be pointed at a dead URL.
 */
export function c2bCallbackUrls(apiOrigin: string = API_ORIGIN): C2BCallbackUrls {
  const origin = apiOrigin.replace(/\/+$/, '').replace(/\/api$/, '');
  return {
    confirmation_url: `${origin}/api/c2b/confirmation`,
    validation_url: `${origin}/api/c2b/validation`,
  };
}
