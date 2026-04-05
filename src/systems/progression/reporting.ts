import { PlayerData, TopicStat, GameStat, ParentReportSummary } from '../../types';

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
};

const toLabel = (topicId: string) => TOPIC_LABELS[topicId] ?? topicId.replace(/_/g, ' ');

const pickLowest = (items: TopicStat[], count: number) => (
  [...items].sort((a, b) => a.accuracy - b.accuracy).slice(0, count)
);

const pickHighest = (items: TopicStat[], count: number) => (
  [...items].sort((a, b) => b.accuracy - a.accuracy).slice(0, count)
);

const gameMostPlayed = (items: GameStat[], count: number) => (
  [...items].sort((a, b) => b.sessions - a.sessions).slice(0, count)
);

export const buildParentReport = (player: PlayerData): ParentReportSummary => {
  const telemetry = player.telemetry;
  const topics = telemetry ? Object.values(telemetry.topicStats) : [];
  const games = telemetry ? Object.values(telemetry.gameStats) : [];

  const needsPractice = pickLowest(topics.filter(t => t.attempts >= 6), 3).map(t => toLabel(t.topicId));
  const excelling = pickHighest(topics.filter(t => t.attempts >= 6), 3).map(t => toLabel(t.topicId));
  const mostPlayed = gameMostPlayed(games, 3).map(g => g.gameId);

  const nextFocus = topics
    .filter(t => t.attempts < 6)
    .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
    .slice(0, 3)
    .map(t => toLabel(t.topicId));

  return {
    needsPractice,
    mostPlayed,
    nextFocus,
    excelling,
    updatedAt: Date.now(),
  };
};
