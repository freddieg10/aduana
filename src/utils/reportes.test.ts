import { describe, it, expect } from 'vitest';
import { ExpedienteStatus } from '../types';
import type { Expediente } from '../types';
import { emptyPartida, withDerived } from './partida';
import { emptyInformacionAdicional } from '../store/expedientesStore';
import { reporteClientes, reporteDigitadores, historialProductos, historialToCsv, enRango } from './reportes';
import { evaluarArt52, porLlegar, llegadosNoPresentados } from './art52';
import { validarVuce, validarNoTemporal, capituloDe } from './vuce';
import { can, canAny } from './permisos';

const partida = (over: Partial<ReturnType<typeof emptyPartida>> = {}) =>
  withDerived({ ...emptyPartida(), ...over });

const exp = (over: Partial<Expediente> = {}): Expediente => ({
  id: 'e1', reference: 'DEC-1', tipoExpediente: 'importacion', status: ExpedienteStatus.Registrado,
  checklist: [],
  declaracion: {
    idSecuencia: '', eta: '2026-01-10', tipoDespacho: 'GENERAL', administracionCodigo: '10030',
    administracionNombre: 'HAINA', noDeclaracion: 'DEC-1', docEmbarque: '', depositoDestino: '',
    puertoEntrada: '', paisProcedenciaCodigo: '724', paisProcedenciaNombre: 'ESPAÑA', facturaComercialNo: '',
  },
  importador: { codigo: '101-00001-1', nombre: 'BRAVO S A', tipoDocumento: 'RNC', paisDocumento: '214' },
  agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
  consignatario: { codigo: '101-00001-1', nombre: 'BRAVO S A', tipoDocumento: 'RNC' },
  compradorExportacion: { codigo: '0', nombre: '' },
  suplidores: [{ codigo: 'S1', nombre: 'Sup Uno', nacionalidad: 'ESPAÑA' }],
  documentos: [], contenedores: [{ id: 'c1', tipo: '40', numero: 'CONT-1', sello1: '', sello2: '' }],
  tipoCarga: 'contenedores',
  valores: { tasaCambio: 65, valorFobTotal: 100, seguro: 0, flete: 0, otros: 0, valorCifTotal: 100 },
  regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
  pesoMercancia: { codigoMercancia: '', pesoBrutoKg: 0, pesoNetoKg: 0 },
  partidas: [partida({ id: 'p1', codigoPartida: '4818.30.00', codigoProducto: 'SP4020', descripcion: 'Servilletas', cantidad: 10, valorFob: 100 })],
  informacionAdicional: emptyInformacionAdicional(),
  digitador: 'Ana', gestor: 'Pedro',
  observaciones: [], assignedUserId: '2',
  createdAt: '2026-01-05T10:00:00Z', updatedAt: '2026-01-05T10:00:00Z',
  ...over,
});

describe('enRango', () => {
  it('filters on createdAt inclusively', () => {
    const list = [exp({ id: 'a', createdAt: '2026-01-05T10:00:00Z' }), exp({ id: 'b', createdAt: '2026-03-05T10:00:00Z' })];
    expect(enRango(list, { desde: '2026-02-01' }).map((e) => e.id)).toEqual(['b']);
    expect(enRango(list, { hasta: '2026-01-05' }).map((e) => e.id)).toEqual(['a']);
    expect(enRango(list, {})).toHaveLength(2);
  });
});

describe('reporteClientes', () => {
  it('groups by importer document and averages per file and per month', () => {
    const list = [
      exp({ id: 'a', createdAt: '2026-01-05T10:00:00Z' }),
      exp({ id: 'b', createdAt: '2026-02-05T10:00:00Z', partidas: [partida({ id: 'x' }), partida({ id: 'y' })] }),
      exp({ id: 'c', createdAt: '2026-02-06T10:00:00Z', importador: { codigo: '130-00002-2', nombre: 'TEXTILES', tipoDocumento: 'RNC' } }),
    ];
    const filas = reporteClientes(list);
    expect(filas).toHaveLength(2);
    const bravo = filas.find((f) => f.cliente === 'BRAVO S A')!;
    expect(bravo.expedientes).toBe(2);
    expect(bravo.contenedores).toBe(2);
    expect(bravo.meses).toBe(2);
    expect(bravo.expedientesPorMes).toBe(1);
    expect(bravo.promedioRenglones).toBe(1.5);
    expect(bravo.ultimos5[0].id).toBe('b');   // newest first
  });
});

describe('reporteDigitadores', () => {
  it('counts files, line items and Art. 52 cases per person', () => {
    const now = new Date('2026-03-01T00:00:00Z').getTime();
    const list = [
      exp({ id: 'a', declaracion: { ...exp().declaracion, eta: '2026-01-01' } }),   // 59 days, overdue
      exp({ id: 'b', declaracion: { ...exp().declaracion, eta: '2026-02-25' } }),   // 4 days, fine
    ];
    const [fila] = reporteDigitadores(list, 30, {}, now);
    expect(fila.nombre).toBe('Ana');
    expect(fila.expedientes).toBe(2);
    expect(fila.renglones).toBe(2);
    expect(fila.art52).toBe(1);
  });
});

describe('historialProductos', () => {
  const base = exp({ id: 'e1', reference: 'DEC-1' });

  it('does not duplicate a product that reappears on another file', () => {
    const otro = exp({ id: 'e2', reference: 'DEC-2', partidas: [partida({ id: 'p9', codigoPartida: '4818.30.00', codigoProducto: 'SP4020', descripcion: 'Servilletas' })] });
    const filas = historialProductos([base, otro]);
    expect(filas).toHaveLength(1);
    expect(filas[0].veces).toBe(2);
    expect(filas[0].expedientes.map((x) => x.reference)).toEqual(['DEC-1', 'DEC-2']);
  });

  it('duplicates when the product code changes', () => {
    const otro = exp({ id: 'e2', partidas: [partida({ id: 'p9', codigoPartida: '4818.30.00', codigoProducto: 'SP4077', descripcion: 'Servilletas' })] });
    expect(historialProductos([base, otro])).toHaveLength(2);
  });

  it('duplicates when the tariff line changes', () => {
    const otro = exp({ id: 'e2', partidas: [partida({ id: 'p9', codigoPartida: '4818.30.01', codigoProducto: 'SP4020', descripcion: 'Servilletas' })] });
    expect(historialProductos([base, otro])).toHaveLength(2);
  });

  it('falls back to the description when there is no product code', () => {
    const a = exp({ id: 'e1', partidas: [partida({ id: 'p1', codigoPartida: '5208.11.01', descripcion: 'Telas' })] });
    const b = exp({ id: 'e2', partidas: [partida({ id: 'p2', codigoPartida: '5208.11.01', descripcion: 'Hilos' })] });
    expect(historialProductos([a, b])).toHaveLength(2);
  });

  it('can be limited to one client, and carries the file status', () => {
    const otro = exp({ id: 'e2', status: ExpedienteStatus.Completo, importador: { codigo: '130-00002-2', nombre: 'TEXTILES', tipoDocumento: 'RNC' } });
    expect(historialProductos([base, otro], 'RNC:130000022')).toHaveLength(1);
    expect(historialProductos([otro])[0].expedientes[0].status).toBe('completo');
  });

  it('exports the agreed column order', () => {
    const csv = historialToCsv(historialProductos([base]));
    expect(csv.split('\n')[0]).toBe('ARC,COD PROD,REF,DESCRIPCION,UNIDAD,PAIS,SUPLIDOR,EXPEDIENTES');
    expect(csv).toContain('4818.30.00,SP4020,SP4020,Servilletas');
  });
});

describe('evaluarArt52', () => {
  const now = new Date('2026-03-01T00:00:00Z').getTime();

  it('applies once the file is older than the configured window and still unfiled', () => {
    const e = exp({ declaracion: { ...exp().declaracion, eta: '2026-01-01' } });
    const r = evaluarArt52(e, 30, now);
    expect(r).toMatchObject({ aplica: true, evaluable: true });
    expect(r.diasTranscurridos).toBe(59);
  });

  it('prefers the actual arrival date over the ETA', () => {
    const e = exp({
      declaracion: { ...exp().declaracion, eta: '2026-01-01' },
      informacionAdicional: { ...emptyInformacionAdicional(), fechaLlegadaReal: '2026-02-25' },
    });
    expect(evaluarArt52(e, 30, now).aplica).toBe(false);
  });

  it('cannot judge a file that is already filed', () => {
    const e = exp({ status: ExpedienteStatus.Presentado, declaracion: { ...exp().declaracion, eta: '2026-01-01' } });
    expect(evaluarArt52(e, 30, now)).toMatchObject({ aplica: false, evaluable: false });
  });

  it('is not evaluable without an arrival date', () => {
    const e = exp({ declaracion: { ...exp().declaracion, eta: '' } });
    expect(evaluarArt52(e, 30, now)).toEqual({ aplica: false, diasTranscurridos: null, evaluable: false });
  });
});

describe('porLlegar / llegadosNoPresentados', () => {
  const now = new Date('2026-03-01T00:00:00Z').getTime();

  it('splits files by whether the goods have arrived', () => {
    const futuro = exp({ id: 'f', declaracion: { ...exp().declaracion, eta: '2026-04-01' } });
    const llegado = exp({ id: 'l', declaracion: { ...exp().declaracion, eta: '2026-02-01' } });
    const presentado = exp({ id: 'p', status: ExpedienteStatus.Presentado, declaracion: { ...exp().declaracion, eta: '2026-02-01' } });
    expect(porLlegar([futuro, llegado, presentado], now).map((e) => e.id)).toEqual(['f']);
    expect(llegadosNoPresentados([futuro, llegado, presentado], now).map((e) => e.id)).toEqual(['l']);
  });
});

describe('VUCE', () => {
  it('reads the HS chapter from a formatted code', () => {
    expect(capituloDe('0805.10.00')).toBe('08');
    expect(capituloDe('')).toBe('');
  });

  it('flags lines whose chapter needs a permit and names the issuing body', () => {
    const hallazgos = validarVuce([
      partida({ id: 'a', codigoPartida: '3004.90.00', descripcion: 'Medicamento' }),
      partida({ id: 'b', codigoPartida: '4818.30.00', descripcion: 'Servilletas' }),
    ]);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].entidad).toContain('DIGEMAPS');
  });

  it('only allows temporary lines under a temporary regime', () => {
    const partidas = [partida({ id: 'a', temporal: true }), partida({ id: 'b' })];
    expect(validarNoTemporal({ partidas, regimenAduanero: { codigo: '1', nombre: 'CONSUMO', acuerdo: '' } })).toHaveLength(1);
    expect(validarNoTemporal({ partidas, regimenAduanero: { codigo: '2', nombre: 'ADMISION TEMPORAL', acuerdo: '' } })).toHaveLength(0);
  });
});

describe('permisos', () => {
  it('gives admin everything except the portal', () => {
    expect(can('admin', 'settings')).toBe(true);
    expect(can('admin', 'reportes:clientes')).toBe(true);
    expect(can('admin', 'portal')).toBe(false);
  });

  it('limits the digitador to files, XML, suppliers and the product history', () => {
    expect(can('digitador', 'expedientes')).toBe(true);
    expect(can('digitador', 'xml')).toBe(true);
    expect(can('digitador', 'relacionados:suplidores')).toBe(true);
    expect(can('digitador', 'relacionados:clientes')).toBe(false);
    expect(can('digitador', 'reportes:productos')).toBe(true);
    expect(can('digitador', 'reportes:clientes')).toBe(false);
    expect(can('digitador', 'settings')).toBe(false);
  });

  it('limits a cliente to the portal', () => {
    expect(can('cliente', 'portal')).toBe(true);
    expect(canAny('cliente', ['expedientes', 'reportes:clientes', 'settings'])).toBe(false);
  });

  it('grants nothing without a role', () => {
    expect(can(undefined, 'expedientes')).toBe(false);
  });
});
