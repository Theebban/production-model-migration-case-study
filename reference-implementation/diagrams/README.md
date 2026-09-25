# Layer B diagrams (reference implementation, governed by ModelPromote)

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production
> cutover.

Each diagram has exactly one source of truth: the `.mmd` file. The `.svg` beside it is the
rendered output of that file and nothing else, so the two cannot drift. A plain-text
description follows each one for readers using a screen reader or viewing without images.

The diagrams for the original reference implementation are preserved unchanged at the
`v1.0.0` tag.

## Governed migration

![Governed migration: ModelPromote registers the candidate, hashing the policy and locking the baseline and rollback target. This repository's blind evaluator scores baseline and candidate without ever seeing a model identity. ModelPromote applies the declared policy; a failing candidate is rejected and then abandoned, and both stay in the record. A passing candidate needs a named human approval, because a machine verdict is not permission. If production is no longer serving the measured baseline, activation is refused before any write. Otherwise the runtime configuration is written and read back; a mismatch records ACTIVATION_FAILED, which catches a silent no-op write. ModelPromote then issues bounded verification traffic under a hard ceiling, and the application's generation log, after a window mark, must name only the candidate; if it does not, for example because a provider alias moved, the state is FAILED_VERIFICATION. A verified migration can be stabilised or rolled back; a failed verification is rolled back. Rollback goes to the locked target and is confirmed by read-back.](layer-b-governed-migration.svg)

Source: [`layer-b-governed-migration.mmd`](layer-b-governed-migration.mmd)

Plain-text equivalent:

```
register candidate                                  ModelPromote
  -> blind evaluation of baseline and candidate      this repository: BlindEvaluator
  -> declared policy passes?                         ModelPromote
       no  -> REJECTED, then abandoned (both recorded)
       yes -> named human approves                   ModelPromote
                -> production still on the measured baseline?
                     no  -> refused before any write (baseline drift)
                     yes -> write runtime config, read it back
                                                     this repository: RuntimeConfigTarget
                              read-back equals candidate?
                                no  -> ACTIVATION_FAILED
                                yes -> bounded verification traffic   ModelPromote
                                         -> log after the window mark names only the candidate?
                                                     this repository: GenerationLog
                                              no  -> FAILED_VERIFICATION -> rollback
                                              yes -> VERIFIED -> stabilise, or rollback
rollback: to the target locked at register, confirmed by read-back
```

## Method evolution

![Method evolution: of the ten controls in the v1.0.0 reference implementation, six now live in ModelPromote: criteria hashed before scoring became a policy lock enforced at decide and approve; the fail-closed activation flag became activation only from APPROVED, two-phase with read-back; the bounded smoke became bounded verification with the ceiling in the loop; the telemetry assertion became the temporal-window telemetry assertion; the executable rollback became a two-phase rollback to a locked target; and the fail-open kill switch became emergency rollback when the ledger is unreadable. Three are kept in this repository: the blind comparative benchmark as BlindEvaluator, the configuration-authoritative resolver as RuntimeConfigTarget, and per-output human review. One, the consecutive-failure stop, was not carried forward, because ModelPromote bounds verification by request count only.](layer-b-method-evolution.svg)

Source: [`layer-b-method-evolution.mmd`](layer-b-method-evolution.mmd)

Plain-text equivalent:

```
v1.0.0 control                               now
criteria hashed before scoring            -> ModelPromote: policy lock, enforced at decide and approve
fail-closed activation flag               -> ModelPromote: activation only from APPROVED, two-phase, read-back
bounded smoke, loop-enforced ceiling      -> ModelPromote: bounded verification, ceiling in the loop
telemetry assertion, empty log unconfirmed-> ModelPromote: temporal-window telemetry assertion
executable rollback                       -> ModelPromote: two-phase rollback to a locked target
fail-open kill switch                     -> ModelPromote: emergency rollback when the ledger is unreadable
blind comparative benchmark               -> this repository: BlindEvaluator
configuration-authoritative resolver      -> this repository: RuntimeConfigTarget
per-output human review                   -> this repository: per-output human review
consecutive-failure stop                  -> NOT carried forward (ModelPromote bounds by request count only)
```
