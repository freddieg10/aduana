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
});
