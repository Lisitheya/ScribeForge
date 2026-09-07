// ─── Лист: contentEditable-редактор с физикой эпохи ─────────────────────────
import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore, useActiveDoc, activePaletteColors } from '../store';
import { SKINS, FORMATS } from '../data/skins';
import { registerEditor } from '../editorBus';
import { markIssues, clearIssueMarks } from '../utils/text';
import { Bold, Italic, Underline, Strikethrough, Heading2, Quote, BookmarkPlus, X, Maximize2, Trash2, WrapText } from 'lucide-react';
import { CLIP_TAGS, type ClipTag } from '../types';

const MM = 3.7795;

function caretRect(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0).cloneRange();
  const rects = r.getClientRects();
  if (rects.length) return rects[0];
  const node = r.startContainer;
  const el = node.nodeType === 1 ? node as Element : node.parentElement;
  return el ? el.getBoundingClientRect() : null;
}

export default function Editor() {
  const doc = useActiveDoc();
  const colors = useStore(s => activePaletteColors(s.docs, s.customPalettes, s.activeId));
  const settings = useStore(s => s.settings);
  const ui = useStore(s => s.ui);
  const setHtml = useStore(s => s.setHtml);
  const patchUi = useStore(s => s.patchUi);
  const patchDoc = useStore(s => s.patchDoc);

  const liveRev = useStore(s => s.liveRev);
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const fxHost = useRef<HTMLDivElement>(null);
  const lastFx = useRef(0);
  const keystrokes = useRef(0);
  const [bubble, setBubble] = useState<{ x: number; y: number } | null>(null);
  const [imgBubble, setImgBubble] = useState<{ x: number; y: number; img: HTMLImageElement } | null>(null);

  const fmt = FORMATS.find(f => f.id === doc?.formatId) ?? FORMATS[0];
  const skin = doc?.skin ?? 'scriptorium';

  const sync = useCallback(() => {
    if (rootRef.current) setHtml(rootRef.current.innerHTML);
  }, [setHtml]);

  const focusRoot = useCallback(() => rootRef.current?.focus(), []);

  // ── загрузка документа в DOM ( + внешние обновления через liveRev)
  useEffect(() => {
    if (rootRef.current && doc) {
      rootRef.current.innerHTML = doc.html;
      setBubble(null); setImgBubble(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, liveRev]);

  // ── регистрация API
  useEffect(() => {
    registerEditor({
      exec: (cmd, arg) => {
        focusRoot();
        restoreSel();
        document.execCommand(cmd, false, arg);
        sync();
      },
      insertHTML: (html) => {
        focusRoot(); restoreSel();
        document.execCommand('insertHTML', false, html);
        sync();
      },
      insertTextAtSaved: (text) => {
        focusRoot();
        if (restoreSel()) {
          document.execCommand('insertText', false, text);
        } else if (rootRef.current) {
          const p = document.createElement('p');
          p.textContent = text;
          rootRef.current.appendChild(p);
        }
        sync();
      },
      saveSelection: () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount && rootRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
          savedRange.current = sel.getRangeAt(0).cloneRange();
        }
      },
      getHTML: () => rootRef.current?.innerHTML ?? '',
      commitHTML: (html) => {
        if (rootRef.current) rootRef.current.innerHTML = html;
        setHtml(html);
      },
      scrollToChapter: (i) => {
        const heads = chapterEls();
        heads[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      getSelectionText: () => window.getSelection()?.toString() ?? '',
      focus: focusRoot,
      markIssues: (dict) => {
        const n = rootRef.current ? markIssues(rootRef.current, dict) : 0;
        sync();
        return n;
      },
      clearIssues: () => {
        if (rootRef.current) clearIssueMarks(rootRef.current);
        sync();
      },
      chapterHeads: () => chapterEls().map(h => (h.textContent ?? '').trim()),
    });
    return () => registerEditor(null);
  }, [sync, focusRoot]);

  const chapterEls = () => {
    if (!rootRef.current) return [];
    return Array.from(rootRef.current.children).filter(el =>
      /^(H1|H2)$/.test(el.tagName) || /^#{1,3}\s/.test(el.textContent ?? '') ||
      /^\s*(глава|пролог|эпилог|часть)\b/i.test(el.textContent ?? ''));
  };

  const restoreSel = (): boolean => {
    const r = savedRange.current;
    if (!r || !rootRef.current) return false;
    try {
      if (!rootRef.current.contains(r.commonAncestorContainer)) return false;
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(r);
      return true;
    } catch { return false; }
  };

  // ── сохранение выделения (для «Вставить из Оракула» и пр.)
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && rootRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
      }
      if (ui.focus) markActiveBlock();
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.focus]);

  // ── эффекты вставки курсора
  const spawnFx = useCallback((kind: 'spark' | 'ink' | 'heart', x: number, y: number) => {
    if (settings.reducedFx || !fxHost.current) return;
    const el = document.createElement('div');
    if (kind === 'heart') { el.className = 'fx-heart'; el.textContent = keystrokes.current % 3 ? '♡' : '☆'; }
    else el.className = kind === 'spark' ? 'fx-spark' : 'fx-ink';
    if (kind === 'spark') { el.style.height = '16px'; y -= 2; }
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    fxHost.current.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }, [settings.reducedFx]);

  // ── строгая машинистка: Backspace зачёркивает
  const strikePrev = (): boolean => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !rootRef.current) return false;
    const r = sel.getRangeAt(0);
    if (!r.collapsed || !rootRef.current.contains(r.commonAncestorContainer)) return false;
    let node = r.startContainer, off = r.startOffset;
    if (node.nodeType === 3 && off > 0) {
      strikeRange(node as Text, off - 1, off);
      return true;
    }
    // ищем предыдущий текстовый узел
    const walker = document.createTreeWalker(rootRef.current, NodeFilter.SHOW_TEXT);
    let prev: Text | null = null, cur: Text | null;
    while ((cur = walker.nextNode() as Text)) {
      if (cur === node || (node.nodeType === 1 && cur.parentElement === node)) break;
      if (cur.data.length) prev = cur;
    }
    if (prev) { strikeRange(prev, prev.data.length - 1, prev.data.length); return true; }
    return false;
  };
  const strikeRange = (node: Text, a: number, b: number) => {
    try {
      const r = document.createRange();
      r.setStart(node, a); r.setEnd(node, b);
      const s = document.createElement('s');
      r.surroundContents(s);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      const nr = document.createRange();
      nr.setStartBefore(s); nr.collapse(true);
      sel.addRange(nr);
      sync();
    } catch { /* граница элемента — пропускаем */ }
  };

  // ── ввод
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!doc) return;
    if (e.key === 'Backspace' && settings.strictTypewriter && skin === 'typewriter') {
      const sel = window.getSelection();
      if (sel?.getRangeAt(0)?.collapsed && strikePrev()) e.preventDefault();
    }
    if (e.key === 'Escape' && ui.focus) patchUi({ focus: false });
    if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '\u00A0\u00A0\u00A0\u00A0'); }

    // физика эпохи
    const now = performance.now();
    if (now - lastFx.current > 70 && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      lastFx.current = now;
      keystrokes.current++;
      const rc = caretRect();
      if (rc) {
        if (skin === 'cyberpunk') spawnFx('spark', rc.left + 2, rc.top + rc.height - 4);
        if (skin === 'scriptorium' && keystrokes.current % 5 === 0) spawnFx('ink', rc.left, rc.top + rc.height - 2);
        if (skin === 'kawaii' && keystrokes.current % 6 === 0) spawnFx('heart', rc.left, rc.top);
      }
      if (skin === 'typewriter' && sheetRef.current) {
        const sh = sheetRef.current;
        sh.classList.remove('strike'); void sh.offsetWidth; sh.classList.add('strike');
      }
      clack();
    }
  };

  const onInput = () => { sync(); };

  // ── пузырь выделения
  const onMouseUp = () => {
    setImgBubble(null);
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setBubble(null); return; }
      const r = sel.getRangeAt(0);
      if (!rootRef.current?.contains(r.commonAncestorContainer)) { setBubble(null); return; }
      const rect = r.getBoundingClientRect();
      if (!rect.width) return;
      setBubble({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    }, 10);
  };

  const onClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.tagName === 'IMG') {
      const img = t as HTMLImageElement;
      const rect = img.getBoundingClientRect();
      setImgBubble({ x: rect.left + Math.min(rect.width / 2, 200), y: rect.bottom + 8, img });
      setBubble(null);
    } else setImgBubble(null);
  };

  // ── вставка изображений
  const insertImageFile = (file: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      focusRoot(); restoreSel();
      document.execCommand('insertHTML', false,
        `<img class="sf-img" src="${rd.result}" style="width:55%;display:block;margin:14px auto" alt="иллюстрация"/><p></p>`);
      sync();
    };
    rd.readAsDataURL(file);
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const f = Array.from(e.clipboardData.files).find(x => x.type.startsWith('image/'));
    if (f) { e.preventDefault(); insertImageFile(f); }
  };
  const onDrop = (e: React.DragEvent) => {
    const f = Array.from(e.dataTransfer.files).find(x => x.type.startsWith('image/'));
    if (f) {
      e.preventDefault();
      // Chrome/FF: caretRangeFromPoint; Safari: caretPositionFromPoint
      let range: Range | null = (document as any).caretRangeFromPoint?.(e.clientX, e.clientY) ?? null;
      if (!range && (document as any).caretPositionFromPoint) {
        const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      }
      if (range) {
        const sel = window.getSelection()!;
        sel.removeAllRanges(); sel.addRange(range);
        savedRange.current = range.cloneRange();
      }
      insertImageFile(f);
    }
  };

  // ── фокус-режим
  const markActiveBlock = () => {
    if (!rootRef.current) return;
    const sel = window.getSelection();
    rootRef.current.querySelectorAll('[data-act]').forEach(el => el.removeAttribute('data-act'));
    if (!sel || !sel.rangeCount) return;
    let el = sel.getRangeAt(0).startContainer as HTMLElement;
    if (el.nodeType === 3) el = el.parentElement!;
    while (el && el.parentElement !== rootRef.current) el = el.parentElement!;
    if (el && el !== rootRef.current) el.setAttribute('data-act', '1');
  };
  useEffect(() => {
    if (!ui.focus) rootRef.current?.querySelectorAll('[data-act]').forEach(el => el.removeAttribute('data-act'));
  }, [ui.focus]);

  // ── индикатор автосохранения
  const dirty = useRef(false);
  useEffect(() => { dirty.current = true; }, [doc?.html]);
  useEffect(() => {
    const t = setInterval(() => {
      if (dirty.current) { dirty.current = false; useStore.getState().setSaved(); }
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // ── авто-снимки версий
  useEffect(() => {
    if (!settings.autoSnapshot) return;
    const t = setInterval(() => {
      const st = useStore.getState();
      const d = st.docs.find(x => x.id === st.activeId);
      if (!d) return;
      if (d.versions[0]?.html === d.html) return;   // без изменений — не плодим версии
      st.snapshot(`Авто ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`);
    }, Math.max(2, settings.snapshotMin) * 60_000);
    return () => clearInterval(t);
  }, [settings.autoSnapshot, settings.snapshotMin]);

  // ── проверка текста на лету: срабатывает в паузе, когда курсор ушёл из листа
  // (перестройка DOM во время набора сбила бы каретку — поэтому ждём расфокуса)
  useEffect(() => {
    if (!settings.liveCheck) return;
    const t = setTimeout(() => {
      const root = rootRef.current;
      if (!root || document.activeElement === root) return;
      markIssues(root, useStore.getState().dict);
    }, 1200);
    return () => clearTimeout(t);
  }, [doc?.html, settings.liveCheck]);

  // ── звук печатной машинки (WebAudio, без файлов)
  const audioRef = useRef<AudioContext | null>(null);
  const clack = useCallback(() => {
    if (!settings.typeSound) return;
    try {
      const ctx = audioRef.current ?? (audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)());
      const t = ctx.currentTime;
      const buf = ctx.createBuffer(1, 1100, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 7);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const flt = ctx.createBiquadFilter();
      flt.type = 'bandpass'; flt.frequency.value = 1750 + Math.random() * 500; flt.Q.value = 1.1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      src.connect(flt).connect(g).connect(ctx.destination);
      src.start(t);
    } catch { /* аудио недоступно */ }
  }, [settings.typeSound]);

  if (!doc || !colors) {
    return (
      <div className="ws" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--sf-muted)', fontSize: 13 }}>
          <div style={{ fontSize: 42, marginBottom: 12, opacity: .6 }}>❦</div>
          Создайте проект в библиотеке — и мастерская оживёт
        </div>
      </div>
    );
  }

  const font = SKINS[skin].fonts.find(f => f.id === doc.fontId) ?? SKINS[skin].fonts[0];
  const w = Math.min(fmt.w * MM * ui.zoom, 2400);
  const minH = fmt.h ? fmt.h * MM * ui.zoom : 620;

  return (
    <>
      <div className="ws-inner" style={{ position: 'relative' }}>
        {/* слой приколотых шпаргалок */}
        <PinnedLayer />

        {/* баннер документа */}
        <div className="doc-banner">
          <input className="doc-banner-title" value={doc.title}
            onChange={e => patchDoc({ title: e.target.value })}
            placeholder="Без названия" spellCheck={false} />
          <div className="doc-banner-meta">
            {SKINS[skin].name} · {fmt.name}{fmt.h ? ` ${fmt.w}×${fmt.h}` : ''} · {font.name}
          </div>
        </div>

        <div className="sheet-wrap">
          <div
            ref={sheetRef}
            className={`sheet tx-${doc.textureId} ${settings.showPageEdge && fmt.h ? 'edged' : ''}`}
            style={{
              width: `min(${w}px, calc(100vw - 40px))`,
              minHeight: minH,
              borderRadius: skin === 'kawaii' ? 22 : skin === 'cyberpunk' ? 6 : 3,
            }}
          >
            {skin === 'cyberpunk' && (
              <>
                <div className="cornerfx" style={{ top: -6, left: -6, borderRight: 'none', borderBottom: 'none' }} />
                <div className="cornerfx" style={{ top: -6, right: -6, borderLeft: 'none', borderBottom: 'none' }} />
                <div className="cornerfx" style={{ bottom: -6, left: -6, borderRight: 'none', borderTop: 'none' }} />
                <div className="cornerfx" style={{ bottom: -6, right: -6, borderLeft: 'none', borderTop: 'none' }} />
              </>
            )}
            <div className="burn-overlay" />
            <div
              ref={rootRef}
              className={`sheet-content ${doc.dropCap ? 'dropcap' : ''} ${settings.paraIndent ? 'indent' : ''} ${settings.justify ? 'justify' : ''}`}
              contentEditable
              suppressContentEditableWarning
              spellCheck={settings.spellcheck}
              lang="ru"
              data-ph="Начните писать…"
              onInput={onInput}
              onKeyDown={onKeyDown}
              onMouseUp={onMouseUp}
              onClick={onClick}
              onPaste={onPaste}
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              style={{
                fontFamily: font.family,
                fontSize: doc.fontSize,
                lineHeight: doc.lineHeight,
                letterSpacing: doc.letterSpacing ? `${doc.letterSpacing / 100}em` : undefined,
                padding: '54px 58px',
                ['--sflh' as any]: doc.lineHeight,
                minHeight: fmt.h ? minH - 2 : minH,
              }}
            />
          </div>
        </div>
      </div>

      <div ref={fxHost} />

      {/* пузырь форматирования */}
      {bubble && (
        <div className="sel-bubble" style={{ left: bubble.x, top: bubble.y, transform: 'translate(-50%, -100%)' }}
             onMouseDown={e => e.preventDefault()}>
          <button onClick={() => exec('bold')} title="Жирный"><Bold size={14} /></button>
          <button onClick={() => exec('italic')} title="Курсив"><Italic size={14} /></button>
          <button onClick={() => exec('underline')} title="Подчёркнутый"><Underline size={14} /></button>
          <button onClick={() => exec('strikeThrough')} title="Зачёркнутый"><Strikethrough size={14} /></button>
          <div className="sb-sep" />
          <button onClick={() => exec('formatBlock', 'h2')} title="Заголовок"><Heading2 size={14} /></button>
          <button onClick={() => exec('formatBlock', 'blockquote')} title="Цитата"><Quote size={14} /></button>
          <div className="sb-sep" />
          <button title="Сохранить как важный момент" onClick={() => {
            const text = window.getSelection()?.toString() ?? '';
            if (text.trim()) { useStore.setState(s => ({ ui: { ...s.ui, modal: 'clipTag' } })); }
          }}><BookmarkPlus size={14} /></button>
          <button title="Закрыть" onClick={() => setBubble(null)}><X size={13} /></button>
        </div>
      )}

      {/* пузырь изображения */}
      {imgBubble && (
        <div className="sel-bubble" style={{ left: imgBubble.x, top: imgBubble.y, transform: 'translateX(-50%)' }}
             onMouseDown={e => e.preventDefault()}>
          {[25, 50, 75, 100].map(p => (
            <button key={p} onClick={() => { imgBubble.img.style.width = p + '%'; sync(); }}>{p}%</button>
          ))}
          <div className="sb-sep" />
          <button title="Обтекание слева" onClick={() => { const i = imgBubble.img; i.style.cssFloat = 'left'; i.style.display = 'block'; i.style.margin = '4px 16px 8px 0'; sync(); }}><WrapText size={13} /></button>
          <button title="По центру, в строку блоком" onClick={() => { const i = imgBubble.img; i.style.cssFloat = 'none'; i.style.display = 'block'; i.style.margin = '14px auto'; sync(); }}><Maximize2 size={13} /></button>
          <button title="Удалить" onClick={() => { imgBubble.img.remove(); setImgBubble(null); sync(); }}><Trash2 size={13} /></button>
        </div>
      )}
    </>
  );

  function exec(cmd: string, arg?: string) {
    focusRoot(); restoreSel();
    document.execCommand(cmd, false, arg);
    sync();
  }
}

// ─── Приколотые карточки «важных моментов» ──────────────────────────────────
function PinnedLayer() {
  const clips = useStore(s => s.clips);
  const pinned = useStore(s => s.pinned);
  const activeId = useStore(s => s.activeId);
  const togglePin = useStore(s => s.togglePin);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const items = clips.filter(c => pinned.includes(c.id) && c.docId === activeId);
  if (!items.length) return null;

  return (
    <div className="pin-layer">
      {items.map((c, i) => {
        const p = pos[c.id] ?? { x: 14 + i * 26, y: 10 + i * 40 };
        const tag = CLIP_TAGS[c.tag as ClipTag];
        return (
          <div key={c.id} className="pin-card" style={{ left: p.x, top: p.y, borderTopColor: tag.color }}
            onPointerDown={e => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { id: c.id, dx: e.clientX - p.x, dy: e.clientY - p.y };
            }}
            onPointerMove={e => {
              if (!drag.current || drag.current.id !== c.id) return;
              setPos(prev => ({ ...prev, [c.id]: { x: Math.max(0, e.clientX - drag.current!.dx), y: Math.max(0, e.clientY - drag.current!.dy) } }));
            }}
            onPointerUp={() => { drag.current = null; }}
          >
            <div className="pc-tag" style={{ color: tag.color }}>{tag.name}</div>
            <div>{c.text}</div>
            <button className="pc-x" title="Открепить" onClick={() => togglePin(c.id)}><X size={12} /></button>
          </div>
        );
      })}
    </div>
  );
}
