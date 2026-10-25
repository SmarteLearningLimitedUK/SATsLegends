import React, { lazy, Suspense, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Compass, Lightbulb, X } from 'lucide-react';
import { MiniGamePracticeBriefing } from '../../app/gameplaySessionContract';
import { playGameSound } from '../../audio/gameAudio';
import { useDialogFocus } from './useDialogFocus';
import { LearnerGuideContext } from './LearnerGuideContext';
import './sats-adventure.css';
const RevisionWorkshop = lazy(() => import('./RevisionWorkshop'));

type PracticeIntroPopupProps = {
  open: boolean;
  title: string;
  body: React.ReactNode;
  briefing?: MiniGamePracticeBriefing | null;
  actionLabel?: string;
  onAction: () => void;
  kind?: 'practice' | 'help' | 'mock' | 'tips';
  roundTips?: string[];
};
const PracticeIntroPopup: React.FC<PracticeIntroPopupProps> = ({ open, title, body, briefing, actionLabel = 'Start practice', onAction, kind = 'practice', roundTips = [] }) => {
  const isHelp = kind === 'help' || kind === 'tips';
  const context = useContext(LearnerGuideContext);
  briefing = briefing ?? (kind === 'mock' ? null : context?.guide);
  const managed = kind === 'practice' && context?.introManaged;
  const visible = open && !managed;
  const actionTriggered = useRef(false);
  const [workshopOpen, setWorkshopOpen] = useState(false);
  useEffect(() => { if (open) actionTriggered.current = false; }, [open]);
  useEffect(() => { setWorkshopOpen(false); }, [open, briefing?.revisionKey]);
  const commitAction = () => {
    if (actionTriggered.current) return;
    actionTriggered.current = true;
    playGameSound('tap');
    onAction();
  };
  useEffect(() => {
    if (managed && context?.introDismissed && open) commitAction();
  }, [managed, context?.introDismissed, open]);
  const dialogRef = useDialogFocus(visible, commitAction);
  const popup = (
    <AnimatePresence>
      {visible ? (
        <motion.div key="practice-intro-popup" className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div aria-hidden="true" className="absolute inset-0 bg-[#04162b]/80 backdrop-blur-[6px]" />
          <motion.div ref={dialogRef} role="dialog" data-dialog-kind={kind} aria-modal="true" aria-label={`${title} ${isHelp ? 'how to play' : kind === 'mock' ? 'mock briefing' : 'practice briefing'}`} tabIndex={-1}
            initial={{ opacity: 0, y: 16, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: .22 }}
            className="legend-dialog relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-[28rem] flex-col p-5 text-center sm:p-7">
            <button type="button" aria-label={isHelp ? 'Close help' : 'Close practice briefing'} onClick={commitAction} data-ui-sound="handled" className="ui-close-button relative flex h-11 w-11 shrink-0 self-end items-center justify-center"><X size={18} /></button>
            <div className="legend-dialog-scroll min-h-0 overflow-y-auto pr-1" style={{ touchAction: 'pan-y' }}>
              <div className="legend-dialog-emblem">{isHelp ? <Lightbulb aria-hidden="true" /> : <Compass aria-hidden="true" />}</div>
              <div className="legend-dialog-eyebrow">{isHelp ? 'Rules and tips' : kind === 'mock' ? 'Final adventure' : 'Your warm-up mission'}</div>
              <h2 className="mb-3 mt-2">{title}</h2>
              <div className="legend-briefing-copy">{briefing?.summary || body}</div>
              {briefing?.bullets.length ? <ol className="legend-briefing-steps mt-4">
                {briefing.bullets.map((bullet, index) => <li key={`${title}-${index}`}><span className="legend-step-number">{index + 1}</span><span>{bullet}</span></li>)}
              </ol> : null}
              {kind === 'tips' && roundTips.length > 0 ? <section className="legend-round-tips"><h3>Tips for this round</h3><ul>{roundTips.map(tip=><li key={tip}>{tip}</li>)}</ul></section> : null}
              {briefing?.example ? <div className="legend-worked-example"><strong>Worked example</strong><p>{briefing.example}</p></div> : null}
              {isHelp && briefing?.revisionKey ? <details open={workshopOpen} onToggle={event => setWorkshopOpen(event.currentTarget.open)} className="mt-4 border-t border-white/20 pt-3">
                <summary className="ui-button-secondary flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-sm font-bold">Practise SATs questions</summary>
                {workshopOpen ? <Suspense fallback={<p role="status">Opening your practice mission…</p>}><RevisionWorkshop key={briefing.revisionKey} game={briefing.revisionKey} /></Suspense> : null}
              </details> : null}
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
