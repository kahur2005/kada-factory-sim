import { useMemo } from 'react';
import * as THREE from 'three';
import { useFactoryStore } from '../state/factoryStore';

/** Placement snap spacing in metres — 1/8 m, so each 1×1 m cell has an 8×8 grid. */
export const GRID = 0.125;

/** Build a BufferGeometry of grid lines spanning the floor at the given step. */
function buildGrid(width: number, depth: number, step: number): THREE.BufferGeometry {
  const pts: number[] = [];
  for (let x = 0; x <= width + 1e-6; x += step) {
    pts.push(x, 0.002, 0, x, 0.002, depth);
  }
  for (let z = 0; z <= depth + 1e-6; z += step) {
    pts.push(0, 0.002, z, width, 0.002, z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/** Floor plane + grid lines. Logical coords == world coords (corner at origin). */
export function FactoryFloor() {
  const floor = useFactoryStore((s) => s.floor);

  // Fine snap grid (faint) + 1 m major lines (brighter) for readability.
  const minorGeo = useMemo(() => buildGrid(floor.width, floor.depth, GRID), [floor.width, floor.depth]);
  const majorGeo = useMemo(() => buildGrid(floor.width, floor.depth, 1), [floor.width, floor.depth]);

  return (
    <group>
      <mesh
        position={[floor.width / 2, 0, floor.depth / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[floor.width, floor.depth]} />
        <meshStandardMaterial color="#2a2f3a" />
      </mesh>
      <lineSegments geometry={minorGeo}>
        <lineBasicMaterial color="#333a47" />
      </lineSegments>
      <lineSegments geometry={majorGeo}>
        <lineBasicMaterial color="#3c4456" />
      </lineSegments>
    </group>
  );
}
