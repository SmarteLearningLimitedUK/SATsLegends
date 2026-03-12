import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AssetIcon from './AssetIcon';
import rewardChest from '../assets/licensed/reward_chest_gold.png';
import coinBag from '../assets/licensed/reward_bag_coins.png';

interface LevelResultModalProps {
  isOpen: boolean;
  result: {
    type: 'victory' | 'gameover';
    title: string;
    subtitle: string;
    score: number;
    stars: number;
    coinsEarned: number;
    xpEarned: number;
    islandUnlockedName?: string;
    achievementsUnlocked?: string[];
    primaryLabel: string;
    onPrimary: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
  } | null;
}

const LevelResultModal: React.FC<LevelResultModalProps> = ({ isOpen, result }) => {
  if (!result) return null;

  const isVictory = result.type === 'victory';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-xl"
        >
          <motion.div
            initial={{ y: 28, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 18, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className={`relative w-full max-w-lg overflow-hidden rounded-[2rem] border shadow-[0_30px_90px_rgba(0,0,0,0.45)] ${isVictory ? 'border-yellow-300/60 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.18),_rgba(15,23,42,0.92)_64%)]' : 'border-rose-300/30 bg-[radial-gradient(circle_at_top,_rgba(251,113,133,0.16),_rgba(15,23,42,0.92)_64%)]'}`}
          >
            <div className="relative z-10 p-6 md:p-8">
              <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-[1.75rem] border border-white/20 bg-white/10 p-2 shadow-inner">
                <img src={isVictory ? rewardChest : coinBag} alt="Reward" className="h-full w-full object-contain drop-shadow-xl" />
              </div>

              <div className="text-center">
                <div className="text-[11px] font-black uppercase tracking-[0.35em] text-white/60">Level complete</div>
                <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">{result.title}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-white/70 md:text-base">{result.subtitle}</p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2">
                {[1, 2, 3].map((star, index) => (
                  <motion.div
                    key={star}
                    initial={{ scale: 0, rotate: -18, y: 10 }}
                    animate={{ scale: 1, rotate: 0, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.12, type: 'spring', stiffness: 250, damping: 16 }}
                    className={`rounded-full p-2 ${star <= result.stars ? 'bg-yellow-300/18' : 'bg-white/5'}`}
                  >
                    <AssetIcon name={star <= result.stars ? "star" : "starOutline"} className="h-10 w-10" />
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-center backdrop-blur-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/45">Score</div>
                  <div className="mt-2 text-2xl font-black text-white">{result.score}</div>
                </div>
                <div className="rounded-[1.35rem] border border-amber-300/20 bg-amber-300/10 p-4 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] text-amber-100/70"><AssetIcon name="coin" className="h-3.5 w-3.5" /> Coins</div>
                  <div className="mt-2 text-2xl font-black text-amber-200">+{result.coinsEarned}</div>
                </div>
                <div className="rounded-[1.35rem] border border-cyan-300/20 bg-cyan-300/10 p-4 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-100/75"><AssetIcon name="star" className="h-3.5 w-3.5" /> XP</div>
                  <div className="mt-2 text-2xl font-black text-cyan-200">+{result.xpEarned}</div>
                </div>
              </div>

              {(result.islandUnlockedName || (result.achievementsUnlocked?.length || 0) > 0) && (
                <div className="mt-5 space-y-3">
                  {result.islandUnlockedName && (
                    <div className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
                      <div className="flex items-center gap-2 font-black uppercase tracking-[0.24em] text-[10px] text-emerald-100/70">
                        <AssetIcon name="trophy" className="h-3.5 w-3.5" /> New island unlocked
                      </div>
                      <div className="mt-1 text-base font-bold text-white">{result.islandUnlockedName}</div>
                    </div>
                  )}

                  {(result.achievementsUnlocked?.length || 0) > 0 && (
                    <div className="rounded-[1.5rem] border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-3 text-sm text-fuchsia-100">
                      <div className="font-black uppercase tracking-[0.24em] text-[10px] text-fuchsia-100/70">Achievements unlocked</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {result.achievementsUnlocked?.map((achievement) => (
                          <span key={achievement} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                            {achievement}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {result.onSecondary && result.secondaryLabel && (
                  <button
                    onClick={result.onSecondary}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] border border-white/12 bg-white/8 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/14"
                  >
                    <AssetIcon name="refresh" className="h-4 w-4" />
                    {result.secondaryLabel}
                  </button>
                )}
                <button
                  onClick={result.onPrimary}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] px-5 py-4 text-sm font-black uppercase tracking-[0.18em] transition ${isVictory ? 'bg-yellow-300 text-slate-950 hover:bg-yellow-200' : 'bg-rose-300 text-slate-950 hover:bg-rose-200'}`}
                >
                  {isVictory ? <AssetIcon name="trophy" className="h-4 w-4" /> : <AssetIcon name="refresh" className="h-4 w-4" />}
                  {result.primaryLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LevelResultModal;
