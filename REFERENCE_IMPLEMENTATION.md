# Layer B: Reference Implementation and Method Evolution

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production
> cutover.

**Domain:** industrial maintenance-report drafting and review. Entirely fictional, chosen
to be far from the production system in Layer A so that no reader can infer product
behaviour from it. All data is synthetic and authored for this repository.

**The workflow:** a technician submits a maintenance note; a model proposes a structured
summary, a severity and recommended checks; a human reviewer accepts, edits or rejects it.
**The system never sends, executes or schedules anything automatically.**

Everything below runs offline and deterministically with `npm run demo`.

---

## How this layer got here

The order matters, because it is the difference between an honest record and a backdated one.

1. **The production migration in Layer A happened**, with the controls Layer A describes and
   no others.
2. **A synthetic reference implementation captured a stronger protocol** afterwards: criteria
   locked before scoring, blind comparison, fail-closed activation, a bounded smoke, a
   telemetry assertion and an executable rollback. That is version `v1.0.0` of this
   repository, preserved unchanged at the
   [`v1.0.0` tag](https://github.com/Theebban/production-model-migration-case-study/tree/v1.0.0).
3. **Independent review and generalisation turned the migration controls into
   [ModelPromote](https://github.com/Theebban/modelpromote)**, a standalone,
   vendor-neutral library that was corrected across three independent review cycles.
4. **ModelPromote is now the maintained implementation of the method.** This layer therefore
   stops carrying a second copy of it. The migration lifecycle is delegated to ModelPromote,
   and what remains here is what ModelPromote deliberately leaves to the adopter.

**ModelPromote did not exist when the Layer A migration ran, and did not govern it.** Neither
did anything else in this layer.

---

## 1. Blind evaluation

[`src/evaluation/blindEvaluator.ts`](reference-implementation/src/evaluation/blindEvaluator.ts)

Kept here, because scoring output quality is the adopter's job, not ModelPromote's. The
scoring function takes an output and an expectation **and nothing else**: there is no
parameter through which a model's identity could reach it, so a scoring bug cannot quietly
favour a preferred model. A test renames a model and asserts that nothing changes except the
name on the result.

A **critical** failure is under-escalation: a note that warranted `high` drafted as anything
less. Over-escalation costs a reviewer a minute; under-escalation can leave a cracked guard
in service, so the policy refuses the second and only scores the first.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 2. A policy locked before anything is measured

[`src/wiring.ts`](reference-implementation/src/wiring.ts) declares it; ModelPromote enforces it.

Minimum score 0.8, maximum regression 0.05, the cracked-guard case must pass, and no critical
failures. ModelPromote hashes the policy when the migration is registered and **refuses to
decide or approve if it has changed since the evidence was produced**. A test moves the bar
after evaluation and asserts the refusal. In the demo, `synthetic-candidate-alpha` is
rejected on all four rules at once, and the record lists every one.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 3. A machine verdict is not permission

ModelPromote records the policy verdict and the human approval as separate events. Activation
before a named person approves is refused and changes nothing, which a test asserts against
the runtime configuration, not just the state.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 4. Configuration-authoritative activation, confirmed by read-back

[`src/activation/runtimeConfig.ts`](reference-implementation/src/activation/runtimeConfig.ts)

The application resolves its model from runtime configuration, never from a literal. This is
the ModelPromote activation target: a write, then a read. **A missing or unknown value fails
closed** rather than defaulting, because a silent default is indistinguishable from a
successful migration until telemetry contradicts it.

Two failures are tested: a configuration write that silently changes nothing (caught by the
read-back, recorded as `ACTIVATION_FAILED`), and production drifting away from the measured
baseline before activation (refused before any write, because the evidence described a
different starting point).

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 5. Bounded verification, from the application's own telemetry

[`src/app/generationLog.ts`](reference-implementation/src/app/generationLog.ts) ·
[`src/provider/syntheticProvider.ts`](reference-implementation/src/provider/syntheticProvider.ts)

ModelPromote issues verification traffic under a hard ceiling (3 requests against 5 planned,
reported as truncated) and then asks the telemetry which model answered. The telemetry here is
the application's generation log, which records the model **the provider reports** as having
served each request, not the model that was requested.

That distinction is what keeps this check from confirming itself. A test moves a provider
alias after activation, so requests for the candidate are answered by a different snapshot:
verification records `FAILED_VERIFICATION` naming the snapshot, and rollback still works.

The claim is a **temporal-window** claim, stated as ModelPromote states it: everything the log
recorded after the window opened named the candidate. It is not a per-request correlation.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 6. A rollback that has actually been run

The demo does not stop at success. It rolls back as a drill, to the target **locked when the
migration was registered**, and ModelPromote records `ROLLED_BACK` only after the runtime
configuration reads the baseline back. A rollback that has never been run is a claim, not a
control.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

## 7. Per-output human review

[`src/review/humanGate.ts`](reference-implementation/src/review/humanGate.ts), unchanged from `v1.0.0`.

This governs each generated draft, not the migration, so it was never ModelPromote's concern.
An unreviewed draft cannot reach a terminal state, which is enforced by the type of the value
rather than by reviewer discipline.

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production cutover.

---

## What moved, what stayed, what was dropped

| Control in `v1.0.0` | Now | Difference |
|---|---|---|
| Criteria hashed before scoring | ModelPromote policy lock | Stronger: enforced at decide AND approve, and recorded in the ledger |
| Fail-closed activation flag | ModelPromote, activation only from `APPROVED` | Stronger: two-phase, intent recorded before the write, confirmed by read-back |
| Bounded smoke, loop-enforced ceiling | ModelPromote bounded verification | Same guarantee; the ceiling is tested inside ModelPromote |
| Telemetry assertion, empty log unconfirmed | ModelPromote temporal-window assertion | Stronger: a window mark excludes evaluation traffic, and the evidence class is recorded |
| Executable rollback | ModelPromote two-phase rollback | Stronger: target locked at register, so a later config edit cannot redirect it |
| Fail-open kill switch | ModelPromote emergency rollback | Different: it acts when the ledger is unreadable, rather than as a separate switch |
| **Consecutive-failure stop** | **Not carried forward** | **Weaker.** ModelPromote bounds verification by request count only. A run of failures is detected afterwards, by the telemetry assertion, not during the run |
| Blind comparative benchmark | Kept: `BlindEvaluator` | Now a ModelPromote evaluator. Blindness is structural rather than label-based |
| Configuration-authoritative resolver | Kept: `RuntimeConfigTarget` | Now a ModelPromote activation target |
| Per-output human review | Kept, unchanged | |

Diagrams: [`reference-implementation/diagrams/README.md`](reference-implementation/diagrams/README.md).

## Tests

24 tests on Node's built-in runner, all offline. They drive the failures a real migration can
meet (a rejected candidate, activation before approval, a moved bar, a silent no-op write,
baseline drift, a moved provider alias) and assert both the refusal and the state it leaves,
because "it threw" can pass for the wrong reason. Each guarded property was also checked by
deliberately breaking it and confirming a test fails.

ModelPromote is pinned exactly (`0.1.2`) so this layer's behaviour cannot change underneath it.
