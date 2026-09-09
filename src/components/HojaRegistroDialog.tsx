import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Download, Print } from '@mui/icons-material';
import type { Expediente } from '../types';
import { buildHojaRegistroHtml } from '../utils/hojaRegistro';
import { downloadTextFile } from '../utils/xml';

interface Props {
  expediente: Expediente;
  onClose: () => void;
}

/**
 * Preview of the hoja de registro. The sheet is a standalone HTML document rendered inside an
 * iframe, which keeps its print styles away from the app and lets the browser print just the
 * sheet.
 */
export default function HojaRegistroDialog({ expediente, onClose }: Props) {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const html = buildHojaRegistroHtml(expediente);

  const nombreArchivo = `HojaRegistro_${(expediente.declaracion.noDeclaracion || expediente.reference).replace(/[^\w-]+/g, '_')}.html`;

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{t('detail.hojaRegistro')}</DialogTitle>
      <DialogContent dividers sx={{ p: 0, height: '70vh' }}>
        <iframe
          ref={frameRef}
          title={t('detail.hojaRegistro')}
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 0, background: '#fff' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
        <Button startIcon={<Download />} onClick={() => downloadTextFile(html, nombreArchivo, 'text/html')}>
          {t('common.descargar')}
        </Button>
        <Button variant="contained" startIcon={<Print />} onClick={() => frameRef.current?.contentWindow?.print()}>
          {t('common.imprimir')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
