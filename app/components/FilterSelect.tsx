'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
}

export default function FilterSelect({
  value,
  onChange,
  options,
  className = '',
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((o) => o.value === value)?.label || value;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.max(rect.width, 160);
    const left = Math.min(rect.left, window.innerWidth - dropdownWidth - 8);
    setPos({
      top: rect.bottom + 6,
      left: Math.max(8, left),
      minWidth: rect.width,
    });
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

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          flex items-center justify-between gap-1.5 w-full
          bg-[var(--background-tertiary)] border border-[var(--border)]
          rounded-xl px-2.5 sm:px-3 h-[42px]
          text-xs sm:text-sm text-[var(--foreground)] whitespace-nowrap
          transition-all duration-200 cursor-pointer
          hover:border-[var(--border-hover)] active:opacity-70
          ${open ? 'border-[var(--accent-primary)] shadow-[0_0_0_3px_var(--accent-glow)]' : ''}
        `}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--foreground-muted)] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] shadow-[var(--shadow-lg)] overflow-hidden animate-fade-in"
          style={{
            top: pos.top,
            left: pos.left,
            minWidth: pos.minWidth,
            zIndex: 99999,
            animationDuration: '150ms',
          }}
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`
                  flex items-center gap-2 w-full px-3 py-3 sm:py-2.5 text-sm text-left transition-colors active:opacity-70
                  ${isActive
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-medium'
                    : 'text-[var(--foreground)] hover:bg-[var(--background-tertiary)]'
                  }
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-[var(--accent-primary)]' : 'bg-transparent'}`} />
                {opt.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
