// ─── Шаблоны документов ──────────────────────────────────────────────────────
import type { SkinId } from '../types';
import { DECORS, decorHtml, decorById } from './decors';

export interface Template {
  id: string; name: string; skin: SkinId | 'any'; desc: string;
  build: (title: string, accent: string) => string;
}

const h1 = (t: string) => `<h1>${t}</h1>`;
const h2 = (t: string) => `<h2>${t}</h2>`;
const p = (t = '<br>') => `<p>${t}</p>`;
const q = (t: string) => `<blockquote>${t}</blockquote>`;
const dec = (id: string, c: string) => { const d = decorById(id); return d ? decorHtml(d, c) : ''; };

export const TEMPLATES: Template[] = [
  { id: 'blank', name: 'Чистый лист', skin: 'any', desc: 'Только вы и текст', build: (t) => h1(t) + p() },

  // Скрипторий
  { id: 'gramota', name: 'Грамота', skin: 'scriptorium', desc: 'Торжественный акт с печатью',
    build: (t, c) => h1(`Грамота`) + q(t) + p('Сим настоящим свидетельствуем, что…') + p() + dec('sc-vine', c) + p('<i>Подпись и печать — </i>') + dec('sc-gothic', c) },
  { id: 'prokl', name: 'Прокламация', skin: 'scriptorium', desc: 'Обращение к народу',
    build: (t, c) => h1(t) + dec('sc-knot', c) + p('Жители и гости вольного города!') + h2('Статья первая') + p() + h2('Статья вторая') + p() + dec('sc-cross', c) },
  { id: 'kingmail', name: 'Письмо королю', skin: 'scriptorium', desc: 'Личное послание',
    build: (t) => q('Вашему Величеству, с поклоном —') + h1(t) + p('Дерзаю обратиться к Вам по воле сердца и долга…') + p() + p('<i>Ваш верный слуга</i>') },
  { id: 'molitva', name: 'Молитвенник', skin: 'scriptorium', desc: 'Страница часослова',
    build: (t, c) => h1(t) + dec('sc-gothic', c) + p('Благословен свет сей страницы…') + dec('sc-vine', c) + p() },

  // Киберпанк
  { id: 'report', name: 'Отчёт корпорации', skin: 'cyberpunk', desc: 'Служебный документ',
    build: (t, c) => h1(`// ${t.toUpperCase()}`) + p('СТАТУС: КОНФИДЕНЦИАЛЬНО&nbsp;&nbsp; ДОСТУП: УРОВЕНЬ 4') + h2('>_ Сводка') + p() + dec('cy-glitch', c) + h2('>_ Детали') + p() + dec('cy-neonline', c) },
  { id: 'dossier', name: 'Досье на цель', skin: 'cyberpunk', desc: 'Карточка объекта',
    build: (t, c) => h1(`ДОСЬЕ: ${t}`) + dec('cy-techcorner', c) + p('<b>Кодовое имя:</b> ') + p('<b>Род занятий:</b> ') + p('<b>Известные связи:</b> ') + h2('Наблюдения') + p() + dec('cy-qr', c) },
  { id: 'contract', name: 'Контракт наёмника', skin: 'cyberpunk', desc: 'Сделка с девятью пунктами',
    build: (t, c) => h1(t) + p('СТОРОНЫ: Заказчик // Исполнитель') + h2('П.1 — Задача') + p() + h2('П.2 — Оплата') + p() + dec('cy-chevrons', c) + p('<b>Подпись:</b> ███████') },

  // Кавай
  { id: 'diary', name: 'Страничка дневника', skin: 'kawaii', desc: 'Записки для себя',
    build: (t, c) => h1(`☆ ${t} ☆`) + p('Сегодня был такой день…') + dec('kw-hearts', c) + p() + dec('kw-stars', c) + p() },
  { id: 'postcard', name: 'Открытка', skin: 'kawaii', desc: 'Тёплое послание',
    build: (t, c) => h1(t) + dec('kw-rainbow', c) + p('Привет! Передаю тебе немного солнца…') + dec('kw-ribbon', c) + p('<i>С любовью ♡</i>') },
  { id: 'recipe', name: 'Рецепт', skin: 'kawaii', desc: 'Кулинарная карточка',
    build: (t, c) => h1(`♡ ${t}`) + dec('kw-cloud', c) + h2('Ингредиенты') + '<ul><li>Щепотка радости</li><li>…</li></ul>' + h2('Шаги') + '<ol><li>Смешать с любовью</li><li>…</li></ol>' },

  // Машинка
  { id: 'article', name: 'Газетная статья', skin: 'typewriter', desc: 'Колонка для утреннего выпуска',
    build: (t, c) => h1(t.toUpperCase()) + p('<i>Репортаж нашего корреспондента.</i>') + dec('tw-rule', c) + p() + dec('tw-asterisk', c) + p() },
  { id: 'police', name: 'Полицейский отчёт', skin: 'typewriter', desc: 'Протокол происшествия',
    build: (t, c) => h1('ОТЧЁТ О ПРОИСШЕСТВИИ') + p(`ДЕЛО № ___&nbsp;&nbsp;&nbsp;${t}`) + dec('tw-rule', c) + p('<b>Время:</b> ') + p('<b>Место:</b> ') + h2('ОБСТОЯТЕЛЬСТВА') + p() + dec('tw-box', c) },
  { id: 'script', name: 'Сценарий', skin: 'typewriter', desc: 'Сцена с репликами',
    build: (t) => h1(t) + p('<i>ИНТ. КОМНАТА — НОЧЬ</i>') + p() + p('<b>ГЕРОЙ</b>') + p('… (реплика)') + p('<i>(ремарка)</i>') + p('<b>ГЕРОИНЯ</b>') + p('… (реплика)') },

  // Универсальные
  { id: 'novel', name: 'Роман', skin: 'any', desc: 'Три главы с разделителями',
    build: (t) => h1(t) + q('Рукопись набрана в ScribeForge') + h2('Глава первая') + p() + '<p>* * *</p>' + h2('Глава вторая') + p() + '<p>* * *</p>' + h2('Глава третья') + p() },
  { id: 'seo', name: 'SEO-статья', skin: 'any', desc: 'Структура H2/H3 + ключи',
    build: (t) => h1(t) + p('<b>Ключевые слова:</b> ') + h2('Введение') + p() + h2('Основная часть') + p() + h2('Вывод') + p() },
];

export const SKIN_DECOR_HINT = (skin: SkinId) => DECORS.filter(d => d.skins === 'any' || d.skins.includes(skin)).map(d => d.id);
