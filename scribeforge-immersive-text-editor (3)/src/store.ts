// ─── Центральное хранилище ScribeForge (zustand + localStorage) ─────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Doc, Clip, ClipTag, CustomCounter, Palette, PaletteColors,
  Settings, SkinId, UiState, ChapterLabel,
} from './types';
import { DEFAULT_PALETTE, NIGHT_PALETTE, PALETTES, SKIN_FONT, SKIN_FORMAT, SKIN_TEXTURE } from './data/skins';
import { TEMPLATES } from './data/templates';
import { uid, computeStats } from './utils/text';

const MAX_VERSIONS = 20;

// Хранилище с дебаунсом и полной защитой от сбоев.
// localStorage может быть недоступен (file:// в некоторых браузерах, приватный режим,
// переполненная квота) — в этом случае работаем в памяти, но приложение не падает.
const memoryFallback = new Map<string, string>();
let storageWarned = false;

const safeStorage = (() => {
  let t: ReturnType<typeof setTimeout> | undefined;
  let pending: { k: string; v: string } | null = null;

  const available = (): boolean => {
    try {
      const probe = '__sf_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch {
      if (!storageWarned) {
        storageWarned = true;
        console.warn('[ScribeForge] localStorage недоступен — данные хранятся только в этой сессии. ' +
          'Пользуйтесь «Экспортом архива», чтобы не потерять работу.');
      }
      return false;
    }
  };

  const flush = () => {
    if (!pending) return;
    const { k, v } = pending;
    pending = null;
    try {
      window.localStorage.setItem(k, v);
    } catch {
      memoryFallback.set(k, v);   // квота исчерпана или доступ запрещён
    }
  };

  // не теряем последние правки при закрытии вкладки
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
  }

  return {
    getItem: (k: string): string | null => {
      try {
        if (available()) return window.localStorage.getItem(k);
      } catch { /* игнорируем */ }
      return memoryFallback.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      memoryFallback.set(k, v);
      pending = { k, v };
      clearTimeout(t);
      t = setTimeout(flush, 700);
    },
    removeItem: (k: string) => {
      memoryFallback.delete(k);
      try { window.localStorage.removeItem(k); } catch { /* игнорируем */ }
    },
  };
})();

export const welcomeHtml = (accent: string) => `
<h1>ScribeForge</h1>
<blockquote>Одно окно — одна эпоха. Меняйте скин — и лист, чернила и декор подчинятся новому времени.</blockquote>
<p>Это ваша писательская мастерская. Начните печатать прямо здесь — каждый символ сохраняется локально, без облаков и интернета.</p>
<h2>Что умеет мастерская</h2>
<p>❦ <b>Скины эпох</b> — Киберпанк 2077, Скрипторий, Кавай и Печатная машинка. У каждого — свой материал листа, курсор и завитушки.</p>
<p>❦ <b>Палитры настроения</b> — 5 палитр на скин плюс своя, собранная ползунками RGB.</p>
<p>❦ <b>Оракул</b> — офлайн-генератор имён, таверн, артефактов и сюжетов. Кнопка в нижнем доке.</p>
<p>❦ <b>Счётчики</b> — слова, авторские листы (40 000 знаков), машинописные страницы, цели.</p>
<p>❦ <b>Главы и Важные моменты</b> — доска глав слева, шпаргалки с фактами о мире.</p>
<p>❦ <b>Экспорт</b> — PDF «книгой» с зеркальными полями, DOCX, Markdown, HTML и свиток.</p>
<div class="sf-decor" contenteditable="false"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 24" style="width:min(260px,70%);height:auto;display:block"><g fill="none" stroke="${accent}" stroke-width="1.7" stroke-linecap="round"><path d="M6 12 C 60 4, 90 20, 130 12 C 170 4, 200 20, 254 12"/><circle cx="130" cy="12" r="3.4" fill="${accent}" stroke="none"/></g></svg></div>
<p>Сотрите этот текст — и пергамент ваш. <i>Пишите.</i></p>`;

// Приводит документ из сохранения к актуальной схеме (защита от старых/битых данных)
const sanitizeDoc = (d: any): Doc => {
  const skin: SkinId = (['cyberpunk', 'scriptorium', 'kawaii', 'typewriter'] as SkinId[]).includes(d?.skin)
    ? d.skin : 'scriptorium';
  const num = (v: any, def: number) => (typeof v === 'number' && isFinite(v) ? v : def);
  return {
    id: typeof d?.id === 'string' && d.id ? d.id : uid(),
    title: typeof d?.title === 'string' ? d.title : 'Без названия',
    html: typeof d?.html === 'string' ? d.html : '<p><br></p>',
    cover: typeof d?.cover === 'string' ? d.cover : undefined,
    notes: typeof d?.notes === 'string' ? d.notes : '',
    skin,
    paletteId: typeof d?.paletteId === 'string' ? d.paletteId : DEFAULT_PALETTE[skin],
    customColors: d?.customColors ?? null,
    formatId: typeof d?.formatId === 'string' ? d.formatId : SKIN_FORMAT[skin],
    textureId: typeof d?.textureId === 'string' ? d.textureId : SKIN_TEXTURE[skin],
    fontId: typeof d?.fontId === 'string' ? d.fontId : SKIN_FONT[skin],
    fontSize: num(d?.fontSize, 18),
    lineHeight: num(d?.lineHeight, 1.65),
    letterSpacing: num(d?.letterSpacing, 0),
    dropCap: !!d?.dropCap,
    tags: Array.isArray(d?.tags) ? d.tags.filter((t: any) => typeof t === 'string') : [],
    desc: typeof d?.desc === 'string' ? d.desc : '',
    createdAt: num(d?.createdAt, Date.now()),
    updatedAt: num(d?.updatedAt, Date.now()),
    versions: Array.isArray(d?.versions) ? d.versions.filter((v: any) => v && typeof v.html === 'string') : [],
    chapterLabels: (d?.chapterLabels && typeof d.chapterLabels === 'object') ? d.chapterLabels : {},
    countersGoal: d?.countersGoal,
  };
};

const newDoc = (partial: Partial<Doc> = {}, skin: SkinId = 'scriptorium'): Doc => {
  const accent = PALETTES.find(p => p.id === DEFAULT_PALETTE[skin])!.colors.accent;
  return {
    id: uid(), title: 'Без названия',
    html: welcomeHtml(accent),
    skin, paletteId: DEFAULT_PALETTE[skin], customColors: null,
    formatId: SKIN_FORMAT[skin], textureId: SKIN_TEXTURE[skin],
    fontId: SKIN_FONT[skin], fontSize: 18, lineHeight: 1.65, letterSpacing: 0,
    dropCap: skin === 'scriptorium',
    tags: [], desc: '', createdAt: Date.now(), updatedAt: Date.now(),
    versions: [], chapterLabels: {},
    ...partial,
  };
};

interface Store {
  docs: Doc[];
  activeId: string | null;
  clips: Clip[];
  pinned: string[];
  customPalettes: Palette[];
  counters: CustomCounter[];
  dict: string[];
  settings: Settings;
  ui: UiState;
  liveHtml: string;      // живой текст активного документа
  liveRev: number;       // увеличивается при внешних правках
  lastSaved: number;

  // docs
  createDoc: (tplId?: string, title?: string, skin?: SkinId) => void;
  openDoc: (id: string) => void;
  deleteDoc: (id: string) => void;
  duplicateDoc: (id: string) => void;
  setCover: (id: string, dataUrl: string) => void;
  setHtml: (html: string, external?: boolean) => void;
  patchDoc: (patch: Partial<Doc>) => void;
  setSkin: (skin: SkinId) => void;
  snapshot: (note?: string) => void;
  restoreVersion: (ts: number) => void;
  setChapterLabel: (title: string, label: ChapterLabel) => void;
  importDocs: (docs: Doc[]) => void;

  // clips
  addClip: (text: string, tag: ClipTag) => void;
  removeClip: (id: string) => void;
  togglePin: (id: string) => void;

  // palettes & counters
  savePalette: (name: string, colors: PaletteColors) => void;
  deletePalette: (id: string) => void;
  addCounter: (c: Omit<CustomCounter, 'id'>) => void;
  removeCounter: (id: string) => void;
  addToDict: (word: string) => void;

  // settings & ui
  patchSettings: (p: Partial<Settings>) => void;
  patchUi: (p: Partial<UiState>) => void;
  applyNight: (night: boolean) => void;
  setSaved: () => void;
}

const defaultUi: UiState = {
  view: 'home', notesOpen: false, left: 'library', right: 'style', bottom: null, modal: null,
  findOpen: false, focus: false, leftW: 264, rightW: 288, zoom: 1, overlay: null,
};

export const useStore = create<Store>()(persist((set, get) => ({
  docs: [newDoc({ title: 'Добро пожаловать в мастерскую' })],
  activeId: null as string | null,
  clips: [], pinned: [], customPalettes: [], counters: [], dict: [],
  settings: {
    autoNight: true, night: false, strictTypewriter: false, spellcheck: true,
    dyslexia: false, reducedFx: false, authorGoal: 10,
    liveCheck: false, typeSound: false, autoSnapshot: true, snapshotMin: 10,
    notesOnStart: false, paraIndent: false, justify: false, showPageEdge: true,
    confirmDelete: true,
  },
  ui: defaultUi,
  liveHtml: '', liveRev: 0,
  lastSaved: Date.now(),

  createDoc: (tplId, title, skinArg) => {
    const tpl = TEMPLATES.find(t => t.id === tplId) ?? TEMPLATES[0];
    const skin = skinArg ?? (tpl.skin !== 'any' ? tpl.skin as SkinId : (get().docs.find(d => d.id === get().activeId)?.skin ?? 'scriptorium'));
    const pal = PALETTES.find(p => p.id === DEFAULT_PALETTE[skin])!;
    const doc = newDoc({
      title: title || tpl.name,
      html: tpl.build(title || tpl.name, pal.colors.accent),
      versions: [],
    }, skin);
    set(s => ({ docs: [doc, ...s.docs], activeId: doc.id, liveHtml: doc.html, liveRev: s.liveRev + 1, ui: { ...s.ui, view: 'editor' } }));
  },
  openDoc: (id) => {
    const d = get().docs.find(x => x.id === id);
    if (d) set(s => ({
      activeId: id, liveHtml: d.html, liveRev: s.liveRev + 1,
      ui: { ...s.ui, view: 'editor', notesOpen: s.settings.notesOnStart || s.ui.notesOpen },
    }));
  },
  deleteDoc: (id) => set(s => {
    const docs = s.docs.filter(d => d.id !== id);
    return {
      docs,
      clips: s.clips.filter(c => c.docId !== id),
      pinned: s.pinned.filter(p => s.clips.find(c => c.id === p)?.docId !== id),
      activeId: s.activeId === id ? (docs[0]?.id ?? null) : s.activeId,
    };
  }),
  duplicateDoc: (id) => set(s => {
    const d = s.docs.find(x => x.id === id);
    if (!d) return {};
    const copy = { ...d, id: uid(), title: d.title + ' (копия)', createdAt: Date.now(), updatedAt: Date.now(), versions: [] };
    return { docs: [copy, ...s.docs] };
  }),
  setCover: (id, dataUrl) => set(s => ({
    docs: s.docs.map(d => d.id === id ? { ...d, cover: dataUrl } : d),
  })),
  setHtml: (html, external) => set(s => {
    if (!s.activeId) return {};
    return {
      liveHtml: html,
      liveRev: external ? s.liveRev + 1 : s.liveRev,
      docs: s.docs.map(d => d.id === s.activeId ? { ...d, html, updatedAt: Date.now() } : d),
    };
  }),
  patchDoc: (patch) => set(s => ({
    docs: s.docs.map(d => d.id === s.activeId ? { ...d, ...patch, updatedAt: Date.now() } : d),
  })),
  setSkin: (skin) => {
    const s = get();
    s.patchDoc({
      skin,
      paletteId: s.settings.night ? NIGHT_PALETTE[skin] : DEFAULT_PALETTE[skin],
      customColors: null,
      textureId: SKIN_TEXTURE[skin],
      formatId: SKIN_FORMAT[skin],
      fontId: SKIN_FONT[skin],
      dropCap: skin === 'scriptorium' ? true : s.docs.find(d => d.id === s.activeId)?.dropCap ?? false,
    });
  },
  snapshot: (note) => set(s => ({
    docs: s.docs.map(d => {
      if (d.id !== s.activeId) return d;
      const w = computeStats(d.html).words;
      const v = { ts: Date.now(), html: d.html, words: w, note: note ?? `Снимок ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` };
      return { ...d, versions: [v, ...d.versions].slice(0, MAX_VERSIONS) };
    }),
    lastSaved: Date.now(),
  })),
  restoreVersion: (ts) => {
    const d = get().docs.find(x => x.id === get().activeId);
    const v = d?.versions.find(x => x.ts === ts);
    if (v) get().setHtml(v.html, true);
  },
  setChapterLabel: (title, label) => {
    const d = get().docs.find(x => x.id === get().activeId);
    if (!d) return;
    get().patchDoc({ chapterLabels: { ...d.chapterLabels, [title]: label } });
  },
  importDocs: (docs) => set(s => ({ docs: [...docs.map(d => ({ ...d, id: uid() })), ...s.docs] })),

  addClip: (text, tag) => set(s => s.activeId ? {
    clips: [{ id: uid(), docId: s.activeId, text: text.slice(0, 600), tag, ts: Date.now() }, ...s.clips],
  } : {}),
  removeClip: (id) => set(s => ({ clips: s.clips.filter(c => c.id !== id), pinned: s.pinned.filter(p => p !== id) })),
  togglePin: (id) => set(s => ({
    pinned: s.pinned.includes(id) ? s.pinned.filter(p => p !== id) : [...s.pinned, id],
  })),

  savePalette: (name, colors) => set(s => ({
    customPalettes: [{ id: 'u-' + uid(), name, skin: s.docs.find(d => d.id === s.activeId)?.skin ?? 'scriptorium', colors, custom: true }, ...s.customPalettes],
  })),
  deletePalette: (id) => set(s => ({ customPalettes: s.customPalettes.filter(p => p.id !== id) })),
  addCounter: (c) => set(s => ({ counters: [{ ...c, id: uid() }, ...s.counters] })),
  removeCounter: (id) => set(s => ({ counters: s.counters.filter(c => c.id !== id) })),
  addToDict: (word) => set(s => ({ dict: [...new Set([...s.dict, word.toLowerCase()])] })),

  patchSettings: (p) => set(s => ({ settings: { ...s.settings, ...p } })),
  patchUi: (p) => set(s => ({ ui: { ...s.ui, ...p } })),
  applyNight: (night) => {
    const s = get();
    s.patchSettings({ night });
    const d = s.docs.find(x => x.id === s.activeId);
    if (d && !d.customColors && d.paletteId !== 'custom') {
      const inNightSet = Object.values(NIGHT_PALETTE).includes(d.paletteId);
      const inDaySet = Object.values(DEFAULT_PALETTE).includes(d.paletteId);
      if (night && inDaySet) s.patchDoc({ paletteId: NIGHT_PALETTE[d.skin] });
      if (!night && inNightSet) s.patchDoc({ paletteId: DEFAULT_PALETTE[d.skin] });
    }
  },
  setSaved: () => set({ lastSaved: Date.now() }),
}), {
  name: 'scribeforge-v1',
  version: 3,
  storage: createJSONStorage(() => safeStorage),
  partialize: (s) => ({
    docs: s.docs, activeId: s.activeId, clips: s.clips, pinned: s.pinned,
    customPalettes: s.customPalettes, counters: s.counters, dict: s.dict, settings: s.settings,
  }),
  // Сохранения из прежних версий не должны ломать приложение:
  // дополняем недостающие поля значениями по умолчанию.
  migrate: (persisted: any, version) => {
    if (!persisted || typeof persisted !== 'object') return persisted;
    if (version < 3) {
      persisted.docs = Array.isArray(persisted.docs) ? persisted.docs : [];
      persisted.clips = Array.isArray(persisted.clips) ? persisted.clips : [];
      persisted.pinned = Array.isArray(persisted.pinned) ? persisted.pinned : [];
      persisted.customPalettes = Array.isArray(persisted.customPalettes) ? persisted.customPalettes : [];
      persisted.counters = Array.isArray(persisted.counters) ? persisted.counters : [];
      persisted.dict = Array.isArray(persisted.dict) ? persisted.dict : [];
    }
    return persisted;
  },
  merge: (persisted: any, current) => {
    const p = (persisted && typeof persisted === 'object') ? persisted : {};
    const docs: Doc[] = Array.isArray(p.docs) ? p.docs.filter(Boolean).map(sanitizeDoc) : current.docs;
    return {
      ...current,
      ...p,
      docs,
      clips: Array.isArray(p.clips) ? p.clips : [],
      pinned: Array.isArray(p.pinned) ? p.pinned : [],
      customPalettes: Array.isArray(p.customPalettes) ? p.customPalettes : [],
      counters: Array.isArray(p.counters) ? p.counters : [],
      dict: Array.isArray(p.dict) ? p.dict : [],
      // новые настройки всегда получают значения по умолчанию
      settings: { ...current.settings, ...(p.settings ?? {}) },
      // состояние интерфейса не восстанавливаем — всегда стартуем с полки проектов
      ui: current.ui,
      activeId: docs.some(d => d.id === p.activeId) ? p.activeId : (docs[0]?.id ?? null),
      liveHtml: '', liveRev: 0, lastSaved: Date.now(),
    };
  },
}));

// ── селекторы
export const useActiveDoc = () => useStore(s => s.docs.find(d => d.id === s.activeId) ?? null);
export const activePaletteColors = (docs: Doc[], customs: Palette[], activeId: string | null): PaletteColors | null => {
  const d = docs.find(x => x.id === activeId);
  if (!d) return null;
  if (d.paletteId === 'custom' && d.customColors) return d.customColors;
  return (customs.find(p => p.id === d.paletteId) ?? PALETTES.find(p => p.id === d.paletteId) ?? PALETTES[0]).colors;
};
