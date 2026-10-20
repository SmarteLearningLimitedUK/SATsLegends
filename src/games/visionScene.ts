import { createContext } from 'react';
import { VISION_ATLAS_LAYOUT } from './visionAtlasLayout';
import { HERO_ATLAS_LAYOUT } from './heroAtlasLayout';

export type VisionCue = 'idle' | 'reward' | 'error';
export interface VisionSceneState { key: string; cue: VisionCue; sequence: number; paused: boolean; heroIdentity?: string; }
export const VisionSceneContext = createContext<VisionSceneState>({ key: '', cue: 'idle', sequence: 0, paused: false });
const environments = import.meta.glob('../assets/game-visions/environments/*.{webp,png}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const characters = import.meta.glob('../assets/game-visions/characters/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
// Extracted stone, forest, glacier and desert props sit beneath live maths.
const objects = import.meta.glob('../assets/game-visions/objects/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const walks = import.meta.glob('../assets/game-visions/walks/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const hasHeroSheets = (key:string) => Boolean(HERO_ATLAS_LAYOUT[`characters/${key}-v3`]&&HERO_ATLAS_LAYOUT[`walks/${key}-v2`]);
const ENVIRONMENT_VERSIONS: Record<string, number> = { take_out_rush: 4, angle_arena: 3, problem_pyramid: 2, change_counter: 2 };
export const getVisionEnvironment = (key: string) => {
  const name = `../assets/game-visions/environments/${key}-v${ENVIRONMENT_VERSIONS[key] ?? 1}`;
  return environments[`${name}.webp`] ?? environments[`${name}.png`];
};
export const getVisionCharacter = (key: string) => (hasHeroSheets(key)?characters[`../assets/game-visions/characters/${key}-v3.webp`]:undefined) ?? characters[`../assets/game-visions/characters/${key}-v2.webp`] ?? characters[`../assets/game-visions/characters/${key}-v1.webp`];
export const getVisionObject = (key: string) => objects[`../assets/game-visions/objects/${key}-v1.webp`];
export const getVisionWalk = (key: string) => (hasHeroSheets(key)?walks[`../assets/game-visions/walks/${key}-v2.webp`]:undefined) ?? walks[`../assets/game-visions/walks/${key}-v1.webp`];
export function getVisionFrameLayout(key: string, walking = false) {
  const version = !walking && characters[`../assets/game-visions/characters/${key}-v2.webp`] ? 'v2' : 'v1';
  return VISION_ATLAS_LAYOUT[`${walking ? 'walks' : 'characters'}/${key}-${version}`];
}
export const visionPlayerIdentity = (avatarId: string) => avatarId === 'barratt' ? 'deer' : avatarId;

/** Explicit catalogue: characters and settings follow the approved per-game concepts. */
export const VISION_CAST: Record<string, string> = {
  place_value_panic: 'rhino', number_line_ninja: 'goblin', prime_pop: 'acropolis-caster', rounding_rocket: 'acropolis-pilot', maths_vs_zombies: 'deer',
  take_out_rush: 'forest-chef', fraction_forge: 'smith', match3_equivalence: 'owl', percent_power: 'forest-guardian', simplify_sprint: 'deer',
  angle_arena: 'goblin', polygon_palace: 'glacier-guide', area_architect: 'glacier-builder', rotation_relay: 'glacier-builder', coordinates_quest: 'glacier-builder', conversion_canyon: 'glacier-builder', perimeter_path: 'glacier-builder',
  mean_machine: 'desert-scholar', graph_grabber: 'desert-scholar', line_graph_lab: 'desert-scholar', data_detective: 'desert-detective',
  factor_frenzy: 'sentinel', multiplication_mine: 'outpost-miner', order_ops_arena: 'goblin', formula_forge: 'outpost-miner', remainder_run: 'mountain-explorer',
  time_keeper_cove: 'timekeeper', problem_pyramid: 'mountain-explorer', unit_mixer: 'deer', change_counter: 'merchant',
  potion_panic: 'alchemist', share_splitter: 'goblin', ratio_fractions: 'deer', scale_builder: 'glacier-builder',
  crystal_core: 'core-guide', mirror_gate: 'core-guide', matrix_match: 'core-guide',
};
export const VISION_ALIASES: Record<string, string> = { fraction_match: 'match3_equivalence', rotation_station: 'rotation_relay', timekeeper_temple: 'time_keeper_cove', potion_pour: 'potion_panic' };
export function visionIdentity(source: string): string | undefined {
  const file = source.split('/').at(-1)?.toLowerCase() || '';
  if (file.startsWith('goblin')) return 'goblin';
  if (file.startsWith('rhino')) return 'rhino';
  if (file.startsWith('zombie')) return 'zombie';
  if (file.includes('sentinel') || file.includes('factor-bot')) return 'sentinel';
  if (file.startsWith('jelly')) return 'jelly';
  if (file.startsWith('cyclops-slime')) return 'slime';
  return undefined;
}
