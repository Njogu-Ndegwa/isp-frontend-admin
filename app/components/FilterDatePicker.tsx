'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface FilterDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateString(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseValue(val: string) {
  if (!val) return null;
  const [y, m, d] = val.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d };
}

const CALENDAR_WIDTH = 288;

export default function FilterDatePicker({
  value,
  onChange,
  className = '',
}: FilterDatePickerProps) {
  const parsed = parseValue(value);
  const today = new Date();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dropdownHeight = 360;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;

    let top: number;
    if (spaceBelow >= dropdownHeight) {
      top = rect.bottom + 6;
    } else if (spaceAbove >= dropdownHeight) {
      top = rect.top - dropdownHeight - 6;
    } else {
      top = rect.bottom + 6;
    }

    let left: number;
    if (vw < 400) {
      left = (vw - CALENDAR_WIDTH) / 2;
    } else {
      left = Math.min(rect.right - CALENDAR_WIDTH, vw - CALENDAR_WIDTH - 8);
      left = Math.max(8, left);
    }

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  useEffect(() => {
    if (open && parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDay = (day: number) => {
    onChange(toDateString(viewYear, viewMonth, day));
    setOpen(false);
  };

  const displayLabel = parsed
    ? `${parsed.day} ${MONTHS[parsed.month]?.slice(0, 3)}`
    : 'Date';

  const isToday = (day: number) =>
    viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();

  const isSelected = (day: number) =>
    parsed !== null && viewYear === parsed.year && viewMonth === parsed.month && day === parsed.day;

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-1.5 w-full
          bg-[var(--background-tertiary)] border border-[var(--border)]
          rounded-[10px] px-2.5 sm:px-3 h-[42px]
          text-xs sm:text-sm whitespace-nowrap
          transition-all duration-200 cursor-pointer
          hover:border-[var(--border-hover)] active:opacity-70
          text-[var(--foreground)]
          ${open ? 'border-[var(--accent-primary)] shadow-[0_0_0_3px_var(--accent-glow)]' : ''}
        `}
      >
        <svg className="w-4 h-4 text-[var(--foreground-muted)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{displayLabel}</span>
      </button>

      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed rounded-[10px] border border-[var(--border)] bg-[var(--background-secondary)] shadow-[var(--shadow-lg)] p-3 sm:p-3 animate-fade-in"
          style={{ top: pos.top, left: pos.left, width: CALENDAR_WIDTH, zIndex: 99999, animationDuration: '150ms' }}
        >
          {/* Month/Year Header */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-2 -ml-1 rounded-lg hover:bg-[var(--background-tertiary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors active:opacity-70">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-2 -mr-1 rounded-lg hover:bg-[var(--background-tertiary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors active:opacity-70">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Previous month trailing days */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`prev-${i}`} className="flex items-center justify-center h-9 text-xs text-[var(--foreground-muted)]/30">
                {daysInPrevMonth - firstDayOfMonth + i + 1}
              </div>
            ))}
            {/* Current month days */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const todayMark = isToday(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`
                    relative flex items-center justify-center h-9 text-xs rounded-lg transition-colors active:opacity-70
                    ${selected
                      ? 'bg-[var(--accent-primary)] text-white font-semibold'
                      : todayMark
                        ? 'text-[var(--accent-primary)] font-semibold hover:bg-[var(--accent-primary)]/10'
                        : 'text-[var(--foreground)] hover:bg-[var(--background-tertiary)]'
                    }
                  `}
                >
                  {day}
                  {todayMark && !selected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent-primary)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                onChange(toDateString(t.getFullYear(), t.getMonth(), t.getDate()));
                setOpen(false);
              }}
              className="text-xs font-medium text-[var(--accent-primary)] hover:underline underline-offset-2 py-1 active:opacity-70"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors py-1 active:opacity-70"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
