# Flow Lines & Line Analysis — Design

**Date:** 2026-07-02
**Status:** Approved for planning

## Goal

Make the layout editor read like a real production line: draw the material-flow
path between placed machines in canonical process order, replace hand-tuned
cycle times with researched vendor throughput data, and add line-balancing
analysis (takt time, utilization, delay, balance efficiency) against a
user-set production target.

Three features, one shared foundation: they all need "the ordered sequence of
process steps, each with its placed copies" — extracted once as a pure line
model, consumed by the flow-line renderer, the metrics, and the flow check.

Out of scope: animated / discrete-event simulation (deferred, own project),
user-drawn connections (canonical `order` defines the flow), canvas flagging
of over-takt stations (panel only).

## 1. Data model & research

### MachineSpec.throughput (new, required)

```ts
throughput: {
  rated: number;        // vendor-rated capacity, e.g. 72000
  unit: string;         // native unit, e.g. 'components/hr', 'boards/hr', 'phones/hr'
  perPhone: number;     // native units consumed per phone, e.g. 450 components on the mainboard
  source: string;       // datasheet URL or 'estimate: <reasoning>'
  confidence: 'datasheet' | 'estimate';
}
```

- Every one of the ~21 catalog machines gets researched values (web research
  of real vendor datasheets; engineering estimates where no public spec
  exists, marked `confidence: 'estimate'`).
- `cycleSec` is **derived at catalog load**: `cycleSec = perPhone / rated * 3600`,
  computed once into each spec object. All existing consumers
  (`deriveMetrics`, inspector, flow check) keep working untouched; the
  traceable vendor number is the source of truth.
- Research notes (findings, assumptions, conversions) go in
  `docs/machine-research.md`; the catalog keeps one-line source comments.
- Known consequence: derived cycle times will move bottleneck locations
  relative to today's hand-tuned values. This is the point of the feature,
  not a regression.

### FactoryDoc v2

```ts
target: { phonesPerDay: number; shiftHoursPerDay: number }  // defaults: 1000, 8
```

- `version` bumps 1 → 2. `normalize` migrates v1 docs by injecting the
  defaults; existing saved/exported layouts keep loading.
- Target values are clamped to ≥ 1 on input and in `normalize`.

## 2. Line model & flow lines

### src/metrics/lineModel.ts (new, pure)

```ts
interface LineStep {
  spec: MachineSpec;
  machines: PlacedMachine[];   // all placed copies, ≥1
  effCycleSec: number;         // spec.cycleSec / machines.length
}
buildLine(machines: PlacedMachine[]): LineStep[]  // placed steps only, sorted by spec.order
```

- **Chain membership:** processing steps plus the **loader** (physical start
  of the line). **Conveyor segments are excluded** — they are the transport,
  not a step. Steps not yet placed are skipped; the chain connects
  consecutive *placed* steps.
- Each `LineStep` carries its stage, so consumers filter as needed: flow
  lines draw the full chain (loader included); the metrics analysis uses
  **processing steps only**, preserving the existing rule that logistics
  never set the bottleneck.
- Consumers: `FlowLines` (scene), expanded `deriveMetrics`, and `flowCheck`
  (switches its internal ranking to this module's ordering; behavior
  unchanged).

### src/scene/FlowLines.tsx (new)

- For each consecutive step pair, draw a line from the footprint center of
  every machine in step *i* to every machine in step *i+1* (fan-out /
  converge for parallel copies; full bipartite between duplicated steps).
- Rendered slightly above the floor (y ≈ 0.06) to avoid z-fighting; single
  accent color, semi-transparent overlay; small direction cone at each
  line's midpoint.
- **"Flow" toggle in the Toolbar** — transient UI state in the store
  (not persisted), default on.
- Positions derive from `machines` in the store, so lines follow drags
  automatically.

## 3. Analysis metrics & UI

### deriveMetrics expansion (consumes buildLine + doc.target)

- **Takt:** `taktSec = shiftHoursPerDay * 3600 / phonesPerDay`.
- **Per step:**
  - `effCycleSec` (from the line model),
  - **utilization** = `effCycleSec / taktSec` (> 100% ⇒ cannot meet demand, flagged),
  - **delay per unit** = `bottleneckCycle − effCycleSec` (idle time per unit
    while paced by the bottleneck),
  - **copies needed** = `ceil(spec.cycleSec / taktSec)` vs copies placed.
- **Line level:**
  - output/day = `shiftHoursPerDay * 3600 / bottleneckCycle`,
  - target met / missed,
  - **balance efficiency** = `Σ effCycle / (steps × bottleneckCycle)`.

### MetricsPanel

1. **Target inputs:** phones/day and shift hours/day number inputs, writing
   to the doc through a new store action (persisted + exported).
2. **Station analysis table:** one compact row per placed step in order —
   short name, copies (placed/needed), eff cycle, utilization bar. Over-takt
   rows tinted red; bottleneck row keeps its existing highlight. Delay and
   balance efficiency appear in the summary block above the table.

### Edge cases

- No machines / no processing steps → analysis section hidden.
- Incomplete line → existing "missing stations" warning stays; analysis runs
  on what is placed.
- Target inputs clamped to ≥ 1.

## Verification

`npm run lint` (type-check — the repo's only check) plus a manual dev-server
pass: place a line, tweak targets, drag machines, confirm flow lines and the
analysis table update live. No test runner exists; staying with that
convention.
