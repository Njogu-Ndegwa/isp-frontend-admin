'use client';

import type { CustomerState } from '../../lib/assistantEntities';
import type { Tone } from '../../lib/assistantVisual';

/** A next step under an answer: a tap asks the assistant. */
export const Action = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button type="button" className="ai-chip !py-1.5 text-[12.5px] font-medium" onClick={onClick}>{children}</button>
);

/** A customer's paid state in a word and a colour, the same in the list and the profile. */
export const CUSTOMER_STATE: Record<CustomerState, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'good' },
  expiring: { label: 'Expires soon', tone: 'warn' },
  grace: { label: 'In grace', tone: 'warn' },
  expired: { label: 'Expired', tone: 'bad' },
  paused: { label: 'Paused', tone: 'muted' },
  inactive: { label: 'Inactive', tone: 'muted' },
};
