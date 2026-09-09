import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Alert, Box, Button, Card, CardContent, Chip, Grid, MenuItem, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { FileDownload } from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useExpedientesStore } from '../../store/expedientesStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { ExpedienteStatus } from '../../types';
import type { Expediente } from '../../types';
import { fmtDate } from '../../utils/date';
import { can, type Capacidad } from '../../utils/permisos';
import { entidadKey } from '../../utils/documento';
import { evaluarArt52, llegadosNoPresentados, porLlegar } from '../../utils/art52';
import {
  reporteClientes, reporteDigitadores, reporteGestores, historialProductos, historialToCsv,
  type FilaCliente, type FilaStaff, type FilaHistorial,
} from '../../utils/reportes';
import { downloadTextFile } from '../../utils/xml';

const COLORS = ['#bdbdbd', '#ef9a9a', '#ffe082', '#ffcc80', '#c5e1a5', '#a5d6a7', '#80cbc4', '#26a69a', '#2e7d32'];
const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const gridSx = {
  border: 'none',
  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em', color: 'text.secondary' },
};

export default function ReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const expedientes = useExpedientesStore((s) => s.expedientes);
  const diasArt52 = useSettingsStore((s) => s.diasArt52);
  const role = useAuthStore((s) => s.user?.role);

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('all');

  /* Only the tabs this role may see. */
  const tabsDisponibles = useMemo(() => ([
    { key: 'clientes', cap: 'reportes:clientes' as Capacidad, label: t('reports.tabClientes') },
    { key: 'digitador', cap: 'reportes:staff' as Capacidad, label: t('reports.tabDigitador') },
    { key: 'gestor', cap: 'reportes:staff' as Capacidad, label: t('reports.tabGestor') },
    { key: 'productos', cap: 'reportes:productos' as Capacidad, label: t('reports.tabProductos') },
    { key: 'estatus', cap: 'reportes:estatus' as Capacidad, label: t('reports.tabEstatus') },
  ].filter((x) => can(role, x.cap))), [role, t]);

  const [tab, setTab] = useState(0);
  const activa = tabsDisponibles[Math.min(tab, tabsDisponibles.length - 1)]?.key;

  const rango = useMemo(() => ({ desde: desde || undefined, hasta: hasta || undefined }), [desde, hasta]);
  const clientes = useMemo(() => reporteClientes(expedientes, rango), [expedientes, rango]);
  const digitadores = useMemo(() => reporteDigitadores(expedientes, diasArt52, rango), [expedientes, diasArt52, rango]);
  const gestores = useMemo(() => reporteGestores(expedientes, diasArt52, rango), [expedientes, diasArt52, rango]);
  const historial = useMemo(
    () => historialProductos(expedientes, clienteFiltro === 'all' ? undefined : clienteFiltro),
    [expedientes, clienteFiltro],
  );

  const listaClientes = useMemo(() => {
    const m = new Map<string, string>();
    expedientes.forEach((e) => m.set(entidadKey(e.importador), e.importador.nombre));
    return [...m.entries()].map(([key, nombre]) => ({ key, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [expedientes]);

  const irAExpediente = (id: string) => navigate(`/expedientes/${id}`);

  /* ---------------- columns ---------------- */
  const colsClientes: GridColDef<FilaCliente>[] = [
    { field: 'cliente', headerName: t('expediente.client'), flex: 1.4, minWidth: 190 },
    { field: 'documento', headerName: t('relacionados.documento'), width: 140 },
    { field: 'expedientes', headerName: t('reports.expedientes'), width: 110, type: 'number' },
    { field: 'expedientesPorMes', headerName: t('reports.expedientesMes'), width: 130, type: 'number' },
    { field: 'contenedores', headerName: t('detail.contenedores'), width: 120, type: 'number' },
    { field: 'contenedoresPorMes', headerName: t('reports.contenedoresMes'), width: 140, type: 'number' },
    { field: 'promedioRenglones', headerName: t('reports.promRenglones'), width: 140, type: 'number' },
    { field: 'promedioContenedores', headerName: t('reports.promContenedores'), width: 150, type: 'number' },
    { field: 'totalCif', headerName: t('reports.totalAmount'), width: 140, type: 'number', valueFormatter: (v: number) => money(v) },
    {
      field: 'ultimos5', headerName: t('reports.ultimos5'), flex: 1.6, minWidth: 260, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
          {p.row.ultimos5.map((x) => (
            <Chip key={x.id} size="small" variant="outlined" label={x.reference} onClick={() => irAExpediente(x.id)} sx={{ maxWidth: 150 }} />
          ))}
        </Box>
      ),
    },
  ];

  const colsStaff: GridColDef<FilaStaff>[] = [
    { field: 'nombre', headerName: t('relacionados.nombre'), flex: 1, minWidth: 180 },
    { field: 'expedientes', headerName: t('reports.expedientes'), width: 130, type: 'number' },
    { field: 'renglones', headerName: t('detail.renglones'), width: 130, type: 'number' },
    { field: 'contenedores', headerName: t('detail.contenedores'), width: 140, type: 'number' },
    { field: 'art52', headerName: t('reports.art52'), width: 130, type: 'number' },
  ];

  const colsHistorial: GridColDef<FilaHistorial>[] = [
    { field: 'arancel', headerName: 'ARC', width: 120 },
    { field: 'codigoProducto', headerName: 'COD PROD', width: 120 },
    { field: 'referencia', headerName: 'REF', flex: 1, minWidth: 160 },
    { field: 'descripcion', headerName: t('detail.descripcion'), flex: 1.6, minWidth: 220 },
    { field: 'unidad', headerName: t('detail.unidad'), width: 130 },
    { field: 'pais', headerName: t('detail.paisOrigen'), width: 120 },
    { field: 'suplidor', headerName: t('detail.suplidores'), width: 170 },
    {
      field: 'expedientes', headerName: t('reports.expedientes'), flex: 1.4, minWidth: 240, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
          {p.row.expedientes.map((x) => (
            <Chip
              key={x.id} size="small" variant="outlined" label={`${x.reference} · ${t(`status.${x.status}`)}`}
              onClick={() => irAExpediente(x.id)} sx={{ maxWidth: 220 }}
            />
          ))}
        </Box>
      ),
    },
  ];

  const colsExpediente: GridColDef<Expediente>[] = [
    { field: 'reference', headerName: t('expediente.reference'), flex: 1.2, minWidth: 170 },
    { field: 'importador', headerName: t('expediente.client'), flex: 1.2, minWidth: 170, valueGetter: (_v, row) => row.importador.nombre },
    { field: 'eta', headerName: t('expediente.fechaLlegada'), width: 140, valueGetter: (_v, row) => row.informacionAdicional?.fechaLlegadaReal || row.declaracion.eta, valueFormatter: (v: string) => fmtDate(v) },
    { field: 'status', headerName: t('expediente.status'), width: 170, valueFormatter: (v: string) => t(`status.${v}`) },
    { field: 'digitador', headerName: t('expediente.digitador'), width: 150 },
  ];

  /* ---------------- status report data ---------------- */
  const porLlegarList = useMemo(() => porLlegar(expedientes), [expedientes]);
  const llegadosList = useMemo(() => llegadosNoPresentados(expedientes), [expedientes]);
  const conRecargo = useMemo(
    () => llegadosList.filter((e) => evaluarArt52(e, diasArt52).aplica),
    [llegadosList, diasArt52],
  );

  const statusData = useMemo(() => Object.values(ExpedienteStatus).map((s, i) => ({
    name: t(`status.${s}`), value: expedientes.filter((e) => e.status === s).length, fill: COLORS[i],
  })), [expedientes, t]);

  if (tabsDisponibles.length === 0) return <Alert severity="warning">{t('reports.sinAcceso')}</Alert>;

  const rangoFields = (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
      <TextField size="small" type="date" label={t('reports.from')} value={desde} onChange={(e) => setDesde(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField size="small" type="date" label={t('reports.to')} value={hasta} onChange={(e) => setHasta(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      {(desde || hasta) && <Button size="small" onClick={() => { setDesde(''); setHasta(''); }}>{t('common.all')}</Button>}
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>{t('reports.title')}</Typography>

      <Box sx={{ mb: 3 }}>
        <Tabs value={Math.min(tab, tabsDisponibles.length - 1)} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {tabsDisponibles.map((x) => <Tab key={x.key} label={x.label} />)}
        </Tabs>
      </Box>

      {activa === 'clientes' && (
        <Card><CardContent>
          {rangoFields}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 3 }}><Card variant="outlined"><CardContent><Typography variant="body2" color="text.secondary">{t('reports.clientesActivos')}</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{clientes.length}</Typography></CardContent></Card></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Card variant="outlined"><CardContent><Typography variant="body2" color="text.secondary">{t('reports.totalAmount')}</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{money(clientes.reduce((s, c) => s + c.totalCif, 0))}</Typography></CardContent></Card></Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined"><CardContent sx={{ pb: 0 }}>
                <Typography variant="body2" color="text.secondary">{t('reports.byClient')}</Typography>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={clientes.slice(0, 6)}>
                    <XAxis dataKey="cliente" tick={{ fontSize: 10 }} />
                    <YAxis width={30} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="expedientes" fill="#6366f1" name={t('reports.expedientes')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </Grid>
          </Grid>
          <DataGrid rows={clientes} columns={colsClientes} autoHeight disableRowSelectionOnClick pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} sx={gridSx} />
        </CardContent></Card>
      )}

      {(activa === 'digitador' || activa === 'gestor') && (
        <Card><CardContent>
          {rangoFields}
          {activa === 'digitador' && <Alert severity="info" sx={{ mb: 2 }}>{t('reports.art52Nota', { dias: diasArt52 })}</Alert>}
          <DataGrid
            rows={activa === 'digitador' ? digitadores : gestores}
            columns={activa === 'digitador' ? colsStaff : colsStaff.filter((c) => c.field !== 'art52')}
            autoHeight disableRowSelectionOnClick pageSizeOptions={[10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} sx={gridSx}
          />
        </CardContent></Card>
      )}

      {activa === 'productos' && (
        <Card><CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField select size="small" label={t('reports.filterByClient')} value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)} sx={{ minWidth: 260 }}>
              <MenuItem value="all">{t('common.all')}</MenuItem>
              {listaClientes.map((c) => <MenuItem key={c.key} value={c.key}>{c.nombre}</MenuItem>)}
            </TextField>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined" startIcon={<FileDownload />}
              onClick={() => downloadTextFile(historialToCsv(historial), `historial_productos_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv')}
            >
              {t('common.exportCsv')}
            </Button>
          </Box>
          <Alert severity="info" sx={{ mb: 2 }}>{t('reports.historialNota')}</Alert>
          <DataGrid rows={historial} columns={colsHistorial} autoHeight disableRowSelectionOnClick pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} sx={gridSx} />
        </CardContent></Card>
      )}

      {activa === 'estatus' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}><Card variant="outlined"><CardContent><Typography variant="body2" color="text.secondary">{t('reports.porLlegar')}</Typography><Typography variant="h3" sx={{ fontWeight: 800 }}>{porLlegarList.length}</Typography></CardContent></Card></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Card variant="outlined"><CardContent><Typography variant="body2" color="text.secondary">{t('reports.llegadosNoPresentados')}</Typography><Typography variant="h3" sx={{ fontWeight: 800 }}>{llegadosList.length}</Typography></CardContent></Card></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Card variant="outlined" sx={{ borderColor: conRecargo.length ? 'error.main' : undefined }}><CardContent><Typography variant="body2" color="text.secondary">{t('reports.conRecargo')}</Typography><Typography variant="h3" sx={{ fontWeight: 800, color: conRecargo.length ? 'error.main' : undefined }}>{conRecargo.length}</Typography></CardContent></Card></Grid>
          </Grid>

          <Card><CardContent>
            <Typography variant="h6" gutterBottom>{t('reports.porLlegar')}</Typography>
            <DataGrid rows={porLlegarList} columns={colsExpediente} autoHeight disableRowSelectionOnClick pageSizeOptions={[5, 10]} initialState={{ pagination: { paginationModel: { pageSize: 5 } } }} sx={gridSx} onRowClick={(p) => irAExpediente(String(p.id))} />
          </CardContent></Card>

          <Card><CardContent>
            <Typography variant="h6" gutterBottom>{t('reports.llegadosNoPresentados')}</Typography>
            <DataGrid rows={llegadosList} columns={colsExpediente} autoHeight disableRowSelectionOnClick pageSizeOptions={[5, 10]} initialState={{ pagination: { paginationModel: { pageSize: 5 } } }} sx={gridSx} onRowClick={(p) => irAExpediente(String(p.id))} />
          </CardContent></Card>

          <Card><CardContent>
            <Typography variant="h6" gutterBottom>{t('reports.conRecargo')}</Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>{t('reports.art52Nota', { dias: diasArt52 })}</Alert>
            <DataGrid rows={conRecargo} columns={colsExpediente} autoHeight disableRowSelectionOnClick pageSizeOptions={[5, 10]} initialState={{ pagination: { paginationModel: { pageSize: 5 } } }} sx={gridSx} onRowClick={(p) => irAExpediente(String(p.id))} />
          </CardContent></Card>

          <Card><CardContent>
            <Typography variant="h6" gutterBottom>{t('reports.byStatus')}</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </Box>
      )}
    </Box>
  );
}
