import { useRef } from 'react';
import { useFactoryStore } from '../state/factoryStore';
import { exportToFile, parseImported } from '../persistence/storage';

export function Toolbar() {
  const toolMode = useFactoryStore((s) => s.toolMode);
  const setToolMode = useFactoryStore((s) => s.setToolMode);
  const newDoc = useFactoryStore((s) => s.newDoc);
  const loadDoc = useFactoryStore((s) => s.loadDoc);
  const toDoc = useFactoryStore((s) => s.toDoc);
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      loadDoc(parseImported(await file.text()));
    } catch {
      alert('Could not read that file — not a valid factory design.');
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-edge bg-panel px-4 py-2">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold text-white">
          Kada Factory Sim <span className="font-normal text-gray-500">· phone line designer</span>
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded ring-1 ring-edge">
          <ToolButton active={toolMode === 'select'} onClick={() => setToolMode('select')}>
            Select
          </ToolButton>
          <ToolButton active={toolMode === 'delete'} onClick={() => setToolMode('delete')}>
            Delete
          </ToolButton>
        </div>
        <Btn onClick={() => { if (confirm('Clear the current design?')) newDoc(); }}>New</Btn>
        <Btn onClick={() => exportToFile(toDoc())}>Export</Btn>
        <Btn onClick={() => fileRef.current?.click()}>Import</Btn>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>
    </header>
  );
}

function ToolButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs ${active ? 'bg-blue-600 text-white' : 'bg-panelAlt text-gray-300 hover:bg-panelAlt/70'}`}
    >
      {children}
    </button>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded bg-panelAlt px-3 py-1.5 text-xs text-gray-200 ring-1 ring-edge hover:bg-panelAlt/70"
    >
      {children}
    </button>
  );
}
