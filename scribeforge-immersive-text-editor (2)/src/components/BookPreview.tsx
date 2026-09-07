// ─── Предпросмотр «Книга / Тетрадь» с правкой прямо в развороте ─────────────
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, BookOpen, Notebook, FileText, Pencil, Check,
  CloudDownload, Printer, Loader2, Scissors,
} from 'lucide-react';
import { useStore, useActiveDoc, activePaletteColors } from '../store';
import { FORMATS, SKINS } from '../data/skins';
import { editor } from '../editorBus';
import { downloadPdf } from '../utils/pdf';
import { notebookOrder, type PrintConfig } from '../utils/export';

type Mode = 'book' | 'notebook' | 'flow';

/** Разбивает документ на страницы по измеренной высоте контента. */
function paginate(html: string, pageH: number, pageW: number, style: React.CSSProperties): string[] {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${pageW}px;visibility:hidden;`;
  Object.assign(host.style, style as any);
  host.innerHTML = html;
  document.body.appendChild(host);

  const pages: string[] = [];
  let current: string[] = [];
  let h = 0;
  const kids = Array.from(host.children) as HTMLElement[];
  for (const el of kids) {
    const eh = el.offsetHeight + parseFloat(getComputedStyle(el).marginBottom || '0');
    const isHead = /^H[12]$/.test(el.tagName);
    if ((h + eh > pageH && current.length) || (isHead && h > pageH * 0.62 && current.length)) {
      pages.push(current.join(''));
      current = []; h = 0;
    }
    current.push(el.outerHTML);
    h += eh;
  }
  if (current.length) pages.push(current.join(''));
  host.remove();
  return pages.length ? pages : ['<p><br></p>'];
}

export default function BookPreview() {
  const doc = useActiveDoc();
  const colors = useStore(s => activePaletteColors(s.docs, s.customPalettes, s.activeId));
  const patchUi = useStore(s => s.patchUi);
  const setHtml = useStore(s => s.setHtml);

  const [mode, setMode] = useState<Mode>('book');
  const [spread, setSpread] = useState(0);
  const [editing, setEditing] = useState(false);
  const [sig, setSig] = useState(16);
  const [busy, setBusy] = useState(false);
  const [rev, setRev] = useState(0);
  const pagesRef = useRef<HTMLDivElement>(null);

  const fmt = FORMATS.find(f => f.id === doc?.formatId) ?? FORMATS[0];
  const pageW = 300;
  const pageH = Math.round(pageW * ((fmt.h || 297) / (fmt.w || 210)));

  const font = doc ? (SKINS[doc.skin].fonts.find(f => f.id === doc.fontId) ?? SKINS[doc.skin].fonts[0]) : null;
  const pageStyle: React.CSSProperties = useMemo(() => ({
    fontFamily: font?.family,
    fontSize: Math.max(8, (doc?.fontSize ?? 18) * 0.52),
    lineHeight: doc?.lineHeight ?? 1.6,
    padding: '26px 24px',
  }), [font, doc?.fontSize, doc?.lineHeight]);

  const pages = useMemo(
    () => doc ? paginate(doc.html, pageH - 52, pageW - 48, pageStyle) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc?.html, pageH, pageStyle, rev]);

  // порядок страниц: книга — подряд разворотами; тетрадь — по схеме сшивки
  const order = useMemo(() => {
    if (mode !== 'notebook') return pages.map((_, i) => i);
    const out: number[] = [];
    const sheets = notebookOrder(sig);
    const total = Math.ceil(pages.length / sig) * sig;
    for (let block = 0; block < total / sig; block++) {
      for (const s of sheets) for (const n of s) out.push(block * sig + n - 1);
    }
    return out.filter(i => i < pages.length);
  }, [mode, pages, sig]);

  const perView = mode === 'flow' ? 1 : 2;
  const views = Math.max(1, Math.ceil(order.length / perView));
  const cur = Math.min(spread, views - 1);
  const visible = order.slice(cur * perView, cur * perView + perView);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (editing) return;
      if (e.key === 'ArrowRight') setSpread(s => Math.min(views - 1, s + 1));
      if (e.key === 'ArrowLeft') setSpread(s => Math.max(0, s - 1));
      if (e.key === 'Escape') patchUi({ modal: null });
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [views, editing, patchUi]);

  if (!doc || !colors) return null;

  /** Собирает правки со всех страниц обратно в документ. */
  const commitEdits = () => {
    if (!pagesRef.current) return;
    const edited = new Map<number, string>();
    pagesRef.current.querySelectorAll<HTMLElement>('[data-page]').forEach(el => {
      edited.set(Number(el.dataset.page), el.innerHTML);
    });
    if (!edited.size) return;
    const merged = pages.map((p, i) => edited.get(i) ?? p).join('');
    editor()?.commitHTML(merged);
    setHtml(merged, true);
    setRev(r => r + 1);
  };

  const stopEditing = () => { commitEdits(); setEditing(false); };

  const cfg: PrintConfig = {
    mode: mode === 'flow' ? 'doc' : mode, style: 'screen',
    cover: true, toc: false, binding: 'left', notebookSize: sig,
  };

  const getPdf = async () => {
    commitEdits();
    setBusy(true);
    try { await downloadPdf({ ...doc, html: pages.join('') }, colors, cfg); }
    catch (e) { console.error(e); alert('Не удалось собрать PDF — используйте «Печать».'); }
    setBusy(false);
  };

  return (
    <div className="modal-veil" onMouseDown={e => { if (e.target === e.currentTarget) { commitEdits(); patchUi({ modal: null }); } }}>
      <div className="modal preview-modal">
        <div className="modal-head">
          <BookOpen size={16} style={{ color: 'var(--sf-accent)' }} />
          <b style={{ fontSize: 15 }}>Предпросмотр — {doc.title}</b>
          <div className="row" style={{ marginLeft: 'auto', gap: 4 }}>
            <button className={`dock-btn ${mode === 'book' ? 'on' : ''}`} onClick={() => { setMode('book'); setSpread(0); }}><BookOpen /> Книга</button>
            <button className={`dock-btn ${mode === 'notebook' ? 'on' : ''}`} onClick={() => { setMode('notebook'); setSpread(0); }}><Notebook /> Тетрадь</button>
            <button className={`dock-btn ${mode === 'flow' ? 'on' : ''}`} onClick={() => { setMode('flow'); setSpread(0); }}><FileText /> Лента</button>
            <button className="tb-btn" onClick={() => { commitEdits(); patchUi({ modal: null }); }}><X size={15} /></button>
          </div>
        </div>

        <div className="preview-bar">
          <button className={`btn sm ${editing ? 'acc' : ''}`} onClick={() => editing ? stopEditing() : setEditing(true)}>
            {editing ? <><Check /> Применить правки</> : <><Pencil /> Редактировать в развороте</>}
          </button>
          {mode === 'notebook' && (
            <div className="row" style={{ gap: 5 }}>
              <Scissors size={12} style={{ opacity: .55 }} />
              <span style={{ fontSize: 11, color: 'var(--sf-muted)' }}>Тетрадь:</span>
              {[8, 12, 16, 32].map(n => (
                <button key={n} className="chip" style={sig === n ? { borderColor: 'var(--sf-accent)', color: '#fff' } : {}}
                  onClick={() => { setSig(n); setSpread(0); }}>{n}</button>
              ))}
            </div>
          )}
          <span style={{ fontSize: 11, color: 'var(--sf-muted)', marginLeft: 'auto' }}>
            {pages.length} стр. · {fmt.name} · {editing ? 'правьте текст прямо на странице' : `разворот ${cur + 1} из ${views}`}
          </span>
        </div>

        <div className="modal-body preview-body">
          <button className="page-nav left" disabled={cur === 0} onClick={() => setSpread(s => Math.max(0, s - 1))}><ChevronLeft size={18} /></button>

          <div ref={pagesRef} className={`spread ${mode}`}>
            {visible.map((pi, k) => (
              <div key={`${pi}-${k}-${rev}`} className={`book-page ${mode === 'book' && k === 0 ? 'lp' : 'rp'}`}
                style={{ width: pageW, height: pageH, background: colors.paper, color: colors.ink }}>
                <div
                  data-page={pi}
                  className="book-page-body"
                  style={pageStyle}
                  contentEditable={editing}
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: pages[pi] ?? '' }}
                />
                <div className="book-page-no" style={{ color: colors.accent }}>{pi + 1}</div>
              </div>
            ))}
            {mode === 'book' && visible.length === 1 && (
              <div className="book-page rp empty" style={{ width: pageW, height: pageH, background: colors.paper }} />
            )}
          </div>

          <button className="page-nav right" disabled={cur >= views - 1} onClick={() => setSpread(s => Math.min(views - 1, s + 1))}><ChevronRight size={18} /></button>
        </div>

        <div className="modal-foot">
          <span style={{ fontSize: 11, color: 'var(--sf-muted)', marginRight: 'auto' }}>
            {mode === 'notebook'
              ? `Порядок страниц пересчитан для сшивки по ${sig}. Печатайте двусторонне и сгибайте пополам.`
              : '← → листают развороты. Правки в развороте сохраняются в основной текст.'}
          </span>
          <button className="btn" onClick={() => { commitEdits(); patchUi({ modal: 'export' }); }}><Printer /> К экспорту</button>
          <button className="btn acc" onClick={getPdf} disabled={busy} style={{ minWidth: 150 }}>
            {busy ? <Loader2 size={14} className="spin" /> : <CloudDownload />}
            {busy ? 'Собираю…' : 'Скачать PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
