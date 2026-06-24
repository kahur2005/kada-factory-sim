# Kada Factory Sim — 3D Phone Factory Designer

A browser-based 3D factory designer for **smartphone production lines**, inspired by
FlexSim's manufacturing simulation. Size a factory floor, place real-world manufacturing
machines on a snap grid, and read live capacity / power / headcount metrics.

> This is the **layout-editor** phase. A live discrete-event simulation (animated parts,
> queues, time-series throughput) is intentionally scoped as a later phase — the
> machine/metrics model is decoupled so it can drop in.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Using it

- **Set factory size** (top-left): width × depth in metres — the floor + grid resize live.
- **Place machines**: click a machine in the left palette, then click the floor. A ghost
  preview turns **red** when it would overlap another machine or leave the floor.
- **Edit**: in *Select* mode, click a machine to select it; **drag** to move,
  **R** to rotate 90°, **Del** to remove. *Delete* mode removes on click.
- **Metrics** (right): total power (kW), headcount, floor utilization, and estimated
  output (units/hr) gated by the **bottleneck** station (highlighted red in 3D). Duplicate
  machines of a type run in parallel and raise that step's capacity. A validation panel
  warns about missing required stages.
- **Save/Load**: the design autosaves to `localStorage`; **Export/Import** JSON via the toolbar.

## How a phone factory works (the model behind the catalog)

A smartphone factory is two connected lines:

**A. SMT front-end — builds the motherboard (PCB):**
`Loader → Solder-Paste Printer → SPI → Pick-and-Place (high-speed → fine/IC) → Reflow Oven
→ AOI → X-Ray → Electrical (ICT) test → Unloader`. Highly automated, ~5–7 operators,
~30–60 s per board.

**B. Back-end — final assembly ("box build"):**
`Mount display → install motherboard → flex cables → cameras/speakers/mics → battery
→ housing close → calibration → functional test → battery/electrical test → final QC
→ packaging`. Labour-heavy. Tier-1 lines run a ~28.5 s takt time (~126 units/hr/line).

### Machine catalog (representative real-world specs)

Footprint (W×D m) · power · operators · cycle, plus **example real-world machines and
their manufacturers** for each station. Full data lives in
[`src/data/machineCatalog.ts`](src/data/machineCatalog.ts); select a placed machine to see
its reference machines in the inspector panel.

| Machine | Footprint | Power | Op | Cycle | Example makers (model) |
|---|---|---|---|---|---|
| PCB Loader/Unloader | 0.7×1.0 | 0.3 kW | 0 | 5 s | Nutek (NTM), JOT Automation, ASYS |
| Conveyor Segment | 0.5×1.0 | 0.2 kW | 0 | 3 s | Nutek, JOT Automation, ASYS |
| Laser Marking / Traceability | 1.0×1.2 | 1.5 kW | 0.5 | 8 s | Han's Laser (HDZ-PCB100), TRUMPF, Keyence |
| Solder-Paste Printer | 1.3×1.0 | 2.5 kW | 1 | 8 s | ASMPT/DEK (TQ, NeoHorizon), GKG (GT++), Panasonic |
| Solder Paste Inspection | 1.0×1.2 | 1.5 kW | 0.5 | 10 s | Koh Young (KY8080/Zenith), CyberOptics (SE600), Nordson |
| Pick-and-Place (high-speed) | 1.4×1.5 | 5 kW | 0.5 | 25 s | Yamaha (YSM40R), Fuji (NXT III), ASMPT (SIPLACE TX), Panasonic (NPM-DX) |
| Pick-and-Place (fine/IC) | 1.0×1.2 | 3 kW | 0.5 | 30 s | ASMPT (SIPLACE SX), Fuji (NXT M3/M6), Panasonic (NPM-D3) |
| Reflow Oven | 4.5×1.0 | 18 kW | 0.5 | 30 s | Heller (MK7), BTU (Pyramax), Rehm (VisionXC), Kurtz Ersa (HOTFLOW) |
| AOI (optical inspection) | 1.0×1.2 | 1.5 kW | 0.5 | 12 s | Koh Young (Zenith), Omron (VT-S530), Mirtec (MV-6), TRI |
| X-Ray Inspection (AXI) | 1.2×1.4 | 3 kW | 0.5 | 20 s | Nordson/Dage (Matrix, X-Series), ViTrox, Viscom, Yxlon/Nikon |
| ICT / Flying-Probe Test | 1.2×1.3 | 2 kW | 0.5 | 25 s | Keysight (i3070), Takaya, SPEA, Teradyne |
| Dispense / Conformal Coating | 1.2×1.3 | 2 kW | 0.5 | 22 s | Nordson ASYMTEK (Select Coat, Forte/Vantage), Nordson EFD |
| OCA Display Lamination | 1.2×1.2 | 2.5 kW | 1 | 30 s | Kunshan Honma, TBK, Hanwha |
| Display Mount | 1.0×1.0 | 0.5 kW | 1 | 28 s | Festo, JOT Automation, Hanwha |
| Camera / Module Assembly | 1.0×1.0 | 0.5 kW | 1 | 28 s | ASMPT (AMICRA), Hanwha, Festo/JOT |
| Battery Insert + Bond | 1.0×1.0 | 0.8 kW | 1 | 28 s | JOT Automation, Hanwha Momentum, Festo |
| Screwdriving / Housing Close | 1.0×1.2 | 1.5 kW | 1 | 28 s | DEPRAG, Atlas Copco (MicroTorque), Festo |
| Calibration | 1.0×1.0 | 1 kW | 0.5 | 30 s | OptoFidelity, Averna, Teradyne |
| Functional Test | 1.0×1.0 | 1 kW | 0.5 | 30 s | OptoFidelity (FUSION), Averna, Teradyne |
| Final QC / Vision | 1.0×1.2 | 1.5 kW | 0.5 | 25 s | Cognex (In-Sight), Keyence, OptoFidelity |
| Packaging / Box Build | 1.5×1.5 | 1.5 kW | 1 | 28 s | JOT Automation, Schubert, Bosch/ProMach |

## Tech stack

React 18 · React Three Fiber (Three.js) · drei · Zustand · Vite · TypeScript · Tailwind.

```
src/
  data/        types, machine catalog (seed specs), geometry helpers
  state/       Zustand store (floor, placed machines, tools, autosave)
  metrics/     pure deriveMetrics() — power, headcount, capacity, bottleneck, validation
  scene/       R3F canvas, floor+grid, machine meshes, ghost, placement controller
  ui/          toolbar, size panel, palette, inspector, metrics, legend
  persistence/ localStorage + JSON export/import
```
