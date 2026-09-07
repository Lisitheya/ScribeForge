// ─── Главная страница: полка проектов с обложками ───────────────────────────
import { useMemo, useRef, useState } from 'react';
import {
  Feather, Plus, Search, ImagePlus, Trash2, Copy, FileDown, ArrowUpRight,
  LibraryBig, Clock3, Archive, Upload, MonitorDown,
} from 'lucide-react';
import { usePwaInstall } from '../usePwa';
import { useStore } from '../store';
import { PALETTES, SKINS } from '../data/skins';
import { computeStats, fmtDate, authorSheets } from '../utils/text';
import { exportMscr } from '../utils/export';
import type { Doc } from '../types';

export default function HomePage() {
  const docs = useStore(s => s.docs);
  const customs = useStore(s => s.customPalettes);
  const openDoc = useStore(s => s.openDoc);
  const deleteDoc = useStore(s => s.deleteDoc);
  const duplicateDoc = useStore(s => s.duplicateDoc);
  const setCover = useStore(s => s.setCover);
  const importDocs = useStore(s => s.importDocs);
  const patchUi = useStore(s => s.patchUi);

  const pwa = usePwaInstall();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'updated' | 'title' | 'words'>('updated');
  const coverInput = useRef<HTMLInputElement>(null);
  const packInput = useRef<HTMLInputElement>(null);
  const coverTarget = useRef<string | null>(null);

  const list = useMemo(() => {
    const filtered = docs.filter(d => !q || d.title.toLowerCase().includes(q.toLowerCase()) || d.tags.some(t => t.includes(q.toLowerCase())));
    return [...filtered].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'ru');
      if (sort === 'words') return computeStats(b.html).words - computeStats(a.html).words;
      return b.updatedAt - a.updatedAt;
    });
  }, [docs, q, sort]);

  const totalWords = useMemo(() => docs.reduce((a, d) => a + computeStats(d.html).words, 0), [docs]);
  const totalSheets = useMemo(() => docs.reduce((a, d) => a + authorSheets(computeStats(d.html).chars), 0), [docs]);

  const pal = (d: Doc) => customs.find(p => p.id === d.paletteId) ?? PALETTES.find(p => p.id === d.paletteId) ?? PALETTES[0];

  return (
    <div className="home">
      {/* шапка */}
      <header className="home-head">
        <div className="brand" style={{ borderRight: 'none' }}>
          <div className="brand-ic"><Feather size={16} /></div>
          <div className="brand-name" style={{ fontSize: 16 }}>SCRIBE<b>FORGE</b></div>
        </div>
        <div className="home-tag">Иммерсивная писательская мастерская · одно окно — одна эпоха</div>
        <div className="home-head-actions">
          {pwa.canInstall && (
            <button className="btn acc sm" title="Установить как приложение" onClick={() => pwa.install()}>
              <MonitorDown /> Установить
            </button>
          )}
          <button className="btn sm" onClick={() => packInput.current?.click()}><Upload /> Импорт</button>
          <button className="btn sm" onClick={() => {
            const st = useStore.getState();
            const blob = JSON.stringify({ app: 'ScribeForge-pack', ver: 1, docs: st.docs, clips: st.clips, customPalettes: st.customPalettes, counters: st.counters, dict: st.dict }, null, 2);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([blob], { type: 'application/json' }));
            a.download = 'scribeforge-архив.sfpack'; a.click();
          }}><Archive /> Архив</button>
        </div>
      </header>

      {/* статистика */}
      <div className="home-stats">
        <div className="home-stat">
          <LibraryBig size={15} style={{ color: 'var(--sf-accent)' }} />
          <div><b>{docs.length}</b><span>{docs.length === 1 ? 'проект' : docs.length < 5 ? 'проекта' : 'проектов'}</span></div>
        </div>
        <div className="home-stat">
          <Clock3 size={15} style={{ color: 'var(--sf-accent)' }} />
          <div><b>{totalWords.toLocaleString('ru')}</b><span>слов написано</span></div>
        </div>
        <div className="home-stat">
          <Feather size={15} style={{ color: 'var(--sf-accent)' }} />
          <div><b>{totalSheets.toFixed(2)}</b><span>авторских листов</span></div>
        </div>

        <div className="home-tools">
          <div className="row" style={{ flex: 1, maxWidth: 300 }}>
            <Search size={13} style={{ opacity: .5, flex: 'none' }} />
            <input className="input" placeholder="Поиск по проектам и тегам" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="input" style={{ width: 150 }} value={sort} onChange={e => setSort(e.target.value as any)}>
            <option value="updated">По дате</option>
            <option value="title">По названию</option>
            <option value="words">По размеру</option>
          </select>
          <button className="btn acc" onClick={() => patchUi({ modal: 'templates' })}><Plus /> Новый проект</button>
        </div>

        </div>

      {/* полка проектов */}
      <div className="proj-grid">
        {list.map(d => {
          const stats = computeStats(d.html);
          const p = pal(d);
          return (
            <article key={d.id} className="proj-card" onClick={() => openDoc(d.id)}>
              <div className="proj-cover" style={d.cover
                ? { backgroundImage: `url(${d.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : {
                    background: `linear-gradient(155deg, ${p.colors.paper} 0%, color-mix(in srgb, ${p.colors.paper} 70%, #000 30%) 100%)`,
                    color: p.colors.ink,
                  }}>
                {!d.cover && (
                  <div className="proj-cover-inner">
                    <div className="proj-cover-glyph" style={{ color: p.colors.accent }}>{SKINS[d.skin].glyph}</div>
                    <div className="proj-cover-title">{d.title}</div>
                    <div className="proj-cover-rule" style={{ background: p.colors.accent }} />
                    <div className="proj-cover-skin">{SKINS[d.skin].name}</div>
                  </div>
                )}
                <div className="proj-actions" onClick={e => e.stopPropagation()}>
                  <button className="ic" title="Загрузить обложку" onClick={() => { coverTarget.current = d.id; coverInput.current?.click(); }}><ImagePlus /></button>
                  <button className="ic" title="Экспорт .mscr" onClick={() => exportMscr(d)}><FileDown /></button>
                  <button className="ic" title="Дублировать" onClick={() => duplicateDoc(d.id)}><Copy /></button>
                  <button className="ic" title="Удалить проект" onClick={() => {
                    if (!useStore.getState().settings.confirmDelete || confirm(`Удалить «${d.title}»?`)) deleteDoc(d.id);
                  }}><Trash2 /></button>
                </div>
              </div>
              <div className="proj-meta">
                <div className="proj-title">{d.title || 'Без названия'}</div>
                <div className="proj-sub">
                  {SKINS[d.skin].name} · {stats.words.toLocaleString('ru')} сл. · {fmtDate(d.updatedAt)}
                  {d.notes?.trim() && <span title="Есть заметки" style={{ color: 'var(--sf-accent)' }}> · ✎</span>}
                </div>
              </div>
              <div className="proj-open"><ArrowUpRight size={13} /></div>
            </article>
          );
        })}

        {/* карточка создания */}
        <button className="proj-card proj-new" onClick={() => patchUi({ modal: 'templates' })}>
          <Plus size={26} />
          <span>Новый проект</span>
          <small>Выбрать эпоху и шаблон</small>
        </button>
      </div>

      {!list.length && docs.length > 0 && (
        <div style={{ textAlign: 'center', color: 'var(--sf-muted)', fontSize: 12.5, padding: '40px 0' }}>По запросу ничего не найдено</div>
      )}
      {!docs.length && (
        <div style={{ textAlign: 'center', color: 'var(--sf-muted)', fontSize: 13, padding: '60px 0' }}>
          <Feather size={34} style={{ opacity: .35, marginBottom: 12 }} />
          <div>Полка пуста. Создайте первый проект — лист уже ждёт своего автора.</div>
        </div>
      )}

      <input ref={coverInput} hidden type="file" accept="image/*" onChange={e => {
        const f = e.target.files?.[0];
        if (f && coverTarget.current) {
          const rd = new FileReader();
          rd.onload = () => setCover(coverTarget.current!, String(rd.result));
          rd.readAsDataURL(f);
        }
        e.target.value = '';
      }} />
      <input ref={packInput} hidden type="file" accept=".mscr,.sfpack,.json" onChange={e => {
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
    </div>
  );
}
