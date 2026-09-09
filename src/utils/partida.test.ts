import { describe, it, expect } from 'vitest';
import { calcUnitario, withDerived, emptyPartida, migratePartida, tieneDetalle } from './partida';

describe('calcUnitario', () => {
  it('is FOB divided by quantity', () => {
    expect(calcUnitario(3456, 1430.5)).toBeCloseTo(2.4159, 4);
    expect(calcUnitario(100, 10)).toBe(10);
  });

  it('is 0 rather than Infinity when the quantity is missing', () => {
    expect(calcUnitario(100, 0)).toBe(0);
    expect(Number.isFinite(calcUnitario(100, 0))).toBe(true);
  });
});

describe('withDerived', () => {
  it('recomputes the unit price, ignoring whatever was stored', () => {
    const p = { ...emptyPartida(), cantidad: 4, valorFob: 100, unitario: 999 };
    expect(withDerived(p).unitario).toBe(25);
  });
});

describe('migratePartida', () => {
  it('fills the SIGA detail fields on a pre-v6 line', () => {
    const legacy = {
      id: 'p1', codigoPartida: '4818.30.00', descripcion: 'Servilletas', organico: false,
      cantidad: 10, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 100, unitario: 10, facturaDva: 'F-1',
    };
    const out = migratePartida(legacy);
    expect(out.id).toBe('p1');
    expect(out.codigoProducto).toBe('');
    expect(out.estadoProducto).toBe('IC04-001');   // NUEVO
    expect(out.vehiculo).toEqual({ tipo: '', chasis: '', color: '', motor: '', cc: 0 });
    expect(out.unitario).toBe(10);
  });

  it('keeps detail already present and re-derives the unit price', () => {
    const out = migratePartida({ ...emptyPartida(), marca: 'SUAO', cantidad: 4, valorFob: 100, unitario: 1 });
    expect(out.marca).toBe('SUAO');
    expect(out.unitario).toBe(25);
  });
});

describe('tieneDetalle', () => {
  it('is false for a plain line and true once any detail is set', () => {
    expect(tieneDetalle(emptyPartida())).toBe(false);
    expect(tieneDetalle({ ...emptyPartida(), marca: 'SUAO' })).toBe(true);
    expect(tieneDetalle({ ...emptyPartida(), vehiculo: { ...emptyPartida().vehiculo, chasis: 'X' } })).toBe(true);
    expect(tieneDetalle({ ...emptyPartida(), certificadoOrigen: true })).toBe(true);
  });
});
