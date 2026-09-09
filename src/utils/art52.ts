import { ExpedienteStatus } from '../types';
import type { Expediente } from '../types';
import { ADVANCED_STATUSES } from './eta';

/**
 * Art. 52 recargo — the surcharge a declaration carries when it is filed too long after the
 * goods arrive.
 *
 * The app can only see files that have *not* been filed yet: it stores no filing date, so for
 * an expediente already at Presentado or beyond there is no way to tell whether it was late.
 * Those are reported as "no evaluable" rather than guessed at. The window comes from
 * Settings (`diasArt52`, default 30) — confirm the real figure with the DGA.
 */
export interface EvaluacionArt52 {
  aplica: boolean;
  /** Days since arrival, or null when there is no arrival date to measure from. */
  diasTranscurridos: number | null;
  /** False once the file is presented, because the filing date is not recorded. */
  evaluable: boolean;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Actual arrival if it was recorded, otherwise the ETA. */
export const fechaLlegada = (e: Pick<Expediente, 'declaracion' | 'informacionAdicional'>): string =>
  e.informacionAdicional?.fechaLlegadaReal || e.declaracion.eta;

export function evaluarArt52(
  e: Pick<Expediente, 'status' | 'declaracion' | 'informacionAdicional'>,
  diasArt52: number,
  now = Date.now(),
): EvaluacionArt52 {
  const llegada = fechaLlegada(e);
  const ms = llegada ? new Date(llegada).getTime() : NaN;
  if (!llegada || isNaN(ms)) return { aplica: false, diasTranscurridos: null, evaluable: false };

  const dias = Math.floor((now - ms) / DIA_MS);
  if (ADVANCED_STATUSES.has(e.status)) return { aplica: false, diasTranscurridos: dias, evaluable: false };

  return { aplica: dias > diasArt52, diasTranscurridos: dias, evaluable: true };
}

/** Files whose goods have arrived but that have not been filed with the DGA. */
export function llegadosNoPresentados(
  expedientes: Expediente[],
  now = Date.now(),
): Expediente[] {
  return expedientes.filter((e) => {
    if (ADVANCED_STATUSES.has(e.status)) return false;
    const llegada = fechaLlegada(e);
    const ms = llegada ? new Date(llegada).getTime() : NaN;
    return !isNaN(ms) && ms <= now;
  });
}

/** Files whose goods have not arrived yet. */
export function porLlegar(expedientes: Expediente[], now = Date.now()): Expediente[] {
  return expedientes.filter((e) => {
    if (e.status === ExpedienteStatus.Completo) return false;
    const llegada = fechaLlegada(e);
    const ms = llegada ? new Date(llegada).getTime() : NaN;
    return !isNaN(ms) && ms > now;
  });
}
