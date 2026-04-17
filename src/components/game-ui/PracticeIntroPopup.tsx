import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  type Density = 'normal' | 'compact' | 'tight' | 'micro';
  const [density, setDensity] = useState<Density>('normal');
  const contentViewportRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    setDensity('normal');
  }, [open, title, body, briefing]);

  useLayoutEffect(() => {
    if (!open) return;
    const node = contentViewportRef.current;
    if (!node) return;

    const isOverflowing = () => node.scrollHeight - node.clientHeight > 1;

    const raf = requestAnimationFrame(() => {
      if (!isOverflowing()) return;
      setDensity((current) => {
        if (current === 'normal') return 'compact';
        if (current === 'compact') return 'tight';
        if (current === 'tight') return 'micro';
        return current;
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [open, density, title, body, briefing]);

  const densityClasses = useMemo(() => {
    switch (density) {
      case 'compact':
        return {
          shell: 'px-4 py-4 md:px-6 md:py-5',
          title: 'mt-2 text-[clamp(1.05rem,4.4vw,1.6rem)]',
          body: 'mt-2 text-[clamp(0.88rem,3.2vw,0.98rem)] leading-relaxed',
          briefing: 'mt-2 text-[clamp(0.88rem,3.2vw,0.98rem)] leading-relaxed',
          bullets: 'mt-2 space-y-1.5',
          buttonWrap: 'mt-3',
          button: 'h-11 text-[11px] md:text-sm',
        };
      case 'tight':
        return {
          shell: 'px-4 py-3 md:px-6 md:py-4',
          title: 'mt-1.5 text-[clamp(0.98rem,4.1vw,1.45rem)]',
          body: 'mt-2 text-[clamp(0.82rem,3vw,0.92rem)] leading-snug',
          briefing: 'mt-2 text-[clamp(0.82rem,3vw,0.92rem)] leading-snug',
          bullets: 'mt-2 space-y-1',
          buttonWrap: 'mt-3',
          button: 'h-10 text-[10px] md:text-sm',
        };
      case 'micro':
        return {
          shell: 'px-3 py-3 md:px-5 md:py-4',
          title: 'mt-1 text-[clamp(0.92rem,3.8vw,1.32rem)]',
          body: 'mt-1.5 text-[clamp(0.76rem,2.7vw,0.86rem)] leading-snug',
          briefing: 'mt-1.5 text-[clamp(0.76rem,2.7vw,0.86rem)] leading-snug',
          bullets: 'mt-1.5 space-y-1',
          buttonWrap: 'mt-2.5',
          button: 'h-10 text-[10px] md:text-sm',
        };
      case 'normal':
      default:
        return {
          shell: 'px-4 py-4 md:px-6 md:py-5',
          title: 'mt-2 text-[clamp(1.15rem,4.8vw,1.8rem)]',
          body: 'mt-3 text-[clamp(0.92rem,3.4vw,1.02rem)] leading-relaxed',
          briefing: 'mt-3 text-[clamp(0.92rem,3.4vw,1.02rem)] leading-relaxed',
          bullets: 'mt-3 space-y-2',
          buttonWrap: 'mt-4',
          button: 'h-12 text-[11px] md:text-sm',
        };
    }
  }, [density]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="practice-intro-popup"
          className="fixed inset-0 z-[260] flex items-center justify-center px-3 py-3"
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
            className={`pointer-events-auto relative z-10 flex max-h-[calc(100dvh-1rem)] w-[min(92vw,34rem)] flex-col overflow-hidden rounded-3xl border border-blue-400/40 bg-blue-950/70 text-center text-white shadow-2xl ${densityClasses.shell}`}
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
            <div ref={contentViewportRef} className="min-h-0 flex-1 overflow-hidden pr-1">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 md:text-xs">
                Practice Briefing
              </div>
              <div className={`${densityClasses.title} font-black text-amber-100`}>
                {title}
              </div>
              {briefing ? (
                <div className={`text-left font-semibold text-cyan-50/92 ${densityClasses.briefing}`}>
                  <p className="whitespace-pre-line font-bold text-white">{briefing.summary}</p>
                  {briefing.bullets.length ? (
                    <ul className={densityClasses.bullets}>
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
                <div className={`whitespace-pre-line text-left font-semibold text-cyan-50/92 ${densityClasses.body}`}>
                  {body}
                </div>
              )}
            </div>
            <div className={`${densityClasses.buttonWrap} flex shrink-0 justify-center`}>
              <button
                type="button"
                onClick={onAction}
                className={`ui-button-primary flex w-[min(14rem,72vw)] items-center justify-center border-0 bg-transparent px-4 py-0 font-black uppercase tracking-[0.12em] text-[#16233d] ${densityClasses.button}`}
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
