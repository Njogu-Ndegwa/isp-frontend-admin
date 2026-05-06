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
  const isDark = settings.color_theme === 'midnight_purple';

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
      case 'hero':
        return (
          <div
            className="pp-header-hero"
            style={{
              backgroundImage: settings.header_bg_image_url
                ? `linear-gradient(135deg, ${palette.primary}ee 0%, ${palette.primaryDark}dd 100%), url(${settings.header_bg_image_url})`
                : `linear-gradient(135deg, ${palette.primary} 0%, ${palette.primaryDark} 100%)`,
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="" className="pp-header-hero-logo" />
            ) : (
              <div className="pp-header-hero-icon">📡</div>
            )}
            <h1 className="pp-header-hero-title">{title}</h1>
            <p className="pp-header-hero-subtitle">{subtitle}</p>
          </div>
        );
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

  const renderAnnouncement = () => {
    if (!settings.show_announcement) return null;
    const typeColors: Record<string, { bg: string; border: string; text: string }> = {
      info: { bg: `${palette.info}15`, border: `${palette.info}30`, text: palette.info },
      warning: { bg: `${palette.warning}15`, border: `${palette.warning}30`, text: palette.warning },
      success: { bg: `${palette.success}15`, border: `${palette.success}30`, text: palette.success },
    };
    const c = typeColors[settings.announcement_type] || typeColors.info;
    return (
      <div
        className="pp-announcement"
        style={{ background: c.bg, borderColor: c.border, color: c.text }}
      >
        <span className="pp-announcement-icon">
          {settings.announcement_type === 'warning' ? '⚠️' : settings.announcement_type === 'success' ? '✅' : 'ℹ️'}
        </span>
        <span className="pp-announcement-text">{settings.announcement_text || 'Announcement message'}</span>
      </div>
    );
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
    if (!settings.show_reconnect_button) return null;
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
            <div className="pp-plan-speed">{plan.speed}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSocialLinks = () => {
    if (!settings.show_social_links) return null;
    const links = [
      { name: 'Facebook', url: settings.facebook_url, icon: 'f' },
      { name: 'WhatsApp', url: settings.whatsapp_group_url, icon: 'W' },
      { name: 'Instagram', url: settings.instagram_url, icon: 'I' },
    ].filter((l) => l.url);
    if (links.length === 0) return null;
    return (
      <div className="pp-social">
        {links.map((link) => (
          <a key={link.name} href={link.url || '#'} className="pp-social-link">
            <span className="pp-social-icon">{link.icon}</span>
            <span className="pp-social-label">{link.name}</span>
          </a>
        ))}
      </div>
    );
  };

  const renderFooter = () => {
    if (!settings.footer_text) return null;
    return <div className="pp-footer">{settings.footer_text}</div>;
  };

  return (
    <div className="pp-phone-wrapper">
      {/* Phone bezel */}
      <div className="pp-phone-bezel">
        {/* Status bar */}
        <div className="pp-status-bar">
          <span className="pp-status-time">9:41</span>
          <div className="pp-status-notch" />
          <div className="pp-status-icons">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Scrollable viewport */}
        <div className="pp-viewport" style={{ '--vars': cssVars } as React.CSSProperties}>
          <div className="pp-viewport-inner" style={{ background: palette.background, color: palette.text }}>
            <style>{`
              .pp-viewport-inner {
                font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                min-height: 100%;
                padding-bottom: 24px;
              }
              /* Header: Standard */
              .pp-header-standard {
                position: sticky;
                top: 0;
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
              }
              .pp-header-hero-logo {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                object-fit: cover;
                margin: 0 auto 12px;
              }
              .pp-header-hero-icon {
                font-size: 2.5rem;
                margin-bottom: 8px;
              }
              .pp-header-hero-title {
                font-size: 1.4rem;
                font-weight: 700;
                margin: 0 0 4px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
              }
              .pp-header-hero-subtitle {
                font-size: 0.85rem;
                margin: 0;
                opacity: 0.9;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
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
                background: linear-gradient(135deg, ${palette.info} 0%, ${palette.primaryDark} 100%);
                color: #fff;
                border: none;
                border-radius: 10px;
                font-size: 0.8rem;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 4px 12px ${palette.info}40;
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

            {renderHeader()}
            {renderAnnouncement()}
            {renderWelcomeBanner()}
            {renderAds()}
            {renderQuickSteps()}
            {renderReconnect()}
            {renderPlans()}
            {renderSocialLinks()}
            {renderFooter()}

            {/* Inline promo (always shown) */}
            <div
              style={{
                margin: '0 16px 16px',
                background: isDark ? 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)' : 'linear-gradient(135deg, #1A1A1A 0%, #333 100%)',
                borderRadius: 16,
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🏠</span>
              <div style={{ flex: 1, color: '#fff' }}>
                <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: 2 }}>Need Home WiFi?</strong>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Professional installation from KSH 2,000/month</span>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  background: palette.accent,
                  color: '#1A1A1A',
                  padding: '6px 12px',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                }}
              >
                Call Now
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scoped phone styles */}
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
        .pp-status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 24px 4px;
          background: ${palette.surface};
          border-radius: 34px 34px 0 0;
          position: relative;
        }
        .pp-status-time {
          font-size: 0.7rem;
          font-weight: 600;
          color: ${palette.text};
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
        .pp-viewport {
          width: 375px;
          height: 650px;
          overflow-y: auto;
          overflow-x: hidden;
          background: ${palette.surface};
          border-radius: 0 0 34px 34px;
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
