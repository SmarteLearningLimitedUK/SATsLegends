import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_MUTE_SYNC_EVENT } from '../gameHudEvents';
import { isPageAudioAllowed } from './audioFocus';

export type SoundId =
  | 'ui_click'
  | 'tap'
  | 'correct'
  | 'wrong'
  | 'victory'
  | 'defeat'
  | 'monster_growl'
  | 'tick'
  | 'welcome_music'
  | 'level_music'
  | 'calm_music';

type SoundKind = 'sfx' | 'music' | 'ambient';

type PlayOptions = {
  volume?: number;
  loop?: boolean;
  kind?: SoundKind;
  allowOverlap?: boolean;
  cooldownMs?: number;
  context?: string;
  source?: string;
};

type LoopHandle = {
  id: SoundId;
  element: HTMLAudioElement;
  kind: SoundKind;
};

const readMuted = () => (
  typeof localStorage !== 'undefined' && localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true'
);

class SatAudioManager {
  private muted = readMuted();
  private readonly baseElements = new Map<string, HTMLAudioElement>();
  private readonly activeLoops = new Map<SoundId, LoopHandle>();
  private readonly lastPlayAt = new Map<SoundId, number>();

  // Debug logging (toggleable via localStorage key to avoid console noise in prod).
  private debug = (() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('SAT_AUDIO_DEBUG') === 'true';
    } catch {
      return false;
    }
  })();

  setMuted(next: boolean) {
    this.muted = next;
    // Apply immediately to loops. One-shots are allowed to end naturally.
    this.activeLoops.forEach(({ element }) => {
      element.muted = next;
      if (next) element.pause();
      else void element.play().catch(() => {});
    });
  }

  installMuteSyncListener() {
    if (typeof window === 'undefined') return () => {};
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ muted?: boolean }>).detail;
      if (typeof detail?.muted === 'boolean') this.setMuted(detail.muted);
    };
    window.addEventListener(GAME_HUD_MUTE_SYNC_EVENT, handler as EventListener);
    return () => window.removeEventListener(GAME_HUD_MUTE_SYNC_EVENT, handler as EventListener);
  }

  getMuted() {
    return this.muted;
  }

  preload(urls: string[]) {
    if (typeof Audio === 'undefined') return;
    urls.forEach((src) => {
      if (!src) return;
      if (this.baseElements.has(src)) return;
      const el = new Audio(src);
      el.preload = 'auto';
      el.loop = false;
      this.baseElements.set(src, el);
    });
  }

  playSfx(id: SoundId, src: string, opts: PlayOptions = {}) {
    return this.playInternal(id, src, { ...opts, kind: opts.kind ?? 'sfx', loop: false });
  }

  playLoop(id: SoundId, src: string, opts: PlayOptions = {}) {
    return this.playInternal(id, src, { ...opts, kind: opts.kind ?? 'music', loop: true });
  }

  stopSound(id: SoundId) {
    const loop = this.activeLoops.get(id);
    if (!loop) return;
    loop.element.pause();
    loop.element.src = '';
    this.activeLoops.delete(id);
    this.log('stop', id, { looped: true });
  }

  stopAllSfx() {
    // One-shots are clones; we can't reliably enumerate them without extra bookkeeping.
    // This is still useful because most leaks are loops/ambience.
    // Intentionally no-op for one-shots to avoid abrupt cut-offs of short UI feedback.
  }

  stopAllLoops(kindFilter?: SoundKind) {
    Array.from(this.activeLoops.values()).forEach((loop) => {
      if (kindFilter && loop.kind !== kindFilter) return;
      this.stopSound(loop.id);
    });
  }

  private playInternal(id: SoundId, src: string, opts: PlayOptions) {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return false;
    if (!src) return false;
    if (this.muted || readMuted()) return false;
    if (!isPageAudioAllowed()) return false;

    const now = Date.now();
    const cooldownMs = typeof opts.cooldownMs === 'number'
      ? opts.cooldownMs
      : (opts.loop ? 0 : 120);

    const lastAt = this.lastPlayAt.get(id) ?? 0;
    if (!opts.allowOverlap && cooldownMs > 0 && now - lastAt < cooldownMs) {
      return false;
    }
    this.lastPlayAt.set(id, now);

    // Loops: ensure single instance per id.
    if (opts.loop) {
      const existing = this.activeLoops.get(id);
      if (existing && existing.element.src === src) {
        // Ensure it's playing if focus returns.
        if (!existing.element.muted) void existing.element.play().catch(() => {});
        return true;
      }

      if (existing) this.stopSound(id);

      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.loop = true;
      audio.muted = this.muted;
      audio.volume = typeof opts.volume === 'number' ? opts.volume : 0.26;

      this.activeLoops.set(id, { id, element: audio, kind: opts.kind ?? 'music' });
      this.log('play', id, { looped: true, src, ...opts });
      try {
        void audio.play().catch(() => {});
      } catch {
        // ignore
      }
      return true;
    }

    // One-shots: clone from a cached base element so we don't mutate shared state (loop, currentTime etc).
    let base = this.baseElements.get(src);
    if (!base) {
      base = new Audio(src);
      base.preload = 'auto';
      base.loop = false;
      this.baseElements.set(src, base);
    }

    try {
      const playback = base.cloneNode(true) as HTMLAudioElement;
      playback.loop = false;
      playback.muted = this.muted;
      playback.volume = typeof opts.volume === 'number' ? opts.volume : 0.82;

      this.log('play', id, { looped: false, src, ...opts });
      void playback.play().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  private log(action: 'play' | 'stop', id: SoundId, detail: Record<string, unknown>) {
    if (!this.debug) return;
    // eslint-disable-next-line no-console
    console.log(`[SAT_AUDIO] ${action}`, {
      id,
      t: Date.now(),
      ...detail,
    });
  }
}

export const audioManager = new SatAudioManager();
