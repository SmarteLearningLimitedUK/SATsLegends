import React from 'react';
import iconHome from '../assets/casual_ui/icons/icon__map.png';
import iconUser from '../assets/licensed/slices/icon_user.png';
import iconPlay from '../assets/casual_ui/icons/icon__play.png';
import iconBack from '../assets/licensed/slices/icon_back.png';
import iconNext from '../assets/casual_ui/icons/icon__next.png';
import iconStar from '../assets/casual_ui/icons/icon__star.png';
import iconStarOutline from '../assets/casual_ui/icons/icon__star_empty.png';
import iconQuestion from '../assets/licensed/slices/icon_question.png';
import iconCheck from '../assets/casual_ui/icons/icon__check.png';
import iconTrophy from '../assets/casual_ui/icons/icon__trophy.png';
import iconTimer from '../assets/licensed/slices/icon_timer.png';
import iconHeart from '../assets/casual_ui/icons/icon__heart.png';
import iconHeartOutline from '../assets/licensed/slices/icon_heart_outline.png';
import iconDoc from '../assets/licensed/slices/icon_doc.png';
import iconGear from '../assets/casual_ui/icons/icon__gear.png';
import iconPeople from '../assets/licensed/slices/icon_people.png';
import iconChat from '../assets/casual_ui/icons/icon__chat.png';
import iconInfo from '../assets/licensed/slices/icon_info.png';
import iconRefresh from '../assets/casual_ui/icons/icon__restart.png';
import iconX from '../assets/casual_ui/icons/icon__close.png';
import iconMinus from '../assets/licensed/slices/icon_minus.png';
import iconPlus from '../assets/licensed/slices/icon_plus.png';
import iconMedal from '../assets/licensed/slices/icon_medal.png';
import iconGem from '../assets/casual_ui/icons/icon__gem.png';
import iconCoin from '../assets/casual_ui/icons/icon__coin.png';
import iconBigHeart from '../assets/licensed/slices/icon_big_heart.png';
import iconGamepad from '../assets/licensed/slices/icon_gamepad.png';
import iconStopwatch from '../assets/licensed/slices/icon_stopwatch.png';
import iconPlusSquare from '../assets/licensed/slices/icon_plus_square.png';

const ICONS = {
  home: iconHome,
  user: iconUser,
  play: iconPlay,
  back: iconBack,
  next: iconNext,
  star: iconStar,
  starOutline: iconStarOutline,
  question: iconQuestion,
  check: iconCheck,
  trophy: iconTrophy,
  timer: iconTimer,
  heart: iconHeart,
  heartOutline: iconHeartOutline,
  doc: iconDoc,
  gear: iconGear,
  people: iconPeople,
  chat: iconChat,
  info: iconInfo,
  refresh: iconRefresh,
  x: iconX,
  minus: iconMinus,
  plus: iconPlus,
  medal: iconMedal,
  gem: iconGem,
  coin: iconCoin,
  bigHeart: iconBigHeart,
  gamepad: iconGamepad,
  stopwatch: iconStopwatch,
  plusSquare: iconPlusSquare,
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
