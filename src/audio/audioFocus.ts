let pageHasAudioFocus = true;

export const isPageAudioAllowed = () => (
  typeof document === 'undefined'
  || (document.visibilityState !== 'hidden' && pageHasAudioFocus)
);

export const addPageAudioFocusListeners = (handler: () => void) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const handleFocus = () => {
    pageHasAudioFocus = true;
    handler();
  };
  const handleBlur = () => {
    pageHasAudioFocus = false;
    handler();
  };
  const handleVisibilityChange = () => {
    pageHasAudioFocus = document.visibilityState !== 'hidden';
    handler();
  };
  const handleUserGesture = () => {
    // In some embedded/A2HS contexts, window focus events are unreliable.
    // Treat any direct user interaction as "audio focus regained".
    pageHasAudioFocus = true;
    handler();
  };

  window.addEventListener('focus', handleFocus);
  window.addEventListener('blur', handleBlur);
  window.addEventListener('pageshow', handleFocus);
  window.addEventListener('pagehide', handleBlur);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pointerdown', handleUserGesture, { capture: true });
  window.addEventListener('keydown', handleUserGesture, { capture: true });

  return () => {
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('pageshow', handleFocus);
    window.removeEventListener('pagehide', handleBlur);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pointerdown', handleUserGesture, { capture: true });
    window.removeEventListener('keydown', handleUserGesture, { capture: true });
  };
};
