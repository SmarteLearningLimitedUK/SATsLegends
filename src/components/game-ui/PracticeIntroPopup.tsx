import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { MiniGamePracticeBriefing } from '../../app/gameplaySessionContract';
import splashStartPill from '../../assets/casual_ui/inputs/btn_1.png';
import { useTrimmedImageSource } from '../../utils/trimTransparentImage';

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
  const trimmedSplashStartPill = useTrimmedImageSource(splashStartPill);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="practice-intro-popup"
          className="fixed inset-0 z-[90] flex items-center justify-center px-3 py-4"
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
              className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-200/20 bg-blue-950/70 text-cyan-50 transition hover:bg-blue-900/80 hover:text-white"
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
                  <p className="font-bold text-white">{briefing.summary}</p>
                  <ul className="mt-3 space-y-2">
                    {briefing.bullets.map((bullet, index) => (
                      <li key={`${briefing.title}-bullet-${index}`} className="flex gap-2">
                        <span className="mt-[0.18rem] shrink-0 text-amber-100">-</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-3 whitespace-pre-line text-left text-[clamp(0.92rem,3.4vw,1.02rem)] font-semibold leading-relaxed text-cyan-50/92">
                  {body}
                </div>
              )}
            </div>
            <div className="mt-4 flex shrink-0 justify-center">
              <motion.button
                type="button"
                onClick={onAction}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="gold-pill-shell relative h-12 w-[min(14rem,72vw)] rounded-full border-0 bg-transparent p-0 shadow-[0_8px_22px_rgba(0,0,0,0.35)]"
              >
                <img
                  src={trimmedSplashStartPill}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="gold-pill-art rounded-full"
                />
                <span className="relative z-10 text-[11px] font-normal uppercase tracking-[0.12em] text-black drop-shadow-[0_1px_0_rgba(255,255,255,0.45)] md:text-sm">
                  {actionLabel}
                </span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default PracticeIntroPopup;
