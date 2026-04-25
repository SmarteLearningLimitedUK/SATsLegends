import buttonClickSrc from '../assets/button click.ogg';

const createClickSound = () => {
  if (typeof Audio === 'undefined') return null;

  const audio = new Audio(buttonClickSrc);
  audio.volume = 0.35;
  audio.preload = 'auto';
  return audio;
};

const clickSound = createClickSound();

export function playClickSound() {
  if (!clickSound) return;

  try {
    clickSound.currentTime = 0;
    void clickSound.play().catch(() => {});
  } catch {
    // fail silently
  }
}
