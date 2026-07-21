// One accent color per topic so the card grid scans at a glance
// (Intercom/M-KOPA pattern). Keys are the `category:` frontmatter values.
export interface CategoryStyle {
  label: string;
  pill: string; // Tailwind classes for the category pill
}

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
