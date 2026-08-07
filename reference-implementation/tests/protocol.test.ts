import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { resolvePrimaryModel, resolveRollbackModel, UnknownModelError, type RuntimeConfig } from '../src/config/resolver.ts';
import { knownModelIds, adapterFor } from '../src/models/registry.ts';
import { CRITERIA, criteriaLockHash, evaluate } from '../src/acceptance/criteria.ts';
import { runBenchmark } from '../src/benchmark/run.ts';
import { activate, ActivationRefused, readState, recordAcceptance, servingModel, engageKillSwitch } from '../src/activation/flag.ts';
import { runSmoke, InvalidSmokeBounds, DEFAULT_BOUNDS } from '../src/smoke/run.ts';
import type { ModelAdapter } from '../src/types.ts';
import { assertServingModel, readAll } from '../src/telemetry/log.ts';
import { exerciseRollback } from '../src/rollback/exercise.ts';
import { finalise, review, UnreviewedActionError } from '../src/review/humanGate.ts';
import { loadNotes, loadExpected } from '../src/fixtures.ts';

let dir: string;
let statePath: string;
let logPath: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pmm-'));
  statePath = join(dir, 'activation.json');
  logPath = join(dir, 'telemetry.jsonl');
});

// Every test creates its own temporary directory, so every test must remove its own.
// A single after() hook only ever sees the LAST directory and leaks all the others.
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const CONFIG: RuntimeConfig = { primaryModel: 'synthetic-candidate-alpha', rollbackModel: 'synthetic-candidate-alpha' };

describe('configuration-authoritative resolution', () => {
  test('resolves the serving model from configuration', () => {
    assert.equal(resolvePrimaryModel(CONFIG, knownModelIds()), 'synthetic-candidate-alpha');
    assert.equal(resolveRollbackModel(CONFIG, knownModelIds()), 'synthetic-candidate-alpha');
  });

  test('rejects an unknown model instead of silently defaulting', () => {
    const bad: RuntimeConfig = { primaryModel: 'model-that-does-not-exist', rollbackModel: 'synthetic-candidate-alpha' };
    assert.throws(() => resolvePrimaryModel(bad, knownModelIds()), UnknownModelError);
  });
});

describe('predeclared acceptance criteria', () => {
  test('enforces the severity threshold', () => {
    const failing = evaluate({ severityCorrect: 1, checksRecalled: 0.9, checksSpurious: 0, total: 0.2 }, 5);
    assert.equal(failing.accepted, false);
    assert.ok(failing.reasons.some((r) => r.includes('severity accuracy')));
    const passing = evaluate({ severityCorrect: 5, checksRecalled: 0.9, checksSpurious: 0, total: 1 }, 5);
    assert.equal(passing.accepted, true);
  });

  test('the criteria lock hash changes if the bar is moved', () => {
    const before = criteriaLockHash();
    const moved = criteriaLockHash({ ...CRITERIA, minSeverityAccuracy: 0.1 });
    assert.notEqual(before, moved, 'moving the bar must be visible in the lock hash');
  });
});

describe('benchmark determinism and blindness', () => {
  test('is deterministic across runs', () => {
    const a = runBenchmark(loadNotes(), loadExpected());
    const b = runBenchmark(loadNotes(), loadExpected());
    assert.deepEqual(a.results, b.results);
    assert.equal(a.fixtureSetHash, b.fixtureSetHash);
  });

  test('scores under identifier-neutral labels', () => {
    const r = runBenchmark(loadNotes(), loadExpected());
    for (const res of r.results) {
      assert.match(res.blindLabel, /^candidate-[A-Z]$/);
      assert.ok(!res.blindLabel.includes('synthetic'), 'blind label must not carry the model identifier');
    }
    assert.equal(Object.keys(r.unblinded).length, r.results.length);
  });
});

describe('staged activation', () => {
  test('is blocked before acceptance (fail-closed)', () => {
    assert.throws(() => activate(statePath, 'synthetic-candidate-beta', 'synthetic-candidate-alpha'), ActivationRefused);
  });

  test('is allowed after acceptance of that exact candidate', () => {
    recordAcceptance(statePath, 'synthetic-candidate-beta', criteriaLockHash());
    const s = activate(statePath, 'synthetic-candidate-beta', 'synthetic-candidate-alpha');
    assert.equal(s.activatedModel, 'synthetic-candidate-beta');
    assert.equal(s.previousModel, 'synthetic-candidate-alpha');
  });

  test('refuses a candidate other than the accepted one', () => {
    recordAcceptance(statePath, 'synthetic-candidate-beta', criteriaLockHash());
    assert.throws(() => activate(statePath, 'synthetic-candidate-alpha', 'synthetic-candidate-alpha'), ActivationRefused);
  });

  test('a malformed state file fails closed on activation and open on the kill switch', () => {
    writeFileSync(statePath, '{ not valid json', 'utf8');
    const s = readState(statePath);
    assert.equal(s.activatedModel, null, 'unreadable state must not read as activated');
    assert.equal(s.killed, false, 'unreadable state must not read as killed');
  });

  test('the kill switch routes serving back to the rollback target', () => {
    recordAcceptance(statePath, 'synthetic-candidate-beta', criteriaLockHash());
    activate(statePath, 'synthetic-candidate-beta', 'synthetic-candidate-alpha');
    const killed = engageKillSwitch(statePath);
    assert.equal(servingModel(killed, 'synthetic-candidate-beta', 'synthetic-candidate-alpha'), 'synthetic-candidate-alpha');
  });
});

describe('bounded smoke', () => {
  // The ceiling is proven by submitting MORE notes than the limit and showing that the
  // notes beyond the limit were never processed. This test fails against an implementation
  // that pre-slices its input, because such an implementation reports plan-complete.
  test('stops at the ceiling and leaves every note beyond it unprocessed', () => {
    const notes = loadNotes();
    const ceiling = 2;
    assert.ok(notes.length > ceiling, `fixture set must exceed the ceiling to exercise it (have ${notes.length})`);

    const res = runSmoke(notes, 'synthetic-candidate-beta', logPath, { maxCalls: ceiling, maxConsecutiveFailures: 1 });

    assert.equal(res.stoppedBy, 'ceiling', 'the loop must report the ceiling as the stop reason');
    assert.equal(res.callsMade, ceiling, 'exactly maxCalls model invocations');
    assert.equal(res.fixturesAvailable, notes.length);
    assert.equal(res.truncated, true, 'truncation must be reported, never silent');

    const rows = readAll(logPath);
    assert.equal(rows.length, ceiling, 'exactly maxCalls telemetry rows');

    const expectedIds = notes.slice(0, ceiling).map((n) => n.caseId);
    assert.deepEqual(res.processedCaseIds, expectedIds);
    assert.deepEqual(rows.map((r) => r.caseId), expectedIds);

    for (const beyond of notes.slice(ceiling)) {
      assert.ok(!res.processedCaseIds.includes(beyond.caseId), `${beyond.caseId} is beyond the ceiling and must not be processed`);
      assert.ok(!rows.some((r) => r.caseId === beyond.caseId), `${beyond.caseId} must not appear in telemetry`);
    }
  });

  test('completes the plan when the ceiling exceeds the fixture count', () => {
    const notes = loadNotes();
    const res = runSmoke(notes, 'synthetic-candidate-beta', logPath, { maxCalls: notes.length + 5, maxConsecutiveFailures: 1 });
    assert.equal(res.stoppedBy, 'plan-complete');
    assert.equal(res.callsMade, notes.length);
    assert.equal(res.truncated, false);
  });

  // The implementation itself must reject the bounds. This test never throws the exception
  // it is asserting on: a test that raises its own expected error proves nothing about the
  // system under test.
  test('rejects invalid bounds itself, before any model call or telemetry write', () => {
    assert.throws(
      () => runSmoke(loadNotes(), 'synthetic-candidate-beta', logPath, { maxCalls: 0, maxConsecutiveFailures: 1 }),
      InvalidSmokeBounds,
      'a zero ceiling is not a usable budget',
    );
    assert.equal(readAll(logPath).length, 0, 'invalid bounds must produce no telemetry at all');

    assert.throws(() => runSmoke(loadNotes(), 'synthetic-candidate-beta', logPath, { maxCalls: -1, maxConsecutiveFailures: 1 }), InvalidSmokeBounds);
    assert.throws(() => runSmoke(loadNotes(), 'synthetic-candidate-beta', logPath, { maxCalls: 2.5, maxConsecutiveFailures: 1 }), InvalidSmokeBounds);
    assert.throws(() => runSmoke(loadNotes(), 'synthetic-candidate-beta', logPath, { maxCalls: 2, maxConsecutiveFailures: -1 }), InvalidSmokeBounds);
    assert.equal(readAll(logPath).length, 0);
  });

  // Without an injectable adapter this union member would be unreachable, and an
  // unreachable stop reason is an untested claim about how the run ends.
  test('stops on consecutive failures before the ceiling is reached', () => {
    const alwaysEmpty: ModelAdapter = {
      id: 'synthetic-candidate-beta',
      draft: (note) => ({
        caseId: note.caseId,
        servedBy: 'synthetic-candidate-beta',
        summary: '   ',
        severity: 'low',
        recommendedChecks: [],
      }),
    };
    const notes = loadNotes();
    const res = runSmoke(notes, 'synthetic-candidate-beta', logPath, { maxCalls: notes.length, maxConsecutiveFailures: 1 }, alwaysEmpty);
    assert.equal(res.stoppedBy, 'failure-stop');
    assert.equal(res.callsMade, 2, 'stops on the call after the tolerance is exhausted');
    assert.ok(res.callsMade < notes.length, 'the failure stop must fire before the ceiling');
    assert.equal(res.truncated, true);
  });
});

describe('telemetry assertion', () => {
  test('confirms which model served', () => {
    runSmoke(loadNotes(), 'synthetic-candidate-beta', logPath, DEFAULT_BOUNDS);
    const a = assertServingModel(logPath, 'synthetic-candidate-beta');
    assert.equal(a.confirmed, true);
    assert.deepEqual(a.observed, ['synthetic-candidate-beta']);
  });

  test('an empty log is not confirmation', () => {
    const a = assertServingModel(logPath, 'synthetic-candidate-beta');
    assert.equal(a.confirmed, false);
    assert.equal(a.rowsInspected, 0);
  });

  test('detects a model other than the expected one serving', () => {
    runSmoke(loadNotes(), 'synthetic-candidate-alpha', logPath, DEFAULT_BOUNDS);
    assert.equal(assertServingModel(logPath, 'synthetic-candidate-beta').confirmed, false);
  });
});

describe('rollback', () => {
  test('restores the rollback target without a code release', () => {
    recordAcceptance(statePath, 'synthetic-candidate-beta', criteriaLockHash());
    activate(statePath, 'synthetic-candidate-beta', 'synthetic-candidate-alpha');
    const out = exerciseRollback(statePath, 'synthetic-candidate-alpha');
    assert.equal(out.revertedFrom, 'synthetic-candidate-beta');
    assert.equal(out.revertedTo, 'synthetic-candidate-alpha');
    assert.equal(out.viaCodeRelease, false);
    assert.equal(readState(statePath).activatedModel, 'synthetic-candidate-alpha');
  });
});

describe('human review', () => {
  test('an unreviewed draft cannot reach a terminal state', () => {
    assert.throws(() => finalise(null, 'SYN-001'), UnreviewedActionError);
  });

  test('a reviewed draft carries the decision and the reviewer', () => {
    const notes = loadNotes();
    const first = notes[0];
    assert.ok(first);
    const draft = adapterFor('synthetic-candidate-beta').draft(first);
    const out = finalise(review(draft, 'accepted', 'reviewer-1'), first.caseId);
    assert.match(out, /accepted by reviewer-1/);
    const rejected = finalise(review(draft, 'rejected', 'reviewer-1'), first.caseId);
    assert.match(rejected, /no action taken/);
  });
});

describe('fixture and output schema', () => {
  test('every fixture note has a matching expectation', () => {
    const notes = loadNotes(); const expected = loadExpected();
    assert.equal(notes.length, expected.length);
    for (const n of notes) assert.ok(expected.some((e) => e.caseId === n.caseId), `missing expectation for ${n.caseId}`);
  });

  test('drafts conform to the output schema', () => {
    for (const n of loadNotes()) {
      const d = adapterFor('synthetic-candidate-beta').draft(n);
      assert.equal(d.caseId, n.caseId);
      assert.ok(['low', 'medium', 'high'].includes(d.severity));
      assert.ok(Array.isArray(d.recommendedChecks));
      assert.equal(typeof d.summary, 'string');
      assert.ok(d.summary.length > 0);
    }
  });
});
