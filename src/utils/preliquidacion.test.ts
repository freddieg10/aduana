import { describe, it, expect } from 'vitest';
import { emptyPartida, withDerived } from './partida';
import {
  preliquidar, calcularTasaServicio, normalizarHs,
  SIN_IMPUESTOS, type TasasRenglon,
} from './preliquidacion';
import type { Partida, Valores } from '../types';

/*
 * The four worked examples come from the DGA "Práctica de selectivo 2026" course material,
 * which prints every intermediate figure, so each step of the chain is pinned — not just the
 * total. If one of these starts failing, the formula changed, not the rounding.
 */

const partida = (p: Partial<Partida>): Partida => withDerived({ ...emptyPartida(), ...p });

const valores = (v: Partial<Valores>): Valores => ({
  tasaCambio: 60, valorFobTotal: 0, seguro: 0, flete: 0, otros: 0, valorCifTotal: 0, ...v,
});

const tasas = (t: Partial<TasasRenglon>): TasasRenglon => ({ ...SIN_IMPUESTOS, ...t });

/** Taxes only — the course examples predate the service fees. */
const corrida = (partidas: Partida[], v: Valores, t: TasasRenglon) =>
  preliquidar({ partidas, valores: v, resolverTasas: () => t });

describe('preliquidar — ISC ad-valorem ordinario', () => {
  it('caso 1: 300 aires acondicionados, gravamen 20% e ISC 20%', () => {
    const r = corrida(
      [partida({ codigoPartida: '8415.10.00', cantidad: 300, valorFob: 75_000 })],
      valores({ seguro: 800, flete: 2_000 }),
      tasas({ gravamen: 20, isc: 20 }),
    );
    const l = r.lineas[0];
    expect(l.cifUsd).toBe(77_800);
    expect(l.cifRd).toBe(4_668_000);
    expect(l.gravamen).toBe(933_600);
    expect(l.isc).toBe(1_120_320);
    expect(l.itbis).toBe(1_209_945.6);
    expect(r.totales.impuestos).toBe(3_263_865.6);
  });

  it('caso 2: 150 televisores, gravamen 20% e ISC 10%', () => {
    const r = corrida(
      [partida({ codigoPartida: '8528.72.00', cantidad: 150, valorFob: 75_000 })],
      valores({ seguro: 560, flete: 5_000 }),
      tasas({ gravamen: 20, isc: 10 }),
    );
    const l = r.lineas[0];
    expect(l.cifRd).toBe(4_833_600);
    expect(l.gravamen).toBe(966_720);
    expect(l.isc).toBe(580_032);
    expect(l.itbis).toBe(1_148_463.36);
    expect(r.totales.impuestos).toBe(2_695_215.36);
  });
});

describe('preliquidar — ISC específico', () => {
  it('caso 3: whisky, ad-valorem sobre precio de venta más monto por litro-grado', () => {
    const r = corrida(
      [partida({
        codigoPartida: '2208.30.20', cantidad: 2_000, unidad: 'LITROS',
        valorFob: 4_000, gradoAlcohol: 40, precioVentaMenor: 250,
      })],
      valores({ seguro: 600, flete: 800 }),
      tasas({ gravamen: 20, isc: 10, iscEspecificoTipo: 'alcohol', iscEspecificoMonto: 764.29 }),
    );
    const l = r.lineas[0];
    expect(l.cifUsd).toBe(5_400);
    expect(l.cifRd).toBe(324_000);
    expect(l.gravamen).toBe(64_800);
    expect(l.iscAdValorem).toBe(50_000);
    expect(l.iscEspecifico).toBe(611_432);
    expect(l.isc).toBe(661_432);
    expect(l.itbis).toBe(189_041.76);
    expect(r.totales.impuestos).toBe(915_273.76);
  });

  it('caso 4: cigarrillos, monto específico por cajetilla', () => {
    const r = corrida(
      [partida({
        codigoPartida: '2402.20.30', cantidad: 5_000, unidad: 'UNIDADES',
        valorFob: 1_250, precioVentaMenor: 2,
      })],
      valores({ seguro: 187.5, flete: 250 }),
      tasas({ gravamen: 20, isc: 20, iscEspecificoTipo: 'unidad', iscEspecificoMonto: 32.33 }),
    );
    const l = r.lineas[0];
    expect(l.cifRd).toBe(101_250);
    expect(l.gravamen).toBe(20_250);
    expect(l.iscAdValorem).toBe(2_000);
    expect(l.iscEspecifico).toBe(161_650);
    expect(l.itbis).toBe(51_327);
    expect(r.totales.impuestos).toBe(235_227);
  });

  it('avisa cuando falta el precio de venta o el grado alcohólico', () => {
    const r = corrida(
      [partida({ codigoPartida: '2208.30.20', cantidad: 100, valorFob: 500 })],
      valores({}),
      tasas({ isc: 10, iscEspecificoTipo: 'alcohol', iscEspecificoMonto: 764.29 }),
    );
    expect(r.advertencias).toContain('precioVentaMenor:2208.30.20');
    expect(r.advertencias).toContain('gradoAlcohol:2208.30.20');
  });
});

describe('preliquidar — prorrateo', () => {
  it('reparte seguro y flete según la participación en el FOB', () => {
    const r = corrida(
      [
        partida({ codigoPartida: '1', cantidad: 1, valorFob: 7_500 }),
        partida({ codigoPartida: '2', cantidad: 1, valorFob: 2_500 }),
      ],
      valores({ seguro: 400, flete: 1_600 }),
      tasas({ gravamen: 20 }),
    );
    expect(r.lineas[0].seguroUsd).toBe(300);
    expect(r.lineas[1].seguroUsd).toBe(100);
    expect(r.lineas[0].fleteUsd).toBe(1_200);
    expect(r.lineas[1].fleteUsd).toBe(400);
    // El total no depende del reparto: 12.000 CIF x 60 = 720.000
    expect(r.totales.cifRd).toBe(720_000);
  });

  it('reparte en partes iguales cuando no hay FOB', () => {
    const r = corrida(
      [partida({ codigoPartida: '1' }), partida({ codigoPartida: '2' })],
      valores({ flete: 1_000 }),
      tasas({}),
    );
    expect(r.lineas.map((l) => l.fleteUsd)).toEqual([500, 500]);
  });

  it('sin partidas devuelve totales en cero', () => {
    const r = preliquidar({ partidas: [], valores: valores({}), resolverTasas: () => SIN_IMPUESTOS });
    expect(r.lineas).toEqual([]);
    expect(r.totales.impuestos).toBe(0);
  });

  it('avisa cuando la tasa de cambio no está cargada', () => {
    const r = corrida([partida({ valorFob: 100, cantidad: 1 })], valores({ tasaCambio: 0 }), tasas({ gravamen: 20 }));
    expect(r.advertencias).toContain('tasaCambio');
    expect(r.totales.impuestos).toBe(0);
  });
});

describe('tasa por servicio aduanero', () => {
  it('cobra el DUA más el despacho de cada contenedor según su tamaño', () => {
    const c = (tipo: string) => ({ id: tipo, tipo, numero: '', sello1: '', sello2: '' });
    // 258,26 + (110,31 + 147,07) x 60
    expect(calcularTasaServicio([c('20'), c('40HC')], 60)).toBeCloseTo(258.26 + 257.38 * 60, 2);
  });

  it('sin contenedores sólo cobra el DUA', () => {
    expect(calcularTasaServicio([], 60)).toBe(258.26);
  });

  it('se suma al total pero no a los impuestos', () => {
    const r = preliquidar({
      partidas: [partida({ cantidad: 1, valorFob: 1_000 })],
      valores: valores({}),
      contenedores: [{ id: '1', tipo: '20', numero: '', sello1: '', sello2: '' }],
      resolverTasas: () => tasas({ gravamen: 20 }),
    });
    expect(r.totales.impuestos).toBe(12_000 + 12_960); // gravamen + ITBIS
    expect(r.totales.tasaServicio).toBe(6_876.86);
    expect(r.totales.total).toBe(r.totales.impuestos + r.totales.tasaServicio);
  });
});

describe('renglones sin tasas', () => {
  it('no suman impuestos y se reportan, para que el total no pase por completo', () => {
    const conTasas = partida({ codigoPartida: '8415.10.00', cantidad: 1, valorFob: 1_000 });
    const sinTasas = partida({ codigoPartida: '9999.99.99', cantidad: 1, valorFob: 1_000 });
    const r = preliquidar({
      partidas: [conTasas, sinTasas],
      valores: valores({}),
      resolverTasas: (p) => (p === conTasas ? tasas({ gravamen: 20 }) : undefined),
    });
    expect(r.lineas[1].sinTasas).toBe(true);
    expect(r.lineas[1].total).toBe(0);
    expect(r.lineas[0].sinTasas).toBe(false);
    expect(r.totales.impuestos).toBe(r.lineas[0].total);
    expect(r.advertencias).toContain('sinTasas:9999.99.99');
  });

  it('normaliza el código con o sin puntos', () => {
    expect(normalizarHs('8415.10.00')).toBe('84151000');
    expect(normalizarHs('84151000')).toBe('84151000');
  });
});
