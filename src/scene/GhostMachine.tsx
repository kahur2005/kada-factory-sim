import { SPEC_BY_ID, STAGE_COLORS } from '../data/machineCatalog';

interface Props {
  specId: string;
  x: number;
  z: number;
  valid: boolean;
}

/** Translucent preview of the machine being placed. */
export function GhostMachine({ specId, x, z, valid }: Props) {
  const spec = SPEC_BY_ID[specId];
  if (!spec) return null;
  const { w, d, h } = spec.size;
  return (
    <mesh position={[x + w / 2, h / 2, z + d / 2]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={valid ? STAGE_COLORS[spec.stage] : '#ff5252'}
        transparent
        opacity={0.45}
      />
    </mesh>
  );
}
