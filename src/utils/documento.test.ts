import { describe, it, expect } from 'vitest';
import { normalizeDocumento, clienteKey, entidadKey, sigaPartyCode, clienteToEntidad } from './documento';
import type { Cliente } from '../types';

const cliente = (over: Partial<Cliente> = {}): Cliente => ({
  id: 'x', tipo: 'Empresa Importadora', tipoDocumento: 'RNC', documento: '101-00001-1', nombre: 'BRAVO S A',
  email: '', calle: '', ciudad: '', telefono: '', zona: '', fax: '', pais: '214', ...over,
});

describe('normalizeDocumento', () => {
  it('ignores dashes, spaces and case', () => {
    expect(normalizeDocumento('101-00001-1')).toBe('101000011');
    expect(normalizeDocumento(' 101 00001 1 ')).toBe('101000011');
    expect(normalizeDocumento('che-123.456.789')).toBe('CHE123456789');
    expect(normalizeDocumento(undefined)).toBe('');
  });
});

describe('clienteKey / entidadKey', () => {
  it('keys on the document type and number together', () => {
    expect(clienteKey(cliente())).toBe('RNC:101000011');
    expect(clienteKey(cliente({ tipoDocumento: 'CED' }))).toBe('CED:101000011');
    expect(clienteKey(cliente())).not.toBe(clienteKey(cliente({ tipoDocumento: 'CED' })));
  });

  it('matches a cliente against the party stored on an expediente', () => {
    expect(entidadKey({ codigo: '101000011', tipoDocumento: 'RNC' })).toBe(clienteKey(cliente()));
  });

  it('treats a party with no document type as an RNC', () => {
    expect(entidadKey({ codigo: '101-00001-1' })).toBe('RNC:101000011');
  });
});

describe('sigaPartyCode', () => {
  it('prefixes RNC, PAS and TID with the issuing country', () => {
    expect(sigaPartyCode({ codigo: '101-00001-1', tipoDocumento: 'RNC', paisDocumento: '214' })).toBe('RNC214101000011');
    expect(sigaPartyCode({ codigo: 'X1234567', tipoDocumento: 'PAS', paisDocumento: '724' })).toBe('PAS724X1234567');
    expect(sigaPartyCode({ codigo: 'DE123456789', tipoDocumento: 'TID', paisDocumento: '276' })).toBe('TID276DE123456789');
  });

  it('omits the country for a cédula, per the XSD', () => {
    expect(sigaPartyCode({ codigo: '001-1234567-8', tipoDocumento: 'CED' })).toBe('CED00112345678');
  });

  it('falls back to RNC and the Dominican Republic', () => {
    expect(sigaPartyCode({ codigo: '101-00001-1' })).toBe('RNC214101000011');
  });

  it('returns an empty string when there is no document', () => {
    expect(sigaPartyCode({ codigo: '', tipoDocumento: 'RNC' })).toBe('');
  });
});

describe('clienteToEntidad', () => {
  it('carries the document type and country onto the expediente', () => {
    expect(clienteToEntidad(cliente({ tipoDocumento: 'TID', documento: 'DE1', pais: '276' })))
      .toEqual({ codigo: 'DE1', nombre: 'BRAVO S A', tipoDocumento: 'TID', paisDocumento: '276' });
  });
});
