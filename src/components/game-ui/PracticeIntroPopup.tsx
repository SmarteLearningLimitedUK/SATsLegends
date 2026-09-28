import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Compass, X } from 'lucide-react';
import { MiniGamePracticeBriefing } from '../../app/gameplaySessionContract';
import { playGameSound } from '../../audio/gameAudio';
import { useDialogFocus } from './useDialogFocus';

type PracticeIntroPopupProps = {
  open: boolean;
  title: string;
  body: React.ReactNode;
  briefing?: MiniGamePracticeBriefing | null;
  actionLabel?: string;
  onAction: () => void;
  kind?: 'practice' | 'help';
};
const PracticeIntroPopup: React.FC<PracticeIntroPopupProps> = ({ open, title, body, briefing, actionLabel = 'Start practice', onAction, kind = 'practice' }) => {
  const actionTriggered = useRef(false);
  useEffect(() => { if (open) actionTriggered.current = false; }, [open]);
  const commitAction = () => {
    if (actionTriggered.current) return;
    actionTriggered.current = true;
    playGameSound('tap');
    onAction();
  };
  const dialogRef = useDialogFocus(open, commitAction);
  const popup = (
    <AnimatePresence>
      {open ? (
        <motion.div key="practice-intro-popup" className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div aria-hidden="true" className="absolute inset-0 bg-[#04162b]/80 backdrop-blur-[6px]" />
          <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${title} ${kind === 'help' ? 'how to play' : 'practice briefing'}`} tabIndex={-1}
            initial={{ opacity: 0, y: 16, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: .22 }}
            className="legend-dialog relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-[28rem] flex-col p-5 text-center sm:p-7">
            <button type="button" aria-label={kind === 'help' ? 'Close help' : 'Close practice briefing'} onClick={commitAction} data-ui-sound="handled" className="ui-close-button absolute right-3 top-3 flex h-11 w-11 items-center justify-center"><X size={18} /></button>
            <div className="min-h-0 overflow-y-auto pr-1" style={{ touchAction: 'pan-y' }}>
              <div className="legend-dialog-emblem"><Compass aria-hidden="true" /></div>
              <div className="legend-dialog-eyebrow">{kind === 'help' ? 'How to play' : 'Your warm-up mission'}</div>
              <h2 className="mb-3 mt-2">{title}</h2>
              <div className="legend-briefing-copy">{briefing?.summary || body}</div>
              {briefing?.bullets.length ? <ol className="legend-briefing-steps mt-4">
                {briefing.bullets.map((bullet, index) => <li key={`${title}-${index}`}><span className="legend-step-number">{index + 1}</span><span>{bullet}</span></li>)}
              </ol> : null}
            </div>
            <div className="mt-5 flex shrink-0 flex-col items-center gap-3">
              <button type="button" data-dialog-primary data-ui-sound="handled" onClick={commitAction} className="ui-button-primary flex min-h-12 w-full items-center justify-center px-4 py-3 text-base">{actionLabel}</button>
              {kind === 'practice' ? <div className="legend-briefing-note">Try things out. Mistakes are part of learning.</div> : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
  return typeof document === 'undefined' ? popup : createPortal(popup, document.body);
};
export default PracticeIntroPopup;
