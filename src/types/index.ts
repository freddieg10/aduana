export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
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

export interface EntidadAduanal {
  codigo: string;
  nombre: string;
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

// --- Partidas (Line items / tariff lines) ---

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

export type ExpedienteStatus = 'pending' | 'in-progress' | 'completed' | 'alert';

export interface Expediente {
  id: string;
  reference: string;
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

  notes: string;
  assignedUserId: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'agent' | 'client';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error';
  expedienteId: string;
  message: string;
  read: boolean;
  createdAt: string;
}
