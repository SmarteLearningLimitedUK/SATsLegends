import { GAME_META } from '../../gameMeta';
import { getCanonicalGameLabel } from '../../gameNames';
import {
  GameStat,
  MiniGameType,
  ParentGameSummary,
  ParentReportSummary,
  PlayerData,
  TopicStat,
} from '../../types';

const TOPIC_LABELS: Record<string, string> = {
  fractions: 'Fractions',
  ratio: 'Ratio',
  measurement: 'Measurement',
  money: 'Money',
  time: 'Time',
  angles: 'Angles',
  geometry: 'Geometry',
  coordinates: 'Coordinates',
  averages: 'Averages',
  arithmetic: 'Arithmetic',
  place_value: 'Place Value',
  reasoning: 'Reasoning',
  data: 'Data',
  graph: 'Data',
};

const toLabel = (topicId: string) => TOPIC_LABELS[topicId] ?? topicId.replace(/_/g, ' ');

const toGameLabel = (gameId: string) => {
  const canonicalLabel = getCanonicalGameLabel(gameId as MiniGameType);
  return canonicalLabel || GAME_META[gameId as MiniGameType]?.label || gameId.replace(/_/g, ' ');
};

const toGameSummary = (game: GameStat): ParentGameSummary => ({
  gameId: game.gameId,
  label: toGameLabel(game.gameId),
  sessions: game.sessions,
  accuracy: game.accuracy,
  avgTimeSec: game.avgTimeSec || 0,
  totalTimeSec: game.totalTimeSec,
});

const pickLowest = (items: TopicStat[], count: number) => (
  [...items].sort((a, b) => a.accuracy - b.accuracy).slice(0, count)
);

const pickHighest = (items: TopicStat[], count: number) => (
  [...items].sort((a, b) => b.accuracy - a.accuracy).slice(0, count)
);

const gameMostPlayed = (items: GameStat[], count: number) => (
  [...items].sort((a, b) => b.sessions - a.sessions).slice(0, count)
);

const gameLeastPlayed = (items: GameStat[], count: number) => (
  [...items].sort((a, b) => a.sessions - b.sessions).slice(0, count)
);

const gameFastest = (items: GameStat[], count: number) => (
  [...items].sort((a, b) => a.avgTimeSec - b.avgTimeSec).slice(0, count)
);

const gameSlowest = (items: GameStat[], count: number) => (
  [...items].sort((a, b) => b.avgTimeSec - a.avgTimeSec).slice(0, count)
);

const positiveGames = (items: GameStat[]) => items.filter((game) => game.sessions > 0);

export const buildParentReport = (player: PlayerData): ParentReportSummary => {
  const telemetry = player.telemetry;
  const topics = telemetry ? Object.values(telemetry.topicStats) : [];
  const games = telemetry ? Object.values(telemetry.gameStats) : [];
  const activeGames = positiveGames(games);

  const needsPractice = pickLowest(topics.filter((topic) => topic.attempts >= 6), 3).map((topic) => toLabel(topic.topicId));
  const excelling = pickHighest(topics.filter((topic) => topic.attempts >= 6), 3).map((topic) => toLabel(topic.topicId));
  const mostPlayed = gameMostPlayed(activeGames, 3).map((game) => toGameLabel(game.gameId));

  const nextFocus = topics
    .filter((topic) => topic.attempts < 6)
    .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
    .slice(0, 3)
    .map((topic) => toLabel(topic.topicId));

  const favoriteGame = activeGames.length ? toGameSummary(gameMostPlayed(activeGames, 1)[0]) : null;
  const leastPlayedGame = activeGames.length ? toGameSummary(gameLeastPlayed(activeGames, 1)[0]) : null;
  const fastestGame = activeGames.length ? toGameSummary(gameFastest(activeGames, 1)[0]) : null;
  const slowestGame = activeGames.length ? toGameSummary(gameSlowest(activeGames, 1)[0]) : null;
  const totalAttempts = (telemetry?.correctAnswers ?? 0) + (telemetry?.incorrectAnswers ?? 0);
  const overallAccuracy = totalAttempts > 0 ? Math.round(((telemetry?.correctAnswers ?? 0) / totalAttempts) * 100) : 0;
  const averageSessionTimeSec = telemetry?.sessionsPlayed
    ? Math.round((telemetry.totalPlayTimeSec ?? 0) / telemetry.sessionsPlayed)
    : 0;

  return {
    favoriteGame,
    leastPlayedGame,
    fastestGame,
    slowestGame,
    overallAccuracy,
    averageSessionTimeSec,
    needsPractice,
    mostPlayed,
    nextFocus,
    excelling,
    updatedAt: Date.now(),
  };
};
