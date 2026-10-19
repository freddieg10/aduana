import type { Expediente, Partida } from '../types';
import { exigeArticuloRegistrado } from '../data/subpartidasNoTemporales';

/**
 * Local stand-in for the SIRE/VUCE check.
 *
 * The real Ventanilla Única de Comercio Exterior validates each partida against the permits
 * its HS heading requires. There is no public API, so this flags the headings that are known
 * to need a permit and names the issuing body; a digitador still confirms in VUCE itself.
 * Replace `REGLAS_VUCE` with the real SIRE response when an integration exists.
 */
export interface ReglaVuce {
  /** Two-digit HS chapters the rule covers. */
  capitulos: string[];
  entidad: string;
  permiso: string;
}

export const REGLAS_VUCE: ReglaVuce[] = [
  { capitulos: ['01', '02', '03', '04', '05'], entidad: 'Ministerio de Agricultura (DIGEGA)', permiso: 'Permiso zoosanitario' },
  { capitulos: ['06', '07', '08', '09', '10', '11', '12', '13', '14'], entidad: 'Ministerio de Agricultura', permiso: 'Permiso fitosanitario' },
  { capitulos: ['15', '16', '17', '18', '19', '20', '21'], entidad: 'Ministerio de Salud Pública (DIGEMAPS)', permiso: 'Registro sanitario de alimentos' },
  { capitulos: ['22'], entidad: 'Ministerio de Salud Pública (DIGEMAPS)', permiso: 'Registro sanitario de bebidas alcohólicas' },
  { capitulos: ['23'], entidad: 'Ministerio de Agricultura', permiso: 'Permiso de alimentos para animales' },
  { capitulos: ['24'], entidad: 'DGII / Salud Pública', permiso: 'Autorización de tabaco' },
  { capitulos: ['28', '29', '31', '38'], entidad: 'Ministerio de Medio Ambiente', permiso: 'Autorización de sustancias químicas' },
  { capitulos: ['30'], entidad: 'Ministerio de Salud Pública (DIGEMAPS)', permiso: 'Registro sanitario farmacéutico' },
  { capitulos: ['36'], entidad: 'Ministerio de Defensa', permiso: 'Autorización de explosivos' },
  { capitulos: ['87'], entidad: 'DGII', permiso: 'Declaración de vehículo (chasis y año)' },
  { capitulos: ['93'], entidad: 'Ministerio de Interior y Policía', permiso: 'Licencia de armas' },
];

/** First two digits of an HS code, ignoring any formatting. */
export const capituloDe = (codigoPartida: string): string =>
  (codigoPartida ?? '').replace(/\D/g, '').slice(0, 2);

export interface HallazgoVuce {
  partida: Partida;
  entidad: string;
  permiso: string;
  /** True when the line already records a certificate/permit number. */
  documentado: boolean;
}

/** Every tariff line that needs a VUCE permit, with the body that issues it. */
export function validarVuce(partidas: Partida[]): HallazgoVuce[] {
  const out: HallazgoVuce[] = [];
  for (const p of partidas) {
    const cap = capituloDe(p.codigoPartida);
    if (!cap) continue;
    const regla = REGLAS_VUCE.find((r) => r.capitulos.includes(cap));
    if (!regla) continue;
    out.push({
      partida: p,
      entidad: regla.entidad,
      permiso: regla.permiso,
      documentado: Boolean(p.certificadoOrigenNo.trim() || p.especificacion.trim()),
    });
  }
  return out;
}

/** Why a line failed the "productos no temporales" check. */
export type MotivoNoTemporal =
  /** The line is flagged temporary but its subpartida does not admit temporary products. */
  | 'temporal'
  /** The subpartida requires a registered article and the line has no ProductCode. */
  | 'sinArticulo';

export interface HallazgoNoTemporal {
  partida: Partida;
  motivo: MotivoNoTemporal;
}

/**
 * "Validación productos no temporal".
 *
 * The DGA publishes the subpartidas that may not be declared with a temporary product record
 * (`src/data/subpartidasNoTemporales.ts`); on those, SIGA demands the número de artículo de
 * producto — the registered `ProductCode`. Everything outside the list may still be declared
 * temporarily, whatever the régimen, so the régimen plays no part in this rule.
 */
export function validarNoTemporal(
  e: Pick<Expediente, 'partidas'>,
): HallazgoNoTemporal[] {
  const out: HallazgoNoTemporal[] = [];
  for (const p of e.partidas) {
    if (!exigeArticuloRegistrado(p.codigoPartida)) continue;
    if (p.temporal) out.push({ partida: p, motivo: 'temporal' });
    else if (!p.codigoProducto.trim()) out.push({ partida: p, motivo: 'sinArticulo' });
  }
  return out;
}
