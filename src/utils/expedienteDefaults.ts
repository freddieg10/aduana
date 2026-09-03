import { ExpedienteStatus } from '../types';
import type { Expediente, ExpedienteFormData, TipoExpediente } from '../types';
import { AGENTE_ADUANAL_DEFAULT, TASA_CAMBIO_DEFAULT } from '../data/catalogos';

/** A blank form for a new expediente of the given type. */
export const emptyFormData = (tipoExpediente: TipoExpediente): ExpedienteFormData => ({
  reference: '',
  tipoExpediente,
  status: ExpedienteStatus.Registrado,
  declaracion: {
    idSecuencia: '', eta: '', tipoDespacho: '', administracionCodigo: '', administracionNombre: '',
    noDeclaracion: '', docEmbarque: '', depositoDestino: '', puertoEntrada: '',
    paisProcedenciaCodigo: '', paisProcedenciaNombre: '', facturaComercialNo: '',
  },
  importador: { codigo: '', nombre: '' },
  agenteAduanal: { ...AGENTE_ADUANAL_DEFAULT },
  consignatario: { codigo: '', nombre: '' },
  compradorExportacion: { codigo: '0', nombre: '' },
  suplidores: [],
  documentos: [],
  contenedores: [],
  tipoCarga: 'contenedores',
  valores: { tasaCambio: TASA_CAMBIO_DEFAULT, valorFobTotal: 0, seguro: 0, flete: 0, otros: 0, valorCifTotal: 0 },
  regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
  pesoMercancia: { codigoMercancia: '', pesoBrutoKg: 0, pesoNetoKg: 0 },
  partidas: [],
  digitador: '',
  gestor: '',
});

/** The editable subset of a stored expediente, for seeding the detail form. */
export const toFormData = (e: Expediente): ExpedienteFormData => ({
  reference: e.reference,
  tipoExpediente: e.tipoExpediente,
  status: e.status,
  declaracion: e.declaracion,
  importador: e.importador,
  agenteAduanal: e.agenteAduanal,
  consignatario: e.consignatario,
  compradorExportacion: e.compradorExportacion,
  suplidores: e.suplidores,
  documentos: e.documentos,
  contenedores: e.contenedores,
  tipoCarga: e.tipoCarga,
  valores: e.valores,
  regimenAduanero: e.regimenAduanero,
  pesoMercancia: e.pesoMercancia,
  partidas: e.partidas,
  digitador: e.digitador,
  gestor: e.gestor,
});
