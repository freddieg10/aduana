import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Autocomplete, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, IconButton, MenuItem, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useRelacionadosStore } from '../../store/relacionadosStore';
import type { Cliente, SuplidorMaestro } from '../../types';
import { COUNTRIES, findCountryByCode } from '../../data/countries';
import { PAIS_RD, TIPOS_DOCUMENTO, TIPOS_ENTIDAD } from '../../data/catalogos';

type ClienteDraft = Omit<Cliente, 'id'>;
type SuplidorDraft = Omit<SuplidorMaestro, 'id'>;

/** Mirrors SIGA's "Buscar Información de Importador": tipo, documento, nombre and país are required. */
const emptyCliente = (): ClienteDraft => ({
  tipo: 'Empresa Importadora', tipoDocumento: 'RNC', documento: '', nombre: '',
  email: '', calle: '', ciudad: '', telefono: '', zona: '', fax: '', pais: PAIS_RD,
});

const emptySuplidor = (): SuplidorDraft => ({ codigo: '', nombre: '', tid: '', direccion: '', telefono: '', fax: '', pais: '' });

function CountrySelect({ value, onChange, label, required }: { value: string; onChange: (codigo: string) => void; label: string; required?: boolean }) {
  return (
    <Autocomplete
      options={COUNTRIES}
      getOptionLabel={(c) => c.nombre}
      isOptionEqualToValue={(a, b) => a.codigo === b.codigo}
      value={findCountryByCode(value) ?? null}
      onChange={(_, c) => onChange(c?.codigo ?? '')}
      renderInput={(params) => <TextField {...params} required={required} label={label} />}
    />
  );
}

export default function RelacionadosPage() {
  const { t } = useTranslation();
  const {
    clientes, suplidores,
    addCliente, updateCliente, removeCliente, documentoTaken,
    addSuplidor, updateSuplidor, removeSuplidor,
  } = useRelacionadosStore();

  const [tab, setTab] = useState(0);

  /* Cliente dialog */
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteDraft, setClienteDraft] = useState<ClienteDraft>(emptyCliente());

  /* Suplidor dialog */
  const [suplidorOpen, setSuplidorOpen] = useState(false);
  const [suplidorId, setSuplidorId] = useState<string | null>(null);
  const [suplidorDraft, setSuplidorDraft] = useState<SuplidorDraft>(emptySuplidor());

  /* Delete confirm */
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'cliente' | 'suplidor'; id: string; nombre: string } | null>(null);

  const openCliente = (c?: Cliente) => {
    setClienteId(c?.id ?? null);
    setClienteDraft(c
      ? { tipo: c.tipo, tipoDocumento: c.tipoDocumento, documento: c.documento, nombre: c.nombre, email: c.email, calle: c.calle, ciudad: c.ciudad, telefono: c.telefono, zona: c.zona, fax: c.fax, pais: c.pais }
      : emptyCliente());
    setClienteOpen(true);
  };

  /* The key is (tipo de documento, documento): block a pair another cliente already uses. */
  const documentoDuplicado = documentoTaken(clienteDraft.tipoDocumento, clienteDraft.documento, clienteId ?? undefined);
  const clienteValido = Boolean(clienteDraft.tipo && clienteDraft.documento.trim() && clienteDraft.nombre.trim() && clienteDraft.pais) && !documentoDuplicado;

  const saveCliente = () => {
    if (!clienteValido) return;
    const draft = { ...clienteDraft, documento: clienteDraft.documento.trim() };
    if (clienteId) updateCliente(clienteId, draft); else addCliente(draft);
    setClienteOpen(false);
  };

  const openSuplidor = (s?: SuplidorMaestro) => {
    setSuplidorId(s?.id ?? null);
    setSuplidorDraft(s ? { codigo: s.codigo, nombre: s.nombre, tid: s.tid, direccion: s.direccion, telefono: s.telefono, fax: s.fax, pais: s.pais } : emptySuplidor());
    setSuplidorOpen(true);
  };
  const saveSuplidor = () => {
    if (suplidorId) updateSuplidor(suplidorId, suplidorDraft); else addSuplidor(suplidorDraft);
    setSuplidorOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'cliente') removeCliente(deleteTarget.id); else removeSuplidor(deleteTarget.id);
    setDeleteTarget(null);
  };

  const paisCol = <T extends { pais: string }>(): GridColDef<T> => ({
    field: 'pais', headerName: t('relacionados.paisOrigen'), width: 160,
    valueGetter: (_v, row) => findCountryByCode(row.pais)?.nombre ?? row.pais,
  });

  const clienteColumns: GridColDef<Cliente>[] = [
    { field: 'tipoDocumento', headerName: t('relacionados.tipoDocumento'), width: 110 },
    { field: 'documento', headerName: t('relacionados.documento'), width: 150 },
    { field: 'nombre', headerName: t('relacionados.nombre'), flex: 1.5, minWidth: 200 },
    { field: 'tipo', headerName: t('relacionados.tipo'), width: 190 },
    { field: 'ciudad', headerName: t('relacionados.ciudad'), width: 150 },
    { field: 'telefono', headerName: t('relacionados.telefono'), width: 140 },
    paisCol<Cliente>(),
    {
      field: 'actions', headerName: t('common.actions'), width: 110, sortable: false, filterable: false, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <Box>
          <IconButton size="small" onClick={() => openCliente(p.row)}><Edit fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => setDeleteTarget({ kind: 'cliente', id: p.row.id, nombre: p.row.nombre })}><Delete fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  const suplidorColumns: GridColDef<SuplidorMaestro>[] = [
    { field: 'codigo', headerName: t('relacionados.codigo'), width: 100 },
    { field: 'nombre', headerName: t('relacionados.nombre'), flex: 1.5, minWidth: 200 },
    { field: 'tid', headerName: 'TID', width: 160 },
    { field: 'direccion', headerName: t('relacionados.direccion'), flex: 1.5, minWidth: 180 },
    { field: 'telefono', headerName: t('relacionados.telefono'), width: 150 },
    { field: 'fax', headerName: 'Fax', width: 150 },
    paisCol<SuplidorMaestro>(),
    {
      field: 'actions', headerName: t('common.actions'), width: 110, sortable: false, filterable: false, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <Box>
          <IconButton size="small" onClick={() => openSuplidor(p.row)}><Edit fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => setDeleteTarget({ kind: 'suplidor', id: p.row.id, nombre: p.row.nombre })}><Delete fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  const gridSx = {
    border: 'none',
    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'text.secondary' },
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>{t('relacionados.title')}</Typography>
        {tab === 0
          ? <Button variant="contained" startIcon={<Add />} onClick={() => openCliente()}>{t('relacionados.addCliente')}</Button>
          : <Button variant="contained" startIcon={<Add />} onClick={() => openSuplidor()}>{t('relacionados.addSuplidor')}</Button>}
      </Box>

      <Box sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`${t('relacionados.clientes')} (${clientes.length})`} />
          <Tab label={`${t('relacionados.suplidores')} (${suplidores.length})`} />
        </Tabs>
      </Box>

      <Card><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {tab === 0 ? (
          <DataGrid rows={clientes} columns={clienteColumns} autoHeight disableRowSelectionOnClick pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} sx={gridSx} />
        ) : (
          <DataGrid rows={suplidores} columns={suplidorColumns} autoHeight disableRowSelectionOnClick pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} sx={gridSx} />
        )}
      </CardContent></Card>

      {/* Cliente dialog — same fields and order as SIGA's importer form */}
      <Dialog open={clienteOpen} onClose={() => setClienteOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{clienteId ? t('relacionados.editCliente') : t('relacionados.addCliente')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth required label={t('relacionados.tipo')} value={clienteDraft.tipo} onChange={(e) => setClienteDraft({ ...clienteDraft, tipo: e.target.value as Cliente['tipo'] })}>
                {TIPOS_ENTIDAD.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} />

            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField select fullWidth required label={t('relacionados.tipoDocumento')} value={clienteDraft.tipoDocumento} onChange={(e) => setClienteDraft({ ...clienteDraft, tipoDocumento: e.target.value as Cliente['tipoDocumento'] })}>
                {TIPOS_DOCUMENTO.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 9 }}>
              <TextField
                fullWidth required label={t('relacionados.documento')}
                value={clienteDraft.documento}
                onChange={(e) => setClienteDraft({ ...clienteDraft, documento: e.target.value })}
                error={documentoDuplicado}
                helperText={documentoDuplicado ? t('relacionados.documentoDuplicado') : t('relacionados.documentoHint')}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth required label={t('relacionados.nombre')} value={clienteDraft.nombre} onChange={(e) => setClienteDraft({ ...clienteDraft, nombre: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth type="email" label={t('relacionados.email')} value={clienteDraft.email} onChange={(e) => setClienteDraft({ ...clienteDraft, email: e.target.value })} /></Grid>

            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('relacionados.calle')} value={clienteDraft.calle} onChange={(e) => setClienteDraft({ ...clienteDraft, calle: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('relacionados.ciudad')} value={clienteDraft.ciudad} onChange={(e) => setClienteDraft({ ...clienteDraft, ciudad: e.target.value })} /></Grid>

            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('relacionados.telefono')} value={clienteDraft.telefono} onChange={(e) => setClienteDraft({ ...clienteDraft, telefono: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('relacionados.zona')} value={clienteDraft.zona} onChange={(e) => setClienteDraft({ ...clienteDraft, zona: e.target.value })} /></Grid>

            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Fax" value={clienteDraft.fax} onChange={(e) => setClienteDraft({ ...clienteDraft, fax: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><CountrySelect required label={t('relacionados.paisOrigen')} value={clienteDraft.pais} onChange={(pais) => setClienteDraft({ ...clienteDraft, pais })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClienteOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={saveCliente} disabled={!clienteValido}>{t('expediente.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Suplidor dialog */}
      <Dialog open={suplidorOpen} onClose={() => setSuplidorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{suplidorId ? t('relacionados.editSuplidor') : t('relacionados.addSuplidor')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth required label={t('relacionados.codigo')} value={suplidorDraft.codigo} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, codigo: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth required label={t('relacionados.nombre')} value={suplidorDraft.nombre} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, nombre: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="TID" value={suplidorDraft.tid} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, tid: e.target.value })} helperText={t('relacionados.tidHint')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('relacionados.telefono')} value={suplidorDraft.telefono} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, telefono: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Fax" value={suplidorDraft.fax} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, fax: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><CountrySelect label={t('relacionados.paisOrigen')} value={suplidorDraft.pais} onChange={(pais) => setSuplidorDraft({ ...suplidorDraft, pais })} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label={t('relacionados.direccion')} value={suplidorDraft.direccion} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, direccion: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuplidorOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={saveSuplidor} disabled={!suplidorDraft.nombre.trim() || !suplidorDraft.codigo.trim()}>{t('expediente.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('expediente.delete')}</DialogTitle>
        <DialogContent>{t('relacionados.confirmDelete', { nombre: deleteTarget?.nombre ?? '' })}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>{t('expediente.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
