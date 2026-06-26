import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import type { MachineSpec } from '../data/types';
import { MODEL_BY_SPEC } from '../data/machineModels';

interface Props {
  url: string;
  spec: MachineSpec;
  /** Rotation in 90° steps (0–3), matching PlacedMachine.rot. */
  rot: number;
  /** Extra multiplier on top of the footprint-fit scale (default 1). */
  scale?: number;
}

/**
 * Renders a GLB model in place of the default box. The model is cloned per
 * instance (so multiple placements don't share one scene graph), scaled
 * uniformly to fit the machine's *unrotated* footprint, centered on X/Z, and
 * dropped so its base rests on the floor (y = 0). The 90° rotation is applied
 * by the wrapper group, which naturally swaps the footprint to match `rot`.
 */
export function MachineModel({ url, spec, rot, scale: scaleMul = 1 }: Props) {
  const { scene } = useGLTF(url);

  const object = useMemo(() => {
    const root = scene.clone(true);

    // Uniform scale that fits the model inside the spec's w×h×d box, then an
    // optional per-model multiplier to enlarge ones that read too small.
    const raw = new THREE.Box3().setFromObject(root);
    const size = raw.getSize(new THREE.Vector3());
    const scale =
      Math.min(spec.size.w / size.x, spec.size.h / size.y, spec.size.d / size.z) * scaleMul;
    root.scale.setScalar(scale);
    root.updateMatrixWorld(true);

    // Re-measure after scaling, then center on X/Z and rest the base on y = 0.
    const fitted = new THREE.Box3().setFromObject(root);
    const center = fitted.getCenter(new THREE.Vector3());
    root.position.set(-center.x, -fitted.min.y, -center.z);

    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return root;
  }, [scene, spec.size.w, spec.size.h, spec.size.d, scaleMul]);

  return (
    <group rotation={[0, (rot * Math.PI) / 2, 0]}>
      <primitive object={object} />
    </group>
  );
}

// Warm the loader cache so placing a machine doesn't stall on first render.
Object.values(MODEL_BY_SPEC).forEach((def) => useGLTF.preload(def.url));
