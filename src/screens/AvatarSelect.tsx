import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import avatarSelectBackground from '../assets/casual_ui/pedestal char select.png';
import splashStyleButton from '../assets/casual_ui/inputs/btn_1.png';
import heroRibbon from '../assets/casual_ui/dialogs_panels/ribbon_1.png';
import heroNameBlueRibbon from '../assets/importedassets/Dialogs & Panels/ribbon 1.png';
import avatarNextIcon from '../assets/importedassets/Icons/icon - next.png';
import arrowButtonFrame from '../assets/importedassets/Icons/icon container.png';

const AVATAR_FOOT_ANCHOR_MAIN_Y_PX: Record<string, number> = {
  barratt: 0,
  bran: 6,
  vex: 8,
  mochi: 30,
};

const AVATAR_FOOT_ANCHOR_SIDE_Y_PX: Record<string, number> = {
  barratt: 0,
  bran: 3,
  vex: 4,
  mochi: 12,
};
const AVATAR_MAIN_GLOBAL_LIFT_PX = -92;
const AVATAR_SIDE_GLOBAL_LIFT_PX = -70;
const AVATAR_MAIN_VISUAL_SCALE = 1;
const AVATAR_SIDE_VISUAL_SCALE = 1;

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
  const getMainFootOffsetStyle = (avatarId: string): React.CSSProperties => ({
    transform: `translateY(${AVATAR_MAIN_GLOBAL_LIFT_PX + (AVATAR_FOOT_ANCHOR_MAIN_Y_PX[avatarId] ?? 0)}px) scale(${AVATAR_MAIN_VISUAL_SCALE})`,
    transformOrigin: 'bottom center',
  });
  const getSideFootOffsetStyle = (avatarId: string): React.CSSProperties => ({
    transform: `translateY(${AVATAR_SIDE_GLOBAL_LIFT_PX + (AVATAR_FOOT_ANCHOR_SIDE_Y_PX[avatarId] ?? 0)}px) scale(${AVATAR_SIDE_VISUAL_SCALE})`,
    transformOrigin: 'bottom center',
  });

  return (
    <div className="avatar-select-screen relative h-full w-full overflow-hidden">
      <img
        src={avatarSelectBackground}
        alt=""
        aria-hidden
        className="avatar-select-background pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: '50% 0%' }}
        draggable={false}
      />

      <div className="relative z-10 flex h-full w-full items-center justify-center">
        <div className="avatar-select-layout relative flex h-full w-full flex-col">
          <div className="avatar-carousel-header">
            <div className="avatar-carousel-banner">
              <img
                src={heroRibbon}
                alt=""
                aria-hidden
                className="avatar-carousel-banner-art"
                draggable={false}
              />
              <h2 className="avatar-carousel-title">Choose Your Hero</h2>
            </div>
          </div>
          <div className="avatar-hero-name-banner avatar-hero-name-banner-under-title">
              <img
                src={heroNameBlueRibbon}
                alt=""
                aria-hidden
                className="avatar-hero-name-banner-art avatar-hero-name-banner-art-cyan"
                draggable={false}
              />
            <div className="avatar-hero-name-banner-text">{selectedAvatar.name}</div>
          </div>

          <div className="avatar-hero-stage relative mt-2 flex min-h-0 flex-1 items-center justify-center overflow-visible md:mt-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              onClick={() => selectIndex(previousIndex)}
              className="avatar-hero-arrow avatar-hero-arrow-left"
              aria-label="Previous hero"
              type="button"
            >
              <img
                src={arrowButtonFrame}
                alt=""
                aria-hidden
                className="avatar-hero-arrow-frame"
                draggable={false}
              />
              <img
                src={avatarNextIcon}
                alt=""
                aria-hidden
                className="avatar-hero-arrow-icon scale-x-[-1]"
                draggable={false}
              />
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
                  className="h-[300%] w-auto object-contain object-bottom"
                  style={getSideFootOffsetStyle(previousAvatar.id)}
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
                    className="h-[460%] w-auto object-contain object-bottom"
                    style={getMainFootOffsetStyle(selectedAvatar.id)}
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
                  className="h-[300%] w-auto object-contain object-bottom"
                  style={getSideFootOffsetStyle(nextAvatar.id)}
                  draggable={false}
                />
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.04 }}
              onClick={() => selectIndex(nextIndex)}
              className="avatar-hero-arrow avatar-hero-arrow-right"
              aria-label="Next hero"
              type="button"
            >
              <img
                src={arrowButtonFrame}
                alt=""
                aria-hidden
                className="avatar-hero-arrow-frame"
                draggable={false}
              />
              <img
                src={avatarNextIcon}
                alt=""
                aria-hidden
                className="avatar-hero-arrow-icon"
                draggable={false}
              />
            </motion.button>
          </div>

          <div className="avatar-hero-cta-shell">
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
