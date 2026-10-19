import { describe, it, expect } from 'vitest';
import { cargarArancel } from '../data/arancel';
import { ISC_AD_VALOREM, ISC_SIN_SUCESOR, ISC_SUCESORES, ISC_MONTOS_DEFAULT } from '../data/isc';
import { emptyPartida, withDerived } from './partida';
import { preliquidar } from './preliquidacion';
import { sugerirTasas, iscDeTabla } from './tasas';
import type { Partida, Valores } from '../types';

/* These run against the real arancel.json, so they also guard the extraction. */
const arancel = await cargarArancel();
const montos = { ...ISC_MONTOS_DEFAULT };
const sugerir = (codigo: string) => sugerirTasas(codigo, arancel, montos);

describe('arancel.json', () => {
  it('trae las 7.697 subpartidas de la 7ma enmienda, todas con gravamen', () => {
    expect(arancel.size).toBe(7_697);
    for (const l of arancel.values()) {
      expect(l.codigo).toMatch(/^\d{8}$/);
      expect([0, 3, 8, 14, 20, 25, 40]).toContain(l.gravamen);
    }
  });

  it('marca las exenciones de ITBIS que imprime el arancel', () => {
    expect([...arancel.values()].filter((l) => l.itbisExento)).toHaveLength(721);
    expect(arancel.get('01061400')).toMatchObject({ gravamen: 8, itbisExento: true });  // conejos
    expect(arancel.get('10063000')).toMatchObject({ gravamen: 20, itbisExento: true }); // arroz
  });

  it('recupera los códigos que el PDF imprime partidos o con espacios', () => {
    for (const c of ['07020012', '20092100', '84371090', '84709020']) expect(arancel.has(c)).toBe(true);
  });

  it('cada código del anexo del ISC existe, tiene sucesor, lo cubre su partida o está señalado', () => {
    const cubiertoPorPartida = (c: string) => ISC_AD_VALOREM.some(([p]) => p.length === 4 && c.startsWith(p));
    const sinSucesor = new Set(ISC_SIN_SUCESOR.map((x) => x.codigo));
    for (const [codigo] of ISC_AD_VALOREM) {
      if (codigo.length === 4) {
        expect([...arancel.keys()].some((c) => c.startsWith(codigo)), codigo).toBe(true);
        continue;
      }
      const ok = arancel.has(codigo) || codigo in ISC_SUCESORES || sinSucesor.has(codigo) || cubiertoPorPartida(codigo);
      expect(ok, codigo).toBe(true);
    }
    for (const sucesores of Object.values(ISC_SUCESORES)) for (const c of sucesores) expect(arancel.has(c), c).toBe(true);
  });
});

describe('sugerirTasas', () => {
  it('toma el gravamen del arancel y el ITBIS estándar', () => {
    expect(sugerir('4818.30.00')?.tasas).toEqual({ gravamen: 20, itbis: 18, isc: 0, iscEspecificoTipo: 'ninguno', iscEspecificoMonto: 0 });
  });

  it('respeta la exención de ITBIS', () => {
    expect(sugerir('0106.14.00')?.tasas.itbis).toBe(0);
  });

  it('acepta el código con o sin puntos y devuelve null si no está en el arancel', () => {
    expect(sugerir('84151000')?.arancel.codigo).toBe('84151000');
    expect(sugerir('8415.10.00')?.arancel.codigo).toBe('84151000');
    expect(sugerir('9999.99.99')).toBeNull();
    expect(sugerir('84.15')).toBeNull();
    expect(sugerir('')).toBeNull();
  });

  it('aplica el ISC de la tabla: la subpartida manda sobre su partida', () => {
    expect(iscDeTabla('8529.90.00')).toBe(20);   // partida 85.29
    expect(iscDeTabla('8529.10.10')).toBe(10);   // antenas: 10%
    expect(sugerir('8528.72.00')).toMatchObject({ reglaIsc: 'tabla', tasas: { isc: 10 } });
    expect(sugerir('2403.11.00')?.tasas.isc).toBe(130);
    expect(sugerir('9302.00.10')?.tasas.isc).toBe(78);  // revólveres, by partida 93.02
  });

  it('lleva el ISC de los códigos derogados del anexo a sus sucesores', () => {
    expect(sugerir('7418.20.11')?.tasas.isc).toBe(20);  // jacuzzi de cobre
    expect(sugerir('8903.31.11')?.tasas.isc).toBe(20);  // yates
    expect(sugerir('7418.20.19')?.tasas.isc).toBe(0);   // el resto de la subpartida no
  });

  it('señala para verificar las subpartidas cuyo producto del anexo no tiene sucesor claro', () => {
    expect(sugerir('8525.89.12')).toMatchObject({ reglaIsc: null, notas: ['iscSinSucesor'], tasas: { isc: 0 } });
    expect(sugerir('8529.10.90')).toMatchObject({ reglaIsc: 'tabla', notas: ['iscSinSucesor'], tasas: { isc: 20 } });
  });

  it('alcohol: 10% sobre el precio al por menor más el monto por litro de alcohol absoluto', () => {
    expect(sugerir('2208.30.20')).toMatchObject({
      reglaIsc: 'alcohol', tasas: { isc: 10, iscEspecificoTipo: 'alcohol', iscEspecificoMonto: 764.29 },
    });
    expect(sugerir('2203.00.00')?.reglaIsc).toBe('alcohol');
  });

  it('cigarrillos: el monto por cajetilla depende del tamaño de la cajetilla', () => {
    expect(sugerir('2402.20.30')?.tasas).toMatchObject({ isc: 20, iscEspecificoTipo: 'unidad', iscEspecificoMonto: 32.33 });
    expect(sugerir('2402.20.10')?.tasas.iscEspecificoMonto).toBe(64.66);
  });

  it('los puros pagan el 20% sobre el precio al por menor pero no tienen monto tabulado', () => {
    expect(sugerir('2402.10.11')).toMatchObject({ reglaIsc: 'tabaco', notas: ['tabacoSinMonto'], tasas: { iscEspecificoMonto: 0 } });
  });

  it('usa los montos de Settings, no constantes', () => {
    expect(sugerirTasas('2208.30.20', arancel, { ...montos, alcoholPorLitro: 800 })?.tasas.iscEspecificoMonto).toBe(800);
  });
});

/*
 * The DGA course cases again, but with the rates looked up from the real arancel and ISC
 * rules instead of typed in: the whole chain from code to total.
 */
describe('del código al total', () => {
  const p = (x: Partial<Partida>): Partida => withDerived({ ...emptyPartida(), ...x });
  const v = (x: Partial<Valores>): Valores => ({ tasaCambio: 60, valorFobTotal: 0, seguro: 0, flete: 0, otros: 0, valorCifTotal: 0, ...x });
  const total = (partida: Partida, valores: Valores) =>
    preliquidar({ partidas: [partida], valores, resolverTasas: (x) => sugerir(x.codigoPartida)?.tasas }).totales.impuestos;

  it('caso 1: aires acondicionados', () => {
    expect(total(p({ codigoPartida: '8415.10.00', cantidad: 300, valorFob: 75_000 }), v({ seguro: 800, flete: 2_000 }))).toBe(3_263_865.6);
  });
  it('caso 2: televisores', () => {
    expect(total(p({ codigoPartida: '8528.72.00', cantidad: 150, valorFob: 75_000 }), v({ seguro: 560, flete: 5_000 }))).toBe(2_695_215.36);
  });
  it('caso 3: whisky', () => {
    expect(total(
      p({ codigoPartida: '2208.30.20', cantidad: 2_000, valorFob: 4_000, gradoAlcohol: 40, precioVentaMenor: 250 }),
      v({ seguro: 600, flete: 800 }),
    )).toBe(915_273.76);
  });
  it('caso 4: cigarrillos', () => {
    expect(total(
      p({ codigoPartida: '2402.20.30', cantidad: 5_000, valorFob: 1_250, precioVentaMenor: 2 }),
      v({ seguro: 187.5, flete: 250 }),
    )).toBe(235_227);
  });
});
