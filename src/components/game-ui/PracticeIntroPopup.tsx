import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MiniGamePracticeBriefing } from '../../app/gameplaySessionContract';
import { FramedPanel, PrimaryActionButton, RewardPanel } from '../../layout/ScreenPrimitives';

type PracticeIntroPopupProps = {
  open: boolean;
  title: string;
  body: React.ReactNode;
  briefing?: MiniGamePracticeBriefing | null;
  actionLabel?: string;
  onAction: () => void;
};

const normalizeBriefingText = (value: string) => (
  value
    .replace(/\r\n/g, '\n')
    // Some briefing strings were authored/stored with literal markers rather than real newlines.
    .replace(/\\n/g, '\n')
    .replace(/\/n/g, '\n')
);

const renderBody = (body: React.ReactNode) => {
  if (typeof body !== 'string') return body;

  const normalized = normalizeBriefingText(body);
  return normalized.split('\n').map((line, index) => (
    <p key={`${line}-${index}`} className="leading-relaxed text-white/92">
      {line}
    </p>
  ));
};

const PracticeIntroPopup: React.FC<PracticeIntroPopupProps> = ({
  open,
  title,
  body,
  briefing,
  actionLabel = 'Start',
  onAction,
}) => {
  const [locallyDismissed, setLocallyDismissed] = useState(false);

  useEffect(() => {
    if (open) setLocallyDismissed(false);
  }, [open]);

  if (!open || locallyDismissed) return null;

  const resolvedTitle = briefing?.title || title;
  const resolvedSummary = briefing?.summary ? normalizeBriefingText(briefing.summary) : undefined;
  const resolvedBullets = (briefing?.bullets ?? []).map((bullet) => normalizeBriefingText(bullet));

  const overlay = (
    <div
      data-testid="practice-intro-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/72 px-4 py-6 backdrop-blur-[6px]"
    >
      <FramedPanel
        variant="surface"
        className="flex w-full max-w-[22rem] min-h-0 max-h-[calc(100svh-3rem)] flex-col gap-4 overflow-hidden p-4 text-left md:max-w-[28rem] md:gap-5 md:p-5"
      >
        <div className="shrink-0 space-y-3">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/70">
            Mission Briefing
          </div>
          <h2 className="text-[1.45rem] font-black leading-none tracking-[0.03em] text-white md:text-[1.7rem]">
            {resolvedTitle}
          </h2>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <RewardPanel className="space-y-2 text-sm leading-relaxed md:text-[0.95rem]">
            {resolvedSummary ? (
              <p className="whitespace-pre-line font-bold text-amber-950/90">{resolvedSummary}</p>
            ) : null}
            <div className="space-y-2 text-slate-900">
              {renderBody(body)}
            </div>
          </RewardPanel>

          {resolvedBullets.length > 0 ? (
            <div className="rounded-[1rem] border border-cyan-100/18 bg-slate-950/40 px-3 py-3 text-sm text-white/92 shadow-[0_12px_24px_rgba(2,6,23,0.28)]">
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/72">
                Remember
              </div>
              <ul className="space-y-2">
                {resolvedBullets.map((bullet, index) => (
                  <li key={`${bullet}-${index}`} className="flex items-start gap-2">
                    <span className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <PrimaryActionButton
          onClick={() => {
            // Defensive: some screens can remount rapidly or have practice-mode props that
            // accidentally re-open the overlay. Always allow the CTA to dismiss locally.
            setLocallyDismissed(true);
            onAction();
          }}
          className="w-full shrink-0 py-3 text-sm md:text-base"
        >
          {actionLabel}
        </PrimaryActionButton>
      </FramedPanel>
    </div>
  );

  // Render via portal so the overlay is not trapped inside transformed/scaled gameplay stages.
  // Prefer the React root container so events are still delegated correctly.
  if (typeof document !== 'undefined') {
    const root = document.getElementById('root');
    return createPortal(overlay, root ?? document.body);
  }

  return overlay;
};

export default PracticeIntroPopup;
