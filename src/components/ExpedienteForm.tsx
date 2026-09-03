import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Checkbox, Divider, Grid, MenuItem,
  Paper, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, IconButton,
} from '@mui/material';
import { Add, ContentCopy, Delete, Upload } from '@mui/icons-material';
import { ExpedienteStatus } from '../types';
import type { ExpedienteFormData, EntidadAduanal, Partida, TipoCarga, Suplidor, Cliente, SuplidorMaestro, TipoDocumento } from '../types';
import {
  ADMINISTRACIONES, TIPOS_DESPACHO, TIPOS_DOCUMENTO, UNIDADES, DIGITADORES, GESTORES,
  findAdministracion, findRegimen, regimenesFor,
} from '../data/catalogos';
import { clienteToEntidad, TIPO_DOCUMENTO_DEFAULT } from '../utils/documento';
import { COUNTRIES, findCountryByCode } from '../data/countries';
import { PUERTOS_RD } from '../data/puertos';
import { useRelacionadosStore } from '../store/relacionadosStore';
import { parsePartidas, readFileAsArrayBuffer } from '../utils/excel';

export interface ExtraTab {
  label: string;
  content: React.ReactNode;
}

interface Props {
  value: ExpedienteFormData;
  onChange: (next: ExpedienteFormData) => void;
  /** Tabs appended after Renglones (the detail page adds the checklist here). */
  extraTabs?: ExtraTab[];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{children}</Typography>;
}

const updateAt = <T,>(arr: T[], i: number, patch: Partial<T>): T[] =>
  arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x));

const withCurrent = (options: string[], current: string) =>
  current && !options.includes(current) ? [current, ...options] : options;

const emptyPartida = (): Partida => ({
  id: crypto.randomUUID(), codigoPartida: '', descripcion: '', organico: false, cantidad: 0,
  unidad: 'KILOGRAMOS', paisOrigen: '', valorFob: 0, unitario: 0, facturaDva: '',
});

/**
 * The tabbed expediente editor shared by the create and detail pages. Fully controlled:
 * the parent owns the ExpedienteFormData and persists it on save.
 */
export default function ExpedienteForm({ value, onChange, extraTabs = [] }: Props) {
  const { t } = useTranslation();
  const clientes = useRelacionadosStore((s) => s.clientes);
  const suplidoresMaestro = useRelacionadosStore((s) => s.suplidores);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState(0);
  const [importError, setImportError] = useState('');
  const [importWarning, setImportWarning] = useState('');
  const [consignatarioEdited, setConsignatarioEdited] = useState(
    value.importador.codigo !== value.consignatario.codigo || value.importador.nombre !== value.consignatario.nombre,
  );

  const patch = (p: Partial<ExpedienteFormData>) => onChange({ ...value, ...p });
  const d = value.declaracion;
  const setDecl = (p: Partial<ExpedienteFormData['declaracion']>) => patch({ declaracion: { ...d, ...p } });

  /* Importador -> consignatario sync until the consignatario is edited by hand. */
  const setImportador = (imp: EntidadAduanal) =>
    patch({ importador: imp, ...(consignatarioEdited ? {} : { consignatario: { ...imp } }) });
  const setConsignatario = (c: EntidadAduanal) => { setConsignatarioEdited(true); patch({ consignatario: c }); };

  const handleAdminChange = (codigo: string) =>
    setDecl({ administracionCodigo: codigo, administracionNombre: findAdministracion(codigo)?.nombre ?? d.administracionNombre });

  const handleRegimenChange = (codigo: string) =>
    patch({ regimenAduanero: { ...value.regimenAduanero, codigo, nombre: findRegimen(codigo)?.nombre ?? '' } });

  const handleImportPartidas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError('');
    setImportWarning('');
    try {
      const buf = await readFileAsArrayBuffer(file);
      const { partidas, unmappedHeaders } = parsePartidas(buf);
      patch({ partidas: [...value.partidas, ...partidas] });
      if (unmappedHeaders.length) setImportWarning(t('detail.unmappedColumns', { cols: unmappedHeaders.join(', ') }));
    } catch {
      setImportError(t('importExport.parseError'));
    }
  };

  const clonePartida = (i: number) => {
    const next = [...value.partidas];
    next.splice(i + 1, 0, { ...value.partidas[i], id: crypto.randomUUID() });
    patch({ partidas: next });
  };

  const selectedCountry = findCountryByCode(d.paisProcedenciaCodigo) ?? null;
  const adminOptions = d.administracionCodigo && !findAdministracion(d.administracionCodigo)
    ? [{ codigo: d.administracionCodigo, nombre: d.administracionNombre || d.administracionCodigo, verificado: false, tipo: 'puerto' as const }, ...ADMINISTRACIONES]
    : ADMINISTRACIONES;
  /* Régimen list depends on import vs export; keep a stored value visible even if it is not in the list. */
  const regimenBase = regimenesFor(value.tipoExpediente);
  const regimenOptions = value.regimenAduanero.codigo && !regimenBase.some((r) => r.codigo === value.regimenAduanero.codigo)
    ? [{ codigo: value.regimenAduanero.codigo, nombre: value.regimenAduanero.nombre || value.regimenAduanero.codigo }, ...regimenBase]
    : regimenBase;
  const adminLabel = (a: { codigo: string; nombre: string; verificado: boolean }) =>
    a.verificado ? `${a.nombre} (${a.codigo})` : `${a.nombre} (${a.codigo} · ${t('detail.codigoProvisional')})`;

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label={t('detail.tabDeclaracion')} />
          <Tab label={t('detail.tabPartes')} />
          <Tab label={t('detail.tabDocsCont')} />
          <Tab label={t('detail.tabValores')} />
          <Tab label={t('detail.tabPartidas')} />
          {extraTabs.map((x) => <Tab key={x.label} label={x.label} />)}
        </Tabs>
      </Box>

      {/* TAB 0 — DECLARACIÓN */}
      {tab === 0 && (
        <Card><CardContent>
          <SectionTitle>{t('detail.declaracion')}</SectionTitle>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth type="date" label="ETA" value={d.eta} onChange={(e) => setDecl({ eta: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth label={t('detail.tipoDespacho')} value={d.tipoDespacho} onChange={(e) => setDecl({ tipoDespacho: e.target.value })}>
                {withCurrent(TIPOS_DESPACHO, d.tipoDespacho).map((td) => <MenuItem key={td} value={td}>{td}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label={t('detail.idSecuencia')} value={d.idSecuencia} onChange={(e) => setDecl({ idSecuencia: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField select fullWidth label={t('detail.administracionNombre')} value={d.administracionCodigo} onChange={(e) => handleAdminChange(e.target.value)}>
                {adminOptions.map((a) => <MenuItem key={a.codigo} value={a.codigo}>{adminLabel(a)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label={t('detail.administracionCodigo')} value={d.administracionCodigo} slotProps={{ input: { readOnly: true } }} helperText={t('detail.autoFilled')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth required label={t('detail.noDeclaracion')} value={d.noDeclaracion} onChange={(e) => setDecl({ noDeclaracion: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('detail.docEmbarque')} value={d.docEmbarque} onChange={(e) => setDecl({ docEmbarque: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('detail.depositoDestino')} value={d.depositoDestino} onChange={(e) => setDecl({ depositoDestino: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                freeSolo
                options={PUERTOS_RD.map((p) => p.nombre)}
                inputValue={d.puertoEntrada}
                onInputChange={(_, v, reason) => { if (reason !== 'reset') setDecl({ puertoEntrada: v }); }}
                onChange={(_, v) => { if (typeof v === 'string') setDecl({ puertoEntrada: v }); }}
                renderOption={(props, name) => {
                  const { key, ...rest } = props;
                  const p = PUERTOS_RD.find((x) => x.nombre === name);
                  return <li key={key} {...rest}>{p?.codigo} — {name}</li>;
                }}
                renderInput={(params) => <TextField {...params} label={t('detail.puertoEntrada')} helperText={t('detail.puertoEntradaHint')} />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Autocomplete
                options={COUNTRIES}
                getOptionLabel={(c) => c.nombre}
                isOptionEqualToValue={(a, b) => a.codigo === b.codigo}
                value={selectedCountry}
                onChange={(_, c) => setDecl({ paisProcedenciaCodigo: c?.codigo ?? '', paisProcedenciaNombre: c?.nombre ?? '' })}
                renderInput={(params) => <TextField {...params} label={t('detail.paisProcedenciaNombre')} />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth label={t('detail.paisProcedenciaCodigo')} value={d.paisProcedenciaCodigo} slotProps={{ input: { readOnly: true } }} helperText={t('detail.autoFilled')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.facturaComercialNo')} value={d.facturaComercialNo} onChange={(e) => setDecl({ facturaComercialNo: e.target.value })} /></Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <SectionTitle>{t('detail.generalInfo')}</SectionTitle>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={3} label={t('expediente.descripcion')} value={value.reference} onChange={(e) => patch({ reference: e.target.value })} helperText={t('detail.referenceHint')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth label={t('expediente.status')} value={value.status} onChange={(e) => patch({ status: e.target.value as ExpedienteStatus })}>
                {Object.values(ExpedienteStatus).map((s) => <MenuItem key={s} value={s}>{t(`status.${s}`)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth label={t('expediente.digitador')} value={value.digitador} onChange={(e) => patch({ digitador: e.target.value })}>
                <MenuItem value="">—</MenuItem>
                {withCurrent(DIGITADORES, value.digitador).map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth label={t('expediente.gestor')} value={value.gestor} onChange={(e) => patch({ gestor: e.target.value })}>
                <MenuItem value="">—</MenuItem>
                {withCurrent(GESTORES, value.gestor).map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </CardContent></Card>
      )}

      {/* TAB 1 — PARTES */}
      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card><CardContent>
            <SectionTitle>{t('detail.importador')}</SectionTitle>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('detail.importadorHint')}</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 2 }}>
                <TextField
                  select fullWidth label={t('detail.tipoDocumento')}
                  value={value.importador.tipoDocumento ?? TIPO_DOCUMENTO_DEFAULT}
                  onChange={(e) => setImportador({ ...value.importador, tipoDocumento: e.target.value as TipoDocumento })}
                >
                  {TIPOS_DOCUMENTO.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  fullWidth required label={t('detail.documento')}
                  value={value.importador.codigo}
                  onChange={(e) => setImportador({ ...value.importador, codigo: e.target.value })}
                  helperText={t('detail.documentoHint')}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete<Cliente, false, false, true>
                  freeSolo
                  options={clientes}
                  getOptionLabel={(o) => (typeof o === 'string' ? o : o.nombre)}
                  inputValue={value.importador.nombre}
                  onInputChange={(_, v, reason) => { if (reason !== 'reset') setImportador({ ...value.importador, nombre: v }); }}
                  onChange={(_, o) => { if (o && typeof o !== 'string') setImportador(clienteToEntidad(o)); }}
                  renderOption={(props, o) => { const { key, ...rest } = props; return <li key={key} {...rest}>{o.tipoDocumento} {o.documento} — {o.nombre}</li>; }}
                  renderInput={(params) => <TextField {...params} required label={t('detail.nombre')} helperText={t('detail.selectCliente')} />}
                />
              </Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.agenteAduanal')}</SectionTitle>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.codigo')} value={value.agenteAduanal.codigo} onChange={(e) => patch({ agenteAduanal: { ...value.agenteAduanal, codigo: e.target.value } })} /></Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth label={t('detail.nombre')} value={value.agenteAduanal.nombre} onChange={(e) => patch({ agenteAduanal: { ...value.agenteAduanal, nombre: e.target.value } })} /></Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.consignatario')}</SectionTitle>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('detail.consignatarioHint')}</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 2 }}>
                <TextField
                  select fullWidth label={t('detail.tipoDocumento')}
                  value={value.consignatario.tipoDocumento ?? TIPO_DOCUMENTO_DEFAULT}
                  onChange={(e) => setConsignatario({ ...value.consignatario, tipoDocumento: e.target.value as TipoDocumento })}
                >
                  {TIPOS_DOCUMENTO.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}><TextField fullWidth label={t('detail.documento')} value={value.consignatario.codigo} onChange={(e) => setConsignatario({ ...value.consignatario, codigo: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('detail.nombre')} value={value.consignatario.nombre} onChange={(e) => setConsignatario({ ...value.consignatario, nombre: e.target.value })} /></Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.compradorExportacion')}</SectionTitle>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.codigo')} value={value.compradorExportacion.codigo} onChange={(e) => patch({ compradorExportacion: { ...value.compradorExportacion, codigo: e.target.value } })} /></Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth label={t('detail.nombre')} value={value.compradorExportacion.nombre} onChange={(e) => patch({ compradorExportacion: { ...value.compradorExportacion, nombre: e.target.value } })} /></Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.suplidores')} ({value.suplidores.length})</SectionTitle>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('detail.selectSuplidor')}</Typography>
            {value.suplidores.map((sup, i) => (
              <Grid container spacing={2} key={i} sx={{ mb: 1, alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField fullWidth size="small" label={t('detail.codigo')} value={sup.codigo} onChange={(e) => patch({ suplidores: updateAt(value.suplidores, i, { codigo: e.target.value }) })} />
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <Autocomplete<SuplidorMaestro, false, false, true>
                    freeSolo size="small"
                    options={suplidoresMaestro}
                    getOptionLabel={(o) => (typeof o === 'string' ? o : o.nombre)}
                    inputValue={sup.nombre}
                    onInputChange={(_, v, reason) => { if (reason !== 'reset') patch({ suplidores: updateAt(value.suplidores, i, { nombre: v }) }); }}
                    onChange={(_, o) => {
                      if (o && typeof o !== 'string') {
                        const nac = findCountryByCode(o.pais)?.nombre ?? '';
                        patch({ suplidores: updateAt<Suplidor>(value.suplidores, i, { codigo: o.codigo, nombre: o.nombre, nacionalidad: nac }) });
                      }
                    }}
                    renderOption={(props, o) => { const { key, ...rest } = props; return <li key={key} {...rest}>{o.codigo} — {o.nombre}</li>; }}
                    renderInput={(params) => <TextField {...params} label={t('detail.nombre')} />}
                  />
                </Grid>
                <Grid size={{ xs: 10, sm: 3 }}>
                  <TextField fullWidth size="small" label={t('detail.nacionalidad')} value={sup.nacionalidad} onChange={(e) => patch({ suplidores: updateAt(value.suplidores, i, { nacionalidad: e.target.value }) })} />
                </Grid>
                <Grid size={{ xs: 2, sm: 1 }}>
                  <IconButton size="small" color="error" onClick={() => patch({ suplidores: value.suplidores.filter((_, idx) => idx !== i) })}><Delete fontSize="small" /></IconButton>
                </Grid>
              </Grid>
            ))}
            <Button size="small" startIcon={<Add />} onClick={() => patch({ suplidores: [...value.suplidores, { codigo: '', nombre: '', nacionalidad: '' }] })}>{t('detail.addSuplidor')}</Button>
          </CardContent></Card>
        </Box>
      )}

      {/* TAB 2 — DOCUMENTOS & CONTENEDORES */}
      {tab === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card><CardContent>
            <SectionTitle>{t('detail.documentos')} ({value.documentos.length})</SectionTitle>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('detail.numeroFactura')}</TableCell>
                    <TableCell>{t('detail.fechaFactura')}</TableCell>
                    <TableCell>{t('detail.codigoSuplidor')}</TableCell>
                    <TableCell align="right">{t('detail.valorFactura')}</TableCell>
                    <TableCell width={40} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {value.documentos.map((doc, i) => (
                    <TableRow key={doc.id}>
                      <TableCell><TextField size="small" variant="standard" value={doc.numeroFactura} onChange={(e) => patch({ documentos: updateAt(value.documentos, i, { numeroFactura: e.target.value }) })} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" type="date" value={doc.fechaFactura} onChange={(e) => patch({ documentos: updateAt(value.documentos, i, { fechaFactura: e.target.value }) })} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" value={doc.codigoSuplidor} onChange={(e) => patch({ documentos: updateAt(value.documentos, i, { codigoSuplidor: e.target.value }) })} /></TableCell>
                      <TableCell align="right"><TextField size="small" variant="standard" type="number" value={doc.valorFactura} onChange={(e) => patch({ documentos: updateAt(value.documentos, i, { valorFactura: Number(e.target.value) }) })} sx={{ width: 120 }} /></TableCell>
                      <TableCell><IconButton size="small" color="error" onClick={() => patch({ documentos: value.documentos.filter((_, idx) => idx !== i) })}><Delete fontSize="small" /></IconButton></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button size="small" startIcon={<Add />} sx={{ mt: 1 }} onClick={() => patch({ documentos: [...value.documentos, { id: crypto.randomUUID(), numeroFactura: '', fechaFactura: '', codigoSuplidor: '', valorFactura: 0 }] })}>{t('detail.addDocumento')}</Button>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.contenedores')} ({value.contenedores.length})</SectionTitle>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label={t('detail.tipoCarga')} value={value.tipoCarga} onChange={(e) => patch({ tipoCarga: e.target.value as TipoCarga })}>
                  <MenuItem value="contenedores">{t('detail.contenedores')}</MenuItem>
                  <MenuItem value="carga_suelta">{t('detail.cargaSuelta')}</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('detail.tipoContenedor')}</TableCell>
                    <TableCell>{t('detail.noContenedor')}</TableCell>
                    <TableCell>{t('detail.sello1')}</TableCell>
                    <TableCell>{t('detail.sello2')}</TableCell>
                    <TableCell width={40} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {value.contenedores.map((c, i) => (
                    <TableRow key={c.id}>
                      <TableCell><TextField size="small" variant="standard" value={c.tipo} onChange={(e) => patch({ contenedores: updateAt(value.contenedores, i, { tipo: e.target.value }) })} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" value={c.numero} onChange={(e) => patch({ contenedores: updateAt(value.contenedores, i, { numero: e.target.value }) })} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" value={c.sello1} onChange={(e) => patch({ contenedores: updateAt(value.contenedores, i, { sello1: e.target.value }) })} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" value={c.sello2} onChange={(e) => patch({ contenedores: updateAt(value.contenedores, i, { sello2: e.target.value }) })} /></TableCell>
                      <TableCell><IconButton size="small" color="error" onClick={() => patch({ contenedores: value.contenedores.filter((_, idx) => idx !== i) })}><Delete fontSize="small" /></IconButton></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button size="small" startIcon={<Add />} sx={{ mt: 1 }} onClick={() => patch({ contenedores: [...value.contenedores, { id: crypto.randomUUID(), tipo: '', numero: '', sello1: '', sello2: '' }] })}>{t('detail.addContenedor')}</Button>
          </CardContent></Card>
        </Box>
      )}

      {/* TAB 3 — VALORES & RÉGIMEN */}
      {tab === 3 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card><CardContent>
            <SectionTitle>{t('detail.valores')}</SectionTitle>
            <Grid container spacing={2}>
              {(['tasaCambio', 'valorFobTotal', 'seguro', 'flete', 'otros', 'valorCifTotal'] as const).map((k) => (
                <Grid size={{ xs: 12, sm: 4 }} key={k}>
                  <TextField fullWidth type="number" label={t(`detail.${k}`)} value={value.valores[k]} onChange={(e) => patch({ valores: { ...value.valores, [k]: Number(e.target.value) } })} />
                </Grid>
              ))}
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.regimenAduanero')}</SectionTitle>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label={t('detail.regimenAduanero')} value={value.regimenAduanero.codigo} onChange={(e) => handleRegimenChange(e.target.value)}>
                  {regimenOptions.map((r) => <MenuItem key={r.codigo} value={r.codigo}>{r.codigo} — {r.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('detail.acuerdo')} value={value.regimenAduanero.acuerdo} onChange={(e) => patch({ regimenAduanero: { ...value.regimenAduanero, acuerdo: e.target.value } })} /></Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.pesoMercancia')}</SectionTitle>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.codigoMercancia')} value={value.pesoMercancia.codigoMercancia} onChange={(e) => patch({ pesoMercancia: { ...value.pesoMercancia, codigoMercancia: e.target.value } })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="number" label={t('detail.pesoBrutoKg')} value={value.pesoMercancia.pesoBrutoKg} onChange={(e) => patch({ pesoMercancia: { ...value.pesoMercancia, pesoBrutoKg: Number(e.target.value) } })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="number" label={t('detail.pesoNetoKg')} value={value.pesoMercancia.pesoNetoKg} onChange={(e) => patch({ pesoMercancia: { ...value.pesoMercancia, pesoNetoKg: Number(e.target.value) } })} /></Grid>
            </Grid>
          </CardContent></Card>
        </Box>
      )}

      {/* TAB 4 — RENGLONES */}
      {tab === 4 && (
        <Card><CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <SectionTitle>{t('detail.renglones')} ({value.partidas.length})</SectionTitle>
            <Box sx={{ flexGrow: 1 }} />
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleImportPartidas} />
            <Button variant="outlined" size="small" startIcon={<Upload />} onClick={() => fileRef.current?.click()}>{t('detail.importRenglonesXlsx')}</Button>
          </Box>
          {importError && <Alert severity="error" sx={{ mb: 2 }}>{importError}</Alert>}
          {importWarning && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setImportWarning('')}>{importWarning}</Alert>}
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('detail.codigoPartida')}</TableCell>
                  <TableCell>{t('detail.descripcion')}</TableCell>
                  <TableCell align="center">{t('detail.organico')}</TableCell>
                  <TableCell align="right">{t('detail.cantidad')}</TableCell>
                  <TableCell>{t('detail.unidad')}</TableCell>
                  <TableCell>{t('detail.paisOrigen')}</TableCell>
                  <TableCell align="right">{t('detail.valorFob')}</TableCell>
                  <TableCell align="right">{t('detail.unitario')}</TableCell>
                  <TableCell>{t('detail.facturaDva')}</TableCell>
                  <TableCell width={70} />
                </TableRow>
              </TableHead>
              <TableBody>
                {value.partidas.map((p, i) => {
                  const up = (patchP: Partial<Partida>) => patch({ partidas: updateAt(value.partidas, i, patchP) });
                  return (
                    <TableRow key={p.id}>
                      <TableCell><TextField size="small" variant="standard" value={p.codigoPartida} onChange={(e) => up({ codigoPartida: e.target.value })} sx={{ width: 110 }} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" value={p.descripcion} onChange={(e) => up({ descripcion: e.target.value })} sx={{ minWidth: 180 }} /></TableCell>
                      <TableCell align="center"><Checkbox size="small" checked={p.organico} onChange={() => up({ organico: !p.organico })} /></TableCell>
                      <TableCell align="right"><TextField size="small" variant="standard" type="number" value={p.cantidad} onChange={(e) => up({ cantidad: Number(e.target.value) })} sx={{ width: 90 }} /></TableCell>
                      <TableCell>
                        <TextField select size="small" variant="standard" value={p.unidad} onChange={(e) => up({ unidad: e.target.value })} sx={{ width: 120 }}>
                          {withCurrent(UNIDADES, p.unidad).map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                        </TextField>
                      </TableCell>
                      <TableCell><TextField size="small" variant="standard" value={p.paisOrigen} onChange={(e) => up({ paisOrigen: e.target.value })} sx={{ width: 110 }} /></TableCell>
                      <TableCell align="right"><TextField size="small" variant="standard" type="number" value={p.valorFob} onChange={(e) => up({ valorFob: Number(e.target.value) })} sx={{ width: 100 }} /></TableCell>
                      <TableCell align="right"><TextField size="small" variant="standard" type="number" value={p.unitario} onChange={(e) => up({ unitario: Number(e.target.value) })} sx={{ width: 80 }} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" value={p.facturaDva} onChange={(e) => up({ facturaDva: e.target.value })} sx={{ width: 90 }} /></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton size="small" onClick={() => clonePartida(i)} title={t('detail.cloneRenglon')}><ContentCopy fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => patch({ partidas: value.partidas.filter((_, idx) => idx !== i) })}><Delete fontSize="small" /></IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button size="small" startIcon={<Add />} onClick={() => patch({ partidas: [...value.partidas, emptyPartida()] })}>{t('detail.addRenglon')}</Button>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              FOB Total: ${value.partidas.reduce((s, p) => s + p.valorFob, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
        </CardContent></Card>
      )}

      {extraTabs.map((x, i) => (tab === 5 + i ? <Box key={x.label}>{x.content}</Box> : null))}
    </Box>
  );
}
