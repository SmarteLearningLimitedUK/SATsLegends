import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { PlayerData } from '../types';
import { ISLANDS } from '../constants';
import AssetIcon from './AssetIcon';
import {
  FramedPanel,
  PremiumProgressBar,
} from './layout/ScreenPrimitives';

interface ParentDashboardProps {
  player: PlayerData;
  onBack: () => void;
}

const ISLAND_REPORT_META: Record<number, { domain: string; revise: string }> = {
  1: {
    domain: 'Arithmetic',
    revise: 'Revisit place value, calculation methods, and number fluency.',
  },
  2: {
    domain: 'Fractions, Decimals & %',
    revise: 'Strengthen equivalence, mixed numbers, and percentages of amounts.',
  },
  3: {
    domain: 'Geometry & Position',
    revise: 'Practise angles, shape properties, coordinates, and transformations.',
  },
  4: {
    domain: 'Measure & Proportion',
    revise: 'Focus on conversion, ratio reasoning, and scaling problems.',
  },
  5: {
    domain: 'Data, Time & Interpretation',
    revise: 'Work on chart reading, averages, tables, and timetable interpretation.',
  },
  6: {
    domain: 'Algebra & Logic',
    revise: 'Build confidence with patterns, rules, equations, and SATs reasoning.',
  },
  7: {
    domain: 'Data & Statistics',
    revise: 'Practise reading tables, bar charts, line graphs, and data comparisons.',
  },
  8: {
    domain: 'Mixed Reasoning',
    revise: 'Focus on multi-step mixed-domain SATs reasoning and strategy.',
  },
};

const getPerformanceTone = (score: number) => {
  if (score >= 80) {
    return {
      chip: 'border-emerald-300/35 bg-emerald-300/15 text-emerald-100',
      bar: 'from-emerald-300 via-teal-300 to-cyan-400',
      glow: 'shadow-[0_10px_26px_rgba(16,185,129,0.18)]',
    };
  }

  if (score >= 55) {
    return {
      chip: 'border-amber-300/35 bg-amber-300/15 text-amber-50',
      bar: 'from-amber-200 via-orange-300 to-amber-400',
      glow: 'shadow-[0_10px_26px_rgba(251,191,36,0.18)]',
    };
  }

  return {
    chip: 'border-rose-300/35 bg-rose-300/15 text-rose-50',
    bar: 'from-rose-300 via-pink-300 to-orange-300',
    glow: 'shadow-[0_10px_26px_rgba(244,63,94,0.18)]',
  };
};

const ParentDashboard: React.FC<ParentDashboardProps> = ({ player, onBack }) => {
  const report = useMemo(() => {
    const islandReports = ISLANDS.map(island => {
      const completedCount = player.completedLevels[island.id]?.length || 0;
      const totalLevels = island.levels.length;
      const earnedStars = island.levels.reduce((sum, level) => {
        const key = `${island.id}-${level.id}`;
        return sum + (player.levelStars?.[key] || 0);
      }, 0);
      const maxStars = totalLevels * 3;
      const completion = totalLevels ? Math.round((completedCount / totalLevels) * 100) : 0;
      const mastery = maxStars ? Math.round((earnedStars / maxStars) * 100) : 0;
      const readiness = Math.round((completion * 0.45) + (mastery * 0.55));

      return {
        id: island.id,
        name: island.name,
        themeName: island.themeName,
        completedCount,
        totalLevels,
        earnedStars,
        maxStars,
        completion,
        mastery,
        readiness,
        ...ISLAND_REPORT_META[island.id],
      };
    });

    const totalLevelsAvailable = islandReports.reduce((sum, island) => sum + island.totalLevels, 0);
    const totalLevelsCompleted = islandReports.reduce((sum, island) => sum + island.completedCount, 0);
    const completionPercentage = totalLevelsAvailable
      ? Math.round((totalLevelsCompleted / totalLevelsAvailable) * 100)
      : 0;
    const totalStarsEarned = islandReports.reduce((sum, island) => sum + island.earnedStars, 0);
    const totalStarsAvailable = islandReports.reduce((sum, island) => sum + island.maxStars, 0);
    const masteryPercentage = totalStarsAvailable
      ? Math.round((totalStarsEarned / totalStarsAvailable) * 100)
      : 0;
    const readinessScore = Math.round(
      islandReports.reduce((sum, island) => sum + island.readiness, 0) / islandReports.length,
    ) || 0;

    const strongestAreas = [...islandReports]
      .sort((a, b) => b.readiness - a.readiness)
      .slice(0, 2);

    const opportunityAreas = [...islandReports]
      .sort((a, b) => a.readiness - b.readiness)
      .slice(0, 3);

    return {
      islandReports,
      totalLevelsAvailable,
      totalLevelsCompleted,
      completionPercentage,
      totalStarsEarned,
      totalStarsAvailable,
      masteryPercentage,
      readinessScore,
      strongestAreas,
      opportunityAreas,
      gamesPlayed: player.stats?.totalGamesPlayed || 0,
      dailyStreak: player.dailyStreak,
    };
  }, [player]);

  const readinessTone = getPerformanceTone(report.readinessScore);
  const headline =
    report.readinessScore >= 80
      ? 'Strong SATs trajectory'
      : report.readinessScore >= 60
        ? 'Good progress with revision gaps'
        : 'Revision support recommended';
  const coachingNote =
    report.opportunityAreas.length > 0
      ? `Prioritise ${report.opportunityAreas[0].domain.toLowerCase()} next, then reinforce ${report.opportunityAreas[1]?.domain.toLowerCase() || 'current weak areas'}.`
      : 'Keep revisiting completed areas to maintain fluency and confidence.';

  const stats = [
    { label: 'SATs readiness', value: `${report.readinessScore}%`, icon: 'trophy' as const },
    { label: 'Mastery score', value: `${report.masteryPercentage}%`, icon: 'star' as const },
    { label: 'Games played', value: report.gamesPlayed, icon: 'gamepad' as const },
    { label: 'Daily streak', value: report.dailyStreak, icon: 'heart' as const },
  ];

  return (
    <div className="premium-page-root relative flex h-full w-full flex-col overflow-hidden licensed-shell-bg">
      <div className="absolute inset-0 bg-slate-950/48" />

      <header className="premium-page-header relative z-10 shrink-0 items-center justify-between px-4 pb-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-8 md:pb-4 md:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onBack}
            className="licensed-slice-orange-pill flex h-11 w-11 items-center justify-center rounded-full p-0 text-white md:h-12 md:w-12"
          >
            <AssetIcon name="back" className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">Family view</div>
            <h1 className="truncate text-lg font-black tracking-tight text-white md:text-3xl">Parent Progress Report</h1>
          </div>
        </div>
        <div className="hidden licensed-slice-paper-panel rounded-full px-4 py-2 text-sm font-black text-amber-950 md:block">
          {player.playerName || 'Explorer'}
        </div>
      </header>

      <div className="premium-page-content premium-page-scroll relative z-10 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-24 md:gap-4 md:px-8 md:pb-8">
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          {stats.map(item => (
            <FramedPanel
              key={item.label}
              variant="dark"
              className="rounded-[1rem] p-2.5 text-center md:rounded-[1.75rem] md:p-4"
            >
              <AssetIcon name={item.icon} className="mx-auto h-3.5 w-3.5 md:h-5 md:w-5" />
              <div className="mt-1 text-base font-black md:mt-2 md:text-3xl">{item.value}</div>
              <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/55 md:text-[10px]">
                {item.label}
              </div>
            </FramedPanel>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-2.5 md:grid-cols-[1.18fr_0.92fr] md:gap-4">
          <FramedPanel variant="dark" className="flex min-h-0 flex-col rounded-[1.4rem] p-3 md:rounded-[2rem] md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/60">Curriculum coverage</div>
                <h2 className="text-base font-black md:text-2xl">Subject Heatmap</h2>
              </div>
              <div className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100 md:px-3 md:text-[10px] md:tracking-[0.22em]">
                {report.totalLevelsCompleted}/{report.totalLevelsAvailable} cleared
              </div>
            </div>

            <div className="mt-2 grid min-h-0 grid-cols-2 gap-2 md:mt-4 md:gap-3">
              {report.islandReports.map(area => {
                const tone = getPerformanceTone(area.readiness);

                return (
                  <div
                    key={area.id}
                    className={`licensed-game-card flex min-h-0 flex-col rounded-[1rem] p-2.5 md:rounded-[1.4rem] md:p-3 ${tone.glow}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[7px] font-black uppercase tracking-[0.18em] text-white/45 md:text-[9px]">
                          {area.themeName}
                        </div>
                        <div className="text-[11px] font-black leading-tight text-white md:text-base">
                          {area.name}
                        </div>
                      </div>
                      <div className={`rounded-full border px-2 py-0.5 text-[9px] font-black md:px-2.5 md:text-[10px] ${tone.chip}`}>
                        {area.readiness}%
                      </div>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.14em] text-white/50 md:text-[9px]">
                      <span>{area.completedCount}/{area.totalLevels} games</span>
                      <span>{area.earnedStars}/{area.maxStars} stars</span>
                    </div>

                    <div className="mt-1.5">
                      <PremiumProgressBar value={area.readiness} toneClass={`bg-gradient-to-r ${tone.bar}`} />
                    </div>

                    <div className="mt-1.5 h-[2rem] overflow-hidden text-[9px] leading-tight text-white/72 md:h-[2.35rem] md:text-[10px]">
                      {area.revise}
                    </div>
                  </div>
                );
              })}
            </div>
          </FramedPanel>

          <section className="grid min-h-0 gap-2.5 md:grid-rows-[auto_auto_1fr] md:gap-4">
            <FramedPanel variant="dark" className="rounded-[1.4rem] p-3 md:rounded-[2rem] md:p-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.3rem] border ${readinessTone.chip} md:h-24 md:w-24 md:rounded-[1.8rem]`}>
                  <span className="text-2xl font-black md:text-4xl">{report.readinessScore}%</span>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/60">Parent summary</div>
                  <h2 className="text-base font-black md:text-2xl">{headline}</h2>
                  <p className="mt-1 text-[10px] leading-tight text-white/72 md:text-sm">
                    {player.playerName || 'Your child'} has completed {report.completionPercentage}% of the current SATs route and secured {report.totalStarsEarned} of {report.totalStarsAvailable} available stars.
                  </p>
                </div>
              </div>
            </FramedPanel>

            <div className="grid grid-cols-2 gap-2.5 md:gap-4">
              <FramedPanel variant="dark" className="rounded-[1.4rem] p-3 md:rounded-[2rem] md:p-5">
                <div className="flex items-center gap-2">
                  <AssetIcon name="star" className="h-4 w-4 text-yellow-300 md:h-5 md:w-5" />
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/60">Strongest areas</div>
                </div>
                <div className="mt-2 space-y-2">
                  {report.strongestAreas.map(area => (
                    <div key={area.id} className="rounded-[0.9rem] border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-2 md:rounded-[1.2rem] md:px-3">
                      <div className="text-[10px] font-black leading-tight text-white md:text-sm">{area.name}</div>
                      <div className="text-[9px] text-emerald-50/78 md:text-[10px]">{area.readiness}% readiness</div>
                    </div>
                  ))}
                </div>
              </FramedPanel>

              <FramedPanel variant="dark" className="rounded-[1.4rem] p-3 md:rounded-[2rem] md:p-5">
                <div className="flex items-center gap-2">
                  <AssetIcon name="check" className="h-4 w-4 text-rose-200 md:h-5 md:w-5" />
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/60">Needs revision</div>
                </div>
                <div className="mt-2 space-y-2">
                  {report.opportunityAreas.slice(0, 2).map(area => (
                    <div key={area.id} className="rounded-[0.9rem] border border-rose-300/20 bg-rose-300/10 px-2.5 py-2 md:rounded-[1.2rem] md:px-3">
                      <div className="text-[10px] font-black leading-tight text-white md:text-sm">{area.name}</div>
                      <div className="text-[9px] text-rose-50/78 md:text-[10px]">{area.readiness}% readiness</div>
                    </div>
                  ))}
                </div>
              </FramedPanel>
            </div>

            <FramedPanel variant="dark" className="rounded-[1.4rem] p-3 md:rounded-[2rem] md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/60">Coaching note</div>
                  <h2 className="text-base font-black md:text-2xl">Recommended next steps</h2>
                </div>
                <AssetIcon name="gamepad" className="h-5 w-5 md:h-6 md:w-6" />
              </div>

              <div className="licensed-slice-paper-panel mt-2 rounded-[1rem] px-3 py-2.5 text-white drop-shadow-[0_1px_1px_rgba(15,23,42,0.5)] md:mt-3 md:rounded-[1.4rem] md:px-4 md:py-3.5">
                <p className="text-[10px] leading-snug text-white/92 md:text-sm">
                  {coachingNote}
                </p>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-2 md:mt-4 md:gap-3">
                {report.opportunityAreas.map(area => (
                  <div key={area.id} className="licensed-game-card rounded-[0.95rem] px-2.5 py-2 text-center text-white md:rounded-[1.2rem] md:px-3">
                    <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/45 md:text-[9px]">Focus area</div>
                    <div className="mt-1 text-[10px] font-black leading-tight text-white md:text-xs">{area.name}</div>
                  </div>
                ))}
              </div>
            </FramedPanel>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
