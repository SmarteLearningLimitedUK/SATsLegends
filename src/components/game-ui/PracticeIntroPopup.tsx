import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

type PracticeIntroPopupProps = {
  open: boolean;
  title: string;
  body: React.ReactNode;
  actionLabel?: string;
  onAction: () => void;
};

const PracticeIntroPopup: React.FC<PracticeIntroPopupProps> = ({
  open,
  title,
  body,
  actionLabel = 'Start Practice',
  onAction,
}) => (
  <AnimatePresence>
    {open ? (
      <motion.div
        key="practice-intro-popup"
        className="fixed inset-0 z-[90] flex items-center justify-center px-3 py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          type="button"
          aria-label="Close practice briefing"
          className="absolute inset-0 cursor-default bg-slate-950/72 backdrop-blur-[6px]"
          onClick={onAction}
        />
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative z-10 w-[min(92vw,34rem)] rounded-[1.5rem] border border-cyan-100/28 bg-[linear-gradient(180deg,rgba(12,18,38,0.98),rgba(10,16,32,0.96))] px-4 py-4 text-center text-white shadow-[0_22px_48px_rgba(2,6,23,0.5)] md:px-6 md:py-5"
        >
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/80 md:text-xs">
            Practice Briefing
          </div>
          <div className="mt-2 text-[clamp(1.15rem,4.8vw,1.8rem)] font-black text-amber-100">
            {title}
          </div>
          <div className="mt-3 whitespace-pre-line text-left text-[clamp(0.92rem,3.4vw,1.02rem)] font-semibold leading-relaxed text-cyan-50/92">
            {body}
          </div>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onAction}
              className="inline-flex min-h-[2.8rem] items-center justify-center rounded-full border border-cyan-100/35 bg-cyan-300/15 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-50 transition hover:bg-cyan-300/22 active:translate-y-[1px]"
            >
              {actionLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export default PracticeIntroPopup;
