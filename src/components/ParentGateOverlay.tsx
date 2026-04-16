import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AssetIcon from './AssetIcon';

interface ParentGateOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

const HOLD_MS = 1200;

const ParentGateOverlay: React.FC<ParentGateOverlayProps> = ({ isOpen, onClose, onUnlock }) => {
  const [progress, setProgress] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopHold = () => {
    holdStartRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = null;
    setProgress(0);
  };

  const tick = () => {
    if (holdStartRef.current === null) return;
    const elapsed = Date.now() - holdStartRef.current;
    const next = Math.min(1, elapsed / HOLD_MS);
    setProgress(next);
    if (next >= 1) {
      stopHold();
      onUnlock();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleHoldStart = () => {
    holdStartRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 10 }}
            className="relative w-full max-w-sm rounded-[1.5rem] border border-cyan-100/30 bg-slate-950/90 p-5 text-white shadow-[0_18px_36px_rgba(2,6,23,0.4)]"
          >
            <button
              type="button"
              onClick={() => {
                stopHold();
                onClose();
              }}
              className="ui-close-button absolute right-3 top-3"
              aria-label="Close"
            >
              <span aria-hidden="true">×</span>
            </button>

            <div className="text-center text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
              Parent Gate
            </div>
            <div className="mt-2 text-center text-lg font-black">Hold to open report</div>
            <div className="mt-2 text-center text-sm text-white/70">
              Touch and hold for a moment.
            </div>

            <button
              type="button"
              onPointerDown={handleHoldStart}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              className="ui-button-primary mt-4 w-full py-3 text-sm font-black uppercase tracking-[0.2em]"
            >
              Hold here
            </button>

            <div className="mt-3 h-2 overflow-hidden rounded-full border border-cyan-200/30 bg-slate-950/80">
              <div
                className="h-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default ParentGateOverlay;
