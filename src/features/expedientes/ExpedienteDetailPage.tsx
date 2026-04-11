import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Card, CardContent, Checkbox, Chip, Divider, FormControlLabel,
  Grid, LinearProgress, MenuItem, Tab, Tabs, TextField, Typography, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { ArrowBack, Save, Delete, Add } from '@mui/icons-material';
import { useExpedientesStore, computeProgress } from '../../store/expedientesStore';
import type {
  ExpedienteStatus, Declaracion, EntidadAduanal, Suplidor,
  DocumentoFactura, Contenedor, Valores, RegimenAduanero, PesoMercancia, Partida, TipoCarga,
} from '../../types';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{children}</Typography>;
}

export default function ExpedienteDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const expediente = useExpedientesStore((s) => s.getById(id!));
  const update = useExpedientesStore((s) => s.update);
  const toggleChecklistItem = useExpedientesStore((s) => s.toggleChecklistItem);
  const remove = useExpedientesStore((s) => s.remove);

  const [tab, setTab] = useState(0);
  const [saved, setSaved] = useState(false);

  const [reference, setReference] = useState(expediente?.reference ?? '');
  const [status, setStatus] = useState<ExpedienteStatus>(expediente?.status ?? 'pending');
  const [notes, setNotes] = useState(expediente?.notes ?? '');
  const [declaracion, setDeclaracion] = useState<Declaracion>(expediente?.declaracion ?? {
    idSecuencia: '', eta: '', tipoDespacho: '', administracionCodigo: '', administracionNombre: '',
    noDeclaracion: '', docEmbarque: '', depositoDestino: '', puertoEntrada: '',
    paisProcedenciaCodigo: '', paisProcedenciaNombre: '', facturaComercialNo: '',
  });
  const [importador, setImportador] = useState<EntidadAduanal>(expediente?.importador ?? { codigo: '', nombre: '' });
  const [agenteAduanal, setAgenteAduanal] = useState<EntidadAduanal>(expediente?.agenteAduanal ?? { codigo: '', nombre: '' });
  const [consignatario, setConsignatario] = useState<EntidadAduanal>(expediente?.consignatario ?? { codigo: '', nombre: '' });
  const [compradorExportacion, setCompradorExportacion] = useState<EntidadAduanal>(expediente?.compradorExportacion ?? { codigo: '', nombre: '' });
  const [suplidores, setSuplidores] = useState<Suplidor[]>(expediente?.suplidores ?? []);
  const [documentos, setDocumentos] = useState<DocumentoFactura[]>(expediente?.documentos ?? []);
  const [contenedores, setContenedores] = useState<Contenedor[]>(expediente?.contenedores ?? []);
  const [tipoCarga, setTipoCarga] = useState<TipoCarga>(expediente?.tipoCarga ?? 'contenedores');
  const [valores, setValores] = useState<Valores>(expediente?.valores ?? { tasaCambio: 0, valorFobTotal: 0, seguro: 0, flete: 0, otros: 0, valorCifTotal: 0 });
  const [regimenAduanero, setRegimenAduanero] = useState<RegimenAduanero>(expediente?.regimenAduanero ?? { codigo: '', nombre: '', acuerdo: '' });
  const [pesoMercancia, setPesoMercancia] = useState<PesoMercancia>(expediente?.pesoMercancia ?? { codigoMercancia: '', pesoBrutoKg: 0, pesoNetoKg: 0 });
  const [partidas, setPartidas] = useState<Partida[]>(expediente?.partidas ?? []);

  if (!expediente) {
    return (
      <Box>
        <Alert severity="error">{t('expediente.noResults')}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/expedientes')}>{t('common.cancel')}</Button>
      </Box>
    );
  }

  const progress = computeProgress(expediente.checklist);

  const handleSave = () => {
    update(id!, {
      reference, status, notes, declaracion, importador, agenteAduanal,
      consignatario, compradorExportacion, suplidores, documentos, contenedores,
      tipoCarga, valores, regimenAduanero, pesoMercancia, partidas,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => { remove(id!); navigate('/expedientes'); };

  const addSuplidor = () => setSuplidores([...suplidores, { codigo: '', nombre: '', nacionalidad: '' }]);
  const addDocumento = () => setDocumentos([...documentos, { id: crypto.randomUUID(), numeroFactura: '', fechaFactura: '', codigoSuplidor: '', valorFactura: 0 }]);
  const addContenedor = () => setContenedores([...contenedores, { id: crypto.randomUUID(), tipo: '', numero: '', sello1: '', sello2: '' }]);
  const addPartida = () => setPartidas([...partidas, { id: crypto.randomUUID(), codigoPartida: '', descripcion: '', organico: false, cantidad: 0, unidad: 'KILOGRAMOS', paisOrigen: '', valorFob: 0, unitario: 0, facturaDva: '' }]);

  const statusColor = expediente.status === 'completed' ? 'success' : expediente.status === 'alert' ? 'warning' : 'primary';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/expedientes')}>{t('common.cancel')}</Button>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          {expediente.reference}
        </Typography>
        <Chip label={t(`status.${expediente.status}`)} color={statusColor} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{progress}%</Typography>
      </Box>

      <LinearProgress variant="determinate" value={progress} sx={{ mb: 3, height: 8, borderRadius: 4 }} />
      {saved && <Alert severity="success" sx={{ mb: 2 }}>{t('expediente.saveSuccess')}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label={t('detail.tabDeclaracion')} />
          <Tab label={t('detail.tabPartes')} />
          <Tab label={t('detail.tabDocsCont')} />
          <Tab label={t('detail.tabValores')} />
          <Tab label={t('detail.tabPartidas')} />
          <Tab label={t('expediente.checklist')} />
        </Tabs>
      </Box>

      {/* TAB 0 — DECLARACIÓN */}
      {tab === 0 && (
        <Card><CardContent>
          <SectionTitle>{t('detail.declaracion')}</SectionTitle>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.idSecuencia')} value={declaracion.idSecuencia} onChange={(e) => setDeclaracion({ ...declaracion, idSecuencia: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="date" label="ETA" value={declaracion.eta} onChange={(e) => setDeclaracion({ ...declaracion, eta: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.tipoDespacho')} value={declaracion.tipoDespacho} onChange={(e) => setDeclaracion({ ...declaracion, tipoDespacho: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.administracionCodigo')} value={declaracion.administracionCodigo} onChange={(e) => setDeclaracion({ ...declaracion, administracionCodigo: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth label={t('detail.administracionNombre')} value={declaracion.administracionNombre} onChange={(e) => setDeclaracion({ ...declaracion, administracionNombre: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('detail.noDeclaracion')} value={declaracion.noDeclaracion} onChange={(e) => setDeclaracion({ ...declaracion, noDeclaracion: e.target.value })} /></Grid>
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
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={t('expediente.reference')} value={reference} onChange={(e) => setReference(e.target.value)} /></Grid>
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
            <Button variant="contained" startIcon={<Save />} onClick={handleSave}>{t('expediente.save')}</Button>
            <Button variant="outlined" color="error" startIcon={<Delete />} onClick={handleDelete}>{t('expediente.delete')}</Button>
          </Box>
        </CardContent></Card>
      )}

      {/* TAB 1 — PARTES */}
      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card><CardContent>
            <SectionTitle>{t('detail.importador')}</SectionTitle>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.codigo')} value={importador.codigo} onChange={(e) => setImportador({ ...importador, codigo: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth label={t('detail.nombre')} value={importador.nombre} onChange={(e) => setImportador({ ...importador, nombre: e.target.value })} /></Grid>
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

          <Button variant="contained" startIcon={<Save />} onClick={handleSave}>{t('expediente.save')}</Button>
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

          <Button variant="contained" startIcon={<Save />} onClick={handleSave}>{t('expediente.save')}</Button>
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
              <Grid size={{ xs: 12, sm: 3 }}><TextField fullWidth label={t('detail.codigo')} value={regimenAduanero.codigo} onChange={(e) => setRegimenAduanero({ ...regimenAduanero, codigo: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 5 }}><TextField fullWidth label={t('detail.nombre')} value={regimenAduanero.nombre} onChange={(e) => setRegimenAduanero({ ...regimenAduanero, nombre: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label={t('detail.acuerdo')} value={regimenAduanero.acuerdo} onChange={(e) => setRegimenAduanero({ ...regimenAduanero, acuerdo: e.target.value })} /></Grid>
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

          <Button variant="contained" startIcon={<Save />} onClick={handleSave}>{t('expediente.save')}</Button>
        </Box>
      )}

      {/* TAB 4 — PARTIDAS */}
      {tab === 4 && (
        <Card><CardContent>
          <SectionTitle>{t('detail.partidas')} ({partidas.length})</SectionTitle>
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
                </TableRow>
              </TableHead>
              <TableBody>
                {partidas.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell><TextField size="small" variant="standard" value={p.codigoPartida} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], codigoPartida: e.target.value }; setPartidas(c); }} sx={{ width: 110 }} /></TableCell>
                    <TableCell><TextField size="small" variant="standard" value={p.descripcion} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], descripcion: e.target.value }; setPartidas(c); }} sx={{ minWidth: 180 }} /></TableCell>
                    <TableCell align="center"><Checkbox size="small" checked={p.organico} onChange={() => { const c = [...partidas]; c[i] = { ...c[i], organico: !c[i].organico }; setPartidas(c); }} /></TableCell>
                    <TableCell align="right"><TextField size="small" variant="standard" type="number" value={p.cantidad} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], cantidad: Number(e.target.value) }; setPartidas(c); }} sx={{ width: 90 }} /></TableCell>
                    <TableCell><TextField size="small" variant="standard" value={p.unidad} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], unidad: e.target.value }; setPartidas(c); }} sx={{ width: 100 }} /></TableCell>
                    <TableCell><TextField size="small" variant="standard" value={p.paisOrigen} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], paisOrigen: e.target.value }; setPartidas(c); }} sx={{ width: 90 }} /></TableCell>
                    <TableCell align="right"><TextField size="small" variant="standard" type="number" value={p.valorFob} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], valorFob: Number(e.target.value) }; setPartidas(c); }} sx={{ width: 100 }} /></TableCell>
                    <TableCell align="right"><TextField size="small" variant="standard" type="number" value={p.unitario} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], unitario: Number(e.target.value) }; setPartidas(c); }} sx={{ width: 80 }} /></TableCell>
                    <TableCell><TextField size="small" variant="standard" value={p.facturaDva} onChange={(e) => { const c = [...partidas]; c[i] = { ...c[i], facturaDva: e.target.value }; setPartidas(c); }} sx={{ width: 90 }} /></TableCell>
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
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} sx={{ mt: 2 }}>{t('expediente.save')}</Button>
        </CardContent></Card>
      )}

      {/* TAB 5 — CHECKLIST */}
      {tab === 5 && (
        <Card><CardContent>
          <Typography variant="h6" gutterBottom>{t('expediente.checklist')}</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {expediente.checklist.filter((c) => c.completed).length} / {expediente.checklist.length} — {progress}%
          </Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ mb: 2, height: 8, borderRadius: 4 }} />
          {expediente.checklist.map((item) => (
            <Box key={item.id}>
              <FormControlLabel
                control={<Checkbox checked={item.completed} onChange={() => toggleChecklistItem(id!, item.id)} />}
                label={
                  <Box>
                    <Typography variant="body1" sx={{ textDecoration: item.completed ? 'line-through' : 'none' }}>
                      {item.label}
                    </Typography>
                    {item.completedAt && (
                      <Typography variant="caption" color="text.secondary">
                        {new Date(item.completedAt).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                }
              />
              <Divider />
            </Box>
          ))}
        </CardContent></Card>
      )}
    </Box>
  );
}
