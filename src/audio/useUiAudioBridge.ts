import { useEffect } from 'react';
import { UI_AUDIO_EVENT, UiAudioEvent } from './uiAudioEvents';
import { playClickSound } from '../utils/soundManager';
import { playGameSound } from './gameAudio';

// Lightweight bridge: central place to map UI events to existing audio functions.
// This intentionally does NOT add new assets or a new audio system.
export const useUiAudioBridge = () => {
  useEffect(() => {
    const handler = (raw: Event) => {
      const detail = (raw as CustomEvent<{ event?: UiAudioEvent }>).detail;
      const evt = detail?.event;
      if (!evt) return;

      switch (evt) {
        case 'button_press':
        case 'map_nav':
          playClickSound();
          break;
        case 'correct':
          playGameSound('correct');
          break;
        case 'wrong':
          playGameSound('incorrect');
          break;
        case 'reward':
          playGameSound('complete');
          break;
        default:
          // Keep other events as hooks only (no sound mapping yet).
          break;
      }
    };

    window.addEventListener(UI_AUDIO_EVENT, handler as EventListener);
    return () => window.removeEventListener(UI_AUDIO_EVENT, handler as EventListener);
  }, []);
};
