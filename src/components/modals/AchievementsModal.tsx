import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AssetIcon from '../AssetIcon';
import { PlayerData } from '../../types';
import { ACHIEVEMENTS } from '../../constants';
import { HUDBar, RewardPanel } from '../layout/ScreenPrimitives';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerData;
}

const AchievementsModal: React.FC<AchievementsModalProps> = ({ isOpen, onClose, player }) => {
  const unlockedCount = player.achievements?.length || 0;
  const totalCount = ACHIEVEMENTS.length;
  const progress = Math.round((unlockedCount / totalCount) * 100) || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-md md:p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="app-modal-panel licensed-game-card-dark relative flex w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] p-3.5 shadow-[0_0_100px_rgba(234,179,8,0.4)] md:max-w-3xl md:rounded-[3rem] md:p-8"
          >
            <button
              onClick={onClose}
              className="ui-icon-button absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full p-0 text-white md:right-6 md:top-6"
            >
              <AssetIcon name="x" className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[1rem] licensed-slice-yellow-plank text-amber-950 shadow-2xl md:mb-6 md:h-24 md:w-24 md:rounded-3xl">
                <AssetIcon name="trophy" className="h-8 w-8 md:h-12 md:w-12" />
              </div>

              <HUDBar eyebrow="Collection" title="Your Badges" className="w-full justify-center text-center" />
              <RewardPanel className="mb-4 mt-3 w-full max-w-xl md:mb-6">
                <p className="text-center text-[9px] font-black uppercase tracking-[0.18em] text-amber-900/70 md:text-sm md:tracking-widest">
                  Collect them all to become a Math Master
                </p>
              </RewardPanel>

              <div className="mb-4 w-full max-w-md licensed-game-card rounded-[1.1rem] p-3 text-white md:mb-8 md:rounded-3xl md:p-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 md:text-xs md:tracking-widest">Collection Progress</span>
                  <span className="text-xs font-black text-white md:text-sm">{unlockedCount} / {totalCount}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border border-white/5 bg-black/40 md:h-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="relative h-full bg-gradient-to-r from-yellow-300 to-yellow-500"
                  >
                    <div className="absolute inset-0 h-1/2 w-full bg-white/20" />
                  </motion.div>
                </div>
              </div>

              <div className="grid w-full grid-cols-4 gap-1.5 md:gap-4">
                {ACHIEVEMENTS.map((achievement, idx) => {
                  const isUnlocked = (player.achievements || []).includes(achievement.id);

                  return (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`licensed-game-card relative flex flex-col items-center rounded-[0.9rem] p-1.5 text-center text-white transition-all md:rounded-3xl md:p-4 ${isUnlocked ? 'shadow-[0_10px_20px_rgba(0,0,0,0.2)]' : 'opacity-60 grayscale'}`}
                    >
                      <div className="relative z-10 text-xl md:text-5xl">{achievement.icon}</div>
                      <div className={`relative z-10 mt-1 text-[8px] font-black leading-tight md:mt-2 md:text-sm ${isUnlocked ? 'text-white drop-shadow-md' : 'text-white/50'}`}>
                        {achievement.title}
                      </div>
                      <div className="relative z-10 mt-1 hidden text-[10px] font-bold leading-tight text-white/70 md:block">
                        {achievement.description}
                      </div>

                      {!isUnlocked && (
                        <div className="licensed-slice-purple-banner absolute right-1 top-1 rounded-full p-1 text-white md:right-2 md:top-2 md:p-1.5">
                          <AssetIcon name="x" className="h-3 w-3" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AchievementsModal;
