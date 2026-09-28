import React, { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Leaf, X } from 'lucide-react';
import './wellbeing.css';

interface WellbeingCompleteModalProps {
  isOpen: boolean;
  title: string;
  rewardLabel: string;
  onContinue: () => void;
  onPlayAnother: () => void;
  onBackToHub: () => void;
}

const WellbeingCompleteModal: React.FC<WellbeingCompleteModalProps> = ({
  isOpen, title, rewardLabel, onContinue, onPlayAnother, onBackToHub,
}) => {
  const reducedMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const continueRef = useRef<HTMLButtonElement | null>(null);
  const backRef = useRef(onBackToHub);

  useEffect(() => { backRef.current = onBackToHub; }, [onBackToHub]);
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    continueRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        backRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div className="wellbeing-complete-backdrop" data-wellbeing-complete
          initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : .2 }}>
          <motion.div ref={dialogRef} className="wellbeing-complete" role="dialog" aria-modal="true"
            aria-labelledby={titleId} aria-describedby={descriptionId}
            initial={reducedMotion ? false : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : .25 }}>
            <button type="button" onClick={onBackToHub} className="wellbeing-complete-close" data-button-skin="none" aria-label="Close completion">
              <X size={21} aria-hidden="true" />
            </button>
            <div className="wellbeing-complete-emblem" aria-hidden="true"><Leaf size={32} strokeWidth={1.7} /></div>
            <h2 id={titleId}>Your calm break is complete</h2>
            <p id={descriptionId}>{title} complete. You took a moment for yourself.</p>
            <p data-wellbeing-affirmation>Ready when you are.</p>
            <div className="wellbeing-complete-reward" data-wellbeing-reward>
              <Leaf size={18} aria-hidden="true" />{rewardLabel.replaceAll('\uFFFD', '·')}
            </div>
            <div className="wellbeing-complete-actions">
              <button ref={continueRef} type="button" onClick={onContinue} className="wellbeing-action" data-button-skin="none">Continue adventure</button>
              <button type="button" onClick={onPlayAnother} className="wellbeing-quiet-action" data-button-skin="none">Choose another activity</button>
              <button type="button" onClick={onBackToHub} className="wellbeing-quiet-action" data-button-skin="none">Back to Calm Grove</button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default WellbeingCompleteModal;
