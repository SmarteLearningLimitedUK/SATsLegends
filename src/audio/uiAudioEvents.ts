export type UiAudioEvent =
  | 'button_press'
  | 'button_hover'
  | 'correct'
  | 'wrong'
  | 'reward'
  | 'modal_open'
  | 'modal_close'
  | 'boss_intro'
  | 'transition'
  | 'map_nav'
  | 'calm_pulse';

export const UI_AUDIO_EVENT = 'sat-ui-audio' as const;

export const emitUiAudio = (event: UiAudioEvent, detail?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(UI_AUDIO_EVENT, { detail: { event, ...(detail || {}) } }));
};

