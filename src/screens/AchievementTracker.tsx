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

  const earnedCount = player.achievementState?.earned?.length ?? 0;
  const totalCount = ACHIEVEMENT_CATALOG.length;

  return (
    <div className="premium-page-root relative flex h-full w-full flex-col overflow-hidden licensed-shell-bg">
      <div className="absolute inset-0 bg-slate-950/45" />

      <header className="relative z-10 flex items-center justify-between px-4 pb-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-8 md:pb-4 md:pt-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="ui-icon-button flex h-11 w-11 items-center justify-center p-0 text-white md:h-12 md:w-12"
          >
            <AssetIcon name="back" className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <div className="min-w-0">
            <div className="text-aaa-micro text-white/55">Progress</div>
            <div className="truncate text-lg font-black tracking-tight text-white md:text-3xl">Achievements</div>
          </div>
        </div>
        <div className="shrink-0 rounded-full border border-cyan-100/18 bg-cyan-100/10 px-3 py-2 text-sm font-black text-cyan-100">
          {earnedCount}/{totalCount}
        </div>
      </header>

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-24 md:gap-4 md:px-8 md:pb-8"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex flex-col gap-3">
          {achievements.map((achievement) => (
            <FramedPanel
              key={achievement.id}
              className={`rounded-[1rem] border border-cyan-100/20 bg-slate-950/60 px-3 py-2.5 text-white md:rounded-[1.4rem] md:px-4 md:py-3 ${achievement.earned ? 'shadow-[0_12px_22px_rgba(16,185,129,0.15)]' : 'opacity-85'}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 md:h-12 md:w-12">
                  <AssetIcon name={(achievement.iconKey as any) || 'trophy'} className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-base font-black md:text-lg">{achievement.name}</div>
                  <div className="text-[11px] font-semibold text-white/60 md:text-[12px]">
                    {achievement.description}
                  </div>
                  <div className="mt-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${achievement.earned ? 'bg-emerald-300' : 'bg-cyan-300'}`}
                        style={{
                          width: `${Math.min(100, Math.max(0, (achievement.progress / achievement.target) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1 text-aaa-micro text-white/50">
                      {achievement.earned ? 'Earned' : `${achievement.progress} / ${achievement.target}`}
                    </div>
                  </div>
                </div>
                {achievement.earned ? (
                  <div className="shrink-0 rounded-full border border-emerald-200/40 bg-emerald-200/15 px-3 py-1 text-aaa-micro text-emerald-100">
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
