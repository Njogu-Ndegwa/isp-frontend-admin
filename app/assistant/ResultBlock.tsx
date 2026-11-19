'use client';

import { useState } from 'react';
import { formatValue, humanizeKey, viewFor } from '../lib/assistantView';
import { useT } from '../lib/i18n';
import { CodeBox } from './Markdown';

const PAGE = 25;

export default function ResultBlock({ title, payload, show = 'auto', compact = false }: {
  title: string;
  payload: unknown;
  show?: string;
  compact?: boolean;
}) {
  const t = useT();
  const view = viewFor(payload, show);
  const [open, setOpen] = useState(!compact);
  const [limit, setLimit] = useState(PAGE);

  if (view.kind === 'empty') return null;

  const count = view.kind === 'table' ? (view.total ?? view.rows.length) : null;
  return (
    <div className="rounded-xl border border-border bg-background-secondary overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left min-h-[40px] hover:bg-background-tertiary/60"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-foreground truncate">{title}</span>
        <span className="flex items-center gap-2 flex-shrink-0 text-[11px] text-foreground-muted">
          {count !== null && <span>{t('{n} rows', { n: count.toLocaleString() })}</span>}
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </span>
      </button>
      {open && (
        <div className="border-t border-border">
          {view.kind === 'text' && (
            <p className="px-3 py-2 text-sm text-foreground whitespace-pre-wrap break-words">{view.text}</p>
          )}

          {view.kind === 'record' && (
            <div className="p-3 space-y-3">
              {view.commands.map(([k, v]) => <CodeBox key={k} code={v} label={humanizeKey(k)} />)}
              {view.fields.length > 0 && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  {view.fields.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 min-w-0 border-b border-border/60 pb-1">
                      <dt className="text-[11px] text-foreground-muted flex-shrink-0">{humanizeKey(k)}</dt>
                      <dd className="text-xs text-foreground text-right truncate" title={formatValue(v)}>{formatValue(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          {view.kind === 'table' && (
            <>
              {view.rows.length === 0 ? (
                <p className="px-3 py-3 text-sm text-foreground-muted">{t('Nothing found.')}</p>
              ) : (
                <>
                  {/* Wide screens: a table that scrolls inside its own box */}
                  <div className="hidden sm:block overflow-x-auto max-h-[28rem]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-background-tertiary">
                        <tr>
                          {view.columns.map((c) => (
                            <th key={c} className="text-left font-semibold text-foreground-muted px-3 py-2 whitespace-nowrap">{humanizeKey(c)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {view.rows.slice(0, limit).map((row, i) => (
                          <tr key={i} className="border-t border-border/60 hover:bg-background-tertiary/50">
                            {view.columns.map((c) => (
                              <td key={c} className="px-3 py-1.5 text-foreground whitespace-nowrap max-w-[16rem] truncate" title={formatValue(row[c])}>
                                {formatValue(row[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Phones: one card per row */}
                  <ul className="sm:hidden divide-y divide-border/60">
                    {view.rows.slice(0, limit).map((row, i) => (
                      <li key={i} className="px-3 py-2">
                        <p className="text-sm font-medium text-foreground truncate">{formatValue(row[view.columns[0]])}</p>
                        <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                          {view.columns.slice(1).map((c) => (
                            <div key={c} className="min-w-0">
                              <dt className="text-[10px] text-foreground-muted">{humanizeKey(c)}</dt>
                              <dd className="text-xs text-foreground truncate">{formatValue(row[c])}</dd>
                            </div>
                          ))}
                        </dl>
                      </li>
                    ))}
                  </ul>
                  {view.rows.length > limit && (
                    <button type="button" onClick={() => setLimit((l) => l + PAGE * 2)}
                      className="w-full text-xs font-semibold text-accent-primary py-2 border-t border-border min-h-[40px]">
                      {t('Show more ({n} left)', { n: view.rows.length - limit })}
                    </button>
                  )}
                </>
              )}
              {view.meta.length > 0 && (
                <div className="px-3 py-2 border-t border-border flex flex-wrap gap-x-4 gap-y-1">
                  {view.meta.map(([k, v]) => (
                    <span key={k} className="text-[11px] text-foreground-muted">{humanizeKey(k)}: <span className="text-foreground">{formatValue(v)}</span></span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
