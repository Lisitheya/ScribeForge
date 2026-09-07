// ─── «Оракул»: офлайн-генератор имён, мест, реликвий и идей ─────────────────
import { useState } from 'react';
import { Dices, CornerDownLeft, Copy, Wand2, UserRound, Bookmark, RefreshCw } from 'lucide-react';
import {
  CULTURES, ERAS, GENRES, LOC_TYPES, BIZ_TYPES, EXTRA_KINDS,
  genName, fullNameFor, genLocation, genArtifact, genBusiness, genHeadline, genPlot,
  genExtra, comboHeadline, uniqueSeries, EPITHETS_FANTASY, pick,
} from '../data/generators';
import { editor } from '../editorBus';
import { useStore } from '../store';

type Tab = 'names' | 'places' | 'artifacts' | 'biz' | 'ideas' | 'extras';

const TABS: { id: Tab; name: string }[] = [
  { id: 'names', name: 'Имена' },
  { id: 'places', name: 'Локации' },
  { id: 'artifacts', name: 'Реликвии' },
  { id: 'biz', name: 'Организации' },
  { id: 'ideas', name: 'Заголовки и сюжеты' },
  { id: 'extras', name: 'Черты и конфликты' },
];

export default function Oracle() {
  const [tab, setTab] = useState<Tab>('names');
  const [culture, setCulture] = useState('slavic');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral'>('neutral');
  const [len, setLen] = useState<'short' | 'mid' | 'long'>('mid');
  const [rarity, setRarity] = useState('обычное');
  const [first, setFirst] = useState('');
  const [locType, setLocType] = useState('city');
  const [bizType, setBizType] = useState('cafe');
  const [genre, setGenre] = useState('fantasy');
  const [ideaKind, setIdeaKind] = useState<'both' | 'heads' | 'plots'>('both');
  const [extraKind, setExtraKind] = useState('trait');
  const [count, setCount] = useState(8);
  const [results, setResults] = useState<string[]>([]);

  const addClip = useStore(s => s.addClip);
  const insert = (t: string) => editor()?.insertTextAtSaved(t);
  const cultureDef = CULTURES.find(c => c.id === culture)!;

  const one = (): string => {
    switch (tab) {
      case 'names': {
        if (rarity === 'редкое') {
          const g = gender === 'neutral' ? (Math.random() < .5 ? 'male' : 'female') : gender;
          const full = cultureDef.full(genName(culture, g, 'long', first), g);
          return (cultureDef.era === 'Фэнтези' || cultureDef.era === 'Средневековье')
            ? `${full} ${pick(EPITHETS_FANTASY)}` : full;
        }
        if (rarity === 'полное') return fullNameFor(culture, gender);
        return genName(culture, gender, len, first);
      }
      case 'places': return genLocation(locType);
      case 'artifacts': return genArtifact();
      case 'biz': return genBusiness(bizType);
      case 'ideas':
        return ideaKind === 'heads' ? genHeadline(genre)
          : ideaKind === 'plots' ? genPlot(genre)
          : (Math.random() < .6 ? genHeadline(genre) : genPlot(genre));
      case 'extras': return genExtra(extraKind);
    }
  };

  const generate = () => setResults(uniqueSeries(one, count));
  const wide = tab === 'ideas' || tab === 'extras';

  return (
    <div className="oracle-grid">
      <div className="oracle-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`dock-btn ${tab === t.id ? 'on' : ''}`}
            onClick={() => { setTab(t.id); setResults([]); }}>{t.name}</button>
        ))}
        <div className="lbl" style={{ marginTop: 12 }}>Сколько — {count}</div>
        <input type="range" min={4} max={24} value={count} onChange={e => setCount(+e.target.value)} />
      </div>

      <div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {tab === 'names' && (
            <>
              <select className="input" style={{ width: 190 }} value={culture} onChange={e => setCulture(e.target.value)}>
                {ERAS.map(era => (
                  <optgroup key={era} label={era}>
                    {CULTURES.filter(c => c.era === era).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                ))}
              </select>
              <select className="input" style={{ width: 120 }} value={gender} onChange={e => setGender(e.target.value as any)}>
                <option value="male">Мужской</option><option value="female">Женский</option><option value="neutral">Нейтральный</option>
              </select>
              <select className="input" style={{ width: 118 }} value={len} onChange={e => setLen(e.target.value as any)} disabled={rarity !== 'обычное'}>
                <option value="short">Короткое</option><option value="mid">Среднее</option><option value="long">Длинное</option>
              </select>
              <select className="input" style={{ width: 140 }} value={rarity} onChange={e => setRarity(e.target.value)}>
                <option value="обычное">Только имя</option>
                <option value="полное">Полное имя</option>
                <option value="редкое">Знатное / редкое</option>
              </select>
              <input className="input" style={{ width: 86 }} placeholder="Буква" maxLength={1} value={first} onChange={e => setFirst(e.target.value)} />
              <button className="btn sm" title="Полные имена по правилам культуры"
                onClick={() => setResults(uniqueSeries(() => fullNameFor(culture, gender), count))}>
                <UserRound /> Полные
              </button>
            </>
          )}
          {tab === 'places' && (
            <select className="input" style={{ width: 220 }} value={locType} onChange={e => setLocType(e.target.value)}>
              {LOC_TYPES.map(t => <option key={t.id} value={t.id}>{t.n}</option>)}
            </select>
          )}
          {tab === 'biz' && (
            <select className="input" style={{ width: 200 }} value={bizType} onChange={e => setBizType(e.target.value)}>
              {BIZ_TYPES.map(t => <option key={t.id} value={t.id}>{t.n}</option>)}
            </select>
          )}
          {tab === 'ideas' && (
            <>
              <select className="input" style={{ width: 190 }} value={genre} onChange={e => setGenre(e.target.value)}>
                {GENRES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select className="input" style={{ width: 170 }} value={ideaKind} onChange={e => setIdeaKind(e.target.value as any)}>
                <option value="both">Заголовки и сюжеты</option>
                <option value="heads">Только заголовки</option>
                <option value="plots">Только сюжеты</option>
              </select>
              <button className="btn sm" title="Свободная комбинаторика заголовков"
                onClick={() => setResults(uniqueSeries(comboHeadline, count))}><RefreshCw /> Комбинатор</button>
            </>
          )}
          {tab === 'extras' && (
            <select className="input" style={{ width: 200 }} value={extraKind} onChange={e => setExtraKind(e.target.value)}>
              {EXTRA_KINDS.map(k => <option key={k.id} value={k.id}>{k.n}</option>)}
            </select>
          )}
          <button className="btn acc" onClick={generate}><Dices /> Сгенерировать</button>
        </div>

        <div className="ores" style={wide ? { gridTemplateColumns: '1fr' } : {}}>
          {results.map((r, i) => (
            <div className="card" key={i}>
              <span>{r}</span>
              <div className="row" style={{ gap: 2, flex: 'none' }}>
                <button className="ic" title="Вставить в текст" onClick={() => insert(r)}><CornerDownLeft /></button>
                <button className="ic" title="Сохранить в «Важные моменты»" onClick={() => addClip(r, tab === 'names' ? 'person' : tab === 'ideas' ? 'plot' : 'lore')}><Bookmark /></button>
                <button className="ic" title="Копировать" onClick={() => navigator.clipboard.writeText(r)}><Copy /></button>
              </div>
            </div>
          ))}
          {!results.length && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--sf-muted)', fontSize: 12, padding: '30px 0' }}>
              <Wand2 size={20} style={{ opacity: .4, marginBottom: 8 }} />
              <div>20 культур по эпохам, 9 типов локаций, 10 жанров и комбинаторные формулы. Всё офлайн, без повторов в выдаче.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
