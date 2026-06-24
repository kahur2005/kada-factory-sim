import type { MachineSpec, PlacedMachine } from './types';
import { SPEC_BY_ID } from './machineCatalog';

/** Footprint (width x, depth z) of a machine after applying its rotation. */
export function footprint(spec: MachineSpec, rot: number): { w: number; d: number } {
  return rot % 2 === 0 ? { w: spec.size.w, d: spec.size.d } : { w: spec.size.d, d: spec.size.w };
}

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Axis-aligned rect occupied by a placed machine. */
export function rectOf(m: PlacedMachine): Rect {
  const spec = SPEC_BY_ID[m.specId];
  const fp = footprint(spec, m.rot);
  return { x: m.x, z: m.z, w: fp.w, d: fp.d };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z;
}

/** True if rect fits entirely inside the floor (origin at 0,0). */
export function rectInBounds(r: Rect, floorW: number, floorD: number): boolean {
  return r.x >= 0 && r.z >= 0 && r.x + r.w <= floorW + 1e-6 && r.z + r.d <= floorD + 1e-6;
}
