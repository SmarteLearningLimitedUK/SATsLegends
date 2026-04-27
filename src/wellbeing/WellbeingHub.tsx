import React, { useState } from 'react';
import { motion } from 'motion/react';
import AssetIcon from '../components/AssetIcon';
import WellbeingShell from './WellbeingShell';
import { WellbeingActivityMeta } from './types';

interface WellbeingHubProps {
  activities: WellbeingActivityMeta[];
  calmTokens: number;
  onSelect: (activityId: WellbeingActivityMeta['id']) => void;
  onExit: () => void;
}

const WellbeingHub: React.FC<WellbeingHubProps> = ({ activities, calmTokens, onSelect, onExit }) => {
  const [expandedActivityId, setExpandedActivityId] = useState<WellbeingActivityMeta['id']>(
    activities[0]?.id ?? 'breathing_bloom',
  );

  return (
    <WellbeingShell
      title="Calm Grove"
      subtitle="Gentle reset games"
      type="Wellbeing"
      onExit={onExit}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-4" data-calm-tokens={calmTokens}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(30,27,75,1)_0%,rgba(15,12,46,1)_60%,rgba(6,4,15,1)_100%)]" />
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-hidden pt-2">
          <div className="mb-3 flex w-full max-w-[960px] items-center justify-end">
            <div className="licensed-board-frame flex min-w-[132px] shrink-0 flex-col items-end gap-1 rounded-xl px-3 py-2 text-white md:min-w-[164px]">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-[10px]">
                Calm Tokens
              </div>
              <div className="flex items-center gap-1.5 text-sm font-black md:text-base">
                <AssetIcon name="brainpowerToken" className="h-4 w-4 md:h-5 md:w-5" />
                <span>{calmTokens}</span>
              </div>
            </div>
          </div>

          <div className="hide-scrollbar w-full max-w-[960px] min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2 pr-1 [touch-action:pan-y]">
            <div className="flex flex-col gap-2.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:gap-3">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedActivityId(activity.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setExpandedActivityId(activity.id);
                    }
                  }}
                  aria-expanded={expandedActivityId === activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.2 }}
                  className={`licensed-board-frame w-full cursor-pointer rounded-2xl border px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 md:px-4 md:py-3.5 ${
                    expandedActivityId === activity.id
                      ? 'border-cyan-100/70 shadow-[0_0_0_1px_rgba(186,230,253,0.24),0_16px_28px_rgba(14,165,233,0.16)]'
                      : index === 0
                      ? 'border-amber-200/60 shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_16px_28px_rgba(234,179,8,0.18)]'
                      : 'border-white/14'
                  }`}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-2xl md:h-12 md:w-12 ${
                      index === 0
                        ? 'border-amber-200 bg-amber-500/25'
                        : 'border-cyan-200/60 bg-cyan-500/20'
                    }`}>
                      <span className="max-w-[2.4rem] truncate text-center text-[10px] font-black leading-none text-cyan-50 md:max-w-[2.65rem] md:text-[11px]">
                        {activity.icon}
                      </span>
                      {index === 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-300 text-[9px] font-black text-amber-950">
                          !
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-cyan-100 md:text-base">{activity.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/80 md:text-[11px]">
                          {activity.type}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/80 md:text-[11px]">
                          {activity.durationEstimate}
                        </span>
                        {index === 0 ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200/50 bg-amber-400/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100 md:text-[11px]">
                            Next
                          </span>
                        ) : null}
                      </div>
                      {expandedActivityId === activity.id ? (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 text-xs font-semibold leading-relaxed text-cyan-50/90 md:text-sm"
                        >
                          {activity.description}
                        </motion.p>
                      ) : (
                        <p className="mt-1 truncate text-xs font-semibold text-cyan-50/65 md:text-sm">
                          {activity.subtitle}
                        </p>
                      )}
                    </div>

                    {expandedActivityId === activity.id ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(activity.id);
                        }}
                        className="ml-1 shrink-0 rounded-lg border border-cyan-200/50 bg-cyan-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 md:text-[11px]"
                      >
                        Play
                      </button>
                    ) : (
                      <span className="ml-1 shrink-0 rounded-lg border border-white/12 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50/70 md:text-[11px]">
                        View
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default WellbeingHub;
