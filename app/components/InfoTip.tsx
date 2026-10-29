'use client';

import { useId, useState } from 'react';

/**
 * A label with a small (i) that explains what the number means.
 *
 * The explanation is the native tooltip on hover (desktop) and expands inline
 * on tap (phones have no hover). Inline rather than a floating popover because
 * the cards it sits in clip their overflow.
 */
export default function LabelWithInfo({
  label,
  info,
  className = '',
}: {
  label: string;
  info?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  if (!info) return <p className={className}>{label}</p>;

  return (
    <>
      <p className={`${className} flex items-center gap-1`}>
        <span>{label}</span>
        <button
          type="button"
          title={info}
          aria-label={info}
          aria-expanded={open}
          aria-controls={id}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
          className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-foreground-muted/70 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </p>
      {open && (
        <p id={id} className="text-[10px] sm:text-[11px] leading-snug text-foreground-muted normal-case tracking-normal mb-1.5">
          {info}
        </p>
      )}
    </>
  );
}
