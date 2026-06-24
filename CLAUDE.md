# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # tsc --noEmit type-check, then production build to dist/
npm run lint     # type-check only (tsc --noEmit) — this is the only "test" gate
npm run preview  # serve the built dist/
```

There is no test runner, ESLint, or Prettier configured. `tsc --noEmit` (via `lint`/`build`)
is the sole automated check — run it after changes. TypeScript is in `strict` mode.

## What this is

A browser 3D **layout editor** for smartphone production lines (FlexSim-inspired): size a
floor, place real-spec machines on a snap grid, read live derived metrics. It is **not** a
simulation. A discrete-event sim (animated parts, queues, time-series throughput) is
explicitly a deferred future phase — the data/metrics model is kept decoupled from the
editor so that engine can be added without reworking placement. Do not assume sim features
exist.

## Architecture

Data flows one way: a Zustand store holds the editable document; everything else derives
from it. There is one canonical machine catalog that the store, metrics, geometry, and UI
all read through.

- **`src/data/`** — the domain model and the single source of truth for machine specs.
  - `types.ts`: `MachineSpec` (static catalog spec) vs `PlacedMachine` (an instance on the
    floor: `specId` + grid `x,z` + `rot` 0–3). `FactoryDoc` is the versioned serializable
    document (`version: 1`).
  - `machineCatalog.ts`: `MACHINE_CATALOG` (the seed specs, with real-world-ish power/
    operators/cycle/footprint and an `order` defining canonical flow), plus derived lookups
    `SPEC_BY_ID`, `STAGE_COLORS`, `STAGE_LABELS`, and `REQUIRED_SPECS` (drives validation).
  - `geometry.ts`: pure rect math — `footprint()` (swaps w/d on odd rotation), `rectOf`,
    `rectsOverlap`, `rectInBounds`. All overlap/bounds checks go through here.
- **`src/state/factoryStore.ts`** — the Zustand store; the hub. Holds `floor`, `machines`,
  selection, and tool/placement state. `tryPlace`/`tryMove`/`rotateSelected` all gate
  through the private `canFit()` (bounds + no-overlap) and return `false`/no-op when blocked.
  A `subscribe` at the bottom **autosaves** the doc to localStorage on every change.
- **`src/metrics/deriveMetrics.ts`** — pure `deriveMetrics(machines, floor) → Metrics`. The
  throughput model: output is gated by the slowest **processing** station (logistics
  excluded); duplicate machines of a spec run in parallel, dividing that step's effective
  cycle time (`cycle / count`). Recompute from the store; never store metrics in state.
- **`src/scene/`** — React Three Fiber 3D viewport. `FactoryCanvas` hosts the canvas;
  `FactoryFloor` exports the `GRID = 0.5` (metres) snap constant; `PlacementController` is an
  invisible ground plane that handles all pointer interaction (snap → ghost preview → place /
  drag-move / deselect) and renders `GhostMachine` (red when invalid). `MachineMesh` renders
  placed machines.
- **`src/ui/`** — flat-panel React/Tailwind chrome around the canvas (Toolbar, SizePanel,
  MachinePalette, InspectorPanel, MetricsPanel, StageLegend). Keyboard shortcuts (R rotate,
  Del/Backspace remove, Esc cancel-place) live in `App.tsx` and are suppressed while typing
  in inputs.
- **`src/persistence/storage.ts`** — localStorage (key `kada-factory-sim:doc`) plus JSON
  `exportToFile` / `parseImported`.

### Conventions to preserve

- **Units are metres** in world/grid space; placement snaps to `GRID` (0.5 m). A machine's
  `x,z` is its footprint **min-corner**, not center.
- **Rotation** is `0|1|2|3` (90° steps); odd rotations swap width/depth — always go through
  `footprint()`/`rectOf()` rather than reading `spec.size` directly.
- Adding a machine type = add one entry to `MACHINE_CATALOG`; the palette, metrics,
  validation, and colors pick it up automatically via the derived lookups. Every entry
  must include a `vendors: MachineVendor[]` list (real maker + model + optional note),
  surfaced in the inspector's "Reference machines" section. If it's a required stage, also
  add it to `REQUIRED_SPECS`.
- Keep `deriveMetrics` and the geometry helpers **pure** — that decoupling is what lets the
  deferred simulation phase drop in later.
