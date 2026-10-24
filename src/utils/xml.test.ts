import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildFullXml, buildSigaImportXml, buildSigaExportXml, buildSigaXmlFiles, escapeXml, SIGA_NS_IMPORT, SIGA_NS_EXPORT } from './xml';
import { ExpedienteStatus } from '../types';
import type { Expediente } from '../types';
import { emptyPartida, withDerived } from './partida';
import { emptyInformacionAdicional } from '../store/expedientesStore';
import { AGENTE_ADUANAL_DEFAULT } from '../data/catalogos';

const NOW = new Date('2026-09-03T12:00:00Z');

const sample: Expediente = {
  id: 'x1', reference: 'DEC-1 <test> & "q"', tipoExpediente: 'importacion', status: ExpedienteStatus.Presentado,
  checklist: [
    { id: 'c1', label: 'A', completed: true, completedAt: '2026-01-01T00:00:00Z' },
    { id: 'c2', label: 'B', completed: false, completedAt: null },
  ],
  declaracion: {
    idSecuencia: '1', eta: '2026-02-25', tipoDespacho: 'GENERAL', administracionCodigo: '10030', administracionNombre: 'ADMINISTRACION HAINA ORIENTAL',
    noDeclaracion: 'DEC-1', docEmbarque: 'BL-1', depositoDestino: '', puertoEntrada: 'Rio Haina', paisProcedenciaCodigo: '724', paisProcedenciaNombre: 'ESPAÑA', facturaComercialNo: 'F-1',
  },
  importador: { codigo: '101-00001-1', nombre: 'BRAVO S A', tipoDocumento: 'RNC', paisDocumento: '214' },
  agenteAduanal: { ...AGENTE_ADUANAL_DEFAULT },
  consignatario: { codigo: '101-00001-1', nombre: 'BRAVO S A', tipoDocumento: 'RNC', paisDocumento: '214' },
  compradorExportacion: { codigo: '0', nombre: '' },
  suplidores: [{ codigo: 'S1', nombre: 'Sup', nacionalidad: 'ESPAÑA' }],
  documentos: [{ id: 'd1', numeroFactura: 'F-1', fechaFactura: '2026-01-10', codigoSuplidor: 'S1', valorFactura: 100 }],
  contenedores: [{ id: 'k1', tipo: '40', numero: 'CONT-1', sello1: 'S', sello2: '' }],
  tipoCarga: 'contenedores',
  valores: { tasaCambio: 65, valorFobTotal: 100, seguro: 1, flete: 2, otros: 0, valorCifTotal: 103 },
  regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
  pesoMercancia: { codigoMercancia: 'M', pesoBrutoKg: 10, pesoNetoKg: 9 },
  partidas: [withDerived({
    ...emptyPartida(),
    id: 'p1', codigoPartida: '4818.30.00', codigoProducto: 'SP4020', descripcion: 'Servilletas',
    cantidad: 10, unidad: 'KILOGRAMOS', paisOrigen: 'ESPAÑA', valorFob: 100, facturaDva: 'F-1',
    marca: 'SUAO', estadoProducto: 'IC04-002', certificadoOrigen: true, certificadoOrigenNo: 'CO-9',
    vehiculo: { tipo: 'SEDAN', chasis: 'CH-1', color: 'ROJO', motor: 'M-1', cc: 1600 },
  })],
  informacionAdicional: {
    ...emptyInformacionAdicional(),
    transportistaNombre: 'MAERSK LINE', transporteNacionalidad: '208', medioTransporte: 'MARITIMO',
    noViaje: 'V-2202', manifiestoNo: 'MAN-1', cargoControlNo: 'CC-1', fechaLlegadaReal: '2026-02-27',
  },
  preliquidacion: null,
  digitador: 'Ana', gestor: 'Pedro',
  observaciones: [{ id: 'o1', fecha: '2026-01-02T00:00:00Z', usuario: 'Ana', texto: 'nota & más', publica: true }],
  assignedUserId: '2', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
};

const exportSample: Expediente = {
  ...sample, id: 'x2', tipoExpediente: 'exportacion', reference: 'EXP-1',
  compradorExportacion: { codigo: 'X1234567', nombre: 'Buyer Inc', tipoDocumento: 'PAS', paisDocumento: '724' },
};

describe('escapeXml', () => {
  it('escapes the five XML specials', () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
  });
});

describe('buildFullXml', () => {
  const xml = buildFullXml([sample], NOW);

  it('starts with an XML declaration and one expediente per record', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.match(/<expediente /g)).toHaveLength(1);
    expect(xml).toContain('cantidad="1"');
    expect(xml).toContain('generado="2026-09-03T12:00:00.000Z"');
  });

  it('escapes attribute values', () => {
    expect(xml).toContain('reference="DEC-1 &lt;test&gt; &amp; &quot;q&quot;"');
  });

  it('includes every section', () => {
    for (const tag of ['declaracion', 'importador', 'agenteAduanal', 'consignatario', 'compradorExportacion', 'suplidor ', 'documento ', 'contenedor ', 'valores', 'regimenAduanero', 'pesoMercancia', 'partida ', 'checklist', 'observacion ']) {
      expect(xml, tag).toContain(`<${tag}`);
    }
    expect(xml).toContain('progress="50%"');
    expect(xml).toContain('digitador="Ana"');
    expect(xml).toContain('<observacion fecha="2026-01-02T00:00:00Z" usuario="Ana">nota &amp; más</observacion>');
  });
});

describe('buildSigaImportXml (ImportDUA.xsd)', () => {
  const xml = buildSigaImportXml([sample], NOW);
  const tags = [...xml.matchAll(/<([A-Za-z]+)[ >/]/g)].map((m) => m[1]);

  it('uses the DGA ImportDUA root and namespace', () => {
    expect(xml).toContain(`<ImportDUA xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="${SIGA_NS_IMPORT}">`);
    // The XSD has no elementFormDefault: the declaration and everything in it are unqualified.
    expect(xml.match(/<ImpDeclaration xmlns="">/g)).toHaveLength(1);
  });

  it('emits the header elements in schema order', () => {
    const header = ['DeclarationDate', 'ClearanceType', 'AreaCode', 'FormNo', 'BLNo', 'ConsigneeCode', 'ConsigneeName', 'ConsigneeNationality', 'CommercialInvoiceNo', 'DestinationLocationCode', 'EntryPort', 'DepartureCountryCode', 'TransportCompanyCode', 'TransportNationality', 'TransportMethod', 'EntryPlanDate', 'EntryDate', 'ImporterCode', 'ImporterName', 'ImporterNationality', 'BrokerEmployeeCode', 'BrokerCompanyCode', 'DeclarantCode', 'DeclarantName', 'DeclarantNationality', 'RegimenCode', 'AgreementCode', 'TotalFOB', 'InsuranceValue', 'FreightValue', 'OtherValue', 'TotalCIF', 'TotalWeight', 'NetWeight', 'Remark', 'ImpDeclarationSupplier'];
    const idx = header.map((h) => tags.indexOf(h));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it('maps the app fields onto the DUA', () => {
    expect(xml).toContain('<AreaCode>10030</AreaCode>');
    expect(xml).toContain('<ClearanceType>IC38-001</ClearanceType>');   // SIGA code, not the label
    expect(xml).toContain('<BLNo>BL-1</BLNo>');
    expect(xml).toContain('<EntryPort>DOHAI</EntryPort>');           // "Rio Haina" resolved to its UN/LOCODE
    expect(xml).toContain('<DepartureCountryCode>724</DepartureCountryCode>');
    expect(xml).toContain('<EntryPlanDate>2026-02-25T00:00:00</EntryPlanDate>');
    expect(xml).toContain('<ImporterCode>RNC214101000011</ImporterCode>');   // [RNC][country][number] per the XSD
    expect(xml).toContain('<ConsigneeCode>RNC214101000011</ConsigneeCode>');
    expect(xml).toContain('<ImporterNationality>214</ImporterNationality>');
    expect(xml).toContain('<TotalCIF>103.0000</TotalCIF>');   // money: four decimals
    expect(xml).toContain('<ForeignSupplierNationality>724</ForeignSupplierNationality>');
    expect(xml).toContain('<HSCode>48183000</HSCode>');   // no dots
    expect(xml).toContain('<OriginCountry>724</OriginCountry>');
    expect(xml).toContain('<OrganicYN>false</OrganicYN>');
    expect(xml).toContain('<ContainerNo>CONT-1</ContainerNo>');
  });

  it('carries the renglon detail fields', () => {
    expect(xml).toContain('<ProductCode>SP4020</ProductCode>');
    expect(xml).toContain('<BrandName>SUAO</BrandName>');
    expect(xml).toContain('<ProductStatusCode>IC04-002</ProductStatusCode>');
    expect(xml).toContain('<CertificateOrignYN>true</CertificateOrignYN>');
    expect(xml).toContain('<CertificateOriginNo>CO-9</CertificateOriginNo>');
    expect(xml).toContain('<VehicleChassis>CH-1</VehicleChassis>');
    expect(xml).toContain('<VehicleCC>1600</VehicleCC>');
  });

  it('uses the brokerage standard remark', () => {
    expect(xml).toContain('<Remark>DECLARAMOS EN BASE A LA INFORMACIÓN PROPORCIONADA POR EL CLIENTE</Remark>');
  });

  it('fills the transport block from informacion adicional', () => {
    // Only a carrier code goes in a code field; the fixture has just the carrier's name.
    expect(xml).toContain('<TransportCompanyCode></TransportCompanyCode>');
    expect(xml).toContain('<TransportNationality>208</TransportNationality>');
    // SIGA's transport-method codes are unknown, and the app's labels are not codes.
    expect(xml).toContain('<TransportMethod></TransportMethod>');
    expect(xml).toContain('<ManifestNo>MAN-1</ManifestNo>');
    expect(xml).toContain('<CargoControlNo>CC-1</CargoControlNo>');
    expect(xml).toContain('<EntryDate>2026-02-27T00:00:00</EntryDate>');   // actual arrival, not the ETA
  });

  it('still emits schema-required elements the app does not track, empty', () => {
    expect(xml).toContain('<AgreementCode></AgreementCode>');
    expect(xml).toContain('<BrokerEmployeeCode></BrokerEmployeeCode>');
    expect(xml).toContain('<BrokerCompanyCode></BrokerCompanyCode>');
  });

  it('sends the declarant as a full party code: a short one crashes SIGA\'s import', () => {
    expect(xml).toContain('<DeclarantCode>RNC214130339198</DeclarantCode>');
    expect(xml).toContain('<DeclarantNationality>214</DeclarantNationality>');
  });

  it('declares the unit price as FOBValue and the SIGA unit code', () => {
    expect(xml).toContain('<FOBValue>10.0000</FOBValue>');   // US$ 100 for 10 kg
    expect(xml).toContain('<Qty>10.0000</Qty>');
    expect(xml).toContain('<UnitCode>3</UnitCode>');         // KILOGRAMOS
  });

  it('fills unknown codes and dates the way SIGA does', () => {
    expect(xml).toContain('<BrandCode>0</BrandCode>');
    expect(xml).toContain('<ModelName>NA</ModelName>');
    expect(xml).toContain('<ProductYear>0</ProductYear>');
    const sinFechas = buildSigaImportXml([{ ...sample, declaracion: { ...sample.declaracion, eta: '' }, informacionAdicional: { ...sample.informacionAdicional, fechaLlegadaReal: '' } }], NOW);
    expect(sinFechas).toContain('<EntryPlanDate>1900-01-01T12:00:00</EntryPlanDate>');
    expect(sinFechas).toContain('<EntryDate>1900-01-01T12:00:00</EntryDate>');
  });

  it('declares a product with no registered code as temporary, coded by its line number', () => {
    const sinCodigo = buildSigaImportXml([{ ...sample, partidas: [{ ...sample.partidas[0], codigoProducto: '' }] }], NOW);
    expect(sinCodigo).toContain('<ProductCode>1</ProductCode>');
    expect(sinCodigo).toContain('<TempProductYN>true</TempProductYN>');
    expect(xml).toContain('<TempProductYN>false</TempProductYN>');
  });

  it('does not leak app-only concepts', () => {
    expect(xml).not.toContain('checklist');
    expect(xml).not.toContain('observac');
  });
});

describe('buildSigaExportXml (ExportDUA.xsd)', () => {
  const xml = buildSigaExportXml([exportSample], NOW);

  it('uses the ExportDUA root and maps exporter/buyer', () => {
    expect(xml).toContain(`xmlns="${SIGA_NS_EXPORT}">`);
    expect(xml).toContain('<ExpDeclaration xmlns="">');
    expect(xml).toContain('<DeclarantCode>RNC214130339198</DeclarantCode>');
    expect(xml).toContain('<ExporterCode>RNC214101000011</ExporterCode>');
    expect(xml).toContain('<BuyerCode>PAS724X1234567</BuyerCode>');   // foreign buyer identified by passport
    expect(xml).toContain('<BuyerName>Buyer Inc</BuyerName>');
    expect(xml).toContain('<DeparturePort>DOHAI</DeparturePort>');
    expect(xml).toContain('<ExpDeclarationProduct>');
  });
});

describe('buildSigaXmlFiles', () => {
  it('splits a mixed selection into one file per schema', () => {
    const files = buildSigaXmlFiles([sample, exportSample], NOW);
    expect(files.map((f) => f.tipo)).toEqual(['importacion', 'exportacion']);
    expect(files[0].count).toBe(1);
    expect(files[0].xml).toContain('<ImportDUA');
    expect(files[1].xml).toContain('<ExportDUA');
  });

  it('returns nothing for an empty selection', () => {
    expect(buildSigaXmlFiles([], NOW)).toEqual([]);
  });
});

/*
 * Both DUA schemas are xs:sequence, so a builder that emits the right elements in the wrong
 * order produces a file SIGA rejects. Rather than freeze the order in a literal that drifts,
 * check the emitted order against the XSD itself: inside every block, the elements the builder
 * writes must appear in the schema's order, with nothing the schema does not declare.
 */
describe('SIGA element order matches the XSD sequence', () => {
  /**
   * parent element -> its direct children, in declaration order. A tag that closes itself is a
   * leaf; anything else opens a block, so a stack of names is enough to nest them.
   */
  function bloques(texto: string, abre: RegExp, cierra: RegExp): Map<string, string[]> {
    const out = new Map<string, string[]>([['', []]]);
    const pila: string[] = [''];
    const token = new RegExp(`${abre.source}|${cierra.source}`, 'g');
    for (const m of texto.matchAll(token)) {
      if (m[1] === undefined) { if (pila.length > 1) pila.pop(); continue; }
      out.get(pila[pila.length - 1])!.push(m[1]);
      if (!m[0].endsWith('/>')) { pila.push(m[1]); out.set(m[1], out.get(m[1]) ?? []); }
    }
    return out;
  }

  /* Only </xs:element> closes a block here; the complexType and sequence wrappers around it
     are scaffolding and must not pop the stack. */
  const xsdBlocks = (file: string) => bloques(
    readFileSync(new URL(`../../docs/siga-xsd/${file}`, import.meta.url), 'utf8'),
    /<xs:element\b[^>]*?\bname="([A-Za-z0-9_]+)"[^>]*>/,
    /<\/xs:element>/,
  );

  const xmlBlocks = (xml: string) => bloques(
    xml,
    /<([A-Za-z][A-Za-z0-9_]*)\b[^>]*>/,
    /<\/[A-Za-z][A-Za-z0-9_]*>/,
  );

  /*
   * Elements SIGA accepts that the published XSD does not list, appended where SIGA's own DUA
   * (docs/siga-muestras) puts them: each product repeats its description in a Remark.
   */
  const FUERA_DEL_XSD: Record<string, string[]> = {
    ImpDeclarationProduct: ['Remark'],
    ExpDeclarationProduct: ['Remark'],
  };

  /** Every emitted child must exist in the schema block and follow the schema order. */
  function desorden(xml: Map<string, string[]>, xsd: Map<string, string[]>): string[] {
    const fallas: string[] = [];
    for (const [padre, hijos] of xml) {
      if (hijos.length === 0) continue;
      const base = xsd.get(padre);
      const esquema = base && [...base, ...(FUERA_DEL_XSD[padre] ?? [])];
      if (!esquema) continue;                      // root wrapper, not declared as an element
      let i = -1;
      for (const hijo of new Set(hijos)) {          // each name appears once per block
        const j = esquema.indexOf(hijo);
        if (j < 0) fallas.push(`${padre}/${hijo} no existe en el XSD`);
        else if (j <= i) fallas.push(`${padre}/${hijo} está fuera de orden`);
        else i = j;
      }
    }
    return fallas;
  }

  it('importación', () => {
    const xsd = xsdBlocks('ImportDUA.xsd');
    expect(desorden(xmlBlocks(buildSigaImportXml([sample], NOW)), xsd)).toEqual([]);
    // The guard has teeth only if it sees the elements: the header block must be checked.
    expect(xsd.get('ImpDeclaration')).toContain('AreaCode');
  });

  it('exportación', () => {
    const e = { ...sample, tipoExpediente: 'exportacion' as const };
    expect(desorden(xmlBlocks(buildSigaExportXml([e], NOW)), xsdBlocks('ExportDUA.xsd'))).toEqual([]);
  });
});

/*
 * The DUA below loaded into SIGA without errors (docs/siga-muestras/ImportDUA-WH26070084A.xml).
 * Rebuilding the same declaration from app data must give the same document: same blocks, same
 * elements in the same order, same values — numbers compared as numbers, since SIGA writes
 * "6.00" where we write "6.0000". The only intended difference is the header Remark, where
 * the brokerage puts its standard text.
 */
describe('SIGA accepted DUA (WH26070084A)', () => {
  const muestra = readFileSync(new URL('../../docs/siga-muestras/ImportDUA-WH26070084A.xml', import.meta.url), 'utf8');
  const valor = (bloque: string, tag: string) => (bloque.match(new RegExp(`<${tag}>([^<]*)</${tag}>`)) ?? [])[1] ?? '';
  const productosMuestra = [...muestra.matchAll(/<ImpDeclarationProduct>([\s\S]*?)<\/ImpDeclarationProduct>/g)].map((m) => m[1]);

  const expediente: Expediente = {
    ...sample,
    declaracion: {
      ...sample.declaracion, idSecuencia: '5866', tipoDespacho: 'GENERAL', administracionCodigo: '10150',
      docEmbarque: 'WH26070084A', puertoEntrada: '', paisProcedenciaCodigo: '156', facturaComercialNo: '', eta: '', depositoDestino: '',
    },
    importador: { codigo: '131256767', nombre: 'MARCHA EIRL', tipoDocumento: 'RNC', paisDocumento: '214' },
    consignatario: { codigo: '131256767', nombre: 'MARCHA EIRL', tipoDocumento: 'RNC', paisDocumento: '214' },
    agenteAduanal: { codigo: '130339198', nombre: 'ARMESSAG, SRL', tipoDocumento: 'RNC', paisDocumento: '214' },
    suplidores: [{ codigo: '15562111622016', nombre: 'WISE GLOBAL MARKET CORP', nacionalidad: 'PANAMÁ', tipoDocumento: 'TID' }],
    contenedores: [],
    valores: { tasaCambio: 60.92, valorFobTotal: 38081, seguro: 234.98, flete: 8380, otros: 0, valorCifTotal: 46695.98 },
    regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
    pesoMercancia: { codigoMercancia: '', pesoBrutoKg: 13185.6, pesoNetoKg: 0 },
    informacionAdicional: { ...emptyInformacionAdicional(), cargoControlNo: '26199501040800966-0257-001' },
    partidas: productosMuestra.map((b, i) => withDerived({
      ...emptyPartida(),
      id: `m${i}`,
      codigoPartida: valor(b, 'HSCode'),
      descripcion: valor(b, 'ProductName'),
      cantidad: Number(valor(b, 'Qty')),
      unidad: 'UNIDADES',
      valorFob: Number(valor(b, 'FOBValue')) * Number(valor(b, 'Qty')),
      pesoKg: Number(valor(b, 'Weight')),
      paisOrigen: 'CHINA',
    })),
  };
  const nuestro = buildSigaImportXml([expediente], new Date(2026, 8, 3, 13, 17));

  /** Each block as [tag, text] pairs in document order. */
  const hojas = (xml: string, bloque: string) => [...xml.matchAll(new RegExp(`<${bloque}[^>]*>([\\s\\S]*?)</${bloque}>`, 'g'))].map((m) =>
    [...m[1].matchAll(/<([A-Za-z]+)\s*\/>|<([A-Za-z]+)>([^<]*)<\/\2>/g)].map((x) => [x[1] ?? x[2], x[3] ?? ''] as [string, string]));
  const cabecera = (xml: string) => hojas(xml.replace(/<ImpDeclaration(Supplier|Product|Container)>[\s\S]*?<\/ImpDeclaration\1>/g, ''), 'ImpDeclaration')[0];
  const igual = (a: string, b: string) => a === b || (a !== '' && b !== '' && !Number.isNaN(Number(a)) && Number(a) === Number(b));

  const comparar = (nuestros: [string, string][], suyos: [string, string][], ignorar: string[] = []) => {
    expect(nuestros.map(([t]) => t)).toEqual(suyos.map(([t]) => t));
    const distintos = suyos.filter(([t, v], i) => !ignorar.includes(t) && !igual(nuestros[i][1], v)).map(([t, v]) => `${t}: SIGA "${v}" / app "${nuestros.find((x) => x[0] === t)?.[1]}"`);
    expect(distintos).toEqual([]);
  };

  it('same root and unqualified declaration', () => {
    expect(nuestro).toContain('xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://aduanas.gob.do/XSD/ImportClearance/ImportDUA.xsd"');
    expect(muestra).toContain('<ImpDeclaration xmlns="">');
    expect(nuestro).toContain('<ImpDeclaration xmlns="">');
  });

  it('same header, element by element', () => {
    comparar(cabecera(nuestro), cabecera(muestra), ['Remark']);
  });

  it('same supplier', () => {
    comparar(hojas(nuestro, 'ImpDeclarationSupplier')[0], hojas(muestra, 'ImpDeclarationSupplier')[0]);
  });

  it('same 18 products, element by element', () => {
    const suyos = hojas(muestra, 'ImpDeclarationProduct');
    const nuestros = hojas(nuestro, 'ImpDeclarationProduct');
    expect(nuestros).toHaveLength(18);
    suyos.forEach((p, i) => comparar(nuestros[i], p));
  });
});
