/**
 * SATs Legends Design Tokens (Single Source of Truth)
 *
 * IMPORTANT:
 * - These tokens are used to keep AAA consistency across screens.
 * - Do not introduce one-off spacing/radii/shadows/colors in minigames.
 * - Layout maths (viewport/safe-area proportions) are locked in CSS + shell components.
 */

export const tokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    screenPaddingX: 8,
    panelGap: 8,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    pill: 999,
  },
  typography: {
    fontFamily: 'Fredoka, sans-serif',
    sizes: {
      heading: 'clamp(1.1rem, 3.3vw, 1.6rem)',
      question: 'clamp(0.92rem, 2.7vw, 1.1rem)',
      body: 'clamp(0.82rem, 2.3vw, 0.98rem)',
      button: 'clamp(0.82rem, 2.3vw, 1rem)',
      caption: 'clamp(0.62rem, 1.9vw, 0.78rem)',
    },
  },
  animation: {
    pressScale: 0.96,
    timingsMs: {
      press: 90,
      release: 220,
      correctPulse: 420,
      wrongShake: 280,
    },
    easing: {
      springy: 'cubic-bezier(0.22, 1.02, 0.24, 1)',
      standard: 'cubic-bezier(0.2, 0.0, 0.0, 1)',
    },
  },
  calm: {
    backgroundGradient: 'var(--sat-calm-bg)',
    panelGradient: 'var(--sat-calm-panel)',
    glow: 'var(--sat-calm-glow)',
    accent: 'var(--sat-calm-accent)',
    text: 'var(--sat-calm-text)',
    particleOpacity: 0.38,
    timingsMs: {
      drift: 5200,
      breathe: 3200,
    },
  },
} as const;
