// ─── Экспорт: файлы, архив, печать/PDF ──────────────────────────────────────
import type { Doc, PaletteColors } from '../types';
import { htmlToMd, htmlToText } from './text';
import { FORMATS, SKINS } from '../data/skins';

export function download(name: string, content: string | Blob, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const safeName = (t: string) => (t || 'документ').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);

export const exportTxt = (doc: Doc) => download(`${safeName(doc.title)}.txt`, htmlToText(doc.html));
export const exportMd  = (doc: Doc) => download(`${safeName(doc.title)}.md`, htmlToMd(doc.html));

export const exportMscr = (doc: Doc) =>
  download(`${safeName(doc.title)}.mscr`, JSON.stringify({ app: 'ScribeForge', ver: 1, doc }, null, 2), 'application/json');

export function exportHtmlFile(doc: Doc, colors: PaletteColors) {
  const fmt = FORMATS.find(f => f.id === doc.formatId) ?? FORMATS[0];
  const font = SKINS[doc.skin].fonts.find(f => f.id === doc.fontId) ?? SKINS[doc.skin].fonts[0];
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${doc.title}</title>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:wght@600&family=Marck+Script&display=swap" rel="stylesheet">
<style>
  :root{--paper:${colors.paper};--ink:${colors.ink};--accent:${colors.accent};}
  *{box-sizing:border-box}
  body{background:${colors.bg};color:${colors.ink};font-family:${font.family};margin:0;padding:48px 14px;line-height:${doc.lineHeight};}
  .page{max-width:${Math.round(Math.min(fmt.w, 220) * 3.3)}px;margin:0 auto;background:${colors.paper};padding:56px 60px;box-shadow:0 24px 60px rgba(0,0,0,.35);border-radius:4px;font-size:${doc.fontSize}px;}
  h1{font-size:1.9em;line-height:1.25;margin:.4em 0 .5em}h2{font-size:1.42em;margin:1.1em 0 .45em}h3{font-size:1.16em;margin:1em 0 .4em}
  h1,h2,h3{color:${colors.accent};} a{color:${colors.accent};} p{margin:0 0 .72em}
  blockquote{border-left:3px solid ${colors.accent};margin:.9em 0;padding-left:16px;opacity:.85;font-style:italic;}
  ul,ol{margin:.5em 0 .9em;padding-left:1.5em}
  img{max-width:100%;border-radius:6px}
  s{opacity:.6}
  .sf-decor{display:flex;justify-content:center;margin:1.1em 0;}
  .sf-table{border-collapse:collapse;margin:.9em 0;width:100%;}
  .sf-table.st-grid td,.sf-table.st-grid th{border:1px solid ${colors.ink}55;padding:6px 12px}
  .sf-table.st-grid th{background:${colors.accent}22}
  .sf-table.st-lines td,.sf-table.st-lines th{border:none;border-bottom:1px solid ${colors.ink}44;padding:6px 12px}
  .sf-table.st-lines th{border-bottom:2px solid ${colors.accent}}
  .sf-table.st-min td,.sf-table.st-min th{border:none;padding:6px 12px;border-bottom:1.5px solid transparent}
  .sf-table.st-min th,.sf-table.st-min tr:last-child td{border-bottom-color:${colors.ink}88}
  ${doc.dropCap ? `article > p:first-of-type::first-letter, h2 + p::first-letter{font-family:'Marck Script',cursive;font-size:3.1em;line-height:.78;float:left;padding:6px 10px 0 0;color:${colors.accent};}` : ''}
  @media (max-width:640px){.page{padding:32px 22px}}
</style></head><body><article class="page">${doc.html}</article></body></html>`;
  download(`${safeName(doc.title)}.html`, html, 'text/html');
}

// «DOCX» — совместимый с Word HTML-формат, отдаётся как .doc
export function exportDoc(doc: Doc, _colors?: PaletteColors) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${doc.title}</title>
<style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;color:#000}
h1{font-size:18pt;text-align:center}h2{font-size:14pt;margin-top:18pt}p{margin:0 0 8pt}
blockquote{margin-left:24pt;font-style:italic}.sf-decor{text-align:center;font-size:14pt;letter-spacing:8pt}
img{max-width:480px}</style></head><body>${htmlToWordFallback(doc.html)}</body></html>`;
  download(`${safeName(doc.title)}.doc`, html, 'application/msword');
}

// Word не показывает svg — заменяем на типографский разделитель
const htmlToWordFallback = (html: string) =>
  html.replace(/<div class="sf-decor"[^>]*>[\s\S]*?<\/div>/g, '<p class="sf-decor">◆ ◆ ◆</p>');

// ─── Печать / PDF ────────────────────────────────────────────────────────────

export type PdfMode = 'doc' | 'book' | 'notebook' | 'scroll';
export type PdfStyle = 'screen' | 'clean';

export interface PrintConfig {
  mode: PdfMode;
  style: PdfStyle;
  cover: boolean;
  toc: boolean;
  binding: 'left' | 'right';
  notebookSize: number; // страниц в тетради
}

export function buildPrintHtml(doc: Doc, _colors: PaletteColors | undefined, cfg: PrintConfig): string {
  const skinName = SKINS[doc.skin].name;
  const bodyHtml = doc.html;
  const tocHtml = cfg.toc
    ? `<section class="pv-toc"><h2>Содержание</h2>${buildToc(bodyHtml)}</section>` : '';
  const cover = cfg.cover
    ? `<section class="pv-cover" data-mode="${cfg.mode}">
        <div class="pv-cover-frame">
          <div class="pv-skin">${skinName}</div>
          <h1 class="pv-cover-title">${doc.title}</h1>
          <div class="pv-cover-rule"></div>
          <div class="pv-date">${new Date(doc.createdAt).getFullYear()}</div>
        </div>
      </section>` : '';
  return cover + tocHtml + `<section class="pv-body">${bodyHtml}</section>`;
}

const buildToc = (html: string) => {
  const d = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const hs = Array.from(d.querySelectorAll('h1, h2'));
  if (!hs.length) return '<p>Заголовки не найдены</p>';
  return hs.map(h => `<div class="pv-toc-row ${h.tagName === 'H2' ? 'l2' : ''}"><span>${h.textContent}</span></div>`).join('');
};

export function printCss(doc: Doc, colors: PaletteColors, cfg: PrintConfig): string {
  const fmt = FORMATS.find(f => f.id === doc.formatId) ?? FORMATS[0];
  const clean = cfg.style === 'clean';
  const ink = clean ? '#000' : colors.ink;
  const paper = clean ? '#fff' : colors.paper;
  const accent = clean ? '#000' : colors.accent;
  const size = fmt.id === 'scroll' || cfg.mode === 'scroll'
    ? '' : `size: ${fmt.w}mm ${fmt.h}mm;`;
  const mirror = cfg.mode === 'book'
    ? `@page :left { margin: 18mm ${cfg.binding === 'left' ? '14mm' : '24mm'} 18mm ${cfg.binding === 'left' ? '24mm' : '14mm'}; }
       @page :right { margin: 18mm ${cfg.binding === 'left' ? '24mm' : '14mm'} 18mm ${cfg.binding === 'left' ? '14mm' : '24mm'}; }`
    : '';
  const font = SKINS[doc.skin].fonts.find(f => f.id === doc.fontId) ?? SKINS[doc.skin].fonts[0];
  return `
  @page { ${size} margin: 18mm 15mm; }
  ${mirror}
  html, body { margin: 0; padding: 0; }
  body { background: ${clean ? '#fff' : colors.bg}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pv { background: ${paper}; color: ${ink}; font-family: ${clean ? "'Times New Roman',Georgia,serif" : font.family};
        font-size: ${clean ? '12pt' : doc.fontSize + 'px'}; line-height: ${clean ? 1.5 : doc.lineHeight};
        padding: ${cfg.mode === 'scroll' ? '30mm' : '0'}; }
  .pv h1, .pv h2, .pv h3 { color: ${accent}; }
  .pv blockquote { border-left: 3px solid ${accent}; padding-left: 1em; margin-left: 0; font-style: italic; opacity: .9; }
  .pv img { max-width: 100%; }
  .pv .sf-decor { display: flex; justify-content: center; margin: 1.2em 0; }
  .pv-cover { min-height: 88vh; display: flex; align-items: center; justify-content: center; page-break-after: always;
              background: ${clean ? '#fff' : paper}; border: ${clean ? 'none' : `1px solid ${accent}33`}; }
  .pv-cover-frame { text-align: center; border: ${clean ? '1px solid #000' : `1.5px solid ${accent}`}; padding: 9% 12%;
                    max-width: 70%; }
  .pv-skin { letter-spacing: .4em; text-transform: uppercase; font-size: 10px; color: ${clean ? '#666' : accent}; margin-bottom: 3em; }
  .pv-cover-title { font-size: 2.4em; margin: 0 0 .6em; color: ${ink}; }
  .pv-cover-rule { width: 90px; height: 2px; background: ${accent}; margin: 2em auto; }
  .pv-date { letter-spacing: .3em; color: ${clean ? '#666' : accent}; }
  .pv-toc { page-break-after: always; }
  .pv-toc-row { display: flex; border-bottom: 1px dotted ${accent}55; padding: .35em 0; }
  .pv-toc-row.l2 { padding-left: 1.4em; font-size: .92em; }
  .pv-body h2 { page-break-before: ${cfg.mode === 'book' ? 'always' : 'auto'}; }
  .pv-foot { position: fixed; bottom: 0; left: 0; width: 100%;
             text-align: center; font-size: 9px; letter-spacing: .25em; color: ${clean ? '#777' : `${accent}aa`}; }
  `;
}

// расчёт порядка страниц тетради (8/12/16/32)
export function notebookOrder(pagesPerSig: number): number[][] {
  const n = pagesPerSig;
  const spreads: number[][] = [];
  for (let i = 0; i < n / 2; i += 2) {
    spreads.push([n - i, i + 1, i + 2, n - i - 1]); // 4 номера для двухстороннего листа
  }
  return spreads;
}
