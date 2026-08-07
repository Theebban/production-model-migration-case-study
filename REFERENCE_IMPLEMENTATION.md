# Layer B: Synthetic Reference Implementation

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production
> cutover.

**Domain:** industrial maintenance-report drafting and review. Entirely fictional, chosen
to be far from the production system in Layer A so that no reader can infer product
behaviour from it. All data is synthetic and authored for this repository.

**The workflow:** a technician submits a maintenance note; a model proposes a structured
summary, a severity and recommended next checks; a human reviewer accepts, edits or
rejects it. **The system never sends, executes or schedules anything automatically.**

Everything below runs offline and deterministically with `npm run verify`.

---

## 1. Predeclared acceptance criteria

[`src/acceptance/criteria.ts`](reference-implementation/src/acceptance/criteria.ts)

The thresholds are declared and **hashed before any candidate is scored**. The lock hash
travels in the benchmark report, so a later reader can tell whether the bar was moved to
fit the result. Moving it changes the hash, and a test asserts exactly that.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 2. Comparative-model benchmark

[`src/benchmark/run.ts`](reference-implementation/src/benchmark/run.ts)

Candidates are scored under **identifier-neutral blind labels** (`candidate-A`,
`candidate-B`) against frozen fixtures. The unblinding map is emitted only after every
candidate has been scored, so a scoring bug cannot quietly favour a preferred identifier.
In the default fixtures one candidate is **rejected** on the severity threshold.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 3. Configuration-authoritative resolver

[`src/config/resolver.ts`](reference-implementation/src/config/resolver.ts)

Model identity is resolved from configuration. There is no model literal at any call site.
An unknown identifier **throws** rather than falling back to a default, because a silent
default is indistinguishable from a successful migration until telemetry contradicts it.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 4. Staged activation

[`src/activation/flag.ts`](reference-implementation/src/activation/flag.ts)

Two switches, deliberately asymmetric:

- The **activation flag is fail-closed.** Missing or unreadable state reads as not
  activated. Activation is refused unless an acceptance verdict exists for that exact
  candidate under a recorded criteria lock hash.
- The **kill switch is fail-open.** Missing or unreadable state reads as not killed, so a
  corrupt state file can never wedge the system into permanent shutdown.

A test writes deliberately malformed state and asserts both directions.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 5. Bounded synthetic smoke

[`src/smoke/run.ts`](reference-implementation/src/smoke/run.ts)

The call ceiling is declared before the run and **enforced by the loop**, not by intention.
The run iterates the full submitted sequence and tests the ceiling before every model
invocation, so the bound is a property of the executing code. Pre-slicing the input down to
the ceiling would look equivalent and is not: it moves the guarantee out of the system under
test and into the caller, where no test can reach it.

Bounds are validated first, so an unusable budget fails before any model call or telemetry
write. Reaching the ceiling is a reported outcome rather than an exception: the run stops
and returns `stoppedBy: "ceiling"` along with the fixtures available, the calls made, the
cases actually processed, and whether truncation occurred. Silent truncation reads as
"covered everything".

The ceiling test submits more cases than the limit and asserts that the cases beyond it
appear in neither the result nor the telemetry log. It **fails** against a pre-slicing
implementation, which is the point: a test that raises its own expected exception proves
nothing about the code it is meant to be testing.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 6. Telemetry assertion

[`src/telemetry/log.ts`](reference-implementation/src/telemetry/log.ts)

Every generation records which model served it. Activation is confirmed from that log.
**An empty log is not confirmation:** absence of contrary evidence is not evidence, and a
test asserts that an empty log returns unconfirmed rather than passing by default.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 7. Rollback exercise

[`src/rollback/exercise.ts`](reference-implementation/src/rollback/exercise.ts)

Executable, not asserted. A rollback that has never been run is a claim, not a control.
`npm run rollback` performs it and the test verifies the restored state.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 8. Offline tests and synthetic fixtures

[`tests/protocol.test.ts`](reference-implementation/tests/protocol.test.ts) ·
[`fixtures/synthetic/`](reference-implementation/fixtures/synthetic)

21 tests on Node's built-in runner. Fixtures are small enough to read by hand. Human review
is enforced by the type of the returned value: an unreviewed draft cannot reach a terminal
state, and `finalise(null, ...)` throws.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

---

Diagrams: [`reference-implementation/diagrams/README.md`](reference-implementation/diagrams/README.md).
