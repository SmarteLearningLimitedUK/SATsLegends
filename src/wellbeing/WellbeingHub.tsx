import React from 'react';
import { motion } from 'motion/react';
import WellbeingShell from './WellbeingShell';
import { WellbeingActivityMeta } from './types';

interface WellbeingHubProps {
  activities: WellbeingActivityMeta[];
  calmTokens: number;
  onSelect: (activityId: WellbeingActivityMeta['id']) => void;
  onExit: () => void;
}

const WellbeingHub: React.FC<WellbeingHubProps> = ({ activities, calmTokens, onSelect, onExit }) => {
  return (
    <WellbeingShell
      title="Wellbeing Grove"
      subtitle="Short calm breaks to reset, breathe, and feel steadier"
      onExit={onExit}
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
        <div className="mb-3 rounded-[1.4rem] border border-cyan-100/16 bg-[linear-gradient(180deg,rgba(129,230,217,0.14),rgba(56,189,248,0.08))] px-4 py-3 text-center">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/76">Calm break</div>
          <div className="mt-1 text-sm font-semibold text-cyan-50/88">Choose a gentle reset activity. No timer, no lives, no pressure.</div>
          <div className="mt-2 inline-flex rounded-full border border-emerald-200/30 bg-emerald-400/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100">
            Leaf tokens {calmTokens}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="grid grid-cols-1 gap-3 pb-2">
            {activities.map((activity, index) => (
              <motion.button
                key={activity.id}
                type="button"
                onClick={() => onSelect(activity.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
                className="ui-button-secondary rounded-[1.45rem] px-4 py-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(125,211,252,0.3),rgba(129,140,248,0.22))] text-2xl shadow-[0_0_18px_rgba(125,211,252,0.16)]">
                    {activity.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-base font-black text-cyan-50">{activity.title}</div>
                      <div className="rounded-full border border-cyan-100/14 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/72">
                        {activity.durationEstimate}
                      </div>
                    </div>
                    <div className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-100/76">{activity.type}</div>
                    <div className="mt-2 text-sm font-semibold leading-relaxed text-cyan-100/82">{activity.description}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default WellbeingHub;
