import { useEffect } from 'react';
import { FactoryCanvas } from './scene/FactoryCanvas';
import { Toolbar } from './ui/Toolbar';
import { SizePanel } from './ui/SizePanel';
import { MachinePalette } from './ui/MachinePalette';
import { InspectorPanel } from './ui/InspectorPanel';
import { MetricsPanel } from './ui/MetricsPanel';
import { StageLegend } from './ui/StageLegend';
import { useFactoryStore } from './state/factoryStore';

export default function App() {
  const rotateSelected = useFactoryStore((s) => s.rotateSelected);
  const deleteMachine = useFactoryStore((s) => s.deleteMachine);
  const cancelPlacing = useFactoryStore((s) => s.cancelPlacing);
  const toolMode = useFactoryStore((s) => s.toolMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const { selectedId } = useFactoryStore.getState();
      if (e.key === 'r' || e.key === 'R') rotateSelected();
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) deleteMachine(selectedId);
      else if (e.key === 'Escape') cancelPlacing();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rotateSelected, deleteMachine, cancelPlacing]);

  return (
    <div className="flex h-screen flex-col bg-[#0d0f14] text-gray-100">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        {/* Left: size + palette */}
        <aside className="w-64 shrink-0 space-y-4 overflow-y-auto border-r border-edge bg-panel p-3">
          <SizePanel />
          <MachinePalette />
        </aside>

        {/* Center: 3D viewport */}
        <main className="relative min-w-0 flex-1">
          <FactoryCanvas />
          <StageLegend />
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/50 px-3 py-1 text-[11px] text-gray-300">
            {toolMode === 'place'
              ? 'Click floor to place · Esc to cancel'
              : toolMode === 'delete'
                ? 'Click a machine to delete'
                : 'Drag to move · R rotate · Del remove · drag empty space to orbit'}
          </div>
        </main>

        {/* Right: inspector + metrics */}
        <aside className="w-72 shrink-0 space-y-5 overflow-y-auto border-l border-edge bg-panel p-3">
          <MetricsPanel />
          <div className="border-t border-edge pt-3">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Inspector</h2>
            <InspectorPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}
