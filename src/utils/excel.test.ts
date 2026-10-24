import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { normalizeHeader, resolveHeader, parseWorkbook, rowsToExpedientes, parsePartidas, findAdministracionByName } from './excel';

function workbook(sheets: Record<string, unknown[][]>): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

describe('normalizeHeader / resolveHeader', () => {
  it('strips accents, spaces and punctuation', () => {
    expect(normalizeHeader('País de Procedencia')).toBe('paisdeprocedencia');
    expect(normalizeHeader(' Valor  FOB ')).toBe('valorfob');
    expect(normalizeHeader('Doc. Embarque')).toBe('docembarque');
  });

  it('maps common Spanish and camelCase headers to fields', () => {
    expect(resolveHeader('Referencia')).toBe('reference');
    expect(resolveHeader('reference')).toBe('reference');
    expect(resolveHeader('Código Importador')).toBe('importadorCodigo');
    expect(resolveHeader('Importador')).toBe('importadorNombre');
    expect(resolveHeader('País Origen')).toBe('paisOrigen');
    expect(resolveHeader('Partida')).toBe('codigoPartida');
    expect(resolveHeader('Valor FOB')).toBe('valorFob');
    expect(resolveHeader('Fecha de llegada')).toBe('eta');
    expect(resolveHeader('Tipo de despacho')).toBe('tipoDespacho');
    expect(resolveHeader('No. Contenedor')).toBe('contenedorNumero');
    expect(resolveHeader('Columna Rara')).toBeUndefined();
  });
});

describe('findAdministracionByName', () => {
  it('resolves full and short names', () => {
    expect(findAdministracionByName('ADMINISTRACION HAINA ORIENTAL')).toBe('10030');
    expect(findAdministracionByName('Haina Oriental')).toBe('10030');
    expect(findAdministracionByName('Adm. Puerto Multimodal Caucedo')).toBe('10150');
    expect(findAdministracionByName('')).toBeUndefined();
  });
});

describe('parseWorkbook', () => {
  it('reads every column of every sheet and reports unmapped headers', () => {
    const buf = workbook({
      Hoja1: [
        ['Referencia', 'Importador', 'Partida', 'Descripción', 'Cantidad', 'Valor FOB', 'Nota Interna'],
        ['DEC-1', 'BRAVO', '4818.30.00', 'Servilletas', 10, 100, 'x'],
        ['DEC-1', 'BRAVO', '4818.30.01', 'Servilletas rojas', 5, 60, 'y'],
      ],
      Hoja2: [
        ['Referencia', 'Importador', 'Partida', 'Descripción', 'Cantidad', 'Valor FOB'],
        ['DEC-2', 'TEXTILES', '5208.11.01', 'Telas', 1, 12],
      ],
    });
    const parsed = parseWorkbook(buf);
    expect(parsed.sheets).toEqual(['Hoja1', 'Hoja2']);
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.headers).toContain('Nota Interna');
    expect(parsed.unmappedHeaders).toEqual(['Nota Interna']);
    expect(parsed.mapping['Valor FOB']).toBe('valorFob');
    expect(parsed.rows[0].fields.reference).toBe('DEC-1');
    expect(parsed.rows[0].fields.cantidad).toBe(10);
    expect(parsed.rows[0].extra['Nota Interna']).toBe('x');
    expect(parsed.rows[2].sheet).toBe('Hoja2');
  });

  it('coerces dates, numbers with symbols and booleans', () => {
    const buf = workbook({
      S: [
        ['Referencia', 'Fecha de llegada', 'Valor FOB', 'Orgánico', 'Partida'],
        ['R1', new Date(Date.UTC(2026, 3, 25, 12)), '$1,234.50', 'Sí', '01'],
      ],
    });
    const [row] = parseWorkbook(buf).rows;
    expect(row.fields.eta).toBe('2026-04-25');
    expect(row.fields.valorFob).toBe(1234.5);
    expect(row.fields.organico).toBe(true);
  });

  it('skips fully empty rows', () => {
    const buf = workbook({ S: [['Referencia', 'Partida'], ['R1', '1'], ['', ''], ['R2', '2']] });
    expect(parseWorkbook(buf).rows).toHaveLength(2);
  });
});

describe('rowsToExpedientes', () => {
  it('groups rows by reference and fills catalog names from codes', () => {
    const buf = workbook({
      S: [
        ['Referencia', 'Código Importador', 'Importador', 'Cód. País Procedencia', 'Administración', 'Doc. Embarque', 'Partida', 'Descripción', 'Cantidad', 'Valor FOB', 'Suplidor', 'Código Suplidor', 'No. Contenedor', 'Flete'],
        ['DEC-1', '8115', 'BRAVO S A', '724', 'Haina Oriental', 'BL-1', '4818.30.00', 'A', 10, 100, 'Sup Uno', 'S1', 'CONT-1', 50],
        ['DEC-1', '8115', 'BRAVO S A', '724', 'Haina Oriental', 'BL-1', '4818.30.01', 'B', 5, 60, 'Sup Uno', 'S1', 'CONT-1', 50],
        ['DEC-2', '2040', 'TEXTILES', '', '', 'BL-2', '5208.11.01', 'C', 1, 12, '', '', '', 0],
      ],
    });
    const exps = rowsToExpedientes(parseWorkbook(buf).rows);
    expect(exps).toHaveLength(2);

    const [a, b] = exps;
    expect(a.reference).toBe('DEC-1');
    expect(a.partidas).toHaveLength(2);
    expect(a.partidas[0].unitario).toBe(10);
    expect(a.declaracion.paisProcedenciaCodigo).toBe('724');
    expect(a.declaracion.paisProcedenciaNombre).toBe('ESPAÑA');
    expect(a.declaracion.administracionCodigo).toBe('10030');
    expect(a.declaracion.administracionNombre).toBe('ADMINISTRACION HAINA ORIENTAL');
    expect(a.consignatario).toEqual(a.importador);
    expect(a.suplidores).toEqual([{ codigo: 'S1', nombre: 'Sup Uno', nacionalidad: '' }]);
    expect(a.contenedores).toHaveLength(1);
    expect(a.valores.valorFobTotal).toBe(160);
    expect(a.valores.flete).toBe(50);
    expect(a.valores.valorCifTotal).toBe(210);
    expect(a.checklist).toHaveLength(8);
    expect(a.agenteAduanal.nombre).toBe('ARMESSAG, SRL');

    expect(b.reference).toBe('DEC-2');
    expect(b.partidas).toHaveLength(1);
    expect(b.regimenAduanero.codigo).toBe('1');
  });

  it('turns a notes column into observations and recognises status / tipo', () => {
    const buf = workbook({
      S: [
        ['Referencia', 'Estado', 'Tipo', 'Observaciones', 'Partida'],
        ['R', 'Pendiente Info', 'Exportación', 'falta permiso', '1'],
      ],
    });
    const [e] = rowsToExpedientes(parseWorkbook(buf).rows);
    expect(e.status).toBe('pendiente_info');
    expect(e.tipoExpediente).toBe('exportacion');
    expect(e.observaciones).toHaveLength(1);
    expect(e.observaciones[0].texto).toBe('falta permiso');
  });
});

describe('parsePartidas', () => {
  it('returns only rows that look like line items', () => {
    const buf = workbook({ S: [['Partida', 'Descripción', 'Cantidad', 'Valor FOB', 'Extra'], ['1', 'x', 2, 10, 'e'], ['', '', '', '', '']] });
    const { partidas, unmappedHeaders } = parsePartidas(buf);
    expect(partidas).toHaveLength(1);
    expect(partidas[0].unitario).toBe(5);
    expect(unmappedHeaders).toEqual(['Extra']);
  });

  /* Everything behind the renglón's eye icon, as a client sheet would title it. */
  it('imports the detail fields, not just the grid columns', () => {
    const buf = workbook({ S: [
      ['Partida', 'Descripción', 'Cantidad', 'Unidad', 'Valor FOB', 'Marca', 'Modelo', 'Año', 'Peso', 'Serial',
        'Tipo de Vehículo', 'Chasis', 'Color', 'Motor', 'Cilindraje',
        'Certificado de Origen', 'No. Certificado Origen', 'Temporal', 'Orgánico', 'Grado Alcohólico', 'Precio Venta', 'Descripción Adicional'],
      ['8703.23.91', 'JEEP GRAND CHEROKEE', 1, 'UND', '28,500.00', 'JEEP', 'GRAND CHEROKEE', 2024, 2100, 'SN-1',
        'JEEPETA', '1C4RJFAG5FC123456', 'NEGRO', 'V6-3.6', 3600,
        'Sí', 'CO-2026-77', 'NO', 'NO', '', '', 'Usado, en buen estado'],
      ['2208.30.20', 'WHISKY', 120, 'Litros', 480, '', '', '', '', '',
        '', '', '', '', '',
        'CO-99', '', 'X', 'no', '40%', 'RD$ 1,250.50', ''],
    ] });
    const { partidas, unmappedHeaders } = parsePartidas(buf);
    expect(unmappedHeaders).toEqual([]);
    expect(partidas[0]).toMatchObject({
      unidad: '1', valorFob: 28_500, marca: 'JEEP', modelo: 'GRAND CHEROKEE', anio: '2024', pesoKg: 2100, serial: 'SN-1',
      vehiculo: { tipo: 'JEEPETA', chasis: '1C4RJFAG5FC123456', color: 'NEGRO', motor: 'V6-3.6', cc: 3600 },
      certificadoOrigen: true, certificadoOrigenNo: 'CO-2026-77', temporal: false, organico: false,
      descripcionAdicional: 'Usado, en buen estado',
    });
    // A certificate number under "Certificado de Origen" means yes, with that number.
    expect(partidas[1]).toMatchObject({
      unidad: '10', certificadoOrigen: true, certificadoOrigenNo: 'CO-99', temporal: true, organico: false,
      gradoAlcohol: 40, precioVentaMenor: 1250.5,
    });
  });

  it('a "NO" in a yes/no column is no', () => {
    const buf = workbook({ S: [['Partida', 'Descripción', 'Orgánico'], ['0101.21.00', 'caballo', 'NO'], ['0101.21.00', 'caballo', 'SI']] });
    expect(parsePartidas(buf).partidas.map((p) => p.organico)).toEqual([false, true]);
  });
});
