'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  WalledGardenDomainEntry,
  WalledGardenIpEntry,
} from '../lib/types';
import Header from '../components/Header';
import RouterSelector from '../components/RouterSelector';
import MobileDataCard from '../components/MobileDataCard';
import DataTable from '../components/DataTable';
import PullToRefresh from '../components/PullToRefresh';
import LoadingSpinner from '../components/LoadingSpinner';
import Link from 'next/link';

type Tab = 'domains' | 'ips';

function DeleteButton({ entryId, onDelete, deleting }: { entryId: string; onDelete: (id: string) => void; deleting: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onDelete(entryId); }}
      disabled={deleting}
      className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
      title="Remove entry"
    >
      {deleting ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )}
    </button>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      {label}
    </button>
  );
}

function EntryForm({
  show,
  onClose,
  onSubmit,
  submitting,
  fields,
}: {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  fields: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <div className="card p-4 mb-4 animate-fade-in border border-accent-primary/20">
      <form onSubmit={onSubmit} className="space-y-3">
        {fields}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Add Entry
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg text-foreground-muted hover:bg-background-tertiary transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function WalledGardenPage() {
  const { isAuthenticated } = useAuth();

  const [selectedRouterId, setSelectedRouterId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('domains');

  const [domainEntries, setDomainEntries] = useState<WalledGardenDomainEntry[]>([]);
  const [ipEntries, setIpEntries] = useState<WalledGardenIpEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add domain form
  const [showDomainForm, setShowDomainForm] = useState(false);
  const [newDstHost, setNewDstHost] = useState('');
  const [newDomainComment, setNewDomainComment] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);

  // Add IP form
  const [showIpForm, setShowIpForm] = useState(false);
  const [newDstAddress, setNewDstAddress] = useState('');
  const [newIpComment, setNewIpComment] = useState('');
  const [addingIp, setAddingIp] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEntries = useCallback(async (routerId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getWalledGarden(routerId);
      setDomainEntries(data.domain_entries || []);
      setIpEntries(data.ip_entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load walled garden');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRouterChange = useCallback((routerId: number | null) => {
    setSelectedRouterId(routerId);
    if (routerId) {
      loadEntries(routerId);
    } else {
      setDomainEntries([]);
      setIpEntries([]);
    }
  }, [loadEntries]);

  const handleRefresh = useCallback(async () => {
    if (selectedRouterId) {
      await loadEntries(selectedRouterId);
    }
  }, [selectedRouterId, loadEntries]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouterId || !newDstHost.trim()) return;
    try {
      setAddingDomain(true);
      await api.addWalledGardenDomain({
        router_id: selectedRouterId,
        dst_host: newDstHost.trim(),
        comment: newDomainComment.trim(),
      });
      setNewDstHost('');
      setNewDomainComment('');
      setShowDomainForm(false);
      await loadEntries(selectedRouterId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setAddingDomain(false);
    }
  };

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouterId || !newDstAddress.trim()) return;
    try {
      setAddingIp(true);
      await api.addWalledGardenIp({
        router_id: selectedRouterId,
        dst_address: newDstAddress.trim(),
        comment: newIpComment.trim(),
      });
      setNewDstAddress('');
      setNewIpComment('');
      setShowIpForm(false);
      await loadEntries(selectedRouterId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add IP');
    } finally {
      setAddingIp(false);
    }
  };

  const handleDeleteDomain = async (entryId: string) => {
    if (!selectedRouterId) return;
    try {
      setDeletingId(entryId);
      await api.removeWalledGardenDomain(entryId, selectedRouterId);
      await loadEntries(selectedRouterId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove domain');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteIp = async (entryId: string) => {
    if (!selectedRouterId) return;
    try {
      setDeletingId(entryId);
      await api.removeWalledGardenIp(entryId, selectedRouterId);
      await loadEntries(selectedRouterId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove IP');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-foreground-muted">Please log in to manage walled garden.</p>
        <Link href="/login" className="btn-primary px-6 py-2">Go to Login</Link>
      </div>
    );
  }

  const domainColumns = [
    { key: 'id', label: 'ID' },
    { key: 'dst-host', label: 'Domain Pattern' },
    { key: 'action', label: 'Action' },
    { key: 'comment', label: 'Comment' },
    { key: 'actions', label: '', className: 'w-16' },
  ];

  const ipColumns = [
    { key: 'id', label: 'ID' },
    { key: 'dst-address', label: 'IP Address' },
    { key: 'action', label: 'Action' },
    { key: 'comment', label: 'Comment' },
    { key: 'actions', label: '', className: 'w-16' },
  ];

  return (
    <div>
      <Header
        title="Walled Garden"
        subtitle="Manage allowed domains and IPs for captive portal bypass"
      />

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <RouterSelector
          selectedRouterId={selectedRouterId}
          onRouterChange={handleRouterChange}
        />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-danger hover:text-danger/80">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {!selectedRouterId ? (
        <div className="card p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-foreground-muted/40 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
          <p className="text-foreground-muted">Select a router to manage its walled garden entries.</p>
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-background-secondary rounded-lg p-1">
            <button
              onClick={() => setActiveTab('domains')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'domains'
                  ? 'bg-accent-primary text-white'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Domains ({domainEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('ips')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'ips'
                  ? 'bg-accent-primary text-white'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              IP Addresses ({ipEntries.length})
            </button>
          </div>

          {/* Domain Entries Tab */}
          {activeTab === 'domains' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
                  Domain Entries
                </h3>
                <AddButton onClick={() => setShowDomainForm(true)} label="Add Domain" />
              </div>

              <EntryForm
                show={showDomainForm}
                onClose={() => setShowDomainForm(false)}
                onSubmit={handleAddDomain}
                submitting={addingDomain}
                fields={
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Domain Pattern</label>
                      <input
                        type="text"
                        value={newDstHost}
                        onChange={(e) => setNewDstHost(e.target.value)}
                        placeholder="e.g. *.stripe.com"
                        required
                        className="w-full px-3 py-2 text-sm bg-background-tertiary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Comment</label>
                      <input
                        type="text"
                        value={newDomainComment}
                        onChange={(e) => setNewDomainComment(e.target.value)}
                        placeholder="e.g. Payment provider"
                        className="w-full px-3 py-2 text-sm bg-background-tertiary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </>
                }
              />

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {domainEntries.length === 0 ? (
                  <div className="card p-8 text-center">
                    <svg className="w-10 h-10 mx-auto text-foreground-muted/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <p className="text-foreground-muted text-sm">No domain entries configured.</p>
                  </div>
                ) : (
                  domainEntries.map((entry) => (
                    <MobileDataCard
                      key={entry['.id']}
                      id={entry['.id']}
                      title={entry['dst-host']}
                      subtitle={entry.comment || 'No comment'}
                      avatar={{ text: 'D', color: 'info' }}
                      status={{ label: entry.action, variant: entry.action === 'allow' ? 'success' : 'neutral' }}
                      rightAction={
                        <DeleteButton entryId={entry['.id']} onDelete={handleDeleteDomain} deleting={deletingId === entry['.id']} />
                      }
                      layout="compact"
                    />
                  ))
                )}
              </div>

              {/* Desktop table */}
              <DataTable
                columns={domainColumns}
                data={domainEntries}
                rowKey={(entry) => entry['.id']}
                renderCell={(entry, columnKey) => {
                  switch (columnKey) {
                    case 'id': return <span className="font-mono text-xs text-foreground-muted">{entry['.id']}</span>;
                    case 'dst-host': return <span className="font-mono text-sm">{entry['dst-host']}</span>;
                    case 'action': return <span className="badge badge-success capitalize">{entry.action}</span>;
                    case 'comment': return <span className="text-sm text-foreground-muted">{entry.comment || '-'}</span>;
                    case 'actions': return <DeleteButton entryId={entry['.id']} onDelete={handleDeleteDomain} deleting={deletingId === entry['.id']} />;
                    default: return null;
                  }
                }}
                emptyState={{
                  icon: (
                    <svg className="w-10 h-10 text-foreground-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  ),
                  message: 'No domain entries configured.',
                }}
              />
            </div>
          )}

          {/* IP Entries Tab */}
          {activeTab === 'ips' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
                  IP Entries
                </h3>
                <AddButton onClick={() => setShowIpForm(true)} label="Add IP" />
              </div>

              <EntryForm
                show={showIpForm}
                onClose={() => setShowIpForm(false)}
                onSubmit={handleAddIp}
                submitting={addingIp}
                fields={
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">IP Address</label>
                      <input
                        type="text"
                        value={newDstAddress}
                        onChange={(e) => setNewDstAddress(e.target.value)}
                        placeholder="e.g. 203.0.113.10"
                        required
                        className="w-full px-3 py-2 text-sm bg-background-tertiary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Comment</label>
                      <input
                        type="text"
                        value={newIpComment}
                        onChange={(e) => setNewIpComment(e.target.value)}
                        placeholder="e.g. Payment gateway"
                        className="w-full px-3 py-2 text-sm bg-background-tertiary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </>
                }
              />

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {ipEntries.length === 0 ? (
                  <div className="card p-8 text-center">
                    <svg className="w-10 h-10 mx-auto text-foreground-muted/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    <p className="text-foreground-muted text-sm">No IP entries configured.</p>
                  </div>
                ) : (
                  ipEntries.map((entry) => (
                    <MobileDataCard
                      key={entry['.id']}
                      id={entry['.id']}
                      title={entry['dst-address']}
                      subtitle={entry.comment || 'No comment'}
                      avatar={{ text: 'IP', color: 'warning' }}
                      status={{ label: entry.action, variant: entry.action === 'accept' ? 'success' : 'neutral' }}
                      rightAction={
                        <DeleteButton entryId={entry['.id']} onDelete={handleDeleteIp} deleting={deletingId === entry['.id']} />
                      }
                      layout="compact"
                    />
                  ))
                )}
              </div>

              {/* Desktop table */}
              <DataTable
                columns={ipColumns}
                data={ipEntries}
                rowKey={(entry) => entry['.id']}
                renderCell={(entry, columnKey) => {
                  switch (columnKey) {
                    case 'id': return <span className="font-mono text-xs text-foreground-muted">{entry['.id']}</span>;
                    case 'dst-address': return <span className="font-mono text-sm">{entry['dst-address']}</span>;
                    case 'action': return <span className="badge badge-success capitalize">{entry.action}</span>;
                    case 'comment': return <span className="text-sm text-foreground-muted">{entry.comment || '-'}</span>;
                    case 'actions': return <DeleteButton entryId={entry['.id']} onDelete={handleDeleteIp} deleting={deletingId === entry['.id']} />;
                    default: return null;
                  }
                }}
                emptyState={{
                  icon: (
                    <svg className="w-10 h-10 text-foreground-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  ),
                  message: 'No IP entries configured.',
                }}
              />
            </div>
          )}
        </PullToRefresh>
      )}
    </div>
  );
}
