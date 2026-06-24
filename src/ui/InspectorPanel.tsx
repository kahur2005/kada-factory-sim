import { useFactoryStore } from '../state/factoryStore';
import { SPEC_BY_ID, STAGE_COLORS, STAGE_LABELS } from '../data/machineCatalog';

export function InspectorPanel() {
  const selectedId = useFactoryStore((s) => s.selectedId);
  const machine = useFactoryStore((s) => s.machines.find((m) => m.id === s.selectedId));
  const rotateSelected = useFactoryStore((s) => s.rotateSelected);
  const deleteMachine = useFactoryStore((s) => s.deleteMachine);

  if (!selectedId || !machine) {
    return (
      <div className="text-xs text-gray-500">
        Select a machine to see its specs. Click a palette item, then click the floor to place it.
      </div>
    );
  }

  const spec = SPEC_BY_ID[machine.specId];
  if (!spec) return null;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: STAGE_COLORS[spec.stage] }} />
          <h3 className="text-sm font-semibold text-white">{spec.name}</h3>
        </div>
        <p className="text-[11px] text-gray-400">{STAGE_LABELS[spec.stage]}</p>
      </div>
      <p className="text-xs text-gray-300">{spec.description}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <Spec label="Footprint" value={`${spec.size.w} × ${spec.size.d} m`} />
        <Spec label="Height" value={`${spec.size.h} m`} />
        <Spec label="Power" value={`${spec.powerKw} kW`} />
        <Spec label="Operators" value={String(spec.operators)} />
        <Spec label="Cycle" value={`${spec.cycleSeconds} s/unit`} />
        <Spec label="Rotation" value={`${machine.rot * 90}°`} />
      </dl>
      {spec.vendors.length > 0 && (
        <div>
          <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Reference machines
          </h4>
          <ul className="space-y-1">
            {spec.vendors.map((v) => (
              <li key={`${v.maker}-${v.model}`} className="rounded bg-panelAlt/60 px-2 py-1 ring-1 ring-edge">
                <div className="text-[11px] font-medium text-gray-200">
                  {v.maker} <span className="text-gray-400">· {v.model}</span>
                </div>
                {v.note && <div className="text-[10px] text-gray-500">{v.note}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={rotateSelected}
          className="flex-1 rounded bg-panelAlt px-2 py-1.5 text-xs text-white ring-1 ring-edge hover:bg-panelAlt/70"
        >
          Rotate (R)
        </button>
        <button
          onClick={() => deleteMachine(machine.id)}
          className="flex-1 rounded bg-red-600/80 px-2 py-1.5 text-xs text-white hover:bg-red-600"
        >
          Delete (Del)
        </button>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-200">{value}</dd>
    </>
  );
}
