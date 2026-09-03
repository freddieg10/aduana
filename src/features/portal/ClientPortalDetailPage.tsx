import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Divider, FormControlLabel, Grid,
  LinearProgress, Step, StepLabel, Stepper, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { useExpedientesStore, computeProgress } from '../../store/expedientesStore';
import { ExpedienteStatus } from '../../types';
import { fmtDate } from '../../utils/date';
import { entidadKey } from '../../utils/documento';
import ObservationsTimeline from '../../components/ObservationsTimeline';

const STATUS_ORDER = Object.values(ExpedienteStatus);

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: 500 }}>{value || '—'}</Typography>
    </Box>
  );
}

/** Read-only view of one expediente for the client who owns it. */
export default function ClientPortalDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const expediente = useExpedientesStore((s) => s.expedientes.find((e) => e.id === id));

  if (!expediente || !user?.clienteKey || entidadKey(expediente.importador) !== user.clienteKey) {
    return (
      <Box>
        <Alert severity="error">{t('expediente.noResults')}</Alert>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBack />} onClick={() => navigate('/portal')}>{t('portal.backToList')}</Button>
      </Box>
    );
  }

  const d = expediente.declaracion;
  const progress = computeProgress(expediente.checklist);
  const activeStep = STATUS_ORDER.indexOf(expediente.status);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/portal')}>{t('portal.backToList')}</Button>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>{expediente.reference}</Typography>
        <Chip label={t(`status.${expediente.status}`)} color={expediente.status === ExpedienteStatus.Completo ? 'success' : 'primary'} />
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('portal.statusTimeline')}</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Stepper activeStep={activeStep} alternativeLabel sx={{ minWidth: 900 }}>
              {STATUS_ORDER.map((s) => (
                <Step key={s} completed={STATUS_ORDER.indexOf(s) < activeStep || expediente.status === ExpedienteStatus.Completo}>
                  <StepLabel>{t(`status.${s}`)}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('detail.declaracion')}</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 4 }}><Field label="ETA" value={fmtDate(d.eta)} /></Grid>
                <Grid size={{ xs: 6, sm: 4 }}><Field label={t('detail.noDeclaracion')} value={d.noDeclaracion} /></Grid>
                <Grid size={{ xs: 6, sm: 4 }}><Field label={t('detail.docEmbarque')} value={d.docEmbarque} /></Grid>
                <Grid size={{ xs: 6, sm: 4 }}><Field label={t('detail.tipoDespacho')} value={d.tipoDespacho} /></Grid>
                <Grid size={{ xs: 6, sm: 4 }}><Field label={t('detail.administracionNombre')} value={d.administracionNombre} /></Grid>
                <Grid size={{ xs: 6, sm: 4 }}><Field label={t('detail.paisProcedenciaNombre')} value={d.paisProcedenciaNombre} /></Grid>
                <Grid size={{ xs: 6, sm: 4 }}><Field label={t('detail.puertoEntrada')} value={d.puertoEntrada} /></Grid>
                <Grid size={{ xs: 6, sm: 4 }}><Field label={t('detail.regimenAduanero')} value={expediente.regimenAduanero.nombre} /></Grid>
                <Grid size={{ xs: 6, sm: 4 }}><Field label={t('detail.valorCifTotal')} value={`$${expediente.valores.valorCifTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} /></Grid>
                <Grid size={{ xs: 6, sm: 4 }}><Field label={t('expediente.gestor')} value={expediente.gestor} /></Grid>
              </Grid>
            </CardContent>
          </Card>

          {expediente.contenedores.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('detail.contenedores')}</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('detail.tipoContenedor')}</TableCell>
                      <TableCell>{t('detail.noContenedor')}</TableCell>
                      <TableCell>{t('detail.sello1')}</TableCell>
                      <TableCell>{t('detail.sello2')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expediente.contenedores.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.tipo}</TableCell><TableCell>{c.numero}</TableCell><TableCell>{c.sello1}</TableCell><TableCell>{c.sello2}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('detail.renglones')} ({expediente.partidas.length})</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('detail.codigoPartida')}</TableCell>
                      <TableCell>{t('detail.descripcion')}</TableCell>
                      <TableCell align="right">{t('detail.cantidad')}</TableCell>
                      <TableCell>{t('detail.unidad')}</TableCell>
                      <TableCell>{t('detail.paisOrigen')}</TableCell>
                      <TableCell align="right">{t('detail.valorFob')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expediente.partidas.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.codigoPartida}</TableCell>
                        <TableCell>{p.descripcion}</TableCell>
                        <TableCell align="right">{p.cantidad}</TableCell>
                        <TableCell>{p.unidad}</TableCell>
                        <TableCell>{p.paisOrigen}</TableCell>
                        <TableCell align="right">{p.valorFob.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('expediente.checklist')}</Typography>
              <Typography variant="body2" color="text.secondary">{progress}%</Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ mb: 2, height: 8, borderRadius: 4 }} />
              {expediente.checklist.map((item) => (
                <Box key={item.id}>
                  <FormControlLabel
                    control={<Checkbox checked={item.completed} disabled />}
                    label={<Typography variant="body2" sx={{ textDecoration: item.completed ? 'line-through' : 'none' }}>{item.label}</Typography>}
                  />
                  <Divider />
                </Box>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <ObservationsTimeline items={expediente.observaciones} readOnly />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
