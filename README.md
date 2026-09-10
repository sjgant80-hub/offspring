# offspring

**▶ Live: https://sjgant80-hub.github.io/offspring/**

A **two-parent fork with a fitness precondition.** Merge two independent systems into one
descendant that carries **both** lineages — but only when the coupling between the parents is
**sovereign** (both stay themselves, mutual, regenerating). A coupling that dissolves one into the
other (**merged**), drains one (**extractive**), is too loose (**starved**), or is static
(**frozen**) bears **nothing**: the birth is refused, with the reason. You cannot breed a
descendant from a dead join.

The fitness law is [couple-gate](https://github.com/sjgant80-hub/couple-gate)'s `classifyCouple`,
**vendored verbatim** so this kernel is self-contained and the gate covers the whole decision.
offspring adds only the birth.

## The law (`kernel.mjs`)

- `canBreed(coupling)` — is this coupling fit to bear? True only for a sovereign couple.
- `breed(parentA, parentB, coupling)` — the birth. A parent is `{ id, lineage, genome, generation? }`.
  - A node **cannot breed with itself** (no pair to cross — a monopole bears nothing).
  - The coupling is classified by couple-gate. A child is born **only** from `SOVEREIGN_COUPLED`;
    a `MERGED` / `EXTRACTIVE` / `STARVED` / `FROZEN` coupling returns `{ born: false, verdict, reason }`.
  - The child is **symmetric** (`breed(A,B)` ≡ `breed(B,A)`) and **deterministic** (the same two
    parents always breed the same child — one birth, not many, content-addressed):
    - `id` — a content-address of the sorted parent ids + the inherited genome
    - `parents` — the two parent ids, sorted
    - `lineage` — both parents + both their lineages, deduped and sorted (the fork-tree names the whole bloodline)
    - `genome` — the union of both parents' genomes (it carries both bloodlines)
    - `generation` — one past the deeper parent
- `bloodline(node)` — flatten a node's full ancestry (the pedigree).

Pure and total: the kernel never throws on garbage; it returns `{ ok: false, why }`.

## Proof of play

- **Mutation-gated CLEAN 38/38** — `node tools/witness.mjs mutate kernel.mjs --timeout 30000 --cap 400 --test node --test kernel.test.mjs`
- **The live page IS the gated kernel** — `make-page.mjs` injects `kernel.mjs` verbatim between markers in `index.html`; CI regenerates and `git diff --exit-code`s.
- Run the tests: `node --test kernel.test.mjs`

## Where it's useful

Any time you merge two independent things into a descendant and want the merge to be *healthy* —
combining two teams, two services, two datasets, two models, two forks — offspring answers,
deterministically, whether the coupling keeps **both** parents alive in the child, or quietly erases,
drains, starves, or freezes one of them. A child inherits both lineages; a dead coupling bears nothing.

Pairs with [couple-gate](https://github.com/sjgant80-hub/couple-gate) (the fitness law),
[the-wallet](https://github.com/sjgant80-hub/the-wallet) (identity &amp; fork-lineage), and
[didy-wire](https://github.com/sjgant80-hub/didy-wire) (the sovereign exchange between agents).

MIT.
