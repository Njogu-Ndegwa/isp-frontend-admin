// Pure helpers for the PPPoE router-transfer flow. Kept framework-free so they
// can be unit tested without rendering the modal (see pppoeTransfer.test.ts).
import type { TransferPPPoERequest } from './types';

const MAX_SAMPLE_LIMIT = 100;

export interface BuildTransferRequestOptions {
  targetRouterId: number;
  apply?: boolean;
  activeOnly?: boolean;
  skipTargetProvision?: boolean;
  sampleLimit?: number;
}

/**
 * Build the request body for the transfer endpoint. Falsy/omitted flags are
 * dropped so a preview is just `{ target_router_id }`, matching the backend
 * defaults. `sample_limit` is clamped to the backend cap (100).
 */
export function buildTransferRequest(
  options: BuildTransferRequestOptions,
): TransferPPPoERequest {
  const body: TransferPPPoERequest = { target_router_id: options.targetRouterId };
  if (options.apply) body.apply = true;
  if (options.activeOnly) body.active_only = true;
  if (options.skipTargetProvision) body.skip_target_provision = true;
  if (options.sampleLimit != null) {
    body.sample_limit = Math.min(options.sampleLimit, MAX_SAMPLE_LIMIT);
  }
  return body;
}

export interface TransferRouterLike {
  id: number;
  owner_user_id?: number | null;
}

/**
 * Candidate target routers for a transfer: never the source itself, and — when
 * both owners are known — only routers with the same owner (the backend rejects
 * cross-owner transfers). Routers with an unknown owner are kept rather than
 * hidden, so a valid target is never silently dropped.
 */
export function eligibleTargetRouters<T extends TransferRouterLike>(
  routers: T[],
  source: TransferRouterLike,
): T[] {
  const sourceOwner = source.owner_user_id;
  return routers.filter((router) => {
    if (router.id === source.id) return false;
    if (sourceOwner != null && router.owner_user_id != null && router.owner_user_id !== sourceOwner) {
      return false;
    }
    return true;
  });
}

export interface TransferOutcomeLike {
  success: boolean;
  report?: { dry_run?: boolean; has_errors?: boolean } | null;
}

/** True when the call failed or the report flagged errors (guide rule 7). */
export function transferHasErrors(result: TransferOutcomeLike): boolean {
  return !result.success || result.report?.has_errors === true;
}

/** A clean dry-run that unlocks the Apply button. */
export function transferPreviewReady(result: TransferOutcomeLike): boolean {
  return (
    result.success &&
    result.report?.dry_run === true &&
    result.report?.has_errors !== true
  );
}

/** A committed (non-dry-run) transfer that succeeded without errors. */
export function transferApplied(result: TransferOutcomeLike): boolean {
  return (
    result.success &&
    result.report?.dry_run === false &&
    result.report?.has_errors !== true
  );
}
