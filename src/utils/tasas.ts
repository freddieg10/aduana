import type { TasasRenglon } from '../types';
import { ITBIS_GENERAL, type Arancel, type LineaArancel } from '../data/arancel';
import { ISC_AD_VALOREM, ISC_ALCOHOL, ISC_SIN_SUCESOR, ISC_SUCESORES, ISC_TABACO } from '../data/isc';
import { normalizarHs } from './preliquidacion';

/** The ISC specific amounts, which DGII re-indexes and the admin keeps in Settings. */
export interface MontosIsc {
  /** RD$ per litre of absolute alcohol. */
  alcoholPorLitro: number;
  /** RD$ per pack of 10 cigarettes. */
  cajetilla10: number;
  /** RD$ per pack of 20 cigarettes. */
  cajetilla20: number;
}

/** Which rule produced the ISC, so the screen can say why a line pays it. */
export type ReglaIsc = 'tabla' | 'alcohol' | 'tabaco' | null;

/**
 * Things the digitador must check by hand:
 * - tabacoSinMonto: a tobacco product (cigars) with no tabulated specific amount;
 * - iscSinSucesor: the ISC annex taxes a product of this subheading under a code the
 *   arancel has since replaced, and the successor is ambiguous.
 */
export type NotaTasa = 'tabacoSinMonto' | 'iscSinSucesor';

export interface TasasSugeridas {
  tasas: TasasRenglon;
  arancel: LineaArancel;
  reglaIsc: ReglaIsc;
  notas: NotaTasa[];
}

const ISC_POR_SUBPARTIDA = new Map<string, number>();
const ISC_POR_PARTIDA = new Map<string, number>();
for (const [codigo, tasa] of ISC_AD_VALOREM) {
  if (codigo.length === 4) ISC_POR_PARTIDA.set(codigo, tasa);
  else for (const c of ISC_SUCESORES[codigo] ?? [codigo]) ISC_POR_SUBPARTIDA.set(c, tasa);
}

/** Ad-valorem ISC from the art. 375 table: the subpartida entry wins over its partida. */
export function iscDeTabla(codigo: string): number | null {
  const c = normalizarHs(codigo);
  return ISC_POR_SUBPARTIDA.get(c) ?? ISC_POR_PARTIDA.get(c.slice(0, 4)) ?? null;
}

/**
 * The rates the arancel and the ISC law give an HS code, or null when the code is not an
 * arancel subpartida (a typo, a heading, or a code from an older nomenclature).
 */
export function sugerirTasas(codigoPartida: string, arancel: Arancel, montos: MontosIsc): TasasSugeridas | null {
  const codigo = normalizarHs(codigoPartida);
  const linea = arancel.get(codigo);
  if (!linea) return null;

  const tasas: TasasRenglon = {
    gravamen: linea.gravamen,
    itbis: linea.itbisExento ? 0 : ITBIS_GENERAL,
    isc: 0,
    iscEspecificoTipo: 'ninguno',
    iscEspecificoMonto: 0,
  };
  const notas: NotaTasa[] = [];
  let reglaIsc: ReglaIsc = null;
  const partida = codigo.slice(0, 4);

  if ((ISC_ALCOHOL.partidas as readonly string[]).includes(partida)) {
    reglaIsc = 'alcohol';
    tasas.isc = ISC_ALCOHOL.adValoremVentaMenor;
    tasas.iscEspecificoTipo = 'alcohol';
    tasas.iscEspecificoMonto = montos.alcoholPorLitro;
  } else if (partida === ISC_TABACO.partida) {
    reglaIsc = 'tabaco';
    tasas.isc = ISC_TABACO.adValoremVentaMenor;
    tasas.iscEspecificoTipo = 'unidad';
    if ((ISC_TABACO.cajetilla20 as readonly string[]).includes(codigo)) tasas.iscEspecificoMonto = montos.cajetilla20;
    else if ((ISC_TABACO.cajetilla10 as readonly string[]).includes(codigo)) tasas.iscEspecificoMonto = montos.cajetilla10;
    else notas.push('tabacoSinMonto');
  } else {
    const isc = iscDeTabla(codigo);
    if (isc !== null) {
      reglaIsc = 'tabla';
      tasas.isc = isc;
    }
    if (ISC_SIN_SUCESOR.some((x) => codigo.startsWith(x.subpartida))) notas.push('iscSinSucesor');
  }

  return { tasas, arancel: linea, reglaIsc, notas };
}
