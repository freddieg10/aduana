import { describe, it, expect } from 'vitest';
import type { Expediente } from '../types';
import { emptyFormData } from './expedienteDefaults';
import { emptyPartida, withDerived } from './partida';
import { documentoValido, validarSiga } from './sigaValidacion';

const expediente = (over: Partial<Expediente> = {}): Expediente => ({
  ...emptyFormData('importacion'),
  id: 'x', checklist: [], observaciones: [], assignedUserId: '', createdAt: '', updatedAt: '',
  declaracion: { ...emptyFormData('importacion').declaracion, administracionCodigo: '10150', tipoDespacho: 'GENERAL' },
  importador: { codigo: '131-25676-7', nombre: 'MARCHA EIRL', tipoDocumento: 'RNC', paisDocumento: '214' },
  consignatario: { codigo: '131256767', nombre: 'MARCHA EIRL', tipoDocumento: 'RNC', paisDocumento: '214' },
  suplidores: [{ codigo: '15562111622016', nombre: 'WISE GLOBAL', nacionalidad: 'PANAMÁ', tipoDocumento: 'TID' }],
  partidas: [withDerived({ ...emptyPartida(), codigoPartida: '8421.21.10', cantidad: 10, valorFob: 5, unidad: '1' })],
  ...over,
});

describe('documentoValido', () => {
  it('an RNC has 9 digits and a cédula 11; dashes do not count', () => {
    expect(documentoValido({ codigo: '1-30-33919-8', tipoDocumento: 'RNC' })).toBe(true);
    expect(documentoValido({ codigo: '1', tipoDocumento: 'RNC' })).toBe(false);
    expect(documentoValido({ codigo: '001-1234567-8', tipoDocumento: 'CED' })).toBe(true);
    expect(documentoValido({ codigo: '130339198', tipoDocumento: 'CED' })).toBe(false);
  });

  it('passports and foreign tax ids only need to be present', () => {
    expect(documentoValido({ codigo: 'X1234567', tipoDocumento: 'PAS' })).toBe(true);
    expect(documentoValido({ codigo: '', tipoDocumento: 'TID' })).toBe(false);
  });
});

describe('validarSiga', () => {
  it('a complete import has nothing to report', () => {
    expect(validarSiga(expediente())).toEqual([]);
  });

  it('names the agent code that made SIGA crash', () => {
    const r = validarSiga(expediente({ agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' } }));
    expect(r).toEqual([{ tipo: 'documento', parte: 'declarante', valor: 'RNC 1' }]);
  });

  it('checks importer and consignee on imports, the exporter on exports', () => {
    const sinDoc = { codigo: '', nombre: 'X' };
    expect(validarSiga(expediente({ importador: sinDoc, consignatario: sinDoc })).map((p) => p.tipo === 'documento' && p.parte))
      .toEqual(['importador', 'consignatario']);
    expect(validarSiga(expediente({ tipoExpediente: 'exportacion', importador: sinDoc, suplidores: [] })).map((p) => p.tipo === 'documento' && p.parte))
      .toEqual(['exportador']);
  });

  it('an import needs a supplier, an área and a tipo de despacho SIGA knows', () => {
    const r = validarSiga(expediente({ suplidores: [], declaracion: { ...expediente().declaracion, administracionCodigo: '', tipoDespacho: 'INVENTADO' } }));
    expect(r.map((p) => p.tipo)).toEqual(['sinSuplidor', 'administracion', 'tipoDespacho']);
  });

  it('checks every renglón: 8-digit code, SIGA unit, quantity', () => {
    const malo = withDerived({ ...emptyPartida(), codigoPartida: '84.21', unidad: 'DOCENAS', cantidad: 0 });
    expect(validarSiga(expediente({ partidas: [expediente().partidas[0], malo] }))).toEqual([
      { tipo: 'partida', renglon: 2, valor: '84.21' },
      { tipo: 'unidad', renglon: 2, valor: 'DOCENAS' },
      { tipo: 'cantidad', renglon: 2 },
    ]);
    expect(validarSiga(expediente({ partidas: [] })).map((p) => p.tipo)).toEqual(['sinRenglones']);
  });
});
