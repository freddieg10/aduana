import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Box, Button, Card, CardContent, Chip, Grid, IconButton, InputAdornment, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Paper,
} from '@mui/material';
import { Add, Delete, Save } from '@mui/icons-material';
import { useSettingsStore, type TarifaServicio } from '../../store/settingsStore';
import { fmtDateTime } from '../../utils/date';

/** Editable list of names (digitadores / gestores). */
function ListaNombres({ titulo, nombres, onChange }: { titulo: string; nombres: string[]; onChange: (n: string[]) => void }) {
  const { t } = useTranslation();
  const [nuevo, setNuevo] = useState('');
  const agregar = () => {
    const v = nuevo.trim();
    if (!v || nombres.includes(v)) return;
    onChange([...nombres, v]);
    setNuevo('');
  };
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>{titulo}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {nombres.map((n) => (
            <Chip key={n} label={n} onDelete={() => onChange(nombres.filter((x) => x !== n))} />
          ))}
          {nombres.length === 0 && <Typography variant="body2" color="text.secondary">{t('settings.sinNombres')}</Typography>}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small" fullWidth placeholder={t('settings.nuevoNombre')}
            value={nuevo} onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') agregar(); }}
          />
          <Button variant="outlined" startIcon={<Add />} onClick={agregar} disabled={!nuevo.trim()}>{t('common.confirm')}</Button>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const {
    tasaUsd, tasaUsdActualizada, diasArt52, tarifario, digitadores, gestores,
    setTasaUsd, setDiasArt52, addTarifa, updateTarifa, removeTarifa, setDigitadores, setGestores,
  } = useSettingsStore();

  const [tasaDraft, setTasaDraft] = useState(String(tasaUsd));
  const [diasDraft, setDiasDraft] = useState(String(diasArt52));
  const [guardado, setGuardado] = useState(false);

  const guardarGenerales = () => {
    const tasa = Number(tasaDraft);
    const dias = Number(diasDraft);
    if (tasa > 0) setTasaUsd(tasa);
    if (dias > 0) setDiasArt52(Math.round(dias));
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  };

  const upd = (id: string, patch: Partial<TarifaServicio>) => updateTarifa(id, patch);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>{t('settings.title')}</Typography>

      {guardado && <Alert severity="success" sx={{ mb: 2 }}>{t('expediente.saveSuccess')}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('settings.generales')}</Typography>
          <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth type="number" label={t('settings.tasaUsd')}
                value={tasaDraft} onChange={(e) => setTasaDraft(e.target.value)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start">RD$</InputAdornment> } }}
                helperText={tasaUsdActualizada ? t('settings.tasaActualizada', { fecha: fmtDateTime(tasaUsdActualizada) }) : t('settings.tasaNunca')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth type="number" label={t('settings.diasArt52')}
                value={diasDraft} onChange={(e) => setDiasDraft(e.target.value)}
                helperText={t('settings.diasArt52Hint')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Button variant="contained" startIcon={<Save />} onClick={guardarGenerales} sx={{ mt: 1 }}>
                {t('expediente.save')}
              </Button>
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>{t('settings.tasaAutoNota')}</Alert>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('settings.tarifario')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('settings.tarifarioHint')}</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('settings.servicio')}</TableCell>
                  <TableCell align="right">{t('settings.precio')}</TableCell>
                  <TableCell>{t('settings.moneda')}</TableCell>
                  <TableCell>{t('settings.notas')}</TableCell>
                  <TableCell width={50} />
                </TableRow>
              </TableHead>
              <TableBody>
                {tarifario.map((tf) => (
                  <TableRow key={tf.id}>
                    <TableCell><TextField size="small" variant="standard" fullWidth value={tf.servicio} onChange={(e) => upd(tf.id, { servicio: e.target.value })} /></TableCell>
                    <TableCell align="right"><TextField size="small" variant="standard" type="number" value={tf.precio} onChange={(e) => upd(tf.id, { precio: Number(e.target.value) })} sx={{ width: 110 }} /></TableCell>
                    <TableCell>
                      <TextField select size="small" variant="standard" value={tf.moneda} onChange={(e) => upd(tf.id, { moneda: e.target.value as TarifaServicio['moneda'] })} sx={{ width: 90 }}>
                        <MenuItem value="DOP">DOP</MenuItem>
                        <MenuItem value="USD">USD</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell><TextField size="small" variant="standard" fullWidth value={tf.notas} onChange={(e) => upd(tf.id, { notas: e.target.value })} /></TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => removeTarifa(tf.id)}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button size="small" startIcon={<Add />} sx={{ mt: 1 }} onClick={() => addTarifa({ servicio: '', precio: 0, moneda: 'DOP', notas: '' })}>
            {t('settings.addTarifa')}
          </Button>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}><ListaNombres titulo={t('expediente.digitador')} nombres={digitadores} onChange={setDigitadores} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><ListaNombres titulo={t('expediente.gestor')} nombres={gestores} onChange={setGestores} /></Grid>
      </Grid>
    </Box>
  );
}
