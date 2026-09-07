// ─── «Заметки»: плавающее окно-черновик, отдельная глава проекта ────────────
import { useEffect, useRef, useState } from 'react';
import {
  NotebookPen, X, Minus, Pin, CornerDownLeft, Copy, Trash2, Download, Maximize2,
} from 'lucide-react';
import { useStore, useActiveDoc } from '../store';
import { editor } from '../editorBus';
import { computeStats } from '../utils/text';
import { download, safeName } from '../utils/export';

const clampPos = (x: number, y: number, w: number, h: number) => ({
  x: Math.max(4, Math.min(x, window.innerWidth - Math.min(w, window.innerWidth) - 4)),
  y: Math.max(4, Math.min(y, window.innerHeight - 70)),
  w, h,
});

export default function NotesWindow() {
  const doc = useActiveDoc();
  const patchDoc = useStore(s => s.patchDoc);
  const patchUi = useStore(s => s.patchUi);
  const open = useStore(s => s.ui.notesOpen);

  const [box, setBox] = useState(() => clampPos(window.innerWidth - 400, 96, 350, 380));
  const [min, setMin] = useState(false);
  const [pinned, setPinned] = useState(true);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{ w: number; h: number; x: number; y: number } | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // держим окно в пределах экрана при ресайзе браузера
  useEffect(() => {
    const f = () => setBox(b => clampPos(b.x, b.y, b.w, b.h));
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);

  if (!open || !doc) return null;
  const notes = doc.notes ?? '';
  const stats = computeStats(notes.replace(/\n/g, '<br>'));

  const setNotes = (v: string) => patchDoc({ notes: v });

  const insertToText = () => {
    const sel = areaRef.current;
    const chunk = sel && sel.selectionStart !== sel.selectionEnd
      ? notes.slice(sel.selectionStart, sel.selectionEnd)
      : notes;
    if (!chunk.trim()) return;
    editor()?.insertHTML(chunk.split(/\n{2,}/).map(p =>
      `<p>${p.replace(/\n/g, '<br>').replace(/</g, '&lt;')}</p>`).join(''));
  };

  const stamp = () => {
    const t = new Date().toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    setNotes(`${notes}${notes && !notes.endsWith('\n') ? '\n' : ''}\n— ${t} —\n`);
  };

  return (
    <div className={`notes-win ${min ? 'min' : ''} ${pinned ? 'pinned' : ''}`}
      style={{ left: box.x, top: box.y, width: box.w, height: min ? undefined : box.h }}>

      {/* заголовок / перетаскивание */}
      <div className="notes-head"
        onPointerDown={e => {
          if ((e.target as HTMLElement).closest('button')) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { dx: e.clientX - box.x, dy: e.clientY - box.y };
        }}
        onPointerMove={e => {
          if (!drag.current) return;
          setBox(b => clampPos(e.clientX - drag.current!.dx, e.clientY - drag.current!.dy, b.w, b.h));
        }}
        onPointerUp={() => { drag.current = null; }}
      >
        <NotebookPen size={13} style={{ color: 'var(--sf-accent)', flex: 'none' }} />
        <span className="notes-title">Заметки — {doc.title}</span>
        <button className="ic" title={pinned ? 'Полупрозрачно при наборе' : 'Всегда видимы'} onClick={() => setPinned(!pinned)}>
          <Pin size={12} style={{ opacity: pinned ? 1 : .45 }} />
        </button>
        <button className="ic" title={min ? 'Развернуть' : 'Свернуть'} onClick={() => setMin(!min)}>
          {min ? <Maximize2 size={12} /> : <Minus size={12} />}
        </button>
        <button className="ic" title="Закрыть" onClick={() => patchUi({ notesOpen: false })}><X size={12} /></button>
      </div>

      {!min && (
        <>
          <textarea
            ref={areaRef}
            className="notes-area"
            value={notes}
            placeholder={'Черновики, идеи, имена, вопросы к себе…\n\nЭто отдельная глава проекта: она не попадает в текст и в экспорт, пока вы сами не вставите её.'}
            onChange={e => setNotes(e.target.value)}
            spellCheck
          />
          <div className="notes-foot">
            <span className="notes-stat">{stats.words} сл · {notes.length} зн</span>
            <button className="ic" title="Отметка времени" onClick={stamp}>🕐</button>
            <button className="ic" title="Вставить в текст (выделенное или всё)" onClick={insertToText}><CornerDownLeft size={12} /></button>
            <button className="ic" title="Копировать" onClick={() => navigator.clipboard.writeText(notes)}><Copy size={12} /></button>
            <button className="ic" title="Скачать заметки .txt" onClick={() => download(`${safeName(doc.title)} — заметки.txt`, notes)}><Download size={12} /></button>
            <button className="ic" title="Очистить" onClick={() => { if (notes && confirm('Очистить заметки проекта?')) setNotes(''); }}><Trash2 size={12} /></button>
          </div>

          {/* уголок изменения размера */}
          <div className="notes-grip"
            onPointerDown={e => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              resize.current = { w: box.w, h: box.h, x: e.clientX, y: e.clientY };
            }}
            onPointerMove={e => {
              if (!resize.current) return;
              const r = resize.current;
              setBox(b => ({
                ...b,
                w: Math.max(240, Math.min(720, r.w + (e.clientX - r.x))),
                h: Math.max(200, Math.min(760, r.h + (e.clientY - r.y))),
              }));
            }}
            onPointerUp={() => { resize.current = null; }}
          />
        </>
      )}
    </div>
  );
}
