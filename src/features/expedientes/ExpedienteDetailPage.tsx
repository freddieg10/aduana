import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, LinearProgress, Typography,
} from '@mui/material';
import { ArrowBack, Save, Delete, FlightLand, FlightTakeoff, Person, SupportAgent, Article } from '@mui/icons-material';
import { useExpedientesStore, computeProgress } from '../../store/expedientesStore';
import { useAuthStore } from '../../store/authStore';
import { ExpedienteStatus } from '../../types';
import type { ExpedienteFormData } from '../../types';
import { fmtDate } from '../../utils/date';
import { toFormData } from '../../utils/expedienteDefaults';
import ExpedienteForm from '../../components/ExpedienteForm';
import ObservationsTimeline from '../../components/ObservationsTimeline';
import HojaRegistroDialog from '../../components/HojaRegistroDialog';

export default function ExpedienteDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const expediente = useExpedientesStore((s) => s.expedientes.find((e) => e.id === id));
  const currentUser = useAuthStore((s) => s.user);
  const update = useExpedientesStore((s) => s.update);
  const remove = useExpedientesStore((s) => s.remove);
  const toggleChecklistItem = useExpedientesStore((s) => s.toggleChecklistItem);
  const addObservacion = useExpedientesStore((s) => s.addObservacion);
  const updateObservacion = useExpedientesStore((s) => s.updateObservacion);
  const removeObservacion = useExpedientesStore((s) => s.removeObservacion);
  const toggleObservacionPublica = useExpedientesStore((s) => s.toggleObservacionPublica);

  const [form, setForm] = useState<ExpedienteFormData | null>(() => (expediente ? toFormData(expediente) : null));
  const [saved, setSaved] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [hojaOpen, setHojaOpen] = useState(false);

  if (!expediente || !form) {
    return (
      <Box>
        <Alert severity="error">{t('expediente.noResults')}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/expedientes')}>{t('common.cancel')}</Button>
      </Box>
    );
  }

  const progress = computeProgress(expediente.checklist);
  const usuario = currentUser?.name ?? 'Usuario';

  const handleSave = () => {
    update(expediente.id, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => { remove(expediente.id); navigate('/expedientes'); };

  const checklistTab = (
    <Card><CardContent>
      <Typography variant="h6" gutterBottom>{t('expediente.checklist')}</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {expediente.checklist.filter((c) => c.completed).length} / {expediente.checklist.length} — {progress}%
      </Typography>
      <LinearProgress variant="determinate" value={progress} sx={{ mb: 2, height: 8, borderRadius: 4 }} />
      {expediente.checklist.map((item) => (
        <Box key={item.id}>
          <FormControlLabel
            control={<Checkbox checked={item.completed} onChange={() => toggleChecklistItem(expediente.id, item.id)} />}
            label={
              <Box>
                <Typography variant="body1" sx={{ textDecoration: item.completed ? 'line-through' : 'none' }}>{item.label}</Typography>
                {item.completedAt && <Typography variant="caption" color="text.secondary">{fmtDate(item.completedAt)}</Typography>}
              </Box>
            }
          />
          <Divider />
        </Box>
      ))}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>{t('detail.checklistHint')}</Typography>
    </CardContent></Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/expedientes')}>{t('common.cancel')}</Button>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>{expediente.reference}</Typography>
        <Chip
          icon={expediente.tipoExpediente === 'importacion' ? <FlightLand fontSize="small" /> : <FlightTakeoff fontSize="small" />}
          label={t(`expediente.tipo_${expediente.tipoExpediente}`)}
          color={expediente.tipoExpediente === 'importacion' ? 'info' : 'secondary'}
        />
        <Chip label={t(`status.${expediente.status}`)} color={expediente.status === ExpedienteStatus.Completo ? 'success' : 'primary'} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{progress}%</Typography>
        <Button variant="outlined" startIcon={<Article />} onClick={() => setHojaOpen(true)}>{t('detail.hojaRegistro')}</Button>
        <Button variant="contained" startIcon={<Save />} onClick={handleSave}>{t('expediente.save')}</Button>
        <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => setDeleteConfirmOpen(true)}>{t('expediente.delete')}</Button>
      </Box>

      {/* Assignment row */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip icon={<Person />} variant="outlined" label={`${t('expediente.digitador')}: ${form.digitador || '—'}`} />
        <Chip icon={<SupportAgent />} variant="outlined" color="secondary" label={`${t('expediente.gestor')}: ${form.gestor || '—'}`} />
        {expediente.declaracion.eta && <Chip variant="outlined" label={`ETA: ${fmtDate(expediente.declaracion.eta)}`} />}
      </Box>

      <LinearProgress variant="determinate" value={progress} sx={{ mb: 3, height: 8, borderRadius: 4 }} />
      {saved && <Alert severity="success" sx={{ mb: 2 }}>{t('expediente.saveSuccess')}</Alert>}

      <ExpedienteForm
        value={form}
        onChange={setForm}
        extraTabs={[{ label: t('expediente.checklist'), content: checklistTab }]}
      />

      <Box sx={{ mt: 2 }}>
        <Button variant="contained" startIcon={<Save />} onClick={handleSave}>{t('expediente.save')}</Button>
      </Box>

      {/* Observations persist immediately; they are not part of the Save button. */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <ObservationsTimeline
            items={expediente.observaciones}
            onAdd={(texto, publica) => addObservacion(expediente.id, usuario, texto, publica)}
            onEdit={(obsId, texto) => updateObservacion(expediente.id, obsId, texto)}
            onDelete={(obsId) => removeObservacion(expediente.id, obsId)}
            onTogglePublica={(obsId) => toggleObservacionPublica(expediente.id, obsId)}
          />
        </CardContent>
      </Card>

      {hojaOpen && <HojaRegistroDialog expediente={expediente} onClose={() => setHojaOpen(false)} />}

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>{t('expediente.delete')}</DialogTitle>
        <DialogContent>{t('expediente.confirmDelete')}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>{t('expediente.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
