import React from 'react';
import iconBack from '../assets/licensed/slices/icon_back.png';
import iconBattle from '../assets/licensed/slices/icon_gamepad.png';
import iconBook from '../assets/licensed/slices/icon_doc.png';
import iconChat from '../assets/licensed/slices/icon_chat.png';
import iconCheck from '../assets/licensed/slices/icon_check.png';
import iconCoin from '../assets/licensed/slices/icon_coin.png';
import iconGem from '../assets/licensed/slices/icon_gem.png';
import iconHeart from '../assets/licensed/slices/icon_heart.png';
import iconHeartOutline from '../assets/licensed/slices/icon_heart_outline.png';
import iconHelp from '../assets/licensed/slices/icon_question.png';
import iconHome from '../assets/licensed/slices/icon_home.png';
import iconNext from '../assets/licensed/slices/icon_play.png';
import iconRanking from '../assets/licensed/slices/icon_medal.png';
import iconRefresh from '../assets/licensed/slices/icon_refresh.png';
import iconSetting from '../assets/licensed/slices/icon_gear.png';
import iconSound from '../assets/fantasy_hero/icons/sound.svg';
import iconSoundMute from '../assets/fantasy_hero/icons/sound_mute.svg';
import iconStar from '../assets/licensed/slices/icon_star.png';
import iconStarOutline from '../assets/licensed/slices/icon_star_outline.png';
import iconTimer from '../assets/licensed/slices/icon_timer.png';
import iconStopwatch from '../assets/licensed/slices/icon_stopwatch.png';
import iconTrophy from '../assets/licensed/slices/icon_trophy.png';
import iconUser from '../assets/licensed/slices/icon_user.png';
import iconPeople from '../assets/licensed/slices/icon_people.png';
import iconPlus from '../assets/licensed/slices/icon_plus.png';
import iconMinus from '../assets/licensed/slices/icon_minus.png';
import iconPlusSquare from '../assets/licensed/slices/icon_plus_square.png';
import iconBigHeart from '../assets/licensed/slices/icon_big_heart.png';
import iconX from '../assets/licensed/slices/icon_x.png';

const ICONS = {
  home: iconHome,
  user: iconUser,
  play: iconNext,
  back: iconBack,
  next: iconNext,
  star: iconStar,
  starOutline: iconStarOutline,
  question: iconHelp,
  check: iconCheck,
  trophy: iconTrophy,
  timer: iconTimer,
  heart: iconHeart,
  heartOutline: iconHeartOutline,
  doc: iconBook,
  gear: iconSetting,
  people: iconPeople,
  chat: iconChat,
  info: iconHelp,
  refresh: iconRefresh,
  x: iconX,
  minus: iconMinus,
  plus: iconPlus,
  medal: iconRanking,
  gem: iconGem,
  coin: iconCoin,
  bigHeart: iconBigHeart,
  gamepad: iconBattle,
  stopwatch: iconStopwatch,
  plusSquare: iconPlusSquare,
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
