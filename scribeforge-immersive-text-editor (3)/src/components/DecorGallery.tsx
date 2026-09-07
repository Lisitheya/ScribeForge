// ─── Украшения: библиотека завитушек + автодекорирование ────────────────────
import { useState } from 'react';
import { Sparkles, Search } from 'lucide-react';
import { DECORS, decorHtml } from '../data/decors';
import { useStore, useActiveDoc, activePaletteColors } from '../store';
import { editor } from '../editorBus';

export default function DecorGallery() {
  const doc = useActiveDoc();
  const colors = useStore(s => activePaletteColors(s.docs, s.customPalettes, s.activeId));
  const patchDoc = useStore(s => s.patchDoc);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('Все');

  const accent = colors?.accent ?? '#d4af37';
  const items = DECORS.filter(d =>
    (cat === 'Все' || d.cat === cat) &&
    (!q || d.name.toLowerCase().includes(q.toLowerCase()) || d.kw.some(k => k.includes(q.toLowerCase()))) &&
    (doc ? d.skins === 'any' || d.skins.includes(doc.skin) : true));

  const cats = ['Все', ...Array.from(new Set(DECORS.filter(d => !doc || d.skins === 'any' || d.skins.includes(doc.skin)).map(d => d.cat)))];

  const insertAt = (id: string) => {
    const d = DECORS.find(x => x.id === id);
    if (d) editor()?.insertHTML(decorHtml(d, accent));
  };

  const autoDecorate = () => {
    const e = editor();
    const html = e?.getHTML() ?? doc?.html;
    if (!html) return;
    const sep = DECORS.find(d => (doc ? d.skins.includes(doc.skin) : true) && /Линии|Средневековье|Кавай|Машинка/.test(d.cat)) ?? DECORS[1];
    const parsed = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const root = parsed.body.firstElementChild!;
    root.querySelectorAll('.sf-decor').forEach(x => x.remove());
    root.querySelectorAll('h2').forEach(h => {
      const wrap = parsed.createElement('div');
      wrap.innerHTML = `<div class="sf-decor" contenteditable="false">${sep.svg(accent)}</div>`;
      h.before(wrap.firstElementChild!);
    });
    e?.commitHTML(root.innerHTML);
    if (doc) patchDoc({ dropCap: true });
  };

  return (
    <>
      <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <Search size={13} style={{ opacity: .5 }} />
        <input className="input" style={{ maxWidth: 210 }} placeholder="уголок, линия, сердце…" value={q} onChange={e => setQ(e.target.value)} />
        {cats.map(c => (
          <button key={c} className="chip" style={cat === c ? { borderColor: 'var(--sf-accent)', color: '#fff' } : {}} onClick={() => setCat(c)}>{c}</button>
        ))}
        <button className="btn acc sm" style={{ marginLeft: 'auto' }} onClick={autoDecorate}>
          <Sparkles /> Украсить документ
        </button>
      </div>
      <div className="decor-grid">
        {items.map(d => (
          <div className="decor-item" key={d.id} title={`${d.name} — вставить в текст`}
            onClick={() => insertAt(d.id)}
            dangerouslySetInnerHTML={{ __html: d.svg(accent).replace('min(260px,70%)', '100%') + `<div class="dn">${d.name}</div>` }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--sf-muted)', marginTop: 10 }}>
        Элементы — векторные SVG, красятся в акцент палитры и не теряют качество при печати. «Украсить документ» расставит разделители между главами и включит буквицу.
      </div>
    </>
  );
}
