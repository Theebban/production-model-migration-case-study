// Shared types for the synthetic application in Layer B.
// Domain: industrial maintenance-report drafting and review (fictional).

import type { ModelId } from 'modelpromote';

export type { ModelId };

export type Severity = 'low' | 'medium' | 'high';

/** A synthetic maintenance note submitted by a technician. */
export interface MaintenanceNote {
  readonly caseId: string;
  readonly asset: string;
  readonly rawNote: string;
}

/** The structured summary a model proposes. Never acted on automatically. */
export interface MaintenanceDraft {
  readonly caseId: string;
  readonly summary: string;
  readonly severity: Severity;
  readonly recommendedChecks: readonly string[];
}

/** What a reviewer would expect for a fixture note. Used only to score candidates. */
export interface ExpectedOutcome {
  readonly caseId: string;
  readonly severity: Severity;
  readonly requiredChecks: readonly string[];
}
