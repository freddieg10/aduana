import type { Observacion } from '../types';

/**
 * Converts the legacy `notes` string (one observation per line, `ISO|user|text`,
 * older lines may have only `ISO|text` or plain `text`) into Observacion records.
 * Used by the store migration and by Excel import when a notes column is present.
 */
export function parseLegacyNotes(notes: string | undefined | null): Observacion[] {
  if (!notes) return [];
  return notes
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|');
      if (parts.length === 1) {
        return { id: crypto.randomUUID(), fecha: '', usuario: '', texto: line, publica: false };
      }
      if (parts.length === 2) {
        return { id: crypto.randomUUID(), fecha: toIso(parts[0]), usuario: '', texto: parts[1], publica: false };
      }
      return {
        id: crypto.randomUUID(),
        fecha: toIso(parts[0]),
        usuario: parts[1],
        texto: parts.slice(2).join('|'),
        publica: false,
      };
    });
}

function toIso(s: string): string {
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

export function makeObservacion(usuario: string, texto: string, publica = false): Observacion {
  return { id: crypto.randomUUID(), fecha: new Date().toISOString(), usuario, texto: texto.trim(), publica };
}

/** Sort a copy, newest first (or oldest first). Entries without a date sort last. */
export function sortObservaciones(items: Observacion[], order: 'asc' | 'desc'): Observacion[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (!a.fecha && !b.fecha) return 0;
    if (!a.fecha) return 1;
    if (!b.fecha) return -1;
    return order === 'desc' ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha);
  });
  return copy;
}
