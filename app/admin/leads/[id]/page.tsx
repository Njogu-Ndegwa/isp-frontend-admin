'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Header';
import LeadStageBadge, { STAGE_ORDER, getStageMeta } from '../../../components/LeadStageBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import ConvertLeadModal from '../../../components/ConvertLeadModal';
import { api } from '../../../lib/api';
import { useCurrentLead } from '../../../lib/useCurrentLead';
import type {
  LeadDetail, LeadActivity, LeadFollowUp, LeadSource,
  LeadStage, UpdateLeadRequest, CreateActivityRequest,
} from '../../../lib/types';

type Tab = 'timeline' | 'followups' | 'info';

const ACTIVITY_ICONS: Record<string, string> = {
  note: '📝', call: '📞', dm: '💬', email: '📧',
  meeting: '🤝', stage_change: '➡️', followup_completed: '✅', other: '📌',
};

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Phone Call' },
  { value: 'dm', label: 'Direct Message' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'other', label: 'Other' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return '-'; }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return '-'; }
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function LeadDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const leadId = Number(params.id);
  const { current: currentLead, startConversation, endConversation } = useCurrentLead();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('timeline');

  // Inline notes editing
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesSavedAt, setNotesSavedAt] = useState<number | null>(null);

  // Stage change
  const [showStageModal, setShowStageModal] = useState(false);
  const [newStage, setNewStage] = useState<LeadStage>('new_lead');
  const [stageNote, setStageNote] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [stageSubmitting, setStageSubmitting] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  // Activity form
  const [activityType, setActivityType] = useState<CreateActivityRequest['activity_type']>('note');
  const [activityDesc, setActivityDesc] = useState('');
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activitySavedAt, setActivitySavedAt] = useState<number | null>(null);

  // Follow-up form
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDue, setFollowUpDue] = useState('');
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  // Edit info
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<UpdateLeadRequest>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Convert & delete
  const [showConvert, setShowConvert] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchLead = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      setError(null);
      const [data, src] = await Promise.all([
        api.getLead(leadId),
        api.getLeadSources(true),
      ]);
      setLead(data);
      setSources(src);
    } catch (err) {
      if (!opts?.silent) {
        setError(err instanceof Error ? err.message : 'Failed to load lead');
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  useEffect(() => {
    if (lead) setNotesDraft(lead.notes || '');
  }, [lead?.id, lead?.notes]);

  const isChatting = currentLead?.id === leadId;

  const handleToggleChat = () => {
    if (!lead) return;
    if (isChatting) endConversation();
    else startConversation(lead.id, lead.name);
  };

  const handleSaveNotes = async () => {
    if (!lead) return;
    const trimmed = notesDraft.trim();
    if ((lead.notes || '') === trimmed) return;
    setNotesSaving(true);
    setNotesError(null);
    try {
      await api.updateLead(lead.id, { notes: trimmed || null });
      setNotesSavedAt(Date.now());
      fetchLead();
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : 'Failed to save notes');
    } finally {
      setNotesSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center"><p className="text-foreground-muted">Admin Access Required</p></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 pb-24 md:pb-6">
        <Header title="Loading..." backHref="/admin/leads" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-background-tertiary rounded w-1/3 mb-2" />
              <div className="h-3 bg-background-tertiary rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="space-y-4 pb-24 md:pb-6">
        <Header title="Lead Not Found" backHref="/admin/leads" />
        <div className="card p-6 text-center">
          <p className="text-red-400 mb-3">{error || 'Lead not found'}</p>
          <button onClick={() => fetchLead()} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

  const handleStageChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setStageSubmitting(true);
    setStageError(null);
    try {
      await api.changeLeadStage(lead.id, {
        stage: newStage,
        note: stageNote || undefined,
        lost_reason: (newStage === 'lost' || newStage === 'churned') ? lostReason || undefined : undefined,
      });
      setShowStageModal(false);
      setStageNote('');
      setLostReason('');
      fetchLead({ silent: true });
    } catch (err) {
      console.error('Stage change failed:', err);
      setStageError(err instanceof Error ? err.message : 'Failed to change stage');
    } finally {
      setStageSubmitting(false);
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityDesc.trim()) return;
    setActivitySubmitting(true);
    setActivityError(null);
    try {
      await api.logLeadActivity(lead.id, { activity_type: activityType, description: activityDesc.trim() });
      setActivityDesc('');
      setActivitySavedAt(Date.now());
      fetchLead({ silent: true });
    } catch (err) {
      console.error('Log activity failed:', err);
      setActivityError(err instanceof Error ? err.message : 'Failed to log activity');
    } finally {
      setActivitySubmitting(false);
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpTitle.trim() || !followUpDue) return;
    setFollowUpSubmitting(true);
    setFollowUpError(null);
    try {
      await api.createLeadFollowUp(lead.id, { title: followUpTitle.trim(), due_at: new Date(followUpDue).toISOString() });
      setFollowUpTitle('');
      setFollowUpDue('');
      fetchLead({ silent: true });
    } catch (err) {
      console.error('Add follow-up failed:', err);
      setFollowUpError(err instanceof Error ? err.message : 'Failed to schedule follow-up');
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const handleCompleteFollowUp = async (fupId: number) => {
    try {
      await api.completeFollowUp(fupId);
      fetchLead({ silent: true });
    } catch (err) {
      console.error('Complete follow-up failed:', err);
      setFollowUpError(err instanceof Error ? err.message : 'Failed to complete follow-up');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError(null);
    try {
      await api.updateLead(lead.id, editForm);
      setShowEditModal(false);
      fetchLead();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteLead(lead.id);
      router.push('/admin/leads');
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  const openEditModal = () => {
    setEditForm({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      social_platform: lead.social_platform,
      social_handle: lead.social_handle,
      source_id: lead.source_id,
      source_detail: lead.source_detail,
      notes: lead.notes,
    });
    setEditError(null);
    setShowEditModal(true);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'followups', label: `Follow-ups (${lead.follow_ups.filter(f => !f.is_completed).length})` },
    { key: 'info', label: 'Info' },
  ];

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <Header
        title={lead.name}
        subtitle={lead.source ? `via ${lead.source}` : undefined}
        backHref="/admin/leads"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleChat}
              className={`text-sm font-medium rounded-lg px-3 py-2 border transition-colors flex items-center gap-1.5 ${
                isChatting
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15'
                  : 'bg-background-secondary border-border text-foreground-muted hover:text-foreground hover:border-border-hover'
              }`}
              title={isChatting ? 'Stop marking this lead as your current conversation' : 'Mark that you are currently talking with this lead'}
            >
              {isChatting ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="hidden sm:inline">Chatting now</span>
                  <span className="sm:hidden">Chat on</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="hidden sm:inline">Start conversation</span>
                  <span className="sm:hidden">Chat</span>
                </>
              )}
            </button>
            {!lead.converted_user_id && lead.stage !== 'lost' && (
              <button onClick={() => setShowConvert(true)} className="btn-secondary text-sm">
                Convert
              </button>
            )}
            <button onClick={openEditModal} className="btn-secondary text-sm">Edit</button>
          </div>
        }
      />

      {/* Stage & quick info */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <LeadStageBadge stage={lead.stage} />
          <button
            onClick={() => { setNewStage(lead.stage); setStageError(null); setShowStageModal(true); }}
            className="text-xs text-accent-primary hover:underline"
          >
            Change stage
          </button>
          {lead.converted_user_id && (
            <span className="text-xs text-green-400">Converted (User #{lead.converted_user_id})</span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {lead.phone && (
            <div>
              <span className="text-foreground-muted text-xs">Phone</span>
              <p className="font-medium">{lead.phone}</p>
            </div>
          )}
          {lead.email && (
            <div>
              <span className="text-foreground-muted text-xs">Email</span>
              <p className="font-medium">{lead.email}</p>
            </div>
          )}
          {lead.social_handle && (
            <div>
              <span className="text-foreground-muted text-xs">{lead.social_platform || 'Social'}</span>
              <p className="font-medium">{lead.social_handle}</p>
            </div>
          )}
          <div>
            <span className="text-foreground-muted text-xs">Created</span>
            <p className="font-medium">{formatDate(lead.created_at)} ({daysSince(lead.created_at)}d ago)</p>
          </div>
          {lead.next_followup_at && (
            <div>
              <span className="text-foreground-muted text-xs">Next Follow-up</span>
              <p className={`font-medium ${new Date(lead.next_followup_at) < new Date() ? 'text-red-400' : ''}`}>
                {formatDateTime(lead.next_followup_at)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notes — always visible, inline-editable */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <h3 className="text-sm font-semibold">Notes</h3>
          </div>
          <div className="flex items-center gap-2">
            {notesSavedAt && !notesSaving && !notesError && Date.now() - notesSavedAt < 3000 && (
              <span className="text-[10px] text-emerald-400">Saved</span>
            )}
            <button
              onClick={handleSaveNotes}
              disabled={notesSaving || (lead.notes || '') === notesDraft.trim()}
              className="text-xs font-medium text-accent-primary hover:underline disabled:opacity-40 disabled:no-underline"
            >
              {notesSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        <textarea
          className="input w-full text-sm"
          rows={3}
          placeholder="Jot down context about this lead — preferred time, budget, pain points…"
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={handleSaveNotes}
        />
        {notesError && <p className="text-xs text-red-400 mt-1">{notesError}</p>}
        <p className="text-[10px] text-foreground-muted mt-1">
          Tip: For conversation history and call logs, use the Timeline tab below.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key ? 'text-accent-primary' : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {/* Log activity form */}
          <form onSubmit={handleLogActivity} className="card p-4">
            <div className="flex gap-2 mb-2">
              <select
                className="select text-sm"
                value={activityType}
                onChange={e => setActivityType(e.target.value as CreateActivityRequest['activity_type'])}
              >
                {ACTIVITY_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary text-sm" disabled={activitySubmitting || !activityDesc.trim()}>
                {activitySubmitting ? 'Logging...' : 'Log'}
              </button>
              {activitySavedAt && !activitySubmitting && !activityError && Date.now() - activitySavedAt < 3000 && (
                <span className="text-xs text-emerald-400 self-center">Logged</span>
              )}
            </div>
            <textarea
              className="input w-full text-sm"
              rows={2}
              placeholder="What happened?"
              value={activityDesc}
              onChange={e => setActivityDesc(e.target.value)}
            />
            {activityError && (
              <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {activityError}
              </div>
            )}
          </form>

          {/* Activities list */}
          <div className="space-y-1">
            {lead.activities.length === 0 ? (
              <div className="card p-6 text-center text-foreground-muted text-sm">No activities yet</div>
            ) : (
              lead.activities.map((activity: LeadActivity) => (
                <div key={activity.id} className="flex gap-3 p-3 rounded-lg hover:bg-background-secondary/50">
                  <span className="text-lg mt-0.5">{ACTIVITY_ICONS[activity.activity_type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium capitalize">
                        {activity.activity_type.replace(/_/g, ' ')}
                      </span>
                      {activity.old_stage && activity.new_stage && (
                        <span className="text-[10px] text-foreground-muted">
                          {getStageMeta(activity.old_stage).label} → {getStageMeta(activity.new_stage).label}
                        </span>
                      )}
                    </div>
                    {activity.description && (
                      <p className="text-sm text-foreground-muted">{activity.description}</p>
                    )}
                    <span className="text-[10px] text-foreground-muted">{formatDateTime(activity.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Follow-ups */}
      {activeTab === 'followups' && (
        <div className="space-y-4">
          <form onSubmit={handleAddFollowUp} className="card p-4 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                className="input text-sm md:col-span-2"
                placeholder="Follow-up title..."
                value={followUpTitle}
                onChange={e => setFollowUpTitle(e.target.value)}
              />
              <input
                type="datetime-local"
                className="input text-sm"
                value={followUpDue}
                onChange={e => setFollowUpDue(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary text-sm" disabled={followUpSubmitting || !followUpTitle.trim() || !followUpDue}>
              {followUpSubmitting ? 'Scheduling...' : 'Schedule Follow-up'}
            </button>
            {followUpError && (
              <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {followUpError}
              </div>
            )}
          </form>

          <div className="space-y-2">
            {lead.follow_ups.length === 0 ? (
              <div className="card p-6 text-center text-foreground-muted text-sm">No follow-ups scheduled</div>
            ) : (
              lead.follow_ups
                .sort((a, b) => (a.is_completed === b.is_completed ? 0 : a.is_completed ? 1 : -1))
                .map((fup: LeadFollowUp) => {
                  const overdue = !fup.is_completed && new Date(fup.due_at) < new Date();
                  return (
                    <div
                      key={fup.id}
                      className={`card p-3 flex items-center gap-3 ${fup.is_completed ? 'opacity-50' : ''} ${
                        overdue ? 'border-red-500/30' : ''
                      }`}
                    >
                      <button
                        onClick={() => !fup.is_completed && handleCompleteFollowUp(fup.id)}
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          fup.is_completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-border hover:border-accent-primary'
                        }`}
                        disabled={fup.is_completed}
                      >
                        {fup.is_completed && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${fup.is_completed ? 'line-through' : ''}`}>
                          {fup.title}
                        </p>
                        <span className={`text-xs ${overdue ? 'text-red-400 font-medium' : 'text-foreground-muted'}`}>
                          {overdue ? 'Overdue: ' : 'Due: '}{formatDateTime(fup.due_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Lead Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {[
                ['Name', lead.name],
                ['Phone', lead.phone],
                ['Email', lead.email],
                ['Platform', lead.social_platform],
                ['Handle', lead.social_handle],
                ['Source', lead.source],
                ['Source Detail', lead.source_detail],
                ['Stage', getStageMeta(lead.stage).label],
                ['Stage Changed', formatDateTime(lead.stage_changed_at)],
                ['Created', formatDateTime(lead.created_at)],
                ['Updated', formatDateTime(lead.updated_at)],
                ['Lost Reason', lead.lost_reason],
              ].filter(([, val]) => val).map(([label, val]) => (
                <div key={label as string}>
                  <span className="text-foreground-muted text-xs">{label}</span>
                  <p className="font-medium">{val || '-'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={openEditModal} className="btn-secondary text-sm">Edit Lead</button>
            <button onClick={() => setShowDelete(true)} className="btn-danger text-sm">Delete Lead</button>
          </div>
        </div>
      )}

      {/* Stage Change Modal */}
      {showStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !stageSubmitting && setShowStageModal(false)} />
          <div className="relative bg-background-secondary border border-border rounded-2xl w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold mb-4">Change Stage</h3>
            {stageError && (
              <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {stageError}
              </div>
            )}
            <form onSubmit={handleStageChange} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">New Stage</label>
                <select
                  className="select w-full"
                  value={newStage}
                  onChange={e => setNewStage(e.target.value as LeadStage)}
                >
                  {STAGE_ORDER.map(s => (
                    <option key={s} value={s} disabled={s === lead.stage}>
                      {getStageMeta(s).label} {s === lead.stage ? '(current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Note</label>
                <textarea
                  className="input w-full text-sm"
                  rows={2}
                  placeholder="Why is this changing?"
                  value={stageNote}
                  onChange={e => setStageNote(e.target.value)}
                />
              </div>
              {(newStage === 'lost' || newStage === 'churned') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Reason</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Why did they leave?"
                    value={lostReason}
                    onChange={e => setLostReason(e.target.value)}
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowStageModal(false)} disabled={stageSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={stageSubmitting || newStage === lead.stage}>
                  {stageSubmitting ? 'Saving...' : 'Change Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !editSubmitting && setShowEditModal(false)} />
          <div className="relative bg-background-secondary border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Lead</h3>
            {editError && (
              <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{editError}</div>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" className="input w-full" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input type="tel" className="input w-full" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value || null }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" className="input w-full" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value || null }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Platform</label>
                  <select className="select w-full" value={editForm.social_platform || ''} onChange={e => setEditForm(p => ({ ...p, social_platform: e.target.value || null }))}>
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
                  <input type="text" className="input w-full" value={editForm.social_handle || ''} onChange={e => setEditForm(p => ({ ...p, social_handle: e.target.value || null }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Source</label>
                <select className="select w-full" value={editForm.source_id || ''} onChange={e => setEditForm(p => ({ ...p, source_id: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">None</option>
                  {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Source Detail</label>
                <input type="text" className="input w-full" value={editForm.source_detail || ''} onChange={e => setEditForm(p => ({ ...p, source_detail: e.target.value || null }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea className="input w-full" rows={3} value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value || null }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowEditModal(false)} disabled={editSubmitting}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={editSubmitting}>{editSubmitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {showConvert && (
        <ConvertLeadModal
          lead={lead}
          onClose={() => setShowConvert(false)}
          onConverted={() => { setShowConvert(false); fetchLead(); }}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDelete}
        title="Delete Lead"
        message={`Permanently delete "${lead.name}" and all their activities and follow-ups? This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setShowDelete(false)}
      />
    </div>
  );
}
