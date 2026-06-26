import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Card, CardContent, Grid, MenuItem, TextField, Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useExpedientesStore, computeProgress } from '../../store/expedientesStore';
import { ExpedienteStatus } from '../../types';

const COLORS = ['#bdbdbd', '#ef9a9a', '#ffe082', '#ffcc80', '#c5e1a5', '#a5d6a7', '#80cbc4', '#26a69a', '#2e7d32'];
const STATUS_ORDER: ExpedienteStatus[] = [
  ExpedienteStatus.Registrado, ExpedienteStatus.Manifestado,
  ExpedienteStatus.PendienteInfo, ExpedienteStatus.PreLiquidado,
  ExpedienteStatus.Presentado, ExpedienteStatus.ProcesoVerificacion,
  ExpedienteStatus.Verificado, ExpedienteStatus.Despacho,
  ExpedienteStatus.Completo,
];

export default function ReportsPage() {
  const { t } = useTranslation();
  const expedientes = useExpedientesStore((s) => s.expedientes);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [importadorFilter, setImportadorFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const importadores = useMemo(() => [...new Set(expedientes.map((e) => e.importador.nombre))], [expedientes]);

  const filtered = useMemo(() => {
    return expedientes.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (importadorFilter !== 'all' && e.importador.nombre !== importadorFilter) return false;
      if (dateFrom && e.createdAt < dateFrom) return false;
      if (dateTo && e.createdAt > dateTo + 'T23:59:59Z') return false;
      return true;
    });
  }, [expedientes, statusFilter, importadorFilter, dateFrom, dateTo]);

  const statusData = useMemo(() => {
    return STATUS_ORDER.map((s, i) => ({
      name: t(`status.${s}`),
      value: filtered.filter((e) => e.status === s).length,
      fill: COLORS[i],
    }));
  }, [filtered, t]);

  const importadorData = useMemo(() => {
    const map = new Map<string, { count: number; totalCif: number }>();
    filtered.forEach((e) => {
      const entry = map.get(e.importador.nombre) ?? { count: 0, totalCif: 0 };
      entry.count++;
      entry.totalCif += e.valores.valorCifTotal;
      map.set(e.importador.nombre, entry);
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [filtered]);

  const totalCif = useMemo(() => {
    return filtered.reduce((sum, e) => sum + e.valores.valorCifTotal, 0);
  }, [filtered]);

  const columns: GridColDef[] = [
    { field: 'reference', headerName: t('expediente.reference'), flex: 1 },
    {
      field: 'importadorNombre', headerName: t('expediente.client'), flex: 1.5,
      valueGetter: (_value, row) => row.importador.nombre,
    },
    { field: 'status', headerName: t('expediente.status'), width: 120 },
    {
      field: 'progress', headerName: t('expediente.progress'), width: 100,
      valueGetter: (_value, row) => computeProgress(row.checklist) + '%',
    },
    {
      field: 'valorCif', headerName: t('reports.totalAmount'), width: 140, type: 'number',
      valueGetter: (_value, row) => row.valores.valorCifTotal,
      valueFormatter: (value: number) => `$${value.toLocaleString()}`,
    },
    { field: 'createdAt', headerName: t('expediente.createdAt'), width: 130, valueFormatter: (value: string) => new Date(value).toLocaleDateString() },
  ];

  const handleExportCsv = () => {
    const header = ['Referencia,Importador,Estado,Progreso,Valor CIF,Fecha'];
    const rows = filtered.map((e) =>
      `${e.reference},${e.importador.nombre},${e.status},${computeProgress(e.checklist)}%,$${e.valores.valorCifTotal},${new Date(e.createdAt).toLocaleDateString()}`,
    );
    const csv = [...header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>{t('reports.title')}</Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField select fullWidth size="small" label={t('reports.filterByStatus')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">{t('common.all')}</MenuItem>
                {STATUS_ORDER.map((s) => <MenuItem key={s} value={s}>{t(`status.${s}`)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField select fullWidth size="small" label={t('reports.filterByClient')} value={importadorFilter} onChange={(e) => setImportadorFilter(e.target.value)}>
                <MenuItem value="all">{t('common.all')}</MenuItem>
                {importadores.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <TextField fullWidth size="small" type="date" label={t('reports.from')} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <TextField fullWidth size="small" type="date" label={t('reports.to')} value={dateTo} onChange={(e) => setDateTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <Button fullWidth variant="outlined" onClick={handleExportCsv}>{t('reports.exportCsv')}</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card><CardContent>
            <Typography variant="body2" color="text.secondary">{t('dashboard.totalExpedientes')}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{filtered.length}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card><CardContent>
            <Typography variant="body2" color="text.secondary">{t('reports.totalAmount')}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>${totalCif.toLocaleString()}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('reports.byStatus')}</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('reports.byClient')}</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={importadorData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalCif" fill="#1976d2" name={t('reports.totalAmount')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('reports.summary')}</Typography>
          <DataGrid
            rows={filtered}
            columns={columns}
            autoHeight
            pageSizeOptions={[10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
          />
        </CardContent>
      </Card>
    </Box>
  );
}
