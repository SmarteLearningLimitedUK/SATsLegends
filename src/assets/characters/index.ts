import { AvatarData } from '../../types';

import { ORIGINAL_HEROES } from './originalHeroes';
const barrattNeutral = ORIGINAL_HEROES.barratt, barrattHappy = barrattNeutral, barrattThink = barrattNeutral;
const branNeutral = ORIGINAL_HEROES.bran, branHappy = branNeutral, branThink = branNeutral, branAttack = branNeutral;
const mochiNeutral = ORIGINAL_HEROES.mochi, mochiHappy = mochiNeutral, mochiSmile = mochiNeutral;
const vexNeutral = ORIGINAL_HEROES.vex, vexSmile = vexNeutral, vexThink = vexNeutral;

export const DEFAULT_AVATAR_ID = 'barratt';

export const CHARACTER_AVATARS: AvatarData[] = [
  {
    id: 'barratt',
    name: 'Barratt',
    image: barrattNeutral,
    portrait: barrattNeutral,
    color: 'bg-emerald-100',
    rarity: 'Common',
    level: 1,
    poses: {
      idle: [barrattNeutral, barrattHappy, barrattThink],
      victory: [barrattHappy],
      thinking: [barrattThink],
    },
  },
  {
    id: 'bran',
    name: 'Bran',
    image: branNeutral,
    portrait: branNeutral,
    color: 'bg-sky-100',
    rarity: 'Rare',
    level: 4,
    poses: {
      idle: [branNeutral, branHappy],
      victory: [branHappy],
      thinking: [branThink],
      attack: [branAttack],
      special: [branAttack],
    },
  },
  {
    id: 'mochi',
    name: 'Mochi',
    image: mochiNeutral,
    portrait: mochiNeutral,
    color: 'bg-rose-100',
    rarity: 'Epic',
    level: 7,
    poses: {
      idle: [mochiNeutral, mochiSmile, mochiHappy],
      victory: [mochiSmile, mochiHappy],
      thinking: [mochiSmile],
    },
  },
  {
    id: 'vex',
    name: 'Vex',
    image: vexNeutral,
    portrait: vexNeutral,
    color: 'bg-sky-100',
    rarity: 'Legendary',
    level: 10,
    poses: {
      idle: [vexNeutral, vexSmile, vexThink],
      victory: [vexSmile],
      thinking: [vexThink],
    },
  },
];
