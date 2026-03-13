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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="app-modal-panel casual-modal-panel relative flex w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-slate-900/90 p-4 shadow-[0_0_100px_rgba(0,0,0,0.35)] backdrop-blur-xl md:rounded-[3rem] md:p-8"
          >
            <div className="absolute inset-0 pointer-events-none opacity-10">
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-500 blur-[100px] md:h-64 md:w-64" />
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-blue-500 blur-[100px] md:h-64 md:w-64" />
            </div>

            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 md:right-6 md:top-6"
            >
              <AssetIcon name="x" className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.1rem] bg-emerald-500 shadow-2xl md:mb-6 md:h-20 md:w-20 md:rounded-2xl">
                <AssetIcon name="trophy" className="h-8 w-8 md:h-10 md:w-10" />
              </div>

              <h2 className="text-center text-2xl font-black tracking-tight text-white md:text-5xl">
                DAILY QUESTS
              </h2>
              <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 md:mb-8 md:text-xs md:tracking-widest">
                Complete tasks to earn extra rewards
              </p>

              <div className="flex w-full flex-col gap-3">
                {quests.slice(0, 3).map((quest) => {
                  const isCompleted = quest.current >= quest.target;
                  const progress = Math.min((quest.current / quest.target) * 100, 100);

                  return (
                    <div
                      key={quest.id}
                      className={`flex flex-col gap-3 rounded-[1.25rem] border p-4 transition-all md:rounded-3xl md:p-5 ${isCompleted && !quest.isClaimed ? 'border-emerald-500/50 bg-emerald-500/20' : 'border-white/10 bg-white/5'} ${quest.isClaimed ? 'grayscale opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`rounded-[1rem] p-2.5 ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>
                            {isCompleted ? <AssetIcon name="check" className="h-5 w-5" /> : <AssetIcon name="play" className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-black leading-tight text-white md:text-lg">{quest.description}</h3>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">Reward</span>
                              <div className="flex items-center gap-1 rounded-lg bg-black/30 px-2 py-0.5">
                                {quest.reward.type === 'coins' && <AssetIcon name="coin" className="h-3 w-3" />}
                                {quest.reward.type === 'gems' && <AssetIcon name="gem" className="h-3 w-3" />}
                                {quest.reward.type === 'xp' && <AssetIcon name="star" className="h-3 w-3" />}
                                <span className="text-[10px] font-black text-white md:text-xs">{quest.reward.amount}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {!quest.isClaimed && isCompleted && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onClaimQuest(quest.id)}
                            className="rounded-xl border-b-4 border-emerald-700 bg-emerald-500 px-4 py-2 text-[10px] font-black text-white shadow-lg transition-all hover:bg-emerald-400 md:px-6 md:text-sm"
                          >
                            CLAIM
                          </motion.button>
                        )}
                      </div>

                      <div className="h-3 w-full overflow-hidden rounded-full border border-white/5 bg-black/40">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">Progress</span>
                        <span className="text-[10px] font-black text-white md:text-xs">{quest.current} / {quest.target}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 w-full md:mt-8">
                <button
                  onClick={onClose}
                  className="w-full rounded-[1.1rem] border-b-4 border-white/20 bg-white/10 py-3 text-sm font-black text-white transition-all hover:bg-white/20 md:rounded-2xl md:py-4"
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
