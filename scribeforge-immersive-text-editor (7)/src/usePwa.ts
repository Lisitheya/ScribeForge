// ─── Установка PWA: перехват приглашения и статус ────────────────────────────
import { useEffect, useState } from 'react';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(f => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e as BIPEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true);

export function usePwaInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force(x => x + 1);
    listeners.add(f);
    return () => { listeners.delete(f); };
  }, []);

  return {
    canInstall: !!deferred && !isStandalone(),
    installed: isStandalone(),
    install: async () => {
      if (!deferred) return false;
      await deferred.prompt();
      const res = await deferred.userChoice;
      deferred = null;
      notify();
      return res.outcome === 'accepted';
    },
  };
}
