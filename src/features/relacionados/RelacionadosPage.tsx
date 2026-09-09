import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, IconButton, InputAdornment, MenuItem, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Edit, Link as LinkIcon, Search } from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useRelacionadosStore } from '../../store/relacionadosStore';
import { useAuthStore, buildAccessLink } from '../../store/authStore';
import { can } from '../../utils/permisos';
import { clienteKey } from '../../utils/documento';
import type { Cliente, Deposito, SuplidorMaestro } from '../../types';
import { COUNTRIES, findCountryByCode } from '../../data/countries';
import { ADMINISTRACIONES, PAIS_RD, TIPOS_DOCUMENTO, TIPOS_ENTIDAD, TIPOS_ENTIDAD_SUPLIDOR, findAdministracion } from '../../data/catalogos';

type ClienteDraft = Omit<Cliente, 'id'>;
type SuplidorDraft = Omit<SuplidorMaestro, 'id'>;
type DepositoDraft = Omit<Deposito, 'id'>;

/** Both party dialogs mirror SIGA: tipo, documento, nombre and país de origen are required. */
const emptyCliente = (): ClienteDraft => ({
  tipo: 'Empresa Importadora', tipoDocumento: 'RNC', documento: '', nombre: '',
  email: '', calle: '', ciudad: '', telefono: '', zona: '', fax: '', pais: PAIS_RD,
});

const emptySuplidor = (): SuplidorDraft => ({
  tipo: 'Empresa Proveedora Exterior', tipoDocumento: 'TID', documento: '', nombre: '',
  email: '', calle: '', ciudad: '', telefono: '', zona: '', fax: '', pais: '',
});

const emptyDeposito = (): DepositoDraft => ({ codigo: '', nombre: '', administracionCodigo: '', ciudad: '', telefono: '' });

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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
    clientes, suplidores, depositos,
    addCliente, updateCliente, removeCliente, documentoTaken,
    addSuplidor, updateSuplidor, removeSuplidor, suplidorDocumentoTaken,
    addDeposito, updateDeposito, removeDeposito,
  } = useRelacionadosStore();

  const role = useAuthStore((s) => s.user?.role);
  const pestanas = [
    { key: 'clientes', cap: 'relacionados:clientes' as const, label: `${t('relacionados.clientes')} (${clientes.length})` },
    { key: 'suplidores', cap: 'relacionados:suplidores' as const, label: `${t('relacionados.suplidores')} (${suplidores.length})` },
    { key: 'depositos', cap: 'relacionados:depositos' as const, label: `${t('relacionados.depositos')} (${depositos.length})` },
  ].filter((x) => can(role, x.cap));

  const [tabIdx, setTab] = useState(0);
  const tab = Math.min(tabIdx, Math.max(pestanas.length - 1, 0));
  const activa = pestanas[tab]?.key;
  const [busqueda, setBusqueda] = useState('');
  const [enlaceCopiado, setEnlaceCopiado] = useState('');

  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteDraft, setClienteDraft] = useState<ClienteDraft>(emptyCliente());

  const [suplidorOpen, setSuplidorOpen] = useState(false);
  const [suplidorId, setSuplidorId] = useState<string | null>(null);
  const [suplidorDraft, setSuplidorDraft] = useState<SuplidorDraft>(emptySuplidor());

  const [depositoOpen, setDepositoOpen] = useState(false);
  const [depositoId, setDepositoId] = useState<string | null>(null);
  const [depositoDraft, setDepositoDraft] = useState<DepositoDraft>(emptyDeposito());

  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'cliente' | 'suplidor' | 'deposito'; id: string; nombre: string } | null>(null);

  /* --- search across the visible tab --- */
  const q = norm(busqueda.trim());
  const matches = (...fields: string[]) => !q || fields.some((f) => norm(f ?? '').includes(q));
  const clientesFiltrados = useMemo(
    () => clientes.filter((c) => matches(c.nombre, c.documento, c.tipoDocumento, c.tipo, c.ciudad, c.email, c.telefono)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientes, q],
  );
  const suplidoresFiltrados = useMemo(
    () => suplidores.filter((s) => matches(s.nombre, s.documento, s.tipoDocumento, s.tipo, s.ciudad, s.email, s.telefono)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suplidores, q],
  );
  const depositosFiltrados = useMemo(
    () => depositos.filter((d) => matches(d.codigo, d.nombre, d.ciudad, findAdministracion(d.administracionCodigo)?.nombre ?? '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [depositos, q],
  );

  /* --- cliente --- */
  const openCliente = (c?: Cliente) => {
    setClienteId(c?.id ?? null);
    setClienteDraft(c
      ? { tipo: c.tipo, tipoDocumento: c.tipoDocumento, documento: c.documento, nombre: c.nombre, email: c.email, calle: c.calle, ciudad: c.ciudad, telefono: c.telefono, zona: c.zona, fax: c.fax, pais: c.pais }
      : emptyCliente());
    setClienteOpen(true);
  };
  const clienteDuplicado = documentoTaken(clienteDraft.tipoDocumento, clienteDraft.documento, clienteId ?? undefined);
  const clienteValido = Boolean(clienteDraft.tipo && clienteDraft.documento.trim() && clienteDraft.nombre.trim() && clienteDraft.pais) && !clienteDuplicado;
  const saveCliente = () => {
    if (!clienteValido) return;
    const draft = { ...clienteDraft, documento: clienteDraft.documento.trim() };
    if (clienteId) updateCliente(clienteId, draft); else addCliente(draft);
    setClienteOpen(false);
  };

  /* --- suplidor --- */
  const openSuplidor = (s?: SuplidorMaestro) => {
    setSuplidorId(s?.id ?? null);
    setSuplidorDraft(s
      ? { tipo: s.tipo, tipoDocumento: s.tipoDocumento, documento: s.documento, nombre: s.nombre, email: s.email, calle: s.calle, ciudad: s.ciudad, telefono: s.telefono, zona: s.zona, fax: s.fax, pais: s.pais }
      : emptySuplidor());
    setSuplidorOpen(true);
  };
  const suplidorDuplicado = suplidorDocumentoTaken(suplidorDraft.tipoDocumento, suplidorDraft.documento, suplidorId ?? undefined);
  const suplidorValido = Boolean(suplidorDraft.tipo && suplidorDraft.documento.trim() && suplidorDraft.nombre.trim() && suplidorDraft.pais) && !suplidorDuplicado;
  const saveSuplidor = () => {
    if (!suplidorValido) return;
    const draft = { ...suplidorDraft, documento: suplidorDraft.documento.trim() };
    if (suplidorId) updateSuplidor(suplidorId, draft); else addSuplidor(draft);
    setSuplidorOpen(false);
  };

  /* --- depósito --- */
  const openDeposito = (d?: Deposito) => {
    setDepositoId(d?.id ?? null);
    setDepositoDraft(d ? { codigo: d.codigo, nombre: d.nombre, administracionCodigo: d.administracionCodigo, ciudad: d.ciudad, telefono: d.telefono } : emptyDeposito());
    setDepositoOpen(true);
  };
  const depositoValido = Boolean(depositoDraft.codigo.trim() && depositoDraft.nombre.trim());
  const saveDeposito = () => {
    if (!depositoValido) return;
    if (depositoId) updateDeposito(depositoId, depositoDraft); else addDeposito(depositoDraft);
    setDepositoOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'cliente') removeCliente(deleteTarget.id);
    else if (deleteTarget.kind === 'suplidor') removeSuplidor(deleteTarget.id);
    else removeDeposito(deleteTarget.id);
    setDeleteTarget(null);
  };

  const acciones = <T extends { id: string; nombre: string }>(kind: 'cliente' | 'suplidor' | 'deposito', open: (row: T) => void): GridColDef<T> => ({
    field: 'actions', headerName: t('common.actions'), width: 110, sortable: false, filterable: false, align: 'center', headerAlign: 'center',
    renderCell: (p) => (
      <Box>
        <IconButton size="small" onClick={() => open(p.row)}><Edit fontSize="small" /></IconButton>
        <IconButton size="small" color="error" onClick={() => setDeleteTarget({ kind, id: p.row.id, nombre: p.row.nombre })}><Delete fontSize="small" /></IconButton>
      </Box>
    ),
  });

  const paisCol = <T extends { pais: string }>(): GridColDef<T> => ({
    field: 'pais', headerName: t('relacionados.paisOrigen'), width: 160,
    valueGetter: (_v, row) => findCountryByCode(row.pais)?.nombre ?? row.pais,
  });

  const copiarEnlace = async (c: Cliente) => {
    const url = buildAccessLink(clienteKey(c));
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard blocked — the link is still shown below */
    }
    setEnlaceCopiado(url);
  };

  const clienteColumns: GridColDef<Cliente>[] = [
    { field: 'tipoDocumento', headerName: t('relacionados.tipoDocumento'), width: 110 },
    { field: 'documento', headerName: t('relacionados.documento'), width: 150 },
    { field: 'nombre', headerName: t('relacionados.nombre'), flex: 1.5, minWidth: 200 },
    { field: 'tipo', headerName: t('relacionados.tipo'), width: 190 },
    { field: 'ciudad', headerName: t('relacionados.ciudad'), width: 150 },
    { field: 'telefono', headerName: t('relacionados.telefono'), width: 140 },
    paisCol<Cliente>(),
    {
      field: 'enlace', headerName: t('relacionados.enlaceAcceso'), width: 90, sortable: false, filterable: false, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <IconButton size="small" title={t('relacionados.copiarEnlace')} onClick={() => copiarEnlace(p.row)}>
          <LinkIcon fontSize="small" />
        </IconButton>
      ),
    },
    acciones<Cliente>('cliente', openCliente),
  ];

  const suplidorColumns: GridColDef<SuplidorMaestro>[] = [
    { field: 'tipoDocumento', headerName: t('relacionados.tipoDocumento'), width: 110 },
    { field: 'documento', headerName: t('relacionados.documento'), width: 170 },
    { field: 'nombre', headerName: t('relacionados.nombre'), flex: 1.5, minWidth: 200 },
    { field: 'tipo', headerName: t('relacionados.tipo'), width: 210 },
    { field: 'ciudad', headerName: t('relacionados.ciudad'), width: 140 },
    { field: 'telefono', headerName: t('relacionados.telefono'), width: 150 },
    paisCol<SuplidorMaestro>(),
    acciones<SuplidorMaestro>('suplidor', openSuplidor),
  ];

  const depositoColumns: GridColDef<Deposito>[] = [
    { field: 'codigo', headerName: t('relacionados.codigo'), width: 150 },
    { field: 'nombre', headerName: t('relacionados.nombre'), flex: 1.5, minWidth: 220 },
    {
      field: 'administracionCodigo', headerName: t('detail.administracionNombre'), flex: 1, minWidth: 220,
      valueGetter: (_v, row) => findAdministracion(row.administracionCodigo)?.nombre ?? row.administracionCodigo,
    },
    { field: 'ciudad', headerName: t('relacionados.ciudad'), width: 170 },
    { field: 'telefono', headerName: t('relacionados.telefono'), width: 140 },
    acciones<Deposito>('deposito', openDeposito),
  ];

  const gridSx = {
    border: 'none',
    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'text.secondary' },
  };
  const gridProps = { autoHeight: true, disableRowSelectionOnClick: true, pageSizeOptions: [10, 25, 50], initialState: { pagination: { paginationModel: { pageSize: 10 } } }, sx: gridSx };

  const addButton = {
    clientes: { label: t('relacionados.addCliente'), onClick: () => openCliente() },
    suplidores: { label: t('relacionados.addSuplidor'), onClick: () => openSuplidor() },
    depositos: { label: t('relacionados.addDeposito'), onClick: () => openDeposito() },
  }[activa ?? 'clientes'] ?? { label: '', onClick: () => {} };

  /** The document block both party dialogs share. */
  const documentoFields = (
    draft: { tipoDocumento: Cliente['tipoDocumento']; documento: string },
    set: (p: { tipoDocumento?: Cliente['tipoDocumento']; documento?: string }) => void,
    duplicado: boolean,
  ) => (
    <>
      <Grid size={{ xs: 12, sm: 3 }}>
        <TextField select fullWidth required label={t('relacionados.tipoDocumento')} value={draft.tipoDocumento} onChange={(e) => set({ tipoDocumento: e.target.value as Cliente['tipoDocumento'] })}>
          {TIPOS_DOCUMENTO.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 9 }}>
        <TextField
          fullWidth required label={t('relacionados.documento')}
          value={draft.documento}
          onChange={(e) => set({ documento: e.target.value })}
          error={duplicado}
          helperText={duplicado ? t('relacionados.documentoDuplicado') : t('relacionados.documentoHint')}
        />
      </Grid>
    </>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>{t('relacionados.title')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={addButton.onClick}>{addButton.label}</Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {pestanas.map((x) => <Tab key={x.key} label={x.label} />)}
        </Tabs>
        <Box sx={{ flexGrow: 1 }} />
        <TextField
          size="small"
          placeholder={t('relacionados.buscar')}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          sx={{ width: 320 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> },
            htmlInput: { 'data-testid': 'relacionados-buscar' },
          }}
        />
      </Box>

      {enlaceCopiado && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setEnlaceCopiado('')}>
          <Typography variant="body2">{t('relacionados.enlaceCopiado')}</Typography>
          <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>{enlaceCopiado}</Typography>
        </Alert>
      )}

      <Card><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {activa === 'clientes' && <DataGrid rows={clientesFiltrados} columns={clienteColumns} {...gridProps} />}
        {activa === 'suplidores' && <DataGrid rows={suplidoresFiltrados} columns={suplidorColumns} {...gridProps} />}
        {activa === 'depositos' && <DataGrid rows={depositosFiltrados} columns={depositoColumns} {...gridProps} />}
      </CardContent></Card>

      {/* Cliente — SIGA "Buscar Información de Importador" */}
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
            {documentoFields(clienteDraft, (p) => setClienteDraft({ ...clienteDraft, ...p }), clienteDuplicado)}
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

      {/* Suplidor — SIGA "Buscar Información Proveedor" */}
      <Dialog open={suplidorOpen} onClose={() => setSuplidorOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{suplidorId ? t('relacionados.editSuplidor') : t('relacionados.addSuplidor')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth required label={t('relacionados.tipo')} value={suplidorDraft.tipo} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, tipo: e.target.value as SuplidorMaestro['tipo'] })}>
                {TIPOS_ENTIDAD_SUPLIDOR.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} />
            {documentoFields(suplidorDraft, (p) => setSuplidorDraft({ ...suplidorDraft, ...p }), suplidorDuplicado)}
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth required label={t('relacionados.nombre')} value={suplidorDraft.nombre} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, nombre: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth type="email" label={t('relacionados.email')} value={suplidorDraft.email} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, email: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('relacionados.calle')} value={suplidorDraft.calle} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, calle: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('relacionados.ciudad')} value={suplidorDraft.ciudad} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, ciudad: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('relacionados.telefono')} value={suplidorDraft.telefono} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, telefono: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('relacionados.zona')} value={suplidorDraft.zona} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, zona: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Fax" value={suplidorDraft.fax} onChange={(e) => setSuplidorDraft({ ...suplidorDraft, fax: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><CountrySelect required label={t('relacionados.paisOrigen')} value={suplidorDraft.pais} onChange={(pais) => setSuplidorDraft({ ...suplidorDraft, pais })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuplidorOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={saveSuplidor} disabled={!suplidorValido}>{t('expediente.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Depósito */}
      <Dialog open={depositoOpen} onClose={() => setDepositoOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{depositoId ? t('relacionados.editDeposito') : t('relacionados.addDeposito')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 5 }}><TextField fullWidth required label={t('relacionados.codigo')} value={depositoDraft.codigo} onChange={(e) => setDepositoDraft({ ...depositoDraft, codigo: e.target.value })} helperText={t('relacionados.depositoCodigoHint')} /></Grid>
            <Grid size={{ xs: 12, sm: 7 }}><TextField fullWidth required label={t('relacionados.nombre')} value={depositoDraft.nombre} onChange={(e) => setDepositoDraft({ ...depositoDraft, nombre: e.target.value })} /></Grid>
            <Grid size={{ xs: 12 }}>
              <TextField select fullWidth label={t('detail.administracionNombre')} value={depositoDraft.administracionCodigo} onChange={(e) => setDepositoDraft({ ...depositoDraft, administracionCodigo: e.target.value })}>
                <MenuItem value="">—</MenuItem>
                {ADMINISTRACIONES.map((a) => <MenuItem key={a.codigo} value={a.codigo}>{a.nombre} ({a.codigo})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('relacionados.ciudad')} value={depositoDraft.ciudad} onChange={(e) => setDepositoDraft({ ...depositoDraft, ciudad: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('relacionados.telefono')} value={depositoDraft.telefono} onChange={(e) => setDepositoDraft({ ...depositoDraft, telefono: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepositoOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={saveDeposito} disabled={!depositoValido}>{t('expediente.save')}</Button>
        </DialogActions>
      </Dialog>

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
