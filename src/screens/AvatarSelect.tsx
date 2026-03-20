import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import AssetIcon from '../components/AssetIcon';
import splashBackground from '../assets/fantasy_hero/demo_bg/background_01.png';
import splashGlow from '../assets/fantasy_hero/demo_fx/effect_light_01.png';
import heroBanner from '../assets/casual_ui/dialogs_panels/ribbon_1.png';
import splashStyleButton from '../assets/casual_ui/inputs/btn_1.png';

interface AvatarSelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

const AvatarSelect: React.FC<AvatarSelectProps> = ({ selectedId, onSelect, onConfirm }) => {
  const selectedIndex = Math.max(0, AVATARS.findIndex((avatar) => avatar.id === selectedId));
  const selectedAvatar = AVATARS[selectedIndex] || AVATARS[0];

  useEffect(() => {
    if (!AVATARS.some((avatar) => avatar.id === selectedId)) {
      onSelect(AVATARS[0].id);
    }
  }, [onSelect, selectedId]);

  const selectIndex = (index: number) => {
    const safeIndex = (index + AVATARS.length) % AVATARS.length;
    const avatar = AVATARS[safeIndex];
    triggerHaptic(avatar.id === selectedId ? 'light' : 'selection');
    onSelect(avatar.id);
  };

  const previousIndex = (selectedIndex - 1 + AVATARS.length) % AVATARS.length;
  const nextIndex = (selectedIndex + 1) % AVATARS.length;
  const previousAvatar = AVATARS[previousIndex] || selectedAvatar;
  const nextAvatar = AVATARS[nextIndex] || selectedAvatar;

  return (
    <div className="premium-page-root avatar-select-screen relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0 -z-30 bg-cover bg-center"
        style={{ backgroundImage: `url(${splashBackground})` }}
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(2,8,22,0.2),rgba(2,8,22,0.76))]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_22%,rgba(125,211,252,0.25),rgba(125,211,252,0)_34%)]" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[48rem] items-center justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.65rem)] md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="avatar-select-layout relative flex h-full w-full max-h-[54rem] flex-col">
          <div className="avatar-carousel-header">
            <div
              className="avatar-carousel-banner"
              style={{
                backgroundImage: `url(${heroBanner})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <span>Choose Your Hero</span>
            </div>
          </div>

          <div className="avatar-hero-stage relative mt-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden md:mt-3">
            <div className="avatar-hero-ray absolute inset-0" />
            <div
              className="pointer-events-none absolute inset-x-[18%] top-[6%] h-[38%] bg-center bg-no-repeat opacity-80"
              style={{ backgroundImage: `url(${splashGlow})`, backgroundSize: 'min(29rem, 84vw)' }}
            />
            <div className="pointer-events-none absolute bottom-[9%] h-20 w-[68%] rounded-[999px] bg-[radial-gradient(circle,rgba(255,219,97,0.46),rgba(255,219,97,0)_74%)] blur-xl" />

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => selectIndex(previousIndex)}
              className="avatar-hero-arrow avatar-hero-arrow-left"
              aria-label="Previous hero"
              type="button"
            >
              <AssetIcon name="back" className="h-5 w-5 md:h-6 md:w-6" />
            </motion.button>

            <div className="avatar-carousel-track">
              <motion.button
                type="button"
                whileHover={{ scale: 0.92 }}
                whileTap={{ scale: 0.86 }}
                onClick={() => selectIndex(previousIndex)}
                className="avatar-carousel-side avatar-carousel-side-left"
                aria-label={`Select ${previousAvatar.name}`}
              >
                <img
                  src={previousAvatar.portrait || previousAvatar.image}
                  alt=""
                  aria-hidden
                  className="h-[72%] w-auto object-contain object-bottom"
                  draggable={false}
                />
              </motion.button>

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedAvatar.id}
                  initial={{ opacity: 0, scale: 0.86, y: 26 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: -18 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  className="avatar-carousel-main"
                >
                  <img
                    src={selectedAvatar.portrait || selectedAvatar.image}
                    alt={selectedAvatar.name}
                    className="h-[95%] w-auto object-contain object-bottom drop-shadow-[0_22px_30px_rgba(2,6,23,0.52)]"
                    draggable={false}
                  />
                </motion.div>
              </AnimatePresence>

              <motion.button
                type="button"
                whileHover={{ scale: 0.92 }}
                whileTap={{ scale: 0.86 }}
                onClick={() => selectIndex(nextIndex)}
                className="avatar-carousel-side avatar-carousel-side-right"
                aria-label={`Select ${nextAvatar.name}`}
              >
                <img
                  src={nextAvatar.portrait || nextAvatar.image}
                  alt=""
                  aria-hidden
                  className="h-[72%] w-auto object-contain object-bottom"
                  draggable={false}
                />
              </motion.button>
            </div>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => selectIndex(nextIndex)}
              className="avatar-hero-arrow avatar-hero-arrow-right"
              aria-label="Next hero"
              type="button"
            >
              <AssetIcon name="next" className="h-5 w-5 md:h-6 md:w-6" />
            </motion.button>
          </div>

          <div className="avatar-hero-nameplate mt-3 md:mt-4">{selectedAvatar.name}</div>

          <div className="avatar-hero-cta-shell mt-3 w-full md:mt-4">
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full bg-amber-300/85 blur-[7px]"
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [0.99, 1.05, 0.99]
              }}
              transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                triggerHaptic('success');
                onConfirm();
              }}
              className="relative h-full w-full rounded-full border-0 bg-transparent p-0 shadow-[0_8px_22px_rgba(0,0,0,0.35)]"
              aria-label="Begin adventure"
            >
              <img
                src={splashStyleButton}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full rounded-full object-fill"
                draggable={false}
              />
              <span className="relative z-10 text-base font-black uppercase tracking-[0.12em] text-amber-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.45)] md:text-lg">
                Begin Adventure
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelect;
