import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { MiniGamePracticeBriefing } from '../../app/gameplaySessionContract';

type PracticeIntroPopupProps = {
  open: boolean;
  title: string;
  body: React.ReactNode;
  briefing?: MiniGamePracticeBriefing | null;
  actionLabel?: string;
  onAction: () => void;
};

const PracticeIntroPopup: React.FC<PracticeIntroPopupProps> = ({
  open,
  title,
  body,
  briefing,
  actionLabel = 'Start Practice',
  onAction,
}) => {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="practice-intro-popup"
          className="fixed inset-0 z-[260] flex items-center justify-center px-3 py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            role="presentation"
            aria-hidden="true"
            className="absolute inset-0 z-0 cursor-default bg-slate-950/72 backdrop-blur-[6px]"
            onClick={onAction}
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 flex max-h-[calc(100vh-1.5rem)] w-[min(92vw,34rem)] flex-col overflow-hidden rounded-3xl border border-blue-400/40 bg-blue-950/70 px-4 py-4 text-center text-white shadow-2xl md:px-6 md:py-5 pointer-events-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close practice briefing"
              onClick={onAction}
              className="ui-icon-button ui-close-button absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center p-0 text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 md:text-xs">
                Practice Briefing
              </div>
              <div className="mt-2 text-[clamp(1.15rem,4.8vw,1.8rem)] font-black text-amber-100">
                {title}
              </div>
              {briefing ? (
                <div className="mt-3 text-left text-[clamp(0.92rem,3.4vw,1.02rem)] font-semibold leading-relaxed text-cyan-50/92">
                  <p className="whitespace-pre-line font-bold text-white">{briefing.summary}</p>
                  {briefing.bullets.length ? (
                    <ul className="mt-3 space-y-2">
                      {briefing.bullets.map((bullet, index) => (
                        <li key={`${briefing.title}-bullet-${index}`} className="flex gap-2">
                          <span className="mt-[0.18rem] shrink-0 text-amber-100">-</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 whitespace-pre-line text-left text-[clamp(0.92rem,3.4vw,1.02rem)] font-semibold leading-relaxed text-cyan-50/92">
                  {body}
                </div>
              )}
            </div>
            <div className="mt-4 flex shrink-0 justify-center">
              <button
                type="button"
                onClick={onAction}
                className="ui-button-primary flex h-12 w-[min(14rem,72vw)] items-center justify-center border-0 bg-transparent px-4 py-0 text-[11px] font-black uppercase tracking-[0.12em] text-[#16233d] md:text-sm"
              >
                {actionLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default PracticeIntroPopup;
