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
      title="Calm Grove"
      subtitle="Gentle reset games"
      onExit={onExit}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-4" data-calm-tokens={calmTokens}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(30,27,75,1)_0%,rgba(15,12,46,1)_60%,rgba(6,4,15,1)_100%)]" />
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-hidden pt-3">

          <div className="grid w-full max-w-[960px] grid-cols-1 gap-4 overflow-y-auto pb-2 pr-1 md:grid-cols-2 lg:grid-cols-3" style={{ WebkitOverflowScrolling: 'touch' }}>
            {activities.map((activity, index) => (
              <motion.button
                key={activity.id}
                type="button"
                onClick={() => onSelect(activity.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
                className="relative overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.05)] p-4 text-left transition hover:-translate-y-1 hover:bg-[rgba(255,255,255,0.09)]"
              >
                <div
                  className={`absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100 ${
                    index % 5 === 0
                      ? 'bg-[linear-gradient(135deg,rgba(162,155,254,0.3),transparent)]'
                      : index % 5 === 1
                        ? 'bg-[linear-gradient(135deg,rgba(0,210,211,0.3),transparent)]'
                        : index % 5 === 2
                          ? 'bg-[linear-gradient(135deg,rgba(253,121,168,0.3),transparent)]'
                          : index % 5 === 3
                            ? 'bg-[linear-gradient(135deg,rgba(85,239,196,0.3),transparent)]'
                            : 'bg-[linear-gradient(135deg,rgba(253,203,110,0.3),transparent)]'
                  }`}
                />
                <div className="relative z-10 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(162,155,254,0.28),rgba(253,121,168,0.18))] text-2xl shadow-[0_0_18px_rgba(125,211,252,0.16)]">
                    {activity.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="whitespace-normal break-words text-[0.95rem] font-bold leading-snug text-white">{activity.title}</div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                        {activity.durationEstimate}
                      </div>
                    </div>
                    <div className="mt-1 text-[0.72rem] font-black uppercase tracking-[0.14em] text-white/45">
                      {activity.type}
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-white/70">
                      {activity.description}
                    </div>
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
