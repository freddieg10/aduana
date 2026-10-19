import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Calculate, Restore } from '@mui/icons-material';
import type { ExpedienteFormData, Partida, TasasRenglon } from '../types';
import { cargarArancel, type Arancel } from '../data/arancel';
import { useSettingsStore } from '../store/settingsStore';
import { preliquidar } from '../utils/preliquidacion';
import { sugerirTasas, type TasasSugeridas } from '../utils/tasas';
import { aplicarPreliquidacion, editarTasa, estadoRenglon, tasasVigentes } from '../utils/preliquidacionExpediente';
import { fmtDateTime } from '../utils/date';

interface Props {
  value: ExpedienteFormData;
  onChange: (next: ExpedienteFormData) => void;
}

const rd = (n: number) => n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A compact percentage / amount input for one rate of one line. */
function CampoTasa({ valor, onChange, width = 64, label }: { valor: number | undefined; onChange: (n: number) => void; width?: number; label?: string }) {
  return (
    <TextField
      size="small" variant="standard" type="number" value={valor ?? ''} placeholder="—"
      onChange={(e) => onChange(Number(e.target.value))}
      slotProps={{ htmlInput: { min: 0, step: 'any', 'aria-label': label, style: { textAlign: 'right' } } }}
      sx={{ width }}
    />
  );
}

/**
 * The Preliquidación tab: loads the arancel the first time it opens, freezes rates per line on
 * "Preliquidar", lets the digitador correct any rate, and shows what the declaration will owe.
 * The figures are always recomputed from the current values; only the rates are stored.
 */
export default function PreliquidacionTab({ value, onChange }: Props) {
  const { t } = useTranslation();
  const montos = useSettingsStore((s) => s.iscMontos);
  const [arancel, setArancel] = useState<Arancel | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<{ cargados: number; noEnArancel: string[] } | null>(null);
  const [confirmarRestablecer, setConfirmarRestablecer] = useState(false);

  useEffect(() => {
    let vivo = true;
    cargarArancel()
      .then((a) => { if (vivo) { setArancel(a); setErrorCarga(false); } })
      .catch(() => { if (vivo) setErrorCarga(true); });
    return () => { vivo = false; };
  }, [intento]);

  const pre = value.preliquidacion;
  /* Loose cargo pays per kilo or tonne, which is not modelled; only containers add a fee. */
  const contenedores = useMemo(
    () => (value.tipoCarga === 'contenedores' ? value.contenedores : []),
    [value.tipoCarga, value.contenedores],
  );
  const calculo = useMemo(
    () => preliquidar({ partidas: value.partidas, valores: value.valores, contenedores, resolverTasas: (p) => tasasVigentes(p, pre)?.tasas }),
    [value.partidas, value.valores, contenedores, pre],
  );
  const sugeridas = useMemo(() => {
    const m = new Map<string, TasasSugeridas | null>();
    if (arancel) for (const p of value.partidas) m.set(p.id, sugerirTasas(p.codigoPartida, arancel, montos));
    return m;
  }, [arancel, value.partidas, montos]);

  if (value.tipoExpediente === 'exportacion') {
    return <Card><CardContent><Alert severity="info">{t('preliq.exportacion')}</Alert></CardContent></Card>;
  }

  const ejecutar = (restablecer: boolean) => {
    if (!arancel) return;
    const r = aplicarPreliquidacion(value, arancel, montos, new Date(), { restablecer });
    onChange({ ...value, preliquidacion: r.preliquidacion, status: r.status });
    setResultado({ cargados: Object.keys(r.preliquidacion.tasas).length, noEnArancel: r.noEnArancel.map((p) => p.codigoPartida || '—') });
    setConfirmarRestablecer(false);
  };
  const hayManuales = Object.values(pre?.tasas ?? {}).some((x) => x.manual);
  const editar = (p: Partida, cambio: Partial<TasasRenglon>) =>
    onChange({ ...value, preliquidacion: editarTasa(pre, p, cambio, new Date()) });

  /* ---- warnings ---- */
  const avisos: { severidad: 'error' | 'warning' | 'info'; texto: string }[] = [];
  const fobRenglones = value.partidas.reduce((s, p) => s + p.valorFob, 0);
  if (calculo.advertencias.includes('tasaCambio')) avisos.push({ severidad: 'error', texto: t('preliq.avisoTasaCambio') });
  if (value.valores.valorFobTotal > 0 && Math.abs(fobRenglones - value.valores.valorFobTotal) > 0.01) {
    avisos.push({ severidad: 'warning', texto: t('preliq.avisoFob', { renglones: usd(fobRenglones), declarado: usd(value.valores.valorFobTotal) }) });
  }
  if (value.regimenAduanero.codigo && value.regimenAduanero.codigo !== '1') {
    avisos.push({ severidad: 'info', texto: t('preliq.avisoRegimen', { regimen: value.regimenAduanero.nombre || value.regimenAduanero.codigo }) });
  }
  if (value.regimenAduanero.acuerdo) avisos.push({ severidad: 'info', texto: t('preliq.avisoAcuerdo', { acuerdo: value.regimenAduanero.acuerdo }) });
  if (value.tipoCarga === 'carga_suelta') avisos.push({ severidad: 'info', texto: t('preliq.avisoCargaSuelta') });
  for (const a of calculo.advertencias) {
    const [tipo, codigo] = a.split(':');
    if (tipo === 'precioVentaMenor') avisos.push({ severidad: 'warning', texto: t('preliq.avisoPrecioVenta', { codigo }) });
    if (tipo === 'gradoAlcohol') avisos.push({ severidad: 'warning', texto: t('preliq.avisoGrado', { codigo }) });
  }
  for (const l of calculo.lineas) {
    if (l.tasas.iscEspecificoTipo === 'alcohol' && value.partidas.find((p) => p.id === l.partidaId)?.unidad !== 'LITROS') {
      avisos.push({ severidad: 'warning', texto: t('preliq.avisoUnidadAlcohol', { codigo: l.codigoPartida }) });
    }
    if (l.tasas.iscEspecificoTipo === 'unidad' && value.partidas.find((p) => p.id === l.partidaId)?.unidad !== 'UNIDADES') {
      avisos.push({ severidad: 'warning', texto: t('preliq.avisoUnidadTabaco', { codigo: l.codigoPartida }) });
    }
  }
  const sinTasas = pre ? calculo.lineas.filter((l) => l.sinTasas).length : 0;
  if (sinTasas) avisos.push({ severidad: 'warning', texto: t('preliq.avisoSinTasas', { count: sinTasas }) });

  const tot = calculo.totales;
  const filaTotal = (label: string, monto: number, fuerte = false) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderTop: fuerte ? 1 : 0, borderColor: 'divider' }}>
      <Typography variant={fuerte ? 'subtitle1' : 'body2'} sx={{ fontWeight: fuerte ? 700 : 400 }}>{label}</Typography>
      <Typography variant={fuerte ? 'subtitle1' : 'body2'} sx={{ fontWeight: fuerte ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>RD$ {rd(monto)}</Typography>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card><CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('preliq.titulo')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {pre ? t('preliq.hechaEl', { fecha: fmtDateTime(pre.fecha) }) : t('preliq.noHecha')}
            </Typography>
          </Box>
          {pre && (
            <Button variant="outlined" startIcon={<Restore />} disabled={!arancel}
              onClick={() => (hayManuales ? setConfirmarRestablecer(true) : ejecutar(true))}>
              {t('preliq.restablecer')}
            </Button>
          )}
          <Button variant="contained" startIcon={arancel || errorCarga ? <Calculate /> : <CircularProgress size={16} color="inherit" />}
            disabled={!arancel || value.partidas.length === 0} onClick={() => ejecutar(false)}>
            {t('preliq.preliquidar')}
          </Button>
        </Box>
        {!pre && <Typography variant="body2" sx={{ mt: 2 }}>{t('preliq.explicacion')}</Typography>}
        {value.partidas.length === 0 && <Alert severity="info" sx={{ mt: 2 }}>{t('preliq.sinRenglones')}</Alert>}
        {errorCarga && (
          <Alert severity="error" sx={{ mt: 2 }} action={<Button color="inherit" size="small" onClick={() => setIntento((n) => n + 1)}>{t('preliq.reintentar')}</Button>}>
            {t('preliq.errorArancel')}
          </Alert>
        )}
        {resultado && (
          <Alert severity={resultado.noEnArancel.length ? 'warning' : 'success'} sx={{ mt: 2 }} onClose={() => setResultado(null)}>
            {t('preliq.resultado', { count: resultado.cargados })}
            {resultado.noEnArancel.length > 0 && <> {t('preliq.resultadoNoEnArancel', { codigos: resultado.noEnArancel.join(', ') })}</>}
            {' '}{t('preliq.guardar')}
          </Alert>
        )}
      </CardContent></Card>

      {pre && (
        <>
          {avisos.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {avisos.map((a) => <Alert key={a.texto} severity={a.severidad}>{a.texto}</Alert>)}
            </Box>
          )}

          <Card><CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>{t('preliq.renglon')}</TableCell>
                    <TableCell align="right">{t('preliq.cifRd')}</TableCell>
                    <TableCell align="right">{t('preliq.pctGravamen')}</TableCell>
                    <TableCell align="right">{t('preliq.gravamen')}</TableCell>
                    <TableCell align="right">{t('preliq.pctIsc')}</TableCell>
                    <TableCell align="right">{t('preliq.isc')}</TableCell>
                    <TableCell align="right">{t('preliq.pctItbis')}</TableCell>
                    <TableCell align="right">{t('preliq.itbis')}</TableCell>
                    <TableCell align="right">{t('preliq.total')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {value.partidas.map((p, i) => {
                    const l = calculo.lineas[i];
                    const v = tasasVigentes(p, pre)?.tasas;
                    const estado = estadoRenglon(p, pre);
                    const s = sugeridas.get(p.id);
                    const monto = (n: number) => (l.sinTasas ? '—' : rd(n));
                    return (
                      <TableRow key={p.id} sx={{ verticalAlign: 'top' }}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.codigoPartida || '—'}</Typography>
                            {estado === 'manual' && <Chip size="small" label={t('preliq.estadoManual')} />}
                            {estado === 'codigoCambio' && <Chip size="small" color="warning" label={t('preliq.estadoCodigoCambio')} />}
                            {estado === 'pendiente' && <Chip size="small" color="warning" label={t('preliq.estadoPendiente')} />}
                          </Box>
                          <Typography variant="caption" sx={{ display: 'block' }}>{p.descripcion}</Typography>
                          {arancel && s && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('preliq.segunArancel', { descripcion: s.arancel.descripcion })}</Typography>}
                          {arancel && s === null && <Typography variant="caption" color="error" sx={{ display: 'block' }}>{t('preliq.noEnArancel')}</Typography>}
                          {s?.notas.map((n) => <Typography key={n} variant="caption" color="warning.main" sx={{ display: 'block' }}>{t(`preliq.nota_${n}`)}</Typography>)}
                        </TableCell>
                        <TableCell align="right">{rd(l.cifRd)}</TableCell>
                        <TableCell align="right"><CampoTasa label={t('preliq.pctGravamen')} valor={v?.gravamen} onChange={(n) => editar(p, { gravamen: n })} /></TableCell>
                        <TableCell align="right">{monto(l.gravamen)}</TableCell>
                        <TableCell align="right">
                          <CampoTasa label={t('preliq.pctIsc')} valor={v?.isc} onChange={(n) => editar(p, { isc: n })} />
                          {v && v.iscEspecificoTipo !== 'ninguno' && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('preliq.sobreVentaMenor')}</Typography>
                              <CampoTasa width={80} label={t('preliq.especifico')} valor={v.iscEspecificoMonto} onChange={(n) => editar(p, { iscEspecificoMonto: n })} />
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {t(v.iscEspecificoTipo === 'alcohol' ? 'preliq.porLitroAlcohol' : 'preliq.porCajetilla')}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="right">{monto(l.isc)}</TableCell>
                        <TableCell align="right"><CampoTasa label={t('preliq.pctItbis')} valor={v?.itbis} onChange={(n) => editar(p, { itbis: n })} /></TableCell>
                        <TableCell align="right">{monto(l.itbis)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{monto(l.total)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent></Card>

          <Card sx={{ maxWidth: 480, alignSelf: 'flex-end', width: '100%' }}><CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{t('preliq.resumen')}</Typography>
            {filaTotal(t('preliq.cifRd'), tot.cifRd)}
            {filaTotal(t('preliq.gravamen'), tot.gravamen)}
            {filaTotal(t('preliq.isc'), tot.isc)}
            {filaTotal(t('preliq.itbis'), tot.itbis)}
            {filaTotal(t('preliq.impuestos'), tot.impuestos, true)}
            {filaTotal(t('preliq.tasaServicio', { count: contenedores.length }), tot.tasaServicio)}
            {filaTotal(sinTasas ? t('preliq.totalPagarIncompleto') : t('preliq.totalPagar'), tot.total, true)}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {t('preliq.tasaCambioUsada', { tasa: rd(value.valores.tasaCambio) })}
            </Typography>
          </CardContent></Card>
        </>
      )}

      <Dialog open={confirmarRestablecer} onClose={() => setConfirmarRestablecer(false)}>
        <DialogTitle>{t('preliq.restablecer')}</DialogTitle>
        <DialogContent>{t('preliq.confirmarRestablecer')}</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarRestablecer(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => ejecutar(true)}>{t('preliq.restablecer')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
