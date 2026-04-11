import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Box, Button, Chip, LinearProgress, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Add, Delete, Visibility } from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useExpedientesStore, computeProgress } from '../../store/expedientesStore';
import type { ExpedienteStatus } from '../../types';

const STATUS_COLORS: Record<ExpedienteStatus, 'default' | 'primary' | 'success' | 'warning'> = {
  pending: 'default',
  'in-progress': 'primary',
  completed: 'success',
  alert: 'warning',
};

export default function ExpedienteListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const expedientes = useExpedientesStore((s) => s.expedientes);
  const remove = useExpedientesStore((s) => s.remove);

  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return expedientes;
    const q = search.toLowerCase();
    return expedientes.filter(
      (e) =>
        e.reference.toLowerCase().includes(q) ||
        e.importador.nombre.toLowerCase().includes(q) ||
        e.status.includes(q),
    );
  }, [expedientes, search]);

  const columns: GridColDef[] = [
    { field: 'reference', headerName: t('expediente.reference'), flex: 1, minWidth: 140 },
    { field: 'importadorNombre', headerName: t('expediente.client'), flex: 1.5, minWidth: 180,
      valueGetter: (_value, row) => row.importador.nombre,
    },
    {
      field: 'status', headerName: t('expediente.status'), width: 140,
      renderCell: (params) => (
        <Chip label={t(`status.${params.value}`)} size="small" color={STATUS_COLORS[params.value as ExpedienteStatus]} />
      ),
    },
    {
      field: 'progress', headerName: t('expediente.progress'), width: 160,
      valueGetter: (_value, row) => computeProgress(row.checklist),
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <LinearProgress variant="determinate" value={params.value as number} sx={{ flexGrow: 1, height: 6, borderRadius: 3 }} />
          <Typography variant="caption">{params.value}%</Typography>
        </Box>
      ),
    },
    {
      field: 'createdAt', headerName: t('expediente.createdAt'), width: 130,
      valueFormatter: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      field: 'actions', headerName: t('common.actions'), width: 120, sortable: false, filterable: false,
      renderCell: (params) => (
        <Box>
          <Button size="small" onClick={() => navigate(`/expedientes/${params.row.id}`)}><Visibility fontSize="small" /></Button>
          <Button size="small" color="error" onClick={() => setDeleteId(params.row.id)}><Delete fontSize="small" /></Button>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>{t('expediente.title')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/expedientes/new')}>
          {t('expediente.newExpediente')}
        </Button>
      </Box>

      <TextField
        fullWidth size="small" placeholder={t('expediente.search')}
        value={search} onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
      />

      <DataGrid
        rows={filtered}
        columns={columns}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        sx={{ bgcolor: 'background.paper' }}
      />

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>{t('expediente.delete')}</DialogTitle>
        <DialogContent>{t('expediente.confirmDelete')}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => { if (deleteId) remove(deleteId); setDeleteId(null); }}>
            {t('expediente.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
