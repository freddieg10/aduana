import type { Cliente, EntidadAduanal, TipoDocumento } from '../types';
import { PAIS_RD } from '../data/catalogos';

/** Documents compare ignoring dashes, spaces and case: "101-00001-1" === "101000011". */
export const normalizeDocumento = (documento: string | undefined) =>
  (documento ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();

/** Document type assumed for records written before the field existed. */
export const TIPO_DOCUMENTO_DEFAULT: TipoDocumento = 'RNC';

/**
 * The dynamic primary key of a party: document type + normalised number, e.g. "RNC:101000011".
 * The same number under two document types is two different parties, which is why the key
 * is a pair rather than the number alone.
 */
export const clienteKey = (c: Pick<Cliente, 'tipoDocumento' | 'documento'>) =>
  `${c.tipoDocumento}:${normalizeDocumento(c.documento)}`;

/** Same key, computed from a party as stored on an expediente. */
export const entidadKey = (e: Pick<EntidadAduanal, 'codigo' | 'tipoDocumento'>) =>
  `${e.tipoDocumento ?? TIPO_DOCUMENTO_DEFAULT}:${normalizeDocumento(e.codigo)}`;

/**
 * SIGA party code. ImportDUA.xsd documents ConsigneeCode / ImporterCode / DeclarantCode as
 * `[RNC|PAS][Country Code][Identity Number]` or `[CED][Identity Number]`; TID follows the
 * same shape as RNC. Returns '' when there is no document number to encode.
 */
export function sigaPartyCode(e: Pick<EntidadAduanal, 'codigo' | 'tipoDocumento' | 'paisDocumento'>): string {
  const numero = normalizeDocumento(e.codigo);
  if (!numero) return '';
  const tipo = e.tipoDocumento ?? TIPO_DOCUMENTO_DEFAULT;
  if (tipo === 'CED') return `CED${numero}`;
  return `${tipo}${e.paisDocumento || PAIS_RD}${numero}`;
}

/** The party fields an expediente stores for a registered cliente. */
export const clienteToEntidad = (c: Cliente): EntidadAduanal => ({
  codigo: c.documento,
  nombre: c.nombre,
  tipoDocumento: c.tipoDocumento,
  paisDocumento: c.pais,
});
