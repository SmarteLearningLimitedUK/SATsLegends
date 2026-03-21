import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import avatarSelectBackground from '../assets/casual_ui/pedestal char select.png';
import splashStyleButton from '../assets/casual_ui/inputs/btn_1.png';
import chooseBanner from '../assets/characters/choose.png';
import arrowBlueIdle from '../assets/casual_ui/inputs/arrow_blue_idle.png';
import arrowGoldPressed from '../assets/casual_ui/inputs/arrow_gold_pressed.png';

const AVATAR_FOOT_ANCHOR_MAIN_Y_PX: Record<string, number> = {
  barratt: 0,
  bran: 6,
  vex: 8,
  mochi: 85,
};

const AVATAR_MAIN_GLOBAL_LIFT_PX = -62;
const AVATAR_MAIN_VISUAL_SCALE = 2.4;

interface AvatarSelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

const AvatarSelect: React.FC<AvatarSelectProps> = ({ selectedId, onSelect, onConfirm }) => {
  const selectedIndex = Math.max(0, AVATARS.findIndex((avatar) => avatar.id === selectedId));
  const selectedAvatar = AVATARS[selectedIndex] || AVATARS[0];
  const [pressedArrow, setPressedArrow] = useState<'left' | 'right' | null>(null);

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
  const getMainFootOffsetStyle = (avatarId: string): React.CSSProperties => ({
    transform: `translateY(${AVATAR_MAIN_GLOBAL_LIFT_PX + (AVATAR_FOOT_ANCHOR_MAIN_Y_PX[avatarId] ?? 0)}px) scale(${AVATAR_MAIN_VISUAL_SCALE})`,
    transformOrigin: 'bottom center',
  });
  const getAvatarImage = (avatar: { portrait?: string; image: string }) => avatar.portrait || avatar.image;

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
                src={chooseBanner}
                alt=""
                aria-hidden
                className="avatar-carousel-banner-art"
                draggable={false}
              />
            </div>
          </div>
          <div className="avatar-hero-stage relative mt-2 flex min-h-0 flex-1 items-center justify-center overflow-visible md:mt-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              onClick={() => selectIndex(previousIndex)}
              className="avatar-hero-arrow avatar-hero-arrow-left"
              aria-label="Previous hero"
              type="button"
              onPointerDown={() => setPressedArrow('left')}
              onPointerUp={() => setPressedArrow(null)}
              onPointerCancel={() => setPressedArrow(null)}
              onPointerLeave={() => setPressedArrow(null)}
            >
              <img
                src={pressedArrow === 'left' ? arrowGoldPressed : arrowBlueIdle}
                alt=""
                aria-hidden
                className={`avatar-hero-arrow-art ${pressedArrow === 'left' ? 'scale-x-[-1]' : ''}`}
                draggable={false}
              />
            </motion.button>

            <div className="avatar-carousel-track">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedAvatar.id}
                  initial={{ opacity: 0, scale: 0.86, y: 26 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: -18 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  className="avatar-carousel-main avatar-carousel-main-only"
                >
                  <img
                    src={getAvatarImage(selectedAvatar)}
                    alt={selectedAvatar.name}
                    className="h-[2240%] w-auto object-contain object-bottom"
                    style={getMainFootOffsetStyle(selectedAvatar.id)}
                    draggable={false}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.04 }}
              onClick={() => selectIndex(nextIndex)}
              className="avatar-hero-arrow avatar-hero-arrow-right"
              aria-label="Next hero"
              type="button"
              onPointerDown={() => setPressedArrow('right')}
              onPointerUp={() => setPressedArrow(null)}
              onPointerCancel={() => setPressedArrow(null)}
              onPointerLeave={() => setPressedArrow(null)}
            >
              <img
                src={pressedArrow === 'right' ? arrowGoldPressed : arrowBlueIdle}
                alt=""
                aria-hidden
                className={`avatar-hero-arrow-art ${pressedArrow === 'right' ? '' : 'scale-x-[-1]'}`}
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
