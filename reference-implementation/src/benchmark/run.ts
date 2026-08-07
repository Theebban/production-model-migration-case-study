// COMPARATIVE MODEL BENCHMARK.
//
// Candidates are scored against frozen synthetic fixtures under identifier-neutral
// ("blind") labels, so a scoring bug cannot silently favour a preferred identifier. The
// unblinding map is emitted only after every candidate has been scored.

import { createHash } from 'node:crypto';
import type {
  BenchmarkReport, CandidateResult, ExpectedOutcome, MaintenanceNote, ScoreBreakdown,
} from '../types.ts';
import { allAdapters } from '../models/registry.ts';
import { criteriaLockHash } from '../acceptance/criteria.ts';

export function fixtureSetHash(notes: readonly MaintenanceNote[], expected: readonly ExpectedOutcome[]): string {
  return createHash('sha256')
    .update(JSON.stringify({ notes, expected }))
    .digest('hex')
    .slice(0, 16);
}

function scoreCandidate(
  draftFor: (n: MaintenanceNote) => { severity: string; recommendedChecks: readonly string[] },
  notes: readonly MaintenanceNote[],
  expected: readonly ExpectedOutcome[],
): ScoreBreakdown {
  let severityCorrect = 0;
  let recallSum = 0;
  let spurious = 0;

  for (const note of notes) {
    const exp = expected.find((e) => e.caseId === note.caseId);
    if (!exp) continue;
    const out = draftFor(note);
    if (out.severity === exp.severity) severityCorrect += 1;
    const got = new Set(out.recommendedChecks);
    const required = exp.requiredChecks;
    const hit = required.filter((r) => got.has(r)).length;
    recallSum += required.length === 0 ? 1 : hit / required.length;
    spurious += [...got].filter((g) => !required.includes(g)).length;
  }
  const n = notes.length || 1;
  return {
    severityCorrect,
    checksRecalled: recallSum / n,
    checksSpurious: spurious,
    total: severityCorrect / n,
  };
}

/** Deterministic blind label derived from position, never from the model identifier. */
function blindLabel(index: number): string {
  return `candidate-${String.fromCharCode(65 + index)}`;
}

export function runBenchmark(
  notes: readonly MaintenanceNote[],
  expected: readonly ExpectedOutcome[],
): BenchmarkReport {
  const adapters = allAdapters();
  const unblinded: Record<string, string> = {};
  const results: CandidateResult[] = adapters.map((adapter, i) => {
    const label = blindLabel(i);
    unblinded[label] = adapter.id;
    return {
      blindLabel: label,
      score: scoreCandidate((n) => adapter.draft(n), notes, expected),
      casesScored: notes.length,
    };
  });
  return {
    criteriaLockHash: criteriaLockHash(),
    fixtureSetHash: fixtureSetHash(notes, expected),
    results,
    unblinded,
  };
}
