import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Download, Print } from '@mui/icons-material';
import type { ReportePreliquidacion } from '../utils/preliquidacionReporte';
import { generarPdfPreliquidacion } from '../utils/preliquidacionPdf';

interface Props {
  reporte: ReportePreliquidacion;
  nombreArchivo: string;
  onClose: () => void;
}

/**
 * Renders the preliquidación to PDF and shows it in the browser's own viewer. Imprimir prints
 * that same PDF, so paper and file are identical; Descargar saves it.
 */
export default function PreliquidacionPdfDialog({ reporte, nombreArchivo, onClose }: Props) {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    let creado: string | null = null;
    generarPdfPreliquidacion(reporte, (k, o) => t(k, o))
      .then((blob) => {
        creado = URL.createObjectURL(blob);
        if (vivo) setUrl(creado); else URL.revokeObjectURL(creado);
      })
      .catch(() => { if (vivo) setError(true); });
    return () => {
      vivo = false;
      if (creado) URL.revokeObjectURL(creado);
    };
  }, [reporte, t]);

  const imprimir = () => {
    try {
      frameRef.current?.contentWindow?.focus();
      frameRef.current?.contentWindow?.print();
    } catch {
      // Some viewers refuse scripted printing; their own toolbar still prints.
      if (url) window.open(url, '_blank');
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{t('preliq.vistaImpresion')}</DialogTitle>
      <DialogContent sx={{ height: '75vh', p: 0 }}>
        {error && <Alert severity="error" sx={{ m: 2 }}>{t('preliq.errorPdf')}</Alert>}
        {!url && !error && (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <CircularProgress size={24} /> {t('preliq.generandoPdf')}
          </Box>
        )}
        {url && <iframe ref={frameRef} src={url} title={t('preliq.vistaImpresion')} style={{ border: 0, width: '100%', height: '100%' }} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
        {url
          ? <Button startIcon={<Download />} href={url} download={nombreArchivo}>{t('preliq.descargarPdf')}</Button>
          : <Button startIcon={<Download />} disabled>{t('preliq.descargarPdf')}</Button>}
        <Button variant="contained" startIcon={<Print />} disabled={!url} onClick={imprimir}>{t('preliq.imprimir')}</Button>
      </DialogActions>
    </Dialog>
  );
}
