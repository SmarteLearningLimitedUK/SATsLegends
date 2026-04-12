import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AssetIcon from './AssetIcon';
import { GameRuleSet } from '../gameMeta';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: GameRuleSet | null;
  actionLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

const GameRulesModal: React.FC<GameRulesModalProps> = ({
  isOpen,
  onClose,
  rules,
  actionLabel = 'Back To Game',
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  if (!rules) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-xl md:p-4"
        >
          <motion.div
            initial={{ y: 28, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
            className="app-modal-panel relative flex w-full max-w-md flex-col overflow-hidden rounded-[1.6rem] border border-white/15 bg-[linear-gradient(180deg,rgba(7,21,52,0.92),rgba(5,17,45,0.96))] p-4 text-white shadow-[0_28px_80px_rgba(0,0,0,0.5)] md:max-w-lg md:rounded-[2rem] md:p-6"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.18),transparent_60%)]" />
            <button
              onClick={onClose}
              className="ui-close-button absolute right-4 top-4 z-20 md:right-5 md:top-5"
              aria-label="Close rules"
            >
              <span aria-hidden="true">×</span>
            </button>

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex flex-col items-center text-center">
                <span className="rounded-full border border-cyan-200/50 bg-cyan-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
                  How To Play
                </span>
                <h2 className="mt-2 text-2xl font-black text-amber-100 md:text-3xl">{rules.title}</h2>
                <p className="mt-1 text-sm font-semibold text-white/80 md:text-base">{rules.summary}</p>
              </div>

              <div className="rounded-[1.2rem] border border-white/12 bg-white/5 p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Quick Steps</span>
                  <div className="rounded-full border border-white/15 bg-white/10 p-2">
                    <AssetIcon name="question" className="h-5 w-5 text-white md:h-6 md:w-6" />
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2.5 md:gap-3">
                  {rules.bullets.map((bullet, index) => (
                    <div
                      key={bullet}
                      className="flex items-start gap-3 rounded-[1.1rem] border border-white/12 bg-white/5 px-3 py-3 text-sm font-semibold text-white/90 shadow-[0_8px_18px_rgba(2,6,23,0.18)] md:rounded-[1.3rem] md:text-base"
                    >
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-200/60 bg-amber-300/20 text-xs font-black text-amber-100">
                        {index + 1}
                      </span>
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 grid gap-2">
                {secondaryActionLabel && onSecondaryAction ? (
                  <button
                    type="button"
                    onClick={onSecondaryAction}
                    className="rounded-full border border-white/25 bg-white/10 py-2 text-xs font-black uppercase tracking-[0.18em] text-white"
                  >
                    {secondaryActionLabel}
                  </button>
                ) : null}
                <button
                  onClick={onClose}
                  className="rounded-full bg-[linear-gradient(90deg,#38bdf8,#6366f1)] py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_24px_rgba(59,130,246,0.45)]"
                >
                  {actionLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameRulesModal;
