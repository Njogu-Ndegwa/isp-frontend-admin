'use client';

import { ReactNode, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import FilterPills from '../../components/FilterPills';
import { SupportMetrics, formatMinutes, num } from '../../lib/supportMetrics';
import {
  AUTOMATION_PERIODS,
  OVERVIEW_RANGES,
  Observation,
  SupportAutomation,
  OverviewDay,
  OverviewRange,
  Trend,
  agentShare,
  agentStartDay,
  agentStartLabel,
  automationRows,
  cappedResponse,
  correctionGroups,
  hourLabel,
  lastDays,
  observationLabel,
  perTenReplies,
  pctText,
  pointsChange,
  scoreChange,
  shortDay,
  sumBy,
  trackedDays,
  trend,
} from '../../lib/supportOverview';

// Chart colours: a validated categorical set (adjacent-pair CVD and contrast
// checked against the card surface in both themes). Agent and Dennis keep the
// same hue on every chart; single-measure charts use violet.
const VIZ_CSS = `
.sd-viz {
  --sd-agent: #2a78d6; --sd-dennis: #eb6834; --sd-aqua: #1baf7a; --sd-yellow: #eda100; --sd-violet: #6250d6;
  --sd-grid: #ebe9e4; --sd-axis: #d6d3cc; --sd-surface: var(--background-secondary);
}
.dark .sd-viz {
  --sd-agent: #3987e5; --sd-dennis: #d95926; --sd-aqua: #199e70; --sd-yellow: #c98500; --sd-violet: #9085e9;
  --sd-grid: #2c2c2a; --sd-axis: #3f3f46;
}
/* The app styles every table globally (big padding, uppercase headers); these two tables are dense. */
.sd-viz .sd-table thead { background: transparent; }
.sd-viz .sd-table th, .sd-viz .sd-table td {
  padding: 6px 12px 6px 0; font-size: 12px; text-transform: none; letter-spacing: 0; font-weight: inherit;
}
.sd-viz .sd-table th { font-weight: 500; }
.sd-viz .sd-table td:last-child, .sd-viz .sd-table th:last-child { padding-right: 0; }
`;

const C = {
  agent: 'var(--sd-agent)',
  dennis: 'var(--sd-dennis)',
  aqua: 'var(--sd-aqua)',
  yellow: 'var(--sd-yellow)',
  violet: 'var(--sd-violet)',
};
const RESPONSE_CAP = 60;
const BAR_MAX = 18;
const axisTick = { fontSize: 10, fill: 'var(--color-foreground-muted)' };
const xAxisProps = {
  dataKey: 'date',
  tickFormatter: (v: string) => shortDay(v),
  tick: axisTick,
  axisLine: { stroke: 'var(--sd-axis)' },
  tickLine: false,
  minTickGap: 18,
} as const;
const yAxisProps = { tick: axisTick, axisLine: false, tickLine: false, allowDecimals: false, width: 30 } as const;
const segment = { stroke: 'var(--sd-surface)', strokeWidth: 2 } as const;
const TOP = [4, 4, 0, 0] as [number, number, number, number];

type ChartDay = OverviewDay & { stepped?: number; asked?: number; rules?: number; plot?: number | null; over?: boolean };
type TipRow = { color?: string; value: string; label: string };

// ---------------------------------------------------------------- pieces

function DayTooltip({ active, payload, label, rows }: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartDay }>;
  label?: string | number;
  rows: (d: ChartDay) => TipRow[];
}) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  return (
    <div className="rounded-xl border border-border bg-background-secondary px-3 py-2 shadow-md text-xs min-w-[150px]">
      <p className="text-[10px] text-foreground-muted mb-1">{shortDay(String(label ?? d.date))}</p>
      {rows(d).map((r) => (
        <p key={r.label} className="flex items-center gap-2 py-0.5">
          {r.color && <span className="inline-block w-3 h-0.5 rounded-full flex-shrink-0" style={{ background: r.color }} aria-hidden />}
          <span className="font-semibold text-foreground tabular-nums">{r.value}</span>
          <span className="text-foreground-muted">{r.label}</span>
        </p>
      ))}
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string; line?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-foreground-muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span
            className={i.line ? 'inline-block w-3 h-0.5 rounded-full' : 'inline-block w-2.5 h-2.5 rounded-[3px]'}
            style={{ background: i.color }}
            aria-hidden
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, aside, footnote, children, className = '' }: {
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
  footnote?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-background-secondary p-4 min-w-0 space-y-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-foreground-muted mt-0.5">{subtitle}</p>}
        </div>
        {aside && <div className="flex-shrink-0 text-right max-w-[50%]">{aside}</div>}
      </div>
      {children}
      {footnote && <p className="text-[11px] leading-relaxed text-foreground-muted">{footnote}</p>}
    </section>
  );
}

function TrendText({ t, text }: { t: Trend; text?: string }) {
  const arrow = t.direction === 'up' ? '▲' : t.direction === 'down' ? '▼' : '→';
  const tone = t.good === true ? 'text-success' : t.good === false ? 'text-danger' : 'text-foreground-muted';
  return (
    <span className={`text-xs font-medium ${tone}`}>
      <span aria-hidden>{arrow} </span>{text ?? t.label}
    </span>
  );
}

function Sparkline({ values }: { values: (number | null | undefined)[] }) {
  const pts = values.map((v, i) => ({ i, v: typeof v === 'number' ? v : null })).filter((p) => p.v !== null) as { i: number; v: number }[];
  if (pts.length < 2) return null;
  const w = 72;
  const h = 24;
  const max = Math.max(...pts.map((p) => p.v), 1);
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * (w - 4) + 2;
  const y = (v: number) => h - 3 - (v / max) * (h - 6);
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="block">
      <polyline
        points={pts.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')}
        fill="none"
        stroke="var(--color-foreground-muted)"
        strokeOpacity={0.55}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(last.i)} cy={y(last.v)} r={3} fill={C.violet} stroke="var(--sd-surface)" strokeWidth={1.5} />
    </svg>
  );
}

function StatTile({ label, value, delta, sub, spark }: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  sub?: ReactNode;
  spark?: (number | null | undefined)[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-background-secondary p-3 min-w-0 flex flex-col gap-1">
      <p className="text-xs text-foreground-muted">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold leading-tight text-foreground whitespace-nowrap">{value}</p>
        {spark && <span className="hidden min-[400px]:block"><Sparkline values={spark} /></span>}
      </div>
      {delta && <div>{delta}</div>}
      {sub && <p className="text-[11px] text-foreground-muted break-words">{sub}</p>}
    </div>
  );
}

function AgentMarker({ day }: { day: string | null }) {
  if (!day) return null;
  return (
    <ReferenceLine
      x={day}
      stroke="var(--color-foreground-muted)"
      strokeOpacity={0.7}
      label={{ value: 'Agent live', position: 'insideTopLeft', fontSize: 10, fill: 'var(--color-foreground-muted)' }}
    />
  );
}

function ObservationIcon({ kind }: { kind?: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (kind === 'warn') {
    return <svg {...common} className="text-amber-500 flex-shrink-0"><path d="M12 3 2 21h20L12 3z" /><path d="M12 10v5M12 18h.01" /></svg>;
  }
  if (kind === 'good') {
    return <svg {...common} className="text-success flex-shrink-0"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>;
  }
  return <svg {...common} className="text-foreground-muted flex-shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
}

const TAB_LABELS: Record<string, string> = { dennis: 'Waiting on Dennis', customers: 'Customers', worklog: 'Work log', metrics: 'Details' };

function ImprovePanel({ items, onNavigate }: { items: Observation[]; onNavigate: (tab: string) => void }) {
  return (
    <section className="rounded-2xl border border-border bg-background-secondary p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">What to improve</h3>
        <p className="text-xs text-foreground-muted">Worked out from the numbers on this page each time the laptop rebuilds it.</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-foreground-muted">Nothing stands out yet.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((o, i) => (
            <li key={i} className="py-3 first:pt-0 last:pb-0 flex gap-3">
              <ObservationIcon kind={o.kind} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  <span className="sr-only">{observationLabel(o.kind)}: </span>{o.title}
                </p>
                {o.detail && <p className="text-xs text-foreground-muted mt-0.5 break-words">{o.detail}</p>}
                {o.tab && TAB_LABELS[o.tab] && (
                  <button type="button" onClick={() => onNavigate(o.tab as string)} className="text-xs text-accent-primary mt-1">
                    Open {TAB_LABELS[o.tab]}
                  </button>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-wide text-foreground-muted flex-shrink-0 mt-0.5">{observationLabel(o.kind)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BarList({ items, color, empty }: { items: { label: string; value: number }[]; color: string; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-foreground-muted">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2 text-xs">
          <span className="text-foreground truncate">{i.label}</span>
          <span className="h-2 rounded-r-[4px] bg-background-tertiary overflow-hidden">
            <span className="block h-full rounded-r-[4px]" style={{ width: `${Math.max(4, (i.value / max) * 100)}%`, background: color }} />
          </span>
          <span className="tabular-nums text-foreground-muted">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}

function AutomationHero({ auto, startLabel }: { auto?: SupportAutomation; startLabel: string }) {
  if (!auto || auto.error || !auto.periods) {
    return auto?.error ? <p className="text-xs text-foreground-muted">{auto.error}</p> : null;
  }
  const today = auto.periods.today;
  const change = scoreChange(auto.days);
  const days = (auto.days ?? []).map((d) => ({ ...d, date: d.date ?? '' }));
  const since = auto.periods.since;
  return (
    <section className="rounded-2xl border border-border bg-background-secondary p-4 space-y-4" data-testid="sd-automation">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Automation</h2>
          <p className="text-xs text-foreground-muted">How much of the support work runs without Dennis</p>
          <div className="flex items-end gap-3 mt-2">
            <p className="text-5xl font-semibold leading-none text-foreground">{pctText(today?.score)}</p>
            <div className="pb-1">
              <p className="text-xs text-foreground-muted">automation score today</p>
              {change != null && (
                <TrendText
                  t={{ direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat', pct: change, good: change === 0 ? null : change > 0, label: '' }}
                  text={`${change > 0 ? '+' : ''}${change} pts vs the day before`}
                />
              )}
            </div>
          </div>
        </div>
        {days.length > 1 && (
          <div className="w-full sm:w-[55%] min-w-0" data-testid="sd-chart-automation">
            <p className="text-xs text-foreground-muted mb-1">Score per day since {startLabel || 'the agent started'}</p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={days} margin={{ top: 10, right: 8, left: -6, bottom: 0 }}>
                <CartesianGrid stroke="var(--sd-grid)" vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} width={40} domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  cursor={{ stroke: 'var(--color-foreground-muted)', strokeOpacity: 0.4 }}
                  content={({ active, payload }) => {
                    const d = payload?.[0]?.payload as (typeof days)[number] | undefined;
                    if (!active || !d) return null;
                    return (
                      <div className="rounded-xl border border-border bg-background-secondary px-3 py-2 shadow-md text-xs min-w-[170px]">
                        <p className="text-[10px] text-foreground-muted mb-1">{shortDay(d.date)}</p>
                        <p className="flex items-center gap-2 py-0.5">
                          <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: C.violet }} aria-hidden />
                          <span className="font-semibold text-foreground">{pctText(d.score)}</span>
                          <span className="text-foreground-muted">score</span>
                        </p>
                        {automationRows(d).map((r) => (
                          <p key={r.key} className="py-0.5">
                            <span className="font-semibold text-foreground">{pctText(r.pct)}</span>
                            <span className="text-foreground-muted"> {r.unit} ({r.part}/{r.whole})</span>
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Line type="linear" dataKey="score" stroke={C.violet} strokeWidth={2} connectNulls
                  dot={{ r: 4, fill: C.violet, stroke: 'var(--sd-surface)', strokeWidth: 2 }}
                  activeDot={{ r: 5, stroke: 'var(--sd-surface)', strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="sd-table w-full lg:max-w-2xl text-xs">
          <thead>
            <tr className="text-left text-foreground-muted border-b border-border">
              <th className="py-2 pr-3 font-medium">Share</th>
              {AUTOMATION_PERIODS.map((p) => (
                <th key={p} className="py-2 pr-3 font-medium text-right whitespace-nowrap">{auto.periods?.[p]?.label ?? p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {automationRows(today).map((row) => (
              <tr key={row.key} className="border-b border-border/50">
                <td className="text-foreground">{row.label}</td>
                {AUTOMATION_PERIODS.map((p) => {
                  const r = automationRows(auto.periods?.[p]).find((x) => x.key === row.key)!;
                  return (
                    <td key={p} className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">
                      <span className="font-semibold text-foreground">{pctText(r.pct)}</span>
                      <span className="block text-[10px] text-foreground-muted">{r.part} of {r.whole}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="py-2 pr-3 font-medium text-foreground">Automation score</td>
              {AUTOMATION_PERIODS.map((p) => (
                <td key={p} className="py-2 pr-3 text-right tabular-nums font-semibold text-foreground">{pctText(auto.periods?.[p]?.score)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="space-y-1 text-[11px] leading-relaxed text-foreground-muted">
        {since?.prs_total != null && (
          <p className="text-xs text-foreground">
            PRs merged ({since.label ?? 'since the agent started'}): {since.prs_agent ?? 0} of {since.prs_total} made by agents.
          </p>
        )}
        <details>
          <summary className="cursor-pointer select-none text-xs text-accent-primary">How the score is worked out</summary>
          <div className="space-y-1 mt-1">
            {auto.definition && <p>{auto.definition}</p>}
            {auto.prs_note && <p>{auto.prs_note}</p>}
          </div>
        </details>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- tab

export default function OverviewTab({ metrics, onNavigate }: { metrics?: SupportMetrics; onNavigate: (tab: string) => void }) {
  const [range, setRange] = useState<OverviewRange>(14);
  const ov = metrics?.overview;

  const days = useMemo(() => lastDays(ov?.days, range), [ov, range]);
  const tracked = useMemo<ChartDay[]>(
    () => trackedDays(days, ov?.tracked_from).map((d) => {
      const g = correctionGroups(d);
      return { ...d, stepped: g.stepped, asked: g.asked, rules: g.rules };
    }),
    [days, ov],
  );
  const response = useMemo<ChartDay[]>(
    () => cappedResponse(days, RESPONSE_CAP).map((r, i) => ({ ...days[i], plot: r.plot, over: r.over })),
    [days],
  );

  if (!ov || ov.error || !(ov.days?.length)) {
    return (
      <div className="card p-6 text-center text-sm text-foreground-muted">
        {ov?.error || metrics?.error || 'No overview in this snapshot yet. It appears after the laptop pushes its next update.'}
      </div>
    );
  }

  const start = agentStartDay(ov, days);
  const startLabel = agentStartLabel(ov.agent_start);
  const cur = ov.weeks?.current ?? {};
  const prev = ov.weeks?.previous ?? {};
  const today = ov.weeks?.today ?? {};
  const spark = lastDays(ov.days, 14);
  const defs = ov.definitions ?? {};

  // Corrections: last 7 tracked days (fewer while the agent is new).
  const allTracked = trackedDays(ov.days ?? [], ov.tracked_from);
  const last7 = allTracked.slice(-7);
  const corrections7 = sumBy(last7, (d) => d.corrections);
  const agent7 = sumBy(last7, (d) => d.replies_agent);
  const rate = perTenReplies(corrections7, agent7);
  const correctionsLabel = last7.length < 7 ? `Dennis corrections since ${shortDay(last7[0]?.date)}` : 'Dennis corrections, 7 days';
  const correctionTrend = cur.corrections != null && prev.corrections != null ? trend(cur.corrections, prev.corrections, false) : null;

  const shareNow = cur.agent_share;
  const sharePts = pointsChange(cur.agent_share, prev.agent_share);
  const customersTrend = trend(cur.customers_per_day, prev.customers_per_day, true);
  const responseTrend = trend(cur.median_first_response_min, prev.median_first_response_min, false);
  const rangeShare = agentShare(days);

  const shippedTracked = tracked.reduce((n, d) => n + (d.bugs ?? 0) + (d.features ?? 0) + (d.tasks ?? 0), 0);
  const waiting = metrics?.current?.dennis_waiting ?? 0;
  const oldest = metrics?.current?.dennis_oldest_min;
  const weekCaption = cur.start && cur.end ? `${shortDay(cur.start)}–${shortDay(cur.end)}` : 'last 7 full days';
  const tableDays = [...days].reverse();

  return (
    <div className="sd-viz space-y-4">
      <style>{VIZ_CSS}</style>

      <AutomationHero auto={metrics?.automation} startLabel={startLabel} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FilterPills<string>
          value={String(range)}
          onChange={(v) => setRange(Number(v) as OverviewRange)}
          ariaLabel="Days shown"
          options={OVERVIEW_RANGES.map((r) => ({ value: String(r), label: `Last ${r} days` }))}
        />
        {startLabel && <p className="text-xs text-foreground-muted">Agent live since {startLabel}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Customers per day"
          value={num(cur.customers_per_day ?? undefined)}
          delta={<TrendText t={customersTrend} />}
          sub={`Today so far ${num(today.customers_per_day ?? undefined)} · ${num(cur.unique_customers)} different customers in 7 days`}
          spark={spark.map((d) => d.customers)}
        />
        <StatTile
          label="Agent share of replies"
          value={shareNow == null ? '-' : `${shareNow}%`}
          delta={sharePts == null ? undefined : (
            <TrendText
              t={{ direction: sharePts > 0 ? 'up' : sharePts < 0 ? 'down' : 'flat', pct: sharePts, good: sharePts === 0 ? null : sharePts > 0, label: '' }}
              text={`${sharePts > 0 ? '+' : ''}${sharePts} pts vs last week`}
            />
          )}
          sub={`Today ${today.agent_share == null ? '-' : `${today.agent_share}%`} · ${num(cur.replies_agent)} agent, ${num(cur.replies_dennis)} Dennis in 7 days`}
          spark={spark.map((d) => {
            const t = (d.replies_agent ?? 0) + (d.replies_dennis ?? 0);
            return t ? Math.round(((d.replies_agent ?? 0) / t) * 100) : null;
          })}
        />
        <StatTile
          label="Median first response"
          value={formatMinutes(cur.median_first_response_min)}
          delta={<TrendText t={responseTrend} />}
          sub={`Today ${formatMinutes(today.median_first_response_min)} · ${num(cur.misses)} misses in 7 days`}
          spark={spark.map((d) => (d.median_first_response_min == null ? null : Math.min(d.median_first_response_min, RESPONSE_CAP)))}
        />
        <StatTile
          label={correctionsLabel}
          value={corrections7}
          delta={correctionTrend ? <TrendText t={correctionTrend} /> : undefined}
          sub={`${rate == null ? '-' : rate} per 10 agent replies · today ${num(today.corrections ?? undefined)}${correctionTrend ? '' : ' · week-on-week once two full weeks exist'}`}
          spark={allTracked.slice(-14).map((d) => d.corrections)}
        />
      </div>
      <p className="text-[11px] text-foreground-muted -mt-2">
        Tiles compare the last 7 full days ({weekCaption}) with the 7 days before. Today is shown separately because it is not over yet.
      </p>

      <ImprovePanel items={ov.improve ?? []} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Conversations per day"
          subtitle="Business and lead chats"
          aside={<TrendText t={customersTrend} text={customersTrend.pct == null ? 'no trend yet' : `${customersTrend.direction === 'flat' ? 'flat' : `${customersTrend.direction} ${Math.abs(customersTrend.pct)}%`} week on week`} />}
          footnote={defs.conversations}
        >
          {([
            { key: 'customers', label: 'Customers talked to' },
            { key: 'inbound', label: 'Messages in' },
          ] as const).map((m) => (
            <div key={m.key} data-testid={`sd-chart-${m.key}`}>
              <p className="text-xs text-foreground-muted mb-1">{m.label}</p>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={days} margin={{ top: 12, right: 6, left: -6, bottom: 0 }}>
                  <CartesianGrid stroke="var(--sd-grid)" vertical={false} />
                  <XAxis {...xAxisProps} />
                  <YAxis {...yAxisProps} />
                  <Tooltip
                    cursor={{ stroke: 'var(--color-foreground-muted)', strokeOpacity: 0.4 }}
                    content={<DayTooltip rows={(d) => [
                      { color: m.key === 'customers' ? C.violet : undefined, value: num(d.customers), label: 'customers' },
                      { color: m.key === 'inbound' ? C.violet : undefined, value: num(d.inbound), label: 'messages in' },
                    ]} />}
                  />
                  <AgentMarker day={start} />
                  <Area type="linear" dataKey={m.key} stroke={C.violet} strokeWidth={2} fill={C.violet} fillOpacity={0.1}
                    dot={false} activeDot={{ r: 4, stroke: 'var(--sd-surface)', strokeWidth: 2 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ))}
        </ChartCard>

        <ChartCard
          title="Who replied"
          subtitle="Replies per day, agent and Dennis"
          aside={rangeShare == null ? undefined : (
            <p className="text-xs text-foreground-muted"><span className="text-base font-semibold text-foreground">{rangeShare}%</span> agent, {range} days</p>
          )}
          footnote="Before the agent went live every reply was Dennis's. The agent's share shows how much of the load it has taken over."
        >
          <Legend items={[{ color: C.agent, label: 'Agent' }, { color: C.dennis, label: 'Dennis' }]} />
          <div data-testid="sd-chart-replies">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={days} margin={{ top: 12, right: 6, left: -6, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid stroke="var(--sd-grid)" vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip
                  cursor={{ fill: 'var(--color-background-tertiary)', opacity: 0.6 }}
                  content={<DayTooltip rows={(d) => {
                    const total = (d.replies_agent ?? 0) + (d.replies_dennis ?? 0);
                    return [
                      { color: C.agent, value: num(d.replies_agent), label: 'agent' },
                      { color: C.dennis, value: num(d.replies_dennis), label: 'Dennis' },
                      { value: total ? `${Math.round(((d.replies_agent ?? 0) / total) * 100)}%` : '-', label: 'agent share' },
                    ];
                  }} />}
                />
                <AgentMarker day={start} />
                <Bar dataKey="replies_agent" name="Agent" stackId="r" fill={C.agent} maxBarSize={BAR_MAX} {...segment} isAnimationActive={false} />
                <Bar dataKey="replies_dennis" name="Dennis" stackId="r" fill={C.dennis} maxBarSize={BAR_MAX} radius={TOP} {...segment} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Response time"
          subtitle="How fast customers got a first answer"
          aside={<TrendText t={responseTrend} text={responseTrend.pct == null ? 'no trend yet' : `${responseTrend.direction === 'flat' ? 'flat' : responseTrend.direction === 'down' ? 'faster' : 'slower'} week on week`} />}
          footnote={`${defs.response ?? ''} The time chart stops at ${RESPONSE_CAP} min so one slow day does not hide the rest; hover a day or see the table for the real value.`}
        >
          <div data-testid="sd-chart-response">
            <p className="text-xs text-foreground-muted mb-1">Median first response (min)</p>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={response} margin={{ top: 12, right: 6, left: -6, bottom: 0 }}>
                <CartesianGrid stroke="var(--sd-grid)" vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} domain={[0, RESPONSE_CAP]} allowDataOverflow />
                <Tooltip
                  cursor={{ stroke: 'var(--color-foreground-muted)', strokeOpacity: 0.4 }}
                  content={<DayTooltip rows={(d) => [
                    { color: C.violet, value: formatMinutes(d.median_first_response_min), label: 'median first response' },
                    { value: `${num(d.answered)} of ${num(d.needed)}`, label: 'answered' },
                  ]} />}
                />
                <AgentMarker day={start} />
                <Line type="linear" dataKey="plot" stroke={C.violet} strokeWidth={2} connectNulls
                  dot={(p: { cx?: number; cy?: number; payload?: ChartDay; index?: number }) => (
                    p.payload?.over && p.cx != null && p.cy != null
                      ? <circle key={`o-${p.index}`} cx={p.cx} cy={p.cy} r={4} fill={C.violet} stroke="var(--sd-surface)" strokeWidth={2} />
                      : <g key={`n-${p.index}`} />
                  )}
                  activeDot={{ r: 4, stroke: 'var(--sd-surface)', strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div data-testid="sd-chart-misses">
            <p className="text-xs text-foreground-muted mb-1">Misses per day (waits over 60 min)</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={days} margin={{ top: 12, right: 6, left: -6, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid stroke="var(--sd-grid)" vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip
                  cursor={{ fill: 'var(--color-background-tertiary)', opacity: 0.6 }}
                  content={<DayTooltip rows={(d) => [{ color: C.violet, value: num(d.misses), label: 'misses' }]} />}
                />
                <AgentMarker day={start} />
                <Bar dataKey="misses" fill={C.violet} maxBarSize={BAR_MAX} radius={TOP} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {(ov.misses_by_hour?.length ?? 0) > 0 && (
            <div data-testid="sd-chart-miss-hours">
              <p className="text-xs text-foreground-muted mb-1">When misses start, since the agent went live</p>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={ov.misses_by_hour} margin={{ top: 8, right: 6, left: -6, bottom: 0 }} barCategoryGap="18%">
                  <CartesianGrid stroke="var(--sd-grid)" vertical={false} />
                  <XAxis dataKey="hour" tickFormatter={(h: number) => hourLabel(h)} tick={axisTick} axisLine={{ stroke: 'var(--sd-axis)' }} tickLine={false} minTickGap={12} />
                  <YAxis {...yAxisProps} />
                  <Tooltip
                    cursor={{ fill: 'var(--color-background-tertiary)', opacity: 0.6 }}
                    content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as { hour: number; misses: number } | undefined;
                      if (!active || !p) return null;
                      return (
                        <div className="rounded-xl border border-border bg-background-secondary px-3 py-2 shadow-md text-xs">
                          <span className="font-semibold text-foreground">{p.misses}</span>
                          <span className="text-foreground-muted"> misses starting {hourLabel(p.hour)}–{hourLabel(p.hour + 1)}</span>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="misses" fill={C.violet} maxBarSize={BAR_MAX} radius={TOP} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Dennis corrections"
          subtitle={`Times Dennis had to step in or decide, per day since ${startLabel || 'the agent started'}`}
          aside={<p className="text-xs text-foreground-muted"><span className="text-base font-semibold text-foreground">{rate == null ? '-' : rate}</span> per 10 agent replies</p>}
          footnote={<>{defs.step_ins} {defs.asked} {defs.rules}</>}
        >
          <Legend items={[
            { color: C.dennis, label: 'Stepped in' },
            { color: C.aqua, label: 'Asked Dennis' },
            { color: C.yellow, label: 'Rules & refusals' },
          ]} />
          <div data-testid="sd-chart-corrections">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tracked} margin={{ top: 12, right: 6, left: -6, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid stroke="var(--sd-grid)" vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip
                  cursor={{ fill: 'var(--color-background-tertiary)', opacity: 0.6 }}
                  content={<DayTooltip rows={(d) => [
                    { color: C.dennis, value: num(d.step_ins ?? undefined), label: 'stepped in after an agent reply' },
                    { color: C.aqua, value: num(d.handovers ?? undefined), label: 'asked Dennis (needs-Dennis items)' },
                    { color: C.aqua, value: num(d.closed_by_dennis ?? undefined), label: 'closed by Dennis' },
                    { color: C.yellow, value: num(d.voice_rules ?? undefined), label: 'voice rules taught' },
                    { color: C.yellow, value: d.refused == null ? 'not logged' : String(d.refused), label: 'replies refused by checks' },
                  ]} />}
                />
                <Bar dataKey="stepped" stackId="c" fill={C.dennis} maxBarSize={24} {...segment} isAnimationActive={false} />
                <Bar dataKey="asked" stackId="c" fill={C.aqua} maxBarSize={24} {...segment} isAnimationActive={false} />
                <Bar dataKey="rules" stackId="c" fill={C.yellow} maxBarSize={24} radius={TOP} {...segment} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Where Dennis stepped in, 7 days</p>
              <BarList
                color={C.dennis}
                empty="No step-ins in the last 7 days."
                items={(ov.step_in_topics ?? []).map((t) => ({ label: t.topic === 'other' ? 'No clear topic' : t.topic, value: t.count }))}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Chats where Dennis still replies, 7 days</p>
              <BarList
                color={C.dennis}
                empty="Dennis sent no replies in the last 7 days."
                items={(ov.dennis_top_chats ?? []).map((c) => ({ label: c.name, value: c.replies }))}
              />
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Work shipped"
          subtitle={`Per day since ${startLabel || 'the agent started'}: ${shippedTracked} items in the days shown`}
          aside={(
            <button type="button" onClick={() => onNavigate('dennis')} className="text-right">
              <span className={`block text-base font-semibold ${waiting > 0 ? 'text-amber-500' : 'text-foreground'}`}>{waiting}</span>
              <span className="block text-[11px] text-foreground-muted">waiting on Dennis{oldest != null && waiting > 0 ? ` · oldest ${formatMinutes(oldest)}` : ''}</span>
            </button>
          )}
          footnote={defs.work}
          className="lg:col-span-2"
        >
          <Legend items={[
            { color: C.aqua, label: 'Bug fixes' },
            { color: C.violet, label: 'Features' },
            { color: C.yellow, label: 'Customer tasks' },
          ]} />
          <div data-testid="sd-chart-work">
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={tracked} margin={{ top: 12, right: 6, left: -6, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid stroke="var(--sd-grid)" vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip
                  cursor={{ fill: 'var(--color-background-tertiary)', opacity: 0.6 }}
                  content={<DayTooltip rows={(d) => [
                    { color: C.aqua, value: num(d.bugs ?? undefined), label: 'bug fixes' },
                    { color: C.violet, value: num(d.features ?? undefined), label: 'features' },
                    { color: C.yellow, value: num(d.tasks ?? undefined), label: 'customer tasks' },
                  ]} />}
                />
                <Bar dataKey="bugs" stackId="w" fill={C.aqua} maxBarSize={24} {...segment} isAnimationActive={false} />
                <Bar dataKey="features" stackId="w" fill={C.violet} maxBarSize={24} {...segment} isAnimationActive={false} />
                <Bar dataKey="tasks" stackId="w" fill={C.yellow} maxBarSize={24} radius={TOP} {...segment} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <details className="rounded-2xl border border-border bg-background-secondary p-4 group">
        <summary className="flex items-center justify-between gap-2 cursor-pointer list-none select-none">
          <span className="text-sm font-semibold text-foreground">Daily numbers (table)</span>
          <span className="text-xs text-foreground-muted transition-transform group-open:rotate-180" aria-hidden>▾</span>
        </summary>
        <div className="mt-3 overflow-x-auto -mx-4 px-4">
          <table className="sd-table w-full text-xs tabular-nums whitespace-nowrap">
            <thead>
              <tr className="text-left text-foreground-muted border-b border-border">
                {['Day', 'Customers', 'Msgs in', 'Agent', 'Dennis', 'Median 1st reply', 'Misses', 'Stepped in', 'Asked Dennis', 'Rules & refusals', 'Long replies', 'Shipped'].map((h) => (
                  <th key={h} className="py-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableDays.map((d) => {
                const isTracked = d.corrections != null;
                const g = correctionGroups(d);
                const shipped = (d.bugs ?? 0) + (d.features ?? 0) + (d.tasks ?? 0);
                return (
                  <tr key={d.date} className={`border-b border-border/50 ${d.date === start ? 'font-medium' : ''}`}>
                    <td className="py-1.5 pr-4 text-foreground">{shortDay(d.date)}{d.date === start ? ' · agent live' : ''}</td>
                    <td className="py-1.5 pr-4">{num(d.customers)}</td>
                    <td className="py-1.5 pr-4">{num(d.inbound)}</td>
                    <td className="py-1.5 pr-4">{num(d.replies_agent)}</td>
                    <td className="py-1.5 pr-4">{num(d.replies_dennis)}</td>
                    <td className="py-1.5 pr-4">{formatMinutes(d.median_first_response_min)}</td>
                    <td className="py-1.5 pr-4">{num(d.misses)}</td>
                    <td className="py-1.5 pr-4">{isTracked ? g.stepped : '-'}</td>
                    <td className="py-1.5 pr-4">{isTracked ? g.asked : '-'}</td>
                    <td className="py-1.5 pr-4">{isTracked ? `${g.rules}${d.refused == null ? '*' : ''}` : '-'}</td>
                    <td className="py-1.5 pr-4">{num(d.long_replies ?? undefined)}</td>
                    <td className="py-1.5 pr-4">{isTracked ? `${shipped} (${d.bugs ?? 0} fix, ${d.features ?? 0} feat, ${d.tasks ?? 0} task)` : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-foreground-muted mt-2">
          A dash means not tracked that day (work log and corrections start when the agent went live). * Refused replies were not logged before {agentStartLabel(ov.refusals_from) || 'logging started'}.
        </p>
      </details>
    </div>
  );
}
