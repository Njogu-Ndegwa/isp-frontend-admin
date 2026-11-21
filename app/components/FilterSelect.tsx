'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { computeDropdownPlacement, DropdownPlacement } from './filterSelectPlacement';

/** Row height of one option on phones (py-3 + one line of text-sm). */
const OPTION_ROW_HEIGHT = 44;

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
  const [pos, setPos] = useState<DropdownPlacement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((o) => o.value === value)?.label || value;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // visualViewport tracks the area actually visible on phones (address bar,
    // on-screen keyboard); innerHeight can be taller than what the user sees.
    const vv = window.visualViewport;
    setPos(
      computeDropdownPlacement(
        rect,
        { width: window.innerWidth, height: vv ? vv.height : window.innerHeight },
        options.length * OPTION_ROW_HEIGHT + 2,
      ),
    );
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    // Scrolling anything else (the page, the modal body) moves the trigger, so
    // close. Scrolling the list itself must not close it, or a long list could
    // never be scrolled to its last option.
    const closeOnOuterScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    // Phones fire resize when the address bar shows or hides; follow the
    // trigger instead of closing under the user's finger.
    const reposition = () => updatePosition();
    window.addEventListener('scroll', closeOnOuterScroll, true);
    window.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', closeOnOuterScroll, true);
      window.removeEventListener('resize', reposition);
      window.visualViewport?.removeEventListener('resize', reposition);
    };
  }, [open, updatePosition]);

  // Keep touch drags that start in the list inside the list. Some modals lock
  // body scroll with a document-level touchmove preventDefault; stopping the
  // event here keeps that lock from swallowing the list's own scroll.
  useEffect(() => {
    const el = dropdownRef.current;
    if (!open || !el) return;
    const stop = (e: TouchEvent) => e.stopPropagation();
    el.addEventListener('touchmove', stop, { passive: true });
    return () => el.removeEventListener('touchmove', stop);
  }, [open, pos]);

  // Show the selected option when the list opens part-way down (once per open,
  // not on every reposition).
  const scrolledToActive = useRef(false);
  useEffect(() => {
    if (!open) {
      scrolledToActive.current = false;
      return;
    }
    if (!pos || scrolledToActive.current || !dropdownRef.current) return;
    scrolledToActive.current = true;
    const active = dropdownRef.current.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView?.({ block: 'nearest' });
  }, [open, pos]);

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
        aria-haspopup="listbox"
        aria-expanded={open}
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
          role="listbox"
          data-direction={pos.direction}
          className="fixed rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] shadow-[var(--shadow-lg)] overflow-x-hidden overflow-y-auto overscroll-contain animate-fade-in"
          style={{
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            minWidth: pos.minWidth,
            maxWidth: `calc(100vw - 16px)`,
            maxHeight: pos.maxHeight,
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
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
                role="option"
                aria-selected={isActive}
                data-active={isActive ? 'true' : undefined}
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
