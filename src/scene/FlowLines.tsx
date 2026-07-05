import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import type { PlacedMachine } from '../data/types';
import { rectOf } from '../data/geometry';
import { buildLine } from '../metrics/lineModel';
import { useFactoryStore } from '../state/factoryStore';

/** Overlay height above the floor — clears the grid lines without floating. */
const Y = 0.06;
const COLOR = '#4fd1ff';
const UP = new THREE.Vector3(0, 1, 0);

type Vec3 = [number, number, number];

function centerOf(m: PlacedMachine): Vec3 {
  const r = rectOf(m);
  return [r.x + r.w / 2, Y, r.z + r.d / 2];
}

/**
 * Material-flow overlay: for each consecutive pair of placed line steps, a line
 * from every copy of step i to every copy of step i+1 (fan-out / converge for
 * parallel stations), with a cone at each midpoint showing direction.
 */
export function FlowLines() {
  const machines = useFactoryStore((s) => s.machines);
  const showFlow = useFactoryStore((s) => s.showFlow);

  const segments = useMemo(() => {
    const steps = buildLine(machines);
    const segs: { from: Vec3; to: Vec3 }[] = [];
    for (let i = 0; i < steps.length - 1; i++) {
      for (const a of steps[i].machines) {
        for (const b of steps[i + 1].machines) {
          segs.push({ from: centerOf(a), to: centerOf(b) });
        }
      }
    }
    return segs;
  }, [machines]);

  if (!showFlow) return null;
  return (
    <group>
      {segments.map((s, i) => (
        <FlowSegment key={i} from={s.from} to={s.to} />
      ))}
    </group>
  );
}

function FlowSegment({ from, to }: { from: Vec3; to: Vec3 }) {
  const dir = new THREE.Vector3(to[0] - from[0], 0, to[2] - from[2]);
  if (dir.length() < 1e-3) return null; // co-located centers — nothing to draw
  const mid: Vec3 = [(from[0] + to[0]) / 2, Y, (from[2] + to[2]) / 2];
  const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  return (
    <group>
      <Line points={[from, to]} color={COLOR} lineWidth={2} transparent opacity={0.55} />
      <mesh position={mid} quaternion={quat}>
        <coneGeometry args={[0.09, 0.22, 8]} />
        <meshBasicMaterial color={COLOR} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}
