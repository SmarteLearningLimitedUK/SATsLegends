import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import AssetIcon from '../components/AssetIcon';
import { ACHIEVEMENT_CATALOG } from '../systems/progression/achievementCatalog';
import { buildParentReport } from '../systems/progression/reporting';
import { ParentGameSummary, PlayerData, TopicStat } from '../types';
import './parent-dashboard.css';

interface ParentDashboardProps {
  player: PlayerData;
  onBack: () => void;
}

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return '0s';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m${remainder ? ` ${remainder}s` : ''}` : `${remainder}s`;
};
const formatAccuracy = (fraction: number) => `${Math.round(fraction * 100)}%`;

const SummaryStat: React.FC<{
  label: string;
  value: string | number;
  note: string;
  icon: 'gamepad' | 'trophy' | 'stopwatch' | 'star';
}> = ({ label, value, note, icon }) => (
  <div className="parent-summary-stat">
    <div className="parent-stat-label"><AssetIcon name={icon} className="h-4 w-4" />{label}</div>
    <strong>{value}</strong>
    <span>{note}</span>
  </div>
);

const TopicList: React.FC<{ title: string; items: string[]; emptyText: string; tone: string }> = ({ title, items, emptyText, tone }) => (
  <section className={`parent-topic-section ${tone}`}>
    <h3>{title}</h3>
    {items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{emptyText}</p>}
  </section>
);

const GameRow: React.FC<{ label: string; game: ParentGameSummary | null }> = ({ label, game }) => (
  <div className="parent-game-row">
    <span>{label}</span>
    <div>{game ? <><strong>{game.label}</strong><small>{game.sessions} sessions · {formatAccuracy(game.accuracy)} accuracy · {formatDuration(game.avgTimeSec)} per session</small></> : <p>No game history yet.</p>}</div>
  </div>
);

const ParentDashboard: React.FC<ParentDashboardProps> = ({ player, onBack }) => {
  const report = useMemo(() => buildParentReport(player), [player]);
  const telemetry = player.telemetry;
  const sessions = telemetry?.sessionsPlayed ?? player.stats?.totalGamesPlayed ?? 0;
  const totalAttempts = (telemetry?.correctAnswers ?? 0) + (telemetry?.incorrectAnswers ?? 0);
  const earnedIds = new Set(player.achievementState?.earned ?? player.achievements ?? []);
  const earnedAchievements = ACHIEVEMENT_CATALOG.filter((achievement) => earnedIds.has(achievement.id));
  const recentTopics = useMemo(() => telemetry
    ? (Object.values(telemetry.topicStats) as TopicStat[]).sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0)).slice(0, 6)
    : [], [telemetry]);

  return (
    <section className="parent-dashboard" data-parent-snapshot="true" data-scroll-region="parent-snapshot" aria-label="Parent Snapshot">
      <div className="parent-report-content">
        <header className="parent-report-header">
          <div>
            <span className="parent-eyebrow">Adventure report</span>
            <h1>Parent snapshot</h1>
            <p>{player.playerName || 'Your child'}’s progress, practice and play.</p>
          </div>
          <div className="parent-header-actions">
            <button type="button" onClick={onBack} className="parent-back ui-button-secondary"><ArrowLeft size={17} aria-hidden="true" />Back to map</button>
            <Link to="/" className="parent-back ui-button-secondary" aria-label="Return to SATs Legends website">Website</Link>
          </div>
        </header>

        <div className="parent-summary" aria-label="Progress at a glance">
          <SummaryStat label="Game sessions" value={sessions} note="Adventure so far" icon="gamepad" />
          <SummaryStat label="Answer accuracy" value={totalAttempts ? `${report.overallAccuracy}%` : '—'} note={totalAttempts ? `Across ${totalAttempts} answers` : 'No answers recorded yet'} icon="trophy" />
          <SummaryStat label="Time per session" value={sessions ? formatDuration(report.averageSessionTimeSec) : '—'} note="Average play time" icon="stopwatch" />
          <SummaryStat label="Stars earned" value={player.stats?.totalStars ?? 0} note="Mission rewards" icon="star" />
        </div>

        <section className="parent-focus" aria-labelledby="parent-focus-title">
          <div className="parent-section-heading"><h2 id="parent-focus-title">Where to go next</h2><p>A little practice and plenty of encouragement.</p></div>
          <div className="parent-topic-grid">
            <TopicList title="Highest accuracy" items={report.excelling} tone="is-strength" emptyText="Topic accuracy will appear after a few missions." />
            <TopicList title="Practice rotation" items={report.needsPractice} tone="is-practice" emptyText="Keep exploring. More answers will help choose topics to revisit." />
          </div>
          <p className="parent-starting-topics">These are relative rankings. A topic can appear in both lists while only a few topics have been played.</p>
          <p className="parent-support-note">Try asking, “What helped you work that one out?” Celebrate the approach as well as the answer.</p>
          {report.nextFocus.length > 0 && <p className="parent-starting-topics"><strong>Still getting started:</strong> {report.nextFocus.join(', ')}.</p>}
        </section>

        <section className="parent-play-patterns" aria-labelledby="parent-games-title">
          <div className="parent-section-heading"><h2 id="parent-games-title">What they’re playing</h2><p>Use their favourite game as a starting point for the next adventure.</p></div>
          <GameRow label="Favourite game" game={report.favoriteGame} />
          <GameRow label="Least played" game={report.leastPlayedGame} />
          {report.mostPlayed.length > 0 && <p className="parent-starting-topics"><strong>Most played:</strong> {report.mostPlayed.join(' · ')}</p>}
        </section>

        <details className="parent-details" open={totalAttempts === 0}>
          <summary><span>Answer history &amp; milestones</span><ChevronDown size={18} aria-hidden="true" /></summary>
          <div className="parent-details-content">
            <dl className="parent-ledger">
              <div><dt>Correct answers</dt><dd>{telemetry?.correctAnswers ?? 0}</dd></div>
              <div><dt>Answers to revisit</dt><dd>{telemetry?.incorrectAnswers ?? 0}</dd></div>
              <div><dt>Best correct streak</dt><dd>{telemetry?.bestCorrectStreak ?? 0}</dd></div>
              <div><dt>Total play time</dt><dd>{formatDuration(telemetry?.totalPlayTimeSec ?? 0)}</dd></div>
              <div><dt>Total games played</dt><dd>{player.stats?.totalGamesPlayed ?? 0}</dd></div>
              <div><dt>Achievements earned</dt><dd>{earnedAchievements.length}</dd></div>
            </dl>
            <div className="parent-history-grid">
              <section><h3>Recent topics</h3>{recentTopics.length ? <ul className="parent-history-list">{recentTopics.map((topic) => <li key={topic.topicId}><span>{topic.topicId.replace(/_/g, ' ')}</span><strong>{formatAccuracy(topic.accuracy)}</strong></li>)}</ul> : <p>Topic history appears after playing a mission.</p>}</section>
              <section><h3>Achievements</h3>{earnedAchievements.length ? <ul className="parent-achievement-list">{earnedAchievements.map((achievement) => <li key={achievement.id}><AssetIcon name="trophy" className="h-4 w-4" />{achievement.name}</li>)}</ul> : <p>Their first achievement is still ahead.</p>}</section>
            </div>
          </div>
        </details>

        <details className="parent-details">
          <summary><span>Session pace</span><ChevronDown size={18} aria-hidden="true" /></summary>
          <div className="parent-details-content">
            <p>Session times reflect different games and puzzle types. They’re useful context, rather than a target to rush.</p>
            <GameRow label="Shortest average" game={report.fastestGame} />
            <GameRow label="Longest average" game={report.slowestGame} />
          </div>
        </details>
        <p className="parent-report-footnote">Based on the play recorded on this device. Every mission is a chance to learn.</p>
      </div>
    </section>
  );
};

export default ParentDashboard;
