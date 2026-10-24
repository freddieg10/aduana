import type { Expediente, Partida } from '../types';
import { computeProgress } from './progress';
import { findCountryByName } from '../data/countries';
import { findPuerto } from '../data/puertos';
import { PAIS_RD, REMARK_ESTANDAR, tipoDespachoCodigo, unidadSiga } from '../data/catalogos';
import { sigaPartyCode } from './documento';
import { normalizarHs } from './preliquidacion';

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

/*
 * What SIGA actually accepts, taken from a DUA it loaded without errors
 * (docs/siga-muestras/ImportDUA-WH26070084A.xml) where it differs from a literal reading of
 * the XSD:
 *  - the schema has no elementFormDefault, so everything below the root is unqualified: the
 *    declaration carries xmlns="" or SIGA's DataSet finds no columns at all;
 *  - party codes (consignee, importer, declarant) are [type][country][number]: SIGA slices
 *    them, and a short one ("1") throws "Index and length must refer to a location within
 *    the string" before anything else is read;
 *  - FOBValue is the UNIT price (FOBValue × Qty adds up to TotalFOB), UnitCode is the numeric
 *    SIGA code, HSCode has no dots;
 *  - unknown dates are 1900-01-01T12:00:00, unknown brand/model codes 0 with name NA, and a
 *    product without a registered code is declared temporary with its line number as code;
 *  - each product repeats its description in a Remark the published XSD does not list.
 */
const SIN_FECHA = '1900-01-01T12:00:00';

/** xs:dateTime at midnight for a YYYY-MM-DD; empty means unknown. */
const fechaSiga = (ymd: string) => (/^\d{4}-\d{2}-\d{2}/.test(ymd) ? `${ymd.slice(0, 10)}T00:00:00` : SIN_FECHA);

/** Today's date (local, not UTC) at midnight, as SIGA dates its declarations. */
const hoySiga = (now: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T00:00:00`;
};

const bool = (b: boolean) => (b ? 'true' : 'false');
const countryCode = (name: string) => findCountryByName(name)?.codigo ?? '';
const portCode = (value: string) => findPuerto(value)?.codigo ?? value;
/** SQL Server `money` columns take four decimals. */
const money = (n: number) => (Number.isFinite(n) ? n.toFixed(4) : '0.0000');
const entero = (v: string | number) => String(Math.round(Number(String(v).replace(/[^\d.-]/g, '')) || 0));

/** The declarant is the agente aduanal, read by SIGA as a party code like any other. */
const declarante = (e: Expediente) => ({
  codigo: sigaPartyCode({ codigo: e.agenteAduanal.codigo, tipoDocumento: e.agenteAduanal.tipoDocumento ?? 'RNC', paisDocumento: e.agenteAduanal.paisDocumento }),
  nacionalidad: e.agenteAduanal.paisDocumento || PAIS_RD,
});

/** The product block both DUAs share, element for element. */
function producto(p: Partida, i: number, D: number, impo: boolean): string[] {
  const codigo = p.codigoProducto.trim();
  return [
    el('HSCode', {}, normalizarHs(p.codigoPartida), D),
    el('ProductCode', {}, codigo || String(i + 1), D),
    el('ProductName', {}, p.descripcion, D),
    el('BrandCode', {}, '0', D),
    el('BrandName', {}, p.marca.trim() || 'NA', D),
    el('ModelCode', {}, '0', D),
    el('ModelName', {}, p.modelo.trim() || 'NA', D),
    el('ProductStatusCode', {}, p.estadoProducto, D),
    el('ProductYear', {}, entero(p.anio), D),
    el('FOBValue', {}, money(p.cantidad > 0 ? p.valorFob / p.cantidad : p.valorFob), D),
    el('UnitCode', {}, unidadSiga(p.unidad), D),
    el('Qty', {}, money(p.cantidad), D),
    el('Weight', {}, num(p.pesoKg), D),
    el('ProductSpecification', {}, p.especificacion, D),
    el('TempProductYN', {}, bool(p.temporal || !codigo), D),
    el('CertificateOrignYN', {}, bool(p.certificadoOrigen), D),
    el('CertificateOriginNo', {}, p.certificadoOrigenNo, D),
    el('OriginCountry', {}, countryCode(p.paisOrigen) || (impo ? '' : PAIS_RD), D),
    el('OrganicYN', {}, bool(p.organico), D),
    el('GradeAlcohol', {}, num(p.gradoAlcohol), D),
    el('CustomerSalesPrice', {}, money(p.precioVentaMenor), D),
    el('ProductSerialNo', {}, p.serial, D),
    el('VehicleType', {}, p.vehiculo.tipo, D),
    el('VehicleChassis', {}, p.vehiculo.chasis, D),
    el('VehicleColor', {}, p.vehiculo.color, D),
    el('VehicleMotor', {}, p.vehiculo.motor, D),
    el('VehicleCC', {}, entero(p.vehiculo.cc), D),
    el('ProductDescription', {}, p.descripcionAdicional || p.descripcion, D),
    el('Remark', {}, p.descripcion, D),
  ];
}

const contenedor = (c: Expediente['contenedores'][number], D: number) => [
  el('ContainerType', {}, c.tipo, D),
  el('ContainerNo', {}, c.numero, D),
  el('SealNo1', {}, c.sello1, D),
  el('SealNo2', {}, c.sello2, D),
  el('ContainerPlate', {}, '', D),
];

function impDeclaration(e: Expediente, now: Date): string {
  const d = e.declaracion;
  const ia = e.informacionAdicional;
  const D = 2;
  const decl = declarante(e);

  const suppliers = e.suplidores.map((s) => el('ImpDeclarationSupplier', {}, [
    el('ForeignSupplierName', {}, s.nombre, D + 2),
    el('ForeignSupplierCode', {}, sigaPartyCode({ codigo: s.codigo, tipoDocumento: s.tipoDocumento ?? 'TID', paisDocumento: countryCode(s.nacionalidad) }), D + 2),
    el('ForeignSupplierNationality', {}, countryCode(s.nacionalidad) || s.nacionalidad, D + 2),
  ], D + 1));
  const products = e.partidas.map((p, i) => el('ImpDeclarationProduct', {}, producto(p, i, D + 2, true), D + 1));
  const containers = e.contenedores.map((c) => el('ImpDeclarationContainer', {}, contenedor(c, D + 2), D + 1));

  return el('ImpDeclaration', { xmlns: '' }, [
    el('DeclarationDate', {}, hoySiga(now), D),
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
    el('TransportCompanyCode', {}, ia.transportistaCodigo, D),
    el('TransportNationality', {}, ia.transporteNacionalidad, D),
    // SIGA's transport-method codes are not published; the app's labels are not codes.
    el('TransportMethod', {}, '', D),
    el('EntryPlanDate', {}, fechaSiga(d.eta), D),
    el('EntryDate', {}, fechaSiga(ia.fechaLlegadaReal), D),
    el('ImporterCode', {}, sigaPartyCode(e.importador), D),
    el('ImporterName', {}, e.importador.nombre, D),
    el('ImporterNationality', {}, e.importador.paisDocumento || PAIS_RD, D),
    el('BrokerEmployeeCode', {}, '', D),
    el('BrokerCompanyCode', {}, '', D),
    el('DeclarantCode', {}, decl.codigo, D),
    el('DeclarantName', {}, e.agenteAduanal.nombre, D),
    el('DeclarantNationality', {}, decl.nacionalidad, D),
    el('RegimenCode', {}, e.regimenAduanero.codigo, D),
    el('AgreementCode', {}, e.regimenAduanero.acuerdo, D),
    el('TotalFOB', {}, money(e.valores.valorFobTotal), D),
    el('InsuranceValue', {}, money(e.valores.seguro), D),
    el('FreightValue', {}, money(e.valores.flete), D),
    el('OtherValue', {}, money(e.valores.otros), D),
    el('TotalCIF', {}, money(e.valores.valorCifTotal), D),
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
  const decl = declarante(e);
  const products = e.partidas.map((p, i) => el('ExpDeclarationProduct', {}, producto(p, i, D + 2, false), D + 1));
  const containers = e.contenedores.map((c) => el('ExpDeclarationContainer', {}, contenedor(c, D + 2), D + 1));

  return el('ExpDeclaration', { xmlns: '' }, [
    el('DeclarationDate', {}, hoySiga(now), D),
    el('ClearanceType', {}, tipoDespachoCodigo(d.tipoDespacho), D),
    el('AreaCode', {}, d.administracionCodigo, D),
    el('FormNo', {}, d.idSecuencia, D),
    el('BLNo', {}, d.docEmbarque, D),
    el('BondedArea', {}, d.depositoDestino, D),
    el('TransportCompany', {}, ia.transportistaCodigo, D),
    el('TransportCompanynationality', {}, ia.transporteNacionalidad, D),
    el('TransportMethod', {}, '', D),
    el('DeparturePort', {}, portCode(d.puertoEntrada), D),
    el('DestinationCountry', {}, d.paisProcedenciaCodigo, D),
    el('VoyageNo', {}, ia.noViaje, D),
    el('ExporterCode', {}, sigaPartyCode(e.importador), D),
    el('ExporterName', {}, e.importador.nombre, D),
    el('ExporterNationality', {}, e.importador.paisDocumento || PAIS_RD, D),
    el('BuyerCode', {}, sigaPartyCode(e.compradorExportacion), D),
    el('BuyerName', {}, e.compradorExportacion.nombre, D),
    el('BuyerNationality', {}, d.paisProcedenciaCodigo, D),
    el('BrokerCompanyCode', {}, '', D),
    el('BrokerEmployeeCode', {}, '', D),
    el('DeclarantCode', {}, decl.codigo, D),
    el('DeclarantName', {}, e.agenteAduanal.nombre, D),
    el('DeclarantNationality', {}, decl.nacionalidad, D),
    el('RegimenCode', {}, e.regimenAduanero.codigo, D),
    el('TotalFOB', {}, money(e.valores.valorFobTotal), D),
    el('InsuranceValue', {}, money(e.valores.seguro), D),
    el('FreightValue', {}, money(e.valores.flete), D),
    el('OtherValue', {}, money(e.valores.otros), D),
    el('TotalCIF', {}, money(e.valores.valorCifTotal), D),
    el('TotalWeight', {}, num(e.pesoMercancia.pesoBrutoKg), D),
    el('NetWeight', {}, num(e.pesoMercancia.pesoNetoKg), D),
    el('Remark', {}, REMARK_ESTANDAR, D),
    ...products,
    ...containers,
  ], 1);
}

/** The root as SIGA's own exports write it: XML Schema namespaces declared, target as default. */
const raiz = (ns: string) => ({ 'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema', 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance', xmlns: ns });

/** SIGA ImportDUA document for the given import expedientes. */
export function buildSigaImportXml(expedientes: Expediente[], now = new Date()): string {
  const decls = expedientes.map((e) => impDeclaration(e, now));
  return `<?xml version="1.0" encoding="UTF-8"?>\n${el('ImportDUA', raiz(SIGA_NS_IMPORT), decls, 0)}`;
}

/** SIGA ExportDUA document for the given export expedientes. */
export function buildSigaExportXml(expedientes: Expediente[], now = new Date()): string {
  const decls = expedientes.map((e) => expDeclaration(e, now));
  return `<?xml version="1.0" encoding="UTF-8"?>\n${el('ExportDUA', raiz(SIGA_NS_EXPORT), decls, 0)}`;
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
