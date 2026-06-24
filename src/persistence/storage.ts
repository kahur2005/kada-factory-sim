import type { FactoryDoc } from '../data/types';

const KEY = 'kada-factory-sim:doc';

export function saveToLocal(doc: FactoryDoc): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(doc));
  } catch {
    // ignore quota / private-mode errors
  }
}

export function loadFromLocal(): FactoryDoc | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearLocal(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Download the design as a JSON file. */
export function exportToFile(doc: FactoryDoc): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'factory-design.json';
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse + validate an imported file. Throws on malformed input. */
export function parseImported(text: string): FactoryDoc {
  const doc = normalize(JSON.parse(text));
  if (!doc) throw new Error('Invalid factory file');
  return doc;
}

/** Coerce unknown JSON into a valid FactoryDoc, or null if unusable. */
function normalize(data: unknown): FactoryDoc | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<FactoryDoc>;
  const floor = d.floor;
  if (!floor || typeof floor.width !== 'number' || typeof floor.depth !== 'number') return null;
  const machines = Array.isArray(d.machines) ? d.machines : [];
  return {
    version: 1,
    floor: { width: floor.width, depth: floor.depth },
    machines: machines.filter(
      (m) =>
        m &&
        typeof m.id === 'string' &&
        typeof m.specId === 'string' &&
        typeof m.x === 'number' &&
        typeof m.z === 'number',
    ),
  };
}
