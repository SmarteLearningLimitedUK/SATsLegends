import confetti from 'canvas-confetti';
import { triggerHaptic } from '../haptics';

const withClass = (selector: string, className: string, durationMs: number) => {
  if (typeof document === 'undefined') return;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return;
  el.classList.add(className);
  window.setTimeout(() => el.classList.remove(className), durationMs);
};

export const playCorrectAnswerJuice = () => {
  if (typeof window !== 'undefined') {
    try {
      confetti({
        particleCount: 22,
        spread: 48,
        startVelocity: 18,
        gravity: 0.78,
        scalar: 0.7,
        origin: { y: 0.62 },
        colors: ['#fde047', '#7dd3fc', '#86efac'],
      });
    } catch {
      // ignore
    }
  }

  triggerHaptic('success');
  withClass('.app-viewport', 'sat-juice-correct', 420);
};

export const playWrongAnswerJuice = () => {
  triggerHaptic('warning');
  withClass('.app-viewport', 'sat-juice-wrong', 320);
  withClass('.game-stage', 'sat-juice-shake', 280);
};

