// A SYNTHETIC MODEL PROVIDER. Deterministic, offline, credential-free.
//
// It stands in for an external provider, including the one property that makes telemetry
// worth having: every response names the model that ACTUALLY served it, and that is not
// always the model that was requested. Real providers resolve a requested name through
// aliases to a concrete snapshot, and an alias can move without any change on your side.
// `pointAlias` reproduces that, so the verification step in this repository can genuinely
// fail rather than confirm by construction.
//
// Each model applies a different hand-written heuristic so that evaluation has something
// real to separate. The fixtures include a note that mentions "no leak, no noise" to make
// keyword matching over-escalate: a deliberate trap, and every model falls into it.

import type { MaintenanceDraft, MaintenanceNote, ModelId, Severity } from '../types.ts';

export const BASELINE_MODEL = 'synthetic-model-2025';
export const CANDIDATE_ALPHA = 'synthetic-candidate-alpha';
export const CANDIDATE_BETA = 'synthetic-candidate-beta';

export const KNOWN_MODELS: readonly ModelId[] = [BASELINE_MODEL, CANDIDATE_ALPHA, CANDIDATE_BETA];

const MEDIUM_SIGNALS = ['wear', 'noise', 'drift', 'seep'];

interface Heuristic {
  /** Signals that make this model escalate. */
  readonly highSignals: readonly string[];
  /** Whether a high signal escalates to "high" or is capped at "medium". */
  readonly escalates: boolean;
  /** The components this model knows to recommend inspecting. */
  readonly checkVocabulary: readonly string[];
}

const HEURISTICS: Readonly<Record<string, Heuristic>> = {
  // Serving today. Escalates on a short list, and misses "overheat".
  [BASELINE_MODEL]: { highSignals: ['crack', 'leak', 'smoke'], escalates: true, checkVocabulary: ['seal', 'bearing', 'coupling'] },
  // Conservative: never escalates beyond medium, and knows fewer components.
  [CANDIDATE_ALPHA]: { highSignals: ['crack', 'leak', 'overheat', 'smoke', 'vibration'], escalates: false, checkVocabulary: ['seal', 'bearing'] },
  // Broader: escalates on the full list and knows more components.
  [CANDIDATE_BETA]: {
    highSignals: ['crack', 'leak', 'overheat', 'smoke', 'vibration'],
    escalates: true,
    checkVocabulary: ['seal', 'bearing', 'coupling', 'gasket'],
  },
};

export class UnknownModelError extends Error {
  readonly requested: string;
  constructor(requested: string) {
    super(`Unknown model "${requested}". Known: ${KNOWN_MODELS.join(', ')}`);
    this.name = 'UnknownModelError';
    this.requested = requested;
  }
}

export interface ProviderResponse {
  readonly draft: MaintenanceDraft;
  /** The model that actually answered, from the provider's own response metadata. */
  readonly servedBy: ModelId;
}

function severityOf(note: string, h: Heuristic): Severity {
  const lower = note.toLowerCase();
  if (h.highSignals.some((s) => lower.includes(s))) return h.escalates ? 'high' : 'medium';
  if (MEDIUM_SIGNALS.some((s) => lower.includes(s))) return 'medium';
  return 'low';
}

function draftWith(h: Heuristic, note: MaintenanceNote): MaintenanceDraft {
  const lower = note.rawNote.toLowerCase();
  return {
    caseId: note.caseId,
    summary: `Asset ${note.asset}: ${note.rawNote.trim().slice(0, 80)}`,
    severity: severityOf(note.rawNote, h),
    recommendedChecks: h.checkVocabulary.filter((c) => lower.includes(c)).map((c) => `inspect-${c}`),
  };
}

export class SyntheticProvider {
  /** requested name -> the snapshot that actually answers. Identity unless an alias moves. */
  private readonly aliases = new Map<ModelId, ModelId>();

  /**
   * Point a requested name at a different snapshot, as a provider does when an alias moves.
   * The snapshot answers with the requested model's behaviour but REPORTS its own identity,
   * which is exactly the situation telemetry exists to catch.
   */
  pointAlias(requested: ModelId, snapshot: ModelId): void {
    this.aliases.set(requested, snapshot);
  }

  respond(requested: ModelId, note: MaintenanceNote): ProviderResponse {
    const h = HEURISTICS[requested];
    if (h === undefined) throw new UnknownModelError(requested);
    return { draft: draftWith(h, note), servedBy: this.aliases.get(requested) ?? requested };
  }
}
