// STAGED ACTIVATION.
//
// Two distinct switches, deliberately asymmetric:
//   ACTIVATION FLAG is FAIL-CLOSED. Absent or unreadable state means NOT activated.
//   KILL SWITCH is FAIL-OPEN. Absent or unreadable state means NOT killed, so a broken
//   state file can never wedge the system into a permanently disabled state.
//
// Activation is refused unless an acceptance verdict for the exact candidate exists.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ModelId } from '../types.ts';

export interface ActivationState {
  readonly activatedModel: ModelId | null;
  readonly previousModel: ModelId | null;
  readonly acceptedCandidate: ModelId | null;
  readonly criteriaLockHash: string | null;
  readonly killed: boolean;
}

const EMPTY: ActivationState = Object.freeze({
  activatedModel: null,
  previousModel: null,
  acceptedCandidate: null,
  criteriaLockHash: null,
  killed: false,
});

export function readState(path: string): ActivationState {
  if (!existsSync(path)) return EMPTY;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<ActivationState>;
    return {
      activatedModel: parsed.activatedModel ?? null,
      previousModel: parsed.previousModel ?? null,
      acceptedCandidate: parsed.acceptedCandidate ?? null,
      criteriaLockHash: parsed.criteriaLockHash ?? null,
      // fail-open: a malformed file must not leave the system killed
      killed: parsed.killed === true,
    };
  } catch {
    return EMPTY;
  }
}

export function writeState(path: string, state: ActivationState): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export class ActivationRefused extends Error {
  constructor(reason: string) {
    super(`Activation refused: ${reason}`);
    this.name = 'ActivationRefused';
  }
}

export function recordAcceptance(path: string, candidate: ModelId, lockHash: string): ActivationState {
  const next: ActivationState = { ...readState(path), acceptedCandidate: candidate, criteriaLockHash: lockHash };
  writeState(path, next);
  return next;
}

/** FAIL-CLOSED: refuses unless this exact candidate was accepted under a recorded lock hash. */
export function activate(path: string, candidate: ModelId, currentPrimary: ModelId): ActivationState {
  const state = readState(path);
  if (state.acceptedCandidate === null) {
    throw new ActivationRefused('no acceptance verdict recorded');
  }
  if (state.acceptedCandidate !== candidate) {
    throw new ActivationRefused(`accepted candidate is "${state.acceptedCandidate}", not "${candidate}"`);
  }
  if (state.criteriaLockHash === null) {
    throw new ActivationRefused('no criteria lock hash recorded');
  }
  const next: ActivationState = { ...state, activatedModel: candidate, previousModel: currentPrimary };
  writeState(path, next);
  return next;
}

/** Effective serving model. FAIL-CLOSED on activation, FAIL-OPEN on the kill switch. */
export function servingModel(state: ActivationState, configuredPrimary: ModelId, rollback: ModelId): ModelId {
  if (state.killed) return rollback;
  return state.activatedModel ?? configuredPrimary;
}

export function engageKillSwitch(path: string): ActivationState {
  const next: ActivationState = { ...readState(path), killed: true };
  writeState(path, next);
  return next;
}
