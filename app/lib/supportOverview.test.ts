import { describe, expect, it } from 'vitest';
import {
  OverviewDay,
  agentShare,
  automationRows,
  pctText,
  scoreChange,
  agentStartDay,
  agentStartLabel,
  cappedResponse,
  correctionGroups,
  hourLabel,
  lastDays,
  observationLabel,
  perTenReplies,
  pointsChange,
  shortDay,
  sumBy,
  trackedDays,
  trend,
} from './supportOverview';

const day = (date: string, extra: Partial<OverviewDay> = {}): OverviewDay => ({ date, ...extra });

const days: OverviewDay[] = [
  day('2026-10-20', { customers: 19, replies_agent: 0, replies_dennis: 119, corrections: null, step_ins: null }),
  day('2026-10-21', { customers: 10, replies_agent: 0, replies_dennis: 43, corrections: null }),
  day('2026-10-22', { customers: 13, replies_agent: 16, replies_dennis: 52, corrections: 12, step_ins: 4, handovers: 8, closed_by_dennis: 0, voice_rules: 0, refused: null }),
  day('2026-10-23', { customers: 12, replies_agent: 47, replies_dennis: 22, corrections: 22, step_ins: 2, handovers: 18, closed_by_dennis: 0, voice_rules: 2, refused: null }),
  day('2026-10-24', { customers: 9, replies_agent: 34, replies_dennis: 14, corrections: 17, step_ins: 6, handovers: 9, closed_by_dennis: 0, voice_rules: 2, refused: 0 }),
];

describe('dates', () => {
  it('formats short days and the agent start', () => {
    expect(shortDay('2026-10-22')).toBe('22 Oct');
    expect(shortDay(undefined)).toBe('-');
    expect(agentStartLabel('2026-10-22T13:12+03:00')).toBe('22 Oct 13:12');
    expect(agentStartLabel(undefined)).toBe('');
    expect(hourLabel(9)).toBe('09:00');
  });

  it('places the agent marker only when the start day is shown', () => {
    const ov = { agent_start: '2026-10-22T13:12+03:00' };
    expect(agentStartDay(ov, days)).toBe('2026-10-22');
    expect(agentStartDay(ov, days.slice(3))).toBeNull();
    expect(agentStartDay(undefined, days)).toBeNull();
  });
});

describe('series slicing', () => {
  it('keeps the last N days and the tracked days', () => {
    expect(lastDays(days, 2).map((d) => d.date)).toEqual(['2026-10-23', '2026-10-24']);
    expect(lastDays(days, 30)).toHaveLength(5);
    expect(lastDays(undefined, 14)).toEqual([]);
    expect(trackedDays(days, '2026-10-22').map((d) => d.date)).toEqual(['2026-10-22', '2026-10-23', '2026-10-24']);
    // Without tracked_from: days that have a corrections count.
    expect(trackedDays(days).map((d) => d.date)).toEqual(['2026-10-22', '2026-10-23', '2026-10-24']);
  });
});

describe('trend', () => {
  it('reads direction and whether it is good news', () => {
    expect(trend(12.4, 11.4, true)).toEqual({ direction: 'up', pct: 9, good: true, label: 'up 9% vs last week' });
    expect(trend(4.5, 2.5, false)).toMatchObject({ direction: 'up', pct: 80, good: false });
    expect(trend(3, 6, false)).toMatchObject({ direction: 'down', pct: -50, good: true, label: 'down 50% vs last week' });
    expect(trend(10, 10.3, true)).toMatchObject({ direction: 'flat', good: null });
    expect(trend(5, 4, null)).toMatchObject({ direction: 'up', good: null });
  });

  it('has nothing to compare with a missing or zero week', () => {
    expect(trend(5, 0, true)).toMatchObject({ pct: null, direction: 'flat' });
    expect(trend(null, 4, true).pct).toBeNull();
    expect(trend(4, undefined, true).pct).toBeNull();
  });

  it('measures share changes in points', () => {
    expect(pointsChange(15, 0)).toBe(15);
    expect(pointsChange(null, 3)).toBeNull();
  });
});

describe('corrections', () => {
  it('groups the five counts into three stacks', () => {
    expect(correctionGroups(days[3])).toEqual({ stepped: 2, asked: 18, rules: 2, total: 22 });
    expect(correctionGroups(day('2026-10-25', { closed_by_dennis: 2, refused: 3 }))).toEqual({ stepped: 0, asked: 2, rules: 3, total: 5 });
  });

  it('agrees with the builder total on tracked days', () => {
    for (const d of trackedDays(days, '2026-10-22')) expect(correctionGroups(d).total).toBe(d.corrections);
  });

  it('rates corrections per 10 agent replies', () => {
    expect(perTenReplies(51, 97)).toBe(5.3);
    expect(perTenReplies(3, 0)).toBeNull();
  });
});

describe('sums and shares', () => {
  it('sums a field and works out the agent share', () => {
    expect(sumBy(days, (d) => d.customers)).toBe(63);
    expect(sumBy(days, (d) => d.step_ins)).toBe(12);
    expect(agentShare(days.slice(2))).toBe(52); // 97 of 185
    expect(agentShare([day('2026-10-01')])).toBeNull();
  });
});

describe('cappedResponse', () => {
  it('clips slow days to the cap and keeps the real value', () => {
    const r = cappedResponse([
      day('2026-10-15', { median_first_response_min: 490.6 }),
      day('2026-10-16', { median_first_response_min: 2.5 }),
      day('2026-10-17', { median_first_response_min: null }),
    ], 60);
    expect(r).toEqual([
      { date: '2026-10-15', value: 490.6, plot: 60, over: true },
      { date: '2026-10-16', value: 2.5, plot: 2.5, over: false },
      { date: '2026-10-17', value: null, plot: null, over: false },
    ]);
  });
});

describe('observationLabel', () => {
  it('names every kind so colour is never the only cue', () => {
    expect(observationLabel('warn')).toBe('Fix');
    expect(observationLabel('good')).toBe('Going well');
    expect(observationLabel('info')).toBe('Note');
    expect(observationLabel(undefined)).toBe('Note');
  });
});

describe('automation', () => {
  const since = {
    label: 'Since 22 Oct', score: 54, replies_pct: 53, replies_agent: 101, replies_total: 189,
    conversations_pct: 24, conversations_e2e: 6, conversations_total: 25, work_pct: 85, work_agent: 137, work_total: 162,
  };

  it('lists the three shares with their denominators', () => {
    expect(automationRows(since)).toEqual([
      { key: 'replies', label: 'Replies sent by the agent', unit: 'replies', pct: 53, part: 101, whole: 189 },
      { key: 'conversations', label: 'Chats handled end to end', unit: 'chats', pct: 24, part: 6, whole: 25 },
      { key: 'work', label: 'Work done without Dennis', unit: 'items', pct: 85, part: 137, whole: 162 },
    ]);
  });

  it('keeps a missing share as null, never 0', () => {
    const rows = automationRows({ replies_pct: null, work_pct: undefined });
    expect(rows.map((r) => r.pct)).toEqual([null, null, null]);
    expect(rows.map((r) => r.whole)).toEqual([0, 0, 0]);
    expect(automationRows(undefined)).toHaveLength(3);
  });

  it('formats percentages and the day-on-day change', () => {
    expect(pctText(71)).toBe('71%');
    expect(pctText(null)).toBe('-');
    expect(scoreChange([{ score: 41 }, { score: 64 }, { score: 71 }])).toBe(7);
    expect(scoreChange([{ score: 41 }, { score: null }, { score: 30 }])).toBe(-11);
    expect(scoreChange([{ score: 41 }])).toBeNull();
    expect(scoreChange(undefined)).toBeNull();
  });
});
