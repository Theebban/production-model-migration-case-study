// Shared types for the synthetic reference implementation.
// Domain: industrial maintenance-report drafting and review (fictional).

export type ModelId = string;

/** A synthetic maintenance note submitted by a technician. */
export interface MaintenanceNote {
  readonly caseId: string;
  readonly asset: string;
  readonly rawNote: string;
}

/** The structured summary a model proposes. Never acted on automatically. */
export interface MaintenanceDraft {
  readonly caseId: string;
  readonly servedBy: ModelId;
  readonly summary: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly recommendedChecks: readonly string[];
}

/** Expected values for a fixture, used to score a candidate. */
export interface ExpectedOutcome {
  readonly caseId: string;
  readonly severity: MaintenanceDraft['severity'];
  readonly requiredChecks: readonly string[];
}

/** A model adapter. Deterministic and offline: no network, no credentials. */
export interface ModelAdapter {
  readonly id: ModelId;
  draft(note: MaintenanceNote): MaintenanceDraft;
}

export interface ScoreBreakdown {
  readonly severityCorrect: number;
  readonly checksRecalled: number;
  readonly checksSpurious: number;
  readonly total: number;
}

export interface CandidateResult {
  readonly blindLabel: string;
  readonly score: ScoreBreakdown;
  readonly casesScored: number;
}

export interface BenchmarkReport {
  readonly criteriaLockHash: string;
  readonly fixtureSetHash: string;
  readonly results: readonly CandidateResult[];
  readonly unblinded: Readonly<Record<string, ModelId>>;
}
