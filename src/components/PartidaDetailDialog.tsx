import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControlLabel, Grid, MenuItem, TextField, Typography,
} from '@mui/material';
import type { Partida } from '../types';
import { ESTADOS_PRODUCTO } from '../data/catalogos';

interface Props {
  /** The line being edited. The parent mounts this dialog only while one is open. */
  partida: Partida;
  onClose: () => void;
  onSave: (p: Partida) => void;
}

function Section({ children }: { children: React.ReactNode }) {
  return <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>{children}</Typography>;
}

/**
 * The per-renglón detail ("ojito"): everything SIGA accepts on a tariff line that the grid
 * does not show — brand/model, condition, origin certificate, alcohol grade, retail price
 * and the vehicle block. Edits are held locally and applied on Guardar.
 */
export default function PartidaDetailDialog({ partida, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Partida>(partida);

  const set = (p: Partial<Partida>) => setDraft({ ...draft, ...p });
  const setVeh = (p: Partial<Partida['vehiculo']>) => setDraft({ ...draft, vehiculo: { ...draft.vehiculo, ...p } });

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('detail.detalleRenglon')}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {draft.codigoPartida} {draft.descripcion}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Section>{t('detail.detalleProducto')}</Section>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label={t('detail.marca')} value={draft.marca} onChange={(e) => set({ marca: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label={t('detail.modelo')} value={draft.modelo} onChange={(e) => set({ modelo: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth size="small" label={t('detail.estadoProducto')} value={draft.estadoProducto} onChange={(e) => set({ estadoProducto: e.target.value })}>
              {ESTADOS_PRODUCTO.map((x) => <MenuItem key={x.codigo} value={x.codigo}>{x.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label={t('detail.anio')} value={draft.anio} onChange={(e) => set({ anio: e.target.value })} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" type="number" label={t('detail.pesoKg')} value={draft.pesoKg} onChange={(e) => set({ pesoKg: Number(e.target.value) })} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label={t('detail.serial')} value={draft.serial} onChange={(e) => set({ serial: e.target.value })} /></Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label={t('detail.especificacion')} value={draft.especificacion} onChange={(e) => set({ especificacion: e.target.value })} /></Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth size="small" multiline rows={2} label={t('detail.descripcionAdicional')} value={draft.descripcionAdicional} onChange={(e) => set({ descripcionAdicional: e.target.value })} /></Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        <Section>{t('detail.detalleCondiciones')}</Section>
        <Grid container spacing={2} sx={{ mt: 0, alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControlLabel control={<Checkbox checked={draft.temporal} onChange={() => set({ temporal: !draft.temporal })} />} label={t('detail.temporal')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel control={<Checkbox checked={draft.certificadoOrigen} onChange={() => set({ certificadoOrigen: !draft.certificadoOrigen })} />} label={t('detail.certificadoOrigen')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField fullWidth size="small" label={t('detail.certificadoOrigenNo')} value={draft.certificadoOrigenNo} disabled={!draft.certificadoOrigen} onChange={(e) => set({ certificadoOrigenNo: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" type="number" label={t('detail.gradoAlcohol')} value={draft.gradoAlcohol} onChange={(e) => set({ gradoAlcohol: Number(e.target.value) })} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" type="number" label={t('detail.precioVentaMenor')} value={draft.precioVentaMenor} onChange={(e) => set({ precioVentaMenor: Number(e.target.value) })} /></Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        <Section>{t('detail.detalleVehiculo')}</Section>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label={t('detail.vehiculoTipo')} value={draft.vehiculo.tipo} onChange={(e) => setVeh({ tipo: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth size="small" label={t('detail.vehiculoChasis')} value={draft.vehiculo.chasis} onChange={(e) => setVeh({ chasis: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label={t('detail.vehiculoColor')} value={draft.vehiculo.color} onChange={(e) => setVeh({ color: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label={t('detail.vehiculoMotor')} value={draft.vehiculo.motor} onChange={(e) => setVeh({ motor: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" type="number" label={t('detail.vehiculoCc')} value={draft.vehiculo.cc} onChange={(e) => setVeh({ cc: Number(e.target.value) })} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={() => onSave(draft)}>{t('expediente.save')}</Button>
      </DialogActions>
    </Dialog>
  );
}
