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

describe('PortalPreview deals section', () => {
  const offer = {
    id: 1, title: 'Fresh onions', seller: 'Wanjiku - By the stage', price: 'KSH 120',
    imageUrl: 'https://media.example/o.webp', badgeType: 'hot', badgeText: 'HOT',
  };
  const on = settings({ show_ads: true });
  const asks = /your ad here|advertise/i;

  it('has no section when there are no ads', () => {
    for (const ads of [undefined, []]) {
      const html = renderToStaticMarkup(<PortalPreview settings={on} palette={palette} ads={ads} />);
      expect(html).not.toContain('class="pp-ads"');
      expect(html).not.toContain('Soko Deals Today');
      expect(html).not.toMatch(asks);
    }
  });

  it('shows real offers and never asks to advertise', () => {
    const html = renderToStaticMarkup(<PortalPreview settings={on} palette={palette} ads={[offer]} />);
    expect(html).toContain('Soko Deals Today');
    expect(html).toContain('Fresh onions');
    expect(html).toContain('Wanjiku - By the stage');
    expect(html).toContain('src="https://media.example/o.webp"');
    expect(html).not.toMatch(asks);
  });

  it('copes with an offer that has no photo, price or badge', () => {
    const html = renderToStaticMarkup(
      <PortalPreview settings={on} palette={palette} ads={[{ ...offer, imageUrl: null, price: null, badgeType: null, badgeText: null }]} />,
    );
    expect(html).toContain('Fresh onions');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('class="pp-ad-price"');
    expect(html).not.toContain('class="pp-ad-badge-chip"');
  });

  it('respects Show Ads off even with offers', () => {
    const html = renderToStaticMarkup(<PortalPreview settings={settings({ show_ads: false })} palette={palette} ads={[offer]} />);
    expect(html).not.toContain('class="pp-ads"');
  });
});

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
