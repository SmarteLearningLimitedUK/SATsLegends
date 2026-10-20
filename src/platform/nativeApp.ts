import { useSyncExternalStore } from 'react';

export const IS_IOS_APP = import.meta.env.VITE_APP_TARGET === 'ios';
const STATE_EVENT = 'legends:native-app-state';
let backgrounded = false;

function setActive(active: boolean) {
  const next = !active;
  if (next === backgrounded) return;
  backgrounded = next;
  window.dispatchEvent(new Event(STATE_EVENT));
  if (active) window.dispatchEvent(new Event('legends:account-refresh'));
}

const subscribe = (notify: () => void) => {
  window.addEventListener(STATE_EVENT, notify);
  return () => window.removeEventListener(STATE_EVENT, notify);
};

/** Native app state augments the games' existing help/rotation/result pauses. */
export function useNativeAppBackgrounded() {
  return useSyncExternalStore(subscribe, () => backgrounded, () => false);
}

export async function initializeNativeApp() {
  if (!IS_IOS_APP) return;
  document.documentElement.dataset.appTarget = 'ios';
  // Also makes the standalone iOS bundle usable in a browser for layout QA.
  if (location.pathname === '/') history.replaceState(null, '', '/play');
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;
  const { App } = await import('@capacitor/app');
  let changes = 0;
  // This listener lives for the lifetime of the app, outside React's StrictMode.
  await App.addListener('appStateChange', ({ isActive }) => { changes++; setActive(isActive); });
  const initial = await App.getState();
  if (!changes) setActive(initial.isActive);
}
