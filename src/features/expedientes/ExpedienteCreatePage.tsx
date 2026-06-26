import { useState, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Card, CardContent, Checkbox, Chip, Divider, Grid, IconButton,
  MenuItem, Tab, Tabs, TextField, Typography, Alert, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { ArrowBack, Save, Delete, Edit as EditIcon, Add, AddComment, SwapVert, Upload, FlightLand, FlightTakeoff } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useExpedientesStore } from '../../store/expedientesStore';
import { useAuthStore } from '../../store/authStore';
import { ExpedienteStatus } from '../../types';
import type {
  TipoExpediente, Declaracion, EntidadAduanal, Suplidor,
  DocumentoFactura, Contenedor, Valores, RegimenAduanero, PesoMercancia, Partida, TipoCarga,
} from '../../types';

/* --- Option lists for dropdowns --- */
const TIPOS_DESPACHO = ['MANIFIESTO', 'NO MANIFIESTO', 'ANTICIPADO', 'URGENTE'];
const ADMINISTRACIONES = [
  { codigo: '10010', nombre: 'ADMINISTRACION SANTO DOMINGO' },
  { codigo: '10020', nombre: 'ADMINISTRACION PUERTO PLATA' },
  { codigo: '10030', nombre: 'ADMINISTRACION HAINA ORIENTAL' },
  { codigo: '10040', nombre: 'ADMINISTRACION CAUCEDO' },
  { codigo: '10050', nombre: 'ADMINISTRACION BOCA CHICA' },
  { codigo: '10060', nombre: 'ADMINISTRACION SAN PEDRO DE MACORIS' },
];
const REGIMENES = [
  { codigo: '1', nombre: 'DESPACHO A CONSUMO' },
  { codigo: '2', nombre: 'ADMISION TEMPORAL' },
  { codigo: '3', nombre: 'DEPOSITO DE ADUANAS' },
  { codigo: '4', nombre: 'REEXPORTACION' },
  { codigo: '5', nombre: 'TRANSITO ADUANERO' },
  { codigo: '6', nombre: 'ZONA FRANCA' },
];
const UNIDADES = ['KILOGRAMOS', 'UNIDADES', 'LITROS', 'METROS', 'PARES', 'DOCENAS', 'TONELADAS'];

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{children}</Typography>;
}

export default function ExpedienteCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useAuthStore((s) => s.user);
  const create = useExpedientesStore((s) => s.create);
  const fileRef = useRef<HTMLInputElement>(null);

  const tipoFromUrl = (searchParams.get('tipo') as TipoExpediente) || 'importacion';

  const [tab, setTab] = useState(0);
  const [success, setSuccess] = useState(false);

  /* General */
  const [tipoExpediente] = useState<TipoExpediente>(tipoFromUrl);
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<ExpedienteStatus>(ExpedienteStatus.Registrado);
  const [notes, setNotes] = useState('');
  const [newObs, setNewObs] = useState('');
  const [obsOrder, setObsOrder] = useState<'asc' | 'desc'>('desc');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const observations = useMemo(() =>
    notes.split('\n').filter(Boolean).map((line, idx) => {
      const parts = line.split('|');
      if (parts.length === 1) return { id: idx, date: null as Date | null, user: null as string | null, text: line };
      if (parts.length === 2) return { id: idx, date: new Date(parts[0]), user: null as string | null, text: parts[1] };
      return { id: idx, date: new Date(parts[0]), user: parts[1], text: parts.slice(2).join('|') };
    }), [notes]);

  const sortedObs = useMemo(() =>
    obsOrder === 'desc' ? [...observations].reverse() : [...observations],
    [observations, obsOrder]);

  const handleAddObs = () => {
    if (!newObs.trim()) return;
    setNotes((prev) => [prev, `${new Date().toISOString()}|${currentUser?.name ?? 'Usuario'}|${newObs.trim()}`].filter(Boolean).join('\n'));
    setNewObs('');
  };

  const handleDeleteObs = (id: number) => {
    setNotes(notes.split('\n').filter(Boolean).filter((_, i) => i !== id).join('\n'));
  };

  const handleSaveEdit = (id: number) => {
    const lines = notes.split('\n').filter(Boolean);
    const parts = lines[id].split('|');
    lines[id] = parts.length >= 3
      ? `${parts[0]}|${parts[1]}|${editText.trim()}`
      : editText.trim();
    setNotes(lines.join('\n'));
    setEditingId(null);
    setEditText('');
  };

  /* Declaración */
  const [declaracion, setDeclaracion] = useState<Declaracion>({
    idSecuencia: '', eta: '', tipoDespacho: '', administracionCodigo: '', administracionNombre: '',
    noDeclaracion: '', docEmbarque: '', depositoDestino: '', puertoEntrada: '',
    paisProcedenciaCodigo: '', paisProcedenciaNombre: '', facturaComercialNo: '',
  });

  /* Partes */
  const [importador, setImportadorState] = useState<EntidadAduanal>({ codigo: '', nombre: '' });
  const [consignatarioEdited, setConsignatarioEdited] = useState(false);
  const [agenteAduanal, setAgenteAduanal] = useState<EntidadAduanal>({ codigo: '1', nombre: 'ARMESSAG, SRL' });
  const [consignatario, setConsignatarioState] = useState<EntidadAduanal>({ codigo: '', nombre: '' });
  const [compradorExportacion, setCompradorExportacion] = useState<EntidadAduanal>({ codigo: '0', nombre: '' });
  const [suplidores, setSuplidores] = useState<Suplidor[]>([]);

  /* Importador -> Consignatario sync */
  const setImportador = (val: EntidadAduanal) => {
    setImportadorState(val);
    if (!consignatarioEdited) {
      setConsignatarioState(val);
    }
  };
  const setConsignatario = (val: EntidadAduanal) => {
    setConsignatarioEdited(true);
    setConsignatarioState(val);
  };

  /* Documentos & Contenedores */
  const [documentos, setDocumentos] = useState<DocumentoFactura[]>([]);
  const [contenedores, setContenedores] = useState<Contenedor[]>([]);
  const [tipoCarga, setTipoCarga] = useState<TipoCarga>('contenedores');

  /* Valores */
  const [valores, setValores] = useState<Valores>({ tasaCambio: 65, valorFobTotal: 0, seguro: 0, flete: 0, otros: 0, valorCifTotal: 0 });
  const [regimenAduanero, setRegimenAduanero] = useState<RegimenAduanero>({ codigo: '1', nombre: 'DESPACHO A CONSUMO', acuerdo: '' });
  const [pesoMercancia, setPesoMercancia] = useState<PesoMercancia>({ codigoMercancia: '', pesoBrutoKg: 0, pesoNetoKg: 0 });

  /* Partidas */
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [importError, setImportError] = useState('');

  /* Add helpers */
  const addSuplidor = () => setSuplidores([...suplidores, { codigo: '', nombre: '', nacionalidad: '' }]);
  const addDocumento = () => setDocumentos([...documentos, { id: crypto.randomUUID(), numeroFactura: '', fechaFactura: '', codigoSuplidor: '', valorFactura: 0 }]);
  const addContenedor = () => setContenedores([...contenedores, { id: crypto.randomUUID(), tipo: '', numero: '', sello1: '', sello2: '' }]);
  const addPartida = () => setPartidas([...partidas, { id: crypto.randomUUID(), codigoPartida: '', descripcion: '', organico: false, cantidad: 0, unidad: 'KILOGRAMOS', paisOrigen: '', valorFob: 0, unitario: 0, facturaDva: '' }]);
  const removePartida = (idx: number) => setPartidas(partidas.filter((_, i) => i !== idx));

  /* Import partidas from Excel */
  const handleImportPartidas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        const rows: Partida[] = data.map((row) => ({
          id: crypto.randomUUID(),
          codigoPartida: String(row['codigoPartida'] || row['Partida'] || row['Codigo'] || ''),
          descripcion: String(row['descripcion'] || row['Descripción'] || row['Descripcion'] || ''),
          organico: Boolean(row['organico'] || row['Orgánico'] || false),
          cantidad: Number(row['cantidad'] || row['Cantidad'] || 0),
          unidad: String(row['unidad'] || row['Unidad'] || 'KILOGRAMOS'),
          paisOrigen: String(row['paisOrigen'] || row['País Origen'] || row['PaisOrigen'] || ''),
          valorFob: Number(row['valorFob'] || row['Valor FOB'] || row['ValorFob'] || 0),
          unitario: Number(row['unitario'] || row['Unitario'] || 0),
          facturaDva: String(row['facturaDva'] || row['Factura DVA'] || row['FacturaDva'] || ''),
        }));
        setPartidas((prev) => [...prev, ...rows]);
      } catch {
        setImportError(t('importExport.parseError'));
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  /* Administración dropdown handler */
  const handleAdminChange = (codigo: string) => {
    const admin = ADMINISTRACIONES.find((a) => a.codigo === codigo);
    setDeclaracion({ ...declaracion, administracionCodigo: codigo, administracionNombre: admin?.nombre ?? '' });
  };

  /* Régimen dropdown handler */
  const handleRegimenChange = (codigo: string) => {
    const reg = REGIMENES.find((r) => r.codigo === codigo);
    setRegimenAduanero({ ...regimenAduanero, codigo, nombre: reg?.nombre ?? '' });
  };

  const handleCreate = () => {
    create({
      reference: reference || declaracion.noDeclaracion,
      tipoExpediente,
      status,
      checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c, id: crypto.randomUUID() })),
      declaracion, importador, agenteAduanal, consignatario: consignatario, compradorExportacion,
      suplidores, documentos, contenedores, tipoCarga, valores, regimenAduanero,
      pesoMercancia, partidas, notes, assignedUserId: '2',
    });
    setSuccess(true);
    setTimeout(() => navigate('/expedientes'), 1200);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/expedientes')}>{t('common.cancel')}</Button>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('expediente.newExpediente')}</Typography>
        <Chip
          icon={tipoExpediente === 'importacion' ? <FlightLand fontSize="small" /> : <FlightTakeoff fontSize="small" />}
          label={t(`expediente.tipo_${tipoExpediente}`)}
          color={tipoExpediente === 'importacion' ? 'info' : 'secondary'}
        />
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{t('expediente.createSuccess')}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label={t('detail.tabDeclaracion')} />
          <Tab label={t('detail.tabPartes')} />
          <Tab label={t('detail.tabDocsCont')} />
          <Tab label={t('detail.tabValores')} />
          <Tab label={t('detail.tabPartidas')} />
        </Tabs>
      </Box>

      {/* TAB 0 — DECLARACIÓN */}
      {tab === 0 && (
        <Card><CardContent>
          <SectionTitle>{t('detail.declaracion')}</SectionTitle>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="date" label="ETA" value={declaracion.eta} onChange={(e) => setDeclaracion({ ...declaracion, eta: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth label={t('detail.tipoDespacho')} value={declaracion.tipoDespacho} onChange={(e) => setDeclaracion({ ...declaracion, tipoDespacho: e.target.value })}>
                {TIPOS_DESPACHO.map((td) => <MenuItem key={td} value={td}>{td}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth label={t('detail.administracionNombre')} value={declaracion.administracionCodigo} onChange={(e) => handleAdminChange(e.target.value)}>
                {ADMINISTRACIONES.map((a) => <MenuItem key={a.codigo} value={a.codigo}>{a.nombre}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth required label={t('detail.noDeclaracion')} value={declaracion.noDeclaracion} onChange={(e) => setDeclaracion({ ...declaracion, noDeclaracion: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('detail.docEmbarque')} value={declaracion.docEmbarque} onChange={(e) => setDeclaracion({ ...declaracion, docEmbarque: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('detail.depositoDestino')} value={declaracion.depositoDestino} onChange={(e) => setDeclaracion({ ...declaracion, depositoDestino: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('detail.puertoEntrada')} value={declaracion.puertoEntrada} onChange={(e) => setDeclaracion({ ...declaracion, puertoEntrada: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.paisProcedenciaCodigo')} value={declaracion.paisProcedenciaCodigo} onChange={(e) => setDeclaracion({ ...declaracion, paisProcedenciaCodigo: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.paisProcedenciaNombre')} value={declaracion.paisProcedenciaNombre} onChange={(e) => setDeclaracion({ ...declaracion, paisProcedenciaNombre: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.facturaComercialNo')} value={declaracion.facturaComercialNo} onChange={(e) => setDeclaracion({ ...declaracion, facturaComercialNo: e.target.value })} /></Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <SectionTitle>{t('detail.generalInfo')}</SectionTitle>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('expediente.reference')} value={reference} onChange={(e) => setReference(e.target.value)} helperText={t('detail.referenceHint')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label={t('expediente.status')} value={status} onChange={(e) => setStatus(e.target.value as ExpedienteStatus)}>
                {Object.values(ExpedienteStatus).map((s) => (
                  <MenuItem key={s} value={s}>{t(`status.${s}`)}</MenuItem>
                ))}
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
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth required label={t('detail.codigo')} value={importador.codigo} onChange={(e) => setImportador({ ...importador, codigo: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth required label={t('detail.nombre')} value={importador.nombre} onChange={(e) => setImportador({ ...importador, nombre: e.target.value })} /></Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.agenteAduanal')}</SectionTitle>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.codigo')} value={agenteAduanal.codigo} onChange={(e) => setAgenteAduanal({ ...agenteAduanal, codigo: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth label={t('detail.nombre')} value={agenteAduanal.nombre} onChange={(e) => setAgenteAduanal({ ...agenteAduanal, nombre: e.target.value })} /></Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.consignatario')}</SectionTitle>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('detail.consignatarioHint')}</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.codigo')} value={consignatario.codigo} onChange={(e) => setConsignatario({ ...consignatario, codigo: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth label={t('detail.nombre')} value={consignatario.nombre} onChange={(e) => setConsignatario({ ...consignatario, nombre: e.target.value })} /></Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.compradorExportacion')}</SectionTitle>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.codigo')} value={compradorExportacion.codigo} onChange={(e) => setCompradorExportacion({ ...compradorExportacion, codigo: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth label={t('detail.nombre')} value={compradorExportacion.nombre} onChange={(e) => setCompradorExportacion({ ...compradorExportacion, nombre: e.target.value })} /></Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.suplidores')} ({suplidores.length})</SectionTitle>
            {suplidores.map((sup, i) => (
              <Grid container spacing={2} key={i} sx={{ mb: 1 }}>
                <Grid size={{ xs: 12, sm: 3 }}><TextField fullWidth size="small" label={t('detail.codigo')} value={sup.codigo} onChange={(e) => { const c = [...suplidores]; c[i] = { ...c[i], codigo: e.target.value }; setSuplidores(c); }} /></Grid>
                <Grid size={{ xs: 12, sm: 5 }}><TextField fullWidth size="small" label={t('detail.nombre')} value={sup.nombre} onChange={(e) => { const c = [...suplidores]; c[i] = { ...c[i], nombre: e.target.value }; setSuplidores(c); }} /></Grid>
                <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label={t('detail.nacionalidad')} value={sup.nacionalidad} onChange={(e) => { const c = [...suplidores]; c[i] = { ...c[i], nacionalidad: e.target.value }; setSuplidores(c); }} /></Grid>
              </Grid>
            ))}
            <Button size="small" startIcon={<Add />} onClick={addSuplidor}>{t('detail.addSuplidor')}</Button>
          </CardContent></Card>
        </Box>
      )}

      {/* TAB 2 — DOCUMENTOS & CONTENEDORES */}
      {tab === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card><CardContent>
            <SectionTitle>{t('detail.documentos')} ({documentos.length})</SectionTitle>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('detail.numeroFactura')}</TableCell>
                    <TableCell>{t('detail.fechaFactura')}</TableCell>
                    <TableCell>{t('detail.codigoSuplidor')}</TableCell>
                    <TableCell align="right">{t('detail.valorFactura')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documentos.map((doc, i) => (
                    <TableRow key={doc.id}>
                      <TableCell><TextField size="small" variant="standard" value={doc.numeroFactura} onChange={(e) => { const c = [...documentos]; c[i] = { ...c[i], numeroFactura: e.target.value }; setDocumentos(c); }} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" type="date" value={doc.fechaFactura} onChange={(e) => { const c = [...documentos]; c[i] = { ...c[i], fechaFactura: e.target.value }; setDocumentos(c); }} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" value={doc.codigoSuplidor} onChange={(e) => { const c = [...documentos]; c[i] = { ...c[i], codigoSuplidor: e.target.value }; setDocumentos(c); }} /></TableCell>
                      <TableCell align="right"><TextField size="small" variant="standard" type="number" value={doc.valorFactura} onChange={(e) => { const c = [...documentos]; c[i] = { ...c[i], valorFactura: Number(e.target.value) }; setDocumentos(c); }} sx={{ width: 120 }} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button size="small" startIcon={<Add />} onClick={addDocumento} sx={{ mt: 1 }}>{t('detail.addDocumento')}</Button>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.contenedores')} ({contenedores.length})</SectionTitle>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label={t('detail.tipoCarga')} value={tipoCarga} onChange={(e) => setTipoCarga(e.target.value as TipoCarga)}>
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contenedores.map((cnt, i) => (
                    <TableRow key={cnt.id}>
                      <TableCell><TextField size="small" variant="standard" value={cnt.tipo} onChange={(e) => { const c = [...contenedores]; c[i] = { ...c[i], tipo: e.target.value }; setContenedores(c); }} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" value={cnt.numero} onChange={(e) => { const c = [...contenedores]; c[i] = { ...c[i], numero: e.target.value }; setContenedores(c); }} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" value={cnt.sello1} onChange={(e) => { const c = [...contenedores]; c[i] = { ...c[i], sello1: e.target.value }; setContenedores(c); }} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" value={cnt.sello2} onChange={(e) => { const c = [...contenedores]; c[i] = { ...c[i], sello2: e.target.value }; setContenedores(c); }} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button size="small" startIcon={<Add />} onClick={addContenedor} sx={{ mt: 1 }}>{t('detail.addContenedor')}</Button>
          </CardContent></Card>
        </Box>
      )}

      {/* TAB 3 — VALORES & RÉGIMEN */}
      {tab === 3 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card><CardContent>
            <SectionTitle>{t('detail.valores')}</SectionTitle>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="number" label={t('detail.tasaCambio')} value={valores.tasaCambio} onChange={(e) => setValores({ ...valores, tasaCambio: Number(e.target.value) })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="number" label={t('detail.valorFobTotal')} value={valores.valorFobTotal} onChange={(e) => setValores({ ...valores, valorFobTotal: Number(e.target.value) })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="number" label={t('detail.seguro')} value={valores.seguro} onChange={(e) => setValores({ ...valores, seguro: Number(e.target.value) })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="number" label={t('detail.flete')} value={valores.flete} onChange={(e) => setValores({ ...valores, flete: Number(e.target.value) })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="number" label={t('detail.otros')} value={valores.otros} onChange={(e) => setValores({ ...valores, otros: Number(e.target.value) })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="number" label={t('detail.valorCifTotal')} value={valores.valorCifTotal} onChange={(e) => setValores({ ...valores, valorCifTotal: Number(e.target.value) })} /></Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.regimenAduanero')}</SectionTitle>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label={t('detail.regimenAduanero')} value={regimenAduanero.codigo} onChange={(e) => handleRegimenChange(e.target.value)}>
                  {REGIMENES.map((r) => <MenuItem key={r.codigo} value={r.codigo}>{r.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('detail.acuerdo')} value={regimenAduanero.acuerdo} onChange={(e) => setRegimenAduanero({ ...regimenAduanero, acuerdo: e.target.value })} /></Grid>
            </Grid>
          </CardContent></Card>

          <Card><CardContent>
            <SectionTitle>{t('detail.pesoMercancia')}</SectionTitle>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.codigoMercancia')} value={pesoMercancia.codigoMercancia} onChange={(e) => setPesoMercancia({ ...pesoMercancia, codigoMercancia: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="number" label={t('detail.pesoBrutoKg')} value={pesoMercancia.pesoBrutoKg} onChange={(e) => setPesoMercancia({ ...pesoMercancia, pesoBrutoKg: Number(e.target.value) })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="number" label={t('detail.pesoNetoKg')} value={pesoMercancia.pesoNetoKg} onChange={(e) => setPesoMercancia({ ...pesoMercancia, pesoNetoKg: Number(e.target.value) })} /></Grid>
            </Grid>
          </CardContent></Card>
        </Box>
      )}

      {/* TAB 4 — PARTIDAS (with import from Excel) */}
      {tab === 4 && (
        <Card><CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <SectionTitle>{t('detail.partidas')} ({partidas.length})</SectionTitle>
            <Box sx={{ flexGrow: 1 }} />
            <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImportPartidas} />
            <Button variant="outlined" size="small" startIcon={<Upload />} onClick={() => fileRef.current?.click()}>
              {t('detail.importPartidasXlsx')}
            </Button>
          </Box>
          {importError && <Alert severity="error" sx={{ mb: 2 }}>{importError}</Alert>}
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
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {partidas.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell><TextField size="small" variant="standard" value={p.codigoPartida} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], codigoPartida: e.target.value }; setPartidas(c); }} sx={{ width: 110 }} /></TableCell>
                    <TableCell><TextField size="small" variant="standard" value={p.descripcion} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], descripcion: e.target.value }; setPartidas(c); }} sx={{ minWidth: 180 }} /></TableCell>
                    <TableCell align="center"><Checkbox size="small" checked={p.organico} onChange={() => { const c = [...partidas]; c[i] = { ...c[i], organico: !c[i].organico }; setPartidas(c); }} /></TableCell>
                    <TableCell align="right"><TextField size="small" variant="standard" type="number" value={p.cantidad} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], cantidad: Number(e.target.value) }; setPartidas(c); }} sx={{ width: 90 }} /></TableCell>
                    <TableCell>
                      <TextField select size="small" variant="standard" value={p.unidad} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], unidad: e.target.value }; setPartidas(c); }} sx={{ width: 120 }}>
                        {UNIDADES.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell><TextField size="small" variant="standard" value={p.paisOrigen} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], paisOrigen: e.target.value }; setPartidas(c); }} sx={{ width: 90 }} /></TableCell>
                    <TableCell align="right"><TextField size="small" variant="standard" type="number" value={p.valorFob} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], valorFob: Number(e.target.value) }; setPartidas(c); }} sx={{ width: 100 }} /></TableCell>
                    <TableCell align="right"><TextField size="small" variant="standard" type="number" value={p.unitario} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], unitario: Number(e.target.value) }; setPartidas(c); }} sx={{ width: 80 }} /></TableCell>
                    <TableCell><TextField size="small" variant="standard" value={p.facturaDva} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], facturaDva: e.target.value }; setPartidas(c); }} sx={{ width: 90 }} /></TableCell>
                    <TableCell>
                      <Button size="small" color="error" onClick={() => removePartida(i)} sx={{ minWidth: 0, p: 0.5 }}>✕</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button size="small" startIcon={<Add />} onClick={addPartida}>{t('detail.addPartida')}</Button>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              FOB Total: ${partidas.reduce((s, p) => s + p.valorFob, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
        </CardContent></Card>
      )}

      {/* OBSERVATIONS TIMELINE */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('expediente.observations')}</Typography>
            <IconButton size="small" onClick={() => setObsOrder((o) => o === 'asc' ? 'desc' : 'asc')} title={obsOrder === 'asc' ? t('common.recentFirst') : t('common.oldestFirst')}>
              <SwapVert />
            </IconButton>
          </Box>

          {sortedObs.length > 0 ? (
            <Box sx={{ position: 'relative', pl: 4, mb: 3 }}>
              <Box sx={{ position: 'absolute', left: 11, top: 6, bottom: 6, width: 2, bgcolor: 'divider' }} />
              {sortedObs.map((obs) => (
                <Box key={obs.id} sx={{ position: 'relative', mb: 3 }}>
                  <Box sx={{
                    position: 'absolute', left: -30, top: 4,
                    width: 10, height: 10, borderRadius: '50%',
                    bgcolor: 'primary.main', border: '2px solid', borderColor: 'background.paper',
                  }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                        {obs.date ? obs.date.toLocaleString() : ''}{obs.user ? ` · ${obs.user}` : ''}
                      </Typography>
                      {editingId === obs.id ? (
                        <Box>
                          <TextField fullWidth size="small" multiline rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Button size="small" variant="contained" disabled={!editText.trim()} onClick={() => handleSaveEdit(obs.id)}>{t('expediente.save')}</Button>
                            <Button size="small" onClick={() => setEditingId(null)}>{t('common.cancel')}</Button>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2">{obs.text}</Typography>
                      )}
                    </Box>
                    {editingId !== obs.id && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                        <IconButton size="small" onClick={() => { setEditingId(obs.id); setEditText(obs.text); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteObs(obs.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('expediente.noObservations')}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              placeholder={t('expediente.newObservation')}
              value={newObs}
              onChange={(e) => setNewObs(e.target.value)}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<AddComment />}
              disabled={!newObs.trim()}
              onClick={handleAddObs}
              sx={{ mt: 0.5, whiteSpace: 'nowrap' }}
            >
              {t('expediente.addObservations')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ACTION BUTTONS — always visible */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="contained" startIcon={<Save />} onClick={handleCreate}>{t('expediente.save')}</Button>
        <Button variant="outlined" onClick={() => navigate('/expedientes')}>{t('common.cancel')}</Button>
      </Box>
    </Box>
  );
}
