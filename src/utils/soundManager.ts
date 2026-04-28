import buttonClickSrc from '../assets/button click.ogg';
import { isPageAudioAllowed } from '../audio/audioFocus';
import { audioManager } from '../audio/audioManager';

const createClickSound = () => {
  if (typeof Audio === 'undefined') return null;

  const audio = new Audio(buttonClickSrc);
  audio.volume = 0.35;
  audio.preload = 'auto';
  return audio;
};

const clickSound = createClickSound();

export function playClickSound() {
  if (!clickSound || !isPageAudioAllowed()) return;
  // Route through the central manager for cooldown de-dupe and StrictMode safety.
  audioManager.playSfx('ui_click', buttonClickSrc, { volume: 0.35, cooldownMs: 80, source: 'soundManager' });
}
