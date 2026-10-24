import { describe, it, expect } from 'vitest';
import type { ExpedienteFormData } from '../types';
import { cargarArancel } from '../data/arancel';
import { ISC_MONTOS_DEFAULT } from '../data/isc';
import { emptyFormData } from './expedienteDefaults';
import { emptyPartida, withDerived } from './partida';
import { preliquidar } from './preliquidacion';
import { sugerirTasas } from './tasas';
import { reportePreliquidacion } from './preliquidacionReporte';
import { construirPdfPreliquidacion } from './preliquidacionPdf';

/*
 * The SIGA report "FORMATO PRELIQUIDACION WH26070084A" again, now through the report builder:
 * its header, its RD$/US$ value block and its totals must come out as SIGA printed them.
 */
const arancel = await cargarArancel();

const LINEAS: [string, number, number][] = [
  ['8421.99.90', 6.0, 300], ['8421.99.90', 11.5, 800], ['8421.21.10', 2.75, 200], ['8421.21.10', 0.5, 3000],
  ['8421.21.10', 0.75, 3000], ['8421.21.10', 0.75, 3000], ['8421.21.10', 0.75, 3000], ['8421.21.10', 1.75, 1000],
  ['8421.21.10', 1.25, 1000], ['8421.99.90', 7.5, 1002], ['8302.50.00', 1.0, 2000], ['8421.21.10', 4.25, 600],
  ['8421.21.10', 4.0, 204], ['8421.21.10', 0.5, 400], ['8421.21.10', 0.5, 500], ['8421.21.10', 0.75, 500],
  ['8421.21.10', 14.25, 100], ['8421.21.10', 0.75, 200],
];

const base = emptyFormData('importacion');
const form: ExpedienteFormData = {
  ...base,
  reference: 'WH26070084A',
  declaracion: { ...base.declaracion, administracionCodigo: '10150', administracionNombre: 'ADMINISTRACION PUERTO MULTIMODAL CAUCEDO', docEmbarque: 'WH26070084A', noDeclaracion: '' },
  importador: { codigo: '131-25676-7', nombre: 'MARCHA EIRL', tipoDocumento: 'RNC', paisDocumento: '214' },
  regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
  valores: { tasaCambio: 60.92, valorFobTotal: 38_081, seguro: 234.98, flete: 8_380, otros: 0, valorCifTotal: 46_695.98 },
  contenedores: [
    { id: 'a', tipo: '40', numero: 'MSKU1234567', sello1: 'S1', sello2: '', },
    { id: 'b', tipo: '40HC', numero: 'MSKU7654321', sello1: 'S2', sello2: '' },
    { id: 'c', tipo: '20', numero: 'TGHU0000001', sello1: 'S3', sello2: '' },
    { id: 'd', tipo: '45', numero: 'CMAU4500001', sello1: 'S4', sello2: '' },
  ],
  partidas: LINEAS.map(([codigoPartida, unitario, cantidad], i) =>
    withDerived({ ...emptyPartida(), id: String(i), codigoPartida, cantidad, unidad: '1', valorFob: unitario * cantidad, descripcion: `LINEA ${i + 1}` })),
  preliquidacion: { fecha: '2026-09-03T17:17:39Z', tasas: {} },
};
const calculo = preliquidar({
  partidas: form.partidas, valores: form.valores, contenedores: [],
  resolverTasas: (p) => sugerirTasas(p.codigoPartida, arancel, ISC_MONTOS_DEFAULT)?.tasas,
});
const r = reportePreliquidacion(form, calculo, new Date(2026, 8, 3, 13, 17, 39));

describe('reportePreliquidacion', () => {
  it('header as SIGA prints it', () => {
    expect(r.encabezado).toMatchObject({
      colecturia: 'ADMINISTRACION PUERTO MULTIMODAL CAUCEDO',
      regimen: 'DESPACHO A CONSUMO',
      fechaDeclaracion: '03/09/2026',
      conocimientoEmbarque: 'WH26070084A',
      importador: 'MARCHA EIRL',
      importadorDocumento: 'RNC131256767',     // type + number, no dashes, no country
      agente: 'ARMESSAG, SRL',
      agenteDocumento: 'RNC130339198',
      referencia: 'WH26070084A',
      fechaImpresion: '03/09/2026',
      horaImpresion: '1:17:39 PM',
    });
  });

  it('per line: quantity, SIGA unit name, unit FOB and the rates', () => {
    expect(r.lineas[0]).toMatchObject({ partida: '8421.99.90', cantidad: 300, unidad: 'UNIDADES', fobUnitario: 6, cifRd: 134_463.23, gravamenPct: 0, itbis: 24_203.38 });
    expect(r.lineas[10]).toMatchObject({ partida: '8302.50.00', gravamen: 29_880.72, gravamenPct: 20, impuestos: 62_151.9 });
  });

  it('the RD$ / US$ value block', () => {
    expect(r.valores).toEqual({
      tasaCambio: 60.92,
      fob: { usd: 38_081, rd: 2_319_894.52 },
      seguro: { usd: 234.98, rd: 14_314.98 },
      flete: { usd: 8_380, rd: 510_509.6 },
      otros: { usd: 0, rd: 0 },
      cif: { usd: 46_695.98, rd: 2_844_719.1 },
    });
  });

  it('the tax totals', () => {
    expect(r.totales).toEqual({ cifRd: 2_844_719.11, gravamen: 29_880.72, selectivo: 0, itbis: 517_427.97, impuestos: 547_308.69 });
    expect(r.resumen).toMatchObject({ arancel: 29_880.72, selectivo: 0, itbis: 517_427.97, impuestos: 547_308.69 });
    expect(r.lineasSinTasas).toBe(0);
  });

  it('counts containers by size the way SIGA does: 20, 40 (including 40HC) and 45', () => {
    expect(r.cantidadPorTamano).toEqual({ pies20: 1, pies40: 2, pies45: 1 });
    expect(r.furgones.map((f) => f.numero)).toEqual(['MSKU1234567', 'MSKU7654321', 'TGHU0000001', 'CMAU4500001']);
  });

  it('loose cargo has no furgones', () => {
    const suelta = reportePreliquidacion({ ...form, tipoCarga: 'carga_suelta' }, calculo, new Date());
    expect(suelta.furgones).toEqual([]);
    expect(suelta.cantidadPorTamano).toEqual({ pies20: 0, pies40: 0, pies45: 0 });
  });
});

describe('PDF de la preliquidación', () => {
  it('renders a landscape document with every section and the totals', async () => {
    const doc = await construirPdfPreliquidacion(r, (k, o) => (o ? `${k}${JSON.stringify(o)}` : k));
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
    const texto = doc.output();
    for (const fragmento of ['preliq.colecturia', 'ADMINISTRACION PUERTO MULTIMODAL CAUCEDO', 'RNC131256767', 'preliq.totales',
      'MSKU7654321', 'preliq.valorCif', '2,844,719.10', 'preliq.totalImpuestos', '547,308.69', '517,427.97']) {
      expect(texto, fragmento).toContain(fragmento);
    }
    expect(texto).toContain(`preliq.pagina{"n":1,"total":${doc.getNumberOfPages()}}`);
  });
});
