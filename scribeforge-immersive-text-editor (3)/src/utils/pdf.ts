// ─── Сохранение в PDF ────────────────────────────────────────────────────────
// Используем встроенный в браузер движок печати: он даёт векторный PDF,
// корректную кириллицу, реальные шрифты и точную разбивку страниц.
// Никаких внешних библиотек — это критично для офлайн-работы и запуска с file://.
import type { Doc, PaletteColors } from '../types';
import { buildPrintHtml, printCss, type PrintConfig } from './export';

const ensureHost = (): HTMLElement => {
  let host = document.getElementById('print-root');
  if (!host) {
    host = document.createElement('div');
    host.id = 'print-root';
    document.body.appendChild(host);
  }
  return host;
};

/**
 * Готовит документ и открывает системный диалог печати,
 * где доступен пункт «Сохранить как PDF».
 */
export function printToPdf(doc: Doc, colors: PaletteColors, cfg: PrintConfig): Promise<void> {
  return new Promise(resolve => {
    const host = ensureHost();
    host.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = printCss(doc, colors, cfg);

    const body = document.createElement('div');
    body.className = 'pv';
    body.setAttribute('data-skin', doc.skin);
    body.innerHTML = buildPrintHtml(doc, colors, cfg)
      + `<div class="pv-foot">SCRIBEFORGE · ${doc.title.toUpperCase()}</div>`;

    host.appendChild(style);
    host.appendChild(body);

    const cleanup = () => {
      host.innerHTML = '';
      window.removeEventListener('afterprint', cleanup);
      resolve();
    };
    window.addEventListener('afterprint', cleanup);

    // даём браузеру кадр на верстку и раскладку изображений
    setTimeout(() => {
      try { window.print(); } catch { /* печать недоступна */ }
      // подстраховка, если afterprint не пришёл (Safari/мобильные)
      setTimeout(cleanup, 1500);
    }, 320);
  });
}
