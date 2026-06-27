import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Add,
  AddComment,
  Comment,
  Delete,
  Edit,
  FileDownload,
  FlightLand,
  FlightTakeoff,
  SwapVert,
} from "@mui/icons-material";
import { DataGrid, useGridApiRef, type GridColDef, type GridRowClassNameParams } from "@mui/x-data-grid";
import {
  useExpedientesStore,
  computeProgress,
} from "../../store/expedientesStore";
import { useAuthStore } from "../../store/authStore";
import { ExpedienteStatus } from "../../types";
import type { TipoExpediente } from "../../types";
import { fmtDate, fmtDateTime } from "../../utils/date";

const STATUS_CHIP: Record<ExpedienteStatus, { bg: string; clr: string }> = {
  [ExpedienteStatus.Registrado]:          { bg: '#FDDBD4', clr: '#8B3020' },
  [ExpedienteStatus.Manifestado]:         { bg: '#FAC8BC', clr: '#8B3020' },
  [ExpedienteStatus.PendienteInfo]:       { bg: '#FFF3C4', clr: '#7A5400' },
  [ExpedienteStatus.PreLiquidado]:        { bg: '#FFE680', clr: '#7A5400' },
  [ExpedienteStatus.Presentado]:          { bg: '#E0F4C8', clr: '#205000' },
  [ExpedienteStatus.ProcesoVerificacion]: { bg: '#C4E8A0', clr: '#205000' },
  [ExpedienteStatus.Verificado]:          { bg: '#A0D478', clr: '#205000' },
  [ExpedienteStatus.Despacho]:            { bg: '#4DB87A', clr: '#00280A' },
  [ExpedienteStatus.Completo]:            { bg: '#1A5C38', clr: '#ffffff' },
};

const DIGITADORES = ["Ana García", "Luis Pérez", "María López", "Carlos Ruiz"];
const GESTORES = ["Pedro Martínez", "Sofía Castro", "Juan Torres", "Elena Vega"];
const strHash = (s: string) => s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

export default function ExpedienteListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const expedientes = useExpedientesStore((s) => s.expedientes);
  const remove = useExpedientesStore((s) => s.remove);
  const update = useExpedientesStore((s) => s.update);
  const currentUser = useAuthStore((s) => s.user);

  /* Column-level filters */
  const [refFilter, setRefFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

  /* Dialogs */
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const apiRef = useGridApiRef();

  /* Observations dialog */
  const [obsRowId, setObsRowId] = useState<string | null>(null);
  const [obsNotes, setObsNotes] = useState('');
  const [obsOrder, setObsOrder] = useState<'asc' | 'desc'>('desc');
  const [obsNewText, setObsNewText] = useState('');
  const [obsEditingId, setObsEditingId] = useState<number | null>(null);
  const [obsEditText, setObsEditText] = useState('');

  const obsExpediente = useMemo(() => expedientes.find((e) => e.id === obsRowId), [expedientes, obsRowId]);

  const obsItems = useMemo(() =>
    obsNotes.split('\n').filter(Boolean).map((line, idx) => {
      const parts = line.split('|');
      if (parts.length === 1) return { id: idx, date: null as Date | null, user: null as string | null, text: line };
      if (parts.length === 2) return { id: idx, date: new Date(parts[0]), user: null as string | null, text: parts[1] };
      return { id: idx, date: new Date(parts[0]), user: parts[1], text: parts.slice(2).join('|') };
    }), [obsNotes]);

  const sortedObsItems = useMemo(() =>
    obsOrder === 'desc' ? [...obsItems].reverse() : [...obsItems],
    [obsItems, obsOrder]);

  const persistObs = (notes: string) => {
    setObsNotes(notes);
    if (obsRowId) update(obsRowId, { notes });
  };

  const handleOpenObs = (id: string) => {
    const exp = expedientes.find((e) => e.id === id);
    setObsRowId(id);
    setObsNotes(exp?.notes ?? '');
    setObsOrder('desc');
    setObsNewText('');
    setObsEditingId(null);
    setObsEditText('');
  };

  const handleAddObs = () => {
    if (!obsNewText.trim()) return;
    const line = `${new Date().toISOString()}|${currentUser?.name ?? 'Usuario'}|${obsNewText.trim()}`;
    persistObs([obsNotes, line].filter(Boolean).join('\n'));
    setObsNewText('');
  };

  const handleDeleteObs = (id: number) => {
    persistObs(obsNotes.split('\n').filter(Boolean).filter((_, i) => i !== id).join('\n'));
  };

  const handleSaveObsEdit = (id: number) => {
    const lines = obsNotes.split('\n').filter(Boolean);
    const parts = lines[id].split('|');
    lines[id] = parts.length >= 3
      ? `${parts[0]}|${parts[1]}|${obsEditText.trim()}`
      : obsEditText.trim();
    persistObs(lines.join('\n'));
    setObsEditingId(null);
    setObsEditText('');
  };

  const filtered = useMemo(() => {
    return expedientes.filter((e) => {
      if (
        refFilter &&
        !e.reference.toLowerCase().includes(refFilter.toLowerCase())
      )
        return false;
      if (
        clientFilter &&
        !e.importador.nombre.toLowerCase().includes(clientFilter.toLowerCase())
      )
        return false;
      if (
        statusFilter &&
        !t(`status.${e.status}`)
          .toLowerCase()
          .includes(statusFilter.toLowerCase())
      )
        return false;
      if (
        tipoFilter &&
        !t(`expediente.tipo_${e.tipoExpediente}`)
          .toLowerCase()
          .includes(tipoFilter.toLowerCase())
      )
        return false;
      return true;
    });
  }, [expedientes, refFilter, clientFilter, statusFilter, tipoFilter, t]);

  const ADVANCED_STATUSES = new Set<ExpedienteStatus>([
    ExpedienteStatus.Presentado,
    ExpedienteStatus.ProcesoVerificacion,
    ExpedienteStatus.Verificado,
    ExpedienteStatus.Despacho,
    ExpedienteStatus.Completo,
  ]);

  const getRowClassName = (params: GridRowClassNameParams) => {
    const eta = params.row.declaracion?.eta;
    if (!eta || ADVANCED_STATUSES.has(params.row.status)) return "";
    const msUntil = new Date(eta).getTime() - Date.now();
    const daysUntil = msUntil / (1000 * 60 * 60 * 24);
    if (daysUntil < 0) return "row-overdue";
    if (daysUntil <= 7) return "row-warning";
    return "";
  };

  const handleSelectType = (tipo: TipoExpediente) => {
    setTypeDialogOpen(false);
    navigate(`/expedientes/new?tipo=${tipo}`);
  };

  const columns: GridColDef[] = [
    {
      field: "fechaLlegada",
      headerName: t("expediente.fechaLlegada"),
      width: 150,
      valueGetter: (_value, row) => row.declaracion?.eta ?? "",
      valueFormatter: (value: string) => fmtDate(value) || "—",
    },
    {
      field: "docEmbarque",
      headerName: t("detail.docEmbarque"),
      width: 180,
      valueGetter: (_value: unknown, row: { declaracion?: { docEmbarque?: string } }) => row.declaracion?.docEmbarque ?? "—",
    },
    {
      field: "reference",
      headerName: t("expediente.descripcion"),
      flex: 1,
      minWidth: 160,
    },
    {
      field: "tipoExpediente",
      headerName: t("expediente.tipo"),
      width: 130,
      renderCell: (params) => (
        <Chip
          icon={
            params.value === "importacion" ? (
              <FlightLand fontSize="small" />
            ) : (
              <FlightTakeoff fontSize="small" />
            )
          }
          label={t(`expediente.tipo_${params.value}`)}
          size="small"
          variant="outlined"
          color={params.value === "importacion" ? "info" : "secondary"}
        />
      ),
    },
    {
      field: "importadorNombre",
      headerName: t("expediente.client"),
      flex: 1.5,
      minWidth: 180,
      valueGetter: (_value, row) => row.importador.nombre,
    },
    {
      field: "status",
      headerName: t("expediente.status"),
      width: 140,
      renderCell: (params) => {
        const s = STATUS_CHIP[params.value as ExpedienteStatus];
        return (
          <Chip
            label={t(`status.${params.value}`)}
            size="small"
            sx={{ bgcolor: s?.bg, color: s?.clr, fontWeight: 600 }}
          />
        );
      },
    },
    {
      field: "progress",
      headerName: t("expediente.progress"),
      width: 160,
      valueGetter: (_value, row) => computeProgress(row.checklist),
      renderCell: (params) => (
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", height: "100%" }}
        >
          <LinearProgress
            variant="determinate"
            value={params.value as number}
            sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
          />
          <Typography variant="caption">{params.value}%</Typography>
        </Box>
      ),
    },
    {
      field: "digitador",
      headerName: t("expediente.digitador"),
      width: 150,
      sortable: false,
      valueGetter: (_value, row) =>
        DIGITADORES[strHash(row.id) % DIGITADORES.length],
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" />
      ),
    },
    {
      field: "gestor",
      headerName: t("expediente.gestor"),
      width: 150,
      sortable: false,
      valueGetter: (_value, row) =>
        GESTORES[strHash(row.id) % GESTORES.length],
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" color="secondary" />
      ),
    },
    {
      field: "createdAt",
      headerName: t("expediente.createdAt"),
      width: 165,
      valueFormatter: (value: string) => fmtDate(value),
    },
    {
      field: "actions",
      headerName: t("common.actions"),
      width: 115,
      sortable: false,
      filterable: false,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Box sx={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
          <Button
            size="small"
            onClick={() => navigate(`/expedientes/${params.row.id}`)}
            title={t("expediente.edit")}
            sx={{ minWidth: 0, p: 0.5 }}
          >
            <Edit fontSize="small" />
          </Button>
          <Button
            size="small"
            color="primary"
            onClick={() => handleOpenObs(params.row.id)}
            title={t("expediente.observations")}
            sx={{ minWidth: 0, p: 0.5 }}
          >
            <Comment fontSize="small" />
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() => setDeleteId(params.row.id)}
            title={t("expediente.delete")}
            sx={{ minWidth: 0, p: 0.5 }}
          >
            <Delete fontSize="small" />
          </Button>
        </Box>
      ),
    },
  ];



  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary" }}>
          {t("expediente.title")}
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<Add />}
          onClick={() => setTypeDialogOpen(true)}
          sx={{ boxShadow: "0 4px 14px 0 rgba(99, 102, 241, 0.39)", px: 3 }}
        >
          {t("expediente.newExpediente")}
        </Button>
      </Box>

      {/* Column-level filters */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 4,
          flexWrap: "wrap",
          alignItems: "center",
          p: 2,
          bgcolor: "background.paper",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: "text.secondary",
            mr: 1,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t("common.filterList")}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={() => apiRef.current?.exportDataAsCsv({ fileName: "expedientes" })}
        >
          {t("common.exportCsv")}
        </Button>
        <TextField
          size="small"
          placeholder={t("expediente.reference")}
          value={refFilter}
          onChange={(e) => setRefFilter(e.target.value)}
          sx={{
            width: 180,
            "& .MuiOutlinedInput-root": { bgcolor: "background.default" },
          }}
        />
        <TextField
          size="small"
          placeholder={t("expediente.client")}
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          sx={{
            width: 220,
            "& .MuiOutlinedInput-root": { bgcolor: "background.default" },
          }}
        />
        <TextField
          size="small"
          placeholder={t("expediente.status")}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{
            width: 160,
            "& .MuiOutlinedInput-root": { bgcolor: "background.default" },
          }}
        />
        <TextField
          size="small"
          placeholder={t("expediente.tipo")}
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
          sx={{
            width: 160,
            "& .MuiOutlinedInput-root": { bgcolor: "background.default" },
          }}
        />
      </Box>

      <Box
        sx={{
          bgcolor: "background.paper",
          overflow: "hidden",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        }}
      >
        <DataGrid
          rows={filtered}
          columns={columns}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          apiRef={apiRef}
          disableRowSelectionOnClick
          getRowClassName={getRowClassName}
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "background.default",
              borderBottom: "1px solid",
              borderColor: "divider",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 700,
              color: "text.secondary",
              textTransform: "uppercase",
              fontSize: "0.75rem",
              letterSpacing: "0.05em",
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid",
              borderColor: "divider",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "background.default",
            },
            "& .row-overdue": { backgroundColor: "rgba(249, 115, 22, 0.18)" },
            "& .row-overdue:hover": { backgroundColor: "rgba(249, 115, 22, 0.28)" },
            "& .row-warning": { backgroundColor: "rgba(234, 179, 8, 0.15)" },
            "& .row-warning:hover": { backgroundColor: "rgba(234, 179, 8, 0.25)" },
          }}
        />
      </Box>

      {/* Type selection dialog */}
      <Dialog
        open={typeDialogOpen}
        onClose={() => setTypeDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("expediente.selectTipo")}</DialogTitle>
        <DialogContent>
          <List>
            <ListItemButton onClick={() => handleSelectType("importacion")}>
              <ListItemIcon>
                <FlightLand color="info" />
              </ListItemIcon>
              <ListItemText
                primary={t("expediente.tipo_importacion")}
                secondary={t("expediente.tipo_importacion_desc")}
              />
            </ListItemButton>
            <ListItemButton onClick={() => handleSelectType("exportacion")}>
              <ListItemIcon>
                <FlightTakeoff color="secondary" />
              </ListItemIcon>
              <ListItemText
                primary={t("expediente.tipo_exportacion")}
                secondary={t("expediente.tipo_exportacion_desc")}
              />
            </ListItemButton>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Observations dialog */}
      <Dialog
        open={Boolean(obsRowId)}
        onClose={() => setObsRowId(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { height: '80vh', display: 'flex', flexDirection: 'column' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="h6">{t('expediente.observations')}</Typography>
            {obsExpediente && (
              <Typography variant="caption" color="text.secondary">{obsExpediente.reference}</Typography>
            )}
          </Box>
          <IconButton
            size="small"
            onClick={() => setObsOrder((o) => o === 'asc' ? 'desc' : 'asc')}
            title={obsOrder === 'asc' ? t('common.recentFirst') : t('common.oldestFirst')}
          >
            <SwapVert />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ flex: 1, overflowY: 'auto' }}>
          {sortedObsItems.length > 0 ? (
            <Box sx={{ position: 'relative', pl: 4 }}>
              <Box sx={{ position: 'absolute', left: 11, top: 6, bottom: 6, width: 2, bgcolor: 'divider' }} />
              {sortedObsItems.map((obs) => (
                <Box key={obs.id} sx={{ position: 'relative', mb: 3 }}>
                  <Box sx={{
                    position: 'absolute', left: -30, top: 4,
                    width: 10, height: 10, borderRadius: '50%',
                    bgcolor: 'primary.main', border: '2px solid', borderColor: 'background.paper',
                  }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                        {obs.date ? fmtDateTime(obs.date) : ''}{obs.user ? ` · ${obs.user}` : ''}
                      </Typography>
                      {obsEditingId === obs.id ? (
                        <Box>
                          <TextField
                            fullWidth size="small" multiline rows={2}
                            value={obsEditText} onChange={(e) => setObsEditText(e.target.value)} autoFocus
                          />
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Button size="small" variant="contained" disabled={!obsEditText.trim()} onClick={() => handleSaveObsEdit(obs.id)}>
                              {t('expediente.save')}
                            </Button>
                            <Button size="small" onClick={() => setObsEditingId(null)}>{t('common.cancel')}</Button>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2">{obs.text}</Typography>
                      )}
                    </Box>
                    {obsEditingId !== obs.id && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                        <IconButton size="small" onClick={() => { setObsEditingId(obs.id); setObsEditText(obs.text); }}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteObs(obs.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">{t('expediente.noObservations')}</Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1, p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              fullWidth size="small" multiline rows={2}
              placeholder={t('expediente.newObservation')}
              value={obsNewText}
              onChange={(e) => setObsNewText(e.target.value)}
            />
            <Button
              variant="contained" size="small" startIcon={<AddComment />}
              disabled={!obsNewText.trim()} onClick={handleAddObs}
              sx={{ mt: 0.5, whiteSpace: 'nowrap' }}
            >
              {t('expediente.addObservations')}
            </Button>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setObsRowId(null)}>{t('common.close')}</Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>{t("expediente.delete")}</DialogTitle>
        <DialogContent>{t("expediente.confirmDelete")}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (deleteId) remove(deleteId);
              setDeleteId(null);
            }}
          >
            {t("expediente.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
