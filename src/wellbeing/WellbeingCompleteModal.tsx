import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AssetIcon from '../components/AssetIcon';

interface WellbeingCompleteModalProps {
  isOpen: boolean;
  title: string;
  rewardLabel: string;
  onContinue: () => void;
  onPlayAnother: () => void;
  onBackToHub: () => void;
}

const WellbeingCompleteModal: React.FC<WellbeingCompleteModalProps> = ({
  isOpen,
  title,
  rewardLabel,
  onContinue,
  onPlayAnother,
  onBackToHub,
}) => (
  <AnimatePresence>
    {isOpen ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-lg"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)',
        }}
      >
        <motion.div
          initial={{ y: 18, scale: 0.96, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 18, scale: 0.98, opacity: 0 }}
          className="relative w-full max-w-sm rounded-[1.8rem] border border-cyan-100/18 bg-[linear-gradient(180deg,rgba(14,40,79,0.98),rgba(8,23,49,0.98))] p-5 text-center text-white shadow-[0_24px_60px_rgba(2,6,23,0.42)]"
        >
          <button
            type="button"
            onClick={onBackToHub}
            className="ui-close-button absolute right-4 top-4"
            aria-label="Close"
          >
            <span aria-hidden="true">×</span>
          </button>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(167,243,208,0.36),rgba(125,211,252,0.15))] text-3xl shadow-[0_0_28px_rgba(167,243,208,0.18)]">
            <AssetIcon name="tree" className="h-8 w-8" alt="" />
          </div>
          <div className="mt-3 text-2xl font-black text-cyan-50">Calm Complete</div>
          <div className="mt-1 text-sm font-semibold text-cyan-100/80">{title} complete. Ready to return?</div>
          <div className="mt-3 rounded-full border border-emerald-200/28 bg-emerald-400/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100">
            {rewardLabel}
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <button type="button" onClick={onContinue} className="ui-button-success px-4 py-3 text-sm font-black uppercase tracking-[0.14em]">
              Continue
            </button>
            <button type="button" onClick={onPlayAnother} className="ui-button-secondary px-4 py-3 text-sm font-black uppercase tracking-[0.14em]">
              Play Another
            </button>
            <button type="button" onClick={onBackToHub} className="ui-button-secondary px-4 py-3 text-sm font-black uppercase tracking-[0.14em]">
              Back To Calm Grove
            </button>
          </div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export default WellbeingCompleteModal;
