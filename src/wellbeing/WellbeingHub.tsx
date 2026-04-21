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
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(30,27,75,1)_0%,rgba(15,12,46,1)_60%,rgba(6,4,15,1)_100%)]" />
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-hidden">
          <div className="mb-4 max-w-3xl text-center">
            <h1 className="bg-[linear-gradient(135deg,#9ae6b4,#63b3ed,#f6e05e)] bg-clip-text font-[Quicksand,ui-sans-serif,sans-serif] text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-tight text-transparent">
              Calm Grove
            </h1>
            <p className="mt-1 text-sm text-white/45 md:text-base">
              Choose a gentle reset activity. No timer, no lives, no pressure.
            </p>
            <div className="mt-3 inline-flex rounded-full border border-emerald-200/30 bg-emerald-400/12 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100">
              Leaf tokens {calmTokens}
            </div>
          </div>

          <div className="grid w-full max-w-[860px] grid-cols-1 gap-4 overflow-y-auto pb-2 pr-1 md:grid-cols-2" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[0.95rem] font-bold text-white">{activity.title}</div>
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
