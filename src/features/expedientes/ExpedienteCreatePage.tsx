import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Box, Button, Card, CardContent, Grid, MenuItem, TextField, Typography, Alert } from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { useExpedientesStore } from '../../store/expedientesStore';
import type { ExpedienteStatus } from '../../types';

const DEFAULT_CHECKLIST = [
  { id: crypto.randomUUID(), label: 'Documentos de importación recibidos', completed: false, completedAt: null },
  { id: crypto.randomUUID(), label: 'Factura comercial verificada', completed: false, completedAt: null },
  { id: crypto.randomUUID(), label: 'BL / Doc. Embarque recibido y revisado', completed: false, completedAt: null },
  { id: crypto.randomUUID(), label: 'Clasificación arancelaria asignada', completed: false, completedAt: null },
  { id: crypto.randomUUID(), label: 'Permisos y certificados verificados', completed: false, completedAt: null },
  { id: crypto.randomUUID(), label: 'Declaración aduanera generada', completed: false, completedAt: null },
  { id: crypto.randomUUID(), label: 'Pago de impuestos realizado', completed: false, completedAt: null },
  { id: crypto.randomUUID(), label: 'Despacho aduanal completado', completed: false, completedAt: null },
];

export default function ExpedienteCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useExpedientesStore((s) => s.create);

  /* basic fields */
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<ExpedienteStatus>('pending');
  const [notes, setNotes] = useState('');

  /* declaración */
  const [idSecuencia, setIdSecuencia] = useState('');
  const [eta, setEta] = useState('');
  const [tipoDespacho, setTipoDespacho] = useState('');
  const [administracionCodigo, setAdminCodigo] = useState('');
  const [administracionNombre, setAdminNombre] = useState('');
  const [noDeclaracion, setNoDeclaracion] = useState('');
  const [docEmbarque, setDocEmbarque] = useState('');
  const [puertoEntrada, setPuertoEntrada] = useState('');
  const [paisCodigo, setPaisCodigo] = useState('');
  const [paisNombre, setPaisNombre] = useState('');
  const [facturaComercialNo, setFacturaComercialNo] = useState('');

  /* importador */
  const [importadorCodigo, setImportadorCodigo] = useState('');
  const [importadorNombre, setImportadorNombre] = useState('');

  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create({
      reference: reference || noDeclaracion,
      status,
      checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c, id: crypto.randomUUID() })),
      declaracion: {
        idSecuencia, eta, tipoDespacho,
        administracionCodigo, administracionNombre,
        noDeclaracion, docEmbarque,
        depositoDestino: '', puertoEntrada,
        paisProcedenciaCodigo: paisCodigo, paisProcedenciaNombre: paisNombre,
        facturaComercialNo,
      },
      importador: { codigo: importadorCodigo, nombre: importadorNombre },
      agenteAduanal: { codigo: '1', nombre: 'ARMESSAG, SRL' },
      consignatario: { codigo: importadorCodigo, nombre: importadorNombre },
      compradorExportacion: { codigo: '0', nombre: '' },
      suplidores: [],
      documentos: [],
      contenedores: [],
      tipoCarga: 'contenedores',
      valores: { tasaCambio: 65, valorFobTotal: 0, seguro: 0, flete: 0, otros: 0, valorCifTotal: 0 },
      regimenAduanero: { codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' },
      pesoMercancia: { codigoMercancia: '', pesoBrutoKg: 0, pesoNetoKg: 0 },
      partidas: [],
      notes,
      assignedUserId: '2',
    });
    setSuccess(true);
    setTimeout(() => navigate('/expedientes'), 1000);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/expedientes')}>{t('common.cancel')}</Button>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('expediente.newExpediente')}</Typography>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{t('expediente.createSuccess')}</Alert>}

      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            {/* Declaración */}
            <Typography variant="h6" sx={{ mb: 1 }}>{t('detail.declaracion')}</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.idSecuencia')} value={idSecuencia} onChange={(e) => setIdSecuencia(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="date" label="ETA" value={eta} onChange={(e) => setEta(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.tipoDespacho')} value={tipoDespacho} onChange={(e) => setTipoDespacho(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.administracionCodigo')} value={administracionCodigo} onChange={(e) => setAdminCodigo(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth label={t('detail.administracionNombre')} value={administracionNombre} onChange={(e) => setAdminNombre(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth required label={t('detail.noDeclaracion')} value={noDeclaracion} onChange={(e) => setNoDeclaracion(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('detail.docEmbarque')} value={docEmbarque} onChange={(e) => setDocEmbarque(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('detail.puertoEntrada')} value={puertoEntrada} onChange={(e) => setPuertoEntrada(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 3 }}><TextField fullWidth label={t('detail.paisProcedenciaCodigo')} value={paisCodigo} onChange={(e) => setPaisCodigo(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 3 }}><TextField fullWidth label={t('detail.paisProcedenciaNombre')} value={paisNombre} onChange={(e) => setPaisNombre(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.facturaComercialNo')} value={facturaComercialNo} onChange={(e) => setFacturaComercialNo(e.target.value)} /></Grid>
            </Grid>

            {/* Importador */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>{t('detail.importador')}</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth required label={t('detail.codigo')} value={importadorCodigo} onChange={(e) => setImportadorCodigo(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth required label={t('detail.nombre')} value={importadorNombre} onChange={(e) => setImportadorNombre(e.target.value)} /></Grid>
            </Grid>

            {/* General */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>{t('detail.generalInfo')}</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('expediente.reference')} value={reference} onChange={(e) => setReference(e.target.value)} helperText={t('detail.referenceHint')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label={t('expediente.status')} value={status} onChange={(e) => setStatus(e.target.value as ExpedienteStatus)}>
                  {(['pending', 'in-progress', 'completed', 'alert'] as ExpedienteStatus[]).map((s) => (
                    <MenuItem key={s} value={s}>{t(`status.${s}`)}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={12}><TextField fullWidth multiline rows={3} label={t('expediente.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} /></Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button variant="contained" type="submit" startIcon={<Save />}>{t('expediente.save')}</Button>
              <Button variant="outlined" onClick={() => navigate('/expedientes')}>{t('common.cancel')}</Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
