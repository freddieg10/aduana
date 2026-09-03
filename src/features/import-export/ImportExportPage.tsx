import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Box, Button, Card, CardContent, Chip, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Paper, Stack,
} from '@mui/material';
import { Upload, Download, Description } from '@mui/icons-material';
import { DataGrid, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import { useExpedientesStore } from '../../store/expedientesStore';
import type { Expediente } from '../../types';
import { parseWorkbook, rowsToExpedientes, readFileAsArrayBuffer, type ParsedWorkbook } from '../../utils/excel';
import { buildFullXml, buildSigaXmlFiles, downloadTextFile } from '../../utils/xml';

const PREVIEW_ROWS = 20;

export default function ImportExportPage() {
  const { t } = useTranslation();
  const expedientes = useExpedientesStore((s) => s.expedientes);
  const bulkAdd = useExpedientesStore((s) => s.bulkAdd);
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [fileName, setFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [exportSuccess, setExportSuccess] = useState('');
  const [selectedIds, setSelectedIds] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError('');
    setImportSuccess(null);
    setFileName(file.name);
    try {
      const buf = await readFileAsArrayBuffer(file);
      const result = parseWorkbook(buf);
      if (result.rows.length === 0) {
        setImportError(t('importExport.noRows'));
        setParsed(null);
        return;
      }
      setParsed(result);
    } catch {
      setImportError(t('importExport.parseError'));
      setParsed(null);
    }
  };

  const pendingExpedientes = useMemo(() => (parsed ? rowsToExpedientes(parsed.rows) : []), [parsed]);

  const confirmImport = () => {
    if (!parsed) return;
    bulkAdd(pendingExpedientes);
    setImportSuccess(pendingExpedientes.length);
    setParsed(null);
    setFileName('');
  };

  const selectedExpedientes = () => expedientes.filter((e) => selectedIds.ids.has(e.id));
  const stamp = () => new Date().toISOString().slice(0, 10);

  const handleExportFull = () => {
    const toExport = selectedExpedientes();
    if (toExport.length === 0) return;
    downloadTextFile(buildFullXml(toExport), `expedientes_${stamp()}.xml`);
    flashExport(t('importExport.exportSuccess'));
  };

  const handleExportSiga = () => {
    const toExport = selectedExpedientes();
    if (toExport.length === 0) return;
    // SIGA has separate ImportDUA / ExportDUA schemas, so a mixed selection yields one file per tipo.
    for (const file of buildSigaXmlFiles(toExport)) {
      const root = file.tipo === 'importacion' ? 'ImportDUA' : 'ExportDUA';
      const single = toExport.filter((e) => e.tipoExpediente === file.tipo);
      const name = file.count === 1
        ? `${root}_${(single[0].declaracion.noDeclaracion || single[0].reference).replace(/[^\w-]+/g, '_')}.xml`
        : `${root}_${stamp()}.xml`;
      downloadTextFile(file.xml, name);
    }
    flashExport(t('importExport.exportSigaSuccess'));
  };

  const flashExport = (msg: string) => {
    setExportSuccess(msg);
    setTimeout(() => setExportSuccess(''), 3000);
  };

  const exportColumns: GridColDef<Expediente>[] = [
    { field: 'reference', headerName: t('expediente.reference'), flex: 1 },
    { field: 'importadorNombre', headerName: t('expediente.client'), flex: 1.5, valueGetter: (_v, row) => row.importador.nombre },
    { field: 'noDeclaracion', headerName: t('detail.noDeclaracion'), width: 170, valueGetter: (_v, row) => row.declaracion.noDeclaracion },
    { field: 'status', headerName: t('expediente.status'), width: 150, valueFormatter: (v: string) => t(`status.${v}`) },
    { field: 'partidas', headerName: t('detail.renglones'), width: 110, valueGetter: (_v, row) => row.partidas.length },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>{t('importExport.title')}</Typography>

      {/* IMPORT SECTION */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('importExport.importXlsx')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('importExport.importHint')}</Typography>

          {importError && <Alert severity="error" sx={{ mb: 2 }}>{importError}</Alert>}
          {importSuccess !== null && <Alert severity="success" sx={{ mb: 2 }}>{t('importExport.importSuccessCount', { count: importSuccess })}</Alert>}

          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleFileUpload} />
          <Button variant="outlined" startIcon={<Upload />} onClick={() => fileRef.current?.click()}>
            {t('importExport.uploadFile')}
          </Button>
          {fileName && <Chip icon={<Description />} label={fileName} sx={{ ml: 2 }} />}

          {parsed && (
            <Box sx={{ mt: 3 }}>
              <Stack direction="row" spacing={3} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2"><b>{t('importExport.sheets')}:</b> {parsed.sheets.join(', ')}</Typography>
                <Typography variant="body2"><b>{t('importExport.rowsFound')}:</b> {parsed.rows.length}</Typography>
                <Typography variant="body2"><b>{t('importExport.expedientesToCreate')}:</b> {pendingExpedientes.length}</Typography>
              </Stack>

              <Typography variant="subtitle2" gutterBottom>{t('importExport.recognizedColumns')}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {parsed.headers.map((h) => {
                  const key = parsed.mapping[h];
                  return (
                    <Chip
                      key={h}
                      size="small"
                      color={key ? 'success' : 'default'}
                      variant={key ? 'filled' : 'outlined'}
                      label={key ? `${h} → ${key}` : `${h} → ?`}
                    />
                  );
                })}
              </Box>
              {parsed.unmappedHeaders.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {t('importExport.unmappedColumns', { cols: parsed.unmappedHeaders.join(', ') })}
                </Alert>
              )}

              <Typography variant="subtitle1" gutterBottom>
                {t('importExport.preview')} ({Math.min(parsed.rows.length, PREVIEW_ROWS)} / {parsed.rows.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 420 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      {parsed.headers.map((h) => (
                        <TableCell key={h} sx={{ whiteSpace: 'nowrap', fontWeight: 700, color: parsed.mapping[h] ? 'text.primary' : 'text.disabled' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsed.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ color: 'text.secondary' }}>{row.sheet !== parsed.sheets[0] ? `${row.sheet}:` : ''}{row.rowNumber}</TableCell>
                        {parsed.headers.map((h) => {
                          const key = parsed.mapping[h];
                          const v = key ? row.fields[key] : row.extra[h];
                          return <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{v === undefined || v === null ? '' : String(v)}</TableCell>;
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={confirmImport} disabled={pendingExpedientes.length === 0}>
                  {t('importExport.confirmImport')} ({pendingExpedientes.length})
                </Button>
                <Button variant="text" onClick={() => { setParsed(null); setFileName(''); }}>{t('common.cancel')}</Button>
              </Box>
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

          {exportSuccess && <Alert severity="success" sx={{ mb: 2 }}>{exportSuccess}</Alert>}

          <DataGrid
            rows={expedientes}
            columns={exportColumns}
            autoHeight
            checkboxSelection
            onRowSelectionModelChange={(model) => setSelectedIds(model)}
            rowSelectionModel={selectedIds}
            pageSizeOptions={[10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="contained" startIcon={<Download />} onClick={handleExportFull} disabled={selectedIds.ids.size === 0}>
              {t('importExport.exportFullXml')} ({selectedIds.ids.size})
            </Button>
            <Button variant="contained" color="secondary" startIcon={<Download />} onClick={handleExportSiga} disabled={selectedIds.ids.size === 0}>
              {t('importExport.exportSigaXml')} ({selectedIds.ids.size})
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>{t('importExport.sigaNote')}</Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
