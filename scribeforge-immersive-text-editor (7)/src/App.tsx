// ─── ScribeForge: каркас приложения (одно окно — одна эпоха) ────────────────
import { useEffect, useMemo, useState } from 'react';
import { useStore, useActiveDoc, activePaletteColors } from './store';
import TopBar from './components/TopBar';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import BottomDock from './components/BottomDock';
import Editor from './components/Editor';
import HomePage from './components/HomePage';
import NotesWindow from './components/NotesWindow';
import Modals from './components/Modals';
import { Feather } from 'lucide-react';

const useMedia = (q: string) => {
  const [m, setM] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const mm = matchMedia(q);
    const f = () => setM(mm.matches);
    mm.addEventListener('change', f);
    return () => mm.removeEventListener('change', f);
  }, [q]);
  return m;
};

export default function App() {
  const doc = useActiveDoc();
  const docs = useStore(s => s.docs);
  const activeId = useStore(s => s.activeId);
  const customs = useStore(s => s.customPalettes);
  const settings = useStore(s => s.settings);
  const ui = useStore(s => s.ui);
  const isMobile = useMedia('(max-width: 860px)');

  // первичная инициализация активного документа
  useEffect(() => {
    if (!activeId && docs.length) {
      useStore.setState({ activeId: docs[0].id, liveHtml: docs[0].html });
    }
  }, [activeId, docs]);

  // автоматический ночной режим по системе
  useEffect(() => {
    if (!settings.autoNight) return;
    const mm = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => useStore.getState().applyNight(mm.matches);
    apply();
    mm.addEventListener('change', apply);
    return () => mm.removeEventListener('change', apply);
  }, [settings.autoNight]);

  // горячие клавиши
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        useStore.getState().snapshot();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        useStore.getState().patchUi({ findOpen: true });
      }
      if (e.key === 'Escape' && useStore.getState().ui.focus) {
        useStore.getState().patchUi({ focus: false });
      }
      // Ctrl+E — заметки, Ctrl+P — предпросмотр книги
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const st = useStore.getState();
        st.patchUi({ notesOpen: !st.ui.notesOpen });
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        useStore.getState().patchUi({ modal: 'preview' });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // жесты (мобильные панели-шторки)
  useEffect(() => {
    let sx = 0, sy = 0, edge: 'l' | 'r' | 'b' | null = null;
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY;
      edge = sx < 26 ? 'l' : sx > innerWidth - 26 ? 'r' : sy > innerHeight - 30 ? 'b' : null;
    };
    const end = (e: TouchEvent) => {
      if (!edge) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      const st = useStore.getState();
      if (edge === 'l' && dx > 70 && Math.abs(dy) < 50) st.patchUi({ left: 'library', overlay: 'left' });
      if (edge === 'r' && dx < -70 && Math.abs(dy) < 50) st.patchUi({ right: 'style', overlay: 'right' });
      if (edge === 'b' && dy < -70 && Math.abs(dx) < 60) st.patchUi({ bottom: st.ui.bottom ? null : 'oracle' });
      if (edge === 'l' && dx < -70 && st.ui.overlay === 'left') st.patchUi({ overlay: null });
      if (edge === 'r' && dx > 70 && st.ui.overlay === 'right') st.patchUi({ overlay: null });
      edge = null;
    };
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchend', end, { passive: true });
    return () => {
      document.removeEventListener('touchstart', start);
      document.removeEventListener('touchend', end);
    };
  }, []);

  // Ctrl+колесо — масштаб листа
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      const st = useStore.getState();
      e.preventDefault();
      st.patchUi({ zoom: Math.min(1.8, Math.max(.5, +(st.ui.zoom - Math.sign(e.deltaY) * .08).toFixed(2))) });
    };
    document.addEventListener('wheel', onWheel, { passive: false });
    return () => document.removeEventListener('wheel', onWheel);
  }, []);

  const colors = useMemo(
    () => activePaletteColors(docs, customs, activeId),
    [docs, customs, activeId]);

  // палитра → CSS-переменные
  useEffect(() => {
    if (!colors) return;
    const r = document.documentElement.style;
    r.setProperty('--sf-bg', colors.bg);
    r.setProperty('--sf-accent', colors.accent);
    r.setProperty('--sf-paper', colors.paper);
    r.setProperty('--sf-ink', colors.ink);
    r.setProperty('--sf-muted', colors.muted);
  }, [colors]);

  useEffect(() => {
    if (doc) document.title = `${doc.title} — ScribeForge`;
  }, [doc?.title]);

  const skin = doc?.skin ?? 'scriptorium';

  const showLeft = isMobile ? ui.overlay === 'left' : !!ui.left;
  const showRight = isMobile ? ui.overlay === 'right' : !!ui.right;

  return (
    <div className={`sf-app skin-${skin} ${ui.focus ? 'focus' : ''} ${settings.reducedFx ? 'reduced-fx' : ''} ${settings.dyslexia ? 'dyslexia' : ''}`}>
      {ui.view === 'home' ? (
        <>
          <HomePage />
          <Modals />
        </>
      ) : (
      <>
      <TopBar />

      <div className="sf-main">
        {showLeft && <LeftPanel />}

        <div className="ws">
          {doc ? <Editor /> : <EmptyState />}
        </div>

        {showRight && doc && <RightPanel />}

        {/* затемнение под мобильными шторками */}
        {isMobile && ui.overlay && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(0,0,0,.34)' }}
            onClick={() => useStore.getState().patchUi({ overlay: null })} />
        )}
      </div>

      <BottomDock />
      <NotesWindow />
      <Modals />
      </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--sf-muted)', maxWidth: 340 }}>
        <Feather size={40} style={{ opacity: .4, marginBottom: 14 }} />
        <div style={{ fontSize: 15, color: '#ddd', marginBottom: 8 }}>Мастерская пуста</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 16 }}>
          Создайте новый проект — пергамент, планшет или листок уже ждут своего автора.
        </div>
        <button className="btn acc" onClick={() => useStore.getState().patchUi({ modal: 'templates', left: 'library' })}>
          Создать проект
        </button>
      </div>
    </div>
  );
}
