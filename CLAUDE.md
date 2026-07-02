# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server.
- `npm run build` — type-check (`tsc --noEmit`) then production build.
- `npm run lint` — type-check only. **This is the only check in the repo** — there is no ESLint, Prettier, or test runner configured. Run it after any change.
- `npm run preview` — serve the production build locally.

There are no tests. Verify changes by running `npm run dev` and exercising the editor in the browser.

## What this is

A browser-based 3D **layout editor** for designing a smartphone production line: place real-world factory machines on a floor, see live derived metrics (power, headcount, throughput bottleneck). It is a static design tool — a true discrete-event simulation is intentionally deferred (the "sim" in the name is aspirational). Stack: React 18 + TypeScript, `@react-three/fiber` / `drei` (Three.js) for the 3D scene, Zustand for state, Tailwind for UI.

## Architecture

The app is built around **one Zustand store** ([src/state/factoryStore.ts](src/state/factoryStore.ts)) that holds the entire editable document (`floor` + `machines[]`) plus transient UI state (`toolMode`, `placingSpecId`, `selectedId`, `draggingId`). Both the 3D scene and the side-panel UI subscribe to this store; there is no other source of truth. The store autosaves to `localStorage` on every change via a `subscribe` at the bottom of the file, and hydrates from it on load.

Data flows in three layers:

1. **Domain data** ([src/data/](src/data/)) — pure, no React.
   - [types.ts](src/data/types.ts): core types. `MachineSpec` is a catalog template; `PlacedMachine` is an instance on the floor (references a spec by `specId`, has grid `x`/`z` and `rot` 0–3).
   - [machineCatalog.ts](src/data/machineCatalog.ts): the seed `MACHINE_CATALOG` of ~22 real production stations with footprints, power, cycle times, `stage`, `order`, and reference vendors. Also exports `SPEC_BY_ID`, `STAGE_COLORS`/`STAGE_LABELS` (shared by meshes, palette, legend), and `REQUIRED_SPECS` (the stations a "complete" line must contain).
   - [geometry.ts](src/data/geometry.ts): pure rect math — `footprint` (applies rotation, swapping w/d when odd), `rectOf`, `rectsOverlap`, `rectInBounds`. The store's `canFit` collision/bounds check is built entirely from these.
   - [machineModels.ts](src/data/machineModels.ts): `MODEL_BY_SPEC` maps spec ids to GLB files in [src/model/](src/model/) (imported with Vite's `?url`). Machines without an entry fall back to a colored box. The optional per-model `scale` is purely visual and never affects the collision footprint.

2. **Derivation** ([src/metrics/](src/metrics/)) — pure functions over `machines`.
   - [deriveMetrics.ts](src/metrics/deriveMetrics.ts): `deriveMetrics(machines, floor)`. Throughput model: output is gated by the slowest **processing** station (logistics stages excluded); duplicate machines of one type run in parallel, dividing that step's effective cycle time. Called both by the metrics panel and by the canvas (to highlight the bottleneck machine).
   - [flowCheck.ts](src/metrics/flowCheck.ts): `findFlowWarnings(machines)` — flow-adjacency validation. A processing station adjacent (≤ 0.75 m gap) to other processing stations must neighbor at least one consecutive step in the `order` sequence; logistics machines are connectors and are ignored. `App.tsx` computes this and shows a warning banner over the viewport.

3. **Views** — React, read-only against derived state, dispatch back through store actions.
   - [src/scene/](src/scene/): the Three.js viewport. `FactoryCanvas` wires lights + `OrbitControls` and maps `machines` to `MachineMesh`, which renders a `MachineModel` (GLB, cloned per instance, uniformly scaled to fit the spec's unrotated footprint, base resting on y = 0) when the spec has one, else a colored box. `PlacementController` is an invisible ground plane that handles all pointer interaction (placing via ghost, dragging to move, click-empty to deselect) and snaps to `GRID` (0.125 m, exported from `FactoryFloor`). `GhostMachine` previews a pending placement and is tinted by validity.
   - [src/ui/](src/ui/): side panels (`Toolbar`, `SizePanel`, `MachinePalette`, `InspectorPanel`, `MetricsPanel`, `StageLegend`) laid out by [src/App.tsx](src/App.tsx), which also owns global keyboard shortcuts (`R` rotate, `Del`/`Backspace` delete, `Esc` cancel placing).

4. **Persistence** ([src/persistence/storage.ts](src/persistence/storage.ts)): `localStorage` autosave/load plus JSON file `exportToFile`/`parseImported`. `normalize` defensively coerces unknown JSON into a valid `FactoryDoc` (drops malformed machines) — the entry point for any imported or stored document.

## Conventions worth knowing

- **Coordinates:** logical grid coords equal world coords, with the floor's min-corner at the origin `(0,0)`. A machine's `x`/`z` is its footprint's min-corner, not its center.
- **Validation is centralized:** any new placement/move/rotation must pass through `canFit` in the store so bounds + overlap rules stay in one place. Don't reimplement overlap checks in views (the ghost preview is the one read-only exception).
- **Stage is the organizing axis:** `Stage` drives color, ordering (`order`), legend grouping, and the required-line check. New machines need a `stage`, an `order`, and entries that keep `STAGE_COLORS`/`STAGE_LABELS` exhaustive.
- **`FactoryDoc` is versioned** (`version: 1`). If you change the serialized shape, bump the version and handle migration in `normalize`.
