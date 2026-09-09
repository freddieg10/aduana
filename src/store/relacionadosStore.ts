import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cliente, Deposito, SuplidorMaestro, TipoDocumento, TipoEntidad, TipoEntidadSuplidor } from '../types';
import { PAIS_RD } from '../data/catalogos';
import { clienteKey, normalizeDocumento, TIPO_DOCUMENTO_DEFAULT } from '../utils/documento';

/**
 * Seeded from the importadores / suplidores that appear in the expediente seed data.
 * A cliente's (tipoDocumento, documento) pair is what the expedientes carry as the party code.
 */
const SEED_CLIENTES: Cliente[] = [
  { id: 'cl-1', tipo: 'Empresa Importadora', tipoDocumento: 'RNC', documento: '101-00001-1', nombre: 'BRAVO S A', email: 'contacto@bravo.com.do', calle: 'Av. Máximo Gómez 45', ciudad: 'Santo Domingo', telefono: '809-555-0101', zona: 'Distrito Nacional', fax: '', pais: PAIS_RD },
  { id: 'cl-2', tipo: 'Empresa Importadora', tipoDocumento: 'RNC', documento: '130-00002-2', nombre: 'TEXTILES MODERNOS SRL', email: 'info@textilesmodernos.do', calle: 'Zona Industrial', ciudad: 'Puerto Plata', telefono: '809-555-0202', zona: 'Puerto Plata', fax: '', pais: PAIS_RD },
  { id: 'cl-3', tipo: 'Empresa Comercial', tipoDocumento: 'RNC', documento: '130-00003-3', nombre: 'ELECTRONICA GLOBAL RD', email: 'ventas@electronicaglobal.do', calle: 'Av. 27 de Febrero 100', ciudad: 'Santo Domingo', telefono: '809-555-0303', zona: 'Distrito Nacional', fax: '', pais: PAIS_RD },
  { id: 'cl-4', tipo: 'Empresa Importadora', tipoDocumento: 'RNC', documento: '130-00004-4', nombre: 'ALIMENTOS DEL CARIBE SRL', email: 'compras@alimentoscaribe.do', calle: 'Carretera Sánchez km 12', ciudad: 'Haina', telefono: '809-555-0404', zona: 'San Cristóbal', fax: '', pais: PAIS_RD },
  { id: 'cl-5', tipo: 'Empresa Comercial', tipoDocumento: 'RNC', documento: '130-00005-5', nombre: 'AUTOPARTES EXPRESS SRL', email: 'info@autopartesexpress.do', calle: 'Av. Charles de Gaulle 8', ciudad: 'Santo Domingo Este', telefono: '809-555-0505', zona: 'Santo Domingo', fax: '', pais: PAIS_RD },
  { id: 'cl-6', tipo: 'Empresa Industrial', tipoDocumento: 'RNC', documento: '130-00006-6', nombre: 'FARMACEUTICA CENTRAL SRL', email: 'regulatorio@farmacentral.do', calle: 'Calle El Sol 22', ciudad: 'Santiago', telefono: '809-555-0606', zona: 'Santiago', fax: '809-555-0607', pais: PAIS_RD },
];

const SEED_SUPLIDORES: SuplidorMaestro[] = [
  { id: 'sp-1', tipo: 'Empresa Proveedora Exterior', tipoDocumento: 'TID', documento: 'IN-AAACM1234A', nombre: 'Mumbai Textiles Co.', email: 'sales@mumbaitextiles.in', calle: 'Andheri East', ciudad: 'Mumbai', telefono: '+91 22 5555 0001', zona: 'Maharashtra', fax: '', pais: '356' },
  { id: 'sp-2', tipo: 'Empresa Proveedora Exterior', tipoDocumento: 'TID', documento: 'CN-91440300MA5', nombre: 'Shenzhen Electronics Ltd', email: 'export@szelectronics.cn', calle: 'Nanshan District', ciudad: 'Shenzhen', telefono: '+86 755 5555 0002', zona: 'Guangdong', fax: '+86 755 5555 0003', pais: '156' },
  { id: 'sp-3', tipo: 'Empresa Exportadora', tipoDocumento: 'TID', documento: 'TH-0105555000031', nombre: 'Bangkok Foods Export', email: 'info@bkkfoods.th', calle: 'Sathorn', ciudad: 'Bangkok', telefono: '+66 2 555 0003', zona: '', fax: '', pais: '764' },
  { id: 'sp-4', tipo: 'Empresa Proveedora Exterior', tipoDocumento: 'TID', documento: 'DE123456789', nombre: 'Hamburg Auto GmbH', email: 'kontakt@hamburgauto.de', calle: 'Hafenstrasse 12', ciudad: 'Hamburg', telefono: '+49 40 555 0004', zona: '', fax: '+49 40 555 0005', pais: '276' },
  { id: 'sp-5', tipo: 'Empresa Proveedora Exterior', tipoDocumento: 'TID', documento: 'CHE-123.456.789', nombre: 'Basel Pharma AG', email: 'export@baselpharma.ch', calle: 'Rheinweg 3', ciudad: 'Basel', telefono: '+41 61 555 0005', zona: '', fax: '', pais: '756' },
];

/** Bonded warehouses, used for `declaracion.depositoDestino` (SIGA DestinationLocationCode). */
const SEED_DEPOSITOS: Deposito[] = [
  { id: 'dp-1', codigo: 'ALMACARIBE', nombre: 'Almacenes Generales del Caribe, S. A.', administracionCodigo: '10030', ciudad: 'Santo Domingo', telefono: '' },
  { id: 'dp-2', codigo: 'ALMATRANS', nombre: 'Almacenes Generales de Deposito y Distribucion', administracionCodigo: '10030', ciudad: 'Santo Domingo', telefono: '' },
  { id: 'dp-3', codigo: 'RODEMSA', nombre: 'Almacenes Rodem S. A.', administracionCodigo: '10030', ciudad: 'Santo Domingo', telefono: '' },
  { id: 'dp-4', codigo: 'ALMADOM', nombre: 'Almacenes Dominicanos de Deposito, S. A.', administracionCodigo: '10030', ciudad: 'Santo Domingo', telefono: '' },
  { id: 'dp-5', codigo: 'ALFRIDOMSA', nombre: 'Alfridomsa Multimodal Caucedo', administracionCodigo: '10150', ciudad: 'Caucedo', telefono: '' },
  { id: 'dp-6', codigo: 'ALMADISA', nombre: 'Almadisa', administracionCodigo: '10150', ciudad: 'Santo Domingo Este', telefono: '' },
  { id: 'dp-7', codigo: 'ALMANORTE', nombre: 'Almanorte', administracionCodigo: '20020', ciudad: 'Santiago', telefono: '' },
  { id: 'dp-8', codigo: 'ALMADELA-STI', nombre: 'Almadela Santiago', administracionCodigo: '20020', ciudad: 'Santiago', telefono: '' },
];

interface RelacionadosState {
  clientes: Cliente[];
  suplidores: SuplidorMaestro[];
  depositos: Deposito[];
  addCliente: (c: Omit<Cliente, 'id'>) => Cliente;
  updateCliente: (id: string, c: Partial<Cliente>) => void;
  removeCliente: (id: string) => void;
  addSuplidor: (s: Omit<SuplidorMaestro, 'id'>) => SuplidorMaestro;
  updateSuplidor: (id: string, s: Partial<SuplidorMaestro>) => void;
  removeSuplidor: (id: string) => void;
  /** Look a cliente up by its dynamic key (document type + number). */
  findClienteByDocumento: (tipoDocumento: TipoDocumento, documento: string) => Cliente | undefined;
  /** True when another cliente already uses this document — the PK guard for the form. */
  documentoTaken: (tipoDocumento: TipoDocumento, documento: string, exceptId?: string) => boolean;
  /** Look a suplidor up by document number (also matches a legacy code left on an expediente). */
  findSuplidorByDocumento: (documento: string) => SuplidorMaestro | undefined;
  suplidorDocumentoTaken: (tipoDocumento: TipoDocumento, documento: string, exceptId?: string) => boolean;
  addDeposito: (d: Omit<Deposito, 'id'>) => Deposito;
  updateDeposito: (id: string, d: Partial<Deposito>) => void;
  removeDeposito: (id: string) => void;
  resetToSeed: () => void;
}

/** v2 -> v3: suplidores moved to the SIGA proveedor form, keyed by (tipoDocumento, documento). */
export function migrateSuplidor(raw: Record<string, unknown>): SuplidorMaestro {
  const c = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    id: str(c.id) || crypto.randomUUID(),
    tipo: (str(c.tipo) || 'Empresa Proveedora Exterior') as TipoEntidadSuplidor,
    tipoDocumento: (str(c.tipoDocumento) || 'TID') as TipoDocumento,
    documento: str(c.documento) || str(c.tid) || str(c.codigo),
    nombre: str(c.nombre),
    email: str(c.email),
    calle: str(c.calle) || str(c.direccion),
    ciudad: str(c.ciudad),
    telefono: str(c.telefono),
    zona: str(c.zona),
    fax: str(c.fax),
    pais: str(c.pais),
  };
}

/**
 * v0: cliente had `codigo` + `rnc`.  v1: `rnc` alone was the key.
 * v2: the key became (tipoDocumento, documento) and the SIGA importer fields were added.
 */
export function migrateCliente(raw: Record<string, unknown>): Cliente {
  const c = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const documento = str(c.documento) || str(c.rnc) || str(c.codigo);
  return {
    id: str(c.id) || crypto.randomUUID(),
    tipo: (str(c.tipo) || 'Empresa Importadora') as TipoEntidad,
    tipoDocumento: (str(c.tipoDocumento) || TIPO_DOCUMENTO_DEFAULT) as TipoDocumento,
    documento,
    nombre: str(c.nombre),
    email: str(c.email),
    calle: str(c.calle) || str(c.direccion),
    ciudad: str(c.ciudad),
    telefono: str(c.telefono),
    zona: str(c.zona),
    fax: str(c.fax),
    pais: str(c.pais) || PAIS_RD,
  };
}

export const useRelacionadosStore = create<RelacionadosState>()(
  persist(
    (set, get) => ({
      clientes: SEED_CLIENTES,
      suplidores: SEED_SUPLIDORES,
      depositos: SEED_DEPOSITOS,

      addCliente: (c) => {
        const nuevo = { ...c, id: crypto.randomUUID() };
        set((s) => ({ clientes: [...s.clientes, nuevo] }));
        return nuevo;
      },
      updateCliente: (id, c) => set((s) => ({ clientes: s.clientes.map((x) => (x.id === id ? { ...x, ...c } : x)) })),
      removeCliente: (id) => set((s) => ({ clientes: s.clientes.filter((x) => x.id !== id) })),

      addSuplidor: (sp) => {
        const nuevo = { ...sp, id: crypto.randomUUID() };
        set((s) => ({ suplidores: [...s.suplidores, nuevo] }));
        return nuevo;
      },
      updateSuplidor: (id, sp) => set((s) => ({ suplidores: s.suplidores.map((x) => (x.id === id ? { ...x, ...sp } : x)) })),
      removeSuplidor: (id) => set((s) => ({ suplidores: s.suplidores.filter((x) => x.id !== id) })),

      findClienteByDocumento: (tipoDocumento, documento) => {
        if (!normalizeDocumento(documento)) return undefined;
        const key = clienteKey({ tipoDocumento, documento });
        return get().clientes.find((c) => clienteKey(c) === key);
      },
      documentoTaken: (tipoDocumento, documento, exceptId) => {
        if (!normalizeDocumento(documento)) return false;
        const key = clienteKey({ tipoDocumento, documento });
        return get().clientes.some((c) => c.id !== exceptId && clienteKey(c) === key);
      },
      findSuplidorByDocumento: (documento) => {
        const n = normalizeDocumento(documento);
        return n ? get().suplidores.find((s) => normalizeDocumento(s.documento) === n) : undefined;
      },
      suplidorDocumentoTaken: (tipoDocumento, documento, exceptId) => {
        if (!normalizeDocumento(documento)) return false;
        const key = clienteKey({ tipoDocumento, documento });
        return get().suplidores.some((s) => s.id !== exceptId && clienteKey(s) === key);
      },

      addDeposito: (d) => {
        const nuevo = { ...d, id: crypto.randomUUID() };
        set((s) => ({ depositos: [...s.depositos, nuevo] }));
        return nuevo;
      },
      updateDeposito: (id, d) => set((s) => ({ depositos: s.depositos.map((x) => (x.id === id ? { ...x, ...d } : x)) })),
      removeDeposito: (id) => set((s) => ({ depositos: s.depositos.filter((x) => x.id !== id) })),

      resetToSeed: () => set({ clientes: SEED_CLIENTES, suplidores: SEED_SUPLIDORES, depositos: SEED_DEPOSITOS }),
    }),
    {
      name: 'aduana-relacionados',
      version: 3,
      partialize: (s) => ({ clientes: s.clientes, suplidores: s.suplidores, depositos: s.depositos }),
      migrate: (persisted) => {
        const state = persisted as {
          clientes?: Record<string, unknown>[];
          suplidores?: Record<string, unknown>[];
          depositos?: Deposito[];
        };
        return {
          clientes: (state.clientes ?? []).map(migrateCliente),
          suplidores: (state.suplidores ?? []).map(migrateSuplidor),
          depositos: state.depositos ?? SEED_DEPOSITOS,
        };
      },
    },
  ),
);
