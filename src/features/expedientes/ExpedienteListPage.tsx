import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Chip,
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
  Delete,
  Edit,
  FlightLand,
  FlightTakeoff,
} from "@mui/icons-material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  useExpedientesStore,
  computeProgress,
} from "../../store/expedientesStore";
import type { ExpedienteStatus, TipoExpediente } from "../../types";

const STATUS_COLORS: Record<
  ExpedienteStatus,
  "default" | "primary" | "success" | "warning"
> = {
  pending: "default",
  "in-progress": "primary",
  completed: "success",
  alert: "warning",
};

export default function ExpedienteListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const expedientes = useExpedientesStore((s) => s.expedientes);
  const remove = useExpedientesStore((s) => s.remove);

  /* Column-level filters */
  const [refFilter, setRefFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

  /* Dialogs */
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);

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

  const handleSelectType = (tipo: TipoExpediente) => {
    setTypeDialogOpen(false);
    navigate(`/expedientes/new?tipo=${tipo}`);
  };

  const columns: GridColDef[] = [
    {
      field: "reference",
      headerName: t("expediente.reference"),
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
      renderCell: (params) => (
        <Chip
          label={t(`status.${params.value}`)}
          size="small"
          color={STATUS_COLORS[params.value as ExpedienteStatus]}
        />
      ),
    },
    {
      field: "progress",
      headerName: t("expediente.progress"),
      width: 160,
      valueGetter: (_value, row) => computeProgress(row.checklist),
      renderCell: (params) => (
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}
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
      field: "createdAt",
      headerName: t("expediente.createdAt"),
      width: 130,
      valueFormatter: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      field: "actions",
      headerName: t("common.actions"),
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Button
            size="small"
            onClick={() => navigate(`/expedientes/${params.row.id}`)}
            title={t("expediente.edit")}
          >
            <Edit fontSize="small" />
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() => setDeleteId(params.row.id)}
            title={t("expediente.delete")}
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
          borderRadius: 3,
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
          Filter List
        </Typography>
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
          borderRadius: 4,
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
          disableRowSelectionOnClick
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
