import React from 'react';
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

const renderBody = (body: React.ReactNode) => {
  if (typeof body !== 'string') return body;

  return body.split('\n').map((line, index) => (
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
  if (!open) return null;

  const resolvedTitle = briefing?.title || title;
  const resolvedSummary = briefing?.summary;
  const resolvedBullets = briefing?.bullets ?? [];

  return (
    <div className="absolute inset-0 z-[95] flex items-center justify-center bg-slate-950/72 px-4 py-6 backdrop-blur-[6px]">
      <FramedPanel
        variant="surface"
        className="flex w-full max-w-[22rem] flex-col gap-4 p-4 text-left md:max-w-[28rem] md:gap-5 md:p-5"
      >
        <div className="space-y-3">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/70">
            Practice Briefing
          </div>
          <h2 className="text-[1.45rem] font-black leading-none tracking-[0.03em] text-white md:text-[1.7rem]">
            {resolvedTitle}
          </h2>
        </div>

        <RewardPanel className="space-y-2 text-sm leading-relaxed md:text-[0.95rem]">
          {resolvedSummary ? (
            <p className="font-bold text-amber-950/90">{resolvedSummary}</p>
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

        <PrimaryActionButton onClick={onAction} className="w-full py-3 text-sm md:text-base">
          {actionLabel}
        </PrimaryActionButton>
      </FramedPanel>
    </div>
  );
};

export default PracticeIntroPopup;
