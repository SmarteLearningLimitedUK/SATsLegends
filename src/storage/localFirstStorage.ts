import { enqueueSyncChange } from './syncQueue';

export const localFirstStorage = {
  getItem: (key: string) => {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, value);
      enqueueSyncChange(key, value);
    } catch {
      // fail silently
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
      enqueueSyncChange(key, null);
    } catch {
      // fail silently
    }
  },
};
