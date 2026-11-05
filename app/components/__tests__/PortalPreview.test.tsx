import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PortalPreview from '../PortalPreview';
import type { PortalSettings, PortalThemePalette } from '../../lib/types';

const palette = {
  primary: '#334155', primaryDark: '#1e293b', primaryLight: '#64748b', accent: '#0ea5e9', background: '#F8FAFC',
} as unknown as PortalThemePalette;

const settings = (over: Partial<PortalSettings> = {}): PortalSettings => ({
  header_style: 'hero',
  welcome_title: 'Welcome to TDK',
  welcome_subtitle: 'Affordable, Fast & Reliable',
  portal_support_phone: '0712345678',
  portal_support_whatsapp: null,
  ...over,
} as PortalSettings);

const render = (s: PortalSettings) => renderToStaticMarkup(<PortalPreview settings={s} palette={palette} />);

describe('PortalPreview hero support button', () => {
  // The live captive portal (isp-frontend renderHeroHeader) never shows WhatsApp
  // in the hero, so the preview must not promise it either.
  it('shows Call Support, not WhatsApp, even when a WhatsApp number is set', () => {
    const html = render(settings({ portal_support_whatsapp: '0798765432' }));
    expect(html).toContain('Call Support');
    expect(html).toContain('href="tel:0712345678"');
    expect(html).not.toContain('wa.me');
    expect(html).not.toContain('WhatsApp');
  });

  it('shows Call Support when only a phone is set', () => {
    const html = render(settings());
    expect(html).toContain('Call Support');
    expect(html).toContain('href="tel:0712345678"');
  });
});
