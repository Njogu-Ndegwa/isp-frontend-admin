'use client';

import React from 'react';
import { PortalSettings, PortalThemePalette, PortalHeaderStyle } from '../lib/types';

interface PortalPreviewProps {
  settings: PortalSettings;
  palette: PortalThemePalette;
}

const MOCK_PLANS = [
  { id: 1, name: 'Daily Lite', price: 50, duration: '24 HOURS', speed: '5M/2M', popular: false },
  { id: 2, name: 'Weekly Standard', price: 500, duration: '7 DAYS', speed: '10M/5M', popular: true },
  { id: 3, name: 'Monthly Unlimited', price: 2500, duration: '30 DAYS', speed: '15M/10M', popular: false },
  { id: 4, name: 'Weekend Pass', price: 150, duration: '48 HOURS', speed: '10M/5M', popular: false },
];

const MOCK_ADS = [
  { id: 1, name: 'Fresh Maize', seller: 'Soko Fresh', price: 'KSH 30', badge: 'HOT' },
  { id: 2, name: 'Airtime Top-up', seller: 'M-Pesa Agent', price: 'Any amount', badge: 'NEW' },
  { id: 3, name: 'Phone Cases', seller: 'Tech Soko', price: 'KSH 250', badge: 'SALE' },
];

export default function PortalPreview({ settings, palette }: PortalPreviewProps) {
  const isDark = false; // All current themes are light mode
  const isHero = settings.header_style === 'hero';

  const cssVars = `
    --p-primary: ${palette.primary};
    --p-primary-light: ${palette.primaryLight};
    --p-primary-dark: ${palette.primaryDark};
    --p-accent: ${palette.accent};
    --p-bg: ${palette.background};
    --p-surface: ${palette.surface};
    --p-text: ${palette.text};
    --p-text-secondary: ${palette.textSecondary};
    --p-text-inverse: ${palette.textInverse};
    --p-border: ${palette.border};
    --p-success: ${palette.success};
    --p-error: ${palette.error};
    --p-info: ${palette.info};
    --p-warning: ${palette.warning};
  `;

  const renderHeader = () => {
    const logoUrl = settings.company_logo_url;
    const title = settings.welcome_title || 'Demo ISP';
    const subtitle = settings.welcome_subtitle || 'Public WiFi';

    switch (settings.header_style as PortalHeaderStyle) {
      case 'minimal':
        return (
          <div className="pp-header-minimal">
            <div className="pp-header-minimal-text">{title}</div>
          </div>
        );
      case 'compact':
        return (
          <div className="pp-header-compact">
            <div className="pp-header-compact-inner">
              <span className="pp-header-compact-icon">📡</span>
              <span className="pp-header-compact-name">{title}</span>
            </div>
            <a href="#" className="pp-header-compact-help">📞 Help</a>
          </div>
        );
      case 'hero': {
        const bgUrl = settings.header_bg_image_url;
        const heroBg = bgUrl
          ? `linear-gradient(135deg, ${palette.primary}bb 0%, ${palette.primaryDark}88 100%), url(${bgUrl})`
          : `linear-gradient(135deg, ${palette.primary} 0%, ${palette.primaryDark} 100%)`;
        const heroBgSize = 'cover';
        return (
          <div
            className="pp-header-hero"
            style={{
              backgroundImage: heroBg,
              backgroundSize: heroBgSize,
            }}
          >
            {/* WiFi signal icon — shown when there is no company logo */}
            {!settings.company_logo_url && (
              <div className="pp-hero-wifi-icon">
                <svg width="30" height="24" viewBox="0 0 24 20" fill="none">
                  <path d="M2 6C6.42 1.58 13.58 1.58 18 6" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M5 9.5c3.86-3.86 10.14-3.86 14 0" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 13c2.21-2.21 5.79-2.21 8 0" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="18" r="1.5" fill="rgba(255,255,255,0.95)"/>
                </svg>
              </div>
            )}
            {settings.company_logo_url && (
              <img src={settings.company_logo_url} alt="" className="pp-header-hero-logo" />
            )}
            <h1 className="pp-header-hero-title">{title}</h1>
            <p className="pp-header-hero-subtitle">{subtitle}</p>
            {/* Feature pills */}
            <div className="pp-hero-features">
              <span className="pp-hero-feature">⚡ Fast</span>
              <span className="pp-hero-feature">🔒 Secure</span>
              <span className="pp-hero-feature">📱 Easy</span>
            </div>
            {/* Support contact buttons — always visible in hero */}
            <div className="pp-hero-support">
              {settings.portal_support_whatsapp ? (
                <a href={`https://wa.me/${settings.portal_support_whatsapp}`} className="pp-hero-support-btn pp-hero-support-btn--wa">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
              ) : settings.portal_support_phone ? (
                <a href={`tel:${settings.portal_support_phone}`} className="pp-hero-support-btn">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                  </svg>
                  Call Support
                </a>
              ) : (
                <span className="pp-hero-support-btn">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                  </svg>
                  Contact Support
                </span>
              )}
            </div>
          </div>
        );
      }
      case 'standard':
      default:
        return (
          <div className="pp-header-standard">
            <div className="pp-header-standard-inner">
              <a href="#" className="pp-brand">
                <span className="pp-brand-icon">📡</span>
                <div className="pp-brand-text">
                  <h1 className="pp-brand-title">{title}</h1>
                  <span className="pp-brand-tagline">{subtitle}</span>
                </div>
              </a>
              <a href="#" className="pp-help-btn">
                <span>📞</span>
                <span className="pp-help-text">Help</span>
              </a>
            </div>
          </div>
        );
    }
  };

  const renderSupportStrip = () => {
    // Show support strip for minimal/standard/compact only; hero has in-hero support buttons
    const needsStrip = settings.header_style === 'minimal';
    if (!needsStrip) return null;
    const phone = settings.portal_support_phone;
    if (!phone) return null;
    return (
      <a href={`tel:${phone}`} className="pp-support-strip">
        <span>📞</span>
        <span className="pp-support-strip-text">Need help? Call {phone}</span>
      </a>
    );
  };

  const renderAnnouncement = () => {
    // Hardcoded off — hidden from UI
    return null;
  };

  const renderWelcomeBanner = () => {
    if (!settings.show_welcome_banner) return null;
    return (
      <div className="pp-welcome">
        <h2 className="pp-welcome-title">{settings.welcome_title || 'Welcome'}</h2>
        <p className="pp-welcome-subtitle">{settings.welcome_subtitle || 'Fast internet for everyone'}</p>
      </div>
    );
  };

  const renderAds = () => {
    if (!settings.show_ads) return null;
    return (
      <div className="pp-ads">
        <div className="pp-ads-header">
          <span className="pp-ads-title">🛒 Soko Deals Today</span>
          <span className="pp-ads-badge">AD</span>
        </div>
        <div className="pp-ads-scroll">
          {MOCK_ADS.map((ad) => (
            <div key={ad.id} className="pp-ad-card">
              <div className="pp-ad-image">
                <div className="pp-ad-placeholder">🛍️</div>
                <span className="pp-ad-image-badge">{ad.badge}</span>
              </div>
              <div className="pp-ad-info">
                <div className="pp-ad-name">{ad.name}</div>
                <div className="pp-ad-seller">{ad.seller}</div>
                <div className="pp-ad-price">{ad.price}</div>
              </div>
            </div>
          ))}
          <div className="pp-ad-cta">
            <div className="pp-ad-cta-icon">+</div>
            <span>Your Ad Here</span>
          </div>
        </div>
        <div className="pp-ads-hint">← Swipe for more deals →</div>
      </div>
    );
  };

  const renderQuickSteps = () => (
    <div className="pp-steps">
      <div className="pp-step">
        <span className="pp-step-num">1</span>
        <span className="pp-step-text">Pick Plan</span>
      </div>
      <span className="pp-step-arrow">→</span>
      <div className="pp-step">
        <span className="pp-step-num">2</span>
        <span className="pp-step-text">Enter Phone</span>
      </div>
      <span className="pp-step-arrow">→</span>
      <div className="pp-step">
        <span className="pp-step-num">3</span>
        <span className="pp-step-text">Pay &amp; Connect</span>
      </div>
    </div>
  );

  const renderReconnect = () => {
    // Hardcoded on — always shown
    return (
      <div className="pp-reconnect">
        <div className="pp-reconnect-header">
          <span>🔄</span>
          <div>
            <div className="pp-reconnect-title">Already paid? Reconnect</div>
            <div className="pp-reconnect-subtitle">Enter your phone number or voucher code</div>
          </div>
        </div>
        <div className="pp-reconnect-body">
          <div className="pp-reconnect-row">
            <input className="pp-reconnect-input" placeholder="Phone or voucher" readOnly />
            <button className="pp-reconnect-btn">Reconnect</button>
          </div>
        </div>
      </div>
    );
  };

  const renderPlans = () => (
    <div className="pp-plans">
      <h2 className="pp-plans-title">{settings.plans_section_title || 'Choose Your Plan'}</h2>
      <div className="pp-plans-grid">
        {MOCK_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`pp-plan-card ${plan.popular ? 'pp-plan-popular' : ''}`}
          >
            <div className="pp-plan-duration">{plan.duration}</div>
            <div className="pp-plan-price">
              <span className="pp-plan-currency">KSH</span>
              {plan.price}
            </div>
            {settings.show_plan_speed !== false && (
              <div className="pp-plan-speed">{plan.speed}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSocialLinks = () => {
    // Hardcoded off — hidden from UI
    return null;
  };

  const renderFooter = () => {
    return <div className="pp-footer">© {new Date().getFullYear()} Bitwave Technologies. All rights reserved.</div>;
  };

  return (
    <div className="pp-phone-wrapper">
      {/* Phone bezel */}
      <div className="pp-phone-bezel">

        {/* Scrollable viewport — status bar is sticky inside */}
        <div className="pp-viewport" style={{ '--vars': cssVars } as React.CSSProperties}>
          <div className="pp-viewport-inner" style={{ background: palette.background, color: palette.text }}>
            <style>{`
              .pp-viewport-inner {
                font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                min-height: 100%;
                padding-bottom: 24px;
              }

              /* Status bar — sticky at top of viewport */
              .pp-status-bar {
                position: sticky;
                top: 0;
                z-index: 200;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 24px;
                background: ${isHero ? palette.primary : palette.surface};
                flex-shrink: 0;
              }
              .pp-status-time {
                font-size: 0.7rem;
                font-weight: 600;
                color: ${isHero ? '#ffffff' : palette.text};
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                min-width: 32px;
              }
              .pp-status-notch {
                width: 80px;
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
                gap: 4px;
                font-size: 0.65rem;
                min-width: 32px;
                justify-content: flex-end;
              }
              /* Header: Standard — sticks below the status bar */
              .pp-header-standard {
                position: sticky;
                top: 36px;
                z-index: 100;
                background: ${palette.surface};
                border-bottom: 1px solid ${palette.border};
                backdrop-filter: blur(12px);
              }
              .pp-header-standard-inner {
                max-width: 600px;
                margin: 0 auto;
                padding: 12px 16px;
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
              .pp-brand-icon { font-size: 1.25rem; }
              .pp-brand-text { display: flex; flex-direction: column; line-height: 1.2; }
              .pp-brand-title {
                font-size: 1.05rem;
                font-weight: 700;
                color: ${palette.primary};
                letter-spacing: -0.5px;
                margin: 0;
              }
              .pp-brand-tagline {
                font-size: 0.6rem;
                color: ${palette.textSecondary};
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 600;
              }
              .pp-help-btn {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 6px 12px;
                background: ${palette.background};
                border-radius: 9999px;
                text-decoration: none;
                color: ${palette.text};
                font-weight: 600;
                font-size: 0.8rem;
              }
              .pp-help-text { display: inline; }

              /* Header: Minimal */
              .pp-header-minimal {
                text-align: center;
                padding: 16px;
                background: ${palette.surface};
                border-bottom: 1px solid ${palette.border};
              }
              .pp-header-minimal-text {
                font-size: 1.1rem;
                font-weight: 700;
                color: ${palette.primary};
              }

              /* Header: Compact */
              .pp-header-compact {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 16px;
                background: ${palette.surface};
                border-bottom: 1px solid ${palette.border};
              }
              .pp-header-compact-inner {
                display: flex;
                align-items: center;
                gap: 6px;
              }
              .pp-header-compact-icon { font-size: 1rem; }
              .pp-header-compact-name {
                font-size: 0.9rem;
                font-weight: 700;
                color: ${palette.primary};
              }
              .pp-header-compact-help {
                font-size: 0.75rem;
                color: ${palette.textSecondary};
                text-decoration: none;
              }

              /* Header: Hero */
              .pp-header-hero {
                padding: 32px 20px;
                text-align: center;
                color: #fff;
                background-size: cover;
                background-position: center;
                min-height: 185px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .pp-header-hero-logo {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                object-fit: cover;
                margin-bottom: 8px;
                background: rgba(255,255,255,0.2);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              }
              .pp-header-hero-title {
                font-size: 1.35rem;
                font-weight: 700;
                margin: 0 0 3px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
              }
              .pp-header-hero-subtitle {
                font-size: 0.75rem;
                margin: 0;
                opacity: 0.9;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
              }
              .pp-hero-wifi-icon {
                margin-bottom: 10px;
                opacity: 0.85;
              }
              .pp-hero-features {
                display: flex;
                gap: 6px;
                margin-top: 10px;
                flex-wrap: wrap;
                justify-content: center;
              }
              .pp-hero-feature {
                font-size: 0.58rem;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 9999px;
                background: rgba(255,255,255,0.2);
                color: rgba(255,255,255,0.95);
                letter-spacing: 0.3px;
                backdrop-filter: blur(4px);
              }
              .pp-hero-support {
                display: flex;
                gap: 6px;
                margin-top: 12px;
                flex-wrap: wrap;
                justify-content: center;
              }
              .pp-hero-support-btn {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 0.6rem;
                font-weight: 700;
                padding: 5px 10px;
                border-radius: 9999px;
                border: 1.5px solid rgba(255,255,255,0.7);
                background: rgba(255,255,255,0.15);
                color: rgba(255,255,255,0.95);
                text-decoration: none;
                backdrop-filter: blur(6px);
                letter-spacing: 0.2px;
              }
              .pp-hero-support-btn--wa {
                border-color: rgba(37,211,102,0.8);
                background: rgba(37,211,102,0.2);
              }

              /* Support strip (for Hero & Minimal) */
              .pp-support-strip {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 8px 16px;
                background: ${palette.primary}10;
                border-bottom: 1px solid ${palette.border};
                text-decoration: none;
                color: ${palette.primary};
                font-size: 0.75rem;
                font-weight: 600;
              }
              .pp-support-strip-text {
                font-size: 0.7rem;
                color: ${palette.textSecondary};
              }

              /* Announcement */
              .pp-announcement {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 12px 16px;
                padding: 10px 14px;
                border-radius: 12px;
                border: 1px solid;
                font-size: 0.8rem;
                font-weight: 600;
              }
              .pp-announcement-icon { flex-shrink: 0; }
              .pp-announcement-text { line-height: 1.4; }

              /* Welcome banner */
              .pp-welcome {
                text-align: center;
                padding: 16px;
              }
              .pp-welcome-title {
                font-size: 1.25rem;
                font-weight: 700;
                margin: 0 0 4px;
                color: ${palette.text};
              }
              .pp-welcome-subtitle {
                font-size: 0.85rem;
                margin: 0;
                color: ${palette.textSecondary};
              }

              /* Ads */
              .pp-ads {
                margin: 12px -16px 16px;
                background: linear-gradient(135deg, ${palette.background} 0%, rgba(232,93,4,0.05) 100%);
                padding: 12px 0;
                border-bottom: 1px solid ${palette.border};
              }
              .pp-ads-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 16px 8px;
              }
              .pp-ads-title {
                font-size: 0.9rem;
                font-weight: 700;
                color: ${palette.text};
              }
              .pp-ads-badge {
                font-size: 0.55rem;
                font-weight: 700;
                color: ${palette.textSecondary};
                background: rgba(0,0,0,0.05);
                padding: 2px 8px;
                border-radius: 9999px;
                letter-spacing: 0.5px;
              }
              .pp-ads-scroll {
                display: flex;
                gap: 12px;
                overflow-x: auto;
                scroll-snap-type: x mandatory;
                padding: 6px 16px;
                scrollbar-width: none;
              }
              .pp-ads-scroll::-webkit-scrollbar { display: none; }
              .pp-ad-card {
                flex-shrink: 0;
                width: 120px;
                background: ${palette.surface};
                border-radius: 12px;
                overflow: hidden;
                scroll-snap-align: start;
                box-shadow: 0 1px 3px rgba(0,0,0,0.08);
              }
              .pp-ad-image {
                position: relative;
                width: 100%;
                aspect-ratio: 1;
                background: #f5f5f5;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .pp-ad-placeholder { font-size: 1.5rem; }
              .pp-ad-image-badge {
                position: absolute;
                top: 6px;
                left: 6px;
                font-size: 0.55rem;
                font-weight: 700;
                padding: 2px 6px;
                border-radius: 6px;
                background: ${palette.surface};
                box-shadow: 0 1px 3px rgba(0,0,0,0.08);
              }
              .pp-ad-info { padding: 8px; }
              .pp-ad-name {
                font-size: 0.7rem;
                font-weight: 600;
                color: ${palette.text};
                margin-bottom: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .pp-ad-seller {
                font-size: 0.6rem;
                color: ${palette.textSecondary};
                margin-bottom: 4px;
              }
              .pp-ad-price {
                font-size: 0.8rem;
                font-weight: 700;
                color: ${palette.primary};
              }
              .pp-ad-cta {
                flex-shrink: 0;
                width: 120px;
                background: #f8f8f8;
                border: 2px dashed ${palette.border};
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 120px;
                scroll-snap-align: start;
                text-align: center;
              }
              .pp-ad-cta-icon {
                width: 36px;
                height: 36px;
                margin-bottom: 6px;
                background: #eee;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                font-weight: 300;
                color: #999;
              }
              .pp-ad-cta span {
                font-size: 0.65rem;
                font-weight: 600;
                color: #999;
              }
              .pp-ads-hint {
                text-align: center;
                padding: 8px 16px 0;
                font-size: 0.6rem;
                color: ${palette.textSecondary};
                opacity: 0.7;
              }

              /* Steps */
              .pp-steps {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 14px 0;
                margin-bottom: 12px;
              }
              .pp-step {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 3px;
              }
              .pp-step-num {
                width: 26px;
                height: 26px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: ${palette.primary};
                color: #fff;
                font-weight: 700;
                font-size: 0.7rem;
                border-radius: 50%;
              }
              .pp-step-text {
                font-size: 0.6rem;
                color: ${palette.textSecondary};
                font-weight: 600;
              }
              .pp-step-arrow {
                color: ${palette.textSecondary};
                font-size: 0.85rem;
                margin-bottom: 14px;
                opacity: 0.5;
              }

              /* Reconnect */
              .pp-reconnect {
                background: ${palette.surface};
                border-radius: 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                margin: 0 16px 12px;
                overflow: hidden;
                border: 2px solid ${palette.info}40;
              }
              .pp-reconnect-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 14px;
                background: linear-gradient(135deg, ${palette.info}10 0%, ${palette.info}08 100%);
                border-bottom: 1px solid ${palette.info}20;
              }
              .pp-reconnect-title {
                font-size: 0.9rem;
                font-weight: 700;
                color: ${palette.text};
              }
              .pp-reconnect-subtitle {
                font-size: 0.7rem;
                color: ${palette.textSecondary};
              }
              .pp-reconnect-body { padding: 12px 14px; }
              .pp-reconnect-row {
                display: flex;
                gap: 8px;
              }
              .pp-reconnect-input {
                flex: 1;
                min-width: 0;
                padding: 10px;
                font-size: 0.85rem;
                font-weight: 600;
                border: 2px solid ${palette.border};
                border-radius: 10px;
                outline: none;
                background: ${palette.surface};
                color: ${palette.text};
              }
              .pp-reconnect-btn {
                flex-shrink: 0;
                padding: 10px 16px;
                background: linear-gradient(135deg, ${palette.primary} 0%, ${palette.primaryDark} 100%);
                color: #fff;
                border: none;
                border-radius: 10px;
                font-size: 0.8rem;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 4px 12px ${palette.primary}40;
              }

              /* Plans */
              .pp-plans { padding: 0 16px; }
              .pp-plans-title {
                font-size: 1.1rem;
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
                padding: 16px 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                text-align: center;
                position: relative;
                overflow: hidden;
                min-height: 120px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .pp-plan-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, ${palette.primary}, ${palette.accent});
                transform: scaleX(0);
                transition: transform 0.3s ease;
              }
              .pp-plan-card:hover::before { transform: scaleX(1); }
              .pp-plan-popular {
                border-color: ${palette.primary};
                background: linear-gradient(180deg, ${palette.primary}08 0%, ${palette.surface} 100%);
              }
              .pp-plan-popular::after {
                content: '⭐ Best Value';
                position: absolute;
                top: 6px;
                right: -28px;
                background: ${palette.primary};
                color: #fff;
                font-size: 0.5rem;
                font-weight: 700;
                padding: 3px 28px;
                transform: rotate(45deg);
              }
              .pp-plan-duration {
                font-size: 0.95rem;
                font-weight: 700;
                color: ${palette.text};
                margin-bottom: 4px;
              }
              .pp-plan-price {
                font-size: 1.5rem;
                font-weight: 700;
                color: ${palette.primary};
                margin-bottom: 6px;
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

              /* Social links */
              .pp-social {
                display: flex;
                justify-content: center;
                gap: 16px;
                padding: 14px 16px;
                margin-bottom: 12px;
              }
              .pp-social-link {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                text-decoration: none;
              }
              .pp-social-icon {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: ${palette.primary}15;
                color: ${palette.primary};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.85rem;
                font-weight: 700;
              }
              .pp-social-label {
                font-size: 0.6rem;
                color: ${palette.textSecondary};
                font-weight: 600;
              }

              /* Footer */
              .pp-footer {
                text-align: center;
                padding: 14px 16px;
                font-size: 0.7rem;
                color: ${palette.textSecondary};
                border-top: 1px solid ${palette.border};
                margin-top: 8px;
              }
            `}</style>

            {/* Status bar — inside viewport so it blends with hero gradient */}
            <div className="pp-status-bar">
              <span className="pp-status-time">9:41</span>
              <div className="pp-status-notch" />
              <div className="pp-status-icons">
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>

            {renderHeader()}
            {renderSupportStrip()}
            {renderAnnouncement()}
            {renderWelcomeBanner()}
            {renderAds()}
            {renderQuickSteps()}
            {renderReconnect()}
            {renderPlans()}
            {renderSocialLinks()}
            {renderFooter()}

            {/* Help / Support card */}
            <div
              style={{
                margin: '0 16px 16px',
                background: 'linear-gradient(135deg, #1A1A1A 0%, #333 100%)',
                borderRadius: 16,
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🎧</span>
              <div style={{ flex: 1, color: '#fff', minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: 2 }}>Need Help?</strong>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                  {settings.portal_support_phone || settings.portal_support_whatsapp
                    ? 'Our support team is ready to assist you'
                    : 'Contact your service provider for assistance'}
                </span>
              </div>
              {settings.portal_support_whatsapp ? (
                <a
                  href={`https://wa.me/${settings.portal_support_whatsapp}`}
                  style={{
                    flexShrink: 0,
                    background: '#25D366',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 9999,
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    textDecoration: 'none',
                  }}
                >
                  WhatsApp
                </a>
              ) : (
                <a
                  href={settings.portal_support_phone ? `tel:${settings.portal_support_phone}` : undefined}
                  style={{
                    flexShrink: 0,
                    background: palette.accent,
                    color: '#1A1A1A',
                    padding: '6px 12px',
                    borderRadius: 9999,
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    textDecoration: 'none',
                    cursor: settings.portal_support_phone ? 'pointer' : 'default',
                  }}
                >
                  Call Now
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scoped phone chrome styles */}
      <style>{`
        .pp-phone-wrapper {
          display: flex;
          justify-content: center;
          padding: 8px;
        }
        .pp-phone-bezel {
          width: 395px;
          background: #1a1a1a;
          border-radius: 44px;
          padding: 10px;
          box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          position: relative;
        }
        .pp-viewport {
          width: 375px;
          height: 650px;
          overflow-y: auto;
          overflow-x: hidden;
          background: ${palette.surface};
          border-radius: 34px;
          position: relative;
          scrollbar-width: none;
        }
        .pp-viewport::-webkit-scrollbar { display: none; }

        @media (max-width: 420px) {
          .pp-phone-bezel {
            width: 100%;
            max-width: 340px;
          }
          .pp-viewport {
            width: 100%;
            height: 520px;
          }
        }
      `}</style>
    </div>
  );
}
