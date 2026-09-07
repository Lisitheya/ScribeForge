// ─── Нижний док: счётчики + инструменты (Оракул, Украшения, Таймер) ─────────
import { useMemo, useState } from 'react';
import {
  Dices, Flower2, Timer, Focus, Landmark, X, Save, Plus, Trash2, CheckCircle2,
  NotebookPen, BookOpen,
} from 'lucide-react';
import { useStore, useActiveDoc } from '../store';
import { SKINS, FORMATS } from '../data/skins';
import { computeStats, pageCount, authorSheets, typePages, printSheets } from '../utils/text';
import Oracle from './Oracle';
import DecorGallery from './DecorGallery';
import TimerCandle, { useCandle } from './TimerCandle';
import type { BottomTool } from '../types';

export default function BottomDock() {
  const doc = useActiveDoc();
  const ui = useStore(s => s.ui);
  const patchUi = useStore(s => s.patchUi);
  const lastSaved = useStore(s => s.lastSaved);
  const settings = useStore(s => s.settings);
  const candle = useCandle();

  const stats = useMemo(() => doc ? computeStats(doc.html) : null, [doc]);
  const fmt = doc ? FORMATS.find(f => f.id === doc.formatId) ?? FORMATS[0] : FORMATS[0];
  const pages = doc && stats ? pageCount(stats.charsNoSp, fmt.w, fmt.h || 297, doc.fontSize, doc.lineHeight) : 0;
  const sheets = stats ? authorSheets(stats.chars) : 0;
  const goalPct = Math.min(100, sheets / Math.max(0.1, settings.authorGoal) * 100);

  const tool = ui.bottom;
  const setTool = (t: BottomTool) => patchUi({ bottom: ui.bottom === t ? null : t });

  const TITLES: Record<string, string> = {
    counters: 'Счётчики текста', oracle: 'Оракул — генератор имён и названий',
    decor: 'Украшения — завитушки эпохи', timer: 'Таймер «Свеча» — фокус-спринт',
  };

  return (
    <div className="dock">
      {tool && (
        <div className="drawer">
          <div className="drawer-head">
            <span className="panel-title">{TITLES[tool]}</span>
            <button className="tb-btn panel-close" onClick={() => patchUi({ bottom: null })}><X size={14} /></button>
          </div>
          <div className="drawer-body">
            {tool === 'counters' && <CountersDetail />}
            {tool === 'oracle' && <Oracle />}
            {tool === 'decor' && <DecorGallery />}
            {tool === 'timer' && <TimerCandle />}
          </div>
        </div>
      )}

      <div className="dock-strip">
        {stats && doc && (
          <>
            <button className="stat-chip" onClick={() => setTool('counters')} title="Подробные счётчики">
              <b>{stats.words.toLocaleString('ru')}</b><span className="hidel">слов</span>
            </button>
            <button className="stat-chip" onClick={() => setTool('counters')}>
              <b>{stats.chars.toLocaleString('ru')}</b><span className="hidel">знаков</span>
            </button>
            <button className="stat-chip" onClick={() => setTool('counters')} title={`Цель: ${settings.authorGoal} а.л.`}>
              <Ring pct={goalPct} />
              <b>{sheets.toFixed(2)}</b><span className="hidel">а.л.</span>
            </button>
            <button className="stat-chip" onClick={() => setTool('counters')}>
              <b>{pages}</b><span className="hidel">стр.</span>
            </button>
          </>
        )}

        <span className="dock-sep" />

        <button className={`dock-btn ${tool === 'oracle' ? 'on' : ''}`} onClick={() => setTool('oracle')}><Dices /> Оракул</button>
        <button className={`dock-btn ${tool === 'decor' ? 'on' : ''}`} onClick={() => setTool('decor')}><Flower2 /> Украшения</button>
        <button className={`dock-btn ${tool === 'timer' ? 'on' : ''}`} onClick={() => setTool('timer')}>
          <Timer /> {candle.running || candle.left !== candle.total ? Math.floor(candle.left / 60) + ':' + String(candle.left % 60).padStart(2, '0') : 'Свеча'}
        </button>
        <button className={`dock-btn ${ui.notesOpen ? 'on' : ''}`} onClick={() => patchUi({ notesOpen: !ui.notesOpen })}><NotebookPen /> Заметки</button>
        <button className="dock-btn" onClick={() => patchUi({ modal: 'preview' })}><BookOpen /> Книга</button>
        <button className={`dock-btn ${ui.focus ? 'on' : ''}`} onClick={() => patchUi({ focus: !ui.focus, bottom: null })}><Focus /> Фокус</button>
        <button className="dock-btn" onClick={() => patchUi({ left: 'clips', overlay: ui.overlay === 'left' ? null : 'left' })}><Landmark /> Важные</button>

        <div style={{ flex: 1 }} />

        {doc && <span className="chip hidel" title={SKINS[doc.skin].era}>{SKINS[doc.skin].glyph} {SKINS[doc.skin].name}</span>}
        <span className="chip" title="Автосохранение (локально, каждые 3 с)">
          <Save size={11} style={{ color: '#4ade80' }} />
          {new Date(lastSaved).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 6, c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="2.4" />
      <circle cx="8" cy="8" r={r} fill="none" stroke="var(--sf-accent)" strokeWidth="2.4"
        strokeDasharray={`${c * pct / 100} ${c}`} strokeLinecap="round" transform="rotate(-90 8 8)" />
    </svg>
  );
}

/* ─── Подробные счётчики ───────────────────────────────────────────────────── */
function CountersDetail() {
  const doc = useActiveDoc();
  const settings = useStore(s => s.settings);
  const patchSettings = useStore(s => s.patchSettings);
  const counters = useStore(s => s.counters);
  const addCounter = useStore(s => s.addCounter);
  const removeCounter = useStore(s => s.removeCounter);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('12000');
  const [unit, setUnit] = useState<'words' | 'chars' | 'sheets'>('words');

  if (!doc) return null;
  const stats = computeStats(doc.html);
  const fmt = FORMATS.find(f => f.id === doc.formatId) ?? FORMATS[0];
  const pages = pageCount(stats.charsNoSp, fmt.w, fmt.h || 297, doc.fontSize, doc.lineHeight);
  const sheets = authorSheets(stats.chars);
  const tPages = typePages(stats.chars);
  const pSheets = printSheets(pages);

  const goalState = (val: number, tgt: number) => val >= tgt ? 'stat-good' : val >= tgt * .98 ? 'stat-prog' : 'stat-prog';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <div className="stat-card"><div className="stat-num">{stats.words.toLocaleString('ru')}</div><div className="stat-lbl">Слова</div></div>
        <div className="stat-card"><div className="stat-num">{stats.chars.toLocaleString('ru')}</div><div className="stat-lbl">Знаки с пробелами</div></div>
        <div className="stat-card"><div className="stat-num">{stats.charsNoSp.toLocaleString('ru')}</div><div className="stat-lbl">Знаки без пробелов</div></div>
        <div className="stat-card"><div className="stat-num">{stats.lines}</div><div className="stat-lbl">Строки</div></div>
        <div className="stat-card"><div className="stat-num">{stats.paras}</div><div className="stat-lbl">Абзацы</div></div>
        <div className="stat-card"><div className="stat-num">{pages}</div><div className="stat-lbl">Страницы ({fmt.name})</div></div>
        <div className="stat-card"><div className="stat-num">{tPages.toFixed(1)}</div><div className="stat-lbl">Машинописные страницы (1 800 зн.)</div></div>
        <div className="stat-card"><div className="stat-num">{pSheets.toFixed(2)}</div><div className="stat-lbl">Усл. печатные листы (24 стр.)</div></div>
        <div className="stat-card"><div className="stat-num">~{stats.readMin} мин</div><div className="stat-lbl">Время чтения</div></div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            Авторские листы: <b className={goalState(sheets, settings.authorGoal)}>{sheets.toFixed(2)}</b> из {settings.authorGoal}
          </span>
          {sheets >= settings.authorGoal && <span className="stat-good" style={{ fontSize: 11.5 }}><CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> Цель достигнута!</span>}
        </div>
        <div className="progress"><i style={{ width: `${Math.min(100, sheets / settings.authorGoal * 100)}%` }} /></div>
        <div className="row" style={{ marginTop: 10 }}>
          <span style={{ fontSize: 11.5, color: 'var(--sf-muted)' }}>Цель (а.л. = 40 000 знаков):</span>
          <input type="range" min={1} max={50} value={settings.authorGoal} onChange={e => patchSettings({ authorGoal: +e.target.value })} style={{ maxWidth: 180 }} />
          <b style={{ fontSize: 12 }}>{settings.authorGoal}</b>
        </div>
      </div>

      <div className="lbl" style={{ marginTop: 16 }}>Свои счётчики</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
        {counters.map(c => {
          const val = c.unit === 'words' ? stats.words : c.unit === 'chars' ? stats.chars : sheets;
          const left = Math.max(0, c.target - val);
          const pct = Math.min(100, val / c.target * 100);
          return (
            <div className="stat-card" key={c.id}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--sf-muted)' }}>{c.name}</span>
                <button className="ic" onClick={() => removeCounter(c.id)}><Trash2 /></button>
              </div>
              <div className={`stat-num ${val > c.target * 1.05 ? 'stat-over' : val >= c.target ? 'stat-good' : ''}`}>
                {c.unit === 'sheets' ? val.toFixed(2) : val.toLocaleString('ru')}
              </div>
              <div className="stat-lbl">{left > 0 ? `Осталось ${c.unit === 'sheets' ? left.toFixed(2) : left.toLocaleString('ru')}` : 'Готово!'}</div>
              <div className="progress"><i style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 200 }} placeholder="Название (глава для изд.)" value={name} onChange={e => setName(e.target.value)} />
        <input className="input" style={{ width: 110 }} value={target} onChange={e => setTarget(e.target.value.replace(/\D/g, ''))} />
        <select className="input" style={{ width: 130 }} value={unit} onChange={e => setUnit(e.target.value as any)}>
          <option value="words">слов</option><option value="chars">знаков</option><option value="sheets">а.л.</option>
        </select>
        <button className="btn sm" onClick={() => { if (name.trim() && +target > 0) { addCounter({ name: name.trim(), target: +target, unit }); setName(''); } }}>
          <Plus /> Добавить
        </button>
      </div>
    </div>
  );
}
