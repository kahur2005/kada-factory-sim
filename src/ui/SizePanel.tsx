import { useFactoryStore } from '../state/factoryStore';

export function SizePanel() {
  const floor = useFactoryStore((s) => s.floor);
  const setFloor = useFactoryStore((s) => s.setFloor);

  const update = (key: 'width' | 'depth', value: string) => {
    const n = Math.max(2, Math.min(200, Number(value) || 0));
    setFloor({ [key]: n });
  };

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Factory size</h2>
      <div className="flex gap-2">
        <label className="flex-1 text-xs text-gray-300">
          Width (m)
          <input
            type="number"
            min={2}
            max={200}
            value={floor.width}
            onChange={(e) => update('width', e.target.value)}
            className="mt-1 w-full rounded bg-panelAlt px-2 py-1 text-sm text-white outline-none ring-1 ring-edge focus:ring-blue-500"
          />
        </label>
        <label className="flex-1 text-xs text-gray-300">
          Depth (m)
          <input
            type="number"
            min={2}
            max={200}
            value={floor.depth}
            onChange={(e) => update('depth', e.target.value)}
            className="mt-1 w-full rounded bg-panelAlt px-2 py-1 text-sm text-white outline-none ring-1 ring-edge focus:ring-blue-500"
          />
        </label>
      </div>
      <p className="text-[11px] text-gray-500">{(floor.width * floor.depth).toLocaleString()} m² floor area</p>
    </div>
  );
}
