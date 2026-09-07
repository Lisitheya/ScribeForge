// ─── Текстовое ядро: счётчики, главы, проверка, конвертеры ──────────────────
import type { Stats } from '../types';

const parser = new DOMParser();

export function htmlToText(html: string): string {
  const d = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = d.body.firstElementChild!;
  const out: string[] = [];
  root.childNodes.forEach(n => {
    const t = (n.textContent ?? '').trim();
    if (n.nodeType === 1 && (n as Element).classList?.contains('sf-decor')) return;
    if (t) out.push(t);
  });
  return out.join('\n');
}

export function computeStats(html: string): Stats {
  const text = htmlToText(html);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const chars = text.length;
  const charsNoSp = text.replace(/\s/g, '').length;
  const lines = text ? text.split('\n').length : 0;
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const paras = doc.querySelectorAll('p, h1, h2, h3, li, blockquote').length || (text ? 1 : 0);
  return { words, chars, charsNoSp, lines, paras, readMin: Math.max(1, Math.round(words / 200)) };
}

// Число страниц по формату/шрифту
export function pageCount(charsNoSp: number, wMm: number, hMm: number, fontPx: number, lineHeight: number): number {
  if (!charsNoSp) return 0;
  const h = hMm || 297;
  const fontMm = fontPx * 0.3528;
  const usableW = Math.max(20, wMm - 36);
  const usableH = Math.max(20, h - 40);
  const charsPerLine = Math.max(8, Math.floor(usableW / (fontMm * 0.52)));
  const linesPerPage = Math.max(4, Math.floor(usableH / (fontMm * lineHeight)));
  const perPage = charsPerLine * linesPerPage;
  return Math.ceil(charsNoSp / perPage);
}

export const authorSheets = (chars: number) => chars / 40000;
export const typePages = (chars: number) => chars / 1800;
export const printSheets = (pages: number) => pages / 24;

// ─── Главы ───────────────────────────────────────────────────────────────────

export interface Chapter { title: string; words: number; }

export function splitChapters(html: string): { heads: Element[]; doc: Document } {
  const doc = parser.parseFromString(`<div id="r">${html}</div>',`, 'text/html');
  const root = doc.querySelector('#r')!;
  const heads = Array.from(root.children).filter(el =>
    /^(H1|H2)$/.test(el.tagName) || /^#{1,3}\s/.test(el.textContent ?? '') ||
    /^\s*(глава|пролог|эпилог|часть)\b/i.test(el.textContent ?? ''));
  return { heads, doc };
}

export function extractChapters(html: string): Chapter[] {
  const { heads } = splitChapters(html);
  const doc = parser.parseFromString(`<div id="r">${html}</div>`, 'text/html');
  const root = doc.querySelector('#r')!;
  const chapters: Chapter[] = [];
  if (!heads.length) {
    const t = htmlToText(html);
    const w = t ? t.split(/\s+/).filter(Boolean).length : 0;
    return w ? [{ title: 'Весь текст', words: w }] : [];
  }
  const kids = Array.from(root.children);
  heads.forEach((h, i) => {
    const from = kids.indexOf(h);
    const to = i + 1 < heads.length ? kids.indexOf(heads[i + 1]) : kids.length;
    const body = kids.slice(from + 1, to).map(x => x.textContent ?? '').join(' ');
    chapters.push({
      title: (h.textContent ?? '').trim().replace(/^#{1,3}\s*/, '') || `Глава ${i + 1}`,
      words: body.split(/\s+/).filter(Boolean).length,
    });
  });
  return chapters;
}

export function reorderChapters(html: string, fromIdx: number, dir: -1 | 1): string {
  const doc = parser.parseFromString(`<div id="r">${html}</div>`, 'text/html');
  const root = doc.querySelector('#r')!;
  const kids = Array.from(root.children);
  const { heads } = splitChapters(html);
  if (heads.length < 2) return html;
  const ranges: Element[][] = [];
  let preface: Element[] = [];
  heads.forEach((h, i) => {
    const from = kids.indexOf(h);
    const to = i + 1 < heads.length ? kids.indexOf(heads[i + 1]) : kids.length;
    if (i === 0) preface = kids.slice(0, from);
    ranges.push(kids.slice(from, to));
  });
  const j = fromIdx + dir;
  if (j < 0 || j >= ranges.length) return html;
  [ranges[fromIdx], ranges[j]] = [ranges[j], ranges[fromIdx]];
  root.innerHTML = '';
  [...preface, ...ranges.flat()].forEach(el => root.appendChild(el));
  return root.innerHTML;
}

// ─── Проверка текста ─────────────────────────────────────────────────────────

export interface Issue { kind: 'grammar' | 'punct' | 'style'; label: string; fix?: string; }

const ISSUE_RULES: { re: RegExp; kind: Issue['kind']; label: string | ((m: RegExpExecArray) => string); fix?: string }[] = [
  { re: / {2,}/g, kind: 'punct', label: 'Двойной пробел', fix: ' ' },
  { re: /\s+([,.;:!?…])/g, kind: 'punct', label: 'Пробел перед знаком', fix: undefined },
  { re: /\b([А-Яа-яЁёA-Za-z]{3,})\s+\1\b/gi, kind: 'style', label: m => `Повтор слова «${m[1]}»` },
  { re: /\.{2}(?!\.)/g, kind: 'punct', label: 'Две точки подряд (троеточие — …)' , fix: '…' },
  { re: /в течении\b/gi, kind: 'grammar', label: '«в течении» → «в течение»', fix: 'в течение' },
  { re: /([.!?…]\s+)([а-яё])/g, kind: 'grammar', label: 'Строчная буква после точки' },
  { re: /(^|[.!?…]\s+)(я)\b/g, kind: 'style', label: '«я» с большой буквы' },
];

export function findIssuesInText(text: string, dict: string[]): { index: number; length: number; issue: Issue; word: string }[] {
  const out: { index: number; length: number; issue: Issue; word: string }[] = [];
  for (const r of ISSUE_RULES) {
    r.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.re.exec(text))) {
      const word = m[0];
      if (dict.some(d => word.toLowerCase().includes(d))) continue;
      out.push({
        index: m.index, length: word.length, word,
        issue: { kind: r.kind, label: typeof r.label === 'function' ? r.label(m) : r.label, fix: r.fix },
      });
      if (m[0].length === 0) r.re.lastIndex++;
    }
  }
  return out;
}

// Оборачивает проблемы в DOM маркерами <span class="sf-err ...">
export function markIssues(root: HTMLElement, dict: string[]): number {
  clearIssueMarks(root);
  let count = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const n = walker.currentNode as Text;
    if (n.parentElement?.closest('.sf-decor, .sf-err, img')) continue;
    nodes.push(n);
  }
  for (const node of nodes) {
    const issues = findIssuesInText(node.data, dict);
    if (!issues.length) continue;
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const it of issues) {
      if (it.index < pos) continue;
      if (it.index > pos) frag.appendChild(document.createTextNode(node.data.slice(pos, it.index)));
      const span = document.createElement('span');
      span.className = `sf-err sf-err-${it.issue.kind}`;
      span.dataset.hint = it.issue.label;
      span.title = it.issue.label;
      span.textContent = node.data.slice(it.index, it.index + it.length);
      frag.appendChild(span);
      pos = it.index + it.length;
      count++;
    }
    if (pos < node.data.length) frag.appendChild(document.createTextNode(node.data.slice(pos)));
    node.parentNode?.replaceChild(frag, node);
  }
  return count;
}

export function clearIssueMarks(root: HTMLElement) {
  root.querySelectorAll('.sf-err').forEach(el => {
    const parent = el.parentNode!;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
  root.normalize();
}

// ─── Конвертеры ──────────────────────────────────────────────────────────────

export function htmlToMd(html: string): string {
  const doc = parser.parseFromString(`<div id="r">${html}</div>`, 'text/html');
  const walk = (el: Element): string => {
    const inner = Array.from(el.childNodes).map(n =>
      n.nodeType === 3 ? n.textContent : walk(n as Element)).join('');
    switch (el.tagName) {
      case 'H1': return `# ${inner}\n\n`;
      case 'H2': return `## ${inner}\n\n`;
      case 'H3': return `### ${inner}\n\n`;
      case 'P': case 'DIV': return el.classList.contains('sf-decor') ? '\n* * *\n\n' : `${inner}\n\n`;
      case 'B': case 'STRONG': return `**${inner}**`;
      case 'I': case 'EM': return `*${inner}*`;
      case 'S': case 'STRIKE': return `~~${inner}~~`;
      case 'BLOCKQUOTE': return `> ${inner.trim()}\n\n`;
      case 'LI': return `- ${inner}\n`;
      case 'UL': case 'OL': return `${inner}\n`;
      case 'BR': return '\n';
      case 'IMG': return `![${(el as HTMLImageElement).alt || 'изображение'}](...)`;
      case 'A': return `[${inner}](${(el as HTMLAnchorElement).href})`;
      default: return inner;
    }
  };
  const root = doc.querySelector('#r')!;
  return Array.from(root.childNodes).map(n =>
    n.nodeType === 3 ? n.textContent + '\n' : walk(n as Element)).join('').trim();
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
