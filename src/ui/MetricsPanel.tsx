import { useFactoryStore } from '../state/factoryStore';
import { deriveMetrics } from '../metrics/deriveMetrics';
import { SPEC_BY_ID } from '../data/machineCatalog';

export function MetricsPanel() {
  const machines = useFactoryStore((s) => s.machines);
  const floor = useFactoryStore((s) => s.floor);
  const target = useFactoryStore((s) => s.target);
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

      <div className="rounded bg-panelAlt p-2 ring-1 ring-edge">
        <div className="text-[11px] text-gray-400">Estimated output</div>
        <div className="text-lg font-semibold text-white">
          {m.capacityPerHour.toLocaleString()} <span className="text-xs font-normal text-gray-400">units/hr</span>
        </div>
        {bottleneck && (
          <div className="mt-0.5 text-[11px] text-amber-400">Bottleneck: {bottleneck.name}</div>
        )}
        {m.capacityPerHour > 0 && (
          <div className="text-[11px] text-gray-500">
            ≈ {(m.capacityPerHour * 24).toLocaleString()} units/day (24h)
          </div>
        )}
      </div>

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
