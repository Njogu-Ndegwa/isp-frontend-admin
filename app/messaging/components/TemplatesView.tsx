'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { SmsTemplate } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import { PageLoader } from '../../components/LoadingSpinner';

// ─── TemplatesView ────────────────────────────────────────────────────────────
export function TemplatesView() {
  const { showAlert } = useAlert();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newBody, setNewBody] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSmsTemplates();
      setTemplates(res.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim() || !newBody.trim()) return;
    setCreating(true);
    try {
      await api.createSmsTemplate(newName.trim(), newBody.trim());
      showAlert('success', 'Template created');
      setNewName('');
      setNewBody('');
      load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.deleteSmsTemplate(id);
      showAlert('success', 'Template deleted');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="card p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">New template</p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div>
          <label className="block text-xs text-foreground-muted mb-1">Template name</label>
          <input
            className="input text-sm"
            placeholder="e.g. Monthly reminder"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-foreground-muted mb-1">Message body</label>
          <textarea
            className="input text-sm min-h-[80px] resize-y"
            placeholder="Type the template text…"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !newName.trim() || !newBody.trim()}
          className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
        >
          {creating ? 'Saving…' : 'Save template'}
        </button>
      </div>

      {/* List */}
      {templates.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-foreground-muted">No templates yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="card p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-sm text-foreground-muted mt-1 line-clamp-3">{t.body}</p>
              </div>
              {confirmDeleteId === t.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-foreground-muted">Delete?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="text-xs btn-danger px-2 py-1 disabled:opacity-50"
                  >
                    {deletingId === t.id ? '…' : 'Yes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs btn-ghost px-2 py-1"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(t.id)}
                  className="btn-ghost p-1.5 text-foreground-muted hover:text-danger transition-colors shrink-0"
                  title="Delete template"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TemplatesView;
