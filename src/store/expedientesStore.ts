import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ExpedienteStatus } from '../types';
import type { Expediente, InformacionAdicional, Observacion, Partida } from '../types';
import { ADMINISTRACIONES, DEFAULT_CHECKLIST_LABELS, DIGITADORES, GESTORES, PAIS_RD, TIPO_DESPACHO_LEGACY } from '../data/catalogos';
import { parseLegacyNotes, makeObservacion } from '../utils/observaciones';
import { migratePartida } from '../utils/partida';

function makeChecklist(completedCount: number) {
  return DEFAULT_CHECKLIST_LABELS.map((label, i) => ({
    id: `chk-${i + 1}-${crypto.randomUUID().slice(0, 4)}`,
    label,
    completed: i < completedCount,
    completedAt: i < completedCount ? '2026-04-0' + (i + 1) + 'T10:00:00Z' : null,
  }));
}

/** Seed tariff lines list only the interesting fields; the rest come from the defaults. */
const sp = (p: Partial<Partida> & Pick<Partida, 'id'>): Partida =>
  migratePartida(p as unknown as Record<string, unknown>);

const obs = (fecha: string, usuario: string, texto: string, publica = false): Observacion => ({
  id: crypto.randomUUID(), fecha, usuario, texto, publica,
});

export const emptyInformacionAdicional = (): InformacionAdicional => ({
  transportistaCodigo: '', transportistaNombre: '', transporteNacionalidad: '', medioTransporte: '',
  noViaje: '', manifiestoNo: '', cargoControlNo: '', fechaLlegadaReal: '', notasHojaRegistro: '',
});

/** Seed transport data so the hoja de registro and the DUA have something to show. */
const infoAd = (p: Partial<InformacionAdicional>): InformacionAdicional => ({ ...emptyInformacionAdicional(), ...p });

const SEED_DATA: Expediente[] = [
  {
    id: '1', reference: 'FALTA BL FAC 4600527', tipoExpediente: 'importacion', status: ExpedienteStatus.Presentado, checklist: makeChecklist(5),
    declaracion: {
      idSecuencia: '4721', eta: '2026-02-25', tipoDespacho: 'NO MANIFIESTO',
      administracionCodigo: '10030', administracionNombre: 'ADMINISTRACION HAINA ORIENTAL',
      noDeclaracion: 'FALTA BL FAC 4600527', docEmbarque: 'FALTA BL',
      depositoDestino: '', puertoEntrada: '',
      paisProcedenciaCodigo: '724', paisProcedenciaNombre: 'ESPAÑA',
      facturaComercialNo: '4600527',
    },
    importador: { codigo: '101-00001-1', nombre: 'BRAVO S A', tipoDocumento: 'RNC', paisDocumento: PAIS_RD },
    agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    consignatario: { codigo: '101-00001-1', nombre: 'BRAVO S A', tipoDocumento: 'RNC', paisDocumento: PAIS_RD },
    compradorExportacion: { codigo: '0', nombre: '' },
    suplidores: [],
    documentos: [],
    contenedores: [], tipoCarga: 'contenedores',
    valores: { tasaCambio: 65.00, valorFobTotal: 11540.89, seguro: 1.00, flete: 1.00, otros: 0.00, valorCifTotal: 11542.89 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '236404', pesoBrutoKg: 0, pesoNetoKg: 0 },
    partidas: [
      sp({ id: 'p1', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 BLANCA (SP4020)', organico: false, cantidad: 1430.5, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 3456.00, unitario: 2.4159, facturaDva: '4600527' }),
      sp({ id: 'p2', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 FLORES (SP4077)', organico: false, cantidad: 966.5, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 2592.00, unitario: 2.6818, facturaDva: '4600527' }),
      sp({ id: 'p3', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 CEREZA (SP4074)', organico: false, cantidad: 155.5, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 432.00, unitario: 2.7781, facturaDva: '4600527' }),
      sp({ id: 'p4', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 MARGARITAS (SP4072)', organico: false, cantidad: 474.5, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 1296.00, unitario: 2.7313, facturaDva: '4600527' }),
      sp({ id: 'p5', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 AMARILLA (SP4023)', organico: false, cantidad: 112.5, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 408.60, unitario: 3.6320, facturaDva: '4600527' }),
      sp({ id: 'p6', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 ROJA (SP4021)', organico: false, cantidad: 252.5, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 1055.70, unitario: 4.1810, facturaDva: '4600527' }),
      sp({ id: 'p7', codigoPartida: '4818.30.00', descripcion: 'SERVILLETA SUAO 40X40 PUNTA NEGRA (SP4029)', organico: false, cantidad: 112.0, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 434.52, unitario: 3.8796, facturaDva: '4600527' }),
    ],
    informacionAdicional: infoAd({ transportistaNombre: 'MAERSK LINE', transporteNacionalidad: '208', medioTransporte: 'MARITIMO', noViaje: 'V-2202', manifiestoNo: 'MAN-2026-1180', fechaLlegadaReal: '2026-02-25' }),
    digitador: DIGITADORES[0], gestor: GESTORES[0],
    observaciones: [obs('2026-04-05T14:30:00Z', 'Digitador López', 'Falta BL — pendiente de documentación de embarque', true)],
    assignedUserId: '2',
    createdAt: '2026-02-20T08:00:00Z', updatedAt: '2026-04-05T14:30:00Z',
  },
  {
    id: '2', reference: 'DEC-2026-002', tipoExpediente: 'importacion', status: ExpedienteStatus.Registrado, checklist: makeChecklist(1),
    declaracion: {
      idSecuencia: '4722', eta: '2026-04-25', tipoDespacho: 'GENERAL',
      administracionCodigo: '10070', administracionNombre: 'ADMINISTRACION PUERTO PLATA',
      noDeclaracion: 'DEC-2026-002', docEmbarque: 'HLCU-2026-45678',
      depositoDestino: '', puertoEntrada: 'Puerto Plata',
      paisProcedenciaCodigo: '356', paisProcedenciaNombre: 'INDIA',
      facturaComercialNo: '5002',
    },
    importador: { codigo: '130-00002-2', nombre: 'TEXTILES MODERNOS SRL', tipoDocumento: 'RNC', paisDocumento: PAIS_RD },
    agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    consignatario: { codigo: '130-00002-2', nombre: 'TEXTILES MODERNOS SRL', tipoDocumento: 'RNC', paisDocumento: PAIS_RD },
    compradorExportacion: { codigo: '0', nombre: '' },
    suplidores: [{ tipoDocumento: 'TID', codigo: 'IN-AAACM1234A', nombre: 'Mumbai Textiles Co.', nacionalidad: 'INDIA' }],
    documentos: [{ id: 'd1', numeroFactura: '5002', fechaFactura: '2026-04-01', codigoSuplidor: 'IN-AAACM1234A', valorFactura: 6000 }],
    contenedores: [{ id: 'c1', tipo: '20', numero: 'HLCU-4567890', sello1: 'S001', sello2: '' }], tipoCarga: 'contenedores',
    valores: { tasaCambio: 65.00, valorFobTotal: 6000.00, seguro: 50.00, flete: 800.00, otros: 0.00, valorCifTotal: 6850.00 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '520811', pesoBrutoKg: 2500, pesoNetoKg: 2200 },
    partidas: [
      sp({ id: 'p10', codigoPartida: '5208.11.01', descripcion: 'Telas de algodón crudo sin blanquear', organico: false, cantidad: 500, unidad: 'KILOGRAMOS', paisOrigen: 'INDIA', valorFob: 6000.00, unitario: 12.00, facturaDva: '5002' }),
    ],
    informacionAdicional: infoAd({ transportistaNombre: 'HAPAG-LLOYD', transporteNacionalidad: '276', medioTransporte: 'MARITIMO', noViaje: 'V-4455', manifiestoNo: 'MAN-2026-2210' }),
    digitador: DIGITADORES[1], gestor: GESTORES[1],
    observaciones: [], assignedUserId: '2', createdAt: '2026-04-01T09:00:00Z', updatedAt: '2026-04-01T09:00:00Z',
  },
  {
    id: '3', reference: 'DEC-2026-003', tipoExpediente: 'importacion', status: ExpedienteStatus.Completo, checklist: makeChecklist(8),
    declaracion: {
      idSecuencia: '4700', eta: '2026-03-15', tipoDespacho: 'GENERAL',
      administracionCodigo: '10010', administracionNombre: 'ADMINISTRACION SANTO DOMINGO',
      noDeclaracion: 'DEC-2026-003', docEmbarque: 'COSCO-2026-11223',
      depositoDestino: 'Almacén Central', puertoEntrada: 'Santo Domingo',
      paisProcedenciaCodigo: '156', paisProcedenciaNombre: 'CHINA',
      facturaComercialNo: '4980',
    },
    importador: { codigo: '130-00003-3', nombre: 'ELECTRONICA GLOBAL RD', tipoDocumento: 'RNC', paisDocumento: PAIS_RD },
    agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    consignatario: { codigo: '130-00003-3', nombre: 'ELECTRONICA GLOBAL RD', tipoDocumento: 'RNC', paisDocumento: PAIS_RD },
    compradorExportacion: { codigo: '0', nombre: '' },
    suplidores: [{ tipoDocumento: 'TID', codigo: 'CN-91440300MA5', nombre: 'Shenzhen Electronics Ltd', nacionalidad: 'CHINA' }],
    documentos: [{ id: 'd2', numeroFactura: '4980', fechaFactura: '2026-02-20', codigoSuplidor: 'CN-91440300MA5', valorFactura: 10500 }],
    contenedores: [{ id: 'c2', tipo: '40', numero: 'COSCO-1122334', sello1: 'S100', sello2: 'S101' }], tipoCarga: 'contenedores',
    valores: { tasaCambio: 65.00, valorFobTotal: 10500.00, seguro: 100.00, flete: 1200.00, otros: 50.00, valorCifTotal: 11850.00 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '854231', pesoBrutoKg: 800, pesoNetoKg: 750 },
    partidas: [
      sp({ id: 'p20', codigoPartida: '8542.31.01', descripcion: 'Componentes electrónicos - circuitos integrados', organico: false, cantidad: 1000, unidad: 'UNIDADES', paisOrigen: 'CHINA', valorFob: 5500.00, unitario: 5.50, facturaDva: '4980' }),
      sp({ id: 'p21', codigoPartida: '8534.00.01', descripcion: 'Placas PCB para ensamblaje', organico: false, cantidad: 200, unidad: 'UNIDADES', paisOrigen: 'CHINA', valorFob: 5000.00, unitario: 25.00, facturaDva: '4980' }),
    ],
    informacionAdicional: infoAd({ transportistaNombre: 'COSCO SHIPPING', transporteNacionalidad: '156', medioTransporte: 'MARITIMO', noViaje: 'V-9911', manifiestoNo: 'MAN-2026-1902', fechaLlegadaReal: '2026-03-15' }),
    digitador: DIGITADORES[2], gestor: GESTORES[2],
    observaciones: [obs('2026-03-20T16:00:00Z', 'Digitador López', 'Despacho completado sin incidencias', true)],
    assignedUserId: '2', createdAt: '2026-02-15T10:00:00Z', updatedAt: '2026-03-20T16:00:00Z',
  },
  {
    id: '4', reference: 'DEC-2026-004', tipoExpediente: 'importacion', status: ExpedienteStatus.PendienteInfo, checklist: makeChecklist(3),
    declaracion: {
      idSecuencia: '4730', eta: '2026-04-08', tipoDespacho: 'NO MANIFIESTO',
      administracionCodigo: '10030', administracionNombre: 'ADMINISTRACION HAINA ORIENTAL',
      noDeclaracion: 'DEC-2026-004', docEmbarque: 'EVG-2026-33445',
      depositoDestino: '', puertoEntrada: 'Haina',
      paisProcedenciaCodigo: '764', paisProcedenciaNombre: 'TAILANDIA',
      facturaComercialNo: '5010',
    },
    importador: { codigo: '130-00004-4', nombre: 'ALIMENTOS DEL CARIBE SRL', tipoDocumento: 'RNC', paisDocumento: PAIS_RD },
    agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    consignatario: { codigo: '130-00004-4', nombre: 'ALIMENTOS DEL CARIBE SRL', tipoDocumento: 'RNC', paisDocumento: PAIS_RD },
    compradorExportacion: { codigo: '0', nombre: '' },
    suplidores: [{ tipoDocumento: 'TID', codigo: 'TH-0105555000031', nombre: 'Bangkok Foods Export', nacionalidad: 'TAILANDIA' }],
    documentos: [{ id: 'd3', numeroFactura: '5010', fechaFactura: '2026-03-28', codigoSuplidor: 'TH-0105555000031', valorFactura: 6000 }],
    contenedores: [{ id: 'c3', tipo: '40RF', numero: 'EVG-3344556', sello1: 'RS200', sello2: '' }], tipoCarga: 'contenedores',
    valores: { tasaCambio: 65.00, valorFobTotal: 6000.00, seguro: 80.00, flete: 950.00, otros: 0.00, valorCifTotal: 7030.00 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '200599', pesoBrutoKg: 5000, pesoNetoKg: 4800 },
    partidas: [
      sp({ id: 'p30', codigoPartida: '2005.99.01', descripcion: 'Productos alimenticios enlatados — vegetales', organico: false, cantidad: 2000, unidad: 'KILOGRAMOS', paisOrigen: 'TAILANDIA', valorFob: 6000.00, unitario: 3.00, facturaDva: '5010' }),
    ],
    informacionAdicional: infoAd({ transportistaNombre: 'EVERGREEN', transporteNacionalidad: '158', medioTransporte: 'MARITIMO', noViaje: 'V-3344', manifiestoNo: 'MAN-2026-2440', fechaLlegadaReal: '2026-04-08' }),
    digitador: DIGITADORES[3], gestor: GESTORES[3],
    observaciones: [obs('2026-04-08T08:00:00Z', 'Admin García', 'ALERTA: Falta permiso sanitario')],
    assignedUserId: '2', createdAt: '2026-03-28T11:00:00Z', updatedAt: '2026-04-08T08:00:00Z',
  },
  {
    id: '5', reference: 'DEC-2026-005', tipoExpediente: 'importacion', status: ExpedienteStatus.ProcesoVerificacion, checklist: makeChecklist(6),
    declaracion: {
      idSecuencia: '4740', eta: '2026-04-18', tipoDespacho: 'GENERAL',
      administracionCodigo: '10150', administracionNombre: 'ADMINISTRACION PUERTO MULTIMODAL CAUCEDO',
      noDeclaracion: 'DEC-2026-005', docEmbarque: 'MSC-2026-99887',
      depositoDestino: 'Zona Franca', puertoEntrada: 'Caucedo',
      paisProcedenciaCodigo: '276', paisProcedenciaNombre: 'ALEMANIA',
      facturaComercialNo: '5015',
    },
    importador: { codigo: '130-00005-5', nombre: 'AUTOPARTES EXPRESS SRL', tipoDocumento: 'RNC', paisDocumento: PAIS_RD },
    agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    consignatario: { codigo: '130-00005-5', nombre: 'AUTOPARTES EXPRESS SRL', tipoDocumento: 'RNC', paisDocumento: PAIS_RD },
    compradorExportacion: { codigo: '0', nombre: '' },
    suplidores: [{ tipoDocumento: 'TID', codigo: 'DE123456789', nombre: 'Hamburg Auto GmbH', nacionalidad: 'ALEMANIA' }],
    documentos: [{ id: 'd4', numeroFactura: '5015', fechaFactura: '2026-04-02', codigoSuplidor: 'DE123456789', valorFactura: 17500 }],
    contenedores: [{ id: 'c4', tipo: '40', numero: 'MSC-9988776', sello1: 'DE500', sello2: 'DE501' }], tipoCarga: 'contenedores',
    valores: { tasaCambio: 65.00, valorFobTotal: 17500.00, seguro: 150.00, flete: 1800.00, otros: 0.00, valorCifTotal: 19450.00 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '870830', pesoBrutoKg: 3200, pesoNetoKg: 3000 },
    partidas: [
      sp({ id: 'p40', codigoPartida: '8708.30.01', descripcion: 'Autopartes — Sistemas de frenos', organico: false, cantidad: 300, unidad: 'UNIDADES', paisOrigen: 'ALEMANIA', valorFob: 13500.00, unitario: 45.00, facturaDva: '5015' }),
      sp({ id: 'p41', codigoPartida: '8421.23.01', descripcion: 'Autopartes — Filtros de aceite', organico: false, cantidad: 500, unidad: 'UNIDADES', paisOrigen: 'ALEMANIA', valorFob: 4000.00, unitario: 8.00, facturaDva: '5015' }),
    ],
    informacionAdicional: infoAd({ transportistaNombre: 'MSC', transporteNacionalidad: '756', medioTransporte: 'MARITIMO', noViaje: 'V-8877', manifiestoNo: 'MAN-2026-2500', fechaLlegadaReal: '2026-04-18' }),
    digitador: DIGITADORES[0], gestor: GESTORES[1],
    observaciones: [obs('2026-04-09T12:00:00Z', 'Digitador López', 'Envío parcial — segundo embarque pendiente')],
    assignedUserId: '2', createdAt: '2026-04-02T07:00:00Z', updatedAt: '2026-04-09T12:00:00Z',
  },
  {
    id: '6', reference: 'DEC-2026-006', tipoExpediente: 'importacion', status: ExpedienteStatus.Manifestado, checklist: makeChecklist(0),
    declaracion: {
      idSecuencia: '4750', eta: '2026-05-01', tipoDespacho: 'GENERAL',
      administracionCodigo: '10070', administracionNombre: 'ADMINISTRACION PUERTO PLATA',
      noDeclaracion: 'DEC-2026-006', docEmbarque: 'OOCL-2026-55667',
      depositoDestino: '', puertoEntrada: 'Puerto Plata',
      paisProcedenciaCodigo: '756', paisProcedenciaNombre: 'SUIZA',
      facturaComercialNo: '5020',
    },
    importador: { codigo: '130-00006-6', nombre: 'FARMACEUTICA CENTRAL SRL', tipoDocumento: 'RNC', paisDocumento: PAIS_RD },
    agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
    consignatario: { codigo: '130-00006-6', nombre: 'FARMACEUTICA CENTRAL SRL', tipoDocumento: 'RNC', paisDocumento: PAIS_RD },
    compradorExportacion: { codigo: '0', nombre: '' },
    suplidores: [{ tipoDocumento: 'TID', codigo: 'CHE-123.456.789', nombre: 'Basel Pharma AG', nacionalidad: 'SUIZA' }],
    documentos: [{ id: 'd5', numeroFactura: '5020', fechaFactura: '2026-04-08', codigoSuplidor: 'CHE-123.456.789', valorFactura: 40000 }],
    contenedores: [{ id: 'c5', tipo: '20', numero: 'OOCL-5566778', sello1: 'PH300', sello2: '' }], tipoCarga: 'contenedores',
    valores: { tasaCambio: 65.00, valorFobTotal: 40000.00, seguro: 500.00, flete: 2000.00, otros: 100.00, valorCifTotal: 42600.00 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '294110', pesoBrutoKg: 500, pesoNetoKg: 450 },
    partidas: [
      sp({ id: 'p50', codigoPartida: '2941.10.01', descripcion: 'Materia prima farmacéutica — antibióticos', organico: false, cantidad: 50, unidad: 'KILOGRAMOS', paisOrigen: 'SUIZA', valorFob: 40000.00, unitario: 800.00, facturaDva: '5020' }),
    ],
    informacionAdicional: infoAd({ transportistaNombre: 'OOCL', transporteNacionalidad: '344', medioTransporte: 'MARITIMO', noViaje: 'V-5566', manifiestoNo: 'MAN-2026-2610' }),
    digitador: DIGITADORES[1], gestor: GESTORES[2],
    observaciones: [obs('2026-04-08T15:00:00Z', 'Digitador López', 'Requiere permiso sanitario y certificado de origen')],
    assignedUserId: '2', createdAt: '2026-04-08T15:00:00Z', updatedAt: '2026-04-08T15:00:00Z',
  },
];

export { computeProgress } from '../utils/progress';

export type NewExpediente = Omit<Expediente, 'id' | 'createdAt' | 'updatedAt'>;

interface ExpedientesState {
  expedientes: Expediente[];
  getAll: () => Expediente[];
  getById: (id: string) => Expediente | undefined;
  create: (data: NewExpediente) => Expediente;
  update: (id: string, data: Partial<Expediente>) => void;
  remove: (id: string) => void;
  toggleChecklistItem: (expedienteId: string, itemId: string) => void;
  bulkAdd: (items: NewExpediente[]) => void;
  addObservacion: (expedienteId: string, usuario: string, texto: string, publica?: boolean) => void;
  updateObservacion: (expedienteId: string, obsId: string, texto: string) => void;
  toggleObservacionPublica: (expedienteId: string, obsId: string) => void;
  removeObservacion: (expedienteId: string, obsId: string) => void;
  resetToSeed: () => void;
}

const normName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const ADMIN_BY_NAME = new Map(ADMINISTRACIONES.map((a) => [normName(a.nombre), a.codigo]));

/**
 * Upgrades records written by older versions of the app (persisted state or old exports):
 * v1 -> v2: `notes: string` -> `observaciones: Observacion[]`, missing digitador/gestor.
 * v2 -> v3: administración codes were placeholders before the SIGA area table arrived;
 *           when the stored name matches a catalog entry, the code is corrected.
 * v3 -> v4: tipo de despacho values that SIGA does not offer are mapped to the real ones.
 * v5:       the importer code became the client's RNC, so the old internal codes are remapped.
 * v6:       renglones gained the SIGA detail fields (marca, estado, vehículo...), and
 *           suplidores moved from an internal code to their TID.
 * v7:       observaciones gained `publica` (default private) and the expediente gained
 *           `informacionAdicional`.
 */
const IMPORTADOR_CODIGO_LEGACY: Record<string, string> = {
  '8115': '101-00001-1',
  '2040': '130-00002-2',
  '3050': '130-00003-3',
  '4060': '130-00004-4',
  '5070': '130-00005-5',
  '6080': '130-00006-6',
};

/** Internal supplier codes used before suplidores were keyed by their TID. */
const SUPLIDOR_CODIGO_LEGACY: Record<string, string> = {
  'SUP-01': 'IN-AAACM1234A',
  'SUP-02': 'CN-91440300MA5',
  'SUP-03': 'TH-0105555000031',
  'SUP-04': 'DE123456789',
  'SUP-05': 'CHE-123.456.789',
};

const toRnc = (parte: { codigo: string; nombre: string } | undefined) =>
  parte && IMPORTADOR_CODIGO_LEGACY[parte.codigo]
    ? { ...parte, codigo: IMPORTADOR_CODIGO_LEGACY[parte.codigo] }
    : parte;

export function migrateExpediente(raw: Record<string, unknown>): Expediente {
  const e = raw as unknown as Expediente & { notes?: string };
  const observaciones = Array.isArray(e.observaciones) ? e.observaciones : parseLegacyNotes(e.notes);
  const upgraded: Expediente & { notes?: string } = {
    ...e,
    observaciones,
    digitador: e.digitador ?? '',
    gestor: e.gestor ?? '',
  };
  delete upgraded.notes;

  const d = upgraded.declaracion;
  if (d) {
    const patch: Partial<typeof d> = {};
    const realAdmin = d.administracionNombre ? ADMIN_BY_NAME.get(normName(d.administracionNombre)) : undefined;
    if (realAdmin && realAdmin !== d.administracionCodigo) patch.administracionCodigo = realAdmin;
    const realDespacho = TIPO_DESPACHO_LEGACY[String(d.tipoDespacho ?? '').trim().toUpperCase()];
    if (realDespacho) patch.tipoDespacho = realDespacho;
    if (Object.keys(patch).length) upgraded.declaracion = { ...d, ...patch };
  }

  upgraded.informacionAdicional = { ...emptyInformacionAdicional(), ...(upgraded.informacionAdicional ?? {}) };
  upgraded.observaciones = upgraded.observaciones.map((o) => ({ ...o, publica: o.publica ?? false }));

  if (Array.isArray(upgraded.partidas)) {
    upgraded.partidas = upgraded.partidas.map((p) => migratePartida(p as unknown as Record<string, unknown>));
  }

  if (Array.isArray(upgraded.suplidores)) {
    upgraded.suplidores = upgraded.suplidores.map((sup) => {
      const real = SUPLIDOR_CODIGO_LEGACY[sup.codigo];
      return real ? { ...sup, codigo: real, tipoDocumento: sup.tipoDocumento ?? ('TID' as const) } : sup;
    });
  }
  if (Array.isArray(upgraded.documentos)) {
    upgraded.documentos = upgraded.documentos.map((doc) => {
      const real = SUPLIDOR_CODIGO_LEGACY[doc.codigoSuplidor];
      return real ? { ...doc, codigoSuplidor: real } : doc;
    });
  }

  const importador = toRnc(upgraded.importador);
  if (importador) upgraded.importador = importador;
  const consignatario = toRnc(upgraded.consignatario);
  if (consignatario) upgraded.consignatario = consignatario;

  return upgraded;
}

export const useExpedientesStore = create<ExpedientesState>()(
  persist(
    (set, get) => ({
      expedientes: SEED_DATA,

      getAll: () => get().expedientes,

      getById: (id) => get().expedientes.find((e) => e.id === id),

      create: (data) => {
        const now = new Date().toISOString();
        const newExp: Expediente = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
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
            if (completedCount === checklist.length) status = ExpedienteStatus.Completo;
            else if (completedCount > 0) status = ExpedienteStatus.Verificado;
            return { ...e, checklist, status, updatedAt: new Date().toISOString() };
          }),
        }));
      },

      bulkAdd: (items) => {
        const now = new Date().toISOString();
        const newExps = items.map((data) => ({ ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }));
        set((s) => ({ expedientes: [...s.expedientes, ...newExps] }));
      },

      addObservacion: (expedienteId, usuario, texto, publica = false) => {
        if (!texto.trim()) return;
        set((s) => ({
          expedientes: s.expedientes.map((e) =>
            e.id === expedienteId
              ? { ...e, observaciones: [...e.observaciones, makeObservacion(usuario, texto, publica)], updatedAt: new Date().toISOString() }
              : e,
          ),
        }));
      },

      toggleObservacionPublica: (expedienteId, obsId) => {
        set((s) => ({
          expedientes: s.expedientes.map((e) =>
            e.id === expedienteId
              ? { ...e, observaciones: e.observaciones.map((o) => (o.id === obsId ? { ...o, publica: !o.publica } : o)), updatedAt: new Date().toISOString() }
              : e,
          ),
        }));
      },

      updateObservacion: (expedienteId, obsId, texto) => {
        set((s) => ({
          expedientes: s.expedientes.map((e) =>
            e.id === expedienteId
              ? { ...e, observaciones: e.observaciones.map((o) => (o.id === obsId ? { ...o, texto: texto.trim() } : o)), updatedAt: new Date().toISOString() }
              : e,
          ),
        }));
      },

      removeObservacion: (expedienteId, obsId) => {
        set((s) => ({
          expedientes: s.expedientes.map((e) =>
            e.id === expedienteId
              ? { ...e, observaciones: e.observaciones.filter((o) => o.id !== obsId), updatedAt: new Date().toISOString() }
              : e,
          ),
        }));
      },

      resetToSeed: () => set({ expedientes: SEED_DATA }),
    }),
    {
      name: 'aduana-expedientes',
      version: 7,
      partialize: (s) => ({ expedientes: s.expedientes }),
      migrate: (persisted) => {
        const state = persisted as { expedientes?: Record<string, unknown>[] };
        return { expedientes: (state.expedientes ?? []).map(migrateExpediente) };
      },
    },
  ),
);
