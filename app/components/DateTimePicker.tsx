'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getCurrentGMT3Input, getCurrentTimeGMT3 } from '../lib/dateUtils';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function to12Hour(h: number) {
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 || 12;
  return { display, period };
}

function to24Hour(display12: number, period: 'AM' | 'PM') {
  if (period === 'AM') return display12 === 12 ? 0 : display12;
  return display12 === 12 ? 12 : display12 + 12;
}

export default function DateTimePicker({ value, label, onChange }: DateTimePickerProps) {
  const parsed = value ? new Date(value) : null;
  const isValid = parsed && !isNaN(parsed.getTime());

  const [open, setOpen] = useState(false);
  const initGmt3 = getCurrentTimeGMT3();
  const [viewYear, setViewYear] = useState(isValid ? parsed.getFullYear() : initGmt3.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(isValid ? parsed.getMonth() : initGmt3.getUTCMonth());
  const [hour, setHour] = useState(isValid ? parsed.getHours() : 23);
  const [minute, setMinute] = useState(isValid ? parsed.getMinutes() : 59);
  const [period, setPeriod] = useState<'AM' | 'PM'>(hour >= 12 ? 'PM' : 'AM');
  const { display: displayHour } = to12Hour(hour);
  const [hourInput, setHourInput] = useState(String(displayHour));
  const [minuteInput, setMinuteInput] = useState(pad(minute));
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDay = isValid ? parsed.getDate() : null;
  const selectedMonth = isValid ? parsed.getMonth() : null;
  const selectedYear = isValid ? parsed.getFullYear() : null;

  useEffect(() => {
    const { display, period: p } = to12Hour(hour);
    setHourInput(String(display));
    setPeriod(p as 'AM' | 'PM');
  }, [hour]);
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

  const updateTime = useCallback((h24: number, m: number) => {
    setHour(h24);
    setMinute(m);
    if (isValid && parsed) {
      const d = new Date(parsed);
      d.setHours(h24, m);
      onChange(toLocalDatetime(d));
    }
  }, [isValid, parsed, onChange]);

  const updateTime12 = useCallback((h12: number, m: number, p: 'AM' | 'PM') => {
    const h24 = to24Hour(h12, p);
    setPeriod(p);
    updateTime(h24, m);
  }, [updateTime]);

  const gmt3Now = getCurrentTimeGMT3();
  const todayYear = gmt3Now.getUTCFullYear();
  const todayMonth = gmt3Now.getUTCMonth();
  const todayDate = gmt3Now.getUTCDate();
  const isToday = (day: number) =>
    viewYear === todayYear && viewMonth === todayMonth && day === todayDate;
  const isSelected = (day: number) =>
    viewYear === selectedYear && viewMonth === selectedMonth && day === selectedDay;

  const displayText = (() => {
    if (!isValid) return 'Select date & time';
    const { display: dh, period: dp } = to12Hour(parsed.getHours());
    return `${SHORT_MONTHS[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()} ${dh}:${pad(parsed.getMinutes())} ${dp}`;
  })();

  const clampHour12 = (val: string) => {
    const n = parseInt(val);
    return isNaN(n) ? 12 : Math.min(12, Math.max(1, n));
  };

  const clampMinute = (val: string) => {
    const n = parseInt(val);
    return isNaN(n) ? 0 : Math.min(59, Math.max(0, n));
  };

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
        <div className="absolute z-[60] mt-1 left-0 right-0 shadow-lg animate-fade-in dtp-popover">
          {/* Month/Year nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="dtp-nav-btn"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-foreground select-none">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="dtp-nav-btn"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-foreground-muted uppercase tracking-wide py-1.5 select-none">
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
              const selected = isSelected(day);
              const todayDay = isToday(day);
              return (
                <div key={day} className="flex justify-center py-[2px]">
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`dtp-day ${
                      selected
                        ? 'dtp-day-selected'
                        : todayDay
                          ? 'dtp-day-today'
                          : 'dtp-day-default'
                    }`}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Time picker */}
          <div className="mt-2.5 pt-2.5 border-t border-border">
            <div className="flex items-center justify-center gap-3">
              <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Time</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={hourInput}
                  onChange={(e) => setHourInput(e.target.value)}
                  onBlur={() => {
                    const clamped = clampHour12(hourInput);
                    setHourInput(String(clamped));
                    updateTime12(clamped, minute, period);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const clamped = clampHour12(hourInput);
                      setHourInput(String(clamped));
                      updateTime12(clamped, minute, period);
                    }
                  }}
                  className="dtp-time-input"
                />
                <span className="text-foreground font-bold text-lg select-none leading-none">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minuteInput}
                  onChange={(e) => setMinuteInput(e.target.value)}
                  onBlur={() => {
                    const clamped = clampMinute(minuteInput);
                    setMinuteInput(pad(clamped));
                    updateTime12(displayHour, clamped, period);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const clamped = clampMinute(minuteInput);
                      setMinuteInput(pad(clamped));
                      updateTime12(displayHour, clamped, period);
                    }
                  }}
                  className="dtp-time-input"
                />
                <div className="flex flex-col gap-0.5 ml-1">
                  <button
                    type="button"
                    onClick={() => updateTime12(displayHour, minute, 'AM')}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                      period === 'AM'
                        ? 'bg-accent-primary text-white'
                        : 'text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTime12(displayHour, minute, 'PM')}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                      period === 'PM'
                        ? 'bg-accent-primary text-white'
                        : 'text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-2.5">
            <button
              type="button"
              onClick={() => {
                const nowStr = getCurrentGMT3Input();
                const nowGmt3 = getCurrentTimeGMT3();
                setViewYear(nowGmt3.getUTCFullYear());
                setViewMonth(nowGmt3.getUTCMonth());
                setHour(nowGmt3.getUTCHours());
                setMinute(nowGmt3.getUTCMinutes());
                onChange(nowStr);
              }}
              className="dtp-action-btn dtp-action-secondary"
            >
              Now
            </button>
            {isValid && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="dtp-action-btn dtp-action-danger"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="dtp-action-btn dtp-action-primary"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
