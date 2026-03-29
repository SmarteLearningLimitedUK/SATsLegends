import { MiniGameType } from './types';
import rhinoA from './assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_but_different_colours_create_me_an_armored_white_rhino-1.jpg';
import rhinoB from './assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_but_different_colours_create_me_an_armored_white_rhino-2.jpg';
import evilPink from './assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_but_different_colours_create_me_an_evil_pink_and_light_pur-2.jpg';
import snakeA from './assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_but_different_colours_create_me_a_snake-2.jpg';
import snakeB from './assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_but_different_colours_create_me_a_snake-3.jpg';
import kraken from './assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_create_me_a_kracken-1.jpg';
import zombieA from './assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_create_me_a_zombie-0.jpg';
import zombieB from './assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_create_me_a_zombie-1.jpg';
import zombieC from './assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_create_me_a_zombie-2.jpg';
import goblin from './assets/bosses/goblin.png';
import goblinWiz from './assets/bosses/goblinwiz.jpg';

export const BOSS_VIEWPORT_VISUALS: string[] = [
  rhinoA,
  rhinoB,
  evilPink,
  snakeA,
  snakeB,
  kraken,
  zombieA,
  zombieB,
  zombieC,
  goblin,
  goblinWiz,
];

const hashSeed = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getBossVisualForLevel = (
  gameType?: MiniGameType | null,
  levelId?: number,
): string | null => {
  if (gameType === 'timekeeper_temple') return null;
  if (!BOSS_VIEWPORT_VISUALS.length) return null;
  const seed = `${gameType || 'unknown'}-${levelId || 0}`;
  const index = hashSeed(seed) % BOSS_VIEWPORT_VISUALS.length;
  return BOSS_VIEWPORT_VISUALS[index];
};
