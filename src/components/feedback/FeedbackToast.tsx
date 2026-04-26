import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export type FeedbackToastTone = 'success' | 'warning';

export type FeedbackToastState = {
  isOpen: boolean;
  tone: FeedbackToastTone;
  message: string;
};

type FeedbackToastProps = {
  toast: FeedbackToastState;
  onDismiss: () => void;
  /** Optional override, otherwise we place the toast safely above the answer zone. */
  placement?: 'aboveAnswers' | 'centerPlayfield';
};

/**
 * Shared correct/incorrect feedback toast.
 *
 * Rules:
 * - Shell owned (do not recreate per minigame).
 * - Always visible (safe-area aware) and never behind HUD or gameplay objects.
 * - Pointer-events none so it never blocks taps.
 */
const FeedbackToast: React.FC<FeedbackToastProps> = ({ toast, onDismiss, placement = 'aboveAnswers' }) => {
  useEffect(() => {
    if (!toast.isOpen) return;
    const timeout = window.setTimeout(onDismiss, 850);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast.isOpen]);

  const basePositionStyle: React.CSSProperties =
    placement === 'centerPlayfield'
      ? {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }
      : {
          left: '50%',
          bottom: 'calc(env(safe-area-inset-bottom) + 30dvh + 12px)',
          transform: 'translateX(-50%)',
        };

  const surfaceClass =
    toast.tone === 'success'
      ? 'border-emerald-200/45 bg-emerald-400/18 text-emerald-50'
      : 'border-rose-200/40 bg-rose-500/16 text-rose-50';

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[120]"
      aria-hidden={!toast.isOpen}
    >
      <AnimatePresence>
        {toast.isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            style={basePositionStyle}
            className={[
              'absolute',
              'max-w-[min(92vw,420px)]',
              'rounded-full border px-4 py-2',
              'shadow-[0_14px_40px_rgba(0,0,0,0.35)]',
              'backdrop-blur-md',
              surfaceClass,
            ].join(' ')}
          >
            <div className="text-center text-sm font-black uppercase tracking-[0.14em]">
              {toast.message}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default FeedbackToast;

