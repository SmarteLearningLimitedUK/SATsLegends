import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AssetIcon from '../AssetIcon';
import rewardChest from '../../assets/fantasy_hero/ui/gem.png';
import { DAILY_REWARDS } from '../../constants';

interface DailyRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  Combo: number;
  onClaim: (reward: { type: string, amount: number }) => void;
  claimedToday: boolean;
}

const DailyRewardsModal: React.FC<DailyRewardsModalProps> = ({ isOpen, onClose, Combo, onClaim, claimedToday }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-xl md:p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="app-modal-panel relative flex w-full max-w-md flex-col overflow-hidden rounded-[1.6rem] border border-white/15 bg-[linear-gradient(180deg,rgba(7,21,52,0.92),rgba(5,17,45,0.96))] p-4 text-white shadow-[0_28px_80px_rgba(0,0,0,0.5)] md:max-w-lg md:rounded-[2rem] md:p-6"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.18),transparent_60%)]" />
            <button
              onClick={onClose}
              className="ui-close-button absolute right-4 top-4 z-20 md:right-5 md:top-5"
              aria-label="Close"
            >
              <span aria-hidden="true">×</span>
            </button>

            <div className="relative z-10 flex flex-col gap-4 text-center">
              <div className="mx-auto flex h-16 w-16 rotate-2 items-center justify-center overflow-hidden rounded-[1rem] border border-white/20 bg-white/10 p-2 shadow-2xl md:h-24 md:w-24 md:rounded-3xl">
                <img src={rewardChest} className="h-full w-full object-contain" alt="reward chest" />
              </div>

              <div className="flex flex-col items-center text-center">
                <span className="rounded-full border border-emerald-200/50 bg-emerald-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">
                  Daily Bonus
                </span>
                <h2 className="mt-2 text-2xl font-black text-amber-100 md:text-3xl">Daily Rewards</h2>
                <p className="mt-1 text-sm font-semibold text-white/80 md:text-base">
                  Login every day to earn bonuses.
                </p>
              </div>

              <div className="grid w-full grid-cols-4 gap-1.5 md:grid-cols-7 md:gap-3">
                {DAILY_REWARDS.map((day, idx) => {
                  const isCurrent = idx + 1 === (Combo % 7 || 7);
                  const isPast = idx + 1 < (Combo % 7 || 7);

                  return (
                    <div
                      key={day.day}
                      className={`relative flex flex-col items-center gap-1 rounded-[0.9rem] border border-white/12 p-1.5 transition-all md:rounded-2xl md:p-3 ${
                        isCurrent
                          ? 'z-10 scale-105 border-amber-200/60 bg-amber-300/20 text-amber-100 shadow-xl'
                          : 'bg-white/5 text-white'
                      } ${isPast ? 'grayscale opacity-50' : ''}`}
                    >
                      <span className={`text-[8px] font-black ${isCurrent ? 'text-amber-100' : 'text-white/60'}`}>DAY {day.day}</span>
                      <span className="text-lg md:text-2xl">{day.icon}</span>
                      <span className={`text-[9px] font-black ${isCurrent ? 'text-amber-100' : 'text-white/80'}`}>
                        {day.reward.amount}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-[1.2rem] border border-white/12 bg-white/5 p-3 md:rounded-[1.5rem] md:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-left">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/60 md:text-xs md:tracking-widest">Current Run</div>
                    <div className="text-xl font-black text-white md:text-3xl">{Combo} DAYS</div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <AssetIcon key={i} name={i < (Combo % 5) ? 'star' : 'starOutline'} className="h-4 w-4 md:h-5 md:w-5" />
                    ))}
                  </div>
                </div>
              </div>

              <motion.div
                whileHover={!claimedToday ? { scale: 1.02, y: -2 } : {}}
                whileTap={!claimedToday ? { scale: 0.98 } : {}}
              >
                <button
                  disabled={claimedToday}
                  onClick={() => {
                    const currentDay = DAILY_REWARDS[(Combo - 1) % 7];
                    onClaim(currentDay.reward);
                  }}
                  className={`w-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#6366f1)] py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_24px_rgba(59,130,246,0.45)] transition-all md:py-4 md:text-base ${
                    claimedToday ? 'cursor-not-allowed opacity-75' : ''
                  }`}
                >
                  {claimedToday ? 'ALREADY CLAIMED' : 'CLAIM REWARD'}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DailyRewardsModal;
