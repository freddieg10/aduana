import { describe, it, expect } from 'vitest';
import { buildFullXml, buildSigaImportXml, buildSigaExportXml, buildSigaXmlFiles, escapeXml, SIGA_NS_IMPORT, SIGA_NS_EXPORT } from './xml';
import { ExpedienteStatus } from '../types';
import type { Expediente } from '../types';
import { emptyPartida, withDerived } from './partida';
import { emptyInformacionAdicional } from '../store/expedientesStore';

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
  agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
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
    expect(xml).toContain(`<ImportDUA xmlns="${SIGA_NS_IMPORT}">`);
    expect(xml.match(/<ImpDeclaration>/g)).toHaveLength(1);
  });

  it('emits the header elements in schema order', () => {
    const header = ['DeclarationDate', 'ClearanceType', 'AreaCode', 'FormNo', 'BLNo', 'ConsigneeCode', 'ConsigneeName', 'ConsigneeNationality', 'CommercialInvoiceNo', 'DestinationLocationCode', 'EntryPort', 'DepartureCountryCode', 'TransportCompanyCode', 'TransportNationality', 'TransportMethod', 'EntryPlanDate', 'EntryDate', 'ImporterCode', 'ImporterName', 'ImporterNationality', 'BrokerCompanyCode', 'DeclarantCode', 'DeclarantName', 'DeclarantNationality', 'RegimenCode', 'AgreementCode', 'TotalFOB', 'InsuranceValue', 'FreightValue', 'OtherValue', 'TotalCIF', 'TotalWeight', 'NetWeight', 'Remark', 'ImpDeclarationSupplier'];
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
    expect(xml).toContain('<TotalCIF>103.00</TotalCIF>');
    expect(xml).toContain('<ForeignSupplierNationality>724</ForeignSupplierNationality>');
    expect(xml).toContain('<HSCode>4818.30.00</HSCode>');
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
    expect(xml).toContain('<TransportCompanyCode>MAERSK LINE</TransportCompanyCode>');
    expect(xml).toContain('<TransportNationality>208</TransportNationality>');
    expect(xml).toContain('<TransportMethod>MARITIMO</TransportMethod>');
    expect(xml).toContain('<ManifestNo>MAN-1</ManifestNo>');
    expect(xml).toContain('<CargoControlNo>CC-1</CargoControlNo>');
    expect(xml).toContain('<EntryDate>2026-02-27T00:00:00</EntryDate>');   // actual arrival, not the ETA
  });

  it('still emits schema-required elements the app does not track, empty', () => {
    expect(xml).toContain('<AgreementCode></AgreementCode>');
  });

  it('does not leak app-only concepts', () => {
    expect(xml).not.toContain('checklist');
    expect(xml).not.toContain('observac');
  });
});

describe('buildSigaExportXml (ExportDUA.xsd)', () => {
  const xml = buildSigaExportXml([exportSample], NOW);

  it('uses the ExportDUA root and maps exporter/buyer', () => {
    expect(xml).toContain(`<ExportDUA xmlns="${SIGA_NS_EXPORT}">`);
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
