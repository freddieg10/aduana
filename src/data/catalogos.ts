/**
 * Option lists shared by the expediente form, importers and exporters.
 *
 * ADMINISTRACIONES and REGIMENES_* are the SIGA catalog tables ("Área / Nombre de Área" and
 * "Código de Régimen / Nombre de Régimen", supplied 2026-09-03; see KNOWLEDGE.md §6). The
 * administración code is the SIGA `AreaCode` and is also the first segment of every
 * declaration number (10030-IC01-2310-0047D5 = area 10030).
 */

import type { TipoDocumento, TipoEntidad, TipoEntidadSuplidor } from '../types';

export interface Administracion {
  codigo: string;
  nombre: string;
  /** true when the code comes from the SIGA area table. */
  verificado: boolean;
  tipo: 'puerto' | 'aeropuerto' | 'frontera' | 'oficina';
}

export const ADMINISTRACIONES: Administracion[] = [
  // --- Sede ---
  { codigo: '10000', nombre: 'DIRECCION GENERAL DE ADUANAS', verificado: true, tipo: 'oficina' },
  // --- Puertos ---
  { codigo: '10010', nombre: 'ADMINISTRACION SANTO DOMINGO', verificado: true, tipo: 'puerto' },
  { codigo: '10020', nombre: 'ADMINISTRACION HAINA OCCIDENTAL', verificado: true, tipo: 'puerto' },
  { codigo: '10030', nombre: 'ADMINISTRACION HAINA ORIENTAL', verificado: true, tipo: 'puerto' },
  { codigo: '10040', nombre: 'ADMINISTRACION BOCA CHICA', verificado: true, tipo: 'puerto' },
  { codigo: '10050', nombre: 'ADMINISTRACION SAN PEDRO DE MACORIS', verificado: true, tipo: 'puerto' },
  { codigo: '10060', nombre: 'ADMINISTRACION LA ROMANA', verificado: true, tipo: 'puerto' },
  { codigo: '10070', nombre: 'ADMINISTRACION PUERTO PLATA', verificado: true, tipo: 'puerto' },
  { codigo: '10080', nombre: 'ADMINISTRACION AZUA', verificado: true, tipo: 'puerto' },
  { codigo: '10090', nombre: 'ADMINISTRACION BARAHONA', verificado: true, tipo: 'puerto' },
  { codigo: '10100', nombre: 'ADMINISTRACION CABO ROJO', verificado: true, tipo: 'puerto' },
  { codigo: '10110', nombre: 'ADMINISTRACION MANZANILLO', verificado: true, tipo: 'puerto' },
  { codigo: '10120', nombre: 'ADMINISTRACION SAMANA', verificado: true, tipo: 'puerto' },
  { codigo: '10130', nombre: 'ADMINISTRACION SANCHEZ', verificado: true, tipo: 'puerto' },
  { codigo: '10140', nombre: 'ADMINISTRACION PEDERNALES', verificado: true, tipo: 'puerto' },
  { codigo: '10150', nombre: 'ADMINISTRACION PUERTO MULTIMODAL CAUCEDO', verificado: true, tipo: 'puerto' },
  { codigo: '10160', nombre: 'ADMINISTRACION PUERTO LA CANA', verificado: true, tipo: 'puerto' },
  { codigo: '00406', nombre: 'ADMINISTRACION ARROYO BARRIL', verificado: true, tipo: 'puerto' },
  // --- Aeropuertos ---
  { codigo: '20010', nombre: 'AEROPUERTO INTERNACIONAL GREGORIO LUPERON PUERTO PLATA', verificado: true, tipo: 'aeropuerto' },
  { codigo: '20020', nombre: 'AEROPUERTO INTERNACIONAL LICEY', verificado: true, tipo: 'aeropuerto' },
  { codigo: '20030', nombre: 'AEROPUERTO DR. JOAQUIN BALAGUER', verificado: true, tipo: 'aeropuerto' },
  { codigo: '20040', nombre: 'AEROPUERTO PUNTA CANA', verificado: true, tipo: 'aeropuerto' },
  { codigo: '20050', nombre: 'AEROPUERTO INTERNACIONAL JOSE FRANCISCO PEÑA GOMEZ', verificado: true, tipo: 'aeropuerto' },
  { codigo: '20051', nombre: 'ADMINISTRACION AEROPORTUARIA AILA PASAJEROS', verificado: true, tipo: 'aeropuerto' },
  { codigo: '20060', nombre: 'AEROPUERTO MARIA MONTES', verificado: true, tipo: 'aeropuerto' },
  { codigo: '20070', nombre: 'AEROPUERTO INTERNACIONAL LA ROMANA', verificado: true, tipo: 'aeropuerto' },
  { codigo: '20080', nombre: 'AEROPUERTO JUAN BOSCH (EL CATEY)', verificado: true, tipo: 'aeropuerto' },
  { codigo: '00428', nombre: 'AEROPUERTO ARROYO BARRIL', verificado: true, tipo: 'aeropuerto' },
  { codigo: '01197', nombre: 'AEROPUERTO PUNTA CANA TERMINAL DE PASAJEROS', verificado: true, tipo: 'aeropuerto' },
  // --- Fronterizas ---
  { codigo: '30010', nombre: 'ADMINISTRACION ELIAS PIÑA', verificado: true, tipo: 'frontera' },
  { codigo: '30020', nombre: 'ADMINISTRACION DAJABON', verificado: true, tipo: 'frontera' },
  { codigo: '30030', nombre: 'ADMINISTRACION JIMANI', verificado: true, tipo: 'frontera' },
  { codigo: '00447', nombre: 'OFICINA SATELITE LA DESCUBIERTA', verificado: true, tipo: 'oficina' },
];

export const findAdministracion = (codigo: string) =>
  ADMINISTRACIONES.find((a) => a.codigo === codigo);

/**
 * Clearance types (SIGA "ClearanceType"). The IC38 codes are SIGA's import list; CENTRO
 * LOGISTICO and COMPRA LOCAL Z.F appear in the dropdown but are not in that table, so they
 * carry no code yet. The app stores the label; the XML emits the code when one is known.
 */
export interface TipoDespacho {
  codigo: string;
  nombre: string;
}

export const TIPOS_DESPACHO: TipoDespacho[] = [
  { codigo: 'IC38-001', nombre: 'GENERAL' },
  { codigo: 'IC38-002', nombre: 'NO MANIFIESTO' },
  { codigo: 'IC38-003', nombre: 'ENTREGA PROVISIONAL' },
  { codigo: 'IC38-004', nombre: 'VENTA AL MERCADO LOCAL' },
  { codigo: '', nombre: 'CENTRO LOGISTICO' },
  { codigo: '', nombre: 'COMPRA LOCAL Z.F' },
];

export const TIPOS_DESPACHO_LABELS = TIPOS_DESPACHO.map((t) => t.nombre);

/** SIGA code for a stored clearance-type label, falling back to the label itself. */
export const tipoDespachoCodigo = (nombre: string) =>
  TIPOS_DESPACHO.find((t) => t.nombre === nombre)?.codigo || nombre;

/** Product condition (SIGA "ProductStatusCode", IC04 table). */
export interface EstadoProducto {
  codigo: string;
  nombre: string;
}

export const ESTADOS_PRODUCTO: EstadoProducto[] = [
  { codigo: 'IC04-001', nombre: 'NUEVO' },
  { codigo: 'IC04-002', nombre: 'USADO' },
  { codigo: 'IC04-003', nombre: 'DESMANTELAR' },
  { codigo: 'IC04-004', nombre: 'DESMONTAR' },
  { codigo: 'IC04-005', nombre: 'IRREGULAR' },
  { codigo: 'IC04-006', nombre: 'ROTO' },
  { codigo: 'IC04-007', nombre: 'OTROS' },
  { codigo: 'IC04-008', nombre: 'AHOGADO' },
  { codigo: 'IC04-009', nombre: 'RECONSTRUIDO' },
  { codigo: 'IC04-010', nombre: 'SALVAMENTO' },
  { codigo: 'IC04-011', nombre: 'PERDIDA TOTAL' },
];

export const ESTADO_PRODUCTO_DEFAULT = 'IC04-001';
export const findEstadoProducto = (codigo: string) => ESTADOS_PRODUCTO.find((e) => e.codigo === codigo);

/**
 * Trade agreements (SIGA "AgreementCode"); `descripcion` is the DGA's leyes referenciales text.
 */
export interface Acuerdo {
  codigo: string;
  nombre: string;
  descripcion: string;
}

export const ACUERDOS: Acuerdo[] = [
  { codigo: '1', nombre: 'DR-CAFTA', descripcion: 'Tratado de Libre Comercio entre Estados Unidos, Centroamérica y Rep. Dom.' },
  { codigo: '2', nombre: 'SGP', descripcion: 'Sistema Generalizado de Preferencias' },
  { codigo: '3', nombre: 'EPA', descripcion: 'Acuerdo de Asociación Comercial entre la Unión Europea y el grupo de países de África, Caribe y Pacífico (ACP)' },
  { codigo: '4', nombre: 'TLCENTROAMERICA', descripcion: 'Tratado de Libre Comercio de Centroamérica' },
  { codigo: '5', nombre: 'TLCARICOM', descripcion: 'Tratado de Libre Comercio entre la Rep. Dominicana y el Caribe' },
  { codigo: '6', nombre: 'AAPP', descripcion: 'Acuerdo de Alcance Parcial con Panamá' },
  { codigo: '7', nombre: 'CBPA', descripcion: 'Acuerdo de cooperación para la cuenca del Caribe' },
  { codigo: 'EPA - RU', nombre: 'AAE Cariforum - Reino Unido', descripcion: 'Acuerdo de Asociación Económica entre el Cariforum y el Reino Unido' },
  { codigo: 'RD-PAN', nombre: 'Rep. Dom-Panamá', descripcion: 'Tratado comercial entre la República Dominicana y la República de Panamá (AAPP)' },
];

export const findAcuerdo = (codigo: string) => ACUERDOS.find((a) => a.codigo === codigo);

/** Boilerplate the brokerage puts in every declaration's Remark. */
export const REMARK_ESTANDAR = 'DECLARAMOS EN BASE A LA INFORMACIÓN PROPORCIONADA POR EL CLIENTE';

/** SIGA "Tipo" of a registered supplier. */
export const TIPOS_ENTIDAD_SUPLIDOR: TipoEntidadSuplidor[] = [
  'Persona',
  'Empresa Proveedora Exterior',
  'Empresa Exportadora',
];

/**
 * Values used before the real SIGA list was known. `migrateExpediente` rewrites them:
 * a "manifested" declaration is SIGA's plain GENERAL despacho.
 */
export const TIPO_DESPACHO_LEGACY: Record<string, string> = {
  MANIFIESTO: 'GENERAL',
  ANTICIPADO: 'NO MANIFIESTO',
  URGENTE: 'GENERAL',
  EXPRESO: 'GENERAL',
};

/** SIGA "Tipo" of a registered party, in the order SIGA lists them. */
export const TIPOS_ENTIDAD: TipoEntidad[] = [
  'Persona',
  'Empresa Importadora',
  'Empresa de Admisión Temporal',
  'Empresa Industrial',
  'Empresa Comercial',
  'Empresa de Tiendas Z.F.',
  'Organización Externa',
  'Empresa de Especial a Z.F.',
  'ExpressCompany',
  'Empresa Compradora',
  'Empresa Logística',
];

/** SIGA "Documento" types. CED and RNC are Dominican; PAS and TID are foreign parties. */
export const TIPOS_DOCUMENTO: TipoDocumento[] = ['CED', 'PAS', 'RNC', 'TID'];

export interface Regimen {
  codigo: string;
  nombre: string;
}

/** SIGA import regimes (Código de Régimen). */
export const REGIMENES_IMPORTACION: Regimen[] = [
  { codigo: '1', nombre: 'DESPACHO A CONSUMO' },
  { codigo: '2', nombre: 'ADMISION TEMPORAL' },
  { codigo: '3', nombre: 'ADMISIÓN TEMPORAL SIN TRANSFORMACIÓN' },
  { codigo: '4', nombre: 'DEPOSITO LOGISTICO' },
  { codigo: '6', nombre: 'DEPOSITO FISCAL' },
  { codigo: '7', nombre: 'DEPOSITO DE REEXPORTACION' },
  { codigo: '10', nombre: 'ZONA FRANCA COMERCIAL' },
  { codigo: '11', nombre: 'ZONAS FRANCAS INDUSTRIAL Y ESPECIALES' },
  { codigo: '14', nombre: 'REIMPORTACION' },
  { codigo: '15', nombre: 'DEPOSITO PARTICULAR' },
];

/** SIGA export regimes (Código de Régimen). */
export const REGIMENES_EXPORTACION: Regimen[] = [
  { codigo: '16', nombre: 'EXPORTACION NACIONAL' },
  { codigo: '2', nombre: 'ADMISION TEMPORAL' },
  { codigo: '4', nombre: 'DEPOSITO LOGISTICO' },
  { codigo: '5', nombre: 'SALIDA TEMPORAL' },
  { codigo: '11', nombre: 'ZONAS FRANCAS INDUSTRIAL Y ESPECIALES' },
  { codigo: '17', nombre: 'REEMBAQUE' },
  { codigo: '20', nombre: 'CONSUMO DE REEXPORTACION' },
];

/** Every regime known to either list, de-duplicated by code (for lookups and imports). */
export const REGIMENES: Regimen[] = [...REGIMENES_IMPORTACION, ...REGIMENES_EXPORTACION]
  .filter((r, i, all) => all.findIndex((x) => x.codigo === r.codigo) === i);

export const regimenesFor = (tipo: 'importacion' | 'exportacion') =>
  tipo === 'exportacion' ? REGIMENES_EXPORTACION : REGIMENES_IMPORTACION;

export const findRegimen = (codigo: string) => REGIMENES.find((r) => r.codigo === codigo);

/** Transport methods (SIGA TransportMethod). SIGA's own codes are not published. */
export const MEDIOS_TRANSPORTE = ['MARITIMO', 'AEREO', 'TERRESTRE', 'MULTIMODAL'];

export const UNIDADES = ['KILOGRAMOS', 'UNIDADES', 'LITROS', 'METROS', 'PARES', 'DOCENAS', 'TONELADAS'];

/** The brokerage itself; default agente aduanal on every new expediente. */
export const AGENTE_ADUANAL_DEFAULT = { codigo: '1', nombre: 'ARMESSAG, SRL' };

/** Default RD$ per USD used when a new expediente is created. */
export const TASA_CAMBIO_DEFAULT = 65;

/** ISO 3166-1 numeric code for the Dominican Republic (used as default nationality). */
export const PAIS_RD = '214';

export const DEFAULT_CHECKLIST_LABELS = [
  'Documentos de importación recibidos',
  'Factura comercial verificada',
  'BL / Doc. Embarque recibido y revisado',
  'Clasificación arancelaria asignada',
  'Permisos y certificados verificados',
  'Declaración aduanera generada',
  'Pago de impuestos realizado',
  'Despacho aduanal completado',
];

export const makeDefaultChecklist = () =>
  DEFAULT_CHECKLIST_LABELS.map((label) => ({
    id: crypto.randomUUID(),
    label,
    completed: false,
    completedAt: null,
  }));

/** Staff who can be assigned to an expediente. */
export const DIGITADORES = ['Ana García', 'Luis Pérez', 'María López', 'Carlos Ruiz'];
export const GESTORES = ['Pedro Martínez', 'Sofía Castro', 'Juan Torres', 'Elena Vega'];
