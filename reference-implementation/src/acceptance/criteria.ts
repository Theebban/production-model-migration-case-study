// PREDECLARED ACCEPTANCE CRITERIA.
//
// The criteria are declared and hashed BEFORE any candidate is scored. The lock hash is
// carried in the benchmark report, so a later reader can tell whether the bar was moved
// to fit the result. Moving the bar afterwards changes the hash and is therefore visible.

import { createHash } from 'node:crypto';
import type { ScoreBreakdown } from '../types.ts';

export interface AcceptanceCriteria {
  readonly minSeverityAccuracy: number;
  readonly minCheckRecall: number;
  readonly maxSpuriousChecksPerCase: number;
}

export const CRITERIA: AcceptanceCriteria = Object.freeze({
  minSeverityAccuracy: 0.75,
  minCheckRecall: 0.6,
  maxSpuriousChecksPerCase: 1.0,
});

/** Stable hash of the criteria, computed from canonical JSON. */
export function criteriaLockHash(criteria: AcceptanceCriteria = CRITERIA): string {
  const canonical = JSON.stringify(
    Object.fromEntries(Object.entries(criteria).sort(([a], [b]) => a.localeCompare(b))),
  );
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

export interface AcceptanceVerdict {
  readonly accepted: boolean;
  readonly reasons: readonly string[];
}

export function evaluate(
  score: ScoreBreakdown,
  casesScored: number,
  criteria: AcceptanceCriteria = CRITERIA,
): AcceptanceVerdict {
  const reasons: string[] = [];
  const severityAccuracy = casesScored === 0 ? 0 : score.severityCorrect / casesScored;
  const spuriousPerCase = casesScored === 0 ? Number.POSITIVE_INFINITY : score.checksSpurious / casesScored;

  if (severityAccuracy < criteria.minSeverityAccuracy) {
    reasons.push(`severity accuracy ${severityAccuracy.toFixed(2)} below ${criteria.minSeverityAccuracy}`);
  }
  if (score.checksRecalled < criteria.minCheckRecall) {
    reasons.push(`check recall ${score.checksRecalled.toFixed(2)} below ${criteria.minCheckRecall}`);
  }
  if (spuriousPerCase > criteria.maxSpuriousChecksPerCase) {
    reasons.push(`spurious checks ${spuriousPerCase.toFixed(2)} per case above ${criteria.maxSpuriousChecksPerCase}`);
  }
  return { accepted: reasons.length === 0, reasons };
}
