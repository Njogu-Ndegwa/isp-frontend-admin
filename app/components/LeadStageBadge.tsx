'use client';

import type { LeadStage } from '../lib/types';

const STAGE_CONFIG: Record<LeadStage, { label: string; variant: string }> = {
  new_lead: { label: 'New Lead', variant: 'badge-info' },
  contacted: { label: 'Contacted', variant: 'badge-neutral' },
  talking: { label: 'Talking', variant: 'badge-warning' },
  installation_help: { label: 'Installation Help', variant: 'badge-warning' },
  signed_up: { label: 'Signed Up', variant: 'badge-info' },
  paying: { label: 'Paying', variant: 'badge-success' },
  churned: { label: 'Churned', variant: 'badge-danger' },
  lost: { label: 'Lost', variant: 'badge-neutral' },
};

export const STAGE_ORDER: LeadStage[] = [
  'new_lead', 'contacted', 'talking', 'installation_help',
  'signed_up', 'paying', 'churned', 'lost',
];

export const ACTIVE_STAGES: LeadStage[] = [
  'new_lead', 'contacted', 'talking', 'installation_help',
];

export function getStageMeta(stage: LeadStage) {
  return STAGE_CONFIG[stage] || { label: stage, variant: 'badge-neutral' };
}

export default function LeadStageBadge({ stage, size = 'default' }: { stage: LeadStage; size?: 'default' | 'sm' }) {
  const { label, variant } = getStageMeta(stage);
  return (
    <span className={`badge ${variant} ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : ''}`}>
      {label}
    </span>
  );
}
