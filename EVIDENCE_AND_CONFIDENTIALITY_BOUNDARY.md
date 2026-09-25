# Evidence and Confidentiality Boundary

A case study drawn from commercial work has to answer a question the reader will ask
silently: what is being hidden, and does hiding it undermine the claims. This document
answers it directly rather than leaving the reader to guess.

---

## What supports the public claims

The Layer A statements are drawn from a dated internal engineering record of the production
system: the configuration-authoritative model resolution, the migration executed by
configuration change and redeploy, the telemetry confirmation of the model serving the
tested generation path, the retained rollback target, and the quality-gate set measured at
a recorded checkpoint.

Each Layer A statement was reviewed against that record and approved in the wording used
here. Where the record marks something as reported rather than independently verified, it
is **not** claimed in this repository.

## What is deliberately omitted, and why

| Omitted | Why |
|---|---|
| The product, its employer, its customers and its market | Commercial confidentiality. None is needed to evaluate the engineering |
| Model provider and model identifiers | Not needed for the argument, and the argument is provider-neutral by design |
| Internal telemetry field and table names | Implementation detail of a private system |
| Cost figures and cost-accounting detail | Commercial |
| User counts, cohort size, adoption and commercial outcomes | Commercial, and small-population figures can identify people |
| Exact dates, commit counts and precise test totals | Not load-bearing. Approximate scale with a recorded checkpoint carries the same engineering meaning |
| Reliability and incident statistics | The internal record marks these as reported rather than independently verified, so they are barred here |
| Proprietary product logic: scoring, cadence, progression rules, prompt text | The commercial asset itself |

**None of these omissions weakens a claim made here.** Every claim in Layer A stands on the
mechanism, and the mechanism is fully described.

## What was not copied

**No private source code, prompt, production log, user record, customer message or
screenshot was copied into this repository, in any form, redacted or otherwise.**

Specifically:

- The reference implementation was written from scratch for this repository. It is not an
  extract, a filtered copy or a rewrite of any private codebase.
- Since `v2.0.0` the reference implementation depends on
  [ModelPromote](https://github.com/Theebban/modelpromote), a separate public library by the
  same author. It was likewise written from scratch, company-neutral from its first commit,
  and published under Apache-2.0. It is not derived from the production system either.
- The repository has fresh git history. No commit was imported from anywhere.
- Every fixture is synthetic and authored here. No fixture is derived from real data,
  including by anonymisation.
- Every diagram is a freshly authored abstraction. No private architecture diagram or
  schema was reproduced.
- There are no screenshots of any real system. Any images added later will be generated
  from the synthetic implementation in this repository.

Redaction was not used as a route to compliance. Where something could not be shown
safely, it was not shown.

## Why the public implementation is synthetic and independently authored

Two reasons, and the second matters more.

**First, it has to be.** Publishing the production implementation is not available to me,
so any runnable artifact must be independently written.

**Second, synthetic is better here.** The argument is about a protocol, not a product. A
reader should be able to lift the protocol into a different domain and a different stack.
Demonstrating it in a deliberately unrelated domain (industrial maintenance reporting)
proves the protocol travels, which a product-shaped demo would not.

The cost is that the reference implementation demonstrates controls stronger than the ones
the historical migration is evidenced to have used. That gap is stated plainly in
[`LIMITATIONS_AND_RETROSPECTIVE_IMPROVEMENTS.md`](LIMITATIONS_AND_RETROSPECTIVE_IMPROVEMENTS.md)
rather than papered over, and every Layer B section repeats the caveat.
