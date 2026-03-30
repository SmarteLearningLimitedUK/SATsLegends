export interface WellbeingSuggestionConfig {
  consecutiveFailsBeforeSuggestion: number;
  minMinutesBeforeSuggestion: number;
  minGamesBeforeSuggestion: number;
  suggestionCooldownMinutes: number;
}

export const WELLBEING_SUGGESTION_CONFIG: WellbeingSuggestionConfig = {
  consecutiveFailsBeforeSuggestion: 2,
  minMinutesBeforeSuggestion: 20,
  minGamesBeforeSuggestion: 4,
  suggestionCooldownMinutes: 12,
};
