import React, { useMemo } from 'react';
import { PlayerData } from '../types';
import AssetIcon from '../components/AssetIcon';
import { FramedPanel } from '../layout/ScreenPrimitives';
import { ACHIEVEMENT_CATALOG, computeAchievementProgress } from '../systems/progression/achievementCatalog';

interface AchievementTrackerProps {
  player: PlayerData;
  onBack: () => void;
}

const AchievementTracker: React.FC<AchievementTrackerProps> = ({ player, onBack }) => {
  const achievements = useMemo(() => (
    ACHIEVEMENT_CATALOG.map((achievement) => {
      const progress = computeAchievementProgress(player, achievement);
      const earned = (player.achievementState?.earned ?? []).includes(achievement.id);
      return { ...achievement, progress, earned };
    })
  ), [player]);

  return (
    <div className="premium-page-root relative flex h-full w-full flex-col overflow-hidden licensed-shell-bg">
      <div className="absolute inset-0 bg-slate-950/45" />

      <header className="relative z-10 flex items-center justify-between px-4 pb-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-8 md:pb-4 md:pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="licensed-slice-orange-pill flex h-11 w-11 items-center justify-center rounded-full p-0 text-white md:h-12 md:w-12"
          >
            <AssetIcon name="back" className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <div>
            <div className="text-aaa-micro text-white/55">Badges</div>
            <div className="text-lg font-black tracking-tight text-white md:text-3xl">Achievements</div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-24 md:gap-4 md:px-8 md:pb-8">
        <div className="grid gap-3 md:grid-cols-2">
          {achievements.map((achievement) => (
            <FramedPanel
              key={achievement.id}
              className={`rounded-[1.2rem] border border-cyan-100/20 bg-slate-950/60 p-3 text-white md:rounded-[2rem] md:p-5 ${achievement.earned ? 'shadow-[0_12px_22px_rgba(16,185,129,0.15)]' : 'opacity-85'}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <AssetIcon name={(achievement.iconKey as any) || 'trophy'} className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-base font-black md:text-lg">{achievement.name}</div>
                  <div className="text-[11px] font-semibold text-white/60">{achievement.description}</div>
                  <div className="mt-2 text-aaa-micro text-white/50">
                    {achievement.earned ? 'Earned' : `${achievement.progress} / ${achievement.target}`}
                  </div>
                </div>
                {achievement.earned ? (
                  <div className="rounded-full border border-emerald-200/40 bg-emerald-200/15 px-3 py-1 text-aaa-micro text-emerald-100">
                    Earned
                  </div>
                ) : null}
              </div>
            </FramedPanel>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementTracker;
