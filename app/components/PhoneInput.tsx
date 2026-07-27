'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRIES, flagEmoji, type Country } from '../lib/countries';

interface PhoneInputProps {
  /** Currently selected country (controlled). */
  country: Country;
  onCountryChange: (country: Country) => void;
  /** National part, digits only (controlled). */
  nationalNumber: string;
  onNationalNumberChange: (digits: string) => void;
  id?: string;
  required?: boolean;
  placeholder?: string;
}

export default function PhoneInput({
  country,
  onCountryChange,
  nationalNumber,
  onNationalNumberChange,
  id,
  required,
  placeholder = '712 345 678',
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropUp, setDropUp] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);

  // Approximate rendered height of the open panel (search box + list + padding).
  const PANEL_HEIGHT = 320;

  const openDropdown = () => {
    // Flip upward when there isn't room below — e.g. the field sits near the
    // bottom of a mobile viewport, where an absolute panel would be clipped.
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setDropUp(spaceBelow < PANEL_HEIGHT && spaceAbove > spaceBelow);
    }
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        numberRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Focus the search box when the dropdown opens.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const digits = q.replace(/\D/g, '');
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso2.toLowerCase().startsWith(q) ||
        (digits.length > 0 && c.dialCode.startsWith(digits)),
    );
  }, [query]);

  const selectCountry = (c: Country) => {
    onCountryChange(c);
    close();
    numberRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-stretch w-full rounded-[10px] border border-[var(--border)] bg-[var(--background-tertiary)] transition-all focus-within:border-[var(--accent-primary)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)]">
        <button
          type="button"
          onClick={() => (open ? close() : openDropdown())}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country code: ${country.name} +${country.dialCode}`}
          className="flex items-center gap-1.5 shrink-0 pl-3 pr-2.5 py-3 text-sm text-foreground border-r border-[var(--border)] hover:bg-[var(--hover-row)] rounded-l-[10px] transition-colors"
        >
          <span className="text-base leading-none" aria-hidden="true">
            {flagEmoji(country.iso2)}
          </span>
          <span className="tabular-nums">+{country.dialCode}</span>
          <svg
            className={`w-3.5 h-3.5 text-foreground-muted transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <input
          ref={numberRef}
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={nationalNumber}
          onChange={(e) => onNationalNumberChange(e.target.value.replace(/\D/g, ''))}
          required={required}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none px-3 py-3 text-[16px] text-foreground placeholder:text-foreground-muted rounded-r-[10px]"
        />
      </div>

      {open && (
        <div
          className={`absolute left-0 right-0 z-50 rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] shadow-[var(--shadow-lg)] overflow-hidden ${
            dropUp ? 'bottom-[calc(100%+0.375rem)]' : 'top-[calc(100%+0.375rem)]'
          }`}
          role="listbox"
        >
          <div className="p-2 border-b border-[var(--border)] bg-[var(--background-secondary)]">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-tertiary)] px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-foreground-muted text-center">No matches</li>
            ) : (
              filtered.map((c) => {
                const selected = c.iso2 === country.iso2;
                return (
                  <li key={c.iso2}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => selectCountry(c)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--hover-row)] ${
                        selected ? 'bg-[var(--hover-row)]' : ''
                      }`}
                    >
                      <span className="text-base leading-none w-6 text-center shrink-0" aria-hidden="true">
                        {flagEmoji(c.iso2)}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-foreground">{c.name}</span>
                      <span className="tabular-nums text-foreground-muted shrink-0">+{c.dialCode}</span>
                      {selected && (
                        <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
