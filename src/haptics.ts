export type HapticIntent = 'tap' | 'selection' | 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy';

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: Record<string, { postMessage: (payload: unknown) => void }>;
    };
    ReactNativeWebView?: {
      postMessage: (payload: string) => void;
    };
  }
}

const HAPTIC_PATTERNS: Record<HapticIntent, number[]> = {
  tap: [10],
  selection: [12],
  success: [16, 28, 18],
  warning: [18, 36, 18],
  error: [28, 44, 28, 44, 18],
  light: [8],
  medium: [16],
  heavy: [24],
};

const postNativeBridge = (intent: HapticIntent) => {
  if (typeof window === 'undefined') return false;

  const payload = { type: 'haptic', intent };

  try {
    window.webkit?.messageHandlers?.haptics?.postMessage(payload);
    return Boolean(window.webkit?.messageHandlers?.haptics);
  } catch {
    // Ignore bridge failures and fall through.
  }

  try {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      return true;
    }
  } catch {
    // Ignore bridge failures and fall through.
  }

  return false;
};

export const triggerHaptic = (intent: HapticIntent = 'tap') => {
  if (typeof window === 'undefined') return false;

  window.dispatchEvent(new CustomEvent('sats-mastery:haptic', { detail: { intent } }));

  const bridged = postNativeBridge(intent);
  if (bridged) return true;

  const pattern = HAPTIC_PATTERNS[intent];
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    return navigator.vibrate(pattern);
  }

  return false;
};
