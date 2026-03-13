import React from 'react';
import { motion } from 'motion/react';
import { PlayerData } from '../types';
import { ACHIEVEMENTS, ISLANDS } from '../constants';
import AssetIcon from './AssetIcon';

interface ParentDashboardProps {
  player: PlayerData;
  onBack: () => void;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ player, onBack }) => {
  const totalLevelsAvailable = ISLANDS.reduce((acc, island) => acc + island.levels.length, 0);
  const totalLevelsCompleted = Object.values(player.completedLevels).flat().length;
  const completionPercentage = Math.round((totalLevelsCompleted / totalLevelsAvailable) * 100) || 0;
  const unlockedAchievements = (player.achievements || []).length;

  const stats = [
    { label: 'Stars', value: player.stats?.totalStars || 0, icon: 'star' as const },
    { label: 'Games', value: player.stats?.totalGamesPlayed || 0, icon: 'gamepad' as const },
    { label: 'Complete', value: `${completionPercentage}%`, icon: 'check' as const },
    { label: 'Streak', value: player.dailyStreak, icon: 'heart' as const },
  ];

  const progressCards = ISLANDS.slice(0, 4).map(island => {
    const completedInIsland = player.completedLevels[island.id]?.length || 0;
    return {
      name: island.themeName || island.name,
      short: island.category,
      value: `${completedInIsland}/${island.levels.length}`,
    };
  });

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden licensed-shell-bg">
      <div className="absolute inset-0 bg-slate-950/45" />

      <header className="relative z-10 flex shrink-0 items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-8 md:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-full border border-white/15 bg-black/25 p-2.5 text-white backdrop-blur-xl"
          >
            <AssetIcon name="back" className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">Family view</div>
            <h1 className="truncate text-lg font-black tracking-tight text-white md:text-3xl">Progress Snapshot</h1>
          </div>
        </div>
        <div className="hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white/85 backdrop-blur-xl md:block">
          {player.playerName || 'Explorer'}
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 px-4 pb-24 md:gap-5 md:px-8 md:pb-8">
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          {stats.map(item => (
            <div key={item.label} className="rounded-[1.2rem] border border-white/12 bg-black/25 p-3 text-center text-white shadow-xl backdrop-blur-xl md:rounded-[1.75rem] md:p-5">
              <AssetIcon name={item.icon} className="mx-auto h-4 w-4 md:h-6 md:w-6" />
              <div className="mt-1 text-lg font-black md:mt-2 md:text-3xl">{item.value}</div>
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/55 md:text-[10px]">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[1.25fr_0.95fr] md:gap-5">
          <div className="rounded-[1.6rem] border border-white/12 bg-black/25 p-4 text-white shadow-xl backdrop-blur-xl md:rounded-[2rem] md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/60">Curriculum</div>
                <h2 className="text-lg font-black md:text-2xl">Island Progress</h2>
              </div>
              <div className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
                {totalLevelsCompleted}/{totalLevelsAvailable} cleared
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:mt-5 md:gap-3">
              {progressCards.map(card => (
                <div key={card.name} className="rounded-[1.2rem] border border-white/10 bg-white/8 p-3 md:rounded-[1.5rem] md:p-4">
                  <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/45 md:text-[10px]">{card.short}</div>
                  <div className="mt-1 text-sm font-black leading-tight text-white md:text-lg">{card.name}</div>
                  <div className="mt-2 text-lg font-black text-yellow-300 md:text-2xl">{card.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/8 p-3 md:mt-5 md:rounded-[1.5rem] md:p-4">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-white/50 md:text-[10px]">
                <span>Overall completion</span>
                <span>{completionPercentage}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full border border-white/10 bg-black/35 md:h-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-rows-[auto_1fr] md:gap-5">
            <div className="rounded-[1.6rem] border border-white/12 bg-black/25 p-4 text-white shadow-xl backdrop-blur-xl md:rounded-[2rem] md:p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/60">Badges</div>
              <div className="mt-1 text-3xl font-black md:text-5xl">{unlockedAchievements}</div>
              <div className="text-sm font-bold text-white/70">of {ACHIEVEMENTS.length} unlocked</div>
            </div>

            <div className="rounded-[1.6rem] border border-white/12 bg-black/25 p-4 text-white shadow-xl backdrop-blur-xl md:rounded-[2rem] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/60">Recent wins</div>
                  <h2 className="text-lg font-black md:text-2xl">Achievement Board</h2>
                </div>
                <AssetIcon name="trophy" className="h-5 w-5 md:h-6 md:w-6" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 md:gap-3">
                {ACHIEVEMENTS.slice(0, 4).map(achievement => {
                  const isUnlocked = (player.achievements || []).includes(achievement.id);
                  return (
                    <div
                      key={achievement.id}
                      className={`rounded-[1.2rem] border p-3 text-center md:rounded-[1.5rem] ${isUnlocked ? 'border-yellow-300/35 bg-yellow-300/12' : 'border-white/10 bg-white/8 opacity-70'}`}
                    >
                      <div className="text-2xl md:text-3xl">{achievement.icon}</div>
                      <div className="mt-1 text-[10px] font-black leading-tight text-white md:text-xs">{achievement.title}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
