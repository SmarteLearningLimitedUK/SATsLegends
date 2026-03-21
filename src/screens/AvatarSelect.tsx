import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import avatarSelectBackground from '../assets/casual_ui/pedestal char select.png';
import splashStyleButton from '../assets/casual_ui/inputs/btn_1.png';
import chooseBanner from '../assets/characters/CHOOSEYOURHERO.png';
import avatarNextIcon from '../assets/importedassets/Icons/icon - next.png';

const AVATAR_FOOT_ANCHOR_MAIN_Y_PX: Record<string, number> = {
  barratt: 0,
  bran: 6,
  vex: 8,
  mochi: 50,
};

const AVATAR_FOOT_ANCHOR_SIDE_Y_PX: Record<string, number> = {
  barratt: 0,
  bran: 3,
  vex: 4,
  mochi: 32,
};
const AVATAR_MAIN_GLOBAL_LIFT_PX = -62;
const AVATAR_SIDE_GLOBAL_LIFT_PX = -50;
const AVATAR_MAIN_VISUAL_SCALE = 2.4;
const AVATAR_SIDE_VISUAL_SCALE = 2.1;

interface AvatarSelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

type AvatarVisual = {
  id: string;
  name: string;
  image: string;
  portrait?: string;
  portraitVideo?: string;
};

const AvatarSelect: React.FC<AvatarSelectProps> = ({ selectedId, onSelect, onConfirm }) => {
  const [failedVideoIds, setFailedVideoIds] = React.useState<Set<string>>(new Set());
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
  const getAvatarImage = (avatar: AvatarVisual) => avatar.portrait || avatar.image;
  const shouldUseVideo = (avatar: AvatarVisual) => Boolean(avatar.portraitVideo) && !failedVideoIds.has(avatar.id);
  const handleVideoError = (avatarId: string) => {
    setFailedVideoIds((prev) => {
      if (prev.has(avatarId)) return prev;
      const next = new Set(prev);
      next.add(avatarId);
      return next;
    });
  };
  const renderAvatarMedia = (
    avatar: AvatarVisual,
    className: string,
    style: React.CSSProperties,
    decorative: boolean
  ) => {
    if (shouldUseVideo(avatar)) {
      return (
        <video
          src={avatar.portraitVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => handleVideoError(avatar.id)}
          className={`${className} pointer-events-none`}
          style={style}
          aria-hidden={decorative}
        />
      );
    }

    return (
      <img
        src={getAvatarImage(avatar)}
        alt={decorative ? '' : avatar.name}
        aria-hidden={decorative}
        className={className}
        style={style}
        draggable={false}
      />
    );
  };

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
            >
              <span className="avatar-hero-arrow-shell" aria-hidden>
                <span className="avatar-hero-arrow-core">
                  <img
                    src={avatarNextIcon}
                    alt=""
                    aria-hidden
                    className="avatar-hero-arrow-icon scale-x-[-1]"
                    draggable={false}
                  />
                </span>
              </span>
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
                {renderAvatarMedia(
                  previousAvatar,
                  'h-[1440%] w-auto object-contain object-bottom',
                  getSideFootOffsetStyle(previousAvatar.id),
                  true
                )}
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
                  {renderAvatarMedia(
                    selectedAvatar,
                    'h-[2240%] w-auto object-contain object-bottom',
                    getMainFootOffsetStyle(selectedAvatar.id),
                    false
                  )}
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
                {renderAvatarMedia(
                  nextAvatar,
                  'h-[1440%] w-auto object-contain object-bottom',
                  getSideFootOffsetStyle(nextAvatar.id),
                  true
                )}
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.04 }}
              onClick={() => selectIndex(nextIndex)}
              className="avatar-hero-arrow avatar-hero-arrow-right"
              aria-label="Next hero"
              type="button"
            >
              <span className="avatar-hero-arrow-shell" aria-hidden>
                <span className="avatar-hero-arrow-core">
                  <img
                    src={avatarNextIcon}
                    alt=""
                    aria-hidden
                    className="avatar-hero-arrow-icon"
                    draggable={false}
                  />
                </span>
              </span>
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
