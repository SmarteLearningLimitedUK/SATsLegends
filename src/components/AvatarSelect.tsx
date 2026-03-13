import React from 'react';
import { motion } from 'motion/react';
import { Check, Sparkles } from './GameIcons';
import { AVATARS } from '../constants';
import AnimatedAvatar from './AnimatedAvatar';

interface AvatarSelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

const AvatarSelect: React.FC<AvatarSelectProps> = ({ selectedId, onSelect, onConfirm }) => {
  const selectedAvatar = AVATARS.find(avatar => avatar.id === selectedId) || AVATARS[0];

  return (
    <div className="relative my-auto flex h-full max-h-full w-full max-w-5xl flex-col gap-2 overflow-hidden px-3 py-3 md:gap-4 md:px-8 md:py-6">
      <div className="glass-panel absolute inset-x-3 top-0 bottom-0 -z-10 rounded-[2rem] md:inset-x-8 md:rounded-[2.5rem]" />
      <div className="absolute left-6 top-6 h-24 w-24 rounded-full bg-cyan-300/10 blur-3xl md:h-32 md:w-32" />
      <div className="absolute bottom-6 right-6 h-28 w-28 rounded-full bg-fuchsia-400/10 blur-3xl md:h-40 md:w-40" />

      <div className="relative z-10 flex shrink-0 flex-col items-center text-center">
        <div className="mb-1 hidden md:flex justify-center gap-2">
          {['Pick a companion', 'Animated map', 'Portrait UI'].map(label => (
            <span key={label} className="game-chip">{label}</span>
          ))}
        </div>
        <h1 className="text-xl font-black tracking-tight text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.18)] sm:text-3xl md:text-6xl">
          Choose Your Character
        </h1>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/65 md:text-sm">
          Select your avatar
        </p>
      </div>

      <div className="glass-panel relative z-10 flex w-full shrink-0 items-center gap-2 overflow-hidden rounded-[1.1rem] px-3 py-2 md:max-w-2xl md:self-center md:rounded-[1.5rem] md:gap-3 md:px-6 md:py-4">
        <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 ${selectedAvatar.color} shadow-xl md:h-24 md:w-24 md:rounded-2xl`}>
          <div className="shine" />
          <AnimatedAvatar
            avatar={selectedAvatar}
            pose="victory"
            className="relative z-10 h-full w-full"
            imageClassName="object-bottom scale-[1.14] translate-y-[6%]"
          />
        </div>
        <div className="min-w-0 flex-1 text-left text-white">
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <h2 className="truncate text-sm font-black tracking-tight md:text-2xl">{selectedAvatar.name}</h2>
            <span className="rounded-full border border-yellow-300/40 bg-yellow-300/15 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.2em] text-yellow-100 md:text-[9px]">
              {selectedAvatar.rarity}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-bold leading-tight text-white/70 md:text-sm">
            Ready to carry your progress across every island.
          </p>
          <div className="mt-1 hidden items-center gap-1.5 text-cyan-100 sm:flex">
            <Sparkles className="h-3 w-3" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Selected hero ready</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid flex-1 min-h-0 grid-cols-2 gap-2 content-start md:grid-cols-4 md:gap-4">
        {AVATARS.map((avatar) => {
          const isSelected = selectedId === avatar.id;
          return (
            <motion.button
              key={avatar.id}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(avatar.id)}
              className={`relative flex min-h-[10.75rem] flex-col justify-center overflow-hidden rounded-[1rem] border p-2 text-center transition-all md:min-h-[11.5rem] md:rounded-[2rem] md:p-5 ${isSelected
                ? 'border-yellow-300 bg-white/22 shadow-[0_10px_20px_rgba(0,0,0,0.22)] md:shadow-[0_20px_40px_rgba(0,0,0,0.22)]'
                : 'border-white/10 bg-white/8 hover:bg-white/14'
                }`}
            >
              <div className="shine" />
              <div className={`mx-auto flex h-24 w-full max-w-[7rem] items-center justify-center overflow-hidden rounded-[1.2rem] border border-white/15 ${avatar.color} shadow-lg md:h-28 md:max-w-[8rem] md:rounded-[1.4rem]`}>
                <AnimatedAvatar
                  avatar={avatar}
                  className="h-full w-full"
                  imageClassName="object-bottom scale-[1.08] translate-y-[4%]"
                />
              </div>
              <div className="mt-1 text-[9px] font-black leading-tight tracking-tight text-white md:mt-3 md:text-sm">{avatar.name}</div>
              <div className="mt-1 text-[8px] font-black uppercase tracking-[0.24em] text-white/50 md:text-[10px]">
                {avatar.rarity}
              </div>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-1 top-1 rounded-md border border-white bg-gradient-to-b from-yellow-300 to-yellow-500 p-0.5 text-white shadow-xl md:right-3 md:top-3 md:rounded-xl md:border-2 md:p-1.5"
                >
                  <Check className="h-2 w-2 md:h-4 md:w-4 stroke-[4px]" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="relative z-10 w-full shrink-0 pt-1 md:max-w-sm md:self-center">
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConfirm}
          className="game-button-primary relative z-10 w-full rounded-[1.1rem] px-8 py-3 text-base md:rounded-[1.5rem] md:px-20 md:py-5 md:text-3xl"
        >
          Let&apos;s Go
        </motion.button>
      </div>
    </div>
  );
};

export default AvatarSelect;
