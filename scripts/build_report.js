#!/usr/bin/env node
// Render an investment report data file (see references/report-structure.md)
// to .docx, .md or .html. Usage: node build_report.js <data.json> <output.(docx|md|html)>
'use strict';
const fs = require('fs');
const path = require('path');

const LABELS = {
  fr: {
    title: 'Rapport Hebdomadaire de Portfolio',
    subtitle: "Analyse des marchés & signaux d'investissement",
    macro: 'Vue macro de la semaine', news: 'Actualités marché', assets: 'Analyse par actif',
    alignment: 'Alignement avec vos objectifs', summary: 'Récapitulatif des signaux', sources: 'Sources',
    price: 'Prix actuel', change: 'Variation hebdomadaire', weight: 'Poids en portefeuille',
    context: 'Contexte macro et fondamental', recent: 'Actualités récentes', signal: "Signal d'entrée",
    colAsset: 'Actif', colPrice: 'Prix', colChange: 'Variation', colSignal: 'Signal',
    footer: 'Rapport du', page: 'Page',
    signals: { buy: 'Achat', neutral: 'Neutre', wait: 'Attendre' },
    disclaimer: "Ce rapport est fourni à titre informatif et ne constitue pas un conseil en investissement. Les signaux sont générés automatiquement à partir d'informations publiques et d'un profil auto-déclaré.",
  },
  en: {
    title: 'Weekly Portfolio Report',
    subtitle: 'Market analysis & investment signals',
    macro: 'Macro view of the week', news: 'Market news', assets: 'Asset-by-asset analysis',
    alignment: 'Alignment with your goals', summary: 'Signal summary', sources: 'Sources',
    price: 'Current price', change: 'Weekly change', weight: 'Portfolio weight',
    context: 'Macro and fundamental context', recent: 'Recent news', signal: 'Entry signal',
    colAsset: 'Asset', colPrice: 'Price', colChange: 'Change', colSignal: 'Signal',
    footer: 'Report of', page: 'Page',
    signals: { buy: 'Buy', neutral: 'Neutral', wait: 'Wait' },
    disclaimer: 'This report is for informational purposes only and does not constitute investment advice. Signals are generated automatically from public information and a self-declared profile.',
  },
  es: {
    title: 'Informe Semanal de Cartera',
    subtitle: 'Análisis de mercados y señales de inversión',
    macro: 'Visión macro de la semana', news: 'Noticias de mercado', assets: 'Análisis por activo',
    alignment: 'Alineación con sus objetivos', summary: 'Resumen de señales', sources: 'Fuentes',
    price: 'Precio actual', change: 'Variación semanal', weight: 'Peso en cartera',
    context: 'Contexto macro y fundamental', recent: 'Noticias recientes', signal: 'Señal de entrada',
    colAsset: 'Activo', colPrice: 'Precio', colChange: 'Variación', colSignal: 'Señal',
    footer: 'Informe del', page: 'Página',
    signals: { buy: 'Compra', neutral: 'Neutral', wait: 'Esperar' },
    disclaimer: 'Este informe tiene fines exclusivamente informativos y no constituye asesoramiento de inversión. Las señales se generan automáticamente a partir de información pública y de un perfil autodeclarado.',
  },
  de: {
    title: 'Wöchentlicher Portfoliobericht',
    subtitle: 'Marktanalyse & Investmentsignale',
    macro: 'Makro-Überblick der Woche', news: 'Marktnachrichten', assets: 'Analyse je Anlage',
    alignment: 'Abgleich mit Ihren Zielen', summary: 'Signalübersicht', sources: 'Quellen',
    price: 'Aktueller Kurs', change: 'Wochenveränderung', weight: 'Portfoliogewicht',
    context: 'Makro- und Fundamentalkontext', recent: 'Aktuelle Nachrichten', signal: 'Einstiegssignal',
    colAsset: 'Anlage', colPrice: 'Kurs', colChange: 'Veränderung', colSignal: 'Signal',
    footer: 'Bericht vom', page: 'Seite',
    signals: { buy: 'Kaufen', neutral: 'Neutral', wait: 'Abwarten' },
    disclaimer: 'Dieser Bericht dient ausschließlich Informationszwecken und stellt keine Anlageberatung dar. Die Signale werden automatisch aus öffentlichen Informationen und einem selbst angegebenen Profil erzeugt.',
  },
};

const SIGNAL_COLORS = { buy: 'C6EFCE', neutral: 'FFEB9C', wait: 'FFCC99' };
const BLUE = '1F3864';
const NAVY = '002060';

function loadData(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const required = ['language', 'date_iso', 'date_long', 'macro', 'news', 'assets', 'alignment', 'sources'];
  const missing = required.filter((k) => data[k] === undefined);
  if (missing.length) throw new Error(`Missing fields: ${missing.join(', ')}`);
  data.assets.forEach((a, i) => {
    if (!SIGNAL_COLORS[a.signal]) throw new Error(`assets[${i}] (${a.name}): signal must be buy|neutral|wait, got "${a.signal}"`);
  });
  const base = LABELS[data.language] || LABELS.en;
  data.L = { ...base, ...(data.labels || {}), signals: { ...base.signals, ...((data.labels || {}).signals || {}) } };
  data.title = data.title || data.L.title;
  return data;
}

// ---------- Markdown ----------
function renderMarkdown(d) {
  const L = d.L;
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  const out = [`# ${d.title}`, '', `**${d.date_long}**  `, `*${L.subtitle}*`];
  if (d.profile_line) out.push('', `> ${d.profile_line}`);
  out.push('', `## 1. ${L.macro}`, '', ...d.macro.flatMap((p) => [p, '']));
  out.push(`## 2. ${L.news}`, '', ...d.news.map((n) => `- ${n}`), '');
  out.push(`## 3. ${L.assets}`, '');
  const colon = d.language === 'fr' ? ' :' : ':';
  for (const a of d.assets) {
    out.push(`### ${a.name}`, '');
    out.push(`- **${L.price}${colon}** ${a.price}`, `- **${L.change}${colon}** ${a.change}`);
    if (a.weight) out.push(`- **${L.weight}${colon}** ${a.weight}`);
    out.push('', `**${L.context}**`, '', a.context, '');
    if (a.news && a.news.length) out.push(`**${L.recent}**`, '', ...a.news.map((n) => `- ${n}`), '');
    out.push(`**${L.signal}${colon} ${L.signals[a.signal]}** — ${a.rationale}`, '');
  }
  out.push(`## 4. ${L.alignment}`, '', ...d.alignment.flatMap((p) => [p, '']));
  out.push(`## 5. ${L.summary}`, '', `| ${L.colAsset} | ${L.colPrice} | ${L.colChange} | ${L.colSignal} |`, '|---|---|---|---|');
  for (const a of d.assets) out.push(`| ${esc(a.name)} | ${esc(a.price)} | ${esc(a.change)} | **${L.signals[a.signal]}** |`);
  out.push('', `## ${L.sources}`, '', ...d.sources.map(sourceText).map((s) => `- ${s}`), '', '---', '', `*${L.disclaimer}*`, '');
  return out.join('\n');
}

function sourceText(s) {
  if (typeof s === 'string') return s;
  const parts = [s.url ? `[${s.title}](${s.url})` : s.title];
  if (s.date) parts.push(`(${s.date})`);
  return parts.join(' ');
}

// ---------- HTML ----------
function renderHtml(d) {
  const L = d.L;
  const h = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colon = d.language === 'fr' ? '&nbsp;:' : ':';
  const assetBlocks = d.assets.map((a) => `
    <section class="asset">
      <h3>${h(a.name)}</h3>
      <dl>
        <dt>${h(L.price)}${colon}</dt><dd>${h(a.price)}</dd>
        <dt>${h(L.change)}${colon}</dt><dd>${h(a.change)}</dd>
        ${a.weight ? `<dt>${h(L.weight)}${colon}</dt><dd>${h(a.weight)}</dd>` : ''}
      </dl>
      <h4>${h(L.context)}</h4><p>${h(a.context)}</p>
      ${a.news && a.news.length ? `<h4>${h(L.recent)}</h4><ul>${a.news.map((n) => `<li>${h(n)}</li>`).join('')}</ul>` : ''}
      <p class="signal-line"><span class="pill s-${a.signal}">${h(L.signal)}${colon} ${h(L.signals[a.signal])}</span> ${h(a.rationale)}</p>
    </section>`).join('');
  const rows = d.assets.map((a) => `<tr><td>${h(a.name)}</td><td>${h(a.price)}</td><td>${h(a.change)}</td><td class="s-${a.signal}"><strong>${h(L.signals[a.signal])}</strong></td></tr>`).join('');
  const sources = d.sources.map((s) => typeof s === 'string' ? `<li>${h(s)}</li>`
    : `<li>${s.url ? `<a href="${h(s.url)}">${h(s.title)}</a>` : h(s.title)}${s.date ? ` (${h(s.date)})` : ''}</li>`).join('');
  return `<!doctype html>
<html lang="${h(d.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(d.title)} — ${h(d.date_iso)}</title>
<style>
  :root { --ink:#1a1a1a; --muted:#5a5a5a; --bg:#ffffff; --head:#${BLUE}; --h2:#${NAVY}; --line:#d9d9d9;
          --buy:#${SIGNAL_COLORS.buy}; --neutral:#${SIGNAL_COLORS.neutral}; --wait:#${SIGNAL_COLORS.wait}; --pill-ink:#1a1a1a; }
  @media (prefers-color-scheme: dark) {
    :root { --ink:#e8e8e8; --muted:#a8a8a8; --bg:#15171c; --head:#8fb0ff; --h2:#a9c0ff; --line:#33363d; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.6 Arial, Helvetica, sans-serif; }
  main { max-width: 820px; margin: 0 auto; padding: 32px 16px 64px; }
  header { text-align:center; padding: 32px 0 24px; border-bottom: 1px solid var(--line); margin-bottom: 24px; }
  h1 { color:var(--head); font-size: 2rem; margin: 0 0 8px; }
  h2 { color:var(--head); font-size: 1.4rem; margin: 40px 0 12px; }
  h3 { color:var(--h2); font-size: 1.15rem; margin: 28px 0 8px; }
  h4 { font-size: .95rem; margin: 14px 0 4px; }
  .date { font-weight: bold; } .muted { color: var(--muted); }
  dl { display:grid; grid-template-columns: max-content 1fr; gap: 2px 12px; margin: 8px 0; }
  dt { font-weight:bold; } dd { margin:0; }
  .pill { display:inline-block; padding: 2px 10px; border-radius: 999px; font-weight: bold; color: var(--pill-ink); margin-right: 6px; }
  .s-buy { background: var(--buy); color: var(--pill-ink); } .s-neutral { background: var(--neutral); color: var(--pill-ink); } .s-wait { background: var(--wait); color: var(--pill-ink); }
  .table-wrap { overflow-x:auto; }
  table { border-collapse: collapse; width: 100%; min-width: 480px; }
  th, td { border: 1px solid var(--line); padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #${BLUE}; color: #fff; }
  a { color: var(--head); }
  footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--muted); font-style: italic; font-size: .9rem; }
</style>
</head>
<body><main>
<header>
  <h1>${h(d.title)}</h1>
  <div class="date">${h(d.date_long)}</div>
  <div class="muted">${h(L.subtitle)}</div>
  ${d.profile_line ? `<div class="muted">${h(d.profile_line)}</div>` : ''}
</header>
<h2>1. ${h(L.macro)}</h2>${d.macro.map((p) => `<p>${h(p)}</p>`).join('')}
<h2>2. ${h(L.news)}</h2><ul>${d.news.map((n) => `<li>${h(n)}</li>`).join('')}</ul>
<h2>3. ${h(L.assets)}</h2>${assetBlocks}
<h2>4. ${h(L.alignment)}</h2>${d.alignment.map((p) => `<p>${h(p)}</p>`).join('')}
<h2>5. ${h(L.summary)}</h2>
<div class="table-wrap"><table><thead><tr><th>${h(L.colAsset)}</th><th>${h(L.colPrice)}</th><th>${h(L.colChange)}</th><th>${h(L.colSignal)}</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>${h(L.sources)}</h2><ul>${sources}</ul>
<footer>${h(L.disclaimer)}</footer>
</main></body></html>
`;
}

// ---------- DOCX ----------
async function renderDocx(d) {
  let docx;
  try { docx = require('docx'); } catch (e) {
    throw new Error("The 'docx' npm package is required for .docx output. Install it (npm install docx) and set NODE_PATH if installed elsewhere.");
  }
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
    AlignmentType, HeadingLevel, LevelFormat, Footer, PageNumber, PageBreak, BorderStyle, ExternalHyperlink } = docx;
  const L = d.L;
  const colon = d.language === 'fr' ? ' : ' : ': ';
  const COLS = [3226, 2000, 1800, 2000]; // 9026 = A4 width minus 2 x 1440 margins
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
  const borders = { top: border, bottom: border, left: border, right: border };

  const p = (text, opts = {}) => new Paragraph({ spacing: { after: 120 }, ...opts, children: [new TextRun(text)] });
  const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
  const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
  const bullet = (children) => new Paragraph({ numbering: { reference: 'bullets', level: 0 },
    children: Array.isArray(children) ? children : [new TextRun(children)] });
  const labelled = (label, value) => new Paragraph({ spacing: { after: 60 },
    children: [new TextRun({ text: label + colon, bold: true }), new TextRun(String(value))] });
  const sub = (text) => new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text, bold: true })] });

  const cell = (text, i, opts = {}) => new TableCell({
    width: { size: COLS[i], type: WidthType.DXA }, borders,
    shading: opts.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: !!opts.bold, color: opts.color })] })],
  });

  const summaryTable = new Table({
    width: { size: 9026, type: WidthType.DXA }, columnWidths: COLS,
    rows: [
      new TableRow({ tableHeader: true, children: [L.colAsset, L.colPrice, L.colChange, L.colSignal]
        .map((t, i) => cell(t, i, { bold: true, fill: BLUE, color: 'FFFFFF' })) }),
      ...d.assets.map((a) => new TableRow({ children: [
        cell(a.name, 0), cell(a.price, 1), cell(a.change, 2),
        cell(L.signals[a.signal], 3, { bold: true, fill: SIGNAL_COLORS[a.signal] })] })),
    ],
  });

  const children = [
    new Paragraph({ style: 'Title', children: [new TextRun(d.title)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: d.date_long, bold: true, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: L.subtitle, italics: true, size: 24, color: '595959' })] }),
  ];
  if (d.profile_line) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: d.profile_line, size: 22, color: '595959' })] }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  children.push(h1(`1. ${L.macro}`), ...d.macro.map((t) => p(t)));
  children.push(h1(`2. ${L.news}`), ...d.news.map((t) => bullet(t)));
  children.push(h1(`3. ${L.assets}`));
  for (const a of d.assets) {
    children.push(h2(a.name), labelled(L.price, a.price), labelled(L.change, a.change));
    if (a.weight) children.push(labelled(L.weight, a.weight));
    children.push(sub(L.context), p(a.context));
    if (a.news && a.news.length) children.push(sub(L.recent), ...a.news.map((t) => bullet(t)));
    children.push(new Paragraph({ spacing: { before: 120, after: 200 }, children: [
      new TextRun({ text: L.signal + colon, bold: true }),
      new TextRun({ text: ` ${L.signals[a.signal]} `, bold: true, shading: { type: ShadingType.CLEAR, color: 'auto', fill: SIGNAL_COLORS[a.signal] } }),
      new TextRun(` — ${a.rationale}`)] }));
  }
  children.push(h1(`4. ${L.alignment}`), ...d.alignment.map((t) => p(t)));
  children.push(h1(`5. ${L.summary}`), summaryTable);
  children.push(h1(L.sources), ...d.sources.map((s) => {
    if (typeof s === 'string') return bullet(s);
    const runs = [s.url
      ? new ExternalHyperlink({ link: s.url, children: [new TextRun({ text: s.title, style: 'Hyperlink' })] })
      : new TextRun(s.title)];
    if (s.date) runs.push(new TextRun(` (${s.date})`));
    return bullet(runs);
  }));
  children.push(new Paragraph({ spacing: { before: 360 }, children: [new TextRun({ text: L.disclaimer, italics: true, size: 18, color: '595959' })] }));

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', run: { size: 40, bold: true, color: BLUE, font: 'Arial' }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 240 } } },
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: BLUE, font: 'Arial' }, paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: NAVY, font: 'Arial' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      ],
    },
    numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: `${L.footer} ${d.date_long} — ${L.page} `, size: 18 }),
        new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
      children,
    }],
  });
  return Packer.toBuffer(doc);
}

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error('Usage: node build_report.js <data.json> <output.(docx|md|html)>');
    process.exit(2);
  }
  const data = loadData(input);
  const ext = path.extname(output).toLowerCase();
  let content;
  if (ext === '.docx') content = await renderDocx(data);
  else if (ext === '.md' || ext === '.markdown') content = renderMarkdown(data);
  else if (ext === '.html' || ext === '.htm') content = renderHtml(data);
  else throw new Error(`Unsupported output extension "${ext}" (use .docx, .md or .html)`);
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, content);
  console.log(`Wrote ${output} (${data.assets.length} assets, ${data.language})`);
}

main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
