// BLIND, IDENTIFIER-NEUTRAL EVALUATION, as a ModelPromote evaluator.
//
// This is one of the two controls the original reference implementation had that
// ModelPromote deliberately does not own: ModelPromote runs the migration lifecycle, and leaves
// "how good is this output" to an evaluator the adopter supplies. This is that evaluator.
//
// BLINDNESS IS STRUCTURAL. `scoreCase` receives an output and an expectation and nothing
// else. There is no parameter through which a model's identity could reach the scoring, so
// a scoring bug cannot quietly favour a preferred model. The identity is attached to the
// result only after every case has been scored, because ModelPromote requires the result
// to name the model it describes.
//
// A CRITICAL failure is under-escalation: a note that warranted "high" drafted as anything
// less. Over-escalation costs a reviewer a minute; under-escalation can leave a cracked
// guard in service. The acceptance policy treats the two differently for that reason.

import type { CaseResult, EvaluationCase, EvaluationResult, Evaluator, ModelAdapter } from 'modelpromote';
import type { ExpectedOutcome, MaintenanceDraft } from '../types.ts';

export interface CaseScore {
  readonly passed: boolean;
  readonly score: number;
  readonly critical: boolean;
}

function parseDraft(output: string): MaintenanceDraft | null {
  try {
    const d = JSON.parse(output) as Partial<MaintenanceDraft>;
    if (typeof d.severity !== 'string' || !Array.isArray(d.recommendedChecks)) return null;
    return d as MaintenanceDraft;
  } catch {
    return null;
  }
}

/**
 * Score one output against one expectation. Deliberately takes NO model identifier.
 *
 * Half the score is severity, half is recall of the checks a reviewer would require, and
 * each recommended check nobody asked for costs a quarter. A case passes only when
 * severity is right, every required check is present and nothing spurious is. An output
 * that cannot be read is a failed case, never a crash: a malformed answer is evidence too.
 */
export function scoreCase(output: string, expectedJson: string): CaseScore {
  const expected = JSON.parse(expectedJson) as ExpectedOutcome;
  const draft = parseDraft(output);
  if (draft === null) return { passed: false, score: 0, critical: expected.severity === 'high' };

  const severityCorrect = draft.severity === expected.severity;
  const got = new Set(draft.recommendedChecks);
  const recall = expected.requiredChecks.length === 0
    ? 1
    : expected.requiredChecks.filter((c) => got.has(c)).length / expected.requiredChecks.length;
  const spurious = [...got].filter((c) => !expected.requiredChecks.includes(c)).length;

  const raw = (severityCorrect ? 0.5 : 0) + 0.5 * recall - 0.25 * spurious;
  return {
    passed: severityCorrect && recall === 1 && spurious === 0,
    score: Math.min(1, Math.max(0, raw)),
    critical: expected.severity === 'high' && draft.severity !== 'high',
  };
}

export class BlindEvaluator implements Evaluator {
  readonly name = 'blind maintenance-draft evaluator';

  async evaluate(adapter: ModelAdapter, cases: readonly EvaluationCase[]): Promise<EvaluationResult> {
    // Generate first, then score, then attach the identity. The scoring loop below never
    // touches `adapter`.
    const outputs: string[] = [];
    for (const c of cases) outputs.push(await adapter.complete(c.input));

    const results: CaseResult[] = [];
    const criticalFailures: string[] = [];
    cases.forEach((c, i) => {
      const output = outputs[i] ?? '';
      const s = scoreCase(output, c.expected);
      results.push({ caseId: c.id, output, passed: s.passed, score: s.score });
      if (s.critical) criticalFailures.push(c.id);
    });

    const total = results.reduce((sum, r) => sum + r.score, 0);
    return {
      modelId: adapter.id,
      casesRun: results.length,
      passed: results.filter((r) => r.passed).length,
      score: results.length === 0 ? 0 : total / results.length,
      criticalFailures,
      results,
    };
  }
}
