// THE WHOLE METHOD, END TO END, OFFLINE: `npm run demo`.
//
// Two migrations against a synthetic application that is serving an older model today.
// The first candidate is rejected by the policy and abandoned. The second is accepted,
// approved by a named person, activated with read-back confirmation, verified from the
// application's own telemetry under a hard traffic ceiling, and then ROLLED BACK as a
// drill, because a rollback that has never been run is a claim rather than a control.
//
// The migration lifecycle is ModelPromote's. Everything this script supplies is either
// the synthetic application or a call into ModelPromote's public API.

import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IllegalTransitionError, abandon, activate, approve, decide, evaluate, readMigration, register,
  renderReport, rollback, status, statusOf, verify,
} from 'modelpromote';
import { CANDIDATE_ALPHA, CANDIDATE_BETA } from './provider/syntheticProvider.ts';
import { caseStudyConfig, createCaseStudy, evaluationCases, verificationInputs } from './wiring.ts';
import { finalise, review } from './review/humanGate.ts';
import type { MaintenanceDraft } from './types.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.artifacts', 'demo');
rmSync(root, { recursive: true, force: true });

const study = createCaseStudy(root);
const config = caseStudyConfig();
const cases = evaluationCases();
const now = study.ports.now;
const say = (s = ''): void => console.log(s);
const step = (s: string): void => say(`\n== ${s}`);

say('Layer B demonstration: the migration method on synthetic data, with its lifecycle delegated to ModelPromote.');
say('This synthetic reference implementation demonstrates a strengthened reusable protocol.');
say('Not every control shown here is asserted to have governed the historical production cutover.');
say(`\nProduction is serving: ${study.target.read()}  (read from runtime configuration)`);

step(`Migration 1: candidate ${CANDIDATE_ALPHA}`);
register(root, CANDIDATE_ALPHA, config, now);
let e = await evaluate(root, cases, config, study.ports);
say(`evaluated blind: candidate ${e.evaluation.candidate.score.toFixed(3)} vs baseline ${e.evaluation.baseline.score.toFixed(3)}, ` +
  `critical failures [${e.evaluation.candidate.criticalFailures.join(', ')}]`);
let d = decide(root, config, now);
say(`policy verdict: ${d.verdict.accepted ? 'ACCEPTED' : 'REJECTED'}`);
for (const r of d.verdict.reasons) say(`  - ${r}`);
abandon(root, 'demo-reviewer', 'rejected by the declared policy', now);
say(`closed as ${status(root).state ?? 'no open migration'}: the rejection and the abandonment both stay in the record`);

step(`Migration 2: candidate ${CANDIDATE_BETA}`);
register(root, CANDIDATE_BETA, config, now);
e = await evaluate(root, cases, config, study.ports);
say(`evaluated blind: candidate ${e.evaluation.candidate.score.toFixed(3)} vs baseline ${e.evaluation.baseline.score.toFixed(3)}, ` +
  `critical failures [${e.evaluation.candidate.criticalFailures.join(', ')}]`);
d = decide(root, config, now);
say(`policy verdict: ${d.verdict.accepted ? 'ACCEPTED' : 'REJECTED'} (a machine verdict, not permission)`);

try {
  await activate(root, 'demo-operator', study.ports);
} catch (err) {
  if (!(err instanceof IllegalTransitionError)) throw err;
  say(`activate before approval: REFUSED (${err.name})`);
}
approve(root, 'demo-reviewer', config, now);
say('approved by: demo-reviewer');

const a = await activate(root, 'demo-operator', study.ports);
say(`activated: requested ${a.requested}, runtime configuration reads back ${a.observed} -> ${a.state}`);

const v = await verify(root, verificationInputs(), config, study.ports);
say(`verification traffic: ${v.run.requestsMade} of ${v.run.requestsAvailable} planned, stopped by ${v.run.stoppedBy}` +
  `${v.run.truncated ? ' (truncation reported, not hidden)' : ''}`);
say(`telemetry (${v.assertion.evidenceClass}): ${v.assertion.confirmed ? 'CONFIRMED' : 'NOT CONFIRMED'}, ` +
  `${v.assertion.observationCount} observation(s) served by [${v.assertion.observed.join(', ')}]`);

step('Rollback drill');
const rb = await rollback(root, 'demo-operator', config, study.ports);
say(`rolled back to the target locked at register: ${rb.target}; runtime configuration reads back ${rb.observed} -> ${rb.state}`);
say(`production is serving: ${study.target.read()}`);

step('Per-output human review (the application, not the migration)');
const draft = JSON.parse(await study.ports.models.get(CANDIDATE_BETA)!.complete(verificationInputs()[1]!)) as MaintenanceDraft;
try {
  finalise(null, draft.caseId);
} catch (err) {
  say(`unreviewed draft: REFUSED (${(err as Error).name})`);
}
say(finalise(review(draft, 'accepted', 'demo-reviewer'), draft.caseId));

step('The record ModelPromote kept for migration 2');
say(renderReport(readMigration(root, '0002'), statusOf(root, '0002').state, '0002'));
say('Ledger and generation log: .artifacts/demo/ (regenerated on every run)');
