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
  { left: '42%', top: '22%', delay: 0, duration: 4.8, scale: 1 },
  { left: '46%', top: '28%', delay: 0.5, duration: 5.4, scale: 0.72 },
  { left: '50%', top: '20%', delay: 0.9, duration: 4.5, scale: 0.8 },
  { left: '55%', top: '26%', delay: 1.2, duration: 5.8, scale: 1.08 },
  { left: '58%', top: '34%', delay: 1.5, duration: 6.2, scale: 0.68 },
  { left: '44%', top: '38%', delay: 1.1, duration: 5.1, scale: 0.84 },
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
    <div className="relative flex h-full w-full items-stretch justify-center overflow-hidden px-3 pt-[calc(env(safe-area-inset-top)+0.25rem)] pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:px-6 md:pt-5 md:pb-6">
      <div className="hero-screen-shell relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2.35rem] md:rounded-[3rem]">
        <div
          className="absolute inset-0 -z-40 bg-cover bg-center opacity-95"
          style={{ backgroundImage: `url(${splashBackground})` }}
        />
        <div className="absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(3,9,19,0.1),rgba(3,9,19,0.18)_20%,rgba(2,6,23,0.74)_100%)]" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_14%,rgba(125,211,252,0.22),rgba(2,6,23,0)_22%),linear-gradient(180deg,rgba(9,16,34,0)_0%,rgba(9,16,34,0.12)_34%,rgba(9,16,34,0.72)_100%)]" />
        <div
          className="pointer-events-none absolute inset-x-[17%] top-[5%] -z-10 h-[38%] bg-center bg-no-repeat opacity-72"
          style={{ backgroundImage: `url(${splashGlow})`, backgroundSize: 'min(36rem, 84vw)' }}
        />
        <div className={`pointer-events-none absolute left-1/2 top-[18%] -z-10 h-[24rem] w-[14rem] -translate-x-1/2 rounded-[50%] bg-gradient-to-b ${selectedStyle.beam} opacity-68 blur-2xl md:top-[16%] md:h-[34rem] md:w-[19rem] md:opacity-74`} />

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

        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-2 pt-1 pb-2 md:px-8 md:pt-3 md:pb-4">
          <div className="hero-carousel-zone relative flex w-full max-w-[21rem] flex-1 items-end justify-center md:max-w-[31rem]">
            <motion.div
              className="hero-portal-swirl pointer-events-none absolute left-1/2 top-[15%] z-0 h-28 w-28 -translate-x-1/2 rounded-full md:top-[8%] md:h-44 md:w-44"
              animate={{ rotate: 360, scale: [0.98, 1.04, 0.98], opacity: [0.46, 0.72, 0.46] }}
              transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            />

            {PARTICLE_POSITIONS.map((particle, index) => (
              <motion.span
                key={`hero-particle-${index}`}
                className="pointer-events-none absolute z-10 block rounded-full"
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

            <div className="pointer-events-none absolute inset-x-[14%] bottom-[22%] z-0 h-20 rounded-full bg-[radial-gradient(circle,rgba(255,230,134,0.14),rgba(255,230,134,0)_72%)] blur-2xl md:h-28" />

            <motion.button
              whileHover={{ scale: 1.04, x: -1 }}
              whileTap={{ scale: 0.95, y: 1 }}
              onClick={() => selectIndex(selectedIndex - 1)}
              className="hero-arrow-button absolute left-[0.1rem] top-[58%] z-20 -translate-y-1/2 md:left-[1.2rem] md:top-[46%]"
              aria-label="Previous hero"
            >
              <span className="hero-arrow-button-face">
                <span className="hero-arrow-button-gem" />
                <AssetIcon name="back" className="hero-arrow-icon h-5 w-5 md:h-7 md:w-7" />
              </span>
            </motion.button>

            <div className="grid h-full w-full grid-cols-[0.34fr_1fr_0.34fr] items-end gap-1.5 md:grid-cols-[0.46fr_1fr_0.46fr] md:gap-4">
              {carouselItems.map(({ avatar, position }) => {
                const isCenter = position === 'center';
                const style = HERO_STYLES[avatar.id] || HERO_STYLES.barratt;
                const sideTransform = position === 'side-left'
                  ? '-translate-x-[3%] rotate-[-7deg] md:-translate-x-[6%]'
                  : 'translate-x-[3%] rotate-[7deg] md:translate-x-[6%]';

                return (
                  <motion.button
                    key={`${position}-${avatar.id}`}
                    layout
                    transition={{ type: 'spring', stiffness: 240, damping: 26 }}
                    whileTap={{ scale: isCenter ? 0.985 : 0.95 }}
                    onClick={() => selectIndex(AVATARS.findIndex(item => item.id === avatar.id))}
                    className={`relative flex min-h-0 flex-col items-center justify-end overflow-visible ${isCenter ? 'z-20' : `z-10 ${sideTransform}`}`}
                  >
                    <motion.div
                      animate={isCenter ? { scale: [1, 1.024, 1], y: [0, -5, 0] } : { scale: 1, y: 0 }}
                      transition={isCenter ? { duration: 4.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                      className={`hero-shrine-card ${isCenter ? `hero-shrine-card-selected ${style.frameGlow}` : 'hero-shrine-card-side'}`}
                    >
                      <div className={`hero-shrine-interior ${isCenter ? 'hero-shrine-interior-selected' : 'hero-shrine-interior-side'}`}>
                        <div className={`absolute inset-0 bg-gradient-to-b ${isCenter ? style.beam : 'from-slate-200/4 to-transparent'} opacity-80`} />
                        <div className={`pointer-events-none absolute left-1/2 top-[20%] h-28 w-28 -translate-x-1/2 rounded-full bg-gradient-to-br ${isCenter ? style.glow : 'from-white/8 to-transparent'} blur-2xl md:h-40 md:w-40`} />

                        {isCenter && (
                          <>
                            <div className={`hero-shrine-pedestal absolute bottom-[18%] left-1/2 h-16 w-[72%] -translate-x-1/2 rounded-full bg-gradient-to-b ${style.pedestal} blur-xl md:h-20`} />
                            <div className="absolute bottom-[14.5%] left-1/2 h-9 w-[56%] -translate-x-1/2 rounded-full border border-yellow-100/34 bg-[linear-gradient(180deg,rgba(255,239,172,0.26),rgba(62,255,162,0.08))] shadow-[0_0_24px_rgba(252,211,77,0.2)]" />
                          </>
                        )}

                        <div className={`relative flex h-full w-full items-end justify-center overflow-visible ${isCenter ? 'px-1 pb-[2.9rem] md:pb-[3.6rem]' : 'px-0 pb-[1.7rem] md:pb-[2.25rem]'}`}>
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
                                ? 'scale-[1.24] translate-y-[1%] md:scale-[1.72] md:-translate-y-[4%]'
                                : 'scale-[0.66] translate-y-[14%] opacity-48 saturate-[0.38] brightness-[0.68] blur-[1.8px] md:scale-[0.84] md:translate-y-[10%]'
                            }`}
                          />
                        </div>

                        <div className={`hero-shrine-nameplate ${isCenter ? 'hero-shrine-nameplate-selected' : 'hero-shrine-nameplate-side'}`}>
                          <div className={`bg-gradient-to-r ${style.text} bg-clip-text text-transparent ${isCenter ? 'text-[1.18rem] md:text-[1.62rem]' : 'text-[0.72rem] md:text-[0.92rem]'} font-black tracking-[-0.03em]`}>
                            {avatar.name}
                          </div>
                          {isCenter && (
                            <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/76 md:text-[9px]">
                              {avatar.rarity} Hero
                            </div>
                          )}
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
              className="hero-arrow-button absolute right-[0.1rem] top-[58%] z-20 -translate-y-1/2 md:right-[1.2rem] md:top-[46%]"
              aria-label="Next hero"
            >
              <span className="hero-arrow-button-face">
                <span className="hero-arrow-button-gem" />
                <AssetIcon name="next" className="hero-arrow-icon h-5 w-5 md:h-7 md:w-7" />
              </span>
            </motion.button>
          </div>

          <div className="mt-1 flex items-center gap-2 md:mt-2">
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
            className="hero-cta-button hero-cta-button-large mt-2 md:mt-3"
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
