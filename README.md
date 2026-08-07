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
| **B. Synthetic reference implementation** | A stronger reusable protocol, independently authored, runnable offline on synthetic data | [`REFERENCE_IMPLEMENTATION.md`](REFERENCE_IMPLEMENTATION.md) |

**The separation is deliberate.** Layer B demonstrates controls that are stronger than the
ones the historical migration is evidenced to have used. Presenting them as though they
governed that migration would be a claim I cannot support, so I do not make it. Every Layer
B section says so explicitly.

I think the separation is the more useful thing to show. It is production experience plus
the judgement to see where that experience was thin, with the gap closed in code you can
run.

---

## Five-minute path

1. This page, to here.
2. [`VERIFIED_PRODUCTION_CASE.md`](VERIFIED_PRODUCTION_CASE.md), about three minutes.
3. Run the reference implementation, one command, below.
4. [`LIMITATIONS_AND_RETROSPECTIVE_IMPROVEMENTS.md`](LIMITATIONS_AND_RETROSPECTIVE_IMPROVEMENTS.md)
   for what the evidence does and does not establish.

Deeper technical review: [`reference-implementation/src`](reference-implementation/src),
[`reference-implementation/tests`](reference-implementation/tests), and
[`EVIDENCE_AND_CONFIDENTIALITY_BOUNDARY.md`](EVIDENCE_AND_CONFIDENTIALITY_BOUNDARY.md).

---

## Run it

Requires **Node 22.6 or newer**. Nothing here needs an API key, a `.env` file or an account.

**The demonstration and the tests need no install at all.** They run straight from a clone
on Node alone, because the project has **zero runtime dependencies**:

```bash
npm run verify       # the whole protocol, end to end
npm test             # 23 tests
```

Individual steps, all equally install-free:

```bash
npm run benchmark    # predeclared criteria, blind comparative scoring
npm run activate     # staged activation, refused unless acceptance was recorded
npm run smoke        # bounded synthetic smoke with a hard call ceiling
npm run telemetry    # assert which model actually served
npm run rollback     # executable rollback exercise
```

**No network call is made while any of the above runs.** The model adapters are local
deterministic functions, the fixtures are files in the repository, and state is written to
a local `.artifacts/` directory.

`npm install` is needed **only** for the two development checks, which use TypeScript and
ESLint:

```bash
npm install          # devDependencies only: TypeScript and ESLint
npm run typecheck    # strict TypeScript
npm run lint
```

That install is the one step that may reach the network: on a machine without those two
packages already cached, npm will fetch them from the registry. The install is not required
to run, read or verify the protocol itself.

`npm run verify` prints the full sequence. In the default fixture set one candidate is
**rejected** by the predeclared criteria and the other is accepted, so the acceptance gate
is doing real work rather than waving everything through.

---

## Layout

```
VERIFIED_PRODUCTION_CASE.md              Layer A only
REFERENCE_IMPLEMENTATION.md              Layer B only
EVIDENCE_AND_CONFIDENTIALITY_BOUNDARY.md what is shown, what is withheld, why
LIMITATIONS_AND_RETROSPECTIVE_IMPROVEMENTS.md
production-evidence/diagrams/            Layer A, freshly authored abstractions
                                         .mmd source + rendered .svg + plain text
reference-implementation/
  src/                                   the protocol, in TypeScript
  fixtures/synthetic/                    synthetic inputs and expectations
  tests/                                 runnable offline
  diagrams/                              Layer B protocol and sequence
                                         .mmd source + rendered .svg + plain text
```

Each diagram is committed as a Mermaid source and a rendered SVG produced from that source,
so nothing depends on a viewer that can render Mermaid, and the two cannot drift.

## Technology, and why

**TypeScript on Node, with zero runtime dependencies.** The implementation runs through
Node's native type stripping and its built-in test runner, so a reviewer needs no bundler,
no test framework and no build step. The only installed packages are TypeScript and ESLint,
used for typecheck and lint rather than to run anything. Fewer moving parts means the code
you read is the code that runs.
