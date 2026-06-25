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

// ─── Tab type ─────────────────────────────────────────────────────────────────
type TabValue = 'compose' | 'activity' | 'templates' | 'credits';

// ─── MessagingClient ──────────────────────────────────────────────────────────
export default function MessagingClient() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<TabValue>('compose');
  const [credits, setCredits] = useState<SmsCreditInfo | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [focusCampaignId, setFocusCampaignId] = useState<number | undefined>(undefined);

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

  // Balance chip for Header action
  const balance = credits?.balance ?? 0;
  const balanceChip = (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-tertiary border border-border">
      <span className={`text-xs font-semibold ${balance < 10 ? 'text-danger' : 'text-success'}`}>
        {balance.toLocaleString()}
      </span>
      <span className="text-xs text-foreground-muted">credits</span>
    </div>
  );

  const tabs: TabItem<TabValue>[] = [
    { value: 'compose', label: 'Compose' },
    { value: 'activity', label: 'Activity' },
    { value: 'templates', label: 'Templates' },
    { value: 'credits', label: 'Credits' },
  ];

  // Wire ComposeView.onSent → switch to Activity with focusCampaignId + refresh credits
  const handleSent = (campaignId: number) => {
    setFocusCampaignId(campaignId);
    setActiveTab('activity');
    loadCredits();
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
            <CreditsView credits={credits} onRefresh={loadCredits} />
          )}
        </div>
      </div>
    </div>
  );
}
