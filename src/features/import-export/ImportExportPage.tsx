import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Card, CardContent, Typography, Alert,
  Table, TableBody, TableCell, TableHead, TableRow, Divider,
} from '@mui/material';
import { Upload, Download } from '@mui/icons-material';
import { DataGrid, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { useExpedientesStore, computeProgress } from '../../store/expedientesStore';
import type { Expediente } from '../../types';

/* ---------- parsed row from XLSX ---------- */
interface ParsedRow {
  reference: string;
  importadorCodigo: string;
  importadorNombre: string;
  docEmbarque: string;
  paisOrigen: string;
  codigoPartida: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  valorFob: number;
}

/* ---------- XML builder ---------- */
function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildXml(expedientes: Expediente[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<expedientes>\n';
  for (const exp of expedientes) {
    xml += `  <expediente reference="${escapeXml(exp.reference)}" status="${exp.status}">\n`;
    xml += `    <declaracion idSecuencia="${escapeXml(exp.declaracion.idSecuencia)}" noDeclaracion="${escapeXml(exp.declaracion.noDeclaracion)}" tipoDespacho="${escapeXml(exp.declaracion.tipoDespacho)}" eta="${exp.declaracion.eta}" docEmbarque="${escapeXml(exp.declaracion.docEmbarque)}" puertoEntrada="${escapeXml(exp.declaracion.puertoEntrada)}" paisProcedencia="${escapeXml(exp.declaracion.paisProcedenciaNombre)}" />\n`;
    xml += `    <importador codigo="${escapeXml(exp.importador.codigo)}" nombre="${escapeXml(exp.importador.nombre)}" />\n`;
    xml += `    <agenteAduanal codigo="${escapeXml(exp.agenteAduanal.codigo)}" nombre="${escapeXml(exp.agenteAduanal.nombre)}" />\n`;
    xml += `    <valores tasaCambio="${exp.valores.tasaCambio}" valorFobTotal="${exp.valores.valorFobTotal}" seguro="${exp.valores.seguro}" flete="${exp.valores.flete}" otros="${exp.valores.otros}" valorCifTotal="${exp.valores.valorCifTotal}" />\n`;
    xml += `    <regimenAduanero codigo="${exp.regimenAduanero.codigo}" nombre="${escapeXml(exp.regimenAduanero.nombre)}" />\n`;
    xml += `    <partidas>\n`;
    for (const p of exp.partidas) {
      xml += `      <partida codigo="${escapeXml(p.codigoPartida)}" descripcion="${escapeXml(p.descripcion)}" cantidad="${p.cantidad}" unidad="${escapeXml(p.unidad)}" paisOrigen="${escapeXml(p.paisOrigen)}" valorFob="${p.valorFob}" unitario="${p.unitario}" factura="${escapeXml(p.facturaDva)}" />\n`;
    }
    xml += `    </partidas>\n`;
    xml += `    <checklist progress="${computeProgress(exp.checklist)}%">\n`;
    for (const c of exp.checklist) {
      xml += `      <item label="${escapeXml(c.label)}" completed="${c.completed}" />\n`;
    }
    xml += `    </checklist>\n`;
    if (exp.notes) xml += `    <notes>${escapeXml(exp.notes)}</notes>\n`;
    xml += `  </expediente>\n`;
  }
  xml += '</expedientes>';
  return xml;
}

/* ---------- Component ---------- */
export default function ImportExportPage() {
  const { t } = useTranslation();
  const expedientes = useExpedientesStore((s) => s.expedientes);
  const bulkAdd = useExpedientesStore((s) => s.bulkAdd);
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [selectedIds, setSelectedIds] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        const rows: ParsedRow[] = data.map((row) => ({
          reference: String(row['reference'] || row['Referencia'] || ''),
          importadorCodigo: String(row['importadorCodigo'] || row['Código Importador'] || ''),
          importadorNombre: String(row['importadorNombre'] || row['Importador'] || ''),
          docEmbarque: String(row['docEmbarque'] || row['Doc Embarque'] || ''),
          paisOrigen: String(row['paisOrigen'] || row['País Origen'] || ''),
          codigoPartida: String(row['codigoPartida'] || row['Partida'] || ''),
          descripcion: String(row['descripcion'] || row['Descripción'] || ''),
          cantidad: Number(row['cantidad'] || row['Cantidad'] || 0),
          unidad: String(row['unidad'] || row['Unidad'] || 'KILOGRAMOS'),
          valorFob: Number(row['valorFob'] || row['Valor FOB'] || 0),
        }));
        setParsedRows(rows);
      } catch {
        setImportError(t('importExport.parseError'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = () => {
    const grouped = new Map<string, ParsedRow[]>();
    parsedRows.forEach((r) => {
      const key = r.reference || crypto.randomUUID();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    });

    const DEFAULT_CHECKLIST = [
      'Documentos de importación recibidos',
      'Factura comercial verificada',
      'BL / Doc. Embarque recibido y revisado',
      'Clasificación arancelaria asignada',
      'Permisos y certificados verificados',
      'Declaración aduanera generada',
      'Pago de impuestos realizado',
      'Despacho aduanal completado',
    ];

    const newExps = Array.from(grouped.entries()).map(([ref, rows]) => {
      const first = rows[0];
      return {
        reference: ref,
        tipoExpediente: 'importacion' as const,
        status: 'pending' as const,
        checklist: DEFAULT_CHECKLIST.map((label) => ({ id: crypto.randomUUID(), label, completed: false, completedAt: null })),
        declaracion: {
          idSecuencia: '', eta: '', tipoDespacho: '',
          administracionCodigo: '', administracionNombre: '',
          noDeclaracion: ref, docEmbarque: first.docEmbarque,
          depositoDestino: '', puertoEntrada: '',
          paisProcedenciaCodigo: '', paisProcedenciaNombre: first.paisOrigen,
          facturaComercialNo: '',
        },
        importador: { codigo: first.importadorCodigo, nombre: first.importadorNombre },
        agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
        consignatario: { codigo: first.importadorCodigo, nombre: first.importadorNombre },
        compradorExportacion: { codigo: '0', nombre: '' },
        suplidores: [],
        documentos: [],
        contenedores: [],
        tipoCarga: 'contenedores' as const,
        valores: {
          tasaCambio: 65,
          valorFobTotal: rows.reduce((s, r) => s + r.valorFob, 0),
          seguro: 0, flete: 0, otros: 0,
          valorCifTotal: rows.reduce((s, r) => s + r.valorFob, 0),
        },
        regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
        pesoMercancia: { codigoMercancia: '', pesoBrutoKg: 0, pesoNetoKg: 0 },
        partidas: rows.map((r) => ({
          id: crypto.randomUUID(),
          codigoPartida: r.codigoPartida,
          descripcion: r.descripcion,
          organico: false,
          cantidad: r.cantidad,
          unidad: r.unidad,
          paisOrigen: r.paisOrigen,
          valorFob: r.valorFob,
          unitario: r.cantidad > 0 ? r.valorFob / r.cantidad : 0,
          facturaDva: '',
        })),
        notes: '',
        assignedUserId: '2',
      };
    });

    bulkAdd(newExps);
    setParsedRows([]);
    setImportSuccess(true);
  };

  const handleExport = () => {
    const toExport = expedientes.filter((e) => selectedIds.ids.has(e.id));
    if (toExport.length === 0) return;
    const xml = buildXml(toExport);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expedientes_${new Date().toISOString().slice(0, 10)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const exportColumns: GridColDef[] = [
    { field: 'reference', headerName: t('expediente.reference'), flex: 1 },
    {
      field: 'importadorNombre', headerName: t('expediente.client'), flex: 1.5,
      valueGetter: (_value, row) => row.importador.nombre,
    },
    { field: 'status', headerName: t('expediente.status'), width: 120 },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>{t('importExport.title')}</Typography>

      {/* IMPORT SECTION */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('importExport.importXlsx')}</Typography>

          {importError && <Alert severity="error" sx={{ mb: 2 }}>{importError}</Alert>}
          {importSuccess && <Alert severity="success" sx={{ mb: 2 }}>{t('importExport.importSuccess')}</Alert>}

          <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileUpload} />
          <Button variant="outlined" startIcon={<Upload />} onClick={() => fileRef.current?.click()}>
            {t('importExport.uploadFile')}
          </Button>

          {parsedRows.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>{t('importExport.preview')} ({parsedRows.length} filas)</Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Referencia</TableCell>
                    <TableCell>Importador</TableCell>
                    <TableCell>Doc. Embarque</TableCell>
                    <TableCell>Partida</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Valor FOB</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedRows.slice(0, 20).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.reference}</TableCell>
                      <TableCell>{row.importadorNombre}</TableCell>
                      <TableCell>{row.docEmbarque}</TableCell>
                      <TableCell>{row.codigoPartida}</TableCell>
                      <TableCell>{row.descripcion}</TableCell>
                      <TableCell align="right">{row.cantidad}</TableCell>
                      <TableCell align="right">{row.valorFob}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="contained" onClick={confirmImport}>{t('importExport.confirmImport')}</Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ mb: 4 }} />

      {/* EXPORT SECTION */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('importExport.exportXml')}</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>{t('importExport.selectExpedientes')}</Typography>

          {exportSuccess && <Alert severity="success" sx={{ mb: 2 }}>{t('importExport.exportSuccess')}</Alert>}

          <DataGrid
            rows={expedientes}
            columns={exportColumns}
            autoHeight
            checkboxSelection
            onRowSelectionModelChange={(model) => setSelectedIds(model)}
            rowSelectionModel={selectedIds}
            pageSizeOptions={[10]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            sx={{ mb: 2 }}
          />

          <Button variant="contained" startIcon={<Download />} onClick={handleExport} disabled={selectedIds.ids.size === 0}>
            {t('importExport.exportSelected')} ({selectedIds.ids.size})
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
