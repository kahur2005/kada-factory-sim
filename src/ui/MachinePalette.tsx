import { MACHINE_CATALOG, STAGE_COLORS, STAGE_LABELS } from '../data/machineCatalog';
import type { Stage } from '../data/types';
import { useFactoryStore } from '../state/factoryStore';

const STAGE_ORDER: Stage[] = ['logistics', 'smt', 'inspection', 'assembly', 'test', 'packaging'];

export function MachinePalette() {
  const placingSpecId = useFactoryStore((s) => s.placingSpecId);
  const toolMode = useFactoryStore((s) => s.toolMode);
  const startPlacing = useFactoryStore((s) => s.startPlacing);

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Machines</h2>
      {STAGE_ORDER.map((stage) => {
        const items = MACHINE_CATALOG.filter((m) => m.stage === stage).sort((a, b) => a.order - b.order);
        if (items.length === 0) return null;
        return (
          <div key={stage}>
            <div className="mb-1 flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: STAGE_COLORS[stage] }} />
              <span className="text-[11px] font-medium text-gray-400">{STAGE_LABELS[stage]}</span>
            </div>
            <div className="space-y-1">
              {items.map((m) => {
                const active = toolMode === 'place' && placingSpecId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => startPlacing(m.id)}
                    className={`w-full rounded px-2 py-1.5 text-left text-xs ring-1 transition ${
                      active
                        ? 'bg-blue-600/30 ring-blue-500'
                        : 'bg-panelAlt ring-edge hover:bg-panelAlt/70 hover:ring-gray-500'
                    }`}
                  >
                    <div className="font-medium text-white">{m.name}</div>
                    <div className="text-[10px] text-gray-400">
                      {m.size.w}×{m.size.d} m · {m.powerKw} kW · {m.operators} op · {m.cycleSeconds}s
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
