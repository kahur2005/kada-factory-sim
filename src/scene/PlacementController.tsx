import { useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useFactoryStore } from '../state/factoryStore';
import { SPEC_BY_ID } from '../data/machineCatalog';
import { rectInBounds, rectOf, rectsOverlap, type Rect } from '../data/geometry';
import { GRID } from './FactoryFloor';
import { GhostMachine } from './GhostMachine';

const snap = (v: number) => Math.round(v / GRID) * GRID;

/** Invisible ground plane that drives placement, dragging and deselection. */
export function PlacementController() {
  const floor = useFactoryStore((s) => s.floor);
  const toolMode = useFactoryStore((s) => s.toolMode);
  const placingSpecId = useFactoryStore((s) => s.placingSpecId);
  const machines = useFactoryStore((s) => s.machines);
  const draggingId = useFactoryStore((s) => s.draggingId);
  const tryPlace = useFactoryStore((s) => s.tryPlace);
  const tryMove = useFactoryStore((s) => s.tryMove);
  const setDragging = useFactoryStore((s) => s.setDragging);
  const select = useFactoryStore((s) => s.select);

  const [ghost, setGhost] = useState<{ x: number; z: number } | null>(null);

  const ghostValid = (() => {
    if (!placingSpecId || !ghost) return false;
    const spec = SPEC_BY_ID[placingSpecId];
    if (!spec) return false;
    const r: Rect = { x: ghost.x, z: ghost.z, w: spec.size.w, d: spec.size.d };
    if (!rectInBounds(r, floor.width, floor.depth)) return false;
    return !machines.some((m) => rectsOverlap(r, rectOf(m)));
  })();

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const x = snap(e.point.x);
    const z = snap(e.point.z);
    if (toolMode === 'place' && placingSpecId) {
      setGhost({ x, z });
    } else if (draggingId) {
      tryMove(draggingId, x, z);
    }
  };

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (toolMode === 'place' && placingSpecId) {
      e.stopPropagation();
      tryPlace(snap(e.point.x), snap(e.point.z));
    } else if (toolMode === 'select') {
      // click on empty floor clears selection
      select(null);
    }
  };

  const onPointerUp = () => {
    if (draggingId) setDragging(null);
  };

  const size = Math.max(floor.width, floor.depth) + 20;

  return (
    <>
      <mesh
        position={[floor.width / 2, 0, floor.depth / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        visible={false}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial />
      </mesh>
      {toolMode === 'place' && placingSpecId && ghost && (
        <GhostMachine specId={placingSpecId} x={ghost.x} z={ghost.z} valid={ghostValid} />
      )}
    </>
  );
}
