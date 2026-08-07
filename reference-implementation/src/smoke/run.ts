// BOUNDED SYNTHETIC SMOKE.
//
// A small, pre-bounded, fully adjudicated check against synthetic owner-controlled data.
//
// The ceiling is declared BEFORE the run and enforced BY THE LOOP. The full submitted
// sequence is iterated and the ceiling is tested before every model invocation, so the
// bound is a property of the executing code rather than of the caller's arithmetic.
// Pre-slicing the input to the ceiling would make the check unreachable and would move the
// guarantee out of the system under test and into the caller, where no test can reach it.
//
// Reaching the ceiling is a normal, reported outcome, not an exception: the run stops and
// says so. Truncation is always reported, because silent truncation reads as
// "covered everything".

import type { MaintenanceNote, ModelAdapter, ModelId } from '../types.ts';
import { adapterFor } from '../models/registry.ts';
import { record } from '../telemetry/log.ts';

export interface SmokeBounds {
  readonly maxCalls: number;
  readonly maxConsecutiveFailures: number;
}

export const DEFAULT_BOUNDS: SmokeBounds = Object.freeze({ maxCalls: 3, maxConsecutiveFailures: 1 });

/** Raised when the declared bounds are not a usable budget. Raised before any spend. */
export class InvalidSmokeBounds extends Error {
  readonly bounds: SmokeBounds;
  constructor(reason: string, bounds: SmokeBounds) {
    super(`Invalid smoke bounds: ${reason}. No model call and no telemetry write occurred.`);
    this.name = 'InvalidSmokeBounds';
    this.bounds = bounds;
  }
}

export type SmokeStopReason = 'plan-complete' | 'ceiling' | 'failure-stop';

export interface SmokeResult {
  /** How many cases were submitted for consideration. */
  readonly fixturesAvailable: number;
  /** How many model invocations actually happened. Never exceeds bounds.maxCalls. */
  readonly callsMade: number;
  /** True when at least one submitted case was left unprocessed. */
  readonly truncated: boolean;
  readonly stoppedBy: SmokeStopReason;
  readonly servedBy: readonly ModelId[];
  readonly processedCaseIds: readonly string[];
}

function assertValidBounds(bounds: SmokeBounds): void {
  if (!Number.isInteger(bounds.maxCalls) || bounds.maxCalls < 1) {
    throw new InvalidSmokeBounds('maxCalls must be a positive integer', bounds);
  }
  if (!Number.isInteger(bounds.maxConsecutiveFailures) || bounds.maxConsecutiveFailures < 0) {
    throw new InvalidSmokeBounds('maxConsecutiveFailures must be a non-negative integer', bounds);
  }
}

/**
 * Run a bounded smoke over the submitted notes.
 *
 * @param adapter optional injected adapter. The failure-stop path is only reachable with an
 * adapter that can actually fail, so it is injectable rather than unreachable in test.
 */
export function runSmoke(
  notes: readonly MaintenanceNote[],
  servingModel: ModelId,
  logPath: string,
  bounds: SmokeBounds = DEFAULT_BOUNDS,
  adapter?: ModelAdapter,
): SmokeResult {
  // Bounds are validated before anything is resolved, called or written.
  assertValidBounds(bounds);

  const resolved = adapter ?? adapterFor(servingModel);
  const servedBy: ModelId[] = [];
  const processedCaseIds: string[] = [];
  let calls = 0;
  let consecutiveFailures = 0;

  const stop = (stoppedBy: SmokeStopReason): SmokeResult => ({
    fixturesAvailable: notes.length,
    callsMade: calls,
    truncated: calls < notes.length,
    stoppedBy,
    servedBy,
    processedCaseIds,
  });

  // The FULL submitted sequence is iterated. The input is never pre-sliced.
  for (const note of notes) {
    if (calls >= bounds.maxCalls) return stop('ceiling');

    const draft = resolved.draft(note);
    calls += 1;
    servedBy.push(draft.servedBy);
    processedCaseIds.push(note.caseId);
    record(logPath, { seq: calls, caseId: note.caseId, servedBy: draft.servedBy, path: 'primary-drafting' });

    const failed = draft.summary.trim().length === 0;
    consecutiveFailures = failed ? consecutiveFailures + 1 : 0;
    if (consecutiveFailures > bounds.maxConsecutiveFailures) return stop('failure-stop');
  }

  return stop('plan-complete');
}
