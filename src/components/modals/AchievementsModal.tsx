import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AssetIcon from '../AssetIcon';
import { PlayerData } from '../../types';
import { ACHIEVEMENTS } from '../../constants';

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
            className="app-modal-panel casual-modal-panel relative flex w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] border-4 border-white/20 bg-gradient-to-b from-yellow-500 to-orange-600 p-3.5 shadow-[0_0_100px_rgba(234,179,8,0.4)] md:max-w-3xl md:rounded-[3rem] md:p-8"
          >
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white blur-[100px] md:h-64 md:w-64" />
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-yellow-300 blur-[100px] md:h-64 md:w-64" />
            </div>

            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 md:right-6 md:top-6"
            >
              <AssetIcon name="x" className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[1rem] border-2 border-white/40 bg-white/20 shadow-2xl md:mb-6 md:h-24 md:w-24 md:rounded-3xl md:border-4">
                <AssetIcon name="trophy" className="h-8 w-8 md:h-12 md:w-12" />
              </div>

              <h2 className="text-center text-[1.65rem] font-black tracking-tight text-white drop-shadow-lg md:text-6xl">
                YOUR BADGES
              </h2>
              <p className="mb-4 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-orange-100 md:mb-8 md:text-sm md:tracking-widest">
                Collect them all to become a Math Master
              </p>

              <div className="mb-4 w-full max-w-md rounded-[1.1rem] border border-white/10 bg-black/20 p-3 backdrop-blur-md md:mb-8 md:rounded-3xl md:p-4">
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
                      className={`relative flex flex-col items-center rounded-[0.9rem] border-2 p-1.5 text-center transition-all md:rounded-3xl md:p-4 ${isUnlocked ? 'border-white/40 bg-white/20 shadow-[0_10px_20px_rgba(0,0,0,0.2)]' : 'border-black/20 bg-black/20 opacity-60 grayscale'}`}
                    >
                      {isUnlocked && <div className="pointer-events-none absolute inset-0 rounded-[1rem] bg-white/10 blur-md md:rounded-3xl" />}
                      <div className="relative z-10 text-xl md:text-5xl">{achievement.icon}</div>
                      <div className={`relative z-10 mt-1 text-[8px] font-black leading-tight md:mt-2 md:text-sm ${isUnlocked ? 'text-white drop-shadow-md' : 'text-white/50'}`}>
                        {achievement.title}
                      </div>
                      <div className="relative z-10 mt-1 hidden text-[10px] font-bold leading-tight text-white/70 md:block">
                        {achievement.description}
                      </div>

                      {!isUnlocked && (
                        <div className="absolute right-1 top-1 rounded-full bg-black/40 p-1 backdrop-blur-sm md:right-2 md:top-2 md:p-1.5">
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
