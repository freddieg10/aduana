import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow, Typography,
} from '@mui/material';
import { Calculate, PictureAsPdf, Restore } from '@mui/icons-material';
import type { ExpedienteFormData, Partida, TasasRenglon } from '../types';
import { cargarArancel, type Arancel } from '../data/arancel';
import { UNIDAD_LITROS, UNIDAD_UNIDADES } from '../data/catalogos';
import { useSettingsStore } from '../store/settingsStore';
import { preliquidar } from '../utils/preliquidacion';
import { sugerirTasas, type TasasSugeridas } from '../utils/tasas';
import { aplicarPreliquidacion, editarTasa, estadoRenglon, tasasVigentes } from '../utils/preliquidacionExpediente';
import { reportePreliquidacion } from '../utils/preliquidacionReporte';
import { fmtDateTime } from '../utils/date';
import NumberField from './NumberField';
import PreliquidacionPdfDialog from './PreliquidacionPdfDialog';

interface Props {
  value: ExpedienteFormData;
  onChange: (next: ExpedienteFormData) => void;
}

const dinero = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const unitario = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/** A compact rate input. 0% is a real answer here, so it is shown, not blanked. */
function CampoTasa({ valor, onChange, width = 48, label }: { valor: number | undefined; onChange: (n: number) => void; width?: number; label?: string }) {
  return (
    <NumberField
      size="small" variant="standard" value={valor} placeholder="—" ceroVacio={false} onChange={onChange}
      slotProps={{ htmlInput: { min: 0, step: 'any', 'aria-label': label, style: { textAlign: 'right' } } }}
      sx={{ width }}
    />
  );
}

/** One label/value pair of the report header. */
function Campo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, py: 0.25 }}>
      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 150 }}>{etiqueta}</Typography>
      <Typography variant="body2">{valor || '—'}</Typography>
    </Box>
  );
}

/**
 * The Preliquidación tab: loads the arancel the first time it opens, freezes rates per line on
 * "Preliquidar", lets the digitador correct any rate, and shows what the declaration will owe
 * laid out like SIGA's report — the same data the PDF prints. Figures are always recomputed
 * from the current values; only the rates are stored.
 */
export default function PreliquidacionTab({ value, onChange }: Props) {
  const { t } = useTranslation();
  const montos = useSettingsStore((s) => s.iscMontos);
  const [arancel, setArancel] = useState<Arancel | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<{ cargados: number; noEnArancel: string[] } | null>(null);
  const [confirmarRestablecer, setConfirmarRestablecer] = useState(false);
  const [pdfAbierto, setPdfAbierto] = useState(false);

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
  /* Printing time is taken when the PDF dialog opens, not on every render. */
  const [ahora, setAhora] = useState(() => new Date());
  const reporte = useMemo(() => reportePreliquidacion(value, calculo, ahora), [value, calculo, ahora]);

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
    avisos.push({ severidad: 'warning', texto: t('preliq.avisoFob', { renglones: dinero(fobRenglones), declarado: dinero(value.valores.valorFobTotal) }) });
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
  calculo.lineas.forEach((l, i) => {
    const unidad = value.partidas[i].unidad;
    if (l.tasas.iscEspecificoTipo === 'alcohol' && unidad !== UNIDAD_LITROS) avisos.push({ severidad: 'warning', texto: t('preliq.avisoUnidadAlcohol', { codigo: l.codigoPartida }) });
    if (l.tasas.iscEspecificoTipo === 'unidad' && unidad !== UNIDAD_UNIDADES) avisos.push({ severidad: 'warning', texto: t('preliq.avisoUnidadTabaco', { codigo: l.codigoPartida }) });
  });
  const sinTasas = pre ? reporte.lineasSinTasas : 0;
  if (sinTasas) avisos.push({ severidad: 'warning', texto: t('preliq.avisoSinTasas', { count: sinTasas }) });

  const e = reporte.encabezado;
  const v = reporte.valores;
  const res = reporte.resumen;
  const filaResumen = (label: string, monto: number, fuerte = false) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderTop: fuerte ? 1 : 0, borderColor: 'divider' }}>
      <Typography variant={fuerte ? 'subtitle1' : 'body2'} sx={{ fontWeight: fuerte ? 700 : 400 }}>{label}</Typography>
      <Typography variant={fuerte ? 'subtitle1' : 'body2'} sx={{ fontWeight: fuerte ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>RD$ {dinero(monto)}</Typography>
    </Box>
  );
  const nombrePdf = `Preliquidacion_${(e.referencia || 'expediente').replace(/[^\w-]+/g, '_')}.pdf`;
  const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

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
            <>
              <Button variant="outlined" startIcon={<Restore />} disabled={!arancel}
                onClick={() => (hayManuales ? setConfirmarRestablecer(true) : ejecutar(true))}>
                {t('preliq.restablecer')}
              </Button>
              <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={() => { setAhora(new Date()); setPdfAbierto(true); }}>
                {t('preliq.imprimirPdf')}
              </Button>
            </>
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
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Campo etiqueta={t('preliq.colecturia')} valor={e.colecturia} />
                <Campo etiqueta={t('preliq.regimen')} valor={e.regimen} />
                <Campo etiqueta={t('preliq.fechaDeclaracion')} valor={e.fechaDeclaracion} />
                <Campo etiqueta={t('preliq.conocimientoEmbarque')} valor={e.conocimientoEmbarque} />
              </Grid>
              <Grid size={{ xs: 12, md: 3.5 }}>
                <Campo etiqueta={t('preliq.importador')} valor={e.importador} />
                <Campo etiqueta={t('preliq.documento')} valor={e.importadorDocumento} />
              </Grid>
              <Grid size={{ xs: 12, md: 3.5 }}>
                <Campo etiqueta={t('preliq.agenteAduanal')} valor={e.agente} />
                <Campo etiqueta={t('preliq.documento')} valor={e.agenteDocumento} />
              </Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <TableContainer component={Paper} variant="outlined">
              {/* Twelve columns: MUI's default 16px side padding alone would push the last ones out of view. */}
              <Table size="small" sx={{ '& th, & td': { px: 0.75 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('preliq.partida')}</TableCell>
                    <TableCell align="right">{t('preliq.cantidad')}</TableCell>
                    <TableCell>{t('preliq.unidad')}</TableCell>
                    <TableCell align="right">{t('preliq.fobUnitario')}</TableCell>
                    <TableCell align="right">{t('preliq.cifBruto')}</TableCell>
                    <TableCell align="right">{t('preliq.pctGravamen')}</TableCell>
                    <TableCell align="right">{t('preliq.gravamen')}</TableCell>
                    <TableCell align="right">{t('preliq.pctIsc')}</TableCell>
                    <TableCell align="right">{t('preliq.selectivo')}</TableCell>
                    <TableCell align="right">{t('preliq.pctItbis')}</TableCell>
                    <TableCell align="right">{t('preliq.itbis')}</TableCell>
                    <TableCell align="right">{t('preliq.impuestosPagar')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {value.partidas.map((p, i) => {
                    const l = reporte.lineas[i];
                    const vig = tasasVigentes(p, pre)?.tasas;
                    const estado = estadoRenglon(p, pre);
                    const s = sugeridas.get(p.id);
                    const monto = (n: number) => (l.sinTasas ? '—' : dinero(n));
                    return (
                      <TableRow key={p.id} sx={{ verticalAlign: 'top' }}>
                        <TableCell sx={{ minWidth: 200 }}>
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
                        <TableCell align="right" sx={num}>{dinero(l.cantidad)}</TableCell>
                        <TableCell>{l.unidad}</TableCell>
                        <TableCell align="right" sx={num}>{unitario(l.fobUnitario)}</TableCell>
                        <TableCell align="right" sx={num}>{dinero(l.cifRd)}</TableCell>
                        <TableCell align="right"><CampoTasa label={t('preliq.pctGravamen')} valor={vig?.gravamen} onChange={(n) => editar(p, { gravamen: n })} /></TableCell>
                        <TableCell align="right" sx={num}>{monto(l.gravamen)}</TableCell>
                        <TableCell align="right">
                          <CampoTasa label={t('preliq.pctIsc')} valor={vig?.isc} onChange={(n) => editar(p, { isc: n })} />
                          {vig && vig.iscEspecificoTipo !== 'ninguno' && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('preliq.sobreVentaMenor')}</Typography>
                              <CampoTasa width={72} label={t('preliq.especifico')} valor={vig.iscEspecificoMonto} onChange={(n) => editar(p, { iscEspecificoMonto: n })} />
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {t(vig.iscEspecificoTipo === 'alcohol' ? 'preliq.porLitroAlcohol' : 'preliq.porCajetilla')}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={num}>{monto(l.selectivo)}</TableCell>
                        <TableCell align="right"><CampoTasa label={t('preliq.pctItbis')} valor={vig?.itbis} onChange={(n) => editar(p, { itbis: n })} /></TableCell>
                        <TableCell align="right" sx={num}>{monto(l.itbis)}</TableCell>
                        <TableCell align="right" sx={{ ...num, fontWeight: 600 }}>{monto(l.impuestos)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow sx={{ '& td': { fontWeight: 700, color: 'text.primary', fontSize: '0.875rem' } }}>
                    <TableCell colSpan={4} align="right">{t('preliq.totales')}</TableCell>
                    <TableCell align="right" sx={num}>{dinero(reporte.totales.cifRd)}</TableCell>
                    <TableCell />
                    <TableCell align="right" sx={num}>{dinero(reporte.totales.gravamen)}</TableCell>
                    <TableCell />
                    <TableCell align="right" sx={num}>{dinero(reporte.totales.selectivo)}</TableCell>
                    <TableCell />
                    <TableCell align="right" sx={num}>{dinero(reporte.totales.itbis)}</TableCell>
                    <TableCell align="right" sx={num}>{dinero(reporte.totales.impuestos)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{t('preliq.totalesNota')}</Typography>
          </CardContent></Card>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}><CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{t('preliq.valores')}</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell align="right">RD$</TableCell>
                      <TableCell align="right">US$</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {([['valorFob', v.fob], ['seguro', v.seguro], ['flete', v.flete], ['otros', v.otros], ['valorCif', v.cif]] as const).map(([k, m]) => (
                      <TableRow key={k} sx={k === 'valorCif' ? { '& td': { fontWeight: 700 } } : undefined}>
                        <TableCell sx={{ fontWeight: 600 }}>{t(`preliq.${k}`)}</TableCell>
                        <TableCell align="right" sx={num}>{dinero(m.rd)}</TableCell>
                        <TableCell align="right" sx={num}>{dinero(m.usd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{t('preliq.tasaCambioUsada', { tasa: dinero(v.tasaCambio) })}</Typography>
              </CardContent></Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}><CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{t('preliq.furgones')}</Typography>
                <Box sx={{ display: 'flex', gap: 3, mb: 1.5 }}>
                  {([['qty20', reporte.cantidadPorTamano.pies20], ['qty40', reporte.cantidadPorTamano.pies40], ['qty45', reporte.cantidadPorTamano.pies45]] as const).map(([k, n]) => (
                    <Box key={k}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t(`preliq.${k}`)}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{n}</Typography>
                    </Box>
                  ))}
                </Box>
                {reporte.furgones.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">{t('preliq.sinFurgones')}</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('preliq.tipoFurgon')}</TableCell>
                        <TableCell>{t('preliq.numeroContenedor')}</TableCell>
                        <TableCell>{t('preliq.sello1')}</TableCell>
                        <TableCell>{t('preliq.sello2')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reporte.furgones.map((f, i) => (
                        <TableRow key={`${f.numero}-${i}`}>
                          <TableCell>{f.tipo}</TableCell>
                          <TableCell>{f.numero}</TableCell>
                          <TableCell>{f.sello1}</TableCell>
                          <TableCell>{f.sello2}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent></Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}><CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{t('preliq.resumen')}</Typography>
                {filaResumen(t('preliq.totalArancel'), res.arancel)}
                {filaResumen(t('preliq.totalSelectivo'), res.selectivo)}
                {filaResumen(t('preliq.totalItbis'), res.itbis)}
                {filaResumen(t('preliq.totalImpuestos'), res.impuestos, true)}
                {filaResumen(t('preliq.tasaServicio', { count: contenedores.length }), res.servicios)}
                {filaResumen(sinTasas ? t('preliq.totalPagarIncompleto') : t('preliq.totalPagar'), res.totalPagar, true)}
              </CardContent></Card>
            </Grid>
          </Grid>
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

      {pdfAbierto && <PreliquidacionPdfDialog reporte={reporte} nombreArchivo={nombrePdf} onClose={() => setPdfAbierto(false)} />}
    </Box>
  );
}
