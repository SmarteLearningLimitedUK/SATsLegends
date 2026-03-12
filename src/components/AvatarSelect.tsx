import React from 'react';
import { motion } from 'motion/react';
import { Check, Sparkles } from './GameIcons';
import { AVATARS } from '../constants';

interface AvatarSelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

const AvatarSelect: React.FC<AvatarSelectProps> = ({ selectedId, onSelect, onConfirm }) => {
  const selectedAvatar = AVATARS.find(avatar => avatar.id === selectedId) || AVATARS[0];

  return (
    <div className="relative my-auto flex h-full max-h-[850px] w-full max-w-6xl flex-col items-center gap-4 px-4 py-8 md:gap-8 md:px-8">
      <div className="glass-panel absolute inset-x-4 top-1/2 -z-10 h-full max-h-[96%] -translate-y-1/2 rounded-[2.5rem] md:inset-x-8" />
      <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="relative z-10 text-center flex flex-col shrink-0">
        <div className="mb-2 hidden md:flex justify-center gap-2">
          {['Pick a companion', 'Animated map', 'Portrait UI'].map(label => (
            <span key={label} className="game-chip">{label}</span>
          ))}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.18)] sm:text-4xl md:text-6xl">
          Choose Your Hero
        </h1>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/65 md:text-sm">
          Select your companion
        </p>
      </div>

      <div className="glass-panel relative z-10 flex w-full max-w-2xl items-center gap-3 overflow-hidden rounded-[1.5rem] px-4 py-3 shrink-0 md:px-6 md:py-5">
        <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 ${selectedAvatar.color} text-4xl shadow-xl md:h-24 md:w-24 md:text-5xl`}>
          <div className="shine" />
          {selectedAvatar.image}
        </div>
        <div className="min-w-0 flex-1 text-left text-white">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-xl font-black tracking-tight md:text-3xl">{selectedAvatar.name}</h2>
            <span className="rounded-full border border-yellow-300/40 bg-yellow-300/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-yellow-100">
              {selectedAvatar.rarity}
            </span>
          </div>
          <p className="mt-0.5 max-w-lg text-[11px] font-bold leading-tight text-white/70 sm:text-sm md:text-base">
            Ready to carry your progress across every island.
          </p>
          <div className="mt-1.5 hidden sm:flex items-center gap-1.5 text-cyan-100">
            <Sparkles className="h-3 w-3" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Selected hero ready</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid w-full grid-cols-3 gap-2 overflow-y-auto rounded-[1.75rem] border border-white/10 bg-black/10 p-2 backdrop-blur-xl sm:grid-cols-4 md:grid-cols-5 md:gap-4 md:p-4 min-h-0 flex-1 hide-scrollbar">
        {AVATARS.map((avatar) => {
          const isSelected = selectedId === avatar.id;
          return (
            <motion.button
              key={avatar.id}
              whileHover={{ scale: 1.04, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(avatar.id)}
              className={`relative overflow-hidden rounded-[2rem] border p-4 text-center transition-all md:p-5 ${isSelected
                  ? 'border-yellow-300 bg-white/22 shadow-[0_20px_40px_rgba(0,0,0,0.22)]'
                  : 'border-white/10 bg-white/8 hover:bg-white/14'
                }`}
            >
              <div className="shine" />
              <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[1.4rem] border border-white/15 ${avatar.color} text-4xl shadow-lg md:h-24 md:w-24 md:text-5xl`}>
                {avatar.image}
              </div>
              <div className="mt-4 text-sm font-black tracking-tight text-white md:text-base">{avatar.name}</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.24em] text-white/50 md:text-[10px]">
                {avatar.rarity}
              </div>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-3 top-3 rounded-xl border-2 border-white bg-gradient-to-b from-yellow-300 to-yellow-500 p-1.5 text-white shadow-xl"
                >
                  <Check className="h-4 w-4 stroke-[4px]" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="shrink-0 pt-2 w-full max-w-sm">
        <motion.button
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.97 }}
          onClick={onConfirm}
          className="game-button-primary relative z-10 w-full rounded-[1.5rem] px-8 py-4 text-xl md:px-20 md:py-6 md:text-3xl"
        >
          Let&apos;s Go
        </motion.button>
      </div>
    </div>
  );
};

export default AvatarSelect;
