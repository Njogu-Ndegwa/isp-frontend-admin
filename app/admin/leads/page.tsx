'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import DataTable, { DataTableColumn } from '../../components/DataTable';
import MobileDataCard from '../../components/MobileDataCard';
import SearchInput from '../../components/SearchInput';
import FilterSelect from '../../components/FilterSelect';
import LeadsSubNav from '../../components/LeadsSubNav';
import LeadStageBadge, { STAGE_ORDER, ACTIVE_STAGES, getStageMeta } from '../../components/LeadStageBadge';
import LeadBackfillDialog from '../../components/LeadBackfillDialog';
import { api } from '../../lib/api';
import type { Lead, LeadSource, LeadPipelineSummary, LeadStage, CreateLeadRequest } from '../../lib/types';

// ───── Types ─────────────────────────────────────────────
type ViewMode = 'kanban' | 'list';
type Density = 'comfortable' | 'compact';
type GroupBy = 'none' | 'source' | 'platform' | 'urgency' | 'age';

interface SavedView {
  id: string;
  name: string;
  builtin?: boolean;
  activeOnly: boolean;
  groupBy: GroupBy;
  stageFilter?: LeadStage | '';
  sourceFilter?: string;
  search?: string;
}

// ───── Constants ─────────────────────────────────────────
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

const WIP_WARN_THRESHOLD = 10;
const WIP_OVER_THRESHOLD = 20;

const BUILTIN_VIEWS: SavedView[] = [
  { id: 'active', name: 'Active pipeline', builtin: true, activeOnly: true, groupBy: 'none' },
  { id: 'needs-attention', name: 'Needs attention', builtin: true, activeOnly: true, groupBy: 'urgency' },
  { id: 'by-source', name: 'By source', builtin: true, activeOnly: true, groupBy: 'source' },
  { id: 'all', name: 'All leads', builtin: true, activeOnly: false, groupBy: 'none' },
];

const STORAGE_VIEWS = 'leadsSavedViews';
const STORAGE_ACTIVE_VIEW = 'leadsActiveView';
const STORAGE_DENSITY = 'leadsDensity';
const STORAGE_COLLAPSED_LANES = 'leadsCollapsedLanes';

// ───── Helpers ───────────────────────────────────────────
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

function urgencyOf(lead: Lead): 'overdue' | 'due_soon' | 'stale' | 'fresh' | 'unscheduled' {
  if (lead.next_followup_at) {
    const diffDays = (new Date(lead.next_followup_at).getTime() - Date.now()) / 86400000;
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 2) return 'due_soon';
  }
  const age = daysSince(lead.updated_at);
  if (age >= 14) return 'stale';
  if (!lead.next_followup_at) return 'unscheduled';
  return 'fresh';
}

const URGENCY_META: Record<string, { label: string; variant: string; order: number }> = {
  overdue:     { label: 'Overdue',      variant: 'badge-danger',  order: 0 },
  due_soon:    { label: 'Due soon',     variant: 'badge-warning', order: 1 },
  stale:       { label: 'Stale (14d+)', variant: 'badge-warning', order: 2 },
  unscheduled: { label: 'No follow-up', variant: 'badge-neutral', order: 3 },
  fresh:       { label: 'On track',     variant: 'badge-success', order: 4 },
};

function ageBucket(lead: Lead): 'fresh' | 'active' | 'stale' {
  const d = daysSince(lead.updated_at);
  if (d < 3) return 'fresh';
  if (d < 14) return 'active';
  return 'stale';
}

const AGE_META: Record<string, { label: string; order: number }> = {
  fresh:  { label: 'Fresh (< 3d)',     order: 0 },
  active: { label: 'Active (3–14d)',   order: 1 },
  stale:  { label: 'Stale (14d+)',     order: 2 },
};

// ───── Main component ────────────────────────────────────
export default function LeadsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<ViewMode>('kanban');
  const [density, setDensity] = useState<Density>('comfortable');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [summary, setSummary] = useState<LeadPipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<LeadStage | ''>('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Views
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>('active');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  // Collapsed swimlanes
  const [collapsedLanes, setCollapsedLanes] = useState<Record<string, boolean>>({});

  // Add lead modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<CreateLeadRequest>({ name: '' });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Backfill (import from signups) modal
  const [showBackfillModal, setShowBackfillModal] = useState(false);

  // Drag state
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // ───── Load persistent settings ────────────────────────
  useEffect(() => {
    try {
      const savedDensity = localStorage.getItem(STORAGE_DENSITY);
      if (savedDensity === 'compact' || savedDensity === 'comfortable') setDensity(savedDensity);

      const rawViews = localStorage.getItem(STORAGE_VIEWS);
      if (rawViews) setSavedViews(JSON.parse(rawViews));

      const savedLanes = localStorage.getItem(STORAGE_COLLAPSED_LANES);
      if (savedLanes) setCollapsedLanes(JSON.parse(savedLanes));

      const savedActiveView = localStorage.getItem(STORAGE_ACTIVE_VIEW);
      if (savedActiveView) {
        const view = [...BUILTIN_VIEWS, ...(rawViews ? JSON.parse(rawViews) : [])].find((v: SavedView) => v.id === savedActiveView);
        if (view) applyView(view);
      } else {
        applyView(BUILTIN_VIEWS[0]);
      }
    } catch { /* use defaults */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_DENSITY, density); }, [density]);
  useEffect(() => { localStorage.setItem(STORAGE_VIEWS, JSON.stringify(savedViews)); }, [savedViews]);
  useEffect(() => { localStorage.setItem(STORAGE_ACTIVE_VIEW, activeViewId); }, [activeViewId]);
  useEffect(() => { localStorage.setItem(STORAGE_COLLAPSED_LANES, JSON.stringify(collapsedLanes)); }, [collapsedLanes]);

  // ───── Data ────────────────────────────────────────────
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

  // ───── View application ────────────────────────────────
  function applyView(v: SavedView) {
    setActiveViewId(v.id);
    setActiveOnly(v.activeOnly);
    setGroupBy(v.groupBy);
    setStageFilter(v.stageFilter ?? '');
    setSourceFilter(v.sourceFilter ?? '');
    setSearch(v.search ?? '');
  }

  function saveCurrentView() {
    const name = newViewName.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    const newView: SavedView = {
      id, name, activeOnly, groupBy,
      stageFilter: stageFilter || undefined,
      sourceFilter: sourceFilter || undefined,
      search: search || undefined,
    };
    setSavedViews(prev => [...prev, newView]);
    setActiveViewId(id);
    setShowSaveDialog(false);
    setNewViewName('');
  }

  function deleteSavedView(id: string) {
    setSavedViews(prev => prev.filter(v => v.id !== id));
    if (activeViewId === id) applyView(BUILTIN_VIEWS[0]);
  }

  // ───── Derived data ────────────────────────────────────
  const visibleStages: LeadStage[] = useMemo(
    () => (activeOnly ? ACTIVE_STAGES : STAGE_ORDER),
    [activeOnly]
  );

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (activeOnly) result = result.filter(l => ACTIVE_STAGES.includes(l.stage));
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
  }, [leads, activeOnly, stageFilter, sourceFilter, search]);

  const swimlanes = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All leads', leads: filteredLeads }];
    }
    const map = new Map<string, { key: string; label: string; order: number; leads: Lead[] }>();
    for (const lead of filteredLeads) {
      let key = 'other', label = 'Other', order = 99;
      if (groupBy === 'source') {
        key = lead.source || 'unsourced';
        label = lead.source || 'No source';
        order = lead.source ? 0 : 99;
      } else if (groupBy === 'platform') {
        key = lead.social_platform || 'direct';
        label = lead.social_platform
          ? lead.social_platform.charAt(0).toUpperCase() + lead.social_platform.slice(1)
          : 'Direct / unknown';
        order = lead.social_platform ? 0 : 99;
      } else if (groupBy === 'urgency') {
        const u = urgencyOf(lead);
        key = u; label = URGENCY_META[u].label; order = URGENCY_META[u].order;
      } else if (groupBy === 'age') {
        const a = ageBucket(lead);
        key = a; label = AGE_META[a].label; order = AGE_META[a].order;
      }
      if (!map.has(key)) map.set(key, { key, label, order, leads: [] });
      map.get(key)!.leads.push(lead);
    }
    return Array.from(map.values()).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [filteredLeads, groupBy]);

  const leadsByStageFor = (laneLeads: Lead[], stage: LeadStage) => laneLeads.filter(l => l.stage === stage);

  // ───── Drag handlers ───────────────────────────────────
  const handleDragStart = (lead: Lead) => setDraggedLead(lead);
  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    setDragOverKey(key);
  };
  const handleDragLeave = () => setDragOverKey(null);
  const handleDrop = async (stage: LeadStage) => {
    setDragOverKey(null);
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

  // ───── Add lead ────────────────────────────────────────
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
      case 'stage':    return <LeadStageBadge stage={item.stage} size="sm" />;
      case 'source':   return <span className="text-sm">{item.source || '-'}</span>;
      case 'phone':    return <span className="text-sm">{item.phone || '-'}</span>;
      case 'followup':
        return (
          <span className={`text-sm ${item.next_followup_at && new Date(item.next_followup_at) < new Date() ? 'text-red-400' : 'text-foreground-muted'}`}>
            {formatRelative(item.next_followup_at)}
          </span>
        );
      case 'updated':  return <span className="text-sm text-foreground-muted">{formatRelative(item.updated_at)}</span>;
      default:         return null;
    }
  };

  const toggleLane = (key: string) =>
    setCollapsedLanes(prev => ({ ...prev, [key]: !prev[key] }));

  const allViews = [...BUILTIN_VIEWS, ...savedViews];
  const currentView = allViews.find(v => v.id === activeViewId);
  const viewIsDirty = currentView
    ? currentView.activeOnly !== activeOnly
      || currentView.groupBy !== groupBy
      || (currentView.stageFilter ?? '') !== stageFilter
      || (currentView.sourceFilter ?? '') !== sourceFilter
      || (currentView.search ?? '') !== search
    : true;

  // ───── Render ──────────────────────────────────────────
  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <Header
        title="Lead Pipeline"
        subtitle={summary ? `${summary.total} total · ${filteredLeads.length} visible` : 'Manage your sales pipeline'}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBackfillModal(true)}
              className="btn-secondary text-sm"
              title="Classify existing resellers as leads in the pipeline"
            >
              Import Signups
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
              + Add Lead
            </button>
          </div>
        }
      />

      <LeadsSubNav />

      {/* ─── View chips (Linear/Asana-style saved views) ─── */}
      <div className="flex gap-2 items-center overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {allViews.map(v => {
          const isActive = v.id === activeViewId;
          return (
            <div key={v.id} className="relative flex-shrink-0 group">
              <button
                onClick={() => applyView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-accent-primary/10 border-accent-primary/40 text-accent-primary'
                    : 'bg-background-secondary border-border text-foreground-muted hover:text-foreground hover:border-border-hover'
                }`}
                title={v.builtin ? 'Built-in view' : 'Saved view'}
              >
                {v.name}
                {isActive && viewIsDirty && <span className="w-1 h-1 rounded-full bg-amber-400" title="Unsaved changes" />}
              </button>
              {!v.builtin && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSavedView(v.id); }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-background-tertiary border border-border text-foreground-muted hover:text-red-400 hover:border-red-500/30 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  title="Delete view"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        {viewIsDirty && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border text-foreground-muted hover:text-foreground hover:border-border-hover whitespace-nowrap"
            title="Save current filter + grouping as a view"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save view
          </button>
        )}
      </div>

      {/* ─── Toolbar ─── */}
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

        {view === 'kanban' && (
          <>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-foreground-muted hidden sm:inline">Group by</span>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value as GroupBy)}
                className="select text-xs py-1.5 pr-7"
              >
                <option value="none">None</option>
                <option value="source">Source</option>
                <option value="platform">Platform</option>
                <option value="urgency">Urgency</option>
                <option value="age">Age</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-foreground-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={e => setActiveOnly(e.target.checked)}
                className="accent-accent-primary"
              />
              Active only
            </label>

            <button
              onClick={() => setDensity(d => d === 'compact' ? 'comfortable' : 'compact')}
              className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
              title={density === 'compact' ? 'Switch to comfortable' : 'Switch to compact'}
            >
              {density === 'compact' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
            </button>
          </>
        )}

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
            <FilterSelect options={STAGE_FILTER_OPTIONS} value={stageFilter} onChange={(v) => setStageFilter(v as LeadStage | '')} />
            <FilterSelect options={sourceFilterOptions} value={sourceFilter} onChange={setSourceFilter} />
          </>
        )}
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
        /* ─── Kanban Board (unified, swimlane-grouped, consistent columns) ─── */
        <div className="space-y-3">
          {swimlanes.map(lane => {
            const collapsed = !!collapsedLanes[lane.key];
            const laneCount = lane.leads.length;
            return (
              <div key={lane.key} className={groupBy !== 'none' ? 'border border-border rounded-xl bg-background-secondary/30' : ''}>
                {groupBy !== 'none' && (
                  <button
                    onClick={() => toggleLane(lane.key)}
                    className="w-full flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-background-tertiary/30 transition-colors rounded-t-xl"
                  >
                    <svg
                      className={`w-3 h-3 text-foreground-muted transition-transform ${collapsed ? '' : 'rotate-90'}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm font-semibold text-foreground">{lane.label}</span>
                    <span className="text-xs text-foreground-muted font-medium">{laneCount}</span>
                    {groupBy === 'urgency' && URGENCY_META[lane.key] && (
                      <span className={`badge ${URGENCY_META[lane.key].variant} text-[10px] ml-1`}>
                        {URGENCY_META[lane.key].label}
                      </span>
                    )}
                  </button>
                )}

                {!collapsed && (
                  <div className={`overflow-x-auto ${groupBy !== 'none' ? 'p-2 -mx-0 px-2' : '-mx-4 px-4 md:mx-0 md:px-0'}`}>
                    <div className={`flex gap-3 min-w-max ${
                      groupBy === 'none' ? 'md:min-w-0 md:grid md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8' : ''
                    }`}>
                      {visibleStages.map(stage => {
                        const stageLeads = leadsByStageFor(lane.leads, stage);
                        const meta = getStageMeta(stage);
                        const overKey = `${lane.key}:${stage}`;
                        const isOver = dragOverKey === overKey;
                        const count = stageLeads.length;
                        const overLimit = count > WIP_OVER_THRESHOLD;
                        const nearLimit = count > WIP_WARN_THRESHOLD && !overLimit;
                        return (
                          <div
                            key={stage}
                            className={`w-[260px] md:w-auto flex flex-col rounded-xl border transition-colors ${
                              isOver ? 'border-accent-primary bg-accent-primary/5' : 'border-border bg-background-secondary/50'
                            }`}
                            onDragOver={(e) => handleDragOver(e, overKey)}
                            onDragLeave={handleDragLeave}
                            onDrop={() => handleDrop(stage)}
                          >
                            <div className="p-3 border-b border-border">
                              <div className="flex items-center justify-between">
                                <span className={`badge ${meta.variant} text-[10px]`}>{meta.label}</span>
                                <span
                                  className={`text-xs font-semibold flex items-center gap-1 ${
                                    overLimit ? 'text-red-400' : nearLimit ? 'text-amber-400' : 'text-foreground-muted'
                                  }`}
                                  title={overLimit
                                    ? `Over WIP limit (${WIP_OVER_THRESHOLD}) — these need attention`
                                    : nearLimit
                                    ? `Approaching WIP limit (${WIP_WARN_THRESHOLD})`
                                    : undefined}
                                >
                                  {(overLimit || nearLimit) && (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                  )}
                                  {count}
                                </span>
                              </div>
                            </div>

                            <div className={`p-2 space-y-2 min-h-[60px] max-h-[60vh] overflow-y-auto`}>
                              {stageLeads.length === 0 ? (
                                <div className="text-center text-xs text-foreground-muted py-4 opacity-40">—</div>
                              ) : (
                                stageLeads.map(lead => (
                                  <KanbanCard
                                    key={lead.id}
                                    lead={lead}
                                    density={density}
                                    dragging={draggedLead?.id === lead.id}
                                    onDragStart={() => handleDragStart(lead)}
                                    onClick={() => router.push(`/admin/leads/${lead.id}`)}
                                  />
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {swimlanes.length === 0 && (
            <div className="card p-10 text-center text-foreground-muted">
              <p className="font-medium text-foreground mb-1">No leads match this view</p>
              <p className="text-sm">Try switching view or clearing filters.</p>
            </div>
          )}
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

      {/* ─── Save View dialog ─── */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSaveDialog(false)} />
          <div className="relative bg-background-secondary border border-border rounded-2xl w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold mb-4">Save as view</h3>
            <p className="text-xs text-foreground-muted mb-3">
              Saves current group-by, filters, and search as a reusable view.
            </p>
            <input
              type="text"
              className="input w-full mb-3"
              placeholder="e.g. Tiktok pipeline"
              value={newViewName}
              onChange={e => setNewViewName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setShowSaveDialog(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={saveCurrentView} disabled={!newViewName.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Import / Backfill Signups dialog ─── */}
      <LeadBackfillDialog
        open={showBackfillModal}
        onClose={() => setShowBackfillModal(false)}
        onSuccess={() => fetchData()}
      />

      {/* ─── Add Lead Modal ─── */}
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

// ───── KanbanCard (extracted for density variants) ───────
function KanbanCard({
  lead, density, dragging, onDragStart, onClick,
}: {
  lead: Lead;
  density: Density;
  dragging: boolean;
  onDragStart: () => void;
  onClick: () => void;
}) {
  const isCompact = density === 'compact';
  const overdue = !!lead.next_followup_at && new Date(lead.next_followup_at) < new Date();

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`rounded-lg border bg-background-secondary hover:border-border-hover cursor-pointer transition-all hover:shadow-sm ${
        dragging ? 'opacity-40' : ''
      } ${overdue ? 'border-red-500/30' : 'border-border'} ${isCompact ? 'p-2' : 'p-3'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className={`font-medium leading-tight line-clamp-1 ${isCompact ? 'text-xs' : 'text-sm'}`}>
          {lead.name}
        </span>
        {overdue && !isCompact && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" title="Follow-up overdue" />
        )}
      </div>

      {!isCompact && (lead.source || lead.social_handle) && (
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

      <div className={`flex items-center justify-between text-[10px] text-foreground-muted ${isCompact ? '' : 'mt-1'}`}>
        <span className="truncate">{lead.phone || lead.email || '-'}</span>
        {lead.next_followup_at && (
          <span className={overdue ? 'text-red-400 font-medium' : ''}>
            {formatRelative(lead.next_followup_at)}
          </span>
        )}
      </div>
    </div>
  );
}
