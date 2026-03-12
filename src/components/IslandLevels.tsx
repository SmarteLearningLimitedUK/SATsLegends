import React from 'react';
import { motion } from 'motion/react';
import { IslandData, PlayerData, LevelData } from '../types';
import AssetIcon from './AssetIcon';

interface IslandLevelsProps {
  island: IslandData;
  player: PlayerData;
  onBack: () => void;
  onSelectLevel: (level: LevelData) => void;
}

const IslandLevels: React.FC<IslandLevelsProps> = ({ island, player, onBack, onSelectLevel }) => {
  const completedLevels = player.completedLevels[island.id] || [];
  const earnedStars = island.levels.reduce((sum, level) => {
    const key = `${island.id}-${level.id}`;
    return sum + (player.levelStars?.[key] || 0);
  }, 0);

  return (
    <div className={`relative w-full h-full flex flex-col items-center p-4 md:p-8 overflow-y-auto min-h-0 bg-gradient-to-b ${island.bgGradient || 'from-sky-400 to-sky-200'} font-sans`}>
      <div className="absolute inset-0 bg-black/15" />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {island.decorations?.map((dec, i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
            className="absolute text-6xl opacity-30 blur-[1px] drop-shadow-xl md:text-8xl"
            style={{ top: `${10 + i * 16}%`, left: `${5 + (i * 19) % 70}%` }}
          >
            {dec}
          </motion.div>
        ))}
      </div>

      <header className="relative z-10 mt-4 mb-8 flex w-full max-w-5xl flex-col gap-5 md:mb-12">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.08, x: -4 }}
              whileTap={{ scale: 0.94 }}
              onClick={onBack}
              className="rounded-[1.8rem] border border-white/20 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl transition-all hover:bg-white/20 md:p-5"
            >
              <AssetIcon name="back" className="h-8 w-8 md:h-10 md:w-10" />
            </motion.button>

            <div className="hidden md:block">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-white/60">Active hero</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xl font-black text-white">{player.playerName}</span>
                <span className="rounded-lg bg-yellow-400 px-2 py-0.5 text-[10px] font-black text-yellow-950">LVL {player.level}</span>
              </div>
              <div className="mt-2 h-2 w-36 overflow-hidden rounded-full border border-white/10 bg-black/40">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(player.xp % 1000) / 10}%` }} className="h-full bg-gradient-to-r from-blue-400 to-purple-500" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:gap-3">
            {[
              { icon: 'coin', value: player.coins },
              { icon: 'gem', value: player.gems },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-1.5 md:gap-2 rounded-xl md:rounded-2xl border border-white/20 bg-white/10 px-3 py-1.5 md:px-4 md:py-2 text-sm font-black text-white shadow-lg backdrop-blur-xl md:text-base">
                <AssetIcon name={stat.icon as any} className="h-4 w-4 md:h-5 md:w-5" />{stat.value}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/15 bg-black/25 p-5 text-white shadow-2xl backdrop-blur-2xl md:p-7">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-white/70">{island.category}</span>
            <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-yellow-100">{completedLevels.length} / {island.levels.length} stages cleared</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl md:text-6xl">{island.themeName || island.name}</h1>
          <p className="mt-2 text-sm md:text-base max-w-2xl text-white/75">Follow the path from stage one to the boss gate. Each stage unlocks the next, and your best star score is saved.</p>
          <div className="mt-4 md:mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/55">Path progress</div>
              <div className="mt-1 text-2xl font-black">{Math.round((completedLevels.length / island.levels.length) * 100)}%</div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/55">Stars banked</div>
              <div className="mt-1 text-2xl font-black">{earnedStars}</div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/55">Goal</div>
              <div className="mt-1 text-2xl font-black">Boss gate</div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 w-full max-w-4xl pb-36">
        <div className="absolute left-[2.2rem] top-10 bottom-10 hidden w-2 rounded-full bg-white/20 md:left-1/2 md:-translate-x-1/2 md:block" />

        <div className="flex flex-col gap-6 md:gap-8">
          {island.levels.map((level, index) => {
            const previousLevel = island.levels[index - 1];
            const isUnlocked = index === 0 || completedLevels.includes(previousLevel?.id);
            const stars = player.levelStars?.[`${island.id}-${level.id}`] || 0;
            const isCompleted = completedLevels.includes(level.id);
            const alignRight = index % 2 === 1;

            return (
              <div key={level.id} className={`relative flex ${alignRight ? 'md:justify-end' : 'md:justify-start'}`}>
                <motion.button
                  initial={{ x: alignRight ? 40 : -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.08, type: 'spring', stiffness: 110 }}
                  whileHover={isUnlocked ? { scale: 1.02, y: -2 } : {}}
                  whileTap={isUnlocked ? { scale: 0.98 } : {}}
                  onClick={() => isUnlocked && onSelectLevel(level)}
                  disabled={!isUnlocked}
                  className={`group relative w-full max-w-2xl overflow-hidden rounded-[2.3rem] border-b-[10px] p-5 text-left transition-all md:p-7 ${isUnlocked
                      ? 'border-white/40 bg-white/20 shadow-[0_20px_45px_rgba(0,0,0,0.22)] backdrop-blur-2xl hover:bg-white/28'
                      : 'cursor-not-allowed border-black/35 bg-black/20 opacity-70 backdrop-blur-md'
                    }`}
                >
                  {isUnlocked && <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}

                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-[1.5rem] border-b-[6px] text-2xl font-black shadow-xl md:h-20 md:w-20 md:text-4xl ${isUnlocked ? 'border-gray-300 bg-white text-slate-900' : 'border-gray-700 bg-gray-500 text-gray-700'}`}>
                        {level.isBoss ? <AssetIcon name="trophy" className="h-8 w-8 md:h-10 md:w-10" /> : level.id}
                      </div>

                      <div>
                        <h3 className={`text-xl sm:text-2xl font-black tracking-tight md:text-4xl ${isUnlocked ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]' : 'text-white/45'}`}>
                          {level.isBoss ? 'Boss Challenge' : `Stage ${level.id}`}
                        </h3>
                        <div className="mt-1 md:mt-2 flex gap-1.5 md:gap-3">
                          {[1, 2, 3].map(value => (
                            <AssetIcon key={value} name={value <= stars ? 'star' : 'starOutline'} className="h-5 w-5 md:h-7 md:w-7 opacity-95" />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm sm:block">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/55">Game mode</div>
                        <div className="mt-1 text-sm font-black uppercase text-white">{level.gameType?.replaceAll('_', ' ')}</div>
                      </div>

                      {isUnlocked ? (
                        <div className={`rounded-[1.5rem] border-2 p-4 shadow-xl transition-all md:p-5 ${isCompleted ? 'border-emerald-300 bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_8px_0_#166534]' : 'border-cyan-300 bg-gradient-to-b from-cyan-400 to-sky-600 shadow-[0_8px_0_#1d4ed8]'}`}>
                          {isCompleted ? <AssetIcon name="star" className="h-7 w-7 md:h-8 md:w-8" /> : <AssetIcon name="play" className="h-7 w-7 md:h-8 md:w-8" />}
                        </div>
                      ) : (
                        <div className="rounded-[1.5rem] border-2 border-white/10 bg-black/30 p-4 shadow-inner md:p-5">
                          <span className="text-3xl md:text-4xl">🔒</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {level.isBoss && isUnlocked && (
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="absolute -right-2 -top-2 rounded-full border-4 border-white bg-gradient-to-b from-rose-500 to-red-700 px-5 py-2 text-xs font-black text-white shadow-[0_10px_20px_rgba(220,38,38,0.45)] md:px-6 md:py-3 md:text-sm">
                      BOSS
                    </motion.div>
                  )}
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 h-24 ${island.groundColor || 'bg-green-500'} scale-x-[1.5] rounded-t-[100%] border-t-8 border-white/20 shadow-[inset_0_20px_40px_rgba(0,0,0,0.2)] pointer-events-none`} />
    </div>
  );
};

export default IslandLevels;
