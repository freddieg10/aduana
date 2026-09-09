import type { Expediente } from '../types';
import { escapeXml } from './xml';
import { fmtDate } from './date';
import { findCountryByCode } from '../data/countries';
import { findAcuerdo, findEstadoProducto } from '../data/catalogos';
import { AGENTE_ADUANAL_DEFAULT } from '../data/catalogos';

const esc = (v: unknown) => escapeXml(v);
const money = (n: number) => n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fila = (label: string, value: unknown) =>
  `<tr><th>${esc(label)}</th><td>${esc(value ?? '') || '—'}</td></tr>`;

/**
 * The hoja de registro: a printable summary of the expediente that the brokerage files with
 * the declaration. Built as a standalone HTML document so it can be printed or saved without
 * dragging the app's styles along.
 */
export function buildHojaRegistroHtml(e: Expediente, now = new Date()): string {
  const d = e.declaracion;
  const ia = e.informacionAdicional;
  const pais = (codigo: string) => findCountryByCode(codigo)?.nombre ?? codigo;
  const acuerdo = findAcuerdo(e.regimenAduanero.acuerdo);

  const renglones = e.partidas.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(p.codigoPartida)}</td>
      <td>${esc(p.codigoProducto)}</td>
      <td>${esc(p.descripcion)}</td>
      <td class="num">${esc(p.cantidad)}</td>
      <td>${esc(p.unidad)}</td>
      <td>${esc(p.paisOrigen)}</td>
      <td>${esc(findEstadoProducto(p.estadoProducto)?.nombre ?? p.estadoProducto)}</td>
      <td class="num">${money(p.valorFob)}</td>
      <td class="num">${p.unitario.toFixed(4)}</td>
    </tr>`).join('');

  const contenedores = e.contenedores.length
    ? `<table class="grid">
         <thead><tr><th>Tipo</th><th>No. Contenedor</th><th>Sello 1</th><th>Sello 2</th></tr></thead>
         <tbody>${e.contenedores.map((c) => `<tr><td>${esc(c.tipo)}</td><td>${esc(c.numero)}</td><td>${esc(c.sello1)}</td><td>${esc(c.sello2)}</td></tr>`).join('')}</tbody>
       </table>`
    : '<p class="muted">Sin contenedores registrados.</p>';

  const suplidores = e.suplidores.length
    ? `<table class="grid">
         <thead><tr><th>Documento</th><th>Nombre</th><th>Nacionalidad</th></tr></thead>
         <tbody>${e.suplidores.map((s) => `<tr><td>${esc(s.tipoDocumento ?? 'TID')} ${esc(s.codigo)}</td><td>${esc(s.nombre)}</td><td>${esc(s.nacionalidad)}</td></tr>`).join('')}</tbody>
       </table>`
    : '<p class="muted">Sin suplidores registrados.</p>';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Hoja de Registro — ${esc(d.noDeclaracion || e.reference)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 12px/1.45 "Segoe UI", Arial, sans-serif; color: #111; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; margin: 18px 0 6px; border-bottom: 1px solid #999; padding-bottom: 3px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; }
  .muted { color: #666; }
  table { width: 100%; border-collapse: collapse; }
  table.kv th { text-align: left; width: 190px; font-weight: 600; color: #333; padding: 3px 8px 3px 0; vertical-align: top; }
  table.kv td { padding: 3px 0; }
  .cols { display: flex; gap: 28px; }
  .cols > div { flex: 1; }
  table.grid { margin-top: 4px; }
  table.grid th, table.grid td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; }
  table.grid th { background: #eee; font-size: 11px; text-transform: uppercase; }
  td.num, th.num { text-align: right; }
  .totales td { padding: 3px 0; }
  .firma { margin-top: 42px; display: flex; gap: 60px; }
  .firma div { flex: 1; border-top: 1px solid #111; padding-top: 4px; text-align: center; }
  footer { margin-top: 24px; font-size: 10px; color: #777; }
  @media print { body { margin: 12mm; } h2 { page-break-after: avoid; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      <h1>Hoja de Registro</h1>
      <div class="muted">${esc(e.tipoExpediente === 'importacion' ? 'Importación' : 'Exportación')} · ${esc(e.reference)}</div>
    </div>
    <div style="text-align:right">
      <strong>${esc(e.agenteAduanal.nombre || AGENTE_ADUANAL_DEFAULT.nombre)}</strong><br>
      <span class="muted">Agente aduanal ${esc(e.agenteAduanal.codigo)}</span><br>
      <span class="muted">Generada ${esc(fmtDate(now))}</span>
    </div>
  </div>

  <h2>Declaración</h2>
  <div class="cols">
    <div><table class="kv">
      ${fila('No. Declaración', d.noDeclaracion)}
      ${fila('ID Secuencia', d.idSecuencia)}
      ${fila('Tipo de despacho', d.tipoDespacho)}
      ${fila('Administración', `${d.administracionNombre} (${d.administracionCodigo})`)}
      ${fila('Régimen', `${e.regimenAduanero.codigo} — ${e.regimenAduanero.nombre}`)}
      ${fila('Acuerdo', acuerdo ? `${acuerdo.codigo} — ${acuerdo.nombre}` : '')}
    </table></div>
    <div><table class="kv">
      ${fila('Doc. de embarque', d.docEmbarque)}
      ${fila('Manifiesto', ia.manifiestoNo)}
      ${fila('Puerto de entrada', d.puertoEntrada)}
      ${fila('País de procedencia', `${d.paisProcedenciaNombre} (${d.paisProcedenciaCodigo})`)}
      ${fila('ETA', fmtDate(d.eta))}
      ${fila('Llegada real', fmtDate(ia.fechaLlegadaReal))}
    </table></div>
  </div>

  <h2>Partes</h2>
  <div class="cols">
    <div><table class="kv">
      ${fila('Importador', `${e.importador.tipoDocumento ?? 'RNC'} ${e.importador.codigo} — ${e.importador.nombre}`)}
      ${fila('Consignatario', `${e.consignatario.tipoDocumento ?? 'RNC'} ${e.consignatario.codigo} — ${e.consignatario.nombre}`)}
      ${e.compradorExportacion.nombre ? fila('Comprador', `${e.compradorExportacion.codigo} — ${e.compradorExportacion.nombre}`) : ''}
    </table></div>
    <div><table class="kv">
      ${fila('Transportista', ia.transportistaNombre || ia.transportistaCodigo)}
      ${fila('Nacionalidad transporte', pais(ia.transporteNacionalidad))}
      ${fila('Medio de transporte', ia.medioTransporte)}
      ${fila('No. viaje / vuelo', ia.noViaje)}
      ${fila('Cargo control', ia.cargoControlNo)}
      ${fila('Depósito destino', d.depositoDestino)}
    </table></div>
  </div>

  <h2>Suplidores</h2>
  ${suplidores}

  <h2>Contenedores</h2>
  ${contenedores}

  <h2>Renglones (${e.partidas.length})</h2>
  <table class="grid">
    <thead><tr>
      <th>#</th><th>Partida</th><th>Cód. Prod.</th><th>Descripción</th>
      <th class="num">Cantidad</th><th>Unidad</th><th>Origen</th><th>Estado</th>
      <th class="num">Valor FOB</th><th class="num">Unitario</th>
    </tr></thead>
    <tbody>${renglones || '<tr><td colspan="10" class="muted">Sin renglones.</td></tr>'}</tbody>
  </table>

  <h2>Valores</h2>
  <div class="cols">
    <div><table class="kv">
      ${fila('Tasa de cambio', money(e.valores.tasaCambio))}
      ${fila('Valor FOB total', money(e.valores.valorFobTotal))}
      ${fila('Seguro', money(e.valores.seguro))}
    </table></div>
    <div><table class="kv">
      ${fila('Flete', money(e.valores.flete))}
      ${fila('Otros', money(e.valores.otros))}
      ${fila('Valor CIF total', money(e.valores.valorCifTotal))}
    </table></div>
    <div><table class="kv">
      ${fila('Peso bruto (KG)', money(e.pesoMercancia.pesoBrutoKg))}
      ${fila('Peso neto (KG)', money(e.pesoMercancia.pesoNetoKg))}
      ${fila('Digitador / Gestor', `${e.digitador || '—'} / ${e.gestor || '—'}`)}
    </table></div>
  </div>

  ${ia.notasHojaRegistro ? `<h2>Notas</h2><p>${esc(ia.notasHojaRegistro)}</p>` : ''}

  <div class="firma">
    <div>Preparado por</div>
    <div>Revisado por</div>
    <div>Recibido por</div>
  </div>

  <footer>DECLARAMOS EN BASE A LA INFORMACIÓN PROPORCIONADA POR EL CLIENTE.</footer>
</body>
</html>`;
}
