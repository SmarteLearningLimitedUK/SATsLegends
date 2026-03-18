import React from 'react';
import { motion } from 'motion/react';
import { GAME_SCENE_META } from '../gameSceneMeta';
import { MiniGameType } from '../types';
import backgroundTexture from '../assets/fantasy_hero/demo_bg/pattern_512.png';
import cardAsset from '../assets/fantasy_hero/frames/item_deco.png';
import panelAsset from '../assets/fantasy_hero/frames/stage_deco_border.png';
import ribbonAsset from '../assets/fantasy_hero/title/ribbon_blue.png';
import stepIndicator from '../assets/fantasy_hero/demo_fx/glow_circle_02.png';
import panelGlow from '../assets/fantasy_hero/demo_bg/panel_inner_glow.png';

interface GameplaySceneBackdropProps {
  gameType: MiniGameType;
  backgroundOverride?: string;
  className?: string;
}

const GameplaySceneBackdrop: React.FC<GameplaySceneBackdropProps> = ({
  gameType,
  backgroundOverride,
  className = '',
}) => {
  const scene = GAME_SCENE_META[gameType];
  const backgroundImage = backgroundOverride || scene.background;
  const isCustomBackground = Boolean(backgroundOverride);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()}>
      <img
        src={backgroundImage}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${
          isCustomBackground ? 'scale-[1.02] opacity-55 blur-[0.2px]' : 'scale-[1.06] opacity-30 blur-[0.8px]'
        }`}
        draggable={false}
      />
      <img
        src={backgroundTexture}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-[0.11] mix-blend-screen"
        draggable={false}
      />
      <img
        src={panelGlow}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-[0.14] mix-blend-screen"
        draggable={false}
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${scene.tint}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(255,255,255,0.08),rgba(255,255,255,0)_36%),linear-gradient(180deg,rgba(2,6,23,0.18),rgba(2,6,23,0.46))]" />
      <motion.div
        animate={{ opacity: [0.3, 0.62, 0.3], scale: [0.97, 1.03, 0.97] }}
        transition={{ duration: 7.2, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute left-1/2 top-[8%] h-56 w-56 -translate-x-1/2 rounded-full bg-gradient-to-br ${scene.glow} blur-3xl md:h-80 md:w-80`}
      />
      <motion.img
        src={panelAsset}
        alt=""
        draggable={false}
        animate={{ y: [0, -12, 0], rotate: [0, 3, 0] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-12 top-[16%] w-44 opacity-[0.11] blur-[0.2px] md:w-64"
      />
      <motion.img
        src={cardAsset}
        alt=""
        draggable={false}
        animate={{ y: [0, 14, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 9.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-14 bottom-[18%] w-40 opacity-[0.11] blur-[0.2px] md:w-60"
      />
      <motion.img
        src={ribbonAsset}
        alt=""
        draggable={false}
        animate={{ x: [0, 18, 0], opacity: [0.1, 0.22, 0.1] }}
        transition={{ duration: 6.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[10%] top-[62%] w-36 rotate-[-8deg] opacity-[0.12] md:w-52"
      />
      <motion.img
        src={stepIndicator}
        alt=""
        draggable={false}
        animate={{ x: [0, -18, 0], opacity: [0.08, 0.22, 0.08] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-[12%] top-[14%] w-28 rotate-[16deg] opacity-[0.18] md:w-36"
      />
      {Array.from({ length: 10 }).map((_, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full bg-cyan-100"
          style={{
            width: `${2 + (index % 3) * 2}px`,
            height: `${2 + (index % 3) * 2}px`,
            left: `${8 + (index * 7) % 84}%`,
            top: `${10 + (index * 11) % 76}%`,
          }}
          animate={{ opacity: [0.08, 0.38, 0.08], y: [0, -8, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 3.4 + index * 0.22, repeat: Infinity, delay: index * 0.15 }}
        />
      ))}
      <div className={`absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t ${scene.panelTint} to-transparent opacity-82`} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0)_18%,rgba(2,6,23,0.4)_100%)]" />
    </div>
  );
};

export default GameplaySceneBackdrop;
