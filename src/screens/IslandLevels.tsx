import React, { useEffect, useMemo, useState } from 'react';
import { Crown, Lock, Sparkles } from 'lucide-react';
import AssetIcon from '../components/AssetIcon';
import { IslandData, LevelData, PlayerData } from '../types';

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
  summary: string;
  levels: LevelRowState[];
  totalStars: number;
  completedCount: number;
  hasNextPlayable: boolean;
}

const GAME_SUMMARY_BY_KEY: Record<string, string> = {
  place_value_panic: 'Sort unstable number fragments into the correct place-value channels at speed.',
  number_line_ninja: 'Move fast on the number line and land on exact targets with clean control.',
  prime_pop: 'Pop prime-number targets and avoid composite traps as the pace increases.',
  rounding_rampage: 'Route values into the right rounding gates under pressure.',
  calculation_clash: 'Race the enemy in Calculation Cup by solving arithmetic at speed.',
  factor_frenzy: 'Identify factors and multiples in fast decision rounds.',
  take_out_rush: 'Build exact order totals by combining fraction portions in the tray.',
  fraction_forge: 'Combine and refine fractions to hit exact forged targets.',
  match3_equivalence: 'Chain equivalent fractions, decimals, and percentages to XP combos.',
  fraction_of_amount: 'Take exact fractions of sets through quick allocation challenges.',
  percent_power: 'Solve percentage of amount and reverse percentage challenges.',
  simplify_sprint: 'Reduce fractions to simplest form in rapid Combo rounds.',
  multiplication_mine: 'Answer multiplication questions to shatter the mine rock and reveal hidden treasure.',
  division_dock: 'Split cargo accurately with quotient and remainder logic.',
  order_ops_arena: 'Resolve expressions in the correct order to avoid trap paths.',
  formula_forge: 'Substitute into formulae and solve for missing values.',
  arithmetic_gauntlet: 'Survive chained calculations without breaking flow.',
  remainder_run: 'Route values by quotient and remainder outcomes at speed.',
  potion_panic: 'Brew spell potions by pouring exact ratios before the 90-second clock expires.',
  ratio_recipes: 'Scale ingredient sets to match new serving targets precisely.',
  share_splitter: 'Share cake slices between plates to match exact ratio targets before time runs out.',
  maths_vs_zombies: 'Survive zombie waves by deploying defenders in the correct maths ratio.',
  ratio_fractions: 'Turn ratios into fractions of the whole.',
  scale_builder: 'Resize blueprint structures to exact scale factors in a precision architectural challenge.',
  angle_arena: 'Calibrate launch angles precisely to hit targets.',
  polygon_palace: 'Classify shapes quickly by key geometric properties.',
  rotation_relay: 'Rotate, predict, and match orientation using 90, 180, and 270 degree turns.',
  coordinates_quest: 'Plot and identify coordinates with speed and accuracy.',
  coordinate_quest: 'Plot and identify coordinates with speed and accuracy.',
  time_keeper_cove: 'Set clocks and solve elapsed-time dispatch challenges.',
  conversion_canyon: 'Convert measurement units to unlock routes and systems.',
  area_architect: 'Build and measure areas using unit squares.',
  unit_mixer: 'Convert between mixed units across length, mass, and capacity.',
  perimeter_path: 'Trace exact boundary lengths on irregular paths.',
  data_dash: 'Scan charts fast and choose the correct lane instantly.',
  graph_grabber: 'Extract exact values from graphs before they disappear.',
  table_trouble: 'Read tables quickly and answer under time pressure.',
  line_graph_lab: 'Interpret trends, intervals, and key points on line graphs.',
  chart_challenge: 'Switch between chart types and keep Combo accuracy.',
  data_detective: 'Solve short data reasoning cases from displayed information.',
  market_mayhem: 'Handle real-world buying, totals, and change under pressure.',
  problem_pyramid: 'Climb linked reasoning steps where each answer affects the next.',
  mixed_mastery: 'Rapidly switch across mixed SATs skills without losing flow.',
  strategy_survival: 'Endure increasing mixed-problem waves with efficient decisions.',
  timed_test_trials: 'Run timed SATs-style sets with game pacing.',
  multi_step_marathon: 'Complete deep multi-step reasoning runs at mastery level.',
};

const toTitleCaseFromKey = (key: string) => key
  .split(/[_-]/g)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const getGroupKey = (level: LevelData) => (
  level.miniGameKey
  || level.blueprintKey
  || level.displayName
  || `${level.gameType || 'level'}-${level.id}`
);

const getGroupName = (level: LevelData) => {
  if (level.displayName) {
    return level.displayName.replace(/\s+L\d+$/i, '').trim();
  }
  if (level.miniGameKey) return toTitleCaseFromKey(level.miniGameKey);
  if (level.blueprintKey) return toTitleCaseFromKey(level.blueprintKey);
  return `Level ${level.id}`;
};

const getGameSummary = (level: LevelData) => {
  const key = level.miniGameKey || level.blueprintKey || level.gameType || '';
  return GAME_SUMMARY_BY_KEY[key] || 'Take on this challenge to improve speed, accuracy, and confidence.';
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

  const gameGroups = useMemo<GameGroupState[]>(() => {
    const groups = new Map<string, GameGroupState>();

    for (const row of levelRows) {
      const key = getGroupKey(row.level);
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          name: getGroupName(row.level),
          summary: getGameSummary(row.level),
          levels: [],
          totalStars: 0,
          completedCount: 0,
          hasNextPlayable: false,
        });
      }

      const group = groups.get(key)!;
      group.levels.push(row);
      group.totalStars += row.stars;
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

  const earnedStars = levelRows.reduce((sum, row) => sum + row.stars, 0);
  const completionPercent = Math.round((completedLevels.length / Math.max(1, island.levels.length)) * 100);

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
        <div className="mb-3 flex items-start justify-between gap-3 md:mb-4">
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

          <div className="licensed-board-frame flex min-w-[124px] flex-col items-end gap-1 rounded-xl px-3 py-2 text-white md:min-w-[156px]">
            <div className="flex items-center gap-1.5 text-sm font-black md:text-base">
              <AssetIcon name="star" className="h-4 w-4 text-yellow-300 md:h-5 md:w-5" />
              <span>{earnedStars}</span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/80 md:text-xs">
              {completionPercent}% complete
            </div>
          </div>
        </div>

        <div className="mb-3 h-2.5 overflow-hidden rounded-full border border-white/22 bg-slate-950/65 md:mb-4">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        {nextPlayableRow ? (
          <div className="mb-3 rounded-2xl border border-amber-200/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.24),rgba(234,179,8,0.1),rgba(15,23,42,0.4))] p-3 shadow-[0_14px_28px_rgba(234,179,8,0.22)] md:mb-4 md:p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 rounded-full border border-amber-100/70 bg-amber-300/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
                  <Sparkles className="h-3 w-3" />
                  Recommended Next
                </div>
                <div className="mt-1 truncate text-sm font-black text-white md:text-base">
                  {getGroupName(nextPlayableRow.level)} • {nextPlayableRow.level.miniGameLevel ? `Level ${nextPlayableRow.level.miniGameLevel}` : `Level ${nextPlayableRow.level.id}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectLevel(nextPlayableRow.level)}
                className="ui-button-primary shrink-0 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white md:px-5"
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
              const totalPossibleStars = group.levels.length * 3;

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
                      <div className="truncate text-sm font-black text-white md:text-base">{group.name}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-cyan-100/80 md:text-xs">
                        {group.completedCount}/{group.levels.length} complete
                        {group.hasNextPlayable ? ' • Continue available' : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs font-black text-yellow-200 md:text-sm">
                        <AssetIcon name="star" className="h-4 w-4 text-yellow-300 md:h-5 md:w-5" />
                        <span>{group.totalStars}/{totalPossibleStars}</span>
                      </div>
                      <span className="ml-1 text-xs font-black text-cyan-100/85 md:text-sm">
                        {isExpanded ? '-' : '+'}
                      </span>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 rounded-xl border border-white/14 bg-slate-900/45 p-3">
                      <p className="text-xs font-semibold leading-relaxed text-cyan-50/92 md:text-sm">
                        {group.summary}
                      </p>

                      <div className="mt-3 flex flex-col gap-2">
                        {group.levels.map((row) => {
                          const { level, stars, isCompleted, isUnlocked, isNextPlayable, lockReason } = row;
                          const levelLabel = level.miniGameLevel ? `Level ${level.miniGameLevel}` : `Level ${level.id}`;
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

                          const statusText = !isUnlocked
                            ? (lockReason || 'Locked')
                            : isNextPlayable
                              ? 'Recommended next'
                              : isCompleted
                                ? 'Completed'
                                : isBoss
                                  ? 'Boss available'
                                  : 'Available';

                          return (
                            <div
                              key={`${group.id}-${level.id}`}
                              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition ${rowStateClass}`}
                            >
                              <div className="w-[4.1rem] shrink-0 text-xs font-black uppercase tracking-[0.08em] text-white md:w-[5rem] md:text-sm">
                                {levelLabel}
                              </div>

                              <div className="min-w-0 flex-1 text-[11px] font-semibold text-cyan-50/88 md:text-xs">
                                <span className="inline-flex items-center gap-1">
                                  {isBoss ? <Crown className="h-3.5 w-3.5 text-amber-200" /> : null}
                                  {!isUnlocked ? <Lock className="h-3.5 w-3.5 text-slate-200/90" /> : null}
                                  {statusText}
                                </span>
                              </div>

                              <div className="flex items-center gap-0.5 md:gap-1">
                                {[1, 2, 3].map((value) => (
                                  <AssetIcon
                                    key={`${level.id}-${value}`}
                                    name={value <= stars ? 'star' : 'starOutline'}
                                    className={`h-4 w-4 md:h-5 md:w-5 ${value <= stars ? 'text-yellow-300' : 'text-white/35'}`}
                                  />
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => isUnlocked && onSelectLevel(level)}
                                disabled={!isUnlocked}
                                className={`ui-button-primary ml-2 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white md:text-[11px] ${
                                  !isUnlocked
                                    ? 'opacity-60'
                                    : isNextPlayable
                                      ? 'ring-2 ring-amber-200/60'
                                      : ''
                                }`}
                              >
                                {!isUnlocked
                                  ? 'Locked'
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
                <div className="inline-flex items-center gap-1 rounded-full border border-emerald-100/30 bg-emerald-300/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
                  Calm break
                  {wellbeingType ? <span className="text-emerald-100/70">• {wellbeingType}</span> : null}
                </div>
                <div className="mt-2 text-lg font-black text-cyan-50">{wellbeingTitle}</div>
                <div className="mt-1 text-sm font-semibold leading-relaxed text-cyan-100/82">
                  {wellbeingSubtitle || 'A short reset activity to help you breathe, settle, and feel ready for the next challenge.'}
                </div>
                <button
                  type="button"
                  onClick={onOpenWellbeing}
                  className="mt-3 w-full rounded-xl bg-[linear-gradient(180deg,#8ff7da_0%,#63d8c8_100%)] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_12px_24px_rgba(20,184,166,0.2)]"
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



