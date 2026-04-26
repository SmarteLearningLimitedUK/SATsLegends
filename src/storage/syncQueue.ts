/**
 * Local-first sync queue.
 *
 * Golden rule: never block gameplay.
 * - Enqueue is best-effort and never throws.
 * - Drain is best-effort and never throws.
 * - If no native bridge exists (PWA/web), this quietly does nothing.
 */

type QueuedChange = {
  key: string;
  value: string | null;
  updatedAt: number;
};

const STORAGE_KEY = 'sats-legends-sync-queue';

const safeLocalStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

const loadQueue = (): QueuedChange[] => {
  try {
    const raw = safeLocalStorage()?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveQueue = (queue: QueuedChange[]) => {
  try {
    safeLocalStorage()?.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // fail silently
  }
};

export const enqueueSyncChange = (key: string, value: string | null) => {
  try {
    const queue = loadQueue();
    queue.push({ key, value, updatedAt: Date.now() });
    // Keep it bounded so it can never grow without limit.
    const bounded = queue.length > 500 ? queue.slice(queue.length - 500) : queue;
    saveQueue(bounded);
  } catch {
    // fail silently
  }
};

const tryDrainQueue = async () => {
  const bridge = (window as any)?.SatsLegendsNativeSync;
  if (!bridge?.pushChanges) return;

  const queue = loadQueue();
  if (!queue.length) return;

  try {
    if (bridge.isAvailable) {
      const ok = await bridge.isAvailable();
      if (!ok) return;
    }
  } catch {
    return;
  }

  try {
    await bridge.pushChanges(queue);
    saveQueue([]);
  } catch {
    // Keep queue intact for later retry.
  }
};

export const installNativeSyncDrain = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;

  const onOnline = () => {
    void tryDrainQueue();
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      void tryDrainQueue();
    }
  };

  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisibility);

  // Best-effort initial drain after first user interaction.
  const onFirstTap = () => {
    window.removeEventListener('pointerdown', onFirstTap);
    void tryDrainQueue();
  };
  window.addEventListener('pointerdown', onFirstTap, { once: true });

  return () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pointerdown', onFirstTap as EventListener);
  };
};

