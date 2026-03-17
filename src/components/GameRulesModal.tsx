import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AssetIcon from './AssetIcon';
import { GameRuleSet } from '../gameMeta';
import { HUDBar, RewardPanel } from './layout/ScreenPrimitives';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: GameRuleSet | null;
  actionLabel?: string;
}

const GameRulesModal: React.FC<GameRulesModalProps> = ({
  isOpen,
  onClose,
  rules,
  actionLabel = 'Back To Game',
}) => {
  if (!rules) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/72 p-3 backdrop-blur-xl md:p-4"
        >
          <motion.div
            initial={{ y: 28, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
            className="app-modal-panel licensed-game-card-dark relative flex w-full max-w-md flex-col overflow-hidden rounded-[1.8rem] p-4 text-white shadow-[0_26px_80px_rgba(0,0,0,0.42)] md:max-w-lg md:rounded-[2.4rem] md:p-6"
          >
            <button
              onClick={onClose}
              className="ui-icon-button absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full p-0 text-white transition md:right-4 md:top-4"
              aria-label="Close rules"
            >
              <AssetIcon name="x" className="h-5 w-5" />
            </button>

            <HUDBar
              eyebrow="How to play"
              title={rules.title}
              trailing={(
                <div className="licensed-slice-cyan-pill flex h-11 w-11 items-center justify-center rounded-[1rem] text-white md:h-12 md:w-12">
                  <AssetIcon name="question" className="h-5 w-5 md:h-6 md:w-6" />
                </div>
              )}
            />

            <RewardPanel className="mt-4 text-sm font-bold text-amber-950 md:text-base">
              {rules.summary}
            </RewardPanel>

            <div className="mt-4 flex flex-col gap-2.5 md:gap-3">
              {rules.bullets.map((bullet) => (
                <div
                  key={bullet}
                  className="licensed-game-card flex items-start gap-3 rounded-[1rem] px-3 py-3 text-sm font-semibold text-white md:rounded-[1.2rem] md:text-base"
                >
                  <span className="licensed-slice-yellow-plank mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-amber-950">
                    !
                  </span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="ui-button-primary mt-5 w-full rounded-[1.2rem] py-3 text-sm font-black uppercase tracking-[0.16em] text-white md:mt-6 md:rounded-[1.5rem] md:py-4 md:text-base"
            >
              {actionLabel}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameRulesModal;
