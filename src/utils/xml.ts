import type { Expediente } from '../types';
import { computeProgress } from './progress';
import { findCountryByName } from '../data/countries';
import { findPuerto } from '../data/puertos';
import { PAIS_RD, REMARK_ESTANDAR, tipoDespachoCodigo } from '../data/catalogos';
import { sigaPartyCode } from './documento';

export function escapeXml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* Tiny element builder so the exporters stay readable. */
type Attrs = object;
const ind = (n: number) => '  '.repeat(n);

function el(name: string, attrs: Attrs = {}, children: string[] | string = [], depth = 0): string {
  const a = Object.entries(attrs as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join('');
  if (typeof children === 'string') {
    return `${ind(depth)}<${name}${a}>${escapeXml(children)}</${name}>\n`;
  }
  if (children.length === 0) return `${ind(depth)}<${name}${a} />\n`;
  return `${ind(depth)}<${name}${a}>\n${children.join('')}${ind(depth)}</${name}>\n`;
}

const num = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '0.00');

/* ------------------------------------------------------------------ */
/* 1. Full application XML: every field, lossless, re-importable.       */
/* ------------------------------------------------------------------ */

export function buildFullXml(expedientes: Expediente[], now = new Date()): string {
  const body = expedientes.map((e) => {
    const d = e.declaracion;
    return el('expediente', {
      id: e.id, reference: e.reference, tipo: e.tipoExpediente, status: e.status,
      digitador: e.digitador, gestor: e.gestor, createdAt: e.createdAt, updatedAt: e.updatedAt,
    }, [
      el('declaracion', {
        idSecuencia: d.idSecuencia, noDeclaracion: d.noDeclaracion, tipoDespacho: d.tipoDespacho, eta: d.eta,
        administracionCodigo: d.administracionCodigo, administracionNombre: d.administracionNombre,
        docEmbarque: d.docEmbarque, depositoDestino: d.depositoDestino, puertoEntrada: d.puertoEntrada,
        paisProcedenciaCodigo: d.paisProcedenciaCodigo, paisProcedenciaNombre: d.paisProcedenciaNombre,
        facturaComercialNo: d.facturaComercialNo,
      }, [], 2),
      el('partes', {}, [
        el('importador', e.importador, [], 3),
        el('agenteAduanal', e.agenteAduanal, [], 3),
        el('consignatario', e.consignatario, [], 3),
        el('compradorExportacion', e.compradorExportacion, [], 3),
        el('suplidores', {}, e.suplidores.map((s) => el('suplidor', s, [], 4)), 3),
      ], 2),
      el('documentos', {}, e.documentos.map((doc) => el('documento', {
        numeroFactura: doc.numeroFactura, fechaFactura: doc.fechaFactura, codigoSuplidor: doc.codigoSuplidor, valorFactura: num(doc.valorFactura),
      }, [], 3)), 2),
      el('contenedores', { tipoCarga: e.tipoCarga }, e.contenedores.map((c) => el('contenedor', {
        tipo: c.tipo, numero: c.numero, sello1: c.sello1, sello2: c.sello2,
      }, [], 3)), 2),
      el('valores', {
        tasaCambio: num(e.valores.tasaCambio), valorFobTotal: num(e.valores.valorFobTotal), seguro: num(e.valores.seguro),
        flete: num(e.valores.flete), otros: num(e.valores.otros), valorCifTotal: num(e.valores.valorCifTotal),
      }, [], 2),
      el('regimenAduanero', e.regimenAduanero, [], 2),
      el('pesoMercancia', {
        codigoMercancia: e.pesoMercancia.codigoMercancia, pesoBrutoKg: num(e.pesoMercancia.pesoBrutoKg), pesoNetoKg: num(e.pesoMercancia.pesoNetoKg),
      }, [], 2),
      el('partidas', {}, e.partidas.map((p, i) => el('partida', {
        numero: i + 1, codigo: p.codigoPartida, descripcion: p.descripcion, organico: p.organico, cantidad: p.cantidad,
        unidad: p.unidad, paisOrigen: p.paisOrigen, valorFob: num(p.valorFob), unitario: p.unitario, facturaDva: p.facturaDva,
      }, [], 3)), 2),
      el('checklist', { progress: `${computeProgress(e.checklist)}%` }, e.checklist.map((c) => el('item', {
        label: c.label, completed: c.completed, completedAt: c.completedAt ?? undefined,
      }, [], 3)), 2),
      el('observaciones', {}, e.observaciones.map((o) => el('observacion', { fecha: o.fecha, usuario: o.usuario }, o.texto, 3)), 2),
    ], 1);
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${el('expedientes', { generado: now.toISOString(), cantidad: expedientes.length }, body, 0)}`;
}

/* ------------------------------------------------------------------ */
/* 2. DGA SIGA DUA XML.                                                 */
/*                                                                      */
/* Follows the official XSDs published by the DGA ("Archivos XSD        */
/* necesarios para trabajar en SIGA", aduanas.gob.do/de-interes/        */
/* descargas). Copies live in docs/siga-xsd/. Element order matters:    */
/* both schemas are xs:sequence, so keep the order below in sync with   */
/* ImportDUA.xsd / ExportDUA.xsd. Fields the app does not track are     */
/* emitted empty when the schema requires them, so SIGA prompts for     */
/* them on upload instead of rejecting the file for a missing element.  */
/* ------------------------------------------------------------------ */

export const SIGA_NS_IMPORT = 'http://aduanas.gob.do/XSD/ImportClearance/ImportDUA.xsd';
export const SIGA_NS_EXPORT = 'http://aduanas.gob.do/XSD/ExportClearance/ExportDUA.xsd';

/** xs:dateTime from a YYYY-MM-DD (or ISO) string; empty input falls back to `now`. */
function xsDateTime(value: string, now: Date): string {
  const d = value ? new Date(value) : now;
  if (isNaN(d.getTime())) return now.toISOString().slice(0, 19);
  return value.length <= 10 ? `${value}T00:00:00` : d.toISOString().slice(0, 19);
}

const bool = (b: boolean) => (b ? 'true' : 'false');
const countryCode = (name: string) => findCountryByName(name)?.codigo ?? '';
const portCode = (value: string) => findPuerto(value)?.codigo ?? value;

function impDeclaration(e: Expediente, now: Date): string {
  const d = e.declaracion;
  const ia = e.informacionAdicional;
  const D = 2;
  const products = e.partidas.map((p) => el('ImpDeclarationProduct', {}, [
    el('HSCode', {}, p.codigoPartida, D + 2),
    el('ProductCode', {}, p.codigoProducto, D + 2),
    el('ProductName', {}, p.descripcion, D + 2),
    el('BrandName', {}, p.marca || 'N/A', D + 2),
    el('ModelName', {}, p.modelo || 'N/A', D + 2),
    el('ProductStatusCode', {}, p.estadoProducto, D + 2),
    el('ProductYear', {}, p.anio, D + 2),
    el('FOBValue', {}, num(p.valorFob), D + 2),
    el('UnitCode', {}, p.unidad, D + 2),
    el('Qty', {}, String(p.cantidad), D + 2),
    el('QtyPresentation', {}, String(Math.round(p.cantidad)), D + 2),
    el('Weight', {}, num(p.pesoKg), D + 2),
    el('ProductSpecification', {}, p.especificacion, D + 2),
    el('TempProductYN', {}, bool(p.temporal), D + 2),
    el('CertificateOrignYN', {}, bool(p.certificadoOrigen), D + 2),
    el('CertificateOriginNo', {}, p.certificadoOrigenNo, D + 2),
    el('OriginCountry', {}, countryCode(p.paisOrigen), D + 2),
    el('OrganicYN', {}, bool(p.organico), D + 2),
    el('GradeAlcohol', {}, num(p.gradoAlcohol), D + 2),
    el('CustomerSalesPrice', {}, num(p.precioVentaMenor), D + 2),
    el('ProductSerialNo', {}, p.serial, D + 2),
    el('VehicleType', {}, p.vehiculo.tipo, D + 2),
    el('VehicleChassis', {}, p.vehiculo.chasis, D + 2),
    el('VehicleColor', {}, p.vehiculo.color, D + 2),
    el('VehicleMotor', {}, p.vehiculo.motor, D + 2),
    el('VehicleCC', {}, String(p.vehiculo.cc), D + 2),
    el('ProductDescription', {}, p.descripcionAdicional || p.descripcion, D + 2),
  ], D + 1));

  const suppliers = e.suplidores.map((s) => el('ImpDeclarationSupplier', {}, [
    el('ForeignSupplierName', {}, s.nombre, D + 2),
    el('ForeignSupplierCode', {}, sigaPartyCode({ codigo: s.codigo, tipoDocumento: s.tipoDocumento ?? 'TID', paisDocumento: countryCode(s.nacionalidad) }), D + 2),
    el('ForeignSupplierNationality', {}, countryCode(s.nacionalidad) || s.nacionalidad, D + 2),
  ], D + 1));

  const containers = e.contenedores.map((c) => el('ImpDeclarationContainer', {}, [
    el('ContainerType', {}, c.tipo, D + 2),
    el('ContainerNo', {}, c.numero, D + 2),
    el('SealNo1', {}, c.sello1, D + 2),
    el('SealNo2', {}, c.sello2, D + 2),
  ], D + 1));

  return el('ImpDeclaration', {}, [
    el('DeclarationDate', {}, xsDateTime('', now), D),
    el('ClearanceType', {}, tipoDespachoCodigo(d.tipoDespacho), D),
    el('AreaCode', {}, d.administracionCodigo, D),
    el('FormNo', {}, d.idSecuencia, D),
    el('BLNo', {}, d.docEmbarque, D),
    el('ManifestNo', {}, ia.manifiestoNo, D),
    el('ConsigneeCode', {}, sigaPartyCode(e.consignatario), D),
    el('ConsigneeName', {}, e.consignatario.nombre, D),
    el('ConsigneeNationality', {}, e.consignatario.paisDocumento || PAIS_RD, D),
    el('CargoControlNo', {}, ia.cargoControlNo, D),
    el('CommercialInvoiceNo', {}, d.facturaComercialNo, D),
    el('DestinationLocationCode', {}, d.depositoDestino, D),
    el('EntryPort', {}, portCode(d.puertoEntrada), D),
    el('DepartureCountryCode', {}, d.paisProcedenciaCodigo, D),
    el('TransportCompanyCode', {}, ia.transportistaCodigo || ia.transportistaNombre, D),
    el('TransportNationality', {}, ia.transporteNacionalidad, D),
    el('TransportMethod', {}, ia.medioTransporte, D),
    el('EntryPlanDate', {}, xsDateTime(d.eta, now), D),
    el('EntryDate', {}, xsDateTime(ia.fechaLlegadaReal || d.eta, now), D),
    el('ImporterCode', {}, sigaPartyCode(e.importador), D),
    el('ImporterName', {}, e.importador.nombre, D),
    el('ImporterNationality', {}, e.importador.paisDocumento || PAIS_RD, D),
    el('BrokerCompanyCode', {}, e.agenteAduanal.codigo, D),
    el('DeclarantCode', {}, e.agenteAduanal.codigo, D),
    el('DeclarantName', {}, e.agenteAduanal.nombre, D),
    el('DeclarantNationality', {}, PAIS_RD, D),
    el('RegimenCode', {}, e.regimenAduanero.codigo, D),
    el('AgreementCode', {}, e.regimenAduanero.acuerdo, D),
    el('TotalFOB', {}, num(e.valores.valorFobTotal), D),
    el('InsuranceValue', {}, num(e.valores.seguro), D),
    el('FreightValue', {}, num(e.valores.flete), D),
    el('OtherValue', {}, num(e.valores.otros), D),
    el('TotalCIF', {}, num(e.valores.valorCifTotal), D),
    el('TotalWeight', {}, num(e.pesoMercancia.pesoBrutoKg), D),
    el('NetWeight', {}, num(e.pesoMercancia.pesoNetoKg), D),
    el('Remark', {}, REMARK_ESTANDAR, D),
    ...suppliers,
    ...products,
    ...containers,
  ], 1);
}

function expDeclaration(e: Expediente, now: Date): string {
  const d = e.declaracion;
  const ia = e.informacionAdicional;
  const D = 2;
  const products = e.partidas.map((p) => el('ExpDeclarationProduct', {}, [
    el('HSCode', {}, p.codigoPartida, D + 2),
    el('ProductCode', {}, p.codigoProducto, D + 2),
    el('ProductName', {}, p.descripcion, D + 2),
    el('BrandName', {}, p.marca || 'N/A', D + 2),
    el('ModelName', {}, p.modelo || 'N/A', D + 2),
    el('ProductStatusCode', {}, p.estadoProducto, D + 2),
    el('ProductYear', {}, p.anio, D + 2),
    el('FOBValue', {}, num(p.valorFob), D + 2),
    el('UnitCode', {}, p.unidad, D + 2),
    el('Qty', {}, String(p.cantidad), D + 2),
    el('Weight', {}, num(p.pesoKg), D + 2),
    el('ProductSpecification', {}, p.especificacion, D + 2),
    el('TempProductYN', {}, bool(p.temporal), D + 2),
    el('CertificateOrignYN', {}, bool(p.certificadoOrigen), D + 2),
    el('CertificateOriginNo', {}, p.certificadoOrigenNo, D + 2),
    el('OriginCountry', {}, countryCode(p.paisOrigen) || PAIS_RD, D + 2),
    el('OrganicYN', {}, bool(p.organico), D + 2),
    el('GradeAlcohol', {}, num(p.gradoAlcohol), D + 2),
    el('ProductSerialNo', {}, p.serial, D + 2),
    el('ProductDescription', {}, p.descripcionAdicional || p.descripcion, D + 2),
  ], D + 1));

  const containers = e.contenedores.map((c) => el('ExpDeclarationContainer', {}, [
    el('ContainerType', {}, c.tipo, D + 2),
    el('ContainerNo', {}, c.numero, D + 2),
    el('SealNo1', {}, c.sello1, D + 2),
    el('SealNo2', {}, c.sello2, D + 2),
  ], D + 1));

  return el('ExpDeclaration', {}, [
    el('DeclarationDate', {}, xsDateTime('', now), D),
    el('ClearanceType', {}, tipoDespachoCodigo(d.tipoDespacho), D),
    el('AreaCode', {}, d.administracionCodigo, D),
    el('FormNo', {}, d.idSecuencia, D),
    el('BLNo', {}, d.docEmbarque, D),
    el('BondedArea', {}, d.depositoDestino, D),
    el('TransportCompany', {}, ia.transportistaCodigo || ia.transportistaNombre, D),
    el('TransportCompanynationality', {}, ia.transporteNacionalidad, D),
    el('TransportMethod', {}, ia.medioTransporte, D),
    el('DeparturePort', {}, portCode(d.puertoEntrada), D),
    el('DestinationCountry', {}, d.paisProcedenciaCodigo, D),
    el('VoyageNo', {}, ia.noViaje, D),
    el('ExporterCode', {}, sigaPartyCode(e.importador), D),
    el('ExporterName', {}, e.importador.nombre, D),
    el('ExporterNationality', {}, e.importador.paisDocumento || PAIS_RD, D),
    el('BuyerCode', {}, sigaPartyCode(e.compradorExportacion), D),
    el('BuyerName', {}, e.compradorExportacion.nombre, D),
    el('BuyerNationality', {}, d.paisProcedenciaCodigo, D),
    el('BrokerCompanyCode', {}, e.agenteAduanal.codigo, D),
    el('DeclarantCode', {}, e.agenteAduanal.codigo, D),
    el('DeclarantName', {}, e.agenteAduanal.nombre, D),
    el('DeclarantNationality', {}, PAIS_RD, D),
    el('RegimenCode', {}, e.regimenAduanero.codigo, D),
    el('TotalFOB', {}, num(e.valores.valorFobTotal), D),
    el('InsuranceValue', {}, num(e.valores.seguro), D),
    el('FreightValue', {}, num(e.valores.flete), D),
    el('OtherValue', {}, num(e.valores.otros), D),
    el('TotalCIF', {}, num(e.valores.valorCifTotal), D),
    el('TotalWeight', {}, num(e.pesoMercancia.pesoBrutoKg), D),
    el('NetWeight', {}, num(e.pesoMercancia.pesoNetoKg), D),
    el('Remark', {}, REMARK_ESTANDAR, D),
    ...products,
    ...containers,
  ], 1);
}

/** SIGA ImportDUA document for the given import expedientes. */
export function buildSigaImportXml(expedientes: Expediente[], now = new Date()): string {
  const decls = expedientes.map((e) => impDeclaration(e, now));
  return `<?xml version="1.0" encoding="UTF-8"?>\n${el('ImportDUA', { xmlns: SIGA_NS_IMPORT }, decls, 0)}`;
}

/** SIGA ExportDUA document for the given export expedientes. */
export function buildSigaExportXml(expedientes: Expediente[], now = new Date()): string {
  const decls = expedientes.map((e) => expDeclaration(e, now));
  return `<?xml version="1.0" encoding="UTF-8"?>\n${el('ExportDUA', { xmlns: SIGA_NS_EXPORT }, decls, 0)}`;
}

/**
 * Convenience: one SIGA file per tipo. SIGA has separate schemas for import and export,
 * so a mixed selection yields up to two documents.
 */
export function buildSigaXmlFiles(expedientes: Expediente[], now = new Date()): { tipo: 'importacion' | 'exportacion'; xml: string; count: number }[] {
  const imports = expedientes.filter((e) => e.tipoExpediente === 'importacion');
  const exports = expedientes.filter((e) => e.tipoExpediente === 'exportacion');
  const out: { tipo: 'importacion' | 'exportacion'; xml: string; count: number }[] = [];
  if (imports.length) out.push({ tipo: 'importacion', xml: buildSigaImportXml(imports, now), count: imports.length });
  if (exports.length) out.push({ tipo: 'exportacion', xml: buildSigaExportXml(exports, now), count: exports.length });
  return out;
}

/* ------------------------------------------------------------------ */

export function downloadTextFile(content: string, fileName: string, mime = 'application/xml') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
