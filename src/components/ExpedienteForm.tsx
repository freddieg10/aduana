import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Divider, Grid, MenuItem,
  Paper, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, IconButton,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { ExpedienteStatus } from '../types';
import type { ExpedienteFormData, EntidadAduanal, TipoCarga, Suplidor, Cliente, SuplidorMaestro, TipoDocumento } from '../types';
import {
  ACUERDOS, ADMINISTRACIONES, TIPOS_DESPACHO_LABELS, TIPOS_DOCUMENTO,
  findAdministracion, findRegimen, regimenesFor,
} from '../data/catalogos';
import { useSettingsStore } from '../store/settingsStore';
import { clienteToEntidad, TIPO_DOCUMENTO_DEFAULT } from '../utils/documento';
import { validarVuce, validarNoTemporal } from '../utils/vuce';
import { MEDIOS_TRANSPORTE } from '../data/catalogos';
import RenglonesGrid from './RenglonesGrid';
import NumberField from './NumberField';
import PreliquidacionTab from './PreliquidacionTab';
import { COUNTRIES, findCountryByCode } from '../data/countries';
import { PUERTOS_RD } from '../data/puertos';
import { useRelacionadosStore } from '../store/relacionadosStore';

export interface ExtraTab {
  label: string;
  content: React.ReactNode;
}

interface Props {
  value: ExpedienteFormData;
  onChange: (next: ExpedienteFormData) => void;
  /** Tabs appended after Preliquidación (the detail page adds the checklist here). */
  extraTabs?: ExtraTab[];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{children}</Typography>;
}

const updateAt = <T,>(arr: T[], i: number, patch: Partial<T>): T[] =>
  arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x));

const withCurrent = (options: string[], current: string) =>
  current && !options.includes(current) ? [current, ...options] : options;


/**
 * The tabbed expediente editor shared by the create and detail pages. Fully controlled:
 * the parent owns the ExpedienteFormData and persists it on save.
 */
export default function ExpedienteForm({ value, onChange, extraTabs = [] }: Props) {
  const { t } = useTranslation();
  const clientes = useRelacionadosStore((s) => s.clientes);
  const suplidoresMaestro = useRelacionadosStore((s) => s.suplidores);
  const depositos = useRelacionadosStore((s) => s.depositos);
  const digitadores = useSettingsStore((s) => s.digitadores);
  const gestores = useSettingsStore((s) => s.gestores);

  const [tab, setTab] = useState(0);
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

  const ia = value.informacionAdicional;
  const setIa = (p: Partial<ExpedienteFormData['informacionAdicional']>) => patch({ informacionAdicional: { ...ia, ...p } });
  const hallazgosVuce = validarVuce(value.partidas);
  const noTemporal = validarNoTemporal({ partidas: value.partidas });

  const selectedCountry = findCountryByCode(d.paisProcedenciaCodigo) ?? null;
  /* Keep a depósito stored before the catalog existed selectable. */
  const depositoOptions = d.depositoDestino && !depositos.some((x) => x.codigo === d.depositoDestino)
    ? [{ codigo: d.depositoDestino, nombre: d.depositoDestino }, ...depositos]
    : depositos;
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
          <Tab label={t('detail.tabRenglonesValores')} />
          <Tab label={t('detail.tabDocsCont')} />
          <Tab label={t('detail.tabInfoAdicional')} />
          <Tab label={t('detail.tabVuce')} />
          <Tab label={t('preliq.titulo')} />
          {extraTabs.map((x) => <Tab key={x.label} label={x.label} />)}
        </Tabs>
      </Box>

            {/* TAB 0 — DECLARACIÓN (declaración + partes) */}
      {tab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Card><CardContent>
          <SectionTitle>{t('detail.declaracion')}</SectionTitle>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth type="date" label="ETA" value={d.eta} onChange={(e) => setDecl({ eta: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth label={t('detail.tipoDespacho')} value={d.tipoDespacho} onChange={(e) => setDecl({ tipoDespacho: e.target.value })}>
                {withCurrent(TIPOS_DESPACHO_LABELS, d.tipoDespacho).map((td) => <MenuItem key={td} value={td}>{td}</MenuItem>)}
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
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label={t('detail.depositoDestino')} value={d.depositoDestino} onChange={(e) => setDecl({ depositoDestino: e.target.value })}>
                <MenuItem value="">—</MenuItem>
                {depositoOptions.map((dep) => <MenuItem key={dep.codigo} value={dep.codigo}>{dep.codigo} — {dep.nombre}</MenuItem>)}
              </TextField>
            </Grid>
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
                {withCurrent(digitadores, value.digitador).map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth label={t('expediente.gestor')} value={value.gestor} onChange={(e) => patch({ gestor: e.target.value })}>
                <MenuItem value="">—</MenuItem>
                {withCurrent(gestores, value.gestor).map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </CardContent></Card>
      
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
              <Grid size={{ xs: 6, sm: 2 }}>
                <TextField
                  select fullWidth label={t('detail.tipoDocumento')}
                  value={value.agenteAduanal.tipoDocumento ?? 'RNC'}
                  onChange={(e) => patch({ agenteAduanal: { ...value.agenteAduanal, tipoDocumento: e.target.value as TipoDocumento } })}
                >
                  {TIPOS_DOCUMENTO.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  fullWidth required label={t('detail.documento')}
                  value={value.agenteAduanal.codigo}
                  onChange={(e) => patch({ agenteAduanal: { ...value.agenteAduanal, codigo: e.target.value } })}
                  helperText={t('detail.agenteDocumentoHint')}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('detail.nombre')} value={value.agenteAduanal.nombre} onChange={(e) => patch({ agenteAduanal: { ...value.agenteAduanal, nombre: e.target.value } })} /></Grid>
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
                        patch({ suplidores: updateAt<Suplidor>(value.suplidores, i, { codigo: o.documento, nombre: o.nombre, nacionalidad: nac, tipoDocumento: o.tipoDocumento }) });
                      }
                    }}
                    renderOption={(props, o) => { const { key, ...rest } = props; return <li key={key} {...rest}>{o.tipoDocumento} {o.documento} — {o.nombre}</li>; }}
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
      
        </Box>
      )}

      {/* TAB 1 — RENGLONES & VALORES */}
      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card><CardContent>
            <RenglonesGrid partidas={value.partidas} onChange={(partidas) => patch({ partidas })} />
          </CardContent></Card>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card><CardContent>
            <SectionTitle>{t('detail.valores')}</SectionTitle>
            <Grid container spacing={2}>
              {(['tasaCambio', 'valorFobTotal', 'seguro', 'flete', 'otros', 'valorCifTotal'] as const).map((k) => (
                <Grid size={{ xs: 12, sm: 4 }} key={k}>
                  <NumberField fullWidth label={t(`detail.${k}`)} value={value.valores[k]} onChange={(n) => patch({ valores: { ...value.valores, [k]: n } })} />
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
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select fullWidth label={t('detail.acuerdo')}
                  value={value.regimenAduanero.acuerdo}
                  onChange={(e) => patch({ regimenAduanero: { ...value.regimenAduanero, acuerdo: e.target.value } })}
                  helperText={ACUERDOS.find((a) => a.codigo === value.regimenAduanero.acuerdo)?.descripcion ?? ' '}
                >
                  <MenuItem value="">{t('detail.sinAcuerdo')}</MenuItem>
                  {ACUERDOS.map((a) => <MenuItem key={a.codigo} value={a.codigo}>{a.codigo} — {a.nombre}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.pesoMercancia')}</SectionTitle>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.codigoMercancia')} value={value.pesoMercancia.codigoMercancia} onChange={(e) => patch({ pesoMercancia: { ...value.pesoMercancia, codigoMercancia: e.target.value } })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><NumberField fullWidth label={t('detail.pesoBrutoKg')} value={value.pesoMercancia.pesoBrutoKg} onChange={(n) => patch({ pesoMercancia: { ...value.pesoMercancia, pesoBrutoKg: n } })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><NumberField fullWidth label={t('detail.pesoNetoKg')} value={value.pesoMercancia.pesoNetoKg} onChange={(n) => patch({ pesoMercancia: { ...value.pesoMercancia, pesoNetoKg: n } })} /></Grid>
            </Grid>
          </CardContent></Card>
        </Box>
      
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
                      <TableCell align="right"><NumberField size="small" variant="standard" value={doc.valorFactura} onChange={(n) => patch({ documentos: updateAt(value.documentos, i, { valorFactura: n }) })} sx={{ width: 120 }} /></TableCell>
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

      {/* TAB 3 — INFORMACIÓN ADICIONAL (completes the hoja de registro and the DUA header) */}
      {tab === 3 && (
        <Card><CardContent>
          <SectionTitle>{t('detail.tabInfoAdicional')}</SectionTitle>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>{t('detail.infoAdicionalHint')}</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.transportistaCodigo')} value={ia.transportistaCodigo} onChange={(e) => setIa({ transportistaCodigo: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth label={t('detail.transportistaNombre')} value={ia.transportistaNombre} onChange={(e) => setIa({ transportistaNombre: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Autocomplete
                options={COUNTRIES}
                getOptionLabel={(c) => c.nombre}
                isOptionEqualToValue={(a, b) => a.codigo === b.codigo}
                value={findCountryByCode(ia.transporteNacionalidad) ?? null}
                onChange={(_, c) => setIa({ transporteNacionalidad: c?.codigo ?? '' })}
                renderInput={(params) => <TextField {...params} label={t('detail.transporteNacionalidad')} />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth label={t('detail.medioTransporte')} value={ia.medioTransporte} onChange={(e) => setIa({ medioTransporte: e.target.value })}>
                <MenuItem value="">—</MenuItem>
                {withCurrent(MEDIOS_TRANSPORTE, ia.medioTransporte).map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}><TextField fullWidth label={t('detail.noViaje')} value={ia.noViaje} onChange={(e) => setIa({ noViaje: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.manifiestoNo')} value={ia.manifiestoNo} onChange={(e) => setIa({ manifiestoNo: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.cargoControlNo')} value={ia.cargoControlNo} onChange={(e) => setIa({ cargoControlNo: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth type="date" label={t('detail.fechaLlegadaReal')} value={ia.fechaLlegadaReal} onChange={(e) => setIa({ fechaLlegadaReal: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} helperText={t('detail.fechaLlegadaRealHint')} />
            </Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={3} label={t('detail.notasHojaRegistro')} value={ia.notasHojaRegistro} onChange={(e) => setIa({ notasHojaRegistro: e.target.value })} /></Grid>
          </Grid>
        </CardContent></Card>
      
      )}

      {/* TAB 4 — VUCE */}
      {tab === 4 && (
        <Card><CardContent>
          <SectionTitle>{t('detail.tabVuce')}</SectionTitle>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>{t('detail.vuceHint')}</Typography>

          {noTemporal.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {t('detail.noTemporalError')}
              <ul style={{ margin: '4px 0 0 16px' }}>
                {noTemporal.map((h) => (
                  <li key={h.partida.id}>
                    {h.partida.codigoPartida} — {h.partida.descripcion}
                    {' · '}{t(h.motivo === 'temporal' ? 'detail.noTemporalMotivoTemporal' : 'detail.noTemporalMotivoSinArticulo')}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          {hallazgosVuce.length === 0 ? (
            <Alert severity="success">{t('detail.vuceSinPermisos')}</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('detail.codigoPartida')}</TableCell>
                    <TableCell>{t('detail.descripcion')}</TableCell>
                    <TableCell>{t('detail.vucePermiso')}</TableCell>
                    <TableCell>{t('detail.vuceEntidad')}</TableCell>
                    <TableCell align="center">{t('detail.vuceEstado')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hallazgosVuce.map((h) => (
                    <TableRow key={h.partida.id}>
                      <TableCell>{h.partida.codigoPartida}</TableCell>
                      <TableCell>{h.partida.descripcion}</TableCell>
                      <TableCell>{h.permiso}</TableCell>
                      <TableCell>{h.entidad}</TableCell>
                      <TableCell align="center">
                        <Typography variant="caption" color={h.documentado ? 'success.main' : 'warning.main'}>
                          {h.documentado ? t('detail.vuceDocumentado') : t('detail.vucePendiente')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent></Card>
      
      )}

      {/* TAB 5 — PRELIQUIDACIÓN (mounted only while open: it lazy-loads the arancel) */}
      {tab === 5 && <PreliquidacionTab value={value} onChange={onChange} />}

      {extraTabs.map((x, i) => (tab === 6 + i ? <Box key={x.label}>{x.content}</Box> : null))}

    </Box>
  );
}
