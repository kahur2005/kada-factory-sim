import type { FloorConfig, PlacedMachine, ProductionTarget } from '../data/types';
import { SPEC_BY_ID, REQUIRED_SPECS } from '../data/machineCatalog';
import { footprint } from '../data/geometry';
import { buildLine } from './lineModel';

/** Per-step line-balancing analysis (processing steps only). */
export interface StationAnalysis {
  specId: string;
  short: string;
  /** Parallel copies placed. */
  copies: number;
  /** ceil(cycleSeconds / takt): copies required to meet the target. */
  copiesNeeded: number;
  effCycleSeconds: number;
  /** effCycleSeconds / takt; > 1 means the step cannot meet demand. */
  utilization: number;
  /** Idle seconds per unit while paced by the bottleneck. */
  delaySeconds: number;
  overTakt: boolean;
}

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
  /** Demand pace: shift seconds / target units. */
  taktSeconds: number;
  /** Units the line produces in one shift at the bottleneck pace. */
  outputPerDay: number;
  targetMet: boolean;
  /** Σ effCycle / (steps × bottleneck cycle), 0..1. 1 = perfectly balanced. */
  balanceEfficiency: number;
  /** Per processing step, in process order. */
  stations: StationAnalysis[];
}

/**
 * Static throughput model: with one machine per process step, the line's output
 * is gated by its slowest *processing* station (logistics handoffs excluded).
 * Duplicate machines of the same type run in parallel, dividing that step's
 * effective cycle time. Takt/delay analysis compares each step against demand
 * (takt) and against the bottleneck pace.
 */
export function deriveMetrics(
  machines: PlacedMachine[],
  floor: FloorConfig,
  target: ProductionTarget,
): Metrics {
  let totalPowerKw = 0;
  let operators = 0;
  let coveredArea = 0;

  for (const m of machines) {
    const spec = SPEC_BY_ID[m.specId];
    if (!spec) continue;
    totalPowerKw += spec.powerKw;
    operators += spec.operators;
    const fp = footprint(spec, m.rot);
    coveredArea += fp.w * fp.d;
  }

  // Processing steps only: logistics never set the bottleneck or enter analysis.
  const steps = buildLine(machines).filter((st) => st.spec.stage !== 'logistics');

  let slowestCycle = 0;
  let bottleneckSpecId: string | null = null;
  for (const st of steps) {
    if (st.effCycleSeconds > slowestCycle) {
      slowestCycle = st.effCycleSeconds;
      bottleneckSpecId = st.spec.id;
    }
  }

  const taktSeconds = (target.shiftHoursPerDay * 3600) / target.phonesPerDay;

  const stations: StationAnalysis[] = steps.map((st) => ({
    specId: st.spec.id,
    short: st.spec.short,
    copies: st.machines.length,
    copiesNeeded: Math.ceil(st.spec.cycleSeconds / taktSeconds),
    effCycleSeconds: st.effCycleSeconds,
    utilization: st.effCycleSeconds / taktSeconds,
    delaySeconds: slowestCycle - st.effCycleSeconds,
    overTakt: st.effCycleSeconds > taktSeconds + 1e-9,
  }));

  const capacityPerHour = slowestCycle > 0 ? Math.floor(3600 / slowestCycle) : 0;
  const outputPerDay =
    slowestCycle > 0 ? Math.floor((target.shiftHoursPerDay * 3600) / slowestCycle) : 0;
  const balanceEfficiency =
    steps.length > 0 && slowestCycle > 0
      ? steps.reduce((sum, st) => sum + st.effCycleSeconds, 0) / (steps.length * slowestCycle)
      : 0;

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
    taktSeconds,
    outputPerDay,
    targetMet: outputPerDay >= target.phonesPerDay,
    balanceEfficiency,
    stations,
  };
}
