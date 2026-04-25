const CLICK_SOUND_PATH = '/audio/ui-click.mp3';
const FALLBACK_CLICK_SOUND_PATH = '/assets/audio/ui-click.mp3';

const createClickSound = () => {
  if (typeof Audio === 'undefined') return null;

  const audio = new Audio(CLICK_SOUND_PATH);
  audio.volume = 0.35;
  audio.preload = 'auto';
  audio.addEventListener('error', () => {
    if (audio.src.endsWith(FALLBACK_CLICK_SOUND_PATH)) return;
    audio.src = FALLBACK_CLICK_SOUND_PATH;
    audio.load();
  }, { once: true });
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
