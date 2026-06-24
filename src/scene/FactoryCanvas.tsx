import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useFactoryStore } from '../state/factoryStore';
import { deriveMetrics } from '../metrics/deriveMetrics';
import { FactoryFloor } from './FactoryFloor';
import { MachineMesh } from './MachineMesh';
import { PlacementController } from './PlacementController';

export function FactoryCanvas() {
  const floor = useFactoryStore((s) => s.floor);
  const machines = useFactoryStore((s) => s.machines);
  const selectedId = useFactoryStore((s) => s.selectedId);
  const toolMode = useFactoryStore((s) => s.toolMode);
  const draggingId = useFactoryStore((s) => s.draggingId);

  const center: [number, number, number] = [floor.width / 2, 0, floor.depth / 2];
  const bottleneckId = deriveMetrics(machines, floor).bottleneckSpecId;
  const rotateEnabled = toolMode === 'select' && !draggingId;

  return (
    <Canvas
      shadows
      camera={{ position: [floor.width / 2, Math.max(floor.width, floor.depth) * 0.9, floor.depth * 1.4], fov: 50 }}
    >
      <color attach="background" args={['#11141a']} />
      <hemisphereLight intensity={0.6} groundColor="#1a1e26" />
      <directionalLight position={[10, 20, 8]} intensity={1.1} castShadow />
      <FactoryFloor />
      <PlacementController />
      {machines.map((m) => (
        <MachineMesh
          key={m.id}
          machine={m}
          selected={m.id === selectedId}
          isBottleneck={m.specId === bottleneckId}
        />
      ))}
      <OrbitControls target={center} enableRotate={rotateEnabled} makeDefault />
    </Canvas>
  );
}
