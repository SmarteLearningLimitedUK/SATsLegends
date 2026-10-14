import { createContext } from 'react';

// One complete, illustrated environment per activity. Vite fingerprints the assets.
const files = import.meta.glob('../assets/maps/scenes/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const aliases: Record<string, string> = {
  timekeeper_temple: 'chrono', unit_mixer: 'lava', treasure_path: 'coordinates_quest',
  coordinate_quest: 'coordinates_quest', observatory_overload: 'line_graph_lab',
  place_value_peaks: 'place_value_panic', equation_grove: 'order_ops_arena',
  rule_runner: 'problem_pyramid', transform_temple: 'rotation_station',
  scale_safari: 'scale_builder', scales_of_the_sun: 'conversion_canyon',
  measurement_forge: 'conversion_canyon', tower_of_factors: 'factor_frenzy',
};
export function getGameSceneArtwork(id: string): string | undefined {
  return files[`../assets/maps/scenes/${aliases[id] ?? id}.webp`];
}
export const GameSceneArtworkContext = createContext<string | undefined>(undefined);
