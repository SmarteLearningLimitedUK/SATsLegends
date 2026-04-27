import { MiniGameType } from '../types';
import { playCorrectAnswerJuice, playWrongAnswerJuice } from '../utils/answerJuice';

/**
 * Shell-owned mini-game session state (single source of truth).
 */
export interface MiniGameSessionState {
  timeLeft: number;
  totalTime: number;
  lives: number;
}

export type MiniGameSessionEventType =
  | 'correct_answer'
  | 'incorrect_answer'
  | 'puzzle_complete'
  | 'game_complete'
  | 'game_failed';

/**
 * Shared payload fields mini-games can emit to the shell.
 */
export interface MiniGameSessionEventPayload {
  gameType?: MiniGameType;
  levelId?: number;
  score?: number;
  stars?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Normalized event object for optional onEvent pipelines.
 */
export interface MiniGameSessionEvent extends MiniGameSessionEventPayload {
  type: MiniGameSessionEventType;
}

/**
 * Contract mini-games use to report outcomes back to the shell.
 */
export interface MiniGameSessionEventHandlers {
  onEvent?: (event: MiniGameSessionEvent) => void;
  onCorrectAnswer?: (event: MiniGameSessionEvent) => void;
  onIncorrectAnswer?: (event: MiniGameSessionEvent) => void;
  onPuzzleComplete?: (event: MiniGameSessionEvent) => void;
  onGameComplete?: (event: MiniGameSessionEvent) => void;
  onGameFailed?: (event: MiniGameSessionEvent) => void;
}

export interface MiniGamePracticeBriefing {
  title: string;
  summary: string;
  howToPlay?: string;
  bullets: string[];
}

/**
 * Reusable mini-game shell contract (shared props boundary).
 */
export interface MiniGameShellContractProps {
  sessionState?: MiniGameSessionState;
  sessionEvents?: MiniGameSessionEventHandlers;
  isPractice?: boolean;
  practiceBriefing?: MiniGamePracticeBriefing | null;
  gameTitle?: string;
}

const callbackByEventType: Record<MiniGameSessionEventType, keyof MiniGameSessionEventHandlers> = {
  correct_answer: 'onCorrectAnswer',
  incorrect_answer: 'onIncorrectAnswer',
  puzzle_complete: 'onPuzzleComplete',
  game_complete: 'onGameComplete',
  game_failed: 'onGameFailed',
};

/**
 * Emits a standardized mini-game session event to both:
 * - onEvent (generic stream)
 * - typed callback for the specific event kind
 */
export const emitMiniGameSessionEvent = (
  handlers: MiniGameSessionEventHandlers | undefined,
  type: MiniGameSessionEventType,
  payload: Omit<MiniGameSessionEvent, 'type'> = {},
) => {
  // Global "juice" feedback: never blocks gameplay and runs even if no handlers are provided.
  if (typeof document !== 'undefined') {
    const inGameplay = Boolean(document.querySelector('.app-viewport.screen-gameplay'));
    if (inGameplay) {
      if (type === 'correct_answer') playCorrectAnswerJuice();
      if (type === 'incorrect_answer') playWrongAnswerJuice();
    }
  }

  if (!handlers) return;

  const event: MiniGameSessionEvent = { type, ...payload };
  handlers.onEvent?.(event);
  const callbackKey = callbackByEventType[type];
  const callback = handlers[callbackKey];
  if (typeof callback === 'function') {
    callback(event);
  }
};

/**
 * Binds shell-level context once so mini-games don't need to re-attach it.
 */
export const bindMiniGameSessionHandlers = (
  handlers: MiniGameSessionEventHandlers | undefined,
  context: Pick<MiniGameSessionEventPayload, 'gameType' | 'levelId'>,
): MiniGameSessionEventHandlers | undefined => {
  if (!handlers) return undefined;

  const withContext = (event: MiniGameSessionEvent): MiniGameSessionEvent => ({
    ...event,
    ...context,
  });

  return {
    onEvent: handlers.onEvent ? (event) => handlers.onEvent?.(withContext(event)) : undefined,
    onCorrectAnswer: (event) => emitMiniGameSessionEvent(handlers, 'correct_answer', withContext(event)),
    onIncorrectAnswer: (event) => emitMiniGameSessionEvent(handlers, 'incorrect_answer', withContext(event)),
    onPuzzleComplete: (event) => emitMiniGameSessionEvent(handlers, 'puzzle_complete', withContext(event)),
    onGameComplete: (event) => emitMiniGameSessionEvent(handlers, 'game_complete', withContext(event)),
    onGameFailed: (event) => emitMiniGameSessionEvent(handlers, 'game_failed', withContext(event)),
  };
};

// Backward-compatible aliases
export type GameplaySessionState = MiniGameSessionState;
export type GameplaySessionEventPayload = MiniGameSessionEventPayload;
export type GameplaySessionEventHandlers = MiniGameSessionEventHandlers;
