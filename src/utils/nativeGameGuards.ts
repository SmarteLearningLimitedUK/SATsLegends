type GuardOptions = {
  enabled?: boolean;
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
};

/**
 * Install global event guards that remove browser-like behaviors in iOS Safari
 * (pinch zoom / double-tap zoom helpers / long-press callouts).
 *
 * CSS handles most of this. These listeners cover Safari-specific gesture zoom
 * which can ignore touch-action + viewport meta in some cases.
 */
export const installNativeGameGuards = (options: GuardOptions = {}) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;
  if (options.enabled === false) return () => undefined;

  const preventNonEditable = (event: Event) => {
    if (isEditableTarget(event.target)) return;
    event.preventDefault();
  };

  // iOS Safari pinch-zoom gesture events.
  const gestureHandler = (event: Event) => {
    preventNonEditable(event);
  };

  // Disable context menus / long-press menus (desktop + mobile).
  const contextMenuHandler = (event: MouseEvent) => {
    if (isEditableTarget(event.target)) return;
    event.preventDefault();
  };

  // Disable selection start outside editable fields.
  const selectionStartHandler = (event: Event) => {
    if (isEditableTarget(event.target)) return;
    event.preventDefault();
  };

  // These events are non-standard but widely present on iOS Safari.
  window.addEventListener('gesturestart', gestureHandler, { passive: false } as AddEventListenerOptions);
  window.addEventListener('gesturechange', gestureHandler, { passive: false } as AddEventListenerOptions);
  window.addEventListener('gestureend', gestureHandler, { passive: false } as AddEventListenerOptions);
  document.addEventListener('contextmenu', contextMenuHandler, { passive: false });
  document.addEventListener('selectstart', selectionStartHandler, { passive: false } as AddEventListenerOptions);

  return () => {
    window.removeEventListener('gesturestart', gestureHandler as EventListener);
    window.removeEventListener('gesturechange', gestureHandler as EventListener);
    window.removeEventListener('gestureend', gestureHandler as EventListener);
    document.removeEventListener('contextmenu', contextMenuHandler as EventListener);
    document.removeEventListener('selectstart', selectionStartHandler as EventListener);
  };
};

