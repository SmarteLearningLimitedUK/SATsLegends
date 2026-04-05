import { GameStat, MiniGameType, PlayerData, PlayerTelemetry, TopicStat } from '../../types';
import { GAME_META } from '../../gameMeta';

export type TelemetryEventType =
  | 'correct_answer'
  | 'incorrect_answer'
  | 'game_complete'
  | 'game_failed';

export type TelemetryContext = {
  gameType?: MiniGameType;
  levelId?: number;
  blueprintKey?: string;
  skillTags?: string[];
  score?: number;
  durationSec?: number;
};

export const DEFAULT_TELEMETRY: PlayerTelemetry = {
  sessionsPlayed: 0,
  totalPlayTimeSec: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  currentCorrectStreak: 0,
  bestCorrectStreak: 0,
  topicStats: {},
  gameStats: {},
};

const GAME_TOPIC_MAP: Partial<Record<MiniGameType, string[]>> = {
  percent_power: ['percentages'],
  ratio_rapids: ['ratio'],
  ratio_fractions: ['ratio', 'fractions'],
  fraction_match: ['fractions'],
  unit_mixer: ['measurement'],
  change_counter: ['money'],
  measurement_forge: ['measurement'],
  timekeeper_temple: ['time'],
  area_architect: ['area'],
  polygon_palace: ['geometry'],
  transform_temple: ['transformation'],
  coordinate_quest: ['coordinates'],
  angle_arena: ['angles'],
  mean_machine: ['averages'],
  reasoning_quest: ['reasoning'],
  calculation_clash: ['arithmetic'],
  place_value_peaks: ['place_value'],
  data_dungeon: ['data'],
  chart_chase: ['data'],
};

const normalizeTopicTags = (tags: string[]) => Array.from(new Set(tags.map(tag => tag.trim()).filter(Boolean)));

export const createTelemetryState = (seed?: PlayerTelemetry): PlayerTelemetry => ({
  ...DEFAULT_TELEMETRY,
  ...(seed || {}),
  topicStats: { ...(seed?.topicStats || {}) },
  gameStats: { ...(seed?.gameStats || {}) },
});

export const ensureTelemetry = (player: PlayerData): PlayerTelemetry => (
  player.telemetry ? createTelemetryState(player.telemetry) : createTelemetryState()
);

const ensureTopicStat = (telemetry: PlayerTelemetry, topicId: string): TopicStat => {
  if (!telemetry.topicStats[topicId]) {
    telemetry.topicStats[topicId] = {
      topicId,
      attempts: 0,
      completions: 0,
      accuracy: 0,
      avgTimeSec: 0,
      lastPlayed: null,
    };
  }
  return telemetry.topicStats[topicId];
};

const ensureGameStat = (telemetry: PlayerTelemetry, gameId: string): GameStat => {
  if (!telemetry.gameStats[gameId]) {
    telemetry.gameStats[gameId] = {
      gameId,
      attempts: 0,
      correct: 0,
      incorrect: 0,
      sessions: 0,
      completions: 0,
      accuracy: 0,
      avgScore: 0,
      totalTimeSec: 0,
      lastPlayed: null,
    };
  }
  return telemetry.gameStats[gameId];
};

const resolveTopicTags = (context: TelemetryContext): string[] => {
  if (context.skillTags?.length) return normalizeTopicTags(context.skillTags);
  if (context.blueprintKey) return normalizeTopicTags([context.blueprintKey]);
  if (context.gameType && GAME_TOPIC_MAP[context.gameType]) return normalizeTopicTags(GAME_TOPIC_MAP[context.gameType] || []);
  if (context.gameType) {
    const meta = GAME_META[context.gameType];
    if (meta?.title) return normalizeTopicTags([meta.title.toLowerCase().replace(/\s+/g, '_')]);
  }
  return context.gameType ? [context.gameType] : ['general'];
};

const updateAccuracy = (stat: { attempts: number; completions: number }) => (
  stat.attempts > 0 ? Math.round((stat.completions / stat.attempts) * 100) / 100 : 0
);

export const applyTelemetryEvent = (
  player: PlayerData,
  eventType: TelemetryEventType,
  context: TelemetryContext,
): PlayerData => {
  const telemetry = { ...ensureTelemetry(player) };
  const now = Date.now();
  const gameId = context.gameType ?? 'unknown';
  const topics = resolveTopicTags(context);
  const gameStat = ensureGameStat(telemetry, gameId);

  if (eventType === 'correct_answer' || eventType === 'incorrect_answer') {
    const isCorrect = eventType === 'correct_answer';
    telemetry.correctAnswers += isCorrect ? 1 : 0;
    telemetry.incorrectAnswers += isCorrect ? 0 : 1;
    telemetry.currentCorrectStreak = isCorrect ? telemetry.currentCorrectStreak + 1 : 0;
    telemetry.bestCorrectStreak = Math.max(telemetry.bestCorrectStreak, telemetry.currentCorrectStreak);

    gameStat.attempts += 1;
    gameStat.correct += isCorrect ? 1 : 0;
    gameStat.incorrect += isCorrect ? 0 : 1;
    gameStat.accuracy = updateAccuracy({ attempts: gameStat.attempts, completions: gameStat.correct });

    topics.forEach((topic) => {
      const topicStat = ensureTopicStat(telemetry, topic);
      topicStat.attempts += 1;
      if (isCorrect) topicStat.completions += 1;
      topicStat.accuracy = updateAccuracy(topicStat);
      topicStat.lastPlayed = now;
    });
  }

  if (eventType === 'game_complete' || eventType === 'game_failed') {
    telemetry.sessionsPlayed += 1;
    gameStat.sessions += 1;
    if (eventType === 'game_complete') {
      gameStat.completions += 1;
    }
    if (typeof context.score === 'number') {
      gameStat.avgScore = Math.round(((gameStat.avgScore * (gameStat.sessions - 1)) + context.score) / gameStat.sessions);
    }
    if (typeof context.durationSec === 'number') {
      telemetry.totalPlayTimeSec += context.durationSec;
      gameStat.totalTimeSec += context.durationSec;
    }
    gameStat.lastPlayed = now;
  }

  return {
    ...player,
    telemetry,
  };
};
