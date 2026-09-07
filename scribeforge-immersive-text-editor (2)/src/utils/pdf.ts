// ─── Прямое скачивание PDF (один клик, без диалога печати) ──────────────────
// Рендерим проект в скрытый DOM → html2canvas → нарезаем на страницы → jsPDF.
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Doc, PaletteColors } from '../types';
import { FORMATS, SKINS } from '../data/skins';
import { safeName, type PrintConfig } from './export';

const MM = 3.7795;

function scopedCss(doc: Doc, colors: PaletteColors, clean: boolean, pagePxW: number, pagePxH: number): string {
  const font = SKINS[doc.skin].fonts.find(f => f.id === doc.fontId) ?? SKINS[doc.skin].fonts[0];
  const ink = clean ? '#000' : colors.ink;
  const paper = clean ? '#fff' : colors.paper;
  const accent = clean ? '#111' : colors.accent;
  return `
  .pv-scope, .pv-scope * { box-sizing: border-box; }
  .pv-scope { width: ${pagePxW}px; background: ${paper}; color: ${ink};
    font-family: ${clean ? "'Times New Roman', Georgia, serif" : font.family};
    font-size: ${clean ? '12pt' : doc.fontSize + 'px'}; line-height: ${clean ? 1.5 : doc.lineHeight};
    padding: ${Math.round(pagePxW * 0.09)}px ${Math.round(pagePxW * 0.12)}px; }
  .pv-scope h1 { font-size: 1.9em; margin: .4em 0 .5em; color: ${accent}; line-height: 1.25; }
  .pv-scope h2 { font-size: 1.42em; margin: 1.1em 0 .45em; color: ${accent}; }
  .pv-scope h3 { font-size: 1.16em; margin: 1em 0 .4em; }
  .pv-scope p { margin: 0 0 .72em; }
  .pv-scope blockquote { border-left: 3px solid ${accent}; padding-left: 1em; margin: .9em 0 .9em 0; font-style: italic; opacity: .9; }
  .pv-scope ul, .pv-scope ol { margin: .5em 0 .9em; padding-left: 1.5em; }
  .pv-scope img { max-width: 100%; border-radius: 6px; }
  .pv-scope a { color: ${accent}; }
  .pv-scope table { border-collapse: collapse; margin: .8em 0; width: 100%; }
  .pv-scope td, .pv-scope th { border: 1px solid ${ink}55; padding: 5px 10px; font-size: .92em; }
  .pv-scope .sf-decor { display: flex; justify-content: center; margin: 1.1em 0; }
  .pv-scope s { opacity: .6; }
  .pv-scope s { opacity: .6; }
  .pv-cover-s { width: ${pagePxW}px; height: ${pagePxH}px; display: flex; align-items: center; justify-content: center;
    background: ${paper}; color: ${ink}; overflow: hidden; }
  .pv-cover-frame-s { text-align: center; border: 2px solid ${accent}; padding: 12% 14%; max-width: 78%;
    font-family: ${clean ? "'Times New Roman', Georgia, serif" : font.family}; }
  .pv-cover-title-s { font-size: ${Math.round(pagePxW * 0.085)}px; line-height: 1.25; margin: 0 0 .55em; }
  .pv-cover-skin-s { letter-spacing: .45em; text-transform: uppercase; font-size: ${Math.round(pagePxW * 0.02) + 6}px; color: ${accent}; margin-bottom: 2.6em; }
  .pv-cover-rule-s { width: 110px; height: 2px; background: ${accent}; margin: 1.6em auto; }
  .pv-date-s { letter-spacing: .3em; color: ${accent}; font-size: 14px; }
  .pv-toc-s > div { display: flex; border-bottom: 1px dotted ${accent}66; padding: .35em 0; }
  `;
}

function makeHost(css: string, html: string): HTMLElement {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;';
  const style = document.createElement('style');
  style.textContent = css;
  host.appendChild(style);
  const body = document.createElement('div');
  body.className = 'pv-scope';
  body.innerHTML = html;
  host.appendChild(body);
  document.body.appendChild(host);
  return host;
}

export async function downloadPdf(doc: Doc, colors: PaletteColors, cfg: PrintConfig): Promise<void> {
  const fmt = FORMATS.find(f => f.id === doc.formatId) ?? FORMATS[0];
  const clean = cfg.style === 'clean';
  const pageWmm = fmt.w || 210;
  const pageHmm = fmt.h || 297;
  const pagePxW = Math.round(pageWmm * MM * 0.9); // немного компактнее для экранного вида
  const pagePxH = Math.round(pageHmm * MM * 0.9);
  const css = scopedCss(doc, colors, clean, pagePxW, pagePxH);
  const skinName = SKINS[doc.skin].name;

  const pdf = new jsPDF({
    unit: 'mm',
    format: cfg.mode === 'scroll' ? [pageWmm, Math.min(3000, pageHmm * 10)] : [pageWmm, pageHmm],
    orientation: pageWmm > pageHmm ? 'landscape' : 'portrait',
  });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  let pageNo = 0;
  const addImg = (c: HTMLCanvasElement, wMm: number, hMm: number) => {
    if (pageNo > 0) pdf.addPage([pageWmm, pageHmm], pageWmm > pageHmm ? 'landscape' : 'portrait');
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, wMm, hMm);
    pageNo++;
  };

  // ── обложка (отдельная страница точного размера)
  if (cfg.cover) {
    const coverHost = makeHost(css, `<div class="pv-cover-s"><div class="pv-cover-frame-s">
      <div class="pv-cover-skin-s">${skinName}</div>
      <div class="pv-cover-title-s">${doc.title}</div>
      <div class="pv-cover-rule-s"></div>
      <div class="pv-date-s">${new Date(doc.createdAt).getFullYear()}</div>
    </div></div>`);
    const coverCanvas = await html2canvas(coverHost.querySelector('.pv-cover-s') as HTMLElement, {
      scale: 2, backgroundColor: clean ? '#ffffff' : colors.paper, logging: false, useCORS: true,
    });
    addImg(coverCanvas, pdfW, pdfH);
    coverHost.remove();
  }

  // ── тело документа
  const tocHtml = cfg.toc ? `<h1>Содержание</h1><div class="pv-toc-s">${
    Array.from(new DOMParser().parseFromString(`<div>${doc.html}</div>`, 'text/html').querySelectorAll('h1, h2'))
      .map(h => `<div style="${h.tagName === 'H2' ? 'padding-left:1.4em;font-size:.92em' : ''}"><span>${h.textContent}</span></div>`)
      .join('') || '<div><span>Заголовки не найдены</span></div>'
  }</div>` : '';
  const host = makeHost(css, tocHtml + doc.html);
  const scale = 2;
  const canvas = await html2canvas(host.querySelector('.pv-scope') as HTMLElement, {
    scale, backgroundColor: clean ? '#ffffff' : colors.paper, logging: false, useCORS: true,
  });
  host.remove();

  // нарезка на страницы
  const pageCanvasH = Math.round(pdf.internal.pageSize.getHeight() / pdf.internal.pageSize.getWidth() * canvas.width);
  const sliceCanvas = document.createElement('canvas');
  sliceCanvas.width = canvas.width;
  sliceCanvas.height = pageCanvasH;
  const ctx = sliceCanvas.getContext('2d')!;
  let y = 0;

  if (cfg.mode === 'scroll') {
    // одна длинная страница (до предела jsPDF)
    const mmPerPx = pdfW / canvas.width;
    const totalMmHeight = Math.min(canvas.height * mmPerPx, 2800);
    const scrollPdf = new jsPDF({ unit: 'mm', format: [pdfW, totalMmHeight] });
    scrollPdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pdfW, totalMmHeight);
    if (cfg.cover) {
      // обложка для свитка не добавляется отдельно — шапка уже внутри
    }
    scrollPdf.save(`${safeName(doc.title)}.pdf`);
    return;
  }

  while (y < canvas.height) {
    const h = Math.min(pageCanvasH, canvas.height - y);
    sliceCanvas.height = h;
    ctx.fillStyle = clean ? '#ffffff' : colors.paper;
    ctx.fillRect(0, 0, sliceCanvas.width, h);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    addImg(sliceCanvas, pdfW, (h / canvas.width) * pdfW);
    // номер страницы
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(String(pageNo), pdfW / 2, pdfH - 5, { align: 'center' });
    y += pageCanvasH;
  }

  pdf.save(`${safeName(doc.title)}.pdf`);
}
