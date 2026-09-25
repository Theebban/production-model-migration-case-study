import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MissingRuntimeConfigError, RuntimeConfigTarget } from '../src/activation/runtimeConfig.ts';
import { UnknownModelError, BASELINE_MODEL, CANDIDATE_BETA } from '../src/provider/syntheticProvider.ts';
import { finalise, review, UnreviewedActionError } from '../src/review/humanGate.ts';
import { loadExpected, loadNotes } from '../src/fixtures.ts';
import type { MaintenanceDraft } from '../src/types.ts';
import { freshStudy } from './helpers.ts';

describe('configuration-authoritative activation target', () => {
  test('production starts on the baseline, read from configuration', () => {
    const { study, dispose } = freshStudy();
    try { assert.equal(study.target.read(), BASELINE_MODEL); } finally { dispose(); }
  });

  test('a write is observable by reading back', () => {
    const { study, dispose } = freshStudy();
    try {
      study.target.write(CANDIDATE_BETA);
      assert.equal(study.target.read(), CANDIDATE_BETA);
    } finally { dispose(); }
  });

  test('refuses to write a model the application cannot serve', () => {
    const { study, dispose } = freshStudy();
    try { assert.throws(() => study.target.write('nonexistent-model'), UnknownModelError); } finally { dispose(); }
  });

  test('a missing configuration fails closed instead of defaulting', () => {
    const { study, dispose } = freshStudy();
    try {
      const orphan = new RuntimeConfigTarget(join(study.root, 'no-such-config.json'));
      assert.throws(() => orphan.read(), MissingRuntimeConfigError);
    } finally { dispose(); }
  });

  test('an unknown configured value fails closed instead of defaulting', () => {
    const { study, dispose } = freshStudy();
    try {
      writeFileSync(join(study.root, 'runtime-config.json'), JSON.stringify({ primaryModel: 'typo-model' }));
      assert.throws(() => study.target.read(), UnknownModelError);
    } finally { dispose(); }
  });
});

describe('generation log as telemetry', () => {
  test('records the model the provider REPORTS, not the one requested', () => {
    const { study, dispose } = freshStudy();
    try {
      study.provider.pointAlias(CANDIDATE_BETA, 'synthetic-candidate-beta-snapshot-0901');
      study.ports.models.get(CANDIDATE_BETA)!.complete(JSON.stringify(loadNotes()[0]));
      const row = study.log.rows().at(-1)!;
      assert.equal(row.requested, CANDIDATE_BETA);
      assert.equal(row.servedBy, 'synthetic-candidate-beta-snapshot-0901');
    } finally { dispose(); }
  });

  test('a window only contains rows recorded after its marker', () => {
    const { study, dispose } = freshStudy();
    try {
      const adapter = study.ports.models.get(BASELINE_MODEL)!;
      const input = JSON.stringify(loadNotes()[0]);
      adapter.complete(input);
      const marker = study.log.rows().at(-1)!.requestId;
      adapter.complete(input);
      adapter.complete(input);
      assert.equal(study.log.observations(marker).length, 2);
      assert.equal(study.log.observations(null).length, 3);
    } finally { dispose(); }
  });
});

describe('per-output human review', () => {
  const draft: MaintenanceDraft = { caseId: 'SYN-002', summary: 'crack on guard', severity: 'high', recommendedChecks: [] };

  test('an unreviewed draft cannot reach a terminal state', () => {
    assert.throws(() => finalise(null, 'SYN-002'), UnreviewedActionError);
  });

  test('a reviewed draft carries the decision, the reviewer and any edit', () => {
    assert.match(finalise(review(draft, 'edited', 'r1', 'edited text'), 'SYN-002'), /edited by r1 :: edited text/);
    assert.match(finalise(review(draft, 'rejected', 'r1'), 'SYN-002'), /rejected by r1, no action taken/);
  });
});

describe('fixtures', () => {
  test('every note has exactly one expectation', () => {
    const notes = loadNotes().map((n) => n.caseId);
    const expected = loadExpected().map((e) => e.caseId);
    assert.deepEqual([...notes].sort(), [...expected].sort());
    assert.equal(new Set(expected).size, expected.length);
  });
});
