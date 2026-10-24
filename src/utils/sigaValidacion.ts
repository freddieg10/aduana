import type { EntidadAduanal, Expediente } from '../types';
import { TIPOS_DESPACHO, UNIDADES } from '../data/catalogos';
import { normalizeDocumento, TIPO_DOCUMENTO_DEFAULT } from './documento';
import { normalizarHs } from './preliquidacion';

/**
 * What would make SIGA reject or crash on an expediente's DUA, checked before the file is
 * written. SIGA's own error for a bad party code is an unexplained "Index and length must refer
 * to a location within the string", so the point is to name the field here instead.
 */
export type ProblemaSiga =
  | { tipo: 'documento'; parte: 'importador' | 'consignatario' | 'declarante' | 'exportador'; valor: string }
  | { tipo: 'administracion' }
  | { tipo: 'tipoDespacho' }
  | { tipo: 'sinSuplidor' }
  | { tipo: 'sinRenglones' }
  | { tipo: 'partida'; renglon: number; valor: string }
  | { tipo: 'unidad'; renglon: number; valor: string }
  | { tipo: 'cantidad'; renglon: number };

/** Digits an RNC and a cédula carry; passports and foreign tax ids vary. */
const LONGITUD: Partial<Record<string, number>> = { RNC: 9, CED: 11 };

/** SIGA slices party codes by position, so the number must have the length its type implies. */
export function documentoValido(e: Pick<EntidadAduanal, 'codigo' | 'tipoDocumento'>): boolean {
  const numero = normalizeDocumento(e.codigo);
  if (!numero) return false;
  const largo = LONGITUD[e.tipoDocumento ?? TIPO_DOCUMENTO_DEFAULT];
  return largo === undefined || (numero.length === largo && /^\d+$/.test(numero));
}

export function validarSiga(e: Expediente): ProblemaSiga[] {
  const out: ProblemaSiga[] = [];
  const parte = (p: 'importador' | 'consignatario' | 'declarante' | 'exportador', ent: EntidadAduanal, tipoDefault = TIPO_DOCUMENTO_DEFAULT) => {
    if (!documentoValido({ codigo: ent.codigo, tipoDocumento: ent.tipoDocumento ?? tipoDefault })) {
      out.push({ tipo: 'documento', parte: p, valor: `${ent.tipoDocumento ?? tipoDefault} ${ent.codigo || '—'}` });
    }
  };

  if (e.tipoExpediente === 'importacion') {
    parte('importador', e.importador);
    parte('consignatario', e.consignatario);
    if (e.suplidores.length === 0) out.push({ tipo: 'sinSuplidor' });
  } else {
    parte('exportador', e.importador);
  }
  parte('declarante', e.agenteAduanal, 'RNC');

  if (!e.declaracion.administracionCodigo) out.push({ tipo: 'administracion' });
  if (!TIPOS_DESPACHO.some((t) => t.nombre === e.declaracion.tipoDespacho || t.codigo === e.declaracion.tipoDespacho)) {
    out.push({ tipo: 'tipoDespacho' });
  }

  if (e.partidas.length === 0) out.push({ tipo: 'sinRenglones' });
  e.partidas.forEach((p, i) => {
    const renglon = i + 1;
    if (normalizarHs(p.codigoPartida).length !== 8) out.push({ tipo: 'partida', renglon, valor: p.codigoPartida || '—' });
    if (!UNIDADES.some((u) => u.codigo === p.unidad)) out.push({ tipo: 'unidad', renglon, valor: p.unidad || '—' });
    if (!(p.cantidad > 0)) out.push({ tipo: 'cantidad', renglon });
  });
  return out;
}
