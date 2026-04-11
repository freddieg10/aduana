import { create } from 'zustand';
import type { Expediente, ExpedienteStatus } from '../types';

const DEFAULT_CHECKLIST = [
  { id: 'chk-1', label: 'Documentos de importación recibidos', completed: false, completedAt: null },
  { id: 'chk-2', label: 'Factura comercial verificada', completed: false, completedAt: null },
  { id: 'chk-3', label: 'BL / Doc. Embarque recibido y revisado', completed: false, completedAt: null },
  { id: 'chk-4', label: 'Clasificación arancelaria asignada', completed: false, completedAt: null },
  { id: 'chk-5', label: 'Permisos y certificados verificados', completed: false, completedAt: null },
  { id: 'chk-6', label: 'Declaración aduanera generada', completed: false, completedAt: null },
  { id: 'chk-7', label: 'Pago de impuestos realizado', completed: false, completedAt: null },
  { id: 'chk-8', label: 'Despacho aduanal completado', completed: false, completedAt: null },
];

function makeChecklist(completedCount: number) {
  return DEFAULT_CHECKLIST.map((item, i) => ({
    ...item,
    id: `${item.id}-${crypto.randomUUID().slice(0, 4)}`,
    completed: i < completedCount,
    completedAt: i < completedCount ? '2026-04-0' + (i + 1) + 'T10:00:00Z' : null,
  }));
}

const SEED_DATA: Expediente[] = [
  {
    id: '1', reference: 'FALTA BL FAC 4600527', tipoExpediente: 'importacion', status: 'in-progress', checklist: makeChecklist(5),
    declaracion: {
      idSecuencia: '4721', eta: '2026-02-25', tipoDespacho: 'NO MANIFIESTO',
      administracionCodigo: '10030', administracionNombre: 'ADMINISTRACION HAINA ORIENTAL',
      noDeclaracion: 'FALTA BL FAC 4600527', docEmbarque: 'FALTA BL',
      depositoDestino: '', puertoEntrada: '',
      paisProcedenciaCodigo: '724', paisProcedenciaNombre: 'ESPAÑA',
      facturaComercialNo: '4600527',
    },
    importador: { codigo: '8115', nombre: 'BRAVO S A' },
    agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    consignatario: { codigo: '8115', nombre: 'BRAVO S A' },
    compradorExportacion: { codigo: '0', nombre: '' },
    suplidores: [],
    documentos: [],
    contenedores: [], tipoCarga: 'contenedores',
    valores: { tasaCambio: 65.00, valorFobTotal: 11540.89, seguro: 1.00, flete: 1.00, otros: 0.00, valorCifTotal: 11542.89 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '236404', pesoBrutoKg: 0, pesoNetoKg: 0 },
    partidas: [
      { id: 'p1', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 BLANCA (SP4020)', organico: false, cantidad: 1430.5, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 3456.00, unitario: 2.4159, facturaDva: '4600527' },
      { id: 'p2', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 FLORES (SP4077)', organico: false, cantidad: 966.5, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 2592.00, unitario: 2.6818, facturaDva: '4600527' },
      { id: 'p3', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 CEREZA (SP4074)', organico: false, cantidad: 155.5, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 432.00, unitario: 2.7781, facturaDva: '4600527' },
      { id: 'p4', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 MARGARITAS (SP4072)', organico: false, cantidad: 474.5, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 1296.00, unitario: 2.7313, facturaDva: '4600527' },
      { id: 'p5', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 AMARILLA (SP4023)', organico: false, cantidad: 112.5, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 408.60, unitario: 3.6320, facturaDva: '4600527' },
      { id: 'p6', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 ROJA (SP4021)', organico: false, cantidad: 252.5, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 1055.70, unitario: 4.1810, facturaDva: '4600527' },
      { id: 'p7', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 PUNTA NEGRA (SP4029)', organico: false, cantidad: 112.0, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 434.52, unitario: 3.8796, facturaDva: '4600527' },
    ],
    notes: 'Falta BL — pendiente de documentación de embarque', assignedUserId: '2',
    createdAt: '2026-02-20T08:00:00Z', updatedAt: '2026-04-05T14:30:00Z',
  },
  {
    id: '2', reference: 'DEC-2026-002', tipoExpediente: 'importacion', status: 'pending', checklist: makeChecklist(1),
    declaracion: {
      idSecuencia: '4722', eta: '2026-04-25', tipoDespacho: 'MANIFIESTO',
      administracionCodigo: '10020', administracionNombre: 'ADMINISTRACION PUERTO PLATA',
      noDeclaracion: 'DEC-2026-002', docEmbarque: 'HLCU-2026-45678',
      depositoDestino: '', puertoEntrada: 'Puerto Plata',
      paisProcedenciaCodigo: '356', paisProcedenciaNombre: 'INDIA',
      facturaComercialNo: '5002',
    },
    importador: { codigo: '2040', nombre: 'TEXTILES MODERNOS SRL' },
    agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    consignatario: { codigo: '2040', nombre: 'TEXTILES MODERNOS SRL' },
    compradorExportacion: { codigo: '0', nombre: '' },
    suplidores: [{ codigo: 'SUP-01', nombre: 'Mumbai Textiles Co.', nacionalidad: 'INDIA' }],
    documentos: [{ id: 'd1', numeroFactura: '5002', fechaFactura: '2026-04-01', codigoSuplidor: 'SUP-01', valorFactura: 6000 }],
    contenedores: [{ id: 'c1', tipo: '20', numero: 'HLCU-4567890', sello1: 'S001', sello2: '' }], tipoCarga: 'contenedores',
    valores: { tasaCambio: 65.00, valorFobTotal: 6000.00, seguro: 50.00, flete: 800.00, otros: 0.00, valorCifTotal: 6850.00 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '520811', pesoBrutoKg: 2500, pesoNetoKg: 2200 },
    partidas: [
      { id: 'p10', codigoPartida: '5208.11.01', descripcion: 'Telas de algodón crudo sin blanquear', organico: false, cantidad: 500, unidad: 'KILOGRAMOS', paisOrigen: 'INDIA', valorFob: 6000.00, unitario: 12.00, facturaDva: '5002' },
    ],
    notes: '', assignedUserId: '2', createdAt: '2026-04-01T09:00:00Z', updatedAt: '2026-04-01T09:00:00Z',
  },
  {
    id: '3', reference: 'DEC-2026-003', tipoExpediente: 'importacion', status: 'completed', checklist: makeChecklist(8),
    declaracion: {
      idSecuencia: '4700', eta: '2026-03-15', tipoDespacho: 'MANIFIESTO',
      administracionCodigo: '10010', administracionNombre: 'ADMINISTRACION SANTO DOMINGO',
      noDeclaracion: 'DEC-2026-003', docEmbarque: 'COSCO-2026-11223',
      depositoDestino: 'Almacén Central', puertoEntrada: 'Santo Domingo',
      paisProcedenciaCodigo: '156', paisProcedenciaNombre: 'CHINA',
      facturaComercialNo: '4980',
    },
    importador: { codigo: '3050', nombre: 'ELECTRONICA GLOBAL RD' },
    agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    consignatario: { codigo: '3050', nombre: 'ELECTRONICA GLOBAL RD' },
    compradorExportacion: { codigo: '0', nombre: '' },
    suplidores: [{ codigo: 'SUP-02', nombre: 'Shenzhen Electronics Ltd', nacionalidad: 'CHINA' }],
    documentos: [{ id: 'd2', numeroFactura: '4980', fechaFactura: '2026-02-20', codigoSuplidor: 'SUP-02', valorFactura: 10500 }],
    contenedores: [{ id: 'c2', tipo: '40', numero: 'COSCO-1122334', sello1: 'S100', sello2: 'S101' }], tipoCarga: 'contenedores',
    valores: { tasaCambio: 65.00, valorFobTotal: 10500.00, seguro: 100.00, flete: 1200.00, otros: 50.00, valorCifTotal: 11850.00 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '854231', pesoBrutoKg: 800, pesoNetoKg: 750 },
    partidas: [
      { id: 'p20', codigoPartida: '8542.31.01', descripcion: 'Componentes electrónicos - circuitos integrados', organico: false, cantidad: 1000, unidad: 'UNIDADES', paisOrigen: 'CHINA', valorFob: 5500.00, unitario: 5.50, facturaDva: '4980' },
      { id: 'p21', codigoPartida: '8534.00.01', descripcion: 'Placas PCB para ensamblaje', organico: false, cantidad: 200, unidad: 'UNIDADES', paisOrigen: 'CHINA', valorFob: 5000.00, unitario: 25.00, facturaDva: '4980' },
    ],
    notes: 'Despacho completado sin incidencias', assignedUserId: '2', createdAt: '2026-02-15T10:00:00Z', updatedAt: '2026-03-20T16:00:00Z',
  },
  {
    id: '4', reference: 'DEC-2026-004', tipoExpediente: 'importacion', status: 'alert', checklist: makeChecklist(3),
    declaracion: {
      idSecuencia: '4730', eta: '2026-04-08', tipoDespacho: 'NO MANIFIESTO',
      administracionCodigo: '10030', administracionNombre: 'ADMINISTRACION HAINA ORIENTAL',
      noDeclaracion: 'DEC-2026-004', docEmbarque: 'EVG-2026-33445',
      depositoDestino: '', puertoEntrada: 'Haina',
      paisProcedenciaCodigo: '764', paisProcedenciaNombre: 'TAILANDIA',
      facturaComercialNo: '5010',
    },
    importador: { codigo: '4060', nombre: 'ALIMENTOS DEL CARIBE SRL' },
    agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    consignatario: { codigo: '4060', nombre: 'ALIMENTOS DEL CARIBE SRL' },
    compradorExportacion: { codigo: '0', nombre: '' },
    suplidores: [{ codigo: 'SUP-03', nombre: 'Bangkok Foods Export', nacionalidad: 'TAILANDIA' }],
    documentos: [{ id: 'd3', numeroFactura: '5010', fechaFactura: '2026-03-28', codigoSuplidor: 'SUP-03', valorFactura: 6000 }],
    contenedores: [{ id: 'c3', tipo: '40RF', numero: 'EVG-3344556', sello1: 'RS200', sello2: '' }], tipoCarga: 'contenedores',
    valores: { tasaCambio: 65.00, valorFobTotal: 6000.00, seguro: 80.00, flete: 950.00, otros: 0.00, valorCifTotal: 7030.00 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '200599', pesoBrutoKg: 5000, pesoNetoKg: 4800 },
    partidas: [
      { id: 'p30', codigoPartida: '2005.99.01', descripcion: 'Productos alimenticios enlatados — vegetales', organico: false, cantidad: 2000, unidad: 'KILOGRAMOS', paisOrigen: 'TAILANDIA', valorFob: 6000.00, unitario: 3.00, facturaDva: '5010' },
    ],
    notes: 'ALERTA: Falta permiso sanitario', assignedUserId: '2', createdAt: '2026-03-28T11:00:00Z', updatedAt: '2026-04-08T08:00:00Z',
  },
  {
    id: '5', reference: 'DEC-2026-005', tipoExpediente: 'importacion', status: 'in-progress', checklist: makeChecklist(6),
    declaracion: {
      idSecuencia: '4740', eta: '2026-04-18', tipoDespacho: 'MANIFIESTO',
      administracionCodigo: '10040', administracionNombre: 'ADMINISTRACION CAUCEDO',
      noDeclaracion: 'DEC-2026-005', docEmbarque: 'MSC-2026-99887',
      depositoDestino: 'Zona Franca', puertoEntrada: 'Caucedo',
      paisProcedenciaCodigo: '276', paisProcedenciaNombre: 'ALEMANIA',
      facturaComercialNo: '5015',
    },
    importador: { codigo: '5070', nombre: 'AUTOPARTES EXPRESS SRL' },
    agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    consignatario: { codigo: '5070', nombre: 'AUTOPARTES EXPRESS SRL' },
    compradorExportacion: { codigo: '0', nombre: '' },
    suplidores: [{ codigo: 'SUP-04', nombre: 'Hamburg Auto GmbH', nacionalidad: 'ALEMANIA' }],
    documentos: [{ id: 'd4', numeroFactura: '5015', fechaFactura: '2026-04-02', codigoSuplidor: 'SUP-04', valorFactura: 17500 }],
    contenedores: [{ id: 'c4', tipo: '40', numero: 'MSC-9988776', sello1: 'DE500', sello2: 'DE501' }], tipoCarga: 'contenedores',
    valores: { tasaCambio: 65.00, valorFobTotal: 17500.00, seguro: 150.00, flete: 1800.00, otros: 0.00, valorCifTotal: 19450.00 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '870830', pesoBrutoKg: 3200, pesoNetoKg: 3000 },
    partidas: [
      { id: 'p40', codigoPartida: '8708.30.01', descripcion: 'Autopartes — Sistemas de frenos', organico: false, cantidad: 300, unidad: 'UNIDADES', paisOrigen: 'ALEMANIA', valorFob: 13500.00, unitario: 45.00, facturaDva: '5015' },
      { id: 'p41', codigoPartida: '8421.23.01', descripcion: 'Autopartes — Filtros de aceite', organico: false, cantidad: 500, unidad: 'UNIDADES', paisOrigen: 'ALEMANIA', valorFob: 4000.00, unitario: 8.00, facturaDva: '5015' },
    ],
    notes: 'Envío parcial — segundo embarque pendiente', assignedUserId: '2', createdAt: '2026-04-02T07:00:00Z', updatedAt: '2026-04-09T12:00:00Z',
  },
  {
    id: '6', reference: 'DEC-2026-006', tipoExpediente: 'importacion', status: 'pending', checklist: makeChecklist(0),
    declaracion: {
      idSecuencia: '4750', eta: '2026-05-01', tipoDespacho: 'MANIFIESTO',
      administracionCodigo: '10020', administracionNombre: 'ADMINISTRACION PUERTO PLATA',
      noDeclaracion: 'DEC-2026-006', docEmbarque: 'OOCL-2026-55667',
      depositoDestino: '', puertoEntrada: 'Puerto Plata',
      paisProcedenciaCodigo: '756', paisProcedenciaNombre: 'SUIZA',
      facturaComercialNo: '5020',
    },
    importador: { codigo: '6080', nombre: 'FARMACEUTICA CENTRAL SRL' },
    agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    consignatario: { codigo: '6080', nombre: 'FARMACEUTICA CENTRAL SRL' },
    compradorExportacion: { codigo: '0', nombre: '' },
    suplidores: [{ codigo: 'SUP-05', nombre: 'Basel Pharma AG', nacionalidad: 'SUIZA' }],
    documentos: [{ id: 'd5', numeroFactura: '5020', fechaFactura: '2026-04-08', codigoSuplidor: 'SUP-05', valorFactura: 40000 }],
    contenedores: [{ id: 'c5', tipo: '20', numero: 'OOCL-5566778', sello1: 'PH300', sello2: '' }], tipoCarga: 'contenedores',
    valores: { tasaCambio: 65.00, valorFobTotal: 40000.00, seguro: 500.00, flete: 2000.00, otros: 100.00, valorCifTotal: 42600.00 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '294110', pesoBrutoKg: 500, pesoNetoKg: 450 },
    partidas: [
      { id: 'p50', codigoPartida: '2941.10.01', descripcion: 'Materia prima farmacéutica — antibióticos', organico: false, cantidad: 50, unidad: 'KILOGRAMOS', paisOrigen: 'SUIZA', valorFob: 40000.00, unitario: 800.00, facturaDva: '5020' },
    ],
    notes: 'Requiere permiso sanitario y certificado de origen', assignedUserId: '2', createdAt: '2026-04-08T15:00:00Z', updatedAt: '2026-04-08T15:00:00Z',
  },
];

export function computeProgress(checklist: Expediente['checklist']): number {
  if (checklist.length === 0) return 0;
  return Math.round((checklist.filter((c) => c.completed).length / checklist.length) * 100);
}

/** Helper to get importer name for display */
export function getImportadorName(exp: Expediente): string {
  return exp.importador.nombre;
}

/** Helper to get total CIF */
export function getValorCif(exp: Expediente): number {
  return exp.valores.valorCifTotal;
}

interface ExpedientesState {
  expedientes: Expediente[];
  getAll: () => Expediente[];
  getById: (id: string) => Expediente | undefined;
  create: (data: Omit<Expediente, 'id' | 'createdAt' | 'updatedAt'>) => Expediente;
  update: (id: string, data: Partial<Expediente>) => void;
  remove: (id: string) => void;
  toggleChecklistItem: (expedienteId: string, itemId: string) => void;
  bulkAdd: (items: Omit<Expediente, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

export const useExpedientesStore = create<ExpedientesState>((set, get) => ({
  expedientes: SEED_DATA,

  getAll: () => get().expedientes,

  getById: (id) => get().expedientes.find((e) => e.id === id),

  create: (data) => {
    const now = new Date().toISOString();
    const newExp: Expediente = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ expedientes: [...s.expedientes, newExp] }));
    return newExp;
  },

  update: (id, data) => {
    set((s) => ({
      expedientes: s.expedientes.map((e) =>
        e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e,
      ),
    }));
  },

  remove: (id) => {
    set((s) => ({ expedientes: s.expedientes.filter((e) => e.id !== id) }));
  },

  toggleChecklistItem: (expedienteId, itemId) => {
    set((s) => ({
      expedientes: s.expedientes.map((e) => {
        if (e.id !== expedienteId) return e;
        const checklist = e.checklist.map((c) =>
          c.id === itemId
            ? { ...c, completed: !c.completed, completedAt: !c.completed ? new Date().toISOString() : null }
            : c,
        );
        const completedCount = checklist.filter((c) => c.completed).length;
        let status: ExpedienteStatus = e.status;
        if (completedCount === checklist.length) status = 'completed';
        else if (completedCount > 0) status = 'in-progress';
        return { ...e, checklist, status, updatedAt: new Date().toISOString() };
      }),
    }));
  },

  bulkAdd: (items) => {
    const now = new Date().toISOString();
    const newExps = items.map((data) => ({
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));
    set((s) => ({ expedientes: [...s.expedientes, ...newExps] }));
  },
}));
