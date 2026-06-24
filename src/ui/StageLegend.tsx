import { STAGE_COLORS, STAGE_LABELS } from '../data/machineCatalog';
import type { Stage } from '../data/types';

const STAGES: Stage[] = ['logistics', 'smt', 'inspection', 'assembly', 'test', 'packaging'];

export function StageLegend() {
  return (
    <div className="absolute right-2 top-2 rounded bg-black/50 p-2 text-[11px] text-gray-200">
      <div className="mb-1 font-medium text-gray-400">Stages</div>
      <div className="space-y-0.5">
        {STAGES.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: STAGE_COLORS[s] }} />
            {STAGE_LABELS[s]}
          </div>
        ))}
      </div>
    </div>
  );
}
