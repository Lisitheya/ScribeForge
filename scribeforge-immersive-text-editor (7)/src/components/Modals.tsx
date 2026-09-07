// ─── Модальные окна: Экспорт/Книга, Шаблоны, Версии, Тег клипа ──────────────
import { useMemo, useState } from 'react';
import {
  X, Printer, BookOpen, FileText, Braces, FileDown, Notebook, AlignStartVertical,
  History, RotateCcw, Landmark, MousePointerClick, Layers, CloudDownload, Loader2,
  Table2, Settings as SettingsIcon, Trash2, Archive, Upload, MonitorDown, CheckCircle2,
} from 'lucide-react';
import { usePwaInstall } from '../usePwa';
import { useStore, useActiveDoc, activePaletteColors } from '../store';
import { TEMPLATES } from '../data/templates';
import { SKINS } from '../data/skins';
import { editor } from '../editorBus';
import { fmtDate } from '../utils/text';
import {
  exportTxt, exportMd, exportHtmlFile, exportDoc, exportMscr,
  notebookOrder, download,
  type PrintConfig, type PdfMode,
} from '../utils/export';
import { printToPdf } from '../utils/pdf';
import BookPreview from './BookPreview';
import { CLIP_TAGS, type ClipTag } from '../types';

export default function Modals() {
  const modal = useStore(s => s.ui.modal);
  if (!modal) return null;
  if (modal === 'preview') return <BookPreview />;
  return (
    <div className="modal-veil" onMouseDown={e => { if (e.target === e.currentTarget) useStore.getState().patchUi({ modal: null }); }}>
      {modal === 'export' && <ExportModal />}
      {modal === 'templates' && <TemplatesModal />}
      {modal === 'versions' && <VersionsModal />}
      {modal === 'clipTag' && <ClipTagModal />}
      {modal === 'table' && <TableModal />}
      {modal === 'settings' && <SettingsModal />}
    </div>
  );
}

const close = () => useStore.getState().patchUi({ modal: null });

/* ═══ Экспорт / Книга ═══ */
function ExportModal() {
  const doc = useActiveDoc();
  const colors = useStore(s => activePaletteColors(s.docs, s.customPalettes, s.activeId));
  const [tab, setTab] = useState<'pdf' | 'files'>('pdf');
  const [mode, setMode] = useState<PdfMode>('doc');
  const [style, setStyle] = useState<'screen' | 'clean'>('screen');
  const [cover, setCover] = useState(true);
  const [toc, setToc] = useState(false);
  const [binding, setBinding] = useState<'left' | 'right'>('left');
  const [notebookSize, setNotebookSize] = useState(16);
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: -22, y: 10 });
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState(false);

  const quickPdf = async () => {
    if (!doc || !colors) return;
    setPdfBusy(true); setPdfErr(false);
    try {
      await printToPdf(doc, colors, cfg);
    } catch (e) {
      console.error(e);
      setPdfErr(true);
    }
    setPdfBusy(false);
  };

  const hint = pdfErr
    ? 'Печать недоступна в этом окне — сохраните HTML и откройте его в браузере.'
    : 'Откроется диалог печати: выберите «Сохранить как PDF». Вектор, кириллица, точные страницы.';

  if (!doc || !colors) return null;

  const cfg: PrintConfig = { mode, style, cover, toc, binding, notebookSize };
  const spreads = notebookOrder(notebookSize);

  const MODES: { id: PdfMode; name: string; desc: string; icon: any }[] = [
    { id: 'doc', name: 'Документ', desc: 'Классическая печать сверху вниз', icon: FileText },
    { id: 'book', name: 'Книга', desc: 'Титул, зеркальные поля, главы с новой страницы', icon: BookOpen },
    { id: 'notebook', name: 'Тетрадь', desc: 'Порядок страниц для сшивки', icon: Notebook },
    { id: 'scroll', name: 'Свиток', desc: 'Непрерывная лента без разрывов', icon: AlignStartVertical },
  ];

  return (
    <div className="modal" style={{ width: 'min(880px, 100%)' }}>
      <div className="modal-head">
        <Printer size={16} style={{ color: 'var(--sf-accent)' }} />
        <b style={{ fontSize: 15 }}>Экспорт — {doc.title}</b>
        <div className="row" style={{ marginLeft: 'auto' }}>
          <button className={`dock-btn ${tab === 'pdf' ? 'on' : ''}`} onClick={() => setTab('pdf')}>PDF / Печать</button>
          <button className={`dock-btn ${tab === 'files' ? 'on' : ''}`} onClick={() => setTab('files')}>Файлы</button>
          <button className="tb-btn" onClick={close}><X size={15} /></button>
        </div>
      </div>

      <div className="modal-body">
        {tab === 'pdf' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 18 }}>
            <div>
              <div className="lbl">Режим</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {MODES.map(m => (
                  <div key={m.id} className={`opt ${mode === m.id ? 'on' : ''}`} onClick={() => setMode(m.id)}>
                    <div className="row" style={{ gap: 7 }}><m.icon size={14} style={{ color: 'var(--sf-accent)' }} /><span className="o-t">{m.name}</span></div>
                    <div className="o-d">{m.desc}</div>
                  </div>
                ))}
              </div>

              <div className="lbl" style={{ marginTop: 14 }}>Стиль</div>
              <div className="row">
                <button className="chip" style={style === 'screen' ? { borderColor: 'var(--sf-accent)', color: '#fff' } : {}} onClick={() => setStyle('screen')}>Как на экране</button>
                <button className="chip" style={style === 'clean' ? { borderColor: 'var(--sf-accent)', color: '#fff' } : {}} onClick={() => setStyle('clean')}>Чистовик (Times 12, 1.5)</button>
              </div>

              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
                <label className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5 }}>Титульный лист</span>
                  <button className={`sw ${cover ? 'on' : ''}`} onClick={() => setCover(!cover)} />
                </label>
                <label className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5 }}>Содержание (сборка из заголовков)</span>
                  <button className={`sw ${toc ? 'on' : ''}`} onClick={() => setToc(!toc)} />
                </label>
                {mode === 'book' && (
                  <label className="row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5 }}>Переплёт</span>
                    <div className="row">
                      <button className="chip" style={binding === 'left' ? { borderColor: 'var(--sf-accent)', color: '#fff' } : {}} onClick={() => setBinding('left')}>Слева</button>
                      <button className="chip" style={binding === 'right' ? { borderColor: 'var(--sf-accent)', color: '#fff' } : {}} onClick={() => setBinding('right')}>Справа</button>
                    </div>
                  </label>
                )}
                {mode === 'notebook' && (
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5 }}>Страниц в тетради</span>
                    <div className="row">
                      {[8, 12, 16, 32].map(n => (
                        <button key={n} className="chip" style={notebookSize === n ? { borderColor: 'var(--sf-accent)', color: '#fff' } : {}} onClick={() => setNotebookSize(n)}>{n}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {mode === 'notebook' && (
                <div className="card" style={{ marginTop: 12, fontSize: 11, lineHeight: 1.7, color: 'var(--sf-muted)', maxHeight: 120, overflow: 'auto' }}>
                  <b style={{ color: '#ddd' }}>Порядок страниц для сшивки:</b>
                  {spreads.map((s, i) => (
                    <div key={i}>Лист {i + 1}: [{s.slice(0, 2).join(' · ')}] / [{s.slice(2).join(' · ')}]</div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="lbl">Предпросмотр переплёта <MousePointerClick size={11} style={{ verticalAlign: -2 }} /></div>
              <div className="book-stage"
                onMouseMove={e => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTilt({ x: -22 + ((e.clientX - r.left) / r.width - .5) * 24, y: 10 - ((e.clientY - r.top) / r.height - .5) * 14 });
                }}
                onMouseLeave={() => setTilt({ x: -22, y: 10 })}>
                <div className="book" style={{ transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)` }}
                  onClick={() => setFlipped(f => !f)}>
                  <div className="b-face b-back" />
                  <div className="b-spine" />
                  <div className="b-pages" />
                  <div className="b-face b-front">
                    <div style={{ fontSize: 8, letterSpacing: '.35em', color: 'var(--sf-accent)', textTransform: 'uppercase' }}>ScribeForge</div>
                    <div className="book-title">{doc.title}</div>
                    <div style={{ width: 46, height: 2, background: 'var(--sf-accent)' }} />
                    <div style={{ fontSize: 8.5, opacity: .6 }}>{new Date().getFullYear()}</div>
                  </div>
                  {mode !== 'scroll' && (
                    <div className={`book-flip ${flipped ? 'flipped' : ''}`}>
                      <b style={{ fontSize: 10 }}>{doc.title}</b>
                      <div style={{ margin: '8px 0', height: 1, background: '#c9c0a8' }} />
                      {doc.title && <DummyLines />}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--sf-muted)', marginTop: 4 }}>
                Нажмите на книгу, чтобы перевернуть страницу · ведите мышью для наклона
              </div>
            </div>
          </div>
        )}

        {tab === 'files' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            {[
              { n: 'Word (.doc)', d: 'Открывается в Word/LibreOffice', ic: FileText, act: () => exportDoc(doc) },
              { n: 'Markdown (.md)', d: 'Для блогов и GitHub', ic: Braces, act: () => exportMd(doc) },
              { n: 'Текст (.txt)', d: 'Чистый текст без стилей', ic: FileText, act: () => exportTxt(doc) },
              { n: 'HTML (.html)', d: 'Сохраняет палитру и стили', ic: Braces, act: () => exportHtmlFile(doc, colors) },
              { n: 'Файл .mscr', d: 'Формат ScribeForge: текст + стиль + версии', ic: FileDown, act: () => exportMscr(doc) },
            ].map(c => (
              <div className="card" key={c.n} style={{ cursor: 'pointer' }} onClick={() => { c.act(); }}>
                <c.ic size={18} style={{ color: 'var(--sf-accent)', marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.n}</div>
                <div style={{ fontSize: 11, color: 'var(--sf-muted)', marginTop: 4 }}>{c.d}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {tab === 'pdf' && (
        <div className="modal-foot">
          <span style={{ fontSize: 11, color: 'var(--sf-muted)', marginRight: 'auto' }}>{hint}</span>
          <button className="btn" onClick={() => useStore.getState().patchUi({ modal: 'preview' })}><BookOpen /> Предпросмотр</button>
          <button className="btn acc" onClick={quickPdf} disabled={pdfBusy} style={{ minWidth: 160 }}>
            {pdfBusy ? <Loader2 size={14} className="spin" /> : <CloudDownload />}
            {pdfBusy ? 'Готовлю…' : 'Сохранить в PDF'}
          </button>
        </div>
      )}
    </div>
  );
}

const DummyLines = () => (
  <div>
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} style={{ height: 3, background: '#bdb49a', borderRadius: 2, margin: '7px 0', width: `${88 - (i % 3) * 12}%` }} />
    ))}
  </div>
);

/* ═══ Шаблоны ═══ */
function TemplatesModal() {
  const createDoc = useStore(s => s.createDoc);
  const doc = useActiveDoc();
  const [title, setTitle] = useState('');
  const [group, setGroup] = useState<string>('all');
  const currentSkin = doc?.skin ?? 'scriptorium';

  const groups = [
    { id: 'all', n: 'Все' }, { id: currentSkin, n: `Для «${SKINS[currentSkin].name}»` },
    { id: 'scriptorium', n: 'Средневековье' }, { id: 'cyberpunk', n: 'Киберпанк' },
    { id: 'kawaii', n: 'Кавай' }, { id: 'typewriter', n: 'Машинка' },
  ];
  const list = TEMPLATES.filter(t => group === 'all' || t.skin === group || (t.skin === 'any' && group === currentSkin));

  return (
    <div className="modal">
      <div className="modal-head">
        <Layers size={16} style={{ color: 'var(--sf-accent)' }} />
        <b style={{ fontSize: 15 }}>Новый проект</b>
        <button className="tb-btn" style={{ marginLeft: 'auto' }} onClick={close}><X size={15} /></button>
      </div>
      <div className="modal-body">
        <input className="input" placeholder="Название проекта (необязательно)" value={title} onChange={e => setTitle(e.target.value)} style={{ marginBottom: 12 }} />
        <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {groups.map(g => (
            <button key={g.id} className="chip" style={group === g.id ? { borderColor: 'var(--sf-accent)', color: '#fff' } : {}} onClick={() => setGroup(g.id)}>{g.n}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {list.map(t => (
            <div className="card" key={t.id} style={{ cursor: 'pointer' }}
              onClick={() => { createDoc(t.id, title || undefined); close(); }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{t.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--sf-muted)', marginTop: 4, lineHeight: 1.4 }}>{t.desc}</div>
              <span className="chip" style={{ marginTop: 8, fontSize: 9 }}>{t.skin === 'any' ? 'универсальный' : t.skin}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ Версии ═══ */
function VersionsModal() {
  const doc = useActiveDoc();
  const snapshot = useStore(s => s.snapshot);
  const restoreVersion = useStore(s => s.restoreVersion);
  if (!doc) return null;
  return (
    <div className="modal">
      <div className="modal-head">
        <History size={16} style={{ color: 'var(--sf-accent)' }} />
        <b style={{ fontSize: 15 }}>История версий — {doc.title}</b>
        <button className="tb-btn" style={{ marginLeft: 'auto' }} onClick={close}><X size={15} /></button>
      </div>
      <div className="modal-body">
        <button className="btn acc block" onClick={() => snapshot()}><RotateCcw size={14} style={{ transform: 'scaleX(-1)' }} /> Сделать снимок сейчас</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {doc.versions.map(v => (
            <div className="card row" key={v.ts} style={{ padding: '10px 13px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{v.note}</div>
                <div style={{ fontSize: 10.5, color: 'var(--sf-muted)', marginTop: 2 }}>{fmtDate(v.ts)} · {v.words.toLocaleString('ru')} слов</div>
              </div>
              <button className="btn sm" onClick={() => { restoreVersion(v.ts); close(); }}>Восстановить</button>
            </div>
          ))}
          {!doc.versions.length && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--sf-muted)', padding: 22 }}>
              Снимков пока нет. Ctrl+S — сохранить версию. Автоснимки делаются, когда догорает «Свеча».
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ Тег клипа ═══ */
function ClipTagModal() {
  const addClip = useStore(s => s.addClip);
  const text = useMemo(() => editor()?.getSelectionText() ?? '', []);
  return (
    <div className="modal" style={{ width: 'min(460px, 100%)' }}>
      <div className="modal-head">
        <Landmark size={16} style={{ color: 'var(--sf-accent)' }} />
        <b style={{ fontSize: 15 }}>Сохранить как важный момент</b>
        <button className="tb-btn" style={{ marginLeft: 'auto' }} onClick={close}><X size={15} /></button>
      </div>
      <div className="modal-body">
        <div className="clip-text" style={{ fontStyle: 'italic', marginBottom: 14, padding: 10, borderLeft: '3px solid var(--sf-accent)', background: 'rgba(255,255,255,.03)', borderRadius: 8 }}>
          {text || '—'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(Object.keys(CLIP_TAGS) as ClipTag[]).map(t => (
            <button key={t} className="opt row" style={{ justifyContent: 'center', gap: 8 }}
              onClick={() => { addClip(text, t); close(); useStore.getState().patchUi({ left: 'clips' }); }}>
              <i style={{ width: 10, height: 10, borderRadius: 3, background: CLIP_TAGS[t].color }} />
              <span style={{ fontSize: 12.5 }}>{CLIP_TAGS[t].name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ Таблица: размеры и оформление ═══ */
function TableModal() {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [style, setStyle] = useState<'grid' | 'lines' | 'min'>('grid');
  const [header, setHeader] = useState(true);
  const [width, setWidth] = useState(100);

  const STYLES = [
    { id: 'grid' as const, n: 'Сетка', d: 'Все границы видны' },
    { id: 'lines' as const, n: 'Строки', d: 'Только горизонтальные линии' },
    { id: 'min' as const, n: 'Минимальная', d: 'Подчёркнута шапка и низ' },
  ];
  const PRESETS = [
    { n: 'План 2×6', r: 6, c: 2 }, { n: 'Сравнение 4×3', r: 3, c: 4 },
    { n: 'Табель 7×7', r: 7, c: 7 }, { n: 'Сводка 5×5', r: 5, c: 5 },
  ];

  const insert = () => {
    let body = '';
    for (let r = 0; r < rows; r++) {
      const cells = Array.from({ length: cols }, () =>
        r === 0 && header ? '<th>—</th>' : '<td>&nbsp;</td>').join('');
      body += `<tr>${cells}</tr>`;
    }
    editor()?.insertHTML(
      `<table class="sf-table st-${style}" style="width:${width}%">${body}</table><p></p>`);
    close();
  };

  return (
    <div className="modal" style={{ width: 'min(520px, 100%)' }}>
      <div className="modal-head">
        <Table2 size={16} style={{ color: 'var(--sf-accent)' }} />
        <b style={{ fontSize: 15 }}>Вставить таблицу</b>
        <button className="tb-btn" style={{ marginLeft: 'auto' }} onClick={close}><X size={15} /></button>
      </div>
      <div className="modal-body">
        <div className="row" style={{ gap: 16, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div className="lbl">Строк — {rows}</div>
            <div className="row">
              <input type="range" min={1} max={16} value={rows} onChange={e => setRows(+e.target.value)} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="lbl">Столбцов — {cols}</div>
            <div className="row">
              <input type="range" min={1} max={10} value={cols} onChange={e => setCols(+e.target.value)} />
            </div>
          </div>
        </div>

        {/* визуальный предпросмотр сетки */}
        <div style={{ display: 'grid', gap: 3, marginBottom: 14, maxWidth: 280,
                      gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: rows * cols }).map((_, i) => (
            <div key={i} style={{ height: 12, borderRadius: 2,
              background: i < cols && header ? 'var(--sf-accent)' : 'rgba(255,255,255,.16)' }} />
          ))}
        </div>

        <div className="lbl">Оформление</div>
        <div className="opt-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 14 }}>
          {STYLES.map(s => (
            <div key={s.id} className={`opt ${style === s.id ? 'on' : ''}`} onClick={() => setStyle(s.id)}>
              <div className="o-t">{s.n}</div><div className="o-d">{s.d}</div>
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12.5 }}>Строка-заголовок</span>
          <button className={`sw ${header ? 'on' : ''}`} onClick={() => setHeader(!header)} />
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5 }}>Ширина таблицы</span>
          <div className="row">
            {[50, 75, 100].map(w => (
              <button key={w} className="chip" style={width === w ? { borderColor: 'var(--sf-accent)', color: '#fff' } : {}} onClick={() => setWidth(w)}>{w}%</button>
            ))}
          </div>
        </div>

        <div className="lbl" style={{ marginTop: 16 }}>Быстрые заготовки</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {PRESETS.map(p => (
            <button key={p.n} className="chip" onClick={() => { setRows(p.r); setCols(p.c); }}>{p.n}</button>
          ))}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={close}>Отмена</button>
        <button className="btn acc" onClick={insert}><Table2 /> Вставить {rows}×{cols}</button>
      </div>
    </div>
  );
}

/* ═══ Настройки ═══ */
function SettingsModal() {
  const settings = useStore(s => s.settings);
  const patchSettings = useStore(s => s.patchSettings);
  const importRef = { current: null as HTMLInputElement | null };
  const [tab, setTab] = useState<'editor' | 'view' | 'data'>('editor');
  const pwa = usePwaInstall();

  type Row = { n: string; d: string; k: keyof typeof settings };
  const GROUPS: Record<string, Row[]> = {
    editor: [
      { n: 'Системная орфография', d: 'Красное подчёркивание браузерного словаря', k: 'spellcheck' },
      { n: 'Проверка на лету', d: 'Отмечать повторы и пунктуацию во время набора', k: 'liveCheck' },
      { n: 'Строгая машинистка', d: 'Backspace зачёркивает литеру вместо удаления', k: 'strictTypewriter' },
      { n: 'Звук клавиш', d: 'Механический щелчок при наборе (скин «Машинка»)', k: 'typeSound' },
      { n: 'Красная строка', d: 'Абзацный отступ в первой строке абзаца', k: 'paraIndent' },
      { n: 'Выключка по ширине', d: 'Выравнивать текст по обоим краям листа', k: 'justify' },
    ],
    view: [
      { n: 'Авто-ночь', d: 'Следовать системной тёмной теме', k: 'autoNight' },
      { n: 'Эконом-режим', d: 'Отключить анимации и эффекты (слабые устройства)', k: 'reducedFx' },
      { n: 'Письмо с дислексией', d: 'Увеличенные интервалы и мягкий фон', k: 'dyslexia' },
      { n: 'Тень краёв листа', d: 'Объёмная стопка страниц под листом', k: 'showPageEdge' },
      { n: 'Заметки при открытии', d: 'Показывать окно заметок при входе в проект', k: 'notesOnStart' },
    ],
    data: [
      { n: 'Авто-снимки версий', d: 'Периодически сохранять версию рукописи', k: 'autoSnapshot' },
      { n: 'Подтверждать удаление', d: 'Спрашивать перед удалением проекта', k: 'confirmDelete' },
    ],
  };

  return (
    <div className="modal" style={{ width: 'min(600px, 100%)' }}>
      <div className="modal-head">
        <SettingsIcon size={16} style={{ color: 'var(--sf-accent)' }} />
        <b style={{ fontSize: 15 }}>Настройки мастерской</b>
        <div className="row" style={{ marginLeft: 'auto', gap: 3 }}>
          <button className={`dock-btn ${tab === 'editor' ? 'on' : ''}`} onClick={() => setTab('editor')}>Редактор</button>
          <button className={`dock-btn ${tab === 'view' ? 'on' : ''}`} onClick={() => setTab('view')}>Вид</button>
          <button className={`dock-btn ${tab === 'data' ? 'on' : ''}`} onClick={() => setTab('data')}>Данные</button>
          <button className="tb-btn" onClick={close}><X size={15} /></button>
        </div>
      </div>
      <div className="modal-body">
        {GROUPS[tab].map(r => (
          <div className="row" key={r.k} style={{ justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ paddingRight: 14 }}>
              <div style={{ fontSize: 13 }}>{r.n}</div>
              <div style={{ fontSize: 10.5, color: 'var(--sf-muted)', marginTop: 2 }}>{r.d}</div>
            </div>
            <button className={`sw ${settings[r.k] ? 'on' : ''}`} onClick={() => patchSettings({ [r.k]: !settings[r.k] } as any)} />
          </div>
        ))}

        {tab === 'data' && (
          <div style={{ padding: '14px 0 6px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>Интервал авто-снимка</span>
              <b style={{ fontSize: 13 }}>{settings.snapshotMin} мин</b>
            </div>
            <input type="range" min={2} max={60} step={1} value={settings.snapshotMin}
              onChange={e => patchSettings({ snapshotMin: +e.target.value })} style={{ marginTop: 8 }} />
          </div>
        )}

        {tab === 'editor' && (
          <div style={{ padding: '14px 0 6px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>Цель по авторским листам</span>
              <b style={{ fontSize: 13 }}>{settings.authorGoal}</b>
            </div>
            <input type="range" min={1} max={50} value={settings.authorGoal}
              onChange={e => patchSettings({ authorGoal: +e.target.value })} style={{ marginTop: 8 }} />
          </div>
        )}

        {tab === 'view' && (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div style={{ paddingRight: 12 }}>
                <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MonitorDown size={14} style={{ color: 'var(--sf-accent)' }} /> Установить приложение
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--sf-muted)', marginTop: 4, lineHeight: 1.5 }}>
                  {pwa.installed
                    ? 'ScribeForge уже установлен и работает как отдельное приложение.'
                    : pwa.canInstall
                      ? 'Отдельное окно, ярлык в системе и полная работа офлайн.'
                      : 'Доступно при открытии по http(s). В браузере: меню → «Установить приложение».'}
                </div>
              </div>
              {pwa.installed
                ? <span className="chip" style={{ borderColor: '#4ade80', color: '#4ade80' }}><CheckCircle2 size={11} /> Готово</span>
                : <button className="btn acc sm" disabled={!pwa.canInstall} onClick={() => pwa.install()}>Установить</button>}
            </div>
          </div>
        )}

        <div className="lbl" style={{ marginTop: 16, display: tab === 'data' ? undefined : 'none' }}>Данные (всё хранится локально)</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8, display: tab === 'data' ? undefined : 'none' }}>
          <button className="btn sm" onClick={() => {
            const st = useStore.getState();
            download('scribeforge-архив.sfpack', JSON.stringify({
              app: 'ScribeForge-pack', ver: 1, docs: st.docs, clips: st.clips,
              customPalettes: st.customPalettes, counters: st.counters, dict: st.dict, settings: st.settings,
            }, null, 2), 'application/json');
          }}><Archive /> Экспорт архива</button>
          <button className="btn sm" onClick={() => (importRef as any).current?.click()}><Upload /> Импорт архива</button>
          <button className="btn sm" style={{ marginLeft: 'auto', color: '#f87171', borderColor: '#f8717155' }}
            onClick={() => {
              if (confirm('Удалить ВСЕ проекты, клипы и настройки безвозвратно?')) {
                localStorage.removeItem('scribeforge-v1');
                location.reload();
              }
            }}><Trash2 /> Сбросить всё</button>
        </div>
        <input ref={(el) => { (importRef as any).current = el; }} hidden type="file" accept=".sfpack,.json" onChange={e => {
          const f = e.target.files?.[0];
          if (f) {
            const rd = new FileReader();
            rd.onload = () => {
              try {
                const j = JSON.parse(String(rd.result));
                if (j.app === 'ScribeForge-pack') useStore.getState().importDocs(j.docs ?? []);
              } catch { alert('Файл не прочитан'); }
            };
            rd.readAsText(f);
          }
          e.target.value = '';
        }} />
      </div>
    </div>
  );
}
