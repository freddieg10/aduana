import type { jsPDF } from 'jspdf';
import type { ReportePreliquidacion } from './preliquidacionReporte';

/**
 * The preliquidación as a PDF, laid out after SIGA's own report (FORMATO PRELIQUIDACION):
 * header block, one row per renglón with totals, the furgones block, then the values in RD$
 * and US$ beside the tax totals. jsPDF and its table plugin are imported on demand, so they
 * stay out of the main bundle until someone prints.
 */
type T = (clave: string, opciones?: Record<string, unknown>) => string;

const M = 28;                 // page margin, pt
const ALTO_ENCABEZADO = 104;  // tables start below the header drawn on every page

const dinero = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const unitario = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const pct = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

type ConTabla = jsPDF & { lastAutoTable: { finalY: number } };

export async function construirPdfPreliquidacion(r: ReportePreliquidacion, t: T): Promise<jsPDF> {
  const [{ jsPDF: JsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new JsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' }) as ConTabla;
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const e = r.encabezado;

  /* ---- renglones ---- */
  autoTable(doc, {
    startY: ALTO_ENCABEZADO,
    margin: { top: ALTO_ENCABEZADO, left: M, right: M, bottom: 36 },
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, valign: 'top', overflow: 'linebreak' },
    headStyles: { fontStyle: 'bold', lineWidth: { bottom: 0.8 }, lineColor: 60 },
    footStyles: { fontStyle: 'bold', lineWidth: { top: 0.8 }, lineColor: 60 },
    showFoot: 'lastPage',
    // columnStyles only reach the body: align the headers and totals of the amount columns too.
    didParseCell: (c) => {
      if (c.section !== 'body' && [2, 4, 5, 6, 8, 10, 11].includes(c.column.index)) c.cell.styles.halign = 'right';
    },
    head: [[
      t('preliq.partida'), t('preliq.descripcion'), t('preliq.cantidad'), t('preliq.unidad'), t('preliq.fobUnitario'),
      t('preliq.cifBruto'), t('preliq.gravamen'), '%', t('preliq.selectivo'), '%', t('preliq.itbis'), t('preliq.impuestosPagar'),
    ]],
    body: r.lineas.map((l) => [
      l.partida, l.descripcion, dinero(l.cantidad), l.unidad, unitario(l.fobUnitario), dinero(l.cifRd),
      l.sinTasas ? '—' : dinero(l.gravamen), l.sinTasas ? '' : pct(l.gravamenPct),
      l.sinTasas ? '—' : dinero(l.selectivo), l.sinTasas ? '' : pct(l.selectivoPct),
      l.sinTasas ? '—' : dinero(l.itbis), l.sinTasas ? t('preliq.estadoPendiente') : dinero(l.impuestos),
    ]),
    foot: [[
      { content: t('preliq.totales'), colSpan: 5, styles: { halign: 'right' } },
      dinero(r.totales.cifRd), dinero(r.totales.gravamen), '', dinero(r.totales.selectivo), '', dinero(r.totales.itbis), dinero(r.totales.impuestos),
    ]],
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 52 },
      3: { cellWidth: 62 },
      4: { halign: 'right', cellWidth: 52 },
      5: { halign: 'right', cellWidth: 70 },
      6: { halign: 'right', cellWidth: 60 },
      7: { halign: 'left', cellWidth: 20 },
      8: { halign: 'right', cellWidth: 58 },
      9: { halign: 'left', cellWidth: 20 },
      10: { halign: 'right', cellWidth: 62 },
      11: { halign: 'right', cellWidth: 70, fontStyle: 'bold' },
    },
  });

  /* ---- furgones ---- */
  let y = doc.lastAutoTable.finalY + 18;
  if (y + 70 > alto - 36) { doc.addPage(); y = ALTO_ENCABEZADO; }
  doc.setFillColor(205, 205, 205);
  doc.rect(M, y, 470, 13, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(9).text(t('preliq.furgones').toUpperCase().split('').join(' '), M + 4, y + 9.5);
  autoTable(doc, {
    startY: y + 15,
    margin: { top: ALTO_ENCABEZADO, left: M, right: ancho - M - 470 },
    tableWidth: 470,
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fontStyle: 'normal' },
    head: [[t('preliq.tipoFurgon'), t('preliq.numeroContenedor'), t('preliq.sello1'), t('preliq.sello2'), t('preliq.placa')]],
    body: r.furgones.length ? r.furgones.map((f) => [f.tipo, f.numero, f.sello1, f.sello2, f.placa]) : [[{ content: t('preliq.sinFurgones'), colSpan: 5, styles: { textColor: 120 } }]],
  });
  const finFurgones = doc.lastAutoTable.finalY;
  autoTable(doc, {
    startY: y,
    margin: { top: ALTO_ENCABEZADO, left: 540, right: M },
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
    headStyles: { fontStyle: 'bold' },
    head: [[t('preliq.qty20'), t('preliq.qty40'), t('preliq.qty45')]],
    body: [[r.cantidadPorTamano.pies20, r.cantidadPorTamano.pies40, r.cantidadPorTamano.pies45].map(String)],
  });

  /* ---- valores y resumen ---- */
  y = Math.max(finFurgones, doc.lastAutoTable.finalY) + 22;
  if (y + 130 > alto - 36) { doc.addPage(); y = ALTO_ENCABEZADO; }
  const v = r.valores;
  autoTable(doc, {
    startY: y,
    margin: { top: ALTO_ENCABEZADO, left: M, right: ancho - M - 320 },
    tableWidth: 320,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3.5 },
    headStyles: { fontStyle: 'bold', halign: 'right' },
    head: [['', 'RD$', `US$   ${t('preliq.tasa')} ${dinero(v.tasaCambio)}`]],
    body: [
      [t('preliq.valorFob'), dinero(v.fob.rd), dinero(v.fob.usd)],
      [t('preliq.seguro'), dinero(v.seguro.rd), dinero(v.seguro.usd)],
      [t('preliq.flete'), dinero(v.flete.rd), dinero(v.flete.usd)],
      [t('preliq.otros'), dinero(v.otros.rd), dinero(v.otros.usd)],
      [{ content: t('preliq.valorCif'), styles: { fontStyle: 'bold' } }, { content: dinero(v.cif.rd), styles: { fontStyle: 'bold' } }, { content: dinero(v.cif.usd), styles: { fontStyle: 'bold' } }],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90 }, 1: { halign: 'right' }, 2: { halign: 'right' } },
    didDrawCell: (c) => {
      if (c.section === 'body' && c.row.index === 4 && c.column.index > 0) doc.setLineWidth(0.6).line(c.cell.x + 8, c.cell.y, c.cell.x + c.cell.width, c.cell.y);
    },
  });
  const res = r.resumen;
  const fila = (etiqueta: string, monto: number, fuerte = false) => [
    { content: etiqueta, styles: { fontStyle: 'bold' as const } },
    { content: dinero(monto), styles: { halign: 'right' as const, fontStyle: fuerte ? 'bold' as const : 'normal' as const } },
  ];
  autoTable(doc, {
    startY: y,
    margin: { top: ALTO_ENCABEZADO, left: 400, right: M },
    tableWidth: ancho - 400 - M,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4.5, lineColor: 150, lineWidth: 0.4, textColor: 20 },
    body: [
      fila(t('preliq.totalArancel'), res.arancel),
      fila(t('preliq.totalSelectivo'), res.selectivo),
      fila(t('preliq.totalItbis'), res.itbis),
      fila(t('preliq.totalImpuestos'), res.impuestos, true),
      fila(t('preliq.totalServicios'), res.servicios),
      fila(r.lineasSinTasas ? t('preliq.totalPagarIncompleto') : t('preliq.totalPagar'), res.totalPagar, true),
    ],
  });
  if (r.lineasSinTasas) {
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(180, 0, 0)
      .text(t('preliq.avisoSinTasas', { count: r.lineasSinTasas }), M, doc.lastAutoTable.finalY + 16, { maxWidth: ancho - 2 * M });
    doc.setTextColor(0);
  }

  /* ---- header and footer on every page ---- */
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setTextColor(0);
    /* Header values stay on one line, or they would overprint the row below: shrink, then cut. */
    const campo = (x: number, yy: number, etiqueta: string, valor: string, anchoEtiqueta: number, anchoValor: number) => {
      doc.setFont('helvetica', 'bold').setFontSize(8.5).text(etiqueta, x, yy);
      let texto = valor || '—';
      let tamano = 8.5;
      doc.setFont('helvetica', 'normal').setFontSize(tamano);
      while (doc.getTextWidth(texto) > anchoValor && tamano > 6) doc.setFontSize((tamano -= 0.5));
      while (doc.getTextWidth(texto) > anchoValor && texto.length > 1) texto = `${texto.slice(0, -2)}…`;
      doc.text(texto, x + anchoEtiqueta, yy);
    };
    doc.setFont('helvetica', 'bold').setFontSize(12).text(t('preliq.titulo').toUpperCase(), M, 30);
    if (e.referencia) doc.setFont('helvetica', 'normal').setFontSize(8.5).text(e.referencia, ancho - M, 30, { align: 'right' });
    campo(M, 50, t('preliq.colecturia'), e.colecturia, 112, 340 - M - 112 - 16);
    campo(M, 63, t('preliq.regimen'), e.regimen, 112, 340 - M - 112 - 16);
    campo(M, 76, t('preliq.fechaDeclaracion'), e.fechaDeclaracion, 112, 340 - M - 112 - 16);
    campo(M, 89, t('preliq.conocimientoEmbarque'), e.conocimientoEmbarque, 112, 340 - M - 112 - 16);
    campo(340, 50, t('preliq.importador'), e.importador, 72, 560 - 340 - 72 - 16);
    campo(340, 63, t('preliq.documento'), e.importadorDocumento, 72, 560 - 340 - 72 - 16);
    campo(560, 50, t('preliq.agenteAduanal'), e.agente, 88, ancho - M - 560 - 88);
    campo(560, 63, t('preliq.documento'), e.agenteDocumento, 88, ancho - M - 560 - 88);
    campo(560, 76, t('preliq.fechaImpresion'), e.fechaImpresion, 88, ancho - M - 560 - 88);
    campo(560, 89, t('preliq.horaImpresion'), e.horaImpresion, 88, ancho - M - 560 - 88);
    doc.setLineWidth(0.8).setDrawColor(60).line(M, 96, ancho - M, 96);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(110)
      .text(t('preliq.pagina', { n: i, total: paginas }), ancho - M, alto - 18, { align: 'right' });
    doc.setTextColor(0);
  }
  return doc;
}

export async function generarPdfPreliquidacion(r: ReportePreliquidacion, t: T): Promise<Blob> {
  return (await construirPdfPreliquidacion(r, t)).output('blob');
}
