import { describe, it, expect } from 'vitest';
import { migrateExpediente } from './expedientesStore';

describe('migrateExpediente', () => {
  it('converts a v1 record with a notes string into observaciones and adds staff fields', () => {
    const legacy = {
      id: '1', reference: 'R', status: 'registrado', checklist: [], partidas: [],
      notes: '2026-04-05T14:30:00.000Z|Agente López|Falta BL\n2026-04-06T10:00:00.000Z|Ana|Recibido',
    };
    const out = migrateExpediente(legacy);
    expect('notes' in out).toBe(false);
    expect(out.observaciones).toHaveLength(2);
    expect(out.observaciones[1]).toMatchObject({ usuario: 'Ana', texto: 'Recibido' });
    expect(out.digitador).toBe('');
    expect(out.gestor).toBe('');
  });

  it('corrects a placeholder administración code when the name is in the SIGA area table', () => {
    const stale = {
      id: '3', reference: 'R3', observaciones: [], digitador: '', gestor: '',
      declaracion: { administracionCodigo: '10020', administracionNombre: 'ADMINISTRACION PUERTO PLATA' },
    };
    expect(migrateExpediente(stale).declaracion.administracionCodigo).toBe('10070');
    const caucedo = { ...stale, declaracion: { administracionCodigo: '10040', administracionNombre: 'Administración Puerto Multimodal Caucedo' } };
    expect(migrateExpediente(caucedo).declaracion.administracionCodigo).toBe('10150');
    const unknown = { ...stale, declaracion: { administracionCodigo: '99999', administracionNombre: 'ADUANA INVENTADA' } };
    expect(migrateExpediente(unknown).declaracion.administracionCodigo).toBe('99999');
  });

  it('maps tipo de despacho values SIGA does not offer onto the real ones', () => {
    const base = { id: '4', reference: 'R4', observaciones: [], digitador: '', gestor: '' };
    const decl = (tipoDespacho: string) => ({ ...base, declaracion: { administracionCodigo: '10030', administracionNombre: 'ADMINISTRACION HAINA ORIENTAL', tipoDespacho } });
    expect(migrateExpediente(decl('MANIFIESTO')).declaracion.tipoDespacho).toBe('GENERAL');
    expect(migrateExpediente(decl('ANTICIPADO')).declaracion.tipoDespacho).toBe('NO MANIFIESTO');
    expect(migrateExpediente(decl('NO MANIFIESTO')).declaracion.tipoDespacho).toBe('NO MANIFIESTO');
    expect(migrateExpediente(decl('CENTRO LOGISTICO')).declaracion.tipoDespacho).toBe('CENTRO LOGISTICO');
    expect(migrateExpediente(decl('')).declaracion.tipoDespacho).toBe('');
  });

  it('rewrites legacy importer codes to the client RNC', () => {
    const legacy = {
      id: '5', reference: 'R5', observaciones: [], digitador: '', gestor: '',
      declaracion: { administracionCodigo: '10030', administracionNombre: 'ADMINISTRACION HAINA ORIENTAL', tipoDespacho: 'GENERAL' },
      importador: { codigo: '8115', nombre: 'BRAVO S A' },
      consignatario: { codigo: '8115', nombre: 'BRAVO S A' },
      agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    };
    const out = migrateExpediente(legacy);
    expect(out.importador.codigo).toBe('101-00001-1');
    expect(out.consignatario.codigo).toBe('101-00001-1');
    expect(out.agenteAduanal.codigo).toBe('1');
  });

  it('leaves an unknown importer code alone', () => {
    const out = migrateExpediente({
      id: '6', reference: 'R6', observaciones: [], digitador: '', gestor: '',
      importador: { codigo: '130-99999-9', nombre: 'NUEVO CLIENTE' },
    });
    expect(out.importador.codigo).toBe('130-99999-9');
  });

  it('leaves a current record untouched', () => {
    const current = {
      id: '2', reference: 'R2', observaciones: [{ id: 'o', fecha: '', usuario: 'x', texto: 'y' }], digitador: 'Ana', gestor: 'Pedro',
    };
    const out = migrateExpediente(current);
    expect(out.observaciones).toHaveLength(1);
    expect(out.observaciones[0]).toMatchObject({ id: 'o', texto: 'y', publica: false });   // private by default
    expect(out.informacionAdicional.medioTransporte).toBe('');
    expect(out.digitador).toBe('Ana');
    expect(out.gestor).toBe('Pedro');
  });
});
