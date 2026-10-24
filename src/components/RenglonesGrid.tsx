import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Add, ContentCopy, Delete, Upload, Visibility, WarningAmber } from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { Partida } from '../types';
import { UNIDADES } from '../data/catalogos';
import { COUNTRIES } from '../data/countries';
import { exigeArticuloRegistrado } from '../data/subpartidasNoTemporales';
import { emptyPartida, tieneDetalle, withDerived } from '../utils/partida';
import { parsePartidas, readFileAsArrayBuffer } from '../utils/excel';
import PartidaDetailDialog from './PartidaDetailDialog';

interface Props {
  partidas: Partida[];
  onChange: (partidas: Partida[]) => void;
}

/** The subpartida does not admit temporary products and the line has no registered code yet. */
const faltaCodigoProducto = (p: Partida) => exigeArticuloRegistrado(p.codigoPartida) && !p.codigoProducto.trim();

/** Editable numbers show 0 as an empty cell, so there is no default 0 to delete before typing. */
const numeroEditable = (campo: 'cantidad' | 'valorFob'): Partial<GridColDef<Partida>> => ({
  type: 'number',
  editable: true,
  valueGetter: (v: number) => v || null,
  valueSetter: (v: number | null, row: Partida) => ({ ...row, [campo]: Number(v) || 0 }),
});

/**
 * The renglones of an expediente as a data grid: columns can be resized and filtered, cells
 * are edited in place (double click or Enter), and the per-line detail opens from the eye.
 */
export default function RenglonesGrid({ partidas, onChange }: Props) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [importWarning, setImportWarning] = useState('');

  const reemplazar = (p: Partida) => onChange(partidas.map((x) => (x.id === p.id ? withDerived(p) : x)));
  const clonar = (id: string) => {
    const i = partidas.findIndex((x) => x.id === id);
    const next = [...partidas];
    next.splice(i + 1, 0, { ...partidas[i], id: crypto.randomUUID() });
    onChange(next);
  };
  const borrar = (id: string) => onChange(partidas.filter((x) => x.id !== id));

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError('');
    setImportWarning('');
    try {
      const { partidas: nuevas, unmappedHeaders } = parsePartidas(await readFileAsArrayBuffer(file));
      onChange([...partidas, ...nuevas]);
      if (unmappedHeaders.length) setImportWarning(t('detail.unmappedColumns', { cols: unmappedHeaders.join(', ') }));
    } catch {
      setImportError(t('importExport.parseError'));
    }
  };

  const columnas = useMemo<GridColDef<Partida>[]>(() => [
    // First, so the warning and the eye stay in view however wide the other columns get.
    {
      field: 'acciones', headerName: '', width: 140, sortable: false, filterable: false, disableColumnMenu: true, resizable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, height: '100%' }}>
          {/* The slot is kept on every row so the eye lines up whether or not the warning shows. */}
          {faltaCodigoProducto(row) ? (
            <Tooltip title={t('detail.renglonRequiereCodigo')}>
              <WarningAmber fontSize="small" color="warning" aria-label={t('detail.renglonRequiereCodigo')} sx={{ mx: 0.5 }} />
            </Tooltip>
          ) : <Box sx={{ width: 20, mx: 0.5, flexShrink: 0 }} />}
          <IconButton size="small" color={tieneDetalle(row) ? 'primary' : 'default'} onClick={() => setDetalleId(row.id)} title={t('detail.detalleRenglon')}>
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => clonar(row.id)} title={t('detail.cloneRenglon')}><ContentCopy fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => borrar(row.id)} title={t('expediente.delete')}><Delete fontSize="small" /></IconButton>
        </Box>
      ),
    },
    { field: 'codigoPartida', headerName: t('detail.codigoPartida'), width: 120, editable: true },
    { field: 'codigoProducto', headerName: t('detail.codigoProducto'), width: 130, editable: true },
    { field: 'descripcion', headerName: t('detail.descripcion'), flex: 1, minWidth: 220, editable: true },
    { field: 'organico', headerName: t('detail.organico'), type: 'boolean', width: 90, editable: true },
    { field: 'cantidad', headerName: t('detail.cantidad'), width: 110, ...numeroEditable('cantidad') },
    {
      field: 'unidad', headerName: t('detail.unidad'), width: 160, editable: true, type: 'singleSelect',
      valueOptions: UNIDADES.map((u) => ({ value: u.codigo, label: `${u.nombre} (${u.codigo})` })),
    },
    {
      field: 'paisOrigen', headerName: t('detail.paisOrigen'), width: 150, editable: true, type: 'singleSelect',
      valueOptions: COUNTRIES.map((c) => c.nombre),
    },
    { field: 'valorFob', headerName: t('detail.valorFob'), width: 120, ...numeroEditable('valorFob') },
    {
      field: 'unitario', headerName: t('detail.unitario'), type: 'number', width: 110, description: t('detail.unitarioAuto'),
      valueFormatter: (v: number) => (v ? v.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : ''),
    },
    { field: 'facturaDva', headerName: t('detail.facturaDva'), width: 110, editable: true },
    // clonar/borrar close over the current partidas, so the columns follow them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, partidas]);

  const detalle = partidas.find((p) => p.id === detalleId);
  const sinCodigo = partidas.filter(faltaCodigoProducto).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('detail.renglones')} ({partidas.length})</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={importar} />
        <Button variant="outlined" size="small" startIcon={<Upload />} onClick={() => fileRef.current?.click()}>{t('detail.importRenglonesXlsx')}</Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{t('detail.renglonesHint')}</Typography>
      {importError && <Alert severity="error" sx={{ mb: 2 }}>{importError}</Alert>}
      {importWarning && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setImportWarning('')}>{importWarning}</Alert>}
      {sinCodigo > 0 && <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}>{t('detail.renglonesSinCodigo', { count: sinCodigo })}</Alert>}

      <DataGrid
        rows={partidas}
        columns={columnas}
        autoHeight
        density="compact"
        showToolbar
        disableRowSelectionOnClick
        processRowUpdate={(nuevo) => { const p = withDerived(nuevo); reemplazar(p); return p; }}
        getRowClassName={({ row }) => (faltaCodigoProducto(row) ? 'renglon-sin-codigo' : '')}
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
        sx={{
          mb: 2,
          '& .renglon-sin-codigo, & .renglon-sin-codigo:hover': { bgcolor: (theme) => alpha(theme.palette.warning.main, 0.2) },
          '& .renglon-sin-codigo.Mui-selected': { bgcolor: (theme) => alpha(theme.palette.warning.main, 0.3) },
        }}
      />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button size="small" startIcon={<Add />} onClick={() => onChange([...partidas, emptyPartida()])}>{t('detail.addRenglon')}</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          FOB Total: ${partidas.reduce((s, p) => s + p.valorFob, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Typography>
      </Box>

      {detalle && (
        <PartidaDetailDialog
          key={detalle.id}
          partida={detalle}
          onClose={() => setDetalleId(null)}
          onSave={(p) => { reemplazar(p); setDetalleId(null); }}
        />
      )}
    </Box>
  );
}
