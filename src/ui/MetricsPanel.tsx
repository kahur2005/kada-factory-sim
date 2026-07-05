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
            Units = placed{'/'}needed for takt · red = can't meet target
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
