import { WellbeingSuggestionConfig, WELLBEING_SUGGESTION_CONFIG } from './config';

export interface WellbeingSignals {
  consecutiveFails: number;
  gamesPlayedSinceBreak: number;
  sessionStartTime: number;
  lastWellbeingTime: number | null;
  lastSuggestionTime: number | null;
}

const minutesBetween = (start: number, end: number) => Math.max(0, (end - start) / 60000);

export const shouldSuggestWellbeing = (
  signals: WellbeingSignals,
  now = Date.now(),
  config: WellbeingSuggestionConfig = WELLBEING_SUGGESTION_CONFIG,
) => {
  if (signals.lastWellbeingTime && minutesBetween(signals.lastWellbeingTime, now) < config.suggestionCooldownMinutes) {
    return false;
  }

  if (signals.lastSuggestionTime && minutesBetween(signals.lastSuggestionTime, now) < config.suggestionCooldownMinutes) {
    return false;
  }

  if (signals.consecutiveFails >= config.consecutiveFailsBeforeSuggestion) return true;
  if (signals.gamesPlayedSinceBreak >= config.minGamesBeforeSuggestion) return true;
  if (minutesBetween(signals.sessionStartTime, now) >= config.minMinutesBeforeSuggestion) return true;
  return false;
};
