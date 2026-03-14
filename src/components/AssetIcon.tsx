import React from 'react';
import iconBack from '../assets/fantasy_hero/icons/back.svg';
import iconBattle from '../assets/fantasy_hero/icons/battle.svg';
import iconBook from '../assets/fantasy_hero/icons/book.svg';
import iconChat from '../assets/fantasy_hero/icons/chat.svg';
import iconCheck from '../assets/fantasy_hero/icons/check.svg';
import iconCoin from '../assets/fantasy_hero/ui/coin.png';
import iconGem from '../assets/fantasy_hero/ui/gem.png';
import iconHeart from '../assets/fantasy_hero/icons/heart.svg';
import iconHelp from '../assets/fantasy_hero/icons/help.svg';
import iconHome from '../assets/fantasy_hero/icons/home.svg';
import iconNext from '../assets/fantasy_hero/icons/next.svg';
import iconRanking from '../assets/fantasy_hero/icons/ranking.svg';
import iconRefresh from '../assets/fantasy_hero/icons/refresh.svg';
import iconSetting from '../assets/fantasy_hero/icons/setting.svg';
import iconSound from '../assets/fantasy_hero/icons/sound.svg';
import iconSoundMute from '../assets/fantasy_hero/icons/sound_mute.svg';
import iconStar from '../assets/fantasy_hero/icons/star.svg';
import iconTimer from '../assets/fantasy_hero/icons/timer.svg';
import iconTrophy from '../assets/fantasy_hero/icons/trophy.svg';
import iconUser from '../assets/fantasy_hero/icons/user.svg';
import iconX from '../assets/fantasy_hero/icons/close.svg';

const ICONS = {
  home: iconHome,
  user: iconUser,
  play: iconBattle,
  back: iconBack,
  next: iconNext,
  star: iconStar,
  starOutline: iconStar,
  question: iconHelp,
  check: iconCheck,
  trophy: iconTrophy,
  timer: iconTimer,
  heart: iconHeart,
  heartOutline: iconHeart,
  doc: iconBook,
  gear: iconSetting,
  people: iconUser,
  chat: iconChat,
  info: iconHelp,
  refresh: iconRefresh,
  x: iconX,
  minus: iconX,
  plus: iconCheck,
  medal: iconRanking,
  gem: iconGem,
  coin: iconCoin,
  bigHeart: iconHeart,
  gamepad: iconBattle,
  stopwatch: iconTimer,
  plusSquare: iconCheck,
  sound: iconSound,
  soundMute: iconSoundMute,
} as const;

export type AssetIconName = keyof typeof ICONS;

interface AssetIconProps {
  name: AssetIconName;
  className?: string;
  alt?: string;
}

const AssetIcon: React.FC<AssetIconProps> = ({ name, className = 'w-5 h-5', alt }) => {
  return <img src={ICONS[name]} alt={alt || name} className={`object-contain ${className}`} draggable={false} />;
};

export default AssetIcon;
