// Core domain types for the phone-factory designer.

/** Production stage a machine belongs to. Drives ordering, color and validation. */
export type Stage = 'logistics' | 'smt' | 'inspection' | 'assembly' | 'test' | 'packaging';

/**
 * A real-world piece of equipment that performs this station's task: who makes it,
 * a representative model line, and a one-line note (speed / accuracy / what's notable).
 * These are illustrative reference machines, not an endorsement or exact-config quote.
 */
export interface MachineVendor {
  /** Manufacturer / brand. */
  maker: string;
  /** Representative model or product line. */
  model: string;
  /** Short note on what's notable (throughput, accuracy, zones, etc.). */
  note?: string;
}

/** Researched throughput of a machine, in its native vendor metric. */
export interface MachineThroughput {
  /** Vendor-rated capacity per hour in native units, e.g. 100000 (CPH). */
  rated: number;
  /** Native unit label, e.g. 'components/hr', 'boards/hr', 'phones/hr'. */
  unit: string;
  /** Native units consumed per finished phone at this step, e.g. 800 components. */
  perPhone: number;
  /** Datasheet URL, or 'estimate: <reasoning>'. */
  source: string;
  confidence: 'datasheet' | 'estimate';
}

/**
 * A catalog machine = the static spec of a piece of equipment.
 * Numbers are representative real-world ranges (see plan / research notes).
 */
export interface MachineSpec {
  id: string;
  name: string;
  short: string;
  stage: Stage;
  /** Footprint in metres (x = width, z = depth). */
  size: { w: number; d: number; h: number };
  /** Typical electrical draw in kilowatts. */
  powerKw: number;
  /** Operators required to run the station (fractional = shared across stations). */
  operators: number;
  /** Researched native-unit capacity; cycleSeconds is derived from this. */
  throughput: MachineThroughput;
  /**
   * Seconds to process one phone-equivalent at this station. DERIVED at catalog
   * load from `throughput` (perPhone / rated * 3600) — never hand-set.
   */
  cycleSeconds: number;
  /** Ordinal position in the canonical work-tree (used for flow lines + validation). */
  order: number;
  description: string;
  /** Real-world machines (with manufacturer) that perform this station's task. */
  vendors: MachineVendor[];
}

/** An instance of a machine placed on the factory floor. */
export interface PlacedMachine {
  /** Unique instance id. */
  id: string;
  /** References MachineSpec.id. */
  specId: string;
  /** Grid position of the footprint's min-corner, in metres. */
  x: number;
  z: number;
  /** Rotation in 90° steps: 0 | 1 | 2 | 3. Swaps w/d when odd. */
  rot: 0 | 1 | 2 | 3;
}

export interface FloorConfig {
  width: number; // metres (x)
  depth: number; // metres (z)
}

export type ToolMode = 'select' | 'place' | 'delete';

/** Versioned, serializable design document. */
export interface FactoryDoc {
  version: 1;
  floor: FloorConfig;
  machines: PlacedMachine[];
}
