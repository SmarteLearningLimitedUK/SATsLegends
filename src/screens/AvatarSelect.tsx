import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import AssetIcon from '../components/AssetIcon';
import splashBackground from '../assets/fantasy_hero/demo_bg/background_01.png';
import splashGlow from '../assets/fantasy_hero/demo_fx/effect_light_01.png';
import { MAIN_PNG_SKIN } from '../assets/reskin/mainPng';
import { PrimaryActionButton } from '../layout/ScreenPrimitives';

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

  return (
    <div className="premium-page-root avatar-select-screen relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0 -z-30 bg-cover bg-center"
        style={{ backgroundImage: `url(${splashBackground})` }}
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(2,8,22,0.2),rgba(2,8,22,0.76))]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_22%,rgba(125,211,252,0.25),rgba(125,211,252,0)_34%)]" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[31rem] items-center justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.6rem)] md:max-w-[36rem] md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div
          className="avatar-hero-shell relative flex h-full w-full max-h-[52rem] flex-col rounded-[2rem] border border-cyan-100/24 p-2.5 shadow-[0_28px_58px_rgba(2,6,23,0.44)] md:rounded-[2.35rem] md:p-3.5"
          style={{
            backgroundImage: `url(${MAIN_PNG_SKIN.textBox})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="avatar-hero-header">
            <div
              className="avatar-hero-header-pill"
              style={{
                backgroundImage: `url(${MAIN_PNG_SKIN.mission})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
              }}
            >
              Choose Your Hero
            </div>
          </div>

          <div className="avatar-hero-stage relative mt-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.45rem] md:mt-3 md:rounded-[1.7rem]">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,56,112,0.36),rgba(8,20,46,0.84))]" />
            <div className="avatar-hero-ray absolute inset-0" />
            <div
              className="pointer-events-none absolute inset-x-[20%] top-[10%] h-[40%] bg-center bg-no-repeat opacity-75"
              style={{ backgroundImage: `url(${splashGlow})`, backgroundSize: 'min(24rem, 78vw)' }}
            />
            <div className="pointer-events-none absolute bottom-[14%] h-14 w-[64%] rounded-[999px] bg-[radial-gradient(circle,rgba(255,219,97,0.36),rgba(255,219,97,0)_72%)] blur-xl" />

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => selectIndex(previousIndex)}
              className="avatar-hero-arrow avatar-hero-arrow-left"
              aria-label="Previous hero"
              type="button"
            >
              <AssetIcon name="back" className="h-5 w-5 md:h-6 md:w-6" />
            </motion.button>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedAvatar.id}
                initial={{ opacity: 0, scale: 0.88, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -14 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="relative z-10 flex h-full w-full items-end justify-center px-6 pb-5 pt-6 md:px-8 md:pb-7 md:pt-8"
              >
                <img
                  src={selectedAvatar.portrait || selectedAvatar.image}
                  alt={selectedAvatar.name}
                  className="h-[80%] w-auto object-contain object-bottom drop-shadow-[0_18px_28px_rgba(2,6,23,0.5)] md:h-[83%]"
                  draggable={false}
                />
              </motion.div>
            </AnimatePresence>

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

          <PrimaryActionButton
            onClick={() => {
              triggerHaptic('success');
              onConfirm();
            }}
            className="avatar-hero-cta mt-3 w-full rounded-[1.2rem] py-3.5 text-base tracking-[0.08em] md:mt-4 md:rounded-[1.35rem] md:py-4 md:text-lg"
          >
            Begin Adventure
          </PrimaryActionButton>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelect;

