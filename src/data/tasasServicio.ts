/**
 * Tasas por servicio aduanero — Norma General 01-2023 de la DGA.
 *
 * These replace the older Ley 226-06 / Decreto 627-06 figures (US$40 / 75 / 100 per
 * container) that still circulate in training material. Amounts are charged per declaration
 * and per container / shipping document, on top of the taxes.
 */
export interface TasaServicio {
  concepto: string;
  monto: number;
  moneda: 'DOP' | 'USD';
  /** How the amount is applied. */
  base: 'declaracion' | 'contenedor' | 'kilo' | 'tonelada' | 'unidad';
}

export const TASA_DUA_IMPORTACION: TasaServicio = { concepto: 'DUA de importación', monto: 258.26, moneda: 'DOP', base: 'declaracion' };
export const TASA_DUA_EXPORTACION: TasaServicio = { concepto: 'DUA de exportación', monto: 300.0, moneda: 'DOP', base: 'declaracion' };

export const TASA_CONTENEDOR_20: TasaServicio = { concepto: 'Despacho contenedor 20 pies', monto: 110.31, moneda: 'USD', base: 'contenedor' };
export const TASA_CONTENEDOR_40: TasaServicio = { concepto: 'Despacho contenedor 40 / 45 pies', monto: 147.07, moneda: 'USD', base: 'contenedor' };
export const TASA_VEHICULO: TasaServicio = { concepto: 'Despacho de vehículos', monto: 147.07, moneda: 'USD', base: 'unidad' };
export const TASA_CARGA_CONSOLIDADA: TasaServicio = { concepto: 'Despacho carga consolidada por kilo', monto: 0.37, moneda: 'USD', base: 'kilo' };
export const TASA_GRANEL: TasaServicio = { concepto: 'Despacho mercancías sueltas o a granel por TM', monto: 0.74, moneda: 'USD', base: 'tonelada' };

/**
 * Container despacho fee by container type. SIGA stores the type as free text ("20", "40",
 * "40RF"…), so the size is read from the digits.
 */
export function tasaPorContenedor(tipo: string): TasaServicio {
  const pies = Number((tipo ?? '').replace(/\D/g, '')) || 0;
  return pies >= 40 ? TASA_CONTENEDOR_40 : TASA_CONTENEDOR_20;
}
