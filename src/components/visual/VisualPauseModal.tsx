import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AssetIcon from '../AssetIcon';

type VisualPauseModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Test-only pause modal used by the screenshot export system.
 * This is gated behind ?visualTest=1 and is not part of normal gameplay UX.
 */
const VisualPauseModal: React.FC<VisualPauseModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          data-testid="pause-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-md"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)',
          }}
        >
          <motion.div
            initial={{ y: 16, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 20 }}
            className="licensed-board-frame relative w-full max-w-sm p-5 text-center text-white shadow-[0_24px_60px_rgba(2,6,23,0.42)]"
          >
            <button type="button" onClick={onClose} className="ui-close-button absolute right-4 top-4" aria-label="Close">
              <AssetIcon name="x" className="h-5 w-5" alt="" />
            </button>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70">Paused</div>
            <div className="mt-2 text-2xl font-black text-white">Take a breather</div>
            <div className="mt-2 text-sm font-semibold leading-relaxed text-white/80">
              This is a visual review capture of the shared pause overlay.
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={onClose} className="ui-button-primary px-4 py-3 text-sm font-black uppercase tracking-[0.14em]">
                Resume
              </button>
              <button type="button" onClick={onClose} className="ui-button-secondary px-4 py-3 text-sm font-black uppercase tracking-[0.14em]">
                Exit
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default VisualPauseModal;

