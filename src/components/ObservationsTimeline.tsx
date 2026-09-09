import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Chip, FormControlLabel, IconButton, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { AddComment, Delete, Edit as EditIcon, SwapVert, Visibility, VisibilityOff } from '@mui/icons-material';
import type { Observacion } from '../types';
import { fmtDateTime } from '../utils/date';
import { sortObservaciones } from '../utils/observaciones';

interface Props {
  items: Observacion[];
  onAdd?: (texto: string, publica: boolean) => void;
  /** Toggles whether the client portal shows an observation. Omit to hide the control. */
  onTogglePublica?: (id: string) => void;
  onEdit?: (id: string, texto: string) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
  /** Hide the title row (used when the parent already renders a heading). */
  hideTitle?: boolean;
}

/**
 * Twitter-style chronological feed of observations with inline add / edit / delete.
 * Stateless with respect to the data: the parent owns `items` and receives callbacks.
 */
export default function ObservationsTimeline({ items, onAdd, onEdit, onDelete, onTogglePublica, readOnly = false, hideTitle = false }: Props) {
  const { t } = useTranslation();
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [newText, setNewText] = useState('');
  const [newPublica, setNewPublica] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const sorted = useMemo(() => sortObservaciones(items, order), [items, order]);
  const canEdit = !readOnly && Boolean(onEdit);
  const canDelete = !readOnly && Boolean(onDelete);
  const canAdd = !readOnly && Boolean(onAdd);

  const submitAdd = () => {
    if (!newText.trim() || !onAdd) return;
    onAdd(newText.trim(), newPublica);
    setNewText('');
    setNewPublica(false);
  };

  const submitEdit = (id: string) => {
    if (!editText.trim() || !onEdit) return;
    onEdit(id, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        {!hideTitle && <Typography variant="h6">{t('expediente.observations')}</Typography>}
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          size="small"
          onClick={() => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
          title={order === 'asc' ? t('common.recentFirst') : t('common.oldestFirst')}
        >
          <SwapVert />
        </IconButton>
      </Box>

      {sorted.length > 0 ? (
        <Box sx={{ position: 'relative', pl: 4, mb: 3 }}>
          <Box sx={{ position: 'absolute', left: 11, top: 6, bottom: 6, width: 2, bgcolor: 'divider' }} />
          {sorted.map((o) => (
            <Box key={o.id} sx={{ position: 'relative', mb: 3 }}>
              <Box sx={{
                position: 'absolute', left: -30, top: 4, width: 10, height: 10, borderRadius: '50%',
                bgcolor: 'primary.main', border: '2px solid', borderColor: 'background.paper',
              }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                    <Typography variant="caption" color="text.secondary">
                      {o.fecha ? fmtDateTime(o.fecha) : ''}{o.usuario ? ` · ${o.usuario}` : ''}
                    </Typography>
                    {o.publica && <Chip size="small" color="info" variant="outlined" label={t('expediente.observacionPublica')} sx={{ height: 20 }} />}
                  </Box>
                  {editingId === o.id ? (
                    <Box>
                      <TextField fullWidth size="small" multiline rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Button size="small" variant="contained" disabled={!editText.trim()} onClick={() => submitEdit(o.id)}>{t('expediente.save')}</Button>
                        <Button size="small" onClick={() => setEditingId(null)}>{t('common.cancel')}</Button>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{o.texto}</Typography>
                  )}
                </Box>
                {editingId !== o.id && (canEdit || canDelete || onTogglePublica) && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    {!readOnly && onTogglePublica && (
                      <Tooltip title={o.publica ? t('expediente.hacerPrivada') : t('expediente.hacerPublica')}>
                        <IconButton size="small" color={o.publica ? 'info' : 'default'} onClick={() => onTogglePublica(o.id)}>
                          {o.publica ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    )}
                    {canEdit && (
                      <IconButton size="small" onClick={() => { setEditingId(o.id); setEditText(o.texto); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {canDelete && (
                      <IconButton size="small" color="error" onClick={() => onDelete?.(o.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('expediente.noObservations')}</Typography>
      )}

      {canAdd && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              fullWidth size="small" multiline rows={2}
              placeholder={t('expediente.newObservation')}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitAdd(); }}
            />
            <Button variant="contained" size="small" startIcon={<AddComment />} disabled={!newText.trim()} onClick={submitAdd} sx={{ mt: 0.5, whiteSpace: 'nowrap' }}>
              {t('expediente.addObservations')}
            </Button>
          </Box>
          {onTogglePublica && (
            <FormControlLabel
              sx={{ mt: 0.5 }}
              control={<Switch size="small" checked={newPublica} onChange={() => setNewPublica(!newPublica)} />}
              label={<Typography variant="caption">{t('expediente.visibleParaCliente')}</Typography>}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
