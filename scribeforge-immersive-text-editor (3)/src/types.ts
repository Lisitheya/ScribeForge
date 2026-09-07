// ─── ScribeForge core types ──────────────────────────────────────────────────

export type SkinId = 'cyberpunk' | 'scriptorium' | 'kawaii' | 'typewriter';

export interface PaletteColors {
  bg: string;     // фон рабочей области
  accent: string; // акцент (курсор, UI, декор)
  paper: string;  // материал/фон листа
  ink: string;    // цвет текста на листе
  muted: string;  // второстепенный текст UI
}

export interface Palette {
  id: string;
  name: string;
  skin: SkinId;
  colors: PaletteColors;
  custom?: boolean;
}

export type ChapterLabel = 'draft' | 'done' | 'rewrite';

export interface Version {
  ts: number;
  html: string;
  words: number;
  note?: string;
}

export interface Doc {
  id: string;
  title: string;
  html: string;
  cover?: string;   // dataURL обложки проекта
  notes?: string;   // «Заметки» — отдельная глава-черновик проекта
  skin: SkinId;
  paletteId: string;          // id or 'custom'
  customColors?: PaletteColors | null;
  formatId: string;           // paper format id
  textureId: string;
  fontId: string;
  fontSize: number;           // px
  lineHeight: number;
  letterSpacing: number;      // em * 100
  dropCap: boolean;
  tags: string[];
  desc: string;
  createdAt: number;
  updatedAt: number;
  versions: Version[];
  chapterLabels: Record<string, ChapterLabel>;
  countersGoal?: number;      // author sheets goal
}

export type ClipTag = 'lore' | 'person' | 'plot' | 'fact' | 'quote';

export const CLIP_TAGS: Record<ClipTag, { name: string; color: string }> = {
  lore:   { name: 'Лор',       color: '#e0483e' },
  person: { name: 'Персонаж',  color: '#3e7de0' },
  plot:   { name: 'Сюжет',     color: '#3ba55d' },
  fact:   { name: 'Факт',      color: '#d9a520' },
  quote:  { name: 'Цитата',    color: '#9a9aa5' },
};

export interface Clip {
  id: string;
  docId: string;
  text: string;
  tag: ClipTag;
  ts: number;
}

export interface CustomCounter {
  id: string;
  name: string;
  target: number;
  unit: 'words' | 'chars' | 'sheets';
}

export interface Settings {
  autoNight: boolean;
  night: boolean;
  strictTypewriter: boolean;
  spellcheck: boolean;
  dyslexia: boolean;
  reducedFx: boolean;
  authorGoal: number;         // целевое число авторских листов
  liveCheck: boolean;         // проверка текста на лету
  typeSound: boolean;         // звук печатной машинки
  autoSnapshot: boolean;      // авто-снимки версий
  snapshotMin: number;        // интервал авто-снимка, мин
  notesOnStart: boolean;      // открывать заметки при входе в проект
  paraIndent: boolean;        // красная строка
  justify: boolean;           // выключка по ширине
  showPageEdge: boolean;      // тень краёв страниц на листе
  confirmDelete: boolean;
}

export type LeftTab = 'library' | 'clips' | 'chapters';
export type RightTab = 'page' | 'style' | 'font';
export type BottomTool = 'counters' | 'oracle' | 'decor' | 'timer' | null;
export type ModalKind =
  | 'export' | 'templates' | 'versions' | 'clipTag' | 'table' | 'settings' | 'preview' | null;

export interface UiState {
  view: 'home' | 'editor';
  notesOpen: boolean;
  left: LeftTab | null;
  right: RightTab | null;
  bottom: BottomTool;
  modal: ModalKind;
  findOpen: boolean;
  focus: boolean;
  leftW: number;
  rightW: number;
  zoom: number;
  overlay: 'left' | 'right' | null; // mobile overlay panel
}

export interface DocFormatDef {
  id: string;
  name: string;
  w: number; // mm
  h: number; // mm, 0 = scroll (infinite)
  desc: string;
}

export interface Stats {
  words: number;
  chars: number;
  charsNoSp: number;
  lines: number;
  paras: number;
  readMin: number;
}
