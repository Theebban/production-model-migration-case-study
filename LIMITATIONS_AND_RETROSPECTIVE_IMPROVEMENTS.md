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

| Gap in the historical case | What the reference implementation demonstrates |
|---|---|
| No predeclared criteria | Criteria hashed and locked before scoring; moving the bar changes the hash, and a test asserts it |
| No comparative selection | Blind, identifier-neutral scoring of multiple candidates; one is rejected on a real threshold |
| No pre-bounded verification | Hard call ceiling enforced by the loop, written stop conditions, trim reported rather than silent |
| No staged activation | Fail-closed activation flag refusing anything but the accepted candidate, plus a fail-open kill switch |
| Verification scoped to one path | An explicit telemetry assertion where an empty log returns unconfirmed rather than passing |
| Rollback asserted, not exercised | An executable rollback exercise with a test on the restored state |

Run `npm run verify` to see the whole sequence execute.

## 5. What I would do differently

Predeclare and hash the acceptance criteria before looking at a single candidate output.
Bound the production verification in writing before spending anything on it. Put the new
model behind a fail-closed flag so that deploying and activating are two separate decisions
with two separate authorisations. None of that is exotic, and all of it is cheaper than
discovering afterwards that you cannot prove what served.
