// ROLLBACK EXERCISE.
//
// Reversion is a configuration change, not a code release. This is executable rather than
// asserted: a rollback that has never been run is a claim, not a control.

import type { ModelId } from '../types.ts';
import { readState, writeState, type ActivationState } from '../activation/flag.ts';

export interface RollbackOutcome {
  readonly revertedFrom: ModelId | null;
  readonly revertedTo: ModelId;
  readonly viaCodeRelease: false;
}

export function exerciseRollback(statePath: string, rollbackTarget: ModelId): RollbackOutcome {
  const state = readState(statePath);
  const from = state.activatedModel;
  const next: ActivationState = {
    ...state,
    activatedModel: rollbackTarget,
    previousModel: from,
  };
  writeState(statePath, next);
  return { revertedFrom: from, revertedTo: rollbackTarget, viaCodeRelease: false };
}
