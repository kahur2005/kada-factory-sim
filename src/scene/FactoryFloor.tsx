import { useMemo } from 'react';
import * as THREE from 'three';
import { useFactoryStore } from '../state/factoryStore';

/** Grid spacing in metres. */
export const GRID = 0.5;

/** Floor plane + 1m grid lines. Logical coords == world coords (corner at origin). */
export function FactoryFloor() {
  const floor = useFactoryStore((s) => s.floor);

  const gridGeo = useMemo(() => {
    const pts: number[] = [];
    const step = 1; // draw a line every metre
    for (let x = 0; x <= floor.width + 1e-6; x += step) {
      pts.push(x, 0.002, 0, x, 0.002, floor.depth);
    }
    for (let z = 0; z <= floor.depth + 1e-6; z += step) {
      pts.push(0, 0.002, z, floor.width, 0.002, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [floor.width, floor.depth]);

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
      <lineSegments geometry={gridGeo}>
        <lineBasicMaterial color="#3c4456" />
      </lineSegments>
    </group>
  );
}
