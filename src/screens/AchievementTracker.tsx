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

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-24 pt-[calc(0.75rem+env(safe-area-inset-top))] md:gap-4 md:px-8 md:pb-8 md:pt-6">
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

        <div className="flex justify-center pb-2 pt-1">
          <button
            type="button"
            onClick={onBack}
            className="ui-button-primary rounded-[1.25rem] px-8 py-3 text-base md:rounded-2xl md:px-10 md:py-4 md:text-lg"
          >
            Back to map
          </button>
        </div>
      </div>
    </div>
  );
};

export default AchievementTracker;
