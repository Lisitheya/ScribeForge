// ─── Верхний тулбар: меню, быстрые действия, поиск ──────────────────────────
import { useEffect, useRef, useState } from 'react';
import {
  Feather, FilePlus2, Copy, Trash2, History, Download, Upload, FileText, FileDown,
  Undo2, Redo2, Scissors, ClipboardPaste, Clipboard, Search, Replace, SpellCheck,
  Image as ImageIcon, Link2, Table, Minus, Braces, Type, Bold, Italic, Underline,
  Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered,
  Quote, Heading1, Heading2, Heading3, Eraser, Cpu, ScrollText, Heart, Layers,
  Focus, Moon, TimerReset, Accessibility, Zap, ChevronRight, Printer, PanelLeft, PanelRight,
  BookOpenCheck, EyeOff, House, Settings, FilePlus, NotebookPen, BookOpen,
} from 'lucide-react';
import { useStore, useActiveDoc, activePaletteColors } from '../store';
import { SKINS } from '../data/skins';
import { editor } from '../editorBus';
import { exportTxt, exportMd, exportHtmlFile, exportDoc, exportMscr, download } from '../utils/export';
import type { SkinId } from '../types';

interface Item {
  label: string; icon?: React.ComponentType<any>; act?: () => void;
  kbd?: string; sub?: Item[]; sep?: boolean; disabled?: boolean;
}

export default function TopBar() {
  const doc = useActiveDoc();
  const settings = useStore(s => s.settings);
  const ui = useStore(s => s.ui);
  const patchUi = useStore(s => s.patchUi);
  const patchSettings = useStore(s => s.patchSettings);

  const [open, setOpen] = useState<string | null>(null);
  const [findQ, setFindQ] = useState('');
  const [repQ, setRepQ] = useState('');
  const [checkCount, setCheckCount] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!barRef.current?.contains(e.target as Node)) setOpen(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const s = () => useStore.getState();
  const colors = activePaletteColors(useStore.getState().docs, useStore.getState().customPalettes, useStore.getState().activeId);

  const exec = (cmd: string, arg?: string) => { editor()?.exec(cmd, arg); setOpen(null); setCheckCount(null); };
  const insert = (html: string) => { editor()?.insertHTML(html); setOpen(null); };

  // ── архив
  const exportArchive = () => {
    const st = s();
    download('scribeforge-архив.sfpack', JSON.stringify({
      app: 'ScribeForge-pack', ver: 1, docs: st.docs, clips: st.clips,
      customPalettes: st.customPalettes, counters: st.counters, dict: st.dict, settings: st.settings,
    }, null, 2), 'application/json');
    setOpen(null);
  };
  const onImportFile = (f: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(String(rd.result));
        if (j.app === 'ScribeForge-pack' && j.docs) {
          useStore.setState({
            docs: [...j.docs, ...s().docs],
            clips: [...(j.clips ?? []), ...s().clips],
            customPalettes: [...(j.customPalettes ?? []), ...s().customPalettes],
            counters: j.counters ?? s().counters,
            dict: j.dict ?? s().dict,
          });
        } else if (j.app === 'ScribeForge' && j.doc) {
          s().importDocs([j.doc]);
        }
      } catch { alert('Не удалось прочитать файл'); }
    };
    rd.readAsText(f);
  };

  // ── поиск/замена (window.find + insertText)
  const doFind = (back = false) => {
    editor()?.focus();
    (window as any).find?.(findQ, false, back, true, false, false, false);
  };
  const doReplace = () => {
    const sel = window.getSelection()?.toString();
    if (sel && findQ && sel.toLowerCase() === findQ.toLowerCase()) {
      document.execCommand('insertText', false, repQ);
      const e = ed(); if (e) s().setHtml(e.getHTML());
    }
    doFind(false);
  };
  const doReplaceAll = () => {
    if (!findQ) return;
    editor()?.focus();
    (window as any).find?.(findQ, false, true, true, false, false, false);
    let guard = 0;
    while (guard++ < 999 && (window as any).find?.(findQ, false, false, true, false, false, false)) {
      document.execCommand('insertText', false, repQ);
      (window.getSelection() as any)?.collapseToStart?.();
    }
    const e = ed(); if (e) s().setHtml(e.getHTML());
  };
  const ed = () => { try { return editor(); } catch { return null; } };

  const runCheck = () => {
    const n = editor()?.markIssues(s().dict) ?? 0;
    setCheckCount(n);
    setOpen(null);
  };

  const menus: { id: string; name: string; items: Item[] }[] = [
    {
      id: 'file', name: 'Файл', items: [
        { label: 'Новый проект…', icon: FilePlus2, act: () => { patchUi({ modal: 'templates' }); setOpen(null); } },
        { label: 'На главную', icon: House, act: () => { patchUi({ view: 'home', modal: null }); setOpen(null); } },
        { label: 'Дублировать', icon: Copy, act: () => { if (doc) s().duplicateDoc(doc.id); setOpen(null); } },
        { sep: true, label: '' },
        { label: 'Снимок версии', icon: BookOpenCheck, kbd: 'Ctrl+S', act: () => { s().snapshot(); setOpen(null); } },
        { label: 'История версий…', icon: History, act: () => { patchUi({ modal: 'versions' }); setOpen(null); } },
        { sep: true, label: '' },
        { label: 'Предпросмотр книги…', icon: BookOpen, kbd: 'Ctrl+P', act: () => { patchUi({ modal: 'preview' }); setOpen(null); } },
        { label: 'Заметки проекта', icon: NotebookPen, kbd: 'Ctrl+E', act: () => { patchUi({ notesOpen: !ui.notesOpen }); setOpen(null); } },
        { sep: true, label: '' },
        { label: 'Экспорт', icon: Download, sub: [
          { label: 'PDF / Книга / Свиток…', icon: Printer, act: () => { patchUi({ modal: 'export' }); setOpen(null); } },
          { label: 'Word (.doc)', icon: FileText, act: () => { if (doc) exportDoc(doc); setOpen(null); } },
          { label: 'Markdown (.md)', icon: Braces, act: () => { if (doc) exportMd(doc); setOpen(null); } },
          { label: 'Текст (.txt)', icon: FileText, act: () => { if (doc) exportTxt(doc); setOpen(null); } },
          { label: 'HTML (.html)', icon: Braces, act: () => { if (doc && colors) exportHtmlFile(doc, colors); setOpen(null); } },
          { label: 'Файл .mscr', icon: FileDown, act: () => { if (doc) exportMscr(doc); setOpen(null); } },
          { label: 'Полный архив (.sfpack)', icon: Download, act: exportArchive },
        ] },
        { label: 'Импорт (.mscr / .sfpack)', icon: Upload, act: () => { fileInput.current?.click(); setOpen(null); } },
        { sep: true, label: '' },
        { label: 'Настройки…', icon: Settings, act: () => { patchUi({ modal: 'settings' }); setOpen(null); } },
        { sep: true, label: '' },
        { label: 'Удалить проект', icon: Trash2, act: () => { if (doc && confirm(`Удалить «${doc.title}»?`)) s().deleteDoc(doc.id); setOpen(null); } },
      ],
    },
    {
      id: 'edit', name: 'Правка', items: [
        { label: 'Отменить', icon: Undo2, kbd: 'Ctrl+Z', act: () => exec('undo') },
        { label: 'Повторить', icon: Redo2, kbd: 'Ctrl+Y', act: () => exec('redo') },
        { sep: true, label: '' },
        { label: 'Вырезать', icon: Scissors, act: () => exec('cut') },
        { label: 'Копировать', icon: Clipboard, act: () => exec('copy') },
        { label: 'Вставить', icon: ClipboardPaste, act: () => { editor()?.focus(); navigator.clipboard.readText().then(t => t && editor()?.exec('insertText', t)).catch(() => {}); setOpen(null); } },
        { sep: true, label: '' },
        { label: 'Найти и заменить', icon: Search, kbd: 'Ctrl+F', act: () => patchUi({ findOpen: !ui.findOpen }) },
        { sep: true, label: '' },
        { label: 'Проверка текста', icon: SpellCheck, act: runCheck },
        { label: 'Убрать маркеры', icon: EyeOff, act: () => { editor()?.clearIssues(); setCheckCount(null); setOpen(null); } },
        { sep: true, label: '' },
        { label: `Системная орфография ${settings.spellcheck ? '✓' : ''}`, icon: SpellCheck, act: () => { patchSettings({ spellcheck: !settings.spellcheck }); setOpen(null); } },
      ],
    },
    {
      id: 'insert', name: 'Вставка', items: [
        { label: 'Изображение…', icon: ImageIcon, act: () => { imgInput.current?.click(); setOpen(null); } },
        { label: 'Новая глава', icon: FilePlus, act: () => {
            const e = editor();
            if (!e) return;
            const n = e.chapterHeads().length + 1;
            const html = (e.getHTML() ?? '') + `<h2>Глава ${['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][n - 1] ?? n}</h2><p><br></p>`;
            e.commitHTML(html);
            requestAnimationFrame(() => e.scrollToChapter(n - 1));
            setOpen(null);
          } },
        { label: 'Ссылка…', icon: Link2, act: () => { const u = prompt('Адрес ссылки:'); if (u) exec('createLink', u); else setOpen(null); } },
        { label: 'Таблица…', icon: Table, act: () => { patchUi({ modal: 'table' }); setOpen(null); } },
        { sep: true, label: '' },
        { label: 'Разделитель сцены', icon: Minus, sub: (doc ? SKINS[doc.skin].separators : ['* * *']).map(g => ({
          label: g, act: () => insert(`<p style="text-align:center;letter-spacing:.5em;opacity:.75">${g}</p>`),
        })) },
        { sep: true, label: '' },
        { label: 'Текущая дата', icon: TimerReset, act: () => exec('insertText', new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })) },
        { label: 'Сноска', icon: Braces, act: () => exec('insertHTML', '<sup>[1]</sup>') },
      ],
    },
    {
      id: 'format', name: 'Формат', items: [
        { label: 'Заголовок 1', icon: Heading1, act: () => exec('formatBlock', 'h1') },
        { label: 'Заголовок 2', icon: Heading2, act: () => exec('formatBlock', 'h2') },
        { label: 'Заголовок 3', icon: Heading3, act: () => exec('formatBlock', 'h3') },
        { label: 'Цитата', icon: Quote, act: () => exec('formatBlock', 'blockquote') },
        { label: 'Обычный текст', icon: Type, act: () => exec('formatBlock', 'p') },
        { sep: true, label: '' },
        { label: 'Жирный', icon: Bold, kbd: 'Ctrl+B', act: () => exec('bold') },
        { label: 'Курсив', icon: Italic, kbd: 'Ctrl+I', act: () => exec('italic') },
        { label: 'Подчёркнутый', icon: Underline, kbd: 'Ctrl+U', act: () => exec('underline') },
        { label: 'Зачёркнутый', icon: Strikethrough, act: () => exec('strikeThrough') },
        { sep: true, label: '' },
        { label: 'По левому краю', icon: AlignLeft, act: () => exec('justifyLeft') },
        { label: 'По центру', icon: AlignCenter, act: () => exec('justifyCenter') },
        { label: 'По правому краю', icon: AlignRight, act: () => exec('justifyRight') },
        { label: 'По ширине', icon: AlignJustify, act: () => exec('justifyFull') },
        { sep: true, label: '' },
        { label: 'Маркированный список', icon: List, act: () => exec('insertUnorderedList') },
        { label: 'Нумерованный список', icon: ListOrdered, act: () => exec('insertOrderedList') },
        { sep: true, label: '' },
        { label: 'Очистить формат', icon: Eraser, act: () => exec('removeFormat') },
      ],
    },
    {
      id: 'mode', name: 'Режим', items: [
        {
          label: 'Скин / Эпоха', icon: Layers, sub: (Object.keys(SKINS) as SkinId[]).map(id => ({
            label: `${SKINS[id].name} — ${SKINS[id].era}`,
            icon: id === 'cyberpunk' ? Cpu : id === 'scriptorium' ? ScrollText : id === 'kawaii' ? Heart : Type,
            act: () => { s().setSkin(id); setOpen(null); },
          })),
        },
        { sep: true, label: '' },
        { label: 'Фокусировка', icon: Focus, kbd: 'Esc', act: () => { patchUi({ focus: !ui.focus }); setOpen(null); } },
        { label: `Ночной режим ${settings.night ? '✓' : ''}`, icon: Moon, act: () => { s().applyNight(!settings.night); setOpen(null); } },
        { label: `Авто-ночь ${settings.autoNight ? '✓' : ''}`, icon: Moon, act: () => { patchSettings({ autoNight: !settings.autoNight }); setOpen(null); } },
        { sep: true, label: '' },
        { label: `Строгая машинистка ${settings.strictTypewriter ? '✓' : ''}`, icon: Type, act: () => { patchSettings({ strictTypewriter: !settings.strictTypewriter }); setOpen(null); } },
        { label: `Эконом-режим ${settings.reducedFx ? '✓' : ''}`, icon: Zap, act: () => { patchSettings({ reducedFx: !settings.reducedFx }); setOpen(null); } },
        { label: `Письмо с дислексией ${settings.dyslexia ? '✓' : ''}`, icon: Accessibility, act: () => { patchSettings({ dyslexia: !settings.dyslexia }); setOpen(null); } },
      ],
    },
  ];

  return (
    <>
      <div className="topbar" ref={barRef}>
        <div className="brand">
          <div className="brand-ic"><Feather size={15} /></div>
          <div className="brand-name">SCRIBE<b>FORGE</b></div>
        </div>

        {menus.map(m => (
          <div className="menu" key={m.id}>
            <button className={`menu-btn ${open === m.id ? 'open' : ''}`}
              onClick={() => setOpen(open === m.id ? null : m.id)}
              onMouseEnter={() => open && setOpen(m.id)}>
              {m.name}
            </button>
            {open === m.id && (
              <div className="menu-pop">
                {m.items.map((it, i) => it.sep
                  ? <div className="menu-sep" key={i} />
                  : it.sub
                    ? <SubMenu key={i} item={it} />
                    : <button key={i} className="menu-item" onClick={() => it.act?.()}>
                        {it.icon && <it.icon />} {it.label} {it.kbd && <span className="kbd">{it.kbd}</span>}
                      </button>)}
              </div>
            )}
          </div>
        ))}

        <div className="tb-right">
          <button className="tb-btn" title="На главную (полка проектов)" onClick={() => patchUi({ view: 'home', modal: null })}><House /></button>
          {checkCount !== null && (
            <span className="tb-chip" title="Пометок проверки">
              <SpellCheck size={12} /> {checkCount}
            </span>
          )}
          <button className="tb-btn" title="Отменить" onClick={() => exec('undo')}><Undo2 /></button>
          <button className="tb-btn" title="Повторить" onClick={() => exec('redo')}><Redo2 /></button>
          <button className="tb-btn" title="Проверка текста" onClick={runCheck}><SpellCheck /></button>
          <button className={`tb-btn ${ui.findOpen ? 'on' : ''}`} title="Найти" onClick={() => patchUi({ findOpen: !ui.findOpen })}><Search /></button>
          <button className={`tb-btn ${ui.notesOpen ? 'on' : ''}`} title="Заметки проекта (Ctrl+E)" onClick={() => patchUi({ notesOpen: !ui.notesOpen })}><NotebookPen /></button>
          <button className="tb-btn" title="Предпросмотр книги (Ctrl+P)" onClick={() => patchUi({ modal: 'preview' })}><BookOpen /></button>
          <button className="tb-btn" title="Экспорт / PDF" onClick={() => patchUi({ modal: 'export' })}><Printer /></button>
          <button className={`tb-btn ${settings.night ? 'on' : ''}`} title="Ночной режим" onClick={() => s().applyNight(!settings.night)}><Moon /></button>
          <button className={`tb-btn ${ui.focus ? 'on' : ''}`} title="Фокусировка" onClick={() => patchUi({ focus: !ui.focus })}><Focus /></button>
          <button className={`tb-btn ${ui.left ? 'on' : ''}`} title="Библиотека" onClick={() => patchUi({ left: ui.left ? null : 'library' })}><PanelLeft /></button>
          <button className={`tb-btn ${ui.right ? 'on' : ''}`} title="Стиль листа" onClick={() => patchUi({ right: ui.right ? null : 'style' })}><PanelRight /></button>
          <button className="tb-btn" title="Настройки" onClick={() => patchUi({ modal: 'settings' })}><Settings /></button>
        </div>
      </div>

      {ui.findOpen && (
        <div className="findbar">
          <Search size={14} style={{ opacity: .5 }} />
          <input autoFocus placeholder="Найти…" value={findQ}
            onChange={e => setFindQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doFind(e.shiftKey); }} />
          <button className="btn sm" onClick={() => doFind(false)}>Далее</button>
          <button className="btn sm" onClick={() => doFind(true)}>Назад</button>
          <Replace size={14} style={{ opacity: .5, marginLeft: 8 }} />
          <input placeholder="Заменить на…" value={repQ} onChange={e => setRepQ(e.target.value)} />
          <button className="btn sm" onClick={doReplace}>Заменить</button>
          <button className="btn sm" onClick={doReplaceAll}>Все</button>
          <button className="tb-btn" style={{ marginLeft: 'auto' }} onClick={() => patchUi({ findOpen: false })}>✕</button>
        </div>
      )}

      <input ref={imgInput} type="file" accept="image/*" hidden
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) {
            const rd = new FileReader();
            rd.onload = () => insert(`<img src="${rd.result}" style="width:55%;display:block;margin:14px auto" alt="иллюстрация"/><p></p>`);
            rd.readAsDataURL(f);
          }
          e.target.value = '';
        }} />
      <input ref={fileInput} type="file" accept=".mscr,.sfpack,.json" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = ''; }} />
    </>
  );
}

function SubMenu({ item }: { item: Item }) {
  const [subOpen, setSubOpen] = useState(false);
  return (
    <div className="menu-sub" onMouseEnter={() => setSubOpen(true)} onMouseLeave={() => setSubOpen(false)}>
      <button className="menu-item">{item.icon && <item.icon />} {item.label} <ChevronRight style={{ marginLeft: 'auto' }} size={13} /></button>
      {subOpen && (
        <div className="menu-pop">
          {item.sub!.map((sub, i) => (
            <button key={i} className="menu-item" onClick={() => sub.act?.()}>
              {sub.icon && <sub.icon />} {sub.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
