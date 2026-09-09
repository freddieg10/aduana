import type { Expediente } from '../types';
import { entidadKey } from './documento';
import { evaluarArt52 } from './art52';

/* ------------------------------------------------------------------ */
/* Shared filtering                                                     */
/* ------------------------------------------------------------------ */

export interface RangoFechas {
  desde?: string;   // YYYY-MM-DD
  hasta?: string;   // YYYY-MM-DD
}

/** Filters on createdAt, which is when the brokerage took the file on. */
export function enRango(expedientes: Expediente[], { desde, hasta }: RangoFechas): Expediente[] {
  return expedientes.filter((e) => {
    if (desde && e.createdAt < desde) return false;
    if (hasta && e.createdAt > `${hasta}T23:59:59.999Z`) return false;
    return true;
  });
}

const mesDe = (iso: string) => iso.slice(0, 7);
const round1 = (n: number) => Math.round(n * 10) / 10;

/* ------------------------------------------------------------------ */
/* Reporte de clientes                                                  */
/* ------------------------------------------------------------------ */

export interface FilaCliente {
  id: string;             // clienteKey
  cliente: string;
  documento: string;
  expedientes: number;
  contenedores: number;
  /** Distinct months with at least one expediente, and the monthly average. */
  meses: number;
  expedientesPorMes: number;
  contenedoresPorMes: number;
  totalCif: number;
  promedioRenglones: number;
  promedioContenedores: number;
  ultimos5: { id: string; reference: string; status: string; createdAt: string }[];
}

export function reporteClientes(expedientes: Expediente[], rango: RangoFechas = {}): FilaCliente[] {
  const grupos = new Map<string, Expediente[]>();
  for (const e of enRango(expedientes, rango)) {
    const key = entidadKey(e.importador);
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(e);
  }

  return [...grupos.entries()].map(([key, list]) => {
    const contenedores = list.reduce((s, e) => s + e.contenedores.length, 0);
    const renglones = list.reduce((s, e) => s + e.partidas.length, 0);
    const meses = new Set(list.map((e) => mesDe(e.createdAt))).size || 1;
    return {
      id: key,
      cliente: list[0].importador.nombre,
      documento: list[0].importador.codigo,
      expedientes: list.length,
      contenedores,
      meses,
      expedientesPorMes: round1(list.length / meses),
      contenedoresPorMes: round1(contenedores / meses),
      totalCif: list.reduce((s, e) => s + e.valores.valorCifTotal, 0),
      promedioRenglones: round1(renglones / list.length),
      promedioContenedores: round1(contenedores / list.length),
      ultimos5: [...list]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
        .map((e) => ({ id: e.id, reference: e.reference, status: e.status, createdAt: e.createdAt })),
    };
  }).sort((a, b) => b.expedientes - a.expedientes);
}

/* ------------------------------------------------------------------ */
/* Reportes de digitador y gestor                                       */
/* ------------------------------------------------------------------ */

export interface FilaStaff {
  id: string;
  nombre: string;
  expedientes: number;
  renglones: number;
  contenedores: number;
  art52: number;
}

function reporteStaff(
  expedientes: Expediente[],
  campo: 'digitador' | 'gestor',
  diasArt52: number,
  rango: RangoFechas,
  now: number,
): FilaStaff[] {
  const grupos = new Map<string, Expediente[]>();
  for (const e of enRango(expedientes, rango)) {
    const nombre = e[campo] || '—';
    if (!grupos.has(nombre)) grupos.set(nombre, []);
    grupos.get(nombre)!.push(e);
  }
  return [...grupos.entries()].map(([nombre, list]) => ({
    id: nombre,
    nombre,
    expedientes: list.length,
    renglones: list.reduce((s, e) => s + e.partidas.length, 0),
    contenedores: list.reduce((s, e) => s + e.contenedores.length, 0),
    art52: list.filter((e) => evaluarArt52(e, diasArt52, now).aplica).length,
  })).sort((a, b) => b.expedientes - a.expedientes);
}

export const reporteDigitadores = (expedientes: Expediente[], diasArt52: number, rango: RangoFechas = {}, now = Date.now()) =>
  reporteStaff(expedientes, 'digitador', diasArt52, rango, now);

export const reporteGestores = (expedientes: Expediente[], diasArt52: number, rango: RangoFechas = {}, now = Date.now()) =>
  reporteStaff(expedientes, 'gestor', diasArt52, rango, now);

/* ------------------------------------------------------------------ */
/* Historial de productos                                               */
/* ------------------------------------------------------------------ */

export interface FilaHistorial {
  id: string;
  arancel: string;        // ARC
  codigoProducto: string; // COD PROD
  referencia: string;     // REF
  descripcion: string;
  unidad: string;
  pais: string;
  suplidor: string;
  expedientes: { id: string; reference: string; status: string }[];
  veces: number;
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();

/**
 * Every renglón the brokerage has keyed in, de-duplicated per Freddie's rule: re-entering
 * the same product on another expediente does not create a second row, it only adds that
 * expediente to the existing one. A new row appears only when the partida or the código de
 * producto changes.
 *
 * When a line has no código de producto (older records), the normalised description stands in
 * for it — otherwise every unrelated product sharing a tariff heading would collapse together.
 *
 * The list is built from what is currently keyed in, so it also carries each expediente's
 * status, as the notes asked.
 */
export function historialProductos(expedientes: Expediente[], clienteKey?: string): FilaHistorial[] {
  const filas = new Map<string, FilaHistorial>();

  for (const e of expedientes) {
    if (clienteKey && entidadKey(e.importador) !== clienteKey) continue;
    const suplidor = e.suplidores[0]?.nombre ?? '';

    for (const p of e.partidas) {
      const referencia = p.codigoProducto || p.descripcion;
      const key = [
        normalizar(p.codigoPartida),
        p.codigoProducto ? normalizar(p.codigoProducto) : normalizar(p.descripcion),
      ].join('|');

      const fila = filas.get(key) ?? {
        id: key,
        arancel: p.codigoPartida,
        codigoProducto: p.codigoProducto,
        referencia,
        descripcion: p.descripcion,
        unidad: p.unidad,
        pais: p.paisOrigen,
        suplidor,
        expedientes: [],
        veces: 0,
      };

      fila.veces += 1;
      if (!fila.expedientes.some((x) => x.id === e.id)) {
        fila.expedientes.push({ id: e.id, reference: e.reference, status: e.status });
      }
      filas.set(key, fila);
    }
  }

  return [...filas.values()].sort((a, b) => a.arancel.localeCompare(b.arancel) || a.descripcion.localeCompare(b.descripcion));
}

/** The report's delivery format: ARC > COD PROD > REF > DESCRIPCIÓN > UNIDAD > PAÍS > SUPLIDOR > EXPEDIENTES. */
export function historialToCsv(filas: FilaHistorial[]): string {
  const head = 'ARC,COD PROD,REF,DESCRIPCION,UNIDAD,PAIS,SUPLIDOR,EXPEDIENTES';
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = filas.map((f) => [
    f.arancel, f.codigoProducto, f.referencia, f.descripcion, f.unidad, f.pais, f.suplidor,
    f.expedientes.map((x) => x.reference).join(' | '),
  ].map(esc).join(','));
  return [head, ...rows].join('\n');
}
