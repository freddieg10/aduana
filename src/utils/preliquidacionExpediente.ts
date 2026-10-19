import { ExpedienteStatus } from '../types';
import type { ExpedienteStatus as Status, Partida, PreliquidacionExpediente, TasasPartida, TasasRenglon } from '../types';
import type { Arancel } from '../data/arancel';
import { SIN_IMPUESTOS, normalizarHs } from './preliquidacion';
import { sugerirTasas, type MontosIsc } from './tasas';

/**
 * How the stored preliquidación relates to the expediente's current renglones. Rates are
 * frozen per line when the digitador presses Preliquidar; these helpers decide which frozen
 * rates still apply and what a new Preliquidar fills in.
 */

/** The stored rates of a line, if they were taken for the line's current HS code. */
export function tasasVigentes(p: Partida, pre: PreliquidacionExpediente | null): TasasPartida | null {
  const g = pre?.tasas[p.id];
  if (!g || normalizarHs(g.codigoPartida) !== normalizarHs(p.codigoPartida)) return null;
  return g;
}

export type EstadoRenglon =
  /** Rates stored for the current code, as the arancel gave them. */
  | 'arancel'
  /** Rates stored for the current code, edited by hand. */
  | 'manual'
  /** Rates were stored for a different code: the code changed after preliquidating. */
  | 'codigoCambio'
  /** No rates stored yet (a line added after preliquidating, or never preliquidated). */
  | 'pendiente';

export function estadoRenglon(p: Partida, pre: PreliquidacionExpediente | null): EstadoRenglon {
  const vigentes = tasasVigentes(p, pre);
  if (vigentes) return vigentes.manual ? 'manual' : 'arancel';
  return pre?.tasas[p.id] ? 'codigoCambio' : 'pendiente';
}

/** Statuses a file can be in before its taxes are known; Preliquidar moves them forward. */
const ANTES_DE_PRELIQUIDAR: Status[] = [
  ExpedienteStatus.Registrado, ExpedienteStatus.Manifestado, ExpedienteStatus.PendienteInfo,
];

export interface ResultadoPreliquidar {
  preliquidacion: PreliquidacionExpediente;
  status: Status;
  /** Lines whose code is not an arancel subpartida; they keep no rates until entered by hand. */
  noEnArancel: Partida[];
}

/**
 * "Preliquidar": fills the rates of every line that has none for its current code, keeping the
 * ones already frozen (manual edits included). `restablecer` re-reads every line from the
 * arancel instead. Lines that were removed lose their stored rates. The status moves to
 * pre-liquidado only when every line ended up with rates.
 */
export function aplicarPreliquidacion(
  e: { partidas: Partida[]; preliquidacion: PreliquidacionExpediente | null; status: Status },
  arancel: Arancel,
  montos: MontosIsc,
  ahora: Date,
  { restablecer = false } = {},
): ResultadoPreliquidar {
  const tasas: Record<string, TasasPartida> = {};
  const noEnArancel: Partida[] = [];
  for (const p of e.partidas) {
    const vigentes = restablecer ? null : tasasVigentes(p, e.preliquidacion);
    if (vigentes) { tasas[p.id] = vigentes; continue; }
    const s = sugerirTasas(p.codigoPartida, arancel, montos);
    if (s) tasas[p.id] = { codigoPartida: p.codigoPartida, tasas: s.tasas, manual: false };
    else noEnArancel.push(p);
  }
  const completa = noEnArancel.length === 0 && e.partidas.length > 0;
  return {
    preliquidacion: { fecha: ahora.toISOString(), tasas },
    status: completa && ANTES_DE_PRELIQUIDAR.includes(e.status) ? ExpedienteStatus.PreLiquidado : e.status,
    noEnArancel,
  };
}

/**
 * A hand edit of one rate. A line with no rates yet starts from no gravamen and the standard
 * ITBIS, which is what a digitador typing in a code the arancel lacks would expect.
 */
export function editarTasa(
  pre: PreliquidacionExpediente | null,
  p: Partida,
  cambio: Partial<TasasRenglon>,
  ahora: Date,
): PreliquidacionExpediente {
  const base = tasasVigentes(p, pre)?.tasas ?? SIN_IMPUESTOS;
  return {
    fecha: pre?.fecha ?? ahora.toISOString(),
    tasas: { ...(pre?.tasas ?? {}), [p.id]: { codigoPartida: p.codigoPartida, tasas: { ...base, ...cambio }, manual: true } },
  };
}
