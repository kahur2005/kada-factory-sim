import type { FloorConfig, PlacedMachine } from '../data/types';
import { SPEC_BY_ID, REQUIRED_SPECS } from '../data/machineCatalog';
import { footprint } from '../data/geometry';

export interface Metrics {
  count: number;
  totalPowerKw: number;
  /** Sum of operators, rounded up to whole people. */
  headcount: number;
  /** Fraction 0..1 of floor area covered by footprints. */
  floorUtilization: number;
  /** Estimated finished units/hour = throughput of slowest processing station. */
  capacityPerHour: number;
  /** specId of the bottleneck station (slowest), or null. */
  bottleneckSpecId: string | null;
  /** Required stages not yet present on the floor. */
  missingStages: string[];
}

/**
 * Static throughput model: with one machine per process step, the line's output
 * is gated by its slowest *processing* station (logistics handoffs excluded).
 * Duplicate machines of the same type run in parallel, dividing that step's
 * effective cycle time — a simple but useful approximation.
 */
export function deriveMetrics(machines: PlacedMachine[], floor: FloorConfig): Metrics {
  let totalPowerKw = 0;
  let operators = 0;
  let coveredArea = 0;

  // Count parallel machines per spec to model parallel capacity.
  const countBySpec = new Map<string, number>();

  for (const m of machines) {
    const spec = SPEC_BY_ID[m.specId];
    if (!spec) continue;
    totalPowerKw += spec.powerKw;
    operators += spec.operators;
    const fp = footprint(spec, m.rot);
    coveredArea += fp.w * fp.d;
    countBySpec.set(m.specId, (countBySpec.get(m.specId) ?? 0) + 1);
  }

  // Bottleneck = step with the highest effective cycle time (cycle / parallelism).
  let slowestCycle = 0;
  let bottleneckSpecId: string | null = null;
  for (const [specId, n] of countBySpec) {
    const spec = SPEC_BY_ID[specId];
    if (!spec || spec.stage === 'logistics') continue;
    const effective = spec.cycleSeconds / n;
    if (effective > slowestCycle) {
      slowestCycle = effective;
      bottleneckSpecId = specId;
    }
  }

  const capacityPerHour = slowestCycle > 0 ? Math.floor(3600 / slowestCycle) : 0;
  const floorArea = floor.width * floor.depth;

  const presentSpecs = new Set(machines.map((m) => m.specId));
  const missingStages = REQUIRED_SPECS.filter((r) => !presentSpecs.has(r.id)).map((r) => r.label);

  return {
    count: machines.length,
    totalPowerKw: Math.round(totalPowerKw * 10) / 10,
    headcount: Math.ceil(operators),
    floorUtilization: floorArea > 0 ? coveredArea / floorArea : 0,
    capacityPerHour,
    bottleneckSpecId,
    missingStages,
  };
}
