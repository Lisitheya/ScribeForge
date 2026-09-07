// ─── Библиотека декоративных элементов (SVG, currentColor) ──────────────────
import type { SkinId } from '../types';

export interface Decor {
  id: string;
  name: string;
  cat: string;
  skins: SkinId[] | 'any';
  kw: string[];
  svg: (c: string) => string; // c = цвет
}

const s = (w: number, h: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" style="width:min(260px,70%);height:auto;display:block">${inner}</svg>`;

export const DECORS: Decor[] = [
  // ── Универсальные
  { id: 'line-double', name: 'Двойная линия', cat: 'Линии', skins: 'any', kw: ['линия','разделитель'],
    svg: c => s(260, 20, `<g stroke="${c}" stroke-width="1.6"><line x1="4" y1="6" x2="256" y2="6"/><line x1="4" y1="14" x2="256" y2="14"/><rect x="122" y="3" width="16" height="16" transform="rotate(45 130 11)" fill="none"/></g>`) },
  { id: 'line-wave', name: 'Волна', cat: 'Линии', skins: 'any', kw: ['линия','волна'],
    svg: c => s(260, 18, `<path d="M4 9 Q 20 1, 36 9 T 68 9 T 100 9 T 132 9 T 164 9 T 196 9 T 228 9 T 260 9" fill="none" stroke="${c}" stroke-width="1.8"/>`) },
  { id: 'line-diamond', name: 'Цепь ромбов', cat: 'Линии', skins: 'any', kw: ['линия','ромб'],
    svg: c => s(260, 20, `<g fill="none" stroke="${c}" stroke-width="1.6"><line x1="4" y1="10" x2="100" y2="10"/><line x1="160" y1="10" x2="256" y2="10"/><rect x="106" y="4" width="12" height="12" transform="rotate(45 112 10)"/><rect x="142" y="4" width="12" height="12" transform="rotate(45 148 10)"/><rect x="124" y="2" width="16" height="16" fill="${c}" stroke="none" transform="rotate(45 132 10)"/></g>`) },
  { id: 'rosette', name: 'Розетка', cat: 'Орнамент', skins: 'any', kw: ['розетка','круг','цветок'],
    svg: c => s(48, 48, `<g fill="none" stroke="${c}" stroke-width="1.6"><circle cx="24" cy="24" r="6"/>${[0,45,90,135,180,225,270,315].map(a=>`<ellipse cx="24" cy="24" rx="18" ry="7" transform="rotate(${a} 24 24)"/>`).join('')}<circle cx="24" cy="24" r="2.6" fill="${c}"/></g>`) },
  { id: 'fleuron', name: 'Флерон', cat: 'Орнамент', skins: 'any', kw: ['лист','цветок','завиток'],
    svg: c => s(60, 60, `<g fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"><path d="M30 54 C 30 30, 30 20, 30 6"/><path d="M30 40 C 16 36, 12 26, 12 18 C 22 20, 28 28, 30 40"/><path d="M30 40 C 44 36, 48 26, 48 18 C 38 20, 32 28, 30 40"/><path d="M30 26 C 22 22, 20 16, 21 10 C 27 12, 30 18, 30 26"/><path d="M30 26 C 38 22, 40 16, 39 10 C 33 12, 30 18, 30 26"/></g>`) },
  { id: 'corner-vine', name: 'Уголок-лиана', cat: 'Уголки', skins: 'any', kw: ['уголок','рамка','лиана'],
    svg: c => s(80, 80, `<g fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M6 76 L 6 20 Q 6 6, 20 6 L 76 6" /><path d="M6 20 q 14 2, 18 14 q -14 -2, -18 -14"/><path d="M20 6 q 2 14, 14 18 q -2 -14, -14 -18"/><circle cx="6" cy="76" r="3" fill="${c}" stroke="none"/><circle cx="76" cy="6" r="3" fill="${c}" stroke="none"/></g>`) },
  { id: 'arabesque', name: 'Арабеска', cat: 'Орнамент', skins: 'any', kw: ['восток','узор'],
    svg: c => s(260, 26, `<g fill="none" stroke="${c}" stroke-width="1.7"><path d="M4 13 q 16 -18, 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0"/><circle cx="130" cy="13" r="4" fill="${c}" stroke="none"/></g>`) },
  { id: 'stars3', name: 'Три звезды', cat: 'Разделители', skins: 'any', kw: ['звезда','разделитель'],
    svg: c => s(120, 30, `<g fill="${c}">${[24,60,96].map((x,i)=>`<path d="M${x} ${i===1?4:8} l 3 ${i===1?8:5} l ${i===1?9:6} 0 l ${i===1?-7:-5} ${i===1?6:4} l 3 ${i===1?9:6} l -7 ${i===1?-6:-4} l -7 ${i===1?6:4} l 3 ${i===1?-9:-6} l ${i===1?-7:-5} ${i===1?-6:-4} l ${i===1?9:6} 0 z"/>`).join('')}</g>`) },

  // ── Киберпанк
  { id: 'cy-techcorner', name: 'Технический угол', cat: 'Киберпанк', skins: ['cyberpunk'], kw: ['уголок','техно'],
    svg: c => s(80, 80, `<g fill="none" stroke="${c}" stroke-width="2"><path d="M8 72 L8 8 L72 8"/><path d="M20 72 L20 20 L72 20" opacity=".55"/><rect x="8" y="8" width="10" height="10" fill="${c}" stroke="none"/><rect x="60" y="8" width="12" height="4" fill="${c}" stroke="none"/></g>`) },
  { id: 'cy-glitch', name: 'Глитч-полоса', cat: 'Киберпанк', skins: ['cyberpunk'], kw: ['глитч','пиксели'],
    svg: c => s(260, 22, `<g fill="${c}"><rect x="4" y="8" width="60" height="6"/><rect x="70" y="4" width="24" height="4" opacity=".6"/><rect x="70" y="14" width="38" height="4"/><rect x="118" y="8" width="90" height="6" opacity=".85"/><rect x="216" y="6" width="14" height="10"/><rect x="238" y="9" width="18" height="4" opacity=".5"/><rect x="160" y="2" width="10" height="3"/></g>`) },
  { id: 'cy-neonline', name: 'Неоновая линия', cat: 'Киберпанк', skins: ['cyberpunk'], kw: ['линия','неон'],
    svg: c => s(260, 16, `<line x1="4" y1="8" x2="256" y2="8" stroke="${c}" stroke-width="5" opacity=".25" stroke-linecap="round"/><line x1="4" y1="8" x2="256" y2="8" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`) },
  { id: 'cy-qr', name: 'QR-блок', cat: 'Киберпанк', skins: ['cyberpunk'], kw: ['qr','код','квадрат'],
    svg: c => s(64, 64, `<g fill="${c}">${[[0,0],[44,0],[0,44],[22,22],[44,22],[11,33],[33,44],[22,44],[55,44],[44,33],[33,11],[22,0]].map(([x,y])=>`<rect x="${x+4}" y="${y+4}" width="9" height="9"/>`).join('')}<rect x="9" y="9" width="0" height="0"/></g>`) },
  { id: 'cy-chevrons', name: 'Шевроны', cat: 'Киберпанк', skins: ['cyberpunk'], kw: ['стрелки','шеврон'],
    svg: c => s(120, 20, `<g fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="square">${[0,1,2,3].map(i=>`<path d="M${10+i*28} 3 l 12 7 l -12 7" opacity="${1-i*0.22}"/>`).join('')}</g>`) },

  // ── Скрипторий
  { id: 'sc-knot', name: 'Кельтский узел', cat: 'Средневековье', skins: ['scriptorium'], kw: ['узел','кельт'],
    svg: c => s(120, 40, `<g fill="none" stroke="${c}" stroke-width="1.8"><path d="M20 20 a14 14 0 1 1 28 0 a14 14 0 1 1 -28 0 M34 6 a14 14 90 1 1 0 28 a14 14 90 1 1 0 -28"/><path d="M62 20 a14 14 0 1 1 28 0 a14 14 0 1 1 -28 0 M76 6 a14 14 90 1 1 0 28 a14 14 90 1 1 0 -28"/><path d="M104 20 a14 14 0 1 1 28 0 a14 14 0 1 1 -28 0" transform="translate(-14 0)"/></g>`) },
  { id: 'sc-gothic', name: 'Готическая роза', cat: 'Средневековье', skins: ['scriptorium'], kw: ['роза','готика','окно'],
    svg: c => s(60, 60, `<g fill="none" stroke="${c}" stroke-width="1.6"><circle cx="30" cy="30" r="24"/><circle cx="30" cy="30" r="8"/>${[0,45,90,135,180,225,270,315].map(a=>`<path d="M30 8 A 22 22 0 0 1 52 30" transform="rotate(${a} 30 30)"/>`).join('')}</g>`) },
  { id: 'sc-vine', name: 'Лиана-разделитель', cat: 'Средневековье', skins: ['scriptorium'], kw: ['лиана','листья','разделитель'],
    svg: c => s(260, 24, `<g fill="none" stroke="${c}" stroke-width="1.7" stroke-linecap="round"><path d="M6 12 C 60 4, 90 20, 130 12 C 170 4, 200 20, 254 12"/><path d="M52 10 q 4 -8, 12 -6 q -4 8, -12 6"/><path d="M198 10 q -4 8, -12 6 q 4 -8, 12 -6"/><circle cx="130" cy="12" r="3.4" fill="${c}" stroke="none"/></g>`) },
  { id: 'sc-shield', name: 'Рыцарский щит', cat: 'Средневековье', skins: ['scriptorium'], kw: ['щит','герб'],
    svg: c => s(56, 66, `<g fill="none" stroke="${c}" stroke-width="1.8"><path d="M28 4 L 50 10 V 32 C 50 48, 40 58, 28 62 C 16 58, 6 48, 6 32 V 10 Z"/><path d="M28 4 V 62 M6 26 H 50"/><circle cx="28" cy="16" r="3.4" fill="${c}" stroke="none"/></g>`) },
  { id: 'sc-cross', name: 'Крест-виньетка', cat: 'Средневековье', skins: ['scriptorium'], kw: ['крест','виньетка'],
    svg: c => s(40, 40, `<g fill="${c}"><path d="M18 4 h4 v12 h12 v4 h-12 v12 h-4 v-12 h-12 v-4 h12 z"/></g>`) },

  // ── Кавай
  { id: 'kw-hearts', name: 'Сердечки', cat: 'Кавай', skins: ['kawaii'], kw: ['сердце','милый'],
    svg: c => s(130, 26, `<g fill="${c}">${[[16,15,.7],[42,13,1],[70,16,.8],[98,13,1.05]].map(([x,y,k]:any)=>`<path transform="translate(${x} ${y}) scale(${k})" d="M0 4 C -8 -6, -20 2, 0 14 C 20 2, 8 -6, 0 4"/>`).join('')}</g>`) },
  { id: 'kw-stars', name: 'Звёздная пыль', cat: 'Кавай', skins: ['kawaii'], kw: ['звёзды'],
    svg: c => s(160, 30, `<g fill="${c}">${[[14,16,1],[46,9,.7],[78,18,1.2],[112,12,.8],[142,17,1]].map(([x,y,k]:any)=>`<path transform="translate(${x} ${y}) scale(${k})" d="M0 -8 L2 -2 L8 -2 L3 2 L5 8 L0 4 L-5 8 L-3 2 L-8 -2 L-2 -2 Z"/>`).join('')}</g>`) },
  { id: 'kw-rainbow', name: 'Радуга', cat: 'Кавай', skins: ['kawaii'], kw: ['радуга','облако'],
    svg: c => s(120, 44, `<g fill="none" stroke-width="4"><path d="M20 40 A 40 40 0 0 1 100 40" stroke="#ff9db3"/><path d="M28 40 A 32 32 0 0 1 92 40" stroke="#ffd08a"/><path d="M36 40 A 24 24 0 0 1 84 40" stroke="#a3e6b1"/><path d="M44 40 A 16 16 0 0 1 76 40" stroke="#9ccbf2"/><g fill="${c}"><ellipse cx="18" cy="38" rx="10" ry="7"/><ellipse cx="102" cy="38" rx="10" ry="7"/></g></g>`) },
  { id: 'kw-cloud', name: 'Облачко', cat: 'Кавай', skins: ['kawaii'], kw: ['облако'],
    svg: c => s(90, 40, `<g fill="none" stroke="${c}" stroke-width="2"><path d="M20 32 a9 9 0 0 1 2 -17 a11 11 0 0 1 21 -3 a9.5 9.5 0 0 1 17 6 a8 8 0 0 1 -3 14 z"/><circle cx="34" cy="24" r="1.4" fill="${c}"/><circle cx="50" cy="24" r="1.4" fill="${c}"/><path d="M36 29 q 6 4, 12 0" stroke-linecap="round"/></g>`) },
  { id: 'kw-ribbon', name: 'Ленточка', cat: 'Кавай', skins: ['kawaii'], kw: ['лента','бант'],
    svg: c => s(100, 34, `<g fill="none" stroke="${c}" stroke-width="2"><path d="M50 17 C 30 4, 14 10, 18 22 C 22 32, 40 28, 50 17 C 60 28, 78 32, 82 22 C 86 10, 70 4, 50 17 Z"/><circle cx="50" cy="17" r="5" fill="${c}" stroke="none" opacity=".85"/></g>`) },

  // ── Печатная машинка
  { id: 'tw-rule', name: 'Двойное правило', cat: 'Машинка', skins: ['typewriter'], kw: ['линия'],
    svg: c => s(260, 16, `<g stroke="${c}"><line x1="4" y1="4" x2="256" y2="4" stroke-width="2.4"/><line x1="4" y1="11" x2="256" y2="11" stroke-width="1"/></g>`) },
  { id: 'tw-asterisk', name: 'Астериски', cat: 'Машинка', skins: ['typewriter'], kw: ['звёздочки','разделитель'],
    svg: c => s(120, 24, `<g stroke="${c}" stroke-width="2">${[24,60,96].map(x=>`<g transform="rotate(${x%3*20-10} ${x} 12)"><line x1="${x-7}" y1="12" x2="${x+7}" y2="12"/><line x1="${x}" y1="5" x2="${x}" y2="19"/><line x1="${x-5}" y1="7" x2="${x+5}" y2="17"/><line x1="${x+5}" y1="7" x2="${x-5}" y2="17"/></g>`).join('')}</g>`) },
  { id: 'tw-arrow', name: 'Стрелка', cat: 'Машинка', skins: ['typewriter'], kw: ['стрелка'],
    svg: c => s(140, 20, `<g stroke="${c}" stroke-width="2" fill="none"><line x1="4" y1="10" x2="118" y2="10"/><path d="M108 3 l 12 7 l -12 7"/><line x1="30" y1="6" x2="30" y2="14"/><line x1="60" y1="6" x2="60" y2="14"/></g>`) },
  { id: 'tw-box', name: 'Клетка-рамка', cat: 'Машинка', skins: ['typewriter'], kw: ['рамка','клетка'],
    svg: c => s(140, 26, `<g fill="none" stroke="${c}" stroke-width="1.6"><rect x="6" y="4" width="128" height="18"/><line x1="46" y1="4" x2="46" y2="22"/><line x1="94" y1="4" x2="94" y2="22"/></g>`) },
];

export const decorById = (id: string) => DECORS.find(d => d.id === id);

export const decorHtml = (d: Decor, color: string) =>
  `<div class="sf-decor" contenteditable="false" data-decor="${d.id}">${d.svg(color)}</div><p></p>`;
