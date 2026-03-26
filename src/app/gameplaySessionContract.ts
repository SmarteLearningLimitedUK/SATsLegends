import { MiniGameType } from '../types';

export interface GameplaySessionState {
  timeLeft: number;
  totalTime: number;
  lives: number;
}

export interface GameplaySessionEventPayload {
  gameType?: MiniGameType;
  levelId?: number;
  score?: number;
  stars?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface GameplaySessionEventHandlers {
  onCorrectAnswer?: (payload?: GameplaySessionEventPayload) => void;
  onIncorrectAnswer?: (payload?: GameplaySessionEventPayload) => void;
  onPuzzleComplete?: (payload?: GameplaySessionEventPayload) => void;
  onGameComplete?: (payload?: GameplaySessionEventPayload) => void;
  onGameFailed?: (payload?: GameplaySessionEventPayload) => void;
}
