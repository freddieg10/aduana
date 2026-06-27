import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  PendingActions,
  Loop,
  CheckCircle,
  Assignment,
  LocalShipping,
} from "@mui/icons-material";
import {
  useExpedientesStore,
  computeProgress,
} from "../../store/expedientesStore";
import { useNotificationStore } from "../../store/notificationStore";
import { useNavigate } from "react-router";
import { ExpedienteStatus } from "../../types";
import { fmtDateTime } from "../../utils/date";

const STATUS_CONFIG: Record<
  ExpedienteStatus,
  { color: "default" | "primary" | "info" | "success" | "warning"; icon: React.ReactNode }
> = {
  [ExpedienteStatus.Registrado]:          { color: "default",  icon: <Assignment /> },
  [ExpedienteStatus.Manifestado]:         { color: "default",  icon: <Assignment /> },
  [ExpedienteStatus.PendienteInfo]:       { color: "warning",  icon: <PendingActions /> },
  [ExpedienteStatus.PreLiquidado]:        { color: "warning",  icon: <PendingActions /> },
  [ExpedienteStatus.Presentado]:          { color: "primary",  icon: <Loop /> },
  [ExpedienteStatus.ProcesoVerificacion]: { color: "primary",  icon: <Loop /> },
  [ExpedienteStatus.Verificado]:          { color: "info",     icon: <CheckCircle /> },
  [ExpedienteStatus.Despacho]:            { color: "info",     icon: <LocalShipping /> },
  [ExpedienteStatus.Completo]:            { color: "success",  icon: <CheckCircle /> },
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const expedientes = useExpedientesStore((s) => s.expedientes);
  const getExpById = useExpedientesStore((s) => s.getById);
  const notifications = useNotificationStore((s) => s.notifications);

  const counts: Record<ExpedienteStatus, number> = {
    [ExpedienteStatus.Registrado]: 0,
    [ExpedienteStatus.Manifestado]: 0,
    [ExpedienteStatus.PendienteInfo]: 0,
    [ExpedienteStatus.PreLiquidado]: 0,
    [ExpedienteStatus.Presentado]: 0,
    [ExpedienteStatus.ProcesoVerificacion]: 0,
    [ExpedienteStatus.Verificado]: 0,
    [ExpedienteStatus.Despacho]: 0,
    [ExpedienteStatus.Completo]: 0,
  };
  expedientes.forEach((e) => counts[e.status]++);

  const pendingCount = counts[ExpedienteStatus.Registrado] + counts[ExpedienteStatus.Manifestado] + counts[ExpedienteStatus.PendienteInfo] + counts[ExpedienteStatus.PreLiquidado];
  const inProgressCount = counts[ExpedienteStatus.Presentado] + counts[ExpedienteStatus.ProcesoVerificacion] + counts[ExpedienteStatus.Verificado] + counts[ExpedienteStatus.Despacho];

  const active = expedientes.filter((e) => e.status !== ExpedienteStatus.Completo);

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        {t("dashboard.title")}
      </Typography>

      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            label: t("dashboard.totalExpedientes"),
            value: expedientes.length,
            color: "#6366f1",
          },
          {
            label: t("dashboard.pending"),
            value: pendingCount,
            color: "#94a3b8",
          },
          {
            label: t("dashboard.inProgress"),
            value: inProgressCount,
            color: "#3b82f6",
          },
          {
            label: t("dashboard.completed"),
            value: counts[ExpedienteStatus.Completo],
            color: "#22c55e",
          },
        ].map((card) => (
          <Grid size={{ xs: 6, md: 2.4 }} key={card.label}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  backgroundColor: card.color,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                },
              }}
            >
              <CardContent sx={{ pb: "16px !important" }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 600,
                    mb: 1,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant="h3"
                  sx={{ fontWeight: 800, color: "text.primary" }}
                >
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Progress overview */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t("dashboard.progressOverview")}
              </Typography>
              {active.map((exp) => {
                const pct = computeProgress(exp.checklist);
                const cfg = STATUS_CONFIG[exp.status];
                return (
                  <Box key={exp.id} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {exp.reference} — {exp.importador.nombre}
                      </Typography>
                      <Chip
                        label={t(`status.${exp.status}`)}
                        size="small"
                        color={cfg.color}
                        icon={<>{cfg.icon}</>}
                      />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {pct}%
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
              {active.length === 0 && (
                <Typography color="text.secondary">
                  {t("expediente.noResults")}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent notifications */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t("notifications.title")}
              </Typography>
              <List dense>
                {notifications.slice(0, 6).map((n) => {
                  const exp = getExpById(n.expedienteId);
                  return (
                    <ListItem
                      key={n.id}
                      sx={{
                        opacity: n.read ? 0.6 : 1,
                        cursor: exp ? "pointer" : "default",
                      }}
                      onClick={() => exp && navigate(`/expedientes/${exp.id}`)}
                    >
                      <ListItemText
                        primary={
                          exp ? `[${exp.reference}] ${n.message}` : n.message
                        }
                        secondary={
                          <>
                            {exp && <>{exp.importador.nombre} — </>}
                            {fmtDateTime(n.createdAt)}
                          </>
                        }
                      />
                      <Chip
                        size="small"
                        label={n.type}
                        color={
                          n.type === "warning"
                            ? "warning"
                            : n.type === "error"
                              ? "error"
                              : "info"
                        }
                      />
                    </ListItem>
                  );
                })}
                {notifications.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary={t("notifications.noNotifications")}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
