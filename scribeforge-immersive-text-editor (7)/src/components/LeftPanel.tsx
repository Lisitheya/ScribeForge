// ─── Левая панель: Библиотека / Важные моменты / Доска глав ─────────────────
import { useMemo, useRef, useState } from 'react';
import {
  Library, Landmark, ListTree, Plus, Search, Trash2, Copy, FileDown, Pin, PinOff,
  CornerDownLeft, ChevronUp, ChevronDown, X, Archive, Upload, Tag,
} from 'lucide-react';
import { useStore } from '../store';
import type { LeftTab, ClipTag } from '../types';
import { CLIP_TAGS } from '../types';
import { computeStats, extractChapters, fmtDate, reorderChapters } from '../utils/text';
import { PALETTES, SKINS } from '../data/skins';
import { editor } from '../editorBus';
import { exportMscr } from '../utils/export';
import type { ChapterLabel } from '../types';

const LABEL_COLOR: Record<ChapterLabel, string> = { draft: '#d9a520', done: '#3ba55d', rewrite: '#e0483e' };

export default function LeftPanel() {
  const ui = useStore(s => s.ui);
  const patchUi = useStore(s => s.patchUi);
  const tab = ui.overlay === 'left' ? (ui.left ?? 'library') : ui.left;
  if (!tab) return null;

  const setTab = (t: LeftTab) => patchUi({ left: t });

  return (
    <div className="panel left" style={{ width: ui.leftW }}>
      <div className="panel-grip" onPointerDown={e => {
        const startX = e.clientX, startW = ui.leftW;
        const move = (ev: PointerEvent) => patchUi({ leftW: Math.min(420, Math.max(200, startW + ev.clientX - startX)) });
        const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
        document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
      }} />
      <div className="panel-tabs">
        <button className={`ptab ${tab === 'library' ? 'on' : ''}`} onClick={() => setTab('library')}><Library />Библиотека</button>
        <button className={`ptab ${tab === 'clips' ? 'on' : ''}`} onClick={() => setTab('clips')}><Landmark />Важные</button>
        <button className={`ptab ${tab === 'chapters' ? 'on' : ''}`} onClick={() => setTab('chapters')}><ListTree />Главы</button>
      </div>
      <div className="panel-body">
        {tab === 'library' && <LibraryTab />}
        {tab === 'clips' && <ClipsTab />}
        {tab === 'chapters' && <ChaptersTab />}
      </div>
    </div>
  );
}

/* ─── Библиотека проектов ──────────────────────────────────────────────────── */
function LibraryTab() {
  const docs = useStore(s => s.docs);
  const activeId = useStore(s => s.activeId);
  const customs = useStore(s => s.customPalettes);
  const openDoc = useStore(s => s.openDoc);
  const deleteDoc = useStore(s => s.deleteDoc);
  const duplicateDoc = useStore(s => s.duplicateDoc);
  const patchUi = useStore(s => s.patchUi);
  const importDocs = useStore(s => s.importDocs);
  const [q, setQ] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() =>
    docs.filter(d => !q || d.title.toLowerCase().includes(q.toLowerCase()) || d.tags.some(t => t.toLowerCase().includes(q.toLowerCase()))),
    [docs, q]);

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Проекты</span>
        <span className="chip">{docs.length}</span>
        <button className="tb-btn panel-close" title="Закрыть" onClick={() => patchUi({ left: null, overlay: null })}><X size={14} /></button>
      </div>

      <button className="btn acc block" onClick={() => patchUi({ modal: 'templates' })}><Plus /> Новый проект</button>

      <div className="row" style={{ margin: '10px 0' }}>
        <Search size={13} style={{ opacity: .5, flex: 'none' }} />
        <input className="input" placeholder="Поиск по названию или тегу" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(d => {
          const stats = computeStats(d.html);
          const pal = customs.find(p => p.id === d.paletteId) ?? PALETTES.find(p => p.id === d.paletteId) ?? PALETTES[0];
          return (
            <div key={d.id} className={`doc-card ${d.id === activeId ? 'active' : ''}`} onClick={() => { openDoc(d.id); patchUi({ overlay: null }); }}>
              <div className="doc-sw" style={{ background: pal.colors.paper, borderTop: `3px solid ${pal.colors.accent}` }} />
              <div className="doc-meta">
                <div className="doc-title">{d.title}</div>
                <div className="doc-sub">{SKINS[d.skin].name} · {stats.words} сл. · {fmtDate(d.updatedAt)}</div>
                {d.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                    {d.tags.slice(0, 3).map(t => <span className="chip" key={t}><Tag size={9} />{t}</span>)}
                  </div>
                )}
              </div>
              <div className="icrow" onClick={e => e.stopPropagation()}>
                <button className="ic" title="Экспорт .mscr" onClick={() => exportMscr(d)}><FileDown /></button>
                <button className="ic" title="Дублировать" onClick={() => duplicateDoc(d.id)}><Copy /></button>
                <button className="ic" title="Удалить" onClick={() => { if (confirm(`Удалить «${d.title}»?`)) deleteDoc(d.id); }}><Trash2 /></button>
              </div>
            </div>
          );
        })}
        {!filtered.length && <div style={{ fontSize: 12, color: 'var(--sf-muted)', textAlign: 'center', padding: 18 }}>Ничего не найдено</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
        <button className="btn sm" onClick={() => {
          const st = useStore.getState();
          const blob = JSON.stringify({ app: 'ScribeForge-pack', ver: 1, docs: st.docs, clips: st.clips, customPalettes: st.customPalettes, counters: st.counters, dict: st.dict }, null, 2);
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([blob], { type: 'application/json' }));
          a.download = 'scribeforge-архив.sfpack'; a.click();
        }}><Archive /> Экспорт архива</button>
        <button className="btn sm" onClick={() => fileRef.current?.click()}><Upload /> Импорт</button>
      </div>
      <input ref={fileRef} hidden type="file" accept=".mscr,.sfpack,.json" onChange={e => {
        const f = e.target.files?.[0];
        if (f) {
          const rd = new FileReader();
          rd.onload = () => {
            try {
              const j = JSON.parse(String(rd.result));
              if (j.app === 'ScribeForge-pack') importDocs(j.docs ?? []);
              else if (j.app === 'ScribeForge' && j.doc) importDocs([j.doc]);
            } catch { alert('Файл не прочитан'); }
          };
          rd.readAsText(f);
        }
        e.target.value = '';
      }} />
    </>
  );
}

/* ─── Важные моменты ───────────────────────────────────────────────────────── */
function ClipsTab() {
  const clips = useStore(s => s.clips);
  const docs = useStore(s => s.docs);
  const activeId = useStore(s => s.activeId);
  const pinned = useStore(s => s.pinned);
  const togglePin = useStore(s => s.togglePin);
  const removeClip = useStore(s => s.removeClip);
  const openDoc = useStore(s => s.openDoc);
  const patchUi = useStore(s => s.patchUi);
  const [tag, setTag] = useState<ClipTag | null>(null);
  const [scope, setScope] = useState<'doc' | 'all'>('doc');

  const list = clips
    .filter(c => (scope === 'all' || c.docId === activeId) && (!tag || c.tag === tag));

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Важные моменты</span>
        <span className="chip">{list.length}</span>
        <button className="tb-btn panel-close" onClick={() => patchUi({ left: null, overlay: null })}><X size={14} /></button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--sf-muted)', marginBottom: 10, lineHeight: 1.5 }}>
        Выделите текст на листе → <b>«Сохранить как важный момент»</b> в пузыре выделения.
      </div>

      <div className="row" style={{ flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
        <button className={`chip ${!tag ? 'on' : ''}`} style={!tag ? { borderColor: 'var(--sf-accent)', color: '#fff' } : {}} onClick={() => setTag(null)}>Все</button>
        {(Object.keys(CLIP_TAGS) as ClipTag[]).map(t => (
          <button key={t} className="chip" onClick={() => setTag(tag === t ? null : t)}
            style={tag === t ? { borderColor: CLIP_TAGS[t].color, color: '#fff' } : {}}>
            <i style={{ width: 7, height: 7, borderRadius: 2, background: CLIP_TAGS[t].color, display: 'inline-block' }} />
            {CLIP_TAGS[t].name}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 10 }}>
        {(['doc', 'all'] as const).map(m => (
          <button key={m} className="chip" style={scope === m ? { borderColor: 'var(--sf-accent)', color: '#fff' } : {}}
            onClick={() => setScope(m)}>{m === 'doc' ? 'Этот документ' : 'Все документы'}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(c => {
          const t = CLIP_TAGS[c.tag];
          const d = docs.find(x => x.id === c.docId);
          return (
            <div className="clip-card" key={c.id} style={{ borderLeftColor: t.color }}>
              <div className="row" style={{ marginBottom: 5 }}>
                <span className="chip" style={{ borderColor: t.color }}><i style={{ width: 7, height: 7, borderRadius: 2, background: t.color, display: 'inline-block' }} />{t.name}</span>
                {scope === 'all' && d && <span style={{ fontSize: 10, color: 'var(--sf-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>}
                <div className="icrow" style={{ marginLeft: 'auto', opacity: 1 }}>
                  <button className="ic" title="Вставить в текст" onClick={() => { if (c.docId !== activeId) openDoc(c.docId); setTimeout(() => editor()?.insertTextAtSaved(c.text), 60); }}><CornerDownLeft /></button>
                  <button className="ic" title={pinned.includes(c.id) ? 'Открепить' : 'Закрепить шпаргалку'} onClick={() => togglePin(c.id)}>
                    {pinned.includes(c.id) ? <PinOff /> : <Pin />}
                  </button>
                  <button className="ic" title="Удалить" onClick={() => removeClip(c.id)}><Trash2 /></button>
                </div>
              </div>
              <div className="clip-text">{c.text}</div>
            </div>
          );
        })}
        {!list.length && <div style={{ fontSize: 12, color: 'var(--sf-muted)', textAlign: 'center', padding: 18 }}>Пока пусто. Сохраняйте лор, факты и цитаты — они всегда под рукой.</div>}
      </div>
    </>
  );
}

/* ─── Доска глав ───────────────────────────────────────────────────────────── */
function ChaptersTab() {
  const doc = useStore(s => s.docs.find(d => d.id === s.activeId) ?? null);
  const setChapterLabel = useStore(s => s.setChapterLabel);
  const commit = useStore(s => s.setHtml);
  const patchUi = useStore(s => s.patchUi);
  const chapters = useMemo(() => (doc ? extractChapters(doc.html) : []), [doc]);

  if (!doc) return null;
  const total = chapters.reduce((a, c) => a + c.words, 0);

  const move = (i: number, dir: -1 | 1) => {
    const editorHtml = editor()?.getHTML();
    const html = editorHtml ?? doc.html;
    editor()?.commitHTML(reorderChapters(html, i, dir));
    if (!editorHtml) commit(reorderChapters(doc.html, i, dir), true);
  };

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Доска глав</span>
        <span className="chip">{chapters.length}</span>
        <button className="tb-btn panel-close" onClick={() => patchUi({ left: null, overlay: null })}><X size={14} /></button>
      </div>

      <button className="btn block" style={{ marginBottom: 10 }} onClick={() => {
        const e = editor();
        if (!e) return;
        const n = chapters.length + 1;
        const html = (e.getHTML() ?? doc.html) + `<h2>Глава ${n}</h2><p><br></p>`;
        e.commitHTML(html);
        requestAnimationFrame(() => e.scrollToChapter(n - 1));
      }}><Plus /> Добавить главу</button>

      <div style={{ fontSize: 11, color: 'var(--sf-muted)', marginBottom: 10, lineHeight: 1.5 }}>
        Главы определяются по заголовкам <b>H1/H2</b> и строкам «Глава…». Метка — цветная точка.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {chapters.map((c, i) => {
          const label = doc.chapterLabels[c.title] as ChapterLabel | undefined;
          return (
            <div className="chap" key={c.title + i}>
              <div className="chap-i">{i + 1}</div>
              <button className="chap-dot" title="Метка: черновик / готово / переписать"
                style={{ background: label ? LABEL_COLOR[label] : 'transparent' }}
                onClick={() => {
                  const order: (ChapterLabel | undefined)[] = [undefined, 'draft', 'done', 'rewrite'];
                  const next = order[(order.indexOf(label) + 1) % order.length];
                  if (next) setChapterLabel(c.title, next);
                  else {
                    const { [c.title]: _, ...rest } = doc.chapterLabels;
                    useStore.getState().patchDoc({ chapterLabels: rest });
                  }
                }} />
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => editor()?.scrollToChapter(i)}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#eee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                <div style={{ fontSize: 10, color: 'var(--sf-muted)', marginTop: 2 }}>
                  {c.words} сл. · {total ? Math.round(c.words / total * 100) : 0}%
                </div>
                <div className="progress" style={{ marginTop: 6 }}><i style={{ width: `${total ? c.words / total * 100 : 0}%` }} /></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button className="ic" onClick={() => move(i, -1)}><ChevronUp /></button>
                <button className="ic" onClick={() => move(i, 1)}><ChevronDown /></button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
