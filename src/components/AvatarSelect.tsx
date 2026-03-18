import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import AssetIcon from './AssetIcon';
import splashBackground from '../assets/fantasy_hero/demo_bg/background_01.png';
import splashGlow from '../assets/fantasy_hero/demo_fx/effect_light_01.png';
import ribbonBlueAsset from '../assets/fantasy_hero/title/ribbon_blue.png';
import cardBgAsset from '../assets/fantasy_hero/frames/card_bg.png';
import cardBorderAsset from '../assets/fantasy_hero/frames/card_border.png';
import cardInnerAsset from '../assets/fantasy_hero/frames/card_inner.png';
import { PrimaryActionButton } from './layout/ScreenPrimitives';

interface AvatarSelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

const HERO_GLOW_STYLES: Record<string, string> = {
  barratt: 'from-cyan-300/55 via-emerald-200/28 to-transparent',
  bran: 'from-orange-300/55 via-amber-200/28 to-transparent',
  mochi: 'from-rose-300/55 via-yellow-200/25 to-transparent',
  vex: 'from-sky-300/55 via-cyan-200/30 to-transparent',
};

const RARITY_BADGE_TONES: Record<string, string> = {
  Common: 'from-cyan-500 to-blue-600',
  Rare: 'from-emerald-500 to-teal-600',
  Epic: 'from-sky-500 to-blue-600',
  Legendary: 'from-amber-400 to-orange-500',
};

const LOCK_MARKERS = [1, 2, 3];

const AvatarSelect: React.FC<AvatarSelectProps> = ({ selectedId, onSelect, onConfirm }) => {
  const selectedIndex = Math.max(0, AVATARS.findIndex(avatar => avatar.id === selectedId));
  const selectedAvatar = AVATARS[selectedIndex] || AVATARS[0];
  const selectedGlowClass = HERO_GLOW_STYLES[selectedAvatar.id] || HERO_GLOW_STYLES.barratt;

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

  const selectIndex = (index: number, allowReselect = true) => {
    const safeIndex = (index + AVATARS.length) % AVATARS.length;
    const avatar = AVATARS[safeIndex];
    if (!allowReselect && avatar.id === selectedId) return;
    triggerHaptic(avatar.id === selectedId ? 'light' : 'selection');
    onSelect(avatar.id);
  };

  const previousIndex = (selectedIndex - 1 + AVATARS.length) % AVATARS.length;
  const nextIndex = (selectedIndex + 1) % AVATARS.length;

  const renderHeroCard = (
    avatar: typeof selectedAvatar,
    variant: 'left' | 'center' | 'right',
    onClick: () => void,
  ) => {
    const isCenter = variant === 'center';
    const badgeTone = RARITY_BADGE_TONES[avatar.rarity] || RARITY_BADGE_TONES.Common;

    return (
      <motion.button
        whileTap={{ scale: 0.97, y: 1 }}
        whileHover={isCenter ? { y: -2 } : { y: -4 }}
        onClick={onClick}
        className={`relative overflow-hidden rounded-[1.35rem] border border-yellow-200/78 shadow-[0_20px_36px_rgba(3,10,26,0.36)] md:rounded-[1.8rem] ${
          isCenter
            ? 'h-[80%] w-[41%] z-20'
            : 'h-[63%] w-[28%] z-10 opacity-92'
        }`}
        style={{
          backgroundImage: `url(${cardBorderAsset}), url(${cardBgAsset}), linear-gradient(180deg,#1a4aa5,#0e2c75 52%,#0a1e53)`,
          backgroundSize: '100% 100%, 100% 100%, cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        aria-label={`Select ${avatar.name}`}
      >
        <div
          className="pointer-events-none absolute inset-[3.5%] rounded-[1.05rem] md:rounded-[1.35rem]"
          style={{
            backgroundImage: `url(${cardInnerAsset}), linear-gradient(180deg,rgba(86,206,255,0.24),rgba(6,36,92,0.24))`,
            backgroundSize: '100% 100%, cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />

        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-2.5 pt-2 md:px-3.5 md:pt-3">
          <div className={`inline-flex items-center rounded-full bg-gradient-to-r ${badgeTone} px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-[0_4px_0_rgba(0,0,0,0.22)] md:text-[10px]`}>
            {avatar.rarity}
          </div>
          {!isCenter && (
            <div className="rounded-full border border-white/36 bg-slate-950/35 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/90 md:text-[9px]">
              LV {avatar.level}
            </div>
          )}
        </div>

        <div className="relative z-10 flex h-full w-full flex-col justify-end p-2 md:p-3">
          <img
            src={avatar.portrait || avatar.image}
            alt={avatar.name}
            className={`w-full object-contain object-bottom drop-shadow-[0_16px_24px_rgba(2,6,23,0.42)] ${
              isCenter
                ? 'h-[78%] scale-[1.14] md:scale-[1.2]'
                : 'h-[74%] scale-[0.96] opacity-85 saturate-[0.75]'
            }`}
            draggable={false}
          />

          <div className="mt-1 rounded-[0.9rem] border border-white/28 bg-slate-950/36 px-2 py-1 text-center text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] md:mt-2 md:rounded-[1.1rem] md:text-lg">
            {avatar.name}
          </div>

          {isCenter && (
            <motion.div
              initial={false}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-2 rounded-full border border-cyan-100/70 bg-[linear-gradient(180deg,#57a2ff,#2656d8)] px-2.5 py-1.5 text-center text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_0_rgba(14,40,120,0.78)] md:mt-2.5 md:px-3.5 md:py-2 md:text-base"
            >
              Select
            </motion.div>
          )}
        </div>
      </motion.button>
    );
  };

  return (
    <div className="relative flex h-full w-full items-stretch justify-center overflow-hidden px-3 pt-[calc(env(safe-area-inset-top)+0.35rem)] pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:px-6 md:pt-5 md:pb-6">
      <div className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2.35rem] border border-cyan-100/30 shadow-[0_28px_60px_rgba(2,6,23,0.45)] md:rounded-[3rem]">
        <div
          className="absolute inset-0 -z-40 bg-cover bg-center opacity-95"
          style={{ backgroundImage: `url(${splashBackground})` }}
        />
        <div className="absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(3,9,19,0.04),rgba(3,9,19,0.12)_20%,rgba(2,6,23,0.78)_100%)]" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_15%,rgba(125,211,252,0.22),rgba(2,6,23,0)_22%),linear-gradient(180deg,rgba(9,16,34,0)_0%,rgba(9,16,34,0.1)_34%,rgba(9,16,34,0.68)_100%)]" />
        <div
          className="pointer-events-none absolute inset-x-[12%] top-[7%] -z-10 h-[36%] bg-center bg-no-repeat opacity-66"
          style={{ backgroundImage: `url(${splashGlow})`, backgroundSize: 'min(32rem, 80vw)' }}
        />

        <div className="relative z-10 flex shrink-0 flex-col items-center px-4 pt-[calc(env(safe-area-inset-top)+0.45rem)] md:px-8 md:pt-6">
          <div className="relative text-center">
            <img
              src={ribbonBlueAsset}
              alt=""
              className="pointer-events-none absolute left-1/2 top-[42%] z-0 h-16 w-[16rem] -translate-x-1/2 -translate-y-1/2 opacity-95 md:h-24 md:w-[26rem]"
              draggable={false}
            />
            <div
              className="relative z-10 text-[2.2rem] font-black uppercase leading-[0.88] tracking-[-0.04em] text-white md:text-[4.1rem]"
              style={{
                fontFamily: 'var(--font-display)',
                WebkitTextStroke: '0.04em rgba(23,30,85,0.72)',
                textShadow: '0 4px 0 rgba(14,22,66,0.8), 0 12px 28px rgba(2,6,23,0.45)',
              }}
            >
              SATs
            </div>
            <div
              className="relative z-10 mt-1 text-[2rem] font-black uppercase leading-[0.88] tracking-[-0.04em] text-[#ffd54f] md:text-[3.8rem]"
              style={{
                fontFamily: 'var(--font-display)',
                WebkitTextStroke: '0.04em rgba(106,48,0,0.72)',
                textShadow: '0 4px 0 rgba(124,45,18,0.72), 0 10px 22px rgba(2,6,23,0.36)',
              }}
            >
              Hero
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-2 md:mt-3.5 md:gap-3">
            {LOCK_MARKERS.map((marker) => (
              <div
                key={marker}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-100/30 bg-slate-950/44 shadow-[0_6px_14px_rgba(0,0,0,0.28)] md:h-10 md:w-10"
              >
                <div className="relative h-4 w-4 rounded-sm border-2 border-cyan-100/75 md:h-5 md:w-5">
                  <div className="absolute left-1/2 top-[-8px] h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-cyan-100/75 bg-transparent md:top-[-9px] md:h-3 md:w-3" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-end px-3 pb-2 pt-1 md:px-7 md:pb-5 md:pt-3">
          <div className={`pointer-events-none absolute left-1/2 top-[36%] h-[12rem] w-[12rem] -translate-x-1/2 rounded-full bg-gradient-to-b ${selectedGlowClass} blur-3xl md:top-[32%] md:h-[18rem] md:w-[18rem]`} />

          <div className="pointer-events-none absolute bottom-[16%] left-1/2 h-10 w-[62%] -translate-x-1/2 rounded-[999px] bg-[radial-gradient(circle,rgba(255,217,95,0.42),rgba(255,217,95,0)_72%)] blur-xl md:h-14" />

          <div className="relative flex h-full w-full max-w-[24rem] items-end justify-center gap-2 md:max-w-5xl md:gap-5">
            <motion.div
              className="pointer-events-none absolute bottom-[10%] left-1/2 z-0 h-[5.4rem] w-[13rem] -translate-x-1/2 rounded-[999px] bg-[radial-gradient(circle,rgba(245,158,11,0.38),rgba(245,158,11,0)_70%)] blur-lg md:bottom-[12%] md:h-[8.2rem] md:w-[19rem]"
              animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.5, 0.75, 0.5] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />

            {renderHeroCard(carouselItems.previous, 'left', () => selectIndex(previousIndex, false))}
            {renderHeroCard(carouselItems.current, 'center', () => selectIndex(selectedIndex))}
            {renderHeroCard(carouselItems.next, 'right', () => selectIndex(nextIndex, false))}

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => selectIndex(previousIndex, false)}
              className="ui-icon-button absolute left-0 top-[52%] z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl p-0 md:left-4 md:h-12 md:w-12"
              aria-label="Previous hero"
            >
              <AssetIcon name="back" className="h-[1rem] w-[1rem] md:h-[1.25rem] md:w-[1.25rem]" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => selectIndex(nextIndex, false)}
              className="ui-icon-button absolute right-0 top-[52%] z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl p-0 md:right-4 md:h-12 md:w-12"
              aria-label="Next hero"
            >
              <AssetIcon name="next" className="h-[1rem] w-[1rem] md:h-[1.25rem] md:w-[1.25rem]" />
            </motion.button>
          </div>

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.985, y: 1 }}
            className="w-full max-w-[22rem] md:max-w-[27rem]"
          >
            <PrimaryActionButton
            onClick={() => {
              triggerHaptic('success');
              onConfirm();
            }}
            className="mt-3 w-full rounded-[1.25rem] px-10 py-3.5 text-lg tracking-[0.07em] md:mt-4 md:rounded-[1.45rem] md:px-12 md:py-4 md:text-2xl"
            >
            Begin Adventure
            </PrimaryActionButton>
          </motion.div>

          <div className="mt-1 text-xs font-bold text-cyan-100/82 md:text-sm">
            Selected Hero: <span className="text-yellow-200">{selectedAvatar.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelect;
