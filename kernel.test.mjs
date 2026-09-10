import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCouple, canBreed, breed, bloodline } from './kernel.mjs';

const A = { id: 'nexus', lineage: ['root'], genome: ['warp', 'quasicrystal'], generation: 1 };
const B = { id: 'sididy', lineage: ['seed'], genome: ['dodeca', 'witness'], generation: 2 };
const SOV = { share: 0.65, identity: true, exitA: true, exitB: true, flow: 0, regen: true };
const MERGED = { ...SOV, identity: false };
const EXTRACTIVE = { ...SOV, flow: 0.7 };
const STARVED = { ...SOV, share: 0.3 };
const FROZEN = { ...SOV, regen: false };

// ── the birth from a sovereign coupling
test('breed: a sovereign coupling bears a child that carries both lineages', () => {
  const r = breed(A, B, SOV);
  assert.equal(r.ok, true);
  assert.equal(r.born, true);
  assert.equal(r.verdict, 'SOVEREIGN_COUPLED');
  assert.deepEqual(r.child.parents, ['nexus', 'sididy']);                       // sorted
  assert.deepEqual(r.child.genome, ['dodeca', 'quasicrystal', 'warp', 'witness']); // union, sorted
  assert.deepEqual(r.child.lineage, ['nexus', 'root', 'seed', 'sididy']);       // both parents + both ancestries
  assert.equal(r.child.generation, 3);                                          // max(1,2)+1
});

test('breed: the child id is a deterministic content-address (pins the hash)', () => {
  assert.equal(breed(A, B, SOV).child.id, '686803077fbcf1ac');   // exact — kills mutated hash constants
});

test('breed: the birth is deterministic and symmetric (run(S)==S, order-free)', () => {
  assert.equal(breed(A, B, SOV).child.id, breed(A, B, SOV).child.id);   // same parents -> same child
  assert.equal(breed(A, B, SOV).child.id, breed(B, A, SOV).child.id);   // swapped parents -> same child
  assert.deepEqual(breed(A, B, SOV).child.genome, breed(B, A, SOV).child.genome);
});

test('breed: the child is a NEW node, not a copy of a parent', () => {
  const id = breed(A, B, SOV).child.id;
  assert.notEqual(id, A.id);
  assert.notEqual(id, B.id);
});

test('breed: different parents / genomes yield different children', () => {
  const C = { id: 'other', lineage: [], genome: ['x'] };
  assert.notEqual(breed(A, B, SOV).child.id, breed(A, C, SOV).child.id);
});

// ── the fitness gate: a dead coupling bears nothing
test('breed: a MERGED coupling is refused the birth', () => {
  const r = breed(A, B, MERGED);
  assert.equal(r.ok, true);
  assert.equal(r.born, false);
  assert.equal(r.verdict, 'MERGED');
  assert.equal(r.child, undefined);
  assert.ok(r.reason.includes('identity'));
});

test('breed: EXTRACTIVE / STARVED / FROZEN couplings all bear nothing, each named', () => {
  assert.equal(breed(A, B, EXTRACTIVE).born, false);
  assert.equal(breed(A, B, EXTRACTIVE).verdict, 'EXTRACTIVE');
  assert.equal(breed(A, B, STARVED).born, false);
  assert.equal(breed(A, B, STARVED).verdict, 'STARVED');
  assert.equal(breed(A, B, FROZEN).born, false);
  assert.equal(breed(A, B, FROZEN).verdict, 'FROZEN');
});

test('breed: the fitness boundary is couple-gate exact (0.618 bears, 0.617 does not)', () => {
  assert.equal(breed(A, B, { ...SOV, share: 0.618 }).born, true);    // exactly the floor bears
  assert.equal(breed(A, B, { ...SOV, share: 0.617 }).born, false);   // one below is starved
  assert.equal(breed(A, B, { ...SOV, share: 0.687 }).born, true);    // exactly the ceiling bears
  assert.equal(breed(A, B, { ...SOV, share: 0.688 }).born, false);   // one over is merged
});

test('breed: a node cannot breed with itself (no pair to cross)', () => {
  const r = breed(A, { ...A }, SOV);
  assert.equal(r.ok, false);
  assert.ok(r.why.includes('itself'));
});

test('breed: generation is one past the DEEPER parent (either side may be deeper)', () => {
  const deepA = { id: 'da', lineage: [], genome: ['a'], generation: 5 };
  const shallowB = { id: 'sb', lineage: [], genome: ['b'], generation: 2 };
  assert.equal(breed(deepA, shallowB, SOV).child.generation, 6);   // max(5,2)+1 — kills zeroing genA
  assert.equal(breed(shallowB, deepA, SOV).child.generation, 6);   // symmetric — kills zeroing genB
});

test('breed: a parent at generation zero is valid, and a missing generation counts as zero', () => {
  const z = { id: 'z', lineage: [], genome: ['g'], generation: 0 };   // exactly zero is valid
  assert.equal(breed(z, B, SOV).born, true);
  const noGen = { id: 'ng', lineage: [], genome: ['h'] };             // undefined -> 0
  assert.equal(breed(noGen, z, SOV).child.generation, 1);            // max(0,0)+1
});

test('breed: total on garbage parents / coupling', () => {
  assert.equal(breed(null, B, SOV).ok, false);
  assert.equal(breed(A, null, SOV).ok, false);
  assert.equal(breed({ id: '', lineage: [], genome: [] }, B, SOV).ok, false);        // empty id
  assert.equal(breed({ id: 'x', lineage: 'nope', genome: [] }, B, SOV).ok, false);   // lineage not array
  assert.equal(breed({ id: 'x', lineage: [1], genome: [] }, B, SOV).ok, false);      // lineage non-string
  assert.equal(breed({ id: 'x', lineage: [], genome: [2] }, B, SOV).ok, false);      // genome non-string
  assert.equal(breed({ id: 'x', lineage: [], genome: [], generation: -1 }, B, SOV).ok, false); // bad generation
  assert.equal(breed(A, B, 'x').ok, false);                                          // coupling not object
  assert.equal(breed(A, B, { ...SOV, share: 5 }).ok, false);                         // coupling out of range
});

// ── canBreed shortcut
test('canBreed: true only for a sovereign coupling', () => {
  assert.equal(canBreed(SOV), true);
  assert.equal(canBreed(MERGED), false);
  assert.equal(canBreed(EXTRACTIVE), false);
  assert.equal(canBreed(STARVED), false);
  assert.equal(canBreed(FROZEN), false);
  assert.equal(canBreed('garbage'), false);   // malformed is not fit
});

// ── bloodline
test('bloodline: flattens a node ancestry, deduped and sorted', () => {
  const child = breed(A, B, SOV).child;
  const r = bloodline(child);
  assert.equal(r.ok, true);
  assert.deepEqual(r.ancestors, ['nexus', 'root', 'seed', 'sididy']);
  // a grandchild carries the whole tree
  const C = { id: 'gary', lineage: [], genome: ['nexus-warp'] };
  const grand = breed(child, C, SOV).child;
  assert.ok(bloodline(grand).ancestors.includes('nexus'));
  assert.ok(bloodline(grand).ancestors.includes('gary'));
  assert.ok(bloodline(grand).ancestors.includes(child.id));
});

test('bloodline: total on garbage', () => {
  assert.equal(bloodline(null).ok, false);
  assert.equal(bloodline({ lineage: 'x' }).ok, false);
  assert.equal(bloodline({ lineage: [3] }).ok, false);
});

// ── the vendored fitness law still holds (couple-gate contract, carried with the code)
test('classifyCouple: the vendored law classifies correctly', () => {
  assert.equal(classifyCouple(SOV).verdict, 'SOVEREIGN_COUPLED');
  assert.equal(classifyCouple(MERGED).verdict, 'MERGED');
  assert.equal(classifyCouple({ ...SOV, flow: 0.382 }).verdict, 'SOVEREIGN_COUPLED'); // tol boundary
  assert.equal(classifyCouple({ ...SOV, flow: 0.383 }).verdict, 'EXTRACTIVE');
});

test('classifyCouple: exit shapes (kills the neither-exits AND)', () => {
  assert.equal(classifyCouple({ ...SOV, exitA: false, exitB: false }).verdict, 'MERGED');      // neither can leave
  assert.equal(classifyCouple({ ...SOV, exitA: true, exitB: false }).verdict, 'EXTRACTIVE');   // one captured
  assert.equal(classifyCouple({ ...SOV, exitA: false, exitB: true }).verdict, 'EXTRACTIVE');
});

test('classifyCouple: range endpoints valid, out-of-range and not-finite rejected', () => {
  assert.equal(classifyCouple({ ...SOV, share: 0 }).ok, true);       // exactly 0 valid (kills share < 0 -> <=)
  assert.equal(classifyCouple({ ...SOV, share: 1 }).ok, true);       // exactly 1 valid
  assert.equal(classifyCouple({ ...SOV, flow: 1 }).ok, true);        // exactly +1 valid (kills flow > 1 -> >=)
  assert.equal(classifyCouple({ ...SOV, flow: -1 }).ok, true);       // exactly -1 valid (kills flow < -1 -> <=)
  assert.equal(classifyCouple({ ...SOV, flow: 2 }).ok, false);       // out of range (kills the || -> &&)
  assert.equal(classifyCouple({ ...SOV, flow: -2 }).ok, false);
  assert.equal(classifyCouple({ ...SOV, share: 1.5 }).ok, false);
  assert.equal(classifyCouple({ ...SOV, share: NaN }).ok, false);    // not-finite rejected
  assert.equal(classifyCouple({ ...SOV, flow: Infinity }).ok, false);
});
