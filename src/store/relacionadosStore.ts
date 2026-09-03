import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cliente, SuplidorMaestro, TipoDocumento, TipoEntidad } from '../types';
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
  { id: 'sp-1', codigo: 'SUP-01', nombre: 'Mumbai Textiles Co.', tid: 'IN-AAACM1234A', direccion: 'Mumbai, Maharashtra', telefono: '+91 22 5555 0001', fax: '', pais: '356' },
  { id: 'sp-2', codigo: 'SUP-02', nombre: 'Shenzhen Electronics Ltd', tid: 'CN-91440300MA5', direccion: 'Nanshan District, Shenzhen', telefono: '+86 755 5555 0002', fax: '+86 755 5555 0003', pais: '156' },
  { id: 'sp-3', codigo: 'SUP-03', nombre: 'Bangkok Foods Export', tid: 'TH-0105555000031', direccion: 'Bangkok', telefono: '+66 2 555 0003', fax: '', pais: '764' },
  { id: 'sp-4', codigo: 'SUP-04', nombre: 'Hamburg Auto GmbH', tid: 'DE123456789', direccion: 'Hamburg', telefono: '+49 40 555 0004', fax: '+49 40 555 0005', pais: '276' },
  { id: 'sp-5', codigo: 'SUP-05', nombre: 'Basel Pharma AG', tid: 'CHE-123.456.789', direccion: 'Basel', telefono: '+41 61 555 0005', fax: '', pais: '756' },
];

interface RelacionadosState {
  clientes: Cliente[];
  suplidores: SuplidorMaestro[];
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
  findSuplidorByCodigo: (codigo: string) => SuplidorMaestro | undefined;
  resetToSeed: () => void;
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
      findSuplidorByCodigo: (codigo) => get().suplidores.find((s) => s.codigo === codigo),

      resetToSeed: () => set({ clientes: SEED_CLIENTES, suplidores: SEED_SUPLIDORES }),
    }),
    {
      name: 'aduana-relacionados',
      version: 2,
      partialize: (s) => ({ clientes: s.clientes, suplidores: s.suplidores }),
      migrate: (persisted) => {
        const state = persisted as { clientes?: Record<string, unknown>[]; suplidores?: SuplidorMaestro[] };
        return {
          clientes: (state.clientes ?? []).map(migrateCliente),
          suplidores: state.suplidores ?? SEED_SUPLIDORES,
        };
      },
    },
  ),
);
