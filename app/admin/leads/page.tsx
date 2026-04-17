'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import DataTable, { DataTableColumn } from '../../components/DataTable';
import MobileDataCard from '../../components/MobileDataCard';
import SearchInput from '../../components/SearchInput';
import FilterSelect from '../../components/FilterSelect';
import LeadStageBadge, { STAGE_ORDER, getStageMeta } from '../../components/LeadStageBadge';
import { api } from '../../lib/api';
import type { Lead, LeadSource, LeadPipelineSummary, LeadStage, CreateLeadRequest } from '../../lib/types';

const LIST_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'stage', label: 'Stage' },
  { key: 'source', label: 'Source' },
  { key: 'phone', label: 'Phone' },
  { key: 'followup', label: 'Follow-up' },
  { key: 'updated', label: 'Updated' },
];

const STAGE_FILTER_OPTIONS = [
  { value: '', label: 'All Stages' },
  ...STAGE_ORDER.map(s => ({ value: s, label: getStageMeta(s).label })),
];

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = daysSince(dateStr);
  if (d < 0) return `in ${Math.abs(d)}d`;
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

export default function LeadsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [summary, setSummary] = useState<LeadPipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // List view filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Add lead modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<CreateLeadRequest>({ name: '' });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Drag state
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [leadsRes, summaryRes, sourcesRes] = await Promise.all([
        api.getLeads({ per_page: 200 }),
        api.getLeadPipelineSummary(),
        api.getLeadSources(true),
      ]);
      setLeads(leadsRes.leads);
      setSummary(summaryRes);
      setSources(sourcesRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Debounced search
  const filteredLeads = (() => {
    let result = leads;
    if (stageFilter) result = result.filter(l => l.stage === stageFilter);
    if (sourceFilter) result = result.filter(l => String(l.source_id) === sourceFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.phone && l.phone.includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.social_handle && l.social_handle.toLowerCase().includes(q))
      );
    }
    return result;
  })();

  const leadsByStage = (stage: LeadStage) => filteredLeads.filter(l => l.stage === stage);

  const handleDragStart = (lead: Lead) => setDraggedLead(lead);
  const handleDragOver = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };
  const handleDragLeave = () => setDragOverStage(null);
  const handleDrop = async (stage: LeadStage) => {
    setDragOverStage(null);
    if (!draggedLead || draggedLead.stage === stage) {
      setDraggedLead(null);
      return;
    }
    try {
      await api.changeLeadStage(draggedLead.id, { stage });
      fetchData();
    } catch (err) {
      console.error('Stage change failed:', err);
    }
    setDraggedLead(null);
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setAddSubmitting(true);
    setAddError(null);
    try {
      await api.createLead(addForm);
      setShowAddModal(false);
      setAddForm({ name: '' });
      fetchData();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setAddSubmitting(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <p className="text-foreground-muted">Admin Access Required</p>
        </div>
      </div>
    );
  }

  const sourceFilterOptions = [
    { value: '', label: 'All Sources' },
    ...sources.map(s => ({ value: String(s.id), label: s.name })),
  ];

  const renderListCell = (item: Lead, key: string) => {
    switch (key) {
      case 'name':
        return (
          <div>
            <span className="font-medium">{item.name}</span>
            {item.social_handle && (
              <span className="text-xs text-foreground-muted ml-2">{item.social_handle}</span>
            )}
          </div>
        );
      case 'stage':
        return <LeadStageBadge stage={item.stage} size="sm" />;
      case 'source':
        return <span className="text-sm">{item.source || '-'}</span>;
      case 'phone':
        return <span className="text-sm">{item.phone || '-'}</span>;
      case 'followup':
        return (
          <span className={`text-sm ${item.next_followup_at && new Date(item.next_followup_at) < new Date() ? 'text-red-400' : 'text-foreground-muted'}`}>
            {formatRelative(item.next_followup_at)}
          </span>
        );
      case 'updated':
        return <span className="text-sm text-foreground-muted">{formatRelative(item.updated_at)}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <Header
        title="Lead Pipeline"
        subtitle={summary ? `${summary.total} total leads` : 'Manage your sales pipeline'}
        action={
          <div className="flex items-center gap-2">
            <Link href="/admin/leads/analytics" className="btn-secondary text-sm hidden md:inline-flex">
              Analytics
            </Link>
            <Link href="/admin/leads/sources" className="btn-secondary text-sm hidden md:inline-flex">
              Sources
            </Link>
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
              + Add Lead
            </button>
          </div>
        }
      />

      {/* View toggle + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-background-tertiary rounded-lg p-0.5">
          <button
            onClick={() => setView('kanban')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'kanban' ? 'bg-accent-primary text-black' : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'list' ? 'bg-accent-primary text-black' : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            List
          </button>
        </div>
        {view === 'list' && (
          <>
            <SearchInput
              value={search}
              onChange={(v) => {
                clearTimeout(searchTimeout.current);
                searchTimeout.current = setTimeout(() => setSearch(v), 300);
              }}
              placeholder="Search leads..."
              className="flex-1 min-w-[180px]"
            />
            <FilterSelect options={STAGE_FILTER_OPTIONS} value={stageFilter} onChange={setStageFilter} />
            <FilterSelect options={sourceFilterOptions} value={sourceFilter} onChange={setSourceFilter} />
          </>
        )}

        {/* Mobile-only links */}
        <div className="flex gap-2 md:hidden ml-auto">
          <Link href="/admin/leads/analytics" className="btn-secondary text-xs px-2 py-1">
            Analytics
          </Link>
          <Link href="/admin/leads/sources" className="btn-secondary text-xs px-2 py-1">
            Sources
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-background-tertiary rounded w-1/2 mb-3" />
              <div className="space-y-2">
                <div className="h-16 bg-background-tertiary rounded" />
                <div className="h-16 bg-background-tertiary rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card p-6 text-center">
          <p className="text-red-400 mb-3">{error}</p>
          <button onClick={fetchData} className="btn-primary text-sm">Retry</button>
        </div>
      ) : view === 'kanban' ? (
        /* ─── Kanban Board ─── */
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-3 min-w-max md:min-w-0 md:grid md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {STAGE_ORDER.map(stage => {
              const stageLeads = leadsByStage(stage);
              const meta = getStageMeta(stage);
              const isOver = dragOverStage === stage;
              return (
                <div
                  key={stage}
                  className={`w-[260px] md:w-auto flex flex-col rounded-xl border transition-colors ${
                    isOver ? 'border-accent-primary bg-accent-primary/5' : 'border-border bg-background-secondary/50'
                  }`}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(stage)}
                >
                  {/* Column header */}
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <span className={`badge ${meta.variant} text-[10px]`}>{meta.label}</span>
                      <span className="text-xs font-semibold text-foreground-muted">
                        {summary?.stages[stage] ?? stageLeads.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 min-h-[100px] max-h-[60vh] overflow-y-auto">
                    {stageLeads.length === 0 ? (
                      <div className="text-center text-xs text-foreground-muted py-6 opacity-50">
                        No leads
                      </div>
                    ) : (
                      stageLeads.map(lead => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={() => handleDragStart(lead)}
                          onClick={() => router.push(`/admin/leads/${lead.id}`)}
                          className={`p-3 rounded-lg border border-border bg-background-secondary hover:border-border-hover cursor-pointer transition-all hover:shadow-sm ${
                            draggedLead?.id === lead.id ? 'opacity-40' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-sm font-medium leading-tight line-clamp-1">{lead.name}</span>
                          </div>
                          {(lead.source || lead.social_handle) && (
                            <div className="flex items-center gap-1.5 mb-1">
                              {lead.source && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background-tertiary text-foreground-muted">
                                  {lead.source}
                                </span>
                              )}
                              {lead.social_handle && (
                                <span className="text-[10px] text-foreground-muted truncate">{lead.social_handle}</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[10px] text-foreground-muted mt-1">
                            <span>{lead.phone || lead.email || '-'}</span>
                            {lead.next_followup_at && (
                              <span className={new Date(lead.next_followup_at) < new Date() ? 'text-red-400 font-medium' : ''}>
                                {formatRelative(lead.next_followup_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── List View ─── */
        <>
          <div className="hidden md:block">
            <DataTable
              columns={LIST_COLUMNS}
              data={filteredLeads}
              rowKey={item => item.id}
              renderCell={renderListCell}
              onRowClick={item => router.push(`/admin/leads/${item.id}`)}
              emptyState={{ message: 'No leads found' }}
            />
          </div>

          <div className="md:hidden space-y-2">
            {filteredLeads.length === 0 ? (
              <div className="card p-6 text-center text-foreground-muted">No leads found</div>
            ) : (
              filteredLeads.map(lead => (
                <MobileDataCard
                  key={lead.id}
                  id={lead.id}
                  title={lead.name}
                  subtitle={lead.source || undefined}
                  layout="compact"
                  status={{
                    label: getStageMeta(lead.stage).label,
                    variant: lead.stage === 'paying' ? 'success' : lead.stage === 'lost' || lead.stage === 'churned' ? 'danger' : lead.stage === 'talking' || lead.stage === 'installation_help' ? 'warning' : 'info',
                  }}
                  value={{ text: lead.phone || lead.email || '-' }}
                  secondary={{
                    left: <span className="text-xs text-foreground-muted">{lead.social_handle || ''}</span>,
                    right: lead.next_followup_at ? (
                      <span className={`text-xs ${new Date(lead.next_followup_at) < new Date() ? 'text-red-400' : 'text-foreground-muted'}`}>
                        Follow-up: {formatRelative(lead.next_followup_at)}
                      </span>
                    ) : null,
                  }}
                  href={`/admin/leads/${lead.id}`}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !addSubmitting && setShowAddModal(false)} />
          <div className="relative bg-background-secondary border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add New Lead</h3>
            {addError && (
              <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {addError}
              </div>
            )}
            <form onSubmit={handleAddLead} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  className="input w-full"
                  value={addForm.name}
                  onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    className="input w-full"
                    value={addForm.phone || ''}
                    onChange={e => setAddForm(p => ({ ...p, phone: e.target.value || null }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    className="input w-full"
                    value={addForm.email || ''}
                    onChange={e => setAddForm(p => ({ ...p, email: e.target.value || null }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Platform</label>
                  <select
                    className="select w-full"
                    value={addForm.social_platform || ''}
                    onChange={e => setAddForm(p => ({ ...p, social_platform: e.target.value || null }))}
                  >
                    <option value="">None</option>
                    <option value="tiktok">TikTok</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="twitter">Twitter/X</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Handle</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="@handle"
                    value={addForm.social_handle || ''}
                    onChange={e => setAddForm(p => ({ ...p, social_handle: e.target.value || null }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Source</label>
                <select
                  className="select w-full"
                  value={addForm.source_id || ''}
                  onChange={e => setAddForm(p => ({ ...p, source_id: e.target.value ? Number(e.target.value) : null }))}
                >
                  <option value="">Select source...</option>
                  {sources.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Source Detail</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. Commented on router setup video"
                  value={addForm.source_detail || ''}
                  onChange={e => setAddForm(p => ({ ...p, source_detail: e.target.value || null }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={addForm.notes || ''}
                  onChange={e => setAddForm(p => ({ ...p, notes: e.target.value || null }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowAddModal(false)} disabled={addSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={addSubmitting || !addForm.name.trim()}>
                  {addSubmitting ? 'Creating...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
