import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import { ArrowBack, Save, FlightLand, FlightTakeoff } from '@mui/icons-material';
import { useExpedientesStore } from '../../store/expedientesStore';
import { useAuthStore } from '../../store/authStore';
import type { ExpedienteFormData, Observacion, TipoExpediente } from '../../types';
import { makeDefaultChecklist } from '../../data/catalogos';
import { makeObservacion } from '../../utils/observaciones';
import { emptyFormData } from '../../utils/expedienteDefaults';
import { useSettingsStore } from '../../store/settingsStore';
import ExpedienteForm from '../../components/ExpedienteForm';
import ObservationsTimeline from '../../components/ObservationsTimeline';

export default function ExpedienteCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useAuthStore((s) => s.user);
  const create = useExpedientesStore((s) => s.create);

  const tipoFromUrl = (searchParams.get('tipo') as TipoExpediente) || 'importacion';
  const tasaUsd = useSettingsStore((s) => s.tasaUsd);
  const [form, setForm] = useState<ExpedienteFormData>(() => {
    const base = emptyFormData(tipoFromUrl);
    return { ...base, valores: { ...base.valores, tasaCambio: tasaUsd } };
  });
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [success, setSuccess] = useState(false);

  const usuario = currentUser?.name ?? 'Usuario';

  const handleCreate = () => {
    create({
      ...form,
      reference: form.reference || form.declaracion.noDeclaracion,
      checklist: makeDefaultChecklist(),
      observaciones,
      assignedUserId: currentUser?.id ?? '2',
    });
    setSuccess(true);
    setTimeout(() => navigate('/expedientes'), 1000);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/expedientes')}>{t('common.cancel')}</Button>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('expediente.newExpediente')}</Typography>
        <Chip
          icon={form.tipoExpediente === 'importacion' ? <FlightLand fontSize="small" /> : <FlightTakeoff fontSize="small" />}
          label={t(`expediente.tipo_${form.tipoExpediente}`)}
          color={form.tipoExpediente === 'importacion' ? 'info' : 'secondary'}
        />
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{t('expediente.createSuccess')}</Alert>}

      <ExpedienteForm value={form} onChange={setForm} />

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <ObservationsTimeline
            items={observaciones}
            onAdd={(texto, publica) => setObservaciones((prev) => [...prev, makeObservacion(usuario, texto, publica)])}
            onTogglePublica={(id) => setObservaciones((prev) => prev.map((o) => (o.id === id ? { ...o, publica: !o.publica } : o)))}
            onEdit={(id, texto) => setObservaciones((prev) => prev.map((o) => (o.id === id ? { ...o, texto } : o)))}
            onDelete={(id) => setObservaciones((prev) => prev.filter((o) => o.id !== id))}
          />
        </CardContent>
      </Card>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="contained" startIcon={<Save />} onClick={handleCreate} disabled={!form.declaracion.noDeclaracion && !form.reference}>
          {t('expediente.save')}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/expedientes')}>{t('common.cancel')}</Button>
      </Box>
    </Box>
  );
}
