import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AssetIcon from '../AssetIcon';
import rewardChest from '../../assets/fantasy_hero/demo_rewards/chest_02.png';
import { DAILY_REWARDS } from '../../constants';
import { HUDBar, RewardPanel } from '../layout/ScreenPrimitives';

interface DailyRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  onClaim: (reward: { type: string, amount: number }) => void;
  claimedToday: boolean;
}

const DailyRewardsModal: React.FC<DailyRewardsModalProps> = ({ isOpen, onClose, streak, onClaim, claimedToday }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-md md:p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="app-modal-panel licensed-game-card-dark relative flex w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] p-3.5 shadow-[0_0_100px_rgba(79,70,229,0.4)] md:max-w-2xl md:rounded-[3rem] md:p-8"
          >
            <button
              onClick={onClose}
              className="ui-icon-button absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full p-0 text-white md:right-6 md:top-6"
            >
              <AssetIcon name="x" className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-3 flex h-16 w-16 rotate-2 items-center justify-center overflow-hidden rounded-[1rem] licensed-slice-paper-panel p-2 shadow-2xl md:mb-6 md:h-24 md:w-24 md:rounded-3xl">
                <img src={rewardChest} className="h-full w-full object-contain" alt="reward chest" />
              </div>

              <HUDBar
                eyebrow="Streak bonuses"
                title="Daily Rewards"
                className="w-full justify-center text-center"
              />

              <RewardPanel className="mb-4 mt-3 w-full md:mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/70 md:text-sm md:tracking-widest">
                  Login every day to earn bonuses
                </p>
              </RewardPanel>

              <div className="mb-4 grid w-full grid-cols-4 gap-1.5 md:mb-8 md:grid-cols-7 md:gap-3">
                {DAILY_REWARDS.map((day, idx) => {
                  const isCurrent = idx + 1 === (streak % 7 || 7);
                  const isPast = idx + 1 < (streak % 7 || 7);

                  return (
                    <div
                      key={day.day}
                      className={`relative flex flex-col items-center gap-1 rounded-[0.9rem] p-1.5 transition-all md:rounded-2xl md:p-3 ${isCurrent ? 'licensed-slice-yellow-plank z-10 scale-105 text-amber-950 shadow-xl' : 'licensed-game-card text-white'} ${isPast ? 'grayscale opacity-50' : ''}`}
                    >
                      <span className={`text-[8px] font-black ${isCurrent ? 'text-amber-950' : 'text-white/60'}`}>DAY {day.day}</span>
                      <span className="text-lg md:text-2xl">{day.icon}</span>
                      <span className={`text-[9px] font-black ${isCurrent ? 'text-amber-950' : 'text-white/80'}`}>
                        {day.reward.amount}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mb-4 w-full licensed-game-card rounded-[1.1rem] p-3 text-white md:mb-8 md:rounded-3xl md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-left">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/60 md:text-xs md:tracking-widest">Current Streak</div>
                    <div className="text-xl font-black text-white md:text-3xl">{streak} DAYS</div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <AssetIcon key={i} name={i < (streak % 5) ? 'star' : 'starOutline'} className="h-4 w-4 md:h-5 md:w-5" />
                    ))}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={!claimedToday ? { scale: 1.02, y: -2 } : {}}
                whileTap={!claimedToday ? { scale: 0.98 } : {}}
                disabled={claimedToday}
                onClick={() => {
                  const currentDay = DAILY_REWARDS[(streak - 1) % 7];
                  onClaim(currentDay.reward);
                }}
                className={`w-full rounded-[1.1rem] py-3.5 text-sm font-black transition-all md:rounded-3xl md:py-6 md:text-2xl ${claimedToday
                  ? 'ui-button-primary cursor-not-allowed text-white/70 opacity-75'
                  : 'ui-button-primary text-white'}`}
              >
                {claimedToday ? 'ALREADY CLAIMED' : 'CLAIM REWARD'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DailyRewardsModal;
