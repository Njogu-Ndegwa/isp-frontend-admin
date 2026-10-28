'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { formatDateGMT3 } from '../../lib/dateUtils';
import { activityResult } from '../../lib/staffEditor';
import type { StaffActivityItem, StaffMember } from '../../lib/types';
import DataTable, { DataTableColumn } from '../../components/DataTable';
import MobileDataCard from '../../components/MobileDataCard';
import FilterSelect from '../../components/FilterSelect';

const PAGE_SIZE = 50;

const formatSafeDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (e) {
    console.error('Date error:', e);
    return '-';
  }
};

const RESULT_VARIANT = {
  success: 'success',
  denied: 'danger',
  failed: 'warning',
  unknown: 'neutral',
} as const;

/** Who did what, from GET /api/staff/activity, filterable by staff member. */
export default function StaffActivity({ staff }: { staff: StaffMember[] }) {
  const t = useT();
  const [staffId, setStaffId] = useState('');
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<StaffActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStaffActivity({
        staffId: staffId ? Number(staffId) : undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(typeof data?.total === 'number' ? data.total : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to load activity'));
    } finally {
      setLoading(false);
    }
  }, [staffId, offset, t]);

  useEffect(() => { void load(); }, [load]);

  const resultLabel = (code: number | null) => {
    const result = activityResult(code);
    if (result === 'success') return t('Done');
    if (result === 'denied') return t('Not allowed');
    if (result === 'failed') return t('Failed');
    return '-';
  };

  const who = (item: StaffActivityItem) =>
    item.actor_label || (item.actor_type === 'owner' ? t('Owner') : t('Staff'));

  const what = (item: StaffActivityItem) =>
    item.summary || item.action || [item.method, item.path].filter(Boolean).join(' ') || '-';

  const columns: DataTableColumn[] = [
    { key: 'when', label: t('When'), className: 'whitespace-nowrap' },
    { key: 'who', label: t('Who') },
    { key: 'what', label: t('What'), className: 'max-w-[420px]' },
    { key: 'result', label: t('Result') },
  ];

  const staffOptions = [
    { value: '', label: t('Everyone') },
    ...staff.map((s) => ({ value: String(s.id), label: s.name || s.email })),
  ];

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterSelect
          value={staffId}
          onChange={(v) => { setStaffId(v); setOffset(0); }}
          options={staffOptions}
        />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="text-xs font-medium text-accent-primary hover:underline disabled:opacity-50"
        >
          {t('Refresh')}
        </button>
      </div>

      {error ? (
        <div className="card p-4 text-sm text-danger">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="text-xs text-accent-primary hover:underline ml-1">
            {t('Retry')}
          </button>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            loading={loading}
            loadingRows={5}
            rowKey={(item) => item.id}
            emptyState={{ message: t('No activity yet.') }}
            renderCell={(item, key) => {
              if (key === 'when') return <span className="text-sm text-foreground-muted">{formatSafeDate(item.created_at)}</span>;
              if (key === 'who') return <span className="text-sm text-foreground">{who(item)}</span>;
              if (key === 'what') return <span className="text-sm text-foreground line-clamp-2">{what(item)}</span>;
              if (key === 'result') {
                return (
                  <span className={`badge badge-${RESULT_VARIANT[activityResult(item.status_code)]} text-[11px]`}>
                    {resultLabel(item.status_code)}
                  </span>
                );
              }
              return null;
            }}
          />

          <div className="md:hidden space-y-2">
            {loading && items.length === 0 ? (
              <div className="card p-4"><div className="h-16 rounded-xl bg-background-tertiary/60 animate-pulse" /></div>
            ) : items.length === 0 ? (
              <div className="card p-6 text-center text-sm text-foreground-muted">{t('No activity yet.')}</div>
            ) : (
              items.map((item) => (
                <MobileDataCard
                  key={item.id}
                  id={item.id}
                  title={what(item)}
                  subtitle={who(item)}
                  status={{ label: resultLabel(item.status_code), variant: RESULT_VARIANT[activityResult(item.status_code)] }}
                  fields={[{ label: t('When'), value: formatSafeDate(item.created_at) }]}
                />
              ))
            )}
          </div>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-foreground-muted">
                {t('{from}-{to} of {total}', { from, to, total })}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading || offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground-muted hover:text-foreground hover:bg-background-tertiary disabled:opacity-40 touch-manipulation"
                >
                  {t('Previous')}
                </button>
                <button
                  type="button"
                  disabled={loading || offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground-muted hover:text-foreground hover:bg-background-tertiary disabled:opacity-40 touch-manipulation"
                >
                  {t('Next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
