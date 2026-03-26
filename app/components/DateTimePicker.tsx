'use client';

import { useState, useRef, useEffect } from 'react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toLocalDatetime(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function DateTimePicker({ value, label, onChange }: DateTimePickerProps) {
  const parsed = value ? new Date(value) : null;
  const isValid = parsed && !isNaN(parsed.getTime());

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(isValid ? parsed.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(isValid ? parsed.getMonth() : new Date().getMonth());
  const [hour, setHour] = useState(isValid ? parsed.getHours() : 23);
  const [minute, setMinute] = useState(isValid ? parsed.getMinutes() : 59);
  const [hourInput, setHourInput] = useState(pad(hour));
  const [minuteInput, setMinuteInput] = useState(pad(minute));
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDay = isValid ? parsed.getDate() : null;
  const selectedMonth = isValid ? parsed.getMonth() : null;
  const selectedYear = isValid ? parsed.getFullYear() : null;

  useEffect(() => { setHourInput(pad(hour)); }, [hour]);
  useEffect(() => { setMinuteInput(pad(minute)); }, [minute]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day, hour, minute);
    onChange(toLocalDatetime(d));
  };

  const updateTime = (h: number, m: number) => {
    setHour(h);
    setMinute(m);
    if (isValid) {
      const d = new Date(parsed);
      d.setHours(h, m);
      onChange(toLocalDatetime(d));
    }
  };

  const today = new Date();
  const isToday = (day: number) =>
    viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
  const isSelected = (day: number) =>
    viewYear === selectedYear && viewMonth === selectedMonth && day === selectedDay;

  const displayText = isValid
    ? `${parsed.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
    : 'Select date & time';

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-foreground mb-2">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input w-full text-left flex items-center justify-between gap-2"
      >
        <span className={isValid ? 'text-foreground' : 'text-foreground-muted'}>{displayText}</span>
        <svg className="w-4 h-4 text-foreground-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-[60] mt-1 left-0 right-0 card p-4 shadow-lg animate-fade-in min-w-[280px]">
          {/* Month/Year nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 rounded-md hover:bg-background-tertiary transition-colors text-foreground-muted hover:text-foreground">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-foreground">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 rounded-md hover:bg-background-tertiary transition-colors text-foreground-muted hover:text-foreground">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-foreground-muted uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`h-8 w-full rounded-md text-sm font-medium transition-colors ${
                    isSelected(day)
                      ? 'bg-accent-primary text-background'
                      : isToday(day)
                        ? 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20'
                        : 'text-foreground hover:bg-background-tertiary'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time picker */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-center gap-2">
              <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Time</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hourInput}
                  onChange={(e) => setHourInput(e.target.value)}
                  onBlur={() => {
                    const parsed = parseInt(hourInput);
                    const clamped = isNaN(parsed) ? 0 : Math.min(23, Math.max(0, parsed));
                    setHourInput(pad(clamped));
                    updateTime(clamped, minute);
                  }}
                  className="input w-14 text-center font-mono px-1"
                />
                <span className="text-foreground font-bold">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minuteInput}
                  onChange={(e) => setMinuteInput(e.target.value)}
                  onBlur={() => {
                    const parsed = parseInt(minuteInput);
                    const clamped = isNaN(parsed) ? 0 : Math.min(59, Math.max(0, parsed));
                    setMinuteInput(pad(clamped));
                    updateTime(hour, clamped);
                  }}
                  className="input w-14 text-center font-mono px-1"
                />
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                setHour(now.getHours());
                setMinute(now.getMinutes());
                onChange(toLocalDatetime(now));
              }}
              className="flex-1 text-xs py-1.5 rounded-md border border-border text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
            >
              Now
            </button>
            {isValid && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="flex-1 text-xs py-1.5 rounded-md border border-border text-foreground-muted hover:text-danger hover:border-danger/30 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 text-xs py-1.5 rounded-md bg-accent-primary text-background font-medium hover:bg-accent-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
