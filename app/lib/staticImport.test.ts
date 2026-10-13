import { describe, it, expect } from 'vitest';
import {
  buildStaticImportFormData,
  canApplyImport,
  cleanPlanMapping,
  filenameFromDisposition,
  importApplied,
  importOptionsSignature,
  isAcceptedImportFile,
  mappingLabels,
  staticIpPlans,
  unmatchedPlanLabels,
  validateImportOptions,
} from './staticImport';
import type { Plan, StaticCustomerImportResponse, StaticCustomerImportRow } from './types';

function row(partial: Partial<StaticCustomerImportRow>): StaticCustomerImportRow {
  return {
    row: 2, name: 'A', static_ip: '10.0.0.2', mac: null, phone: null,
    plan_label: 'Gold', plan_id: 1, plan_name: 'Gold', expiry: null,
    status: 'active', action: 'create', reason: null, ...partial,
  };
}

function preview(partial: Partial<StaticCustomerImportResponse> = {}): StaticCustomerImportResponse {
  return {
    success: true, stage: 'import', router_id: 11, router_name: 'R', source_file: 'x.csv', dry_run: true,
    summary: { rows_total: 1, to_create: 1, skipped: 0, errors: 0, active: 1, inactive: 0, plans_to_create: 0 },
    plans_to_create: [], rows: [row({})], warnings: [], created_customer_ids: [], ...partial,
  };
}

describe('isAcceptedImportFile', () => {
  it('accepts csv and xlsx in any case', () => {
    expect(isAcceptedImportFile('a.csv')).toBe(true);
    expect(isAcceptedImportFile('A.XLSX')).toBe(true);
    expect(isAcceptedImportFile('a.xls')).toBe(false);
    expect(isAcceptedImportFile('a.csv.txt')).toBe(false);
  });
});

describe('cleanPlanMapping', () => {
  it('drops empty and invalid ids and coerces numeric strings', () => {
    expect(cleanPlanMapping({ Gold: '4', Silver: '', Bronze: 0, Iron: -1, ' ': 3, Tin: 'abc', Zinc: 7 }))
      .toEqual({ Gold: 4, Zinc: 7 });
  });
});

describe('buildStaticImportFormData', () => {
  const file = new File(['name,static_ip\n'], 'customers.csv', { type: 'text/csv' });

  it('preview defaults: apply=false, no plan creation, no mapping, Nairobi tz', () => {
    const form = buildStaticImportFormData(file, { apply: false });
    expect(form.get('apply')).toBe('false');
    expect(form.get('create_missing_plans')).toBe('false');
    expect(form.get('default_plan_price')).toBe('0');
    expect(form.get('plan_mapping_json')).toBeNull();
    expect(form.get('source_timezone')).toBe('Africa/Nairobi');
    expect((form.get('file') as File).name).toBe('customers.csv');
  });

  it('sends price only with create_missing_plans and the cleaned mapping as JSON', () => {
    const form = buildStaticImportFormData(file, {
      apply: true, createMissingPlans: true, defaultPlanPrice: 1500,
      planMapping: { Gold: 4, Unset: 0 }, sourceTimezone: 'Africa/Douala',
    });
    expect(form.get('apply')).toBe('true');
    expect(form.get('create_missing_plans')).toBe('true');
    expect(form.get('default_plan_price')).toBe('1500');
    expect(JSON.parse(form.get('plan_mapping_json') as string)).toEqual({ Gold: 4 });
    expect(form.get('source_timezone')).toBe('Africa/Douala');
  });

  it('ignores a stale price when plan creation is off', () => {
    const form = buildStaticImportFormData(file, { apply: false, createMissingPlans: false, defaultPlanPrice: 900 });
    expect(form.get('default_plan_price')).toBe('0');
  });
});

describe('validateImportOptions', () => {
  it('needs nothing when plan creation is off', () => {
    expect(validateImportOptions({ createMissingPlans: false, defaultPlanPrice: '' })).toBeNull();
  });
  it('requires a positive whole price when plan creation is on', () => {
    expect(validateImportOptions({ createMissingPlans: true, defaultPlanPrice: '' })).toMatch(/Enter a price/);
    expect(validateImportOptions({ createMissingPlans: true, defaultPlanPrice: '0' })).toMatch(/greater than 0/);
    expect(validateImportOptions({ createMissingPlans: true, defaultPlanPrice: '-5' })).toMatch(/greater than 0/);
    expect(validateImportOptions({ createMissingPlans: true, defaultPlanPrice: '12.5' })).toMatch(/whole number/);
    expect(validateImportOptions({ createMissingPlans: true, defaultPlanPrice: '1500' })).toBeNull();
    expect(validateImportOptions({ createMissingPlans: true, defaultPlanPrice: 800 })).toBeNull();
  });
});

describe('unmatchedPlanLabels / mappingLabels', () => {
  it('collects distinct unmatched labels from non-skipped rows plus plans_to_create', () => {
    const p = preview({
      rows: [
        row({ row: 2, plan_label: 'Gold', plan_id: 1 }),
        row({ row: 3, plan_label: 'Platinum', plan_id: null, action: 'error', reason: 'Unknown plan' }),
        row({ row: 4, plan_label: 'Platinum', plan_id: null, action: 'error' }),
        row({ row: 5, plan_label: 'Old', plan_id: null, action: 'skip' }),
        row({ row: 6, plan_label: '', plan_id: null, action: 'error' }),
      ],
      plans_to_create: [{ label: 'Diamond', name: 'Diamond', speed: '20M/20M', price: 0 }],
    });
    expect(unmatchedPlanLabels(p)).toEqual(['Platinum', 'Diamond']);
    expect(unmatchedPlanLabels(null)).toEqual([]);
  });

  it('keeps labels the reseller already mapped visible after they resolve', () => {
    const p = preview({ rows: [row({ plan_label: 'Platinum', plan_id: 4 })] });
    expect(mappingLabels(p, { Platinum: 4 })).toEqual(['Platinum']);
    expect(mappingLabels(p, {})).toEqual([]);
  });
});

describe('staticIpPlans', () => {
  it('keeps only static_ip plans', () => {
    const plans = [
      { id: 1, connection_type: 'static_ip' },
      { id: 2, connection_type: 'pppoe' },
      { id: 3 },
    ] as Plan[];
    expect(staticIpPlans(plans).map((p) => p.id)).toEqual([1]);
  });
});

describe('importOptionsSignature', () => {
  const base = { routerId: 11, fileKey: 'a.csv:10:1', createMissingPlans: false, defaultPlanPrice: '', planMapping: {} };
  it('is stable across mapping key order and ignores price when creation is off', () => {
    expect(importOptionsSignature({ ...base, planMapping: { A: 1, B: 2 } }))
      .toBe(importOptionsSignature({ ...base, planMapping: { B: 2, A: 1 } }));
    expect(importOptionsSignature({ ...base, defaultPlanPrice: '500' })).toBe(importOptionsSignature(base));
  });
  it('changes when any option the backend reads changes', () => {
    const sig = importOptionsSignature(base);
    expect(importOptionsSignature({ ...base, routerId: 12 })).not.toBe(sig);
    expect(importOptionsSignature({ ...base, fileKey: 'b.csv:10:1' })).not.toBe(sig);
    expect(importOptionsSignature({ ...base, createMissingPlans: true, defaultPlanPrice: '500' })).not.toBe(sig);
    expect(importOptionsSignature({ ...base, planMapping: { A: 3 } })).not.toBe(sig);
    expect(importOptionsSignature({ ...base, planMapping: { A: '' } })).toBe(sig);
  });
});

describe('canApplyImport / importApplied', () => {
  it('needs a successful dry run with something to create and no errors', () => {
    expect(canApplyImport(preview())).toBe(true);
    expect(canApplyImport(preview({ success: false }))).toBe(false);
    expect(canApplyImport(preview({ dry_run: false }))).toBe(false);
    expect(canApplyImport(preview({ summary: { ...preview().summary, to_create: 0 } }))).toBe(false);
    expect(canApplyImport(preview({ summary: { ...preview().summary, errors: 1 } }))).toBe(false);
    expect(canApplyImport(null)).toBe(false);
  });
  it('applied means a successful non-dry-run response', () => {
    expect(importApplied(preview({ dry_run: false }))).toBe(true);
    expect(importApplied(preview())).toBe(false);
    expect(importApplied(preview({ dry_run: false, success: false }))).toBe(false);
  });
});

describe('filenameFromDisposition', () => {
  it('reads plain and RFC 5987 filenames, else falls back', () => {
    expect(filenameFromDisposition('attachment; filename="tpl.csv"', 'x.csv')).toBe('tpl.csv');
    expect(filenameFromDisposition("attachment; filename*=UTF-8''static%20tpl.csv", 'x.csv')).toBe('static tpl.csv');
    expect(filenameFromDisposition(null, 'x.csv')).toBe('x.csv');
    expect(filenameFromDisposition('attachment', 'x.csv')).toBe('x.csv');
  });
});
