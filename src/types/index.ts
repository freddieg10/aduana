export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
}

// --- Observaciones (timeline entries) ---

export interface Observacion {
  id: string;
  fecha: string;   // ISO datetime
  usuario: string;
  texto: string;
}

// --- Declaración (Declaration header) ---

export interface Declaracion {
  idSecuencia: string;
  eta: string;
  tipoDespacho: string;
  administracionCodigo: string;
  administracionNombre: string;
  noDeclaracion: string;
  docEmbarque: string;
  depositoDestino: string;
  puertoEntrada: string;
  paisProcedenciaCodigo: string;
  paisProcedenciaNombre: string;
  facturaComercialNo: string;
}

// --- Parties involved ---

/** SIGA "Documento" types. Together with the number they identify a party. */
export type TipoDocumento = 'CED' | 'PAS' | 'RNC' | 'TID';

/** SIGA "Tipo" of a registered party. */
export type TipoEntidad =
  | 'Persona'
  | 'Empresa Importadora'
  | 'Empresa de Admisión Temporal'
  | 'Empresa Industrial'
  | 'Empresa Comercial'
  | 'Empresa de Tiendas Z.F.'
  | 'Organización Externa'
  | 'Empresa de Especial a Z.F.'
  | 'ExpressCompany'
  | 'Empresa Compradora'
  | 'Empresa Logística';

/**
 * A party on a declaration. `codigo` is the SIGA "Documento" number; `tipoDocumento` says
 * which kind it is. SIGA composes its party codes as [RNC|PAS|TID][country][number] or
 * [CED][number] — see `sigaPartyCode`. Both extra fields are optional because records
 * created before they existed are treated as Dominican RNCs.
 */
export interface EntidadAduanal {
  codigo: string;
  nombre: string;
  tipoDocumento?: TipoDocumento;
  /** ISO 3166-1 numeric country that issued the document. */
  paisDocumento?: string;
}

export interface Suplidor {
  codigo: string;
  nombre: string;
  nacionalidad: string;
}

// --- Documents (Listado de Documentos) ---

export interface DocumentoFactura {
  id: string;
  numeroFactura: string;
  fechaFactura: string;
  codigoSuplidor: string;
  valorFactura: number;
}

// --- Containers ---

export type TipoCarga = 'contenedores' | 'carga_suelta';

export interface Contenedor {
  id: string;
  tipo: string;
  numero: string;
  sello1: string;
  sello2: string;
}

// --- Values (CIF/FOB) ---

export interface Valores {
  tasaCambio: number;
  valorFobTotal: number;
  seguro: number;
  flete: number;
  otros: number;
  valorCifTotal: number;
}

// --- Customs Regime ---

export interface RegimenAduanero {
  codigo: string;
  nombre: string;
  acuerdo: string;
}

// --- Weight ---

export interface PesoMercancia {
  codigoMercancia: string;
  pesoBrutoKg: number;
  pesoNetoKg: number;
}

// --- Partidas (Line items / tariff lines) — "Renglones" in the UI ---

export interface Partida {
  id: string;
  codigoPartida: string;
  descripcion: string;
  organico: boolean;
  cantidad: number;
  unidad: string;
  paisOrigen: string;
  valorFob: number;
  unitario: number;
  facturaDva: string;
}

// --- Main Expediente ---

export const ExpedienteStatus = {
  Registrado:          'registrado',
  Manifestado:         'manifestado',
  PendienteInfo:       'pendiente_info',
  PreLiquidado:        'pre_liquidado',
  Presentado:          'presentado',
  ProcesoVerificacion: 'proceso_verificacion',
  Verificado:          'verificado',
  Despacho:            'despacho',
  Completo:            'completo',
} as const;

export type ExpedienteStatus = typeof ExpedienteStatus[keyof typeof ExpedienteStatus];

export type TipoExpediente = 'importacion' | 'exportacion';

export interface Expediente {
  id: string;
  reference: string;
  tipoExpediente: TipoExpediente;
  status: ExpedienteStatus;
  checklist: ChecklistItem[];

  // Declaración
  declaracion: Declaracion;

  // Parties
  importador: EntidadAduanal;
  agenteAduanal: EntidadAduanal;
  consignatario: EntidadAduanal;
  compradorExportacion: EntidadAduanal;
  suplidores: Suplidor[];

  // Documents
  documentos: DocumentoFactura[];

  // Containers
  contenedores: Contenedor[];
  tipoCarga: TipoCarga;

  // Values
  valores: Valores;

  // Customs regime
  regimenAduanero: RegimenAduanero;

  // Weight
  pesoMercancia: PesoMercancia;

  // Line items
  partidas: Partida[];

  // Staff assignment
  digitador: string;
  gestor: string;

  observaciones: Observacion[];
  assignedUserId: string;
  createdAt: string;
  updatedAt: string;
}

/** Everything the user edits in the create/detail form. */
export type ExpedienteFormData = Omit<
  Expediente,
  'id' | 'createdAt' | 'updatedAt' | 'checklist' | 'observaciones' | 'assignedUserId'
>;

// --- Relacionados (master data) ---

/**
 * A client / importer, mirroring SIGA's "Buscar Información de Importador" form.
 * The business key is the pair (`tipoDocumento`, `documento`) — see `clienteKey`. It is
 * dynamic: the same company may be identified by RNC, a person by CED, a foreign party by
 * PAS or TID. `id` is an internal row id only; never show it or match on it.
 * Required in SIGA (marked with *): tipo, documento, nombre, país de origen.
 */
export interface Cliente {
  id: string;
  tipo: TipoEntidad;
  tipoDocumento: TipoDocumento;
  documento: string;
  nombre: string;
  email: string;
  calle: string;
  ciudad: string;
  telefono: string;
  zona: string;
  fax: string;
  /** País de Origen — ISO 3166-1 numeric code. */
  pais: string;
}

export interface SuplidorMaestro {
  id: string;
  codigo: string;
  nombre: string;
  tid: string;
  direccion: string;
  telefono: string;
  fax: string;
  pais: string;       // ISO 3166-1 numeric code
}

// --- Users / notifications ---

export type UserRole = 'admin' | 'agent' | 'client';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  /** For client users: the `clienteKey` ("RNC:101000011") whose expedientes they may see. */
  clienteKey?: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error';
  expedienteId: string;
  message: string;
  read: boolean;
  createdAt: string;
}
