import type { Contenedor, Partida, TasasRenglon, Valores } from '../types';
import { TASA_DUA_IMPORTACION, tasaPorContenedor } from '../data/tasasServicio';

/**
 * Preliquidación — the duties and taxes a declaration will owe.
 *
 * The chain is fixed by law and each step feeds the next (Ley 146-00 for the gravamen,
 * Ley 11-92 títulos III y IV for ITBIS and ISC):
 *
 *   CIF RD$  = (FOB + seguro + flete + otros) × tasa de cambio
 *   Gravamen = CIF RD$ × % arancel
 *   ISC      = (CIF RD$ + Gravamen) × % ISC
 *   ITBIS    = (CIF RD$ + Gravamen + ISC) × % ITBIS
 *
 * Alcohol and tobacco are the exception: their ISC is an ad-valorem slice of the **retail**
 * price plus a specific amount per litre-degree or per pack, and only then does ITBIS apply
 * on top. See `TasasRenglon.iscEspecificoTipo`.
 *
 * Rates are supplied by the caller rather than looked up here, so this module stays pure and
 * testable and the tariff table can be loaded however the app likes.
 */

export type { TasasRenglon };

export const SIN_IMPUESTOS: TasasRenglon = {
  gravamen: 0, itbis: 18, isc: 0, iscEspecificoTipo: 'ninguno', iscEspecificoMonto: 0,
};

/** What a line with no known rates is computed with: nothing, so it cannot pass for a real figure. */
const SIN_TASAS: TasasRenglon = { ...SIN_IMPUESTOS, itbis: 0 };

/** HS codes appear as "4818.30.00" or "48183000" depending on the source. */
export const normalizarHs = (codigo: string) => (codigo ?? '').replace(/\D/g, '');

export interface LineaPreliquidacion {
  partidaId: string;
  codigoPartida: string;
  descripcion: string;
  cantidad: number;
  /** Values in USD, with seguro/flete/otros prorated by FOB share. */
  fobUsd: number;
  seguroUsd: number;
  fleteUsd: number;
  otrosUsd: number;
  cifUsd: number;
  /** Everything below is RD$. */
  cifRd: number;
  gravamen: number;
  iscAdValorem: number;
  iscEspecifico: number;
  isc: number;
  itbis: number;
  /** gravamen + isc + itbis */
  total: number;
  tasas: TasasRenglon;
  /** The resolver had no rates for this line, so it adds nothing to the totals. */
  sinTasas: boolean;
}

export interface TotalesPreliquidacion {
  cifRd: number;
  gravamen: number;
  isc: number;
  itbis: number;
  /** Impuestos only: gravamen + isc + itbis. */
  impuestos: number;
  /** Tasas por servicio aduanero (DUA + contenedores), in RD$. */
  tasaServicio: number;
  /** impuestos + tasaServicio — what the importer pays. */
  total: number;
}

export interface Preliquidacion {
  lineas: LineaPreliquidacion[];
  totales: TotalesPreliquidacion;
  /** Things the digitador should look at before trusting the numbers. */
  advertencias: string[];
}

export interface EntradaPreliquidacion {
  partidas: Partida[];
  valores: Valores;
  contenedores?: Contenedor[];
  /**
   * Rates per line. A line the resolver has no rates for is computed with no taxes at all,
   * flagged `sinTasas` and reported, so the totals are visibly incomplete rather than wrong.
   */
  resolverTasas: (p: Partida) => TasasRenglon | undefined;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * Seguro, flete and otros are declared for the whole shipment but taxed per line, so they are
 * prorated by each line's share of FOB — the standard apportionment. With no FOB at all the
 * split falls back to an equal share, so the totals still add up.
 */
function prorratear(partidas: Partida[], monto: number): number[] {
  const fobTotal = partidas.reduce((s, p) => s + p.valorFob, 0);
  if (partidas.length === 0) return [];
  if (fobTotal <= 0) return partidas.map(() => monto / partidas.length);
  return partidas.map((p) => (monto * p.valorFob) / fobTotal);
}

export function preliquidar({ partidas, valores, contenedores = [], resolverTasas }: EntradaPreliquidacion): Preliquidacion {
  const advertencias: string[] = [];
  const tasaCambio = valores.tasaCambio > 0 ? valores.tasaCambio : 0;
  if (tasaCambio <= 0) advertencias.push('tasaCambio');

  const seguro = prorratear(partidas, valores.seguro);
  const flete = prorratear(partidas, valores.flete);
  const otros = prorratear(partidas, valores.otros);

  const lineas: LineaPreliquidacion[] = partidas.map((p, i) => {
    const resueltas = resolverTasas(p);
    const tasas = resueltas ?? SIN_TASAS;
    if (!resueltas) advertencias.push(`sinTasas:${p.codigoPartida}`);

    const fobUsd = p.valorFob;
    const cifUsd = fobUsd + seguro[i] + flete[i] + otros[i];
    const cifRd = cifUsd * tasaCambio;
    const gravamen = cifRd * (tasas.gravamen / 100);

    let iscAdValorem = 0;
    let iscEspecifico = 0;
    if (tasas.iscEspecificoTipo === 'ninguno') {
      iscAdValorem = (cifRd + gravamen) * (tasas.isc / 100);
    } else {
      // Base imponible is the retail price, not the CIF (Ley 11-92, párrafos V y VIII).
      iscAdValorem = p.precioVentaMenor * p.cantidad * (tasas.isc / 100);
      iscEspecifico = tasas.iscEspecificoTipo === 'alcohol'
        ? tasas.iscEspecificoMonto * (p.gradoAlcohol / 100) * p.cantidad
        : tasas.iscEspecificoMonto * p.cantidad;

      if (p.precioVentaMenor <= 0) advertencias.push(`precioVentaMenor:${p.codigoPartida}`);
      if (tasas.iscEspecificoTipo === 'alcohol' && p.gradoAlcohol <= 0) advertencias.push(`gradoAlcohol:${p.codigoPartida}`);
    }
    const isc = iscAdValorem + iscEspecifico;
    const itbis = (cifRd + gravamen + isc) * (tasas.itbis / 100);

    return {
      partidaId: p.id,
      codigoPartida: p.codigoPartida,
      descripcion: p.descripcion,
      cantidad: p.cantidad,
      fobUsd: redondear(fobUsd),
      seguroUsd: redondear(seguro[i]),
      fleteUsd: redondear(flete[i]),
      otrosUsd: redondear(otros[i]),
      cifUsd: redondear(cifUsd),
      cifRd: redondear(cifRd),
      gravamen: redondear(gravamen),
      iscAdValorem: redondear(iscAdValorem),
      iscEspecifico: redondear(iscEspecifico),
      isc: redondear(isc),
      itbis: redondear(itbis),
      total: redondear(gravamen + isc + itbis),
      tasas,
      sinTasas: !resueltas,
    };
  });

  const suma = (f: (l: LineaPreliquidacion) => number) => redondear(lineas.reduce((s, l) => s + f(l), 0));
  const impuestos = suma((l) => l.gravamen + l.isc + l.itbis);
  const tasaServicio = redondear(calcularTasaServicio(contenedores, tasaCambio));

  return {
    lineas,
    totales: {
      cifRd: suma((l) => l.cifRd),
      gravamen: suma((l) => l.gravamen),
      isc: suma((l) => l.isc),
      itbis: suma((l) => l.itbis),
      impuestos,
      tasaServicio,
      total: redondear(impuestos + tasaServicio),
    },
    advertencias,
  };
}

/** DUA fee plus the per-container despacho fee, converted to RD$. */
export function calcularTasaServicio(contenedores: Contenedor[], tasaCambio: number): number {
  let total = TASA_DUA_IMPORTACION.monto; // already RD$
  for (const c of contenedores) {
    const tasa = tasaPorContenedor(c.tipo);
    total += tasa.moneda === 'USD' ? tasa.monto * tasaCambio : tasa.monto;
  }
  return total;
}
