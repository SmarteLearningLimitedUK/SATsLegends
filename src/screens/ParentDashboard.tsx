import React, { useMemo } from 'react';
import AssetIcon from '../components/AssetIcon';
import { FramedPanel, ScrollScreenShell } from '../layout/ScreenPrimitives';
import { ACHIEVEMENT_CATALOG } from '../systems/progression/achievementCatalog';
import { buildParentReport } from '../systems/progression/reporting';
import { PlayerData, TopicStat } from '../types';

interface ParentDashboardProps {
  player: PlayerData;
  onBack: () => void;
}

type SummaryTileProps = {
  label: string;
  value: string | number;
  icon: 'gamepad' | 'trophy' | 'stopwatch' | 'star';
};

type GameCardProps = {
  title: string;
  toneClass: string;
  game: ReturnType<typeof buildParentReport>['favoriteGame'];
  fallback: string;
};

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return '0s';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
};

const SummaryTile: React.FC<SummaryTileProps> = ({ label, value, icon }) => (
  <div className="rounded-[1rem] border border-white/10 bg-white/6 px-3 py-3 md:px-4 md:py-4">
    <AssetIcon name={icon} className="h-4 w-4 text-white/70 md:h-5 md:w-5" />
    <div className="mt-2 text-xl font-black tracking-tight text-white md:text-3xl">
      {value}
    </div>
    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/55 md:text-xs">
      {label}
    </div>
  </div>
);

const GameCard: React.FC<GameCardProps> = ({ title, toneClass, game, fallback }) => (
  <FramedPanel className="rounded-[1.35rem] border border-white/12 bg-slate-950/62 p-4 text-white md:rounded-[2rem] md:p-5">
    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">{title}</div>
    <div className={`mt-3 rounded-[1rem] border px-4 py-4 ${toneClass}`}>
      {game ? (
        <>
          <div className="text-lg font-black tracking-tight md:text-2xl">{game.label}</div>
          <div className="mt-2 text-sm font-semibold leading-relaxed text-white/78 md:text-base">
            {game.sessions} sessions | {game.accuracy}% accuracy | Avg {formatDuration(game.avgTimeSec)}
          </div>
        </>
      ) : (
        <div className="text-sm text-white/62">{fallback}</div>
      )}
    </div>
  </FramedPanel>
);

const ListCard: React.FC<{
  title: string;
  eyebrowTone: string;
  description: string;
  items: string[];
  emptyText: string;
}> = ({ title, eyebrowTone, description, items, emptyText }) => (
  <FramedPanel className="rounded-[1.35rem] border border-white/12 bg-slate-950/62 p-4 text-white md:rounded-[2rem] md:p-5">
    <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${eyebrowTone}`}>{title}</div>
    <div className="mt-3 text-sm leading-relaxed text-white/68">{description}</div>
    <div className="mt-3 grid gap-2">
      {items.length ? items.map((item) => (
        <div key={item} className="rounded-[0.9rem] border border-white/10 bg-white/5 px-4 py-3 text-base font-bold text-white">
          {item}
        </div>
      )) : (
        <div className="rounded-[0.9rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
          {emptyText}
        </div>
      )}
    </div>
  </FramedPanel>
);

const ParentDashboard: React.FC<ParentDashboardProps> = ({ player, onBack }) => {
  const report = useMemo(() => buildParentReport(player), [player]);

  const gamesPlayed = player.telemetry?.sessionsPlayed ?? player.stats?.totalGamesPlayed ?? 0;
  const totalStars = player.stats?.totalStars ?? 0;
  const telemetry = player.telemetry;
  const earnedAchievementIds = new Set(player.achievementState?.earned ?? player.achievements ?? []);
  const earnedAchievementNames = ACHIEVEMENT_CATALOG
    .filter((achievement) => earnedAchievementIds.has(achievement.id))
    .slice(0, 8)
    .map((achievement) => achievement.name);
  const recentTopics = telemetry
    ? (Object.values(telemetry.topicStats) as TopicStat[])
      .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
      .slice(0, 6)
    : [];
  const bestSubject = report.excelling[0] ?? 'No strong topic data yet';
  const focusSubject = report.needsPractice[0] ?? 'No weak topic data yet';

  return (
    <ScrollScreenShell className="relative min-h-[100dvh] w-full licensed-shell-bg">
      <div className="absolute inset-0 bg-slate-950/48" />

      <div className="relative z-10 flex flex-col gap-4 px-4 pb-24 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-8 md:pb-12 md:pt-6">
        <FramedPanel className="rounded-[1.4rem] border border-white/12 bg-slate-950/62 p-4 text-white md:rounded-[2rem] md:p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/70">Parent snapshot</div>
          <div className="mt-2 text-2xl font-black tracking-tight md:text-4xl">One page, four answers.</div>
          <div className="mt-1 max-w-3xl text-sm leading-relaxed text-white/72 md:text-base">
            Quickly see where your child is excelling, where they need more practice, and which games they are
            logging the most and least time on.
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            <SummaryTile label="Sessions" value={gamesPlayed} icon="gamepad" />
            <SummaryTile label="Accuracy" value={`${report.overallAccuracy}%`} icon="trophy" />
            <SummaryTile label="Speed" value={formatDuration(report.averageSessionTimeSec)} icon="stopwatch" />
            <SummaryTile label="Brainpower" value={totalStars} icon="star" />
          </div>
        </FramedPanel>

        <div className="grid gap-4 md:grid-cols-2">
          <FramedPanel className="rounded-[1.35rem] border border-white/12 bg-slate-950/62 p-4 text-white md:rounded-[2rem] md:p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70">Performance ledger</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <SummaryTile label="Correct" value={telemetry?.correctAnswers ?? 0} icon="star" />
              <SummaryTile label="Incorrect" value={telemetry?.incorrectAnswers ?? 0} icon="gamepad" />
              <SummaryTile label="Best streak" value={telemetry?.bestCorrectStreak ?? 0} icon="trophy" />
              <SummaryTile label="Play time" value={formatDuration(telemetry?.totalPlayTimeSec ?? 0)} icon="stopwatch" />
            </div>
          </FramedPanel>

          <FramedPanel className="rounded-[1.35rem] border border-white/12 bg-slate-950/62 p-4 text-white md:rounded-[2rem] md:p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70">Current focus</div>
            <div className="mt-3 grid gap-3">
              <div className="rounded-[1rem] border border-emerald-200/24 bg-emerald-200/10 px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/78">Strongest topic</div>
                <div className="mt-1 text-lg font-black text-white md:text-2xl">{bestSubject}</div>
              </div>
              <div className="rounded-[1rem] border border-rose-200/24 bg-rose-200/10 px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-100/78">Needs attention</div>
                <div className="mt-1 text-lg font-black text-white md:text-2xl">{focusSubject}</div>
              </div>
            </div>
          </FramedPanel>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <GameCard
            title="Favourite game"
            toneClass="border-emerald-300/35 bg-emerald-300/10"
            game={report.favoriteGame}
            fallback="No play data yet."
          />
          <GameCard
            title="Least played game"
            toneClass="border-rose-300/35 bg-rose-300/10"
            game={report.leastPlayedGame}
            fallback="No play data yet."
          />
        </div>

        <FramedPanel className="rounded-[1.35rem] border border-white/12 bg-slate-950/62 p-4 text-white md:rounded-[2rem] md:p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Detailed stats</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/75">Total games</div>
              <div className="mt-1 text-2xl font-black text-white">{player.stats?.totalGamesPlayed ?? 0}</div>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/75">Stars earned</div>
              <div className="mt-1 text-2xl font-black text-white">{totalStars}</div>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/75">Achievements</div>
              <div className="mt-1 text-2xl font-black text-white">{earnedAchievementNames.length}</div>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/75">Top games</div>
              <div className="mt-2 space-y-2">
                {report.mostPlayed.length ? report.mostPlayed.map((game) => (
                  <div key={game} className="rounded-[0.8rem] border border-white/10 bg-slate-900/50 px-3 py-2 text-sm font-semibold text-white">
                    {game}
                  </div>
                )) : (
                  <div className="rounded-[0.8rem] border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-white/60">
                    No game data yet.
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/75">Recent topics</div>
              <div className="mt-2 space-y-2">
                {recentTopics.length ? recentTopics.map((topic) => (
                  <div key={topic.topicId} className="rounded-[0.8rem] border border-white/10 bg-slate-900/50 px-3 py-2 text-sm font-semibold text-white">
                    {topic.topicId.replace(/_/g, ' ')} - {topic.accuracy}% accuracy
                  </div>
                )) : (
                  <div className="rounded-[0.8rem] border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-white/60">
                    No topic history yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </FramedPanel>

        <FramedPanel className="rounded-[1.35rem] border border-white/12 bg-slate-950/62 p-4 text-white md:rounded-[2rem] md:p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Achievements</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {earnedAchievementNames.length ? earnedAchievementNames.map((name) => (
              <div key={name} className="rounded-[0.9rem] border border-amber-200/20 bg-amber-200/8 px-4 py-3 text-sm font-black text-white">
                {name}
              </div>
            )) : (
              <div className="rounded-[0.9rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                No achievements earned yet.
              </div>
            )}
          </div>
        </FramedPanel>

        <FramedPanel className="rounded-[1.35rem] border border-white/12 bg-slate-950/62 p-4 text-white md:rounded-[2rem] md:p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Speed</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1rem] border border-cyan-200/30 bg-white/5 px-4 py-3">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/75">Fastest game</div>
              {report.fastestGame ? (
                <>
                  <div className="mt-1 text-lg font-black md:text-2xl">{report.fastestGame.label}</div>
                  <div className="mt-1 text-sm text-white/72">Average session: {formatDuration(report.fastestGame.avgTimeSec)}</div>
                </>
              ) : (
                <div className="mt-1 text-sm text-white/60">No speed data yet.</div>
              )}
            </div>
            <div className="rounded-[1rem] border border-amber-200/30 bg-amber-200/10 px-4 py-3">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-100/80">Slowest game</div>
              {report.slowestGame ? (
                <>
                  <div className="mt-1 text-lg font-black md:text-2xl">{report.slowestGame.label}</div>
                  <div className="mt-1 text-sm text-white/72">Average session: {formatDuration(report.slowestGame.avgTimeSec)}</div>
                </>
              ) : (
                <div className="mt-1 text-sm text-white/60">No speed data yet.</div>
              )}
            </div>
          </div>
        </FramedPanel>

        <div className="grid gap-4 md:grid-cols-2">
          <ListCard
            title="Excelling in"
            eyebrowTone="text-emerald-100/80"
            description="These are the areas where your child is currently performing strongest."
            items={report.excelling}
            emptyText="No mastered areas detected yet."
          />
          <ListCard
            title="Needs more practice"
            eyebrowTone="text-rose-100/80"
            description="These topics are worth revisiting with a little extra support."
            items={report.needsPractice}
            emptyText="No weak areas detected yet."
          />
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
    </ScrollScreenShell>
  );
};

export default ParentDashboard;
