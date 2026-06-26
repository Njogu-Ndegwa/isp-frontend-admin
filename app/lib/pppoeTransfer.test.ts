import { describe, it, expect } from 'vitest';
import {
  buildTransferRequest,
  eligibleTargetRouters,
  transferHasErrors,
  transferPreviewReady,
  transferApplied,
} from './pppoeTransfer';

describe('buildTransferRequest', () => {
  it('preview default: only target_router_id, no apply/active_only/skip flags', () => {
    const body = buildTransferRequest({ targetRouterId: 34 });
    expect(body).toEqual({ target_router_id: 34 });
  });

  it('apply true is included; false/omitted is dropped', () => {
    expect(buildTransferRequest({ targetRouterId: 7, apply: true })).toEqual({
      target_router_id: 7,
      apply: true,
    });
    expect(buildTransferRequest({ targetRouterId: 7, apply: false })).toEqual({
      target_router_id: 7,
    });
  });

  it('active_only true is included; false/omitted is dropped', () => {
    expect(buildTransferRequest({ targetRouterId: 5, activeOnly: true })).toEqual({
      target_router_id: 5,
      active_only: true,
    });
    expect(buildTransferRequest({ targetRouterId: 5, activeOnly: false })).toEqual({
      target_router_id: 5,
    });
  });

  it('skip_target_provision true is included; false/omitted is dropped', () => {
    expect(buildTransferRequest({ targetRouterId: 9, skipTargetProvision: true })).toEqual({
      target_router_id: 9,
      skip_target_provision: true,
    });
    expect(buildTransferRequest({ targetRouterId: 9, skipTargetProvision: false })).toEqual({
      target_router_id: 9,
    });
  });

  it('sample_limit is passed through and capped at 100; omitted when undefined', () => {
    expect(buildTransferRequest({ targetRouterId: 1, sampleLimit: 25 })).toEqual({
      target_router_id: 1,
      sample_limit: 25,
    });
    expect(buildTransferRequest({ targetRouterId: 1, sampleLimit: 500 })).toEqual({
      target_router_id: 1,
      sample_limit: 100,
    });
    expect(buildTransferRequest({ targetRouterId: 1 })).toEqual({ target_router_id: 1 });
  });

  it('combines all flags', () => {
    expect(
      buildTransferRequest({
        targetRouterId: 34,
        apply: true,
        activeOnly: true,
        skipTargetProvision: true,
        sampleLimit: 10,
      }),
    ).toEqual({
      target_router_id: 34,
      apply: true,
      active_only: true,
      skip_target_provision: true,
      sample_limit: 10,
    });
  });
});

describe('eligibleTargetRouters', () => {
  const source = { id: 1, name: 'Source', owner_user_id: 12 };
  const sameOwner = { id: 2, name: 'Same owner', owner_user_id: 12 };
  const otherOwner = { id: 3, name: 'Other owner', owner_user_id: 99 };
  const unknownOwner = { id: 4, name: 'Unknown owner' };

  it('excludes the source router by id', () => {
    const result = eligibleTargetRouters([source, sameOwner], source);
    expect(result.map((r) => r.id)).toEqual([2]);
  });

  it('filters to the same owner when both owners are known', () => {
    const result = eligibleTargetRouters([source, sameOwner, otherOwner], source);
    expect(result.map((r) => r.id)).toEqual([2]);
  });

  it('includes routers whose owner is unknown rather than over-filtering', () => {
    const result = eligibleTargetRouters([source, sameOwner, unknownOwner], source);
    expect(result.map((r) => r.id).sort()).toEqual([2, 4]);
  });

  it('does not filter by owner when the source owner is unknown', () => {
    const unknownSource = { id: 1, name: 'Source' };
    const result = eligibleTargetRouters([unknownSource, sameOwner, otherOwner], unknownSource);
    expect(result.map((r) => r.id).sort()).toEqual([2, 3]);
  });
});

describe('transfer outcome derivation', () => {
  const report = (over: Record<string, unknown>) => ({
    dry_run: true,
    has_errors: false,
    success: true,
    ...over,
  });

  it('previewReady is true for a clean dry-run', () => {
    const res = { success: true, report: report({ dry_run: true, has_errors: false }) };
    expect(transferPreviewReady(res)).toBe(true);
    expect(transferApplied(res)).toBe(false);
    expect(transferHasErrors(res)).toBe(false);
  });

  it('previewReady is false when the report has errors', () => {
    const res = { success: true, report: report({ dry_run: true, has_errors: true }) };
    expect(transferPreviewReady(res)).toBe(false);
    expect(transferHasErrors(res)).toBe(true);
  });

  it('previewReady is false when the top-level call did not succeed', () => {
    const res = { success: false, report: report({ dry_run: true, has_errors: false }) };
    expect(transferPreviewReady(res)).toBe(false);
    expect(transferHasErrors(res)).toBe(true);
  });

  it('applied is true after a clean non-dry-run', () => {
    const res = { success: true, report: report({ dry_run: false, has_errors: false }) };
    expect(transferApplied(res)).toBe(true);
    expect(transferPreviewReady(res)).toBe(false);
  });

  it('applied is false when an applied run reports errors', () => {
    const res = { success: true, report: report({ dry_run: false, has_errors: true }) };
    expect(transferApplied(res)).toBe(false);
    expect(transferHasErrors(res)).toBe(true);
  });
});
