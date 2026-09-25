// WIRING: the one place this application meets ModelPromote.
//
// ModelPromote owns the lifecycle, the policy decision and the record. This file hands it
// the four things it deliberately does not own: the models, the evaluator, the activation
// target and the telemetry. Nothing else in `src/` imports ModelPromote's engine.

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { initStore } from 'modelpromote';
import type { AcceptancePolicy, EvaluationCase, ModelAdapter, ModelPromoteConfig, Ports } from 'modelpromote';
import type { ModelId } from './types.ts';
import { loadExpected, loadNotes } from './fixtures.ts';
import { BASELINE_MODEL, KNOWN_MODELS, SyntheticProvider } from './provider/syntheticProvider.ts';
import { GenerationLog } from './app/generationLog.ts';
import { modelAdapter } from './app/modelAdapters.ts';
import { RuntimeConfigTarget } from './activation/runtimeConfig.ts';
import { BlindEvaluator } from './evaluation/blindEvaluator.ts';

/**
 * The acceptance policy, declared before any candidate is measured. ModelPromote hashes it
 * when a migration is registered and refuses to decide or approve if it has changed since
 * the evidence was produced, so the bar cannot be moved to fit a result.
 */
export const ACCEPTANCE_POLICY: AcceptancePolicy = Object.freeze({
  minScore: 0.8,
  maxRegression: 0.05,
  // The cracked coupling guard. Whatever else a candidate does, it must get this one right.
  requiredCases: Object.freeze(['SYN-002']),
  allowCriticalFailures: false,
});

export function caseStudyConfig(policy: AcceptancePolicy = ACCEPTANCE_POLICY): ModelPromoteConfig {
  return {
    baselineModel: BASELINE_MODEL,
    rollbackModel: BASELINE_MODEL,
    acceptance: policy,
    // A hard ceiling on verification traffic, smaller than the plan on purpose so the
    // ceiling is exercised: 3 requests against 5 planned, reported as truncated.
    verification: { maxRequests: 3, minObservations: 3 },
  };
}

export function evaluationCases(): readonly EvaluationCase[] {
  const expected = loadExpected();
  return loadNotes().map((note) => {
    const exp = expected.find((e) => e.caseId === note.caseId);
    if (exp === undefined) throw new Error(`fixture ${note.caseId} has no expectation`);
    return { id: note.caseId, input: JSON.stringify(note), expected: JSON.stringify(exp) };
  });
}

/** Verification traffic: traffic this application chose, never a framework default. */
export function verificationInputs(): readonly string[] {
  return loadNotes().map((n) => JSON.stringify(n));
}

export interface CaseStudy {
  readonly root: string;
  readonly ports: Ports;
  readonly provider: SyntheticProvider;
  readonly log: GenerationLog;
  readonly target: RuntimeConfigTarget;
}

/**
 * Build a fresh, self-contained case study under `root`. Production starts out serving the
 * baseline, as it would before any migration.
 */
export function createCaseStudy(root: string, now: () => string = () => new Date().toISOString()): CaseStudy {
  initStore(root);
  const provider = new SyntheticProvider();
  const log = new GenerationLog(join(root, 'generation-log.jsonl'));
  const target = new RuntimeConfigTarget(join(root, 'runtime-config.json'));
  if (!existsSync(join(root, 'runtime-config.json'))) target.write(BASELINE_MODEL);

  const models = new Map<ModelId, ModelAdapter>(KNOWN_MODELS.map((id) => [id, modelAdapter(id, provider, log)]));
  const ports: Ports = {
    models,
    evaluator: new BlindEvaluator(),
    activation: target,
    telemetry: log,
    now,
    verificationPlan: verificationInputs,
  };
  return { root, ports, provider, log, target };
}
