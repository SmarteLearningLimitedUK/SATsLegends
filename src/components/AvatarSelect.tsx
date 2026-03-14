import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import AnimatedAvatar from './AnimatedAvatar';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import AssetIcon from './AssetIcon';
import splashBackground from '../assets/fantasy_hero/demo_bg/background_01.png';
import splashGlow from '../assets/fantasy_hero/demo_fx/effect_light_01.png';

interface AvatarSelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

const HERO_STYLES: Record<string, {
  glow: string;
  pedestal: string;
  beam: string;
  particle: string;
}> = {
  barratt: {
    glow: 'from-emerald-300/36 via-cyan-300/18 to-transparent',
    pedestal: 'from-cyan-200/44 via-sky-200/18 to-transparent',
    beam: 'from-emerald-200/32 via-cyan-200/10 to-transparent',
    particle: 'rgba(94,234,212,0.88)',
  },
  bran: {
    glow: 'from-orange-300/40 via-amber-300/18 to-transparent',
    pedestal: 'from-yellow-200/66 via-orange-300/28 to-transparent',
    beam: 'from-amber-100/34 via-orange-200/10 to-transparent',
    particle: 'rgba(253,186,116,0.92)',
  },
  mochi: {
    glow: 'from-rose-300/36 via-fuchsia-300/18 to-transparent',
    pedestal: 'from-amber-200/36 via-rose-200/18 to-transparent',
    beam: 'from-rose-100/34 via-pink-200/10 to-transparent',
    particle: 'rgba(251,113,133,0.9)',
  },
  vex: {
    glow: 'from-violet-300/38 via-indigo-300/18 to-transparent',
    pedestal: 'from-violet-200/62 via-indigo-300/24 to-transparent',
    beam: 'from-violet-100/34 via-indigo-200/10 to-transparent',
    particle: 'rgba(196,181,253,0.9)',
  },
};

const PARTICLE_POSITIONS = [
  { left: '42%', top: '17%', delay: 0, duration: 4.8, scale: 1 },
  { left: '47%', top: '22%', delay: 0.5, duration: 5.4, scale: 0.72 },
  { left: '53%', top: '16%', delay: 0.9, duration: 4.5, scale: 0.8 },
  { left: '58%', top: '24%', delay: 1.2, duration: 5.8, scale: 1.08 },
  { left: '39%', top: '29%', delay: 1.5, duration: 6.2, scale: 0.68 },
  { left: '61%', top: '31%', delay: 1.1, duration: 5.1, scale: 0.84 },
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

    return {
      previous: AVATARS[prevIndex],
      current: AVATARS[selectedIndex],
      next: AVATARS[nextIndex],
    };
  }, [selectedIndex]);

  const selectIndex = (index: number) => {
    const safeIndex = (index + AVATARS.length) % AVATARS.length;
    const avatar = AVATARS[safeIndex];
    triggerHaptic(avatar.id === selectedId ? 'light' : 'selection');
    onSelect(avatar.id);
  };

  const previousIndex = (selectedIndex - 1 + AVATARS.length) % AVATARS.length;
  const nextIndex = (selectedIndex + 1) % AVATARS.length;

  return (
    <div className="relative flex h-full w-full items-stretch justify-center overflow-hidden px-3 pt-[calc(env(safe-area-inset-top)+0.35rem)] pb-[calc(env(safe-area-inset-bottom)+0.6rem)] md:px-6 md:pt-5 md:pb-6">
      <div className="hero-screen-shell relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2.35rem] md:rounded-[3rem]">
        <div
          className="absolute inset-0 -z-40 bg-cover bg-center opacity-95"
          style={{ backgroundImage: `url(${splashBackground})` }}
        />
        <div className="absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(3,9,19,0.08),rgba(3,9,19,0.14)_20%,rgba(2,6,23,0.72)_100%)]" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_15%,rgba(125,211,252,0.22),rgba(2,6,23,0)_22%),linear-gradient(180deg,rgba(9,16,34,0)_0%,rgba(9,16,34,0.1)_34%,rgba(9,16,34,0.68)_100%)]" />
        <div
          className="pointer-events-none absolute inset-x-[18%] top-[7%] -z-10 h-[34%] bg-center bg-no-repeat opacity-66"
          style={{ backgroundImage: `url(${splashGlow})`, backgroundSize: 'min(32rem, 80vw)' }}
        />

        <div className="relative z-10 flex shrink-0 justify-center px-4 pt-[calc(env(safe-area-inset-top)+0.45rem)] md:px-8 md:pt-6">
          <div className="hero-header-banner hero-header-banner-compact px-6 py-2.5 md:px-9 md:py-3.5">
            <h1
              className="text-[1.6rem] font-black leading-none tracking-[-0.035em] text-[#fff7dc] md:text-[2.7rem]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Choose Your Hero
            </h1>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-end px-4 pb-2 pt-2 md:px-8 md:pb-5 md:pt-4">
          <div className="hero-carousel-stage relative flex w-full max-w-[22rem] flex-1 items-end justify-center md:max-w-[34rem]">
            <motion.div
              className="hero-portal-swirl pointer-events-none absolute left-1/2 top-[16%] z-0 h-24 w-24 -translate-x-1/2 rounded-full md:top-[12%] md:h-40 md:w-40"
              animate={{ rotate: 360, scale: [0.98, 1.04, 0.98], opacity: [0.4, 0.66, 0.4] }}
              transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            />
            <div className={`pointer-events-none absolute left-1/2 top-[19%] z-0 h-[16rem] w-[10rem] -translate-x-1/2 rounded-[50%] bg-gradient-to-b ${selectedStyle.beam} opacity-70 blur-2xl md:h-[24rem] md:w-[14rem]`} />
            <div className={`pointer-events-none absolute bottom-[16%] left-1/2 z-0 h-20 w-[11rem] -translate-x-1/2 rounded-full bg-gradient-to-b ${selectedStyle.pedestal} blur-xl md:h-24 md:w-[14rem]`} />
            <div className="pointer-events-none absolute bottom-[12%] left-1/2 z-0 h-10 w-[8.6rem] -translate-x-1/2 rounded-full border border-yellow-100/30 bg-[linear-gradient(180deg,rgba(255,239,172,0.22),rgba(135,206,250,0.05))] shadow-[0_0_18px_rgba(252,211,77,0.16)] md:h-12 md:w-[11rem]" />

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

            <motion.button
              whileTap={{ scale: 0.94, y: 1 }}
              onClick={() => selectIndex(previousIndex)}
              className="hero-carousel-preview hero-carousel-preview-left"
              aria-label={`Select ${carouselItems.previous.name}`}
            >
              <AnimatedAvatar
                avatar={carouselItems.previous}
                pose="thinking"
                frameDurationMs={1500}
                floating={false}
                cycleFrames={false}
                showBackdropGlow={false}
                alt={carouselItems.previous.name}
                className="h-full w-full"
                imageClassName="object-bottom scale-[0.92] translate-y-[12%] opacity-46 saturate-[0.38] brightness-[0.68] blur-[1.5px]"
              />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94, y: 1 }}
              onClick={() => selectIndex(nextIndex)}
              className="hero-carousel-preview hero-carousel-preview-right"
              aria-label={`Select ${carouselItems.next.name}`}
            >
              <AnimatedAvatar
                avatar={carouselItems.next}
                pose="thinking"
                frameDurationMs={1500}
                floating={false}
                cycleFrames={false}
                showBackdropGlow={false}
                alt={carouselItems.next.name}
                className="h-full w-full"
                imageClassName="object-bottom scale-[0.92] translate-y-[12%] opacity-46 saturate-[0.38] brightness-[0.68] blur-[1.5px]"
              />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94, y: 1 }}
              onClick={() => selectIndex(previousIndex)}
              className="hero-arrow-button hero-arrow-button-clean absolute left-[0.5rem] top-[54%] z-20 -translate-y-1/2 md:left-[2rem] md:top-[50%]"
              aria-label="Previous hero"
            >
              <span className="hero-arrow-button-face">
                <AssetIcon name="back" className="hero-arrow-icon h-[1.125rem] w-[1.125rem] md:h-6 md:w-6" />
              </span>
            </motion.button>

            <motion.div
              animate={{ scale: [1, 1.028, 1], y: [0, -6, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
              className="hero-carousel-selected relative z-20 flex h-full w-full items-end justify-center"
            >
              <AnimatedAvatar
                avatar={carouselItems.current}
                pose="idle"
                frameDurationMs={1500}
                floating={true}
                cycleFrames={false}
                showBackdropGlow={false}
                alt={carouselItems.current.name}
                className="h-full w-full"
                imageClassName="object-bottom scale-[1.5] -translate-y-[2%] md:scale-[1.86] md:-translate-y-[5%]"
              />
            </motion.div>

            <motion.button
              whileTap={{ scale: 0.94, y: 1 }}
              onClick={() => selectIndex(nextIndex)}
              className="hero-arrow-button hero-arrow-button-clean absolute right-[0.5rem] top-[54%] z-20 -translate-y-1/2 md:right-[2rem] md:top-[50%]"
              aria-label="Next hero"
            >
              <span className="hero-arrow-button-face">
                <AssetIcon name="next" className="hero-arrow-icon h-[1.125rem] w-[1.125rem] md:h-6 md:w-6" />
              </span>
            </motion.button>
          </div>

          <motion.button
            whileTap={{ scale: 0.985 }}
            onClick={() => triggerHaptic('light')}
            className="hero-name-chip mt-2 md:mt-3"
            aria-label={`Selected hero ${selectedAvatar.name}`}
          >
            {selectedAvatar.name}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.985, y: 1 }}
            onClick={() => {
              triggerHaptic('success');
              onConfirm();
            }}
            className="hero-cta-button hero-cta-button-large mt-3 md:mt-4"
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
