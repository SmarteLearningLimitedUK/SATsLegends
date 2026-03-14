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
  { left: '41%', top: '24%', delay: 0, duration: 4.8, scale: 1 },
  { left: '45%', top: '30%', delay: 0.5, duration: 5.4, scale: 0.72 },
  { left: '50%', top: '22%', delay: 0.9, duration: 4.5, scale: 0.8 },
  { left: '56%', top: '28%', delay: 1.2, duration: 5.8, scale: 1.08 },
  { left: '60%', top: '37%', delay: 1.5, duration: 6.2, scale: 0.68 },
  { left: '43%', top: '40%', delay: 1.1, duration: 5.1, scale: 0.84 },
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
    <div className="relative flex h-full w-full items-stretch justify-center overflow-hidden px-3 pt-[calc(env(safe-area-inset-top)+0.25rem)] pb-[calc(env(safe-area-inset-bottom)+0.45rem)] md:px-6 md:pt-5 md:pb-6">
      <div className="hero-screen-shell relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2.35rem] md:rounded-[3rem]">
        <div
          className="absolute inset-0 -z-40 bg-cover bg-center opacity-95"
          style={{ backgroundImage: `url(${splashBackground})` }}
        />
        <div className="absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(3,9,19,0.12),rgba(3,9,19,0.2)_20%,rgba(2,6,23,0.7)_100%)]" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_15%,rgba(125,211,252,0.22),rgba(2,6,23,0)_22%),linear-gradient(180deg,rgba(9,16,34,0)_0%,rgba(9,16,34,0.16)_34%,rgba(9,16,34,0.74)_100%)]" />

        <div className="pointer-events-none absolute inset-x-[10%] top-[10%] -z-10 h-[30%] rounded-[50%] bg-[radial-gradient(circle,rgba(78,212,255,0.34),rgba(78,212,255,0.09)_34%,rgba(78,212,255,0)_68%)] blur-2xl" />
        <div
          className="pointer-events-none absolute inset-x-[18%] top-[5%] -z-10 h-[39%] bg-center bg-no-repeat opacity-72"
          style={{ backgroundImage: `url(${splashGlow})`, backgroundSize: 'min(36rem, 86vw)' }}
        />
        <div className={`pointer-events-none absolute left-1/2 top-[14%] -z-10 h-[28rem] w-[16rem] -translate-x-1/2 rounded-[50%] bg-gradient-to-b ${selectedStyle.beam} opacity-74 blur-2xl md:top-[16%] md:h-[33rem] md:w-[18rem] md:opacity-78`} />

        <div className="pointer-events-none absolute bottom-[18.5%] left-1/2 z-0 h-24 w-[14rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,243,166,0.28),rgba(255,243,166,0.08)_34%,rgba(2,6,23,0)_72%)] blur-2xl md:bottom-[18%] md:h-36 md:w-[22rem]" />
        <div className={`hero-stage-pedestal pointer-events-none absolute bottom-[17.8%] left-1/2 z-0 h-20 w-[12.8rem] -translate-x-1/2 rounded-full bg-gradient-to-b ${selectedStyle.pedestal} blur-xl md:bottom-[17.25%] md:h-24 md:w-[19rem]`} />
        <div className="pointer-events-none absolute bottom-[14.1%] left-1/2 z-0 h-12 w-[10.8rem] -translate-x-1/2 rounded-[100%] border border-yellow-100/32 bg-[linear-gradient(180deg,rgba(255,235,153,0.38),rgba(89,255,150,0.12))] shadow-[0_0_34px_rgba(252,211,77,0.28)] md:bottom-[13.4%] md:h-16 md:w-[15rem]" />

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

        <div className="relative z-10 flex shrink-0 flex-col items-center gap-1.5 px-4 pt-[calc(env(safe-area-inset-top)+0.35rem)] text-center md:gap-2 md:px-8 md:pt-6">
          <motion.img
            src={titleLine}
            alt=""
            animate={{ opacity: [0.4, 0.86, 0.4], scaleX: [0.98, 1.02, 0.98] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none w-[72%] max-w-[15rem] opacity-82 md:w-[78%] md:max-w-[27rem] md:opacity-85"
          />
          <div className="hero-header-banner px-4 py-2.5 md:px-8 md:py-4">
            <div className="mb-1 flex items-center justify-center gap-1.5 md:mb-2 md:gap-3">
              {['emerald', 'ruby', 'sapphire'].map(gem => (
                <span key={gem} className={`fantasy-gem fantasy-gem-${gem}`} />
              ))}
            </div>
            <h1
              className="text-[1.72rem] font-black leading-none tracking-[-0.05em] text-[#fff7dc] drop-shadow-[0_10px_32px_rgba(2,6,23,0.58)] sm:text-[2.95rem] md:text-[4.9rem]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Choose Your Hero
            </h1>
            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/84 md:mt-2 md:text-[11px] md:tracking-[0.24em]">
              Select the champion who enters the portal
            </p>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-1.5 pt-0.5 pb-1.5 md:px-8 md:pt-3 md:pb-4">
          <motion.button
            whileHover={{ scale: 1.04, x: -1 }}
            whileTap={{ scale: 0.95, y: 1 }}
            onClick={() => selectIndex(selectedIndex - 1)}
            className="hero-arrow-button absolute left-1 top-1/2 z-20 -translate-y-1/2 md:left-5"
            aria-label="Previous hero"
          >
            <span className="hero-arrow-button-face">
              <span className="hero-arrow-button-gem" />
              <AssetIcon name="back" className="hero-arrow-icon h-5 w-5 md:h-7 md:w-7" />
            </span>
          </motion.button>

          <div className="grid h-full w-full max-w-5xl grid-cols-[0.42fr_1.16fr_0.42fr] items-center gap-0.5 md:grid-cols-[0.5fr_1.48fr_0.5fr] md:gap-5">
            {carouselItems.map(({ avatar, position }) => {
              const isCenter = position === 'center';
              const style = HERO_STYLES[avatar.id] || HERO_STYLES.barratt;
              const sidePositionClass = position === 'side-left'
                ? '-translate-x-[5%] md:-translate-x-[9%]'
                : 'translate-x-[5%] md:translate-x-[9%]';

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
                    animate={isCenter ? { scale: [1, 1.025, 1], y: [0, -7, 0] } : { scale: 1, y: 0 }}
                    transition={isCenter ? { duration: 4.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                    className={`hero-card-shell relative flex h-[54svh] max-h-[28rem] min-h-[15.5rem] w-full flex-col items-center justify-end overflow-hidden rounded-[1.6rem] border md:h-[67svh] md:max-h-[40rem] md:min-h-[24rem] md:rounded-[2.7rem] ${
                      isCenter
                        ? `hero-card-shell-selected border-[#ffd56b]/90 ${style.frameGlow}`
                        : 'hero-card-shell-side border-white/8 opacity-62'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${isCenter ? `${style.glow} opacity-95` : 'from-slate-400/6 via-slate-300/2 to-transparent opacity-55'}`} />
                    <div className={`absolute inset-0 ${isCenter ? 'bg-[linear-gradient(180deg,rgba(255,246,208,0.14),rgba(255,255,255,0.01)_20%,rgba(2,6,23,0.44)_100%)]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)_16%,rgba(2,6,23,0.74)_100%)]'}`} />
                    <div className={`pointer-events-none absolute inset-[4px] rounded-[1.3rem] border md:rounded-[2.35rem] ${isCenter ? 'border-[#fff4c8]/34' : 'border-white/6'}`} />
                    <div className={`pointer-events-none absolute inset-[0.5rem] rounded-[1.15rem] md:inset-[0.65rem] md:rounded-[2rem] ${isCenter ? 'bg-[linear-gradient(180deg,rgba(11,28,60,0.08),rgba(8,14,31,0.44)_32%,rgba(4,10,22,0.78)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-8px_18px_rgba(2,6,23,0.38)]' : 'bg-[linear-gradient(180deg,rgba(8,18,36,0.12),rgba(4,10,22,0.6)_100%)]'} `} />

                    {isCenter && (
                      <>
                        <div className={`pointer-events-none absolute left-1/2 top-[12%] h-32 w-32 -translate-x-1/2 rounded-full bg-gradient-to-br ${style.glow} blur-3xl md:top-[14%] md:h-64 md:w-64`} />
                        <div className={`pointer-events-none absolute bottom-[14.5%] left-1/2 h-20 w-[74%] -translate-x-1/2 rounded-full bg-gradient-to-b ${style.pedestal} blur-xl md:bottom-[15.5%] md:h-28 md:w-[78%]`} />
                        <div className="pointer-events-none absolute bottom-[11%] left-1/2 h-12 w-[62%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,244,164,0.34),rgba(255,244,164,0.06)_36%,rgba(255,244,164,0)_72%)] blur-lg md:bottom-[12%] md:h-16 md:w-[68%]" />
                      </>
                    )}

                    <div className={`relative mt-0 flex w-full flex-1 items-end justify-center overflow-visible ${isCenter ? 'px-0 pb-0 md:px-2' : 'px-0 pb-1 md:px-1'}`}>
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
                            ? 'scale-[1.34] -translate-y-[1%] md:scale-[1.84] md:-translate-y-[6%]'
                            : 'scale-[0.82] translate-y-[14%] opacity-66 saturate-[0.6] brightness-[0.72] blur-[1px] md:scale-[1.02] md:translate-y-[12%]'
                        }`}
                      />
                    </div>

                    <div className={`relative w-full ${isCenter ? 'px-2.5 pb-2.5 pt-0 md:px-4 md:pb-4' : 'px-1.5 pb-1.5 pt-0 md:px-3 md:pb-3'}`}>
                      <div className={`mx-auto rounded-[1.15rem] border text-center ${
                        isCenter
                          ? 'border-[#ffe49a]/60 bg-[linear-gradient(180deg,rgba(64,106,229,0.98),rgba(36,61,168,0.99))] px-2.5 py-2 shadow-[0_8px_0_rgba(19,38,110,0.92),0_18px_28px_rgba(15,23,42,0.28)] md:rounded-[1.6rem] md:px-4 md:py-3.5 md:shadow-[0_10px_0_rgba(19,38,110,0.92),0_22px_36px_rgba(15,23,42,0.3)]'
                          : 'border-white/8 bg-[linear-gradient(180deg,rgba(14,24,48,0.84),rgba(8,14,30,0.96))] px-1.5 py-1 shadow-[0_6px_14px_rgba(2,6,23,0.16)] md:rounded-[1.35rem] md:px-3 md:py-2'
                      }`}>
                        <div className={`bg-gradient-to-r ${style.text} bg-clip-text text-transparent ${isCenter ? 'text-[1.12rem] md:text-[1.9rem]' : 'text-[0.8rem] md:text-[1.08rem]'} font-black tracking-[-0.03em]`}>
                          {avatar.name}
                        </div>
                        <div className={`mt-0.5 font-black uppercase tracking-[0.18em] ${isCenter ? 'text-[8px] text-white/82 md:text-[10px] md:tracking-[0.22em]' : 'text-[7px] text-white/42 md:text-[9px] md:tracking-[0.22em]'}`}>
                          {isCenter ? `${avatar.rarity} Hero` : 'Tap'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.button>
              );
            })}
          </div>

          <motion.button
            whileHover={{ scale: 1.04, x: 1 }}
            whileTap={{ scale: 0.95, y: 1 }}
            onClick={() => selectIndex(selectedIndex + 1)}
            className="hero-arrow-button absolute right-1 top-1/2 z-20 -translate-y-1/2 md:right-5"
            aria-label="Next hero"
          >
            <span className="hero-arrow-button-face">
              <span className="hero-arrow-button-gem" />
              <AssetIcon name="next" className="hero-arrow-icon h-5 w-5 md:h-7 md:w-7" />
            </span>
          </motion.button>
        </div>

        <div className="relative z-10 flex shrink-0 flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] md:gap-3 md:px-8 md:pb-6">
          <div className="flex items-center gap-2">
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
              <span className="hero-cta-button-orb hero-cta-button-orb-left" />
              <span className="hero-cta-button-orb hero-cta-button-orb-right" />
              <span className="hero-cta-button-label">Begin Adventure</span>
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelect;
