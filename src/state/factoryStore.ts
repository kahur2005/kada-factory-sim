import { create } from 'zustand';
import type { FactoryDoc, FloorConfig, PlacedMachine, ToolMode } from '../data/types';
import { rectInBounds, rectOf, rectsOverlap } from '../data/geometry';
import { SPEC_BY_ID } from '../data/machineCatalog';
import { loadFromLocal, saveToLocal } from '../persistence/storage';

const DEFAULT_FLOOR: FloorConfig = { width: 20, depth: 14 };

let idSeq = 1;
const nextId = () => `m${Date.now().toString(36)}${(idSeq++).toString(36)}`;

interface FactoryState {
  floor: FloorConfig;
  machines: PlacedMachine[];
  selectedId: string | null;
  toolMode: ToolMode;
  /** specId currently being placed (ghost active) when toolMode === 'place'. */
  placingSpecId: string | null;
  /** id of the machine being dragged, if any. */
  draggingId: string | null;

  setDragging: (id: string | null) => void;
  setFloor: (floor: Partial<FloorConfig>) => void;
  startPlacing: (specId: string) => void;
  cancelPlacing: () => void;
  setToolMode: (mode: ToolMode) => void;

  /** Attempts to place at grid pos; returns false if blocked (overlap / OOB). */
  tryPlace: (x: number, z: number) => boolean;
  /** Move an existing machine; returns false if blocked. */
  tryMove: (id: string, x: number, z: number) => boolean;
  rotateSelected: () => void;
  deleteMachine: (id: string) => void;
  select: (id: string | null) => void;

  newDoc: () => void;
  loadDoc: (doc: FactoryDoc) => void;
  toDoc: () => FactoryDoc;
}

/** Is candidate rect valid (in bounds + no overlap with others)? */
function canFit(
  candidate: PlacedMachine,
  others: PlacedMachine[],
  floor: FloorConfig,
): boolean {
  const r = rectOf(candidate);
  if (!rectInBounds(r, floor.width, floor.depth)) return false;
  for (const o of others) {
    if (o.id === candidate.id) continue;
    if (rectsOverlap(r, rectOf(o))) return false;
  }
  return true;
}

const initial = loadFromLocal();

export const useFactoryStore = create<FactoryState>((set, get) => ({
  floor: initial?.floor ?? DEFAULT_FLOOR,
  machines: initial?.machines ?? [],
  selectedId: null,
  toolMode: 'select',
  placingSpecId: null,
  draggingId: null,

  setDragging: (id) => set({ draggingId: id }),
  setFloor: (floor) => set((s) => ({ floor: { ...s.floor, ...floor } })),

  startPlacing: (specId) => set({ toolMode: 'place', placingSpecId: specId, selectedId: null }),
  cancelPlacing: () => set({ toolMode: 'select', placingSpecId: null }),
  setToolMode: (mode) =>
    set({ toolMode: mode, placingSpecId: mode === 'place' ? get().placingSpecId : null }),

  tryPlace: (x, z) => {
    const { placingSpecId, machines, floor } = get();
    if (!placingSpecId || !SPEC_BY_ID[placingSpecId]) return false;
    const candidate: PlacedMachine = { id: nextId(), specId: placingSpecId, x, z, rot: 0 };
    if (!canFit(candidate, machines, floor)) return false;
    set({ machines: [...machines, candidate], selectedId: candidate.id });
    return true;
  },

  tryMove: (id, x, z) => {
    const { machines, floor } = get();
    const cur = machines.find((m) => m.id === id);
    if (!cur) return false;
    const candidate = { ...cur, x, z };
    if (!canFit(candidate, machines, floor)) return false;
    set({ machines: machines.map((m) => (m.id === id ? candidate : m)) });
    return true;
  },

  rotateSelected: () => {
    const { selectedId, machines, floor } = get();
    if (!selectedId) return;
    const cur = machines.find((m) => m.id === selectedId);
    if (!cur) return;
    const candidate = { ...cur, rot: (((cur.rot + 1) % 4) as 0 | 1 | 2 | 3) };
    if (!canFit(candidate, machines, floor)) return; // rotation would collide
    set({ machines: machines.map((m) => (m.id === selectedId ? candidate : m)) });
  },

  deleteMachine: (id) =>
    set((s) => ({
      machines: s.machines.filter((m) => m.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  select: (id) => set({ selectedId: id }),

  newDoc: () => set({ machines: [], selectedId: null, toolMode: 'select', placingSpecId: null }),

  loadDoc: (doc) =>
    set({
      floor: doc.floor,
      machines: doc.machines,
      selectedId: null,
      toolMode: 'select',
      placingSpecId: null,
    }),

  toDoc: () => {
    const { floor, machines } = get();
    return { version: 1, floor, machines };
  },
}));

// Autosave: persist floor + machines on every relevant change.
useFactoryStore.subscribe((s) => {
  saveToLocal({ version: 1, floor: s.floor, machines: s.machines });
});
