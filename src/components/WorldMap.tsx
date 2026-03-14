import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { IslandData, PlayerData } from '../types';
import { ISLANDS, AVATARS } from '../constants';
import AssetIcon from './AssetIcon';
import splashBackground from '../assets/fantasy_hero/demo_bg/background_02.png';

interface WorldMapProps {
  player: PlayerData;
  onSelectIsland: (island: IslandData) => void;
}

type IslandPosition = {
  x: number;
  y: number;
  size: number;
  rotation: number;
};

const MAP_POSITIONS: Record<number, IslandPosition> = {
  1: { x: 75, y: 84, size: 24, rotation: -6 },
  2: { x: 25, y: 74, size: 22, rotation: 4 },
  3: { x: 34, y: 54, size: 24, rotation: -5 },
  4: { x: 74, y: 49, size: 22, rotation: 5 },
  5: { x: 27, y: 28, size: 23, rotation: -4 },
  6: { x: 73, y: 21, size: 23, rotation: 4 },
};

const PATH_ORDER = [1, 2, 3, 4, 5, 6];

const ISLAND_PALETTES: Record<number, { glow: string; ring: string; chip: string; button: string }> = {
  1: {
    glow: 'from-emerald-300/46 via-lime-300/14 to-transparent',
    ring: 'shadow-[0_0_42px_rgba(74,222,128,0.35)]',
    chip: 'from-lime-300 to-emerald-400',
    button: 'from-lime-300 to-emerald-400',
  },
  2: {
    glow: 'from-cyan-300/44 via-sky-300/14 to-transparent',
    ring: 'shadow-[0_0_42px_rgba(103,232,249,0.35)]',
    chip: 'from-cyan-300 to-sky-400',
    button: 'from-cyan-300 to-sky-400',
  },
  3: {
    glow: 'from-amber-300/44 via-yellow-300/14 to-transparent',
    ring: 'shadow-[0_0_42px_rgba(253,224,71,0.35)]',
    chip: 'from-amber-300 to-orange-400',
    button: 'from-amber-300 to-orange-400',
  },
  4: {
    glow: 'from-orange-300/44 via-amber-300/14 to-transparent',
    ring: 'shadow-[0_0_42px_rgba(251,146,60,0.35)]',
    chip: 'from-orange-300 to-amber-400',
    button: 'from-orange-300 to-amber-400',
  },
  5: {
    glow: 'from-fuchsia-300/44 via-violet-300/14 to-transparent',
    ring: 'shadow-[0_0_42px_rgba(216,180,254,0.35)]',
    chip: 'from-fuchsia-300 to-violet-400',
    button: 'from-fuchsia-300 to-violet-400',
  },
  6: {
    glow: 'from-violet-300/44 via-indigo-300/14 to-transparent',
    ring: 'shadow-[0_0_42px_rgba(167,139,250,0.35)]',
    chip: 'from-violet-300 to-indigo-400',
    button: 'from-violet-300 to-indigo-400',
  },
};

const buildPath = (positions: IslandPosition[]) => {
  if (!positions.length) return '';

  return positions
    .map((point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }

      const previous = positions[index - 1];
      const controlX = (previous.x + point.x) / 2 + (index % 2 === 0 ? -5 : 5);
      const controlY = (previous.y + point.y) / 2;
      return `Q ${controlX} ${controlY} ${point.x} ${point.y}`;
    })
    .join(' ');
};

const WorldMap: React.FC<WorldMapProps> = ({ player, onSelectIsland }) => {
  const avatar = AVATARS.find(item => item.id === player.avatarId) || AVATARS[0];
  const avatarImage = avatar.portrait || avatar.image;

  const islandProgress = useMemo(() => {
    return ISLANDS.map(island => {
      const completed = player.completedLevels[island.id] || [];
      const earnedStars = island.levels.reduce((sum, level) => {
        const key = `${island.id}-${level.id}`;
        return sum + (player.levelStars?.[key] || 0);
      }, 0);
      const maxStars = island.levels.length * 3;
      const completion = Math.round((completed.length / island.levels.length) * 100);

      return {
        island,
        isUnlocked: player.unlockedIslands.includes(island.id),
        completedCount: completed.length,
        earnedStars,
        maxStars,
        completion,
      };
    });
  }, [player]);

  const firstPlayableIslandId = islandProgress.find(item => item.isUnlocked && item.completion < 100)?.island.id
    || islandProgress.find(item => item.isUnlocked)?.island.id
    || ISLANDS[0].id;

  const [selectedIslandId, setSelectedIslandId] = useState(firstPlayableIslandId);

  const selectedIslandData = islandProgress.find(item => item.island.id === selectedIslandId) || islandProgress[0];
  const totalStars = islandProgress.reduce((sum, item) => sum + item.earnedStars, 0);

  const pathPositions = PATH_ORDER.map(id => MAP_POSITIONS[id]);
  const mapPath = buildPath(pathPositions);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#07111f]">
      <div className="absolute inset-0 bg-cover bg-center opacity-95" style={{ backgroundImage: `url(${splashBackground})` }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,17,43,0.15),rgba(4,17,43,0.46)_34%,rgba(4,12,27,0.88)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.2),rgba(7,17,31,0)_28%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.22),rgba(7,17,31,0)_30%)]" />
      <div className="pointer-events-none absolute inset-x-[6%] top-[1%] h-[36%] rounded-[50%] bg-[radial-gradient(circle,rgba(96,165,250,0.2),rgba(96,165,250,0)_64%)] blur-3xl" />
      <motion.div
        animate={{ opacity: [0.18, 0.42, 0.18], scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-x-[10%] top-[12%] h-[34%] rounded-[50%] bg-[radial-gradient(circle,rgba(250,204,21,0.12),rgba(250,204,21,0)_62%)] blur-3xl"
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 32 }).map((_, index) => (
          <motion.div
            key={index}
            className="absolute rounded-full bg-white"
            style={{
              width: `${(index % 3) + 2}px`,
              height: `${(index % 3) + 2}px`,
              top: `${(index * 11) % 100}%`,
              left: `${(index * 19) % 100}%`,
            }}
            animate={{ opacity: [0.18, 0.95, 0.18], scale: [1, 1.4, 1] }}
            transition={{ duration: 2.4 + index * 0.14, repeat: Infinity, delay: index * 0.09 }}
          />
        ))}
        {Array.from({ length: 7 }).map((_, index) => (
          <motion.div
            key={`cloud-${index}`}
            animate={{ x: [0, index % 2 === 0 ? 18 : -18, 0] }}
            transition={{ duration: 12 + index * 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute rounded-full bg-white/18 blur-2xl"
            style={{
              width: `${100 + index * 16}px`,
              height: `${36 + index * 8}px`,
              top: `${6 + index * 13}%`,
              left: `${(index * 15) % 88}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col px-3 pb-3 pt-[calc(0.35rem+env(safe-area-inset-top))] md:px-6 md:pb-6 md:pt-6">
        <div className="mb-2 flex shrink-0 items-center gap-2 rounded-[1.4rem] border border-white/14 bg-[linear-gradient(180deg,rgba(21,33,63,0.98),rgba(8,14,27,0.99))] px-3 py-2.5 text-white shadow-[0_18px_34px_rgba(2,6,23,0.34)] md:mb-4 md:rounded-[2rem] md:px-5 md:py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-white/20 bg-white/10 md:h-16 md:w-16 md:rounded-[1.4rem]">
            <img
              src={avatarImage}
              alt={avatar.name}
              className="h-full w-full object-contain object-bottom scale-[1.14]"
              draggable={false}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/66 md:text-[10px]">World Map</div>
            <div className="truncate text-base font-black text-white md:text-2xl">{player.playerName || 'Explorer'}</div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="casual-ribbon-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-white/90">
              <AssetIcon name="coin" className="h-4 w-4" />
              <span className="text-[10px] font-black md:text-xs">{player.coins}</span>
            </div>
            <div className="casual-ribbon-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-white/90">
              <AssetIcon name="star" className="h-4 w-4" />
              <span className="text-[10px] font-black md:text-xs">{totalStars}</span>
            </div>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,16,32,0.72),rgba(4,10,22,0.88))] shadow-[0_28px_90px_rgba(2,6,23,0.42)] md:rounded-[2.8rem]" />

          <div className="relative h-full min-h-0">
            <div className="absolute inset-[0.7rem] rounded-[1.8rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.08),rgba(255,255,255,0)_20%),linear-gradient(180deg,rgba(11,25,55,0.34),rgba(4,13,31,0.48))] md:inset-4 md:rounded-[2.4rem]" />

            <div className="relative mx-auto h-full max-w-[30rem] px-1.5 pb-[7.25rem] pt-1.5 md:max-w-[34rem] md:px-2 md:pb-[8.5rem] md:pt-2">
              <div className="relative h-full w-full overflow-hidden rounded-[1.8rem] md:rounded-[2.4rem]">
                <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                  <path
                    d={mapPath}
                    fill="none"
                    stroke="rgba(255,242,178,0.3)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d={mapPath}
                    fill="none"
                    stroke="url(#mapPathGradient)"
                    strokeWidth="1.05"
                    strokeLinecap="round"
                    strokeDasharray="1.2 2.1"
                  />
                  <defs>
                    <linearGradient id="mapPathGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#fde68a" />
                      <stop offset="50%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                </svg>

                {PATH_ORDER.slice(0, -1).map((islandId, index) => {
                  const from = MAP_POSITIONS[islandId];
                  const to = MAP_POSITIONS[PATH_ORDER[index + 1]];
                  const dots = Array.from({ length: 6 });

                  return dots.map((_, dotIndex) => {
                    const t = (dotIndex + 1) / (dots.length + 1);
                    const x = from.x + (to.x - from.x) * t;
                    const y = from.y + (to.y - from.y) * t;

                    return (
                      <motion.div
                        key={`${islandId}-${dotIndex}`}
                        className="absolute h-2.5 w-2.5 rounded-full border border-yellow-100/70 bg-[linear-gradient(180deg,#ffe79a_0%,#ffb938_100%)] shadow-[0_0_12px_rgba(251,191,36,0.55)] md:h-3 md:w-3"
                        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.72, 1, 0.72] }}
                        transition={{ duration: 2 + dotIndex * 0.18, repeat: Infinity, delay: dotIndex * 0.12 }}
                      />
                    );
                  });
                })}

                {islandProgress.map(({ island, isUnlocked, completion, earnedStars, maxStars }, index) => {
                  const position = MAP_POSITIONS[island.id];
                  const palette = ISLAND_PALETTES[island.id] || ISLAND_PALETTES[1];
                  const isSelected = island.id === selectedIslandId;
                  const isNext = island.id === firstPlayableIslandId;
                  const isThreeStar = earnedStars === maxStars && maxStars > 0;

                  return (
                    <motion.button
                      key={island.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setSelectedIslandId(island.id);
                        if (isUnlocked) {
                          onSelectIsland(island);
                        }
                      }}
                      className="absolute z-20"
                      style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        width: `${position.size}%`,
                        transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
                      }}
                    >
                      <motion.div
                        animate={isNext ? { y: [0, -8, 0] } : isThreeStar ? { rotate: [position.rotation, position.rotation + 3, position.rotation] } : { y: [0, -4, 0] }}
                        transition={{ duration: isNext ? 2.2 : 5.8, repeat: Infinity, ease: 'easeInOut' }}
                        className="relative"
                      >
                        <div className={`pointer-events-none absolute left-1/2 top-[44%] h-[64%] w-[64%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br ${palette.glow} blur-2xl`} />
                        <div className={`pointer-events-none absolute inset-[-4%] rounded-[1.9rem] ${isSelected ? palette.ring : ''}`} />

                        <div className={`relative overflow-hidden rounded-[1.65rem] border ${isSelected ? 'border-[#ffe49a]' : 'border-white/18'} bg-slate-950/42 shadow-[0_18px_32px_rgba(2,6,23,0.36)]`}>
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0)_24%,rgba(2,6,23,0.36)_100%)]" />
                          {island.mapImage && (
                            <img
                              src={island.mapImage}
                              alt={island.themeName || island.name}
                              className="h-full w-full object-cover object-center"
                              draggable={false}
                            />
                          )}
                          <div className="absolute inset-x-2 bottom-2 rounded-[1rem] border border-white/12 bg-slate-950/68 px-2 py-1.5 text-center backdrop-blur-xl">
                            <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/92 md:text-[9px]">
                              {island.themeName || island.name}
                            </div>
                            <div className="mt-0.5 text-[7px] font-black uppercase tracking-[0.16em] text-white/62 md:text-[8px]">
                              {completion}% complete
                            </div>
                          </div>
                        </div>

                        {isNext && (
                          <motion.div
                            animate={{ y: [0, -5, 0], opacity: [0.85, 1, 0.85] }}
                            transition={{ duration: 1.7, repeat: Infinity }}
                            className="absolute left-1/2 top-[-0.7rem] flex -translate-x-1/2 items-center gap-1 rounded-full bg-[linear-gradient(180deg,#6ee7b7_0%,#22c55e_100%)] px-2 py-1 text-[7px] font-black uppercase tracking-[0.16em] text-emerald-950 shadow-[0_8px_18px_rgba(34,197,94,0.35)] md:text-[8px]"
                          >
                            <AssetIcon name="play" className="h-2.5 w-2.5" />
                            Next
                          </motion.div>
                        )}

                        {isThreeStar && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                            className="absolute right-[-0.35rem] top-[-0.35rem] flex h-7 w-7 items-center justify-center rounded-full border border-yellow-100/65 bg-[linear-gradient(180deg,#fde68a_0%,#f59e0b_100%)] shadow-[0_10px_18px_rgba(245,158,11,0.35)]"
                          >
                            <AssetIcon name="star" className="h-3.5 w-3.5" />
                          </motion.div>
                        )}

                        {!isUnlocked && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-[1.65rem] bg-slate-950/52 backdrop-blur-[2px]">
                            <div className="rounded-full border border-white/20 bg-slate-950/55 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/80">
                              Locked
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-1.5 md:px-6 md:pb-3">
              <div className="pointer-events-auto w-full max-w-[28rem] rounded-[1.6rem] border border-white/16 bg-[linear-gradient(180deg,rgba(17,27,52,0.98),rgba(7,13,24,0.99))] p-3 text-white shadow-[0_22px_44px_rgba(2,6,23,0.44)] md:max-w-[32rem] md:rounded-[2rem] md:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[8px] font-black uppercase tracking-[0.22em] text-cyan-100/62 md:text-[10px]">
                      Island {selectedIslandData.island.id}
                    </div>
                    <div className="truncate text-lg font-black text-white md:text-2xl">
                      {selectedIslandData.island.themeName || selectedIslandData.island.name}
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold text-white/72 md:text-xs">
                      {selectedIslandData.completedCount} of {selectedIslandData.island.levels.length} mini-games complete
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(40,59,104,0.98),rgba(17,27,52,0.98))] px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/56 md:text-[10px]">Progress</div>
                    <div className="mt-0.5 text-lg font-black text-white md:text-2xl">{selectedIslandData.completion}%</div>
                  </div>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full border border-white/10 bg-slate-950/70 md:h-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedIslandData.completion}%` }}
                    className={`h-full rounded-full bg-gradient-to-r ${(ISLAND_PALETTES[selectedIslandData.island.id] || ISLAND_PALETTES[1]).chip}`}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="casual-ribbon-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-white/92">
                    <AssetIcon name="star" className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] md:text-xs">
                      {selectedIslandData.earnedStars} / {selectedIslandData.maxStars}
                    </span>
                  </div>

                  <button
                    onClick={() => selectedIslandData.isUnlocked && onSelectIsland(selectedIslandData.island)}
                    disabled={!selectedIslandData.isUnlocked}
                    className={`inline-flex min-h-[2.9rem] items-center justify-center gap-2 rounded-[1rem] px-4 py-2 text-sm font-black text-slate-950 transition-all md:min-h-[3.4rem] md:rounded-[1.3rem] md:px-5 md:text-base ${
                      selectedIslandData.isUnlocked
                        ? `bg-gradient-to-r ${(ISLAND_PALETTES[selectedIslandData.island.id] || ISLAND_PALETTES[1]).button} shadow-[0_14px_30px_rgba(2,6,23,0.24)] hover:-translate-y-0.5`
                        : 'cursor-not-allowed border border-white/10 bg-white/10 text-white/48 shadow-none'
                    }`}
                  >
                    <AssetIcon name={selectedIslandData.isUnlocked ? 'play' : 'plusSquare'} className="h-4 w-4 md:h-5 md:w-5" />
                    {selectedIslandData.isUnlocked ? 'Let\'s go' : 'Island Locked'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
