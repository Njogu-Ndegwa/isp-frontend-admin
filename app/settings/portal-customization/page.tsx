'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import {
  PortalSettingsResponse,
  PortalColorTheme,
  PortalHeaderStyle,
  PortalLanguage,
  UpdatePortalSettingsRequest,
} from '../../lib/types';
import { getThemePalette } from '../../lib/portalThemes';
import PortalPreview from '../../components/PortalPreview';
import { PageLoader } from '../../components/LoadingSpinner';
import { useAlert } from '../../context/AlertContext';

const THEME_OPTIONS: { value: PortalColorTheme; label: string; color: string }[] = [
  { value: 'sunset_orange', label: 'Sunset Orange', color: '#E85D04' },
  { value: 'ocean_blue', label: 'Ocean Blue', color: '#3b82f6' },
  { value: 'emerald_green', label: 'Emerald Green', color: '#10b981' },
  { value: 'bright_violet', label: 'Bright Violet', color: '#8B5CF6' },
  { value: 'rose_gold', label: 'Rose Gold', color: '#e11d48' },
  { value: 'slate_gray', label: 'Slate Gray', color: '#475569' },
];

const HEADER_STYLE_OPTIONS: {
  value: PortalHeaderStyle;
  label: string;
  thumbnail: React.ReactNode;
}[] = [
  {
    value: 'standard',
    label: 'Standard',
    thumbnail: (
      <div className="w-full h-8 rounded-md border border-border bg-background-tertiary/50 flex flex-col gap-1 p-1">
        <div className="flex items-center justify-between">
          <div className="w-10 h-2 rounded bg-foreground/20" />
          <div className="w-6 h-2 rounded bg-foreground/20" />
        </div>
        <div className="w-full h-2 rounded bg-foreground/10" />
      </div>
    ),
  },
  {
    value: 'hero',
    label: 'Hero',
    thumbnail: (
      <div className="w-full h-8 rounded-md border border-border overflow-hidden">
        <div className="w-full h-full bg-accent-primary/30" />
      </div>
    ),
  },
];

const LANGUAGE_OPTIONS: { value: PortalLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Swahili' },
  { value: 'fr', label: 'French' },
];

const IMAGE_PRESETS: { key: string; label: string }[] = [
  { key: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=750&h=370&fit=crop&q=80', label: 'City' },
  { key: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=750&h=370&fit=crop&q=80', label: 'People' },
  { key: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=750&h=370&fit=crop&q=80', label: 'Nature' },
  { key: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=750&h=370&fit=crop&q=80', label: 'Café' },
  { key: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=750&h=370&fit=crop&q=80', label: 'Tech' },
];



export default function PortalCustomizationPage() {
  const { showAlert } = useAlert();

  const [data, setData] = useState<PortalSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [changed, setChanged] = useState<UpdatePortalSettingsRequest>({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await api.getPortalSettings();
      setData(resp);
      setChanged({});
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load portal settings');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const markChange = <K extends keyof UpdatePortalSettingsRequest>(
    key: K,
    value: UpdatePortalSettingsRequest[K]
  ) => {
    setChanged((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = Object.keys(changed).length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    try {
      setSaving(true);
      const resp = await api.updatePortalSettings(changed);
      setData((prev) =>
        prev ? { ...prev, settings: resp.settings } : prev
      );
      setChanged({});
      showAlert('success', 'Portal settings saved successfully');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to save portal settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all portal customizations to defaults? This cannot be undone.')) return;
    try {
      setResetting(true);
      const resp = await api.resetPortalSettings();
      setData((prev) =>
        prev ? { ...prev, settings: resp.settings } : prev
      );
      setChanged({});
      showAlert('success', 'Portal settings reset to defaults');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to reset portal settings');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="w-12 h-12 text-danger mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-foreground-muted mb-4">Failed to load portal settings</p>
        <button onClick={loadSettings} className="btn-primary">Try Again</button>
      </div>
    );
  }

  const s = data.settings;
  const current = (key: keyof UpdatePortalSettingsRequest) =>
    (changed[key] !== undefined ? changed[key] : s[key as keyof typeof s]) as unknown;

  // Build merged settings for live preview
  // Hardcode defaults for features hidden from the UI
  const previewSettings = {
    ...s,
    ...changed,
    show_reconnect_button: true,
    show_ads: changed.show_ads ?? false,
    show_ratings: false,
    show_social_links: false,
    show_announcement: false,
    show_welcome_banner: false,
  } as typeof s;

  const palette = getThemePalette(previewSettings.color_theme);

  const SettingsForm = (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Portal Customization</h2>
        <p className="text-xs text-foreground-muted mt-0.5">Configure how your captive portal looks and behaves</p>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="btn-danger text-xs px-3 py-1.5"
          >
            {resetting ? 'Resetting...' : 'Reset to Defaults'}
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="btn-primary text-xs px-3 py-1.5"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Theme */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Theme</h2>
          <p className="text-xs text-foreground-muted mt-0.5">Choose the colour theme for your captive portal</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEME_OPTIONS.map((theme) => {
              const isActive = current('color_theme') === theme.value;
              return (
                <button
                  key={theme.value}
                  onClick={() => markChange('color_theme', theme.value)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isActive
                      ? 'border-accent-primary bg-accent-primary/5'
                      : 'border-border hover:bg-background-tertiary'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full flex-shrink-0 border-2 border-white/20 shadow-sm"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span className={`text-sm font-medium ${isActive ? 'text-accent-primary' : 'text-foreground'}`}>
                    {theme.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Header Layout */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Header Layout</h2>
          <p className="text-xs text-foreground-muted mt-0.5">How the top section of the portal is displayed</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3">
            {HEADER_STYLE_OPTIONS.map((style) => {
              const isActive = current('header_style') === style.value;
              return (
                <button
                  key={style.value}
                  onClick={() => {
                    markChange('header_style', style.value);
                    if (style.value === 'hero' && !current('header_bg_image_url')) {
                      markChange('header_bg_image_url', IMAGE_PRESETS[2].key);
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all text-center space-y-2 ${
                    isActive
                      ? 'border-accent-primary bg-accent-primary/5'
                      : 'border-border hover:bg-background-tertiary'
                  }`}
                >
                  {style.thumbnail}
                  <span className={`text-sm font-medium ${isActive ? 'text-accent-primary' : 'text-foreground'}`}>
                    {style.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Branding */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Branding</h2>
          <p className="text-xs text-foreground-muted mt-0.5">Titles and welcome message</p>
        </div>
        <div className="p-5 space-y-4">
          {current('header_style') === 'hero' && (
            <>
              {/* Hero Background Presets */}
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-2">Hero Background</label>

                <div className="grid grid-cols-5 gap-2">
                  {IMAGE_PRESETS.map((preset) => {
                    const currentPreset = (current('header_bg_image_url') as string | null) ?? null;
                    const isActive = currentPreset === preset.key;
                    return (
                      <button
                        key={preset.key}
                        onClick={() => markChange('header_bg_image_url', preset.key)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                          isActive
                            ? 'border-accent-primary bg-accent-primary/5'
                            : 'border-border hover:bg-background-tertiary'
                        }`}
                      >
                        <div
                          className="w-full h-10 rounded-md"
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${palette.primary}bb 0%, ${palette.primaryDark}88 100%), url(${preset.key})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        />
                        <span className={`text-[0.6rem] font-medium ${isActive ? 'text-accent-primary' : 'text-foreground-muted'}`}>
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">Welcome Title</label>
                <input
                  type="text"
                  className="input"
                  value={(current('welcome_title') as string | null) ?? ''}
                  onChange={(e) => markChange('welcome_title', e.target.value || null)}
                  placeholder="Welcome to My WiFi"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">Welcome Subtitle</label>
                <input
                  type="text"
                  className="input"
                  value={(current('welcome_subtitle') as string | null) ?? ''}
                  onChange={(e) => markChange('welcome_subtitle', e.target.value || null)}
                  placeholder="Affordable internet for everyone"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">Plans Section Title</label>
            <input
              type="text"
              className="input"
              value={(current('plans_section_title') as string | null) ?? ''}
              onChange={(e) => markChange('plans_section_title', e.target.value || null)}
              placeholder="Choose Your Plan"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Features</h2>
          <p className="text-xs text-foreground-muted mt-0.5">Show or hide portal sections</p>
        </div>
        <div className="p-5 space-y-3">
          {[
            { key: 'show_ads' as const, label: 'Show Ads', desc: 'Display the marketplace ads strip' },
            { key: 'show_plan_speed' as const, label: 'Show Plan Speed', desc: 'Display download/upload speed on each plan card' },
          ].map((toggle) => (
            <label
              key={toggle.key}
              className="flex items-center justify-between p-3 rounded-xl bg-background-tertiary/50 cursor-pointer"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{toggle.label}</div>
                <div className="text-xs text-foreground-muted">{toggle.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={!!current(toggle.key)}
                onChange={(e) => markChange(toggle.key, e.target.checked)}
                className="w-5 h-5 rounded border-border text-accent-primary focus:ring-accent-primary"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Support Contacts */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Support Contacts</h2>
          <p className="text-xs text-foreground-muted mt-0.5">Phone numbers shown on the portal</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">Support Phone</label>
            <input
              type="tel"
              className="input"
              value={(current('portal_support_phone') as string | null) ?? ''}
              onChange={(e) => markChange('portal_support_phone', e.target.value || null)}
              placeholder="+254700000000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">Support WhatsApp</label>
            <input
              type="tel"
              className="input"
              value={(current('portal_support_whatsapp') as string | null) ?? ''}
              onChange={(e) => markChange('portal_support_whatsapp', e.target.value || null)}
              placeholder="+254700000000"
            />
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Language</h2>
          <p className="text-xs text-foreground-muted mt-0.5">Portal display language</p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-3">
            {LANGUAGE_OPTIONS.map((lang) => {
              const isActive = current('portal_language') === lang.value;
              return (
                <button
                  key={lang.value}
                  onClick={() => markChange('portal_language', lang.value)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                    isActive
                      ? 'border-accent-primary bg-accent-primary/5 text-accent-primary'
                      : 'border-border text-foreground hover:bg-background-tertiary'
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Save / Reset sticky on mobile */}
      <div className="md:hidden flex items-center gap-3 pt-2 pb-6">
        <button
          onClick={handleReset}
          disabled={resetting}
          className="btn-danger flex-1 text-sm"
        >
          {resetting ? 'Resetting...' : 'Reset'}
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="btn-primary flex-1 text-sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
      {/* Settings form */}
      <div className="flex-1 min-w-0 max-w-3xl">
        {SettingsForm}
      </div>

      {/* Desktop preview — sticky side panel (xl+) */}
      <div className="hidden xl:block w-[420px] flex-shrink-0">
        <div className="sticky top-8 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground">Live Preview</h3>
            <span className="text-xs text-foreground-muted">Updates as you edit</span>
          </div>
          <PortalPreview settings={previewSettings} palette={palette} />
        </div>
      </div>

      {/* Preview floating button — shown below xl */}
      <button
        onClick={() => setShowPreviewModal(true)}
        className="xl:hidden fixed z-[9999] flex items-center gap-2 px-4 py-3 rounded-full shadow-xl"
        style={{
          bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
          right: '16px',
          background: 'var(--accent-primary)',
          color: '#1c1917',
          fontWeight: 700,
          fontSize: '0.875rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3.75h3m-3 3.75H12" />
        </svg>
        Preview
      </button>

      {/* Preview modal — shown below xl */}
      {showPreviewModal && (
        <div
          className="xl:hidden fixed inset-0 z-[9998] flex flex-col items-center justify-start pt-6 pb-8"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', overflowY: 'auto' }}
          onClick={() => setShowPreviewModal(false)}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between w-full max-w-sm px-5 mb-5 flex-shrink-0">
            <div>
              <p className="text-white font-semibold text-sm">Portal Preview</p>
              <p className="text-white/50 text-xs mt-0.5">Live · updates as you edit</p>
            </div>
            <button
              onClick={() => setShowPreviewModal(false)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Phone preview — PortalPreview's own responsive CSS handles small screens */}
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <PortalPreview settings={previewSettings} palette={palette} />
          </div>
        </div>
      )}
    </div>
  );
}
