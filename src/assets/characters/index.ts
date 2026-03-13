import { AvatarData } from '../../types';

import barrattNeutral from './mobile/Barratt/barrat_neutral.png';
import barrattHappy from './mobile/Barratt/barratt_happy.png';
import barrattThink from './mobile/Barratt/barratt_think.png';

import branNeutral from './mobile/Bran/bran_neutral.png';
import branHappy from './mobile/Bran/bran_happy.png';
import branThink from './mobile/Bran/bran_think.png';

import mochiNeutral from './mobile/Mochi/mochi_neutral.png';
import mochiHappy from './mobile/Mochi/mochi_happy.png';
import mochiSmile from './mobile/Mochi/mochi_smile.png';

import vexNeutral from './mobile/Vex/vex_neutral.png';
import vexSmile from './mobile/Vex/vex_smile.png';
import vexThink from './mobile/Vex/vex_think.png';

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
      idle: [branNeutral, branHappy, branThink],
      victory: [branHappy],
      thinking: [branThink],
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
    color: 'bg-violet-100',
    rarity: 'Legendary',
    level: 10,
    poses: {
      idle: [vexNeutral, vexSmile, vexThink],
      victory: [vexSmile],
      thinking: [vexThink],
    },
  },
];
