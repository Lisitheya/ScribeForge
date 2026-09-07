import type { Palette, SkinId, DocFormatDef } from '../types';

// ─── Скины ───────────────────────────────────────────────────────────────────

export interface FontDef { id: string; name: string; family: string }
export interface SkinDef {
  id: SkinId;
  name: string;
  era: string;
  glyph: string;
  separators: string[];
  fonts: FontDef[];
}

// универсальные книжные гарнитуры — доступны в любой эпохе
const UNIVERSAL: FontDef[] = [
  { id: 'spectr', name: 'Spectral', family: "'Spectral', serif" },
  { id: 'aleg', name: 'Alegreya', family: "'Alegreya', serif" },
  { id: 'ptser', name: 'PT Serif', family: "'PT Serif', serif" },
  { id: 'yanone', name: 'Yanone Kaffeesatz', family: "'Yanone Kaffeesatz', sans-serif" },
];

const F = {
  jb: { id: 'jb', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace" },
  rubik: { id: 'rubik', name: 'Rubik Mono One', family: "'Rubik Mono One', monospace" },
  ptm: { id: 'ptm', name: 'PT Mono', family: "'PT Mono', monospace" },
  courier: { id: 'courier', name: 'Courier Prime', family: "'Courier Prime', monospace" },
  fira: { id: 'fira', name: 'Fira Mono', family: "'Fira Mono', monospace" },
  ebg: { id: 'ebg', name: 'EB Garamond', family: "'EB Garamond', serif" },
  corm: { id: 'corm', name: 'Cormorant', family: "'Cormorant Garamond', serif" },
  marck: { id: 'marck', name: 'Marck Script', family: "'Marck Script', cursive" },
  caveat: { id: 'caveat', name: 'Caveat', family: "'Caveat', cursive" },
  playf: { id: 'playf', name: 'Playfair Display', family: "'Playfair Display', serif" },
  liter: { id: 'liter', name: 'Literata', family: "'Literata', serif" },
  oldstd: { id: 'oldstd', name: 'Old Standard TT', family: "'Old Standard TT', serif" },
  comfort: { id: 'comfort', name: 'Comfortaa', family: "'Comfortaa', sans-serif" },
  neucha: { id: 'neucha', name: 'Neucha', family: "'Neucha', cursive" },
  badscript: { id: 'badscript', name: 'Bad Script', family: "'Bad Script', cursive" },
};

export const SKINS: Record<SkinId, SkinDef> = {
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Киберпанк 2077',
    era: 'Футуризм',
    glyph: '>_',
    separators: ['//', '> _', '█ █ █'],
    fonts: [F.jb, F.rubik, F.ptm, F.fira, F.courier, ...UNIVERSAL],
  },
  scriptorium: {
    id: 'scriptorium',
    name: 'Скрипторий',
    era: 'Средневековье',
    glyph: '❦',
    separators: ['❦', '✦ ❦ ✦', '☙ ⚜ ❧'],
    fonts: [F.ebg, F.corm, F.playf, F.oldstd, F.liter, F.marck, F.caveat, ...UNIVERSAL],
  },
  kawaii: {
    id: 'kawaii',
    name: 'Кавай',
    era: 'Милота',
    glyph: '♡',
    separators: ['♡ ♡ ♡', '☆ ✿ ☆', '♪ ♫ ♪'],
    fonts: [F.comfort, F.caveat, F.neucha, F.badscript, F.ebg, F.jb, ...UNIVERSAL],
  },
  typewriter: {
    id: 'typewriter',
    name: 'Печатная машинка',
    era: 'Нуар / Ретро',
    glyph: '* * *',
    separators: ['* * *', '— — —', '/ / /'],
    fonts: [F.courier, F.ptm, F.jb, F.fira, ...UNIVERSAL],
  },
};

export const allFonts = (skin: SkinId): FontDef[] => SKINS[skin].fonts;

// ─── Палитры ─────────────────────────────────────────────────────────────────

const P = (id: string, skin: SkinId, name: string, bg: string, accent: string, paper: string, ink: string, muted: string): Palette =>
  ({ id, skin, name, colors: { bg, accent, paper, ink, muted } });

export const PALETTES: Palette[] = [
  // Киберпанк
  P('cp-neon',   'cyberpunk', 'Неон-Нуар',   '#0a0a10', '#ff2a6d', '#10131d', '#3ee2f0', '#5c6b8a'),
  P('cp-synth',  'cyberpunk', 'Синтвейв',    '#1a1033', '#ff8c42', '#221741', '#f5e663', '#8a7bb0'),
  P('cp-matrix', 'cyberpunk', 'Матрица',     '#040804', '#00ff41', '#081008', '#7cff9b', '#2f6f3f'),
  P('cp-chrome', 'cyberpunk', 'Хром',        '#20232a', '#6ec1ff', '#2b2f38', '#f1f5f9', '#8f98a3'),
  P('cp-acid',   'cyberpunk', 'Кислота',     '#0b1026', '#b8f500', '#131a3a', '#ffffff', '#5a6a9a'),
  // Скрипторий
  P('sc-royal',  'scriptorium', 'Королевский пурпур', '#241812', '#d4af37', '#e8d5a3', '#221408', '#8a6c3f'),
  P('sc-monk',   'scriptorium', 'Монастырский',       '#33312e', '#7a1e1e', '#ded3b8', '#2c2013', '#8d8574'),
  P('sc-forest', 'scriptorium', 'Лесная чаща',        '#1c2418', '#4a7c4d', '#e2d9b0', '#14200f', '#77805f'),
  P('sc-faded',  'scriptorium', 'Выцветший пергамент','#5c4930', '#c9762d', '#efdfb4', '#3a2a18', '#9a8058'),
  P('sc-candle', 'scriptorium', 'Ночная свеча',       '#0d1322', '#f4c542', '#232c44', '#e8dcb8', '#5f6c8f'),
  // Кавай
  P('kw-straw',  'kawaii', 'Клубничное молоко', '#ffdfe9', '#ff5d7a', '#fff6f9', '#55383f', '#b98a97'),
  P('kw-mint',   'kawaii', 'Мятное облако',     '#d7f4ea', '#2fae94', '#ffffff', '#22645a', '#8fbdb2'),
  P('kw-lemon',  'kawaii', 'Лимонад',           '#fff3c2', '#ff9f45', '#fffdf0', '#6b4a2b', '#c2a878'),
  P('kw-lav',    'kawaii', 'Лавандовый сон',    '#e3dcf6', '#8c6fd8', '#f8f5ff', '#37306b', '#9c92c2'),
  P('kw-peach',  'kawaii', 'Персиковый крем',   '#ffe6d4', '#ff8fa3', '#fff9f4', '#5c4033', '#c4a08c'),
  // Печатная машинка
  P('tw-noir',   'typewriter', 'Нуар 1940',    '#121212', '#c9c9c9', '#1f1f1f', '#ededed', '#7a7a7a'),
  P('tw-sepia',  'typewriter', 'Сепия',        '#2e271e', '#6f4e2f', '#e9dfc8', '#3b2a1a', '#8b7a5e'),
  P('tw-ribbon', 'typewriter', 'Красная лента','#241f1c', '#b22222', '#efe6d5', '#141210', '#8c7f70'),
  P('tw-army',   'typewriter', 'Армейский',    '#2c2f24', '#3c5a3c', '#d8d3b8', '#15170f', '#7d8066'),
  P('tw-news',   'typewriter', 'Газетный',     '#3f4146', '#1f3a5f', '#e8e8e6', '#111214', '#83878f'),
];

export const DEFAULT_PALETTE: Record<SkinId, string> = {
  cyberpunk: 'cp-neon',
  scriptorium: 'sc-royal',
  kawaii: 'kw-straw',
  typewriter: 'tw-noir',
};

export const NIGHT_PALETTE: Record<SkinId, string> = {
  cyberpunk: 'cp-neon',
  scriptorium: 'sc-candle',
  kawaii: 'kw-lav',
  typewriter: 'tw-noir',
};

export const getPalette = (palettes: Palette[], custom: Palette[] , skin: SkinId, id: string): Palette =>
  custom.find(p => p.id === id) ?? palettes.find(p => p.id === id) ??
  palettes.find(p => p.id === DEFAULT_PALETTE[skin])!;

// ─── Форматы листа ───────────────────────────────────────────────────────────

export const FORMATS: DocFormatDef[] = [
  { id: 'a4',     name: 'A4',      w: 210, h: 297, desc: 'Стандарт для печати' },
  { id: 'a5',     name: 'A5',      w: 148, h: 210, desc: 'Книги, брошюры' },
  { id: 'a6',     name: 'A6',      w: 105, h: 148, desc: 'Открытки, карточки' },
  { id: 'letter', name: 'Letter',  w: 216, h: 279, desc: 'Американский стандарт' },
  { id: 'legal',  name: 'Legal',   w: 216, h: 356, desc: 'Юридические документы' },
  { id: 'b5',     name: 'B5',      w: 176, h: 250, desc: 'Книги, журналы' },
  { id: 'square', name: 'Квадрат', w: 210, h: 210, desc: 'Арт-буки, посты' },
  { id: 'screen', name: 'Экран',   w: 320, h: 180, desc: '16:9, чтение с экрана' },
  { id: 'scroll', name: 'Свиток',  w: 170, h: 0,   desc: 'Непрерывная лента' },
];

// ─── Текстуры ────────────────────────────────────────────────────────────────

export const TEXTURES = [
  { id: 'white',     name: 'Белый лист' },
  { id: 'rice',      name: 'Рисовая бумага' },
  { id: 'kraft',     name: 'Крафт' },
  { id: 'papyrus',   name: 'Папирус' },
  { id: 'parchment', name: 'Пергамент' },
  { id: 'holo',      name: 'Голограмма' },
  { id: 'grid',      name: 'Клетчатая' },
  { id: 'lined',     name: 'Линейная' },
];

// предпочтения скина при выборе
export const SKIN_FORMAT: Record<SkinId, string> = {
  cyberpunk: 'screen', scriptorium: 'a4', kawaii: 'a5', typewriter: 'a4',
};
export const SKIN_TEXTURE: Record<SkinId, string> = {
  cyberpunk: 'holo', scriptorium: 'parchment', kawaii: 'white', typewriter: 'white',
};
export const SKIN_FONT: Record<SkinId, string> = {
  cyberpunk: 'jb', scriptorium: 'ebg', kawaii: 'comfort', typewriter: 'courier',
};
