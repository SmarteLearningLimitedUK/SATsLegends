const isPressableButton = (el: HTMLElement | null) => {
  if (!el) return null;
  const btn = el.closest('button') as HTMLButtonElement | null;
  if (!btn) return null;
  if (btn.disabled) return null;
  if (btn.getAttribute('aria-disabled') === 'true') return null;
  if (btn.dataset.noPressScale === 'true') return null;
  return btn;
};

/**
 * Global button press scaling:
 * - Pressed: scale 0.96
 * - Release: spring back to 1.0
 *
 * Uses the CSS `scale` property (does not clobber Tailwind transforms).
 */
export const installPressScale = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;

  const pressed = new WeakSet<HTMLButtonElement>();

  const setScale = (btn: HTMLButtonElement, value: number) => {
    try {
      // Prefer the individual transform property so we don't overwrite translate/rotate transforms.
      (btn.style as any).scale = String(value);
    } catch {
      // Ignore.
    }
  };

  const clearScale = (btn: HTMLButtonElement) => {
    try {
      (btn.style as any).scale = '';
    } catch {
      // Ignore.
    }
  };

  const onDown = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null;
    const btn = isPressableButton(target);
    if (!btn) return;
    if (pressed.has(btn)) return;
    pressed.add(btn);
    setScale(btn, 0.96);
  };

  const springBack = (btn: HTMLButtonElement) => {
    try {
      // Ensure we start from the pressed state for a consistent feel.
      setScale(btn, 0.96);
      btn.animate(
        [
          { scale: 0.96 },
          { scale: 1.02, offset: 0.6 },
          { scale: 1.0 },
        ] as any,
        {
          duration: 220,
          easing: 'cubic-bezier(0.22, 1.02, 0.24, 1)',
        },
      );
    } catch {
      // Fall back to a simple clear.
    }
    clearScale(btn);
  };

  const onUp = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null;
    const btn = isPressableButton(target);
    if (!btn) return;
    if (!pressed.has(btn)) return;
    pressed.delete(btn);
    springBack(btn);
  };

  const onCancel = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null;
    const btn = isPressableButton(target);
    if (!btn) return;
    if (!pressed.has(btn)) return;
    pressed.delete(btn);
    clearScale(btn);
  };

  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onCancel, { passive: true });

  return () => {
    window.removeEventListener('pointerdown', onDown as EventListener);
    window.removeEventListener('pointerup', onUp as EventListener);
    window.removeEventListener('pointercancel', onCancel as EventListener);
  };
};

