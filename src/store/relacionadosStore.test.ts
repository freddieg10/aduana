import { describe, it, expect } from 'vitest';
import { migrateCliente } from './relacionadosStore';

describe('migrateCliente', () => {
  it('upgrades a v1 record (rnc as the key) to the document pair', () => {
    const v1 = { id: 'cl-1', rnc: '101-00001-1', nombre: 'BRAVO S A', direccion: 'Av. Máximo Gómez 45', telefono: '809-555-0101', pais: '214' };
    const out = migrateCliente(v1);
    expect(out.tipoDocumento).toBe('RNC');
    expect(out.documento).toBe('101-00001-1');
    expect(out.calle).toBe('Av. Máximo Gómez 45');
    expect(out.tipo).toBe('Empresa Importadora');
    expect('rnc' in out).toBe(false);
    expect('direccion' in out).toBe(false);
  });

  it('upgrades a v0 record (separate codigo) too', () => {
    const v0 = { id: 'cl-9', codigo: '8115', rnc: '', nombre: 'SIN RNC', direccion: '', telefono: '', pais: '214' };
    expect(migrateCliente(v0).documento).toBe('8115');
  });

  it('keeps a current record as it is and fills the new optional fields', () => {
    const v2 = {
      id: 'cl-2', tipo: 'Persona', tipoDocumento: 'CED', documento: '001-1234567-8', nombre: 'JUAN PEREZ',
      email: 'juan@example.do', calle: 'Calle 1', ciudad: 'Santiago', telefono: '', zona: '', fax: '', pais: '214',
    };
    const out = migrateCliente(v2);
    expect(out).toMatchObject({ tipo: 'Persona', tipoDocumento: 'CED', documento: '001-1234567-8', ciudad: 'Santiago' });
  });

  it('defaults país de origen to the Dominican Republic', () => {
    expect(migrateCliente({ id: 'x', nombre: 'X', documento: '1' }).pais).toBe('214');
  });
});
