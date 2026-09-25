import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { ModelAdapter } from 'modelpromote';
import { BlindEvaluator, scoreCase } from '../src/evaluation/blindEvaluator.ts';
import { evaluationCases } from '../src/wiring.ts';
import { BASELINE_MODEL, CANDIDATE_ALPHA, CANDIDATE_BETA } from '../src/provider/syntheticProvider.ts';
import { freshStudy } from './helpers.ts';

const cases = evaluationCases();

async function scoreOf(id: string) {
  const { study, dispose } = freshStudy();
  try {
    return await new BlindEvaluator().evaluate(study.ports.models.get(id)!, cases);
  } finally {
    dispose();
  }
}

describe('blind evaluator', () => {
  test('separates the three models with exact, hand-checkable scores', async () => {
    assert.equal((await scoreOf(BASELINE_MODEL)).score, 0.8);
    assert.equal((await scoreOf(CANDIDATE_ALPHA)).score, 0.6);
    assert.equal((await scoreOf(CANDIDATE_BETA)).score, 0.85);
  });

  test('flags under-escalation of a high-severity note as critical, and only that', async () => {
    assert.deepEqual([...(await scoreOf(CANDIDATE_ALPHA)).criticalFailures], ['SYN-002', 'SYN-005']);
    assert.deepEqual([...(await scoreOf(BASELINE_MODEL)).criticalFailures], ['SYN-005']);
    // Beta over-escalates the "no leak" note. That costs score, but it is not critical.
    const beta = await scoreOf(CANDIDATE_BETA);
    assert.deepEqual([...beta.criticalFailures], []);
    assert.equal(beta.results.find((r) => r.caseId === 'SYN-003')!.passed, false);
  });

  test('is blind: renaming the model changes nothing but the name on the result', async () => {
    const { study, dispose } = freshStudy();
    try {
      const real = study.ports.models.get(CANDIDATE_BETA)!;
      const renamed: ModelAdapter = { id: 'an-unfamiliar-name', complete: (i) => real.complete(i) };
      const a = await new BlindEvaluator().evaluate(real, cases);
      const b = await new BlindEvaluator().evaluate(renamed, cases);
      assert.equal(b.modelId, 'an-unfamiliar-name');
      assert.deepEqual({ ...a, modelId: null }, { ...b, modelId: null });
    } finally {
      dispose();
    }
  });

  test('the scoring function takes no model identity at all', () => {
    assert.equal(scoreCase.length, 2);
  });

  test('returns exactly one result per submitted case, in order', async () => {
    const r = await scoreOf(CANDIDATE_BETA);
    assert.deepEqual(r.results.map((x) => x.caseId), cases.map((c) => c.id));
    assert.equal(r.casesRun, cases.length);
    assert.equal(r.passed, r.results.filter((x) => x.passed).length);
  });

  test('an unreadable output is a failed case, and critical when the note warranted high', () => {
    const high = JSON.stringify({ caseId: 'X', severity: 'high', requiredChecks: [] });
    const low = JSON.stringify({ caseId: 'Y', severity: 'low', requiredChecks: [] });
    assert.deepEqual(scoreCase('not json', high), { passed: false, score: 0, critical: true });
    assert.deepEqual(scoreCase('{"severity":"low"}', low), { passed: false, score: 0, critical: false });
  });
});
