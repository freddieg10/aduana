/*
 * Regenerates src/data/arancel.json from the DGA's "Arancel de Aduanas" PDF.
 *
 *   npm install --no-save pdfjs-dist@4.10.38
 *   node scripts/extraer-arancel.mjs "Arancel Aduanas 7ma Enmienda.pdf" src/data/arancel.json
 *
 * The PDF has no table structure, so rows are rebuilt from text coordinates:
 *  - every glyph run is printed twice (a bold effect), sometimes 0.1pt apart: dedupe;
 *  - a code may arrive split ("0702" "." "00.12") or with a space ("2009.21 00");
 *  - a long description wraps and its rate sits on the LAST row of the wrap;
 *  - a heading ("73.24", "7323.99") or an uncoded "- - Los demás:" closes the open line;
 *  - on amended pages the rate column drifts up to ~6pt off the code column, so rates are
 *    aligned to lines per page with a monotone one-to-one alignment (top to bottom,
 *    minimum total distance) instead of nearest-match, which misassigns those blocks;
 *  - a number in the rate column that is not a DR rate band (0/3/8/14/20/25/40) is
 *    description text ("500 micras") and is ignored; 7pt superscripts are dropped outright.
 * The EX. ITBIS column only ever holds 0: it marks exemptions, blank means the standard 18%.
 * The run prints a report; anything under "huérfanas" or "sin gravamen" needs a human look.
 */
import fs from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const [file, out] = process.argv.slice(2);
const doc = await getDocument({ url: file, verbosity: 0 }).promise;
const TASAS_VALIDAS = new Set([0, 3, 8, 14, 20, 25, 40]);
const HEADER = /^(CÓDIGO|DESIGNACIÓN|GRAV\.?|EX\.?|ITBIS)$/;
const COL_COD = 140, COL_DESC_FIN = 460, COL_GRAV_FIN = 505, COL_ITBIS_FIN = 545;
const DMAX = 9, GAP = 9;

const lineas = [];
const informe = { huerfanas: [], itbisSueltos: [], noTasa: [] };
let abierta = null;

const codigoDe = (col) => {
  const dig = col.replace(/\D/g, '');
  return /^[\d.\s]+$/.test(col) && dig.length === 8 ? dig : null;
};

for (let n = 1; n <= doc.numPages; n++) {
  const tc = await (await doc.getPage(n)).getTextContent();
  const txt = tc.items.map((i) => i.str).join(' ');
  if (!(txt.includes('CÓDIGO') && txt.includes('GRAV'))) { abierta = null; continue; }
  // A line already rated on the previous page is finished; only an unrated one may wrap over.
  if (abierta && abierta.grav !== null) abierta = null;

  const crudos = tc.items
    .map((i) => ({ x: i.transform[4], y: i.transform[5], s: i.str.trim(), pt: Math.hypot(i.transform[2], i.transform[3]) }))
    // body text is 11.5pt; the 7pt runs are superscripts (the 3 of cm³) on their own baseline
    .filter((i) => i.s && i.pt >= 9 && i.y <= 700 && i.y >= 40 && !HEADER.test(i.s))
    .sort((a, b) => b.y - a.y || a.x - b.x);
  // every glyph run is printed twice, sometimes 0.1pt apart
  const items = crudos.filter((it, k) => !crudos.slice(Math.max(0, k - 12), k).some((o) => o.s === it.s && Math.abs(o.x - it.x) < 1.5 && Math.abs(o.y - it.y) < 1.5));

  const enColTasa = items.filter((i) => i.x >= COL_DESC_FIN && i.x < COL_ITBIS_FIN && /^\d{1,3}$/.test(i.s));
  for (const t of enColTasa) if (!TASAS_VALIDAS.has(Number(t.s))) informe.noTasa.push(`p${n}@${t.y.toFixed(1)}="${t.s}"`);
  const tasas = enColTasa.filter((t) => TASAS_VALIDAS.has(Number(t.s)));
  const texto = items.filter((i) => !tasas.includes(i));

  const filas = [];
  for (const it of texto) {
    const f = filas[filas.length - 1];
    if (f && f.y - it.y <= 3.5) f.items.push(it); else filas.push({ y: it.y, items: [it] });
  }

  const enPagina = [];
  const ys = (f) => f.items.map((t) => t.y);
  for (const f of filas) {
    const colCod = f.items.filter((t) => t.x < COL_COD).sort((a, b) => a.x - b.x).map((t) => t.s).join('');
    const codigo = codigoDe(colCod);
    const desc = f.items.filter((t) => t.x >= COL_COD && t.x < COL_DESC_FIN).sort((a, b) => a.x - b.x).map((t) => t.s).join(' ').trim();
    if (codigo) {
      abierta = { codigo, desc: [desc], filas: [], grav: null, itbis: null, gravY: null, page: n };
      lineas.push(abierta);
      abierta.filas.push({ page: n, ys: ys(f) });
      enPagina.push(abierta);
    } else if (colCod || /^-(\s|$)/.test(desc)) {
      abierta = null;                         // heading, or an uncoded "- - Los demás:" subheading
    } else if (abierta && desc) {
      abierta.desc.push(desc);                // continuation ("-5-il)metil metilo" included)
      abierta.filas.push({ page: n, ys: ys(f) });
      if (!enPagina.includes(abierta)) enPagina.push(abierta);
    }
  }

  const dist = (l, y) => Math.min(...l.filas.filter((r) => r.page === n).flatMap((r) => r.ys.map((v) => Math.abs(v - y))));
  const grav = tasas.filter((t) => t.x < COL_GRAV_FIN).sort((a, b) => b.y - a.y);
  const L = enPagina, R = grav;

  // dp[i][j]: best cost aligning the first i lines with the first j rates, in page order
  const dp = Array.from({ length: L.length + 1 }, () => new Array(R.length + 1).fill(Infinity));
  const paso = Array.from({ length: L.length + 1 }, () => new Array(R.length + 1).fill(null));
  dp[0][0] = 0;
  for (let i = 0; i <= L.length; i++) for (let j = 0; j <= R.length; j++) {
    const c = dp[i][j];
    if (c === Infinity) continue;
    if (i < L.length && c + GAP < dp[i + 1][j]) { dp[i + 1][j] = c + GAP; paso[i + 1][j] = 'L'; }
    if (j < R.length && c + GAP < dp[i][j + 1]) { dp[i][j + 1] = c + GAP; paso[i][j + 1] = 'R'; }
    if (i < L.length && j < R.length) {
      const d = dist(L[i], R[j].y);
      if (d <= DMAX && c + d < dp[i + 1][j + 1]) { dp[i + 1][j + 1] = c + d; paso[i + 1][j + 1] = 'M'; }
    }
  }
  for (let i = L.length, j = R.length; i > 0 || j > 0;) {
    const p = paso[i][j];
    if (p === 'M') { L[i - 1].grav = Number(R[j - 1].s); L[i - 1].gravY = R[j - 1].y; L[i - 1].gravPage = n; i--; j--; }
    else if (p === 'L') i--;
    else { informe.huerfanas.push(`p${n}@${R[j - 1].y.toFixed(1)}=${R[j - 1].s}`); j--; }
  }

  // ITBIS is printed on the same baseline as the gravamen of its line.
  for (const t of tasas.filter((t) => t.x >= COL_GRAV_FIN)) {
    const l = L.find((x) => x.gravPage === n && Math.abs(x.gravY - t.y) < 2);
    if (l) l.itbis = Number(t.s); else informe.itbisSueltos.push(`p${n}@${t.y.toFixed(1)}=${t.s}`);
  }
}

const porCodigo = new Map();
for (const l of lineas) {
  const prev = porCodigo.get(l.codigo);
  if (prev && prev.grav !== null && l.grav !== null && prev.grav !== l.grav) informe.duplicadoConflicto = [...(informe.duplicadoConflicto ?? []), l.codigo];
  if (!prev || (prev.grav === null && l.grav !== null)) porCodigo.set(l.codigo, l);
}
const final = [...porCodigo.values()].map((l) => ({ codigo: l.codigo, desc: l.desc.join(' ').replace(/\s+/g, ' ').trim(), grav: l.grav, itbis: l.itbis, page: l.page }));
console.log('subpartidas       :', final.length, `(${lineas.length} filas de código)`);
console.log('con gravamen      :', final.filter((l) => l.grav !== null).length);
console.log('sin gravamen      :', final.filter((l) => l.grav === null).map((l) => `${l.codigo}@p${l.page}`).join(' ') || '—');
console.log('ITBIS exento (0)  :', final.filter((l) => l.itbis === 0).length);
console.log('tasas huérfanas   :', informe.huerfanas.join(' ') || '—');
console.log('ITBIS sin línea   :', informe.itbisSueltos.join(' ') || '—');
console.log('no-tasa en columna:', informe.noTasa.join(' ') || '—');
console.log('duplicados        :', JSON.stringify(informe.duplicadoConflicto ?? []));
const limpiar = (d) => d.replace(/\s+/g, ' ').trim();
const json = {
  fuente: 'Arancel de Aduanas de la República Dominicana, 7ma enmienda',
  formato: '[codigo, gravamen %, itbis exento (1/0), descripcion]',
  lineas: final.sort((a, b) => a.codigo.localeCompare(b.codigo)).map((l) => [l.codigo, l.grav, l.itbis === 0 ? 1 : 0, limpiar(l.desc)]),
};
fs.writeFileSync(out, JSON.stringify(json));
console.log('escrito', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
