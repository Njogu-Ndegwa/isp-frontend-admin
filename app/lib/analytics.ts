type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

// GA4 loads via AnalyticsScripts; gtag is absent until that script runs (and
// always absent when blocked by ad blockers), so every call is optional.
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  (window as GtagWindow).gtag?.('event', name, params);
}
