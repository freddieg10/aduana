import { ExpedienteStatus } from '../types';
import type { Expediente } from '../types';

/** Statuses at or past "Presentado" never get ETA highlighting. */
export const ADVANCED_STATUSES = new Set<ExpedienteStatus>([
  ExpedienteStatus.Presentado,
  ExpedienteStatus.ProcesoVerificacion,
  ExpedienteStatus.Verificado,
  ExpedienteStatus.Despacho,
  ExpedienteStatus.Completo,
]);

export const WARNING_DAYS = 7;

/**
 * DataGrid row class for the ETA rule: orange when the ETA has passed, yellow when it
 * is within WARNING_DAYS, nothing once the file has been filed with DGA.
 */
export function etaRowClass(exp: Pick<Expediente, 'status' | 'declaracion'>, now = Date.now()): '' | 'row-overdue' | 'row-warning' {
  const eta = exp.declaracion?.eta;
  if (!eta || ADVANCED_STATUSES.has(exp.status)) return '';
  const etaMs = new Date(eta).getTime();
  if (isNaN(etaMs)) return '';
  const daysUntil = (etaMs - now) / (1000 * 60 * 60 * 24);
  if (daysUntil < 0) return 'row-overdue';
  if (daysUntil <= WARNING_DAYS) return 'row-warning';
  return '';
}
