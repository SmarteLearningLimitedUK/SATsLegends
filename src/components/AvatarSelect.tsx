import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import AnimatedAvatar from './AnimatedAvatar';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import AssetIcon from './AssetIcon';
import splashBackground from '../assets/fantasy_hero/demo_bg/background_01.png';
import splashGlow from '../assets/fantasy_hero/demo_fx/effect_light_01.png';
import titleLine from '../assets/fantasy_hero/title/line.png';

interface AvatarSelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

const HERO_STYLES: Record<string, {
  glow: string;
  frameGlow: string;
  text: string;
  pedestal: string;
  beam: string;
  particle: string;
}> = {
  barratt: {
    glow: 'from-emerald-300/38 via-cyan-300/18 to-transparent',
    frameGlow: 'shadow-[0_0_46px_rgba(45,212,191,0.34)]',
    text: 'from-emerald-100 via-cyan-50 to-white',
    pedestal: 'from-emerald-300/62 via-cyan-300/24 to-transparent',
    beam: 'from-emerald-200/34 via-cyan-200/10 to-transparent',
    particle: 'rgba(94,234,212,0.9)',
  },
  bran: {
    glow: 'from-orange-300/42 via-amber-300/18 to-transparent',
    frameGlow: 'shadow-[0_0_48px_rgba(251,146,60,0.36)]',
    text: 'from-amber-100 via-yellow-50 to-white',
    pedestal: 'from-yellow-200/68 via-orange-300/28 to-transparent',
    beam: 'from-amber-100/36 via-orange-200/10 to-transparent',
    particle: 'rgba(253,186,116,0.94)',
  },
  mochi: {
    glow: 'from-rose-300/38 via-fuchsia-300/18 to-transparent',
    frameGlow: 'shadow-[0_0_46px_rgba(244,114,182,0.34)]',
    text: 'from-rose-100 via-pink-50 to-white',
    pedestal: 'from-rose-200/64 via-fuchsia-300/24 to-transparent',
    beam: 'from-rose-100/34 via-pink-200/10 to-transparent',
    particle: 'rgba(251,113,133,0.92)',
  },
  vex: {
    glow: 'from-violet-300/40 via-indigo-300/18 to-transparent',
    frameGlow: 'shadow-[0_0_48px_rgba(167,139,250,0.36)]',
    text: 'from-violet-100 via-indigo-50 to-white',
    pedestal: 'from-violet-200/62 via-indigo-300/24 to-transparent',
    beam: 'from-violet-100/34 via-indigo-200/10 to-transparent',
    particle: 'rgba(196,181,253,0.92)',
  },
};

const PARTICLE_POSITIONS = [
  { left: '40%', top: '30%', delay: 0, duration: 4.8, scale: 1 },
  { left: '45%', top: '36%', delay: 0.5, duration: 5.4, scale: 0.72 },
  { left: '50%', top: '27%', delay: 0.9, duration: 4.5, scale: 0.8 },
  { left: '55%', top: '34%', delay: 1.2, duration: 5.8, scale: 1.08 },
  { left: '59%', top: '42%', delay: 1.5, duration: 6.2, scale: 0.68 },
  { left: '42%', top: '48%', delay: 1.1, duration: 5.1, scale: 0.84 },
];

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
    <div className="relative flex h-full w-full items-stretch justify-center overflow-hidden px-3 pt-[calc(0.65rem+env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pt-6 md:pb-6">
      <div className="hero-screen-shell relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2.35rem] md:rounded-[3rem]">
        <div
          className="absolute inset-0 -z-40 bg-cover bg-center opacity-95"
          style={{ backgroundImage: `url(${splashBackground})` }}
        />
        <div className="absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(3,9,19,0.14),rgba(3,9,19,0.28)_24%,rgba(2,6,23,0.74)_100%)]" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_16%,rgba(125,211,252,0.18),rgba(2,6,23,0)_24%),linear-gradient(180deg,rgba(9,16,34,0)_0%,rgba(9,16,34,0.22)_36%,rgba(9,16,34,0.78)_100%)]" />

        <div className="pointer-events-none absolute inset-x-[8%] top-[9%] -z-10 h-[32%] rounded-[50%] bg-[radial-gradient(circle,rgba(78,212,255,0.36),rgba(78,212,255,0.08)_34%,rgba(78,212,255,0)_68%)] blur-2xl" />
        <div
          className="pointer-events-none absolute inset-x-[18%] top-[4%] -z-10 h-[42%] bg-center bg-no-repeat opacity-80"
          style={{ backgroundImage: `url(${splashGlow})`, backgroundSize: 'min(40rem, 88vw)' }}
        />
        <div className={`pointer-events-none absolute left-1/2 top-[18%] -z-10 h-[32rem] w-[18rem] -translate-x-1/2 rounded-[50%] bg-gradient-to-b ${selectedStyle.beam} opacity-72 blur-2xl`} />

        <div className="pointer-events-none absolute inset-y-[10%] left-[7%] -z-10 w-[18%] rounded-[40%] bg-[linear-gradient(180deg,rgba(5,18,30,0.04),rgba(5,18,30,0.34)_35%,rgba(4,12,24,0.84)_100%)] blur-md" />
        <div className="pointer-events-none absolute inset-y-[14%] right-[8%] -z-10 w-[16%] rounded-[40%] bg-[linear-gradient(180deg,rgba(5,18,30,0.02),rgba(5,18,30,0.28)_34%,rgba(4,12,24,0.82)_100%)] blur-md" />
        <div className="pointer-events-none absolute bottom-[-4%] left-[-2%] -z-10 h-[22%] w-[34%] rounded-[48%] bg-[radial-gradient(circle_at_40%_30%,rgba(110,231,183,0.24),rgba(12,37,34,0.16)_26%,rgba(3,11,20,0.94)_72%)] blur-sm" />
        <div className="pointer-events-none absolute bottom-[-3%] right-[-3%] -z-10 h-[24%] w-[36%] rounded-[48%] bg-[radial-gradient(circle_at_60%_26%,rgba(251,191,36,0.16),rgba(25,52,30,0.12)_26%,rgba(3,11,20,0.94)_74%)] blur-sm" />

        <div className="pointer-events-none absolute bottom-[18%] left-1/2 z-0 h-28 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,243,166,0.24),rgba(255,243,166,0.05)_34%,rgba(2,6,23,0)_72%)] blur-2xl" />
        <div className={`pointer-events-none absolute bottom-[17%] left-1/2 z-0 h-24 w-60 -translate-x-1/2 rounded-full bg-gradient-to-b ${selectedStyle.pedestal} blur-xl`} />
        <div className="pointer-events-none absolute bottom-[13.5%] left-1/2 z-0 h-14 w-52 -translate-x-1/2 rounded-[100%] border border-yellow-100/32 bg-[linear-gradient(180deg,rgba(255,235,153,0.32),rgba(89,255,150,0.12))] shadow-[0_0_30px_rgba(252,211,77,0.24)]" />

        {PARTICLE_POSITIONS.map((particle, index) => (
          <motion.span
            key={`hero-particle-${index}`}
            className="pointer-events-none absolute z-0 block rounded-full"
            style={{
              left: particle.left,
              top: particle.top,
              width: `${8 * particle.scale}px`,
              height: `${8 * particle.scale}px`,
              background: `radial-gradient(circle, ${selectedStyle.particle} 0%, rgba(255,255,255,0.3) 26%, rgba(255,255,255,0) 72%)`,
              boxShadow: `0 0 16px ${selectedStyle.particle}`,
            }}
            animate={{
              y: [0, -18 - index * 2, -6, 0],
              x: [0, index % 2 === 0 ? 8 : -8, 0],
              opacity: [0, 0.88, 0.44, 0],
              scale: [0.7, 1.08, 0.84, 0.72],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

        <div className="relative z-10 flex shrink-0 flex-col items-center gap-2 px-4 pt-3 text-center md:px-8 md:pt-6">
          <motion.img
            src={titleLine}
            alt=""
            animate={{ opacity: [0.4, 0.86, 0.4], scaleX: [0.98, 1.02, 0.98] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none w-[76%] max-w-[20rem] opacity-75 md:max-w-[28rem]"
          />
          <div className="fantasy-title-plaque px-5 py-2.5 md:px-8 md:py-3.5">
            <div className="mb-1.5 flex items-center justify-center gap-2 md:mb-2 md:gap-3">
              {['emerald', 'ruby', 'sapphire'].map(gem => (
                <span key={gem} className={`fantasy-gem fantasy-gem-${gem}`} />
              ))}
            </div>
            <h1
              className="text-[1.9rem] font-black leading-none tracking-[-0.05em] text-[#fff7dc] drop-shadow-[0_10px_32px_rgba(2,6,23,0.58)] sm:text-[2.8rem] md:text-[4.8rem]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Choose Your Hero
            </h1>
            <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-white/72 md:mt-2 md:text-[11px]">
              Select the champion who enters the portal
            </p>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 pt-2 pb-3 md:px-8 md:pt-4 md:pb-5">
          <button
            onClick={() => selectIndex(selectedIndex - 1)}
            className="hero-arrow-button absolute left-2 top-1/2 z-20 -translate-y-1/2 md:left-5"
            aria-label="Previous hero"
          >
            <AssetIcon name="back" className="h-5 w-5 md:h-7 md:w-7" />
          </button>

          <div className="grid h-full w-full max-w-5xl grid-cols-[0.72fr_1.18fr_0.72fr] items-center gap-1.5 md:gap-6">
            {carouselItems.map(({ avatar, position }) => {
              const isCenter = position === 'center';
              const style = HERO_STYLES[avatar.id] || HERO_STYLES.barratt;
              const sidePositionClass = position === 'side-left'
                ? '-translate-x-[5%] md:-translate-x-[7%]'
                : 'translate-x-[5%] md:translate-x-[7%]';

              return (
                <motion.button
                  key={`${position}-${avatar.id}`}
                  layout
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  whileTap={{ scale: isCenter ? 0.985 : 0.95 }}
                  onClick={() => selectIndex(AVATARS.findIndex(item => item.id === avatar.id))}
                  className={`relative flex min-h-0 flex-col items-center justify-end overflow-visible ${isCenter ? 'z-20' : `z-0 ${sidePositionClass}`}`}
                >
                  <motion.div
                    animate={isCenter ? { scale: [1, 1.018, 1], y: [0, -4, 0] } : { scale: 1, y: 0 }}
                    transition={isCenter ? { duration: 4.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                    className={`hero-card-shell relative flex h-[70svh] max-h-[34rem] min-h-[20rem] w-full flex-col items-center justify-end overflow-hidden rounded-[1.9rem] border md:max-h-[39rem] md:min-h-[24rem] md:rounded-[2.7rem] ${
                      isCenter
                        ? `hero-card-shell-selected border-[#ffd56b]/90 ${style.frameGlow}`
                        : 'hero-card-shell-side border-white/10 opacity-74'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${isCenter ? `${style.glow} opacity-100` : 'from-slate-400/10 via-slate-300/4 to-transparent opacity-80'}`} />
                    <div className={`absolute inset-0 ${isCenter ? 'bg-[linear-gradient(180deg,rgba(255,246,208,0.16),rgba(255,255,255,0.02)_24%,rgba(2,6,23,0.48)_100%)]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01)_18%,rgba(2,6,23,0.64)_100%)]'}`} />
                    <div className={`pointer-events-none absolute inset-[4px] rounded-[1.6rem] border md:rounded-[2.35rem] ${isCenter ? 'border-[#fff4c8]/30' : 'border-white/8'}`} />

                    {isCenter && (
                      <>
                        <div className={`pointer-events-none absolute left-1/2 top-[16%] h-44 w-44 -translate-x-1/2 rounded-full bg-gradient-to-br ${style.glow} blur-3xl md:h-60 md:w-60`} />
                        <div className={`pointer-events-none absolute bottom-[10%] left-1/2 h-24 w-[74%] -translate-x-1/2 rounded-full bg-gradient-to-b ${style.pedestal} blur-xl`} />
                      </>
                    )}

                    <div className={`relative mt-3 flex w-full flex-1 items-end justify-center overflow-hidden ${isCenter ? 'px-2 md:px-3' : 'px-1 md:px-2'}`}>
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
                            ? 'scale-[1.38] translate-y-[2%] md:scale-[1.46]'
                            : 'scale-[1.04] translate-y-[8%] opacity-80 saturate-[0.8] brightness-[0.8] blur-[0.5px] md:scale-[1.1]'
                        }`}
                      />
                    </div>

                    <div className="relative w-full px-3 pb-3 pt-1 md:px-4 md:pb-4">
                      <div className={`mx-auto rounded-[1.15rem] border px-3 py-2 text-center md:rounded-[1.5rem] md:px-4 md:py-3 ${
                        isCenter
                          ? 'border-[#ffe49a]/55 bg-[linear-gradient(180deg,rgba(55,92,210,0.95),rgba(35,58,156,0.98))] shadow-[0_10px_0_rgba(19,38,110,0.9),0_22px_36px_rgba(15,23,42,0.28)]'
                          : 'border-white/10 bg-[linear-gradient(180deg,rgba(17,28,56,0.9),rgba(10,18,36,0.98))]'
                      }`}>
                        <div className={`bg-gradient-to-r ${style.text} bg-clip-text text-transparent ${isCenter ? 'text-[1.3rem] md:text-[1.75rem]' : 'text-[1rem] md:text-[1.2rem]'} font-black tracking-[-0.03em]`}>
                          {avatar.name}
                        </div>
                        <div className={`mt-1 text-[9px] font-black uppercase tracking-[0.22em] ${isCenter ? 'text-white/78' : 'text-white/46'}`}>
                          {isCenter ? `${avatar.rarity} Hero` : 'Tap to focus'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.button>
              );
            })}
          </div>

          <button
            onClick={() => selectIndex(selectedIndex + 1)}
            className="hero-arrow-button absolute right-2 top-1/2 z-20 -translate-y-1/2 md:right-5"
            aria-label="Next hero"
          >
            <AssetIcon name="next" className="h-5 w-5 md:h-7 md:w-7" />
          </button>
        </div>

        <div className="relative z-10 flex shrink-0 flex-col items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-8 md:pb-6">
          <div className="flex items-center gap-2.5">
            {AVATARS.map((avatar, index) => (
              <button
                key={avatar.id}
                onClick={() => selectIndex(index)}
                className={`hero-carousel-dot ${selectedIndex === index ? 'hero-carousel-dot-active' : ''}`}
                aria-label={`Select ${avatar.name}`}
              />
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.985, y: 1 }}
            onClick={() => {
              triggerHaptic('success');
              onConfirm();
            }}
            className="hero-cta-button"
          >
            <span className="hero-cta-button-face">
              <span className="hero-cta-button-label">Begin Adventure</span>
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelect;
