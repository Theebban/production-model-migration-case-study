# Layer A: Verified Production Case

**This document contains only what I did and what the evidence supports.** No control
demonstrated in the reference implementation is claimed here. Where the historical record
is silent, this document says so rather than filling the gap.

---

## 1. Operational problem

A production application had several live generation paths served by an external model
provider. The provider's model line moved forward, and the system needed to serve a
different model.

The naive version of that change is a one-line edit at the call site. That version has no
answer to three questions: which model is serving right now, how do you change it without
shipping code, and how do you get back if the new one is worse.

## 2. System boundary

> Built and operated a multi-tenant production web application, installed and used as a
> PWA, on a serverless architecture with scheduled background processing and push delivery.

That is context. It establishes the operating environment in which the migration happened.
It is not the point of this case study.

Diagram: [`production-evidence/diagrams/README.md`](production-evidence/diagrams/README.md).

## 3. Human-controlled workflow

The generation paths proposed text to an authenticated user who decided what to do with it.
The system did not act autonomously on generated output.

## 4. Configuration-authoritative routing

> Designed production AI paths with environment-authoritative model configuration, so the
> model in use is resolved from configuration at run time rather than from a literal in
> application code.

This is the property that makes everything after it possible. If the model identity is a
literal at the call site, then changing the model is a code change, reverting is a code
change, and the only record of what served is inference.

## 5. Production migration mechanism actually evidenced

> Executed a production model migration through configuration change and redeployment
> rather than application-code modification.

The mechanism was a configuration value plus a redeploy. The application code that calls
the model was not modified to perform the migration.

## 6. Telemetry verification actually evidenced

> Confirmed the model serving the tested production generation path after activation using
> application telemetry, rather than relying on deployment status alone.

Deployment status reports what was intended. The application's own generation telemetry
reports what happened. Those are different facts, and only the second one is evidence.

Note the scope of this claim: it covers **the tested generation path**, not a blanket
assertion about all traffic.

## 7. Retained rollback target

> Retained an explicit, configured rollback target throughout the migration, so reversion
> required a configuration change rather than a code release.

A rollback that requires a release is not a rollback under pressure. Because the target was
configured rather than compiled in, reverting was the same class of operation as advancing.

## 8. Quality gates at the recorded checkpoint

> Maintained a production codebase with a test suite of over 1,500 tests and enforced
> typecheck, lint, build, translation-parity and character-set quality gates at the recorded
> checkpoint.

"At the recorded checkpoint" is doing real work in that sentence. It is a measurement with a
date attached, not a claim about today.

## 9. Limitations and unknowns

Deliberately its own document, because it is the part most case studies skip:
[`LIMITATIONS_AND_RETROSPECTIVE_IMPROVEMENTS.md`](LIMITATIONS_AND_RETROSPECTIVE_IMPROVEMENTS.md).

In short: this section makes no claim that acceptance criteria were fixed before the
candidate was scored, that the migration used comparative benchmarking, that production
verification was pre-bounded, that activation used a feature flag or dark-release ladder,
or that a governed acceptance harness gated the migration. Those controls appear in the
reference implementation because they are stronger, not because they are being backdated.

## 10. Confidentiality boundary

The product, its employer, its customers and its market are not identified here, and no
private code, prompt, log, screenshot or user record was used to produce this repository.
Full statement: [`EVIDENCE_AND_CONFIDENTIALITY_BOUNDARY.md`](EVIDENCE_AND_CONFIDENTIALITY_BOUNDARY.md).
