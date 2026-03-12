import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AssetIcon from '../AssetIcon';
import rewardChest from '../../assets/licensed/slices/chest_gold.png';
import { DAILY_REWARDS } from '../../constants';

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="bg-gradient-to-b from-indigo-600 to-purple-700 w-full max-w-2xl rounded-[3rem] border-8 border-white/20 shadow-[0_0_100px_rgba(79,70,229,0.4)] relative overflow-hidden p-8 md:p-12"
          >
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
              <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-10 right-10 w-32 h-32 bg-blue-400 rounded-full blur-3xl" />
            </div>

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
            >
              <AssetIcon name="x" className="w-6 h-6" />
            </button>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl mb-6 rotate-2 overflow-hidden bg-white/10 p-2"><img src={rewardChest} className="w-full h-full object-contain" alt="reward chest" /></div>
              
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-2 drop-shadow-lg">
                DAILY REWARDS
              </h2>
              <p className="text-indigo-200 font-bold uppercase tracking-widest text-sm mb-8">
                Login every day to earn massive bonuses!
              </p>

              <div className="grid grid-cols-4 md:grid-cols-7 gap-3 w-full mb-10">
                {DAILY_REWARDS.map((day, idx) => {
                  const isCurrent = idx + 1 === (streak % 7 || 7);
                  const isPast = idx + 1 < (streak % 7 || 7);
                  
                  return (
                    <div 
                      key={day.day}
                      className={`
                        relative p-3 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all
                        ${isCurrent ? 'bg-yellow-400 border-yellow-200 scale-110 shadow-xl z-10' : 'bg-white/10 border-white/10'}
                        ${isPast ? 'opacity-50 grayscale' : ''}
                      `}
                    >
                      <span className={`text-[10px] font-black ${isCurrent ? 'text-yellow-900' : 'text-white/60'}`}>DAY {day.day}</span>
                      <span className="text-2xl">{day.icon}</span>
                      <span className={`text-[10px] font-black ${isCurrent ? 'text-yellow-950' : 'text-white/80'}`}>
                        {day.reward.amount}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="bg-black/20 backdrop-blur-md p-6 rounded-3xl border border-white/10 w-full mb-8">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-white/60 font-black uppercase tracking-widest text-xs">Current Streak</div>
                    <div className="text-3xl font-black text-white">{streak} DAYS</div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <AssetIcon key={i} name={i < (streak % 5) ? "star" : "starOutline"} className="w-5 h-5" />
                    ))}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={!claimedToday ? { scale: 1.05, y: -5 } : {}}
                whileTap={!claimedToday ? { scale: 0.95 } : {}}
                disabled={claimedToday}
                onClick={() => {
                  const currentDay = DAILY_REWARDS[(streak - 1) % 7];
                  onClaim(currentDay.reward);
                }}
                className={`
                  w-full py-6 rounded-3xl text-2xl font-black shadow-2xl transition-all
                  ${claimedToday 
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed border-b-8 border-gray-700' 
                    : 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white border-b-8 border-emerald-800 hover:from-emerald-300 hover:to-emerald-500'}
                `}
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
