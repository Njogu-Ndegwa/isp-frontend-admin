'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import {
  PPPoEOverviewResponse,
  PPPoEDiagnoseResponse,
  PPPoELogsResponse,
  PPPoESecretsResponse,
  PPPoESecretEntry,
  HotspotOverviewResponse,
  HotspotLogsResponse,
  PortStatusResponse,
  MacDiagnoseResponse,
  HealthCheck,
  DiagnosticIssue,
  LogEntry,
  PortEntry,
  BridgeEntry,
} from '../lib/types';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import RouterSelector from '../components/RouterSelector';
import PullToRefresh from '../components/PullToRefresh';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { formatDateGMT3 } from '../lib/dateUtils';

type Tab = 'pppoe' | 'hotspot' | 'ports';

export default function DiagnosticsPage() {
  const { isAuthenticated } = useAuth();
  const { showAlert } = useAlert();
  const [selectedRouterId, setSelectedRouterId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('ports');

  // PPPoE state
  const [pppoeOverview, setPppoeOverview] = useState<PPPoEOverviewResponse | null>(null);
  const [pppoeOverviewLoading, setPppoeOverviewLoading] = useState(false);
  const [pppoeOverviewError, setPppoeOverviewError] = useState<string | null>(null);

  const [pppoeDiagnose, setPppoeDiagnose] = useState<PPPoEDiagnoseResponse | null>(null);
  const [pppoeDiagnoseLoading, setPppoeDiagnoseLoading] = useState(false);
  const [diagnoseUsername, setDiagnoseUsername] = useState('');

  const [pppoeLogs, setPppoeLogs] = useState<PPPoELogsResponse | null>(null);
  const [pppoeLogsLoading, setPppoeLogsLoading] = useState(false);
  const [logUsernameFilter, setLogUsernameFilter] = useState('');

  const [pppoeSecrets, setPppoeSecrets] = useState<PPPoESecretsResponse | null>(null);
  const [pppoeSecretsLoading, setPppoeSecretsLoading] = useState(false);

  // Hotspot state
  const [hotspotOverview, setHotspotOverview] = useState<HotspotOverviewResponse | null>(null);
  const [hotspotOverviewLoading, setHotspotOverviewLoading] = useState(false);
  const [hotspotOverviewError, setHotspotOverviewError] = useState<string | null>(null);

  const [macDiagnose, setMacDiagnose] = useState<MacDiagnoseResponse | null>(null);
  const [macDiagnoseLoading, setMacDiagnoseLoading] = useState(false);
  const [diagnoseMacAddress, setDiagnoseMacAddress] = useState('');

  const [hotspotLogs, setHotspotLogs] = useState<HotspotLogsResponse | null>(null);
  const [hotspotLogsLoading, setHotspotLogsLoading] = useState(false);
  const [hotspotSearchFilter, setHotspotSearchFilter] = useState('');

  // Ports state
  const [portStatus, setPortStatus] = useState<PortStatusResponse | null>(null);
  const [portStatusLoading, setPortStatusLoading] = useState(false);
  const [portStatusError, setPortStatusError] = useState<string | null>(null);

  // PPPoE sub-tab
  const [pppoeSection, setPppoeSection] = useState<'overview' | 'logs' | 'secrets'>('overview');
  // Hotspot sub-tab
  const [hotspotSection, setHotspotSection] = useState<'overview' | 'logs'>('overview');

  // Data loaders
  const loadPppoeOverview = useCallback(async (refresh = false) => {
    if (!selectedRouterId) return;
    try {
      setPppoeOverviewLoading(true);
      setPppoeOverviewError(null);
      const data = await api.getPPPoEOverview(selectedRouterId, refresh);
      setPppoeOverview(data);
    } catch (err) {
      setPppoeOverviewError(err instanceof Error ? err.message : 'Failed to load PPPoE overview');
    } finally {
      setPppoeOverviewLoading(false);
    }
  }, [selectedRouterId]);

  const loadHotspotOverview = useCallback(async (refresh = false) => {
    if (!selectedRouterId) return;
    try {
      setHotspotOverviewLoading(true);
      setHotspotOverviewError(null);
      const data = await api.getHotspotOverview(selectedRouterId, refresh);
      setHotspotOverview(data);
    } catch (err) {
      setHotspotOverviewError(err instanceof Error ? err.message : 'Failed to load hotspot overview');
    } finally {
      setHotspotOverviewLoading(false);
    }
  }, [selectedRouterId]);

  const loadPortStatus = useCallback(async (refresh = false) => {
    if (!selectedRouterId) return;
    try {
      setPortStatusLoading(true);
      setPortStatusError(null);
      const data = await api.getPortStatus(selectedRouterId, refresh);
      setPortStatus(data);
    } catch (err) {
      setPortStatusError(err instanceof Error ? err.message : 'Failed to load port status');
    } finally {
      setPortStatusLoading(false);
    }
  }, [selectedRouterId]);

  const runPppoeDiagnose = async () => {
    if (!selectedRouterId || !diagnoseUsername.trim()) return;
    try {
      setPppoeDiagnoseLoading(true);
      setPppoeDiagnose(null);
      const data = await api.diagnosePPPoE(selectedRouterId, diagnoseUsername.trim());
      setPppoeDiagnose(data);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Diagnosis failed');
    } finally {
      setPppoeDiagnoseLoading(false);
    }
  };

  const loadPppoeLogs = async () => {
    if (!selectedRouterId) return;
    try {
      setPppoeLogsLoading(true);
      const data = await api.getPPPoELogs(selectedRouterId, logUsernameFilter || undefined);
      setPppoeLogs(data);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setPppoeLogsLoading(false);
    }
  };

  const loadPppoeSecrets = async () => {
    if (!selectedRouterId) return;
    try {
      setPppoeSecretsLoading(true);
      const data = await api.getPPPoESecrets(selectedRouterId);
      setPppoeSecrets(data);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load secrets');
    } finally {
      setPppoeSecretsLoading(false);
    }
  };

  const runMacDiagnose = async () => {
    if (!selectedRouterId || !diagnoseMacAddress.trim()) return;
    try {
      setMacDiagnoseLoading(true);
      setMacDiagnose(null);
      const data = await api.diagnoseMac(selectedRouterId, diagnoseMacAddress.trim());
      setMacDiagnose(data);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'MAC diagnosis failed');
    } finally {
      setMacDiagnoseLoading(false);
    }
  };

  const loadHotspotLogs = async () => {
    if (!selectedRouterId) return;
    try {
      setHotspotLogsLoading(true);
      const data = await api.getHotspotLogs(selectedRouterId, hotspotSearchFilter || undefined);
      setHotspotLogs(data);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load hotspot logs');
    } finally {
      setHotspotLogsLoading(false);
    }
  };

  // Auto-load on router/tab change
  useEffect(() => {
    if (!selectedRouterId) return;
    if (activeTab === 'pppoe') loadPppoeOverview();
    if (activeTab === 'hotspot') loadHotspotOverview();
    if (activeTab === 'ports') loadPortStatus();
  }, [selectedRouterId, activeTab, loadPppoeOverview, loadHotspotOverview, loadPortStatus]);

  // Auto-refresh overview every 60s
  useEffect(() => {
    if (!selectedRouterId) return;
    const interval = setInterval(() => {
      if (activeTab === 'pppoe') loadPppoeOverview();
      else if (activeTab === 'hotspot') loadHotspotOverview();
      else if (activeTab === 'ports') loadPortStatus();
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedRouterId, activeTab, loadPppoeOverview, loadHotspotOverview, loadPortStatus]);

  // Reset data on router change
  useEffect(() => {
    setPppoeOverview(null);
    setPppoeDiagnose(null);
    setPppoeLogs(null);
    setPppoeSecrets(null);
    setHotspotOverview(null);
    setMacDiagnose(null);
    setHotspotLogs(null);
    setPortStatus(null);
  }, [selectedRouterId]);

  const handleRefresh = async () => {
    if (activeTab === 'pppoe') await loadPppoeOverview(true);
    else if (activeTab === 'hotspot') await loadHotspotOverview(true);
    else if (activeTab === 'ports') await loadPortStatus(true);
  };

  if (!isAuthenticated) {
    return <PageLoader />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 md:pb-6">
        <Header
          title="Network Diagnostics"
          subtitle="Monitor PPPoE, Hotspot & port status"
        />

        <div className="mb-5">
          <RouterSelector
            selectedRouterId={selectedRouterId}
            onRouterChange={setSelectedRouterId}
          />
        </div>

        {!selectedRouterId ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <p className="text-foreground-muted text-sm">Select a router to start diagnostics</p>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex gap-2 mb-5 overflow-x-auto">
              {(['ports', 'pppoe', 'hotspot'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-accent-primary text-white shadow-sm'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {tab === 'pppoe' ? 'PPPoE' : tab === 'hotspot' ? 'Hotspot' : 'Ports'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'pppoe' && (
              <PPPoETab
                overview={pppoeOverview}
                overviewLoading={pppoeOverviewLoading}
                overviewError={pppoeOverviewError}
                onRefresh={() => loadPppoeOverview(true)}
                diagnoseResult={pppoeDiagnose}
                diagnoseLoading={pppoeDiagnoseLoading}
                diagnoseUsername={diagnoseUsername}
                onDiagnoseUsernameChange={setDiagnoseUsername}
                onRunDiagnose={runPppoeDiagnose}
                logs={pppoeLogs}
                logsLoading={pppoeLogsLoading}
                logFilter={logUsernameFilter}
                onLogFilterChange={setLogUsernameFilter}
                onLoadLogs={loadPppoeLogs}
                secrets={pppoeSecrets}
                secretsLoading={pppoeSecretsLoading}
                onLoadSecrets={loadPppoeSecrets}
                section={pppoeSection}
                onSectionChange={setPppoeSection}
              />
            )}

            {activeTab === 'hotspot' && (
              <HotspotTab
                overview={hotspotOverview}
                overviewLoading={hotspotOverviewLoading}
                overviewError={hotspotOverviewError}
                onRefresh={() => loadHotspotOverview(true)}
                diagnoseResult={macDiagnose}
                diagnoseLoading={macDiagnoseLoading}
                diagnoseMac={diagnoseMacAddress}
                onDiagnoseMacChange={setDiagnoseMacAddress}
                onRunDiagnose={runMacDiagnose}
                logs={hotspotLogs}
                logsLoading={hotspotLogsLoading}
                logFilter={hotspotSearchFilter}
                onLogFilterChange={setHotspotSearchFilter}
                onLoadLogs={loadHotspotLogs}
                section={hotspotSection}
                onSectionChange={setHotspotSection}
              />
            )}

            {activeTab === 'ports' && (
              <PortsTab
                data={portStatus}
                loading={portStatusLoading}
                error={portStatusError}
                onRefresh={() => loadPortStatus(true)}
              />
            )}
          </>
        )}
      </div>
    </PullToRefresh>
  );
}

// =============================================================================
// PPPoE Tab
// =============================================================================

function PPPoETab({
  overview, overviewLoading, overviewError, onRefresh,
  diagnoseResult, diagnoseLoading, diagnoseUsername, onDiagnoseUsernameChange, onRunDiagnose,
  logs, logsLoading, logFilter, onLogFilterChange, onLoadLogs,
  secrets, secretsLoading, onLoadSecrets,
  section, onSectionChange,
}: {
  overview: PPPoEOverviewResponse | null;
  overviewLoading: boolean;
  overviewError: string | null;
  onRefresh: () => void;
  diagnoseResult: PPPoEDiagnoseResponse | null;
  diagnoseLoading: boolean;
  diagnoseUsername: string;
  onDiagnoseUsernameChange: (v: string) => void;
  onRunDiagnose: () => void;
  logs: PPPoELogsResponse | null;
  logsLoading: boolean;
  logFilter: string;
  onLogFilterChange: (v: string) => void;
  onLoadLogs: () => void;
  secrets: PPPoESecretsResponse | null;
  secretsLoading: boolean;
  onLoadSecrets: () => void;
  section: 'overview' | 'logs' | 'secrets';
  onSectionChange: (s: 'overview' | 'logs' | 'secrets') => void;
}) {
  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg w-fit">
        {(['overview', 'logs', 'secrets'] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              onSectionChange(s);
              if (s === 'logs' && !logs) onLoadLogs();
              if (s === 'secrets' && !secrets) onLoadSecrets();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              section === s
                ? 'bg-background-secondary text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            {s === 'overview' ? 'Health & Diagnose' : s === 'logs' ? 'Logs' : 'Secrets'}
          </button>
        ))}
      </div>

      {section === 'overview' && (
        <>
          {/* Overview card */}
          <OverviewCard
            title="PPPoE Infrastructure"
            data={overview}
            loading={overviewLoading}
            error={overviewError}
            onRefresh={onRefresh}
          />

          {/* Diagnose section */}
          <div className="card p-4 sm:p-5 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-3 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-blue-500" />
              Diagnose PPPoE User
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter PPPoE username..."
                value={diagnoseUsername}
                onChange={(e) => onDiagnoseUsernameChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onRunDiagnose()}
                className="input flex-1"
              />
              <button
                onClick={onRunDiagnose}
                disabled={diagnoseLoading || !diagnoseUsername.trim()}
                className="btn-primary text-sm whitespace-nowrap"
              >
                {diagnoseLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Diagnosing...
                  </span>
                ) : 'Diagnose'}
              </button>
            </div>

            {diagnoseResult && (
              <div className="mt-4 space-y-3">
                {/* Status header */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-foreground">{diagnoseResult.username}</span>
                  <span className={`badge ${diagnoseResult.status === 'online' ? 'badge-success' : 'bg-red-500/20 text-red-400'}`}>
                    {diagnoseResult.status}
                  </span>
                  {diagnoseResult.has_critical && (
                    <span className="badge bg-red-500/20 text-red-400">Critical Issues</span>
                  )}
                  <span className="text-xs text-foreground-muted">
                    {diagnoseResult.issues_count} issue{diagnoseResult.issues_count !== 1 ? 's' : ''} found
                  </span>
                </div>

                {/* Customer info */}
                {diagnoseResult.customer && (
                  <div className="p-3 rounded-lg bg-background-tertiary text-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <span className="text-foreground-muted text-xs">Customer</span>
                        <p className="font-medium text-foreground">{diagnoseResult.customer.name}</p>
                      </div>
                      <div>
                        <span className="text-foreground-muted text-xs">Status</span>
                        <p className="font-medium text-foreground">{diagnoseResult.customer.status}</p>
                      </div>
                      <div>
                        <span className="text-foreground-muted text-xs">Plan</span>
                        <p className="font-medium text-foreground">{diagnoseResult.customer.plan || '-'}</p>
                      </div>
                      <div>
                        <span className="text-foreground-muted text-xs">Expiry</span>
                        <p className="font-medium text-foreground">
                          {diagnoseResult.customer.expiry
                            ? formatDateGMT3(diagnoseResult.customer.expiry, { day: '2-digit', month: 'short', year: 'numeric' })
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Issues */}
                <IssuesList issues={diagnoseResult.issues} />
              </div>
            )}
          </div>
        </>
      )}

      {section === 'logs' && (
        <div className="card p-4 sm:p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-purple-500" />
              PPPoE Logs
            </h3>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Filter by username..."
              value={logFilter}
              onChange={(e) => onLogFilterChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onLoadLogs()}
              className="input flex-1"
            />
            <button onClick={onLoadLogs} disabled={logsLoading} className="btn-primary text-sm">
              {logsLoading ? 'Loading...' : 'Fetch Logs'}
            </button>
          </div>
          {logs && <LogsTable entries={logs.data} />}
        </div>
      )}

      {section === 'secrets' && (
        <div className="card p-4 sm:p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-indigo-500" />
              PPPoE Secrets
              {secrets && (
                <span className="text-xs font-normal text-foreground-muted ml-1">({secrets.count})</span>
              )}
            </h3>
            <button onClick={onLoadSecrets} disabled={secretsLoading} className="btn-ghost text-xs">
              {secretsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          {secrets && <SecretsTable secrets={secrets.data} />}
          {secretsLoading && !secrets && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 skeleton rounded-lg" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Hotspot Tab
// =============================================================================

function HotspotTab({
  overview, overviewLoading, overviewError, onRefresh,
  diagnoseResult, diagnoseLoading, diagnoseMac, onDiagnoseMacChange, onRunDiagnose,
  logs, logsLoading, logFilter, onLogFilterChange, onLoadLogs,
  section, onSectionChange,
}: {
  overview: HotspotOverviewResponse | null;
  overviewLoading: boolean;
  overviewError: string | null;
  onRefresh: () => void;
  diagnoseResult: MacDiagnoseResponse | null;
  diagnoseLoading: boolean;
  diagnoseMac: string;
  onDiagnoseMacChange: (v: string) => void;
  onRunDiagnose: () => void;
  logs: HotspotLogsResponse | null;
  logsLoading: boolean;
  logFilter: string;
  onLogFilterChange: (v: string) => void;
  onLoadLogs: () => void;
  section: 'overview' | 'logs';
  onSectionChange: (s: 'overview' | 'logs') => void;
}) {
  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg w-fit">
        {(['overview', 'logs'] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              onSectionChange(s);
              if (s === 'logs' && !logs) onLoadLogs();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              section === s
                ? 'bg-background-secondary text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            {s === 'overview' ? 'Health & Diagnose' : 'Logs'}
          </button>
        ))}
      </div>

      {section === 'overview' && (
        <>
          <OverviewCard
            title="Hotspot Infrastructure"
            data={overview}
            loading={overviewLoading}
            error={overviewError}
            onRefresh={onRefresh}
          />

          {/* Diagnose MAC */}
          <div className="card p-4 sm:p-5 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-3 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-blue-500" />
              Diagnose Device (MAC)
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={diagnoseMac}
                onChange={(e) => onDiagnoseMacChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onRunDiagnose()}
                className="input flex-1 font-mono"
              />
              <button
                onClick={onRunDiagnose}
                disabled={diagnoseLoading || !diagnoseMac.trim()}
                className="btn-primary text-sm whitespace-nowrap"
              >
                {diagnoseLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Diagnosing...
                  </span>
                ) : 'Diagnose'}
              </button>
            </div>

            {diagnoseResult && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-medium text-foreground">{diagnoseResult.mac_address}</span>
                  <span className={`badge ${diagnoseResult.can_access_internet ? 'badge-success' : 'bg-red-500/20 text-red-400'}`}>
                    {diagnoseResult.can_access_internet ? 'Has Internet' : 'No Internet'}
                  </span>
                  <span className="text-xs text-foreground-muted">
                    {diagnoseResult.total_router_entries} entries, {diagnoseResult.total_issues} issues
                  </span>
                </div>

                {diagnoseResult.database_info && (
                  <div className="p-3 rounded-lg bg-background-tertiary text-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-foreground-muted text-xs">Customer</span>
                        <p className="font-medium text-foreground">{diagnoseResult.database_info.name}</p>
                      </div>
                      <div>
                        <span className="text-foreground-muted text-xs">Status</span>
                        <p className="font-medium text-foreground">{diagnoseResult.database_info.status}</p>
                      </div>
                      <div>
                        <span className="text-foreground-muted text-xs">Expiry</span>
                        <p className="font-medium text-foreground">
                          {diagnoseResult.database_info.expiry
                            ? formatDateGMT3(diagnoseResult.database_info.expiry, { day: '2-digit', month: 'short', year: 'numeric' })
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Infrastructure issues */}
                {diagnoseResult.infrastructure_issues.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground-muted mb-2">Infrastructure Issues</p>
                    <IssuesList issues={diagnoseResult.infrastructure_issues} />
                  </div>
                )}

                {/* Diagnosis messages */}
                {diagnoseResult.diagnosis.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground-muted mb-2">Device Diagnosis</p>
                    <div className="space-y-1">
                      {diagnoseResult.diagnosis.map((msg, i) => (
                        <div key={i} className="text-sm p-2 rounded bg-background-tertiary text-foreground">
                          {msg}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {diagnoseResult.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground-muted mb-2">Recommendations</p>
                    <IssuesList issues={diagnoseResult.recommendations} />
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {section === 'logs' && (
        <div className="card p-4 sm:p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-purple-500" />
              Hotspot Logs
            </h3>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Search by MAC or text..."
              value={logFilter}
              onChange={(e) => onLogFilterChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onLoadLogs()}
              className="input flex-1"
            />
            <button onClick={onLoadLogs} disabled={logsLoading} className="btn-primary text-sm">
              {logsLoading ? 'Loading...' : 'Fetch Logs'}
            </button>
          </div>
          {logs && <LogsTable entries={logs.data} />}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Ports Tab
// =============================================================================

function PortsTab({
  data, loading, error, onRefresh,
}: {
  data: PortStatusResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  if (error) {
    return (
      <div className="card p-5 border-red-500/30 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">Port Status</p>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          </div>
          <button onClick={onRefresh} className="btn-ghost text-xs">Retry</button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="card p-5 animate-fade-in">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 skeleton rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Cache indicator */}
      <CacheIndicator cached={data.cached} cacheAge={data.cache_age_seconds} stale={data.stale} onRefresh={onRefresh} loading={loading} />

      {/* Bridge summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-in">
        {data.bridges.map((bridge) => (
          <BridgeCard key={bridge.name} bridge={bridge} />
        ))}
      </div>

      {/* Mobile port cards */}
      <div className="md:hidden space-y-2 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
        {data.ports.map((port) => {
          const isPppoe = data.pppoe_ports?.includes(port.port) ?? false;
          const hasErrors = port.rx_error > 0 || port.tx_error > 0;
          return (
            <div
              key={port.port}
              className={`card p-3 ${!port.link_up ? 'opacity-60' : hasErrors ? 'border-amber-500/30' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-foreground text-sm">{port.port}</span>
                  {isPppoe && <span className="text-[9px] text-amber-500 font-medium">(DB)</span>}
                  <span className={`badge text-[10px] ${
                    port.service === 'pppoe' ? 'bg-blue-500/20 text-blue-400' :
                    port.service === 'hotspot' ? 'bg-emerald-500/20 text-emerald-400' :
                    port.service === 'dual' ? 'bg-cyan-500/20 text-cyan-400' :
                    port.service === 'plain' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-foreground-muted/20 text-foreground-muted'
                  }`}>{port.service === 'dual' ? 'PPPoE+Hotspot' : port.service}</span>
                </div>
                <span className={`badge text-[10px] ${
                  port.link_up ? 'badge-success' : 'bg-foreground-muted/20 text-foreground-muted'
                }`}>{port.link_up ? 'Up' : 'Down'}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-foreground-muted">
                <span>Bridge: <span className="text-foreground">{port.bridge}</span></span>
                <span className={port.rx_error > 0 ? 'text-red-400 font-medium' : ''}>RX Err: {port.rx_error}</span>
                <span className={port.tx_error > 0 ? 'text-red-400 font-medium' : ''}>TX Err: {port.tx_error}</span>
                <span>Downs: {port.link_downs}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop port table */}
      <div className="hidden md:block card overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs font-medium text-foreground-muted">Port</th>
                <th className="text-left p-3 text-xs font-medium text-foreground-muted">Bridge</th>
                <th className="text-left p-3 text-xs font-medium text-foreground-muted">Service</th>
                <th className="text-left p-3 text-xs font-medium text-foreground-muted">Link</th>
                <th className="text-left p-3 text-xs font-medium text-foreground-muted">RX Err</th>
                <th className="text-left p-3 text-xs font-medium text-foreground-muted">TX Err</th>
                <th className="text-left p-3 text-xs font-medium text-foreground-muted">Link Downs</th>
                <th className="text-left p-3 text-xs font-medium text-foreground-muted">MTU</th>
              </tr>
            </thead>
            <tbody>
              {data.ports.map((port) => (
                <PortRow key={port.port} port={port} isPppoePort={data.pppoe_ports?.includes(port.port) ?? false} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Shared Components
// =============================================================================

function CacheIndicator({
  cached, cacheAge, stale, onRefresh, loading,
}: {
  cached?: boolean;
  cacheAge?: number;
  stale?: boolean;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {cached && <span className="badge bg-blue-500/20 text-blue-400 text-[10px]">Cached</span>}
        {stale && <span className="badge bg-amber-500/20 text-amber-400 text-[10px]">Stale</span>}
        {cacheAge != null && (
          <span className="text-[10px] text-foreground-muted">Updated {Math.round(cacheAge)}s ago</span>
        )}
        {loading && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
      </div>
      <button onClick={onRefresh} disabled={loading} className="btn-ghost text-xs">
        Refresh
      </button>
    </div>
  );
}

function OverviewCard({
  title, data, loading, error, onRefresh,
}: {
  title: string;
  data: PPPoEOverviewResponse | HotspotOverviewResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  if (error) {
    return (
      <div className="card p-5 border-red-500/30 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">{title}</p>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          </div>
          <button onClick={onRefresh} className="btn-ghost text-xs">Retry</button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="card p-5 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl skeleton" />
          <div>
            <div className="w-32 h-4 skeleton mb-1" />
            <div className="w-20 h-3 skeleton" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 skeleton rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="card p-4 sm:p-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            data.healthy ? 'bg-emerald-500/10' : 'bg-red-500/10'
          }`}>
            {data.healthy ? (
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground text-sm sm:text-base">{title}</p>
              <span className={`badge ${data.healthy ? 'badge-success' : 'bg-red-500/20 text-red-400'}`}>
                {data.healthy ? 'Healthy' : 'Issues Found'}
              </span>
            </div>
            <p className="text-xs text-foreground-muted">
              {data.active_sessions} active session{data.active_sessions !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <CacheIndicator cached={data.cached} cacheAge={data.cache_age_seconds} stale={data.stale} onRefresh={onRefresh} loading={loading} />
      </div>

      {/* Health checks */}
      <HealthCheckList checks={data.checks} />
    </div>
  );
}

function HealthCheckList({ checks }: { checks: HealthCheck[] }) {
  return (
    <div className="space-y-1.5">
      {checks.map((check) => (
        <div
          key={check.check}
          className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${
            check.passed ? 'bg-emerald-500/5' : 'bg-red-500/5'
          }`}
        >
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
            check.passed ? 'bg-emerald-500/20' : 'bg-red-500/20'
          }`}>
            {check.passed ? (
              <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <span className={check.passed ? 'text-foreground' : 'text-red-400 font-medium'}>
            {check.description}
          </span>
        </div>
      ))}
    </div>
  );
}

function IssuesList({ issues }: { issues: DiagnosticIssue[] }) {
  if (issues.length === 0) return null;

  const severityStyles = {
    critical: 'bg-red-500/10 border-red-500/20 text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  };

  const severityBadge = {
    critical: 'bg-red-500/20 text-red-400',
    warning: 'bg-amber-500/20 text-amber-400',
    info: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <div className="space-y-2">
      {issues.map((issue, i) => (
        <div
          key={i}
          className={`p-3 rounded-lg border ${severityStyles[issue.severity]}`}
        >
          <div className="flex items-start gap-2">
            <span className={`badge text-[10px] mt-0.5 ${severityBadge[issue.severity]}`}>
              {issue.severity}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{issue.message}</p>
              {issue.recommendation && (
                <p className="text-xs text-foreground-muted mt-1">{issue.recommendation}</p>
              )}
            </div>
            {issue.layer && (
              <span className="text-[10px] text-foreground-muted bg-background-tertiary px-1.5 py-0.5 rounded flex-shrink-0">
                {issue.layer}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function LogsTable({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-foreground-muted text-sm">
        No log entries found
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-2 max-h-[400px] overflow-y-auto">
        {entries.map((entry, i) => (
          <div key={i} className="p-3 rounded-lg bg-background-tertiary/50 border border-border/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[11px] text-foreground-muted">{entry.time}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-background-secondary text-foreground-muted">
                {entry.topics}
              </span>
            </div>
            <p className="text-sm text-foreground break-words">{entry.message}</p>
          </div>
        ))}
      </div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background-secondary">
            <tr className="border-b border-border">
              <th className="text-left p-2 text-xs font-medium text-foreground-muted whitespace-nowrap">Time</th>
              <th className="text-left p-2 text-xs font-medium text-foreground-muted whitespace-nowrap">Topics</th>
              <th className="text-left p-2 text-xs font-medium text-foreground-muted">Message</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-background-tertiary/50">
                <td className="p-2 text-foreground-muted whitespace-nowrap font-mono text-xs">{entry.time}</td>
                <td className="p-2 whitespace-nowrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-background-tertiary text-foreground-muted">
                    {entry.topics}
                  </span>
                </td>
                <td className="p-2 text-foreground">{entry.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SecretsTable({ secrets }: { secrets: PPPoESecretEntry[] }) {
  if (secrets.length === 0) {
    return (
      <div className="text-center py-6 text-foreground-muted text-sm">
        No PPPoE secrets found
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-2 max-h-[500px] overflow-y-auto">
        {secrets.map((secret) => (
          <div key={secret.name} className="p-3 rounded-lg bg-background-tertiary/50 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground font-mono text-sm">{secret.name}</span>
              <span className={`badge text-[10px] ${
                secret.disabled ? 'bg-red-500/20 text-red-400' :
                secret.online ? 'badge-success' : 'bg-foreground-muted/20 text-foreground-muted'
              }`}>
                {secret.disabled ? 'Disabled' : secret.online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-muted">Profile: <span className="text-foreground">{secret.profile}</span></span>
              {secret.db_customer && (
                <span className="text-foreground">{secret.db_customer.name}</span>
              )}
            </div>
            {secret.last_disconnect_reason && (
              <p className="text-[11px] text-foreground-muted mt-1.5 truncate">{secret.last_disconnect_reason}</p>
            )}
          </div>
        ))}
      </div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background-secondary">
            <tr className="border-b border-border">
              <th className="text-left p-2 text-xs font-medium text-foreground-muted">Username</th>
              <th className="text-left p-2 text-xs font-medium text-foreground-muted">Status</th>
              <th className="text-left p-2 text-xs font-medium text-foreground-muted">Profile</th>
              <th className="text-left p-2 text-xs font-medium text-foreground-muted">Customer</th>
              <th className="text-left p-2 text-xs font-medium text-foreground-muted">Last Disconnect</th>
            </tr>
          </thead>
          <tbody>
            {secrets.map((secret) => (
              <tr key={secret.name} className="border-b border-border/50 hover:bg-background-tertiary/50">
                <td className="p-2 font-medium text-foreground font-mono text-xs">{secret.name}</td>
                <td className="p-2">
                  <span className={`badge text-[10px] ${
                    secret.disabled ? 'bg-red-500/20 text-red-400' :
                    secret.online ? 'badge-success' : 'bg-foreground-muted/20 text-foreground-muted'
                  }`}>
                    {secret.disabled ? 'Disabled' : secret.online ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td className="p-2 text-foreground-muted">{secret.profile}</td>
                <td className="p-2">
                  {secret.db_customer ? (
                    <div>
                      <span className="text-foreground">{secret.db_customer.name}</span>
                      <span className={`ml-1 badge text-[10px] ${
                        secret.db_customer.status === 'active' ? 'badge-success' : 'bg-foreground-muted/20 text-foreground-muted'
                      }`}>
                        {secret.db_customer.status}
                      </span>
                    </div>
                  ) : (
                    <span className="text-foreground-muted text-xs">Not in DB</span>
                  )}
                </td>
                <td className="p-2 text-foreground-muted text-xs">{secret.last_disconnect_reason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PortRow({ port, isPppoePort }: { port: PortEntry; isPppoePort: boolean }) {
  const hasErrors = port.rx_error > 0 || port.tx_error > 0;
  const rowClass = !port.link_up
    ? 'bg-foreground-muted/5'
    : hasErrors
    ? 'bg-amber-500/5'
    : '';

  return (
    <tr className={`border-b border-border/50 hover:bg-background-tertiary/50 ${rowClass}`}>
      <td className="p-3 font-medium text-foreground font-mono text-xs">
        {port.port}
        {isPppoePort && <span className="ml-1 text-[9px] text-amber-500">(DB)</span>}
      </td>
      <td className="p-3 text-foreground-muted">{port.bridge}</td>
      <td className="p-3">
        <span className={`badge text-[10px] ${
          port.service === 'pppoe' ? 'bg-blue-500/20 text-blue-400' :
          port.service === 'hotspot' ? 'bg-emerald-500/20 text-emerald-400' :
          port.service === 'dual' ? 'bg-cyan-500/20 text-cyan-400' :
          port.service === 'plain' ? 'bg-purple-500/20 text-purple-400' :
          'bg-foreground-muted/20 text-foreground-muted'
        }`}>
          {port.service === 'dual' ? 'PPPoE+Hotspot' : port.service}
        </span>
      </td>
      <td className="p-3">
        <span className={`badge text-[10px] ${
          port.link_up ? 'badge-success' : 'bg-foreground-muted/20 text-foreground-muted'
        }`}>
          {port.link_up ? 'Up' : 'Down'}
        </span>
      </td>
      <td className={`p-3 font-mono text-xs ${port.rx_error > 0 ? 'text-red-400 font-medium' : 'text-foreground-muted'}`}>
        {port.rx_error}
      </td>
      <td className={`p-3 font-mono text-xs ${port.tx_error > 0 ? 'text-red-400 font-medium' : 'text-foreground-muted'}`}>
        {port.tx_error}
      </td>
      <td className="p-3 font-mono text-xs text-foreground-muted hidden sm:table-cell">{port.link_downs}</td>
      <td className="p-3 font-mono text-xs text-foreground-muted hidden md:table-cell">{port.actual_mtu}</td>
    </tr>
  );
}

function BridgeCard({ bridge }: { bridge: BridgeEntry }) {
  return (
    <div className={`card p-3 ${bridge.running ? '' : 'border-red-500/30'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono font-medium text-foreground text-sm">{bridge.name}</span>
        <span className={`badge text-[10px] ${bridge.running ? 'badge-success' : 'bg-red-500/20 text-red-400'}`}>
          {bridge.running ? 'Running' : 'Down'}
        </span>
      </div>
      <p className="text-xs text-foreground-muted">{bridge.port_count} port{bridge.port_count !== 1 ? 's' : ''}</p>
    </div>
  );
}
