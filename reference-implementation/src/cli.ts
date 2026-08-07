// Command surface for the synthetic reference implementation.
// Every command is offline and deterministic. No credentials, no network, no .env.

import { join } from 'node:path';
import { rmSync, existsSync } from 'node:fs';
import { loadNotes, loadExpected } from './fixtures.ts';
import { runBenchmark } from './benchmark/run.ts';
import { CRITERIA, evaluate } from './acceptance/criteria.ts';
import { resolvePrimaryModel, resolveRollbackModel, type RuntimeConfig } from './config/resolver.ts';
import { knownModelIds } from './models/registry.ts';
import { activate, readState, recordAcceptance, servingModel } from './activation/flag.ts';
import { runSmoke, DEFAULT_BOUNDS } from './smoke/run.ts';
import { assertServingModel, readAll } from './telemetry/log.ts';
import { exerciseRollback } from './rollback/exercise.ts';

const ART = join(process.cwd(), '.artifacts');
const STATE = join(ART, 'activation.json');
const TELEMETRY = join(ART, 'telemetry.jsonl');

// Configuration, not a literal at a call site.
const CONFIG: RuntimeConfig = {
  primaryModel: 'synthetic-candidate-alpha',
  rollbackModel: 'synthetic-candidate-alpha',
};

function line(s = ''): void { process.stdout.write(`${s}\n`); }

function benchmark(): { winner: string; accepted: boolean } {
  const notes = loadNotes();
  const expected = loadExpected();
  const report = runBenchmark(notes, expected);
  line('BENCHMARK (blind scoring, criteria locked before scoring)');
  line(`  criteria lock hash : ${report.criteriaLockHash}`);
  line(`  fixture set hash   : ${report.fixtureSetHash}`);
  line(`  thresholds         : severity>=${CRITERIA.minSeverityAccuracy} recall>=${CRITERIA.minCheckRecall} spurious<=${CRITERIA.maxSpuriousChecksPerCase}/case`);
  let winner = ''; let winnerAccepted = false; let best = -1;
  for (const r of report.results) {
    const verdict = evaluate(r.score, r.casesScored);
    const acc = (r.score.severityCorrect / r.casesScored).toFixed(2);
    line(`  ${r.blindLabel}: severity ${acc} recall ${r.score.checksRecalled.toFixed(2)} spurious ${r.score.checksSpurious} -> ${verdict.accepted ? 'ACCEPT' : 'REJECT'}`);
    for (const why of verdict.reasons) line(`      reason: ${why}`);
    if (verdict.accepted && r.score.total > best) { best = r.score.total; winner = report.unblinded[r.blindLabel] ?? ''; winnerAccepted = true; }
  }
  line('  unblinded after scoring:');
  for (const [label, id] of Object.entries(report.unblinded)) line(`      ${label} = ${id}`);
  if (winnerAccepted) {
    recordAcceptance(STATE, winner, report.criteriaLockHash);
    line(`  accepted candidate recorded: ${winner}`);
  } else {
    line('  no candidate met the predeclared criteria. Nothing recorded.');
  }
  return { winner, accepted: winnerAccepted };
}

function doActivate(): void {
  const state = readState(STATE);
  if (state.acceptedCandidate === null) {
    line('ACTIVATION REFUSED: no acceptance verdict. Run the benchmark first.');
    process.exitCode = 1;
    return;
  }
  const current = resolvePrimaryModel(CONFIG, knownModelIds());
  const next = activate(STATE, state.acceptedCandidate, current);
  line('STAGED ACTIVATION (fail-closed flag)');
  line(`  previous serving model : ${next.previousModel}`);
  line(`  activated model        : ${next.activatedModel}`);
  line('  activation is a configuration change. No code release was required.');
}

function doSmoke(): void {
  const state = readState(STATE);
  const serving = servingModel(state, resolvePrimaryModel(CONFIG, knownModelIds()), resolveRollbackModel(CONFIG, knownModelIds()));
  const notes = loadNotes();
  const res = runSmoke(notes, serving, TELEMETRY, DEFAULT_BOUNDS);
  // Every figure below is read back from the run itself, never recomputed at the call site.
  line('BOUNDED SYNTHETIC SMOKE');
  line(`  ceiling            : ${DEFAULT_BOUNDS.maxCalls} call(s)`);
  line(`  fixtures available : ${res.fixturesAvailable}`);
  line(`  calls made         : ${res.callsMade}`);
  line(`  stopped by         : ${res.stoppedBy}`);
  line(`  truncated          : ${res.truncated ? `YES, ${res.fixturesAvailable - res.callsMade} case(s) left unprocessed` : 'NO'}`);
  line(`  cases processed    : ${res.processedCaseIds.join(', ') || '(none)'}`);
}

function doTelemetry(): void {
  const state = readState(STATE);
  const expected = servingModel(state, resolvePrimaryModel(CONFIG, knownModelIds()), resolveRollbackModel(CONFIG, knownModelIds()));
  const a = assertServingModel(TELEMETRY, expected);
  line('TELEMETRY ASSERTION (what served, not what was deployed)');
  line(`  rows inspected : ${a.rowsInspected}`);
  line(`  expected       : ${a.expected}`);
  line(`  observed       : ${a.observed.join(', ') || '(none)'}`);
  line(`  confirmed      : ${a.confirmed ? 'YES' : 'NO'}`);
  if (!a.confirmed && a.rowsInspected === 0) line('  an empty log is not confirmation. Absence of contrary evidence is not evidence.');
  if (!a.confirmed) process.exitCode = 1;
}

function doRollback(): void {
  const target = resolveRollbackModel(CONFIG, knownModelIds());
  const out = exerciseRollback(STATE, target);
  line('ROLLBACK EXERCISE (executed, not asserted)');
  line(`  reverted from : ${out.revertedFrom ?? '(none)'}`);
  line(`  reverted to   : ${out.revertedTo}`);
  line('  reversion path: configuration change, not a code release.');
}

function verify(): void {
  if (existsSync(ART)) rmSync(ART, { recursive: true, force: true });
  line('=== END-TO-END VERIFICATION ==='); line();
  const b = benchmark(); line();
  if (!b.accepted) { line('halted: no accepted candidate'); process.exitCode = 1; return; }
  doActivate(); line();
  doSmoke(); line();
  doTelemetry(); line();
  doRollback(); line();
  const rows = readAll(TELEMETRY);
  line(`telemetry rows written: ${rows.length}`);
  line('sequence complete: predeclared criteria -> blind benchmark -> acceptance -> activation -> bounded smoke -> telemetry assertion -> rollback');
}

const cmd = process.argv[2] ?? 'verify';
switch (cmd) {
  case 'benchmark': benchmark(); break;
  case 'activate': doActivate(); break;
  case 'smoke': doSmoke(); break;
  case 'telemetry': doTelemetry(); break;
  case 'rollback': doRollback(); break;
  case 'verify': verify(); break;
  default:
    line(`unknown command "${cmd}". Available: benchmark, activate, smoke, telemetry, rollback, verify`);
    process.exitCode = 1;
}
