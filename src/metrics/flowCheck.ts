import type { PlacedMachine } from '../data/types';
import { SPEC_BY_ID } from '../data/machineCatalog';
import { LINE_SPECS } from './lineModel';
import { rectOf, type Rect } from '../data/geometry';

/**
 * Flow-adjacency validation.
 *
 * Production work flows in one direction along the canonical process order
 * (encoded by MachineSpec.order). A station placed *next to* other process
 * stations should sit beside at least one of its line neighbors (the step
 * immediately before/after it, or a parallel copy of itself). If it only
 * touches unrelated stations, it's likely misplaced.
 *
 * Logistics machines (loaders/conveyors) are connectors: they never trigger a
 * warning and are ignored as neighbors. Machines that touch nothing (or only
 * logistics) are left alone — the line may just be unfinished.
 */

/** Metres: machines within this gap on the facing axis count as adjacent. */
const ADJ_GAP = 0.75;
const EPS = 1e-6;

export interface FlowWarning {
  machineId: string;
  message: string;
}

// Non-logistics stations in process order, plus a rank lookup for O(1) checks.
const FLOW = LINE_SPECS.filter((s) => s.stage !== 'logistics');
const RANK: Record<string, number> = {};
FLOW.forEach((s, i) => {
  RANK[s.id] = i;
});

/** Are two specs the same step or one step apart in the process flow? */
function consecutive(aId: string, bId: string): boolean {
  const a = RANK[aId];
  const b = RANK[bId];
  if (a === undefined || b === undefined) return false;
  return Math.abs(a - b) <= 1;
}

/** The expected line neighbors (short labels) of a spec. */
function expectedNeighbors(specId: string): string {
  const i = RANK[specId];
  const labels = [FLOW[i - 1]?.short, FLOW[i + 1]?.short].filter(Boolean);
  return labels.length ? labels.join(' / ') : 'its line neighbors';
}

/** Side-by-side: separated by <= ADJ_GAP on one axis while overlapping the other. */
function adjacent(a: Rect, b: Rect): boolean {
  const gapX = Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w);
  const gapZ = Math.max(a.z, b.z) - Math.min(a.z + a.d, b.z + b.d);
  const facingX = gapX >= -EPS && gapX <= ADJ_GAP && gapZ < -EPS;
  const facingZ = gapZ >= -EPS && gapZ <= ADJ_GAP && gapX < -EPS;
  return facingX || facingZ;
}

export function findFlowWarnings(machines: PlacedMachine[]): FlowWarning[] {
  const items = machines
    .map((m) => ({ m, r: rectOf(m), spec: SPEC_BY_ID[m.specId] }))
    .filter((it) => it.spec && it.spec.stage !== 'logistics');

  const warnings: FlowWarning[] = [];
  for (const a of items) {
    const neighbors = items.filter((b) => b.m.id !== a.m.id && adjacent(a.r, b.r));
    if (neighbors.length === 0) continue; // isolated or only touching logistics — fine
    if (neighbors.some((b) => consecutive(a.spec.id, b.spec.id))) continue;
    warnings.push({
      machineId: a.m.id,
      message: `${a.spec.name} is placed next to ${neighbors[0].spec.short}, not a line step (expected near ${expectedNeighbors(a.spec.id)}).`,
    });
  }
  return warnings;
}
