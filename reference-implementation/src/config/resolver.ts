// CONFIGURATION-AUTHORITATIVE MODEL RESOLUTION.
//
// The serving model identity is resolved from configuration at run time. There is no
// model literal at any call site. An unknown identifier is rejected rather than
// silently defaulted, because a silent default is indistinguishable from a successful
// migration until telemetry contradicts it.

import type { ModelId } from '../types.ts';

export class UnknownModelError extends Error {
  readonly requested: string;
  readonly known: readonly string[];
  constructor(requested: string, known: readonly string[]) {
    super(`Unknown model identifier "${requested}". Known: ${known.join(', ')}`);
    this.name = 'UnknownModelError';
    this.requested = requested;
    this.known = known;
  }
}

export interface RuntimeConfig {
  /** The model configured to serve the primary drafting path. */
  readonly primaryModel: ModelId;
  /** The retained rollback target. Reversion is a config change, not a code release. */
  readonly rollbackModel: ModelId;
}

/**
 * Resolve the serving model from configuration.
 * `known` is supplied by the caller so the resolver has no ambient knowledge of a registry.
 */
export function resolvePrimaryModel(config: RuntimeConfig, known: readonly ModelId[]): ModelId {
  if (!known.includes(config.primaryModel)) {
    throw new UnknownModelError(config.primaryModel, known);
  }
  return config.primaryModel;
}

export function resolveRollbackModel(config: RuntimeConfig, known: readonly ModelId[]): ModelId {
  if (!known.includes(config.rollbackModel)) {
    throw new UnknownModelError(config.rollbackModel, known);
  }
  return config.rollbackModel;
}
