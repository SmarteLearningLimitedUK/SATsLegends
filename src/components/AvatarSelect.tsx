import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import AnimatedAvatar from './AnimatedAvatar';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import AssetIcon from './AssetIcon';
import splashBackground from '../assets/fantasy_hero/demo_bg/background_01.png';
import splashGlow from '../assets/fantasy_hero/demo_fx/effect_light_01.png';
import splashGlowSecondary from '../assets/fantasy_hero/demo_fx/effect_light_02.png';
import splashOrb from '../assets/fantasy_hero/demo_fx/glow_circle_02.png';
import titleLine from '../assets/fantasy_hero/title/line.png';

interface AvatarSelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

const HERO_STYLES: Record<string, { glow: string; cardTint: string; text: string; edge: string }> = {
  barratt: {
    glow: 'from-emerald-300/40 via-cyan-300/16 to-transparent',
    cardTint: 'from-emerald-400/16 via-cyan-300/10 to-slate-950/78',
    text: 'from-emerald-100 via-cyan-50 to-white',
    edge: 'shadow-[0_0_42px_rgba(52,211,153,0.34)]',
  },
  bran: {
    glow: 'from-orange-300/42 via-amber-300/16 to-transparent',
    cardTint: 'from-orange-400/18 via-yellow-300/10 to-slate-950/78',
    text: 'from-amber-100 via-yellow-50 to-white',
    edge: 'shadow-[0_0_42px_rgba(251,146,60,0.34)]',
  },
  mochi: {
    glow: 'from-rose-300/38 via-fuchsia-300/14 to-transparent',
    cardTint: 'from-rose-400/16 via-pink-300/10 to-slate-950/78',
    text: 'from-rose-100 via-pink-50 to-white',
    edge: 'shadow-[0_0_40px_rgba(244,114,182,0.3)]',
  },
  vex: {
    glow: 'from-violet-300/40 via-indigo-300/14 to-transparent',
    cardTint: 'from-violet-400/16 via-indigo-300/10 to-slate-950/78',
    text: 'from-violet-100 via-indigo-50 to-white',
    edge: 'shadow-[0_0_42px_rgba(167,139,250,0.34)]',
  },
};

const AvatarSelect: React.FC<AvatarSelectProps> = ({ selectedId, onSelect, onConfirm }) => {
  const selectedIndex = Math.max(0, AVATARS.findIndex(avatar => avatar.id === selectedId));
  const selectedAvatar = AVATARS[selectedIndex] || AVATARS[0];
  const selectedStyle = HERO_STYLES[selectedAvatar.id] || HERO_STYLES.barratt;

  useEffect(() => {
    if (!AVATARS.some(avatar => avatar.id === selectedId)) {
      onSelect(AVATARS[0].id);
    }
  }, [onSelect, selectedId]);

  const carouselItems = useMemo(() => {
    const total = AVATARS.length;
    const prevIndex = (selectedIndex - 1 + total) % total;
    const nextIndex = (selectedIndex + 1) % total;

    return [
      { avatar: AVATARS[prevIndex], position: 'side-left' as const },
      { avatar: AVATARS[selectedIndex], position: 'center' as const },
      { avatar: AVATARS[nextIndex], position: 'side-right' as const },
    ];
  }, [selectedIndex]);

  const selectIndex = (index: number) => {
    const safeIndex = (index + AVATARS.length) % AVATARS.length;
    const avatar = AVATARS[safeIndex];
    triggerHaptic(avatar.id === selectedId ? 'light' : 'selection');
    onSelect(avatar.id);
  };

  return (
    <div className="relative my-auto flex h-full max-h-full w-full max-w-6xl flex-col overflow-hidden px-3 py-2 md:px-8 md:py-6">
      <div className="absolute inset-0 -z-40 rounded-[2.2rem] bg-cover bg-center opacity-95 md:rounded-[3rem]" style={{ backgroundImage: `url(${splashBackground})` }} />
      <div className="absolute inset-0 -z-30 rounded-[2.2rem] bg-[linear-gradient(180deg,rgba(3,9,19,0.04),rgba(3,9,19,0.34)_28%,rgba(2,6,23,0.78)_100%)] md:rounded-[3rem]" />
      <div className="absolute inset-0 -z-20 rounded-[2.2rem] bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.22),rgba(2,6,23,0)_32%),radial-gradient(circle_at_bottom,rgba(250,204,21,0.16),rgba(2,6,23,0)_28%)] md:rounded-[3rem]" />
      <div className="absolute inset-x-[4%] top-0 -z-10 h-[38%] bg-center bg-no-repeat opacity-90 blur-[1px]" style={{ backgroundImage: `url(${splashGlow})`, backgroundSize: 'min(42rem, 92vw)' }} />
      <motion.div
        animate={{ opacity: [0.24, 0.54, 0.24], scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-x-[8%] top-[10%] -z-10 h-[44%] bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${splashGlowSecondary})`, backgroundSize: 'min(44rem, 94vw)' }}
      />
      <div className={`absolute left-1/2 top-[24%] -z-10 h-44 w-44 -translate-x-1/2 rounded-full bg-gradient-to-br ${selectedStyle.glow} blur-3xl md:h-72 md:w-72`} />
      <motion.div
        animate={{ scale: [0.96, 1.04, 0.96], opacity: [0.4, 0.78, 0.4] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute left-1/2 top-[56%] -z-10 h-44 w-44 -translate-x-1/2 rounded-full ${selectedStyle.edge} md:h-72 md:w-72`}
      />

      {[0, 1, 2].map(index => (
        <motion.img
          key={`orb-${index}`}
          src={splashOrb}
          alt=""
          animate={{
            y: [0, -16 - index * 3, 0],
            x: [0, index % 2 === 0 ? 8 : -8, 0],
            opacity: [0.22, 0.48, 0.22],
            scale: [0.78, 1, 0.78],
          }}
          transition={{ duration: 5.6 + index, repeat: Infinity, delay: index * 0.55 }}
          className="pointer-events-none absolute -z-10 w-16 md:w-24"
          style={{
            left: `${16 + index * 30}%`,
            top: `${58 - index * 6}%`,
          }}
        />
      ))}

      {[18, 36, 50, 64, 82].map((left, index) => (
        <motion.div
          key={`beam-${left}`}
          animate={{ opacity: [0.08, 0.24, 0.08], y: [0, -8, 0] }}
          transition={{ duration: 4 + index * 0.4, repeat: Infinity, delay: index * 0.3 }}
          className="pointer-events-none absolute top-[7%] -z-10 h-[52%] w-[2px] rounded-full bg-[linear-gradient(180deg,rgba(125,211,252,0),rgba(125,211,252,0.9),rgba(125,211,252,0))] blur-[1px]"
          style={{ left: `${left}%`, transform: `rotate(${index % 2 === 0 ? -10 : 10}deg)` }}
        />
      ))}

      <div className="pointer-events-none absolute bottom-[14%] left-1/2 z-0 h-16 w-40 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(163,230,53,0.58),rgba(34,197,94,0.22),rgba(2,6,23,0))] blur-xl md:h-24 md:w-56" />
      <div className="pointer-events-none absolute bottom-[11%] left-1/2 z-0 h-12 w-52 -translate-x-1/2 rounded-[100%] border border-yellow-200/35 bg-[linear-gradient(180deg,rgba(253,224,71,0.22),rgba(34,197,94,0.26))] shadow-[0_0_28px_rgba(132,204,22,0.35)] md:h-16 md:w-72" />

      <div className="relative z-10 flex shrink-0 flex-col items-center gap-2 pt-1 text-center md:gap-3">
        <motion.img
          src={titleLine}
          alt=""
          animate={{ opacity: [0.4, 0.9, 0.4], scaleX: [0.97, 1.02, 0.97] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none w-[76%] max-w-[20rem] opacity-75 md:max-w-[28rem]"
        />
        <div className="fantasy-title-plaque px-5 py-2 md:px-8 md:py-3">
          <div className="mb-1.5 flex items-center justify-center gap-2 md:mb-2 md:gap-3">
            {['emerald', 'ruby', 'sapphire'].map(gem => (
              <span key={gem} className={`fantasy-gem fantasy-gem-${gem}`} />
            ))}
          </div>
          <h1
            className="text-[1.85rem] font-black leading-none tracking-[-0.05em] text-[#fff7dc] drop-shadow-[0_10px_32px_rgba(2,6,23,0.58)] sm:text-[2.7rem] md:text-[4.8rem]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Sats Hero
          </h1>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center">
        <button
          onClick={() => selectIndex(selectedIndex - 1)}
          className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full bg-slate-950/35 p-2 text-white/90 backdrop-blur-sm transition hover:bg-slate-950/50 md:left-2 md:p-3"
          aria-label="Previous hero"
        >
          <AssetIcon name="back" className="h-5 w-5 md:h-7 md:w-7" />
        </button>

        <div className="grid h-full w-full grid-cols-[0.78fr_1.06fr_0.78fr] items-center gap-1.5 md:gap-5">
          {carouselItems.map(({ avatar, position }) => {
            const isCenter = position === 'center';
            const style = HERO_STYLES[avatar.id] || HERO_STYLES.barratt;
            const sideCardClasses = position === 'side-left'
              ? 'translate-x-[10%] scale-[0.88] opacity-78'
              : 'translate-x-[-10%] scale-[0.88] opacity-78';

            return (
              <motion.button
                key={`${position}-${avatar.id}`}
                layout
                transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                whileTap={{ scale: isCenter ? 0.98 : 0.94 }}
                onClick={() => selectIndex(AVATARS.findIndex(item => item.id === avatar.id))}
                className={`relative flex h-[72%] min-h-0 flex-col items-center justify-end overflow-hidden rounded-[1.7rem] border text-center shadow-[0_20px_42px_rgba(2,6,23,0.34)] md:h-[78%] md:rounded-[2.5rem] ${
                  isCenter
                    ? 'border-[#ffcf5c] bg-[linear-gradient(180deg,rgba(8,29,83,0.9),rgba(8,19,46,0.94))]'
                    : 'border-[#f1cc73]/45 bg-[linear-gradient(180deg,rgba(17,32,67,0.84),rgba(8,17,37,0.92))]'
                } ${isCenter ? 'z-10' : `z-0 ${sideCardClasses}`}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${style.cardTint} ${isCenter ? 'opacity-100' : 'opacity-88'}`} />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,220,0.18),rgba(255,255,255,0.02)_22%,rgba(2,6,23,0.42)_100%)]" />
                <div className={`absolute left-1/2 top-[18%] h-24 w-24 -translate-x-1/2 rounded-full bg-gradient-to-br ${style.glow} blur-2xl md:h-36 md:w-36`} />
                <div className={`pointer-events-none absolute inset-[3px] rounded-[1.45rem] border ${isCenter ? 'border-[#fff3c4]/32' : 'border-white/12'} md:rounded-[2.2rem]`} />

                {!isCenter && (
                  <div className="pointer-events-none absolute top-[13%] flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/48 shadow-[0_10px_18px_rgba(2,6,23,0.35)] md:h-12 md:w-12">
                    <div className="relative h-4 w-4 md:h-5 md:w-5">
                      <div className="absolute left-1/2 top-0 h-[42%] w-[62%] -translate-x-1/2 rounded-t-full border-[2px] border-b-0 border-white/80" />
                      <div className="absolute bottom-0 left-1/2 h-[58%] w-[82%] -translate-x-1/2 rounded-[4px] border-[2px] border-white/80 bg-white/10" />
                    </div>
                  </div>
                )}

                <div className={`relative mt-4 flex w-full flex-1 items-end justify-center overflow-hidden ${isCenter ? 'px-2' : 'px-1'} md:mt-6`}>
                  <AnimatedAvatar
                    avatar={avatar}
                    pose={isCenter ? 'idle' : 'thinking'}
                    frameDurationMs={1500}
                    floating={isCenter}
                    cycleFrames={false}
                    alt={avatar.name}
                    className="h-full w-full"
                    imageClassName={`object-bottom transition-transform duration-500 ${
                      isCenter
                        ? 'scale-[1.3] translate-y-[2%] md:scale-[1.38]'
                        : 'scale-[1.06] translate-y-[6%] md:scale-[1.14]'
                    }`}
                  />
                </div>

                <div className="relative w-full px-2 pb-2 pt-1 md:px-3 md:pb-3 md:pt-2">
                  <div className={`mx-auto rounded-[1rem] border px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] md:rounded-[1.4rem] md:px-3 md:py-2.5 ${
                    isCenter
                      ? 'border-[#7ea7ff]/65 bg-[linear-gradient(180deg,#4f7fff_0%,#2d59d6_100%)] text-white shadow-[0_8px_0_#1e3a8a,0_16px_28px_rgba(37,99,235,0.28)]'
                      : 'border-[#f1cc73]/50 bg-[linear-gradient(180deg,rgba(24,39,74,0.82),rgba(15,25,49,0.92))] text-[#ffe8ad]'
                  }`}
                  >
                    <div className={`bg-gradient-to-r ${style.text} bg-clip-text text-transparent text-[0.95rem] font-black tracking-[-0.02em] md:text-[1.45rem]`}>
                      {isCenter ? 'Select' : avatar.name}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <button
          onClick={() => selectIndex(selectedIndex + 1)}
          className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full bg-slate-950/35 p-2 text-white/90 backdrop-blur-sm transition hover:bg-slate-950/50 md:right-2 md:p-3"
          aria-label="Next hero"
        >
          <AssetIcon name="next" className="h-5 w-5 md:h-7 md:w-7" />
        </button>
      </div>

      <div className="relative z-10 flex shrink-0 flex-col items-center gap-2 pt-2 md:gap-3">
        <div className="flex items-center gap-2">
          {AVATARS.map((avatar, index) => (
            <button
              key={avatar.id}
              onClick={() => selectIndex(index)}
              className={`h-2.5 rounded-full transition-all md:h-3 ${
                selectedIndex === index ? 'w-8 bg-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.65)] md:w-10' : 'w-2.5 bg-white/35 md:w-3'
              }`}
              aria-label={`Select ${avatar.name}`}
            />
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic('success');
            onConfirm();
          }}
          className="fantasy-cta-button relative z-10 w-full max-w-[22rem] px-8 py-2.5 text-sm md:max-w-[26rem] md:px-12 md:py-4 md:text-2xl"
        >
          Begin Adventure
        </motion.button>
      </div>
    </div>
  );
};

export default AvatarSelect;
