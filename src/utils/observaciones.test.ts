import { describe, it, expect } from 'vitest';
import { parseLegacyNotes, sortObservaciones, makeObservacion } from './observaciones';

describe('parseLegacyNotes', () => {
  it('returns an empty list for empty input', () => {
    expect(parseLegacyNotes('')).toEqual([]);
    expect(parseLegacyNotes(undefined)).toEqual([]);
    expect(parseLegacyNotes(null)).toEqual([]);
  });

  it('parses the three-field ISO|user|text format', () => {
    const [o] = parseLegacyNotes('2026-04-05T14:30:00.000Z|Agente López|Falta BL');
    expect(o.fecha).toBe('2026-04-05T14:30:00.000Z');
    expect(o.usuario).toBe('Agente López');
    expect(o.texto).toBe('Falta BL');
    expect(o.id).toBeTruthy();
  });

  it('keeps pipes inside the text', () => {
    const [o] = parseLegacyNotes('2026-04-05T14:30:00.000Z|Ana|a | b | c');
    expect(o.texto).toBe('a | b | c');
  });

  it('handles the older two-field and plain-text lines', () => {
    const list = parseLegacyNotes('2026-04-05T14:30:00.000Z|solo fecha\nsolo texto');
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ usuario: '', texto: 'solo fecha' });
    expect(list[0].fecha).toBe('2026-04-05T14:30:00.000Z');
    expect(list[1]).toMatchObject({ fecha: '', usuario: '', texto: 'solo texto' });
  });

  it('skips blank lines', () => {
    expect(parseLegacyNotes('\n\nx\n\n')).toHaveLength(1);
  });
});

describe('sortObservaciones', () => {
  const a = { id: 'a', fecha: '2026-01-01T00:00:00Z', usuario: '', texto: 'a', publica: false };
  const b = { id: 'b', fecha: '2026-02-01T00:00:00Z', usuario: '', texto: 'b', publica: false };
  const undated = { id: 'u', fecha: '', usuario: '', texto: 'u', publica: false };

  it('sorts newest first by default order desc and undated last', () => {
    expect(sortObservaciones([undated, a, b], 'desc').map((o) => o.id)).toEqual(['b', 'a', 'u']);
    expect(sortObservaciones([undated, b, a], 'asc').map((o) => o.id)).toEqual(['a', 'b', 'u']);
  });

  it('does not mutate the input', () => {
    const input = [b, a];
    sortObservaciones(input, 'asc');
    expect(input.map((o) => o.id)).toEqual(['b', 'a']);
  });
});

describe('makeObservacion', () => {
  it('trims text and stamps an ISO date', () => {
    const o = makeObservacion('Ana', '  hola  ');
    expect(o.texto).toBe('hola');
    expect(o.usuario).toBe('Ana');
    expect(new Date(o.fecha).toISOString()).toBe(o.fecha);
  });
});
