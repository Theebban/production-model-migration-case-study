# Layer B diagrams (synthetic reference implementation)

> This synthetic reference implementation demonstrates a strengthened reusable protocol.
> Not every control shown here is asserted to have governed the historical production
> cutover.

Each diagram has exactly one source of truth: the `.mmd` file. The `.svg` beside it is the
rendered output of that file and nothing else, so the two cannot drift. A plain-text
description follows each one for readers using a screen reader or viewing without images.

## Controlled migration protocol

![Controlled migration protocol: acceptance criteria are declared then hashed and locked before candidates are scored under blind labels. If no candidate meets the criteria the run stops and records nothing as accepted. If one does, acceptance is recorded for that exact candidate. The activation flag then checks whether acceptance was recorded; if not it fails closed and activation is refused, and if so the candidate is activated by configuration. A bounded synthetic smoke with a hard ceiling follows, then the serving model is asserted from telemetry. If it is not confirmed, the rollback exercise runs; if it is confirmed, a human review gate precedes any final action.](layer-b-controlled-migration-protocol.svg)

Source: [`layer-b-controlled-migration-protocol.mmd`](layer-b-controlled-migration-protocol.mmd)

Plain-text equivalent:

```
declare acceptance criteria -> hash and lock the criteria
  -> score candidates under blind labels
  -> any candidate meets the criteria?
       no  -> stop, record nothing as accepted
       yes -> record acceptance for that exact candidate
                -> activation flag: acceptance recorded?
                     no  -> activation refused        (fail-closed)
                     yes -> activate by configuration
                              -> bounded synthetic smoke, hard ceiling
                              -> assert serving model from telemetry
                                   confirmed?
                                     no  -> rollback exercise
                                     yes -> human review before any final action
```

The criteria are locked **before** any score exists, so the bar cannot move to fit a
result. Activation is refused unless an acceptance verdict exists for that exact candidate.

## Telemetry and rollback sequence

![Telemetry and rollback sequence: the operator sets the activated model in configuration after acceptance, then runs the bounded smoke against the application with the ceiling enforced. The application appends a telemetry row carrying the case identifier and the serving model. The operator asserts the serving model against the telemetry log, which returns the observed identities and the row count. If the log is empty the result is not confirmed, because absence is not evidence. If there is a mismatch or the kill switch is engaged, the operator reverts configuration to the retained rollback target, which is a configuration change rather than a code release.](layer-b-telemetry-rollback-sequence.svg)

Source: [`layer-b-telemetry-rollback-sequence.mmd`](layer-b-telemetry-rollback-sequence.mmd)

Plain-text equivalent:

```
operator  -> configuration : set activated model (after acceptance)
operator  -> application   : run bounded smoke (ceiling enforced)
application -> telemetry   : append row {caseId, servedBy}
operator  -> telemetry     : assert serving model
telemetry -> operator      : observed identities + row count

  if the log is empty:
    telemetry -> operator  : not confirmed (absence is not evidence)

  if there is a mismatch, or the kill switch is engaged:
    operator -> configuration : revert to retained rollback target
    note: configuration change, no code release
```

An empty log returns **not confirmed**. A check that passes when it has seen nothing is not
a check.
