import { describe, it, expect } from 'vitest';
import { ExpedienteStatus } from '../types';
import type { Partida } from '../types';
import { cargarArancel } from '../data/arancel';
import { ISC_MONTOS_DEFAULT } from '../data/isc';
import { emptyPartida, withDerived } from './partida';
import { aplicarPreliquidacion, editarTasa, estadoRenglon, tasasVigentes } from './preliquidacionExpediente';

const arancel = await cargarArancel();
const montos = { ...ISC_MONTOS_DEFAULT };
const AHORA = new Date('2026-10-19T12:00:00Z');
const p = (x: Partial<Partida> & Pick<Partida, 'id'>): Partida => withDerived({ ...emptyPartida(), ...x });

const aires = p({ id: 'a', codigoPartida: '8415.10.00', cantidad: 1, valorFob: 100 });
const servilletas = p({ id: 'b', codigoPartida: '4818.30.00', cantidad: 1, valorFob: 100 });
const inventado = p({ id: 'c', codigoPartida: '9999.99.99', cantidad: 1, valorFob: 100 });

const preliquidar = (partidas: Partida[], pre = null as ReturnType<typeof aplicarPreliquidacion>['preliquidacion'] | null, opts = {}) =>
  aplicarPreliquidacion({ partidas, preliquidacion: pre, status: ExpedienteStatus.Registrado }, arancel, montos, AHORA, opts);

describe('aplicarPreliquidacion', () => {
  it('congela las tasas del arancel por renglón y fecha la preliquidación', () => {
    const r = preliquidar([aires, servilletas]);
    expect(r.preliquidacion.fecha).toBe(AHORA.toISOString());
    expect(r.preliquidacion.tasas.a).toMatchObject({ codigoPartida: '8415.10.00', manual: false, tasas: { gravamen: 20, isc: 20 } });
    expect(r.preliquidacion.tasas.b.tasas.isc).toBe(0);
  });

  it('pasa el expediente a pre-liquidado cuando todos los renglones tienen tasas', () => {
    expect(preliquidar([aires]).status).toBe(ExpedienteStatus.PreLiquidado);
  });

  it('no cambia el estado si un renglón quedó sin tasas, y lo reporta', () => {
    const r = preliquidar([aires, inventado]);
    expect(r.status).toBe(ExpedienteStatus.Registrado);
    expect(r.noEnArancel.map((x) => x.id)).toEqual(['c']);
    expect(r.preliquidacion.tasas.c).toBeUndefined();
  });

  it('no retrocede un expediente que ya va más adelante', () => {
    const r = aplicarPreliquidacion({ partidas: [aires], preliquidacion: null, status: ExpedienteStatus.Presentado }, arancel, montos, AHORA);
    expect(r.status).toBe(ExpedienteStatus.Presentado);
  });

  it('conserva las tasas editadas a mano y completa sólo los renglones nuevos', () => {
    const editada = editarTasa(preliquidar([aires]).preliquidacion, aires, { gravamen: 3 }, AHORA);
    const r = preliquidar([aires, servilletas], editada);
    expect(r.preliquidacion.tasas.a).toMatchObject({ manual: true, tasas: { gravamen: 3 } });
    expect(r.preliquidacion.tasas.b).toMatchObject({ manual: false, tasas: { gravamen: 20 } });
  });

  it('restablecer vuelve a leer todo del arancel', () => {
    const editada = editarTasa(preliquidar([aires]).preliquidacion, aires, { gravamen: 3 }, AHORA);
    expect(preliquidar([aires], editada, { restablecer: true }).preliquidacion.tasas.a).toMatchObject({ manual: false, tasas: { gravamen: 20 } });
  });

  it('vuelve a buscar las tasas de un renglón cuyo código cambió y olvida los borrados', () => {
    const pre = preliquidar([aires, servilletas]).preliquidacion;
    const corregido = { ...aires, codigoPartida: '4818.30.00' };
    const r = preliquidar([corregido], pre);
    expect(r.preliquidacion.tasas.a).toMatchObject({ codigoPartida: '4818.30.00', tasas: { isc: 0 } });
    expect(r.preliquidacion.tasas.b).toBeUndefined();
  });
});

describe('estado de cada renglón', () => {
  const pre = preliquidar([aires]).preliquidacion;

  it('distingue arancel, manual, código cambiado y pendiente', () => {
    expect(estadoRenglon(aires, pre)).toBe('arancel');
    expect(estadoRenglon(aires, editarTasa(pre, aires, { isc: 0 }, AHORA))).toBe('manual');
    expect(estadoRenglon({ ...aires, codigoPartida: '4818.30.00' }, pre)).toBe('codigoCambio');
    expect(estadoRenglon(servilletas, pre)).toBe('pendiente');
    expect(estadoRenglon(aires, null)).toBe('pendiente');
  });

  it('una tasa guardada para otro código no aplica', () => {
    expect(tasasVigentes({ ...aires, codigoPartida: '4818.30.00' }, pre)).toBeNull();
    expect(tasasVigentes({ ...aires, codigoPartida: '84151000' }, pre)).not.toBeNull(); // mismo código, sin puntos
  });
});

describe('editarTasa', () => {
  it('un renglón sin tasas arranca sin gravamen y con el ITBIS estándar', () => {
    const r = editarTasa(null, inventado, { gravamen: 14 }, AHORA);
    expect(r.tasas.c).toMatchObject({ manual: true, codigoPartida: '9999.99.99', tasas: { gravamen: 14, itbis: 18, isc: 0 } });
    expect(r.fecha).toBe(AHORA.toISOString());
  });
});
