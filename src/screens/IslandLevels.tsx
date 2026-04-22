import React, { useEffect, useMemo, useState } from 'react';
import AssetIcon from '../components/AssetIcon';
import { IslandData, LevelData, PlayerData } from '../types';
import { getLevelGameTitle, getLevelGroupKey } from '../utils/gameNames';
import { UNLOCK_ALL_LEVELS } from '../app/testingFlags';

interface IslandLevelsProps {
  island: IslandData;
  player: PlayerData;
  onBack: () => void;
  onSelectLevel: (level: LevelData) => void;
  wellbeingTitle?: string;
  wellbeingSubtitle?: string;
  wellbeingType?: string;
  onOpenWellbeing?: () => void;
}

interface LevelRowState {
  level: LevelData;
  stars: number;
  isCompleted: boolean;
  isUnlocked: boolean;
  isNextPlayable: boolean;
  lockReason?: string;
}

interface GameGroupState {
  id: string;
  name: string;
  levels: LevelRowState[];
  totalStars: number;
  completedCount: number;
  hasNextPlayable: boolean;
}

const TOKENS_PER_LEVEL = 3;

const getGroupName = (level: LevelData) => getLevelGameTitle(level) || `Level ${level.id}`;

const getLevelDisplayLabel = (level: LevelData, groupLevels: LevelRowState[]) => {
  if (level.isPractice) return 'Practice';

  const numberedLevels = groupLevels.filter((row) => row.level.isPractice !== true);
  const displayIndex = numberedLevels.findIndex((row) => row.level.id === level.id);

  if (displayIndex >= 0) {
    return `Level ${displayIndex + 1}`;
  }

  return level.miniGameLevel ? `Level ${level.miniGameLevel}` : `Level ${level.id}`;
};

const IslandLevels: React.FC<IslandLevelsProps> = ({
  island,
  player,
  onBack,
  onSelectLevel,
  wellbeingTitle,
  wellbeingSubtitle,
  wellbeingType,
  onOpenWellbeing,
}) => {
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

  const completedLevels = player.completedLevels[island.id] || [];
  const totalCoinsEarned = player.stats?.totalCoinsEarned || 0;
  const usesSequentialUnlock = island.id === 1;

  useEffect(() => {
    setExpandedGameId(null);
  }, [island.id]);

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

      let isUnlocked = level.isBoss
        ? previousRequiredComplete && hasBossCoins
        : usesSequentialUnlock
          ? previousRequiredComplete
          : true;

      if (level.blueprintKey === 'maths_vs_zombies') {
        isUnlocked = true;
      }

      if (UNLOCK_ALL_LEVELS) {
        isUnlocked = true;
      }

      const stars = player.levelStars?.[`${island.id}-${level.id}`] || 0;
      const isCompleted = completedLevels.includes(level.id);

      let lockReason: string | undefined;
      if (!isUnlocked && level.isBoss && !hasBossCoins) {
        lockReason = `Need ${bossCoinsNeeded} total coins`;
      } else if (!isUnlocked) {
        lockReason = 'Complete earlier levels first';
      }

      if (UNLOCK_ALL_LEVELS) {
        lockReason = undefined;
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

  const gameGroups = useMemo<GameGroupState[]>(() => {
    const groups = new Map<string, GameGroupState>();

    for (const row of levelRows) {
      const key = getLevelGroupKey(row.level);
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          name: getGroupName(row.level),
          levels: [],
          totalStars: 0,
          completedCount: 0,
          hasNextPlayable: false,
        });
      }

      const group = groups.get(key)!;
      group.levels.push(row);
      // Practice levels don't contribute Brainpower.
      group.totalStars += row.level.isPractice ? 0 : row.stars;
      if (row.isCompleted) group.completedCount += 1;
      if (row.isNextPlayable) group.hasNextPlayable = true;
    }

    const ordered = Array.from(groups.values());

    ordered.forEach((group) => {
      group.levels.sort((a, b) => {
        const left = a.level.miniGameLevel || a.level.id;
        const right = b.level.miniGameLevel || b.level.id;
        return left - right;
      });
    });

    ordered.sort((a, b) => {
      const left = a.levels[0]?.level.id || 0;
      const right = b.levels[0]?.level.id || 0;
      return left - right;
    });

    return ordered;
  }, [levelRows]);

  const nextPlayableRow = useMemo(
    () => levelRows.find((row) => row.isNextPlayable),
    [levelRows],
  );

  const nextPlayableLabel = useMemo(() => {
    if (!nextPlayableRow) return '';
    const group = gameGroups.find((candidate) => candidate.levels.some((row) => row.level.id === nextPlayableRow.level.id));
    return group ? getLevelDisplayLabel(nextPlayableRow.level, group.levels) : (nextPlayableRow.level.miniGameLevel ? `Level ${nextPlayableRow.level.miniGameLevel}` : `Level ${nextPlayableRow.level.id}`);
  }, [gameGroups, nextPlayableRow]);

  const eligibleLevelRows = useMemo(
    () => levelRows.filter((row) => row.level.isPractice !== true),
    [levelRows],
  );

  const earnedBrainpowerTokens = eligibleLevelRows.reduce((sum, row) => sum + row.stars, 0);
  const totalBrainpowerTokens = eligibleLevelRows.length * TOKENS_PER_LEVEL;

  return (
    <div
      className="premium-page-root relative h-full min-h-0 w-full overflow-hidden bg-[#07111f]"
      style={{
        height: '100%',
        minHeight: 0,
        touchAction: 'pan-y',
        overscrollBehaviorY: 'contain',
      }}
    >
      <div
        className="premium-page-content relative z-10 mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col px-3 pb-4 pt-[calc(env(safe-area-inset-top)+0.35rem)] md:px-5 md:pb-6 md:pt-[calc(env(safe-area-inset-top)+0.5rem)]"
        style={{
          flex: '1 1 auto',
          minHeight: 0,
        }}
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2 md:mb-4">
          <button
            onClick={onBack}
            className="ui-icon-button flex h-11 w-11 items-center justify-center rounded-full p-0 text-white shadow-xl md:h-12 md:w-12"
            aria-label="Back to islands"
          >
            <AssetIcon name="back" className="h-6 w-6 md:h-8 md:w-8" />
          </button>

          <div className="flex-1 text-center">
            <div className="flex justify-center">
              <h1 className="text-xl font-black text-white drop-shadow-[0_12px_24px_rgba(2,6,23,0.5)] md:text-3xl">{island.name}</h1>
            </div>
          </div>

          <div className="licensed-board-frame flex min-w-[132px] shrink-0 flex-col items-end gap-1 rounded-xl px-3 py-2 text-white md:min-w-[164px]">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-[10px]">
              Brainpower Tokens
            </div>
            <div className="flex items-center gap-1.5 text-sm font-black md:text-base">
              <AssetIcon name="brainpowerToken" className="h-4 w-4 md:h-5 md:w-5" />
              <span>{earnedBrainpowerTokens}/{totalBrainpowerTokens}</span>
            </div>
          </div>
        </div>

        {nextPlayableRow ? (
          <div className="mb-3 rounded-2xl border border-amber-200/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.24),rgba(234,179,8,0.1),rgba(15,23,42,0.4))] p-3 shadow-[0_14px_28px_rgba(234,179,8,0.22)] md:mb-4 md:p-3.5">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                <div className="mt-1 truncate text-sm font-black text-cyan-100 md:text-base">
                  {getGroupName(nextPlayableRow.level)} - {nextPlayableLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectLevel(nextPlayableRow.level)}
                className="ui-button-primary shrink-0 rounded-xl px-4 py-2 text-aaa-sm text-white md:px-5"
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex flex-col gap-2.5 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:gap-3 md:pb-[calc(env(safe-area-inset-bottom)+1.2rem)]">
            {gameGroups.map((group) => {
              const isExpanded = expandedGameId === group.id;
              const totalPossibleBrainpowerTokens = group.levels.filter((row) => row.level.isPractice !== true).length * TOKENS_PER_LEVEL;

              return (
                <div
                  key={group.id}
                  className={`licensed-board-frame w-full rounded-2xl px-3 py-3 text-left transition md:px-4 md:py-3.5 ${
                    group.hasNextPlayable
                      ? 'border border-amber-200/60 shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_16px_28px_rgba(234,179,8,0.18)]'
                      : 'border border-white/14'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedGameId((current) => (current === group.id ? null : group.id))}
                    className="flex w-full items-center gap-3 text-left md:gap-4"
                    aria-expanded={isExpanded}
                    data-button-skin="none"
                  >
                    <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 md:h-12 md:w-12 ${
                      group.completedCount === group.levels.length
                        ? 'border-emerald-300 bg-emerald-500/28'
                        : group.hasNextPlayable
                          ? 'border-amber-200 bg-amber-500/25'
                          : 'border-cyan-200/60 bg-cyan-500/20'
                    }`}>
                      <AssetIcon
                        name={group.levels.some((row) => row.level.isBoss) ? 'trophy' : 'gamepad'}
                        className="h-5 w-5 text-cyan-100 md:h-6 md:w-6"
                      />
                      {group.hasNextPlayable ? (
                        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-300 text-[9px] font-black text-amber-950">
                          !
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-cyan-100 md:text-base">{group.name}</div>
                      <div className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/80 md:text-[11px]">
                        <AssetIcon name="brainpowerToken" className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        <span>{group.totalStars}/{totalPossibleBrainpowerTokens}</span>
                        {group.hasNextPlayable ? <span className="text-amber-100">Next</span> : null}
                      </div>
                    </div>

                    <span className="ml-1 text-xs font-black text-cyan-100/85 md:text-sm">
                        {isExpanded ? '-' : '+'}
                      </span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 rounded-xl border border-white/14 bg-slate-900/45 p-3">
                      <div className="flex flex-col gap-2">
                        {group.levels.map((row) => {
                          const { level, stars, isCompleted, isUnlocked, isNextPlayable, lockReason } = row;
                          const levelLabel = getLevelDisplayLabel(level, group.levels);
                          const isBoss = Boolean(level.isBoss);

                          const rowStateClass = !isUnlocked
                            ? 'border-slate-400/35 bg-slate-900/55'
                            : isNextPlayable
                              ? 'border-amber-200/80 bg-[linear-gradient(180deg,rgba(251,191,36,0.28),rgba(234,179,8,0.14),rgba(15,23,42,0.4))]'
                              : isCompleted
                                ? 'border-emerald-300/60 bg-[linear-gradient(180deg,rgba(34,197,94,0.24),rgba(15,23,42,0.38))]'
                                : isBoss
                                  ? 'border-violet-200/60 bg-[linear-gradient(180deg,rgba(139,92,246,0.3),rgba(30,41,59,0.45))]'
                                  : 'border-cyan-200/55 bg-[linear-gradient(180deg,rgba(34,211,238,0.2),rgba(15,23,42,0.45))]';

                            return (
                              <div
                                key={`${group.id}-${level.id}`}
                                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition ${rowStateClass}`}
                              >
                                <div className="w-[4.1rem] shrink-0 text-aaa-sm font-black text-cyan-100 md:w-[5rem]">
                                  {levelLabel}
                                </div>
                                <div className="min-w-0 flex-1" />

                                <div className="flex items-center gap-0.5 md:gap-1">
                                  {[1, 2, 3].map((value) => (
                                    <AssetIcon
                                      key={`${level.id}-${value}`}
                                    name="brainpowerToken"
                                    className={`h-4 w-4 md:h-5 md:w-5 ${value <= stars ? 'opacity-100' : 'opacity-35 grayscale saturate-0'}`}
                                  />
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => isUnlocked && onSelectLevel(level)}
                                disabled={!isUnlocked}
                                className={`ui-button-primary ml-2 rounded-lg px-3 py-1.5 text-aaa-micro text-white ${
                                  !isUnlocked
                                    ? 'opacity-60'
                                    : isNextPlayable
                                      ? 'ring-2 ring-amber-200/60'
                                      : ''
                                }`}
                              >
                                {!isUnlocked
                                  ? 'Unavailable'
                                  : isNextPlayable
                                    ? 'Start'
                                    : isCompleted
                                      ? 'Replay'
                                      : isBoss
                                        ? 'Boss'
                                        : 'Play'}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {wellbeingTitle && onOpenWellbeing ? (
              <div className="rounded-2xl border border-emerald-200/35 bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(56,189,248,0.08),rgba(15,23,42,0.4))] px-4 py-4 shadow-[0_16px_30px_rgba(16,185,129,0.12)]">
                <div className="inline-flex items-center gap-1 rounded-full border border-emerald-100/30 bg-emerald-300/12 px-2.5 py-1 text-aaa-micro text-emerald-100">
                  Calm break
                  {wellbeingType ? <span className="text-emerald-100/70">- {wellbeingType}</span> : null}
                </div>
                <div className="mt-2 text-lg font-black text-cyan-50">{wellbeingTitle}</div>
                <div className="mt-1 text-sm font-semibold leading-relaxed text-cyan-100/82">
                  {wellbeingSubtitle || 'A short reset activity to help you breathe, settle, and feel ready for the next challenge.'}
                </div>
                <button
                  type="button"
                  onClick={onOpenWellbeing}
                  className="ui-button-success mt-3 w-full rounded-xl px-4 py-3 text-aaa-sm"
                >
                  Take Calm Break
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IslandLevels;





