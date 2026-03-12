import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AssetIcon from '../AssetIcon';
import { DailyQuest } from '../../types';

interface DailyQuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quests: DailyQuest[];
  onClaimQuest: (questId: string) => void;
}

const DailyQuestsModal: React.FC<DailyQuestsModalProps> = ({ isOpen, onClose, quests, onClaimQuest }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="w-full max-w-2xl rounded-[3rem] border border-white/20 bg-slate-900/90 backdrop-blur-xl shadow-[0_0_100px_rgba(0,0,0,0.35)] relative overflow-hidden p-8 md:p-12"
          >
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-500 rounded-full blur-[100px]" />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500 rounded-full blur-[100px]" />
            </div>

            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
            >
              <AssetIcon name="x" className="w-6 h-6" />
            </button>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl mb-6 -rotate-6">
                <AssetIcon name="trophy" className="w-10 h-10" />
              </div>

              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2 text-center">
                DAILY QUESTS
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8 text-center">
                Complete tasks to earn extra rewards!
              </p>

              <div className="flex flex-col gap-4 w-full max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {quests.map((quest) => {
                  const isCompleted = quest.current >= quest.target;
                  const progress = Math.min((quest.current / quest.target) * 100, 100);

                  return (
                    <div
                      key={quest.id}
                      className={`
                        p-6 rounded-3xl border-2 transition-all flex flex-col gap-4
                        ${isCompleted && !quest.isClaimed ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-white/5 border-white/10'}
                        ${quest.isClaimed ? 'opacity-50 grayscale' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>
                            {isCompleted ? <AssetIcon name="check" className="w-6 h-6" /> : <AssetIcon name="play" className="w-6 h-6" />}
                          </div>
                          <div>
                            <h3 className="text-white font-black text-lg leading-tight">{quest.description}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-black text-white/40 uppercase tracking-widest">Reward:</span>
                              <div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-lg">
                                {quest.reward.type === 'coins' && <AssetIcon name="coin" className="w-3 h-3" />}
                                {quest.reward.type === 'gems' && <AssetIcon name="gem" className="w-3 h-3" />}
                                {quest.reward.type === 'xp' && <AssetIcon name="star" className="w-3 h-3" />}
                                <span className="text-xs font-black text-white">{quest.reward.amount}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {!quest.isClaimed && isCompleted && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onClaimQuest(quest.id)}
                            className="px-6 py-2 bg-emerald-500 text-white font-black rounded-xl shadow-lg hover:bg-emerald-400 transition-all border-b-4 border-emerald-700"
                          >
                            CLAIM
                          </motion.button>
                        )}
                      </div>

                      <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Progress</span>
                        <span className="text-xs font-black text-white">{quest.current} / {quest.target}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 w-full">
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-white/10 text-white font-black rounded-2xl border-b-4 border-white/20 hover:bg-white/20 transition-all"
                >
                  CONTINUE ADVENTURE
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DailyQuestsModal;
