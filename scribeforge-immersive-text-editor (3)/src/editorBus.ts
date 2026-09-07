// ─── Мост к contentEditable: позволяет компонентам вставлять контент ────────
// Editor регистрирует здесь свои методы; остальные вызывают их.

export interface EditorApi {
  exec: (cmd: string, arg?: string) => void;
  insertHTML: (html: string) => void;
  insertTextAtSaved: (text: string) => void;
  saveSelection: () => void;
  getHTML: () => string;
  commitHTML: (html: string) => void;   // внешнее обновление (с перерисовкой)
  scrollToChapter: (index: number) => void;
  getSelectionText: () => string;
  focus: () => void;
  markIssues: (dict: string[]) => number;
  clearIssues: () => void;
  chapterHeads: () => string[];
}

let api: EditorApi | null = null;

export const registerEditor = (a: EditorApi | null) => { api = a; };
export const editor = (): EditorApi | null => api;
