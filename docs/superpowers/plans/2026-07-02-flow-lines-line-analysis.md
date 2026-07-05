# Flow Lines & Line Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw material-flow lines between placed machines in canonical process order, replace hand-tuned cycle times with researched vendor throughput data, and add takt/utilization/delay/line-balance analysis against a user-set production target.

**Architecture:** One new pure module (`src/metrics/lineModel.ts`) computes "the ordered line" (steps × placed copies) and is consumed by three things: a new `FlowLines` scene overlay, an expanded `deriveMetrics`, and the existing `flowCheck`. `MachineSpec` gains a researched `throughput` field from which `cycleSeconds` is derived at catalog load. `FactoryDoc` bumps to v2 with a persisted production target.

**Tech Stack:** React 18 + TypeScript, @react-three/fiber + drei (Three.js), Zustand, Tailwind. Spec: `docs/superpowers/specs/2026-07-02-flow-lines-line-analysis-design.md`.

## Global Constraints

- **The only automated check is `npm run lint`** (`tsc --noEmit`). There is no test runner, ESLint, or Prettier — do NOT add one. Verification = lint + manual dev-server checks as written in each task.
- Run commands from repo root `D:\!!! GITHUB\kada-factory-sim` (quote the path — it contains `!` and spaces).
- Never reimplement overlap/bounds checks in views; `canFit` in the store stays the one validator.
- `STAGE_COLORS` / `STAGE_LABELS` must stay exhaustive over `Stage`; this plan does not add stages.
- Commit after every task with the message given in that task; end commit messages with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Defaults fixed by the spec: `DEFAULT_TARGET = { phonesPerDay: 1000, shiftHoursPerDay: 8 }`; flow-line overlay height y = 0.06; flow toggle default ON (transient, not persisted).

---

### Task 1: Throughput data model + seed values

**Files:**
- Modify: `src/data/types.ts` (add `MachineThroughput`, extend `MachineSpec`)
- Modify: `src/data/machineCatalog.ts` (raw catalog + derived `cycleSeconds`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `MachineThroughput` type; `MachineSpec.throughput: MachineThroughput` (required); `MACHINE_CATALOG` entries now carry `throughput`, and each spec's `cycleSeconds` is **derived**: `round1(perPhone / rated * 3600)`. All existing consumers of `cycleSeconds` keep working unchanged.

- [x] **Step 1: Add the throughput type to `src/data/types.ts`**

Insert after the `MachineVendor` interface:

```ts
/** Researched throughput of a machine, in its native vendor metric. */
export interface MachineThroughput {
  /** Vendor-rated capacity per hour in native units, e.g. 100000 (CPH). */
  rated: number;
  /** Native unit label, e.g. 'components/hr', 'boards/hr', 'phones/hr'. */
  unit: string;
  /** Native units consumed per finished phone at this step, e.g. 800 components. */
  perPhone: number;
  /** Datasheet URL, or 'estimate: <reasoning>'. */
  source: string;
  confidence: 'datasheet' | 'estimate';
}
```

In `MachineSpec`, add the field and update the `cycleSeconds` doc comment:

```ts
  /** Researched native-unit capacity; cycleSeconds is derived from this. */
  throughput: MachineThroughput;
  /**
   * Seconds to process one phone-equivalent at this station. DERIVED at catalog
   * load from `throughput` (perPhone / rated * 3600) — never hand-set.
   */
  cycleSeconds: number;
```

- [x] **Step 2: Restructure `src/data/machineCatalog.ts` to derive `cycleSeconds`**

Rename the literal array to `RAW_CATALOG` typed as `Omit<MachineSpec, 'cycleSeconds'>[]`, delete every hand-written `cycleSeconds` line, add a `throughput` block to every entry, and derive the exported catalog:

```ts
type RawSpec = Omit<MachineSpec, 'cycleSeconds'>;

const RAW_CATALOG: RawSpec[] = [
  /* ...all 21 entries, each with a throughput block, no cycleSeconds... */
];

/** cycleSeconds derived from researched throughput: seconds per phone-equivalent. */
export const MACHINE_CATALOG: MachineSpec[] = RAW_CATALOG.map((s) => ({
  ...s,
  cycleSeconds: Math.round((s.throughput.perPhone / s.throughput.rated) * 3600 * 10) / 10,
}));
```

Seed `throughput` values (all `confidence: 'estimate'` in this task; Task 2 upgrades to datasheets). `perPhone` assumptions: 1 mainboard per phone; ~800 passive components (high-speed placer) and ~80 ICs/fine-pitch parts (fine placer) per mainboard.

| id | rated | unit | perPhone | source (estimate reasoning) | → cycleSeconds |
|---|---|---|---|---|---|
| loader | 720 | boards/hr | 1 | magazine exchange ~5 s/board | 5.0 |
| conveyor | 1800 | boards/hr | 1 | 0.5 m/s edge-belt transport, never limiting | 2.0 |
| lasermark | 450 | boards/hr | 1 | ~8 s mark + index per board | 8.0 |
| printer | 400 | boards/hr | 1 | ~5 s core print cycle + transfer | 9.0 |
| spi | 450 | boards/hr | 1 | 3D SPI scan of phone-size board ~8 s | 8.0 |
| placer-hs | 100000 | components/hr | 800 | realistic (non-optimum) CPH for modular high-speed placer | 28.8 |
| placer-fine | 25000 | components/hr | 80 | IPC-condition CPH for fine-pitch/IC placer | 11.5 |
| reflow | 240 | boards/hr | 1 | ~1.4 m/min conveyor, ~0.35 m board pitch | 15.0 |
| aoi | 360 | boards/hr | 1 | 3D AOI scan ~10 s/board | 10.0 |
| xray | 150 | boards/hr | 1 | inline AXI, partial BGA coverage ~24 s | 24.0 |
| ict | 120 | boards/hr | 1 | ICT incl. fixture handling ~30 s | 30.0 |
| coating | 180 | boards/hr | 1 | selective coat + cure index ~20 s | 20.0 |
| oca | 150 | phones/hr | 1 | vacuum laminate + debubble cycle ~24 s | 24.0 |
| display | 130 | phones/hr | 1 | cobot-assisted display mount ~28 s | 27.7 |
| camera | 120 | phones/hr | 1 | multi-module fit + flex connect ~30 s | 30.0 |
| battery | 130 | phones/hr | 1 | insert + adhesive bond ~28 s | 27.7 |
| screw | 140 | phones/hr | 1 | ~12 screws @ ~1.6 s + handling | 25.7 |
| calibration | 80 | phones/hr | 1 | multi-sensor cal ~45 s per station | 45.0 |
| functest | 60 | phones/hr | 1 | boot + RF + audio + touch test ~60 s | 60.0 |
| qc | 240 | phones/hr | 1 | vision cosmetic inspect ~15 s | 15.0 |
| packaging | 600 | phones/hr | 1 | automated cartoner, ~6 s/box | 6.0 |

Example entry (apply the same shape to all 21; keep every other field as-is):

```ts
  {
    id: 'placer-hs',
    name: 'Pick-and-Place (High-Speed)',
    short: 'P&P HS',
    stage: 'smt',
    size: { w: 1.4, d: 1.5, h: 1.5 },
    powerKw: 5,
    operators: 0.5,
    throughput: {
      rated: 100000,
      unit: 'components/hr',
      perPhone: 800,
      source: 'estimate: realistic (non-optimum) CPH for modular high-speed placer',
      confidence: 'estimate',
    },
    order: 5,
    description: 'High-speed "chip shooter" placing tens of thousands of passives per hour.',
    vendors: [
      { maker: 'Yamaha', model: 'YSM40R', note: '~100,000 CPH modular' },
      { maker: 'Fuji', model: 'NXT III', note: 'up to ~96,000 CPH, 0201 mm parts' },
      { maker: 'ASMPT', model: 'SIPLACE TX', note: '~78,000 CPH, ±15 µm' },
      { maker: 'Panasonic', model: 'NPM-DX', note: '~78,000 CPH' },
    ],
  },
```

- [x] **Step 3: Type-check**

Run: `npm run lint`
Expected: exit 0, no output. (If it reports a missing `throughput` on any entry, you skipped one of the 21.)

- [x] **Step 4: Manual sanity check**

Run `npm run dev`, open the app: metrics panel still renders, estimated output is now gated by `functest` (60 s → 60 units/hr with one of each). Bottleneck label reads "Functional Test Station" when a functest is placed.

- [x] **Step 5: Commit**

```bash
git add src/data/types.ts src/data/machineCatalog.ts
git commit -m "feat: derive cycle times from researched machine throughput"
```

---

### Task 2: Web research — verify throughput against vendor datasheets

**Files:**
- Modify: `src/data/machineCatalog.ts` (update `rated`/`source`/`confidence` where datasheets found)
- Create: `docs/machine-research.md`

**Interfaces:**
- Consumes: `MachineThroughput` from Task 1.
- Produces: catalog values with traceable sources; `docs/machine-research.md` notes. No type/shape changes — later tasks depend only on the shape.

- [x] **Step 1: Research each machine via WebSearch**

For each catalog entry, search for the primary vendor's published rate using queries of the form `"<maker> <model> datasheet throughput"` / `"<maker> <model> CPH"` / `"<maker> <model> cycle time"`. Machines to research (primary vendor per catalog): Nutek NTM loader; Han's Laser HDZ-PCB100; ASMPT DEK TQ; Koh Young Zenith SPI; Yamaha YSM40R (CPH); ASMPT SIPLACE SX (CPH); Heller MK7 (conveyor speed); Omron VT-S530 AOI; Nordson Matrix AXI; Keysight i3070 ICT; Nordson ASYMTEK SL-940; OCA laminator cycle; DEPRAG screwdriving; OptoFidelity FUSION; Schubert TLM cartoner.

Rules:
- A published number found → set `rated` to it, `source` to the URL, `confidence: 'datasheet'`. If the published number is an "optimum" burst rate (common for placer CPH), keep a realistic derating and note it: `source: '<url> (derated from 200k optimum)'` — still `'datasheet'`.
- Nothing published → keep the Task 1 estimate unchanged.
- Do **not** change `perPhone` assumptions unless research contradicts them (e.g. component counts); if changed, update the reasoning text.

- [x] **Step 2: Write `docs/machine-research.md`**

One table with a row per machine: `id | vendor/model referenced | rated (unit) | perPhone | confidence | source | notes`. Below the table, a short "Assumptions" section stating: 1 mainboard per phone; ~800 passives + ~80 ICs per mainboard; rates are per-station sustained rates, not burst optimums; logistics rates are transport, excluded from bottleneck math. Populate the table from the final catalog values (post-research).

- [x] **Step 3: Type-check**

Run: `npm run lint`
Expected: exit 0.

- [x] **Step 4: Commit**

```bash
git add src/data/machineCatalog.ts docs/machine-research.md
git commit -m "docs: verify machine throughput against vendor datasheets"
```

---

### Task 3: FactoryDoc v2 — persisted production target

**Files:**
- Modify: `src/data/types.ts` (add `ProductionTarget`, `DEFAULT_TARGET`, bump `FactoryDoc`)
- Modify: `src/persistence/storage.ts` (migrate v1 → v2 in `normalize`)
- Modify: `src/state/factoryStore.ts` (target state + `setTarget`, v2 in `toDoc`/autosave/`loadDoc`/`newDoc`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `ProductionTarget { phonesPerDay: number; shiftHoursPerDay: number }`; `DEFAULT_TARGET` const; `FactoryDoc.version: 2` + `FactoryDoc.target: ProductionTarget`; store state `target: ProductionTarget` and action `setTarget(t: Partial<ProductionTarget>): void` (clamps: phonesPerDay ≥ 1 integer; shiftHoursPerDay in [1, 24]).

- [x] **Step 1: Types in `src/data/types.ts`**

```ts
/** Demand the line is designed against; drives takt time. */
export interface ProductionTarget {
  phonesPerDay: number;
  shiftHoursPerDay: number;
}

export const DEFAULT_TARGET: ProductionTarget = { phonesPerDay: 1000, shiftHoursPerDay: 8 };

/** Versioned, serializable design document. */
export interface FactoryDoc {
  version: 2;
  floor: FloorConfig;
  machines: PlacedMachine[];
  target: ProductionTarget;
}
```

- [x] **Step 2: Migration in `src/persistence/storage.ts`**

Replace `normalize` (v1 docs have no `target`; inject defaults, clamp bad values):

```ts
/** Coerce unknown JSON (v1 or v2) into a valid v2 FactoryDoc, or null if unusable. */
function normalize(data: unknown): FactoryDoc | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<FactoryDoc>;
  const floor = d.floor;
  if (!floor || typeof floor.width !== 'number' || typeof floor.depth !== 'number') return null;
  const machines = Array.isArray(d.machines) ? d.machines : [];
  const t = d.target;
  const target: ProductionTarget = {
    phonesPerDay:
      t && typeof t.phonesPerDay === 'number' && t.phonesPerDay >= 1
        ? Math.round(t.phonesPerDay)
        : DEFAULT_TARGET.phonesPerDay,
    shiftHoursPerDay:
      t && typeof t.shiftHoursPerDay === 'number' && t.shiftHoursPerDay >= 1 && t.shiftHoursPerDay <= 24
        ? t.shiftHoursPerDay
        : DEFAULT_TARGET.shiftHoursPerDay,
  };
  return {
    version: 2,
    floor: { width: floor.width, depth: floor.depth },
    machines: machines.filter(
      (m) =>
        m &&
        typeof m.id === 'string' &&
        typeof m.specId === 'string' &&
        typeof m.x === 'number' &&
        typeof m.z === 'number',
    ),
    target,
  };
}
```

Update the import at the top: `import type { FactoryDoc, ProductionTarget } from '../data/types';` and `import { DEFAULT_TARGET } from '../data/types';`.

- [x] **Step 3: Store in `src/state/factoryStore.ts`**

Add to imports: `ProductionTarget` (type) and `DEFAULT_TARGET` from `'../data/types'`. In `FactoryState` add:

```ts
  target: ProductionTarget;
  setTarget: (t: Partial<ProductionTarget>) => void;
```

In the store body:

```ts
  target: initial?.target ?? DEFAULT_TARGET,

  setTarget: (t) =>
    set((s) => {
      const merged = { ...s.target, ...t };
      return {
        target: {
          phonesPerDay: Math.max(1, Math.round(merged.phonesPerDay || 1)),
          shiftHoursPerDay: Math.min(24, Math.max(1, merged.shiftHoursPerDay || 1)),
        },
      };
    }),
```

Update the three doc sites to v2 + target:

```ts
  newDoc: () =>
    set({ machines: [], selectedId: null, toolMode: 'select', placingSpecId: null, target: DEFAULT_TARGET }),

  loadDoc: (doc) =>
    set({
      floor: doc.floor,
      machines: doc.machines,
      target: doc.target,
      selectedId: null,
      toolMode: 'select',
      placingSpecId: null,
    }),

  toDoc: () => {
    const { floor, machines, target } = get();
    return { version: 2, floor, machines, target };
  },
```

And the autosave subscription at the bottom:

```ts
useFactoryStore.subscribe((s) => {
  saveToLocal({ version: 2, floor: s.floor, machines: s.machines, target: s.target });
});
```

- [x] **Step 4: Type-check**

Run: `npm run lint`
Expected: exit 0.

- [x] **Step 5: Manual migration check**

Run `npm run dev` with an existing saved layout (v1 in localStorage): app loads it without error (target silently defaults). Export a file and confirm the JSON contains `"version": 2` and a `target` block.

- [x] **Step 6: Commit**

```bash
git add src/data/types.ts src/persistence/storage.ts src/state/factoryStore.ts
git commit -m "feat: FactoryDoc v2 with persisted production target"
```

---

### Task 4: Line model module

**Files:**
- Create: `src/metrics/lineModel.ts`
- Modify: `src/metrics/flowCheck.ts` (derive its ranking from the line model)

**Interfaces:**
- Consumes: `MACHINE_CATALOG`, `SPEC_BY_ID`, `MachineSpec`, `PlacedMachine`.
- Produces: `LineStep { spec: MachineSpec; machines: PlacedMachine[]; effCycleSeconds: number }`; `buildLine(machines: PlacedMachine[]): LineStep[]`; `LINE_SPECS: MachineSpec[]` (ordered chain membership: everything except conveyors — i.e. processing steps + loader).

- [x] **Step 1: Create `src/metrics/lineModel.ts`**

```ts
import type { MachineSpec, PlacedMachine } from '../data/types';
import { MACHINE_CATALOG, SPEC_BY_ID } from '../data/machineCatalog';

/**
 * The line model: the canonical process chain and, given placed machines,
 * the ordered steps actually present on the floor with their parallel copies.
 * Single source of truth for "what is the line" — consumed by the FlowLines
 * overlay, deriveMetrics and flowCheck.
 */

/**
 * Specs that form the flow chain, in canonical order: all processing steps
 * plus the loader (the physical start of the line). Conveyor segments are
 * the transport itself, not a step, so they are excluded.
 */
export const LINE_SPECS: MachineSpec[] = MACHINE_CATALOG.filter(
  (s) => s.stage !== 'logistics' || s.id === 'loader',
).sort((a, b) => a.order - b.order);

export interface LineStep {
  spec: MachineSpec;
  /** All placed copies of this step, ≥ 1. */
  machines: PlacedMachine[];
  /** spec.cycleSeconds / copies — parallel copies split the load. */
  effCycleSeconds: number;
}

/** The steps present on the floor, in process order. Unplaced steps are skipped. */
export function buildLine(machines: PlacedMachine[]): LineStep[] {
  const bySpec = new Map<string, PlacedMachine[]>();
  for (const m of machines) {
    if (!SPEC_BY_ID[m.specId]) continue;
    const list = bySpec.get(m.specId);
    if (list) list.push(m);
    else bySpec.set(m.specId, [m]);
  }
  const steps: LineStep[] = [];
  for (const spec of LINE_SPECS) {
    const copies = bySpec.get(spec.id);
    if (!copies) continue;
    steps.push({ spec, machines: copies, effCycleSeconds: spec.cycleSeconds / copies.length });
  }
  return steps;
}
```

- [x] **Step 2: Point `flowCheck.ts` at the shared ordering**

In `src/metrics/flowCheck.ts`, replace:

```ts
import { SPEC_BY_ID, MACHINE_CATALOG } from '../data/machineCatalog';
```

with:

```ts
import { SPEC_BY_ID } from '../data/machineCatalog';
import { LINE_SPECS } from './lineModel';
```

and replace the `FLOW` definition:

```ts
// Non-logistics stations in process order, plus a rank lookup for O(1) checks.
const FLOW = LINE_SPECS.filter((s) => s.stage !== 'logistics');
```

(`FLOW` previously filtered logistics from `MACHINE_CATALOG` and sorted by `order`; `LINE_SPECS` is already sorted and only adds the loader, which this filter removes — behavior is identical.)

- [x] **Step 3: Type-check**

Run: `npm run lint`
Expected: exit 0.

- [x] **Step 4: Manual regression check**

Run `npm run dev`: place a printer next to an AOI (skipping steps between) — the existing amber flow warning still appears, identical to before.

- [x] **Step 5: Commit**

```bash
git add src/metrics/lineModel.ts src/metrics/flowCheck.ts
git commit -m "feat: shared line model for flow chain and metrics"
```

---

### Task 5: FlowLines overlay + toolbar toggle

**Files:**
- Create: `src/scene/FlowLines.tsx`
- Modify: `src/state/factoryStore.ts` (transient `showFlow` + `toggleFlow`)
- Modify: `src/scene/FactoryCanvas.tsx` (mount overlay)
- Modify: `src/ui/Toolbar.tsx` (Flow toggle button)

**Interfaces:**
- Consumes: `buildLine` from Task 4; `rectOf` from `src/data/geometry`.
- Produces: store fields `showFlow: boolean` (default `true`, transient — NOT in `FactoryDoc`) and `toggleFlow(): void`; `<FlowLines />` component (no props).

- [x] **Step 1: Store state**

In `FactoryState` interface add:

```ts
  /** Show the material-flow overlay (transient UI state, not persisted). */
  showFlow: boolean;
  toggleFlow: () => void;
```

In the store body add:

```ts
  showFlow: true,
  toggleFlow: () => set((s) => ({ showFlow: !s.showFlow })),
```

- [x] **Step 2: Create `src/scene/FlowLines.tsx`**

```tsx
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
```

- [x] **Step 3: Mount in `src/scene/FactoryCanvas.tsx`**

Add `import { FlowLines } from './FlowLines';` and render `<FlowLines />` directly after `<PlacementController />`.

- [x] **Step 4: Toggle in `src/ui/Toolbar.tsx`**

In `Toolbar`, read the state:

```ts
  const showFlow = useFactoryStore((s) => s.showFlow);
  const toggleFlow = useFactoryStore((s) => s.toggleFlow);
```

Add a button after the Select/Delete `ToolButton` group (before the `New` button), reusing the existing `ToolButton` style so on/off state is visible:

```tsx
        <div className="flex overflow-hidden rounded ring-1 ring-edge">
          <ToolButton active={showFlow} onClick={toggleFlow}>
            Flow
          </ToolButton>
        </div>
```

- [x] **Step 5: Type-check**

Run: `npm run lint`
Expected: exit 0.

- [x] **Step 6: Manual check**

Run `npm run dev`:
- Place loader → printer → reflow: cyan lines connect them in that order (loader→printer→reflow), cones point downstream, lines skip unplaced steps.
- Place a second printer: lines fan out from loader to both printers and converge to reflow.
- Place a conveyor between them: no line touches the conveyor.
- Drag a machine: its lines follow live.
- Toolbar "Flow" click hides/shows the overlay.

- [x] **Step 7: Commit**

```bash
git add src/scene/FlowLines.tsx src/scene/FactoryCanvas.tsx src/state/factoryStore.ts src/ui/Toolbar.tsx
git commit -m "feat: material-flow lines between line steps with toolbar toggle"
```

---

### Task 6: Takt / delay / balance analysis in deriveMetrics

**Files:**
- Modify: `src/metrics/deriveMetrics.ts`
- Modify: `src/scene/FactoryCanvas.tsx` (new third argument)
- Modify: `src/ui/MetricsPanel.tsx` (new third argument only — UI comes in Task 7)

**Interfaces:**
- Consumes: `buildLine` (Task 4), `ProductionTarget` (Task 3).
- Produces: `deriveMetrics(machines: PlacedMachine[], floor: FloorConfig, target: ProductionTarget): Metrics` with new `Metrics` fields `taktSeconds`, `outputPerDay`, `targetMet`, `balanceEfficiency`, `stations: StationAnalysis[]`, and exported `StationAnalysis { specId; short; copies; copiesNeeded; effCycleSeconds; utilization; delaySeconds; overTakt }`. Existing fields keep their exact names and meaning.

- [x] **Step 1: Rewrite `src/metrics/deriveMetrics.ts`**

```ts
import type { FloorConfig, PlacedMachine, ProductionTarget } from '../data/types';
import { SPEC_BY_ID, REQUIRED_SPECS } from '../data/machineCatalog';
import { footprint } from '../data/geometry';
import { buildLine } from './lineModel';

/** Per-step line-balancing analysis (processing steps only). */
export interface StationAnalysis {
  specId: string;
  short: string;
  /** Parallel copies placed. */
  copies: number;
  /** ceil(cycleSeconds / takt): copies required to meet the target. */
  copiesNeeded: number;
  effCycleSeconds: number;
  /** effCycleSeconds / takt; > 1 means the step cannot meet demand. */
  utilization: number;
  /** Idle seconds per unit while paced by the bottleneck. */
  delaySeconds: number;
  overTakt: boolean;
}

export interface Metrics {
  count: number;
  totalPowerKw: number;
  /** Sum of operators, rounded up to whole people. */
  headcount: number;
  /** Fraction 0..1 of floor area covered by footprints. */
  floorUtilization: number;
  /** Estimated finished units/hour = throughput of slowest processing station. */
  capacityPerHour: number;
  /** specId of the bottleneck station (slowest), or null. */
  bottleneckSpecId: string | null;
  /** Required stages not yet present on the floor. */
  missingStages: string[];
  /** Demand pace: shift seconds / target units. */
  taktSeconds: number;
  /** Units the line produces in one shift at the bottleneck pace. */
  outputPerDay: number;
  targetMet: boolean;
  /** Σ effCycle / (steps × bottleneck cycle), 0..1. 1 = perfectly balanced. */
  balanceEfficiency: number;
  /** Per processing step, in process order. */
  stations: StationAnalysis[];
}

/**
 * Static throughput model: with one machine per process step, the line's output
 * is gated by its slowest *processing* station (logistics handoffs excluded).
 * Duplicate machines of the same type run in parallel, dividing that step's
 * effective cycle time. Takt/delay analysis compares each step against demand
 * (takt) and against the bottleneck pace.
 */
export function deriveMetrics(
  machines: PlacedMachine[],
  floor: FloorConfig,
  target: ProductionTarget,
): Metrics {
  let totalPowerKw = 0;
  let operators = 0;
  let coveredArea = 0;

  for (const m of machines) {
    const spec = SPEC_BY_ID[m.specId];
    if (!spec) continue;
    totalPowerKw += spec.powerKw;
    operators += spec.operators;
    const fp = footprint(spec, m.rot);
    coveredArea += fp.w * fp.d;
  }

  // Processing steps only: logistics never set the bottleneck or enter analysis.
  const steps = buildLine(machines).filter((st) => st.spec.stage !== 'logistics');

  let slowestCycle = 0;
  let bottleneckSpecId: string | null = null;
  for (const st of steps) {
    if (st.effCycleSeconds > slowestCycle) {
      slowestCycle = st.effCycleSeconds;
      bottleneckSpecId = st.spec.id;
    }
  }

  const taktSeconds = (target.shiftHoursPerDay * 3600) / target.phonesPerDay;

  const stations: StationAnalysis[] = steps.map((st) => ({
    specId: st.spec.id,
    short: st.spec.short,
    copies: st.machines.length,
    copiesNeeded: Math.ceil(st.spec.cycleSeconds / taktSeconds),
    effCycleSeconds: st.effCycleSeconds,
    utilization: st.effCycleSeconds / taktSeconds,
    delaySeconds: slowestCycle - st.effCycleSeconds,
    overTakt: st.effCycleSeconds > taktSeconds + 1e-9,
  }));

  const capacityPerHour = slowestCycle > 0 ? Math.floor(3600 / slowestCycle) : 0;
  const outputPerDay =
    slowestCycle > 0 ? Math.floor((target.shiftHoursPerDay * 3600) / slowestCycle) : 0;
  const balanceEfficiency =
    steps.length > 0 && slowestCycle > 0
      ? steps.reduce((sum, st) => sum + st.effCycleSeconds, 0) / (steps.length * slowestCycle)
      : 0;

  const floorArea = floor.width * floor.depth;
  const presentSpecs = new Set(machines.map((m) => m.specId));
  const missingStages = REQUIRED_SPECS.filter((r) => !presentSpecs.has(r.id)).map((r) => r.label);

  return {
    count: machines.length,
    totalPowerKw: Math.round(totalPowerKw * 10) / 10,
    headcount: Math.ceil(operators),
    floorUtilization: floorArea > 0 ? coveredArea / floorArea : 0,
    capacityPerHour,
    bottleneckSpecId,
    missingStages,
    taktSeconds,
    outputPerDay,
    targetMet: outputPerDay >= target.phonesPerDay,
    balanceEfficiency,
    stations,
  };
}
```

- [x] **Step 2: Update the two callers to pass `target`**

`src/scene/FactoryCanvas.tsx` — add the selector and argument:

```ts
  const target = useFactoryStore((s) => s.target);
  // ...
  const bottleneckId = deriveMetrics(machines, floor, target).bottleneckSpecId;
```

`src/ui/MetricsPanel.tsx` — same:

```ts
  const target = useFactoryStore((s) => s.target);
  const m = deriveMetrics(machines, floor, target);
```

- [x] **Step 3: Type-check**

Run: `npm run lint`
Expected: exit 0.

- [x] **Step 4: Manual regression check**

Run `npm run dev`: existing metrics (machines / power / headcount / floor used / estimated output / bottleneck) all still display correct values; bottleneck highlight in the canvas unchanged.

- [x] **Step 5: Commit**

```bash
git add src/metrics/deriveMetrics.ts src/scene/FactoryCanvas.tsx src/ui/MetricsPanel.tsx
git commit -m "feat: takt, delay and line-balance analysis in derived metrics"
```

---

### Task 7: MetricsPanel — target inputs + station analysis table

**Files:**
- Modify: `src/ui/MetricsPanel.tsx`

**Interfaces:**
- Consumes: `Metrics.stations` / `taktSeconds` / `outputPerDay` / `targetMet` / `balanceEfficiency` (Task 6); `target` + `setTarget` from the store (Task 3).
- Produces: UI only.

- [x] **Step 1: Rewrite `src/ui/MetricsPanel.tsx`**

```tsx
import { useFactoryStore } from '../state/factoryStore';
import { deriveMetrics } from '../metrics/deriveMetrics';
import { SPEC_BY_ID } from '../data/machineCatalog';

export function MetricsPanel() {
  const machines = useFactoryStore((s) => s.machines);
  const floor = useFactoryStore((s) => s.floor);
  const target = useFactoryStore((s) => s.target);
  const setTarget = useFactoryStore((s) => s.setTarget);
  const m = deriveMetrics(machines, floor, target);

  const bottleneck = m.bottleneckSpecId ? SPEC_BY_ID[m.bottleneckSpecId] : null;
  const utilPct = Math.round(m.floorUtilization * 100);

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Line metrics</h2>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Machines" value={String(m.count)} />
        <Stat label="Power" value={`${m.totalPowerKw} kW`} />
        <Stat label="Headcount" value={`${m.headcount}`} />
        <Stat label="Floor used" value={`${utilPct}%`} warn={utilPct > 100} />
      </div>

      {/* Production target -> takt */}
      <div className="rounded bg-panelAlt p-2 ring-1 ring-edge">
        <div className="mb-1 text-[11px] text-gray-400">Production target</div>
        <div className="grid grid-cols-2 gap-2">
          <TargetInput
            label="Phones / day"
            value={target.phonesPerDay}
            min={1}
            onChange={(v) => setTarget({ phonesPerDay: v })}
          />
          <TargetInput
            label="Shift hrs / day"
            value={target.shiftHoursPerDay}
            min={1}
            max={24}
            onChange={(v) => setTarget({ shiftHoursPerDay: v })}
          />
        </div>
        <div className="mt-1.5 text-[11px] text-gray-400">
          Takt <span className="font-semibold text-white">{m.taktSeconds.toFixed(1)} s</span> / unit
        </div>
      </div>

      <div className="rounded bg-panelAlt p-2 ring-1 ring-edge">
        <div className="text-[11px] text-gray-400">Estimated output</div>
        <div className="text-lg font-semibold text-white">
          {m.capacityPerHour.toLocaleString()} <span className="text-xs font-normal text-gray-400">units/hr</span>
        </div>
        {bottleneck && (
          <div className="mt-0.5 text-[11px] text-amber-400">Bottleneck: {bottleneck.name}</div>
        )}
        {m.capacityPerHour > 0 && (
          <div className={`text-[11px] ${m.targetMet ? 'text-green-400' : 'text-red-400'}`}>
            {m.outputPerDay.toLocaleString()} / {target.phonesPerDay.toLocaleString()} units per shift —{' '}
            {m.targetMet ? 'target met' : 'target missed'}
          </div>
        )}
        {m.stations.length > 0 && (
          <div className="text-[11px] text-gray-500">
            Line balance {Math.round(m.balanceEfficiency * 100)}%
          </div>
        )}
      </div>

      {/* Station analysis */}
      {m.stations.length > 0 && (
        <div className="rounded bg-panelAlt p-2 ring-1 ring-edge">
          <div className="mb-1 text-[11px] text-gray-400">Station analysis</div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="font-normal">Step</th>
                <th className="font-normal text-right">Units</th>
                <th className="font-normal text-right">Cycle</th>
                <th className="w-[72px] pl-2 font-normal">Util</th>
              </tr>
            </thead>
            <tbody>
              {m.stations.map((st) => (
                <tr
                  key={st.specId}
                  className={
                    st.specId === m.bottleneckSpecId
                      ? 'text-amber-300'
                      : st.overTakt
                        ? 'text-red-400'
                        : 'text-gray-300'
                  }
                >
                  <td className="py-0.5">{st.short}</td>
                  <td className="text-right">
                    {st.copies}
                    {st.copiesNeeded > st.copies && (
                      <span className="text-red-400">/{st.copiesNeeded}</span>
                    )}
                  </td>
                  <td className="text-right">{st.effCycleSeconds.toFixed(1)}s</td>
                  <td className="pl-2">
                    <UtilBar utilization={st.utilization} over={st.overTakt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-1 text-[10px] text-gray-500">
            Units = placed{'/'}needed for takt · red = can’t meet target
          </div>
        </div>
      )}

      {m.missingStages.length > 0 ? (
        <div className="rounded bg-amber-500/10 p-2 text-[11px] text-amber-300 ring-1 ring-amber-500/30">
          <div className="font-medium">Incomplete line — missing:</div>
          <ul className="mt-1 list-inside list-disc">
            {m.missingStages.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : (
        m.count > 0 && (
          <div className="rounded bg-green-500/10 p-2 text-[11px] text-green-300 ring-1 ring-green-500/30">
            Complete line — all required stages present.
          </div>
        )
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded bg-panelAlt p-2 ring-1 ring-edge">
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className={`text-sm font-semibold ${warn ? 'text-red-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function TargetInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-gray-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 w-full rounded bg-panel px-1.5 py-1 text-xs text-white ring-1 ring-edge focus:outline-none focus:ring-blue-500"
      />
    </label>
  );
}

function UtilBar({ utilization, over }: { utilization: number; over: boolean }) {
  const pct = Math.min(utilization, 1) * 100;
  return (
    <div className="flex items-center gap-1">
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-panel">
        <div
          className={`h-full ${over ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-[10px] text-gray-500">
        {Math.round(utilization * 100)}%
      </span>
    </div>
  );
}
```

- [x] **Step 2: Type-check**

Run: `npm run lint`
Expected: exit 0.

- [x] **Step 3: Manual check**

Run `npm run dev`:
- Empty floor: no station table, no analysis rows; target inputs still visible and editable.
- Place one of each processing station: table shows steps in order, bottleneck row amber, slow stations red with `placed/needed` (e.g. functest at 1000/day over 8 h: takt = 28.8 s, cycle = 60 s → needed = ceil(60 / 28.8) = 3, so its Units cell reads `1/3`).
- Add a second functest: its util bar drops, copies show `2/…`, output/day rises.
- Set phones/day to 100: most rows go green/blue, target met turns green.
- Type junk (0, negative) into inputs: values clamp to ≥ 1; reload page: target persisted.

- [x] **Step 4: Commit**

```bash
git add src/ui/MetricsPanel.tsx
git commit -m "feat: production target inputs and station analysis table"
```

---

### Task 8: Docs + final verification

**Files:**
- Modify: `CLAUDE.md` (architecture notes)
- Modify: `docs/superpowers/plans/2026-07-02-flow-lines-line-analysis.md` (tick remaining boxes)

**Interfaces:** none — documentation and end-to-end verification.

- [x] **Step 1: Update `CLAUDE.md`**

- In the **Derivation** section: `deriveMetrics(machines, floor, target)` now also returns takt/utilization/delay/balance `stations` analysis; add `lineModel.ts` (`buildLine`, `LINE_SPECS` — the single source of truth for "what is the line"; conveyors excluded, loader included; metrics use processing steps only).
- In **Domain data**: `cycleSeconds` is derived from the researched `throughput` field (native vendor units + `perPhone` conversion) at catalog load; research notes live in `docs/machine-research.md`.
- In **Views**: `FlowLines` overlay (fan-out/converge between consecutive placed steps, toolbar-toggleable).
- In **Conventions**: `FactoryDoc` is now `version: 2` (adds `target`); keep the "bump version + migrate in `normalize`" rule.

- [x] **Step 2: Full verification pass**

Run: `npm run lint` → exit 0. Run: `npm run build` → completes without error.
Then `npm run dev` and walk the whole feature: place a full line, watch flow lines, tweak targets, check the analysis table, toggle Flow, export + re-import the JSON (v2 round-trip), reload the page (autosave round-trip).

- [x] **Step 3: Commit**

```bash
git add CLAUDE.md docs/superpowers/plans/2026-07-02-flow-lines-line-analysis.md
git commit -m "docs: document flow lines, throughput model and line analysis"
```
