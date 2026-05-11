'use client';

import React from 'react';
import { PortalSettings, PortalThemePalette, PortalHeaderStyle } from '../lib/types';

interface PortalPreviewProps {
  settings: PortalSettings;
  palette: PortalThemePalette;
  /** When true, renders as a full-screen experience with no phone bezel or fake status bar */
  fullscreen?: boolean;
}

const MOCK_PLANS = [
  { id: 1, price: 50,   duration: '24 HOURS', speed: '5M/2M',   popular: false },
  { id: 2, price: 500,  duration: '7 DAYS',   speed: '10M/5M',  popular: true  },
  { id: 3, price: 2500, duration: '30 DAYS',  speed: '15M/10M', popular: false },
  { id: 4, price: 150,  duration: '48 HOURS', speed: '10M/5M',  popular: false },
];

const MOCK_ADS = [
  { id: 1, emoji: '🌽', name: 'Fresh Maize',    seller: 'Soko Fresh',   price: 'KSH 30',     badge: 'HOT'  },
  { id: 2, emoji: '📱', name: 'Airtime Top-up', seller: 'M-Pesa Agent', price: 'Any amount', badge: 'NEW'  },
  { id: 3, emoji: '🛡️', name: 'Phone Cases',    seller: 'Tech Soko',    price: 'KSH 250',    badge: 'SALE' },
];

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  HOT:  { bg: '#FEE2E2', color: '#DC2626' },
  NEW:  { bg: '#DBEAFE', color: '#2563EB' },
  SALE: { bg: '#D1FAE5', color: '#059669' },
};

export default function PortalPreview({ settings, palette, fullscreen = false }: PortalPreviewProps) {
  const isHero = settings.header_style === 'hero';

  // In the phone bezel the sticky header must sit below the 36px fake status bar.
  // In fullscreen there's no status bar, so the header sticks at the top of the screen.
  const stickyHeaderTop = fullscreen ? 0 : 36;

  /* ─── CSS vars ─── */
  const cssVars = `
    --p-primary: ${palette.primary};
    --p-primary-dark: ${palette.primaryDark};
    --p-accent: ${palette.accent};
    --p-bg: ${palette.background};
    --p-surface: ${palette.surface};
    --p-text: ${palette.text};
    --p-text-sec: ${palette.textSecondary};
    --p-text-inv: ${palette.textInverse};
    --p-border: ${palette.border};
  `;

  /* ─── Render helpers ─── */

  const renderHeader = () => {
    const title    = settings.welcome_title    || 'Demo ISP';
    const subtitle = settings.welcome_subtitle || 'Public WiFi';

    if ((settings.header_style as PortalHeaderStyle) === 'hero') {
      const bgUrl   = settings.header_bg_image_url;
      const heroBg  = bgUrl
        ? `linear-gradient(135deg, ${palette.primary}bb 0%, ${palette.primaryDark}88 100%), url(${bgUrl})`
        : `linear-gradient(135deg, ${palette.primary} 0%, ${palette.primaryDark} 100%)`;
      return (
        <div className="pp-hero" style={{ backgroundImage: heroBg }}>
          {!settings.company_logo_url && (
            <div className="pp-hero-wifi">
              <svg width="30" height="24" viewBox="0 0 24 20" fill="none">
                <path d="M2 6C6.42 1.58 13.58 1.58 18 6" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"/>
                <path d="M5 9.5c3.86-3.86 10.14-3.86 14 0" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8 13c2.21-2.21 5.79-2.21 8 0" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="18" r="1.5" fill="rgba(255,255,255,0.95)"/>
              </svg>
            </div>
          )}
          {settings.company_logo_url && (
            <img src={settings.company_logo_url} alt="" className="pp-hero-logo" />
          )}
          <h1 className="pp-hero-title">{title}</h1>
          <p className="pp-hero-sub">{subtitle}</p>
          <div className="pp-hero-pills">
            <span className="pp-hero-pill">⚡ Fast</span>
            <span className="pp-hero-pill">🔒 Secure</span>
            <span className="pp-hero-pill">📱 Easy</span>
          </div>
          <div className="pp-hero-support">
            {settings.portal_support_whatsapp ? (
              <a href={`https://wa.me/${settings.portal_support_whatsapp}`} className="pp-hero-sup-btn pp-hero-sup-btn--wa">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            ) : (
              <a href={settings.portal_support_phone ? `tel:${settings.portal_support_phone}` : '#'} className="pp-hero-sup-btn">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                </svg>
                {settings.portal_support_phone ? 'Call Support' : 'Contact Support'}
              </a>
            )}
          </div>
        </div>
      );
    }

    /* standard / default */
    return (
      <header className="pp-header" style={{ top: stickyHeaderTop }}>
        <div className="pp-header-inner">
          <a href="#" className="pp-brand">
            <span className="pp-brand-icon">📡</span>
            <div className="pp-brand-text">
              <span className="pp-brand-name">{title}</span>
              <span className="pp-brand-tagline">Public WiFi</span>
            </div>
          </a>
          <a href={settings.portal_support_phone ? `tel:${settings.portal_support_phone}` : '#'} className="pp-help-btn">
            <span>📞</span>
            <span className="pp-help-text">Help</span>
          </a>
        </div>
      </header>
    );
  };

  const renderAds = () => {
    if (!settings.show_ads) return null;
    return (
      <div className="pp-ads">
        <div className="pp-ads-head">
          <span className="pp-ads-title">🛒 Soko Deals Today</span>
          <span className="pp-ads-badge">AD</span>
        </div>
        <div className="pp-ads-scroll">
          {MOCK_ADS.map((ad) => {
            const bc = BADGE_COLORS[ad.badge] ?? { bg: '#eee', color: '#555' };
            return (
              <div key={ad.id} className="pp-ad-card">
                <div className="pp-ad-img">
                  <span className="pp-ad-emoji">{ad.emoji}</span>
                  <span className="pp-ad-badge-chip" style={{ background: bc.bg, color: bc.color }}>{ad.badge}</span>
                </div>
                <div className="pp-ad-info">
                  <div className="pp-ad-name">{ad.name}</div>
                  <div className="pp-ad-seller">{ad.seller}</div>
                  <div className="pp-ad-price">{ad.price}</div>
                </div>
              </div>
            );
          })}
          <a href="#" className="pp-ad-cta">
            <div className="pp-ad-cta-icon">+</div>
            <span>Your Ad Here</span>
          </a>
        </div>
        <div className="pp-ads-hint">← Swipe for more deals →</div>
      </div>
    );
  };

  const renderSteps = () => (
    <div className="pp-steps">
      <div className="pp-step"><span className="pp-step-num">1</span><span className="pp-step-lbl">Pick Plan</span></div>
      <span className="pp-step-arrow">→</span>
      <div className="pp-step"><span className="pp-step-num">2</span><span className="pp-step-lbl">Enter Phone</span></div>
      <span className="pp-step-arrow">→</span>
      <div className="pp-step"><span className="pp-step-num">3</span><span className="pp-step-lbl">Pay &amp; Connect</span></div>
    </div>
  );

  const renderReconnect = () => (
    <div className="pp-reconnect">
      <div className="pp-reconnect-head">
        <span className="pp-reconnect-icon">🔄</span>
        <div>
          <div className="pp-reconnect-title">Already paid? Reconnect</div>
          <div className="pp-reconnect-sub">Enter your phone number or voucher code to get back online</div>
        </div>
      </div>
      <div className="pp-reconnect-body">
        <div className="pp-reconnect-row">
          <input className="pp-reconnect-input" placeholder="Phone or voucher e.g. 0712… or 4839-2910" readOnly />
          <button className="pp-reconnect-btn">Reconnect</button>
        </div>
      </div>
    </div>
  );

  const renderPlans = () => (
    <div className="pp-plans">
      <h2 className="pp-plans-title">{settings.plans_section_title || 'Choose Your Plan'}</h2>
      <div className="pp-plans-grid">
        {MOCK_PLANS.map((plan) => (
          <div key={plan.id} className={`pp-plan-card${plan.popular ? ' pp-plan-popular' : ''}`}>
            <div className="pp-plan-duration">{plan.duration}</div>
            <div className="pp-plan-price">
              <span className="pp-plan-currency">KSH</span>
              {plan.price}
            </div>
            {settings.show_plan_speed !== false && (
              <div className="pp-plan-speed">{plan.speed}</div>
            )}
            {plan.popular && <div className="pp-plan-value">Best Value ⭐</div>}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPromo = () => (
    <div className="pp-promo">
      <div className="pp-promo-inner">
        <div className="pp-promo-icon">🏠</div>
        <div className="pp-promo-text">
          <strong>Need Home WiFi?</strong>
          <span>Professional installation from KSH 2,000/month</span>
        </div>
        <a href={settings.portal_support_phone ? `tel:${settings.portal_support_phone}` : '#'} className="pp-promo-btn">
          Call Now
        </a>
      </div>
    </div>
  );

  const renderFooter = () => (
    <div className="pp-footer">
      © {new Date().getFullYear()} Bitwave Technologies. All rights reserved.
    </div>
  );

  /* ─── Scoped styles ─── */
  const styles = `
    .pp-inner {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${palette.background};
      color: ${palette.text};
      min-height: 100%;
      padding-bottom: 24px;
    }

    /* ── Status bar (bezel mode only) ── */
    .pp-status-bar {
      position: sticky;
      top: 0;
      z-index: 200;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      background: ${isHero ? palette.primary : palette.surface};
      flex-shrink: 0;
    }
    .pp-status-time {
      font-size: 0.68rem;
      font-weight: 700;
      color: ${isHero ? '#fff' : palette.text};
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .pp-status-notch {
      width: 76px;
      height: 18px;
      background: #1a1a1a;
      border-radius: 0 0 12px 12px;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      top: 0;
    }
    .pp-status-icons {
      display: flex;
      gap: 3px;
      font-size: 0.6rem;
    }

    /* ── Standard header ── */
    .pp-header {
      position: sticky;
      z-index: 100;
      background: ${palette.surface};
      border-bottom: 1px solid rgba(0,0,0,0.06);
      backdrop-filter: blur(12px);
    }
    .pp-header-inner {
      max-width: 600px;
      margin: 0 auto;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .pp-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: inherit;
    }
    .pp-brand-icon {
      font-size: 1.5rem;
      animation: pp-pulse 2s ease-in-out infinite;
    }
    @keyframes pp-pulse {
      0%, 100% { transform: scale(1); }
      50%       { transform: scale(1.1); }
    }
    .pp-brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }
    .pp-brand-name {
      font-size: 1.2rem;
      font-weight: 700;
      color: ${palette.primary};
      letter-spacing: -0.5px;
    }
    .pp-brand-tagline {
      font-size: 0.65rem;
      color: ${palette.textSecondary};
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .pp-help-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 7px 14px;
      background: ${palette.background};
      border-radius: 9999px;
      text-decoration: none;
      color: ${palette.text};
      font-weight: 600;
      font-size: 0.85rem;
      border: 1px solid ${palette.border};
      transition: all 0.2s ease;
    }
    .pp-help-text { display: inline; }

    /* ── Hero header ── */
    .pp-hero {
      padding: 28px 20px 24px;
      text-align: center;
      color: #fff;
      background-size: cover;
      background-position: center;
      min-height: 190px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .pp-hero-wifi { margin-bottom: 10px; opacity: 0.85; }
    .pp-hero-logo {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      object-fit: cover;
      margin-bottom: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .pp-hero-title {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 0 0 4px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .pp-hero-sub {
      font-size: 0.78rem;
      margin: 0;
      opacity: 0.9;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
    .pp-hero-pills {
      display: flex;
      gap: 6px;
      margin-top: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .pp-hero-pill {
      font-size: 0.6rem;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 9999px;
      background: rgba(255,255,255,0.2);
      color: rgba(255,255,255,0.95);
      letter-spacing: 0.3px;
      backdrop-filter: blur(4px);
    }
    .pp-hero-support {
      display: flex;
      gap: 6px;
      margin-top: 14px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .pp-hero-sup-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.62rem;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 9999px;
      border: 1.5px solid rgba(255,255,255,0.7);
      background: rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.95);
      text-decoration: none;
      backdrop-filter: blur(6px);
    }
    .pp-hero-sup-btn--wa {
      border-color: rgba(37,211,102,0.8);
      background: rgba(37,211,102,0.2);
    }

    /* ── Main content wrapper ── */
    .pp-main {
      max-width: 600px;
      margin: 0 auto;
      width: 100%;
      padding: 0 16px 24px;
    }

    /* ── Ads / marketplace strip ── */
    .pp-ads {
      margin: 16px -16px 20px;
      background: linear-gradient(135deg, ${palette.background === '#FFFCF2' || palette.background.includes('FF') ? '#FFF8E8' : palette.background} 0%, #FFF5E1 100%);
      padding: 14px 0;
      border-top: 1px solid rgba(232,93,4,0.08);
      border-bottom: 1px solid rgba(232,93,4,0.08);
      min-height: 195px;
    }
    .pp-ads-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px 8px;
    }
    .pp-ads-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: ${palette.text};
    }
    .pp-ads-badge {
      font-size: 0.6rem;
      font-weight: 700;
      color: ${palette.textSecondary};
      background: rgba(0,0,0,0.06);
      padding: 2px 8px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
    }
    .pp-ads-scroll {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding: 4px 16px 6px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .pp-ads-scroll::-webkit-scrollbar { display: none; }
    .pp-ad-card {
      flex-shrink: 0;
      width: 130px;
      background: ${palette.surface};
      border-radius: 12px;
      overflow: hidden;
      scroll-snap-align: start;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    .pp-ad-img {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pp-ad-emoji { font-size: 2rem; }
    .pp-ad-badge-chip {
      position: absolute;
      top: 6px;
      left: 6px;
      font-size: 0.55rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 6px;
    }
    .pp-ad-info { padding: 8px; }
    .pp-ad-name {
      font-size: 0.78rem;
      font-weight: 600;
      color: ${palette.text};
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pp-ad-seller {
      font-size: 0.62rem;
      color: ${palette.textSecondary};
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pp-ad-price {
      font-size: 0.88rem;
      font-weight: 700;
      color: ${palette.primary};
    }
    .pp-ad-cta {
      flex-shrink: 0;
      width: 130px;
      background: #f8f8f8;
      border: 2px dashed #ddd;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 130px;
      scroll-snap-align: start;
      text-decoration: none;
      text-align: center;
      gap: 6px;
      color: #999;
    }
    .pp-ad-cta-icon {
      width: 38px;
      height: 38px;
      background: #eee;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      font-weight: 300;
      color: #aaa;
    }
    .pp-ad-cta span { font-size: 0.68rem; font-weight: 600; }
    .pp-ads-hint {
      text-align: center;
      padding: 6px 16px 0;
      font-size: 0.62rem;
      color: ${palette.textSecondary};
      opacity: 0.7;
    }

    /* ── Quick steps ── */
    .pp-steps {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 0;
      margin-bottom: 14px;
    }
    .pp-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .pp-step-num {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${palette.primary};
      color: #fff;
      font-weight: 700;
      font-size: 0.78rem;
      border-radius: 50%;
    }
    .pp-step-lbl {
      font-size: 0.65rem;
      color: ${palette.textSecondary};
      font-weight: 600;
    }
    .pp-step-arrow {
      color: ${palette.textSecondary};
      font-size: 0.9rem;
      margin-bottom: 18px;
      opacity: 0.5;
    }

    /* ── Reconnect ── */
    .pp-reconnect {
      background: ${palette.surface};
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      margin-bottom: 14px;
      overflow: hidden;
      border: 2px solid #60a5fa;
    }
    .pp-reconnect-head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-bottom: 1px solid rgba(96,165,250,0.2);
    }
    .pp-reconnect-icon { font-size: 1.6rem; flex-shrink: 0; }
    .pp-reconnect-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: ${palette.text};
    }
    .pp-reconnect-sub {
      font-size: 0.72rem;
      color: ${palette.textSecondary};
    }
    .pp-reconnect-body { padding: 12px 14px; }
    .pp-reconnect-row { display: flex; gap: 8px; }
    .pp-reconnect-input {
      flex: 1;
      min-width: 0;
      padding: 10px 12px;
      font-size: 0.85rem;
      font-weight: 500;
      border: 2px solid #e5e5e5;
      border-radius: 10px;
      outline: none;
      min-height: 44px;
      background: ${palette.surface};
      color: ${palette.text};
      font-family: inherit;
    }
    .pp-reconnect-btn {
      flex-shrink: 0;
      padding: 10px 16px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(59,130,246,0.3);
      min-height: 44px;
      font-family: inherit;
    }

    /* ── Plans ── */
    .pp-plans { padding: 0; }
    .pp-plans-title {
      font-size: 1.2rem;
      font-weight: 700;
      text-align: center;
      margin-bottom: 14px;
      color: ${palette.text};
    }
    .pp-plans-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .pp-plan-card {
      background: ${palette.surface};
      border: 2px solid transparent;
      border-radius: 16px;
      padding: 20px 12px 16px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      text-align: center;
      position: relative;
      overflow: hidden;
      min-height: 140px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .pp-plan-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, ${palette.primary}, ${palette.accent});
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }
    .pp-plan-card:hover::before { transform: scaleX(1); }
    .pp-plan-popular {
      border-color: ${palette.primary};
      background: linear-gradient(180deg, ${palette.primary}08 0%, ${palette.surface} 100%);
      padding-bottom: 46px;
    }
    .pp-plan-popular::after {
      content: '⭐ Best Value';
      position: absolute;
      top: 8px;
      right: -30px;
      background: ${palette.primary};
      color: #fff;
      font-size: 0.52rem;
      font-weight: 700;
      padding: 4px 34px;
      transform: rotate(45deg);
    }
    .pp-plan-duration {
      font-size: 1rem;
      font-weight: 700;
      color: ${palette.text};
    }
    .pp-plan-price {
      font-size: 1.75rem;
      font-weight: 700;
      color: ${palette.primary};
      line-height: 1;
    }
    .pp-plan-currency {
      font-size: 0.5em;
      font-weight: 600;
      vertical-align: super;
      opacity: 0.7;
      margin-right: 1px;
    }
    .pp-plan-speed {
      font-size: 0.65rem;
      font-weight: 600;
      color: ${palette.textInverse};
      background: ${palette.text};
      padding: 3px 10px;
      border-radius: 9999px;
      display: inline-block;
    }
    .pp-plan-value {
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.62rem;
      font-weight: 700;
      color: ${palette.primary};
      padding: 4px 12px;
      background: ${palette.primary}18;
      border-radius: 9999px;
      white-space: nowrap;
    }

    /* ── Inline promo ── */
    .pp-promo {
      margin-bottom: 16px;
    }
    .pp-promo-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      background: linear-gradient(135deg, ${palette.primary}10 0%, ${palette.accent}08 100%);
      border-radius: 14px;
      border: 1px solid ${palette.primary}20;
    }
    .pp-promo-icon { font-size: 1.6rem; flex-shrink: 0; }
    .pp-promo-text {
      flex: 1;
      min-width: 0;
    }
    .pp-promo-text strong {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      color: ${palette.text};
    }
    .pp-promo-text span {
      font-size: 0.68rem;
      color: ${palette.textSecondary};
    }
    .pp-promo-btn {
      flex-shrink: 0;
      padding: 7px 14px;
      background: ${palette.primary};
      color: #fff;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-decoration: none;
    }

    /* ── Footer ── */
    .pp-footer {
      text-align: center;
      padding: 16px;
      font-size: 0.68rem;
      color: ${palette.textSecondary};
      border-top: 1px solid ${palette.border};
      margin-top: 8px;
    }
  `;

  /* ─── Content tree ─── */
  const portalContent = (
    <div className="pp-inner">
      <style>{styles}</style>

      {/* Fake status bar — bezel only */}
      {!fullscreen && (
        <div className="pp-status-bar">
          <span className="pp-status-time">9:41</span>
          <div className="pp-status-notch" />
          <div className="pp-status-icons">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>
      )}

      {renderHeader()}

      <div className="pp-main">
        {renderAds()}
        {renderSteps()}
        {renderReconnect()}
        <div style={{ marginBottom: 20 }}>
          {renderPlans()}
        </div>
        {renderPromo()}
        {renderFooter()}
      </div>
    </div>
  );

  /* ── Fullscreen mode ── */
  if (fullscreen) {
    return (
      <div style={{ width: '100%', minHeight: '100%', background: palette.background }}>
        {portalContent}
      </div>
    );
  }

  /* ── Phone bezel mode ── */
  return (
    <div className="pp-bezel-wrap">
      <div className="pp-bezel">
        <div className="pp-viewport">
          {portalContent}
        </div>
      </div>

      <style>{`
        .pp-bezel-wrap {
          display: flex;
          justify-content: center;
          padding: 8px;
        }
        .pp-bezel {
          width: 395px;
          background: #1a1a1a;
          border-radius: 44px;
          padding: 10px;
          box-shadow:
            0 25px 50px -12px rgba(0,0,0,0.5),
            0 0 0 1px rgba(255,255,255,0.1);
          position: relative;
        }
        .pp-viewport {
          width: 375px;
          height: 680px;
          overflow-y: auto;
          overflow-x: hidden;
          background: ${palette.surface};
          border-radius: 34px;
          position: relative;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .pp-viewport::-webkit-scrollbar { display: none; }

        @media (max-width: 440px) {
          .pp-bezel { width: 100%; max-width: 360px; }
          .pp-viewport { width: 100%; height: 560px; }
        }
      `}</style>
    </div>
  );
}
