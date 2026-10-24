import type { EntidadAduanal, ExpedienteFormData } from '../types';
import { findRegimen, nombreUnidad } from '../data/catalogos';
import { normalizeDocumento } from './documento';
import { fmtDate } from './date';
import { redondear, type Preliquidacion } from './preliquidacion';

/**
 * Everything the preliquidación shows, laid out like SIGA's own report (header, renglones,
 * furgones, values in RD$ and US$, totals). The tab and the PDF both render this, so what is
 * printed is what was on screen.
 */
export interface LineaReporte {
  partida: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  fobUnitario: number;
  cifRd: number;
  gravamen: number;
  gravamenPct: number;
  selectivo: number;
  selectivoPct: number;
  itbis: number;
  impuestos: number;
  sinTasas: boolean;
}

export interface FurgonReporte {
  tipo: string;
  numero: string;
  sello1: string;
  sello2: string;
  placa: string;
}

export interface MontoDual {
  usd: number;
  rd: number;
}

export interface ReportePreliquidacion {
  encabezado: {
    colecturia: string;
    regimen: string;
    fechaDeclaracion: string;
    conocimientoEmbarque: string;
    importador: string;
    importadorDocumento: string;
    agente: string;
    agenteDocumento: string;
    referencia: string;
    fechaImpresion: string;
    horaImpresion: string;
  };
  lineas: LineaReporte[];
  totales: { cifRd: number; gravamen: number; selectivo: number; itbis: number; impuestos: number };
  furgones: FurgonReporte[];
  /** Containers by size, as SIGA counts them: 20', 40' and 45'. */
  cantidadPorTamano: { pies20: number; pies40: number; pies45: number };
  valores: { tasaCambio: number; fob: MontoDual; seguro: MontoDual; flete: MontoDual; otros: MontoDual; cif: MontoDual };
  resumen: { arancel: number; selectivo: number; itbis: number; impuestos: number; servicios: number; totalPagar: number };
  /** Lines without rates: the totals leave them out and say so. */
  lineasSinTasas: number;
}

/** "RNC131256767", as SIGA prints a party's document: type and number, no country. */
const documento = (e: EntidadAduanal, tipoDefault = 'RNC') => {
  const n = normalizeDocumento(e.codigo);
  return n ? `${e.tipoDocumento ?? tipoDefault}${n}` : '';
};

const pies = (tipo: string) => Number((tipo ?? '').replace(/\D/g, '')) || 0;

export function reportePreliquidacion(f: ExpedienteFormData, calculo: Preliquidacion, ahora: Date): ReportePreliquidacion {
  const tasa = f.valores.tasaCambio > 0 ? f.valores.tasaCambio : 0;
  const dual = (usd: number): MontoDual => ({ usd: redondear(usd), rd: redondear(usd * tasa) });
  const fob = f.partidas.reduce((s, p) => s + p.valorFob, 0);
  const cif = fob + f.valores.seguro + f.valores.flete + f.valores.otros;
  const contenedores = f.tipoCarga === 'contenedores' ? f.contenedores : [];
  const t = calculo.totales;

  return {
    encabezado: {
      colecturia: f.declaracion.administracionNombre,
      regimen: f.regimenAduanero.nombre || findRegimen(f.regimenAduanero.codigo)?.nombre || f.regimenAduanero.codigo,
      fechaDeclaracion: fmtDate(f.preliquidacion?.fecha ?? ahora),
      conocimientoEmbarque: f.declaracion.docEmbarque,
      importador: f.importador.nombre,
      importadorDocumento: documento(f.importador),
      agente: f.agenteAduanal.nombre,
      agenteDocumento: documento(f.agenteAduanal),
      referencia: f.declaracion.noDeclaracion || f.reference,
      fechaImpresion: fmtDate(ahora),
      horaImpresion: ahora.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
    },
    lineas: calculo.lineas.map((l, i) => {
      const p = f.partidas[i];
      return {
        partida: l.codigoPartida,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        unidad: nombreUnidad(p.unidad),
        fobUnitario: p.cantidad > 0 ? p.valorFob / p.cantidad : p.valorFob,
        cifRd: l.cifRd,
        gravamen: l.gravamen,
        gravamenPct: l.tasas.gravamen,
        selectivo: l.isc,
        selectivoPct: l.tasas.isc,
        itbis: l.itbis,
        impuestos: l.total,
        sinTasas: l.sinTasas,
      };
    }),
    totales: { cifRd: t.cifRd, gravamen: t.gravamen, selectivo: t.isc, itbis: t.itbis, impuestos: t.impuestos },
    furgones: contenedores.map((c) => ({ tipo: c.tipo, numero: c.numero, sello1: c.sello1, sello2: c.sello2, placa: '' })),
    cantidadPorTamano: {
      pies20: contenedores.filter((c) => pies(c.tipo) === 20).length,
      pies40: contenedores.filter((c) => pies(c.tipo) >= 40 && pies(c.tipo) < 45).length,
      pies45: contenedores.filter((c) => pies(c.tipo) === 45).length,
    },
    valores: {
      tasaCambio: tasa,
      fob: dual(fob),
      seguro: dual(f.valores.seguro),
      flete: dual(f.valores.flete),
      otros: dual(f.valores.otros),
      cif: dual(cif),
    },
    resumen: { arancel: t.gravamen, selectivo: t.isc, itbis: t.itbis, impuestos: t.impuestos, servicios: t.tasaServicio, totalPagar: t.total },
    lineasSinTasas: calculo.lineas.filter((l) => l.sinTasas).length,
  };
}
