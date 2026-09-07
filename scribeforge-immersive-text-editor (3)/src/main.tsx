import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Флаг для страховочного запуска в index.html: код приложения стартовал.
// Проверять «пустой ли #root» ненадёжно — React монтируется асинхронно.
(window as any).__SF_BOOTED__ = true;

// Защищённый старт: любые сбои показываем человеку, а не белым экраном.
function mount() {
  const el = document.getElementById('root');
  if (!el) throw new Error('Контейнер #root не найден');

  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // убираем заставку загрузки
  requestAnimationFrame(() => {
    const boot = document.getElementById('boot');
    if (boot) {
      boot.style.transition = 'opacity .35s';
      boot.style.opacity = '0';
      setTimeout(() => boot.remove(), 400);
    }
  });
}

try {
  mount();
} catch (err) {
  const boot = document.getElementById('boot');
  const msg = err instanceof Error ? err.message : String(err);
  if (boot) {
    boot.className = 'err';
    const m = boot.querySelector('.m');
    if (m) m.textContent = 'Ошибка запуска: ' + msg;
  }
  console.error('[ScribeForge] ошибка запуска:', err);
}
