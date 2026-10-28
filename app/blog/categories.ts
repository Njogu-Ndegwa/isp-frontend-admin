import type { SolutionPath } from '../solutions/paths';

// One accent color per topic so the card grid scans at a glance
// (Intercom/M-KOPA pattern). Keys are the `category:` frontmatter values.
export interface CategoryStyle {
  label: string;
  pill: string; // Tailwind classes for the category pill
}

/**
 * The commercial page a reader of each topic is closest to buying from. Every
 * post links to it from the closing card, which is how the solution pages get
 * internal links from the whole blog.
 */
export const CATEGORY_SOLUTION: Record<string, { path: SolutionPath; cta: string }> = {
  hotspot: { path: '/hotspot-billing-system-kenya', cta: 'See how Bitwave hotspot billing works' },
  mikrotik: { path: '/hotspot-billing-system-kenya', cta: 'See how Bitwave bills on your MikroTik' },
  mpesa: { path: '/mpesa-wifi-billing-kenya', cta: 'See how Bitwave M-Pesa billing works' },
  pppoe: { path: '/pppoe-billing-system-kenya', cta: 'See how Bitwave PPPoE billing works' },
  business: { path: '/wifi-billing-system-kenya', cta: 'See how Bitwave WiFi billing works' },
  comparison: { path: '/wifi-billing-system-kenya', cta: 'See what Bitwave includes' },
};

export const CATEGORIES: Record<string, CategoryStyle> = {
  hotspot: { label: 'Hotspot', pill: 'bg-amber-500/15 text-amber-400' },
  mikrotik: { label: 'MikroTik', pill: 'bg-sky-400/15 text-sky-300' },
  mpesa: { label: 'M-Pesa', pill: 'bg-emerald-400/15 text-emerald-300' },
  pppoe: { label: 'PPPoE', pill: 'bg-orange-400/15 text-orange-300' },
  business: { label: 'Business', pill: 'bg-violet-400/15 text-violet-300' },
  comparison: { label: 'Comparison', pill: 'bg-amber-500/15 text-amber-400' },
};

const DEFAULT_STYLE: CategoryStyle = {
  label: 'Guide',
  pill: 'bg-white/10 text-white/70',
};

export function categoryStyle(category: string): CategoryStyle {
  return CATEGORIES[category] ?? { ...DEFAULT_STYLE, label: category || DEFAULT_STYLE.label };
}
