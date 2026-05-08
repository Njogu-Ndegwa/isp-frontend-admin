// app/lib/portalThemes.ts
// Portal theme color palettes — matches the captive portal design system

export interface PortalThemePalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  textInverse: string;
  border: string;
  success: string;
  error: string;
  info: string;
  warning: string;
}

export type PortalColorTheme =
  | 'sunset_orange'
  | 'ocean_blue'
  | 'emerald_green'
  | 'bright_violet'
  | 'rose_gold'
  | 'slate_gray';

export const THEME_PALETTES: Record<PortalColorTheme, PortalThemePalette> = {
  sunset_orange: {
    primary: '#E85D04',
    primaryLight: '#F48C06',
    primaryDark: '#DC2F02',
    accent: '#FFBA08',
    background: '#FFFCF2',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#5C5C5C',
    textInverse: '#FFFFFF',
    border: '#E5E5E5',
    success: '#10B981',
    error: '#EF4444',
    info: '#3B82F6',
    warning: '#F59E0B',
  },
  ocean_blue: {
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryDark: '#2563EB',
    accent: '#06B6D4',
    background: '#F0F7FF',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#5C5C5C',
    textInverse: '#FFFFFF',
    border: '#E5E5E5',
    success: '#10B981',
    error: '#EF4444',
    info: '#0EA5E9',
    warning: '#F59E0B',
  },
  emerald_green: {
    primary: '#10B981',
    primaryLight: '#34D399',
    primaryDark: '#059669',
    accent: '#84CC16',
    background: '#F0FDF4',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#5C5C5C',
    textInverse: '#FFFFFF',
    border: '#E5E5E5',
    success: '#16A34A',
    error: '#EF4444',
    info: '#3B82F6',
    warning: '#F59E0B',
  },
  rose_gold: {
    primary: '#E11D48',
    primaryLight: '#FB7185',
    primaryDark: '#BE123C',
    accent: '#FB923C',
    background: '#FFF1F2',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#5C5C5C',
    textInverse: '#FFFFFF',
    border: '#E5E5E5',
    success: '#10B981',
    error: '#EF4444',
    info: '#3B82F6',
    warning: '#F59E0B',
  },
  slate_gray: {
    primary: '#475569',
    primaryLight: '#64748B',
    primaryDark: '#334155',
    accent: '#F97316',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#5C5C5C',
    textInverse: '#FFFFFF',
    border: '#E5E5E5',
    success: '#10B981',
    error: '#EF4444',
    info: '#3B82F6',
    warning: '#F59E0B',
  },
  bright_violet: {
    primary: '#8B5CF6',
    primaryLight: '#A78BFA',
    primaryDark: '#7C3AED',
    accent: '#F472B6',
    background: '#FAF5FF',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#5C5C5C',
    textInverse: '#FFFFFF',
    border: '#E5E5E5',
    success: '#10B981',
    error: '#EF4444',
    info: '#3B82F6',
    warning: '#F59E0B',
  },
};

export function getThemePalette(theme: PortalColorTheme): PortalThemePalette {
  return THEME_PALETTES[theme] ?? THEME_PALETTES.sunset_orange;
}
