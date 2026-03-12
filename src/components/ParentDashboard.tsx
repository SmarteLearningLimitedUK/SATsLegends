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

  return (
    <div className="relative w-full h-full flex flex-col licensed-shell-bg overflow-y-auto font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-full transition-colors text-amber-50/95 bg-black/20 border border-amber-100/15"
          >
            <AssetIcon name="back" className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Parent Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-xl">
            👨‍👩‍👧
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-bold text-slate-800">Viewing Progress For</div>
            <div className="text-xs font-medium text-slate-500">{player.playerName}</div>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-6xl mx-auto w-full flex flex-col gap-8 pb-32">
        {/* Top Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center mb-3">
              <AssetIcon name="star" className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black text-slate-800">{player.stats?.totalStars || 0}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total Stars</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-3">
              <AssetIcon name="gamepad" className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black text-slate-800">{player.stats?.totalGamesPlayed || 0}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Games Played</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-3">
              <AssetIcon name="check" className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black text-slate-800">{completionPercentage}%</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Completion</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mb-3">
              <AssetIcon name="heart" className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black text-slate-800">{player.dailyStreak}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Day Streak</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Curriculum Progress */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <AssetIcon name="medal" className="w-6 h-6" />
                Curriculum Progress
              </h2>
              
              <div className="flex flex-col gap-6">
                {ISLANDS.map(island => {
                  const completedInIsland = player.completedLevels[island.id]?.length || 0;
                  const totalInIsland = island.levels.length;
                  const progress = (completedInIsland / totalInIsland) * 100;
                  
                  return (
                    <div key={island.id} className="flex flex-col gap-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-sm font-bold text-slate-800">{island.name}</div>
                          <div className="text-xs font-medium text-slate-500">{island.category}</div>
                        </div>
                        <div className="text-sm font-black text-indigo-600">{completedInIsland} / {totalInIsland}</div>
                      </div>
                      <div className="w-full h-3 bg-amber-100/60 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className={`h-full ${island.color.replace('bg-[', '').replace(']', '')}`}
                          style={{ backgroundColor: island.color.includes('#') ? island.color.match(/#([0-9a-fA-F]{6})/)?.[0] : undefined }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Badges & Achievements */}
          <div className="flex flex-col gap-6">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm h-full">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <AssetIcon name="trophy" className="w-6 h-6" />
                Earned Badges
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                {ACHIEVEMENTS.map(ach => {
                  const isUnlocked = (player.achievements || []).includes(ach.id);
                  return (
                    <div 
                      key={ach.id} 
                      className={`
                        p-4 rounded-2xl flex flex-col items-center text-center border-2 transition-all
                        ${isUnlocked ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-100 grayscale opacity-50'}
                      `}
                    >
                      <div className="text-4xl mb-2 filter drop-shadow-sm">{ach.icon}</div>
                      <div className={`text-xs font-black ${isUnlocked ? 'text-yellow-900' : 'text-slate-500'} leading-tight mb-1`}>
                        {ach.title}
                      </div>
                      <div className="text-[9px] font-medium text-slate-500 leading-tight">
                        {ach.description}
                      </div>
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
