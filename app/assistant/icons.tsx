import type { SVGProps } from 'react';
import { BrandMark } from './BrandMark';

/* Small line icons for the AI home. They inherit the text colour. */
type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({ width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p });

export const ArrowUpIcon = (p: P) => <svg {...base(p)}><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>;
export const ArrowRightIcon = (p: P) => <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const HistoryIcon = (p: P) => <svg {...base(p)}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7.5V12l3 2" /></svg>;
export const PlusIcon = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const ChartIcon = (p: P) => <svg {...base(p)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
export const TableIcon = (p: P) => <svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16" /></svg>;
export const DownloadIcon = (p: P) => <svg {...base(p)}><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>;
export const CheckIcon = (p: P) => <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const AlertIcon = (p: P) => <svg {...base(p)}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>;
export const SpinnerIcon = (p: P) => <svg {...base(p)} className={`ai-spin ${p.className ?? ''}`}><path d="M12 3a9 9 0 1 0 9 9" /></svg>;
export const CameraIcon = (p: P) => <svg {...base(p)}><path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.4" /></svg>;
export const CloseIcon = (p: P) => <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const CopyIcon = (p: P) => <svg {...base(p)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>;
export const SunIcon = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
export const MoonIcon = (p: P) => <svg {...base(p)}><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" /></svg>;
export const MoreIcon = (p: P) => <svg {...base(p)}><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></svg>;
export const GridIcon = (p: P) => <svg {...base(p)}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>;
export const TrashIcon = (p: P) => <svg {...base(p)}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>;
export const LogoutIcon = (p: P) => <svg {...base(p)}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4" /></svg>;

export function SortIcon({ dir, ...p }: P & { dir: 'asc' | 'desc' | null }) {
  return (
    <svg {...base({ width: 11, height: 11, ...p })}>
      <path d="M8 9l4-4 4 4" opacity={dir === 'asc' ? 1 : 0.35} />
      <path d="M8 15l4 4 4-4" opacity={dir === 'desc' ? 1 : 0.35} />
    </svg>
  );
}

/** The Bitwave mark (see BrandMark): arcs rising from a wave. `live` broadcasts while the assistant works. */
export function BitwaveMark({ size = 26, live = false }: { size?: number; live?: boolean }) {
  return <BrandMark size={size} live={live} />;
}
