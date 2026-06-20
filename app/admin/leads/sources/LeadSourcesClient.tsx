'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Header';
import DataTable, { DataTableColumn } from '../../../components/DataTable';
import MobileDataCard from '../../../components/MobileDataCard';
import LeadsSubNav from '../../../components/LeadsSubNav';
import { api } from '../../../lib/api';
import type { LeadSource } from '../../../lib/types';

const COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', className: 'w-24' },
];

export default function LeadSourcesPage() {
  const { user } = useAuth();
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getLeadSources(false);
      setSources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <p className="text-foreground-muted">Admin Access Required</p>
        </div>
      </div>
    );
  }

  const openCreate = () => {
    setEditingSource(null);
    setFormName('');
    setFormDesc('');
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (source: LeadSource) => {
    setEditingSource(source);
    setFormName(source.name);
    setFormDesc(source.description || '');
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingSource) {
        await api.updateLeadSource(editingSource.id, {
          name: formName.trim(),
          description: formDesc.trim() || undefined,
        });
      } else {
        await api.createLeadSource({
          name: formName.trim(),
          description: formDesc.trim() || undefined,
        });
      }
      setShowForm(false);
      fetchSources();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (source: LeadSource) => {
    try {
      if (source.is_active) {
        await api.deleteLeadSource(source.id);
      } else {
        await api.updateLeadSource(source.id, { is_active: true });
      }
      fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update source');
    }
  };

  const renderCell = (item: LeadSource, key: string) => {
    switch (key) {
      case 'name':
        return <span className="font-medium">{item.name}</span>;
      case 'description':
        return <span className="text-foreground-muted text-sm">{item.description || '-'}</span>;
      case 'status':
        return (
          <span className={`badge ${item.is_active ? 'badge-success' : 'badge-neutral'}`}>
            {item.is_active ? 'Active' : 'Inactive'}
          </span>
        );
      case 'actions':
        return (
          <div className="flex gap-2">
            <button onClick={() => openEdit(item)} className="text-xs text-accent-primary hover:underline">
              Edit
            </button>
            <button
              onClick={() => handleToggle(item)}
              className={`text-xs ${item.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
            >
              {item.is_active ? 'Disable' : 'Enable'}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <Header
        title="Lead Sources"
        subtitle="Manage where your leads come from"
        action={
          <button onClick={openCreate} className="btn-primary text-sm">
            + Add Source
          </button>
        }
      />

      <LeadsSubNav />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-background-tertiary rounded w-1/3 mb-2" />
              <div className="h-3 bg-background-tertiary rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card p-6 text-center">
          <p className="text-red-400 mb-3">{error}</p>
          <button onClick={fetchSources} className="btn-primary text-sm">Retry</button>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable
              columns={COLUMNS}
              data={sources}
              rowKey={item => item.id}
              renderCell={renderCell}
              emptyState={{ message: 'No lead sources found' }}
            />
          </div>

          <div className="md:hidden space-y-2">
            {sources.length === 0 ? (
              <div className="card p-6 text-center text-foreground-muted">No lead sources found</div>
            ) : (
              sources.map(source => (
                <MobileDataCard
                  key={source.id}
                  id={source.id}
                  title={source.name}
                  subtitle={source.description || undefined}
                  status={{
                    label: source.is_active ? 'Active' : 'Inactive',
                    variant: source.is_active ? 'success' : 'neutral',
                  }}
                  onClick={() => openEdit(source)}
                />
              ))
            )}
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setShowForm(false)} />
          <div className="relative bg-background-secondary border border-border rounded-2xl w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold mb-4">
              {editingSource ? 'Edit Source' : 'Add Source'}
            </h3>
            {formError && (
              <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  className="input w-full"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  className="input w-full"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting || !formName.trim()}>
                  {submitting ? 'Saving...' : editingSource ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
