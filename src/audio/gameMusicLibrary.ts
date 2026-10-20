/** User-supplied level music. Alternate arrangements remain separate tracks. */
const assets = import.meta.glob('../assets/audio/music/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const levelMusicTracks: Record<string, string> = {
  angle_arena: 'tribal-1mn30s-128bpm-loop',
  area_architect: 'tabula-rasa-main-full',
  change_counter: 'cs-funk-09-d-110-bpm-2',
  chart_challenge: 'short-version',
  conversion_canyon: 'sahara-desert',
  coordinates_quest: 'silk-way',
  crystal_core: 'creation-of-the-universe-by-soundroll',
  data_detective: 'reconciliation-main-full',
  factor_frenzy: 'tribal-1mn33s-128bpm-std',
  formula_forge: 'passing-the-torch-main-full',
  fraction_forge: 'desert-heat',
  fraction_match: 'full-track',
  graph_grabber: 'silk-way',
  lava_path: 'tribal-1mn33s-128bpm-drumsonly',
  line_graph_lab: 'short-version',
  maths_vs_zombies: 'wile-jungle-main-full',
  match3_equivalence: 'full-track',
  mean_machine: 'cs-funk-09-d-110-bpm-2',
  multiplication_mine: 'desert-heat',
  number_line_ninja: 'silk-way',
  order_ops_arena: 'passing-the-torch-main-full',
  percent_power: 'creation-of-the-universe-by-soundroll',
  perimeter_path: 'desert-heat-only-guitar',
  place_value_panic: 'opener-version',
  polygon_palace: 'tabula-rasa-main-full',
  potion_panic: 'forest',
  prime_pop: 'full-track',
  problem_pyramid: 'sahara-desert',
  ratio_fractions: 'tribal-1mn33s-128bpm-std',
  remainder_run: 'passing-the-torch-main-full',
  rotation_relay: 'silk-way',
  rounding_rocket: 'creation-of-the-universe-by-soundroll',
  scale_builder: 'tabula-rasa-main-full',
  share_splitter: 'forest',
  simplify_sprint: 'tribal-1mn30s-128bpm-loop',
  take_out_rush: 'cs-funk-09-d-110-bpm-2',
  time_keeper_cove: 'reconciliation-main-full',
  unit_mixer: 'desert-heat-only-guitar',
};
export function getLevelMusicUrl(blueprintKey?: string | null): string {
  const track = (blueprintKey && levelMusicTracks[blueprintKey]) || 'full-track';
  return assets[`../assets/audio/music/${track}.mp3`];
}

/** Stream long tracks rather than decoding every level into Web Audio memory. */
export function createLevelMusicPlayer(ctx: AudioContext, destination: AudioNode) {
  const media = new Audio();
  media.preload = 'none';
  media.loop = true;
  const source = ctx.createMediaElementSource(media);
  source.connect(destination);
  let trackUrl = '';
  const pause = () => media.pause();
  return {
    play(url: string) {
      if (trackUrl !== url) {
        media.pause();
        media.src = url;
        trackUrl = url;
      }
      if (!media.paused) return;
      void media.play().catch(() => { /* A later player gesture can retry. */ });
    },
    pause,
    dispose() { pause(); media.removeAttribute('src'); media.load(); source.disconnect(); },
  };
}
