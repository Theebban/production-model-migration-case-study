# Operating a Production AI System Through a Controlled Model Migration

*A verified production cutover and an independently authored reference implementation*

**Production AI systems require controlled migration and verifiable activation, not merely
API integration.**

Swapping a model is trivial to do and difficult to do safely. The difficulty is not the
call site. It is knowing which model is actually serving traffic, being able to change it
without a code release, confirming from the system's own telemetry that the change took
effect, and holding a rollback that works under pressure.

---

## This repository has two layers. They are never merged.

| Layer | What it is | Where |
|---|---|---|
| **A. Verified production case** | What I actually did in a production system, limited to what the evidence supports | [`VERIFIED_PRODUCTION_CASE.md`](VERIFIED_PRODUCTION_CASE.md) |
| **B. Reference implementation and method evolution** | A stronger reusable protocol, independently authored, that now delegates the migration lifecycle to [ModelPromote](https://github.com/Theebban/modelpromote) and runnable offline on synthetic data | [`REFERENCE_IMPLEMENTATION.md`](REFERENCE_IMPLEMENTATION.md) |

**The separation is deliberate.** Layer B demonstrates controls that are stronger than the
ones the historical migration is evidenced to have used. Presenting them as though they
governed that migration would be a claim I cannot support, so I do not make it. Every Layer
B section says so explicitly.

I think the separation is the more useful thing to show. It is production experience plus
the judgement to see where that experience was thin, with the gap closed in code you can
run.

**How the method evolved.** The migration in Layer A came first. A synthetic reference
implementation of a stronger protocol came next, and is preserved unchanged at the
[`v1.0.0` tag](https://github.com/Theebban/production-model-migration-case-study/tree/v1.0.0).
Independent review and generalisation then turned its migration controls into
**ModelPromote**, a standalone library, and this repository now delegates the migration
lifecycle to it rather than keeping a second copy. ModelPromote did not exist when the Layer A
migration ran, and did not govern it.

---

## Five-minute path

1. This page, to here.
2. [`VERIFIED_PRODUCTION_CASE.md`](VERIFIED_PRODUCTION_CASE.md), about three minutes.
3. Run the demonstration, below.
4. [`LIMITATIONS_AND_RETROSPECTIVE_IMPROVEMENTS.md`](LIMITATIONS_AND_RETROSPECTIVE_IMPROVEMENTS.md)
   for what the evidence does and does not establish.

Deeper technical review: [`REFERENCE_IMPLEMENTATION.md`](REFERENCE_IMPLEMENTATION.md),
[`reference-implementation/src`](reference-implementation/src),
[`reference-implementation/tests`](reference-implementation/tests), and
[`EVIDENCE_AND_CONFIDENTIALITY_BOUNDARY.md`](EVIDENCE_AND_CONFIDENTIALITY_BOUNDARY.md).

---

## Run it

Requires **Node 22.6 or newer**. Nothing here needs an API key, a `.env` file or an account.

```bash
git clone https://github.com/Theebban/production-model-migration-case-study.git
cd production-model-migration-case-study
npm ci               # one runtime dependency, ModelPromote, pinned exactly
npm run demo         # the whole method, end to end
npm test             # 24 tests
```

`npm ci` is the only step that may reach the network. It installs ModelPromote (itself free of
runtime dependencies) plus TypeScript and ESLint for the development checks. **No network call
is made while the demonstration or the tests run.** The models are local deterministic
functions, the fixtures are files in this repository, and state is written to a local
`.artifacts/` directory.

```bash
npm run typecheck    # strict TypeScript
npm run lint
npm run check        # typecheck, lint and tests together
```

`npm run demo` runs two migrations. The first candidate is **rejected** by the declared policy
on four separate rules and abandoned. The second is accepted, refused activation until a named
person approves it, activated with read-back confirmation, verified from the application's own
telemetry under a hard traffic ceiling, and then **rolled back as a drill**. It ends by printing
the record ModelPromote kept.

---

## Layout

```
VERIFIED_PRODUCTION_CASE.md              Layer A only
REFERENCE_IMPLEMENTATION.md              Layer B only, including how the method evolved
EVIDENCE_AND_CONFIDENTIALITY_BOUNDARY.md what is shown, what is withheld, why
LIMITATIONS_AND_RETROSPECTIVE_IMPROVEMENTS.md
production-evidence/diagrams/            Layer A, freshly authored abstractions
                                         .mmd source + rendered .svg + plain text
reference-implementation/
  src/
    evaluation/                          blind evaluator (a ModelPromote evaluator)
    activation/                          configuration-authoritative activation target
    app/                                 the application's model calls and generation log
    provider/                            a synthetic provider that reports what served
    review/                              per-output human review
    wiring.ts                            the one place the application meets ModelPromote
    demo.ts                              npm run demo
  fixtures/synthetic/                    synthetic inputs and expectations
  tests/                                 runnable offline
  diagrams/                              Layer B flow and method evolution
                                         .mmd source + rendered .svg + plain text
```

Each diagram is committed as a Mermaid source and a rendered SVG produced from that source,
so nothing depends on a viewer that can render Mermaid, and the two cannot drift.

## Technology, and why

**TypeScript on Node, run through Node's native type stripping and its built-in test runner**,
so a reviewer needs no bundler, no test framework and no build step. The one runtime
dependency is ModelPromote, which owns the migration lifecycle; everything else in
`reference-implementation/src` is the synthetic application around it. Fewer moving parts
means the code you read is the code that runs.
