import React, { Component, ReactNode, ErrorInfo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { IslandData, PlayerData, LevelData } from '../types';
import AssetIcon from './AssetIcon';
import { getGameLabel as getGameTypeLabel } from '../gameMeta';

interface IslandLevelsProps {
  island: IslandData;
  player: PlayerData;
  onBack: () => void;
  onSelectLevel: (level: LevelData) => void;
}

const getLevelLabel = (level: LevelData) => {
  if (level.displayName) return level.displayName;
  if (!level.gameType) return `Level ${level.id}`;
  return getGameTypeLabel(level.gameType);
};

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  public state: { hasError: boolean, error: Error | null } = { hasError: false, error: null };
  public props: { children: ReactNode };

  constructor(props: { children: ReactNode }) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("IslandLevels Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-8 text-white z-[9999] absolute inset-0">
          <h1 className="text-4xl text-red-500 font-bold mb-4">Map Crash</h1>
          <p className="text-xl font-mono bg-black p-4 rounded-xl">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const IslandLevelsContent: React.FC<IslandLevelsProps> = ({ island, player, onBack, onSelectLevel }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const LEGACY_NODE_POSITIONS = [
    { top: 12, left: 50 },
    { top: 27, left: 36 },
    { top: 42, left: 63 },
    { top: 57, left: 38 },
    { top: 73, left: 62 },
    { top: 88, left: 42 },
  ];
  const usesExtendedRoute = island.levels.length > LEGACY_NODE_POSITIONS.length;
  const nodePositions = usesExtendedRoute
    ? Array.from({ length: island.levels.length }, (_, index) => {
        const lanePattern = [50, 35, 66, 40, 61, 44];
        return {
          topPx: 156 + index * 106,
          left: lanePattern[index % lanePattern.length],
        };
      })
    : LEGACY_NODE_POSITIONS;
  const routeHeightPx = usesExtendedRoute ? Math.max(2400, 300 + island.levels.length * 106) : 1500;

  const completedLevels = player.completedLevels[island.id] || [];
  const nextPlayableLevelId = island.levels.find(level => !completedLevels.includes(level.id))?.id;
  const totalCoinsEarned = player.stats?.totalCoinsEarned || 0;
  const earnedStars = island.levels.reduce((sum, level) => {
    const key = `${island.id}-${level.id}`;
    return sum + (player.levelStars?.[key] || 0);
  }, 0);
  const completion = Math.round((completedLevels.length / island.levels.length) * 100);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [island.id]);

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden font-sans">
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden touch-pan-y hide-scrollbar">
        <div
          className="relative mx-auto w-full max-w-[34rem] px-3 pb-28 pt-28 md:max-w-[40rem] md:px-5 md:pb-36 md:pt-32"
          style={{ minHeight: `${routeHeightPx}px` }}
        >
          {island.mapImage ? (
            <img
              src={island.mapImage}
              alt={`${island.name} map`}
              className="absolute inset-0 h-full w-full object-cover object-top opacity-95"
              draggable={false}
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-b ${island.bgGradient || 'from-sky-400 to-sky-200'} `} />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.08),rgba(7,17,31,0.18)_22%,rgba(7,17,31,0.36)_58%,rgba(7,17,31,0.58)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),rgba(255,255,255,0)_24%),radial-gradient(circle_at_bottom,rgba(96,165,250,0.14),rgba(96,165,250,0)_26%)]" />

          {island.levels.map((level, index) => {
            const usesSequentialUnlock = island.id === 1;
            const levelMiniGameLevel = level.miniGameLevel || 0;
            const previousLevelsCleared = usesSequentialUnlock && level.miniGameKey && level.miniGameLevel
              ? island.levels
                .filter(candidate => (
                  candidate.miniGameKey === level.miniGameKey
                  && (candidate.miniGameLevel || 0) < levelMiniGameLevel
                ))
                .every(candidate => completedLevels.includes(candidate.id))
              : island.levels
                .filter(candidate => candidate.id < level.id)
                .every(candidate => completedLevels.includes(candidate.id));
            const bossCoinsNeeded = level.bossUnlockCoins || 0;
            const hasBossCoins = totalCoinsEarned >= bossCoinsNeeded;
            const isUnlocked = level.isBoss
              ? previousLevelsCleared && hasBossCoins
              : usesSequentialUnlock
                ? previousLevelsCleared
                : true;
            const stars = player.levelStars?.[`${island.id}-${level.id}`] || 0;
            const isCompleted = completedLevels.includes(level.id);
            const isNextPlayable = level.id === nextPlayableLevelId && isUnlocked;
            const isPerfectClear = isCompleted && stars === 3;
            const gameLabel = getLevelLabel(level);

            const pos = nodePositions[index] || { top: 50, left: 50 };

            return (
              <motion.div
                key={level.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={
                  isNextPlayable
                    ? { scale: [1, 1.06, 1], y: [0, -10, 0], opacity: 1 }
                    : { scale: 1, opacity: 1, y: 0 }
                }
                transition={
                  isNextPlayable
                    ? {
                        delay: index * 0.15,
                        scale: { duration: 1.9, repeat: Infinity, ease: 'easeInOut' },
                        y: { duration: 1.9, repeat: Infinity, ease: 'easeInOut' },
                        opacity: { delay: index * 0.15, duration: 0.35 },
                      }
                    : { delay: index * 0.15, type: 'spring', stiffness: 150, damping: 15 }
                }
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  top: 'topPx' in pos ? `${pos.topPx}px` : `${pos.top}%`,
                  left: `${pos.left}%`,
                  zIndex: 10 + index,
                }}
              >
                <button
                  onClick={() => isUnlocked && onSelectLevel(level)}
                  disabled={!isUnlocked}
                  className={`group relative flex flex-col items-center justify-center transition-all ${isUnlocked ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-80'}`}
                >
                  {isNextPlayable && (
                    <>
                      <motion.div
                        className="absolute inset-0 -m-4 rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.45)_0%,rgba(251,191,36,0.14)_45%,rgba(251,191,36,0)_74%)] blur-md"
                        animate={{ opacity: [0.5, 0.95, 0.5], scale: [0.92, 1.12, 0.92] }}
                        transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <motion.div
                        className="absolute inset-0 -m-2 rounded-full border-2 border-yellow-300/80"
                        animate={{ opacity: [0.35, 0.85, 0.35], scale: [0.94, 1.14, 0.94] }}
                        transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </>
                  )}

                  <div className={`relative flex items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-full border-[3px] shadow-2xl bg-center bg-cover ${level.isBoss
                    ? isUnlocked
                      ? 'border-yellow-400 bg-red-600 shadow-[0_4px_15px_rgba(220,38,38,0.5)]'
                      : 'border-yellow-950/80 bg-slate-700 shadow-[0_4px_15px_rgba(15,23,42,0.45)]'
                    : isCompleted ? 'border-amber-700 bg-amber-500' : isUnlocked ? 'border-amber-800 bg-amber-400' : 'border-slate-800 bg-slate-600'
                    }`}>
                    {isPerfectClear && !level.isBoss && (
                      <motion.div
                        className="absolute -inset-2 rounded-full border-[3px] border-yellow-200/80"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
                      />
                    )}

                    {isPerfectClear && !level.isBoss && (
                      <motion.div
                        className="absolute -inset-3 rounded-full bg-[conic-gradient(from_0deg,rgba(250,204,21,0)_0deg,rgba(250,204,21,0.85)_90deg,rgba(255,255,255,0)_180deg,rgba(250,204,21,0.82)_270deg,rgba(250,204,21,0)_360deg)] opacity-70 blur-[2px]"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                      />
                    )}

                    <div className="absolute inset-1 rounded-full border border-white/20 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

                    {level.isBoss ? (
                      <AssetIcon name="trophy" className={`w-8 h-8 md:w-10 md:h-10 drop-shadow-md ${isUnlocked ? 'text-yellow-100' : 'text-slate-300/80'}`} />
                    ) : !isUnlocked ? (
                      <span className="text-xl md:text-3xl text-slate-800 font-bold opacity-50">🔒</span>
                    ) : (
                      <span className="text-2xl md:text-4xl font-black text-amber-950 drop-shadow-sm">{level.id}</span>
                    )}

                    {isCompleted && !level.isBoss && (
                      <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-1 border-2 border-amber-700 shadow-md">
                        <AssetIcon name="check" className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {isUnlocked && !level.isBoss && (
                    <motion.div
                      className="casual-ribbon-chip absolute top-full mt-1 flex gap-0.5 rounded-full px-2 py-0.5"
                      animate={isPerfectClear ? { rotate: [0, 6, 0, -6, 0], scale: [1, 1.05, 1] } : { rotate: 0, scale: 1 }}
                      transition={isPerfectClear ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
                    >
                      {[1, 2, 3].map(value => (
                        <AssetIcon
                          key={value as any}
                          name={value <= stars ? 'star' : 'starOutline'}
                          className={`w-3 h-3 md:w-4 md:h-4 drop-shadow-md ${value <= stars ? 'text-yellow-400' : 'text-white/40'}`}
                        />
                      ))}
                    </motion.div>
                  )}

                  {level.isBoss && (
                    <motion.div
                      animate={isUnlocked ? { y: [0, -4, 0] } : { y: 0 }}
                      transition={isUnlocked ? { duration: 2, repeat: Infinity } : { duration: 0.2 }}
                      className="casual-ribbon-chip absolute -top-8 rounded-lg px-2 py-1"
                    >
                      <span className={`text-[10px] md:text-xs font-black tracking-wider ${isUnlocked ? 'text-yellow-400' : 'text-slate-200/80'}`}>
                        {isUnlocked ? 'BOSS' : 'LOCKED'}
                      </span>
                    </motion.div>
                  )}

                  {isNextPlayable && (
                    <motion.div
                      className="casual-ribbon-chip absolute -top-8 rounded-full px-2.5 py-1"
                      animate={{ y: [0, -4, 0], scale: [1, 1.04, 1] }}
                      transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.18em] text-yellow-200">
                        Next Up
                      </span>
                    </motion.div>
                  )}

                  <div className="absolute top-full mt-5 flex w-24 justify-center md:w-32">
                    <div className="licensed-slice-paper-panel rounded-[0.95rem] px-2 py-1 text-center shadow-[0_10px_24px_rgba(2,6,23,0.28)]">
                      <span className="block text-[9px] font-black uppercase leading-[1.15] tracking-[0.08em] text-amber-950 md:text-[10px]">
                        {gameLabel}
                      </span>
                    </div>
                  </div>

                  {level.isBoss && !isUnlocked && (
                    <div className="absolute top-full mt-[3.35rem] flex w-32 justify-center md:w-40">
                      <div className="licensed-slice-paper-panel rounded-[0.9rem] px-2 py-1.5 text-center shadow-[0_10px_24px_rgba(2,6,23,0.32)]">
                        <div className="flex items-center justify-center gap-1 text-[9px] font-black text-amber-950 md:text-[10px]">
                          <AssetIcon name="coin" className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          <span>{totalCoinsEarned}/{bossCoinsNeeded}</span>
                        </div>
                        <div className="mt-0.5 text-[8px] font-bold leading-tight text-amber-950/72 md:text-[9px]">
                          Earn more coins and finish earlier games to unlock this boss.
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <header className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none">
        <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="pointer-events-auto ui-icon-button flex h-11 w-11 items-center justify-center rounded-full p-0 text-white shadow-xl md:h-12 md:w-12"
          >
            <AssetIcon name="back" className="h-6 w-6 md:h-8 md:w-8" />
          </motion.button>

          <div className="pointer-events-auto licensed-game-card flex items-center gap-2 rounded-full p-2 text-white shadow-xl md:p-3">
            <div className="licensed-slice-blue-banner flex items-center gap-1.5 rounded-full px-3 py-1 text-white">
              <AssetIcon name="star" className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
              <span className="text-sm md:text-base font-black text-white">{earnedStars}</span>
            </div>
            <div className="licensed-slice-cyan-pill hidden items-center gap-1.5 rounded-full px-3 py-1 text-white md:flex">
              <span className="text-[10px] uppercase font-black tracking-widest text-white/70">Complete</span>
              <span className="text-sm font-black text-white ml-1">{completion}%</span>
            </div>
          </div>
        </div>
      </header>

      <div className="absolute bottom-6 left-6 right-6 z-50 pointer-events-none hidden md:flex justify-center">
        <div className="licensed-game-card-dark flex items-center gap-6 rounded-3xl p-4 text-white shadow-2xl">
          <div>
            <div className="text-[10px] font-black uppercase text-amber-400 tracking-widest">{island.themeName}</div>
            <h1 className="text-2xl font-black text-white drop-shadow-md">{island.name}</h1>
            <div className="mt-1 text-sm font-bold text-white/72">
              Scroll down to reach the boss.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const IslandLevels: React.FC<IslandLevelsProps> = (props) => (
  <ErrorBoundary>
    <IslandLevelsContent {...props} />
  </ErrorBoundary>
);

export default IslandLevels;
