import React, { useMemo } from 'react';
import AssetIcon from './AssetIcon';
import { IslandData, LevelData, PlayerData } from '../types';

interface IslandLevelsProps {
  island: IslandData;
  player: PlayerData;
  onBack: () => void;
  onSelectLevel: (level: LevelData) => void;
}

const getLevelLabel = (level: LevelData) => level.displayName || `Level ${level.id}`;

interface LevelRowState {
  level: LevelData;
  stars: number;
  isCompleted: boolean;
  isUnlocked: boolean;
  isNextPlayable: boolean;
  lockReason?: string;
}

const IslandLevels: React.FC<IslandLevelsProps> = ({ island, player, onBack, onSelectLevel }) => {
  const completedLevels = player.completedLevels[island.id] || [];
  const totalCoinsEarned = player.stats?.totalCoinsEarned || 0;
  const usesSequentialUnlock = island.id === 1;

  const levelRows = useMemo<LevelRowState[]>(() => {
    const rows = island.levels.map((level) => {
      const miniGameLevel = level.miniGameLevel || 0;
      const previousRequiredComplete = usesSequentialUnlock && level.miniGameKey && level.miniGameLevel
        ? island.levels
          .filter((candidate) => (
            candidate.miniGameKey === level.miniGameKey
            && (candidate.miniGameLevel || 0) < miniGameLevel
          ))
          .every((candidate) => completedLevels.includes(candidate.id))
        : island.levels
          .filter((candidate) => candidate.id < level.id)
          .every((candidate) => completedLevels.includes(candidate.id));

      const bossCoinsNeeded = level.bossUnlockCoins || 0;
      const hasBossCoins = totalCoinsEarned >= bossCoinsNeeded;

      const isUnlocked = level.isBoss
        ? previousRequiredComplete && hasBossCoins
        : usesSequentialUnlock
          ? previousRequiredComplete
          : true;

      const stars = player.levelStars?.[`${island.id}-${level.id}`] || 0;
      const isCompleted = completedLevels.includes(level.id);

      let lockReason: string | undefined;
      if (!isUnlocked && level.isBoss && !hasBossCoins) {
        lockReason = `Need ${bossCoinsNeeded} total coins`;
      } else if (!isUnlocked) {
        lockReason = 'Complete earlier levels first';
      }

      return {
        level,
        stars,
        isCompleted,
        isUnlocked,
        isNextPlayable: false,
        lockReason,
      };
    });

    const nextPlayable = rows.find((row) => row.isUnlocked && !row.isCompleted);
    if (nextPlayable) {
      nextPlayable.isNextPlayable = true;
    }

    return rows;
  }, [completedLevels, island.id, island.levels, player.levelStars, totalCoinsEarned, usesSequentialUnlock]);

  const earnedStars = levelRows.reduce((sum, row) => sum + row.stars, 0);
  const completionPercent = Math.round((completedLevels.length / Math.max(1, island.levels.length)) * 100);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {island.mapImage ? (
        <img
          src={island.mapImage}
          alt={`${island.name} backdrop`}
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          draggable={false}
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.62),rgba(7,17,31,0.88))]" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-4xl min-h-0 flex-col p-3 md:p-5">
        <div className="mb-3 flex items-start justify-between gap-3 md:mb-4">
          <button
            onClick={onBack}
            className="ui-icon-button flex h-11 w-11 items-center justify-center rounded-full p-0 text-white shadow-xl md:h-12 md:w-12"
            aria-label="Back to islands"
          >
            <AssetIcon name="back" className="h-6 w-6 md:h-8 md:w-8" />
          </button>

          <div className="flex-1 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/75 md:text-xs">
              {island.themeName || island.category}
            </div>
            <h1 className="text-xl font-black text-white md:text-3xl">{island.name}</h1>
            <div className="mt-1 text-xs font-semibold text-white/75 md:text-sm">
              Select a game to play
            </div>
          </div>

          <div className="licensed-board-frame flex min-w-[120px] flex-col items-end gap-1 rounded-xl px-3 py-2 text-white md:min-w-[150px]">
            <div className="flex items-center gap-1.5 text-sm font-black md:text-base">
              <AssetIcon name="star" className="h-4 w-4 text-yellow-300 md:h-5 md:w-5" />
              <span>{earnedStars}</span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/80 md:text-xs">
              {completionPercent}% complete
            </div>
          </div>
        </div>

        <div className="mb-3 h-2.5 overflow-hidden rounded-full border border-white/20 bg-slate-950/60 md:mb-4">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-2.5 pb-4 md:gap-3 md:pb-6">
            {levelRows.map((row) => {
              const { level, stars, isCompleted, isUnlocked, isNextPlayable, lockReason } = row;
              const label = getLevelLabel(level);

              return (
                <button
                  key={level.id}
                  onClick={() => isUnlocked && onSelectLevel(level)}
                  disabled={!isUnlocked}
                  className={`licensed-board-frame flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition md:gap-4 md:px-4 md:py-3.5 ${
                    isUnlocked ? 'hover:brightness-105 active:translate-y-[1px]' : 'opacity-75'
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 md:h-12 md:w-12 ${
                    level.isBoss
                      ? 'border-yellow-300 bg-yellow-500/25'
                      : isCompleted
                        ? 'border-emerald-300 bg-emerald-500/25'
                        : 'border-cyan-200/60 bg-cyan-500/20'
                  }`}>
                    {level.isBoss ? (
                      <AssetIcon name="trophy" className="h-5 w-5 text-yellow-200 md:h-6 md:w-6" />
                    ) : (
                      <span className="text-base font-black text-white md:text-lg">{level.id}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-white md:text-base">{label}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-cyan-100/80 md:text-xs">
                      {isUnlocked
                        ? isNextPlayable
                          ? 'Next up'
                          : isCompleted
                            ? 'Completed'
                            : 'Available'
                        : lockReason}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isUnlocked ? (
                      <span className="text-base leading-none text-slate-100/85 md:text-lg">🔒</span>
                    ) : null}
                    <div className="flex items-center gap-0.5 md:gap-1">
                      {[1, 2, 3].map((value) => (
                        <AssetIcon
                          key={`${level.id}-${value}`}
                          name={value <= stars ? 'star' : 'starOutline'}
                          className={`h-4 w-4 md:h-5 md:w-5 ${value <= stars ? 'text-yellow-300' : 'text-white/35'}`}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IslandLevels;
