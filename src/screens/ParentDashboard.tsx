import React, { useMemo } from 'react';
import { PlayerData } from '../types';
import AssetIcon from '../components/AssetIcon';
import { buildParentReport } from '../systems/progression/reporting';
import { FramedPanel } from '../layout/ScreenPrimitives';

interface ParentDashboardProps {
  player: PlayerData;
  onBack: () => void;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ player, onBack }) => {
  const report = useMemo(() => buildParentReport(player), [player]);

  const gamesPlayed = player.telemetry?.sessionsPlayed ?? player.stats?.totalGamesPlayed ?? 0;
  const totalAttempts = (player.telemetry?.correctAnswers ?? 0) + (player.telemetry?.incorrectAnswers ?? 0);
  const accuracy = totalAttempts > 0 ? Math.round(((player.telemetry?.correctAnswers ?? 0) / totalAttempts) * 100) : 0;
  const playTimeMinutes = player.telemetry ? Math.round(player.telemetry.totalPlayTimeSec / 60) : 0;
  const totalStars = player.stats?.totalStars ?? 0;

  const stats = [
    { label: 'Sessions', value: gamesPlayed, icon: 'gamepad' as const },
    { label: 'Accuracy', value: `${accuracy}%`, icon: 'trophy' as const },
    { label: 'Play time', value: `${playTimeMinutes}m`, icon: 'stopwatch' as const },
    { label: 'Stars earned', value: totalStars, icon: 'star' as const },
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
            <div className="text-aaa-micro text-white/55">Family view</div>
            <h1 className="truncate text-lg font-black tracking-tight text-white md:text-3xl">Parent Report</h1>
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
              <div className="text-aaa-micro text-white/55">
                {item.label}
              </div>
            </FramedPanel>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-2.5 md:grid-cols-2 md:gap-4">
          <FramedPanel className="rounded-[1.2rem] border border-cyan-100/20 bg-slate-950/60 p-3 text-white md:rounded-[2rem] md:p-5">
            <div className="text-aaa-sm text-white/60 text-opacity-80">Needs More Practice</div>
            <div className="mt-2 grid gap-2 text-sm font-semibold text-white md:text-base">
              {report.needsPractice.length ? report.needsPractice.map(item => (
                <div key={item} className="rounded-[0.9rem] border border-rose-300/40 bg-rose-300/10 px-3 py-2">
                  {item}
                </div>
              )) : (
                <div className="text-white/60">No weak areas detected yet.</div>
              )}
            </div>
          </FramedPanel>

          <FramedPanel className="rounded-[1.2rem] border border-cyan-100/20 bg-slate-950/60 p-3 text-white md:rounded-[2rem] md:p-5">
            <div className="text-aaa-sm text-white/60 text-opacity-80">Most Played Games</div>
            <div className="mt-2 grid gap-2 text-sm font-semibold text-white md:text-base">
              {report.mostPlayed.length ? report.mostPlayed.map(item => (
                <div key={item} className="rounded-[0.9rem] border border-cyan-200/30 bg-white/5 px-3 py-2">
                  {item}
                </div>
              )) : (
                <div className="text-white/60">No play data yet.</div>
              )}
            </div>
          </FramedPanel>

          <FramedPanel className="rounded-[1.2rem] border border-cyan-100/20 bg-slate-950/60 p-3 text-white md:rounded-[2rem] md:p-5">
            <div className="text-aaa-sm text-white/60 text-opacity-80">Further Learning Areas</div>
            <div className="mt-2 grid gap-2 text-sm font-semibold text-white md:text-base">
              {report.nextFocus.length ? report.nextFocus.map(item => (
                <div key={item} className="rounded-[0.9rem] border border-amber-200/35 bg-amber-200/10 px-3 py-2">
                  {item}
                </div>
              )) : (
                <div className="text-white/60">No recommendations yet.</div>
              )}
            </div>
          </FramedPanel>

          <FramedPanel className="rounded-[1.2rem] border border-cyan-100/20 bg-slate-950/60 p-3 text-white md:rounded-[2rem] md:p-5">
            <div className="text-aaa-sm text-white/60 text-opacity-80">Excelling In</div>
            <div className="mt-2 grid gap-2 text-sm font-semibold text-white md:text-base">
              {report.excelling.length ? report.excelling.map(item => (
                <div key={item} className="rounded-[0.9rem] border border-emerald-300/35 bg-emerald-300/10 px-3 py-2">
                  {item}
                </div>
              )) : (
                <div className="text-white/60">No mastered areas yet.</div>
              )}
            </div>
          </FramedPanel>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
