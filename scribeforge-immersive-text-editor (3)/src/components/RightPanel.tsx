// ─── Правая панель: Лист / Стиль / Шрифт ────────────────────────────────────
import { useRef, useState } from 'react';
import {
  Ruler, Palette as PaletteIcon, Type, X, Cpu, ScrollText, Heart, Plus, Trash2,
  Download, Upload, ZoomIn, ZoomOut, Baseline,
} from 'lucide-react';
import { useStore, useActiveDoc, activePaletteColors } from '../store';
import { SKINS, PALETTES, FORMATS, TEXTURES } from '../data/skins';
import type { PaletteColors, RightTab, SkinId } from '../types';
import { download } from '../utils/export';

export default function RightPanel() {
  const ui = useStore(s => s.ui);
  const patchUi = useStore(s => s.patchUi);
  const tab: RightTab | null = ui.overlay === 'right' ? (ui.right ?? 'style') : ui.right;
  if (!tab) return null;
  return (
    <div className="panel right" style={{ width: ui.rightW }}>
      <div className="panel-grip" onPointerDown={e => {
        const startX = e.clientX, startW = ui.rightW;
        const move = (ev: PointerEvent) => patchUi({ rightW: Math.min(460, Math.max(220, startW - (ev.clientX - startX))) });
        const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
        document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
      }} />
      <div className="panel-tabs">
        <button className={`ptab ${tab === 'page' ? 'on' : ''}`} onClick={() => patchUi({ right: 'page' })}><Ruler />Лист</button>
        <button className={`ptab ${tab === 'style' ? 'on' : ''}`} onClick={() => patchUi({ right: 'style' })}><PaletteIcon />Стиль</button>
        <button className={`ptab ${tab === 'font' ? 'on' : ''}`} onClick={() => patchUi({ right: 'font' })}><Type />Шрифт</button>
      </div>
      <div className="panel-body">
        {tab === 'page' && <PageTab />}
        {tab === 'style' && <StyleTab />}
        {tab === 'font' && <FontTab />}
      </div>
    </div>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  const patchUi = useStore(s => s.patchUi);
  return (
    <div className="panel-head">
      <span className="panel-title">{children}</span>
      <button className="tb-btn panel-close" onClick={() => patchUi({ right: null, overlay: null })}><X size={14} /></button>
    </div>
  );
}

/* ─── Лист ─────────────────────────────────────────────────────────────────── */
function PageTab() {
  const doc = useActiveDoc();
  const patchDoc = useStore(s => s.patchDoc);
  const ui = useStore(s => s.ui);
  const patchUi = useStore(s => s.patchUi);
  if (!doc) return null;
  const fmt = FORMATS.find(f => f.id === doc.formatId)!;

  return (
    <>
      <Head>Формат и материал</Head>

      <div className="lbl">Формат листа</div>
      <div className="opt-grid">
        {FORMATS.map(f => (
          <div key={f.id} className={`opt ${doc.formatId === f.id ? 'on' : ''}`} onClick={() => patchDoc({ formatId: f.id })}>
            <div className="o-t">{f.name}</div>
            <div className="o-d">{f.h ? `${f.w}×${f.h} мм` : 'непрерывный'} · {f.desc}</div>
          </div>
        ))}
      </div>

      <div className="lbl" style={{ marginTop: 16 }}>Материал</div>
      <div className="opt-grid">
        {TEXTURES.map(t => (
          <div key={t.id} className={`opt ${doc.textureId === t.id ? 'on' : ''}`} onClick={() => patchDoc({ textureId: t.id })}>
            <div className="o-t">{t.name}</div>
          </div>
        ))}
      </div>

      <div className="lbl" style={{ marginTop: 16 }}>Масштаб листа (пинч-зум)</div>
      <div className="row">
        <button className="btn sm" onClick={() => patchUi({ zoom: Math.max(.5, +(ui.zoom - .1).toFixed(2)) })}><ZoomOut /></button>
        <input type="range" min={.5} max={1.8} step={.05} value={ui.zoom} onChange={e => patchUi({ zoom: +e.target.value })} />
        <button className="btn sm" onClick={() => patchUi({ zoom: Math.min(1.8, +(ui.zoom + .1).toFixed(2)) })}><ZoomIn /></button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--sf-muted)', textAlign: 'center', marginTop: 6 }}>{Math.round(ui.zoom * 100)}% · {fmt.name} {fmt.h ? `${fmt.w}×${fmt.h} мм` : ''}</div>

      <div className="card" style={{ marginTop: 16, fontSize: 11.5, color: 'var(--sf-muted)', lineHeight: 1.6 }}>
        Поля: 14 мм со всех сторон. Зеркальные поля, титул и колонтитулы настраиваются при экспорте «Книгой».
      </div>
    </>
  );
}

/* ─── Стиль ────────────────────────────────────────────────────────────────── */
function StyleTab() {
  const doc = useActiveDoc();
  const setSkin = useStore(s => s.setSkin);
  const patchDoc = useStore(s => s.patchDoc);
  const customs = useStore(s => s.customPalettes);
  const savePalette = useStore(s => s.savePalette);
  const deletePalette = useStore(s => s.deletePalette);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!doc) return null;

  const pals = [...customs.filter(p => p.skin === doc.skin), ...PALETTES.filter(p => p.skin === doc.skin)];
  const current = activePaletteColors(useStore.getState().docs, customs, doc.id)!;

  return (
    <>
      <Head>Стиль эпохи</Head>

      <div className="lbl">Скин</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {(Object.keys(SKINS) as SkinId[]).map(id => {
          const sk = SKINS[id];
          const pal = PALETTES.find(p => p.skin === id)!;
          return (
            <div key={id} className={`opt ${doc.skin === id ? 'on' : ''}`} style={{ padding: 10 }} onClick={() => setSkin(id)}>
              <div className="row" style={{ gap: 7 }}>
                {id === 'cyberpunk' ? <Cpu size={15} style={{ color: pal.colors.accent }} /> :
                 id === 'scriptorium' ? <ScrollText size={15} style={{ color: pal.colors.accent }} /> :
                 id === 'kawaii' ? <Heart size={15} style={{ color: pal.colors.accent }} /> :
                 <Type size={15} style={{ color: pal.colors.accent }} />}
                <div className="o-t" style={{ fontSize: 11.5 }}>{sk.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
                {[pal.colors.bg, pal.colors.paper, pal.colors.accent, pal.colors.ink].map((c, i) => (
                  <i key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: c, border: '1px solid rgba(128,128,128,.25)' }} />
                ))}
              </div>
              <div className="o-d" style={{ marginTop: 5 }}>{sk.era}</div>
            </div>
          );
        })}
      </div>

      <div className="lbl" style={{ marginTop: 16 }}>Палитра</div>
      <div className="swatches">
        {pals.map(p => (
          <div key={p.id} className={`swatch ${(!doc.customColors && doc.paletteId === p.id) ? 'on' : ''}`}
            onClick={() => patchDoc({ paletteId: p.id, customColors: null })}>
            <div className="sw-p" style={{ background: p.colors.paper, color: p.colors.ink }} />
            <div className="sw-strip">
              <i style={{ background: p.colors.bg }} /><i style={{ background: p.colors.accent }} /><i style={{ background: p.colors.muted }} />
            </div>
            <div className="sw-n row">{p.name}
              {p.custom && <Trash2 size={10} style={{ marginLeft: 'auto', opacity: .5 }}
                onClick={e => { e.stopPropagation(); deletePalette(p.id); }} />}
            </div>
          </div>
        ))}
      </div>

      <button className="btn block" style={{ marginTop: 12 }} onClick={() => setEditing(!editing)}>
        <Plus /> Своя палитра
      </button>

      {editing && <CustomPaletteEditor base={current} docId={doc.id}
        onSave={(name, colors) => { savePalette(name, colors); setEditing(false); }} />}

      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn sm" style={{ flex: 1 }} onClick={() =>
          download('палитра.palette.json', JSON.stringify({ name: 'Моя палитра', colors: current }, null, 2), 'application/json')}>
          <Download /> Экспорт
        </button>
        <button className="btn sm" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}><Upload /> Импорт</button>
        <input ref={fileRef} hidden type="file" accept=".json" onChange={e => {
          const f = e.target.files?.[0];
          if (f) {
            const rd = new FileReader();
            rd.onload = () => {
              try {
                const j = JSON.parse(String(rd.result));
                if (j.colors) { savePalette(j.name || 'Импортированная', j.colors); }
              } catch { alert('Файл не прочитан'); }
            };
            rd.readAsText(f);
          }
          e.target.value = '';
        }} />
      </div>
    </>
  );
}

/* ─── Редактор своей палитры ───────────────────────────────────────────────── */
function CustomPaletteEditor({ base, docId, onSave }: { base: PaletteColors; docId: string; onSave: (n: string, c: PaletteColors) => void }) {
  const patchDoc = useStore(s => s.patchDoc);
  const [c, setC] = useState<PaletteColors>({ ...base });
  const [name, setName] = useState('Моя палитра');

  const FIELDS: { k: keyof PaletteColors; n: string }[] = [
    { k: 'bg', n: 'Фон' }, { k: 'accent', n: 'Акцент' }, { k: 'paper', n: 'Лист' },
    { k: 'ink', n: 'Чернила' }, { k: 'muted', n: 'Второй план' },
  ];
  const set = (k: keyof PaletteColors, v: string) => {
    const nc = { ...c, [k]: v };
    setC(nc);
    if (docId) patchDoc({ paletteId: 'custom', customColors: nc });
  };
  const hex2rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgb2hex = (r: number, g: number, b: number) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Название палитры" style={{ marginBottom: 10 }} />
      {FIELDS.map(f => {
        const [r, g, b] = hex2rgb(/^#[0-9a-f]{6}$/i.test(c[f.k]) ? c[f.k] : '#000000');
        return (
          <div key={f.k} style={{ marginBottom: 10 }}>
            <div className="row" style={{ marginBottom: 5 }}>
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(c[f.k]) ? c[f.k] : '#000000'}
                onChange={e => set(f.k, e.target.value)}
                style={{ width: 26, height: 26, padding: 0, border: '1px solid var(--line)', borderRadius: 7, background: 'none' }} />
              <span style={{ fontSize: 11.5, flex: 1 }}>{f.n}</span>
              <input className="input" style={{ width: 84, fontFamily: 'monospace', fontSize: 11, padding: '4px 8px' }}
                value={c[f.k]} onChange={e => set(f.k, e.target.value)} />
            </div>
            <div className="row" style={{ gap: 5 }}>
              {([0, 1, 2] as const).map(i => (
                <input key={i} type="range" min={0} max={255} value={i === 0 ? r : i === 1 ? g : b}
                  style={{ accentColor: ['#ef4444', '#22c55e', '#3b82f6'][i] }}
                  onChange={e => {
                    const arr = [r, g, b]; arr[i] = +e.target.value;
                    set(f.k, rgb2hex(arr[0], arr[1], arr[2]));
                  }} />
              ))}
            </div>
          </div>
        );
      })}
      <button className="btn acc block" onClick={() => onSave(name, c)}>Сохранить в библиотеку</button>
    </div>
  );
}

/* ─── Шрифт ────────────────────────────────────────────────────────────────── */
function FontTab() {
  const doc = useActiveDoc();
  const patchDoc = useStore(s => s.patchDoc);
  const settings = useStore(s => s.settings);
  const patchSettings = useStore(s => s.patchSettings);
  const [tagInput, setTagInput] = useState('');
  if (!doc) return null;
  const fonts = SKINS[doc.skin].fonts;

  return (
    <>
      <Head>Шрифт и свойства</Head>

      <div className="lbl">Название документа</div>
      <input className="input" value={doc.title} onChange={e => patchDoc({ title: e.target.value })} />

      <div className="lbl" style={{ marginTop: 14 }}>Гарнитура (по эпохе)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {fonts.map(f => (
          <button key={f.id} className={`opt row ${doc.fontId === f.id ? 'on' : ''}`} onClick={() => patchDoc({ fontId: f.id })}>
            <span style={{ fontFamily: f.family, fontSize: 16, flex: 1, textAlign: 'left' }}>Абвгд Абвгд</span>
            <span style={{ fontSize: 10, color: 'var(--sf-muted)' }}>{f.name}</span>
          </button>
        ))}
      </div>

      <div className="lbl" style={{ marginTop: 14 }}>Размер — {doc.fontSize}px</div>
      <input type="range" min={13} max={34} value={doc.fontSize} onChange={e => patchDoc({ fontSize: +e.target.value })} />

      <div className="lbl" style={{ marginTop: 12 }}>Интерлиньяж — {doc.lineHeight.toFixed(2)}</div>
      <input type="range" min={1.2} max={2.4} step={0.05} value={doc.lineHeight} onChange={e => patchDoc({ lineHeight: +e.target.value })} />

      <div className="lbl" style={{ marginTop: 12 }}>Трекинг — {doc.letterSpacing / 100}em</div>
      <input type="range" min={0} max={12} step={1} value={doc.letterSpacing} onChange={e => patchDoc({ letterSpacing: +e.target.value })} />

      <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5 }}><Baseline size={13} style={{ verticalAlign: -2, marginRight: 6 }} />Буквица (первая буква)</span>
        <button className={`sw ${doc.dropCap ? 'on' : ''}`} onClick={() => patchDoc({ dropCap: !doc.dropCap })} />
      </div>
      <div className="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5 }}>Строгая машинистка (Backspace зачёркивает)</span>
        <button className={`sw ${settings.strictTypewriter ? 'on' : ''}`} onClick={() => patchSettings({ strictTypewriter: !settings.strictTypewriter })} />
      </div>

      <div className="lbl" style={{ marginTop: 18 }}>Теги документа</div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 5 }}>
        {doc.tags.map(t => (
          <span className="chip" key={t}>{t}
            <X size={10} style={{ cursor: 'pointer' }} onClick={() => patchDoc({ tags: doc.tags.filter(x => x !== t) })} />
          </span>
        ))}
      </div>
      <div className="row" style={{ marginTop: 7 }}>
        <input className="input" placeholder="Новый тег" value={tagInput} onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && tagInput.trim()) {
              patchDoc({ tags: [...new Set([...doc.tags, tagInput.trim()])] });
              setTagInput('');
            }
          }} />
      </div>

      <div className="lbl" style={{ marginTop: 14 }}>Описание</div>
      <textarea className="input" rows={3} value={doc.desc} placeholder="О чём эта рукопись…"
        onChange={e => patchDoc({ desc: e.target.value })} />
    </>
  );
}
