import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AssetIcon from '../AssetIcon';
import { DailyQuest } from '../../types';
import {
  FramedPanel,
  PremiumHeaderBar,
  PremiumProgressBar,
  PrimaryActionButton,
  RewardPanel,
  SecondaryActionButton,
} from '../layout/ScreenPrimitives';

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-md md:p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="app-modal-panel premium-modal-shell licensed-game-card-dark relative flex w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] p-3.5 shadow-[0_0_100px_rgba(0,0,0,0.35)] backdrop-blur-xl md:max-w-2xl md:rounded-[3rem] md:p-8"
          >
            <button
              onClick={onClose}
              className="ui-icon-button absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full p-0 text-white md:right-6 md:top-6"
            >
              <AssetIcon name="x" className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[1rem] licensed-slice-cyan-pill text-white shadow-2xl md:mb-6 md:h-20 md:w-20 md:rounded-2xl">
                <AssetIcon name="trophy" className="h-8 w-8 md:h-10 md:w-10" />
              </div>

              <PremiumHeaderBar eyebrow="Adventure tasks" title="Daily Quests" className="w-full" />
              <RewardPanel className="mb-4 mt-3 w-full md:mb-6">
                <p className="text-center text-[9px] font-black uppercase tracking-[0.18em] text-amber-900/70 md:text-xs md:tracking-widest">
                  Complete tasks to earn extra rewards
                </p>
              </RewardPanel>

              <div className="flex w-full flex-col gap-2.5">
                {quests.slice(0, 3).map((quest) => {
                  const isCompleted = quest.current >= quest.target;
                  const progress = Math.min((quest.current / quest.target) * 100, 100);

                  return (
                    <div
                      key={quest.id}
                      className={`flex flex-col gap-2.5 transition-all ${quest.isClaimed ? 'grayscale opacity-50' : ''} ${isCompleted && !quest.isClaimed ? 'ring-2 ring-emerald-300/45' : ''}`}
                    >
                      <FramedPanel className="rounded-[1.05rem] p-3 md:rounded-3xl md:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className={`rounded-[0.9rem] p-2 ${isCompleted ? 'licensed-slice-green-pill text-white' : 'licensed-slice-blue-banner text-white/80'}`}>
                              {isCompleted ? <AssetIcon name="check" className="h-5 w-5" /> : <AssetIcon name="play" className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-[13px] font-black leading-tight text-white md:text-lg">{quest.description}</h3>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">Reward</span>
                                <div className="licensed-slice-paper-panel flex items-center gap-1 rounded-lg px-2 py-0.5 text-amber-950">
                                  {quest.reward.type === 'coins' && <AssetIcon name="coin" className="h-3 w-3" />}
                                  {quest.reward.type === 'gems' && <AssetIcon name="gem" className="h-3 w-3" />}
                                  {quest.reward.type === 'xp' && <AssetIcon name="star" className="h-3 w-3" />}
                                  <span className="text-[10px] font-black md:text-xs">{quest.reward.amount}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {!quest.isClaimed && isCompleted && (
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                              <PrimaryActionButton onClick={() => onClaimQuest(quest.id)} className="rounded-xl px-3 py-2 md:px-6 md:text-sm">
                                CLAIM
                              </PrimaryActionButton>
                            </motion.div>
                          )}
                        </div>

                        <PremiumProgressBar value={progress} toneClass={isCompleted ? 'bg-gradient-to-r from-emerald-300 via-lime-300 to-emerald-500' : 'bg-gradient-to-r from-sky-300 via-cyan-300 to-blue-400'} />
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">Progress</span>
                          <span className="text-[10px] font-black text-white md:text-xs">{quest.current} / {quest.target}</span>
                        </div>
                      </FramedPanel>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 w-full md:mt-8">
                <SecondaryActionButton onClick={onClose} className="w-full rounded-[1.1rem] py-3 text-[13px] md:rounded-2xl md:py-4 md:text-sm">
                  CONTINUE ADVENTURE
                </SecondaryActionButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DailyQuestsModal;
