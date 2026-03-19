import React from 'react';

export interface MiniGameInput {
  type: string;
  payload?: unknown;
}

export interface MiniGameState {
  initialized: boolean;
  frame: number;
  elapsedMs: number;
  lastInput?: MiniGameInput;
}

export interface MiniGame<P = Record<string, unknown>, S extends MiniGameState = MiniGameState> {
  id: string;
  init: () => void;
  update: (deltaMs: number) => void;
  handleInput: (input: MiniGameInput) => void;
  getState: () => Readonly<S>;
  render: (props: P) => React.ReactElement;
}

const createDefaultState = (): MiniGameState => ({
  initialized: false,
  frame: 0,
  elapsedMs: 0,
});

/**
 * Adapter for React-based mini-games so each game exposes a consistent runtime interface.
 * This does not alter gameplay logic; it only standardizes the host contract.
 */
export const createMiniGame = <P extends Record<string, unknown>>(
  id: string,
  Component: React.ComponentType<P>,
): MiniGame<P> => {
  let state: MiniGameState = createDefaultState();

  return {
    id,
    init() {
      state = {
        ...createDefaultState(),
        initialized: true,
      };
    },
    update(deltaMs: number) {
      state = {
        ...state,
        frame: state.frame + 1,
        elapsedMs: state.elapsedMs + Math.max(0, deltaMs),
      };
    },
    handleInput(input: MiniGameInput) {
      state = {
        ...state,
        lastInput: input,
      };
    },
    getState() {
      return state;
    },
    render(props: P) {
      return <Component {...props} />;
    },
  };
};

