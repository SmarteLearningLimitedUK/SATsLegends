import { AvatarData } from '../../types';

import barrattNeutral from './mobile/Barratt/barrat_neutral.png';
import barrattHappy from './mobile/Barratt/barratt_happy.png';
import barrattThink from './mobile/Barratt/barratt_think.png';
import barrattAnimated from './barrattanimated.mp4';

import branNeutral from './mobile/Bran/bran_neutral.png';
import branHappy from './mobile/Bran/bran_happy.png';
import branThink from './mobile/Bran/bran_think.png';
import branAttack from './mobile/Bran/bran_attack.png';
import branAnimated from './brananimated.mp4';

import mochiNeutral from './mobile/Mochi/mochi_neutral.png';
import mochiHappy from './mobile/Mochi/mochi_happy.png';
import mochiSmile from './mobile/Mochi/mochi_smile.png';
import mochiAnimated from './mochianimated.mp4';

import vexNeutral from './mobile/Vex/vex_neutral.png';
import vexSmile from './mobile/Vex/vex_smile.png';
import vexThink from './mobile/Vex/vex_think.png';
import vexAnimated from './vexanimated.mp4';

export const DEFAULT_AVATAR_ID = 'barratt';

export const CHARACTER_AVATARS: AvatarData[] = [
  {
    id: 'barratt',
    name: 'Barratt',
    image: barrattNeutral,
    portrait: barrattNeutral,
    portraitVideo: barrattAnimated,
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
    portraitVideo: branAnimated,
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
    portraitVideo: mochiAnimated,
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
    portraitVideo: vexAnimated,
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
