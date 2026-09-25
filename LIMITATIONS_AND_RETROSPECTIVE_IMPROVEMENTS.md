# Limitations, Unknowns and Retrospective Improvements

Most case studies describe a clean success. This one separates four things that are usually
blurred together: what the evidence establishes, what it does not, which controls came
later, and what the reference implementation adds.

I have not invented failures to look credible. The record does not establish a failure
narrative for this migration, so I do not tell one.

---

## 1. What the historical evidence establishes

- Model identity was resolved from configuration at run time, not from a literal in
  application code.
- The migration was performed by configuration change and redeploy, without modifying the
  application code that calls the model.
- The model serving the **tested** generation path was confirmed after activation from the
  application's own telemetry, rather than from deployment status alone.
- An explicit configured rollback target was retained, so reversion was a configuration
  change rather than a code release.
- A test suite of over 1,500 tests and an enforced gate set existed at a recorded
  checkpoint.

## 2. What it does not establish

Stated plainly, because a reader who cannot see the boundary cannot trust the parts inside
it.

- **Whether acceptance criteria were formalised before the candidate was scored.** The
  record does not show a predeclared, hashed criteria set for this migration.
- **Whether a structured comparative benchmark selected the target model.** No blind or
  identifier-neutral scoring run is evidenced.
- **Whether production verification was pre-bounded.** No written call ceiling, cost
  ceiling or stop condition is evidenced for this migration.
- **Whether activation was staged behind a flag.** No fail-closed activation flag or
  dark-release ladder is evidenced. The change appears to have been a configuration change
  plus redeploy, verified afterwards.
- **Coverage beyond the tested path.** The telemetry confirmation is scoped to the
  generation path that was tested, not to all traffic.
- **The full incident history.** Reliability statistics in the internal record are marked
  reported rather than independently verified, so nothing is claimed.

## 3. Which stronger controls were formalised separately

Governed acceptance, comparative benchmarking, staged activation and bounded production
verification exist as developed engineering methods in my own practice. **Their
formalisation is not evidenced as concurrent with this migration.** They were written up
separately, and applying them to a migration of this kind is the improvement, not the
history.

That is the honest shape of it: the migration was executed competently on the mechanism
(configuration authority, telemetry confirmation, retained rollback) and thinly on the
process around it (predeclaration, comparison, bounding, staged activation).

## 4. How the reference implementation closes each gap

Layer B closes each gap in runnable code. Since `v1.0.0`, the migration controls are provided
by ModelPromote, which generalised them, and this repository supplies the evaluator, the
activation target and the telemetry around it. See
[`REFERENCE_IMPLEMENTATION.md`](REFERENCE_IMPLEMENTATION.md) for what moved, what stayed and
what was dropped.

| Gap in the historical case | What Layer B demonstrates |
|---|---|
| No predeclared criteria | A policy hashed when the migration is registered; deciding or approving after the bar has moved is refused, and a test asserts it |
| No comparative selection | Baseline and candidate scored by a blind evaluator that never sees a model identity; one candidate is rejected on four rules at once |
| No pre-bounded verification | Verification traffic under a hard ceiling enforced in the loop, with truncation reported rather than silent |
| No staged activation | Activation refused until a named person approves, then a configuration write confirmed by read-back; a silent no-op write and a drifted baseline are both caught |
| Verification scoped to one path | A telemetry assertion over the application's own log, recording the model the provider reports; a moved provider alias fails verification |
| Rollback asserted, not exercised | A rollback drill to the target locked at registration, recorded only after the configuration reads the baseline back |

Run `npm run demo` to see the whole sequence execute.

## 5. What I would do differently

Predeclare and hash the acceptance criteria before looking at a single candidate output.
Bound the production verification in writing before spending anything on it. Put the new
model behind a fail-closed flag so that deploying and activating are two separate decisions
with two separate authorisations. None of that is exotic, and all of it is cheaper than
discovering afterwards that you cannot prove what served.
