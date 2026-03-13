import React from 'react';
import { motion } from 'motion/react';
import { Check } from './GameIcons';
import AnimatedAvatar from './AnimatedAvatar';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';

interface AvatarSelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

const HERO_STYLES: Record<string, { glow: string; tint: string; ring: string; name: string }> = {
  barratt: {
    glow: 'from-emerald-300/40 via-cyan-300/14 to-transparent',
    tint: 'from-emerald-300/20 via-sky-400/12 to-slate-950/72',
    ring: 'shadow-[0_0_36px_rgba(74,222,128,0.32)]',
    name: 'from-emerald-200 via-cyan-100 to-white',
  },
  bran: {
    glow: 'from-sky-300/42 via-blue-300/16 to-transparent',
    tint: 'from-sky-300/22 via-indigo-300/14 to-slate-950/72',
    ring: 'shadow-[0_0_36px_rgba(96,165,250,0.34)]',
    name: 'from-sky-200 via-blue-100 to-white',
  },
  mochi: {
    glow: 'from-rose-300/42 via-fuchsia-300/16 to-transparent',
    tint: 'from-rose-300/20 via-pink-300/14 to-slate-950/72',
    ring: 'shadow-[0_0_38px_rgba(244,114,182,0.32)]',
    name: 'from-rose-100 via-pink-100 to-white',
  },
  vex: {
    glow: 'from-violet-300/42 via-indigo-300/16 to-transparent',
    tint: 'from-violet-300/20 via-indigo-300/14 to-slate-950/72',
    ring: 'shadow-[0_0_38px_rgba(167,139,250,0.34)]',
    name: 'from-violet-100 via-indigo-100 to-white',
  },
};

const AvatarSelect: React.FC<AvatarSelectProps> = ({ selectedId, onSelect, onConfirm }) => {
  const selectedAvatar = AVATARS.find(avatar => avatar.id === selectedId) || AVATARS[0];
  const selectedStyle = HERO_STYLES[selectedAvatar.id] || HERO_STYLES.barratt;

  return (
    <div className="relative my-auto flex h-full max-h-full w-full max-w-6xl flex-col gap-2 overflow-hidden px-3 py-2 md:gap-3 md:px-8 md:py-6">
      <div className="absolute inset-0 -z-30 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(255,248,220,0.28),transparent_24%),linear-gradient(180deg,#20120b_0%,#120d15_36%,#070b16_100%)] md:rounded-[2.8rem]" />
      <div className={`absolute inset-0 -z-20 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(255,214,102,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)),linear-gradient(135deg,rgba(62,32,18,0.92),rgba(17,22,36,0.96))] md:rounded-[2.8rem]`} />
      <div className={`absolute left-1/2 top-[12%] -z-10 h-48 w-48 -translate-x-1/2 rounded-full bg-gradient-to-br ${selectedStyle.glow} blur-3xl md:h-72 md:w-72`} />
      <motion.div
        animate={{ scale: [0.98, 1.04, 0.98], opacity: [0.45, 0.82, 0.45] }}
        transition={{ duration: 6.4, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute left-1/2 top-[34%] -z-10 h-64 w-64 -translate-x-1/2 rounded-full ${selectedStyle.ring} md:h-96 md:w-96`}
      />
      <div className="absolute inset-x-3 top-0 bottom-0 -z-10 rounded-[2rem] border border-[#f3cf78]/35 bg-[linear-gradient(180deg,rgba(255,244,213,0.06),rgba(255,255,255,0.015))] shadow-[inset_0_1px_0_rgba(255,237,186,0.15),0_28px_90px_rgba(2,6,23,0.42)] backdrop-blur-[22px] md:inset-x-8 md:rounded-[2.8rem]" />
      <div className="pointer-events-none absolute inset-x-6 top-3 z-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,225,145,0.65),transparent)] md:inset-x-16" />

      <div className="relative z-10 flex shrink-0 flex-col items-center text-center pt-0.5">
        <div className="fantasy-title-plaque max-w-[18rem] px-5 py-2.5 md:max-w-[30rem] md:px-10 md:py-4">
          <div className="mb-1.5 flex items-center justify-center gap-2 md:mb-2">
            {['emerald', 'ruby', 'sapphire'].map(gem => (
              <span key={gem} className={`fantasy-gem fantasy-gem-${gem}`} />
            ))}
          </div>
          <h1
            className="text-[1.65rem] font-black leading-none tracking-[-0.04em] text-[#fff7dc] drop-shadow-[0_10px_32px_rgba(2,6,23,0.58)] sm:text-[2.2rem] md:text-[5.2rem]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Choose Your Character
          </h1>
        </div>
      </div>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2.5 md:gap-5">
        {AVATARS.map((avatar) => {
          const isSelected = selectedId === avatar.id;
          const style = HERO_STYLES[avatar.id] || HERO_STYLES.barratt;

          return (
            <motion.button
              key={avatar.id}
              whileHover={{ scale: 1.025, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                triggerHaptic(selectedId === avatar.id ? 'light' : 'selection');
                onSelect(avatar.id);
              }}
              className={`group fantasy-hero-card relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.45rem] text-center transition-all md:rounded-[2.25rem] ${isSelected
                ? 'fantasy-hero-card-selected shadow-[0_20px_34px_rgba(2,6,23,0.34)] md:shadow-[0_28px_54px_rgba(2,6,23,0.38)]'
                : 'hover:bg-white/[0.04]'
                }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${style.tint} opacity-80`} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,244,214,0.14),rgba(255,255,255,0.02)_26%,rgba(2,6,23,0.42)_100%)]" />
              <div className={`absolute left-1/2 top-[18%] h-24 w-24 -translate-x-1/2 rounded-full bg-gradient-to-br ${style.glow} blur-2xl md:h-36 md:w-36`} />
              <div className="absolute inset-x-3 top-3 h-[34%] rounded-[1.25rem] bg-[linear-gradient(180deg,rgba(255,246,219,0.16),rgba(255,255,255,0))] opacity-70 blur-lg md:inset-x-4 md:rounded-[1.8rem]" />
              <div className="pointer-events-none absolute inset-x-2 top-2 bottom-2 rounded-[1.2rem] border border-[#f2d182]/18 md:inset-x-3 md:top-3 md:bottom-3 md:rounded-[2rem]" />

              <div className={`relative mx-2.5 mt-2.5 flex min-h-0 flex-1 items-end justify-center overflow-hidden rounded-[1.1rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(2,6,23,0.16))] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] md:mx-4 md:mt-4 md:rounded-[1.8rem] ${isSelected ? style.ring : ''}`}>
                <AnimatedAvatar
                  avatar={avatar}
                  pose={isSelected ? 'victory' : 'idle'}
                  frameDurationMs={isSelected ? 980 : 1320}
                  floating={isSelected}
                  alt={avatar.name}
                  className="h-full w-full"
                  imageClassName={`object-bottom transition-transform duration-500 ${isSelected ? 'scale-[1.3] translate-y-[4%] md:scale-[1.36]' : 'scale-[1.24] translate-y-[5%] md:scale-[1.28]'}`}
                />
              </div>
              <div className="relative px-2 pb-3 pt-2 md:px-4 md:pb-4 md:pt-3">
                <div className="fantasy-nameplate mx-auto max-w-[10rem] px-3 py-2 md:max-w-[12rem]">
                  <div className={`bg-gradient-to-r ${style.name} bg-clip-text text-[0.9rem] font-black leading-tight tracking-[-0.02em] text-transparent md:text-[1.35rem]`}>
                    {avatar.name}
                  </div>
                </div>
              </div>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-2 top-2 rounded-full border border-white/70 bg-[linear-gradient(180deg,#fde68a,#f59e0b)] p-1 text-white shadow-[0_12px_24px_rgba(245,158,11,0.3)] md:right-3 md:top-3 md:border-2 md:p-1.5"
                >
                  <Check className="h-2 w-2 md:h-4 md:w-4 stroke-[4px]" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="relative z-10 w-full shrink-0 pt-0.5 md:max-w-sm md:self-center">
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic('success');
            onConfirm();
          }}
          className="fantasy-cta-button relative z-10 w-full px-8 py-3 text-sm md:px-20 md:py-5 md:text-3xl"
        >
          Let&apos;s Go
        </motion.button>
      </div>
    </div>
  );
};

export default AvatarSelect;
