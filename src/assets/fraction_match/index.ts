import board from './board.png';
import ember from './tiles/ember.png';
import sapphire from './tiles/sapphire.png';
import emerald from './tiles/emerald.png';
import azure from './tiles/azure.png';
import verdant from './tiles/verdant.png';
import violet from './tiles/violet.png';
import storm from './tiles/storm.png';
import plasma from './tiles/plasma.png';
import gold from './tiles/gold.png';

export const FRACTION_MATCH_ASSETS = {
  board,
  tiles: {
    ember,
    sapphire,
    emerald,
    azure,
    verdant,
    violet,
    storm,
    plasma,
    gold,
  },
} as const;
