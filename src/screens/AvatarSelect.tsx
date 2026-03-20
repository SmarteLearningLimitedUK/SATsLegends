import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import AssetIcon from '../components/AssetIcon';
import avatarSelectBackground from '../assets/casual_ui/pedestal char select.png';
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
    <div className="avatar-select-screen relative h-full w-full overflow-hidden">
      <img
        src={avatarSelectBackground}
        alt=""
        aria-hidden
        className="avatar-select-background pointer-events-none absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />

      <div className="relative z-10 flex h-full w-full items-center justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.65rem)] md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="avatar-select-layout relative flex h-full w-full flex-col">
          <div className="avatar-carousel-header">
            <h2 className="avatar-carousel-title">Choose Your Hero</h2>
          </div>

          <div className="avatar-hero-stage relative mt-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden md:mt-3">
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
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                triggerHaptic('success');
                onConfirm();
              }}
              className="relative h-full w-full rounded-full border-0 bg-transparent p-0"
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
