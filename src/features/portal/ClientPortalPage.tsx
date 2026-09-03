import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Card, CardActionArea, CardContent, Chip, Grid, LinearProgress, Typography } from '@mui/material';
import { FlightLand, FlightTakeoff } from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { useExpedientesStore, computeProgress } from '../../store/expedientesStore';
import { useRelacionadosStore } from '../../store/relacionadosStore';
import { ExpedienteStatus } from '../../types';
import { fmtDate } from '../../utils/date';
import { clienteKey, entidadKey } from '../../utils/documento';

/**
 * Client portal landing: read-only list of the expedientes whose importador matches the
 * logged-in client's document key. See docs/CLIENT_PORTAL.md for the design.
 */
export default function ClientPortalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const expedientes = useExpedientesStore((s) => s.expedientes);
  const cliente = useRelacionadosStore((s) => s.clientes.find((c) => clienteKey(c) === user?.clienteKey));

  const mine = useMemo(
    () => expedientes
      .filter((e) => user?.clienteKey && entidadKey(e.importador) === user.clienteKey)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [expedientes, user],
  );

  if (!user?.clienteKey) {
    return <Alert severity="warning">{t('portal.notLinked')}</Alert>;
  }

  const active = mine.filter((e) => e.status !== ExpedienteStatus.Completo);
  const done = mine.filter((e) => e.status === ExpedienteStatus.Completo);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>
        {t('portal.welcome', { nombre: cliente?.nombre ?? user.name })}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>{t('portal.intro')}</Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: t('portal.active'), value: active.length, color: '#3b82f6' },
          { label: t('dashboard.completed'), value: done.length, color: '#22c55e' },
          { label: t('dashboard.totalExpedientes'), value: mine.length, color: '#6366f1' },
        ].map((c) => (
          <Grid size={{ xs: 4 }} key={c.label}>
            <Card sx={{ borderTop: `4px solid ${c.color}` }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>{c.label}</Typography>
                <Typography variant="h3" sx={{ fontWeight: 800 }}>{c.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" gutterBottom>{t('portal.myExpedientes')}</Typography>
      {mine.length === 0 && <Typography color="text.secondary">{t('portal.noExpedientes')}</Typography>}

      <Grid container spacing={2}>
        {mine.map((e) => {
          const pct = computeProgress(e.checklist);
          return (
            <Grid size={{ xs: 12, md: 6 }} key={e.id}>
              <Card>
                <CardActionArea onClick={() => navigate(`/portal/${e.id}`)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>{e.reference}</Typography>
                      <Chip
                        size="small" variant="outlined"
                        icon={e.tipoExpediente === 'importacion' ? <FlightLand fontSize="small" /> : <FlightTakeoff fontSize="small" />}
                        label={t(`expediente.tipo_${e.tipoExpediente}`)}
                        color={e.tipoExpediente === 'importacion' ? 'info' : 'secondary'}
                      />
                      <Chip size="small" label={t(`status.${e.status}`)} color={e.status === ExpedienteStatus.Completo ? 'success' : 'primary'} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {t('detail.docEmbarque')}: {e.declaracion.docEmbarque || '—'} · ETA: {fmtDate(e.declaracion.eta)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={pct} sx={{ flexGrow: 1, height: 8, borderRadius: 4 }} />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{pct}%</Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
