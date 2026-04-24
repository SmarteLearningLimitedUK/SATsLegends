import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import AssetIcon from '../components/AssetIcon';
import avatarSelectBackground from '../assets/maps/backgroundsforgames/charselect.jpg';
import chooseBanner from '../assets/characters/chooseheroes.png';

const AVATAR_FOOT_ANCHOR_MAIN_Y_PX: Record<string, number> = {
  barratt: 0,
  bran: 6,
  vex: 8,
  mochi: 55,
};

const AVATAR_MAIN_GLOBAL_LIFT_PX = -28;
const AVATAR_MAIN_VISUAL_SCALE = 2.16;

interface AvatarSelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  onBackToSplash: () => void;
  onConfirm: () => void;
}

const AvatarSelect: React.FC<AvatarSelectProps> = ({
  selectedId,
  onSelect,
  draftName,
  onDraftNameChange,
  onBackToSplash,
  onConfirm,
}) => {
  const selectedIndex = Math.max(0, AVATARS.findIndex((avatar) => avatar.id === selectedId));
  const selectedAvatar = AVATARS[selectedIndex] || AVATARS[0];
  const bannerSrc = chooseBanner;

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
    <div className="avatar-select-screen relative h-full w-full min-h-0 overflow-hidden">
      <img
        src={avatarSelectBackground}
        alt=""
        aria-hidden
        className="avatar-select-background pointer-events-none absolute inset-0 h-full w-full object-contain object-center"
        style={{ objectPosition: '50% 0%' }}
        draggable={false}
      />

      <div className="relative z-10 flex h-full w-full items-center justify-center">
        <div className="avatar-select-layout relative flex h-full w-full flex-col">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              onBackToSplash();
            }}
            className="ui-icon-button absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 flex h-11 w-11 items-center justify-center rounded-full p-0 text-white shadow-xl sm:left-5 sm:h-12 sm:w-12"
            aria-label="Back to islands"
          >
            <AssetIcon name="back" className="h-6 w-6 sm:h-8 sm:w-8" />
          </button>

          <div className="avatar-carousel-header">
            <div className="avatar-carousel-banner">
              <img
                src={bannerSrc}
                alt=""
                aria-hidden
                className="avatar-carousel-banner-art mx-auto"
                draggable={false}
              />
            </div>
          </div>

            <div className="avatar-name-panel relative z-30 mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-[1.35rem] border border-cyan-100/18 bg-[linear-gradient(180deg,rgba(8,21,58,0.82),rgba(4,15,44,0.88))] px-4 py-4 text-center shadow-[0_18px_32px_rgba(2,6,23,0.32)] backdrop-blur-md sm:px-5 sm:py-5">
              <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-cyan-100/80 sm:text-xs">
                Enter your name and select your Hero.
              </div>
              <input
                value={draftName}
                onChange={(event) => onDraftNameChange(event.target.value.slice(0, 18))}
                onKeyDown={(event) => {
                if (event.key === 'Enter') onConfirm();
                }}
              placeholder="Explorer"
              className="aaa-name-input w-full rounded-[1.15rem] border border-white/20 bg-slate-950/65 px-5 py-3 text-center text-base font-black text-white shadow-[0_14px_28px_rgba(0,0,0,0.2)] outline-none placeholder:text-white/45 focus:ring-2 focus:ring-amber-300/45 md:rounded-[1.5rem] md:px-6 md:py-4 md:text-2xl"
            />
          </div>

           <div className="avatar-hero-stage relative mt-2 flex min-h-0 flex-1 items-center justify-center overflow-visible md:mt-3">
             <motion.button
              onClick={() => selectIndex(previousIndex)}
              className="avatar-hero-arrow avatar-hero-arrow-left"
              aria-label="Previous hero"
              type="button"
            >
              <span
                aria-hidden
                className="avatar-hero-arrow-glyph avatar-hero-arrow-glyph-left"
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
                  className="avatar-carousel-main avatar-carousel-main-only pointer-events-none"
                >
                  <img
                    src={getAvatarImage(selectedAvatar)}
                    alt={selectedAvatar.name}
                    className="pointer-events-none h-[2240%] w-auto object-contain object-bottom"
                    style={getMainFootOffsetStyle(selectedAvatar.id)}
                    draggable={false}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.button
              onClick={() => selectIndex(nextIndex)}
              className="avatar-hero-arrow avatar-hero-arrow-right"
              aria-label="Next hero"
              type="button"
            >
              <span
                aria-hidden
                className="avatar-hero-arrow-glyph avatar-hero-arrow-glyph-right"
              />
            </motion.button>
          </div>

          <div className="absolute bottom-[7.5%] left-1/2 z-20 h-14 w-56 -translate-x-1/2 sm:h-16 sm:w-64">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('success');
                onConfirm();
              }}
              aria-label="Begin adventure"
              className="ui-button-primary flex h-full w-full items-center justify-center border-0 bg-transparent px-4 py-0 text-lg font-black uppercase tracking-[0.12em] text-[#16233d] sm:text-xl"
            >
              Begin Adventure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelect;


