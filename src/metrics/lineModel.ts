import type { MachineSpec, PlacedMachine } from '../data/types';
import { MACHINE_CATALOG, SPEC_BY_ID } from '../data/machineCatalog';

/**
 * The line model: the canonical process chain and, given placed machines,
 * the ordered steps actually present on the floor with their parallel copies.
 * Single source of truth for "what is the line" — consumed by the FlowLines
 * overlay, deriveMetrics and flowCheck.
 */

/**
 * Specs that form the flow chain, in canonical order: all processing steps
 * plus the loader (the physical start of the line). Conveyor segments are
 * the transport itself, not a step, so they are excluded.
 */
export const LINE_SPECS: MachineSpec[] = MACHINE_CATALOG.filter(
  (s) => s.stage !== 'logistics' || s.id === 'loader',
).sort((a, b) => a.order - b.order);

export interface LineStep {
  spec: MachineSpec;
  /** All placed copies of this step, ≥ 1. */
  machines: PlacedMachine[];
  /** spec.cycleSeconds / copies — parallel copies split the load. */
  effCycleSeconds: number;
}

/** The steps present on the floor, in process order. Unplaced steps are skipped. */
export function buildLine(machines: PlacedMachine[]): LineStep[] {
  const bySpec = new Map<string, PlacedMachine[]>();
  for (const m of machines) {
    if (!SPEC_BY_ID[m.specId]) continue;
    const list = bySpec.get(m.specId);
    if (list) list.push(m);
    else bySpec.set(m.specId, [m]);
  }
  const steps: LineStep[] = [];
  for (const spec of LINE_SPECS) {
    const copies = bySpec.get(spec.id);
    if (!copies) continue;
    steps.push({ spec, machines: copies, effCycleSeconds: spec.cycleSeconds / copies.length });
  }
  return steps;
}
