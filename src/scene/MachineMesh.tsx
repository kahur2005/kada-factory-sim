import { useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { PlacedMachine } from '../data/types';
import { SPEC_BY_ID, STAGE_COLORS } from '../data/machineCatalog';
import { footprint } from '../data/geometry';
import { useFactoryStore } from '../state/factoryStore';

interface Props {
  machine: PlacedMachine;
  selected: boolean;
  isBottleneck: boolean;
}

export function MachineMesh({ machine, selected, isBottleneck }: Props) {
  const spec = SPEC_BY_ID[machine.specId];
  const toolMode = useFactoryStore((s) => s.toolMode);
  const select = useFactoryStore((s) => s.select);
  const deleteMachine = useFactoryStore((s) => s.deleteMachine);
  const setDragging = useFactoryStore((s) => s.setDragging);

  // Where the press started + whether the machine was already selected, so we can tell a
  // click (toggle selection) apart from a drag (move it).
  const pressRef = useRef<{ x: number; y: number; wasSelected: boolean } | null>(null);

  if (!spec) return null;
  const fp = footprint(spec, machine.rot);
  const h = spec.size.h;
  const color = STAGE_COLORS[spec.stage];

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (toolMode === 'delete') {
      deleteMachine(machine.id);
      return;
    }
    if (toolMode !== 'select') return;
    // Capture so we always receive the matching pointer-up and never get "stuck" to the cursor.
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pressRef.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, wasSelected: selected };
    select(machine.id);
    setDragging(machine.id);
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (toolMode !== 'select') return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    setDragging(null);
    const press = pressRef.current;
    pressRef.current = null;
    if (!press) return;
    const moved = Math.hypot(e.nativeEvent.clientX - press.x, e.nativeEvent.clientY - press.y) > 4;
    // A click (no drag) on a machine that was already selected releases it.
    if (!moved && press.wasSelected) select(null);
  };

  return (
    <group position={[machine.x + fp.w / 2, 0, machine.z + fp.d / 2]}>
      <mesh position={[0, h / 2, 0]} onPointerDown={onPointerDown} onPointerUp={onPointerUp} castShadow>
        <boxGeometry args={[fp.w, h, fp.d]} />
        <meshStandardMaterial
          color={isBottleneck ? '#ff5252' : color}
          emissive={selected ? '#ffffff' : '#000000'}
          emissiveIntensity={selected ? 0.25 : 0}
          transparent
          opacity={0.92}
        />
      </mesh>
      {selected && (
        <lineSegments position={[0, h / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(fp.w + 0.04, h + 0.04, fp.d + 0.04)]} />
          <lineBasicMaterial color="#ffffff" />
        </lineSegments>
      )}
      <Html position={[0, h + 0.3, 0]} center distanceFactor={18} occlude>
        <div
          className="pointer-events-none select-none whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white"
          style={{ outline: isBottleneck ? '1px solid #ff5252' : 'none' }}
        >
          {spec.short}
        </div>
      </Html>
    </group>
  );
}
