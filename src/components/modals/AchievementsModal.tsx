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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="bg-gradient-to-b from-yellow-500 to-orange-600 w-full max-w-3xl rounded-[3rem] border-8 border-white/20 shadow-[0_0_100px_rgba(234,179,8,0.4)] relative overflow-hidden p-6 md:p-12"
          >
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-white rounded-full blur-[100px]" />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-yellow-300 rounded-full blur-[100px]" />
            </div>

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
            >
              <AssetIcon name="x" className="w-6 h-6" />
            </button>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl mb-6 border-4 border-white/40 rotate-6">
                <AssetIcon name="trophy" className="w-12 h-12" />
              </div>
              
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-2 text-center drop-shadow-lg">
                YOUR BADGES
              </h2>
              <p className="text-orange-100 font-bold uppercase tracking-widest text-sm mb-8 text-center">
                Collect them all to become a Math Master!
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-md bg-black/20 p-4 rounded-3xl backdrop-blur-md border border-white/10 mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black text-white/70 uppercase tracking-widest">Collection Progress</span>
                  <span className="text-sm font-black text-white">{unlockedCount} / {totalCount}</span>
                </div>
                <div className="w-full h-4 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 relative"
                  >
                    <div className="absolute inset-0 bg-white/20 w-full h-1/2" />
                  </motion.div>
                </div>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {ACHIEVEMENTS.map((ach, idx) => {
                  const isUnlocked = (player.achievements || []).includes(ach.id);
                  
                  return (
                    <motion.div 
                      key={ach.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`
                        relative p-4 rounded-3xl flex flex-col items-center text-center border-4 transition-all
                        ${isUnlocked 
                          ? 'bg-white/20 border-white/40 shadow-[0_10px_20px_rgba(0,0,0,0.2)] hover:scale-105 hover:bg-white/30' 
                          : 'bg-black/20 border-black/20 grayscale opacity-60'}
                      `}
                    >
                      {/* Glow effect for unlocked */}
                      {isUnlocked && (
                        <div className="absolute inset-0 bg-white/10 rounded-3xl blur-md pointer-events-none" />
                      )}
                      
                      <div className="text-5xl mb-3 filter drop-shadow-xl relative z-10">
                        {ach.icon}
                      </div>
                      
                      <div className={`text-sm font-black ${isUnlocked ? 'text-white drop-shadow-md' : 'text-white/50'} leading-tight mb-1 relative z-10`}>
                        {ach.title}
                      </div>
                      
                      <div className="text-[10px] font-bold text-white/70 leading-tight relative z-10">
                        {ach.description}
                      </div>

                      {/* Lock Icon Overlay */}
                      {!isUnlocked && (
                        <div className="absolute top-2 right-2 bg-black/40 p-1.5 rounded-full backdrop-blur-sm">
                          <AssetIcon name="x" className="w-3 h-3" />
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
