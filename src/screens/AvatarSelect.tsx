import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import avatarSelectBackground from '../assets/casual_ui/pedestal char select.png';
import splashStyleButton from '../assets/casual_ui/inputs/btn_1.png';
import chooseBanner from '../assets/characters/chooseheroes.png';

const AVATAR_FOOT_ANCHOR_MAIN_Y_PX: Record<string, number> = {
  barratt: 0,
  bran: 6,
  vex: 8,
  mochi: 85,
};

const AVATAR_MAIN_GLOBAL_LIFT_PX = -62;
const AVATAR_MAIN_VISUAL_SCALE = 2.16;

const removeBannerMatte = (src: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const visited = new Uint8Array(width * height);
        const stack: number[] = [];

        const isMatte = (pixelIndex: number) => {
          const r = data[pixelIndex];
          const g = data[pixelIndex + 1];
          const b = data[pixelIndex + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          return max <= 126 && max - min <= 36;
        };

        const pushIfMatte = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= width || y >= height) return;
          const p = y * width + x;
          if (visited[p]) return;
          const i = p * 4;
          if (!isMatte(i)) return;
          visited[p] = 1;
          stack.push(p);
        };

        for (let x = 0; x < width; x += 1) {
          pushIfMatte(x, 0);
          pushIfMatte(x, height - 1);
        }
        for (let y = 0; y < height; y += 1) {
          pushIfMatte(0, y);
          pushIfMatte(width - 1, y);
        }

        while (stack.length > 0) {
          const p = stack.pop() as number;
          const i = p * 4;
          data[i + 3] = 0;
          const x = p % width;
          const y = (p / width) | 0;
          pushIfMatte(x + 1, y);
          pushIfMatte(x - 1, y);
          pushIfMatte(x, y + 1);
          pushIfMatte(x, y - 1);
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('Failed to load hero banner'));
    image.src = src;
  });

interface AvatarSelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

const AvatarSelect: React.FC<AvatarSelectProps> = ({ selectedId, onSelect, onConfirm }) => {
  const selectedIndex = Math.max(0, AVATARS.findIndex((avatar) => avatar.id === selectedId));
  const selectedAvatar = AVATARS[selectedIndex] || AVATARS[0];
  const [bannerSrc, setBannerSrc] = useState(chooseBanner);

  useEffect(() => {
    if (!AVATARS.some((avatar) => avatar.id === selectedId)) {
      onSelect(AVATARS[0].id);
    }
  }, [onSelect, selectedId]);

  useEffect(() => {
    let active = true;
    removeBannerMatte(chooseBanner)
      .then((cleaned) => {
        if (active) setBannerSrc(cleaned);
      })
      .catch(() => {
        if (active) setBannerSrc(chooseBanner);
      });
    return () => {
      active = false;
    };
  }, []);

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
    <div className="avatar-select-screen relative h-[100dvh] w-full overflow-hidden">
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
                src={bannerSrc}
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
              whileTap={{ scale: 0.97 }}
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
              whileTap={{ scale: 0.97 }}
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


