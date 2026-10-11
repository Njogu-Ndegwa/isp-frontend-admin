'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { SmsCreditInfo } from '../lib/types';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import Tabs, { TabItem } from '../components/Tabs';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import { ComposeView } from './components/ComposeView';
import { ActivityView } from './components/ActivityView';
import CreditsView from './components/CreditsView';
import { TemplatesView } from './components/TemplatesView';
import { AlertsView } from './components/AlertsView';
import { ExpiryRemindersView } from './components/ExpiryRemindersView';
import { CustomerEventsView } from './components/CustomerEventsView';
import { GatewayView } from './components/GatewayView';
import { GatewayFailureBanner, useGatewayStatus } from './components/GatewayStatusCard';

// ─── Tab type ─────────────────────────────────────────────────────────────────
type TabValue = 'compose' | 'activity' | 'templates' | 'credits' | 'expiry' | 'alerts' | 'gateway';

// ─── MessagingClient ──────────────────────────────────────────────────────────
export default function MessagingClient() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<TabValue>('compose');
  const [credits, setCredits] = useState<SmsCreditInfo | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [focusCampaignId, setFocusCampaignId] = useState<number | undefined>(undefined);
  // One status fetch for the page: drives the failure banner, the header chip
  // on an own gateway, and the status cards in the Credits and Gateway tabs.
  const gatewayStatus = useGatewayStatus(null, user?.role === 'reseller');

  const loadCredits = useCallback(async () => {
    try {
      setCreditsLoading(true);
      const c = await api.getSmsCredits();
      setCredits(c);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load SMS credits');
    } finally {
      setCreditsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => { loadCredits(); }, [loadCredits]);

  // Role guard — reseller only
  if (user && user.role !== 'reseller') {
    return (
      <div className="space-y-6 pb-24 md:pb-6">
        <Header title="Messaging" />
        <div className="card p-8 text-center">
          <p className="text-sm text-foreground-muted">This page is only available to resellers.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (creditsLoading) {
    return (
      <div className="space-y-6 pb-24 md:pb-6">
        <Header title="Messaging" />
        <PageLoader />
      </div>
    );
  }

  // Disabled state
  if (credits && !credits.enabled) {
    return (
      <div className="space-y-6 pb-24 md:pb-6">
        <Header title="Messaging" />
        <div className="card p-8 text-center">
          <svg
            className="w-10 h-10 mx-auto text-foreground-muted mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
          <p className="text-sm text-foreground-muted">
            SMS messaging is not currently enabled for your account. Contact support to get started.
          </p>
        </div>
      </div>
    );
  }

  // Balance chip for Header action. On their own gateway portal credits are
  // not what pays for SMS, so show the gateway's own balance (or that it is
  // failing) instead of a misleading "0 credits".
  const status = gatewayStatus.status;
  const onOwnGateway = credits?.gateway?.bills_platform_credits === false;
  const balance = credits?.balance ?? 0;
  let chipValue = balance.toLocaleString();
  let chipLabel = 'credits';
  let chipBad = balance < 10;
  if (onOwnGateway) {
    const gw = status?.balance;
    chipLabel = credits?.gateway?.provider_label ?? 'gateway';
    if (status?.health.state === 'failing') {
      chipValue = 'Not sending';
      chipBad = true;
    } else if (gw?.available && gw.ok && gw.balance != null) {
      chipValue = `${gw.unit ? `${gw.unit} ` : ''}${gw.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      chipBad = gw.balance <= 0;
    } else {
      chipValue = 'Own gateway';
      chipLabel = '';
      chipBad = false;
    }
  }
  const balanceChip = (
    <button
      type="button"
      onClick={() => handleTabChange(onOwnGateway ? 'gateway' : 'credits')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-tertiary border border-border"
    >
      <span className={`text-xs font-semibold ${chipBad ? 'text-danger' : 'text-success'}`}>
        {chipValue}
      </span>
      {chipLabel && <span className="text-xs text-foreground-muted">{chipLabel}</span>}
    </button>
  );

  const tabs: TabItem<TabValue>[] = [
    { value: 'compose', label: 'Compose' },
    { value: 'activity', label: 'Activity' },
    { value: 'templates', label: 'Templates' },
    { value: 'credits', label: 'Credits' },
    { value: 'expiry', label: 'Automatic' },
    { value: 'alerts', label: 'Alerts' },
    { value: 'gateway', label: 'Gateway' },
  ];

  // Wire ComposeView.onSent → switch to Activity with focusCampaignId + refresh credits
  const handleSent = (campaignId: number) => {
    setFocusCampaignId(campaignId);
    setActiveTab('activity');
    loadCredits();
    // Sends dispatch in the background; recheck once they have had time to settle.
    window.setTimeout(() => { gatewayStatus.reload(false); }, 8000);
  };

  // When leaving Activity, clear the focus id so re-entering is neutral
  const handleTabChange = (tab: TabValue) => {
    if (tab !== 'activity') {
      setFocusCampaignId(undefined);
    }
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Header title="Messaging" action={balanceChip} />

      {activeTab !== 'gateway' && (
        <GatewayFailureBanner
          status={status}
          onOpenDetails={() => handleTabChange('gateway')}
        />
      )}

      <div className="space-y-5">
        <Tabs<TabValue>
          value={activeTab}
          onChange={handleTabChange}
          tabs={tabs}
          ariaLabel="Messaging tabs"
        />

        <div>
          {activeTab === 'compose' && credits && (
            <ComposeView
              credits={credits}
              onSent={handleSent}
              onSwitchToCredits={() => setActiveTab('credits')}
            />
          )}
          {activeTab === 'activity' && (
            <ActivityView focusCampaignId={focusCampaignId} />
          )}
          {activeTab === 'templates' && <TemplatesView />}
          {activeTab === 'credits' && credits && (
            <CreditsView
              credits={credits}
              onRefresh={loadCredits}
              gatewayStatus={status}
              onReloadGatewayStatus={gatewayStatus.reload}
            />
          )}
          {activeTab === 'expiry' && (
            <div className="space-y-8">
              <ExpiryRemindersView onBuyCredits={() => setActiveTab('credits')} />
              <section aria-labelledby="customer-event-messages" className="space-y-3">
                <h2 id="customer-event-messages" className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  Receipts, welcome &amp; wording
                </h2>
                <CustomerEventsView onBuyCredits={() => setActiveTab('credits')} />
              </section>
            </div>
          )}
          {activeTab === 'alerts' && (
            <AlertsView credits={credits} onBuyCredits={() => setActiveTab('credits')} />
          )}
          {activeTab === 'gateway' && (
            <GatewayView
              gatewayStatus={status}
              onReloadGatewayStatus={gatewayStatus.reload}
              onGatewayChanged={loadCredits}
            />
          )}
        </div>
      </div>
    </div>
  );
}
