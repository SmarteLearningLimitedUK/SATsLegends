export type SatDisplayMode = 'standalone' | 'browser';

export type SatDeviceEnv = {
  isIOS: boolean;
  isIPad: boolean;
  displayMode: SatDisplayMode;
};

const safeMatchMedia = (query: string) => {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return null;
  try {
    return window.matchMedia(query);
  } catch {
    return null;
  }
};

export const getSatDeviceEnv = (): SatDeviceEnv => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isIOS: false, isIPad: false, displayMode: 'browser' };
  }

  const ua = navigator.userAgent ?? '';
  const platform = (navigator as unknown as { platform?: string }).platform ?? '';
  const maxTouchPoints = (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints ?? 0;

  const isiOSDevice = /iPad|iPhone|iPod/i.test(ua);
  // iPadOS Safari often reports as Mac; touch points is the usual reliable signal.
  const isIPadOS = platform === 'MacIntel' && maxTouchPoints > 1;
  const isIOS = isiOSDevice || isIPadOS;

  const isIPad = /iPad/i.test(ua) || isIPadOS;

  const standaloneByNavigator = Boolean((navigator as unknown as { standalone?: boolean }).standalone);
  const standaloneByMedia = Boolean(safeMatchMedia('(display-mode: standalone)')?.matches);
  const displayMode: SatDisplayMode = standaloneByNavigator || standaloneByMedia ? 'standalone' : 'browser';

  return { isIOS, isIPad, displayMode };
};

export const installSatBrowserAutoDetect = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => undefined;

  const root = document.documentElement;
  const env = getSatDeviceEnv();

  root.dataset.satDevice = env.isIPad ? 'ipad' : env.isIOS ? 'ios' : 'desktop';
  root.dataset.satDisplayMode = env.displayMode;
  root.classList.toggle('sat-ios', env.isIOS);
  root.classList.toggle('sat-ipad', env.isIPad);
  root.classList.toggle('sat-browser', env.displayMode === 'browser');
  root.classList.toggle('sat-standalone', env.displayMode === 'standalone');

  // iOS Safari (including iPad) can mis-report dvh/svh during URL bar show/hide.
  // Use an explicit pixel height CSS var as the source of truth for shell layout.
  const applyViewportHeight = () => {
    const vv = window.visualViewport;
    const height = Math.round((vv?.height ?? window.innerHeight) || 0);
    if (height > 0) root.style.setProperty('--sat-viewport-height', `${height}px`);
  };

  if (env.isIOS) {
    applyViewportHeight();
    window.addEventListener('resize', applyViewportHeight, { passive: true });
    window.addEventListener('orientationchange', applyViewportHeight, { passive: true });
    window.visualViewport?.addEventListener('resize', applyViewportHeight, { passive: true });
    window.visualViewport?.addEventListener('scroll', applyViewportHeight, { passive: true });
  }

  return () => {
    window.removeEventListener('resize', applyViewportHeight);
    window.removeEventListener('orientationchange', applyViewportHeight);
    window.visualViewport?.removeEventListener('resize', applyViewportHeight);
    window.visualViewport?.removeEventListener('scroll', applyViewportHeight);
  };
};
