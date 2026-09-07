// ─── Таймер «Свеча»: горит от краёв к центру листа ──────────────────────────
import { useEffect, useState } from 'react';
import { Flame, Pause, Play, RotateCcw } from 'lucide-react';
import { useStore } from '../store';

// движок живёт вне компонента — свеча горит, даже когда ящик закрыт
const engine = {
  total: 25 * 60, left: 25 * 60, running: false,
  listeners: new Set<() => void>(),
  timer: 0 as any,
  tick() {
    this.left = Math.max(0, this.left - 1);
    document.documentElement.style.setProperty('--burn', String(1 - this.left / this.total));
    if (this.left === 0) {
      this.pause();
      useStore.getState().snapshot('Свеча догорела');
      document.title = '» Свеча догорела — версия сохранена «';
      setTimeout(() => { document.title = 'ScribeForge — Писательская мастерская'; }, 4000);
    }
    this.listeners.forEach(f => f());
  },
  start() {
    if (this.running || this.left === 0) return;
    this.running = true;
    this.timer = setInterval(() => this.tick(), 1000);
    this.listeners.forEach(f => f());
  },
  pause() {
    this.running = false;
    clearInterval(this.timer);
    this.listeners.forEach(f => f());
  },
  reset(minutes?: number) {
    this.pause();
    if (minutes) this.total = minutes * 60;
    this.left = this.total;
    document.documentElement.style.setProperty('--burn', '0');
    this.listeners.forEach(f => f());
  },
};

export function useCandle() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force(x => x + 1);
    engine.listeners.add(f);
    return () => { engine.listeners.delete(f); };
  }, []);
  return engine;
}

const fmtT = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function TimerCandle() {
  const e = useCandle();
  const [custom, setCustom] = useState('25');
  const pct = 1 - e.left / e.total;

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
      <div className="timer-face" style={{ color: e.left < 60 ? '#ff6b4a' : undefined }}>{fmtT(e.left)}</div>
      <div className="progress" style={{ maxWidth: 320, margin: '12px auto 0' }}>
        <i style={{ width: `${pct * 100}%`, background: `linear-gradient(90deg, var(--sf-accent), #ff7b3a)` }} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--sf-muted)', margin: '8px 0 14px' }}>
        Лист «горит» от краёв к центру. Когда свеча догорит — снимок версии сохранится автоматически.
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        {[5, 15, 25, 45].map(m => (
          <button key={m} className="chip" style={e.total === m * 60 && !e.running && e.left === e.total ? { borderColor: 'var(--sf-accent)', color: '#fff' } : {}}
            onClick={() => e.reset(m)}>{m} мин</button>
        ))}
        <input className="input" style={{ width: 76 }} value={custom} onChange={ev => setCustom(ev.target.value.replace(/\D/g, ''))} />
        <button className="btn sm" onClick={() => e.reset(Math.max(1, +custom || 25))}>Задать</button>
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 14 }}>
        {e.running
          ? <button className="btn acc" onClick={() => e.pause()}><Pause /> Пауза</button>
          : <button className="btn acc" onClick={() => e.start()}><Play /> Зажечь свечу</button>}
        <button className="btn" onClick={() => e.reset()}><RotateCcw /> Сброс</button>
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 14, fontSize: 11, color: 'var(--sf-muted)' }}>
        <Flame size={12} style={{ color: 'var(--sf-accent)' }} /> Прогресс: {Math.round(pct * 100)}%
      </div>
    </div>
  );
}
