import type { Partida } from '../types';
import { ESTADO_PRODUCTO_DEFAULT } from '../data/catalogos';

/** Unit price is always derived; the grid shows it read-only. */
export const calcUnitario = (valorFob: number, cantidad: number) =>
  cantidad > 0 ? valorFob / cantidad : 0;

/** Re-derives the fields that are computed from others. */
export const withDerived = (p: Partida): Partida => ({ ...p, unitario: calcUnitario(p.valorFob, p.cantidad) });

export const emptyVehiculo = () => ({ tipo: '', chasis: '', color: '', motor: '', cc: 0 });

export const emptyPartida = (): Partida => ({
  id: crypto.randomUUID(),
  codigoPartida: '',
  codigoProducto: '',
  descripcion: '',
  organico: false,
  cantidad: 0,
  unidad: 'KILOGRAMOS',
  paisOrigen: '',
  valorFob: 0,
  unitario: 0,
  facturaDva: '',
  marca: '',
  modelo: '',
  estadoProducto: ESTADO_PRODUCTO_DEFAULT,
  anio: '',
  pesoKg: 0,
  especificacion: '',
  temporal: false,
  certificadoOrigen: false,
  certificadoOrigenNo: '',
  gradoAlcohol: 0,
  precioVentaMenor: 0,
  serial: '',
  descripcionAdicional: '',
  vehiculo: emptyVehiculo(),
});

/** Fills the SIGA detail fields on a tariff line stored before they existed. */
export function migratePartida(raw: Record<string, unknown>): Partida {
  const p = raw as unknown as Partial<Partida>;
  const base = emptyPartida();
  return withDerived({
    ...base,
    ...p,
    id: p.id ?? base.id,
    estadoProducto: p.estadoProducto || ESTADO_PRODUCTO_DEFAULT,
    vehiculo: { ...base.vehiculo, ...(p.vehiculo ?? {}) },
  } as Partida);
}

/** True when the line carries anything worth opening the detail dialog for. */
export function tieneDetalle(p: Partida): boolean {
  return Boolean(
    p.marca || p.modelo || p.anio || p.especificacion || p.serial || p.descripcionAdicional ||
    p.temporal || p.certificadoOrigen || p.gradoAlcohol || p.precioVentaMenor || p.pesoKg ||
    p.vehiculo.chasis || p.vehiculo.tipo || p.vehiculo.motor || p.vehiculo.color || p.vehiculo.cc,
  );
}
