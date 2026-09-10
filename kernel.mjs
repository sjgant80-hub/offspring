// offspring — a two-parent fork with a fitness precondition. Merge two independent systems
// into one descendant that carries BOTH lineages — but only when the coupling between the
// two parents is healthy. A child is born only from a SOVEREIGN coupling (both parents stay
// themselves and are genuinely joined). A coupling that dissolves one into the other (merged),
// drains one (extractive), is too loose (starved), or is static (frozen) bears NOTHING — the
// birth is refused, with the reason. You cannot breed a descendant from a dead join.
//
// The fitness law is couple-gate's classifyCouple, VENDORED verbatim below so this kernel is
// self-contained and the gate covers the whole decision. offspring adds only the birth:
// a child's identity, its two-parent lineage, and its inherited genome.
//
// Pure and total: never throws on garbage; returns { ok: false, why }. Guards one-per-line.

// ===== couple-gate — the fitness law (vendored verbatim from sjgant80-hub/couple-gate) =====

const FLOOR = 0.618;    // below this the coupling is too loose to be real — starved
const CEIL = 0.687;     // above this the two dissolve into one — merged
const FLOW_TOL = 0.382; // value balance wider than this one way is a drain — extractive

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isBool = (v) => typeof v === 'boolean';

export function classifyCouple(m) {
  if (!isObj(m)) return { ok: false, why: 'reads { share, identity, exitA, exitB, flow, regen }' };
  if (!isNum(m.share)) return { ok: false, why: 'share must be a number' };
  if (m.share < 0 || m.share > 1) return { ok: false, why: 'share must be within zero to one' };
  if (!isNum(m.flow)) return { ok: false, why: 'flow must be a number' };
  if (m.flow < -1 || m.flow > 1) return { ok: false, why: 'flow must be within minus one to one' };
  if (!isBool(m.identity)) return { ok: false, why: 'identity must be a boolean' };
  if (!isBool(m.exitA)) return { ok: false, why: 'exitA must be a boolean' };
  if (!isBool(m.exitB)) return { ok: false, why: 'exitB must be a boolean' };
  if (!isBool(m.regen)) return { ok: false, why: 'regen must be a boolean' };

  const overCeil = m.share > CEIL;
  const neitherExits = !m.exitA && !m.exitB;
  const oneExits = m.exitA !== m.exitB;
  const drains = Math.abs(m.flow) > FLOW_TOL;
  const belowFloor = m.share < FLOOR;

  let verdict, reason;
  if (!m.identity || overCeil || neitherExits) {
    verdict = 'MERGED';
    if (!m.identity) reason = 'the two are no longer distinguishable — identity dissolved';
    else if (overCeil) reason = 'coupling strength is over the ceiling — the two fused into one';
    else reason = 'neither side can leave — captured, held as one';
  } else if (drains || oneExits) {
    verdict = 'EXTRACTIVE';
    if (drains) reason = 'value runs one way past the tolerance — one side drains the other';
    else reason = 'only one side can leave — the trapped side is captured by the free one';
  } else if (belowFloor) {
    verdict = 'STARVED';
    reason = 'coupling strength is under the floor — too loose to be a real connection';
  } else if (!m.regen) {
    verdict = 'FROZEN';
    reason = 'coupled and sovereign, but nothing regenerates — a static, dead-held connection';
  } else {
    verdict = 'SOVEREIGN_COUPLED';
    reason = 'strength in the band, identity kept, both can leave, flow mutual, regenerating';
  }

  return {
    ok: true, verdict, alive: verdict === 'SOVEREIGN_COUPLED', reason,
    share: m.share, flow: m.flow, floor: FLOOR, ceiling: CEIL, flowTol: FLOW_TOL,
  };
}

/** Is this coupling fit to bear a child? True only for a sovereign couple. */
export function canBreed(coupling) {
  const r = classifyCouple(coupling);
  if (!r.ok) return false;
  return r.alive;
}

// ===== offspring — the birth =====

// A deterministic content-address for a child, derived from its inputs (FNV-1a, then a second
// pass so the same inputs always yield the same id and different inputs diverge). This is an
// IDENTITY DERIVATION, not a cryptographic signature — a real deployment signs the birth with
// the-wallet's Ed25519. Kept pure so the kernel is testable without crypto.
function fnv(str, basis) {
  let h = basis >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function childId(canon) {
  return fnv(canon, 0x811c9dc5) + fnv(canon + '#', 0x811c9dc5);
}

// A parent is { id, lineage: [ancestor ids], genome: [traits], generation? }. Validated, never guessed.
function validParent(p, label) {
  if (!isObj(p)) return label + ' must be an object { id, lineage, genome }';
  if (typeof p.id !== 'string' || p.id.length === 0) return label + '.id must be a non-empty string';
  if (!Array.isArray(p.lineage)) return label + '.lineage must be an array of ancestor ids';
  if (!p.lineage.every((x) => typeof x === 'string')) return label + '.lineage entries must be strings';
  if (!Array.isArray(p.genome)) return label + '.genome must be an array of traits';
  if (!p.genome.every((x) => typeof x === 'string')) return label + '.genome entries must be strings';
  if (p.generation !== undefined && !(Number.isInteger(p.generation) && p.generation >= 0)) {
    return label + '.generation, if given, must be a non-negative integer';
  }
  return null;
}

const uniqSort = (arr) => Array.from(new Set(arr)).sort();

/**
 * breed(parentA, parentB, coupling) — merge two lineages into a child, if the coupling is fit.
 *
 *  · A node cannot breed with itself (no pair to cross — a monopole bears nothing).
 *  · The coupling is classified by couple-gate. A child is born ONLY from SOVEREIGN_COUPLED;
 *    a MERGED / EXTRACTIVE / STARVED / FROZEN coupling is REFUSED the birth (born: false) with
 *    the verdict and reason — not an error, a refusal.
 *  · The child is SYMMETRIC in its parents (breed(A,B) and breed(B,A) yield the identical child)
 *    and DETERMINISTIC (the same two parents always breed the same child — one birth, not many):
 *      id         content-address of the sorted parent ids + the inherited genome
 *      parents    the two parent ids, sorted
 *      lineage    both parents + both their lineages, deduped and sorted (the fork-tree names all)
 *      genome     the union of both parents' genomes, deduped and sorted (it carries both bloodlines)
 *      generation one past the deeper parent
 */
export function breed(parentA, parentB, coupling) {
  const eA = validParent(parentA, 'parentA');
  if (eA) return { ok: false, why: eA };
  const eB = validParent(parentB, 'parentB');
  if (eB) return { ok: false, why: eB };
  if (parentA.id === parentB.id) {
    return { ok: false, why: 'a node cannot breed with itself — there is no pair to cross' };
  }
  const r = classifyCouple(coupling);
  if (!r.ok) return { ok: false, why: 'coupling: ' + r.why };

  if (!r.alive) {
    return { ok: true, born: false, verdict: r.verdict, reason: r.reason };
  }

  const parents = [parentA.id, parentB.id].sort();
  const genome = uniqSort([...parentA.genome, ...parentB.genome]);
  const lineage = uniqSort([parentA.id, parentB.id, ...parentA.lineage, ...parentB.lineage]);
  const genA = parentA.generation === undefined ? 0 : parentA.generation;
  const genB = parentB.generation === undefined ? 0 : parentB.generation;
  const generation = Math.max(genA, genB) + 1;
  const id = childId(JSON.stringify({ p: parents, g: genome }));

  return {
    ok: true, born: true, verdict: 'SOVEREIGN_COUPLED',
    child: { id, parents, lineage, genome, generation },
  };
}

/** Flatten a node's full ancestry (its own lineage), deduped and sorted — the pedigree. */
export function bloodline(node) {
  if (!isObj(node)) return { ok: false, why: 'node must be an object with a lineage' };
  if (!Array.isArray(node.lineage)) return { ok: false, why: 'node.lineage must be an array' };
  if (!node.lineage.every((x) => typeof x === 'string')) return { ok: false, why: 'lineage entries must be strings' };
  return { ok: true, ancestors: uniqSort(node.lineage) };
}
