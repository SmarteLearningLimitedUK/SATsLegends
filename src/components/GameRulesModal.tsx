import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AssetIcon from './AssetIcon';
import { GameRuleSet } from '../gameMeta';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: GameRuleSet | null;
}

const GameRulesModal: React.FC<GameRulesModalProps> = ({ isOpen, onClose, rules }) => {
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
            className="app-modal-panel casual-modal-panel relative flex w-full max-w-md flex-col overflow-hidden rounded-[1.8rem] border border-white/20 p-4 text-white shadow-[0_26px_80px_rgba(0,0,0,0.42)] md:max-w-lg md:rounded-[2.4rem] md:p-6"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full border border-white/12 bg-white/10 p-2 text-white transition hover:bg-white/18 md:right-4 md:top-4"
              aria-label="Close rules"
            >
              <AssetIcon name="x" className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-amber-200/30 bg-amber-300/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] md:h-14 md:w-14">
                <AssetIcon name="question" className="h-6 w-6 md:h-7 md:w-7" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55 md:text-[11px]">How To Play</div>
                <h2 className="truncate text-xl font-black tracking-tight text-white md:text-3xl">{rules.title}</h2>
              </div>
            </div>

            <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/8 p-3 text-sm font-medium text-white/82 md:rounded-[1.5rem] md:p-4 md:text-base">
              {rules.summary}
            </div>

            <div className="mt-4 flex flex-col gap-2.5 md:gap-3">
              {rules.bullets.map((bullet) => (
                <div
                  key={bullet}
                  className="flex items-start gap-3 rounded-[1rem] border border-white/10 bg-black/18 px-3 py-3 text-sm font-semibold text-white/90 md:rounded-[1.2rem] md:text-base"
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-300/20 text-xs font-black text-amber-100">
                    ?
                  </span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="licensed-submit-button mt-5 w-full rounded-[1.2rem] py-3 text-sm font-black uppercase tracking-[0.16em] text-white md:mt-6 md:rounded-[1.5rem] md:py-4 md:text-base"
            >
              Back To Game
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameRulesModal;
