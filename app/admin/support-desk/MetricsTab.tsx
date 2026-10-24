'use client';

import { ReactNode, useMemo, useState } from 'react';
import FilterPills from '../../components/FilterPills';
import {
  METRIC_PERIODS,
  MetricsPeriod,
  ShippedItem,
  SupportMetrics,
  TrendDay,
  barWidth,
  formatMinutes,
  inPeriod,
  num,
  percent,
  periodLabel,
  trendScale,
} from '../../lib/supportMetrics';

const TZ = 'Africa/Nairobi';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-10-23" -> "23 Oct"
const shortDate = (iso?: string | null): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ''}` : '-';
};

const dateTime = (iso?: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-KE', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
};

function Tile({ value, label, sub, warn = false }: { value: ReactNode; label: string; sub?: ReactNode; warn?: boolean }) {
  return (
    <div className="card p-3 min-w-0">
      <p className={`text-2xl font-semibold tabular-nums leading-tight ${warn ? 'text-amber-500' : 'text-foreground'}`}>{value}</p>
      <p className="text-xs text-foreground-muted mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-foreground-muted mt-1 break-words">{sub}</p>}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint && <p className="text-xs text-foreground-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function ListCard({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode }) {
  return (
    <details className="card p-4 group">
      <summary className="flex items-center justify-between gap-2 cursor-pointer list-none select-none">
        <span className="font-medium text-sm text-foreground">{title}</span>
        <span className="flex items-center gap-2 text-xs text-foreground-muted tabular-nums">
          {count}
          <span className="transition-transform group-open:rotate-180" aria-hidden>▾</span>
        </span>
      </summary>
      {count === 0 ? (
        <p className="text-xs text-foreground-muted mt-2">{empty}</p>
      ) : (
        <ul className="divide-y divide-border/50 mt-2">{children}</ul>
      )}
    </details>
  );
}

function Row({ title, meta, right }: { title: ReactNode; meta?: ReactNode; right?: ReactNode }) {
  return (
    <li className="py-2.5 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground break-words">{title}</p>
        {meta && <div className="text-xs text-foreground-muted mt-0.5 break-words">{meta}</div>}
      </div>
      {right && <span className="text-xs text-foreground-muted tabular-nums whitespace-nowrap flex-shrink-0">{right}</span>}
    </li>
  );
}

function PrLinks({ item }: { item: ShippedItem }) {
  const prs = (item.prs ?? []).filter((p) => /^https:\/\//.test(p.url));
  if (prs.length === 0) return <span>No PR (laptop-side fix)</span>;
  return (
    <span className="flex flex-wrap gap-x-2">
      {prs.map((p) => (
        <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="text-accent-primary">
          {p.label}
        </a>
      ))}
    </span>
  );
}

const AGENT_BAR = 'bg-amber-500';
const DENNIS_BAR = 'bg-sky-500';

function Trend({ days }: { days: TrendDay[] }) {
  const scale = trendScale(days);
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
        <span className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${AGENT_BAR}`} aria-hidden />Agent replies</span>
        <span className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${DENNIS_BAR}`} aria-hidden />Dennis replies</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-foreground-muted/60" aria-hidden />Inbound</span>
      </div>
      <ul className="mt-3 space-y-3">
        {[...days].reverse().map((d) => {
          const agent = d.replies_agent ?? 0;
          const dennis = d.replies_dennis ?? 0;
          return (
            <li key={d.date}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium text-foreground">{shortDate(d.date)}</span>
                <span className="text-foreground-muted tabular-nums text-right">
                  {num(d.inbound)} in · {agent} agent · {dennis} Dennis · {num(d.misses)} missed · {num(d.shipped)} shipped
                </span>
              </div>
              <div
                className="mt-1 flex h-2.5 gap-[2px]"
                title={`${shortDate(d.date)}: ${agent} agent, ${dennis} Dennis replies; ${num(d.inbound)} inbound`}
              >
                {agent > 0 && <div className={`${AGENT_BAR} rounded-sm`} style={{ width: `${barWidth(agent, scale)}%` }} />}
                {dennis > 0 && <div className={`${DENNIS_BAR} rounded-sm`} style={{ width: `${barWidth(dennis, scale)}%` }} />}
              </div>
              <div className="mt-1 h-0.5 bg-foreground-muted/60 rounded-full" style={{ width: `${barWidth(d.inbound, scale)}%` }} aria-hidden />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function MetricsTab({ metrics }: { metrics?: SupportMetrics }) {
  const [period, setPeriod] = useState<MetricsPeriod>('since');
  const bugs = useMemo(() => inPeriod(metrics?.lists?.bugs, metrics, period), [metrics, period]);
  const features = useMemo(() => inPeriod(metrics?.lists?.features, metrics, period), [metrics, period]);

  if (!metrics || metrics.error) {
    return (
      <div className="card p-6 text-center text-sm text-foreground-muted">
        {metrics?.error || 'No metrics in this snapshot yet. They appear after the laptop pushes its next update.'}
      </div>
    );
  }

  const c = metrics.conversations?.[period] ?? {};
  const w = metrics.work?.[period] ?? {};
  const q = metrics.quality?.[period] ?? {};
  const now = metrics.current ?? {};
  const lists = metrics.lists ?? {};
  const answeredShare = percent(c.within_60_min, c.answered);
  const cap = metrics.reply_cap;

  return (
    <div className="space-y-5">
      <FilterPills<MetricsPeriod>
        value={period}
        onChange={setPeriod}
        ariaLabel="Metrics period"
        className="max-w-full"
        options={METRIC_PERIODS.map((p) => ({ value: p, label: periodLabel(metrics, p) }))}
      />

      <Section title="Right now">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile value={num(now.waiting_on_us)} label="Chats waiting on us" warn={(now.waiting_on_us ?? 0) > 0}
            sub={`${num(now.waiting_on_customer)} on customer · ${num(now.with_dennis)} with Dennis`} />
          <Tile value={num(now.dennis_waiting)} label="Items waiting on Dennis" warn={(now.dennis_waiting ?? 0) > 0}
            sub={now.dennis_oldest_min != null ? `Oldest ${formatMinutes(now.dennis_oldest_min)} · median ${formatMinutes(now.dennis_median_min)}` : undefined} />
          <Tile value={num(now.promises_open)} label="Open promises" warn={(now.promises_open ?? 0) > 0} />
          <Tile value={num(now.prs_awaiting_dennis)} label="PRs awaiting Dennis"
            sub={`${num(now.features_in_progress)} features, ${num(now.bugs_in_progress)} fixes in progress`} />
        </div>
      </Section>

      <Section title="Conversations" hint="Business and lead WhatsApp chats only.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile value={num(c.customers)} label="Customers talked to" />
          <Tile value={num(c.inbound)} label="Messages in" />
          <Tile value={num(c.replies)} label="Replies sent" sub={`${num(c.replies_agent)} agent · ${num(c.replies_dennis)} Dennis`} />
          <Tile value={formatMinutes(c.median_first_response_min)} label="Median first response"
            sub={answeredShare != null ? `${answeredShare}% of ${c.answered} answered within 60 min` : undefined} />
        </div>
        <p className="text-xs text-foreground-muted">
          {num(c.needed_reply)} customer messages needed an answer: {num(c.answered_agent)} answered by the agent,
          {' '}{num(c.answered_dennis)} by Dennis, {num((c.needed_reply ?? 0) - (c.answered ?? 0))} still open.
        </p>
      </Section>

      <Section title="Work">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile value={num(w.bugs_shipped)} label="Bugs fixed" />
          <Tile value={num(w.features_shipped)} label="Features shipped" />
          <Tile value={num(w.tasks_done)} label="Customer tasks done" />
          <Tile value={num(w.workers)} label="Workers dispatched" />
          <Tile value={`${num(w.promises_kept)}/${num(w.promises_made)}`} label="Promises kept"
            sub={`${num(w.promises_open)} of these still open`} warn={(w.promises_open ?? 0) > 0} />
          <Tile value={num(w.handovers)} label="Handed to Dennis" />
        </div>
      </Section>

      <Section title="Quality">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile value={num(q.long_replies)} label={`Replies over ${metrics.reply_limit ?? 160} chars`} warn={(q.long_replies ?? 0) > 0}
            sub={cap ? `Since the cap (${dateTime(cap.since)}): ${num(cap.long_replies)} of ${num(cap.sends)}` : `of ${num(q.agent_sends)} agent replies`} />
          <Tile value={num(q.misses)} label="Misses (over 60 min)" warn={(q.misses ?? 0) > 0}
            sub={`${num(q.misses_open)} still unanswered`} />
          <Tile value={num(q.handovers)} label="Handovers to Dennis" sub={`${num(now.handover_chats)} chats handed over now`} />
        </div>
      </Section>

      {(metrics.trend?.length ?? 0) > 0 && (
        <Section title="Daily trend" hint="Replies per day, agent and Dennis; the thin line is messages in.">
          <Trend days={metrics.trend ?? []} />
        </Section>
      )}

      <Section title="Lists">
        <div className="space-y-3">
          <ListCard title={`Bugs fixed · ${periodLabel(metrics, period)}`} count={bugs.length} empty="No bug fixes shipped in this period.">
            {bugs.map((b, i) => <Row key={i} title={b.title} meta={<PrLinks item={b} />} right={shortDate(b.date)} />)}
          </ListCard>
          <ListCard title={`Features shipped · ${periodLabel(metrics, period)}`} count={features.length} empty="No features shipped in this period.">
            {features.map((f, i) => <Row key={i} title={f.title} meta={<PrLinks item={f} />} right={shortDate(f.date)} />)}
          </ListCard>
          <ListCard title="In progress" count={lists.in_progress?.length ?? 0} empty="Nothing in progress.">
            {(lists.in_progress ?? []).map((p, i) => (
              <Row key={i} title={p.title} meta={p.kind === 'bug_fix' ? 'Bug fix' : 'Feature'} right={shortDate(p.date)} />
            ))}
          </ListCard>
          <ListCard title="PRs awaiting Dennis" count={lists.prs_awaiting_dennis?.length ?? 0} empty="No PRs waiting for you.">
            {(lists.prs_awaiting_dennis ?? []).map((p, i) => (
              <Row key={i} title={p.title}
                meta={p.url && /^https:\/\//.test(p.url)
                  ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-accent-primary">{p.label}</a>
                  : p.label}
                right={formatMinutes(p.age_min)} />
            ))}
          </ListCard>
          <ListCard title="Waiting on Dennis, oldest first" count={lists.dennis_waiting?.length ?? 0} empty="Nothing is waiting on you.">
            {(lists.dennis_waiting ?? []).map((d, i) => (
              <Row key={i} title={d.title} meta={[d.customer, d.since ? `since ${dateTime(d.since)}` : null].filter(Boolean).join(' · ')}
                right={formatMinutes(d.age_min)} />
            ))}
          </ListCard>
          <ListCard title="Open promises" count={lists.promises_open?.length ?? 0} empty="No open promises.">
            {(lists.promises_open ?? []).map((p, i) => <Row key={i} title={p.title} meta={p.customer} right={shortDate(p.date)} />)}
          </ListCard>
          <ListCard title="Recent misses" count={lists.misses?.length ?? 0} empty="No misses.">
            {(lists.misses ?? []).map((m, i) => (
              <Row key={i} title={m.customer || 'Customer'}
                meta={`${dateTime(m.at)} · ${m.answered ? `answered by ${m.by === 'agent' ? 'the agent' : 'Dennis'}` : 'not answered yet'}`}
                right={formatMinutes(m.waited_min)} />
            ))}
          </ListCard>
        </div>
      </Section>

      <div className="text-xs text-foreground-muted space-y-1">
        {(metrics.notes ?? []).map((n, i) => <p key={i}>{n}</p>)}
        {metrics.github === 'unavailable' && <p>GitHub was unreachable on the laptop, so PR-only items are missing.</p>}
      </div>
    </div>
  );
}
