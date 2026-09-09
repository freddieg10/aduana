import * as XLSX from 'xlsx';
import { ExpedienteStatus } from '../types';
import type { Partida, TipoDocumento, TipoExpediente } from '../types';
import { emptyInformacionAdicional, type NewExpediente } from '../store/expedientesStore';
import {
  ADMINISTRACIONES, AGENTE_ADUANAL_DEFAULT, ESTADOS_PRODUCTO, PAIS_RD, TASA_CAMBIO_DEFAULT, TIPOS_DOCUMENTO, makeDefaultChecklist,
  findAdministracion, findRegimen,
} from '../data/catalogos';
import { TIPO_DOCUMENTO_DEFAULT } from './documento';
import { emptyPartida, withDerived } from './partida';
import { findCountryByCode, findCountryByName } from '../data/countries';
import { parseLegacyNotes } from './observaciones';

/* ------------------------------------------------------------------ */
/* Header normalisation                                                */
/* ------------------------------------------------------------------ */

/** "País de Procedencia" -> "paisdeprocedencia"; "Valor FOB" -> "valorfob". */
export function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Every field an Excel row can populate, keyed by a canonical name. Each entry lists
 * the header aliases (already normalised) that map to it. Add aliases here when a
 * client sends a new spreadsheet layout.
 */
export type FieldKey =
  | 'reference' | 'tipoExpediente' | 'status' | 'digitador' | 'gestor' | 'notes'
  | 'idSecuencia' | 'eta' | 'tipoDespacho' | 'administracionCodigo' | 'administracionNombre'
  | 'noDeclaracion' | 'docEmbarque' | 'depositoDestino' | 'puertoEntrada'
  | 'paisProcedenciaCodigo' | 'paisProcedenciaNombre' | 'facturaComercialNo'
  | 'importadorCodigo' | 'importadorNombre' | 'importadorTipoDoc' | 'agenteCodigo' | 'agenteNombre'
  | 'consignatarioCodigo' | 'consignatarioNombre' | 'compradorCodigo' | 'compradorNombre'
  | 'suplidorCodigo' | 'suplidorNombre' | 'suplidorNacionalidad'
  | 'numeroFactura' | 'fechaFactura' | 'valorFactura'
  | 'contenedorTipo' | 'contenedorNumero' | 'sello1' | 'sello2' | 'tipoCarga'
  | 'tasaCambio' | 'valorFobTotal' | 'seguro' | 'flete' | 'otros' | 'valorCifTotal'
  | 'regimenCodigo' | 'regimenNombre' | 'acuerdo'
  | 'codigoMercancia' | 'pesoBrutoKg' | 'pesoNetoKg'
  | 'codigoPartida' | 'codigoProducto' | 'descripcion' | 'organico' | 'cantidad' | 'unidad' | 'paisOrigen'
  | 'valorFob' | 'unitario' | 'facturaDva'
  | 'marca' | 'modelo' | 'estadoProducto' | 'anio' | 'serial' | 'especificacion';

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  reference: ['reference', 'referencia', 'expediente', 'ref'],
  tipoExpediente: ['tipoexpediente', 'tipo', 'operacion'],
  status: ['status', 'estado', 'estatus'],
  digitador: ['digitador'],
  gestor: ['gestor'],
  notes: ['notes', 'notas', 'observaciones', 'observacion', 'comentarios'],

  idSecuencia: ['idsecuencia', 'secuencia', 'id'],
  eta: ['eta', 'fechallegada', 'fechadellegada', 'llegada', 'arribo'],
  tipoDespacho: ['tipodespacho', 'tipodedespacho', 'despacho'],
  administracionCodigo: ['administracioncodigo', 'codigoadministracion', 'codadministracion', 'codadmin', 'administracioncod'],
  administracionNombre: ['administracionnombre', 'administracion', 'nombreadministracion', 'aduana'],
  noDeclaracion: ['nodeclaracion', 'numerodeclaracion', 'declaracion', 'numdeclaracion', 'nodedeclaracion'],
  docEmbarque: ['docembarque', 'documentoembarque', 'documentodeembarque', 'bl', 'billoflading', 'conocimientodeembarque', 'guia'],
  depositoDestino: ['depositodestino', 'deposito', 'depositodedestino', 'almacen'],
  puertoEntrada: ['puertoentrada', 'puertodeentrada', 'puerto'],
  paisProcedenciaCodigo: ['paisprocedenciacodigo', 'codigopaisprocedencia', 'codpaisprocedencia', 'codpais', 'codigopais'],
  paisProcedenciaNombre: ['paisprocedencianombre', 'paisprocedencia', 'paisdeprocedencia', 'procedencia', 'pais'],
  facturaComercialNo: ['facturacomercialno', 'facturacomercial', 'nofacturacomercial', 'factura'],

  importadorCodigo: ['importadorcodigo', 'codigoimportador', 'codimportador', 'clientecodigo', 'codigocliente', 'codcliente', 'rnc', 'rncimportador', 'documentoimportador'],
  importadorNombre: ['importadornombre', 'importador', 'nombreimportador', 'cliente', 'nombrecliente'],
  importadorTipoDoc: ['importadortipodoc', 'tipodocumento', 'tipodoc', 'tipodocumentoimportador', 'tipodocimportador'],
  agenteCodigo: ['agentecodigo', 'codigoagente', 'agenteaduanalcodigo', 'codagente'],
  agenteNombre: ['agentenombre', 'agente', 'agenteaduanal', 'nombreagente'],
  consignatarioCodigo: ['consignatariocodigo', 'codigoconsignatario', 'codconsignatario'],
  consignatarioNombre: ['consignatarionombre', 'consignatario', 'nombreconsignatario'],
  compradorCodigo: ['compradorcodigo', 'codigocomprador', 'codcomprador'],
  compradorNombre: ['compradornombre', 'comprador', 'compradorexportacion', 'nombrecomprador'],
  suplidorCodigo: ['suplidorcodigo', 'codigosuplidor', 'codsuplidor', 'proveedorcodigo', 'codigoproveedor'],
  suplidorNombre: ['suplidornombre', 'suplidor', 'nombresuplidor', 'proveedor', 'nombreproveedor', 'supplier'],
  suplidorNacionalidad: ['suplidornacionalidad', 'nacionalidad', 'nacionalidadsuplidor', 'paissuplidor'],

  numeroFactura: ['numerofactura', 'nofactura', 'numfactura', 'invoice', 'invoiceno', 'invoicenumber'],
  fechaFactura: ['fechafactura', 'fechadefactura', 'invoicedate'],
  valorFactura: ['valorfactura', 'montofactura', 'invoicevalue', 'totalfactura'],

  contenedorTipo: ['contenedortipo', 'tipocontenedor', 'tipodecontenedor'],
  contenedorNumero: ['contenedornumero', 'nocontenedor', 'numerocontenedor', 'contenedor', 'container', 'containerno'],
  sello1: ['sello1', 'sello', 'seal', 'seal1', 'precinto', 'precinto1'],
  sello2: ['sello2', 'seal2', 'precinto2'],
  tipoCarga: ['tipocarga', 'tipodecarga', 'carga'],

  tasaCambio: ['tasacambio', 'tasadecambio', 'tasa', 'exchangerate'],
  valorFobTotal: ['valorfobtotal', 'fobtotal', 'totalfob'],
  seguro: ['seguro', 'insurance'],
  flete: ['flete', 'freight'],
  otros: ['otros', 'otrosgastos', 'other'],
  valorCifTotal: ['valorciftotal', 'ciftotal', 'totalcif', 'cif'],

  regimenCodigo: ['regimencodigo', 'codigoregimen', 'codregimen'],
  regimenNombre: ['regimennombre', 'regimen', 'regimenaduanero', 'nombreregimen'],
  acuerdo: ['acuerdo', 'acuerdocomercial', 'tratado'],

  codigoMercancia: ['codigomercancia', 'codmercancia', 'mercancia'],
  pesoBrutoKg: ['pesobrutokg', 'pesobruto', 'bruto', 'grossweight'],
  pesoNetoKg: ['pesonetokg', 'pesoneto', 'neto', 'netweight'],

  codigoPartida: ['codigopartida', 'partida', 'codigo', 'arancel', 'codigoarancelario', 'hscode', 'renglon', 'tariff'],
  descripcion: ['descripcion', 'description', 'producto', 'mercaderia', 'articulo'],
  organico: ['organico', 'organic'],
  cantidad: ['cantidad', 'qty', 'quantity', 'cant'],
  unidad: ['unidad', 'unidadmedida', 'unit', 'um'],
  paisOrigen: ['paisorigen', 'paisdeorigen', 'origen', 'origin', 'countryoforigin'],
  valorFob: ['valorfob', 'fob', 'valor', 'fobvalue', 'total'],
  unitario: ['unitario', 'preciounitario', 'valorunitario', 'unitprice', 'precio'],
  facturaDva: ['facturadva', 'dva', 'facturarenglon'],
  codigoProducto: ['codigoproducto', 'codproducto', 'codprod', 'productcode', 'sku'],
  marca: ['marca', 'brand', 'brandname'],
  modelo: ['modelo', 'model', 'modelname'],
  estadoProducto: ['estadoproducto', 'estado', 'condicion', 'productstatus'],
  anio: ['anio', 'ano', 'year', 'productyear'],
  serial: ['serial', 'numeroserie', 'serialno', 'noserie'],
  especificacion: ['especificacion', 'specification', 'especificaciones'],
};

const ALIAS_LOOKUP: Map<string, FieldKey> = new Map();
for (const [key, aliases] of Object.entries(FIELD_ALIASES) as [FieldKey, string[]][]) {
  for (const a of aliases) if (!ALIAS_LOOKUP.has(a)) ALIAS_LOOKUP.set(a, key);
}

/** Resolve an original spreadsheet header to a field key, or undefined if unknown. */
export function resolveHeader(header: string): FieldKey | undefined {
  return ALIAS_LOOKUP.get(normalizeHeader(header));
}

/* ------------------------------------------------------------------ */
/* Row parsing                                                          */
/* ------------------------------------------------------------------ */

export interface ParsedRow {
  /** Values for recognised columns. */
  fields: Partial<Record<FieldKey, string | number | boolean>>;
  /** Values for columns nobody recognised, keyed by the original header. */
  extra: Record<string, unknown>;
  sheet: string;
  rowNumber: number;
}

export interface ParsedWorkbook {
  rows: ParsedRow[];
  /** Original headers in order of first appearance, across all sheets. */
  headers: string[];
  /** Original headers that no alias matched. */
  unmappedHeaders: string[];
  /** Original header -> field key, for the columns that were recognised. */
  mapping: Record<string, FieldKey>;
  sheets: string[];
}

function cellToDate(v: unknown): string {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    // Excel serial date
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
  }
  const s = String(v ?? '').trim();
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}

const DATE_FIELDS = new Set<FieldKey>(['eta', 'fechaFactura']);
const NUMBER_FIELDS = new Set<FieldKey>([
  'valorFactura', 'tasaCambio', 'valorFobTotal', 'seguro', 'flete', 'otros', 'valorCifTotal',
  'pesoBrutoKg', 'pesoNetoKg', 'cantidad', 'valorFob', 'unitario',
]);
const BOOL_FIELDS = new Set<FieldKey>(['organico']);

function coerce(key: FieldKey, v: unknown): string | number | boolean {
  if (DATE_FIELDS.has(key)) return cellToDate(v);
  if (NUMBER_FIELDS.has(key)) {
    const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  if (BOOL_FIELDS.has(key)) {
    if (typeof v === 'boolean') return v;
    const s = String(v ?? '').trim().toLowerCase();
    return ['1', 'si', 'sí', 'yes', 'true', 'x'].includes(s);
  }
  return String(v ?? '').trim();
}

/**
 * Reads every sheet of a workbook and every column of every row. Recognised columns
 * land in `fields`; anything else is preserved in `extra` so nothing is silently dropped.
 */
export function parseWorkbook(data: ArrayBuffer | Uint8Array, opts: { sheets?: string[] } = {}): ParsedWorkbook {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetNames = opts.sheets ?? wb.SheetNames;
  const rows: ParsedRow[] = [];
  const headers: string[] = [];
  const mapping: Record<string, FieldKey> = {};
  const unmapped = new Set<string>();

  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    json.forEach((raw, i) => {
      const row: ParsedRow = { fields: {}, extra: {}, sheet: name, rowNumber: i + 2 };
      let hasValue = false;
      for (const [header, value] of Object.entries(raw)) {
        if (header.startsWith('__EMPTY')) continue;
        if (!headers.includes(header)) headers.push(header);
        if (value !== '' && value !== null && value !== undefined) hasValue = true;
        const key = resolveHeader(header);
        if (key) {
          mapping[header] = key;
          // First alias wins if two columns map to the same field.
          if (row.fields[key] === undefined || row.fields[key] === '') row.fields[key] = coerce(key, value);
        } else {
          unmapped.add(header);
          row.extra[header] = value;
        }
      }
      if (hasValue) rows.push(row);
    });
  }

  return { rows, headers, unmappedHeaders: [...unmapped], mapping, sheets: sheetNames };
}

/* ------------------------------------------------------------------ */
/* Rows -> Expedientes                                                  */
/* ------------------------------------------------------------------ */

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

export function rowToPartida(row: ParsedRow): Partida {
  const f = row.fields;
  const base = emptyPartida();
  const estado = ESTADOS_PRODUCTO.find(
    (e) => e.codigo === str(f.estadoProducto).toUpperCase() || e.nombre === str(f.estadoProducto).toUpperCase(),
  );
  // `unitario` is always derived from FOB / quantity, so a unit-price column is ignored.
  return withDerived({
    ...base,
    codigoPartida: str(f.codigoPartida),
    codigoProducto: str(f.codigoProducto),
    descripcion: str(f.descripcion),
    organico: Boolean(f.organico),
    cantidad: num(f.cantidad),
    unidad: str(f.unidad) || base.unidad,
    paisOrigen: str(f.paisOrigen),
    valorFob: num(f.valorFob),
    facturaDva: str(f.facturaDva),
    marca: str(f.marca),
    modelo: str(f.modelo),
    estadoProducto: estado?.codigo ?? base.estadoProducto,
    anio: str(f.anio),
    serial: str(f.serial),
    especificacion: str(f.especificacion),
  });
}

function normalizeStatus(v: unknown): ExpedienteStatus {
  const s = normalizeHeader(v);
  const found = Object.values(ExpedienteStatus).find((st) => normalizeHeader(st) === s);
  return found ?? ExpedienteStatus.Registrado;
}

function normalizeTipo(v: unknown): TipoExpediente {
  return normalizeHeader(v).startsWith('export') ? 'exportacion' : 'importacion';
}

/**
 * Groups rows by reference (one expediente per reference; each row is one renglón)
 * and builds complete NewExpediente records from every recognised column. Header-level
 * values (declaración, partes, valores…) are taken from the first row of each group;
 * suplidores, documentos and contenedores are collected across all rows of the group.
 */
export function rowsToExpedientes(rows: ParsedRow[]): NewExpediente[] {
  const grouped = new Map<string, ParsedRow[]>();
  rows.forEach((r) => {
    const key = str(r.fields.reference) || str(r.fields.noDeclaracion) || `${r.sheet}#${r.rowNumber}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  });

  return Array.from(grouped.entries()).map(([ref, group]) => {
    const f = group[0].fields;

    // Country: accept a code, a name, or both; fill the other half from the catalog.
    const rawPais = str(f.paisProcedenciaCodigo);
    let paisCodigo = /^\d+$/.test(rawPais) ? rawPais.padStart(3, '0') : rawPais;
    let paisNombre = str(f.paisProcedenciaNombre).toUpperCase();
    if (paisCodigo && !paisNombre) paisNombre = findCountryByCode(paisCodigo)?.nombre ?? '';
    if (paisNombre && !paisCodigo) paisCodigo = findCountryByName(paisNombre)?.codigo ?? '';

    // Administración: same idea.
    let adminCodigo = str(f.administracionCodigo);
    let adminNombre = str(f.administracionNombre).toUpperCase();
    if (adminNombre && !adminCodigo) adminCodigo = findAdministracionByName(adminNombre) ?? '';
    if (adminCodigo) adminNombre = findAdministracion(adminCodigo)?.nombre ?? adminNombre;

    let regimenCodigo = str(f.regimenCodigo);
    let regimenNombre = str(f.regimenNombre).toUpperCase();
    if (regimenCodigo && !regimenNombre) regimenNombre = findRegimen(regimenCodigo)?.nombre ?? '';
    if (!regimenCodigo && !regimenNombre) { regimenCodigo = '1'; regimenNombre = 'DESPACHO A CONSUMO'; }

    const tipoDocRaw = str(f.importadorTipoDoc).toUpperCase().trim();
    const tipoDocumento = (TIPOS_DOCUMENTO as string[]).includes(tipoDocRaw) ? (tipoDocRaw as TipoDocumento) : TIPO_DOCUMENTO_DEFAULT;
    const importador = { codigo: str(f.importadorCodigo), nombre: str(f.importadorNombre), tipoDocumento, paisDocumento: PAIS_RD };
    const consignatario = f.consignatarioCodigo || f.consignatarioNombre
      ? { codigo: str(f.consignatarioCodigo), nombre: str(f.consignatarioNombre) }
      : { ...importador };

    const suplidores = dedupe(
      group
        .filter((r) => r.fields.suplidorCodigo || r.fields.suplidorNombre)
        .map((r) => ({ codigo: str(r.fields.suplidorCodigo), nombre: str(r.fields.suplidorNombre), nacionalidad: str(r.fields.suplidorNacionalidad) })),
      (s) => `${s.codigo}|${s.nombre}`,
    );

    const documentos = dedupe(
      group
        .filter((r) => r.fields.numeroFactura)
        .map((r) => ({ id: crypto.randomUUID(), numeroFactura: str(r.fields.numeroFactura), fechaFactura: str(r.fields.fechaFactura), codigoSuplidor: str(r.fields.suplidorCodigo), valorFactura: num(r.fields.valorFactura) })),
      (d) => d.numeroFactura,
    );

    const contenedores = dedupe(
      group
        .filter((r) => r.fields.contenedorNumero)
        .map((r) => ({ id: crypto.randomUUID(), tipo: str(r.fields.contenedorTipo), numero: str(r.fields.contenedorNumero), sello1: str(r.fields.sello1), sello2: str(r.fields.sello2) })),
      (c) => c.numero,
    );

    const partidas = group.filter((r) => r.fields.codigoPartida || r.fields.descripcion).map(rowToPartida);
    const fobFromPartidas = partidas.reduce((s, p) => s + p.valorFob, 0);
    const valorFobTotal = num(f.valorFobTotal) || fobFromPartidas;
    const seguro = num(f.seguro);
    const flete = num(f.flete);
    const otros = num(f.otros);
    const valorCifTotal = num(f.valorCifTotal) || valorFobTotal + seguro + flete + otros;

    const observaciones = group.flatMap((r) => parseLegacyNotes(str(r.fields.notes)));

    return {
      reference: str(f.reference) || str(f.noDeclaracion) || ref,
      tipoExpediente: normalizeTipo(f.tipoExpediente),
      status: normalizeStatus(f.status),
      checklist: makeDefaultChecklist(),
      declaracion: {
        idSecuencia: str(f.idSecuencia),
        eta: str(f.eta),
        tipoDespacho: str(f.tipoDespacho).toUpperCase(),
        administracionCodigo: adminCodigo,
        administracionNombre: adminNombre,
        noDeclaracion: str(f.noDeclaracion) || str(f.reference) || ref,
        docEmbarque: str(f.docEmbarque),
        depositoDestino: str(f.depositoDestino),
        puertoEntrada: str(f.puertoEntrada),
        paisProcedenciaCodigo: paisCodigo,
        paisProcedenciaNombre: paisNombre,
        facturaComercialNo: str(f.facturaComercialNo),
      },
      importador,
      agenteAduanal: f.agenteCodigo || f.agenteNombre
        ? { codigo: str(f.agenteCodigo), nombre: str(f.agenteNombre) }
        : { ...AGENTE_ADUANAL_DEFAULT },
      consignatario,
      compradorExportacion: { codigo: str(f.compradorCodigo) || '0', nombre: str(f.compradorNombre) },
      suplidores,
      documentos,
      contenedores,
      tipoCarga: normalizeHeader(f.tipoCarga).includes('suelta') ? 'carga_suelta' : 'contenedores',
      valores: {
        tasaCambio: num(f.tasaCambio) || TASA_CAMBIO_DEFAULT,
        valorFobTotal, seguro, flete, otros, valorCifTotal,
      },
      regimenAduanero: { codigo: regimenCodigo, nombre: regimenNombre, acuerdo: str(f.acuerdo) },
      pesoMercancia: { codigoMercancia: str(f.codigoMercancia), pesoBrutoKg: num(f.pesoBrutoKg), pesoNetoKg: num(f.pesoNetoKg) },
      partidas,
      informacionAdicional: emptyInformacionAdicional(),
      digitador: str(f.digitador),
      gestor: str(f.gestor),
      observaciones,
      assignedUserId: '2',
    };
  });
}

const ADMIN_INDEX = ADMINISTRACIONES.map((a) => ({
  codigo: a.codigo,
  norm: normalizeHeader(a.nombre),
  short: normalizeHeader(a.nombre.replace(/^ADMINISTRACION\s*/i, '')),
}));

/** "Haina Oriental", "ADMINISTRACION HAINA ORIENTAL" and "Adm. Haina Oriental" all resolve. */
export function findAdministracionByName(nombre: string): string | undefined {
  const n = normalizeHeader(nombre);
  if (!n) return undefined;
  const hit = ADMIN_INDEX.find((a) => a.norm === n || a.short === n || n.endsWith(a.short));
  return hit?.codigo;
}

function dedupe<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = key(i);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Convenience for the renglones importer inside the expediente form. */
export function parsePartidas(data: ArrayBuffer | Uint8Array): { partidas: Partida[]; unmappedHeaders: string[] } {
  const parsed = parseWorkbook(data);
  const partidas = parsed.rows
    .filter((r) => r.fields.codigoPartida || r.fields.descripcion)
    .map(rowToPartida);
  return { partidas, unmappedHeaders: parsed.unmappedHeaders };
}

/** Read a File from an <input type="file"> into an ArrayBuffer. */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
