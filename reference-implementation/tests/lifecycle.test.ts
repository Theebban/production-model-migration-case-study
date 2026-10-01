// The synthetic migration lifecycle, delegated to ModelPromote, against the synthetic application.
// Each test drives one failure a real migration can meet and asserts the specific refusal
// AND the state it leaves, because "it threw" can pass for the wrong reason.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ActivationNotConfirmedError, BaselineDriftError, IllegalTransitionError, StalePolicyEvidenceError,
  activate, approve, decide, evaluate, register, rollback, stabilise, status, verify,
} from 'modelpromote';
import type { Ports } from 'modelpromote';
import { ACCEPTANCE_POLICY, caseStudyConfig, evaluationCases, verificationInputs } from '../src/wiring.ts';
import type { CaseStudy } from '../src/wiring.ts';
import { BASELINE_MODEL, CANDIDATE_ALPHA, CANDIDATE_BETA } from '../src/provider/syntheticProvider.ts';
import { freshStudy, tick } from './helpers.ts';

const config = caseStudyConfig();
const cases = evaluationCases();

async function approvedBeta(study: CaseStudy): Promise<void> {
  const now = tick();
  register(study.root, CANDIDATE_BETA, config, now);
  await evaluate(study.root, cases, config, study.ports);
  assert.equal(decide(study.root, config, now).verdict.accepted, true);
  approve(study.root, 'reviewer', config, now);
}

describe('governed migration, happy path', () => {
  test('accepted, approved, activated by read-back, verified from telemetry, stabilised', async () => {
    const { study, dispose } = freshStudy();
    try {
      await approvedBeta(study);
      const a = await activate(study.root, 'operator', study.ports);
      assert.equal(a.observed, CANDIDATE_BETA);
      const v = await verify(study.root, verificationInputs(), config, study.ports);
      assert.equal(v.assertion.confirmed, true);
      assert.equal(v.run.requestsMade, 3);
      assert.equal(v.run.truncated, true);
      stabilise(study.root, 'operator', tick());
      assert.equal(status(study.root).state, 'STABLE');
      assert.equal(study.target.read(), CANDIDATE_BETA);
    } finally { dispose(); }
  });

  test('the rollback drill restores the target locked at register, confirmed by read-back', async () => {
    const { study, dispose } = freshStudy();
    try {
      await approvedBeta(study);
      await activate(study.root, 'operator', study.ports);
      await verify(study.root, verificationInputs(), config, study.ports);
      const rb = await rollback(study.root, 'operator', config, study.ports);
      assert.equal(rb.confirmed, true);
      assert.equal(rb.state, 'ROLLED_BACK');
      assert.equal(study.target.read(), BASELINE_MODEL);
    } finally { dispose(); }
  });
});

describe('governed migration, refusals', () => {
  test('a candidate that fails the declared policy is REJECTED, on every failing rule', async () => {
    const { study, dispose } = freshStudy();
    try {
      const now = tick();
      register(study.root, CANDIDATE_ALPHA, config, now);
      await evaluate(study.root, cases, config, study.ports);
      const d = decide(study.root, config, now);
      assert.equal(d.verdict.accepted, false);
      assert.equal(d.verdict.reasons.length, 4);
      assert.equal(status(study.root).state, 'REJECTED');
      await assert.rejects(activate(study.root, 'operator', study.ports), IllegalTransitionError);
      assert.equal(study.target.read(), BASELINE_MODEL);
    } finally { dispose(); }
  });

  test('activation before a human approves is refused and changes nothing', async () => {
    const { study, dispose } = freshStudy();
    try {
      const now = tick();
      register(study.root, CANDIDATE_BETA, config, now);
      await evaluate(study.root, cases, config, study.ports);
      decide(study.root, config, now);
      await assert.rejects(activate(study.root, 'operator', study.ports), IllegalTransitionError);
      assert.equal(status(study.root).state, 'ACCEPTED');
      assert.equal(study.target.read(), BASELINE_MODEL);
    } finally { dispose(); }
  });

  test('moving the bar after seeing the score is refused', async () => {
    const { study, dispose } = freshStudy();
    try {
      const now = tick();
      register(study.root, CANDIDATE_BETA, config, now);
      await evaluate(study.root, cases, config, study.ports);
      const moved = caseStudyConfig({ ...ACCEPTANCE_POLICY, minScore: 0.5 });
      assert.throws(() => decide(study.root, moved, now), StalePolicyEvidenceError);
      assert.equal(status(study.root).state, 'EVALUATED');
    } finally { dispose(); }
  });

  test('a configuration write that silently changes nothing is caught by read-back', async () => {
    const { study, dispose } = freshStudy();
    try {
      await approvedBeta(study);
      const noOp: Ports = { ...study.ports, activation: { name: 'broken writer', read: () => study.target.read(), write: () => {} } };
      await assert.rejects(activate(study.root, 'operator', noOp), ActivationNotConfirmedError);
      assert.equal(status(study.root).state, 'ACTIVATION_FAILED');
      assert.equal(study.target.read(), BASELINE_MODEL);
    } finally { dispose(); }
  });

  test('production drifting away from the measured baseline blocks activation before any write', async () => {
    const { study, dispose } = freshStudy();
    try {
      await approvedBeta(study);
      study.target.write(CANDIDATE_ALPHA);
      await assert.rejects(activate(study.root, 'operator', study.ports), BaselineDriftError);
      assert.equal(status(study.root).state, 'APPROVED');
      assert.equal(study.target.read(), CANDIDATE_ALPHA);
    } finally { dispose(); }
  });

  test('a provider alias that moved after activation fails verification, and rollback still works', async () => {
    const { study, dispose } = freshStudy();
    try {
      await approvedBeta(study);
      await activate(study.root, 'operator', study.ports);
      study.provider.pointAlias(CANDIDATE_BETA, 'synthetic-candidate-beta-snapshot-0901');
      const v = await verify(study.root, verificationInputs(), config, study.ports);
      assert.equal(v.assertion.confirmed, false);
      assert.deepEqual([...v.assertion.observed], ['synthetic-candidate-beta-snapshot-0901']);
      assert.equal(status(study.root).state, 'FAILED_VERIFICATION');
      const rb = await rollback(study.root, 'operator', config, study.ports);
      assert.equal(rb.confirmed, true);
      assert.equal(study.target.read(), BASELINE_MODEL);
    } finally { dispose(); }
  });
});
