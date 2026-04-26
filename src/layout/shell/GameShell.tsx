import React from 'react';

type GameShellProps = {
  /** QuestionPanel slot */
  question?: React.ReactNode;
  /** GameplayViewport slot */
  gameplay: React.ReactNode;
  /** AnswerPanel slot */
  answers?: React.ReactNode;
  /** Optional overlay layer rendered last */
  overlay?: React.ReactNode;
  className?: string;
};

/**
 * LOCKED GAME SHELL
 *
 * This is the only approved gameplay screen structure.
 * Do not change the core layout maths, safe-area rules, or row proportions.
 * Visual polish must skin these slots, not move them.
 *
 * Slots (in order):
 * 1. QuestionPanel
 * 2. GameplayViewport
 * 3. AnswerPanel
 *
 * TopHUD + BottomHUD are owned by AppShell (outside this component).
 */
const GameShell: React.FC<GameShellProps> = ({
  question,
  gameplay,
  answers,
  overlay,
  className,
}) => {
  return (
    <div
      className={[
        'game-shell',
        'game-screen-layout structured-game-layout',
        className,
      ].filter(Boolean).join(' ')}
      data-shell="game"
      data-preserve-shell-zones="true"
    >
      {question ? (
        <section className="game-screen-region game-screen-top game-shell-zone-title" data-shell-region="question">
          {question}
        </section>
      ) : null}

      <section className="game-screen-region game-screen-main game-shell-zone-playfield" data-shell-region="playfield">
        {gameplay}
      </section>

      {answers ? (
        <section className="game-screen-region game-screen-bottom game-shell-zone-actions" data-shell-region="answers">
          {answers}
        </section>
      ) : null}

      {overlay}
    </div>
  );
};

export default GameShell;

